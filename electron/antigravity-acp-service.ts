import { spawn, execFile, ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import type { IpcMain, BrowserWindow } from 'electron'
import {
  AcpAuthMethod,
  AcpBinaryDetection,
  AcpConnectionState,
  AcpInstallResult,
  AcpMcpServerSpec,
  AcpModeOption,
  AcpModelOption,
  AcpPermissionOption,
  AcpPermissionRequest,
  AcpPlanEntry,
  AcpSlashCommand,
  AcpStatusInfo,
  AcpStreamEvent,
  AcpToolCallUpdate,
} from '../packages/sdk/types'

const ANTIGRAVITY_INSTALL_URL = 'https://antigravity.google/docs/cli/reference'
const MAX_LOG_LINES = 300
const DEFAULT_RPC_TIMEOUT_MS = 60_000
const DEFAULT_TERMINAL_OUTPUT_LIMIT = 128 * 1024

// Sensitive OS & secret paths that ACP fs callbacks will never read or write
const BLOCKED_FS_PATTERNS = [
  /^[a-z]:\\windows/i,
  /^[a-z]:\\system32/i,
  /^[a-z]:\\boot/i,
  /^\/(etc|boot|sys|proc|dev|root)(\/|$)/i,
  /(^|[\\/])\.ssh[\\/]/i,
  /(^|[\\/])\.aws[\\/]credentials$/i,
  /(^|[\\/])\.gnupg[\\/]/i,
  /(^|[\\/])\.env(\.[a-zA-Z0-9_-]+)?$/i,
]

// Destructive command guardrail for ACP `terminal/create`
const BLOCKED_CMD_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /rm\s+(-[a-zA-Z]*r[a-zA-Z]*\s+|\s+-r[a-zA-Z]*\s+)?(\/|\\\*|\/\*|\*|\~)/i, reason: 'Recursive root/wildcard deletion is prohibited' },
  { pattern: /del\s+(\/[fqs]\s+)*(c:\\\*|c:\/|\*:\*)/i, reason: 'Mass destructive Windows deletion is prohibited' },
  { pattern: /format\s+[a-z]:/i, reason: 'Disk volume formatting is prohibited' },
  { pattern: /mkfs(\.[a-z0-9]+)?\s+/i, reason: 'Filesystem formatting is prohibited' },
  { pattern: /dd\s+if=.*of=(\/dev\/|\\\\\.\\[a-z]:)/i, reason: 'Direct block device overwrite is prohibited' },
  { pattern: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, reason: 'Fork bombs are prohibited' },
  { pattern: /shutdown(\.exe)?\s+(-[srf]|\/[srf])/i, reason: 'System shutdown/restart commands are prohibited' },
  { pattern: /git\s+push\s+.*--force/i, reason: 'Forced remote Git push is prohibited via automated terminal' },
  { pattern: /rd\s+(\/[sq]\s+)*[a-z]:\\/i, reason: 'Root drive directory removal is prohibited' },
  { pattern: /reg\s+(delete|add)\s+hklm/i, reason: 'Windows HKLM registry modification is prohibited' },
]

interface AcpManagedTerminal {
  id: string
  proc: ChildProcess
  output: string
  truncated: boolean
  byteLimit: number
  exited: boolean
  exitCode: number | null
  signal: string | null
  exitWaiters: Array<(status: { exitCode: number | null; signal: string | null }) => void>
}

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: Record<string, any>
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number | string
  result?: any
  error?: { code: number; message: string; data?: any }
}

interface JsonRpcNotification {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, any>
}

interface PendingRpc {
  resolve: (value: any) => void
  reject: (reason: Error) => void
  timer?: ReturnType<typeof setTimeout>
}

interface PendingPermission {
  requestId: string | number
  resolve: (result: { outcome: { outcome: 'selected'; optionId: string } | { outcome: 'cancelled' } }) => void
}

function isPathBlocked(targetPath: string): boolean {
  const normalized = path.resolve(targetPath)
  return BLOCKED_FS_PATTERNS.some((re) => re.test(normalized))
}

export function validateAcpCommand(fullCommand: string): { safe: boolean; reason?: string } {
  const trimmed = (fullCommand || '').trim()
  if (!trimmed) return { safe: false, reason: 'Command cannot be empty' }
  for (const rule of BLOCKED_CMD_PATTERNS) {
    if (rule.pattern.test(trimmed)) {
      return { safe: false, reason: `ACP Terminal Guardrail: ${rule.reason}` }
    }
  }
  return { safe: true }
}

function execFileText(cmd: string, args: string[], timeoutMs = 4000): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const useShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(cmd)
      execFile(
        cmd,
        args,
        { timeout: timeoutMs, windowsHide: true, shell: useShell },
        (err, stdout, stderr) => {
          if (err && !stdout) {
            resolve(null)
            return
          }
          const combined = `${stdout || ''}\n${stderr || ''}`.trim()
          resolve(combined || null)
        }
      )
    } catch {
      resolve(null)
    }
  })
}

/**
 * Resolves the official Antigravity CLI (`agy`) or any custom ACP-compatible binary.
 */
export async function detectAcpBinary(command = 'agy'): Promise<AcpBinaryDetection> {
  const cleanCmd = (command || 'agy').trim()

  // 1. Direct absolute/relative path provided
  if (path.isAbsolute(cleanCmd) || cleanCmd.includes(path.sep) || cleanCmd.includes('/')) {
    if (fs.existsSync(cleanCmd)) {
      const ver = await execFileText(cleanCmd, ['--version'])
      return {
        installed: true,
        command: cleanCmd,
        resolvedPath: cleanCmd,
        version: ver ? ver.split(/\r?\n/)[0].trim() : undefined,
        installUrl: ANTIGRAVITY_INSTALL_URL,
      }
    }
    return {
      installed: false,
      command: cleanCmd,
      installUrl: ANTIGRAVITY_INSTALL_URL,
      error: `Executable not found at "${cleanCmd}"`,
    }
  }

  // 2. Lookup on PATH (`where` on Windows, `which` on POSIX)
  const locator = process.platform === 'win32' ? 'where' : 'which'
  const located = await execFileText(locator, [cleanCmd], 3000)
  let resolvedPath: string | undefined

  if (located) {
    const lines = located.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    // On Windows prefer .exe/.cmd over extensionless bash shims
    resolvedPath =
      process.platform === 'win32'
        ? lines.find((l) => /\.(exe|cmd|bat)$/i.test(l)) || lines[0]
        : lines[0]
  }

  // 3. Probe standard install locations for `agy` if not yet in PATH
  if (!resolvedPath && cleanCmd === 'agy') {
    const home = process.env.USERPROFILE || process.env.HOME || ''
    const localAppData = process.env.LOCALAPPDATA || ''
    const appData = process.env.APPDATA || ''
    const candidates =
      process.platform === 'win32'
        ? [
            path.join(home, '.antigravity', 'bin', 'agy.exe'),
            path.join(home, '.antigravity', 'bin', 'agy.cmd'),
            path.join(home, '.local', 'bin', 'agy.exe'),
            path.join(home, '.local', 'bin', 'agy.cmd'),
            path.join(localAppData, 'Antigravity', 'bin', 'agy.exe'),
            path.join(localAppData, 'Programs', 'Antigravity', 'bin', 'agy.exe'),
            path.join(localAppData, 'Programs', 'Antigravity', 'bin', 'agy.cmd'),
            path.join(localAppData, 'Google', 'Antigravity', 'bin', 'agy.cmd'),
            path.join(appData, 'npm', 'agy.cmd'),
          ]
        : [
            path.join(home, '.local', 'bin', 'agy'),
            path.join(home, '.antigravity', 'bin', 'agy'),
            '/usr/local/bin/agy',
            '/opt/homebrew/bin/agy',
          ]

    for (const candidate of candidates) {
      if (candidate && fs.existsSync(candidate)) {
        resolvedPath = candidate
        break
      }
    }
  }

  if (!resolvedPath) {
    return {
      installed: false,
      command: cleanCmd,
      installUrl: ANTIGRAVITY_INSTALL_URL,
      error: `"${cleanCmd}" was not found on PATH. Install the official Antigravity CLI to connect your Pro/Ultra/Business Google account.`,
    }
  }

  const ver = await execFileText(resolvedPath, ['--version'], 4000)
  return {
    installed: true,
    command: cleanCmd,
    resolvedPath,
    version: ver ? ver.split(/\r?\n/)[0].trim() : undefined,
    installUrl: ANTIGRAVITY_INSTALL_URL,
  }
}

export interface AcpConnectOptions {
  command?: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  mcpServers?: AcpMcpServerSpec[]
}

/**
 * Pure Node.js Agent Client Protocol (ACP v1) JSON-RPC 2.0 client over stdio.
 * Connects IndoctrinatedEdit directly to the official unmodified `agy acp` binary
 * (or any ACP-compatible coding agent) with full fs, terminal, permission, and MCP support.
 */
export class AntigravityAcpClient {
  private proc: ChildProcess | null = null
  private rl: readline.Interface | null = null
  private nextRpcId = 1
  private nextTermId = 1
  private pendingRpcs = new Map<number, PendingRpc>()
  private pendingPermissions = new Map<string, PendingPermission>()
  private terminals = new Map<string, AcpManagedTerminal>()
  private listeners = new Set<(event: AcpStreamEvent) => void>()
  private logs: string[] = []
  private currentCwd: string = process.cwd()
  private currentMcpServers: AcpMcpServerSpec[] = []
  private status: AcpStatusInfo = {
    state: 'disconnected',
    binary: {
      installed: false,
      command: 'agy',
      installUrl: ANTIGRAVITY_INSTALL_URL,
    },
    sessionId: null,
  }

  public onEvent(listener: (event: AcpStreamEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(event: AcpStreamEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (err) {
        console.error('[AntigravityAcpClient] listener error:', err)
      }
    }
  }

  private appendLog(line: string): void {
    const stamped = `[${new Date().toISOString().slice(11, 19)}] ${line}`
    this.logs.push(stamped)
    if (this.logs.length > MAX_LOG_LINES) {
      this.logs.shift()
    }
    this.emit({ type: 'log', line: stamped })
  }

  private setStatus(patch: Partial<AcpStatusInfo>): void {
    this.status = { ...this.status, ...patch }
    this.emit({ type: 'status', status: this.getStatus() })
  }

  public getStatus(): AcpStatusInfo {
    return { ...this.status }
  }

  public getLogs(): string[] {
    return [...this.logs]
  }

  public async detectCli(command = 'agy'): Promise<AcpBinaryDetection> {
    const prevState: AcpConnectionState = this.status.state
    if (prevState === 'disconnected' || prevState === 'error') {
      this.setStatus({ state: 'detecting' })
    }
    const binary = await detectAcpBinary(command)
    this.appendLog(
      binary.installed
        ? `Detected ACP binary "${binary.resolvedPath}" (${binary.version || 'version unknown'})`
        : `ACP binary "${command}" not found: ${binary.error || 'missing'}`
    )
    this.setStatus({
      binary,
      state: this.proc ? this.status.state : 'disconnected',
      lastError: binary.installed ? undefined : binary.error,
    })
    return binary
  }

  /**
   * Installs the official Google Antigravity CLI (`agy`) out-of-the-box using Google's
   * official cross-platform installer script, streaming live progress back to the UI.
   */
  public async installCli(): Promise<AcpInstallResult> {
    const installLogs: string[] = []
    const pushLog = (line: string) => {
      const clean = line.trim()
      if (!clean) return
      installLogs.push(clean)
      this.appendLog(`[install] ${clean}`)
      this.emit({ type: 'install_log', line: clean })
    }

    pushLog('Starting official Google Antigravity CLI (`agy`) installer...')

    const isWin = process.platform === 'win32'
    const cmd = isWin ? 'powershell.exe' : 'bash'
    const args = isWin
      ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', 'irm https://antigravity.google/cli/install.ps1 | iex']
      : ['-c', 'curl -fsSL https://antigravity.google/cli/install.sh | bash']

    return await new Promise<AcpInstallResult>((resolve) => {
      try {
        const proc = spawn(cmd, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
          env: process.env,
        })

        proc.stdout?.on('data', (buf: Buffer) => {
          for (const line of buf.toString('utf8').split(/\r?\n/)) pushLog(line)
        })
        proc.stderr?.on('data', (buf: Buffer) => {
          for (const line of buf.toString('utf8').split(/\r?\n/)) pushLog(line)
        })

        proc.on('error', (err) => {
          pushLog(`Installer error: ${err.message}`)
          resolve({ success: false, error: err.message, logs: installLogs })
        })

        proc.on('exit', async (code) => {
          if (code === 0) {
            pushLog('Installer finished successfully. Scanning for `agy` binary...')
            const binary = await this.detectCli('agy')
            resolve({
              success: binary.installed,
              binary,
              error: binary.installed ? undefined : 'Installer exited 0, but `agy` was not found on PATH yet.',
              logs: installLogs,
            })
          } else {
            const msg = `Antigravity CLI installer exited with code ${code}`
            pushLog(msg)
            resolve({ success: false, error: msg, logs: installLogs })
          }
        })
      } catch (err: any) {
        const msg = err?.message || String(err)
        pushLog(`Failed to launch installer: ${msg}`)
        resolve({ success: false, error: msg, logs: installLogs })
      }
    })
  }

  /**
   * Launches the official `agy` CLI in a detached external terminal so the user can
   * complete Google's first-run interactive OAuth browser sign-in if needed.
   */
  public async launchCliLogin(command = 'agy'): Promise<boolean> {
    const det = await this.detectCli(command)
    const exe = det.resolvedPath || command
    try {
      if (process.platform === 'win32') {
        spawn('cmd.exe', ['/c', 'start', '""', 'powershell.exe', '-NoExit', '-Command', `& "${exe}"`], {
          detached: true,
          stdio: 'ignore',
        }).unref()
      } else if (process.platform === 'darwin') {
        spawn('osascript', ['-e', `tell application "Terminal" to do script "${exe}"`], {
          detached: true,
          stdio: 'ignore',
        }).unref()
      } else {
        spawn('x-terminal-emulator', ['-e', exe], {
          detached: true,
          stdio: 'ignore',
        }).unref()
      }
      this.appendLog(`Launched external terminal for interactive sign-in (${exe})`)
      return true
    } catch (err: any) {
      this.appendLog(`Failed to launch external login terminal: ${err?.message || String(err)}`)
      return false
    }
  }

  /**
   * Spawns the official `agy acp` (or custom ACP binary), performs the ACP v1
   * `initialize` handshake, and starts a workspace session via `session/new`.
   */
  public async connect(options: AcpConnectOptions = {}): Promise<AcpStatusInfo> {
    const command = (options.command || 'agy').trim()
    const args = options.args && options.args.length > 0 ? options.args : ['acp']
    const cwd = options.cwd && fs.existsSync(options.cwd) ? options.cwd : process.cwd()
    this.currentCwd = cwd
    this.currentMcpServers = Array.isArray(options.mcpServers) ? options.mcpServers : []

    // Tear down any previous connection cleanly
    await this.disconnect()

    const binary = await this.detectCli(command)
    if (!binary.installed || !binary.resolvedPath) {
      this.setStatus({
        state: 'error',
        binary,
        lastError: binary.error || `Executable "${command}" not found.`,
      })
      return this.getStatus()
    }

    this.setStatus({ state: 'connecting', binary, cwd, lastError: undefined })
    this.appendLog(`Spawning ACP server: ${binary.resolvedPath} ${args.join(' ')} (cwd: ${cwd})`)

    try {
      const useShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(binary.resolvedPath)
      const child = spawn(binary.resolvedPath, args, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...(options.env || {}) },
        windowsHide: true,
        shell: useShell,
      })

      this.proc = child

      child.stderr?.on('data', (buf: Buffer) => {
        const text = buf.toString('utf8').trim()
        if (text) {
          for (const line of text.split(/\r?\n/)) {
            if (line.trim()) this.appendLog(`[stderr] ${line}`)
          }
        }
      })

      child.on('error', (err: Error) => {
        this.appendLog(`[process error] ${err.message}`)
        this.setStatus({ state: 'error', lastError: err.message, pid: undefined })
        this.rejectAllPending(err)
      })

      child.on('exit', (code, signal) => {
        this.appendLog(`ACP process exited (code=${code ?? 'null'}, signal=${signal ?? 'null'})`)
        this.proc = null
        this.rl?.close()
        this.rl = null
        this.rejectAllPending(new Error(`ACP process exited unexpectedly (code ${code ?? signal})`))
        if (this.status.state !== 'disconnected') {
          this.setStatus({
            state: code === 0 ? 'disconnected' : 'error',
            pid: undefined,
            sessionId: null,
            lastError: code && code !== 0 ? `ACP server exited with code ${code}` : undefined,
          })
        }
      })

      if (child.stdout) {
        this.rl = readline.createInterface({ input: child.stdout, crlfDelay: Infinity })
        this.rl.on('line', (line) => this.handleIncomingLine(line))
      }

      this.setStatus({ pid: child.pid })

      // 1. ACP v1 `initialize` handshake
      const initResult = await this.sendRpc('initialize', {
        protocolVersion: 1,
        clientInfo: {
          name: 'IndoctrinatedEdit',
          title: 'IndoctrinatedEdit',
          version: (() => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              return require('electron')?.app?.getVersion?.() || '6.1.2'
            } catch {
              return '6.1.2'
            }
          })(),
        },
        clientCapabilities: {
          fs: {
            readTextFile: true,
            writeTextFile: true,
          },
          terminal: true,
        },
      })

      const authMethods: AcpAuthMethod[] = Array.isArray(initResult?.authMethods)
        ? initResult.authMethods
        : []

      this.setStatus({
        protocolVersion: initResult?.protocolVersion ?? 1,
        agentInfo: initResult?.agentInfo,
        authMethods,
      })
      this.appendLog(
        `ACP initialized (protocol v${initResult?.protocolVersion ?? 1}, agent: ${initResult?.agentInfo?.name || command})`
      )

      // 2. Create initial workspace session via `session/new`
      try {
        await this.createSession(cwd)
      } catch (sessionErr: any) {
        const msg = sessionErr?.message || String(sessionErr)
        // If agent requires authentication before session/new, surface auth state cleanly
        if (/auth|login|unauthenticated|sign in|401/i.test(msg) && authMethods.length > 0) {
          this.appendLog(`Authentication required by ACP agent: ${msg}`)
          this.setStatus({
            state: 'authenticating',
            lastError: msg,
          })
          return this.getStatus()
        }
        throw sessionErr
      }

      return this.getStatus()
    } catch (err: any) {
      const message = err?.message || String(err)
      this.appendLog(`Connection failed: ${message}`)
      await this.disconnect()
      this.setStatus({ state: 'error', lastError: message })
      return this.getStatus()
    }
  }

  /**
   * Invokes ACP `authenticate` for the given auth method ID (e.g. `oauth-personal`),
   * then automatically creates a fresh workspace session.
   */
  public async authenticate(methodId: string): Promise<AcpStatusInfo> {
    if (!this.proc) {
      throw new Error('ACP server is not connected.')
    }
    this.setStatus({ state: 'authenticating', lastError: undefined })
    this.appendLog(`Requesting ACP authenticate (method: ${methodId})...`)
    await this.sendRpc('authenticate', { methodId }, 180_000)
    this.appendLog('ACP authentication succeeded.')
    await this.createSession(this.currentCwd)
    return this.getStatus()
  }

  /**
   * Creates a new isolated ACP conversation session (`session/new`).
   */
  public async createSession(cwd?: string, mcpServers?: AcpMcpServerSpec[]): Promise<string> {
    if (!this.proc) {
      throw new Error('ACP server is not connected.')
    }
    const targetCwd = cwd && fs.existsSync(cwd) ? cwd : this.currentCwd
    this.currentCwd = targetCwd
    if (Array.isArray(mcpServers)) {
      this.currentMcpServers = mcpServers
    }

    const res = await this.sendRpc('session/new', {
      cwd: targetCwd,
      mcpServers: this.currentMcpServers,
    })

    const sessionId = String(res?.sessionId || '')
    if (!sessionId) {
      throw new Error('ACP agent returned an empty sessionId from session/new.')
    }

    const modes: AcpModeOption[] = Array.isArray(res?.modes?.availableModes)
      ? res.modes.availableModes
      : []
    const currentModeId: string | undefined = res?.modes?.currentModeId

    const models: AcpModelOption[] = Array.isArray(res?.models?.availableModels)
      ? res.models.availableModels
      : []
    const currentModelId: string | undefined = res?.models?.currentModelId

    this.setStatus({
      state: 'ready',
      sessionId,
      cwd: targetCwd,
      modes,
      currentModeId,
      models,
      currentModelId,
      lastError: undefined,
    })
    this.appendLog(`ACP session created: ${sessionId}`)
    return sessionId
  }

  /**
   * Sends a user prompt turn (`session/prompt`). Real-time chunks arrive via `session/update`
   * notifications and are forwarded through `onEvent`.
   */
  public async sendPrompt(text: string): Promise<{ stopReason?: string }> {
    if (!this.proc || !this.status.sessionId) {
      throw new Error('No active ACP session. Connect to Antigravity CLI first.')
    }
    const sessionId = this.status.sessionId
    const res = await this.sendRpc(
      'session/prompt',
      {
        sessionId,
        prompt: [{ type: 'text', text }],
      },
      // Agentic multi-step prompts can run for several minutes
      10 * 60_000
    )
    const stopReason = res?.stopReason
    this.emit({ type: 'prompt_done', sessionId, stopReason })
    return { stopReason }
  }

  /**
   * Interrupts an in-flight prompt turn via ACP `session/cancel` notification.
   */
  public cancelPrompt(): void {
    if (!this.proc || !this.status.sessionId) return
    this.appendLog(`Sending session/cancel for ${this.status.sessionId}`)
    this.writeJson({
      jsonrpc: '2.0',
      method: 'session/cancel',
      params: { sessionId: this.status.sessionId },
    })
    // Also cancel any dangling permission prompts so the agent unblocks immediately
    for (const [key, pending] of this.pendingPermissions.entries()) {
      pending.resolve({ outcome: { outcome: 'cancelled' } })
      this.pendingPermissions.delete(key)
    }
  }

  public async setMode(modeId: string): Promise<void> {
    if (!this.proc || !this.status.sessionId) return
    await this.sendRpc('session/set_mode', {
      sessionId: this.status.sessionId,
      modeId,
    })
    this.setStatus({ currentModeId: modeId })
  }

  public async setModel(modelId: string): Promise<void> {
    if (!this.proc || !this.status.sessionId) return
    await this.sendRpc('session/set_model', {
      sessionId: this.status.sessionId,
      modelId,
    })
    this.setStatus({ currentModelId: modelId })
  }

  /**
   * Resolves a pending `session/request_permission` callback initiated by the ACP agent.
   */
  public respondPermission(requestId: string | number, optionId: string | null): boolean {
    const key = String(requestId)
    const pending = this.pendingPermissions.get(key)
    if (!pending) return false
    this.pendingPermissions.delete(key)
    if (optionId) {
      pending.resolve({ outcome: { outcome: 'selected', optionId } })
    } else {
      pending.resolve({ outcome: { outcome: 'cancelled' } })
    }
    return true
  }

  public async disconnect(): Promise<void> {
    for (const [key, pending] of this.pendingPermissions.entries()) {
      pending.resolve({ outcome: { outcome: 'cancelled' } })
      this.pendingPermissions.delete(key)
    }
    for (const termId of Array.from(this.terminals.keys())) {
      this.releaseTerminal(termId)
    }
    this.rejectAllPending(new Error('ACP client disconnected'))

    if (this.rl) {
      this.rl.close()
      this.rl = null
    }
    if (this.proc) {
      const p = this.proc
      this.proc = null
      try {
        p.stdin?.end()
        p.kill()
      } catch {
        // already exited
      }
    }
    this.setStatus({
      state: 'disconnected',
      pid: undefined,
      sessionId: null,
    })
  }

  private writeJson(payload: JsonRpcRequest | JsonRpcResponse | JsonRpcNotification): void {
    if (!this.proc?.stdin || !this.proc.stdin.writable) {
      throw new Error('ACP stdin stream is not writable.')
    }
    this.proc.stdin.write(JSON.stringify(payload) + '\n', 'utf8')
  }

  private sendRpc(method: string, params?: Record<string, any>, timeoutMs = DEFAULT_RPC_TIMEOUT_MS): Promise<any> {
    const id = this.nextRpcId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRpcs.delete(id)
        reject(new Error(`ACP RPC "${method}" timed out after ${Math.round(timeoutMs / 1000)}s`))
      }, timeoutMs)

      this.pendingRpcs.set(id, { resolve, reject, timer })
      try {
        this.writeJson({ jsonrpc: '2.0', id, method, params })
      } catch (err: any) {
        clearTimeout(timer)
        this.pendingRpcs.delete(id)
        reject(err instanceof Error ? err : new Error(String(err)))
      }
    })
  }

  private rejectAllPending(err: Error): void {
    for (const [id, pending] of this.pendingRpcs.entries()) {
      if (pending.timer) clearTimeout(pending.timer)
      pending.reject(err)
      this.pendingRpcs.delete(id)
    }
  }

  private handleIncomingLine(rawLine: string): void {
    const trimmed = rawLine.trim()
    if (!trimmed) return

    let msg: any
    try {
      msg = JSON.parse(trimmed)
    } catch {
      // Non-JSON stdout log line from CLI
      this.appendLog(`[stdout] ${trimmed}`)
      return
    }

    // 1. JSON-RPC Response to one of our outgoing requests
    if (msg.id !== undefined && !msg.method) {
      const numericId = Number(msg.id)
      const pending = this.pendingRpcs.get(numericId)
      if (pending) {
        if (pending.timer) clearTimeout(pending.timer)
        this.pendingRpcs.delete(numericId)
        if (msg.error) {
          pending.reject(new Error(msg.error.message || JSON.stringify(msg.error)))
        } else {
          pending.resolve(msg.result)
        }
      }
      return
    }

    // 2. JSON-RPC Notification from Agent (no `id`)
    if (msg.method && msg.id === undefined) {
      if (msg.method === 'session/update') {
        this.handleSessionUpdate(msg.params)
      }
      return
    }

    // 3. Bidirectional Agent -> Client JSON-RPC Request (`id` + `method`)
    if (msg.method && msg.id !== undefined) {
      void this.handleAgentRequest(msg.id, msg.method, msg.params || {})
    }
  }

  private handleSessionUpdate(params: any): void {
    if (!params) return
    const sessionId = String(params.sessionId || this.status.sessionId || '')
    const update = params.update
    if (!update || typeof update !== 'object') return

    const kind = update.sessionUpdate
    if (kind === 'agent_message_chunk') {
      const text = update.content?.text ?? (typeof update.content === 'string' ? update.content : '')
      if (text) {
        this.emit({ type: 'message_chunk', sessionId, text })
      }
    } else if (kind === 'agent_thought_chunk') {
      const text = update.content?.text ?? (typeof update.content === 'string' ? update.content : '')
      if (text) {
        this.emit({ type: 'thought_chunk', sessionId, text })
      }
    } else if (kind === 'tool_call') {
      const toolCall: AcpToolCallUpdate = {
        toolCallId: String(update.toolCallId || `tc-${Date.now()}`),
        title: String(update.title || update.name || 'Tool action'),
        kind: update.kind,
        status: update.status || 'in_progress',
        rawInput: update.rawInput,
        rawOutput: update.rawOutput,
        locations: Array.isArray(update.locations) ? update.locations : undefined,
        content: Array.isArray(update.content) ? update.content : undefined,
      }
      this.emit({ type: 'tool_call', sessionId, toolCall })
    } else if (kind === 'tool_call_update') {
      this.emit({
        type: 'tool_call_update',
        sessionId,
        toolCall: {
          toolCallId: String(update.toolCallId || ''),
          ...(update.title !== undefined ? { title: String(update.title) } : {}),
          ...(update.kind !== undefined ? { kind: update.kind } : {}),
          ...(update.status !== undefined ? { status: update.status } : {}),
          ...(update.rawInput !== undefined ? { rawInput: update.rawInput } : {}),
          ...(update.rawOutput !== undefined ? { rawOutput: update.rawOutput } : {}),
          ...(Array.isArray(update.locations) ? { locations: update.locations } : {}),
          ...(Array.isArray(update.content) ? { content: update.content } : {}),
        },
      })
    } else if (kind === 'plan') {
      const entries: AcpPlanEntry[] = Array.isArray(update.entries) ? update.entries : []
      this.emit({ type: 'plan', sessionId, entries })
    } else if (kind === 'available_commands_update') {
      const commands: AcpSlashCommand[] = Array.isArray(update.availableCommands)
        ? update.availableCommands
        : []
      this.setStatus({ commands })
      this.emit({ type: 'commands_updated', sessionId, commands })
    } else if (kind === 'current_mode_update' && update.currentModeId) {
      this.setStatus({ currentModeId: String(update.currentModeId) })
      this.emit({ type: 'mode_changed', sessionId, modeId: String(update.currentModeId) })
    }
  }

  private killTerminalProcess(term: AcpManagedTerminal): void {
    if (term.exited) return
    try {
      if (process.platform === 'win32' && term.proc.pid) {
        spawn('taskkill', ['/PID', String(term.proc.pid), '/T', '/F'], {
          windowsHide: true,
          stdio: 'ignore',
        })
      } else {
        term.proc.kill('SIGTERM')
      }
    } catch {
      // already exited
    }
  }

  private releaseTerminal(terminalId: string): void {
    const term = this.terminals.get(terminalId)
    if (!term) return
    this.killTerminalProcess(term)
    this.terminals.delete(terminalId)
  }

  private createManagedTerminal(params: Record<string, any>): { terminalId: string } {
    const command = String(params.command || '').trim()
    const args: string[] = Array.isArray(params.args) ? params.args.map(String) : []
    const fullCommand = [command, ...args].join(' ').trim()

    const check = validateAcpCommand(fullCommand)
    if (!check.safe) {
      throw new Error(check.reason || `Blocked unsafe command: "${fullCommand}"`)
    }

    const cwd =
      params.cwd && typeof params.cwd === 'string' && fs.existsSync(params.cwd)
        ? params.cwd
        : this.currentCwd

    const extraEnv: Record<string, string> = {}
    if (Array.isArray(params.env)) {
      for (const entry of params.env) {
        if (entry?.name) extraEnv[String(entry.name)] = String(entry.value ?? '')
      }
    } else if (params.env && typeof params.env === 'object') {
      for (const [k, v] of Object.entries(params.env)) {
        extraEnv[k] = String(v ?? '')
      }
    }

    const byteLimit =
      typeof params.outputByteLimit === 'number' && params.outputByteLimit > 0
        ? params.outputByteLimit
        : DEFAULT_TERMINAL_OUTPUT_LIMIT

    const terminalId = `acp-term-${this.nextTermId++}`
    this.appendLog(`[terminal:${terminalId}] $ ${fullCommand} (cwd: ${cwd})`)

    const useShell = args.length === 0 || (process.platform === 'win32' && /\.(cmd|bat)$/i.test(command))
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      shell: useShell,
    })

    const managed: AcpManagedTerminal = {
      id: terminalId,
      proc: child,
      output: '',
      truncated: false,
      byteLimit,
      exited: false,
      exitCode: null,
      signal: null,
      exitWaiters: [],
    }

    const appendChunk = (buf: Buffer) => {
      managed.output += buf.toString('utf8')
      if (Buffer.byteLength(managed.output, 'utf8') > managed.byteLimit) {
        managed.truncated = true
        // Keep the most recent `byteLimit` characters from the tail
        const sliceLen = Math.max(256, Math.floor(managed.byteLimit * 0.85))
        managed.output = managed.output.slice(-sliceLen)
      }
    }

    child.stdout?.on('data', appendChunk)
    child.stderr?.on('data', appendChunk)

    const finalize = (exitCode: number | null, signal: string | null) => {
      if (managed.exited) return
      managed.exited = true
      managed.exitCode = exitCode
      managed.signal = signal
      for (const waiter of managed.exitWaiters) {
        waiter({ exitCode, signal })
      }
      managed.exitWaiters = []
    }

    child.on('error', (err) => {
      appendChunk(Buffer.from(`\n[spawn error] ${err.message}\n`))
      finalize(1, null)
    })

    child.on('exit', (code, signal) => {
      finalize(code, signal)
    })

    this.terminals.set(terminalId, managed)
    return { terminalId }
  }

  private async handleAgentRequest(id: string | number, method: string, params: Record<string, any>): Promise<void> {
    try {
      if (method === 'session/request_permission') {
        const options: AcpPermissionOption[] = Array.isArray(params.options) && params.options.length > 0
          ? params.options
          : [
              { optionId: 'allow_once', name: 'Allow Once', kind: 'allow_once' },
              { optionId: 'allow_always', name: 'Allow Always', kind: 'allow_always' },
              { optionId: 'reject_once', name: 'Reject', kind: 'reject_once' },
            ]

        const toolCall: AcpToolCallUpdate = {
          toolCallId: String(params.toolCall?.toolCallId || `perm-${id}`),
          title: String(params.toolCall?.title || 'Confirm action'),
          kind: params.toolCall?.kind,
          status: 'pending',
          rawInput: params.toolCall?.rawInput,
          locations: params.toolCall?.locations,
          content: params.toolCall?.content,
        }

        const request: AcpPermissionRequest = {
          requestId: id,
          sessionId: String(params.sessionId || this.status.sessionId || ''),
          toolCall,
          options,
        }

        const result = await new Promise<{ outcome: { outcome: 'selected'; optionId: string } | { outcome: 'cancelled' } }>((resolve) => {
          this.pendingPermissions.set(String(id), { requestId: id, resolve })
          this.emit({ type: 'permission_request', request })
        })

        this.writeJson({ jsonrpc: '2.0', id, result })
        return
      }

      if (method === 'fs/read_text_file') {
        const targetPath = String(params.path || '')
        if (!targetPath || isPathBlocked(targetPath)) {
          throw new Error(`Access denied for path "${targetPath}"`)
        }
        const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(this.currentCwd, targetPath)
        let content = await fs.promises.readFile(resolved, 'utf8')
        if (typeof params.line === 'number' || typeof params.limit === 'number') {
          const lines = content.split(/\r?\n/)
          const startIdx = Math.max(0, (Number(params.line) || 1) - 1)
          const endIdx = typeof params.limit === 'number' ? startIdx + Number(params.limit) : lines.length
          content = lines.slice(startIdx, endIdx).join('\n')
        }
        this.writeJson({ jsonrpc: '2.0', id, result: { content } })
        return
      }

      if (method === 'fs/write_text_file') {
        const targetPath = String(params.path || '')
        if (!targetPath || isPathBlocked(targetPath)) {
          throw new Error(`Write denied for protected path "${targetPath}"`)
        }
        const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(this.currentCwd, targetPath)
        let beforeContent = ''
        let isNewFile = true
        try {
          beforeContent = await fs.promises.readFile(resolved, 'utf8')
          isNewFile = false
        } catch {
          // New file
        }
        const afterContent = String(params.content ?? '')
        await fs.promises.mkdir(path.dirname(resolved), { recursive: true })
        await fs.promises.writeFile(resolved, afterContent, 'utf8')
        this.emit({ type: 'file_written', path: resolved, beforeContent, afterContent, isNewFile })
        this.writeJson({ jsonrpc: '2.0', id, result: {} })
        return
      }

      if (method === 'terminal/create') {
        const result = this.createManagedTerminal(params)
        this.writeJson({ jsonrpc: '2.0', id, result })
        return
      }

      if (method === 'terminal/output') {
        const terminalId = String(params.terminalId || '')
        const term = this.terminals.get(terminalId)
        if (!term) throw new Error(`Unknown terminalId "${terminalId}"`)
        this.writeJson({
          jsonrpc: '2.0',
          id,
          result: {
            output: term.output,
            truncated: term.truncated,
            ...(term.exited
              ? { exitStatus: { exitCode: term.exitCode, signal: term.signal } }
              : {}),
          },
        })
        return
      }

      if (method === 'terminal/wait_for_exit') {
        const terminalId = String(params.terminalId || '')
        const term = this.terminals.get(terminalId)
        if (!term) throw new Error(`Unknown terminalId "${terminalId}"`)
        const exitStatus = term.exited
          ? { exitCode: term.exitCode, signal: term.signal }
          : await new Promise<{ exitCode: number | null; signal: string | null }>((resolve) => {
              term.exitWaiters.push(resolve)
            })
        this.writeJson({ jsonrpc: '2.0', id, result: exitStatus })
        return
      }

      if (method === 'terminal/kill') {
        const terminalId = String(params.terminalId || '')
        const term = this.terminals.get(terminalId)
        if (!term) throw new Error(`Unknown terminalId "${terminalId}"`)
        this.killTerminalProcess(term)
        this.writeJson({ jsonrpc: '2.0', id, result: {} })
        return
      }

      if (method === 'terminal/release') {
        const terminalId = String(params.terminalId || '')
        this.releaseTerminal(terminalId)
        this.writeJson({ jsonrpc: '2.0', id, result: {} })
        return
      }

      this.writeJson({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not implemented by client: ${method}` },
      })
    } catch (err: any) {
      try {
        this.writeJson({
          jsonrpc: '2.0',
          id,
          error: { code: -32000, message: err?.message || String(err) },
        })
      } catch {
        // stream closed
      }
    }
  }
}

export const antigravityAcpClient = new AntigravityAcpClient()

/**
 * Registers Antigravity ACP IPC handlers in Electron main process.
 */
export function setupAntigravityAcpIPC(
  ipcMain: IpcMain,
  getMainWindow: () => BrowserWindow | null
): void {
  antigravityAcpClient.onEvent((event) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('antigravity:acpEvent', event)
    }
  })

  ipcMain.handle('antigravity:detectCli', async (_, command?: string) => {
    return await antigravityAcpClient.detectCli(command)
  })

  ipcMain.handle('antigravity:installCli', async () => {
    return await antigravityAcpClient.installCli()
  })

  ipcMain.handle('antigravity:launchCliLogin', async (_, command?: string) => {
    return await antigravityAcpClient.launchCliLogin(command)
  })

  ipcMain.handle('antigravity:connect', async (_, options?: AcpConnectOptions) => {
    return await antigravityAcpClient.connect(options)
  })

  ipcMain.handle('antigravity:disconnect', async () => {
    await antigravityAcpClient.disconnect()
    return true
  })

  ipcMain.handle('antigravity:authenticate', async (_, methodId: string) => {
    return await antigravityAcpClient.authenticate(methodId)
  })

  ipcMain.handle('antigravity:newSession', async (_, cwd?: string, mcpServers?: AcpMcpServerSpec[]) => {
    return await antigravityAcpClient.createSession(cwd, mcpServers)
  })

  ipcMain.handle('antigravity:sendPrompt', async (_, text: string) => {
    return await antigravityAcpClient.sendPrompt(text)
  })

  ipcMain.handle('antigravity:cancelPrompt', async () => {
    antigravityAcpClient.cancelPrompt()
    return true
  })

  ipcMain.handle('antigravity:setMode', async (_, modeId: string) => {
    await antigravityAcpClient.setMode(modeId)
    return true
  })

  ipcMain.handle('antigravity:setModel', async (_, modelId: string) => {
    await antigravityAcpClient.setModel(modelId)
    return true
  })

  ipcMain.handle('antigravity:respondPermission', async (_, requestId: string | number, optionId: string | null) => {
    return antigravityAcpClient.respondPermission(requestId, optionId)
  })

  ipcMain.handle('antigravity:getStatus', async () => {
    return antigravityAcpClient.getStatus()
  })

  ipcMain.handle('antigravity:getLogs', async () => {
    return antigravityAcpClient.getLogs()
  })

  ipcMain.handle('antigravity:openExternalUrl', async (_, url: string) => {
    const { shell } = await import('electron')
    if (/^https?:\/\//i.test(url)) {
      await shell.openExternal(url)
      return true
    }
    return false
  })
}

import { spawn, spawnSync, execFile, ChildProcessWithoutNullStreams } from 'child_process'
import { IpcMain, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { createRequire } from 'node:module'
import type { IPty } from 'node-pty'

/**
 * The Electron main process is bundled as an **ESM** module (package.json has
 * `"type": "module"`), therefore the CommonJS `require` identifier does not
 * exist in this scope.
 *
 * A bare `require('node-pty')` throws `ReferenceError: require is not defined`.
 * That error used to be swallowed by the try/catch below, which silently
 * degraded every terminal session to a piped `child_process.spawn()` with **no
 * pseudo-console**. Without a real ConPTY:
 *   - cmd.exe never echoes keystrokes (looks like the terminal is dead),
 *   - PowerShell has no PSReadLine console, so Backspace is ignored and Tab
 *     inserts a literal tab (rendered as 8 spaces) instead of completing,
 *   - full-screen TUI programs (e.g. `ir pmon`) render their first frame from
 *     stdout but can never receive raw keypresses from stdin.
 *
 * `createRequire` gives us a genuine CommonJS resolver rooted at this module so
 * node-pty (and its bundled ConPTY/winpty binaries) load correctly in both
 * `npm run dev` and packaged (asar) builds.
 */
const requireFromMain = createRequire(import.meta.url)

let nodePty: typeof import('node-pty') | null = null
let nodePtyLoadError: string | null = null
try {
  nodePty = requireFromMain('node-pty')
} catch (e) {
  nodePtyLoadError = e instanceof Error ? e.message : String(e)
  console.warn('[TerminalService] node-pty not loaded, falling back to standard child_process:', e)
}

/**
 * Returns the running Windows build number (e.g. 26200 for `10.0.26200`).
 * xterm.js uses this to apply the correct ConPTY line-wrap/reflow workarounds.
 */
function getWindowsBuildNumber(): number {
  try {
    const parts = os.release().split('.')
    const build = Number(parts[2])
    return Number.isFinite(build) && build > 0 ? build : 0
  } catch {
    return 0
  }
}

/* ==========================================================================
 * Process-tree teardown helpers
 *
 * A terminal session is never a single process: the shell spawns children, and
 * those spawn grandchildren (TUIs such as `ir pmon`, esbuild watchers, node
 * daemons...). Killing only the shell leaves those orphans running forever,
 * holding locks and pipe handles. The helpers below take down the whole tree.
 * ======================================================================== */

const IS_WINDOWS = process.platform === 'win32'

/**
 * `wmic` is deprecated and absent on recent Windows builds, so process
 * enumeration goes through PowerShell CIM instead.
 */
const PROCESS_PAIRS_POWERSHELL =
  'Get-CimInstance Win32_Process | ForEach-Object { "$($_.ProcessId) $($_.ParentProcessId)" }'

let powershellPathCache: string | null = null

function resolvePowerShell(): string {
  if (powershellPathCache) return powershellPathCache
  const sysRoot = process.env.SystemRoot || process.env.SYSTEMROOT || 'C:\\Windows'
  const candidate = path.join(sysRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  powershellPathCache = fs.existsSync(candidate) ? candidate : 'powershell.exe'
  return powershellPathCache
}

/**
 * Parses the `ProcessId ParentProcessId` pairs printed by
 * {@link PROCESS_PAIRS_POWERSHELL}. Exported for unit testing.
 */
export function parseProcessPairs(output: string): Array<[number, number]> {
  const pairs: Array<[number, number]> = []
  for (const line of output.split(/\r?\n/)) {
    const match = line.trim().match(/^(\d+)\s+(\d+)$/)
    if (match) pairs.push([Number(match[1]), Number(match[2])])
  }
  return pairs
}

/**
 * Walks a `[pid, parentPid]` snapshot and returns every descendant of `rootPid`.
 *
 * Windows retains a process' original `ParentProcessId` even after its parent
 * has exited, so this walk still finds the children of an already-dead shell -
 * which is exactly the orphan case `taskkill /T` cannot handle once the root is
 * gone. Exported for unit testing.
 */
export function collectDescendantPids(
  rootPid: number,
  pairs: Array<[number, number]>
): number[] {
  const childrenOf = new Map<number, number[]>()
  for (const [pid, parentPid] of pairs) {
    const bucket = childrenOf.get(parentPid)
    if (bucket) bucket.push(pid)
    else childrenOf.set(parentPid, [pid])
  }

  const descendants: number[] = []
  const visited = new Set<number>([rootPid])
  const queue: number[] = [rootPid]

  while (queue.length > 0) {
    const current = queue.shift() as number
    for (const child of childrenOf.get(current) || []) {
      if (visited.has(child)) continue
      visited.add(child)
      descendants.push(child)
      queue.push(child)
    }
  }

  return descendants
}

/**
 * Best-effort `taskkill /F [/T] /PID <pid>`. Never throws.
 */
function taskkill(pid: number, options: { tree: boolean; sync: boolean }): void {
  if (!IS_WINDOWS || !Number.isFinite(pid) || pid <= 0) return
  const args = ['/F', ...(options.tree ? ['/T'] : []), '/PID', String(pid)]
  try {
    if (options.sync) {
      spawnSync('taskkill', args, { stdio: 'ignore', windowsHide: true, timeout: 5000 })
    } else {
      const child = spawn('taskkill', args, { stdio: 'ignore', windowsHide: true })
      child.on('error', () => {})
      child.unref()
    }
  } catch {
    /* best effort - the process may already be gone */
  }
}

/**
 * Synchronously snapshots every live `[pid, parentPid]` pair on Windows.
 * Returns `[]` on failure or on POSIX so callers degrade gracefully.
 */
function queryProcessPairsSync(): Array<[number, number]> {
  if (!IS_WINDOWS) return []
  try {
    const result = spawnSync(
      resolvePowerShell(),
      ['-NoProfile', '-NonInteractive', '-Command', PROCESS_PAIRS_POWERSHELL],
      { encoding: 'utf8', windowsHide: true, timeout: 5000, maxBuffer: 8 * 1024 * 1024 }
    )
    return result.stdout ? parseProcessPairs(result.stdout) : []
  } catch {
    return []
  }
}

export interface ShellProfile {
  id: string
  name: string
  path: string
  args?: string[]
  icon: 'powershell' | 'git' | 'cygwin' | 'terminal' | 'cmd' | 'wsl'
  isDefault?: boolean
}

export interface TerminalConfig {
  defaultShellId?: string
  fontSize: number
  fontFamily: string
  cursorStyle: 'block' | 'underline' | 'line'
  cursorBlink: boolean
  scrollback: number
  profiles: ShellProfile[]
}

export interface TerminalSessionInfo {
  id: string
  shellId: string
  shellName: string
  pid?: number
  cwd: string
  /** True when the session is backed by a genuine pseudo-console (node-pty). */
  pty?: boolean
  /** Which pseudo-console implementation is driving the session. */
  backend?: 'conpty' | 'winpty' | 'openpty' | 'pipe'
  /** Windows build number, forwarded to xterm.js for ConPTY workarounds. */
  osBuild?: number
}

export interface TerminalDiagnostics {
  ptyAvailable: boolean
  ptyLoadError: string | null
  backend: 'conpty' | 'winpty' | 'openpty' | 'pipe'
  osBuild: number
  platform: NodeJS.Platform
  activeSessions: number
}

type ActiveTerminalProcess = IPty | ChildProcessWithoutNullStreams

interface ActiveSession {
  process: ActiveTerminalProcess
  isPty: boolean
  info: TerminalSessionInfo
}

export class TerminalService {
  private static instance: TerminalService
  private sessions: Map<string, ActiveSession> = new Map()
  /**
   * Sessions the application asked to terminate (Kill button, tab close, window
   * close, app quit).
   *
   * This lives outside the session map because the map entry is deleted as soon
   * as the kill is issued, while node-pty's `onExit` fires asynchronously
   * afterwards. Without it, every intentional kill would be misreported as a
   * user-typed `exit`.
   */
  private terminatingSessions: Set<string> = new Set()
  private configPath: string

  private constructor() {
    const configDir = path.join(os.homedir(), '.indoctrinated')
    try {
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
      }
    } catch (e) {
      console.warn('[TerminalService] Could not create config dir:', e)
    }
    this.configPath = path.join(configDir, 'terminal.json')
  }

  public static getInstance(): TerminalService {
    if (!TerminalService.instance) {
      TerminalService.instance = new TerminalService()
    }
    return TerminalService.instance
  }

  /**
   * Probes the filesystem and PATH for installed shell environments.
   */
  public detectShells(): ShellProfile[] {
    const isWin = process.platform === 'win32'
    const profiles: ShellProfile[] = []

    if (isWin) {
      const sysRoot = process.env.SystemRoot || process.env.SYSTEMROOT || 'C:\\Windows'
      const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')

      // 1. Windows PowerShell
      const sysPowerShellLocations = [
        path.join(sysRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
        'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
        this.findExecutableInPath('powershell.exe'),
      ]
      const sysPowerShell = sysPowerShellLocations.find((p) => p && this.checkExists(p))
      if (sysPowerShell) {
        profiles.push({
          id: 'powershell',
          name: 'Windows PowerShell',
          path: sysPowerShell,
          icon: 'powershell',
          args: ['-NoLogo'],
          isDefault: true,
        })
      }

      // 2. PowerShell 7 (pwsh)
      const pwshLocations = [
        this.findExecutableInPath('pwsh.exe'),
        'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
        'C:\\Program Files\\PowerShell\\7-preview\\pwsh.exe',
        path.join(localAppData, 'Programs', 'PowerShell', 'pwsh.exe'),
      ]
      const pwshPath = pwshLocations.find((p) => p && this.checkExists(p))
      if (pwshPath) {
        profiles.push({
          id: 'pwsh',
          name: 'PowerShell 7',
          path: pwshPath,
          icon: 'powershell',
          args: ['-NoLogo'],
          isDefault: profiles.length === 0,
        })
      }

      // 3. Git Bash
      const gitBashLocations = [
        'C:\\Program Files\\Git\\bin\\bash.exe',
        'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
        'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
        path.join(localAppData, 'Programs', 'Git', 'bin', 'bash.exe'),
        path.join(localAppData, 'Programs', 'Git', 'usr', 'bin', 'bash.exe'),
        this.findExecutableInPath('bash.exe'),
      ]
      const gitBashPath = gitBashLocations.find((p) => p && this.checkExists(p))
      if (gitBashPath) {
        profiles.push({
          id: 'gitbash',
          name: 'Git Bash',
          path: gitBashPath,
          icon: 'git',
          args: ['--login', '-i'],
          isDefault: profiles.length === 0,
        })
      }

      // 4. Cygwin
      const cygwinLocations = [
        'C:\\cygwin64\\bin\\bash.exe',
        'C:\\cygwin\\bin\\bash.exe',
        'D:\\cygwin64\\bin\\bash.exe',
        'D:\\cygwin\\bin\\bash.exe',
        'E:\\cygwin64\\bin\\bash.exe',
      ]
      const cygwinPath = cygwinLocations.find((p) => this.checkExists(p))
      if (cygwinPath) {
        profiles.push({
          id: 'cygwin',
          name: 'Cygwin',
          path: cygwinPath,
          icon: 'cygwin',
          args: ['--login', '-i'],
          isDefault: profiles.length === 0,
        })
      }

      // 5. WSL (Linux)
      const wslLocations = [
        path.join(sysRoot, 'System32', 'wsl.exe'),
        'C:\\Windows\\System32\\wsl.exe',
        this.findExecutableInPath('wsl.exe'),
      ]
      const wslPath = wslLocations.find((p) => p && this.checkExists(p))
      if (wslPath) {
        profiles.push({
          id: 'wsl',
          name: 'WSL (Linux)',
          path: wslPath,
          icon: 'wsl',
          isDefault: profiles.length === 0,
        })
      }

      // 6. Command Prompt (cmd.exe)
      const cmdLocations = [
        path.join(sysRoot, 'System32', 'cmd.exe'),
        'C:\\Windows\\System32\\cmd.exe',
        this.findExecutableInPath('cmd.exe'),
      ]
      const cmdPath = cmdLocations.find((p) => p && this.checkExists(p))
      if (cmdPath) {
        profiles.push({
          id: 'cmd',
          name: 'Command Prompt',
          path: cmdPath,
          icon: 'cmd',
          isDefault: profiles.length === 0,
        })
      }

      if (profiles.length === 0) {
        profiles.push({
          id: 'cmd',
          name: 'Command Prompt',
          path: process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe',
          icon: 'cmd',
          isDefault: true,
        })
      }
    } else {
      // Unix / macOS
      const standardShells = [
        { id: 'bash', name: 'Bash', path: '/bin/bash' },
        { id: 'zsh', name: 'Zsh', path: '/bin/zsh' },
        { id: 'fish', name: 'Fish', path: '/usr/bin/fish' },
        { id: 'sh', name: 'Sh', path: '/bin/sh' },
      ]

      for (const s of standardShells) {
        if (this.checkExists(s.path)) {
          profiles.push({
            id: s.id,
            name: s.name,
            path: s.path,
            icon: 'terminal',
            isDefault: profiles.length === 0,
          })
        }
      }
    }

    return profiles
  }

  private checkExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath)
    } catch {
      return false
    }
  }

  private findExecutableInPath(exeName: string): string | null {
    const envPath = process.env.PATH || process.env.Path || ''
    const parts = envPath.split(path.delimiter)
    for (const part of parts) {
      const full = path.join(part, exeName)
      if (this.checkExists(full)) {
        return full
      }
    }
    return null
  }

  /**
   * Loads user terminal configuration from ~/.indoctrinated/terminal.json
   */
  public getConfig(): TerminalConfig {
    const detected = this.detectShells()
    const defaultConfig: TerminalConfig = {
      defaultShellId: detected.find((p) => p.isDefault)?.id || detected[0]?.id || 'cmd',
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
      cursorStyle: 'block',
      cursorBlink: true,
      scrollback: 5000,
      profiles: detected,
    }

    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8')
        const parsed = JSON.parse(raw)
        return {
          ...defaultConfig,
          ...parsed,
          profiles: detected.map((d) => {
            const userCustom = parsed.profiles?.find((p: any) => p.id === d.id)
            return userCustom ? { ...d, ...userCustom } : d
          }),
        }
      }
    } catch (e) {
      console.warn('[TerminalService] Failed to read terminal.json:', e)
    }

    return defaultConfig
  }

  /**
   * Persists user terminal configuration.
   */
  public saveConfig(config: Partial<TerminalConfig>): boolean {
    try {
      const current = this.getConfig()
      const merged = { ...current, ...config }
      fs.writeFileSync(this.configPath, JSON.stringify(merged, null, 2), 'utf8')
      return true
    } catch (e) {
      console.error('[TerminalService] Failed to write terminal.json:', e)
      return false
    }
  }

  /**
   * Creates an interactive PTY session for a given shell profile.
   */
  public createSession(
    options: {
      shellId?: string
      cwd?: string
      cols?: number
      rows?: number
    },
    mainWindow: BrowserWindow
  ): TerminalSessionInfo {
    const config = this.getConfig()
    const targetShellId = options.shellId || config.defaultShellId
    const detected = this.detectShells()
    let profile = config.profiles.find((p) => p.id === targetShellId && this.checkExists(p.path)) ||
                  detected.find((p) => p.id === targetShellId) ||
                  detected[0] ||
                  config.profiles.find((p) => this.checkExists(p.path))

    if (!profile) {
      profile = {
        id: 'cmd',
        name: 'Command Prompt',
        path: process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe',
        icon: 'cmd',
      }
    }

    const sessionId = `term-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const targetCwd = options.cwd && options.cwd !== '.' && fs.existsSync(options.cwd)
      ? path.resolve(options.cwd)
      : (process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd() || os.homedir())

    const cols = options.cols || 100
    const rows = options.rows || 30

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      FORCE_COLOR: '1',
      CLICOLOR: '1',
      CLICOLOR_FORCE: '1',
      TERM_PROGRAM: 'IndoctrinatedEdit',
      PYTHONUNBUFFERED: '1',
      INDOCTRINATED_TERMINAL: '1',
    }

    const args = profile.args || []

    // Prefer native node-pty PseudoConsole (ConPTY on Windows, openpty on POSIX)
    if (nodePty) {
      try {
        let ptyProc: IPty
        let backend: 'conpty' | 'winpty' | 'openpty' = process.platform === 'win32' ? 'conpty' : 'openpty'
        try {
          ptyProc = nodePty.spawn(profile.path, args, {
            name: 'xterm-256color',
            cols,
            rows,
            cwd: targetCwd,
            env: env as Record<string, string>,
            useConpty: true,
          })
        } catch (conptyErr) {
          console.warn('[TerminalService] ConPTY spawn failed, falling back to WinPTY:', conptyErr)
          backend = 'winpty'
          ptyProc = nodePty.spawn(profile.path, args, {
            name: 'xterm-256color',
            cols,
            rows,
            cwd: targetCwd,
            env: env as Record<string, string>,
            useConpty: false,
          })
        }

        const sessionInfo: TerminalSessionInfo = {
          id: sessionId,
          shellId: profile.id,
          shellName: profile.name,
          pid: ptyProc.pid,
          cwd: targetCwd,
          pty: true,
          backend,
          osBuild: process.platform === 'win32' ? getWindowsBuildNumber() : 0,
        }

        this.sessions.set(sessionId, {
          process: ptyProc,
          isPty: true,
          info: sessionInfo,
        })

        ptyProc.onData((data: string) => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('terminal:data', {
              id: sessionId,
              data,
            })
          }
        })

        ptyProc.onExit(({ exitCode, signal }) => {
          const intentional = this.terminatingSessions.delete(sessionId)
          this.sessions.delete(sessionId)

          if (!intentional) {
            // The shell ended on its own (user typed `exit`, pressed Ctrl+D, or
            // crashed). Release the pseudo-console so ConPTY/conhost is not held
            // open, then reap any children the shell left behind - killing the
            // shell alone would leave TUIs and watchers orphaned.
            try {
              ptyProc.kill()
            } catch {}
            this.reapOrphansAsync(sessionInfo.pid)
          }

          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('terminal:exit', {
              id: sessionId,
              code: exitCode,
              signal: signal ? String(signal) : null,
              reason: intentional ? 'killed' : 'exited',
            })
          }
        })

        return sessionInfo
      } catch (err: any) {
        console.warn('[TerminalService] nodePty.spawn failed, falling back to standard child_process.spawn:', err)
      }
    }

    // Fallback: standard child_process.spawn (NO pseudo-console / no TTY).
    // This is a genuine degradation: interactive shells lose line editing, and
    // full-screen TUIs cannot receive raw keypresses. Only used if node-pty is
    // missing or its ConPTY/WinPTY agent failed to spawn.
    const proc = spawn(profile.path, args, {
      cwd: targetCwd,
      env,
      shell: false,
      windowsHide: true,
    })

    const sessionInfo: TerminalSessionInfo = {
      id: sessionId,
      shellId: profile.id,
      shellName: profile.name,
      pid: proc.pid,
      cwd: targetCwd,
      pty: false,
      backend: 'pipe',
      osBuild: process.platform === 'win32' ? getWindowsBuildNumber() : 0,
    }

    this.sessions.set(sessionId, {
      process: proc,
      isPty: false,
      info: sessionInfo,
    })

    if (!mainWindow.isDestroyed()) {
      const reason = nodePtyLoadError ? ` (${nodePtyLoadError})` : ''
      mainWindow.webContents.send('terminal:data', {
        id: sessionId,
        data:
          `\r\n\x1b[33m[TerminalService] Running WITHOUT a pseudo-console${reason}.\r\n` +
          `Interactive key handling (Backspace, Tab completion, TUI keypresses, Ctrl+C) is unavailable in this mode.\x1b[0m\r\n\r\n`,
      })
    }

    proc.stdout.on('data', (chunk: Buffer) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:data', {
          id: sessionId,
          data: chunk.toString('utf8'),
        })
      }
    })

    proc.stderr.on('data', (chunk: Buffer) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:data', {
          id: sessionId,
          data: chunk.toString('utf8'),
        })
      }
    })

    proc.on('close', (code, signal) => {
      const intentional = this.terminatingSessions.delete(sessionId)
      this.sessions.delete(sessionId)

      // Same orphan prevention as the pseudo-console path above.
      if (!intentional) {
        this.reapOrphansAsync(proc.pid)
      }

      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:exit', {
          id: sessionId,
          code,
          signal,
          reason: intentional ? 'killed' : 'exited',
        })
      }
    })

    proc.on('error', (err) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:data', {
          id: sessionId,
          data: `\r\n\x1b[31m[Terminal Error] ${err.message}\x1b[0m\r\n`,
        })
      }
    })

    return sessionInfo
  }

  /**
   * Writes input keystrokes or commands into terminal session.
   */
  public write(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    try {
      if (session.isPty) {
        ;(session.process as IPty).write(data)
        return true
      } else {
        const streamProc = session.process as ChildProcessWithoutNullStreams
        if (streamProc.stdin.writable) {
          streamProc.stdin.write(data, 'utf8')
          return true
        }
      }
    } catch (e) {
      console.warn(`[TerminalService] Error writing to session ${sessionId}:`, e)
    }
    return false
  }

  /**
   * Resizes the terminal PTY dimensions.
   */
  public resize(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    if (session.isPty) {
      try {
        ;(session.process as IPty).resize(Math.max(10, cols), Math.max(5, rows))
        return true
      } catch (e) {
        console.warn(`[TerminalService] Error resizing session ${sessionId}:`, e)
      }
    }
    return false
  }

  /**
   * Asynchronously reaps descendants of a shell that exited on its own.
   *
   * Runs detached so a terminal `exit` never blocks the main process while the
   * process snapshot is taken.
   */
  private reapOrphansAsync(rootPid?: number): void {
    if (!IS_WINDOWS || !rootPid || !Number.isFinite(rootPid)) return
    try {
      execFile(
        resolvePowerShell(),
        ['-NoProfile', '-NonInteractive', '-Command', PROCESS_PAIRS_POWERSHELL],
        { windowsHide: true, timeout: 5000, maxBuffer: 8 * 1024 * 1024 },
        (error, stdout) => {
          if (error || !stdout) return
          for (const pid of collectDescendantPids(rootPid, parseProcessPairs(stdout))) {
            taskkill(pid, { tree: false, sync: false })
          }
        }
      )
    } catch {
      /* best effort */
    }
  }

  /**
   * Terminates one session and its process tree.
   *
   * @param pairs Optional pre-captured process snapshot. A full teardown passes
   *   a single shared snapshot so N sessions cost one enumeration rather than N.
   */
  private killSession(sessionId: string, pairs?: Array<[number, number]>): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    // Flag the session first so `onExit` reports this as `reason: 'killed'`,
    // even though the map entry is removed before node-pty fires onExit.
    this.terminatingSessions.add(sessionId)
    const pid = session.info.pid

    try {
      if (pid && Number.isFinite(pid) && pid > 0) {
        if (IS_WINDOWS) {
          // ORDER IS CRITICAL: `taskkill /T` resolves the descendant chain
          // through the still-running root. Closing the pseudo-console first
          // (as this used to) killed the root immediately, so `/T` found no
          // tree and every grandchild survived as an orphan.
          taskkill(pid, { tree: true, sync: true })

          if (pairs) {
            for (const childPid of collectDescendantPids(pid, pairs)) {
              taskkill(childPid, { tree: false, sync: true })
            }
          } else {
            // One-off kill: sweep in the background so the UI is not blocked by
            // the process enumeration.
            this.reapOrphansAsync(pid)
          }
        } else {
          // POSIX: node-pty runs the shell as its own process-group leader
          // (forkpty), so the negative pid reaches every descendant at once.
          try {
            process.kill(-pid, 'SIGKILL')
          } catch {
            /* group already gone */
          }
        }
      }

      // Only now release the pseudo-console / stdio pipes.
      try {
        if (session.isPty) {
          ;(session.process as IPty).kill()
        } else {
          ;(session.process as ChildProcessWithoutNullStreams).kill()
        }
      } catch {}

      this.sessions.delete(sessionId)
      return true
    } catch (e) {
      console.warn(`[TerminalService] Error killing session ${sessionId}:`, e)
      this.sessions.delete(sessionId)
      return false
    }
  }

  /**
   * Terminates an active terminal session and its entire process tree.
   * Bound to the Kill Terminal button and the tab close button.
   */
  public kill(sessionId: string): boolean {
    return this.killSession(sessionId)
  }

  /**
   * Terminates every active terminal session and its process tree.
   *
   * Called on window close and app quit (`window:close` IPC, `before-quit`,
   * `will-quit`, `window-all-closed`) so closing the app can never leave
   * shells, TUIs, watchers or conhost processes running behind it.
   *
   * Teardown is synchronous and deterministic: async `taskkill` invocations
   * used to be abandoned when `app.exit()` raced ahead of them.
   */
  public killAll(): void {
    const sessionIds = Array.from(this.sessions.keys())
    if (sessionIds.length === 0) return

    // One shared snapshot for the whole teardown, so killing is O(1) queries.
    const pairs = IS_WINDOWS ? queryProcessPairsSync() : undefined
    for (const id of sessionIds) {
      this.killSession(id, pairs)
    }

    this.sessions.clear()
  }

  /**
   * Opens the current workspace directory in an external system terminal window.
   */
  public openExternalTerminal(shellId?: string, cwd?: string): boolean {
    const isWin = process.platform === 'win32'
    const targetCwd = cwd && cwd !== '.' && fs.existsSync(cwd)
      ? path.resolve(cwd)
      : (process.cwd() || os.homedir())

    try {
      if (isWin) {
        if (shellId === 'gitbash') {
          const gitBash = 'C:\\Program Files\\Git\\git-bash.exe'
          if (this.checkExists(gitBash)) {
            spawn(gitBash, [`--cd=${targetCwd}`], { detached: true, stdio: 'ignore' }).unref()
            return true
          }
        }
        if (shellId === 'cygwin') {
          const cygMintty = 'C:\\cygwin64\\bin\\mintty.exe'
          if (this.checkExists(cygMintty)) {
            spawn(cygMintty, ['-i', '/Cygwin-Terminal.ico', '-', '/bin/bash', '--login', '-i'], {
              cwd: targetCwd,
              detached: true,
              stdio: 'ignore',
            }).unref()
            return true
          }
        }
        if (shellId === 'wsl') {
          spawn('wsl.exe', [], { cwd: targetCwd, detached: true, stdio: 'ignore' }).unref()
          return true
        }
        if (shellId === 'pwsh') {
          const pwsh = this.findExecutableInPath('pwsh.exe') || 'C:\\Program Files\\PowerShell\\7\\pwsh.exe'
          if (this.checkExists(pwsh)) {
            spawn('cmd.exe', ['/c', 'start', '""', pwsh, '-NoExit', '-Command', `Set-Location -LiteralPath '${targetCwd}'`], {
              detached: true,
              stdio: 'ignore',
            }).unref()
            return true
          }
        }
        // Try Windows Terminal (wt.exe)
        const wt = this.findExecutableInPath('wt.exe')
        if (wt) {
          spawn('wt.exe', ['-d', targetCwd], { detached: true, stdio: 'ignore' }).unref()
          return true
        }
        // Fallback to native Windows PowerShell window
        spawn('cmd.exe', ['/c', 'start', 'powershell.exe', '-NoExit', '-Command', `Set-Location -LiteralPath '${targetCwd}'`], {
          detached: true,
          stdio: 'ignore',
        }).unref()
        return true
      } else if (process.platform === 'darwin') {
        spawn('open', ['-a', 'Terminal', targetCwd], { detached: true, stdio: 'ignore' }).unref()
        return true
      } else {
        spawn('x-terminal-emulator', [], { cwd: targetCwd, detached: true, stdio: 'ignore' }).unref()
        return true
      }
    } catch (err) {
      console.error('[TerminalService] Failed to launch external terminal:', err)
      return false
    }
  }

  /**
   * Reports whether terminals are backed by a real pseudo-console.
   * The renderer surfaces this so a degraded (pipe-only) mode is never silent.
   */
  public getDiagnostics(): TerminalDiagnostics {
    const backend: TerminalDiagnostics['backend'] = nodePty
      ? process.platform === 'win32'
        ? 'conpty'
        : 'openpty'
      : 'pipe'
    return {
      ptyAvailable: Boolean(nodePty),
      ptyLoadError: nodePtyLoadError,
      backend,
      osBuild: process.platform === 'win32' ? getWindowsBuildNumber() : 0,
      platform: process.platform,
      activeSessions: this.sessions.size,
    }
  }

  /**
   * Registers all terminal IPC channels.
   */
  public setupIPC(ipcMain: IpcMain, getWindow: () => BrowserWindow | null): void {
    ipcMain.handle('terminal:detectShells', async () => {
      return this.detectShells()
    })

    ipcMain.handle('terminal:getDiagnostics', async () => {
      return this.getDiagnostics()
    })

    ipcMain.handle('terminal:getConfig', async () => {
      return this.getConfig()
    })

    ipcMain.handle('terminal:saveConfig', async (_, config: Partial<TerminalConfig>) => {
      return this.saveConfig(config)
    })

    ipcMain.handle('terminal:create', async (_, options: { shellId?: string; cwd?: string; cols?: number; rows?: number }) => {
      const win = getWindow()
      if (!win) throw new Error('Main window not available')
      return this.createSession(options, win)
    })

    ipcMain.handle('terminal:write', async (_, { id, data }: { id: string; data: string }) => {
      return this.write(id, data)
    })

    ipcMain.handle('terminal:resize', async (_, { id, cols, rows }: { id: string; cols: number; rows: number }) => {
      return this.resize(id, cols, rows)
    })

    ipcMain.handle('terminal:kill', async (_, id: string) => {
      return this.kill(id)
    })

    ipcMain.handle('terminal:openExternal', async (_, { shellId, cwd }: { shellId?: string; cwd?: string }) => {
      return this.openExternalTerminal(shellId, cwd)
    })
  }
}

export const terminalService = TerminalService.getInstance()

/**
 * Real Multi-Runtime Debug Adapter Service (Electron Main Process)
 *
 * - Node.js / TypeScript: Spawns `node --inspect-brk=0` (or `tsx --inspect-brk=0` for `.ts/.tsx`)
 *   and speaks real Chrome DevTools Protocol (CDP) over WebSocket (`ws`).
 * - Python / Go / Rust: Spawns real Debug Adapter Protocol (DAP) servers
 *   (`python -m debugpy.adapter`, `dlv dap`, `lldb-dap`) over framed stdio JSON-RPC.
 */

import { spawn, ChildProcess } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { WebSocket } from 'ws'
import type { IpcMain, BrowserWindow } from 'electron'

export type DebugRuntimeTarget = 'node' | 'python' | 'rust' | 'go'

export interface DebugStartOptions {
  target: DebugRuntimeTarget
  filePath: string
  cwd?: string
  args?: string[]
  breakpoints?: Array<{ filePath: string; line: number; enabled: boolean; condition?: string; logMessage?: string }>
  exceptionBreakpoints?: { uncaught: boolean; caught: boolean }
}

export interface RealStackFrame {
  id: string
  name: string
  filePath: string
  line: number
  column: number
  instructionPointer?: string
  cdpCallFrameId?: string
  dapFrameId?: number
}

export interface RealDebugVariable {
  id: string
  name: string
  value: string
  type: string
  scope: 'local' | 'closure' | 'global' | 'register'
  isEditable?: boolean
  objectId?: string
  scopeNumber?: number
  variablesReference?: number
  children?: RealDebugVariable[]
}

export interface RealDebugEvent {
  type:
    | 'started'
    | 'paused'
    | 'resumed'
    | 'output'
    | 'moduleLoaded'
    | 'terminated'
    | 'error'
  sessionId: string
  category?: 'stdout' | 'stderr' | 'info' | 'warn' | 'error'
  text?: string
  reason?: string
  threads?: Array<{ id: string; name: string; status: 'running' | 'paused' | 'blocked'; isCurrent: boolean; stackFrames: RealStackFrame[]; activeFrameId: string | null }>
  frames?: RealStackFrame[]
  variables?: RealDebugVariable[]
  module?: { id: string; name: string; path: string; addressRange: string; symbolsLoaded: boolean }
  exitCode?: number | null
}

/**
 * Pure DAP Content-Length message parser (exported for unit tests).
 */
export function parseDapMessages(buffer: Buffer): { messages: any[]; remainder: Buffer } {
  const messages: any[] = []
  let offset = 0

  while (offset < buffer.length) {
    const headerEnd = buffer.indexOf('\r\n\r\n', offset)
    if (headerEnd === -1) break

    const headerStr = buffer.slice(offset, headerEnd).toString('ascii')
    const match = headerStr.match(/Content-Length:\s*(\d+)/i)
    if (!match) {
      // Skip malformed header chunk
      offset = headerEnd + 4
      continue
    }

    const contentLength = parseInt(match[1], 10)
    const bodyStart = headerEnd + 4
    const bodyEnd = bodyStart + contentLength
    if (buffer.length < bodyEnd) break

    const bodyText = buffer.slice(bodyStart, bodyEnd).toString('utf8')
    try {
      messages.push(JSON.parse(bodyText))
    } catch {
      // ignore invalid json frame
    }
    offset = bodyEnd
  }

  return { messages, remainder: buffer.slice(offset) }
}

export function encodeDapMessage(payload: Record<string, any>): Buffer {
  const json = JSON.stringify(payload)
  const byteLen = Buffer.byteLength(json, 'utf8')
  return Buffer.from(`Content-Length: ${byteLen}\r\n\r\n${json}`, 'utf8')
}

function normalizeFileUrlToPath(urlOrPath: string): string {
  if (!urlOrPath) return '<anonymous>'
  if (urlOrPath.startsWith('file://')) {
    try {
      return fileURLToPath(urlOrPath)
    } catch {
      return urlOrPath.replace(/^file:\/\/\/?/, '')
    }
  }
  return urlOrPath
}

function formatCdpRemoteObject(obj: any): { value: string; type: string; isEditable: boolean } {
  if (!obj) return { value: 'undefined', type: 'undefined', isEditable: false }
  if (obj.type === 'undefined') return { value: 'undefined', type: 'undefined', isEditable: true }
  if (obj.subtype === 'null') return { value: 'null', type: 'null', isEditable: true }
  if (obj.type === 'string') return { value: JSON.stringify(obj.value ?? ''), type: 'string', isEditable: true }
  if (obj.type === 'number' || obj.type === 'boolean' || obj.type === 'bigint') {
    return { value: String(obj.value ?? obj.description ?? ''), type: obj.type, isEditable: true }
  }
  if (obj.type === 'function') {
    return { value: obj.description ? obj.description.split('\n')[0].slice(0, 80) : '[Function]', type: 'function', isEditable: false }
  }
  return {
    value: obj.description || obj.className || `[${obj.type}]`,
    type: obj.className || obj.subtype || obj.type || 'object',
    isEditable: false,
  }
}

class NodeCdpSession {
  public readonly sessionId: string
  private child: ChildProcess | null = null
  private ws: WebSocket | null = null
  private msgId = 1
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>()
  private scriptUrls = new Map<string, string>()
  private activeBreakpointIds: string[] = []
  private latestCdpFrames: any[] = []
  private emit: (ev: RealDebugEvent) => void
  private stopped = false

  constructor(sessionId: string, emit: (ev: RealDebugEvent) => void) {
    this.sessionId = sessionId
    this.emit = emit
  }

  public async start(opts: DebugStartOptions): Promise<{ ok: boolean; error?: string }> {
    const cwd = opts.cwd || path.dirname(opts.filePath) || process.cwd()
    const ext = path.extname(opts.filePath).toLowerCase()
    const isTs = ext === '.ts' || ext === '.tsx' || ext === '.mts'

    let command = process.execPath
    let args: string[] = []

    if (isTs) {
      // Use `node --experimental-strip-types` if available on Node >=22.6, or `npx tsx`
      const isWin = process.platform === 'win32'
      command = isWin ? 'npx.cmd' : 'npx'
      args = ['tsx', '--inspect-brk=127.0.0.1:0', opts.filePath, ...(opts.args || [])]
    } else {
      command = 'node'
      args = ['--inspect-brk=127.0.0.1:0', opts.filePath, ...(opts.args || [])]
    }

    return new Promise((resolve) => {
      let resolved = false
      const finish = (res: { ok: boolean; error?: string }) => {
        if (!resolved) {
          resolved = true
          resolve(res)
        }
      }

      try {
        this.child = spawn(command, args, {
          cwd,
          shell: process.platform === 'win32' && command.endsWith('.cmd'),
          windowsHide: true,
          env: { ...process.env },
        })
      } catch (err: any) {
        finish({ ok: false, error: err?.message || 'Failed to spawn Node.js debugger' })
        return
      }

      const timeout = setTimeout(() => {
        if (!resolved) {
          this.stop()
          finish({ ok: false, error: 'Timed out waiting for V8 Inspector WebSocket URL' })
        }
      }, 15000)

      this.child.stdout?.on('data', (chunk) => {
        this.emit({ type: 'output', sessionId: this.sessionId, category: 'stdout', text: String(chunk) })
      })

      this.child.stderr?.on('data', (chunk) => {
        const text = String(chunk)
        const wsMatch = text.match(/Debugger listening on (ws:\/\/[^\s\r\n]+)/)
        if (wsMatch && !this.ws) {
          clearTimeout(timeout)
          this.connectCdp(wsMatch[1], opts)
            .then(() => finish({ ok: true }))
            .catch((err) => finish({ ok: false, error: err?.message || String(err) }))
        }
        if (!text.includes('For help, see: https://nodejs.org/en/docs/inspector') && !text.includes('Debugger attached')) {
          this.emit({ type: 'output', sessionId: this.sessionId, category: 'stderr', text })
        }
      })

      this.child.on('error', (err) => {
        clearTimeout(timeout)
        this.emit({ type: 'error', sessionId: this.sessionId, text: err.message })
        finish({ ok: false, error: err.message })
      })

      this.child.on('close', (code) => {
        clearTimeout(timeout)
        if (!this.stopped) {
          this.emit({ type: 'terminated', sessionId: this.sessionId, exitCode: code })
        }
        finish({ ok: false, error: `Process exited before inspector attached (code ${code})` })
      })
    })
  }

  private async connectCdp(wsUrl: string, opts: DebugStartOptions): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl)
      this.ws = ws

      ws.on('open', () => resolve())
      ws.on('error', (err) => reject(err))
      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(String(raw))
          if (msg.id !== undefined) {
            const p = this.pending.get(msg.id)
            if (p) {
              this.pending.delete(msg.id)
              if (msg.error) p.reject(new Error(msg.error.message || 'CDP error'))
              else p.resolve(msg.result)
            }
          } else if (msg.method) {
            void this.handleCdpEvent(msg.method, msg.params || {})
          }
        } catch {
          // ignore malformed frames
        }
      })
      ws.on('close', () => {
        for (const [, p] of this.pending) {
          p.reject(new Error('CDP connection closed'))
        }
        this.pending.clear()
      })
    })

    await this.sendCdp('Runtime.enable')
    await this.sendCdp('Debugger.enable')
    await this.setExceptionBreakpoints(opts.exceptionBreakpoints || { uncaught: true, caught: false })
    if (opts.breakpoints && opts.breakpoints.length > 0) {
      await this.setBreakpoints(opts.breakpoints)
    }
    this.emit({ type: 'started', sessionId: this.sessionId })
    await this.sendCdp('Runtime.runIfWaitingForDebugger')
  }

  private sendCdp(method: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('CDP socket is not open'))
    }
    const id = this.msgId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws!.send(JSON.stringify({ id, method, params }))
    })
  }

  private async handleCdpEvent(method: string, params: any): Promise<void> {
    if (method === 'Debugger.scriptParsed') {
      const url = params.url || ''
      if (params.scriptId && url) {
        this.scriptUrls.set(params.scriptId, url)
        if (!url.startsWith('node:')) {
          const fsPath = normalizeFileUrlToPath(url)
          this.emit({
            type: 'moduleLoaded',
            sessionId: this.sessionId,
            module: {
              id: `script_${params.scriptId}`,
              name: path.basename(fsPath) || url,
              path: fsPath,
              addressRange: `script#${params.scriptId}`,
              symbolsLoaded: true,
            },
          })
        }
      }
    } else if (method === 'Debugger.paused') {
      const callFrames: any[] = params.callFrames || []
      this.latestCdpFrames = callFrames
      const frames: RealStackFrame[] = callFrames.map((cf, idx) => {
        const rawUrl = cf.url || this.scriptUrls.get(cf.location?.scriptId) || '<anonymous>'
        return {
          id: cf.callFrameId || `cf_${idx}`,
          cdpCallFrameId: cf.callFrameId,
          name: cf.functionName || '(anonymous)',
          filePath: normalizeFileUrlToPath(rawUrl),
          line: (cf.location?.lineNumber ?? 0) + 1,
          column: (cf.location?.columnNumber ?? 0) + 1,
        }
      })

      const variables = callFrames.length > 0 ? await this.readFrameVariables(callFrames[0]) : []
      const topId = frames[0]?.id || null
      this.emit({
        type: 'paused',
        sessionId: this.sessionId,
        reason: params.reason || 'pause',
        frames,
        variables,
        threads: [
          {
            id: 'th_main',
            name: `Node Main Thread (PID ${this.child?.pid ?? '?'})`,
            status: 'paused',
            isCurrent: true,
            stackFrames: frames,
            activeFrameId: topId,
          },
        ],
      })
    } else if (method === 'Debugger.resumed') {
      this.emit({ type: 'resumed', sessionId: this.sessionId })
    } else if (method === 'Runtime.consoleAPICalled') {
      const args = (params.args || []).map((a: any) => a.value ?? a.description ?? '').join(' ')
      const cat = params.type === 'error' ? 'stderr' : params.type === 'warning' ? 'warn' : 'stdout'
      this.emit({ type: 'output', sessionId: this.sessionId, category: cat, text: args })
    }
  }

  private async readFrameVariables(callFrame: any): Promise<RealDebugVariable[]> {
    const vars: RealDebugVariable[] = []
    const scopeChain: any[] = callFrame.scopeChain || []

    for (let scopeIdx = 0; scopeIdx < scopeChain.length; scopeIdx++) {
      const sc = scopeChain[scopeIdx]
      if (sc.type === 'global') continue // Skip massive globalThis unless explicitly evaluated
      const scopeType: RealDebugVariable['scope'] =
        sc.type === 'local' || sc.type === 'block' || sc.type === 'catch'
          ? 'local'
          : sc.type === 'closure'
          ? 'closure'
          : 'global'
      const objectId = sc.object?.objectId
      if (!objectId) continue

      try {
        const res = await this.sendCdp('Runtime.getProperties', {
          objectId,
          ownProperties: true,
          accessorPropertiesOnly: false,
          generatePreview: true,
        })
        const props: any[] = res?.result || []
        for (const prop of props.slice(0, 60)) {
          if (!prop.name || prop.name === '__proto__') continue
          const formatted = formatCdpRemoteObject(prop.value)
          const item: RealDebugVariable = {
            id: `var_${scopeIdx}_${prop.name}`,
            name: prop.name,
            value: formatted.value,
            type: formatted.type,
            scope: scopeType,
            isEditable: formatted.isEditable,
            objectId: prop.value?.objectId,
            scopeNumber: scopeIdx,
          }
          // Fetch 1 level of object preview properties as children if available
          const previewProps: any[] = prop.value?.preview?.properties || []
          if (previewProps.length > 0) {
            item.children = previewProps.slice(0, 20).map((cp: any, ci: number) => ({
              id: `${item.id}_${ci}_${cp.name}`,
              name: cp.name,
              value: cp.type === 'string' ? JSON.stringify(cp.value ?? '') : String(cp.value ?? cp.type),
              type: cp.type || 'any',
              scope: scopeType,
              isEditable: false,
            }))
          }
          vars.push(item)
        }
      } catch {
        // ignore individual scope read failure
      }
    }

    return vars
  }

  public async getFrameVariables(frameId: string): Promise<RealDebugVariable[]> {
    const cf = this.latestCdpFrames.find((f) => f.callFrameId === frameId) || this.latestCdpFrames[0]
    if (!cf) return []
    return this.readFrameVariables(cf)
  }

  public async setBreakpoints(
    bps: Array<{ filePath: string; line: number; enabled: boolean; condition?: string }>
  ): Promise<void> {
    for (const bpId of this.activeBreakpointIds) {
      await this.sendCdp('Debugger.removeBreakpoint', { breakpointId: bpId }).catch(() => {})
    }
    this.activeBreakpointIds = []

    for (const bp of bps) {
      if (!bp.enabled) continue
      const url = bp.filePath.startsWith('file://') ? bp.filePath : pathToFileURL(path.resolve(bp.filePath)).href
      const escapedBase = path.basename(bp.filePath).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      try {
        const res = await this.sendCdp('Debugger.setBreakpointByUrl', {
          lineNumber: Math.max(0, bp.line - 1),
          url,
          condition: bp.condition || undefined,
        })
        if (res?.breakpointId) this.activeBreakpointIds.push(res.breakpointId)
      } catch {
        // Fallback regex matching filename (handles Windows drive letter casing differences)
        try {
          const res = await this.sendCdp('Debugger.setBreakpointByUrl', {
            lineNumber: Math.max(0, bp.line - 1),
            urlRegex: `.*${escapedBase}$`,
            condition: bp.condition || undefined,
          })
          if (res?.breakpointId) this.activeBreakpointIds.push(res.breakpointId)
        } catch {
          // ignore
        }
      }
    }
  }

  public async setExceptionBreakpoints(cfg: { uncaught: boolean; caught: boolean }): Promise<void> {
    const state = cfg.caught ? 'all' : cfg.uncaught ? 'uncaught' : 'none'
    await this.sendCdp('Debugger.setPauseOnExceptions', { state }).catch(() => {})
  }

  public async continue(): Promise<void> {
    await this.sendCdp('Debugger.resume').catch(() => {})
  }

  public async stepOver(): Promise<void> {
    await this.sendCdp('Debugger.stepOver').catch(() => {})
  }

  public async stepInto(): Promise<void> {
    await this.sendCdp('Debugger.stepInto').catch(() => {})
  }

  public async stepOut(): Promise<void> {
    await this.sendCdp('Debugger.stepOut').catch(() => {})
  }

  public async pause(): Promise<void> {
    await this.sendCdp('Debugger.pause').catch(() => {})
  }

  public async evaluate(expression: string, frameId?: string): Promise<{ value?: string; type?: string; error?: string }> {
    try {
      const targetFrameId = frameId || this.latestCdpFrames[0]?.callFrameId
      const res = targetFrameId
        ? await this.sendCdp('Debugger.evaluateOnCallFrame', {
            callFrameId: targetFrameId,
            expression,
            returnByValue: false,
            generatePreview: true,
          })
        : await this.sendCdp('Runtime.evaluate', { expression, generatePreview: true })

      if (res?.exceptionDetails) {
        return {
          error:
            res.exceptionDetails.exception?.description ||
            res.exceptionDetails.text ||
            'Evaluation threw exception',
        }
      }
      const formatted = formatCdpRemoteObject(res?.result)
      return { value: formatted.value, type: formatted.type }
    } catch (err: any) {
      return { error: err?.message || String(err) }
    }
  }

  public async setVariable(
    varName: string,
    newValue: string,
    frameId?: string,
    scopeNumber = 0
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const targetFrameId = frameId || this.latestCdpFrames[0]?.callFrameId
      if (!targetFrameId) return { ok: false, error: 'No active paused call frame' }
      let parsedValue: any = newValue
      try {
        parsedValue = JSON.parse(newValue)
      } catch {
        // leave as raw string
      }
      await this.sendCdp('Debugger.setVariableValue', {
        scopeNumber,
        variableName: varName,
        newValue: { value: parsedValue },
        callFrameId: targetFrameId,
      })
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.message || String(err) }
    }
  }

  public stop(): void {
    this.stopped = true
    try {
      this.ws?.close()
    } catch {}
    this.ws = null
    try {
      if (this.child && !this.child.killed) {
        this.child.kill()
      }
    } catch {}
    this.child = null
  }
}

class GenericDapSession {
  public readonly sessionId: string
  private child: ChildProcess | null = null
  private seq = 1
  private rxBuf: Buffer = Buffer.alloc(0)
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>()
  private activeThreadId = 1
  private latestFrameId: number | undefined
  private emit: (ev: RealDebugEvent) => void
  private stopped = false

  constructor(sessionId: string, emit: (ev: RealDebugEvent) => void) {
    this.sessionId = sessionId
    this.emit = emit
  }

  public async start(opts: DebugStartOptions): Promise<{ ok: boolean; error?: string }> {
    const cwd = opts.cwd || path.dirname(opts.filePath) || process.cwd()
    let command = ''
    let args: string[] = []
    let installHint = ''

    if (opts.target === 'python') {
      command = process.platform === 'win32' ? 'python' : 'python3'
      args = ['-m', 'debugpy.adapter']
      installHint = 'Install debugpy with: pip install debugpy'
    } else if (opts.target === 'go') {
      command = 'dlv'
      args = ['dap']
      installHint = 'Install Delve with: go install github.com/go-delve/delve/cmd/dlv@latest'
    } else {
      command = 'lldb-dap'
      args = []
      installHint = 'Install LLVM/LLDB with lldb-dap on PATH'
    }

    try {
      this.child = spawn(command, args, { cwd, windowsHide: true })
    } catch (err: any) {
      return { ok: false, error: `Failed to spawn ${command}: ${err?.message}. ${installHint}` }
    }

    let spawnErr: string | null = null
    this.child.on('error', (err: any) => {
      spawnErr =
        err.code === 'ENOENT'
          ? `Debug adapter '${command}' not found on PATH. ${installHint}`
          : err.message
      this.emit({ type: 'error', sessionId: this.sessionId, text: spawnErr! })
    })

    this.child.stderr?.on('data', (chunk) => {
      this.emit({ type: 'output', sessionId: this.sessionId, category: 'stderr', text: String(chunk) })
    })

    this.child.stdout?.on('data', (chunk: Buffer) => {
      this.rxBuf = Buffer.concat([this.rxBuf, chunk])
      const { messages, remainder } = parseDapMessages(this.rxBuf)
      this.rxBuf = remainder
      for (const msg of messages) {
        if (msg.type === 'response') {
          const p = this.pending.get(msg.request_seq)
          if (p) {
            this.pending.delete(msg.request_seq)
            if (msg.success) p.resolve(msg.body || {})
            else p.reject(new Error(msg.message || 'DAP request failed'))
          }
        } else if (msg.type === 'event') {
          void this.handleDapEvent(msg.event, msg.body || {})
        }
      }
    })

    this.child.on('close', (code) => {
      if (!this.stopped) {
        this.emit({ type: 'terminated', sessionId: this.sessionId, exitCode: code })
      }
    })

    // Give spawn a brief tick to surface ENOENT
    await new Promise((r) => setTimeout(r, 80))
    if (spawnErr) return { ok: false, error: spawnErr }

    try {
      await this.sendDap('initialize', {
        clientID: 'indoctrinated-edit',
        clientName: 'IndoctrinatedEdit',
        adapterID: opts.target,
        linesStartAt1: true,
        columnsStartAt1: true,
        pathFormat: 'path',
      })

      await this.sendDap('launch', {
        program: opts.filePath,
        cwd,
        stopOnEntry: true,
        console: 'internalConsole',
      })

      if (opts.breakpoints && opts.breakpoints.length > 0) {
        await this.setBreakpoints(opts.breakpoints)
      }
      await this.sendDap('configurationDone', {}).catch(() => {})
      this.emit({ type: 'started', sessionId: this.sessionId })
      return { ok: true }
    } catch (err: any) {
      this.stop()
      return { ok: false, error: `${err?.message || String(err)}. ${installHint}` }
    }
  }

  private sendDap(command: string, args: Record<string, any> = {}): Promise<any> {
    if (!this.child?.stdin?.writable) {
      return Promise.reject(new Error('DAP adapter stdin closed'))
    }
    const seq = this.seq++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.has(seq)) {
          this.pending.delete(seq)
          reject(new Error(`DAP '${command}' timed out`))
        }
      }, 10000)
      this.pending.set(seq, {
        resolve: (v) => {
          clearTimeout(timer)
          resolve(v)
        },
        reject: (e) => {
          clearTimeout(timer)
          reject(e)
        },
      })
      this.child!.stdin!.write(encodeDapMessage({ seq, type: 'request', command, arguments: args }))
    })
  }

  private async handleDapEvent(event: string, body: any): Promise<void> {
    if (event === 'output') {
      const cat = body.category === 'stderr' ? 'stderr' : 'stdout'
      this.emit({ type: 'output', sessionId: this.sessionId, category: cat, text: body.output || '' })
    } else if (event === 'stopped') {
      this.activeThreadId = body.threadId || this.activeThreadId
      const threadsRes = await this.sendDap('threads').catch(() => ({ threads: [{ id: this.activeThreadId, name: 'Main' }] }))
      const stackRes = await this.sendDap('stackTrace', { threadId: this.activeThreadId, startFrame: 0, levels: 30 }).catch(() => ({ stackFrames: [] }))
      const frames: RealStackFrame[] = (stackRes.stackFrames || []).map((sf: any) => ({
        id: `dap_f_${sf.id}`,
        dapFrameId: sf.id,
        name: sf.name || '(frame)',
        filePath: sf.source?.path || sf.source?.name || '<unknown>',
        line: sf.line || 1,
        column: sf.column || 1,
      }))
      this.latestFrameId = frames[0]?.dapFrameId
      const variables = this.latestFrameId !== undefined ? await this.readDapFrameVars(this.latestFrameId) : []
      const threads = (threadsRes.threads || []).map((t: any) => ({
        id: `dap_th_${t.id}`,
        name: t.name || `Thread #${t.id}`,
        status: (t.id === this.activeThreadId ? 'paused' : 'running') as 'paused' | 'running',
        isCurrent: t.id === this.activeThreadId,
        stackFrames: t.id === this.activeThreadId ? frames : [],
        activeFrameId: t.id === this.activeThreadId ? frames[0]?.id || null : null,
      }))
      this.emit({
        type: 'paused',
        sessionId: this.sessionId,
        reason: body.reason || 'stopped',
        frames,
        variables,
        threads,
      })
    } else if (event === 'continued') {
      this.emit({ type: 'resumed', sessionId: this.sessionId })
    } else if (event === 'terminated' || event === 'exited') {
      this.emit({ type: 'terminated', sessionId: this.sessionId, exitCode: body.exitCode ?? 0 })
    }
  }

  private async readDapFrameVars(dapFrameId: number): Promise<RealDebugVariable[]> {
    const vars: RealDebugVariable[] = []
    const scopesRes = await this.sendDap('scopes', { frameId: dapFrameId }).catch(() => ({ scopes: [] }))
    for (const sc of (scopesRes.scopes || []).slice(0, 3)) {
      if (!sc.variablesReference) continue
      const vRes = await this.sendDap('variables', { variablesReference: sc.variablesReference }).catch(() => ({ variables: [] }))
      const scopeType: RealDebugVariable['scope'] = /global/i.test(sc.name || '') ? 'global' : 'local'
      for (const v of (vRes.variables || []).slice(0, 50)) {
        vars.push({
          id: `dap_v_${sc.variablesReference}_${v.name}`,
          name: v.name,
          value: String(v.value ?? ''),
          type: v.type || 'any',
          scope: scopeType,
          isEditable: true,
          variablesReference: v.variablesReference,
        })
      }
    }
    return vars
  }

  public async getFrameVariables(frameId: string): Promise<RealDebugVariable[]> {
    const num = Number(frameId.replace('dap_f_', ''))
    if (isNaN(num)) return []
    return this.readDapFrameVars(num)
  }

  public async setBreakpoints(
    bps: Array<{ filePath: string; line: number; enabled: boolean; condition?: string }>
  ): Promise<void> {
    const byFile = new Map<string, Array<{ line: number; condition?: string }>>()
    for (const bp of bps) {
      if (!bp.enabled) continue
      const list = byFile.get(bp.filePath) || []
      list.push({ line: bp.line, condition: bp.condition })
      byFile.set(bp.filePath, list)
    }
    for (const [filePath, list] of byFile.entries()) {
      await this.sendDap('setBreakpoints', {
        source: { path: filePath, name: path.basename(filePath) },
        breakpoints: list,
      }).catch(() => {})
    }
  }

  public async setExceptionBreakpoints(cfg: { uncaught: boolean; caught: boolean }): Promise<void> {
    const filters: string[] = []
    if (cfg.uncaught) filters.push('uncaught')
    if (cfg.caught) filters.push('raised')
    await this.sendDap('setExceptionBreakpoints', { filters }).catch(() => {})
  }

  public async continue(): Promise<void> {
    await this.sendDap('continue', { threadId: this.activeThreadId }).catch(() => {})
  }

  public async stepOver(): Promise<void> {
    await this.sendDap('next', { threadId: this.activeThreadId }).catch(() => {})
  }

  public async stepInto(): Promise<void> {
    await this.sendDap('stepIn', { threadId: this.activeThreadId }).catch(() => {})
  }

  public async stepOut(): Promise<void> {
    await this.sendDap('stepOut', { threadId: this.activeThreadId }).catch(() => {})
  }

  public async pause(): Promise<void> {
    await this.sendDap('pause', { threadId: this.activeThreadId }).catch(() => {})
  }

  public async evaluate(expression: string): Promise<{ value?: string; type?: string; error?: string }> {
    try {
      const res = await this.sendDap('evaluate', {
        expression,
        frameId: this.latestFrameId,
        context: 'repl',
      })
      return { value: res.result, type: res.type || 'any' }
    } catch (err: any) {
      return { error: err?.message || String(err) }
    }
  }

  public async setVariable(varName: string, newValue: string): Promise<{ ok: boolean; error?: string }> {
    const res = await this.evaluate(`${varName} = ${newValue}`)
    return res.error ? { ok: false, error: res.error } : { ok: true }
  }

  public stop(): void {
    this.stopped = true
    try {
      if (this.child?.stdin?.writable) {
        this.child.stdin.write(encodeDapMessage({ seq: this.seq++, type: 'request', command: 'disconnect', arguments: { terminateDebuggee: true } }))
      }
    } catch {}
    try {
      if (this.child && !this.child.killed) this.child.kill()
    } catch {}
    this.child = null
  }
}

let activeSession: NodeCdpSession | GenericDapSession | null = null

export function disposeDebugSessions(): void {
  if (activeSession) {
    activeSession.stop()
    activeSession = null
  }
}

export function setupDebugIPC(ipcMain: IpcMain, getWin: () => BrowserWindow | null): void {
  const emitEvent = (ev: RealDebugEvent) => {
    const win = getWin()
    if (win && !win.isDestroyed()) {
      win.webContents.send('debug:event', ev)
    }
  }

  ipcMain.handle('debug:start', async (_, opts: DebugStartOptions) => {
    disposeDebugSessions()
    const sessionId = `dbg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const session =
      opts.target === 'node'
        ? new NodeCdpSession(sessionId, emitEvent)
        : new GenericDapSession(sessionId, emitEvent)
    activeSession = session
    const res = await session.start(opts)
    if (!res.ok) {
      activeSession = null
      return { ok: false, sessionId, error: res.error }
    }
    return { ok: true, sessionId }
  })

  ipcMain.handle('debug:stop', async () => {
    disposeDebugSessions()
    return true
  })

  ipcMain.handle('debug:continue', async () => {
    await activeSession?.continue()
    return true
  })

  ipcMain.handle('debug:stepOver', async () => {
    await activeSession?.stepOver()
    return true
  })

  ipcMain.handle('debug:stepInto', async () => {
    await activeSession?.stepInto()
    return true
  })

  ipcMain.handle('debug:stepOut', async () => {
    await activeSession?.stepOut()
    return true
  })

  ipcMain.handle('debug:pause', async () => {
    await activeSession?.pause()
    return true
  })

  ipcMain.handle('debug:setBreakpoints', async (_, bps: any[]) => {
    await activeSession?.setBreakpoints(bps || [])
    return true
  })

  ipcMain.handle('debug:setExceptionBreakpoints', async (_, cfg: { uncaught: boolean; caught: boolean }) => {
    await activeSession?.setExceptionBreakpoints(cfg)
    return true
  })

  ipcMain.handle('debug:evaluate', async (_, expression: string, frameId?: string) => {
    if (!activeSession) return { error: 'No active debug session' }
    return await activeSession.evaluate(expression, frameId)
  })

  ipcMain.handle('debug:setVariable', async (_, varName: string, newValue: string, frameId?: string, scopeNumber?: number) => {
    if (!activeSession) return { ok: false, error: 'No active debug session' }
    return await activeSession.setVariable(varName, newValue, frameId, scopeNumber)
  })

  ipcMain.handle('debug:getFrameVariables', async (_, frameId: string) => {
    if (!activeSession) return []
    return await activeSession.getFrameVariables(frameId)
  })
}

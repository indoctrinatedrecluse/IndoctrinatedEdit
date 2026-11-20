import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process'
import type { IpcMain } from 'electron'

export interface McpStdioServerSpec {
  id: string
  command: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  timeoutMs?: number
}

interface PendingRpc {
  resolve: (value: any) => void
  reject: (err: Error) => void
  timer: NodeJS.Timeout
}

/**
 * Persistent JSON-RPC 2.0 stdio MCP Client session over newline-delimited JSON.
 */
export class McpStdioSession {
  private child: ChildProcessWithoutNullStreams | null = null
  private buffer = ''
  private nextId = 1
  private initialized = false
  private pending = new Map<number, PendingRpc>()

  constructor(private readonly spec: McpStdioServerSpec) {}

  private ensureSpawned(): void {
    if (this.child && !this.child.killed && this.child.exitCode === null) return

    const isWin = process.platform === 'win32'
    this.child = spawn(this.spec.command, this.spec.args || [], {
      cwd: this.spec.cwd || process.cwd(),
      env: { ...process.env, ...(this.spec.env || {}) },
      windowsHide: true,
      shell: isWin && /^(npx|npm|pnpm|yarn|uvx)$/i.test(this.spec.command),
    })

    this.buffer = ''
    this.initialized = false

    this.child.stdout.setEncoding('utf8')
    this.child.stdout.on('data', (chunk: string) => {
      this.buffer += chunk
      let newlineIdx: number
      while ((newlineIdx = this.buffer.indexOf('\n')) !== -1) {
        const line = this.buffer.slice(0, newlineIdx).trim()
        this.buffer = this.buffer.slice(newlineIdx + 1)
        if (!line) continue
        this.handleLine(line)
      }
    })

    this.child.on('exit', (code, signal) => {
      const err = new Error(`MCP stdio server "${this.spec.id}" exited (code=${code}, signal=${signal})`)
      for (const [, p] of this.pending) {
        clearTimeout(p.timer)
        p.reject(err)
      }
      this.pending.clear()
      this.child = null
      this.initialized = false
    })

    this.child.on('error', (err) => {
      for (const [, p] of this.pending) {
        clearTimeout(p.timer)
        p.reject(err)
      }
      this.pending.clear()
      this.child = null
      this.initialized = false
    })
  }

  private handleLine(line: string): void {
    let msg: any
    try {
      msg = JSON.parse(line)
    } catch {
      return
    }
    if (typeof msg?.id === 'number' && this.pending.has(msg.id)) {
      const p = this.pending.get(msg.id)!
      this.pending.delete(msg.id)
      clearTimeout(p.timer)
      if (msg.error) {
        p.reject(new Error(msg.error.message || JSON.stringify(msg.error)))
      } else {
        p.resolve(msg.result)
      }
    }
  }

  private sendRequest(method: string, params?: Record<string, any>, timeoutMs?: number): Promise<any> {
    this.ensureSpawned()
    const id = this.nextId++
    const ms = Math.min(Math.max(timeoutMs || this.spec.timeoutMs || 15000, 1000), 120000)

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`MCP RPC "${method}" timed out after ${ms}ms`))
      }, ms)

      this.pending.set(id, { resolve, reject, timer })
      const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params: params || {} }) + '\n'
      this.child!.stdin.write(payload, 'utf8')
    })
  }

  private sendNotification(method: string, params?: Record<string, any>): void {
    if (!this.child || this.child.killed) return
    const payload = JSON.stringify({ jsonrpc: '2.0', method, params: params || {} }) + '\n'
    this.child.stdin.write(payload, 'utf8')
  }

  public async initialize(): Promise<any> {
    if (this.initialized && this.child && !this.child.killed) return { alreadyInitialized: true }
    const res = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'IndoctrinatedEdit', version: '6.2.0' },
    })
    this.sendNotification('notifications/initialized', {})
    this.initialized = true
    return res
  }

  public async ping(): Promise<{ latencyMs: number }> {
    const start = Date.now()
    await this.initialize()
    try {
      await this.sendRequest('ping', {}, 5000)
    } catch {
      // Some MCP servers don't implement optional `ping`; initialize succeeding already proves liveness
    }
    return { latencyMs: Date.now() - start }
  }

  public async listTools(): Promise<any[]> {
    await this.initialize()
    const res = await this.sendRequest('tools/list', {})
    return Array.isArray(res?.tools) ? res.tools : []
  }

  public async listResources(): Promise<any[]> {
    await this.initialize()
    const res = await this.sendRequest('resources/list', {})
    return Array.isArray(res?.resources) ? res.resources : []
  }

  public async listPrompts(): Promise<any[]> {
    await this.initialize()
    const res = await this.sendRequest('prompts/list', {})
    return Array.isArray(res?.prompts) ? res.prompts : []
  }

  public async readResource(uri: string): Promise<any> {
    await this.initialize()
    return this.sendRequest('resources/read', { uri })
  }

  public async getPrompt(name: string, args: Record<string, string> = {}): Promise<any> {
    await this.initialize()
    return this.sendRequest('prompts/get', { name, arguments: args })
  }

  public async callTool(name: string, args: Record<string, any> = {}): Promise<any> {
    await this.initialize()
    return this.sendRequest('tools/call', { name, arguments: args })
  }

  public dispose(): void {
    for (const [, p] of this.pending) {
      clearTimeout(p.timer)
      p.reject(new Error('MCP session disposed'))
    }
    this.pending.clear()
    if (this.child && !this.child.killed) {
      try {
        this.child.kill()
      } catch {
        // ignore
      }
    }
    this.child = null
    this.initialized = false
  }
}

class McpClientManager {
  private sessions = new Map<string, McpStdioSession>()

  private getOrCreate(spec: McpStdioServerSpec): McpStdioSession {
    let session = this.sessions.get(spec.id)
    if (!session) {
      session = new McpStdioSession(spec)
      this.sessions.set(spec.id, session)
    }
    return session
  }

  public async ping(spec: McpStdioServerSpec): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    try {
      const res = await this.getOrCreate(spec).ping()
      return { success: true, latencyMs: res.latencyMs }
    } catch (err: any) {
      this.disconnect(spec.id)
      return { success: false, error: err?.message || String(err) }
    }
  }

  public async listTools(spec: McpStdioServerSpec): Promise<{ success: boolean; tools: any[]; error?: string }> {
    try {
      const tools = await this.getOrCreate(spec).listTools()
      return { success: true, tools }
    } catch (err: any) {
      return { success: false, tools: [], error: err?.message || String(err) }
    }
  }

  public async listResources(spec: McpStdioServerSpec): Promise<{ success: boolean; resources: any[]; error?: string }> {
    try {
      const resources = await this.getOrCreate(spec).listResources()
      return { success: true, resources }
    } catch (err: any) {
      return { success: false, resources: [], error: err?.message || String(err) }
    }
  }

  public async listPrompts(spec: McpStdioServerSpec): Promise<{ success: boolean; prompts: any[]; error?: string }> {
    try {
      const prompts = await this.getOrCreate(spec).listPrompts()
      return { success: true, prompts }
    } catch (err: any) {
      return { success: false, prompts: [], error: err?.message || String(err) }
    }
  }

  public async callTool(
    spec: McpStdioServerSpec,
    toolName: string,
    args: Record<string, any> = {}
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const result = await this.getOrCreate(spec).callTool(toolName, args)
      return { success: true, result }
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) }
    }
  }

  public async readResource(
    spec: McpStdioServerSpec,
    uri: string
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const result = await this.getOrCreate(spec).readResource(uri)
      return { success: true, result }
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) }
    }
  }

  public async getPrompt(
    spec: McpStdioServerSpec,
    name: string,
    args: Record<string, string> = {}
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const result = await this.getOrCreate(spec).getPrompt(name, args)
      return { success: true, result }
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) }
    }
  }

  /**
   * CORS-free JSON-RPC 2.0 POST for Streamable-HTTP / SSE MCP endpoints from Electron main process.
   * Supports both `application/json` and `text/event-stream` (`data: {...}`) responses.
   */
  public async httpRpc(options: {
    url: string
    headers?: Record<string, string>
    method: string
    params?: Record<string, any>
    timeoutMs?: number
  }): Promise<{ success: boolean; result?: any; latencyMs?: number; error?: string }> {
    const start = Date.now()
    try {
      const timeoutMs = Math.min(Math.max(options.timeoutMs || 15000, 1000), 120000)
      const res = await fetch(options.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          ...(options.headers || {}),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          method: options.method,
          params: options.params || {},
        }),
        signal: AbortSignal.timeout(timeoutMs),
      })
      const latencyMs = Date.now() - start
      if (!res.ok) {
        return { success: false, latencyMs, error: `HTTP ${res.status}: ${res.statusText}` }
      }
      const contentType = res.headers.get('content-type') || ''
      const rawText = await res.text()
      let payload: any = null
      if (contentType.includes('text/event-stream') || rawText.trimStart().startsWith('data:')) {
        const dataLines = rawText
          .split(/\r?\n/)
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trim())
          .filter((l) => l && l !== '[DONE]')
        for (let i = dataLines.length - 1; i >= 0; i--) {
          try {
            const parsed = JSON.parse(dataLines[i])
            if (parsed && (parsed.result !== undefined || parsed.error !== undefined)) {
              payload = parsed
              break
            }
          } catch {
            // keep scanning SSE frames
          }
        }
      } else {
        payload = rawText.trim() ? JSON.parse(rawText) : {}
      }
      if (!payload) {
        return { success: true, latencyMs, result: { raw: rawText } }
      }
      if (payload.error) {
        return {
          success: false,
          latencyMs,
          error: payload.error.message || JSON.stringify(payload.error),
        }
      }
      return { success: true, latencyMs, result: payload.result ?? payload }
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: err?.message || String(err),
      }
    }
  }

  public disconnect(serverId: string): boolean {
    const session = this.sessions.get(serverId)
    if (session) {
      session.dispose()
      this.sessions.delete(serverId)
      return true
    }
    return false
  }

  public disposeAll(): void {
    for (const session of this.sessions.values()) {
      session.dispose()
    }
    this.sessions.clear()
  }
}

export const mcpClientManager = new McpClientManager()

export function setupMcpClientIPC(ipcMain: IpcMain): void {
  ipcMain.handle('mcp:ping', (_, spec: McpStdioServerSpec) => mcpClientManager.ping(spec))
  ipcMain.handle('mcp:listTools', (_, spec: McpStdioServerSpec) => mcpClientManager.listTools(spec))
  ipcMain.handle('mcp:listResources', (_, spec: McpStdioServerSpec) => mcpClientManager.listResources(spec))
  ipcMain.handle('mcp:listPrompts', (_, spec: McpStdioServerSpec) => mcpClientManager.listPrompts(spec))
  ipcMain.handle('mcp:readResource', (_, spec: McpStdioServerSpec, uri: string) =>
    mcpClientManager.readResource(spec, uri)
  )
  ipcMain.handle('mcp:getPrompt', (_, spec: McpStdioServerSpec, name: string, args?: Record<string, string>) =>
    mcpClientManager.getPrompt(spec, name, args)
  )
  ipcMain.handle('mcp:callTool', (_, spec: McpStdioServerSpec, toolName: string, args?: Record<string, any>) =>
    mcpClientManager.callTool(spec, toolName, args)
  )
  ipcMain.handle('mcp:httpRpc', (_, options) => mcpClientManager.httpRpc(options))
  ipcMain.handle('mcp:disconnect', (_, serverId: string) => mcpClientManager.disconnect(serverId))
}

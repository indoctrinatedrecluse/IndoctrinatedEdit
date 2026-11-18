/**
 * Real Language Server Protocol (LSP) Stdio JSON-RPC 2.0 Manager
 * Auto-detects installed language servers (typescript-language-server, pyright-langserver,
 * rust-analyzer, gopls, clangd) and exposes definition, references, symbols, and diagnostics.
 */

import { spawn, ChildProcess } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import type { IpcMain, BrowserWindow } from 'electron'

export interface LspServerSpec {
  language: string
  command: string
  args: string[]
}

const DEFAULT_LSP_SERVERS: Record<string, LspServerSpec> = {
  typescript: { language: 'typescript', command: process.platform === 'win32' ? 'typescript-language-server.cmd' : 'typescript-language-server', args: ['--stdio'] },
  javascript: { language: 'typescript', command: process.platform === 'win32' ? 'typescript-language-server.cmd' : 'typescript-language-server', args: ['--stdio'] },
  typescriptreact: { language: 'typescript', command: process.platform === 'win32' ? 'typescript-language-server.cmd' : 'typescript-language-server', args: ['--stdio'] },
  javascriptreact: { language: 'typescript', command: process.platform === 'win32' ? 'typescript-language-server.cmd' : 'typescript-language-server', args: ['--stdio'] },
  python: { language: 'python', command: process.platform === 'win32' ? 'pyright-langserver.cmd' : 'pyright-langserver', args: ['--stdio'] },
  rust: { language: 'rust', command: 'rust-analyzer', args: [] },
  go: { language: 'go', command: 'gopls', args: [] },
  cpp: { language: 'cpp', command: 'clangd', args: [] },
  c: { language: 'cpp', command: 'clangd', args: [] },
}

export function encodeLspMessage(payload: Record<string, any>): Buffer {
  const json = JSON.stringify(payload)
  const len = Buffer.byteLength(json, 'utf8')
  return Buffer.from(`Content-Length: ${len}\r\n\r\n${json}`, 'utf8')
}

export function decodeLspMessages(buffer: Buffer): { messages: any[]; remainder: Buffer } {
  const messages: any[] = []
  let offset = 0
  while (offset < buffer.length) {
    const headerEnd = buffer.indexOf('\r\n\r\n', offset)
    if (headerEnd === -1) break
    const header = buffer.slice(offset, headerEnd).toString('ascii')
    const match = header.match(/Content-Length:\s*(\d+)/i)
    if (!match) {
      offset = headerEnd + 4
      continue
    }
    const len = parseInt(match[1], 10)
    const bodyStart = headerEnd + 4
    const bodyEnd = bodyStart + len
    if (buffer.length < bodyEnd) break
    try {
      messages.push(JSON.parse(buffer.slice(bodyStart, bodyEnd).toString('utf8')))
    } catch {
      // ignore invalid JSON
    }
    offset = bodyEnd
  }
  return { messages, remainder: buffer.slice(offset) }
}

class LspClientInstance {
  private child: ChildProcess | null = null
  private nextId = 1
  private rxBuf: Buffer = Buffer.alloc(0)
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>()
  private initialized = false
  private openDocs = new Map<string, number>()

  constructor(
    public readonly key: string,
    private spec: LspServerSpec,
    private rootDir: string,
    private onDiagnostics: (filePath: string, diagnostics: any[]) => void
  ) {}

  public async ensureStarted(): Promise<boolean> {
    if (this.initialized && this.child && !this.child.killed) return true

    try {
      this.child = spawn(this.spec.command, this.spec.args, {
        cwd: this.rootDir,
        shell: process.platform === 'win32' && this.spec.command.endsWith('.cmd'),
        windowsHide: true,
      })
    } catch {
      return false
    }

    let failed = false
    this.child.on('error', () => {
      failed = true
      this.initialized = false
    })

    this.child.stdout?.on('data', (chunk: Buffer) => {
      this.rxBuf = Buffer.concat([this.rxBuf, chunk])
      const { messages, remainder } = decodeLspMessages(this.rxBuf)
      this.rxBuf = remainder
      for (const msg of messages) {
        if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
          const p = this.pending.get(msg.id)
          if (p) {
            this.pending.delete(msg.id)
            if (msg.error) p.reject(new Error(msg.error.message || 'LSP error'))
            else p.resolve(msg.result)
          }
        } else if (msg.method === 'textDocument/publishDiagnostics' && msg.params?.uri) {
          try {
            const fp = msg.params.uri.startsWith('file://') ? fileURLToPath(msg.params.uri) : msg.params.uri
            this.onDiagnostics(fp, msg.params.diagnostics || [])
          } catch {
            // ignore
          }
        }
      }
    })

    this.child.on('close', () => {
      this.initialized = false
      for (const [, p] of this.pending) p.reject(new Error('LSP server closed'))
      this.pending.clear()
    })

    await new Promise((r) => setTimeout(r, 80))
    if (failed) return false

    try {
      const rootUri = pathToFileURL(path.resolve(this.rootDir)).href
      await this.request('initialize', {
        processId: process.pid,
        rootUri,
        capabilities: {
          textDocument: {
            definition: { dynamicRegistration: false },
            references: { dynamicRegistration: false },
            documentSymbol: { hierarchicalDocumentSymbolSupport: true },
            publishDiagnostics: {},
          },
        },
      })
      this.notify('initialized', {})
      this.initialized = true
      return true
    } catch {
      this.dispose()
      return false
    }
  }

  public request(method: string, params: any): Promise<any> {
    if (!this.child?.stdin?.writable) return Promise.reject(new Error('LSP stdin unavailable'))
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          reject(new Error(`LSP ${method} timeout`))
        }
      }, 6000)
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer)
          resolve(v)
        },
        reject: (e) => {
          clearTimeout(timer)
          reject(e)
        },
      })
      this.child!.stdin!.write(encodeLspMessage({ jsonrpc: '2.0', id, method, params }))
    })
  }

  public notify(method: string, params: any): void {
    if (!this.child?.stdin?.writable) return
    this.child.stdin.write(encodeLspMessage({ jsonrpc: '2.0', method, params }))
  }

  public syncDocument(filePath: string, languageId: string, text: string): void {
    const uri = pathToFileURL(path.resolve(filePath)).href
    const prevVer = this.openDocs.get(uri)
    if (prevVer === undefined) {
      this.openDocs.set(uri, 1)
      this.notify('textDocument/didOpen', {
        textDocument: { uri, languageId, version: 1, text },
      })
    } else {
      const nextVer = prevVer + 1
      this.openDocs.set(uri, nextVer)
      this.notify('textDocument/didChange', {
        textDocument: { uri, version: nextVer },
        contentChanges: [{ text }],
      })
    }
  }

  public dispose(): void {
    this.initialized = false
    try {
      if (this.child && !this.child.killed) this.child.kill()
    } catch {}
    this.child = null
  }
}

const clients = new Map<string, LspClientInstance>()

export function disposeLspClients(): void {
  for (const c of clients.values()) c.dispose()
  clients.clear()
}

export function setupLspIPC(ipcMain: IpcMain, getWin: () => BrowserWindow | null): void {
  const getOrStart = async (language: string, rootDir: string): Promise<LspClientInstance | null> => {
    const spec = DEFAULT_LSP_SERVERS[language.toLowerCase()]
    if (!spec) return null
    const key = `${spec.language}::${path.resolve(rootDir)}`
    let client = clients.get(key)
    if (!client) {
      client = new LspClientInstance(key, spec, rootDir, (filePath, diagnostics) => {
        const win = getWin()
        if (win && !win.isDestroyed()) {
          win.webContents.send('lsp:diagnostics', { filePath, diagnostics })
        }
      })
      clients.set(key, client)
    }
    const ok = await client.ensureStarted()
    if (!ok) {
      clients.delete(key)
      return null
    }
    return client
  }

  ipcMain.handle('lsp:syncDocument', async (_, opts: { language: string; rootDir: string; filePath: string; content: string }) => {
    const client = await getOrStart(opts.language, opts.rootDir)
    if (!client) return { available: false }
    client.syncDocument(opts.filePath, opts.language, opts.content)
    return { available: true }
  })

  ipcMain.handle('lsp:definition', async (_, opts: { language: string; rootDir: string; filePath: string; line: number; character: number }) => {
    const client = await getOrStart(opts.language, opts.rootDir)
    if (!client) return null
    try {
      const uri = pathToFileURL(path.resolve(opts.filePath)).href
      const res = await client.request('textDocument/definition', {
        textDocument: { uri },
        position: { line: Math.max(0, opts.line - 1), character: Math.max(0, opts.character - 1) },
      })
      const first = Array.isArray(res) ? res[0] : res
      if (!first) return null
      const targetUri = first.uri || first.targetUri
      const range = first.range || first.targetSelectionRange || first.targetRange
      if (!targetUri || !range) return null
      return {
        filePath: targetUri.startsWith('file://') ? fileURLToPath(targetUri) : targetUri,
        lineNumber: (range.start?.line ?? 0) + 1,
        column: (range.start?.character ?? 0) + 1,
      }
    } catch {
      return null
    }
  })

  ipcMain.handle('lsp:references', async (_, opts: { language: string; rootDir: string; filePath: string; line: number; character: number }) => {
    const client = await getOrStart(opts.language, opts.rootDir)
    if (!client) return null
    try {
      const uri = pathToFileURL(path.resolve(opts.filePath)).href
      const res = await client.request('textDocument/references', {
        textDocument: { uri },
        position: { line: Math.max(0, opts.line - 1), character: Math.max(0, opts.character - 1) },
        context: { includeDeclaration: true },
      })
      if (!Array.isArray(res)) return []
      return res
        .filter((loc: any) => loc?.uri && loc?.range)
        .map((loc: any) => ({
          filePath: loc.uri.startsWith('file://') ? fileURLToPath(loc.uri) : loc.uri,
          lineNumber: (loc.range.start?.line ?? 0) + 1,
          column: (loc.range.start?.character ?? 0) + 1,
        }))
    } catch {
      return null
    }
  })
}

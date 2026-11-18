import http from 'node:http'
import net from 'node:net'
import tls from 'node:tls'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { sqliteWasmService } from './sqlite-wasm-service'
import type { BrowserWindow, IpcMain } from 'electron'
import WebSocket from 'ws'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'

const execFileAsync = promisify(execFile)

// =========================================================================
// 1. CORS-FREE HTTP / GRAPHQL PROXY
// =========================================================================
export interface HttpProxyRequest {
  url: string
  method: string
  headers?: Record<string, string>
  body?: string
  timeoutMs?: number
}

export interface HttpProxyResponse {
  ok: boolean
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  latencyMs: number
  sizeBytes: number
  error?: string
}

export async function executeHttpProxy(req: HttpProxyRequest): Promise<HttpProxyResponse> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), Math.min(Math.max(req.timeoutMs || 30000, 1000), 120000))
    try {
      const res = await fetch(req.url, {
        method: req.method || 'GET',
        headers: req.headers,
        body: req.body && !['GET', 'HEAD'].includes((req.method || 'GET').toUpperCase()) ? req.body : undefined,
        signal: controller.signal,
      })
      const text = await res.text()
      const headersObj: Record<string, string> = {}
      res.headers.forEach((v, k) => {
        headersObj[k] = v
      })
      return {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        headers: headersObj,
        body: text,
        latencyMs: Date.now() - start,
        sizeBytes: Buffer.byteLength(text, 'utf8'),
      }
    } finally {
      clearTimeout(timer)
    }
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      statusText: 'Network Error',
      headers: {},
      body: '',
      latencyMs: Date.now() - start,
      sizeBytes: 0,
      error: err?.message || String(err),
    }
  }
}

// =========================================================================
// 2. REAL LOCAL MOCK HTTP SERVER (MockLab)
// =========================================================================
export interface MockRouteSpec {
  id: string
  method: string
  path: string
  statusCode: number
  delayMs: number
  headers: Record<string, string>
  responseBody: string
  isEnabled: boolean
}

export interface MockTrafficEvent {
  id: string
  timestamp: string
  method: string
  path: string
  statusCode: number
  latencyMs: number
  matchedEndpointId?: string
}

class RealMockHttpServer {
  private server: http.Server | null = null
  private port = 4040
  private routes: MockRouteSpec[] = []
  private onTraffic?: (ev: MockTrafficEvent) => void

  public setTrafficCallback(cb: (ev: MockTrafficEvent) => void): void {
    this.onTraffic = cb
  }

  public syncRoutes(routes: MockRouteSpec[]): void {
    this.routes = Array.isArray(routes) ? routes : []
  }

  private matchRoute(method: string, reqPath: string): { route: MockRouteSpec; params: Record<string, string> } | null {
    const cleanPath = reqPath.split('?')[0]
    for (const r of this.routes) {
      if (!r.isEnabled) continue
      if (r.method.toUpperCase() !== method.toUpperCase()) continue
      const rParts = r.path.split('/').filter(Boolean)
      const pParts = cleanPath.split('/').filter(Boolean)
      if (rParts.length !== pParts.length) continue
      const params: Record<string, string> = {}
      let ok = true
      for (let i = 0; i < rParts.length; i++) {
        if (rParts[i].startsWith(':')) {
          params[rParts[i].slice(1)] = decodeURIComponent(pParts[i])
        } else if (rParts[i] !== pParts[i]) {
          ok = false
          break
        }
      }
      if (ok) return { route: r, params }
    }
    return null
  }

  public async start(port = 4040, routes?: MockRouteSpec[]): Promise<{ running: boolean; port: number; error?: string }> {
    if (routes) this.routes = routes
    await this.stop()

    return new Promise((resolve) => {
      const srv = http.createServer((req, res) => {
        const start = Date.now()
        const method = req.method || 'GET'
        const reqUrl = req.url || '/'

        // CORS preflight support
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', '*')
        if (method === 'OPTIONS') {
          res.writeHead(204)
          res.end()
          return
        }

        const matched = this.matchRoute(method, reqUrl)
        if (!matched) {
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: `MockLab: No enabled route matched ${method} ${reqUrl}` }))
          this.onTraffic?.({
            id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toLocaleTimeString(),
            method,
            path: reqUrl,
            statusCode: 404,
            latencyMs: Date.now() - start,
          })
          return
        }

        const { route, params } = matched
        const send = () => {
          let body = route.responseBody || ''
          for (const [k, v] of Object.entries(params)) {
            body = body.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), v)
          }
          const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(route.headers || {}) }
          res.writeHead(Number(route.statusCode) || 200, headers)
          res.end(body)
          this.onTraffic?.({
            id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toLocaleTimeString(),
            method,
            path: reqUrl,
            statusCode: Number(route.statusCode) || 200,
            latencyMs: Date.now() - start,
            matchedEndpointId: route.id,
          })
        }

        const delay = Math.max(0, Math.min(Number(route.delayMs) || 0, 30000))
        if (delay > 0) setTimeout(send, delay)
        else send()
      })

      srv.once('error', (err: any) => {
        resolve({ running: false, port, error: err?.message || String(err) })
      })

      srv.listen(port, '127.0.0.1', () => {
        const addr = srv.address()
        const actualPort = typeof addr === 'object' && addr ? addr.port : port
        this.server = srv
        this.port = actualPort
        resolve({ running: true, port: actualPort })
      })
    })
  }

  public async stop(): Promise<boolean> {
    if (!this.server) return true
    const srv = this.server
    this.server = null
    return new Promise((resolve) => {
      srv.close(() => resolve(true))
    })
  }

  public getStatus(): { running: boolean; port: number } {
    return { running: this.server !== null, port: this.port }
  }
}

export const realMockHttpServer = new RealMockHttpServer()

// =========================================================================
// 3. REAL OS PORT SCANNER, TCP/HTTP PROBE & PROCESS TERMINATOR (Port Sentinel)
// =========================================================================
export interface OsActivePort {
  port: number
  protocol: 'TCP' | 'UDP'
  pid: number
  processName: string
  localAddress: string
  state: string
}

export async function scanOsActivePorts(): Promise<OsActivePort[]> {
  const results: OsActivePort[] = []
  const seen = new Set<string>()

  if (process.platform === 'win32') {
    const pidNameMap = new Map<number, string>()
    try {
      const { stdout: tasksOut } = await execFileAsync('tasklist', ['/FO', 'CSV', '/NH'], {
        timeout: 6000,
        windowsHide: true,
        maxBuffer: 8 * 1024 * 1024,
      })
      for (const line of tasksOut.split(/\r?\n/)) {
        const m = line.match(/^"([^"]+)","(\d+)"/)
        if (m) pidNameMap.set(Number(m[2]), m[1])
      }
    } catch {
      // tasklist unavailable
    }

    try {
      const { stdout } = await execFileAsync('netstat', ['-ano'], {
        timeout: 6000,
        windowsHide: true,
        maxBuffer: 8 * 1024 * 1024,
      })
      for (const rawLine of stdout.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line.startsWith('TCP') && !line.startsWith('UDP')) continue
        const parts = line.split(/\s+/)
        const proto = parts[0] as 'TCP' | 'UDP'
        const local = parts[1] || ''
        const state = proto === 'TCP' ? parts[3] || '' : 'LISTEN'
        const pid = Number(proto === 'TCP' ? parts[4] : parts[3])
        if (proto === 'TCP' && state !== 'LISTENING') continue

        const lastColon = local.lastIndexOf(':')
        if (lastColon === -1) continue
        const port = Number(local.slice(lastColon + 1))
        const addr = local.slice(0, lastColon)
        if (!Number.isFinite(port) || port <= 0) continue

        const key = `${proto}:${port}:${pid}`
        if (seen.has(key)) continue
        seen.add(key)

        results.push({
          port,
          protocol: proto,
          pid: Number.isFinite(pid) ? pid : 0,
          processName: pidNameMap.get(pid) || `pid-${pid}`,
          localAddress: addr || '0.0.0.0',
          state: state || 'LISTENING',
        })
      }
    } catch {
      return []
    }
  } else {
    try {
      const { stdout } = await execFileAsync('lsof', ['-i', '-P', '-n', '-sTCP:LISTEN'], {
        timeout: 6000,
        maxBuffer: 8 * 1024 * 1024,
      })
      for (const line of stdout.split(/\r?\n/).slice(1)) {
        const parts = line.trim().split(/\s+/)
        if (parts.length < 9) continue
        const procName = parts[0]
        const pid = Number(parts[1])
        const nameField = parts[8] || ''
        const m = nameField.match(/(.*):(\d+)$/)
        if (!m) continue
        const port = Number(m[2])
        const key = `TCP:${port}:${pid}`
        if (seen.has(key)) continue
        seen.add(key)
        results.push({
          port,
          protocol: 'TCP',
          pid,
          processName: procName,
          localAddress: m[1] || '*',
          state: 'LISTENING',
        })
      }
    } catch {
      return []
    }
  }

  return results.sort((a, b) => a.port - b.port)
}

export async function probeLocalPort(port: number, host = '127.0.0.1'): Promise<{
  isReachable: boolean
  latencyMs: number
  statusCode?: number
  statusText?: string
  serverHeader?: string
  error?: string
}> {
  const start = Date.now()
  const tcpOk = await new Promise<boolean>((resolve) => {
    const sock = net.createConnection({ host, port, timeout: 2500 })
    sock.once('connect', () => {
      sock.destroy()
      resolve(true)
    })
    sock.once('timeout', () => {
      sock.destroy()
      resolve(false)
    })
    sock.once('error', () => {
      sock.destroy()
      resolve(false)
    })
  })

  if (!tcpOk) {
    return { isReachable: false, latencyMs: Date.now() - start, error: `Connection refused on ${host}:${port}` }
  }

  // Try optional HTTP HEAD to inspect HTTP status & Server header
  const httpRes = await executeHttpProxy({ url: `http://${host}:${port}/`, method: 'HEAD', timeoutMs: 2500 })
  if (httpRes.status > 0) {
    return {
      isReachable: true,
      latencyMs: Date.now() - start,
      statusCode: httpRes.status,
      statusText: httpRes.statusText,
      serverHeader: httpRes.headers['server'] || httpRes.headers['x-powered-by'] || 'TCP/HTTP',
    }
  }

  return {
    isReachable: true,
    latencyMs: Date.now() - start,
    statusText: 'TCP Open',
    serverHeader: 'Raw TCP Socket',
  }
}

export async function killOsProcess(pid: number): Promise<{ success: boolean; message: string }> {
  if (!Number.isInteger(pid) || pid <= 4) {
    return { success: false, message: `Refusing to terminate system or invalid PID ${pid}` }
  }
  try {
    if (process.platform === 'win32') {
      await execFileAsync('taskkill', ['/PID', String(pid), '/F'], { timeout: 5000, windowsHide: true })
    } else {
      process.kill(pid, 'SIGTERM')
    }
    return { success: true, message: `Process PID ${pid} terminated.` }
  } catch (err: any) {
    return { success: false, message: err?.message || `Failed to terminate PID ${pid}` }
  }
}

// =========================================================================
// 4. PURE-NODE RESP2 REDIS CLIENT (ZERO DEPENDENCIES)
// =========================================================================
function encodeRespCommand(args: string[]): string {
  let out = `*${args.length}\r\n`
  for (const arg of args) {
    const bufLen = Buffer.byteLength(arg, 'utf8')
    out += `$${bufLen}\r\n${arg}\r\n`
  }
  return out
}

function parseRespValue(buf: Buffer, offset = 0): { value: any; nextOffset: number } | null {
  if (offset >= buf.length) return null
  const prefix = String.fromCharCode(buf[offset])
  const crlf = buf.indexOf('\r\n', offset)
  if (crlf === -1) return null

  const line = buf.subarray(offset + 1, crlf).toString('utf8')
  const afterLine = crlf + 2

  if (prefix === '+') return { value: line, nextOffset: afterLine }
  if (prefix === '-') return { value: { __redisError: line }, nextOffset: afterLine }
  if (prefix === ':') return { value: Number(line), nextOffset: afterLine }
  if (prefix === '$') {
    const len = Number(line)
    if (len === -1) return { value: null, nextOffset: afterLine }
    if (afterLine + len + 2 > buf.length) return null
    const str = buf.subarray(afterLine, afterLine + len).toString('utf8')
    return { value: str, nextOffset: afterLine + len + 2 }
  }
  if (prefix === '*') {
    const count = Number(line)
    if (count === -1) return { value: null, nextOffset: afterLine }
    const arr: any[] = []
    let cursor = afterLine
    for (let i = 0; i < count; i++) {
      const parsed = parseRespValue(buf, cursor)
      if (!parsed) return null
      arr.push(parsed.value)
      cursor = parsed.nextOffset
    }
    return { value: arr, nextOffset: cursor }
  }
  return { value: line, nextOffset: afterLine }
}

export async function executeRedisRespCommand(options: {
  host: string
  port: number
  password?: string
  db?: number
  tls?: boolean
  args: string[]
  timeoutMs?: number
}): Promise<{ ok: boolean; value?: any; error?: string; latencyMs: number }> {
  const start = Date.now()
  const timeoutMs = Math.min(Math.max(options.timeoutMs || 5000, 500), 30000)

  return new Promise((resolve) => {
    const sock: net.Socket = options.tls
      ? tls.connect({ host: options.host, port: options.port, rejectUnauthorized: false })
      : net.createConnection({ host: options.host, port: options.port })

    let finished = false
    let incoming = Buffer.alloc(0)
    const pipeline: string[][] = []
    if (options.password) pipeline.push(['AUTH', options.password])
    if (typeof options.db === 'number' && options.db > 0) pipeline.push(['SELECT', String(options.db)])
    pipeline.push(options.args)

    const done = (result: { ok: boolean; value?: any; error?: string }) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      try {
        sock.destroy()
      } catch {}
      resolve({ ...result, latencyMs: Date.now() - start })
    }

    const timer = setTimeout(() => done({ ok: false, error: `Redis command timed out after ${timeoutMs}ms` }), timeoutMs)

    sock.once('error', (err) => done({ ok: false, error: err.message }))

    const connectEvent = options.tls ? 'secureConnect' : 'connect'
    sock.once(connectEvent, () => {
      for (const cmd of pipeline) {
        sock.write(encodeRespCommand(cmd), 'utf8')
      }
    })

    sock.on('data', (chunk: Buffer) => {
      incoming = Buffer.concat([incoming, chunk])
      let cursor = 0
      const replies: any[] = []
      while (replies.length < pipeline.length) {
        const parsed = parseRespValue(incoming, cursor)
        if (!parsed) return // wait for more bytes
        replies.push(parsed.value)
        cursor = parsed.nextOffset
      }
      // Surface any error in AUTH, SELECT, or target command
      const firstError = replies.find((r) => r && typeof r === 'object' && '__redisError' in r)
      if (firstError) {
        done({ ok: false, error: firstError.__redisError })
      } else {
        done({ ok: true, value: replies[replies.length - 1] })
      }
    })
  })
}

// =========================================================================
// 5. DOCKER & KUBERNETES CLI EXECUTOR (with optional cwd & stdin piping)
// =========================================================================
export interface InfraCliOptions {
  timeoutMs?: number
  cwd?: string
  stdin?: string
}

export async function execInfraCli(
  tool: 'docker' | 'kubectl',
  args: string[],
  timeoutOrOpts: number | InfraCliOptions = 15000
): Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number }> {
  const opts: InfraCliOptions = typeof timeoutOrOpts === 'number' ? { timeoutMs: timeoutOrOpts } : timeoutOrOpts || {}
  const timeoutMs = Math.min(Math.max(opts.timeoutMs ?? 15000, 1000), 120000)

  if (opts.stdin !== undefined) {
    return new Promise((resolve) => {
      let stdout = ''
      let stderr = ''
      let settled = false
      const child = spawn(tool, args, {
        cwd: opts.cwd || undefined,
        windowsHide: true,
      })
      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        try { child.kill('SIGKILL') } catch {}
        resolve({ ok: false, stdout, stderr: stderr || `${tool} timed out after ${timeoutMs}ms`, exitCode: 124 })
      }, timeoutMs)

      child.stdout?.on('data', (chunk) => { stdout += chunk.toString() })
      child.stderr?.on('data', (chunk) => { stderr += chunk.toString() })
      child.on('error', (err) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ ok: false, stdout, stderr: err.message || `${tool} unavailable`, exitCode: 1 })
      })
      child.on('close', (code) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        const exitCode = typeof code === 'number' ? code : 1
        resolve({ ok: exitCode === 0, stdout, stderr, exitCode })
      })
      if (child.stdin) {
        child.stdin.write(opts.stdin)
        child.stdin.end()
      }
    })
  }

  try {
    const { stdout, stderr } = await execFileAsync(tool, args, {
      timeout: timeoutMs,
      cwd: opts.cwd || undefined,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    })
    return { ok: true, stdout: stdout || '', stderr: stderr || '', exitCode: 0 }
  } catch (err: any) {
    return {
      ok: false,
      stdout: err?.stdout || '',
      stderr: err?.stderr || err?.message || `${tool} unavailable`,
      exitCode: typeof err?.code === 'number' ? err.code : 1,
    }
  }
}

// =========================================================================
// 6. PURE-JS gRPC PROTO INSPECTOR & UNARY CLIENT
// =========================================================================
export async function inspectGrpcProto(protoPath: string): Promise<{
  ok: boolean
  services: Array<{ name: string; methods: string[] }>
  error?: string
}> {
  try {
    const packageDef = await protoLoader.load(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    })
    const services: Array<{ name: string; methods: string[] }> = []
    for (const [fullName, def] of Object.entries<any>(packageDef)) {
      if (def && typeof def === 'object' && !('format' in def)) {
        const methodNames = Object.keys(def).filter((k) => def[k]?.path)
        if (methodNames.length > 0) {
          services.push({ name: fullName, methods: methodNames })
        }
      }
    }
    return { ok: true, services }
  } catch (err: any) {
    return { ok: false, services: [], error: err?.message || String(err) }
  }
}

export async function invokeGrpcUnary(options: {
  protoPath: string
  address: string
  serviceName: string
  methodName: string
  payload: Record<string, any>
  metadata?: Record<string, string>
  useTls?: boolean
  timeoutMs?: number
}): Promise<{ ok: boolean; response?: any; latencyMs: number; error?: string }> {
  const start = Date.now()
  try {
    const packageDef = await protoLoader.load(options.protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    })
    const loaded: any = grpc.loadPackageDefinition(packageDef)
    const parts = options.serviceName.split('.')
    let cursor: any = loaded
    for (const p of parts) {
      cursor = cursor?.[p]
    }
    if (typeof cursor !== 'function') {
      return { ok: false, latencyMs: Date.now() - start, error: `Service "${options.serviceName}" not found in proto.` }
    }

    const creds = options.useTls ? grpc.credentials.createSsl() : grpc.credentials.createInsecure()
    const client = new cursor(options.address, creds)
    const meta = new grpc.Metadata()
    for (const [k, v] of Object.entries(options.metadata || {})) {
      meta.set(k, v)
    }

    const deadline = new Date(Date.now() + Math.min(Math.max(options.timeoutMs || 15000, 1000), 60000))
    return await new Promise((resolve) => {
      if (typeof client[options.methodName] !== 'function') {
        client.close()
        resolve({ ok: false, latencyMs: Date.now() - start, error: `Method "${options.methodName}" not found.` })
        return
      }
      client[options.methodName](options.payload || {}, meta, { deadline }, (err: any, response: any) => {
        try {
          client.close()
        } catch {}
        if (err) {
          resolve({ ok: false, latencyMs: Date.now() - start, error: err.details || err.message || String(err) })
        } else {
          resolve({ ok: true, response, latencyMs: Date.now() - start })
        }
      })
    })
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, error: err?.message || String(err) }
  }
}

// =========================================================================
// 7. PURE-NODE REAL SMTP ESMTP/STARTTLS DIAGNOSTIC CLIENT
// =========================================================================
export async function sendSmtpDiagnostic(options: {
  host: string
  port: number
  security: 'starttls' | 'ssl' | 'none'
  username?: string
  password?: string
  from: string
  to: string
  subject: string
  body: string
  timeoutMs?: number
}): Promise<{ ok: boolean; transcript: Array<{ type: 'info' | 'client' | 'server'; text: string }>; error?: string }> {
  const transcript: Array<{ type: 'info' | 'client' | 'server'; text: string }> = []
  const timeoutMs = Math.min(Math.max(options.timeoutMs || 15000, 2000), 60000)

  const readReply = (sock: net.Socket): Promise<{ code: number; text: string }> =>
    new Promise((resolve, reject) => {
      let buf = ''
      const onData = (chunk: Buffer) => {
        buf += chunk.toString('utf8')
        const lines = buf.split(/\r?\n/).filter(Boolean)
        const last = lines[lines.length - 1]
        if (last && /^\d{3}\s/.test(last)) {
          cleanup()
          const text = lines.join('\n')
          transcript.push({ type: 'server', text })
          resolve({ code: Number(last.slice(0, 3)), text })
        }
      }
      const onErr = (e: Error) => {
        cleanup()
        reject(e)
      }
      const timer = setTimeout(() => {
        cleanup()
        reject(new Error('SMTP server reply timeout'))
      }, timeoutMs)
      const cleanup = () => {
        clearTimeout(timer)
        sock.off('data', onData)
        sock.off('error', onErr)
      }
      sock.on('data', onData)
      sock.once('error', onErr)
    })

  const sendCmd = async (sock: net.Socket, cmd: string, redactedLog?: string) => {
    transcript.push({ type: 'client', text: redactedLog || cmd })
    sock.write(cmd + '\r\n', 'utf8')
    return readReply(sock)
  }

  let sock: net.Socket | null = null
  try {
    transcript.push({ type: 'info', text: `Connecting to ${options.host}:${options.port} (${options.security.toUpperCase()})...` })
    sock = await new Promise<net.Socket>((resolve, reject) => {
      const s =
        options.security === 'ssl'
          ? tls.connect({ host: options.host, port: options.port, rejectUnauthorized: false })
          : net.createConnection({ host: options.host, port: options.port })
      const t = setTimeout(() => {
        s.destroy()
        reject(new Error('SMTP connection timeout'))
      }, timeoutMs)
      s.once(options.security === 'ssl' ? 'secureConnect' : 'connect', () => {
        clearTimeout(t)
        resolve(s)
      })
      s.once('error', (err) => {
        clearTimeout(t)
        reject(err)
      })
    })

    const greeting = await readReply(sock)
    if (greeting.code >= 400) throw new Error(greeting.text)

    await sendCmd(sock, 'EHLO indoctrinated.local')

    if (options.security === 'starttls') {
      const st = await sendCmd(sock, 'STARTTLS')
      if (st.code !== 220) throw new Error(`STARTTLS rejected: ${st.text}`)
      sock = await new Promise<tls.TLSSocket>((resolve, reject) => {
        const upgraded = tls.connect({ socket: sock!, servername: options.host, rejectUnauthorized: false }, () =>
          resolve(upgraded)
        )
        upgraded.once('error', reject)
      })
      await sendCmd(sock, 'EHLO indoctrinated.local')
    }

    if (options.username && options.password) {
      const auth = await sendCmd(sock, 'AUTH LOGIN')
      if (auth.code === 334) {
        await sendCmd(sock, Buffer.from(options.username, 'utf8').toString('base64'), '<BASE64 USERNAME>')
        const passRes = await sendCmd(sock, Buffer.from(options.password, 'utf8').toString('base64'), '<REDACTED PASSWORD>')
        if (passRes.code !== 235) throw new Error(`Authentication failed: ${passRes.text}`)
      } else {
        // Fallback to AUTH PLAIN (RFC 4616)
        const plainToken = Buffer.from(`\0${options.username}\0${options.password}`, 'utf8').toString('base64')
        const plainRes = await sendCmd(sock, `AUTH PLAIN ${plainToken}`, 'AUTH PLAIN <REDACTED>')
        if (plainRes.code !== 235) throw new Error(`SMTP AUTH failed: ${plainRes.text}`)
      }
    }

    const mf = await sendCmd(sock, `MAIL FROM:<${options.from}>`)
    if (mf.code >= 400) throw new Error(mf.text)
    const rt = await sendCmd(sock, `RCPT TO:<${options.to}>`)
    if (rt.code >= 400) throw new Error(rt.text)
    const dt = await sendCmd(sock, 'DATA')
    if (dt.code !== 354) throw new Error(dt.text)

    const isHtml = /<[a-z][\s\S]*>/i.test(options.body)
    const payload = [
      `From: ${options.from}`,
      `To: ${options.to}`,
      `Subject: ${options.subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8`,
      '',
      options.body.replace(/^\./gm, '..'),
      '.',
    ].join('\r\n')

    const sent = await sendCmd(sock, payload, `<DATA ${payload.length} bytes>`)
    if (sent.code >= 400) throw new Error(sent.text)

    await sendCmd(sock, 'QUIT').catch(() => {})
    return { ok: true, transcript }
  } catch (err: any) {
    return { ok: false, transcript, error: err?.message || String(err) }
  } finally {
    try {
      sock?.destroy()
    } catch {}
  }
}

// =========================================================================
// 8. REAL WEBSOCKET & RAW TCP SESSIONS MANAGER
// =========================================================================
class InfraSocketManager {
  private wsSessions = new Map<string, WebSocket>()
  private tcpSessions = new Map<string, net.Socket>()
  private getWin: () => BrowserWindow | null = () => null

  public setWindowGetter(fn: () => BrowserWindow | null): void {
    this.getWin = fn
  }

  private emit(channel: string, payload: any): void {
    try {
      this.getWin()?.webContents.send(channel, payload)
    } catch {
      // Window closed
    }
  }

  public async wsConnect(options: {
    id: string
    url: string
    headers?: Record<string, string>
  }): Promise<{ ok: boolean; error?: string }> {
    this.wsDisconnect(options.id)
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(options.url, { headers: options.headers })
        let settled = false

        ws.once('open', () => {
          settled = true
          this.wsSessions.set(options.id, ws)
          this.emit('infra:wsEvent', { id: options.id, type: 'open' })
          resolve({ ok: true })
        })

        ws.on('message', (data, isBinary) => {
          const text = isBinary ? `[Binary ${Buffer.byteLength(data as any)} bytes] ${Buffer.from(data as any).toString('hex').slice(0, 256)}` : String(data)
          this.emit('infra:wsEvent', { id: options.id, type: 'message', data: text, isBinary })
        })

        ws.on('pong', (data) => {
          this.emit('infra:wsEvent', { id: options.id, type: 'pong', data: String(data || '') })
        })

        ws.on('close', (code, reason) => {
          this.wsSessions.delete(options.id)
          this.emit('infra:wsEvent', { id: options.id, type: 'close', code, reason: String(reason || '') })
        })

        ws.on('error', (err) => {
          if (!settled) {
            settled = true
            resolve({ ok: false, error: err.message })
          }
          this.emit('infra:wsEvent', { id: options.id, type: 'error', error: err.message })
        })
      } catch (err: any) {
        resolve({ ok: false, error: err?.message || String(err) })
      }
    })
  }

  public wsSend(id: string, payload: string): boolean {
    const ws = this.wsSessions.get(id)
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    ws.send(payload)
    return true
  }

  public wsPing(id: string): boolean {
    const ws = this.wsSessions.get(id)
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    ws.ping()
    return true
  }

  public wsDisconnect(id: string): boolean {
    const ws = this.wsSessions.get(id)
    if (!ws) return false
    this.wsSessions.delete(id)
    try {
      ws.close()
    } catch {}
    return true
  }

  public async tcpConnect(options: {
    id: string
    host: string
    port: number
    useTls?: boolean
  }): Promise<{ ok: boolean; error?: string }> {
    this.tcpDisconnect(options.id)
    return new Promise((resolve) => {
      const sock = options.useTls
        ? tls.connect({ host: options.host, port: options.port, rejectUnauthorized: false })
        : net.createConnection({ host: options.host, port: options.port })

      let settled = false
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true
          sock.destroy()
          resolve({ ok: false, error: 'TCP connection timed out' })
        }
      }, 8000)

      sock.once(options.useTls ? 'secureConnect' : 'connect', () => {
        clearTimeout(timer)
        settled = true
        this.tcpSessions.set(options.id, sock)
        this.emit('infra:tcpEvent', { id: options.id, type: 'open' })
        resolve({ ok: true })
      })

      sock.on('data', (chunk: Buffer) => {
        this.emit('infra:tcpEvent', { id: options.id, type: 'data', data: chunk.toString('utf8') })
      })

      sock.on('close', () => {
        this.tcpSessions.delete(options.id)
        this.emit('infra:tcpEvent', { id: options.id, type: 'close' })
      })

      sock.on('error', (err) => {
        clearTimeout(timer)
        if (!settled) {
          settled = true
          resolve({ ok: false, error: err.message })
        }
        this.emit('infra:tcpEvent', { id: options.id, type: 'error', error: err.message })
      })
    })
  }

  public tcpSend(id: string, data: string): boolean {
    const sock = this.tcpSessions.get(id)
    if (!sock || sock.destroyed) return false
    sock.write(data, 'utf8')
    return true
  }

  public tcpDisconnect(id: string): boolean {
    const sock = this.tcpSessions.get(id)
    if (!sock) return false
    this.tcpSessions.delete(id)
    try {
      sock.destroy()
    } catch {}
    return true
  }

  public disposeAll(): void {
    for (const id of Array.from(this.wsSessions.keys())) this.wsDisconnect(id)
    for (const id of Array.from(this.tcpSessions.keys())) this.tcpDisconnect(id)
    for (const id of Array.from(this.redisSubSessions.keys())) this.redisUnsubscribe(id)
    void realMockHttpServer.stop()
    sqliteWasmService.disposeAll()
  }

  private redisSubSessions = new Map<string, net.Socket>()

  public async redisSubscribe(options: {
    id: string
    host: string
    port: number
    password?: string
    tls?: boolean
    channel: string
  }): Promise<{ ok: boolean; error?: string }> {
    this.redisUnsubscribe(options.id)
    return new Promise((resolve) => {
      const sock: net.Socket = options.tls
        ? tls.connect({ host: options.host, port: options.port, rejectUnauthorized: false })
        : net.createConnection({ host: options.host, port: options.port })
      let settled = false
      let buf = Buffer.alloc(0)
      const connectEvent = options.tls ? 'secureConnect' : 'connect'

      sock.once(connectEvent, () => {
        this.redisSubSessions.set(options.id, sock)
        if (options.password) sock.write(encodeRespCommand(['AUTH', options.password]), 'utf8')
        sock.write(encodeRespCommand(['SUBSCRIBE', options.channel]), 'utf8')
        if (!settled) {
          settled = true
          resolve({ ok: true })
        }
      })

      sock.on('data', (chunk: Buffer) => {
        buf = Buffer.concat([buf, chunk])
        let cursor = 0
        while (cursor < buf.length) {
          const parsed = parseRespValue(buf, cursor)
          if (!parsed) break
          cursor = parsed.nextOffset
          const val = parsed.value
          if (Array.isArray(val) && val[0] === 'message' && val.length >= 3) {
            this.emit('infra:redisPubSubEvent', {
              id: options.id,
              type: 'message',
              channel: String(val[1]),
              payload: String(val[2]),
              timestamp: new Date().toLocaleTimeString(),
            })
          }
        }
        if (cursor > 0) buf = buf.subarray(cursor)
      })

      sock.on('error', (err) => {
        this.redisSubSessions.delete(options.id)
        this.emit('infra:redisPubSubEvent', { id: options.id, type: 'error', error: err.message })
        if (!settled) {
          settled = true
          resolve({ ok: false, error: err.message })
        }
      })

      sock.on('close', () => {
        this.redisSubSessions.delete(options.id)
        this.emit('infra:redisPubSubEvent', { id: options.id, type: 'close' })
      })
    })
  }

  public redisUnsubscribe(id: string): boolean {
    const s = this.redisSubSessions.get(id)
    if (!s) return false
    try {
      s.destroy()
    } catch {}
    this.redisSubSessions.delete(id)
    return true
  }
}

// =========================================================================
// 9. REAL OPENSSH / SFTP / SCP CLIENT (uses built-in OS OpenSSH binaries)
// =========================================================================
export interface SshConnSpec {
  host: string
  port?: number
  username: string
  keyPath?: string
  timeoutMs?: number
}

function buildSshBaseArgs(spec: SshConnSpec, portFlag: '-p' | '-P' = '-p'): string[] {
  const args = [
    portFlag,
    String(spec.port || 22),
    '-o',
    'BatchMode=yes',
    '-o',
    'StrictHostKeyChecking=accept-new',
    '-o',
    'ConnectTimeout=8',
  ]
  if (spec.keyPath?.trim()) {
    args.push('-i', spec.keyPath.trim())
  }
  return args
}

function shellQuotePosix(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`
}

export async function execSshCommand(
  spec: SshConnSpec & { command: string }
): Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number; latencyMs: number }> {
  const start = Date.now()
  const timeout = Math.min(Math.max(spec.timeoutMs ?? 20000, 1000), 60000)
  const args = [...buildSshBaseArgs(spec, '-p'), `${spec.username}@${spec.host}`, spec.command]
  try {
    const { stdout, stderr } = await execFileAsync('ssh', args, {
      timeout,
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
    })
    return { ok: true, stdout: stdout || '', stderr: stderr || '', exitCode: 0, latencyMs: Date.now() - start }
  } catch (err: any) {
    return {
      ok: false,
      stdout: err?.stdout || '',
      stderr: err?.stderr || err?.message || 'SSH execution failed',
      exitCode: typeof err?.code === 'number' ? err.code : 1,
      latencyMs: Date.now() - start,
    }
  }
}

export interface SftpEntry {
  name: string
  type: 'file' | 'directory'
  size: string
  permissions: string
  modified: string
}

export function parsePosixLsOutput(stdout: string): SftpEntry[] {
  const entries: SftpEntry[] = []
  for (const raw of stdout.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('total ') || line.startsWith('sftp>')) continue
    const m = line.match(/^([d\-lcbps][rwxstST\-]{9})\s+\d+\s+\S+\s+\S+\s+(\d+)\s+([A-Za-z]{3}\s+\d+\s+[\d:]+)\s+(.+)$/)
    if (!m) continue
    const perms = m[1]
    const bytes = Number(m[2])
    const modified = m[3]
    const name = m[4].replace(/\s+->\s+.*$/, '')
    if (name === '.') continue
    const size =
      perms.startsWith('d')
        ? '--'
        : bytes >= 1024 * 1024
        ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        : bytes >= 1024
        ? `${(bytes / 1024).toFixed(1)} KB`
        : `${bytes} B`
    entries.push({
      name,
      type: perms.startsWith('d') ? 'directory' : 'file',
      size,
      permissions: perms,
      modified,
    })
  }
  return entries
}

export async function sftpListDir(
  spec: SshConnSpec & { remotePath: string }
): Promise<{ ok: boolean; entries: SftpEntry[]; error?: string }> {
  const res = await execSshCommand({
    ...spec,
    command: `ls -la ${shellQuotePosix(spec.remotePath || '.')}`,
  })
  if (!res.ok) return { ok: false, entries: [], error: res.stderr }
  return { ok: true, entries: parsePosixLsOutput(res.stdout) }
}

export async function sftpReadFile(
  spec: SshConnSpec & { remoteFile: string }
): Promise<{ ok: boolean; content?: string; error?: string }> {
  const res = await execSshCommand({
    ...spec,
    command: `cat ${shellQuotePosix(spec.remoteFile)}`,
  })
  if (!res.ok) return { ok: false, error: res.stderr }
  return { ok: true, content: res.stdout }
}

export async function sftpWriteFile(
  spec: SshConnSpec & { remoteFile: string; content: string }
): Promise<{ ok: boolean; error?: string }> {
  const args = [...buildSshBaseArgs(spec, '-p'), `${spec.username}@${spec.host}`, `cat > ${shellQuotePosix(spec.remoteFile)}`]
  return new Promise((resolve) => {
    let stderr = ''
    const child = spawn('ssh', args, { windowsHide: true })
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL') } catch {}
      resolve({ ok: false, error: 'SFTP write timed out' })
    }, spec.timeoutMs ?? 20000)
    child.stderr?.on('data', (d) => { stderr += d.toString() })
    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ ok: false, error: err.message })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve(code === 0 ? { ok: true } : { ok: false, error: stderr || `ssh exited with ${code}` })
    })
    child.stdin?.write(spec.content, 'utf8')
    child.stdin?.end()
  })
}

export async function sftpTransferScp(
  direction: 'upload' | 'download',
  spec: SshConnSpec & { localPath: string; remotePath: string }
): Promise<{ ok: boolean; error?: string }> {
  const remoteTarget = `${spec.username}@${spec.host}:${spec.remotePath}`
  const args =
    direction === 'upload'
      ? [...buildSshBaseArgs(spec, '-P'), spec.localPath, remoteTarget]
      : [...buildSshBaseArgs(spec, '-P'), remoteTarget, spec.localPath]
  try {
    await execFileAsync('scp', args, { timeout: spec.timeoutMs ?? 60000, windowsHide: true })
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.stderr || err?.message || `scp ${direction} failed` }
  }
}

export async function sftpDeleteFile(
  spec: SshConnSpec & { remoteFile: string }
): Promise<{ ok: boolean; error?: string }> {
  const res = await execSshCommand({
    ...spec,
    command: `rm -f ${shellQuotePosix(spec.remoteFile)}`,
  })
  return res.ok ? { ok: true } : { ok: false, error: res.stderr }
}

export const infraSocketManager = new InfraSocketManager()

export function setupInfraIPC(ipcMain: IpcMain, getWin: () => BrowserWindow | null): void {
  infraSocketManager.setWindowGetter(getWin)
  realMockHttpServer.setTrafficCallback((ev) => {
    try {
      getWin()?.webContents.send('infra:mockTraffic', ev)
    } catch {}
  })

  ipcMain.handle('infra:httpRequest', (_, req: HttpProxyRequest) => executeHttpProxy(req))

  ipcMain.handle('infra:mockStart', (_, port: number, routes: MockRouteSpec[]) => realMockHttpServer.start(port, routes))
  ipcMain.handle('infra:mockStop', () => realMockHttpServer.stop())
  ipcMain.handle('infra:mockSync', (_, routes: MockRouteSpec[]) => {
    realMockHttpServer.syncRoutes(routes)
    return true
  })
  ipcMain.handle('infra:mockStatus', () => realMockHttpServer.getStatus())

  ipcMain.handle('infra:portsScan', () => scanOsActivePorts())
  ipcMain.handle('infra:portsPing', (_, port: number, host?: string) => probeLocalPort(port, host))
  ipcMain.handle('infra:portsKill', (_, pid: number) => killOsProcess(pid))

  ipcMain.handle('infra:redisExec', (_, options) => executeRedisRespCommand(options))
  ipcMain.handle('infra:redisSubscribe', (_, options) => infraSocketManager.redisSubscribe(options))
  ipcMain.handle('infra:redisUnsubscribe', (_, id: string) => infraSocketManager.redisUnsubscribe(id))

  // Real OpenSSH / SFTP / SCP IPC
  ipcMain.handle('infra:sshExec', (_, spec) => execSshCommand(spec))
  ipcMain.handle('infra:sftpList', (_, spec) => sftpListDir(spec))
  ipcMain.handle('infra:sftpRead', (_, spec) => sftpReadFile(spec))
  ipcMain.handle('infra:sftpWrite', (_, spec) => sftpWriteFile(spec))
  ipcMain.handle('infra:sftpUpload', (_, spec) => sftpTransferScp('upload', spec))
  ipcMain.handle('infra:sftpDownload', (_, spec) => sftpTransferScp('download', spec))
  ipcMain.handle('infra:sftpDelete', (_, spec) => sftpDeleteFile(spec))

  ipcMain.handle('infra:dockerExec', (_, args: string[], timeoutOrOpts?: number | InfraCliOptions) =>
    execInfraCli('docker', args, timeoutOrOpts)
  )
  ipcMain.handle('infra:k8sExec', (_, args: string[], timeoutOrOpts?: number | InfraCliOptions) =>
    execInfraCli('kubectl', args, timeoutOrOpts)
  )

  // Real SQLite WASM (sql.js) & external SQL CLI IPC
  sqliteWasmService.setupIPC(ipcMain, getWin)

  ipcMain.handle('infra:grpcInspectProto', (_, protoPath: string) => inspectGrpcProto(protoPath))
  ipcMain.handle('infra:grpcInvoke', (_, options) => invokeGrpcUnary(options))

  ipcMain.handle('infra:smtpSend', (_, options) => sendSmtpDiagnostic(options))

  ipcMain.handle('infra:wsConnect', (_, options) => infraSocketManager.wsConnect(options))
  ipcMain.handle('infra:wsSend', (_, id: string, payload: string) => infraSocketManager.wsSend(id, payload))
  ipcMain.handle('infra:wsPing', (_, id: string) => infraSocketManager.wsPing(id))
  ipcMain.handle('infra:wsDisconnect', (_, id: string) => infraSocketManager.wsDisconnect(id))

  ipcMain.handle('infra:tcpConnect', (_, options) => infraSocketManager.tcpConnect(options))
  ipcMain.handle('infra:tcpSend', (_, id: string, data: string) => infraSocketManager.tcpSend(id, data))
  ipcMain.handle('infra:tcpDisconnect', (_, id: string) => infraSocketManager.tcpDisconnect(id))
}

import { spawn, ChildProcess } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { app } from 'electron'
import {
  AntigravitySession,
  AntigravityQuotaInfo,
  AntigravitySidecarStatus,
  AiStreamChunk,
} from '../packages/sdk/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class AntigravityBackendService {
  private childProcess: ChildProcess | null = null
  private port: number = 45281
  private isReady: boolean = false
  private readyPromise: Promise<number> | null = null
  private activeStreams: Map<string, AbortController> = new Map()

  /**
   * Resolves the absolute path to the Python backend sidecar script across dev & packaged modes.
   */
  private findScriptPath(): string {
    const candidates = [
      path.join(process.resourcesPath, 'sidecars', 'antigravity_backend.py'),
      path.join(process.resourcesPath, 'app.asar.unpacked', 'sidecars', 'antigravity_backend.py'),
      path.join(app.getAppPath(), 'sidecars', 'antigravity_backend.py'),
      path.join(process.cwd(), 'sidecars', 'antigravity_backend.py'),
      path.join(__dirname, '..', 'sidecars', 'antigravity_backend.py'),
      path.join(__dirname, 'sidecars', 'antigravity_backend.py'),
    ]
    for (const p of candidates) {
      if (fs.existsSync(p)) return p
    }
    return candidates[0]
  }

  /**
   * Resolves available Python interpreter executable path.
   */
  private findPythonCommand(): string {
    if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
      return process.env.PYTHON_PATH
    }

    if (process.platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA || ''
      const progFiles = process.env.PROGRAMFILES || ''
      const winCandidates = [
        path.join(localAppData, 'Python', 'bin', 'python.exe'),
        path.join(localAppData, 'Programs', 'Python', 'Python314', 'python.exe'),
        path.join(localAppData, 'Programs', 'Python', 'Python313', 'python.exe'),
        path.join(localAppData, 'Programs', 'Python', 'Python312', 'python.exe'),
        path.join(localAppData, 'Programs', 'Python', 'Python311', 'python.exe'),
        path.join(localAppData, 'Programs', 'Python', 'Python310', 'python.exe'),
        path.join(progFiles, 'Python314', 'python.exe'),
        path.join(progFiles, 'Python313', 'python.exe'),
        path.join(progFiles, 'Python312', 'python.exe'),
        path.join(progFiles, 'Python311', 'python.exe'),
        path.join(progFiles, 'Python310', 'python.exe'),
      ]
      for (const p of winCandidates) {
        if (fs.existsSync(p)) return p
      }
      return 'python'
    }

    return 'python3'
  }

  /**
   * Starts or attaches to the Python Antigravity Backend Sidecar on-demand.
   */
  public async ensureStarted(): Promise<number> {
    if (this.isReady && this.childProcess) {
      return this.port
    }
    if (this.readyPromise) {
      return this.readyPromise
    }

    this.readyPromise = new Promise<number>((resolve) => {
      const scriptPath = this.findScriptPath()
      const pythonCommand = this.findPythonCommand()

      try {
        const proc = spawn(pythonCommand, [scriptPath, '--port', String(this.port)], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, PYTHONUNBUFFERED: '1' },
          windowsHide: true,
        })

        this.childProcess = proc

        proc.stdout?.on('data', (data: Buffer) => {
          const text = data.toString()
          const match = text.match(/ANTIGRAVITY_BACKEND_READY:(\d+)/)
          if (match) {
            this.port = parseInt(match[1], 10)
            this.isReady = true
            resolve(this.port)
          }
        })

        proc.stderr?.on('data', (data: Buffer) => {
          console.warn('[AntigravityBackend stderr]', data.toString())
        })

        proc.on('error', (err) => {
          console.error('[AntigravityBackend] Process error:', err)
          this.isReady = false
          this.childProcess = null
          this.readyPromise = null
          resolve(this.port)
        })

        proc.on('exit', () => {
          this.isReady = false
          this.childProcess = null
          this.readyPromise = null
        })

        // Safety timeout of 4 seconds
        setTimeout(() => {
          if (!this.isReady) {
            this.isReady = true
            resolve(this.port)
          }
        }, 4000)
      } catch (err) {
        console.error('[AntigravityBackend] Spawn failed:', err)
        this.isReady = false
        this.childProcess = null
        this.readyPromise = null
        resolve(this.port)
      }
    })

    return this.readyPromise
  }

  public getBaseUrl(): string {
    return `http://127.0.0.1:${this.port}`
  }

  /**
   * Retrieves status of the Antigravity Python Sidecar.
   */
  public async getStatus(): Promise<AntigravitySidecarStatus> {
    await this.ensureStarted()
    try {
      const res = await fetch(`${this.getBaseUrl()}/health`)
      if (res.ok) {
        const health = (await res.json()) as any
        const session = await this.getSession()
        return {
          running: true,
          port: this.port,
          pid: this.childProcess?.pid,
          pythonVersion: health.python?.split(' ')[0] || '3.x',
          authStatus: session ? 'authenticated' : 'unauthenticated',
          activeSession: session,
        }
      }
    } catch {
      // Backend not running
    }

    const localSession = await this.getSession()
    return {
      running: this.isReady,
      port: this.port,
      authStatus: localSession ? 'authenticated' : 'unauthenticated',
      activeSession: localSession,
    }
  }

  /**
   * Initiates Google OAuth2 login via system browser.
   */
  public async login(): Promise<AntigravitySession> {
    await this.ensureStarted()
    try {
      const res = await fetch(`${this.getBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (res.ok) {
        const data = (await res.json()) as { success: boolean; session: AntigravitySession; error?: string }
        if (data.session) {
          return data.session
        }
        throw new Error(data.error || 'Google OAuth login failed')
      } else {
        const errData = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(errData.error || `Google OAuth failed with status ${res.status}`)
      }
    } catch (err: any) {
      console.error('[AntigravityBackend] Login failed:', err)
      throw new Error(
        err.message?.includes('fetch failed') || err.code === 'ECONNREFUSED'
          ? 'Could not connect to Python Antigravity service. Please verify Python 3 is installed on your system.'
          : err.message || 'Google OAuth2 login failed'
      )
    }
  }

  /**
   * Clears session & revokes tokens.
   */
  public async logout(): Promise<boolean> {
    await this.ensureStarted()
    try {
      const res = await fetch(`${this.getBaseUrl()}/auth/logout`, {
        method: 'POST',
      })
      return res.ok
    } catch {
      return true
    }
  }

  /**
   * Fetches active session.
   */
  public async getSession(): Promise<AntigravitySession | null> {
    await this.ensureStarted()
    try {
      const res = await fetch(`${this.getBaseUrl()}/auth/session`)
      if (res.ok) {
        const data = (await res.json()) as { session: AntigravitySession | null; authenticated: boolean }
        return data.session
      }
    } catch {
      // Offline fallback
    }
    return null
  }

  /**
   * Fetches subscription quota information.
   */
  public async getQuota(): Promise<AntigravityQuotaInfo> {
    await this.ensureStarted()
    try {
      const res = await fetch(`${this.getBaseUrl()}/v1/quota`)
      if (res.ok) {
        return (await res.json()) as AntigravityQuotaInfo
      }
    } catch {
      // Offline default
    }

    return {
      tier: 'personal',
      rpmLimit: 60,
      rpmRemaining: 58,
      tpmLimit: 4000000,
      tpmRemaining: 3950000,
      contextWindowTokens: 1048576,
      dailyComputesRemaining: 950,
      dailyComputesLimit: 1000,
      activeModels: [
        'antigravity-gemini-3-7-flash',
        'antigravity-gemini-2-5-pro',
        'antigravity-gemini-2-5-flash',
        'antigravity-claude-3-7-sonnet',
        'gemini-3.7-flash',
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'claude-3-7-sonnet',
      ],
    }
  }

  /**
   * Sets or updates a Google AI Studio API Key.
   */
  public async setApiKey(apiKey: string): Promise<AntigravitySession | null> {
    await this.ensureStarted()
    try {
      const res = await fetch(`${this.getBaseUrl()}/auth/api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })
      if (res.ok) {
        const data = (await res.json()) as { success: boolean; session: AntigravitySession | null }
        return data.session
      }
    } catch {
      // Ignored
    }
    return null
  }

  /**
   * Removes saved Google AI Studio API key.
   */
  public async removeApiKey(): Promise<boolean> {
    await this.ensureStarted()
    try {
      const res = await fetch(`${this.getBaseUrl()}/auth/api-key`, {
        method: 'DELETE',
      })
      return res.ok
    } catch {
      return false
    }
  }

  /**
   * Fetches recent backend logs from Python daemon.
   */
  public async getLogs(): Promise<{ logFile: string; logs: string[] }> {
    await this.ensureStarted()
    try {
      const res = await fetch(`${this.getBaseUrl()}/debug/logs`)
      if (res.ok) {
        return (await res.json()) as { logFile: string; logs: string[] }
      }
    } catch {
      // Offline fallback
    }
    const logPath = path.join(process.env.USERPROFILE || process.env.HOME || '', '.indoctrinated', 'antigravity_backend.log')
    return {
      logFile: logPath,
      logs: ['[INIT] Python sidecar not running or offline.'],
    }
  }

  /**
   * Estimates token usage for a prompt and messages payload.
   */
  public async tokenize(
    text: string,
    messages?: Array<{ role: string; content: string }>
  ): Promise<{ characterCount: number; estimatedTokens: number; contextLimit: number; remainingContext: number }> {
    await this.ensureStarted()
    try {
      const res = await fetch(`${this.getBaseUrl()}/v1/tokenize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, messages: messages || [] }),
      })
      if (res.ok) {
        return (await res.json()) as { characterCount: number; estimatedTokens: number; contextLimit: number; remainingContext: number }
      }
    } catch {
      // Offline heuristic fallback
    }
    const totalChars = (text || '').length + (messages || []).reduce((acc, m) => acc + (m.content || '').length, 0)
    const estTokens = Math.max(1, Math.floor(totalChars / 4))
    return {
      characterCount: totalChars,
      estimatedTokens: estTokens,
      contextLimit: 1048576,
      remainingContext: Math.max(0, 1048576 - estTokens),
    }
  }

  /**
   * Streams chat completions directly through the Antigravity Python backend.
   */
  public async streamChat(
    requestId: string,
    model: string,
    messages: Array<{ role: string; content: string }>,
    onChunk: (chunk: AiStreamChunk) => void
  ): Promise<void> {
    await this.ensureStarted()
    const controller = new AbortController()
    this.activeStreams.set(requestId, controller)

    try {
      const res = await fetch(`${this.getBaseUrl()}/v1/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Antigravity-Client': 'IndoctrinatedEdit/4.7.1',
        },
        body: JSON.stringify({ model, messages }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Antigravity stream error (${res.status}): ${errText}`)
      }

      if (!res.body) throw new Error('Empty response body from Antigravity backend')

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith(':')) continue

          if (trimmed === 'data: [DONE]') {
            onChunk({ done: true })
            return
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6))
              if (json.text) onChunk({ text: json.text })
              if (json.reasoning) onChunk({ reasoning: json.reasoning })
              if (json.error) onChunk({ error: json.error, done: true })
            } catch {
              // Ignore unparseable fragments
            }
          }
        }
      }

      onChunk({ done: true })
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        onChunk({ done: true })
      } else {
        const message = err instanceof Error ? err.message : String(err)
        onChunk({ error: message, done: true })
      }
    } finally {
      this.activeStreams.delete(requestId)
    }
  }

  public cancelStream(requestId: string): void {
    const controller = this.activeStreams.get(requestId)
    if (controller) {
      controller.abort()
      this.activeStreams.delete(requestId)
    }
  }

  public stop(): void {
    if (this.childProcess) {
      this.childProcess.kill()
      this.childProcess = null
      this.isReady = false
    }
  }
}

export const antigravityBackendService = new AntigravityBackendService()

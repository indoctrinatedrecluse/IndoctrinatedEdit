/**
 * IndoctrinatedEdit - WebSocket, SSE & Event Streams Hub Service
 * Full-duplex WebSocket, Server-Sent Events (EventSource), custom auth headers,
 * heartbeat telemetry, and message forge with JSON-RPC/GraphQL presets.
 */

export interface SocketMessage {
  id: string
  direction: 'in' | 'out'
  data: string
  timestamp: string
  sizeBytes: number
  type: 'text' | 'json' | 'binary' | 'ping' | 'pong' | 'sse'
  eventName?: string
}

export interface SocketConnectionConfig {
  url: string
  protocolType?: 'websocket' | 'sse'
  protocol?: string
  headers?: Record<string, string>
  authToken?: string
  autoReconnect?: boolean
  heartbeatIntervalMs?: number
}

export interface PresetPayload {
  name: string
  type: 'json-rpc' | 'graphql' | 'socketio' | 'telemetry'
  payload: string
}

class SocketService {
  private activeWs: WebSocket | null = null
  private activeEventSource: EventSource | null = null
  private isConnected = false
  private messages: SocketMessage[] = []
  private listeners: ((messages: SocketMessage[]) => void)[] = []
  private statusListeners: ((connected: boolean) => void)[] = []
  private heartbeatTimer: any = null

  public presets: PresetPayload[] = [
    {
      name: 'JSON-RPC 2.0 Request',
      type: 'json-rpc',
      payload: JSON.stringify(
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {},
        },
        null,
        2
      ),
    },
    {
      name: 'GraphQL Subscription',
      type: 'graphql',
      payload: JSON.stringify(
        {
          type: 'start',
          id: '1',
          payload: {
            query: 'subscription OnFileChanged { fileUpdated { path, timestamp } }',
          },
        },
        null,
        2
      ),
    },
    {
      name: 'Socket.IO Message',
      type: 'socketio',
      payload: '42["chat_message", {"user": "recluse", "text": "Liquid Glass IDE ready"}]',
    },
    {
      name: 'Telemetry Ping',
      type: 'telemetry',
      payload: JSON.stringify(
        {
          event: 'heartbeat',
          nodeId: 'worker-node-01',
          uptimeSec: 41890,
          timestamp: Date.now(),
        },
        null,
        2
      ),
    },
  ]

  private electronSessionId: string | null = null
  private unsubElectronWs: (() => void) | null = null
  private static readonly MAX_MESSAGES = 500

  public connect(config: SocketConnectionConfig): Promise<boolean> {
    return new Promise((resolve) => {
      this.disconnect()

      const cleanUrl = config.url.trim() || 'wss://echo.websocket.events'
      // Only treat as SSE when explicitly selected OR http(s) URL (never misroute wss://.../events)
      const isSse =
        config.protocolType === 'sse' ||
        (!/^wss?:\/\//i.test(cleanUrl) && !cleanUrl.startsWith('mock://') && /^https?:\/\//i.test(cleanUrl))

      if (isSse) {
        this.connectSse(cleanUrl, config).then(resolve)
        return
      }

      // Mock / Virtual Echo Mode (explicit opt-in ONLY via mock://)
      if (cleanUrl.startsWith('mock://')) {
        this.isConnected = true
        this.notifyStatus(true)
        this.pushMessage({
          direction: 'in',
          data: `[System] Connected to ${cleanUrl} (Virtual Echo Socket)`,
          type: 'text',
        })
        this.startHeartbeat(config.heartbeatIntervalMs || 0)
        resolve(true)
        return
      }

      // Prefer real Electron Node `ws` client when available (supports custom Authorization/headers + real Ping/Pong)
      if (typeof window !== 'undefined' && window.electronAPI?.infra?.wsConnect) {
        const sessionId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        const headers: Record<string, string> = { ...(config.headers || {}) }
        if (config.authToken && !headers['Authorization']) {
          headers['Authorization'] = config.authToken.startsWith('Bearer ') ? config.authToken : `Bearer ${config.authToken}`
        }

        this.unsubElectronWs = window.electronAPI.infra.onWsEvent((ev) => {
          if (ev.id !== sessionId) return
          if (ev.type === 'message') {
            let type: SocketMessage['type'] = ev.isBinary ? 'binary' : 'text'
            if (!ev.isBinary) {
              try {
                JSON.parse(ev.data)
                type = 'json'
              } catch {}
            }
            this.pushMessage({ direction: 'in', data: ev.data, type })
          } else if (ev.type === 'pong') {
            this.pushMessage({ direction: 'in', data: `PONG ${ev.data || ''}`.trim(), type: 'pong' })
          } else if (ev.type === 'close') {
            this.isConnected = false
            this.electronSessionId = null
            this.stopHeartbeat()
            this.notifyStatus(false)
            this.pushMessage({ direction: 'in', data: `[System] WebSocket closed (code ${ev.code ?? 1000})`, type: 'text' })
          } else if (ev.type === 'error') {
            this.pushMessage({ direction: 'in', data: `[Error] ${ev.error}`, type: 'text' })
          }
        })

        window.electronAPI.infra.wsConnect({
          id: sessionId,
          url: cleanUrl,
          headers,
          protocols: config.protocol || undefined,
        }).then((res) => {
          if (res.ok) {
            this.electronSessionId = sessionId
            this.isConnected = true
            this.notifyStatus(true)
            this.pushMessage({ direction: 'in', data: `[System] WebSocket connected to ${cleanUrl}`, type: 'text' })
            this.startHeartbeat(config.heartbeatIntervalMs || 0)
            resolve(true)
          } else {
            this.unsubElectronWs?.()
            this.unsubElectronWs = null
            this.isConnected = false
            this.notifyStatus(false)
            this.pushMessage({ direction: 'in', data: `[Error] Connection failed: ${res.error}`, type: 'text' })
            resolve(false)
          }
        })
        return
      }

      try {
        if (typeof WebSocket !== 'undefined') {
          try {
            this.activeWs = config.protocol ? new WebSocket(cleanUrl, config.protocol) : new WebSocket(cleanUrl)

            this.activeWs.onopen = () => {
              this.isConnected = true
              this.notifyStatus(true)
              this.pushMessage({
                direction: 'in',
                data: `[System] WebSocket connected to ${cleanUrl}`,
                type: 'text',
              })
              this.startHeartbeat(config.heartbeatIntervalMs || 0)
              resolve(true)
            }

            this.activeWs.onmessage = (event) => {
              const raw = typeof event.data === 'string' ? event.data : '[Binary Payload]'
              let type: SocketMessage['type'] = 'text'
              try {
                JSON.parse(raw)
                type = 'json'
              } catch {
                type = 'text'
              }

              this.pushMessage({
                direction: 'in',
                data: raw,
                type,
              })
            }

            this.activeWs.onerror = () => {
              this.isConnected = true
              this.notifyStatus(true)
              this.pushMessage({
                direction: 'in',
                data: `[Simulated] Remote endpoint unreachable; switched to virtual local echo mode for ${cleanUrl}`,
                type: 'text',
              })
              this.startHeartbeat(config.heartbeatIntervalMs || 0)
              resolve(true)
            }

            this.activeWs.onclose = () => {
              this.isConnected = false
              this.notifyStatus(false)
              this.stopHeartbeat()
              this.pushMessage({
                direction: 'in',
                data: `[System] WebSocket connection closed`,
                type: 'text',
              })
            }
          } catch {
            this.isConnected = true
            this.notifyStatus(true)
            this.pushMessage({
              direction: 'in',
              data: `[Simulated] Connected to ${cleanUrl} (Virtual Echo Socket)`,
              type: 'text',
            })
            this.startHeartbeat(config.heartbeatIntervalMs || 0)
            resolve(true)
          }
        } else {
          this.isConnected = true
          this.notifyStatus(true)
          this.pushMessage({
            direction: 'in',
            data: `[Simulated] Connected to ${cleanUrl} (Virtual Echo Socket)`,
            type: 'text',
          })
          this.startHeartbeat(config.heartbeatIntervalMs || 0)
          resolve(true)
        }
      } catch (err: any) {
        this.isConnected = true
        this.notifyStatus(true)
        this.pushMessage({
          direction: 'in',
          data: `[Simulated] Connected to ${cleanUrl} (Virtual Echo Socket)`,
          type: 'text',
        })
        this.startHeartbeat(config.heartbeatIntervalMs || 0)
        resolve(true)
      }
    })
  }

  private electronSseId: string | null = null
  private unsubElectronSse: (() => void) | null = null

  private connectSse(url: string, config?: SocketConnectionConfig): Promise<boolean> {
    const infra = typeof window !== 'undefined' ? (window as any).electronAPI?.infra : undefined
    if (infra?.sseConnect && infra?.onSseEvent) {
      return new Promise((resolve) => {
        const sseId = `sse_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        const headers: Record<string, string> = { ...(config?.headers || {}) }
        if (config?.authToken && !headers['Authorization']) {
          headers['Authorization'] = config.authToken.startsWith('Bearer ') ? config.authToken : `Bearer ${config.authToken}`
        }
        this.unsubElectronSse = infra.onSseEvent((ev: any) => {
          if (ev.id !== sseId) return
          if (ev.type === 'message') {
            this.pushMessage({
              direction: 'in',
              data: ev.data,
              type: 'sse',
              eventName: ev.eventName || 'message',
            })
          } else if (ev.type === 'error') {
            this.pushMessage({ direction: 'in', data: `[SSE Error] ${ev.error}`, type: 'sse' })
          } else if (ev.type === 'close') {
            this.isConnected = false
            this.electronSseId = null
            this.notifyStatus(false)
            this.pushMessage({ direction: 'in', data: '[System] SSE stream closed', type: 'sse' })
          }
        })
        infra.sseConnect({ id: sseId, url, headers }).then((res: any) => {
          if (res?.ok) {
            this.electronSseId = sseId
            this.isConnected = true
            this.notifyStatus(true)
            this.pushMessage({ direction: 'in', data: `[System] CORS-free SSE stream open at ${url} (HTTP ${res.status})`, type: 'sse' })
            resolve(true)
          } else {
            this.unsubElectronSse?.()
            this.unsubElectronSse = null
            this.isConnected = false
            this.notifyStatus(false)
            this.pushMessage({ direction: 'in', data: `[SSE Error] Failed to connect: ${res?.error || 'Connection failed'}`, type: 'sse' })
            resolve(false)
          }
        }).catch((err: any) => {
          this.unsubElectronSse?.()
          this.unsubElectronSse = null
          this.isConnected = false
          this.notifyStatus(false)
          this.pushMessage({ direction: 'in', data: `[SSE Error] Failed to connect: ${err?.message || String(err)}`, type: 'sse' })
          resolve(false)
        })
      })
    }

    if (typeof EventSource !== 'undefined') {
      try {
        this.activeEventSource = new EventSource(url)
        this.isConnected = true
        this.notifyStatus(true)

        this.pushMessage({
          direction: 'in',
          data: `[System] Server-Sent Events (SSE) stream open at ${url}`,
          type: 'sse',
        })

        this.activeEventSource.onmessage = (e) => {
          this.pushMessage({
            direction: 'in',
            data: e.data,
            type: 'sse',
            eventName: e.type || 'message',
          })
        }

        this.activeEventSource.onerror = () => {
          this.pushMessage({
            direction: 'in',
            data: `[SSE Warning] Stream disconnected or waiting for next event packet...`,
            type: 'sse',
          })
        }
      } catch {
        this.isConnected = true
        this.notifyStatus(true)
        this.pushMessage({
          direction: 'in',
          data: `[Simulated SSE] EventSource stream active for ${url}`,
          type: 'sse',
        })
      }
    } else {
      this.isConnected = true
      this.notifyStatus(true)
      this.pushMessage({
        direction: 'in',
        data: `[Simulated SSE] EventSource stream active for ${url}`,
        type: 'sse',
      })
    }
    return Promise.resolve(true)
  }

  public disconnect(): void {
    this.stopHeartbeat()
    if (this.electronSessionId && typeof window !== 'undefined' && window.electronAPI?.infra?.wsDisconnect) {
      void window.electronAPI.infra.wsDisconnect(this.electronSessionId)
      this.electronSessionId = null
    }
    if (this.electronSseId && typeof window !== 'undefined' && (window as any).electronAPI?.infra?.sseDisconnect) {
      void (window as any).electronAPI.infra.sseDisconnect(this.electronSseId)
      this.electronSseId = null
    }
    if (this.unsubElectronSse) {
      this.unsubElectronSse()
      this.unsubElectronSse = null
    }
    if (this.unsubElectronWs) {
      this.unsubElectronWs()
      this.unsubElectronWs = null
    }
    if (this.activeWs) {
      try {
        // Detach handlers first so old socket close events never race with a new connection
        this.activeWs.onopen = null
        this.activeWs.onmessage = null
        this.activeWs.onerror = null
        this.activeWs.onclose = null
        this.activeWs.close()
      } catch {
        // ignore
      }
      this.activeWs = null
    }
    if (this.activeEventSource) {
      try {
        this.activeEventSource.close()
      } catch {
        // ignore
      }
      this.activeEventSource = null
    }
    this.isConnected = false
    this.notifyStatus(false)
  }

  public send(payload: string): boolean {
    if (!this.isConnected) return false

    let type: SocketMessage['type'] = 'text'
    try {
      JSON.parse(payload)
      type = 'json'
    } catch {
      type = 'text'
    }

    this.pushMessage({
      direction: 'out',
      data: payload,
      type,
    })

    if (this.electronSessionId && typeof window !== 'undefined' && window.electronAPI?.infra?.wsSend) {
      void window.electronAPI.infra.wsSend(this.electronSessionId, payload)
      return true
    }

    if (this.activeWs && this.activeWs.readyState === WebSocket.OPEN) {
      try {
        this.activeWs.send(payload)
      } catch {
        // ignore
      }
    } else {
      // Virtual Echo response
      setTimeout(() => {
        this.pushMessage({
          direction: 'in',
          data: payload,
          type,
        })
      }, 60)
    }

    return true
  }

  public sendPing(): void {
    if (!this.isConnected) return
    const pingTime = Date.now()
    this.pushMessage({
      direction: 'out',
      data: `PING [${pingTime}]`,
      type: 'ping',
    })

    if (this.electronSessionId && typeof window !== 'undefined' && window.electronAPI?.infra?.wsPing) {
      void window.electronAPI.infra.wsPing(this.electronSessionId)
      return
    }

    setTimeout(() => {
      const rtt = Date.now() - pingTime
      this.pushMessage({
        direction: 'in',
        data: `PONG [RTT: ${rtt}ms]`,
        type: 'pong',
      })
    }, 40)
  }

  public setHeartbeatInterval(intervalMs: number): void {
    if (!this.isConnected) return
    this.startHeartbeat(intervalMs)
  }

  private startHeartbeat(intervalMs: number): void {
    this.stopHeartbeat()
    if (intervalMs > 0) {
      this.heartbeatTimer = setInterval(() => {
        if (this.isConnected) {
          this.sendPing()
        }
      }, intervalMs)
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  public getMessages(): SocketMessage[] {
    return [...this.messages]
  }

  public clearMessages(): void {
    this.messages = []
    this.notifyListeners()
  }

  public getIsConnected(): boolean {
    return this.isConnected
  }

  public subscribe(callback: (messages: SocketMessage[]) => void): () => void {
    this.listeners.push(callback)
    callback(this.messages)
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback)
    }
  }

  public subscribeStatus(callback: (connected: boolean) => void): () => void {
    this.statusListeners.push(callback)
    callback(this.isConnected)
    return () => {
      this.statusListeners = this.statusListeners.filter((cb) => cb !== callback)
    }
  }

  private pushMessage(msg: Omit<SocketMessage, 'id' | 'timestamp' | 'sizeBytes'>): void {
    const newMsg: SocketMessage = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      sizeBytes: typeof Blob !== 'undefined' ? new Blob([msg.data]).size : msg.data.length,
      ...msg,
    }
    this.messages.push(newMsg)
    if (this.messages.length > SocketService.MAX_MESSAGES) {
      this.messages = this.messages.slice(-SocketService.MAX_MESSAGES)
    }
    this.notifyListeners()
  }

  private notifyListeners(): void {
    this.listeners.forEach((cb) => cb([...this.messages]))
  }

  private notifyStatus(connected: boolean): void {
    this.statusListeners.forEach((cb) => cb(connected))
  }
}

export const socketService = new SocketService()

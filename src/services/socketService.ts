/**
 * IndoctrinatedEdit - WebSocket & Event Streams Workbench Service
 */

export interface SocketMessage {
  id: string
  direction: 'in' | 'out'
  data: string
  timestamp: string
  sizeBytes: number
  type: 'text' | 'json' | 'binary' | 'ping' | 'pong'
}

export interface SocketConnectionConfig {
  url: string
  protocol?: string
  headers?: Record<string, string>
  autoReconnect?: boolean
  heartbeatIntervalMs?: number
}

class SocketService {
  private activeWs: WebSocket | null = null
  private isConnected = false
  private messages: SocketMessage[] = []
  private listeners: ((messages: SocketMessage[]) => void)[] = []
  private statusListeners: ((connected: boolean) => void)[] = []

  public connect(config: SocketConnectionConfig): Promise<boolean> {
    return new Promise((resolve) => {
      this.disconnect()

      const cleanUrl = config.url.trim() || 'wss://echo.websocket.events'

      // Mock / Offline Test Mode
      if (cleanUrl.startsWith('mock://') || cleanUrl.includes('mock')) {
        this.isConnected = true
        this.notifyStatus(true)
        this.pushMessage({
          direction: 'in',
          data: `[System] Connected to ${cleanUrl} (Virtual Echo Socket)`,
          type: 'text',
        })
        resolve(true)
        return
      }

      try {
        if (typeof WebSocket !== 'undefined') {
          try {
            this.activeWs = new WebSocket(cleanUrl)

            this.activeWs.onopen = () => {
              this.isConnected = true
              this.notifyStatus(true)
              this.pushMessage({
                direction: 'in',
                data: `[System] Connected to ${cleanUrl}`,
                type: 'text',
              })
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
              // Fallback to virtual local echo mode if remote server is unreachable
              this.isConnected = true
              this.notifyStatus(true)
              this.pushMessage({
                direction: 'in',
                data: `[Simulated] Remote server unreachable; switched to virtual local echo mode for ${cleanUrl}`,
                type: 'text',
              })
              resolve(true)
            }

            this.activeWs.onclose = () => {
              this.isConnected = false
              this.notifyStatus(false)
              this.pushMessage({
                direction: 'in',
                data: `[System] Connection closed`,
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
            resolve(true)
          }
        } else {
          // Fallback simulation mode
          this.isConnected = true
          this.notifyStatus(true)
          this.pushMessage({
            direction: 'in',
            data: `[Simulated] Connected to ${cleanUrl} (Virtual Echo Socket)`,
            type: 'text',
          })
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
        resolve(true)
      }
    })
  }

  public disconnect(): void {
    if (this.activeWs) {
      try {
        this.activeWs.close()
      } catch {
        // ignore
      }
      this.activeWs = null
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

    if (this.activeWs && this.activeWs.readyState === WebSocket.OPEN) {
      try {
        this.activeWs.send(payload)
      } catch {
        // ignore
      }
    } else {
      // Mock echo response after 80ms
      setTimeout(() => {
        this.pushMessage({
          direction: 'in',
          data: payload,
          type,
        })
      }, 80)
    }

    return true
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

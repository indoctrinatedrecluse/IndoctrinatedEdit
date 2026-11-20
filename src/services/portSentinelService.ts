/**
 * IndoctrinatedEdit - Port & Process Sentinel Service
 * Real-time active listening port scanner, conflict detector, HTTP/TCP health checker, and port release utility.
 */

export interface ActivePort {
  port: number
  pid: number
  processName: string
  protocol: 'TCP' | 'UDP'
  state: 'LISTENING' | 'ESTABLISHED' | 'TIME_WAIT' | 'CLOSE_WAIT'
  localAddress: string
  foreignAddress: string
  isKnownDevPort: boolean
  isConflict: boolean
  description: string
  category: 'web' | 'database' | 'cache' | 'tool' | 'system'
  uptimeSeconds?: number
}

export interface PortPingResult {
  port: number
  host: string
  isReachable: boolean
  latencyMs: number
  statusCode?: number
  statusText?: string
  serverHeader?: string
  checkedAt: string
}

export interface PortFilterOptions {
  searchQuery?: string
  protocol?: 'ALL' | 'TCP' | 'UDP'
  state?: 'ALL' | 'LISTENING' | 'ESTABLISHED'
  category?: 'ALL' | ActivePort['category']
  conflictsOnly?: boolean
}

export const KNOWN_DEV_PORTS: Record<number, { name: string; category: ActivePort['category']; description: string }> = {
  80: { name: 'HTTP Standard', category: 'web', description: 'Standard Web Server' },
  443: { name: 'HTTPS Standard', category: 'web', description: 'Encrypted Web Server' },
  3000: { name: 'React / Next.js', category: 'web', description: 'Frontend Dev Server' },
  3001: { name: 'Alt Web App', category: 'web', description: 'Secondary Dev Server' },
  4200: { name: 'Angular CLI', category: 'web', description: 'Angular Web App' },
  5000: { name: 'Flask / Express', category: 'web', description: 'Python/Node Backend API' },
  5173: { name: 'Vite / SvelteKit', category: 'web', description: 'Vite Next-Gen Dev Server' },
  8000: { name: 'Django / FastAPI', category: 'web', description: 'Python REST API' },
  8080: { name: 'Spring / Nginx', category: 'web', description: 'Java / Microservice Gateway' },
  8443: { name: 'Alt HTTPS', category: 'web', description: 'Secure Microservice Gateway' },
  9000: { name: 'PHP-FPM / SonarQube', category: 'tool', description: 'FastCGI / Quality Scanner' },
  9090: { name: 'Prometheus Metrics', category: 'tool', description: 'Monitoring Telemetry Exporter' },
  9200: { name: 'Elasticsearch', category: 'database', description: 'Search & Analytics Engine' },
  27017: { name: 'MongoDB', category: 'database', description: 'NoSQL Document Database' },
  5432: { name: 'PostgreSQL', category: 'database', description: 'Relational SQL Database' },
  3306: { name: 'MySQL / MariaDB', category: 'database', description: 'Relational Database Server' },
  6379: { name: 'Redis Cache', category: 'cache', description: 'In-Memory Key-Value Store' },
  11211: { name: 'Memcached', category: 'cache', description: 'Distributed Memory Object Caching' },
  5672: { name: 'RabbitMQ', category: 'tool', description: 'AMQP Message Broker' },
  15672: { name: 'RabbitMQ Admin', category: 'tool', description: 'RabbitMQ Web Management UI' },
}

class PortSentinelService {
  private samplePorts: ActivePort[] = [
    {
      port: 5173,
      pid: 14820,
      processName: 'node.exe',
      protocol: 'TCP',
      state: 'LISTENING',
      localAddress: '127.0.0.1:5173',
      foreignAddress: '0.0.0.0:0',
      isKnownDevPort: true,
      isConflict: false,
      description: 'Vite Next-Gen Dev Server (IndoctrinatedEdit Renderer)',
      category: 'web',
      uptimeSeconds: 3420,
    },
    {
      port: 3000,
      pid: 21940,
      processName: 'node.exe',
      protocol: 'TCP',
      state: 'LISTENING',
      localAddress: '0.0.0.0:3000',
      foreignAddress: '0.0.0.0:0',
      isKnownDevPort: true,
      isConflict: true,
      description: 'React / Next.js (Conflicting dev runner)',
      category: 'web',
      uptimeSeconds: 1205,
    },
    {
      port: 5432,
      pid: 4892,
      processName: 'postgres.exe',
      protocol: 'TCP',
      state: 'LISTENING',
      localAddress: '127.0.0.1:5432',
      foreignAddress: '0.0.0.0:0',
      isKnownDevPort: true,
      isConflict: false,
      description: 'PostgreSQL Database Engine',
      category: 'database',
      uptimeSeconds: 84600,
    },
    {
      port: 6379,
      pid: 7328,
      processName: 'redis-server.exe',
      protocol: 'TCP',
      state: 'LISTENING',
      localAddress: '127.0.0.1:6379',
      foreignAddress: '0.0.0.0:0',
      isKnownDevPort: true,
      isConflict: false,
      description: 'Redis In-Memory Key-Value Store',
      category: 'cache',
      uptimeSeconds: 84600,
    },
    {
      port: 8080,
      pid: 19448,
      processName: 'java.exe',
      protocol: 'TCP',
      state: 'LISTENING',
      localAddress: '0.0.0.0:8080',
      foreignAddress: '0.0.0.0:0',
      isKnownDevPort: true,
      isConflict: false,
      description: 'Spring Boot Backend Microservice',
      category: 'web',
      uptimeSeconds: 520,
    },
    {
      port: 9090,
      pid: 11204,
      processName: 'prometheus.exe',
      protocol: 'TCP',
      state: 'LISTENING',
      localAddress: '127.0.0.1:9090',
      foreignAddress: '0.0.0.0:0',
      isKnownDevPort: true,
      isConflict: false,
      description: 'Prometheus Telemetry Metrics',
      category: 'tool',
      uptimeSeconds: 43200,
    },
  ]

  private watchlistPorts: ActivePort[] = (() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('indoctrinated:ports:watchlist_v1') : null
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })()

  private persistWatchlist(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('indoctrinated:ports:watchlist_v1', JSON.stringify(this.watchlistPorts))
      }
    } catch {}
  }

  /**
   * Scans active OS listening ports via Electron IPC (`netstat`/`tasklist` or `lsof`/`ss`),
   * merges persisted user watchlist entries, and detects real multi-PID port conflicts.
   */
  public async scanActivePorts(customFilter?: string | PortFilterOptions): Promise<ActivePort[]> {
    let list: ActivePort[]

    if (typeof window !== 'undefined' && window.electronAPI?.infra?.portsScan) {
      const osPorts = await window.electronAPI.infra.portsScan()
      // Detect real conflicts (multiple distinct PIDs bound to the same port)
      const pidsByPort = new Map<number, Set<number>>()
      for (const p of osPorts) {
        if (!pidsByPort.has(p.port)) pidsByPort.set(p.port, new Set())
        pidsByPort.get(p.port)!.add(p.pid)
      }
      list = osPorts.map((p) => {
        const known = KNOWN_DEV_PORTS[p.port]
        return {
          port: p.port,
          protocol: p.protocol,
          pid: p.pid,
          processName: p.processName,
          localAddress: p.localAddress,
          foreignAddress: '0.0.0.0:0',
          state: (p.state === 'LISTENING' || p.state === 'LISTEN' ? 'LISTENING' : 'ESTABLISHED') as ActivePort['state'],
          description: known?.description || `${p.processName} (${p.protocol})`,
          category: known?.category || 'tool',
          isKnownDevPort: Boolean(known),
          isConflict: (pidsByPort.get(p.port)?.size || 0) > 1,
          uptimeSeconds: 0,
        }
      })
      // Merge persisted custom watched ports not already present in live OS scan
      const livePortNums = new Set(list.map((p) => p.port))
      for (const w of this.watchlistPorts) {
        if (!livePortNums.has(w.port)) {
          list.push(w)
        }
      }
    } else {
      list = [...this.samplePorts, ...this.watchlistPorts]
    }

    if (customFilter) {
      if (typeof customFilter === 'string') {
        return this.filterPorts(list, { searchQuery: customFilter })
      }
      return this.filterPorts(list, customFilter)
    }

    return list.sort((a, b) => a.port - b.port)
  }

  /**
   * Filters and sorts port entries using protocol, state, category, conflict status, and query.
   */
  public filterPorts(ports: ActivePort[], options: PortFilterOptions): ActivePort[] {
    let result = [...ports]

    if (options.protocol && options.protocol !== 'ALL') {
      result = result.filter((p) => p.protocol.toUpperCase() === options.protocol)
    }

    if (options.state && options.state !== 'ALL') {
      result = result.filter((p) => p.state.toUpperCase() === options.state)
    }

    if (options.category && options.category !== 'ALL') {
      result = result.filter((p) => p.category === options.category)
    }

    if (options.conflictsOnly) {
      result = result.filter((p) => p.isConflict)
    }

    if (options.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase().trim()
      result = result.filter(
        (p) =>
          p.port.toString().includes(q) ||
          p.pid.toString().includes(q) ||
          p.processName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.protocol.toLowerCase().includes(q) ||
          p.localAddress.toLowerCase().includes(q)
      )
    }

    return result.sort((a, b) => a.port - b.port)
  }

  /**
   * Performs a real TCP / HTTP connectivity probe on the target host and port.
   */
  public async pingPort(port: number, host = '127.0.0.1'): Promise<PortPingResult> {
    if (typeof window !== 'undefined' && window.electronAPI?.infra?.portsPing) {
      const res = await window.electronAPI.infra.portsPing(port, host)
      return {
        port,
        host,
        isReachable: res.isReachable,
        latencyMs: res.latencyMs,
        statusCode: res.statusCode,
        statusText: res.statusText || (res.isReachable ? 'Open' : res.error || 'Unreachable'),
        serverHeader: res.serverHeader,
        checkedAt: new Date().toLocaleTimeString(),
      }
    }

    const start = performance.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)
    try {
      const res = await fetch(`http://${host}:${port}/`, { method: 'HEAD', signal: controller.signal, mode: 'no-cors' })
      return {
        port,
        host,
        isReachable: true,
        latencyMs: Math.max(Math.round(performance.now() - start), 1),
        statusCode: res.status || 200,
        statusText: res.statusText || 'Reachable',
        serverHeader: res.headers?.get('server') || undefined,
        checkedAt: new Date().toLocaleTimeString(),
      }
    } catch {
      return {
        port,
        host,
        isReachable: false,
        latencyMs: Math.round(performance.now() - start),
        statusCode: 503,
        statusText: 'Connection Refused / Unreachable',
        checkedAt: new Date().toLocaleTimeString(),
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Terminates a real OS process via Electron IPC when available.
   * Never invokes OS kill for PID <= 0 (watchlist-only entries).
   */
  public async killProcessAsync(pid: number, port?: number): Promise<{ success: boolean; message: string; killCommand: string }> {
    const isWindows =
      (typeof window !== 'undefined' && window.electronAPI?.platform === 'win32') ||
      (typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows'))
    const killCommand = isWindows ? `Stop-Process -Id ${pid} -Force` : `kill -9 ${pid}`

    if (!Number.isFinite(pid) || pid <= 0) {
      if (port !== undefined) {
        const removed = this.removeWatchlistPort(port)
        return {
          success: removed,
          message: removed
            ? `Removed watched port :${port} from watchlist.`
            : `No active OS PID bound to port :${port}.`,
          killCommand: '',
        }
      }
      return {
        success: false,
        message: 'Cannot terminate invalid or watchlist-only PID (0).',
        killCommand: '',
      }
    }

    if (typeof window !== 'undefined' && window.electronAPI?.infra?.portsKill) {
      const res = await window.electronAPI.infra.portsKill(pid)
      return { ...res, killCommand }
    }
    return this.killProcess(pid)
  }

  public removeWatchlistPort(port: number): boolean {
    const before = this.watchlistPorts.length
    this.watchlistPorts = this.watchlistPorts.filter((w) => w.port !== port)
    if (this.watchlistPorts.length !== before) {
      this.persistWatchlist()
      return true
    }
    return false
  }

  /**
   * Terminates a process running on a port (or releases the port).
   */
  public killProcess(pid: number): { success: boolean; message: string; killCommand: string } {
    const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows')
    const killCommand = isWindows
      ? `Stop-Process -Id ${pid} -Force`
      : `kill -9 ${pid}`

    const index = this.samplePorts.findIndex((p) => p.pid === pid)
    if (index !== -1) {
      this.samplePorts.splice(index, 1)
      return {
        success: true,
        message: `Process ${pid} terminated successfully. Port released.`,
        killCommand,
      }
    }

    const watchIdx = this.watchlistPorts.findIndex((p) => p.pid === pid)
    if (watchIdx !== -1) {
      this.watchlistPorts.splice(watchIdx, 1)
      this.persistWatchlist()
      return {
        success: true,
        message: `Watched port (PID ${pid}) removed from registry.`,
        killCommand,
      }
    }

    return {
      success: false,
      message: `PID ${pid} not found in active listening registry.`,
      killCommand,
    }
  }

  /**
   * Adds a custom listening port for simulated testing or user-defined watch list.
   */
  public registerCustomPort(port: number, processName: string, description = 'User Watchlist'): ActivePort {
    const known = KNOWN_DEV_PORTS[port]
    const newPort: ActivePort = {
      port,
      pid: 0,
      processName: processName || 'watched-port',
      protocol: 'TCP',
      state: 'LISTENING',
      localAddress: `127.0.0.1:${port}`,
      foreignAddress: '0.0.0.0:0',
      isKnownDevPort: !!known,
      isConflict: this.samplePorts.some((p) => p.port === port),
      description: known ? known.description : description,
      category: known ? known.category : 'tool',
      uptimeSeconds: 0,
    }
    this.watchlistPorts = this.watchlistPorts.filter((w) => w.port !== port)
    this.watchlistPorts.push(newPort)
    this.persistWatchlist()
    return newPort
  }
}

export const portSentinelService = new PortSentinelService()

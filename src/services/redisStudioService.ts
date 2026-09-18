/**
 * IndoctrinatedEdit - Redis & Key-Value Cache Studio Service
 * In-memory Redis client engine with multi-type key inspector (String, Hash, List, Set, ZSet), TTL manager, command REPL, and Pub/Sub stream monitor.
 */

export type RedisValueType = 'string' | 'hash' | 'list' | 'set' | 'zset' | 'json'

export interface RedisKeyEntry {
  key: string
  type: RedisValueType
  ttl: number // seconds, -1 = infinite, -2 = expired
  sizeBytes: number
  value: any
  updatedAt: string
}

export interface RedisConnectionConfig {
  id: string
  name: string
  host: string
  port: number
  dbIndex: number
  password?: string
  isConnected: boolean
}

export interface RedisCommandLog {
  id: string
  timestamp: string
  command: string
  response: string
  isError: boolean
  durationMs: number
}

export interface PubSubMessage {
  id: string
  channel: string
  message: string
  receivedAt: string
}

class RedisStudioService {
  private connections: RedisConnectionConfig[] = [
    {
      id: 'conn-local',
      name: 'Local Dev Redis (Docker/Native)',
      host: '127.0.0.1',
      port: 6379,
      dbIndex: 0,
      isConnected: true,
    },
    {
      id: 'conn-staging',
      name: 'Staging Cluster (Cache Node 01)',
      host: 'redis.stage.internal',
      port: 6379,
      dbIndex: 1,
      isConnected: false,
    },
  ]

  private activeConnectionId = 'conn-local'

  private databaseStore: Map<string, RedisKeyEntry> = new Map([
    [
      'app:session:usr_9941a',
      {
        key: 'app:session:usr_9941a',
        type: 'hash',
        ttl: 3600,
        sizeBytes: 248,
        value: {
          userId: 'usr_9941a',
          username: 'indoctrinatedrecluse',
          role: 'admin',
          authenticatedAt: '2026-09-18T18:00:00.000Z',
          ipAddress: '192.168.1.105',
        },
        updatedAt: 'Just now',
      },
    ],
    [
      'cache:featured_products:v2',
      {
        key: 'cache:featured_products:v2',
        type: 'json',
        ttl: 86400,
        sizeBytes: 1042,
        value: {
          version: '2.4',
          count: 3,
          items: [
            { id: 'prod_1', title: 'Liquid Glass Pro Keyboard', price: 189.99, stock: 42 },
            { id: 'prod_2', title: 'Indoctrinated OLED Display 4K', price: 799.0, stock: 15 },
            { id: 'prod_3', title: 'Spatial Audio Studio Headphones', price: 349.5, stock: 88 },
          ],
        },
        updatedAt: '2 mins ago',
      },
    ],
    [
      'queue:worker:jobs',
      {
        key: 'queue:worker:jobs',
        type: 'list',
        ttl: -1,
        sizeBytes: 312,
        value: [
          'job_render_video_transcode_8841',
          'job_send_invoice_email_392',
          'job_rebuild_search_index_01',
        ],
        updatedAt: '5 mins ago',
      },
    ],
    [
      'stats:active_users:online',
      {
        key: 'stats:active_users:online',
        type: 'set',
        ttl: 300,
        sizeBytes: 156,
        value: ['usr_102', 'usr_304', 'usr_9941a', 'usr_7811', 'usr_209'],
        updatedAt: '10s ago',
      },
    ],
    [
      'leaderboard:weekly_xp',
      {
        key: 'leaderboard:weekly_xp',
        type: 'zset',
        ttl: 604800,
        sizeBytes: 280,
        value: [
          { member: 'abhishek_mitra', score: 98500 },
          { member: 'alex_chen', score: 84200 },
          { member: 'sarah_dev', score: 71000 },
        ],
        updatedAt: '1 hour ago',
      },
    ],
    [
      'ratelimit:ip:192.168.1.105',
      {
        key: 'ratelimit:ip:192.168.1.105',
        type: 'string',
        ttl: 52,
        sizeBytes: 14,
        value: '48',
        updatedAt: 'Just now',
      },
    ],
  ])

  private pubSubChannels: string[] = ['events:audit', 'telemetry:system', 'chat:general']
  private pubSubMessages: PubSubMessage[] = [
    {
      id: 'msg_1',
      channel: 'events:audit',
      message: '{"event":"USER_LOGIN","userId":"usr_9941a","timestamp":1789700000}',
      receivedAt: '18:14:02',
    },
    {
      id: 'msg_2',
      channel: 'telemetry:system',
      message: '{"cpu":14.2,"memoryMb":1024,"activeSockets":88}',
      receivedAt: '18:15:30',
    },
  ]

  public getConnections(): RedisConnectionConfig[] {
    return [...this.connections]
  }

  public getActiveConnection(): RedisConnectionConfig | undefined {
    return this.connections.find((c) => c.id === this.activeConnectionId)
  }

  public setActiveConnection(id: string): void {
    this.activeConnectionId = id
  }

  public getKeys(pattern = '*'): RedisKeyEntry[] {
    const all = Array.from(this.databaseStore.values())
    if (!pattern || pattern === '*') return all

    const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i')
    return all.filter((entry) => regexPattern.test(entry.key))
  }

  public getKey(key: string): RedisKeyEntry | undefined {
    return this.databaseStore.get(key)
  }

  public setStringKey(key: string, value: string, ttlSeconds = -1): RedisKeyEntry {
    let parsedValue: any = value
    let type: RedisValueType = 'string'
    try {
      if (value.startsWith('{') || value.startsWith('[')) {
        parsedValue = JSON.parse(value)
        type = 'json'
      }
    } catch {
      // Plain string
    }

    const entry: RedisKeyEntry = {
      key,
      type,
      ttl: ttlSeconds,
      sizeBytes: new Blob([value]).size,
      value: parsedValue,
      updatedAt: 'Just now',
    }
    this.databaseStore.set(key, entry)
    return entry
  }

  public setHashField(key: string, field: string, value: string): RedisKeyEntry {
    let entry = this.databaseStore.get(key)
    if (!entry || entry.type !== 'hash') {
      entry = {
        key,
        type: 'hash',
        ttl: -1,
        sizeBytes: 0,
        value: {},
        updatedAt: 'Just now',
      }
    }
    entry.value[field] = value
    entry.sizeBytes = new Blob([JSON.stringify(entry.value)]).size
    entry.updatedAt = 'Just now'
    this.databaseStore.set(key, entry)
    return entry
  }

  public deleteKey(key: string): boolean {
    return this.databaseStore.delete(key)
  }

  public updateTtl(key: string, ttlSeconds: number): boolean {
    const entry = this.databaseStore.get(key)
    if (!entry) return false
    entry.ttl = ttlSeconds
    entry.updatedAt = 'Just now'
    return true
  }

  public flushDb(): { deletedCount: number } {
    const count = this.databaseStore.size
    this.databaseStore.clear()
    return { deletedCount: count }
  }

  public executeCommand(rawCommand: string): RedisCommandLog {
    const start = performance.now()
    const trimmed = rawCommand.trim()
    const parts = trimmed.split(/\s+/)
    const cmd = parts[0]?.toUpperCase() || ''
    const args = parts.slice(1)

    let response = ''
    let isError = false

    switch (cmd) {
      case 'PING':
        response = 'PONG'
        break
      case 'ECHO':
        response = args.join(' ')
        break
      case 'GET': {
        const key = args[0]
        const entry = key ? this.databaseStore.get(key) : undefined
        if (!entry) {
          response = '(nil)'
        } else if (entry.type === 'string' || entry.type === 'json') {
          response = typeof entry.value === 'object' ? JSON.stringify(entry.value, null, 2) : String(entry.value)
        } else {
          isError = true
          response = `WRONGTYPE Operation against a key holding the wrong kind of value (${entry.type})`
        }
        break
      }
      case 'SET': {
        const [key, ...valParts] = args
        if (!key || valParts.length === 0) {
          isError = true
          response = 'ERR wrong number of arguments for "set" command'
        } else {
          this.setStringKey(key, valParts.join(' '))
          response = 'OK'
        }
        break
      }
      case 'DEL': {
        const count = args.filter((k) => this.deleteKey(k)).length
        response = `(integer) ${count}`
        break
      }
      case 'KEYS': {
        const pattern = args[0] || '*'
        const keys = this.getKeys(pattern).map((k) => k.key)
        response = keys.length === 0 ? '(empty array)' : keys.map((k, idx) => `${idx + 1}) "${k}"`).join('\n')
        break
      }
      case 'DBSIZE':
        response = `(integer) ${this.databaseStore.size}`
        break
      case 'FLUSHDB':
        this.flushDb()
        response = 'OK'
        break
      case 'TTL': {
        const entry = args[0] ? this.databaseStore.get(args[0]) : undefined
        response = entry ? `(integer) ${entry.ttl}` : '(integer) -2'
        break
      }
      case 'INFO':
        response = `# Server\nredis_version:7.2.4\nos:IndoctrinatedEdit Virtual Engine\nconnected_clients:1\nused_memory_human:${(this.databaseStore.size * 1.8).toFixed(1)}K\ntotal_keys:${this.databaseStore.size}`
        break
      default:
        isError = true
        response = `ERR unknown command '${cmd}', with args beginning with: ${args.slice(0, 2).map((a) => `'${a}'`).join(', ')}`
    }

    const durationMs = Math.max(1, Math.round(performance.now() - start))

    return {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      command: trimmed,
      response,
      isError,
      durationMs,
    }
  }

  public getPubSubChannels(): string[] {
    return [...this.pubSubChannels]
  }

  public getPubSubMessages(): PubSubMessage[] {
    return [...this.pubSubMessages]
  }

  public publishMessage(channel: string, message: string): PubSubMessage {
    const msg: PubSubMessage = {
      id: `pub_${Date.now()}`,
      channel,
      message,
      receivedAt: new Date().toLocaleTimeString(),
    }
    this.pubSubMessages.unshift(msg)
    if (this.pubSubMessages.length > 50) this.pubSubMessages.pop()
    return msg
  }
}

export const redisStudioService = new RedisStudioService()

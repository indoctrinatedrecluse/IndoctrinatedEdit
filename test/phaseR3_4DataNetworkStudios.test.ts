import { describe, it, expect, vi, afterEach } from 'vitest'
import net from 'node:net'
import { databaseService } from '../src/services/databaseService'
import { restClientService } from '../src/services/restClientService'
import { redisStudioService } from '../src/services/redisStudioService'
import { mockLabService } from '../src/services/mockLabService'
import { graphQLStudioService } from '../src/services/graphQLStudioService'
import { socketService } from '../src/services/socketService'
import { portSentinelService } from '../src/services/portSentinelService'
import { ftpListDir, ftpReadFile, ftpDeleteFile } from '../electron/infra-ipc-service'

describe('Phase R3-4: Data, Network & Protocol Studios (8 Studios)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete (globalThis as any).window
  })

  it('Database Studio: supports GROUP BY aggregates, LEFT JOIN with nulls, and CREATE TABLE', () => {
    databaseService.resetToDefaults()

    // GROUP BY + aggregates + ORDER BY
    const grouped = databaseService.executeQuery(
      'SELECT tier, COUNT(*) AS cnt, SUM(total_spent) AS spent FROM customers GROUP BY tier ORDER BY spent DESC;'
    )
    expect(grouped.error).toBeUndefined()
    expect(grouped.rows.length).toBe(4) // Platinum, Gold, Silver, Bronze
    expect(grouped.rows[0].tier).toBe('Platinum')
    expect(grouped.rows[0].cnt).toBe(3)
    expect(grouped.rows[0].spent).toBeCloseTo(4520.5 + 8930 + 6720, 1)

    // LEFT JOIN preserving customers with no orders (customers 7 and 8 have no orders)
    const leftJoin = databaseService.executeQuery(
      'SELECT customers.full_name, orders.order_number FROM customers LEFT JOIN orders ON customers.id = orders.customer_id;'
    )
    expect(leftJoin.error).toBeUndefined()
    const mateo = leftJoin.rows.find((r) => r.full_name === 'Mateo Hernandez')
    expect(mateo).toBeDefined()
    expect(mateo?.order_number).toBeNull()

    // CREATE TABLE + INSERT + SELECT
    const created = databaseService.executeQuery(
      'CREATE TABLE metrics_log (id INTEGER PRIMARY KEY, label TEXT NOT NULL, score REAL);'
    )
    expect(created.error).toBeUndefined()
    expect(databaseService.getActiveDatabase().tables.metrics_log).toBeDefined()
    const ins = databaseService.executeQuery("INSERT INTO metrics_log (id, label, score) VALUES (1, 'boot', 99.5);")
    expect(ins.error).toBeUndefined()
    const sel = databaseService.executeQuery('SELECT * FROM metrics_log;')
    expect(sel.rows).toHaveLength(1)
    expect(sel.rows[0].label).toBe('boot')
  })

  it('REST Client: serializes multi-line x-www-form-urlencoded via URLSearchParams', async () => {
    const httpMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: '{"ok":true}',
      latencyMs: 12,
      sizeBytes: 11,
    })
    ;(globalThis as any).window = { electronAPI: { infra: { httpRequest: httpMock } } }

    await restClientService.executeRequest({
      id: 'req_form',
      name: 'Form Submit',
      method: 'POST',
      url: 'https://example.com/submit',
      params: [],
      headers: [],
      auth: { type: 'none' },
      bodyType: 'x-www-form-urlencoded',
      bodyContent: 'name=Alice Smith\nrole=Lead Architect',
    })

    expect(httpMock).toHaveBeenCalledTimes(1)
    const callArg = httpMock.mock.calls[0][0]
    expect(callArg.headers['Content-Type']).toBe('application/x-www-form-urlencoded')
    expect(callArg.body).toBe('name=Alice+Smith&role=Lead+Architect')
  })

  it('Remote Protocol Studio: pure-Node RFC 959 FTP client lists, reads, and deletes over loopback TCP', async () => {
    // Minimal RFC 959 FTP passive-mode loopback server
    let dataServer: net.Server | null = null
    let lastDeleted = ''
    const ctrlServer = net.createServer((socket) => {
      socket.on('error', () => {})
      socket.write('220 IndoctrinatedFTP Ready\r\n')
      let buf = ''
      let activeDataSocket: net.Socket | null = null
      let pendingDataToSend: string | null = null
      const flushData = (payload: string) => {
        if (activeDataSocket) {
          activeDataSocket.end(payload)
          activeDataSocket = null
        } else {
          pendingDataToSend = payload
        }
      }
      socket.on('data', (chunk) => {
        buf += chunk.toString('utf8')
        const lines = buf.split(/\r?\n/)
        buf = lines.pop() || ''
        for (const raw of lines) {
          const line = raw.trim()
          if (!line) continue
          if (line.startsWith('USER ')) socket.write('331 Password required\r\n')
          else if (line.startsWith('PASS ')) socket.write('230 Logged in\r\n')
          else if (line.startsWith('TYPE ')) socket.write('200 Type set\r\n')
          else if (line.startsWith('CWD ')) socket.write('250 Directory changed\r\n')
          else if (line === 'PASV') {
            dataServer?.close()
            activeDataSocket = null
            pendingDataToSend = null
            dataServer = net.createServer((ds) => {
              ds.on('error', () => {})
              if (pendingDataToSend !== null) {
                ds.end(pendingDataToSend)
                pendingDataToSend = null
              } else {
                activeDataSocket = ds
              }
            })
            dataServer.listen(0, '127.0.0.1', () => {
              const addr = dataServer!.address() as net.AddressInfo
              const p1 = Math.floor(addr.port / 256)
              const p2 = addr.port % 256
              socket.write(`227 Entering Passive Mode (127,0,0,1,${p1},${p2})\r\n`)
            })
          } else if (line === 'LIST') {
            socket.write('150 Opening data connection\r\n')
            flushData('-rw-r--r-- 1 user group 42 Jan 01 12:00 hello.txt\r\n')
            socket.write('226 Transfer complete\r\n')
          } else if (line.startsWith('RETR ')) {
            socket.write('150 Opening data connection\r\n')
            flushData('hello from ftp!')
            socket.write('226 Transfer complete\r\n')
          } else if (line.startsWith('DELE ')) {
            lastDeleted = line.slice(5).trim()
            socket.write('250 Deleted\r\n')
          } else if (line === 'QUIT') {
            socket.write('221 Bye\r\n')
            socket.end()
          }
        }
      })
    })

    await new Promise<void>((resolve) => ctrlServer.listen(0, '127.0.0.1', () => resolve()))
    const ftpPort = (ctrlServer.address() as net.AddressInfo).port
    try {
      const listRes = await ftpListDir({ host: '127.0.0.1', port: ftpPort, username: 'dev', password: 'pw', remotePath: '/pub' })
      expect(listRes.ok).toBe(true)
      expect(listRes.entries.some((e) => e.name === 'hello.txt')).toBe(true)

      const readRes = await ftpReadFile({ host: '127.0.0.1', port: ftpPort, username: 'dev', password: 'pw', remoteFile: '/pub/hello.txt' })
      expect(readRes.ok).toBe(true)
      expect(readRes.content).toBe('hello from ftp!')

      const delRes = await ftpDeleteFile({ host: '127.0.0.1', port: ftpPort, username: 'dev', password: 'pw', remoteFile: '/pub/hello.txt' })
      expect(delRes.ok).toBe(true)
      expect(lastDeleted).toBe('/pub/hello.txt')
    } finally {
      dataServer?.close()
      ctrlServer.close()
    }
  })

  it('Redis Studio: saves zset keys and pairs live ZRANGE WITHSCORES tuples', async () => {
    const saved = await redisStudioService.saveKeyTypedAsync('ranks:test', 'zset', 'alice:150\nbob:300', 60)
    expect(saved.type).toBe('zset')
    expect(saved.value).toEqual([
      { member: 'alice', score: 150 },
      { member: 'bob', score: 300 },
    ])
  })

  it('MockLab: sanitizes NaN statusCode and negative delayMs in updateEndpoint', () => {
    const eps = mockLabService.getEndpoints()
    const target = eps[0]
    const updated = mockLabService.updateEndpoint(target.id, { statusCode: Number.NaN, delayMs: -50 })
    expect(updated?.statusCode).toBe(200)
    expect(updated?.delayMs).toBe(0)
  })

  it('GraphQL Studio: uses live default endpoint, recursive type introspection, and exports variables + headers', async () => {
    expect(graphQLStudioService.getDefaultEndpoint()).not.toContain('spacex.land')

    // Mock live introspection response with nested NON_NULL / LIST / ENUM / INPUT_OBJECT
    const mockSchema = {
      data: {
        __schema: {
          types: [
            {
              name: 'Query',
              kind: 'OBJECT',
              description: 'Root',
              fields: [
                {
                  name: 'users',
                  description: 'All users',
                  args: [{ name: 'limit', defaultValue: '10', type: { kind: 'SCALAR', name: 'Int' } }],
                  type: { kind: 'NON_NULL', ofType: { kind: 'LIST', ofType: { kind: 'NON_NULL', ofType: { kind: 'OBJECT', name: 'User' } } } },
                },
              ],
            },
            {
              name: 'Role',
              kind: 'ENUM',
              description: 'Roles',
              enumValues: [{ name: 'ADMIN', description: 'Admin user' }],
            },
            {
              name: 'UserInput',
              kind: 'INPUT_OBJECT',
              description: 'Input',
              inputFields: [{ name: 'name', type: { kind: 'NON_NULL', ofType: { kind: 'SCALAR', name: 'String' } } }],
            },
          ],
        },
      },
    }
    ;(globalThis as any).window = {
      electronAPI: {
        infra: {
          httpRequest: vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: {},
            body: JSON.stringify(mockSchema),
            latencyMs: 5,
            sizeBytes: 100,
          }),
        },
      },
    }

    const types = await graphQLStudioService.introspectSchema('https://example.com/graphql')
    expect(types).toHaveLength(3)
    expect(types![0].fields![0].type).toBe('[User!]!')
    expect(types![0].fields![0].args![0].name).toBe('limit')
    expect(types!.some((t) => t.kind === 'ENUM' && t.name === 'Role')).toBe(true)
    expect(types!.some((t) => t.kind === 'INPUT_OBJECT' && t.name === 'UserInput')).toBe(true)

    const curlExport = graphQLStudioService.exportCode(
      'query GetUsers($limit: Int) { users(limit: $limit) { id } }',
      'curl',
      'https://example.com/graphql',
      '{"limit":5}',
      { Authorization: 'Bearer tok' }
    )
    expect(curlExport).toContain('Authorization: Bearer tok')
    expect(curlExport).toContain('"limit":5')

    const tsExport = graphQLStudioService.exportCode(
      'query GetUsers($limit: Int) { users(limit: $limit) { id } }',
      'typescript',
      'https://example.com/graphql',
      '{"limit":5}'
    )
    expect(tsExport).toContain('export interface GetUsersVariables')
    expect(tsExport).toContain('limit: number')
  })

  it('WebSocket / SSE: connect() awaits real Electron sseConnect failure and returns false', async () => {
    ;(globalThis as any).window = {
      electronAPI: {
        infra: {
          onSseEvent: vi.fn().mockReturnValue(() => {}),
          sseConnect: vi.fn().mockResolvedValue({ ok: false, error: 'HTTP 502 Bad Gateway' }),
          sseDisconnect: vi.fn(),
        },
      },
    }
    const ok = await socketService.connect({ url: 'http://127.0.0.1:9999/events', protocolType: 'sse' })
    expect(ok).toBe(false)
    expect(socketService.getIsConnected()).toBe(false)
  })

  it('Port Sentinel: guards PID <= 0 and removes watchlist port without calling OS portsKill(0)', async () => {
    const killMock = vi.fn()
    ;(globalThis as any).window = {
      electronAPI: {
        platform: 'win32',
        infra: { portsKill: killMock },
      },
    }

    portSentinelService.registerCustomPort(9876, 'watched-api')
    const res = await portSentinelService.killProcessAsync(0, 9876)
    expect(res.success).toBe(true)
    expect(killMock).not.toHaveBeenCalled()
  })
})

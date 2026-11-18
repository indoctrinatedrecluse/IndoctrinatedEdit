import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { restClientService } from '../src/services/restClientService'
import { socketService } from '../src/services/socketService'
import { portSentinelService } from '../src/services/portSentinelService'
import { mockLabService } from '../src/services/mockLabService'
import { graphQLStudioService } from '../src/services/graphQLStudioService'

describe('Phase R2-4: Real Network & API Studios', () => {
  const origWindow = (globalThis as any).window

  beforeEach(() => {
    restClientService.resetToDefaults()
  })

  afterEach(() => {
    socketService.disconnect()
    if (origWindow === undefined) {
      delete (globalThis as any).window
    } else {
      ;(globalThis as any).window = origWindow
    }
  })

  it('exportToCurl handles Basic auth, API Key header, form-data, urlencoded, GraphQL vars, and quote escaping', () => {
    const basicCurl = restClientService.exportToCurl({
      id: 'c1',
      name: 'Basic Form',
      method: 'POST',
      url: 'https://example.com/login',
      params: [],
      headers: [],
      auth: { type: 'basic', basicUsername: 'alice', basicPassword: 'secret' },
      bodyType: 'x-www-form-urlencoded',
      bodyContent: JSON.stringify({ grant_type: 'password', scope: 'read write' }),
    })
    expect(basicCurl).toContain("Authorization: Basic YWxpY2U6c2VjcmV0")
    expect(basicCurl).toContain("Content-Type: application/x-www-form-urlencoded")
    expect(basicCurl).toContain("grant_type=password&scope=read+write")

    const formCurl = restClientService.exportToCurl({
      id: 'c2',
      name: 'Multipart',
      method: 'POST',
      url: 'https://example.com/upload',
      params: [],
      headers: [],
      auth: { type: 'apiKey', apiKeyName: 'X-Api-Key', apiKeyValue: "k'123", apiKeyLocation: 'header' },
      bodyType: 'form-data',
      bodyContent: 'title=O\'Reilly\ntag=demo',
    })
    expect(formCurl).toContain("-H 'X-Api-Key: k'\\''123'")
    expect(formCurl).toContain("-F 'title=O'\\''Reilly'")
    expect(formCurl).toContain("-F 'tag=demo'")

    const gqlCurl = restClientService.exportToCurl({
      id: 'c3',
      name: 'GraphQL',
      method: 'POST',
      url: 'https://example.com/graphql',
      params: [],
      headers: [],
      auth: { type: 'none' },
      bodyType: 'graphql',
      graphqlQuery: 'query Q($id: ID!) { node(id: $id) { id } }',
      graphqlVariables: '{"id": "42"}',
    })
    expect(gqlCurl).toContain('"variables":{"id":"42"}')
  })

  it('restClientService supports saving/deleting requests and editing environment variables', () => {
    const saved = restClientService.saveRequest('jsonplaceholder', {
      id: 'custom_1',
      name: 'Custom Health',
      method: 'GET',
      url: '{{customBase}}/health',
      params: [],
      headers: [],
      auth: { type: 'none' },
      bodyType: 'none',
    })
    expect(saved.id).toBe('custom_1')
    expect(
      restClientService.getCollections().find((c) => c.id === 'jsonplaceholder')?.requests.some((r) => r.id === 'custom_1')
    ).toBe(true)

    restClientService.updateEnvironmentVariables('prod', {
      ...restClientService.getActiveEnvironment().variables,
      customBase: 'https://health.example.org',
    })
    expect(restClientService.interpolate('{{customBase}}/health', 'prod')).toBe('https://health.example.org/health')

    restClientService.deleteRequest('jsonplaceholder', 'custom_1')
    expect(
      restClientService.getCollections().find((c) => c.id === 'jsonplaceholder')?.requests.some((r) => r.id === 'custom_1')
    ).toBe(false)
  })

  it('socketService routes SSE through Electron CORS-free sseConnect with headers and auth', async () => {
    let emittedCb: ((ev: any) => void) | null = null
    const sseConnect = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    const sseDisconnect = vi.fn().mockResolvedValue(true)

    ;(globalThis as any).window = {
      electronAPI: {
        infra: {
          sseConnect,
          sseDisconnect,
          onSseEvent: (cb: any) => {
            emittedCb = cb
            return () => {
              emittedCb = null
            }
          },
        },
      },
    }

    socketService.clearMessages()
    await socketService.connect({
      url: 'http://localhost:4040/events',
      protocolType: 'sse',
      authToken: 'tok_abc',
      headers: { 'X-Trace': '123' },
    })

    expect(sseConnect).toHaveBeenCalledTimes(1)
    const callArg = sseConnect.mock.calls[0][0]
    expect(callArg.url).toBe('http://localhost:4040/events')
    expect(callArg.headers['Authorization']).toBe('Bearer tok_abc')
    expect(callArg.headers['X-Trace']).toBe('123')

    // Simulate incoming SSE event from main process
    emittedCb?.({ id: callArg.id, type: 'message', eventName: 'tick', data: '{"ok":true}' })
    const msgs = socketService.getMessages()
    expect(msgs.some((m) => m.type === 'sse' && m.eventName === 'tick' && m.data === '{"ok":true}')).toBe(true)

    socketService.disconnect()
    expect(sseDisconnect).toHaveBeenCalledWith(callArg.id)
  })

  it('portSentinelService detects real multi-PID conflicts and uses tool category for custom ports', async () => {
    ;(globalThis as any).window = {
      electronAPI: {
        infra: {
          portsScan: vi.fn().mockResolvedValue([
            { port: 3000, pid: 1001, processName: 'node.exe', localAddress: '127.0.0.1:3000', protocol: 'TCP', state: 'LISTENING' },
            { port: 3000, pid: 1002, processName: 'node.exe', localAddress: '0.0.0.0:3000', protocol: 'TCP', state: 'LISTENING' },
          ]),
        },
      },
    }

    const custom = portSentinelService.registerCustomPort(9191, 'custom-watcher')
    expect(custom.category).toBe('tool')

    const scanned = await portSentinelService.scanActivePorts()
    const port3000Entries = scanned.filter((p) => p.port === 3000)
    expect(port3000Entries.length).toBe(2)
    expect(port3000Entries.every((p) => p.isConflict)).toBe(true)
    expect(scanned.some((p) => p.port === 9191)).toBe(true)
  })

  it('graphQLStudioService surfaces real network errors in Electron mode instead of fake 200 OK', async () => {
    ;(globalThis as any).window = {
      electronAPI: {
        infra: {
          httpRequest: vi.fn().mockResolvedValue({
            ok: false,
            status: 0,
            statusText: 'Error',
            headers: {},
            body: '',
            latencyMs: 5,
            sizeBytes: 0,
            error: 'connect ECONNREFUSED 127.0.0.1:4000',
          }),
        },
      },
    }

    const res = await graphQLStudioService.executeQuery(
      'http://127.0.0.1:4000/graphql',
      'query { ping }',
      '{}'
    )
    expect(res.errors).toBeDefined()
    expect(res.errors?.[0].message).toContain('ECONNREFUSED')
    expect(res.data).toBeUndefined()
  })

  it('mockLabService hits real Electron localhost server when online', async () => {
    const httpRequest = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: '{"live":true}',
      latencyMs: 3,
      sizeBytes: 13,
    })

    ;(globalThis as any).window = {
      electronAPI: {
        infra: {
          httpRequest,
          mockStart: vi.fn().mockResolvedValue({ running: true, port: 4045 }),
          mockStop: vi.fn().mockResolvedValue(true),
          mockSyncRoutes: vi.fn().mockResolvedValue(true),
          mockStatus: vi.fn().mockResolvedValue({ running: true, port: 4045 }),
          onMockTraffic: () => () => {},
        },
      },
    }

    await mockLabService.setPortAsync(4045)
    const res = await mockLabService.sendLiveOrSimulatedRequest('GET', '/api/v1/users')
    expect(httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'http://127.0.0.1:4045/api/v1/users', method: 'GET' })
    )
    expect(res.statusCode).toBe(200)
    expect(res.body).toBe('{"live":true}')
  })
})

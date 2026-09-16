import { describe, it, expect, beforeEach } from 'vitest'
import { restClientService, RestRequestConfig } from '../src/services/restClientService'
import { extensionRegistry } from '../src/extensions/extensionRegistry'
import { restClientExtensionManifest } from '../src/extensions/restClient/restClientExtension'

describe('REST & GraphQL Client Subsystem', () => {
  beforeEach(() => {
    restClientService.resetToDefaults()
    restClientService.clearHistory()
  })

  it('should interpolate environment variables into URLs, headers, and request bodies', () => {
    const interpolatedUrl = restClientService.interpolateVariables('{{baseUrl}}/v1/users/{{userId}}', 'dev')
    expect(interpolatedUrl).toBe('https://api.indoctrinated.io/v1/users/101')

    const interpolatedHeader = restClientService.interpolateVariables('Bearer {{token}}', 'dev')
    expect(interpolatedHeader).toContain('eyIndoctrinatedToken')

    const textWithUndefinedVar = restClientService.interpolateVariables('{{nonexistent}}', 'dev')
    expect(textWithUndefinedVar).toBe('{{nonexistent}}')
  })

  it('should list all predefined collections and requests', () => {
    const collections = restClientService.getCollections()
    expect(collections.length).toBeGreaterThanOrEqual(2)

    const cloudCollection = collections.find((c) => c.name.includes('Cloud & AI'))
    expect(cloudCollection).toBeDefined()
    expect(cloudCollection?.requests.length).toBeGreaterThanOrEqual(4)

    const jsonPlaceholder = collections.find((c) => c.name.includes('JSONPlaceholder'))
    expect(jsonPlaceholder).toBeDefined()
    expect(jsonPlaceholder?.requests.some((r) => r.method === 'GET')).toBe(true)
  })

  it('should execute mock GET requests successfully and compute telemetry', async () => {
    const config: RestRequestConfig = {
      id: 'test-req-1',
      name: 'Get Users Test',
      method: 'GET',
      url: '{{baseUrl}}/v1/users',
      headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
      params: [{ key: 'limit', value: '2', enabled: true }],
      auth: { type: 'none' },
      body: { type: 'none', raw: '' },
    }

    const response = await restClientService.sendRequest(config, 'dev')
    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    expect(response.timeMs).toBeGreaterThanOrEqual(0)
    expect(response.sizeBytes).toBeGreaterThan(0)
    expect(response.headers['content-type']).toContain('application/json')

    const parsed = JSON.parse(response.body)
    expect(parsed.success).toBe(true)
    expect(parsed.total).toBe(3)
    expect(parsed.data.length).toBe(2)
  })

  it('should execute mock POST requests with JSON body payload and token authentication', async () => {
    const config: RestRequestConfig = {
      id: 'test-req-2',
      name: 'Create Model Inference Job',
      method: 'POST',
      url: 'https://api.indoctrinated.io/v1/ai/generate',
      headers: [
        { key: 'Content-Type', value: 'application/json', enabled: true },
      ],
      params: [],
      auth: { type: 'bearer', token: '{{token}}' },
      body: {
        type: 'json',
        raw: JSON.stringify({
          model: 'indoctrinated-gemini-ultra-pro',
          prompt: 'Refactor code to Liquid Glass design system',
          stream: false,
        }),
      },
    }

    const response = await restClientService.sendRequest(config, 'prod')
    expect(response.status).toBe(200)

    const parsed = JSON.parse(response.body)
    expect(parsed.status).toBe('completed')
    expect(parsed.model).toBe('indoctrinated-gemini-ultra-pro')
    expect(parsed.output).toBeDefined()
    expect(parsed.tokensUsed).toBeGreaterThan(0)
  })

  it('should execute mock GraphQL queries and return structured data', async () => {
    const config: RestRequestConfig = {
      id: 'test-req-3',
      name: 'GraphQL Query Test',
      method: 'POST',
      url: 'https://api.indoctrinated.io/graphql',
      headers: [],
      params: [],
      auth: { type: 'none' },
      body: {
        type: 'graphql',
        raw: '',
        graphql: {
          query: 'query GetTelemetry { systemHealth { uptime latencyMs activeUsers } }',
          variables: '{}',
        },
      },
    }

    const response = await restClientService.sendRequest(config, 'dev')
    expect(response.status).toBe(200)

    const parsed = JSON.parse(response.body)
    expect(parsed.data).toBeDefined()
    expect(parsed.data.systemHealth).toBeDefined()
    expect(parsed.data.systemHealth.status).toBe('optimal')
  })

  it('should generate valid cURL command strings with headers, auth, and payload', () => {
    const config: RestRequestConfig = {
      id: 'test-curl',
      name: 'cURL Export Test',
      method: 'POST',
      url: 'https://api.indoctrinated.io/v1/resource',
      headers: [
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'X-Custom-Header', value: 'IndoctrinatedEdit', enabled: true },
        { key: 'Disabled-Header', value: 'IgnoreMe', enabled: false },
      ],
      params: [{ key: 'page', value: '1', enabled: true }],
      auth: { type: 'bearer', token: 'test-bearer-token' },
      body: {
        type: 'json',
        raw: '{"action":"sync"}',
      },
    }

    const curl = restClientService.generateCurl(config, 'dev')
    expect(curl).toContain("curl -X POST 'https://api.indoctrinated.io/v1/resource?page=1'")
    expect(curl).toContain("-H 'Content-Type: application/json'")
    expect(curl).toContain("-H 'X-Custom-Header: IndoctrinatedEdit'")
    expect(curl).not.toContain('Disabled-Header')
    expect(curl).toContain("-H 'Authorization: Bearer test-bearer-token'")
    expect(curl).toContain("-d '{\"action\":\"sync\"}'")
  })

  it('should record execution history and allow history recall & clearing', async () => {
    const config: RestRequestConfig = {
      id: 'test-history-req',
      name: 'History Test Request',
      method: 'GET',
      url: 'https://api.indoctrinated.io/v1/system/health',
      headers: [],
      params: [],
      auth: { type: 'none' },
      body: { type: 'none', raw: '' },
    }

    await restClientService.sendRequest(config, 'dev')
    await restClientService.sendRequest(config, 'prod')

    const history = restClientService.getHistory()
    expect(history.length).toBe(2)
    expect(history[0].response.status).toBe(200)

    restClientService.clearHistory()
    expect(restClientService.getHistory().length).toBe(0)
  })

  it('should verify REST Client extension manifest in ExtensionRegistry', () => {
    const manifest = extensionRegistry.get(restClientExtensionManifest.id)
    expect(manifest).toBeDefined()
    expect(manifest?.name).toContain('REST & GraphQL API Client')
    expect(manifest?.category).toBe('Tools')
    expect(manifest?.languages?.[0].id).toBe('http')
    expect(manifest?.snippetsCount).toBeGreaterThanOrEqual(5)
  })
})

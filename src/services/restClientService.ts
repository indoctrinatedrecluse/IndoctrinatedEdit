/**
 * REST & GraphQL Client Service
 * Provides HTTP request execution, environment variable interpolation, collection management,
 * cURL command generation, and execution history.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'graphql'
export type AuthType = 'none' | 'bearer' | 'basic' | 'apiKey'

export interface KeyValuePair {
  id: string
  key: string
  value: string
  enabled: boolean
  description?: string
}

export interface AuthConfig {
  type: AuthType
  bearerToken?: string
  basicUsername?: string
  basicPassword?: string
  apiKeyName?: string
  apiKeyValue?: string
  apiKeyLocation?: 'header' | 'query'
}

export interface ApiRequest {
  id: string
  name: string
  method: HttpMethod
  url: string
  params: KeyValuePair[]
  headers: KeyValuePair[]
  auth: AuthConfig
  bodyType: BodyType
  bodyContent?: string
  graphqlQuery?: string
  graphqlVariables?: string
  description?: string
}

export interface ApiResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  data: any
  rawText: string
  body?: string
  executionTimeMs: number
  timeMs?: number
  sizeBytes: number
  timestamp: string
  error?: string
}

export interface ApiEnvironment {
  id: string
  name: string
  variables: Record<string, string>
}

export interface ApiCollection {
  id: string
  name: string
  description: string
  requests: ApiRequest[]
}

export interface RequestHistoryItem {
  id: string
  request: ApiRequest
  response: ApiResponse
  timestamp: string
}

export type RestRequestConfig = ApiRequest
export type RestResponseData = ApiResponse

const DEFAULT_ENVIRONMENTS: ApiEnvironment[] = [
  {
    id: 'dev',
    name: 'Development (Mock API)',
    variables: {
      baseUrl: 'https://api.indoctrinated.io',
      aiApiUrl: 'https://api.indoctrinated.io/v1',
      userId: '101',
      apiKey: 'sk_dev_specular_8892',
      token: 'eyIndoctrinatedToken_dev_2026',
    },
  },
  {
    id: 'prod',
    name: 'Production (Cloud)',
    variables: {
      baseUrl: 'https://jsonplaceholder.typicode.com',
      aiApiUrl: 'https://api.indoctrinated.io/v1',
      userId: '1',
      apiKey: 'sk_live_994827110ad',
      token: 'jwt_live_specular_token_2026',
    },
  },
  {
    id: 'staging',
    name: 'Staging Environment',
    variables: {
      baseUrl: 'https://jsonplaceholder.typicode.com',
      aiApiUrl: 'https://staging-api.indoctrinated.io/v1',
      userId: '42',
      apiKey: 'sk_test_staging_4492a',
      token: 'jwt_staging_glass_token_2026',
    },
  },
  {
    id: 'local',
    name: 'Local Development',
    variables: {
      baseUrl: 'http://localhost:3000',
      aiApiUrl: 'http://localhost:8080/api',
      userId: '1',
      apiKey: 'local_dev_key',
      token: 'mock_local_jwt',
    },
  },
]

const DEFAULT_COLLECTIONS: ApiCollection[] = [
  {
    id: 'jsonplaceholder',
    name: 'JSONPlaceholder Public REST API',
    description: 'CRUD operations on mock posts, users, and comments',
    requests: [
      {
        id: 'jp_get_posts',
        name: 'Get All Posts (Limit 10)',
        method: 'GET',
        url: '{{baseUrl}}/posts',
        params: [{ id: 'p1', key: '_limit', value: '10', enabled: true }],
        headers: [{ id: 'h1', key: 'Accept', value: 'application/json', enabled: true }],
        auth: { type: 'none' },
        bodyType: 'none',
      },
      {
        id: 'jp_get_post_1',
        name: 'Get Post by ID',
        method: 'GET',
        url: '{{baseUrl}}/posts/1',
        params: [],
        headers: [{ id: 'h1', key: 'Accept', value: 'application/json', enabled: true }],
        auth: { type: 'none' },
        bodyType: 'none',
      },
      {
        id: 'jp_create_post',
        name: 'Create New Post',
        method: 'POST',
        url: '{{baseUrl}}/posts',
        params: [],
        headers: [
          { id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true },
          { id: 'h2', key: 'Accept', value: 'application/json', enabled: true },
        ],
        auth: { type: 'bearer', bearerToken: '{{token}}' },
        bodyType: 'json',
        bodyContent: JSON.stringify(
          {
            title: 'Liquid Glass High-Throughput Stream',
            body: 'Specular rendering with quantum execution telemetry.',
            userId: 1,
          },
          null,
          2
        ),
      },
      {
        id: 'jp_delete_post',
        name: 'Delete Post',
        method: 'DELETE',
        url: '{{baseUrl}}/posts/1',
        params: [],
        headers: [],
        auth: { type: 'none' },
        bodyType: 'none',
      },
    ],
  },
  {
    id: 'cloud_ai',
    name: 'Indoctrinated Cloud & AI APIs',
    description: 'Code synthesis, telemetry streams, and model weights endpoints',
    requests: [
      {
        id: 'ai_completion',
        name: 'Synthesize Code Completion',
        method: 'POST',
        url: '{{aiApiUrl}}/completions',
        params: [],
        headers: [
          { id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true },
          { id: 'h2', key: 'X-API-Key', value: '{{apiKey}}', enabled: true },
        ],
        auth: { type: 'none' },
        bodyType: 'json',
        bodyContent: JSON.stringify(
          {
            model: 'deepseek-r1-glass-pro',
            prompt: 'Write a high-performance LRU cache in Rust',
            max_tokens: 512,
            temperature: 0.2,
          },
          null,
          2
        ),
      },
      {
        id: 'ai_health',
        name: 'Cluster Health Check',
        method: 'GET',
        url: '{{aiApiUrl}}/health',
        params: [],
        headers: [{ id: 'h1', key: 'Accept', value: 'application/json', enabled: true }],
        auth: { type: 'none' },
        bodyType: 'none',
      },
      {
        id: 'graphql_telemetry',
        name: 'GraphQL: Cluster Telemetry',
        method: 'POST',
        url: 'https://api.indoctrinated.io/graphql',
        params: [],
        headers: [{ id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true }],
        auth: { type: 'none' },
        bodyType: 'graphql',
        graphqlQuery: `query GetTelemetry {\n  systemHealth {\n    status\n    uptime\n    latencyMs\n    activeUsers\n  }\n}`,
        graphqlVariables: '{}',
      },
      {
        id: 'graphql_characters',
        name: 'GraphQL: Query Characters',
        method: 'POST',
        url: 'https://rickandmortyapi.com/graphql',
        params: [],
        headers: [{ id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true }],
        auth: { type: 'none' },
        bodyType: 'graphql',
        graphqlQuery: `query GetCharacters($page: Int) {\n  characters(page: $page) {\n    info {\n      count\n      pages\n    }\n    results {\n      id\n      name\n      species\n      status\n    }\n  }\n}`,
        graphqlVariables: JSON.stringify({ page: 1 }, null, 2),
      },
    ],
  },
]

export class RestClientService {
  private environments: ApiEnvironment[] = []
  private activeEnvironmentId: string = 'prod'
  private collections: ApiCollection[] = []
  private history: RequestHistoryItem[] = []
  private listeners: Set<() => void> = new Set()

  constructor() {
    this.resetToDefaults()
  }

  public resetToDefaults() {
    this.environments = JSON.parse(JSON.stringify(DEFAULT_ENVIRONMENTS))
    this.activeEnvironmentId = 'prod'
    this.collections = JSON.parse(JSON.stringify(DEFAULT_COLLECTIONS))
    this.history = []
    this.notify()
  }

  public getEnvironments(): ApiEnvironment[] {
    return this.environments
  }

  public getActiveEnvironment(): ApiEnvironment {
    return (
      this.environments.find((e) => e.id === this.activeEnvironmentId) || this.environments[0]
    )
  }

  public setActiveEnvironment(id: string) {
    if (this.environments.some((e) => e.id === id)) {
      this.activeEnvironmentId = id
      this.notify()
    }
  }

  public getCollections(): ApiCollection[] {
    return this.collections
  }

  public getHistory(): RequestHistoryItem[] {
    return this.history
  }

  public clearHistory() {
    this.history = []
    this.notify()
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach((fn) => fn())
  }

  /**
   * Interpolate {{varName}} in a string using active environment variables.
   */
  public interpolate(text: string, env?: ApiEnvironment | string): string {
    if (!text) return ''
    let activeEnv: ApiEnvironment
    if (typeof env === 'string') {
      activeEnv = this.environments.find((e) => e.id === env) || this.getActiveEnvironment()
    } else {
      activeEnv = env || this.getActiveEnvironment()
    }
    return text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, varName) => {
      return activeEnv.variables[varName] !== undefined ? activeEnv.variables[varName] : match
    })
  }

  public interpolateVariables(text: string, env?: ApiEnvironment | string): string {
    return this.interpolate(text, env)
  }

  /**
   * Build query parameters onto the URL.
   */
  public buildFullUrl(request: ApiRequest, env?: ApiEnvironment | string): string {
    let rawUrl = this.interpolate(request.url, env)
    const activeParams = request.params.filter((p) => p.enabled && p.key.trim())

    if (activeParams.length > 0) {
      const urlObj = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`)
      activeParams.forEach((p) => {
        urlObj.searchParams.append(
          this.interpolate(p.key, env),
          this.interpolate(p.value, env)
        )
      })
      rawUrl = urlObj.toString()
    }

    // Add API key query param if configured
    if (request.auth.type === 'apiKey' && request.auth.apiKeyLocation === 'query' && request.auth.apiKeyName) {
      const separator = rawUrl.includes('?') ? '&' : '?'
      const k = encodeURIComponent(this.interpolate(request.auth.apiKeyName, env))
      const v = encodeURIComponent(this.interpolate(request.auth.apiKeyValue || '', env))
      rawUrl += `${separator}${k}=${v}`
    }

    return rawUrl
  }

  public async sendRequest(request: ApiRequest, env?: ApiEnvironment | string): Promise<ApiResponse> {
    let activeEnv: ApiEnvironment
    if (typeof env === 'string') {
      activeEnv = this.environments.find((e) => e.id === env) || this.getActiveEnvironment()
    } else {
      activeEnv = env || this.getActiveEnvironment()
    }
    return this.executeRequest(request, activeEnv)
  }

  /**
   * Execute an API Request and return response with latency & payload metrics.
   */
  public async executeRequest(request: ApiRequest, customEnv?: ApiEnvironment): Promise<ApiResponse> {
    const startTime = performance.now()
    const env = customEnv || this.getActiveEnvironment()
    const fullUrl = this.buildFullUrl(request, env)
    const timestamp = new Date().toISOString()

    // Mock response handler for built-in test URLs
    if (fullUrl.includes('api.indoctrinated.io')) {
      return this.executeMockIndoctrinatedApi(request, fullUrl, startTime, timestamp, env)
    }

    // Build headers
    const headers: Record<string, string> = {}
    request.headers
      .filter((h) => h.enabled && h.key.trim())
      .forEach((h) => {
        headers[this.interpolate(h.key, env)] = this.interpolate(h.value, env)
      })

    // Apply Auth
    if (request.auth.type === 'bearer' && request.auth.bearerToken) {
      headers['Authorization'] = `Bearer ${this.interpolate(request.auth.bearerToken, env)}`
    } else if (request.auth.type === 'basic') {
      const creds = `${this.interpolate(request.auth.basicUsername || '', env)}:${this.interpolate(request.auth.basicPassword || '', env)}`
      headers['Authorization'] = `Basic ${btoa(creds)}`
    } else if (request.auth.type === 'apiKey' && request.auth.apiKeyLocation === 'header' && request.auth.apiKeyName) {
      headers[this.interpolate(request.auth.apiKeyName, env)] = this.interpolate(request.auth.apiKeyValue || '', env)
    }

    // Build Body
    let body: string | undefined = undefined
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      if (request.bodyType === 'json' && request.bodyContent) {
        body = this.interpolate(request.bodyContent, env)
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'
      } else if (request.bodyType === 'graphql') {
        const query = this.interpolate(request.graphqlQuery || '', env)
        let variables = {}
        try {
          if (request.graphqlVariables) {
            variables = JSON.parse(this.interpolate(request.graphqlVariables, env))
          }
        } catch {
          // ignore var parse error
        }
        body = JSON.stringify({ query, variables })
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'
      } else if (request.bodyType === 'raw' && request.bodyContent) {
        body = this.interpolate(request.bodyContent, env)
      }
    }

    try {
      const response = await fetch(fullUrl, {
        method: request.method,
        headers,
        body,
      })

      const durationMs = Math.round((performance.now() - startTime) * 100) / 100
      const rawText = await response.text()
      const sizeBytes = new Blob([rawText]).size

      let data: any = rawText
      try {
        data = JSON.parse(rawText)
      } catch {
        // Leave as string if not JSON
      }

      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((val, key) => {
        responseHeaders[key] = val
      })

      const apiResponse: ApiResponse = {
        status: response.status,
        statusText: response.statusText || (response.ok ? 'OK' : 'Error'),
        headers: responseHeaders,
        data,
        rawText,
        body: rawText,
        executionTimeMs: durationMs,
        timeMs: durationMs,
        sizeBytes,
        timestamp,
      }

      this.recordHistory(request, apiResponse)
      return apiResponse
    } catch (err: any) {
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100
      const errorMsg = err?.message || 'Network request failed.'

      const errorResponse: ApiResponse = {
        status: 0,
        statusText: 'Network / CORS Error',
        headers: {},
        data: null,
        rawText: `Error: ${errorMsg}\n\nNote: If requesting external URLs from browser environment, ensure CORS headers or local proxy server is configured.`,
        body: `Error: ${errorMsg}`,
        executionTimeMs: durationMs,
        timeMs: durationMs,
        sizeBytes: 0,
        timestamp,
        error: errorMsg,
      }

      this.recordHistory(request, errorResponse)
      return errorResponse
    }
  }

  private executeMockIndoctrinatedApi(
    request: ApiRequest,
    fullUrl: string,
    startTime: number,
    timestamp: string,
    env: ApiEnvironment
  ): ApiResponse {
    const durationMs = Math.round((performance.now() - startTime + 18.5) * 100) / 100
    let mockData: any = {}

    if (fullUrl.includes('/v1/users')) {
      const limitParam = request.params.find((p) => p.enabled && p.key === 'limit')
      const limit = limitParam ? parseInt(limitParam.value, 10) : 3
      const allUsers = [
        { id: 101, name: 'Recluse', role: 'lead_architect', email: 'recluse@indoctrinated.io' },
        { id: 102, name: 'Elena Rostova', role: 'security_auditor', email: 'elena@indoctrinated.io' },
        { id: 103, name: 'Marcus Sterling', role: 'core_systems', email: 'marcus@indoctrinated.io' },
      ]
      mockData = {
        success: true,
        total: allUsers.length,
        data: allUsers.slice(0, isNaN(limit) ? 3 : limit),
      }
    } else if (fullUrl.includes('/v1/ai/generate') || fullUrl.includes('/completions')) {
      let reqBody: any = {}
      try {
        const rawContent = request.bodyContent || (request as any).body?.raw
        if (rawContent) {
          reqBody = JSON.parse(this.interpolate(rawContent, env))
        }
      } catch {
        // ignore parse error
      }
      mockData = {
        status: 'completed',
        model: reqBody.model || 'indoctrinated-gemini-ultra-pro',
        output: 'Liquid Glass Specular shader compilation complete with 0 frame drops.',
        tokensUsed: 142,
        timestamp,
      }
    } else if (fullUrl.includes('/graphql')) {
      mockData = {
        data: {
          systemHealth: {
            status: 'optimal',
            uptime: 99.99,
            latencyMs: 14.5,
            activeUsers: 842,
          },
        },
      }
    } else if (fullUrl.includes('/health')) {
      mockData = {
        status: 'healthy',
        cluster: 'tokyo-prod-01',
        version: 'v2.0.0',
        uptime_seconds: 849201,
        active_nodes: 48,
        specular_engine: 'ONLINE',
      }
    } else {
      mockData = { message: 'Indoctrinated Cloud Mock API', path: fullUrl, method: request.method }
    }

    const rawText = JSON.stringify(mockData, null, 2)
    const res: ApiResponse = {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'x-powered-by': 'IndoctrinatedEdit Specular Engine',
      },
      data: mockData,
      rawText,
      body: rawText,
      executionTimeMs: durationMs,
      timeMs: durationMs,
      sizeBytes: new Blob([rawText]).size,
      timestamp,
    }

    this.recordHistory(request, res)
    return res
  }

  private recordHistory(request: ApiRequest, response: ApiResponse) {
    this.history.unshift({
      id: `h_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      request: JSON.parse(JSON.stringify(request)),
      response: JSON.parse(JSON.stringify(response)),
      timestamp: new Date().toISOString(),
    })
    if (this.history.length > 40) this.history.pop()
    this.notify()
  }

  public generateCurl(request: ApiRequest, env?: ApiEnvironment | string): string {
    return this.exportToCurl(request, env)
  }

  /**
   * Export ApiRequest into executable cURL syntax.
   */
  public exportToCurl(request: ApiRequest, env?: ApiEnvironment | string): string {
    let activeEnv: ApiEnvironment
    if (typeof env === 'string') {
      activeEnv = this.environments.find((e) => e.id === env) || this.getActiveEnvironment()
    } else {
      activeEnv = env || this.getActiveEnvironment()
    }
    const fullUrl = this.buildFullUrl(request, activeEnv)
    const parts: string[] = [`curl -X ${request.method} '${fullUrl}'`]

    request.headers
      .filter((h) => h.enabled && h.key.trim())
      .forEach((h) => {
        parts.push(`  -H '${this.interpolate(h.key, activeEnv)}: ${this.interpolate(h.value, activeEnv)}'`)
      })

    if (request.auth.type === 'bearer' && (request.auth.bearerToken || (request.auth as any).token)) {
      const tokenVal = request.auth.bearerToken || (request.auth as any).token
      parts.push(`  -H 'Authorization: Bearer ${this.interpolate(tokenVal, activeEnv)}'`)
    }

    if ((request.bodyType === 'json' || (request as any).body?.type === 'json')) {
      const rawBody = request.bodyContent || (request as any).body?.raw || ''
      parts.push(`  -d '${this.interpolate(rawBody, activeEnv)}'`)
    } else if ((request.bodyType === 'graphql' || (request as any).body?.type === 'graphql')) {
      const query = request.graphqlQuery || (request as any).body?.graphql?.query || ''
      parts.push(`  -d '{"query": "${this.interpolate(query, activeEnv)}"}'`)
    }

    return parts.join(' \\\n')
  }
}

export const restClientService = new RestClientService()

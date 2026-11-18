/**
 * REST & GraphQL Client Service
 * Provides HTTP request execution, environment variable interpolation, collection management,
 * cURL command generation, and execution history.
 */

import { utf8ToBase64 } from '../utils/security'

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

const STORAGE_KEY = 'ie_rest_client_v1'

export class RestClientService {
  private environments: ApiEnvironment[] = []
  private activeEnvironmentId: string = 'prod'
  private collections: ApiCollection[] = []
  private history: RequestHistoryItem[] = []
  private listeners: Set<() => void> = new Set()

  constructor() {
    this.environments = JSON.parse(JSON.stringify(DEFAULT_ENVIRONMENTS))
    this.activeEnvironmentId = 'prod'
    this.collections = JSON.parse(JSON.stringify(DEFAULT_COLLECTIONS))
    this.history = []
    this.loadFromStorage()
  }

  private loadFromStorage() {
    try {
      if (typeof localStorage === 'undefined') return
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.environments) && parsed.environments.length > 0) {
        this.environments = parsed.environments
      }
      if (typeof parsed.activeEnvironmentId === 'string') {
        this.activeEnvironmentId = parsed.activeEnvironmentId
      }
      if (Array.isArray(parsed.collections) && parsed.collections.length > 0) {
        this.collections = parsed.collections
      }
      if (Array.isArray(parsed.history)) {
        this.history = parsed.history.slice(0, 40)
      }
    } catch {
      // ignore corrupted storage
    }
  }

  private saveToStorage() {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          environments: this.environments,
          activeEnvironmentId: this.activeEnvironmentId,
          collections: this.collections,
          history: this.history.slice(0, 40),
        })
      )
    } catch {
      // ignore storage quota errors
    }
  }

  public resetToDefaults() {
    this.environments = JSON.parse(JSON.stringify(DEFAULT_ENVIRONMENTS))
    this.activeEnvironmentId = 'prod'
    this.collections = JSON.parse(JSON.stringify(DEFAULT_COLLECTIONS))
    this.history = []
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
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
      this.saveToStorage()
      this.notify()
    }
  }

  public updateEnvironmentVariables(envId: string, variables: Record<string, string>) {
    const env = this.environments.find((e) => e.id === envId)
    if (!env) return
    env.variables = { ...variables }
    this.saveToStorage()
    this.notify()
  }

  public addEnvironment(name: string, variables: Record<string, string> = {}): ApiEnvironment {
    const env: ApiEnvironment = {
      id: `env_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim() || 'Custom Environment',
      variables: { ...variables },
    }
    this.environments = [...this.environments, env]
    this.activeEnvironmentId = env.id
    this.saveToStorage()
    this.notify()
    return env
  }

  public getCollections(): ApiCollection[] {
    return this.collections
  }

  public createCollection(name: string, description = ''): ApiCollection {
    const col: ApiCollection = {
      id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim() || 'New Collection',
      description,
      requests: [],
    }
    this.collections = [...this.collections, col]
    this.saveToStorage()
    this.notify()
    return col
  }

  public saveRequest(collectionId: string, req: ApiRequest): ApiRequest {
    let col = this.collections.find((c) => c.id === collectionId)
    if (!col) {
      col = this.collections[0] || this.createCollection('My Requests')
    }
    const cloned: ApiRequest = JSON.parse(JSON.stringify(req))
    if (!cloned.id) {
      cloned.id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    }
    const existingIdx = col.requests.findIndex((r) => r.id === cloned.id)
    if (existingIdx >= 0) {
      col.requests[existingIdx] = cloned
    } else {
      col.requests.push(cloned)
    }
    this.collections = [...this.collections]
    this.saveToStorage()
    this.notify()
    return cloned
  }

  public deleteRequest(collectionId: string, requestId: string) {
    const col = this.collections.find((c) => c.id === collectionId)
    if (!col) return
    col.requests = col.requests.filter((r) => r.id !== requestId)
    this.collections = [...this.collections]
    this.saveToStorage()
    this.notify()
  }

  public getHistory(): RequestHistoryItem[] {
    return this.history
  }

  public clearHistory() {
    this.history = []
    this.saveToStorage()
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
    let rawUrl = this.interpolate(request.url, env).trim()
    if (!rawUrl) return ''
    const activeParams = request.params.filter((p) => p.enabled && p.key.trim())

    if (activeParams.length > 0) {
      try {
        const candidate = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
        const urlObj = new URL(candidate)
        activeParams.forEach((p) => {
          urlObj.searchParams.append(
            this.interpolate(p.key, env),
            this.interpolate(p.value, env)
          )
        })
        rawUrl = urlObj.toString()
      } catch {
        // Fallback manual query concatenation for partially typed URLs or unresolved {{vars}}
        const qs = activeParams
          .map((p) => `${encodeURIComponent(this.interpolate(p.key, env))}=${encodeURIComponent(this.interpolate(p.value, env))}`)
          .join('&')
        rawUrl += `${rawUrl.includes('?') ? '&' : '?'}${qs}`
      }
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

    // Offline test-domain mock handler (disabled when Electron HTTP proxy is available so real traffic is never faked)
    const hasElectronProxy = typeof window !== 'undefined' && Boolean(window.electronAPI?.infra?.httpRequest)
    if (fullUrl.includes('api.indoctrinated.io') && !hasElectronProxy) {
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
      headers['Authorization'] = `Basic ${utf8ToBase64(creds)}`
    } else if (
      request.auth.type === 'apiKey' &&
      (request.auth.apiKeyLocation || 'header') === 'header' &&
      request.auth.apiKeyName
    ) {
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
      } else if (request.bodyType === 'x-www-form-urlencoded' && request.bodyContent) {
        const raw = this.interpolate(request.bodyContent, env)
        try {
          const obj = JSON.parse(raw)
          const params = new URLSearchParams()
          for (const [k, v] of Object.entries(obj)) params.append(k, String(v))
          body = params.toString()
        } catch {
          body = raw
        }
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/x-www-form-urlencoded'
      } else if (request.bodyType === 'form-data' && request.bodyContent) {
        const raw = this.interpolate(request.bodyContent, env)
        const entries = this.parseKeyValueBody(raw)
        if (entries.length > 0) {
          const boundary = `----IndoctrinatedEditForm${Date.now().toString(36)}`
          const lines: string[] = []
          for (const [k, v] of entries) {
            lines.push(`--${boundary}`)
            lines.push(`Content-Disposition: form-data; name="${k.replace(/"/g, '\\"')}"`)
            lines.push('')
            lines.push(v)
          }
          lines.push(`--${boundary}--`, '')
          body = lines.join('\r\n')
          headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`
        } else {
          body = raw
        }
      } else if (request.bodyType === 'raw' && request.bodyContent) {
        body = this.interpolate(request.bodyContent, env)
      }
    }

    try {
      // Prefer CORS-free Electron main-process HTTP proxy when available
      if (typeof window !== 'undefined' && window.electronAPI?.infra?.httpRequest) {
        const proxyRes = await window.electronAPI.infra.httpRequest({
          url: fullUrl,
          method: request.method,
          headers,
          body,
          timeoutMs: 30000,
        })
        if (proxyRes.error && proxyRes.status === 0) {
          throw new Error(proxyRes.error)
        }
        let data: any = proxyRes.body
        try {
          data = JSON.parse(proxyRes.body)
        } catch {
          // Leave raw text if not JSON
        }
        const apiResponse: ApiResponse = {
          status: proxyRes.status,
          statusText: proxyRes.statusText || (proxyRes.ok ? 'OK' : 'Error'),
          headers: proxyRes.headers,
          data,
          rawText: proxyRes.body,
          body: proxyRes.body,
          executionTimeMs: proxyRes.latencyMs,
          timeMs: proxyRes.latencyMs,
          sizeBytes: proxyRes.sizeBytes,
          timestamp,
        }
        this.recordHistory(request, apiResponse)
        return apiResponse
      }

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

  private parseKeyValueBody(raw: string): [string, string][] {
    const trimmed = raw.trim()
    if (!trimmed) return []
    try {
      const obj = JSON.parse(trimmed)
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        return Object.entries(obj).map(([k, v]) => [k, String(v)])
      }
    } catch {
      // parse key=value lines
    }
    const pairs: [string, string][] = []
    for (const line of trimmed.split(/\r?\n/)) {
      const eq = line.indexOf('=')
      if (eq > 0) {
        pairs.push([line.slice(0, eq).trim(), line.slice(eq + 1).trim()])
      }
    }
    return pairs
  }

  private recordHistory(request: ApiRequest, response: ApiResponse) {
    this.history.unshift({
      id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      request: JSON.parse(JSON.stringify(request)),
      response: JSON.parse(JSON.stringify(response)),
      timestamp: new Date().toISOString(),
    })
    if (this.history.length > 40) this.history.pop()
    this.saveToStorage()
    this.notify()
  }

  public generateCurl(request: ApiRequest, env?: ApiEnvironment | string): string {
    return this.exportToCurl(request, env)
  }

  /**
   * Export ApiRequest into executable cURL syntax.
   */
  public exportToCurl(request: ApiRequest, env?: ApiEnvironment | string): string {
    const esc = (s: string) => s.replace(/'/g, "'\\''")
    let activeEnv: ApiEnvironment
    if (typeof env === 'string') {
      activeEnv = this.environments.find((e) => e.id === env) || this.getActiveEnvironment()
    } else {
      activeEnv = env || this.getActiveEnvironment()
    }
    const fullUrl = this.buildFullUrl(request, activeEnv)
    const parts: string[] = [`curl -X ${request.method} '${esc(fullUrl)}'`]

    const headerKeys = new Set<string>()
    request.headers
      .filter((h) => h.enabled && h.key.trim())
      .forEach((h) => {
        const k = this.interpolate(h.key, activeEnv)
        const v = this.interpolate(h.value, activeEnv)
        headerKeys.add(k.toLowerCase())
        parts.push(`  -H '${esc(k)}: ${esc(v)}'`)
      })

    if (request.auth.type === 'bearer' && (request.auth.bearerToken || (request.auth as any).token)) {
      const tokenVal = request.auth.bearerToken || (request.auth as any).token
      parts.push(`  -H 'Authorization: Bearer ${esc(this.interpolate(tokenVal, activeEnv))}'`)
    } else if (request.auth.type === 'basic') {
      const creds = `${this.interpolate(request.auth.basicUsername || '', activeEnv)}:${this.interpolate(request.auth.basicPassword || '', activeEnv)}`
      parts.push(`  -H 'Authorization: Basic ${utf8ToBase64(creds)}'`)
    } else if (
      request.auth.type === 'apiKey' &&
      (request.auth.apiKeyLocation || 'header') === 'header' &&
      request.auth.apiKeyName
    ) {
      const k = this.interpolate(request.auth.apiKeyName, activeEnv)
      const v = this.interpolate(request.auth.apiKeyValue || '', activeEnv)
      parts.push(`  -H '${esc(k)}: ${esc(v)}'`)
    }

    const bodyType = request.bodyType || (request as any).body?.type || 'none'
    const rawBody = request.bodyContent ?? (request as any).body?.raw ?? ''

    if (bodyType === 'json') {
      parts.push(`  -d '${esc(this.interpolate(rawBody, activeEnv))}'`)
    } else if (bodyType === 'graphql') {
      const query = this.interpolate(request.graphqlQuery || (request as any).body?.graphql?.query || '', activeEnv)
      let variables: any = undefined
      const rawVars = request.graphqlVariables || (request as any).body?.graphql?.variables
      if (rawVars && rawVars.trim() && rawVars.trim() !== '{}') {
        try {
          variables = JSON.parse(this.interpolate(rawVars, activeEnv))
        } catch {
          // ignore
        }
      }
      const payload = variables !== undefined ? JSON.stringify({ query, variables }) : JSON.stringify({ query })
      parts.push(`  -d '${esc(payload)}'`)
    } else if (bodyType === 'x-www-form-urlencoded' && rawBody) {
      if (!headerKeys.has('content-type')) {
        parts.push(`  -H 'Content-Type: application/x-www-form-urlencoded'`)
      }
      const interpolated = this.interpolate(rawBody, activeEnv)
      const entries = this.parseKeyValueBody(interpolated)
      if (entries.length > 0) {
        const params = new URLSearchParams()
        for (const [k, v] of entries) params.append(k, v)
        parts.push(`  -d '${esc(params.toString())}'`)
      } else {
        parts.push(`  -d '${esc(interpolated)}'`)
      }
    } else if (bodyType === 'form-data' && rawBody) {
      const interpolated = this.interpolate(rawBody, activeEnv)
      const entries = this.parseKeyValueBody(interpolated)
      if (entries.length > 0) {
        for (const [k, v] of entries) {
          parts.push(`  -F '${esc(k)}=${esc(v)}'`)
        }
      } else {
        parts.push(`  -d '${esc(interpolated)}'`)
      }
    } else if (bodyType === 'raw' && rawBody) {
      parts.push(`  -d '${esc(this.interpolate(rawBody, activeEnv))}'`)
    }

    return parts.join(' \\\n')
  }
}

export const restClientService = new RestClientService()

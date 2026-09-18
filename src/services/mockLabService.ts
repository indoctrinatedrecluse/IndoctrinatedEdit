/**
 * IndoctrinatedEdit - MockLab API Mock Server Service
 * Zero-config local HTTP mock server, endpoint route builder, delay simulation, dynamic Faker-like template expansion, and traffic log inspector.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface MockEndpoint {
  id: string
  name: string
  method: HttpMethod
  path: string
  statusCode: number
  delayMs: number
  headers: Record<string, string>
  responseBody: string
  contentType: 'application/json' | 'text/plain' | 'text/html' | 'application/xml'
  isEnabled: boolean
  callCount: number
}

export interface MockTrafficLog {
  id: string
  timestamp: string
  method: HttpMethod
  url: string
  matchedEndpointId?: string
  statusCode: number
  durationMs: number
  requestHeaders: Record<string, string>
  requestBody?: string
  responseBody: string
}

class MockLabService {
  private isServerRunning = true
  private serverPort = 4040
  private endpoints: MockEndpoint[] = [
    {
      id: 'ep_users',
      name: 'List Users',
      method: 'GET',
      path: '/api/v1/users',
      statusCode: 200,
      delayMs: 120,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Powered-By': 'MockLab/IndoctrinatedEdit',
      },
      responseBody: JSON.stringify(
        {
          success: true,
          page: 1,
          total: 3,
          data: [
            { id: 'usr_1', name: 'Abhishek Mitra', role: 'Architect', email: 'abmitra1999@gmail.com' },
            { id: 'usr_2', name: 'Elena Rostova', role: 'Lead Frontend', email: 'elena@example.com' },
            { id: 'usr_3', name: 'Marcus Vance', role: 'DevOps Lead', email: 'marcus@example.com' },
          ],
        },
        null,
        2
      ),
      contentType: 'application/json',
      isEnabled: true,
      callCount: 14,
    },
    {
      id: 'ep_user_create',
      name: 'Create User',
      method: 'POST',
      path: '/api/v1/users',
      statusCode: 201,
      delayMs: 250,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      responseBody: JSON.stringify(
        {
          success: true,
          message: 'User created successfully',
          data: {
            id: 'usr_{{faker.id}}',
            name: '{{faker.name}}',
            email: '{{faker.email}}',
            createdAt: '{{timestamp}}',
          },
        },
        null,
        2
      ),
      contentType: 'application/json',
      isEnabled: true,
      callCount: 6,
    },
    {
      id: 'ep_auth_jwt',
      name: 'JWT Login',
      method: 'POST',
      path: '/api/v1/auth/token',
      statusCode: 200,
      delayMs: 180,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      responseBody: JSON.stringify(
        {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfOTk0MWEiLCJuYW1lIjoiQWJoaXNoZWsgTWl0cmEifQ.mock_signature',
          tokenType: 'Bearer',
          expiresIn: 3600,
        },
        null,
        2
      ),
      contentType: 'application/json',
      isEnabled: true,
      callCount: 8,
    },
    {
      id: 'ep_order_error',
      name: 'Simulated 500 Payment Error',
      method: 'POST',
      path: '/api/v1/checkout/charge',
      statusCode: 500,
      delayMs: 800,
      headers: {
        'Content-Type': 'application/json',
      },
      responseBody: JSON.stringify(
        {
          error: 'PAYMENT_GATEWAY_TIMEOUT',
          message: 'Simulated payment gateway timeout after 800ms',
          retryable: true,
        },
        null,
        2
      ),
      contentType: 'application/json',
      isEnabled: false,
      callCount: 2,
    },
  ]

  private trafficLogs: MockTrafficLog[] = [
    {
      id: 'log_1',
      timestamp: '18:22:10',
      method: 'GET',
      url: '/api/v1/users',
      matchedEndpointId: 'ep_users',
      statusCode: 200,
      durationMs: 124,
      requestHeaders: { 'User-Agent': 'IndoctrinatedEdit-RestClient' },
      responseBody: '{"success":true,"page":1,"total":3}',
    },
  ]

  public isRunning(): boolean {
    return this.isServerRunning
  }

  public toggleServer(running?: boolean): boolean {
    this.isServerRunning = running !== undefined ? running : !this.isServerRunning
    return this.isServerRunning
  }

  public getPort(): number {
    return this.serverPort
  }

  public setPort(port: number): void {
    this.serverPort = port
  }

  public getEndpoints(): MockEndpoint[] {
    return [...this.endpoints]
  }

  public getEndpoint(id: string): MockEndpoint | undefined {
    return this.endpoints.find((ep) => ep.id === id)
  }

  public addEndpoint(endpoint: Omit<MockEndpoint, 'id' | 'callCount'>): MockEndpoint {
    const newEp: MockEndpoint = {
      ...endpoint,
      id: `ep_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      callCount: 0,
    }
    this.endpoints.push(newEp)
    return newEp
  }

  public updateEndpoint(id: string, updates: Partial<MockEndpoint>): MockEndpoint | undefined {
    const ep = this.endpoints.find((e) => e.id === id)
    if (!ep) return undefined
    Object.assign(ep, updates)
    return ep
  }

  public deleteEndpoint(id: string): boolean {
    const idx = this.endpoints.findIndex((e) => e.id === id)
    if (idx === -1) return false
    this.endpoints.splice(idx, 1)
    return true
  }

  public getTrafficLogs(): MockTrafficLog[] {
    return [...this.trafficLogs]
  }

  public clearTrafficLogs(): void {
    this.trafficLogs = []
  }

  /**
   * Simulates an incoming request and returns the templated mock response.
   */
  public async handleRequest(
    method: HttpMethod,
    path: string,
    requestHeaders: Record<string, string> = {},
    requestBody?: string
  ): Promise<{ statusCode: number; headers: Record<string, string>; body: string; durationMs: number }> {
    const start = performance.now()

    if (!this.isServerRunning) {
      return {
        statusCode: 503,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'MockLab server is offline' }),
        durationMs: 1,
      }
    }

    const cleanPath = path.split('?')[0]
    const matched = this.endpoints.find(
      (ep) => ep.isEnabled && ep.method === method && (ep.path === cleanPath || this.matchDynamicRoute(ep.path, cleanPath))
    )

    if (!matched) {
      const durationMs = Math.round(performance.now() - start)
      const notFoundBody = JSON.stringify({
        error: 'ROUTE_NOT_FOUND',
        message: `No mock route matched ${method} ${path}`,
      })
      this.recordLog(method, path, undefined, 404, durationMs, requestHeaders, requestBody, notFoundBody)
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: notFoundBody,
        durationMs,
      }
    }

    // Delay simulation
    if (matched.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, matched.delayMs))
    }

    matched.callCount++
    const expandedBody = this.expandDynamicTokens(matched.responseBody)
    const durationMs = Math.round(performance.now() - start)

    this.recordLog(method, path, matched.id, matched.statusCode, durationMs, requestHeaders, requestBody, expandedBody)

    return {
      statusCode: matched.statusCode,
      headers: matched.headers,
      body: expandedBody,
      durationMs,
    }
  }

  private matchDynamicRoute(routePattern: string, actualPath: string): boolean {
    const routeParts = routePattern.split('/').filter(Boolean)
    const actualParts = actualPath.split('/').filter(Boolean)
    if (routeParts.length !== actualParts.length) return false

    return routeParts.every((part, idx) => part.startsWith(':') || part === actualParts[idx])
  }

  private expandDynamicTokens(template: string): string {
    return template
      .replace(/\{\{faker\.id\}\}/g, () => Math.floor(Math.random() * 90000 + 10000).toString())
      .replace(/\{\{faker\.name\}\}/g, () => {
        const names = ['Abhishek Mitra', 'Elena Vance', 'Marcus Reed', 'Sarah Connor', 'Devon Miles']
        return names[Math.floor(Math.random() * names.length)]
      })
      .replace(/\{\{faker\.email\}\}/g, () => `user_${Math.floor(Math.random() * 900)}@indoctrinated.io`)
      .replace(/\{\{timestamp\}\}/g, () => new Date().toISOString())
      .replace(/\{\{faker\.price\}\}/g, () => (Math.random() * 200 + 10).toFixed(2))
  }

  private recordLog(
    method: HttpMethod,
    url: string,
    matchedEndpointId: string | undefined,
    statusCode: number,
    durationMs: number,
    requestHeaders: Record<string, string>,
    requestBody: string | undefined,
    responseBody: string
  ): void {
    const log: MockTrafficLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toLocaleTimeString(),
      method,
      url,
      matchedEndpointId,
      statusCode,
      durationMs,
      requestHeaders,
      requestBody,
      responseBody: responseBody.length > 500 ? responseBody.substring(0, 500) + '...' : responseBody,
    }
    this.trafficLogs.unshift(log)
    if (this.trafficLogs.length > 100) this.trafficLogs.pop()
  }
}

export const mockLabService = new MockLabService()

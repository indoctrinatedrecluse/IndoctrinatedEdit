import { describe, it, expect } from 'vitest'
import { mockLabService } from '../src/services/mockLabService'

describe('MockLabService', () => {
  it('manages mock endpoints (list, add, update, delete)', () => {
    const initial = mockLabService.getEndpoints()
    expect(initial.length).toBeGreaterThan(0)

    const created = mockLabService.addEndpoint({
      name: 'Test Endpoint',
      method: 'GET',
      path: '/api/v1/test_resource',
      statusCode: 200,
      delayMs: 10,
      headers: { 'Content-Type': 'application/json' },
      responseBody: '{"ok": true}',
      contentType: 'application/json',
      isEnabled: true,
    })

    expect(created.id).toBeDefined()
    expect(created.path).toBe('/api/v1/test_resource')

    const updated = mockLabService.updateEndpoint(created.id, { statusCode: 202 })
    expect(updated?.statusCode).toBe(202)

    const deleted = mockLabService.deleteEndpoint(created.id)
    expect(deleted).toBe(true)
  })

  it('handles simulated requests and expands dynamic template tokens', async () => {
    const res = await mockLabService.handleRequest('GET', '/api/v1/users')
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('Abhishek Mitra')
    expect(res.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('handles dynamic token templating (faker.name, faker.email, timestamp)', async () => {
    const res = await mockLabService.handleRequest('POST', '/api/v1/users')
    expect(res.statusCode).toBe(201)
    expect(res.body).not.toContain('{{faker.name}}')
    expect(res.body).toContain('user_')
  })

  it('returns 404 for non-existent routes and logs traffic', async () => {
    const res = await mockLabService.handleRequest('GET', '/api/v1/non_existent_route_999')
    expect(res.statusCode).toBe(404)

    const logs = mockLabService.getTrafficLogs()
    expect(logs.some((l) => l.url === '/api/v1/non_existent_route_999')).toBe(true)
  })

  it('handles server toggle', () => {
    expect(mockLabService.isRunning()).toBe(true)
    mockLabService.toggleServer(false)
    expect(mockLabService.isRunning()).toBe(false)
    mockLabService.toggleServer(true)
    expect(mockLabService.isRunning()).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { portSentinelService, KNOWN_DEV_PORTS } from '../src/services/portSentinelService'

describe('PortSentinelService', () => {
  it('scans active listening ports and detects standard dev ports', async () => {
    const ports = await portSentinelService.scanActivePorts()
    expect(ports.length).toBeGreaterThan(0)
    expect(ports.some((p) => p.port === 5173)).toBe(true)
    expect(ports.some((p) => p.isKnownDevPort)).toBe(true)
  })

  it('filters ports by query string', async () => {
    const filtered = await portSentinelService.scanActivePorts('5432')
    expect(filtered.length).toBe(1)
    expect(filtered[0].port).toBe(5432)
    expect(filtered[0].processName).toContain('postgres')
  })

  it('identifies known dev ports with category and descriptions', () => {
    expect(KNOWN_DEV_PORTS[3000].name).toBe('React / Next.js')
    expect(KNOWN_DEV_PORTS[6379].category).toBe('cache')
    expect(KNOWN_DEV_PORTS[5432].category).toBe('database')
  })

  it('performs HTTP/TCP health probe against port', async () => {
    const probe = await portSentinelService.pingPort(5173)
    expect(probe.port).toBe(5173)
    expect(probe.latencyMs).toBeGreaterThanOrEqual(0)
    expect(probe.checkedAt).toBeDefined()
  })

  it('registers custom port and kills active process', async () => {
    const custom = portSentinelService.registerCustomPort(8088, 'custom-test.exe', 'Test Watcher')
    expect(custom.port).toBe(8088)

    const killRes = portSentinelService.killProcess(custom.pid)
    expect(killRes.success).toBe(true)
    expect(killRes.killCommand).toContain(custom.pid.toString())
  })
})

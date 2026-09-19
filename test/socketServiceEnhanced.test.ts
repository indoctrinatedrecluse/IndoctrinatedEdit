import { describe, it, expect } from 'vitest'
import { socketService } from '../src/services/socketService'

describe('WebSocket & EventStream Hub Subsystem', () => {
  it('should connect in virtual echo mode and transmit messages', async () => {
    const connected = await socketService.connect({ url: 'mock://echo.events' })
    expect(connected).toBe(true)
    expect(socketService.getIsConnected()).toBe(true)

    const sent = socketService.send(JSON.stringify({ action: 'test' }))
    expect(sent).toBe(true)

    const messages = socketService.getMessages()
    expect(messages.length).toBeGreaterThan(0)
    socketService.disconnect()
  })

  it('should trigger ping frames with RTT measurement', async () => {
    await socketService.connect({ url: 'mock://echo.events' })
    socketService.sendPing()
    const msgs = socketService.getMessages()
    const pingMsg = msgs.find((m) => m.type === 'ping')
    expect(pingMsg).toBeDefined()
    socketService.disconnect()
  })

  it('should load preset forge templates', () => {
    expect(socketService.presets.length).toBeGreaterThanOrEqual(4)
    const rpc = socketService.presets.find((p) => p.type === 'json-rpc')
    expect(rpc).toBeDefined()
    expect(rpc?.payload).toContain('jsonrpc')
  })
})

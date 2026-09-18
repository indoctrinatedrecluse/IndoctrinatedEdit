import { describe, it, expect } from 'vitest'
import { redisStudioService } from '../src/services/redisStudioService'

describe('RedisStudioService', () => {
  it('retrieves keys and filters with glob pattern', () => {
    const allKeys = redisStudioService.getKeys('*')
    expect(allKeys.length).toBeGreaterThan(0)

    const sessionKeys = redisStudioService.getKeys('app:session:*')
    expect(sessionKeys.length).toBe(1)
    expect(sessionKeys[0].type).toBe('hash')
  })

  it('sets and gets string & json keys', () => {
    const entry = redisStudioService.setStringKey('test:key:1', 'hello redis', 300)
    expect(entry.key).toBe('test:key:1')
    expect(entry.type).toBe('string')
    expect(entry.ttl).toBe(300)

    const fetched = redisStudioService.getKey('test:key:1')
    expect(fetched?.value).toBe('hello redis')

    const jsonEntry = redisStudioService.setStringKey('test:json:1', JSON.stringify({ ok: true, score: 99 }))
    expect(jsonEntry.type).toBe('json')
    expect(jsonEntry.value.ok).toBe(true)
  })

  it('updates hash fields and TTL', () => {
    redisStudioService.setHashField('user:profile:100', 'name', 'Abhishek')
    redisStudioService.setHashField('user:profile:100', 'city', 'Kolkata')

    const userEntry = redisStudioService.getKey('user:profile:100')
    expect(userEntry?.value.name).toBe('Abhishek')
    expect(userEntry?.value.city).toBe('Kolkata')

    const updatedTtl = redisStudioService.updateTtl('user:profile:100', 7200)
    expect(updatedTtl).toBe(true)
    expect(redisStudioService.getKey('user:profile:100')?.ttl).toBe(7200)
  })

  it('executes Redis REPL commands (PING, SET, GET, KEYS, INFO, DBSIZE)', () => {
    const pingRes = redisStudioService.executeCommand('PING')
    expect(pingRes.response).toBe('PONG')
    expect(pingRes.isError).toBe(false)

    const setRes = redisStudioService.executeCommand('SET test:repl:val 4200')
    expect(setRes.response).toBe('OK')

    const getRes = redisStudioService.executeCommand('GET test:repl:val')
    expect(getRes.response).toBe('4200')

    const infoRes = redisStudioService.executeCommand('INFO')
    expect(infoRes.response).toContain('redis_version:7.2.4')

    const dbsizeRes = redisStudioService.executeCommand('DBSIZE')
    expect(dbsizeRes.response).toContain('(integer)')
  })

  it('handles Pub/Sub message publishing', () => {
    const msg = redisStudioService.publishMessage('events:audit', '{"action":"TEST_EVENT"}')
    expect(msg.channel).toBe('events:audit')
    expect(msg.message).toContain('TEST_EVENT')

    const allMsgs = redisStudioService.getPubSubMessages()
    expect(allMsgs.some((m) => m.id === msg.id)).toBe(true)
  })
})

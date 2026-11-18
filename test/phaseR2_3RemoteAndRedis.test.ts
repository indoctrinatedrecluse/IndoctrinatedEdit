import { describe, it, expect } from 'vitest'
import net from 'node:net'
import { executeRedisRespCommand, parsePosixLsOutput } from '../electron/infra-ipc-service'
import { redisStudioService } from '../src/services/redisStudioService'
import { remoteProtocolService } from '../src/services/remoteProtocolService'

describe('Phase R2-3 — Real Remote Protocol (SSH/SFTP/TCP) & Real Redis Live RESP2', () => {
  it('parsePosixLsOutput parses real POSIX ls -la directory listings accurately', () => {
    const sample = [
      'total 32',
      'drwxr-xr-x 4 deploy deploy 4096 Sep 24 09:30 .',
      'drwxr-xr-x 3 root root 4096 Sep 20 12:00 ..',
      'drwxr-xr-x 2 deploy deploy 4096 Sep 24 09:30 config',
      '-rw-r--r-- 1 deploy deploy 2048 Sep 24 10:05 server.js',
    ].join('\n')

    const parsed = parsePosixLsOutput(sample)
    expect(parsed).toHaveLength(3)
    expect(parsed[0]).toMatchObject({ name: '..', type: 'directory' })
    expect(parsed[1]).toMatchObject({ name: 'config', type: 'directory' })
    expect(parsed[2]).toMatchObject({ name: 'server.js', type: 'file', size: '2.0 KB' })
  })

  it('executeRedisRespCommand surfaces AUTH errors in pipelined commands instead of masking them', async () => {
    const server = net.createServer((socket) => {
      socket.on('data', () => {
        socket.write('-WRONGPASS invalid username-password pair\r\n+PONG\r\n')
      })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const addr = server.address() as net.AddressInfo

    try {
      const res = await executeRedisRespCommand({
        host: '127.0.0.1',
        port: addr.port,
        password: 'wrong',
        args: ['PING'],
      })
      expect(res.ok).toBe(false)
      expect(res.error).toContain('WRONGPASS')
    } finally {
      server.close()
    }
  })

  it('redisStudioService.saveKeyTypedAsync preserves hash, list, and set types cleanly', async () => {
    const h = await redisStudioService.saveKeyTypedAsync('test:hash', 'hash', '{"a":"1","b":"2"}', 60)
    expect(h.type).toBe('hash')
    expect(h.value).toEqual({ a: '1', b: '2' })

    const l = await redisStudioService.saveKeyTypedAsync('test:list', 'list', 'one, two, three', -1)
    expect(l.type).toBe('list')
    expect(l.value).toEqual(['one', 'two', 'three'])
  })

  it('remoteProtocolService persists and deletes SSH bookmarks cleanly', () => {
    const created = remoteProtocolService.addBookmark({
      name: 'Test Node',
      host: '10.0.0.5',
      port: 2222,
      user: 'ops',
      authType: 'key',
      keyPath: '~/.ssh/id_ed25519',
      group: 'Staging',
    })
    expect(remoteProtocolService.getBookmarks().some((b) => b.id === created.id)).toBe(true)
    remoteProtocolService.deleteBookmark(created.id)
    expect(remoteProtocolService.getBookmarks().some((b) => b.id === created.id)).toBe(false)
  })
})

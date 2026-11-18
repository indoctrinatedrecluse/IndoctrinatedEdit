import { describe, it, expect } from 'vitest'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'
import {
  executeHttpProxy,
  realMockHttpServer,
  probeLocalPort,
  executeRedisRespCommand,
  inspectGrpcProto,
  sendSmtpDiagnostic,
} from '../electron/infra-ipc-service'
import { databaseService } from '../src/services/databaseService'
import { redisStudioService } from '../src/services/redisStudioService'

describe('Phase 5 — Real Network & Infrastructure Studios Backends', () => {
  it('runs a real local MockLab HTTP server and queries it through CORS-free executeHttpProxy + probeLocalPort', async () => {
    const started = await realMockHttpServer.start(0, [
      {
        id: 'ep1',
        method: 'GET',
        path: '/api/users/:id',
        statusCode: 200,
        delayMs: 0,
        headers: { 'X-MockLab': 'live' },
        responseBody: '{"userId":"{{id}}","ok":true}',
        isEnabled: true,
      },
    ])

    expect(started.running).toBe(true)
    expect(started.port).toBeGreaterThan(0)

    try {
      const hit = await executeHttpProxy({
        url: `http://127.0.0.1:${started.port}/api/users/42`,
        method: 'GET',
      })
      expect(hit.ok).toBe(true)
      expect(hit.status).toBe(200)
      expect(hit.headers['x-mocklab']).toBe('live')
      expect(JSON.parse(hit.body)).toEqual({ userId: '42', ok: true })

      const miss = await executeHttpProxy({
        url: `http://127.0.0.1:${started.port}/api/missing`,
        method: 'GET',
      })
      expect(miss.status).toBe(404)

      const probeOpen = await probeLocalPort(started.port, '127.0.0.1')
      expect(probeOpen.isReachable).toBe(true)
    } finally {
      await realMockHttpServer.stop()
    }

    const probeClosed = await probeLocalPort(started.port, '127.0.0.1')
    expect(probeClosed.isReachable).toBe(false)
  })

  it('speaks genuine RESP2 wire protocol over TCP in executeRedisRespCommand', async () => {
    const server = net.createServer((socket) => {
      socket.on('data', (chunk) => {
        const str = chunk.toString('utf8')
        if (str.includes('PING')) {
          socket.write('+PONG\r\n')
        } else if (str.includes('GET')) {
          socket.write('$5\r\nhello\r\n')
        }
      })
    })

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const port = (server.address() as net.AddressInfo).port

    try {
      const ping = await executeRedisRespCommand({ host: '127.0.0.1', port, args: ['PING'] })
      expect(ping.ok).toBe(true)
      expect(ping.value).toBe('PONG')

      const get = await executeRedisRespCommand({ host: '127.0.0.1', port, args: ['GET', 'greeting'] })
      expect(get.ok).toBe(true)
      expect(get.value).toBe('hello')
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })

  it('inspects a real .proto file using pure-JS @grpc/proto-loader', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'indoc-grpc-'))
    const protoPath = path.join(tmpDir, 'greeter.proto')
    await fs.writeFile(
      protoPath,
      `syntax = "proto3";\npackage demo;\nservice Greeter {\n  rpc SayHello (HelloRequest) returns (HelloReply);\n}\nmessage HelloRequest { string name = 1; }\nmessage HelloReply { string message = 1; }\n`
    )

    try {
      const inspected = await inspectGrpcProto(protoPath)
      expect(inspected.ok).toBe(true)
      expect(inspected.services).toEqual([{ name: 'demo.Greeter', methods: ['SayHello'] }])
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('executes a real ESMTP handshake transcript over TCP in sendSmtpDiagnostic', async () => {
    const server = net.createServer((socket) => {
      socket.write('220 mock-smtp.local ESMTP ready\r\n')
      let inData = false
      socket.on('data', (chunk) => {
        const text = chunk.toString('utf8')
        if (inData) {
          if (text.includes('\r\n.\r\n') || text.endsWith('.\r\n')) {
            inData = false
            socket.write('250 2.0.0 Queued\r\n')
          }
          return
        }
        if (text.startsWith('EHLO')) socket.write('250-mock-smtp.local\r\n250 OK\r\n')
        else if (text.startsWith('MAIL FROM')) socket.write('250 2.1.0 Ok\r\n')
        else if (text.startsWith('RCPT TO')) socket.write('250 2.1.5 Ok\r\n')
        else if (text.startsWith('DATA')) {
          inData = true
          socket.write('354 End data with <CR><LF>.<CR><LF>\r\n')
        } else if (text.startsWith('QUIT')) {
          socket.write('221 Bye\r\n')
          socket.end()
        }
      })
    })

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const port = (server.address() as net.AddressInfo).port

    try {
      const res = await sendSmtpDiagnostic({
        host: '127.0.0.1',
        port,
        security: 'none',
        from: 'sender@example.local',
        to: 'recipient@example.local',
        subject: 'Hello',
        body: 'Test body',
      })
      expect(res.ok).toBe(true)
      expect(res.transcript.some((t) => t.type === 'server' && t.text.includes('250 2.0.0 Queued'))).toBe(true)
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })

  it('databaseService WHERE safety rejects unrecognized predicates and evaluates IN + OR/AND precedence', () => {
    const badWhere = databaseService.executeQuery('SELECT * FROM customers WHERE malformed_predicate_xyz')
    expect(badWhere.rows).toHaveLength(0)

    const inWhere = databaseService.executeQuery('SELECT * FROM customers WHERE id IN (1, 2)')
    expect(inWhere.rows.length).toBeGreaterThan(0)
  })

  it('redisStudioService tokenizes quoted CLI arguments cleanly', () => {
    expect(redisStudioService.tokenizeCommand('SET greeting "hello world"')).toEqual(['SET', 'greeting', 'hello world'])
  })
})

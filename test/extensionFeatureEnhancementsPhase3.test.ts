import { describe, it, expect } from 'vitest'
import { taskRunnerService, ProjectTask } from '../src/services/taskRunnerService'
import { socketService, SocketMessage } from '../src/services/socketService'
import { dockerService } from '../src/services/dockerService'

describe('Extension Enhancements Phase 3: Automation & DevOps', () => {
  describe('Task Runner Multi-Ecosystem & Filtering', () => {
    const mockTasks: ProjectTask[] = [
      { id: '1', name: 'build', command: 'npm run build', source: 'package.json' },
      { id: '2', name: 'all', command: 'make all', source: 'Makefile' },
      { id: '3', name: 'cargo test', command: 'cargo test', source: 'Cargo.toml' },
      { id: '4', name: 'pytest', command: 'pytest -v', source: 'Python' },
      { id: '5', name: 'go build', command: 'go build ./...', source: 'Go' },
      { id: '6', name: 'deno task dev', command: 'deno task dev', source: 'Deno' },
      { id: '7', name: 'custom task', command: 'echo hello', source: 'Custom' },
    ]

    it('filters tasks by source', () => {
      const goOnly = taskRunnerService.filterTasks(mockTasks, { source: 'Go' })
      expect(goOnly).toHaveLength(1)
      expect(goOnly[0].command).toContain('go build')

      const denoOnly = taskRunnerService.filterTasks(mockTasks, { source: 'Deno' })
      expect(denoOnly).toHaveLength(1)
      expect(denoOnly[0].name).toContain('deno')

      const all = taskRunnerService.filterTasks(mockTasks, { source: 'All' })
      expect(all).toHaveLength(7)
    })

    it('filters tasks by search query', () => {
      const searchRes = taskRunnerService.filterTasks(mockTasks, { query: 'test' })
      expect(searchRes).toHaveLength(2) // cargo test & pytest
      expect(searchRes.map((t) => t.source)).toEqual(['Cargo.toml', 'Python'])
    })
  })

  describe('WebSocket & Event Streams Hub Enhancements', () => {
    const mockMessages: SocketMessage[] = [
      {
        id: 'msg_1',
        direction: 'out',
        data: '{"jsonrpc": "2.0", "method": "login"}',
        timestamp: '10:00:00',
        sizeBytes: 38,
        type: 'json',
      },
      {
        id: 'msg_2',
        direction: 'in',
        data: '{"jsonrpc": "2.0", "result": {"token": "xyz"}}',
        timestamp: '10:00:01',
        sizeBytes: 48,
        type: 'json',
      },
      {
        id: 'msg_3',
        direction: 'out',
        data: 'PING',
        timestamp: '10:00:05',
        sizeBytes: 4,
        type: 'ping',
      },
      {
        id: 'msg_4',
        direction: 'in',
        data: 'event: telemetry\ndata: {"status": "ok"}',
        timestamp: '10:00:06',
        sizeBytes: 42,
        type: 'sse',
        eventName: 'telemetry',
      },
    ]

    it('filters socket messages by direction, type, and text query', () => {
      const incoming = socketService.filterMessages(mockMessages, { direction: 'in' })
      expect(incoming).toHaveLength(2)
      expect(incoming.every((m) => m.direction === 'in')).toBe(true)

      const pings = socketService.filterMessages(mockMessages, { type: 'ping' })
      expect(pings).toHaveLength(1)
      expect(pings[0].data).toBe('PING')

      const queryRes = socketService.filterMessages(mockMessages, { query: 'token' })
      expect(queryRes).toHaveLength(1)
      expect(queryRes[0].id).toBe('msg_2')
    })

    it('exports recorded stream packets as valid JSON', () => {
      const json = socketService.exportMessagesJson()
      expect(() => JSON.parse(json)).not.toThrow()
    })
  })

  describe('Docker & Container Studio Enhancements', () => {
    it('detects Dockerfile security and optimization issues', () => {
      const sampleDockerfile = `
FROM node:latest
EXPOSE 3000
RUN sudo apt-get update
ADD localfile.txt /app/localfile.txt
CMD ["node", "server.js"]
`
      const issues = dockerService.lintDockerfile(sampleDockerfile)
      expect(issues.some((i) => i.rule === 'avoid-latest-tag')).toBe(true)
      expect(issues.some((i) => i.rule === 'no-sudo')).toBe(true)
      expect(issues.some((i) => i.rule === 'prefer-copy-over-add')).toBe(true)
      expect(issues.some((i) => i.rule === 'missing-non-root-user')).toBe(true)
      expect(issues.some((i) => i.rule === 'missing-healthcheck')).toBe(true)
    })

    it('generates declarative docker-compose service blocks with restart policies and resource limits', () => {
      const composeYaml = dockerService.generateComposeService({
        serviceName: 'backend-api',
        image: 'indoctrinated/backend:6.2.0',
        port: 8080,
        restartPolicy: 'unless-stopped',
        memoryLimitMb: 512,
        env: {
          NODE_ENV: 'production',
          PORT: '8080',
        },
      })

      expect(composeYaml).toContain('backend-api:')
      expect(composeYaml).toContain('image: indoctrinated/backend:6.2.0')
      expect(composeYaml).toContain('restart: unless-stopped')
      expect(composeYaml).toContain('"8080:8080"')
      expect(composeYaml).toContain('NODE_ENV=production')
      expect(composeYaml).toContain('memory: 512M')
    })
  })
})

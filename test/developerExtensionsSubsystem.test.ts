import { describe, it, expect } from 'vitest'
import { dockerService } from '../src/services/dockerService'
import { socketService } from '../src/services/socketService'
import { regexService } from '../src/services/regexService'
import { packageManagerService } from '../src/services/packageManagerService'
import { taskRunnerService } from '../src/services/taskRunnerService'

describe('DeveloperExtensionsSubsystem Tests', () => {
  // 1. Docker Service
  it('should manage containers and prune dangling images in DockerService', () => {
    const containers = dockerService.getContainers()
    expect(containers.length).toBeGreaterThanOrEqual(3)

    const c = containers[0]
    expect(dockerService.stopContainer(c.id)).toBe(true)
    const stoppedC = dockerService.getContainers().find((item) => item.id === c.id)
    expect(stoppedC?.status).toBe('stopped')

    expect(dockerService.startContainer(c.id)).toBe(true)
    const startedC = dockerService.getContainers().find((item) => item.id === c.id)
    expect(startedC?.status).toBe('running')

    const pruned = dockerService.pruneDanglingImages()
    expect(pruned).toBeGreaterThanOrEqual(0)
    expect(dockerService.generateComposeTemplate()).toContain('services:')
  })

  // 2. Socket Service
  it('should manage WebSocket connection and message streaming', async () => {
    const success = await socketService.connect({ url: 'mock://echo.events' })
    expect(success).toBe(true)
    expect(socketService.getIsConnected()).toBe(true)

    const sent = socketService.send('{"event": "ping"}')
    expect(sent).toBe(true)
    expect(socketService.getMessages().length).toBeGreaterThan(0)

    socketService.clearMessages()
    expect(socketService.getMessages().length).toBe(0)

    socketService.disconnect()
    expect(socketService.getIsConnected()).toBe(false)
  })

  // 3. Regex Service
  it('should test patterns, extract capture groups, and generate code snippets in RegexService', () => {
    const pattern = '([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})'
    const text = 'Emails: recluse@indoctrinated.io and dev@test.com'
    const result = regexService.testRegex(pattern, 'g', text)

    expect(result.isValid).toBe(true)
    expect(result.matchesCount).toBe(2)
    expect(result.matches[0].groups).toHaveLength(2)

    const explanations = regexService.explainRegex(pattern)
    expect(explanations.length).toBeGreaterThan(0)

    const tsSnippet = regexService.generateSnippet(pattern, 'g', 'typescript')
    expect(tsSnippet).toContain('new RegExp')

    const pySnippet = regexService.generateSnippet(pattern, 'g', 'python')
    expect(pySnippet).toContain('import re')
  })

  // 4. Package Manager Service
  it('should parse manifest files and detect dependencies and vulnerabilities', () => {
    const pkgJson = JSON.stringify({
      dependencies: {
        react: '18.3.1',
        axios: '0.21.1',
        lodash: '4.17.15',
      },
    })
    const scan = packageManagerService.parseManifest('package.json', pkgJson)
    expect(scan.totalDependencies).toBe(3)
    expect(scan.dependencies.some((d) => d.name === 'axios')).toBe(true)
    expect(scan.vulnerabilitiesCount).toBeGreaterThan(0)
  })

  // 5. Task Runner & Cron Service
  it('should execute project tasks and parse Cron expressions', async () => {
    const tasks = taskRunnerService.getTasks()
    expect(tasks.length).toBeGreaterThanOrEqual(4)

    const runResult = await taskRunnerService.runTask('task_test')
    expect(runResult?.lastRun?.status).toBe('success')

    const cron1 = taskRunnerService.analyzeCron('*/15 * * * *')
    expect(cron1.isValid).toBe(true)
    expect(cron1.humanReadable).toContain('every 15 minutes')
    expect(cron1.nextOccurrences.length).toBe(10)

    const invalidCron = taskRunnerService.analyzeCron('bad cron')
    expect(invalidCron.isValid).toBe(false)
  })
})

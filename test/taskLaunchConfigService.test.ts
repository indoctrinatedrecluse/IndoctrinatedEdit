import { describe, it, expect, beforeEach } from 'vitest'
import { taskLaunchConfigService } from '../src/services/taskLaunchConfigService'

describe('TaskLaunchConfigService', () => {
  beforeEach(() => {
    taskLaunchConfigService.resetDefaultConfigs()
  })

  it('loads default tasks and launch configurations', () => {
    const tasks = taskLaunchConfigService.getTasks()
    expect(tasks.length).toBeGreaterThanOrEqual(4)
    expect(tasks.some((t) => t.label === 'npm: build')).toBe(true)

    const launchConfigs = taskLaunchConfigService.getLaunchConfigs()
    expect(launchConfigs.length).toBeGreaterThanOrEqual(4)
    expect(launchConfigs.some((l) => l.type === 'node')).toBe(true)
  })

  it('resolves variables properly in paths and commands', () => {
    const template = '${workspaceFolder}/src/${fileBasename}'
    const resolved = taskLaunchConfigService.resolveVariables(template, {
      workspaceFolder: '/home/user/project',
      filePath: '/home/user/project/src/index.ts',
    })

    expect(resolved).toBe('/home/user/project/src/index.ts')
  })

  it('parses custom tasks.json content safely', () => {
    const customJson = JSON.stringify({
      version: '2.0.0',
      tasks: [
        {
          label: 'Custom Linter',
          type: 'shell',
          command: 'eslint .',
        },
      ],
    })

    const parsed = taskLaunchConfigService.parseTasksJson(customJson)
    expect(parsed.tasks.length).toBe(1)
    expect(parsed.tasks[0].label).toBe('Custom Linter')
  })

  it('parses custom launch.json content safely', () => {
    const customJson = JSON.stringify({
      version: '0.2.0',
      configurations: [
        {
          name: 'Custom Server',
          type: 'node',
          request: 'launch',
          program: 'server.js',
        },
      ],
    })

    const parsed = taskLaunchConfigService.parseLaunchJson(customJson)
    expect(parsed.configurations.length).toBe(1)
    expect(parsed.configurations[0].name).toBe('Custom Server')
  })

  it('executes task and returns status and logs', async () => {
    const tasks = taskLaunchConfigService.getTasks()
    const result = await taskLaunchConfigService.executeTask(tasks[0], {
      workspaceFolder: '/project',
    })

    expect(result.status).toBe('success')
    expect(result.commandExecuted).toContain('npm run build')
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    expect(result.outputLogs.length).toBeGreaterThan(0)
  })
})

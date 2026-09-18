import { describe, it, expect, beforeEach } from 'vitest'
import { runService, RunProfile } from '../src/services/runService'
import { terminalService } from '../src/services/terminalService'

describe('RunService', () => {
  beforeEach(() => {
    runService.resetToDefaults()
  })

  it('should initialize with built-in profiles for 16+ languages', () => {
    const profiles = runService.getProfiles()
    expect(profiles.length).toBeGreaterThanOrEqual(16)

    const pythonProfile = runService.getProfileForLanguage('python')
    expect(pythonProfile).toBeDefined()
    expect(pythonProfile?.name).toContain('Python')
    expect(pythonProfile?.commandTemplate).toContain('python')

    const tsProfile = runService.getProfileForLanguage('typescript')
    expect(tsProfile).toBeDefined()
    expect(tsProfile?.commandTemplate).toContain('tsx')

    const rustProfile = runService.getProfileForLanguage('rust')
    expect(rustProfile).toBeDefined()
    expect(rustProfile?.language).toBe('rust')
  })

  it('should resolve language aliases correctly', () => {
    const pyAlias = runService.getProfileForLanguage('py')
    expect(pyAlias?.language).toBe('python')

    const tsxAlias = runService.getProfileForLanguage('tsx')
    expect(tsxAlias?.language).toBe('typescript')

    const rsAlias = runService.getProfileForLanguage('rs')
    expect(rsAlias?.language).toBe('rust')

    const cppAlias = runService.getProfileForLanguage('cxx')
    expect(cppAlias?.language).toBe('cpp')
  })

  it('should correctly interpolate file path variables', () => {
    const template = 'python "${file}" --dir "${fileDirname}" --base "${fileBasename}" --ext "${fileExtname}" --no-ext "${fileBasenameNoExtension}" --root "${workspaceFolder}" ${args}'

    const context = {
      filePath: 'D:/Projects/MyApp/src/main.py',
      workspacePath: 'D:/Projects/MyApp',
      customArgs: '--verbose --port 8080',
    }

    const resolved = runService.interpolate(template, context)

    expect(resolved).toContain('python "D:/Projects/MyApp/src/main.py"')
    expect(resolved).toContain('--dir "D:/Projects/MyApp/src"')
    expect(resolved).toContain('--base "main.py"')
    expect(resolved).toContain('--ext ".py"')
    expect(resolved).toContain('--no-ext "main"')
    expect(resolved).toContain('--root "D:/Projects/MyApp"')
    expect(resolved).toContain('--verbose --port 8080')
  })

  it('should support saving and retrieving custom run profiles', () => {
    const customProfile: RunProfile = {
      id: 'run.custom.bun',
      name: 'Bun: Ultra Fast Runner',
      language: 'typescript',
      scope: 'file',
      commandTemplate: 'bun run "${file}" ${args}',
      interpreterPath: 'bun',
      args: ['--hot'],
      isDefault: true,
    }

    runService.saveProfile(customProfile)

    const retrieved = runService.getProfileById('run.custom.bun')
    expect(retrieved).toBeDefined()
    expect(retrieved?.name).toBe('Bun: Ultra Fast Runner')

    // Since it's default for typescript, getProfileForLanguage should return it
    const tsRunner = runService.getProfileForLanguage('typescript')
    expect(tsRunner?.id).toBe('run.custom.bun')
  })

  it('should resolve run commands with pre-launch and environment variables', () => {
    const profile: RunProfile = {
      id: 'run.test.cpp',
      name: 'C++ Build & Run',
      language: 'cpp',
      scope: 'file',
      commandTemplate: './"${fileBasenameNoExtension}" ${args}',
      preLaunchTask: 'g++ "${file}" -o "${fileBasenameNoExtension}" -O3',
      args: ['--test-mode'],
      env: { NODE_ENV: 'test', DEBUG: '1' },
      cwd: '${fileDirname}',
    }

    const resolved = runService.resolveRunCommand(profile, {
      filePath: '/home/user/app/calc.cpp',
      workspacePath: '/home/user/app',
      customArgs: '--flag',
      customEnv: { CUSTOM_KEY: 'abc' },
    })

    expect(resolved.command).toBe('./"calc" --test-mode --flag')
    expect(resolved.preLaunchCommand).toBe('g++ "/home/user/app/calc.cpp" -o "calc" -O3')
    expect(resolved.cwd).toBe('/home/user/app')
    expect(resolved.env.NODE_ENV).toBe('test')
    expect(resolved.env.CUSTOM_KEY).toBe('abc')
  })

  it('should execute in terminal service cleanly', async () => {
    let openedTerminal = false
    const success = await runService.runActiveFile(
      'D:/app/script.py',
      'python',
      '--debug',
      'D:/app',
      {
        onOpenTerminal: () => {
          openedTerminal = true
        },
      }
    )

    expect(success).toBe(true)
    expect(openedTerminal).toBe(true)

    const tabs = terminalService.getTabs()
    const runTab = tabs.find((t) => t.title.startsWith('Run:'))
    expect(runTab).toBeDefined()
    expect(runTab?.buffer.some((line) => line.includes('python'))).toBe(true)
  })
})

import { describe, it, expect, afterEach, vi } from 'vitest'
import { encodeLspMessage, decodeLspMessages } from '../electron/lsp-client-service'
import { lspService } from '../src/services/lspService'
import { diagnosticsService } from '../src/services/diagnosticsService'
import { formatterService } from '../src/services/formatterService'
import { globalSearchService } from '../src/services/globalSearchService'
import { taskLaunchConfigService } from '../src/services/taskLaunchConfigService'
import { taskRunnerService } from '../src/services/taskRunnerService'
import { testExplorerService } from '../src/services/testExplorerService'
import { packageManagerService } from '../src/services/packageManagerService'
import { bundleAnalyzerService } from '../src/services/bundleAnalyzerService'

describe('Phase R2-6: Core IDE Subsystems (LSP, Diagnostics, Formatter, Search, Tasks, Tests, Packages, Bundle)', () => {
  const origWindow = (globalThis as any).window

  afterEach(() => {
    diagnosticsService.clearAll()
    globalSearchService.setWorkspaceRoot(undefined)
    if (origWindow === undefined) {
      delete (globalThis as any).window
    } else {
      ;(globalThis as any).window = origWindow
    }
  })

  it('LSP Content-Length framing round-trips JSON-RPC payloads cleanly', () => {
    const buf = encodeLspMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
    const decoded = decodeLspMessages(buf)
    expect(decoded.messages).toHaveLength(1)
    expect(decoded.messages[0].method).toBe('initialize')
    expect(decoded.remainder.length).toBe(0)
  })

  it('lspService findReferences skips comments and string literals', () => {
    lspService.registerWorkspace(() => ({
      'src/app.ts': [
        'const targetSym = 1',
        '// targetSym in comment',
        'const s = "targetSym in string"',
        'export const doubled = targetSym * 2',
      ].join('\n'),
    }))
    const refs = lspService.findReferences('targetSym')
    expect(refs).toHaveLength(2)
    expect(refs.map((r) => r.lineNumber)).toEqual([1, 4])
  })

  it('diagnosticsService avoids Python multiline and CSS pseudo-class false positives and parses real tsc output', async () => {
    const pyDiags = diagnosticsService.analyzeCode('a.py', 'a.py', 'def compute(\n    x,\n    y\n):\n    return x + y\n', 'python')
    expect(pyDiags.filter((d) => d.code === 'E999')).toHaveLength(0)

    const cssDiags = diagnosticsService.analyzeCode('a.css', 'a.css', 'a:hover,\n.btn:focus {\n  color: red;\n}\n', 'css')
    expect(cssDiags).toHaveLength(0)

    ;(globalThis as any).window = {
      electronAPI: {
        workspace: {
          execCommand: vi.fn().mockResolvedValue({
            exitCode: 2,
            stdout: "src/foo.ts(12,5): error TS2322: Type 'string' is not assignable to type 'number'.\n",
            stderr: '',
            durationMs: 120,
            timedOut: false,
          }),
        },
      },
    }
    const count = await diagnosticsService.runWorkspaceDiagnostics('/repo', 'tsc')
    expect(count).toBe(1)
    const groups = diagnosticsService.getAllGroups()
    expect(groups.some((g) => g.fileName === 'foo.ts' && g.items[0].code === 'TS2322')).toBe(true)
  })

  it('formatterService honors endOfLine CRLF option', async () => {
    const res = await formatterService.formatDocument('{"a":1,"b":2}', 'json', { endOfLine: 'crlf' })
    expect(res.formatted).toContain('\r\n')
  })

  it('globalSearchService merges disk searchText matches for closed workspace files', async () => {
    globalSearchService.registerWorkspace(() => ({
      '/repo/open.ts': 'const needle = 1\n',
    }))
    globalSearchService.setWorkspaceRoot('/repo')
    ;(globalThis as any).window = {
      electronAPI: {
        workspace: {
          searchText: vi.fn().mockResolvedValue([
            { filePath: '/repo/closed.ts', relativePath: 'closed.ts', lineNumber: 7, lineText: 'return needle + 1' },
          ]),
        },
      },
    }
    const summary = await globalSearchService.search('needle')
    expect(summary.totalFiles).toBe(2)
    expect(summary.fileResults.some((f) => f.filePath === '/repo/closed.ts')).toBe(true)
  })

  it('taskLaunchConfigService loads real .vscode/tasks.json and executes via Electron workspace CLI', async () => {
    const execCommand = vi.fn().mockResolvedValue({ exitCode: 0, stdout: 'built ok', stderr: '', durationMs: 42, timedOut: false })
    ;(globalThis as any).window = {
      electronAPI: {
        readFile: vi.fn().mockImplementation(async (p: string) => {
          if (p.endsWith('tasks.json')) {
            return '// comment\n{"version":"2.0.0","tasks":[{"label":"custom-build","type":"shell","command":"echo hi"}]}'
          }
          throw new Error('ENOENT')
        }),
        workspace: { execCommand },
      },
    }
    const loaded = await taskLaunchConfigService.loadFromWorkspace('/repo')
    expect(loaded.tasksLoaded).toBe(true)
    const tasks = taskLaunchConfigService.getTasks()
    expect(tasks[0].label).toBe('custom-build')

    const runRes = await taskLaunchConfigService.executeTask(tasks[0], { workspaceFolder: '/repo' })
    expect(execCommand).toHaveBeenCalledWith(expect.objectContaining({ command: 'echo hi', cwd: '/repo' }))
    expect(runRes.status).toBe('success')
    expect(runRes.outputLogs.join('\n')).toContain('built ok')
  })

  it('testExplorerService parses Rust #[test] and Vitest JSON reporter per-test results', async () => {
    testExplorerService.registerWorkspace(() => ({
      'tests/math.rs': '#[test]\nfn test_add() {}\n',
      'test/sample.test.ts': "import { it } from 'vitest'\nit('passes one', () => {})\nit('fails two', () => {})\n",
    }))
    const state = testExplorerService.getState()
    expect(state.files.some((f) => f.framework === 'cargotest')).toBe(true)

    ;(globalThis as any).window = {
      electronAPI: {
        workspace: {
          execCommand: vi.fn().mockResolvedValue({
            exitCode: 1,
            stdout: JSON.stringify({
              testResults: [
                {
                  assertionResults: [
                    { title: 'passes one', status: 'passed', duration: 4 },
                    { title: 'fails two', status: 'failed', duration: 9, failureMessages: ['Expected 1 to be 2'] },
                  ],
                },
              ],
            }),
            stderr: '',
            durationMs: 25,
            timedOut: false,
          }),
        },
      },
    }
    const fileRes = await testExplorerService.runFile('test/sample.test.ts')
    expect(fileRes?.directTests.find((t) => t.name === 'passes one')?.status).toBe('passed')
    const failedTest = fileRes?.directTests.find((t) => t.name === 'fails two')
    expect(failedTest?.status).toBe('failed')
    expect(failedTest?.errorMessage).toContain('Expected 1 to be 2')
  })

  it('packageManagerService has zero Math.random versions and parses live npm outdated + audit JSON', async () => {
    const manifest = packageManagerService.parseManifest('package.json', JSON.stringify({ dependencies: { axios: '^1.7.0' } }))
    expect(manifest.dependencies[0].isOutdated).toBe(false)
    expect(manifest.dependencies[0].vulnerabilitiesCount).toBe(0)

    ;(globalThis as any).window = {
      electronAPI: {
        readFile: vi.fn().mockResolvedValue(JSON.stringify({ dependencies: { axios: '^1.7.0' } })),
        workspace: {
          execCommand: vi.fn().mockImplementation(async ({ command }: { command: string }) => {
            if (command.includes('outdated')) {
              return { exitCode: 1, stdout: JSON.stringify({ axios: { current: '1.7.0', latest: '1.8.0' } }), stderr: '', durationMs: 10, timedOut: false }
            }
            return { exitCode: 1, stdout: JSON.stringify({ vulnerabilities: { axios: { severity: 'high', via: ['advisory-1'] } } }), stderr: '', durationMs: 10, timedOut: false }
          }),
        },
      },
    }
    const live = await packageManagerService.scanWorkspaceAsync('/repo', { runOutdated: true, runAudit: true })
    expect(live?.outdatedCount).toBe(1)
    expect(live?.dependencies[0].latestVersion).toBe('1.8.0')
    expect(live?.vulnerabilitiesCount).toBe(1)
    expect(live?.dependencies[0].highestSeverity).toBe('high')
  })

  it('bundleAnalyzerService fetches real import cost via Bundlephobia API and taskRunnerService adds custom tasks', async () => {
    ;(globalThis as any).window = {
      electronAPI: {
        infra: {
          httpRequest: vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: {},
            latencyMs: 15,
            sizeBytes: 100,
            body: JSON.stringify({ name: 'zod', size: 51200, gzip: 14336, hasJSModule: true, hasSideEffects: false }),
          }),
        },
      },
    }
    const est = await bundleAnalyzerService.estimateImportCostAsync('zod')
    expect(est.packageName).toBe('zod')
    expect(est.sizeKb).toBe(50)
    expect(est.gzipKb).toBe(14)
    expect(est.treeShakeable).toBe(true)

    const added = taskRunnerService.addCustomTask('typecheck', 'npx tsc --noEmit')
    expect(taskRunnerService.getTasks().some((t) => t.id === added.id)).toBe(true)
  })
})

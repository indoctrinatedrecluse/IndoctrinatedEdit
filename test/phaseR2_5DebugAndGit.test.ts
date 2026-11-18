import { describe, it, expect, afterEach, vi } from 'vitest'
import { parseDapMessages, encodeDapMessage } from '../electron/debug-adapter-service'
import { listBranches, getRemoteInfo, showCommitDetails } from '../electron/git-service'
import { debugService } from '../src/services/debugService'
import { gitAdvancedService } from '../src/services/gitAdvancedService'
import { gitWorkflowService } from '../src/services/gitWorkflowService'

describe('Phase R2-5: Real Debugger (CDP/DAP) & Real Git / Actions / 3-Way Merge', () => {
  const origWindow = (globalThis as any).window

  afterEach(() => {
    debugService.stopDebugging()
    if (origWindow === undefined) {
      delete (globalThis as any).window
    } else {
      ;(globalThis as any).window = origWindow
    }
  })

  it('DAP Content-Length framing encodes and decodes multi-message and partial chunks cleanly', () => {
    const m1 = encodeDapMessage({ seq: 1, type: 'request', command: 'initialize' })
    const m2 = encodeDapMessage({ seq: 2, type: 'event', event: 'stopped', body: { reason: 'breakpoint' } })
    const combined = Buffer.concat([m1, m2])

    // Split right in the middle of m2
    const part1 = combined.subarray(0, m1.length + 12)
    const part2 = combined.subarray(m1.length + 12)

    const r1 = parseDapMessages(part1)
    expect(r1.messages).toHaveLength(1)
    expect(r1.messages[0].command).toBe('initialize')
    expect(r1.remainder.length).toBe(12)

    const r2 = parseDapMessages(Buffer.concat([r1.remainder, part2]))
    expect(r2.messages).toHaveLength(1)
    expect(r2.messages[0].event).toBe('stopped')
    expect(r2.remainder.length).toBe(0)
  })

  it('debugService delegates launch, pause events, stepping, and evaluation to Electron debug IPC', async () => {
    let listener: ((ev: any) => void) | null = null
    const start = vi.fn().mockResolvedValue({ ok: true, sessionId: 'dbg_1' })
    const stepOver = vi.fn().mockResolvedValue(true)
    const evaluate = vi.fn().mockResolvedValue({ value: '42', type: 'number' })
    const stop = vi.fn().mockResolvedValue(true)

    ;(globalThis as any).window = {
      electronAPI: {
        debug: {
          start,
          stepOver,
          evaluate,
          stop,
          setBreakpoints: vi.fn().mockResolvedValue(true),
          setExceptionBreakpoints: vi.fn().mockResolvedValue(true),
          onEvent: (cb: any) => {
            listener = cb
            return () => {
              listener = null
            }
          },
        },
      },
    }

    await debugService.startDebugging('d:/Projects/IndoctrinatedEdit/app.js', 'd:/Projects/IndoctrinatedEdit')
    expect(start).toHaveBeenCalledWith(expect.objectContaining({ filePath: 'd:/Projects/IndoctrinatedEdit/app.js' }))

    listener?.({
      type: 'paused',
      sessionId: 'dbg_1',
      reason: 'breakpoint',
      frames: [{ id: 'cf_0', name: 'main', filePath: 'd:/Projects/IndoctrinatedEdit/app.js', line: 10, column: 1 }],
      threads: [
        {
          id: 'th_main',
          name: 'Node Main',
          status: 'paused',
          isCurrent: true,
          stackFrames: [{ id: 'cf_0', name: 'main', filePath: 'd:/Projects/IndoctrinatedEdit/app.js', line: 10, column: 1 }],
          activeFrameId: 'cf_0',
        },
      ],
      variables: [{ id: 'v1', name: 'answer', value: '42', type: 'number', scope: 'local', isEditable: true }],
    })

    expect(debugService.getSessionState()).toBe('paused')
    expect(debugService.getVariables().find((v) => v.name === 'answer')?.value).toBe('42')

    await debugService.stepOver()
    expect(stepOver).toHaveBeenCalledTimes(1)

    debugService.evaluateConsoleInput('answer')
    expect(evaluate).toHaveBeenCalledWith('answer', 'cf_0')

    debugService.stopDebugging()
    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('real git-service lists branches, remote info, and commit details for current workspace', async () => {
    const cwd = process.cwd()
    const br = await listBranches(cwd)
    expect(br.local.length).toBeGreaterThan(0)
    expect(br.current.length).toBeGreaterThan(0)

    const remote = await getRemoteInfo(cwd)
    expect(typeof remote.url).toBe('string')

    const headDetail = await showCommitDetails(cwd, 'HEAD')
    expect(headDetail.stat.length).toBeGreaterThan(0)
    expect(Array.isArray(headDetail.files)).toBe(true)
  })

  it('gitAdvancedService builds unified patches for real hunk staging/unstaging and resolves diff3 conflicts', async () => {
    const applyPatch = vi.fn().mockResolvedValue({ success: true })
    ;(globalThis as any).window = {
      electronAPI: { git: { applyPatch } },
    }

    const oldText = 'const a = 1\nconst b = 2\n'
    const newText = 'const a = 1\nconst b = 99\n'
    const hunks = gitAdvancedService.calculateHunks('src/demo.ts', oldText, newText)
    expect(hunks.length).toBe(1)

    const stageRes = await gitAdvancedService.stageHunkAsync(hunks[0], oldText, newText, '/repo')
    expect(stageRes.success).toBe(true)
    expect(applyPatch).toHaveBeenCalledWith(
      expect.stringContaining('-const b = 2\n+const b = 99'),
      expect.objectContaining({ cached: true, cwd: '/repo' })
    )

    const unstageRes = await gitAdvancedService.unstageHunkAsync(hunks[0], oldText, newText, '/repo')
    expect(unstageRes.success).toBe(true)
    expect(applyPatch).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ cached: true, reverse: true, cwd: '/repo' })
    )

    const diff3 = [
      'header()',
      '<<<<<<< HEAD',
      'const mode = "fast"',
      '||||||| merged common ancestors',
      'const mode = "default"',
      '=======',
      'const mode = "safe"',
      '>>>>>>> feature/safe',
      'footer()',
    ].join('\n')
    const conflicts = gitAdvancedService.parseConflicts('a.ts', diff3)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].baseText).toBe('const mode = "default"')
    const customResolved = gitAdvancedService.resolveConflictInContent(diff3, conflicts[0], 'custom', 'const mode = "balanced"')
    expect(customResolved).toContain('const mode = "balanced"')
    expect(customResolved).not.toContain('<<<<<<<')
  })

  it('gitWorkflowService discovers real workspace YAML workflows and GitHub API runs', async () => {
    ;(globalThis as any).window = {
      electronAPI: {
        workspace: {
          findFiles: vi.fn().mockResolvedValue([
            { name: 'ci.yml', path: '/repo/.github/workflows/ci.yml', relativePath: '.github/workflows/ci.yml', sizeBytes: 120 },
          ]),
          execCommand: vi.fn().mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'gh not installed', durationMs: 5, timedOut: false }),
        },
        readFile: vi.fn().mockResolvedValue('name: Real CI Pipeline\non: [push, workflow_dispatch]\njobs:\n  test:\n    runs-on: ubuntu-latest'),
        git: {
          remoteInfo: vi.fn().mockResolvedValue({ url: 'https://github.com/acme/editor.git', owner: 'acme', repo: 'editor' }),
        },
        infra: {
          httpRequest: vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: {},
            latencyMs: 12,
            sizeBytes: 200,
            body: JSON.stringify({
              workflow_runs: [
                {
                  id: 987654,
                  name: 'Real CI Pipeline',
                  path: '.github/workflows/ci.yml',
                  run_number: 77,
                  event: 'push',
                  status: 'completed',
                  conclusion: 'success',
                  head_branch: 'main',
                  head_sha: 'deadbeef123456',
                  display_title: 'fix: real workflow sync',
                  actor: { login: 'octocat' },
                  created_at: '2026-11-18T10:00:00Z',
                },
              ],
            }),
          }),
        },
      },
    }

    await gitWorkflowService.loadWorkspaceWorkflows('/repo')
    expect(gitWorkflowService.getDataSource()).toBe('github-api')
    expect(gitWorkflowService.getWorkflows()[0].name).toBe('Real CI Pipeline')
    expect(gitWorkflowService.getRuns()[0].id).toBe('987654')
    expect(gitWorkflowService.getRuns()[0].actor.name).toBe('octocat')
  })
})

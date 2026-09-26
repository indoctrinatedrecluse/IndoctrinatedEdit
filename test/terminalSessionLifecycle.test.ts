import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  TerminalService,
  TerminalExitInfo,
  TerminalSessionExitEvent,
} from '../src/services/terminalService'
import {
  parseProcessPairs,
  collectDescendantPids,
  TerminalService as MainTerminalService,
} from '../electron/terminal-service'

/* --------------------------------------------------------------------------
 * `child_process` is stubbed so the main-process teardown can be observed
 * without launching real taskkill / PowerShell processes.
 * ------------------------------------------------------------------------ */
const { cpState } = vi.hoisted(() => ({
  cpState: { order: [] as string[], enumerateStdout: '' },
}))

vi.mock('child_process', () => ({
  spawn: vi.fn(() => {
    const child: any = { on: () => child, unref: () => {} }
    return child
  }),
  spawnSync: vi.fn((cmd: string, args: string[] = []) => {
    if (String(cmd).toLowerCase().includes('taskkill')) {
      cpState.order.push(`taskkill ${args.join(' ')}`)
    } else if (args.includes('-NoProfile')) {
      cpState.order.push('enumerate')
    } else {
      cpState.order.push(`${cmd} ${args.join(' ')}`)
    }
    return {
      stdout: args.includes('-NoProfile') ? cpState.enumerateStdout : '',
      stderr: '',
      status: 0,
      signal: null,
      pid: 0,
      output: [],
    }
  }),
  // The background orphan sweep must never run for real during tests.
  execFile: vi.fn((_cmd: string, _args: string[], _opts: unknown, cb?: () => void) => {
    if (typeof cb === 'function') return
  }),
}))

const repoFile = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8')

/** Production code uses the singleton; tests take a fresh instance for isolation. */
const freshMainService = (): MainTerminalService =>
  new (MainTerminalService as unknown as { new (): MainTerminalService })()

const freshRendererService = (): TerminalService =>
  new (TerminalService as unknown as { new (): TerminalService })()

/** Reaches into the private session map to install a fake session. */
const sessionsOf = (svc: MainTerminalService) =>
  svc as unknown as {
    sessions: Map<string, { process: any; isPty: boolean; info: any }>
  }

const fakeSession = (id: string, pid: number, kill: () => void) => ({
  process: { pid, write: () => true, resize: () => {}, kill },
  isPty: true,
  info: {
    id,
    shellId: 'cmd',
    shellName: 'Command Prompt',
    pid,
    cwd: process.cwd(),
    pty: true,
    backend: 'conpty' as const,
  },
})


describe('Terminal session lifecycle: clean exit, kill and orphan reaping', () => {
  beforeEach(() => {
    cpState.order.length = 0
    cpState.enumerateStdout = ''
  })

  describe('Windows process-tree primitives', () => {
    it('parses the PowerShell pid/ppid snapshot', () => {
      const output = [
        'ProcessId ParentProcessId',
        '1234 987',
        '',
        '5678 1234',
        'garbage line',
        '9999   111  ',
      ].join('\r\n')

      expect(parseProcessPairs(output)).toEqual([
        [1234, 987],
        [5678, 1234],
        [9999, 111],
      ])
    })

    it('returns no pairs for empty or unparsable output', () => {
      expect(parseProcessPairs('')).toEqual([])
      expect(parseProcessPairs('not a process list\nat all')).toEqual([])
    })

    it('collects children and grandchildren of a root process', () => {
      const pairs: Array<[number, number]> = [
        [2, 1],
        [3, 1],
        [4, 2],
        [5, 4],
        [7, 9], // unrelated tree must not be touched
      ]

      expect(collectDescendantPids(1, pairs).sort((a, b) => a - b)).toEqual([2, 3, 4, 5])
    })

    it('still finds the children of a shell that already exited', () => {
      // User typed `exit`: the root is gone from the snapshot, but Windows keeps
      // the original ParentProcessId on the orphaned children - which is exactly
      // the case `taskkill /T` on a dead root cannot handle.
      const pairs: Array<[number, number]> = [
        [42, 1],
        [43, 42],
      ]

      expect(collectDescendantPids(1, pairs).sort((a, b) => a - b)).toEqual([42, 43])
    })

    it('terminates instead of looping when a parent chain cycles', () => {
      const pairs: Array<[number, number]> = [
        [2, 1],
        [3, 2],
        [1, 3],
      ]

      expect(new Set(collectDescendantPids(1, pairs))).toEqual(new Set([2, 3]))
    })

    it('reports nothing for a process without descendants', () => {
      expect(collectDescendantPids(77, [[2, 1]])).toEqual([])
    })
  })

  describe('Kill ordering - the tree must die before the pseudo-console closes', () => {
    const isWindows = process.platform === 'win32'

    it.skipIf(!isWindows)('runs taskkill /T on the live root before pty.kill()', () => {
      const svc = freshMainService()
      const order = cpState.order
      sessionsOf(svc).sessions.set('term-1', fakeSession('term-1', 4242, () => order.push('pty.kill')))

      expect(svc.kill('term-1')).toBe(true)

      const treeKillIndex = order.findIndex((c) => c.startsWith('taskkill') && c.includes('/T'))
      const ptyKillIndex = order.indexOf('pty.kill')

      // Regression: the old implementation closed the pty first, so the follow-up
      // `taskkill /T` could no longer resolve the (now dead) root's child chain -
      // every grandchild survived as an orphan.
      expect(treeKillIndex).toBeGreaterThan(-1)
      expect(ptyKillIndex).toBeGreaterThan(-1)
      expect(treeKillIndex).toBeLessThan(ptyKillIndex)

      expect(order[treeKillIndex]).toContain('/F')
      expect(order[treeKillIndex]).toContain('/PID 4242')
      expect(sessionsOf(svc).sessions.size).toBe(0)
    })

    it.skipIf(!isWindows)('reaps descendants found in the process snapshot', () => {
      const svc = freshMainService()
      // PID 11 is the shell; 500/600 are its descendants, 700 is unrelated.
      cpState.enumerateStdout = '500 11\r\n600 500\r\n700 999\r\n'
      sessionsOf(svc).sessions.set('term-1', fakeSession('term-1', 11, () => {}))

      svc.killAll()

      const calls = cpState.order.filter((c) => c.startsWith('taskkill'))
      expect(calls).toContain('taskkill /F /T /PID 11')
      expect(calls).toContain('taskkill /F /PID 500')
      expect(calls).toContain('taskkill /F /PID 600')
      expect(calls.some((c) => c.includes('700'))).toBe(false)
    })

    it('enumerates the process tree once for a multi-session teardown', () => {
      const svc = freshMainService()
      sessionsOf(svc).sessions.set('term-a', fakeSession('term-a', 100, () => {}))
      sessionsOf(svc).sessions.set('term-b', fakeSession('term-b', 200, () => {}))

      svc.killAll()

      expect(cpState.order.filter((c) => c === 'enumerate')).toHaveLength(1)

      const calls = cpState.order.filter((c) => c.startsWith('taskkill'))
      expect(calls).toContain('taskkill /F /T /PID 100')
      expect(calls).toContain('taskkill /F /T /PID 200')
      expect(sessionsOf(svc).sessions.size).toBe(0)
    })

    it('marks a session as terminating so onExit reports it as killed', () => {
      const svc = freshMainService()
      const internals = svc as unknown as { terminatingSessions: Set<string> }
      sessionsOf(svc).sessions.set('term-2', fakeSession('term-2', 5150, () => {}))

      svc.kill('term-2')

      // The flag outlives the session record because node-pty fires `onExit`
      // asynchronously *after* the kill was issued.
      expect(internals.terminatingSessions.has('term-2')).toBe(true)
    })

    it('treats a re-kill of an unknown session as a no-op', () => {
      const svc = freshMainService()
      expect(svc.kill('does-not-exist')).toBe(false)
    })
  })
})


describe('Renderer session-exit handling', () => {
  type ExitPayload = { id: string; code: number | null; signal?: string | null; reason?: 'exited' | 'killed' }

  interface FakeBridge {
    service: TerminalService
    killCalls: string[]
    emitExit: (payload: ExitPayload) => void
    emitData: (id: string, data: string) => void
  }

  const installRendererBridge = async (ids: string[]): Promise<FakeBridge> => {
    const service = freshRendererService()
    const killCalls: string[] = []
    const pendingIds = [...ids]
    let exitHandler: ((payload: any) => void) | null = null
    let dataHandler: ((payload: any) => void) | null = null

    service.setElectronAPI({
      platform: 'win32',
      terminal: {
        detectShells: vi.fn().mockResolvedValue([
          { id: 'cmd', name: 'Command Prompt', path: 'C:\\Windows\\System32\\cmd.exe', icon: 'cmd', isDefault: true },
        ]),
        getConfig: vi.fn().mockResolvedValue(service.getDefaultConfig()),
        getDiagnostics: vi.fn().mockResolvedValue({
          ptyAvailable: true,
          ptyLoadError: null,
          backend: 'conpty',
          osBuild: 26200,
          platform: 'win32',
          activeSessions: 0,
        }),
        create: vi.fn().mockImplementation(async () => ({
          id: pendingIds.shift() ?? `term-${Math.random().toString(36).slice(2)}`,
          shellId: 'cmd',
          shellName: 'Command Prompt',
          pid: 4242,
          cwd: process.cwd(),
          pty: true,
          backend: 'conpty',
          osBuild: 26200,
        })),
        kill: vi.fn().mockImplementation(async (id: string) => {
          killCalls.push(id)
          return true
        }),
        write: vi.fn().mockResolvedValue(true),
        onData: vi.fn().mockImplementation((cb: (payload: any) => void) => {
          dataHandler = cb
          return () => {}
        }),
        onExit: vi.fn().mockImplementation((cb: (payload: any) => void) => {
          exitHandler = cb
          return () => {}
        }),
      },
    })

    await service.initialize()

    return {
      service,
      killCalls,
      emitExit: (payload) => exitHandler?.({ signal: null, ...payload }),
      emitData: (id, data) => dataHandler?.({ id, data }),
    }
  }

  it('closes the tab when the user types exit', async () => {
    const bridge = await installRendererBridge(['term-exit'])
    const tab = await bridge.service.createTab()
    expect(tab.id).toBe('term-exit')

    const events: TerminalSessionExitEvent[] = []
    bridge.service.onSessionExit((event) => events.push(event))

    bridge.emitExit({ id: 'term-exit', code: 0, reason: 'exited' })

    expect(bridge.service.getTabs()).toHaveLength(0)
    expect(bridge.service.getActiveTab()).toBeNull()
    expect(events).toEqual([
      { id: 'term-exit', code: 0, signal: null, reason: 'exited' },
    ])
  })

  it('moves the active tab to a surviving session when one exits', async () => {
    const bridge = await installRendererBridge(['term-a', 'term-b'])
    await bridge.service.createTab()
    await bridge.service.createTab()
    expect(bridge.service.getActiveTab()?.id).toBe('term-b')

    bridge.emitExit({ id: 'term-b', code: 0, reason: 'exited' })

    expect(bridge.service.getTabs().map((t) => t.id)).toEqual(['term-a'])
    expect(bridge.service.getActiveTab()?.id).toBe('term-a')
  })

  it('leaves tab bookkeeping to closeTab when the app kills the session', async () => {
    const bridge = await installRendererBridge(['term-kill'])
    await bridge.service.createTab()

    const events: TerminalSessionExitEvent[] = []
    bridge.service.onSessionExit((event) => events.push(event))

    bridge.emitExit({ id: 'term-kill', code: null, reason: 'killed' })

    // The app-initiated path removes the tab explicitly via closeTab(), so the
    // exit event must not race it - but the reason must still be reported.
    expect(bridge.service.getTabs().map((t) => t.id)).toEqual(['term-kill'])
    expect(events[0].reason).toBe('killed')
  })

  it('delivers the exit code and reason to per-tab listeners', async () => {
    const bridge = await installRendererBridge(['term-1'])
    await bridge.service.createTab()

    const seen: Array<[number | null, TerminalExitInfo]> = []
    bridge.service.onExit('term-1', (code, info) => seen.push([code, info]))

    bridge.emitExit({ id: 'term-1', code: 130, reason: 'exited' })

    expect(seen).toEqual([[130, { code: 130, signal: null, reason: 'exited' }]])
  })

  it('releases buffered output for an exited tab', async () => {
    const bridge = await installRendererBridge(['term-buf'])
    const tab = await bridge.service.createTab()

    bridge.emitData(tab.id, 'hello world')
    expect(bridge.service.getRawBuffer(tab.id)).toBe('hello world')

    bridge.emitExit({ id: tab.id, code: 0, reason: 'exited' })

    expect(bridge.service.getRawBuffer(tab.id)).toBe('')
  })

  it('defaults a missing exit reason to exited for older payloads', async () => {
    const bridge = await installRendererBridge(['term-legacy'])
    await bridge.service.createTab()

    bridge.emitExit({ id: 'term-legacy', code: 0 })

    expect(bridge.service.getTabs()).toHaveLength(0)
  })

  it('kills the session through the bridge and then drops the tab', async () => {
    const bridge = await installRendererBridge(['term-close'])
    const tab = await bridge.service.createTab()

    await bridge.service.closeTab(tab.id)

    expect(bridge.killCalls).toEqual([tab.id])
    expect(bridge.service.getTabs()).toHaveLength(0)
  })
})


describe('Terminal terminate entry points are all wired to the same teardown', () => {
  const viewSrc = () => repoFile('src/components/Terminal/TerminalView.tsx')
  const mainSrc = () => repoFile('electron/main.ts')
  const serviceSrc = () => repoFile('electron/terminal-service.ts')

  it('subscribes the terminal view to session exits so a dead pane closes itself', () => {
    expect(viewSrc()).toContain('terminalService.onSessionExit(')
  })

  it('routes the Kill Terminal power button through handleCloseTab', () => {
    const src = viewSrc()
    const killButton = src.slice(src.indexOf('term-icon-btn kill-btn'))
    expect(killButton.slice(0, 300)).toContain('handleCloseTab(activeTab.id')
  })

  it('routes the tab cross button through handleCloseTab', () => {
    const src = viewSrc()
    const closeButton = src.slice(src.indexOf('tab-close-btn'))
    expect(closeButton.slice(0, 300)).toContain('handleCloseTab(tab.id')
  })

  it('tears terminals down when the app window is closed or the app quits', () => {
    const src = mainSrc()
    const count = src.split('terminalService.killAll()').length - 1

    // window:close IPC handler + win.on('close') + before-quit + will-quit + window-all-closed
    expect(count).toBeGreaterThanOrEqual(5)
    expect(src).toContain("win.on('close'")
    expect(src).toContain("app.on('before-quit'")
    expect(src).toContain("app.on('will-quit'")
    expect(src).toContain("app.on('window-all-closed'")
  })

  it('reports why a session ended and reaps orphans when a shell exits by itself', () => {
    const src = serviceSrc()
    // Both the ConPTY path and the pipe fallback must distinguish `exit` from a kill.
    expect(src.split("reason: intentional ? 'killed' : 'exited'").length - 1).toBe(2)
    // definition + killSession + pty onExit + pipe 'close'
    expect(src.split('this.reapOrphansAsync(').length - 1).toBeGreaterThanOrEqual(3)
  })

  it('releases the pseudo-console when a shell exits by itself', () => {
    const src = serviceSrc()
    const onExitBlock = src.slice(
      src.indexOf('ptyProc.onExit('),
      src.indexOf('// Fallback: standard child_process.spawn')
    )
    expect(onExitBlock).toContain('ptyProc.kill()')
    expect(onExitBlock).toContain('this.reapOrphansAsync(sessionInfo.pid)')
  })

  it('kills deterministically on quit instead of racing app.exit()', () => {
    const src = serviceSrc()
    expect(src).toContain("spawnSync('taskkill'")

    // killAll() must snapshot the process table once and bail out when idle, so
    // the four teardown hooks stay cheap and quitting never awaits async kills.
    const killAll = src.slice(src.indexOf('public killAll()'))
    expect(killAll).toContain('if (sessionIds.length === 0) return')
    expect(killAll).toContain('queryProcessPairsSync()')
    expect(killAll).toContain('this.killSession(id, pairs)')
  })
})

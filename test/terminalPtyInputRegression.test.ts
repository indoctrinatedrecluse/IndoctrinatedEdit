import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { terminalService } from '../src/services/terminalService'

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8')

/** Drops block and line comments so source-scanning assertions can't match prose. */
const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join('\n')

describe('Terminal PTY & TUI input regression suite', () => {
  beforeEach(() => {
    terminalService.setElectronAPI(null)
    vi.restoreAllMocks()
  })

  describe('ESM native-module loading (root cause of the dead cmd.exe / broken PowerShell input)', () => {
    it('should resolve node-pty through createRequire instead of a bare require', () => {
      const src = read('electron/terminal-service.ts')
      expect(src).toContain('createRequire(import.meta.url)')

      // The Electron main process is bundled as ESM. A bare CommonJS `require()`
      // call there throws "ReferenceError: require is not defined", which the
      // surrounding try/catch swallowed - silently disabling the pseudo-console.
      const code = stripComments(src)
      expect(/(^|[^\w.$])require\s*\(/.test(code)).toBe(false)
      expect(code).toContain("requireFromMain('node-pty')")
    })

    it('should not use a bare require for preload discovery in the ESM main process', () => {
      const src = read('electron/main.ts')
      expect(src).toContain("from 'node:fs'")
      expect(stripComments(src)).not.toMatch(/require\s*\(/)
    })

    it('should ship and unpack the node-pty native binaries for packaged builds', () => {
      const pkg = JSON.parse(read('package.json'))
      expect(pkg.build.files).toContain('node_modules/node-pty/**/*')
      expect(pkg.build.asarUnpack).toContain('node_modules/node-pty/**/*')
    })
  })

  describe('xterm.js configuration for real pseudo-consoles and full-screen TUIs', () => {
    it('should never enable convertEol (it corrupts TUI cursor addressing)', () => {
      const src = read('src/components/Terminal/TerminalView.tsx')
      expect(src).not.toMatch(/^\s*convertEol\s*:\s*true/m)
    })

    it('should not hard-code a fake ConPTY build number', () => {
      const src = read('src/components/Terminal/TerminalView.tsx')
      expect(src).not.toMatch(/buildNumber\s*:\s*22000/)
      expect(src).toContain('tab.ptyBackend')
      expect(src).toContain('tab.osBuild')
    })

    it('should mark the active pane for raw TUI key routing', () => {
      const src = read('src/components/Terminal/TerminalView.tsx')
      expect(src).toContain('data-tui-active')
    })

    it('should stop workbench accelerators from stealing keys from a live TUI', () => {
      const shortcuts = read('src/hooks/useKeyboardShortcuts.ts')
      expect(shortcuts).toContain('[data-tui-active="true"]')
      expect(shortcuts).toContain('if (inTuiPane) return')
    })
  })


  describe('TUI alternate-screen detection and key routing', () => {
    it('should notify subscribers when a TUI enters and leaves the alternate screen buffer', async () => {
      const tab = await terminalService.createTab()
      const events: Array<[boolean, string]> = []
      const unsubscribe = terminalService.onTuiState('*', (active, id) => events.push([active, id]))

      terminalService.appendOutput(tab.id, '\x1b[?1049h\x1b[2J\x1b[H=== IR PMON TUI SYSTEM MONITOR ===\r\n')
      expect(terminalService.isTuiActive(tab.id)).toBe(true)

      terminalService.appendOutput(tab.id, '\x1b[?1049l')
      expect(terminalService.isTuiActive(tab.id)).toBe(false)

      expect(events).toEqual([
        [true, tab.id],
        [false, tab.id],
      ])
      unsubscribe()
    })

    it('should not re-notify listeners while the TUI state is unchanged', async () => {
      const tab = await terminalService.createTab()
      const events: boolean[] = []
      const unsubscribe = terminalService.onTuiState(tab.id, (active) => events.push(active))

      terminalService.appendOutput(tab.id, '\x1b[?1049h')
      terminalService.appendOutput(tab.id, '\x1b[HCPU: 42%\r\n')
      terminalService.appendOutput(tab.id, '\x1b[HCPU: 43%\r\n')
      expect(events).toEqual([true])

      terminalService.appendOutput(tab.id, '\x1b[?1049l')
      expect(events).toEqual([true, false])
      unsubscribe()
    })

    it('should emit exactly one event per manual setTuiActive transition', async () => {
      const tab = await terminalService.createTab()
      const seen: boolean[] = []
      const unsubscribe = terminalService.onTuiState(tab.id, (active) => seen.push(active))

      terminalService.setTuiActive(tab.id, true)
      terminalService.setTuiActive(tab.id, true)
      terminalService.setTuiActive(tab.id, false)

      expect(seen).toEqual([true, false])
      expect(terminalService.isTuiActive(tab.id)).toBe(false)
      unsubscribe()
    })

    it('should stop notifying after unsubscribe', async () => {
      const tab = await terminalService.createTab()
      const seen: boolean[] = []
      const unsubscribe = terminalService.onTuiState(tab.id, (active) => seen.push(active))
      unsubscribe()

      terminalService.setTuiActive(tab.id, true)
      expect(seen).toEqual([])
    })

    it('should dispatch raw TUI key sequences for navigation, quit and interrupt', async () => {
      const tab = await terminalService.createTab()
      const writes: string[] = []
      terminalService.setElectronAPI({
        terminal: {
          write: async (_id: string, data: string) => {
            writes.push(data)
            return true
          },
        },
      })

      const cases: Array<[string, string]> = [
        ['up', '\x1b[A'],
        ['arrowdown', '\x1b[B'],
        ['arrowleft', '\x1b[D'],
        ['arrowright', '\x1b[C'],
        ['pgup', '\x1b[5~'],
        ['pgdn', '\x1b[6~'],
        ['home', '\x1b[H'],
        ['end', '\x1b[F'],
        ['q', 'q'],
        ['ctrl-c', '\x03'],
        ['ctrl+d', '\x04'],
        ['enter', '\r'],
        ['escape', '\x1b'],
        ['space', ' '],
        ['tab', '\t'],
        ['shift+tab', '\x1b[Z'],
        ['backspace', '\x7f'],
      ]

      for (const [action] of cases) {
        await terminalService.sendTuiKey(tab.id, action)
      }

      expect(writes).toEqual(cases.map(([, seq]) => seq))
    })
  })

  describe('Pseudo-console health diagnostics', () => {
    it('should report a degraded pipe backend when the native bridge is absent', async () => {
      await terminalService.initialize()

      const diag = terminalService.getPtyDiagnostics()
      expect(diag.ptyAvailable).toBe(false)
      expect(diag.backend).toBe('pipe')
      expect(diag.ptyLoadError).toBeTruthy()
      expect(terminalService.isPtyAvailable()).toBe(false)
    })

    it('should surface the real backend reported by the native bridge', async () => {
      terminalService.setElectronAPI({
        platform: 'win32',
        terminal: {
          detectShells: vi.fn().mockResolvedValue([]),
          getConfig: vi.fn().mockResolvedValue(terminalService.getDefaultConfig()),
          getDiagnostics: vi.fn().mockResolvedValue({
            ptyAvailable: true,
            ptyLoadError: null,
            backend: 'conpty',
            osBuild: 26200,
            platform: 'win32',
            activeSessions: 0,
          }),
        },
      })

      await terminalService.initialize()

      const diag = terminalService.getPtyDiagnostics()
      expect(diag.ptyAvailable).toBe(true)
      expect(diag.backend).toBe('conpty')
      expect(diag.osBuild).toBe(26200)
      expect(terminalService.isPtyAvailable()).toBe(true)
    })

    it('should stamp spawned tabs with the negotiated backend so xterm can match it', async () => {
      terminalService.setElectronAPI({
        platform: 'win32',
        terminal: {
          detectShells: vi.fn().mockResolvedValue([
            {
              id: 'cmd',
              name: 'Command Prompt',
              path: 'C:\\Windows\\System32\\cmd.exe',
              icon: 'cmd',
              isDefault: true,
            },
          ]),
          getConfig: vi.fn().mockResolvedValue({
            ...terminalService.getDefaultConfig(),
            defaultShellId: 'cmd',
          }),
          getDiagnostics: vi.fn().mockResolvedValue({
            ptyAvailable: true,
            ptyLoadError: null,
            backend: 'conpty',
            osBuild: 26200,
            platform: 'win32',
            activeSessions: 0,
          }),
          create: vi.fn().mockResolvedValue({
            id: 'term-native-1',
            shellId: 'cmd',
            shellName: 'Command Prompt',
            cwd: 'D:\\Projects',
            pty: true,
            backend: 'conpty',
            osBuild: 26200,
          }),
        },
      })

      await terminalService.initialize()
      const tab = await terminalService.createTab({ shellId: 'cmd' })

      expect(tab.ptyBackend).toBe('conpty')
      expect(tab.osBuild).toBe(26200)
      // Tab metadata must survive the defensive copy handed to React.
      const [copy] = terminalService.getTabs().filter((t) => t.id === tab.id)
      expect(copy.ptyBackend).toBe('conpty')
    })
  })
})


import { describe, it, expect, vi, beforeEach } from 'vitest'
import { terminalService, TerminalService } from '../src/services/terminalService'
import { ShellProfile, TerminalConfig } from '../electron/preload'

describe('Terminal Subsystem Suite (Phase 1)', () => {
  beforeEach(() => {
    terminalService.setElectronAPI(null)
    vi.restoreAllMocks()
  })

  describe('1. Shell Profile Auto-Detection & Config', () => {
    it('should fallback to default profiles when native electronAPI is not present', async () => {
      const profiles = await terminalService.initialize()
      expect(profiles.length).toBeGreaterThan(0)
      expect(profiles.some((p) => p.id === 'powershell' || p.id === 'cmd' || p.id === 'bash')).toBe(true)
    })

    it('should load detected shells from native Electron bridge when available', async () => {
      const mockProfiles: ShellProfile[] = [
        { id: 'pwsh', name: 'PowerShell 7', path: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe', icon: 'powershell', isDefault: true },
        { id: 'gitbash', name: 'Git Bash', path: 'C:\\Program Files\\Git\\bin\\bash.exe', icon: 'git' },
        { id: 'cygwin', name: 'Cygwin', path: 'C:\\cygwin64\\bin\\bash.exe', icon: 'cygwin' },
      ]

      terminalService.setElectronAPI({
        terminal: {
          detectShells: vi.fn().mockResolvedValue(mockProfiles),
          getConfig: vi.fn().mockResolvedValue({
            defaultShellId: 'gitbash',
            fontSize: 14,
            fontFamily: 'Consolas',
            cursorStyle: 'block',
            cursorBlink: true,
            scrollback: 3000,
            profiles: mockProfiles,
          }),
          saveConfig: vi.fn().mockResolvedValue(true),
        },
      })

      const profiles = await terminalService.initialize()
      expect(profiles.length).toBe(3)
      expect(profiles[0].id).toBe('pwsh')
      expect(profiles[1].id).toBe('gitbash')
      expect(profiles[2].id).toBe('cygwin')

      const config = terminalService.getConfig()
      expect(config.defaultShellId).toBe('gitbash')
      expect(config.fontSize).toBe(14)
    })

    it('should persist modified configuration through terminalService.saveConfig', async () => {
      const saveSpy = vi.fn().mockResolvedValue(true)
      terminalService.setElectronAPI({
        terminal: {
          detectShells: vi.fn().mockResolvedValue([]),
          getConfig: vi.fn().mockResolvedValue(terminalService.getDefaultConfig()),
          saveConfig: saveSpy,
        },
      })

      await terminalService.initialize()
      const saved = await terminalService.saveConfig({ fontSize: 16, cursorStyle: 'underline' })
      expect(saved).toBe(true)
      expect(saveSpy).toHaveBeenCalled()
      expect(terminalService.getConfig().fontSize).toBe(16)
      expect(terminalService.getConfig().cursorStyle).toBe('underline')
    })
  })

  describe('2. Tab & Session Lifecycle', () => {
    it('should create, switch, and close terminal tabs cleanly', async () => {
      terminalService.setElectronAPI({
        terminal: {
          create: vi.fn().mockResolvedValue({
            id: 'term-native-1',
            shellId: 'powershell',
            shellName: 'PowerShell',
            pid: 1234,
            cwd: 'D:/Projects/App',
          }),
          write: vi.fn().mockResolvedValue(true),
          kill: vi.fn().mockResolvedValue(true),
        },
      })

      const tab1 = await terminalService.createTab({ cwd: 'D:/Projects/App' })
      expect(tab1.id).toBe('term-native-1')
      expect(terminalService.getTabs().length).toBeGreaterThanOrEqual(1)

      // Clear buffer
      terminalService.clearBuffer(tab1.id)
      const currentTab = terminalService.getActiveTab()
      expect(currentTab?.buffer.length).toBe(0)

      // Close tab
      await terminalService.closeTab(tab1.id)
      expect(terminalService.getTabs().some((t) => t.id === tab1.id)).toBe(false)
    })

    it('should support split terminal tab creation', async () => {
      terminalService.setElectronAPI(null)
      const tab1 = await terminalService.createTab()
      const tab2 = await terminalService.createTab({ splitWith: tab1.id })

      expect(tab2.isSplit).toBe(true)
      expect(tab2.splitTargetId).toBe(tab1.id)
    })
  })

  describe('3. In-Browser Fallback Command Execution', () => {
    it('should execute built-in commands (help, version, echo, date) in web fallback mode', async () => {
      terminalService.setElectronAPI(null)
      const tab = await terminalService.createTab()

      await terminalService.write(tab.id, 'version')
      const buffer = terminalService.getActiveTab()?.buffer || []
      expect(buffer.some((line) => line.includes('IndoctrinatedEdit v4.0.0'))).toBe(true)

      await terminalService.write(tab.id, 'echo Hello Liquid Glass')
      const bufferAfterEcho = terminalService.getActiveTab()?.buffer || []
      expect(bufferAfterEcho.some((line) => line.includes('Hello Liquid Glass'))).toBe(true)
    })
  })

  describe('4. ANSI Color & Style Parsing Engine', () => {
    it('should parse standard ANSI color codes into tokens with correct hex colors', () => {
      const input = '\x1b[32mSuccess\x1b[0m and \x1b[31mError\x1b[0m and \x1b[36mCyan\x1b[0m'
      const tokens = terminalService.parseAnsi(input)

      expect(tokens.length).toBe(5)
      expect(tokens[0].text).toBe('Success')
      expect(tokens[0].color).toBe('#30D158') // Green

      expect(tokens[1].text).toBe(' and ')
      expect(tokens[1].color).toBeUndefined()

      expect(tokens[2].text).toBe('Error')
      expect(tokens[2].color).toBe('#FF453A') // Red

      expect(tokens[3].text).toBe(' and ')

      expect(tokens[4].text).toBe('Cyan')
      expect(tokens[4].color).toBe('#64D2FF') // Cyan
    })

    it('should parse bold, underline, and reset escape codes', () => {
      const input = '\x1b[1m\x1b[4mBold Underline\x1b[0m Normal'
      const tokens = terminalService.parseAnsi(input)

      expect(tokens[0].text).toBe('Bold Underline')
      expect(tokens[0].bold).toBe(true)
      expect(tokens[0].underline).toBe(true)

      expect(tokens[1].text).toBe(' Normal')
      expect(tokens[1].bold).toBe(false)
      expect(tokens[1].underline).toBe(false)
    })
  })
})

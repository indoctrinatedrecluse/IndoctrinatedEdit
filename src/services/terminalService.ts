import { ShellProfile, TerminalConfig, TerminalSessionInfo } from '../../electron/preload'

export interface TerminalTab {
  id: string
  shellId: string
  title: string
  icon: 'powershell' | 'git' | 'cygwin' | 'terminal' | 'cmd' | 'wsl'
  cwd: string
  buffer: string[]
  isSplit?: boolean
  splitTargetId?: string
}

export interface AnsiToken {
  text: string
  color?: string
  bg?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

export class TerminalService {
  private static instance: TerminalService
  private customElectronAPI: any = null
  private detectedShells: ShellProfile[] = []
  private config: TerminalConfig | null = null
  private tabs: TerminalTab[] = []
  private activeTabId: string | null = null
  private dataListeners: Map<string, Array<(data: string) => void>> = new Map()
  private exitListeners: Map<string, Array<(code: number | null) => void>> = new Map()
  private cleanupIpcDataListener: (() => void) | null = null
  private cleanupIpcExitListener: (() => void) | null = null

  public static getInstance(): TerminalService {
    if (!TerminalService.instance) {
      TerminalService.instance = new TerminalService()
    }
    return TerminalService.instance
  }

  public setElectronAPI(api: any): void {
    this.customElectronAPI = api
  }

  private getElectronAPI(): any {
    if (this.customElectronAPI) return this.customElectronAPI
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return (window as any).electronAPI
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).electronAPI) {
      return (globalThis as any).electronAPI
    }
    return undefined
  }

  /**
   * Initializes terminal subsystem, discovers available shells and loads config.
   */
  public async initialize(): Promise<ShellProfile[]> {
    const electron = this.getElectronAPI()

    if (electron?.terminal?.detectShells) {
      try {
        this.detectedShells = await electron.terminal.detectShells()
      } catch (e) {
        console.warn('[TerminalService] Error detecting shells:', e)
        this.detectedShells = this.getFallbackProfiles()
      }
    } else {
      this.detectedShells = this.getFallbackProfiles()
    }

    if (electron?.terminal?.getConfig) {
      try {
        this.config = await electron.terminal.getConfig()
      } catch (e) {
        this.config = this.getDefaultConfig()
      }
    } else {
      this.config = this.getDefaultConfig()
    }

    // Subscribe to IPC data and exit events
    if (electron?.terminal?.onData && !this.cleanupIpcDataListener) {
      this.cleanupIpcDataListener = electron.terminal.onData((payload: { id: string; data: string }) => {
        this.appendOutput(payload.id, payload.data)
        const listeners = this.dataListeners.get(payload.id)
        if (listeners) {
          listeners.forEach((fn) => fn(payload.data))
        }
      })
    }

    if (electron?.terminal?.onExit && !this.cleanupIpcExitListener) {
      this.cleanupIpcExitListener = electron.terminal.onExit((payload: { id: string; code: number | null }) => {
        const listeners = this.exitListeners.get(payload.id)
        if (listeners) {
          listeners.forEach((fn) => fn(payload.code))
        }
      })
    }

    return this.detectedShells
  }

  public getFallbackProfiles(): ShellProfile[] {
    return [
      { id: 'powershell', name: 'PowerShell', path: 'powershell.exe', icon: 'powershell', isDefault: true },
      { id: 'cmd', name: 'Command Prompt', path: 'cmd.exe', icon: 'cmd' },
      { id: 'bash', name: 'Bash', path: '/bin/bash', icon: 'terminal' },
    ]
  }

  public getDefaultConfig(): TerminalConfig {
    return {
      defaultShellId: this.detectedShells.find((p) => p.isDefault)?.id || 'powershell',
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
      cursorStyle: 'block',
      cursorBlink: true,
      scrollback: 2000,
      profiles: this.detectedShells.length > 0 ? this.detectedShells : this.getFallbackProfiles(),
    }
  }

  public getProfiles(): ShellProfile[] {
    return this.detectedShells.length > 0 ? this.detectedShells : this.getFallbackProfiles()
  }

  public getConfig(): TerminalConfig {
    return this.config || this.getDefaultConfig()
  }

  public async saveConfig(updated: Partial<TerminalConfig>): Promise<boolean> {
    this.config = { ...this.getConfig(), ...updated }
    const electron = this.getElectronAPI()
    if (electron?.terminal?.saveConfig) {
      return await electron.terminal.saveConfig(this.config)
    }
    return true
  }

  /**
   * Spawns a new terminal tab.
   */
  public async createTab(options?: { shellId?: string; cwd?: string; splitWith?: string }): Promise<TerminalTab> {
    const electron = this.getElectronAPI()
    const config = this.getConfig()
    const targetShellId = options?.shellId || config.defaultShellId || 'powershell'
    const profile = this.getProfiles().find((p) => p.id === targetShellId) || this.getProfiles()[0]

    let tabId = `term-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    let targetCwd = options?.cwd || '.'

    if (electron?.terminal?.create) {
      try {
        const info: TerminalSessionInfo = await electron.terminal.create({
          shellId: profile.id,
          cwd: options?.cwd,
        })
        tabId = info.id
        targetCwd = info.cwd
      } catch (err) {
        console.warn('[TerminalService] Failed to spawn native terminal, falling back to browser shell:', err)
      }
    }

    const newTab: TerminalTab = {
      id: tabId,
      shellId: profile.id,
      title: profile.name,
      icon: profile.icon,
      cwd: targetCwd,
      buffer: [
        `\x1b[36m╭── IndoctrinatedEdit Terminal Subsystem [v4.0.0]\x1b[0m`,
        `\x1b[90m│ Shell: ${profile.name} (${profile.path})\x1b[0m`,
        `\x1b[90m│ Working Directory: ${targetCwd}\x1b[0m`,
        `\x1b[36m╰────────────────────────────────────────────────\x1b[0m\r\n`,
      ],
      isSplit: !!options?.splitWith,
      splitTargetId: options?.splitWith,
    }

    this.tabs.push(newTab)
    this.activeTabId = newTab.id
    return newTab
  }

  /**
   * Sends input to a terminal session.
   */
  public async write(tabId: string, data: string): Promise<boolean> {
    const electron = this.getElectronAPI()
    if (electron?.terminal?.write) {
      return await electron.terminal.write(tabId, data)
    }

    // In-browser mock shell fallback
    this.handleBrowserFallbackCommand(tabId, data)
    return true
  }

  /**
   * Closes / kills a terminal tab.
   */
  public async closeTab(tabId: string): Promise<void> {
    const electron = this.getElectronAPI()
    if (electron?.terminal?.kill) {
      await electron.terminal.kill(tabId)
    }

    this.tabs = this.tabs.filter((t) => t.id !== tabId)
    this.dataListeners.delete(tabId)
    this.exitListeners.delete(tabId)

    if (this.activeTabId === tabId) {
      this.activeTabId = this.tabs.length > 0 ? this.tabs[this.tabs.length - 1].id : null
    }
  }

  public getTabs(): TerminalTab[] {
    return [...this.tabs]
  }

  public getActiveTab(): TerminalTab | null {
    return this.tabs.find((t) => t.id === this.activeTabId) || this.tabs[0] || null
  }

  public setActiveTab(tabId: string): void {
    if (this.tabs.some((t) => t.id === tabId)) {
      this.activeTabId = tabId
    }
  }

  public clearBuffer(tabId: string): void {
    const tab = this.tabs.find((t) => t.id === tabId)
    if (tab) {
      tab.buffer = []
    }
  }

  public appendOutput(tabId: string, text: string): void {
    const tab = this.tabs.find((t) => t.id === tabId)
    if (tab) {
      tab.buffer.push(text)
      const maxScroll = this.config?.scrollback || 2000
      if (tab.buffer.length > maxScroll) {
        tab.buffer.splice(0, tab.buffer.length - maxScroll)
      }
    }
  }

  public onData(tabId: string, callback: (data: string) => void): () => void {
    if (!this.dataListeners.has(tabId)) {
      this.dataListeners.set(tabId, [])
    }
    this.dataListeners.get(tabId)!.push(callback)
    return () => {
      const list = this.dataListeners.get(tabId)
      if (list) {
        this.dataListeners.set(tabId, list.filter((cb) => cb !== callback))
      }
    }
  }

  /**
   * Simulated browser fallback shell for web/test runtime.
   */
  private handleBrowserFallbackCommand(tabId: string, input: string): void {
    const cmd = input.trim()
    if (!cmd) return

    this.appendOutput(tabId, `\x1b[32m$ ${cmd}\x1b[0m\r\n`)

    if (cmd === 'clear' || cmd === 'cls') {
      this.clearBuffer(tabId)
      return
    }

    if (cmd === 'help') {
      this.appendOutput(
        tabId,
        `\x1b[33mAvailable Commands (Browser Fallback Mode):\x1b[0m\r\n` +
          `  help        Show command list\r\n` +
          `  clear / cls Clear screen\r\n` +
          `  echo <text> Print text\r\n` +
          `  version     Display IndoctrinatedEdit version\r\n` +
          `  ls / dir    List files in current scope\r\n` +
          `  node -v     Display Node runtime version\r\n` +
          `  date        Show current system timestamp\r\n\r\n`
      )
      return
    }

    if (cmd === 'version') {
      this.appendOutput(tabId, `IndoctrinatedEdit v4.0.0 PRO (Liquid Glass Engine)\r\n`)
      return
    }

    if (cmd.startsWith('echo ')) {
      this.appendOutput(tabId, `${cmd.substring(5)}\r\n`)
      return
    }

    if (cmd === 'ls' || cmd === 'dir') {
      this.appendOutput(tabId, `src/  electron/  public/  package.json  tsconfig.json  vite.config.ts\r\n`)
      return
    }

    if (cmd === 'date') {
      this.appendOutput(tabId, `${new Date().toLocaleString()}\r\n`)
      return
    }

    if (cmd === 'node -v' || cmd === 'node --version') {
      this.appendOutput(tabId, `v22.13.0\r\n`)
      return
    }

    this.appendOutput(tabId, `\x1b[90mCommand executed in browser sandbox: "${cmd}"\x1b[0m\r\n`)
  }

  /**
   * Parses text with standard ANSI color/style escape codes into styled tokens for React rendering.
   */
  public parseAnsi(input: string): AnsiToken[] {
    const tokens: AnsiToken[] = []
    const ansiRegex = /\x1b\[([0-9;]*)m/g

    const ansiColorMap: Record<number, string> = {
      30: '#1E1E1E', // Black
      31: '#FF453A', // Red
      32: '#30D158', // Green
      33: '#FFD60A', // Yellow
      34: '#0A84FF', // Blue
      35: '#BF5AF2', // Magenta
      36: '#64D2FF', // Cyan
      37: '#FFFFFF', // White
      90: '#8E8E93', // Bright Black / Gray
      91: '#FF6961', // Bright Red
      92: '#32D74B', // Bright Green
      93: '#FFE066', // Bright Yellow
      94: '#409CFF', // Bright Blue
      95: '#DA8FFF', // Bright Magenta
      96: '#70D7FF', // Bright Cyan
      97: '#FFFFFF', // Bright White
    }

    let lastIndex = 0
    let currentColor: string | undefined = undefined
    let currentBg: string | undefined = undefined
    let isBold = false
    let isUnderline = false
    let isItalic = false

    let match: RegExpExecArray | null

    while ((match = ansiRegex.exec(input)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({
          text: input.substring(lastIndex, match.index),
          color: currentColor,
          bg: currentBg,
          bold: isBold,
          underline: isUnderline,
          italic: isItalic,
        })
      }

      const codes = match[1] ? match[1].split(';').map(Number) : [0]

      for (const code of codes) {
        if (code === 0) {
          // Reset
          currentColor = undefined
          currentBg = undefined
          isBold = false
          isUnderline = false
          isItalic = false
        } else if (code === 1) {
          isBold = true
        } else if (code === 3) {
          isItalic = true
        } else if (code === 4) {
          isUnderline = true
        } else if (code >= 30 && code <= 37) {
          currentColor = ansiColorMap[code]
        } else if (code >= 90 && code <= 97) {
          currentColor = ansiColorMap[code]
        } else if (code === 39) {
          currentColor = undefined
        } else if (code === 49) {
          currentBg = undefined
        }
      }

      lastIndex = ansiRegex.lastIndex
    }

    if (lastIndex < input.length) {
      tokens.push({
        text: input.substring(lastIndex),
        color: currentColor,
        bg: currentBg,
        bold: isBold,
        underline: isUnderline,
        italic: isItalic,
      })
    }

    return tokens
  }
}

export const terminalService = TerminalService.getInstance()

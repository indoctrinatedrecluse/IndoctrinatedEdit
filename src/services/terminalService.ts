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
  isTuiActive?: boolean
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
    let targetCwd = (options?.cwd && options.cwd !== '.') ? options.cwd : (typeof process !== 'undefined' && process.cwd ? process.cwd() : '.')

    if (electron?.terminal?.create) {
      try {
        const info: TerminalSessionInfo = await electron.terminal.create({
          shellId: profile.id,
          cwd: options?.cwd,
        })
        tabId = info.id
        if (info.cwd) {
          targetCwd = info.cwd
        }
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
        `\x1b[36m╭── IndoctrinatedEdit Terminal Subsystem [v4.9.1]\x1b[0m`,
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

  public isTuiActive(tabId: string): boolean {
    const tab = this.tabs.find((t) => t.id === tabId)
    const state = this.tabScreenStates.get(tabId)
    return Boolean(tab?.isTuiActive || state?.inAltBuffer)
  }

  public setTuiActive(tabId: string, active: boolean): void {
    const tab = this.tabs.find((t) => t.id === tabId)
    if (tab) {
      tab.isTuiActive = active
    }
  }

  /**
   * Screen buffer line state for in-place cursor updates
   */
  private tabScreenStates: Map<string, {
    cursorRow: number
    cursorCol: number
    inAltBuffer: boolean
    savedBuffer: string[]
  }> = new Map()

  /**
   * Processes incoming terminal stream with VT100 / ANSI escape sequences,
   * in-place screen clearing, cursor repositioning, and alternate screen buffers for TUI apps.
   */
  public appendOutput(tabId: string, text: string): void {
    const tab = this.tabs.find((t) => t.id === tabId)
    if (!tab) return

    if (!this.tabScreenStates.has(tabId)) {
      this.tabScreenStates.set(tabId, {
        cursorRow: 0,
        cursorCol: 0,
        inAltBuffer: false,
        savedBuffer: [],
      })
    }
    const state = this.tabScreenStates.get(tabId)!

    // 1. Alternate Screen Buffer Switching (\x1b[?1049h / \x1b[?1049l or \x1b[?47h / \x1b[?47l)
    if (text.includes('\x1b[?1049h') || text.includes('\x1b[?47h')) {
      if (!state.inAltBuffer) {
        state.savedBuffer = [...tab.buffer]
        state.inAltBuffer = true
        tab.buffer = []
      }
      text = text.replace(/\x1b\[\?(1049|47)h/g, '')
    }

    if (text.includes('\x1b[?1049l') || text.includes('\x1b[?47l')) {
      if (state.inAltBuffer) {
        tab.buffer = [...state.savedBuffer]
        state.inAltBuffer = false
      }
      text = text.replace(/\x1b\[\?(1049|47)l/g, '')
    }

    // 2. Full Screen Clear (\x1b[2J, \x1b[3J)
    if (text.includes('\x1b[2J') || text.includes('\x1b[3J')) {
      tab.buffer = []
      text = text.replace(/\x1b\[[23]J/g, '')
    }

    // 3. Cursor Home (\x1b[H, \x1b[1;1H, \x1b[f)
    if (/\x1b\[(\d+)?(?:;(\d+)?)?[Hf]/.test(text)) {
      // If text starts with cursor home and screen clear, clear buffer to allow fresh TUI frame
      if (text.startsWith('\x1b[H') || text.startsWith('\x1b[1;1H') || text.startsWith('\x1b[?25l\x1b[H')) {
        tab.buffer = []
      }
      text = text.replace(/\x1b\[(\d+)?(?:;(\d+)?)?[Hf]/g, '')
    }

    // 4. Strip cursor visibility / mode sequences
    text = text.replace(/\x1b\[\?25[lh]/g, '') // Hide/Show cursor
    text = text.replace(/\x1b\[\?1[lh]/g, '')  // Cursor keys mode
    text = text.replace(/\x1b\[\?2004[lh]/g, '') // Bracketed paste mode

    // 5. Line clearing (\x1b[2K, \x1b[K, \x1b[0K, \x1b[1K)
    // When a line clear occurs before new text, we can update the last line
    if (text.includes('\x1b[2K') || text.includes('\x1b[K') || text.includes('\x1b[0K')) {
      text = text.replace(/\x1b\[[012]?K/g, '')
    }

    // 6. Split lines while handling carriage returns
    const chunks = text.split(/\r?\n/)

    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i]
      if (chunk.includes('\r')) {
        // Handle \r overwrite
        const rParts = chunk.split('\r')
        chunk = rParts[rParts.length - 1]
      }

      if (i === 0 && tab.buffer.length > 0 && !text.startsWith('\n') && !text.startsWith('\r\n')) {
        // Append to current last line
        const lastIdx = tab.buffer.length - 1
        tab.buffer[lastIdx] = (tab.buffer[lastIdx] || '') + chunk
      } else {
        tab.buffer.push(chunk)
      }
    }

    const maxScroll = this.config?.scrollback || 2500
    if (tab.buffer.length > maxScroll) {
      tab.buffer.splice(0, tab.buffer.length - maxScroll)
    }
  }

  /**
   * Dispatches raw TUI key sequences (Arrows, Enter, Esc, Q, WASD, Ctrl Combos) directly to the terminal backend.
   */
  public async sendTuiKey(tabId: string, action: string): Promise<boolean> {
    const keyMap: Record<string, string> = {
      up: '\x1b[A',
      down: '\x1b[B',
      right: '\x1b[C',
      left: '\x1b[D',
      enter: '\r',
      return: '\r',
      escape: '\x1b',
      esc: '\x1b',
      tab: '\t',
      backspace: '\x7f',
      bksp: '\x7f',
      delete: '\x1b[3~',
      del: '\x1b[3~',
      insert: '\x1b[2~',
      ins: '\x1b[2~',
      space: ' ',
      spacebar: ' ',
      q: 'q',
      w: 'w',
      a: 'a',
      s: 's',
      d: 'd',
      h: 'h',
      j: 'j',
      k: 'k',
      l: 'l',
      r: 'r',
      c: 'c',
      x: 'x',
      y: 'y',
      n: 'n',
      'ctrl-c': '\x03',
      'ctrl+c': '\x03',
      'ctrl-d': '\x04',
      'ctrl+d': '\x04',
      'ctrl-z': '\x1a',
      'ctrl+z': '\x1a',
      'ctrl-l': '\x0c',
      'ctrl+l': '\x0c',
      'ctrl-x': '\x18',
      'ctrl+x': '\x18',
      'ctrl-o': '\x0f',
      'ctrl+o': '\x0f',
      'ctrl-s': '\x13',
      'ctrl+s': '\x13',
      'ctrl-w': '\x17',
      'ctrl+w': '\x17',
      'ctrl-k': '\x0b',
      'ctrl+k': '\x0b',
      'ctrl-u': '\x15',
      'ctrl+u': '\x15',
      'ctrl-a': '\x01',
      'ctrl+a': '\x01',
      'ctrl-e': '\x05',
      'ctrl+e': '\x05',
      'ctrl-g': '\x07',
      'ctrl+g': '\x07',
      'ctrl-r': '\x12',
      'ctrl+r': '\x12',
      pageup: '\x1b[5~',
      pgup: '\x1b[5~',
      pagedown: '\x1b[6~',
      pgdn: '\x1b[6~',
      home: '\x1b[H',
      end: '\x1b[F',
    }

    const normalized = action.trim().toLowerCase()
    const seq = keyMap[normalized] || action
    return await this.write(tabId, seq)
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
   * Helper to convert 256-color palette index (0-255) to Hex string
   */
  private get256ColorHex(code: number): string {
    const standardColors = [
      '#000000', '#CD0000', '#00CD00', '#CDCD00', '#0000EE', '#CD00CD', '#00CDCD', '#E5E5E5',
      '#7F7F7F', '#FF0000', '#00FF00', '#FFFF00', '#5C5CFF', '#FF00FF', '#00FFFF', '#FFFFFF'
    ]
    if (code >= 0 && code < 16) return standardColors[code]
    if (code >= 232 && code <= 255) {
      const gray = Math.floor((code - 232) * 10 + 8)
      return `rgb(${gray}, ${gray}, ${gray})`
    }
    const idx = code - 16
    const r = Math.floor(idx / 36) * 51
    const g = Math.floor((idx % 36) / 6) * 51
    const b = (idx % 6) * 51
    return `rgb(${r}, ${g}, ${b})`
  }

  /**
   * Parses text with standard ANSI color/style, 256-color, and TrueColor RGB escape codes.
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

      const rawCodes = match[1] ? match[1].split(';').map(Number) : [0]

      let i = 0
      while (i < rawCodes.length) {
        const code = rawCodes[i]

        if (code === 0) {
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
        } else if (code === 38) {
          // Extended foreground color: 38;5;n or 38;2;r;g;b
          if (rawCodes[i + 1] === 5 && rawCodes[i + 2] !== undefined) {
            currentColor = this.get256ColorHex(rawCodes[i + 2])
            i += 2
          } else if (rawCodes[i + 1] === 2 && rawCodes[i + 4] !== undefined) {
            currentColor = `rgb(${rawCodes[i + 2]}, ${rawCodes[i + 3]}, ${rawCodes[i + 4]})`
            i += 4
          }
        } else if (code === 48) {
          // Extended background color: 48;5;n or 48;2;r;g;b
          if (rawCodes[i + 1] === 5 && rawCodes[i + 2] !== undefined) {
            currentBg = this.get256ColorHex(rawCodes[i + 2])
            i += 2
          } else if (rawCodes[i + 1] === 2 && rawCodes[i + 4] !== undefined) {
            currentBg = `rgb(${rawCodes[i + 2]}, ${rawCodes[i + 3]}, ${rawCodes[i + 4]})`
            i += 4
          }
        } else if (code === 39) {
          currentColor = undefined
        } else if (code === 49) {
          currentBg = undefined
        }

        i++
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


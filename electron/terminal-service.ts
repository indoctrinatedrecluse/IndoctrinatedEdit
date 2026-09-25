import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { IpcMain, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export interface ShellProfile {
  id: string
  name: string
  path: string
  args?: string[]
  icon: 'powershell' | 'git' | 'cygwin' | 'terminal' | 'cmd' | 'wsl'
  isDefault?: boolean
}

export interface TerminalConfig {
  defaultShellId?: string
  fontSize: number
  fontFamily: string
  cursorStyle: 'block' | 'underline' | 'line'
  cursorBlink: boolean
  scrollback: number
  profiles: ShellProfile[]
}

export interface TerminalSessionInfo {
  id: string
  shellId: string
  shellName: string
  pid?: number
  cwd: string
}

export class TerminalService {
  private static instance: TerminalService
  private sessions: Map<string, { process: ChildProcessWithoutNullStreams; info: TerminalSessionInfo }> = new Map()
  private configPath: string

  private constructor() {
    const configDir = path.join(os.homedir(), '.indoctrinated')
    try {
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
      }
    } catch (e) {
      console.warn('[TerminalService] Could not create config dir:', e)
    }
    this.configPath = path.join(configDir, 'terminal.json')
  }

  public static getInstance(): TerminalService {
    if (!TerminalService.instance) {
      TerminalService.instance = new TerminalService()
    }
    return TerminalService.instance
  }

  /**
   * Probes the filesystem and PATH for installed shell environments.
   */
  public detectShells(): ShellProfile[] {
    const isWin = process.platform === 'win32'
    const profiles: ShellProfile[] = []

    if (isWin) {
      // 1. PowerShell 7 (pwsh)
      const pwshPath = this.findExecutableInPath('pwsh.exe') || 'C:\\Program Files\\PowerShell\\7\\pwsh.exe'
      if (this.checkExists(pwshPath)) {
        profiles.push({
          id: 'pwsh',
          name: 'PowerShell 7',
          path: pwshPath,
          icon: 'powershell',
          args: ['-NoLogo'],
          isDefault: true,
        })
      }

      // 2. Windows PowerShell
      const sysPowerShell = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
      if (this.checkExists(sysPowerShell)) {
        profiles.push({
          id: 'powershell',
          name: 'Windows PowerShell',
          path: sysPowerShell,
          icon: 'powershell',
          args: ['-NoLogo'],
          isDefault: profiles.length === 0,
        })
      }

      // 3. Git Bash
      const gitBashLocations = [
        'C:\\Program Files\\Git\\bin\\bash.exe',
        'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
        path.join(os.homedir(), 'AppData\\Local\\Programs\\Git\\bin\\bash.exe'),
      ]
      const gitBashPath = gitBashLocations.find((p) => this.checkExists(p)) || this.findExecutableInPath('bash.exe')
      if (gitBashPath && this.checkExists(gitBashPath)) {
        profiles.push({
          id: 'gitbash',
          name: 'Git Bash',
          path: gitBashPath,
          icon: 'git',
          args: ['--login', '-i'],
        })
      }

      // 4. Cygwin
      const cygwinLocations = [
        'C:\\cygwin64\\bin\\bash.exe',
        'C:\\cygwin\\bin\\bash.exe',
        'D:\\cygwin64\\bin\\bash.exe',
      ]
      const cygwinPath = cygwinLocations.find((p) => this.checkExists(p))
      if (cygwinPath && this.checkExists(cygwinPath)) {
        profiles.push({
          id: 'cygwin',
          name: 'Cygwin',
          path: cygwinPath,
          icon: 'cygwin',
          args: ['--login', '-i'],
        })
      }

      // 5. WSL (Windows Subsystem for Linux)
      const wslPath = 'C:\\Windows\\System32\\wsl.exe'
      if (this.checkExists(wslPath)) {
        profiles.push({
          id: 'wsl',
          name: 'WSL (Linux)',
          path: wslPath,
          icon: 'wsl',
        })
      }

      // 6. Command Prompt (cmd.exe)
      const cmdPath = 'C:\\Windows\\System32\\cmd.exe'
      if (this.checkExists(cmdPath)) {
        profiles.push({
          id: 'cmd',
          name: 'Command Prompt',
          path: cmdPath,
          icon: 'cmd',
        })
      }
    } else {
      // Unix / macOS
      const standardShells = [
        { id: 'bash', name: 'Bash', path: '/bin/bash' },
        { id: 'zsh', name: 'Zsh', path: '/bin/zsh' },
        { id: 'fish', name: 'Fish', path: '/usr/bin/fish' },
        { id: 'sh', name: 'Sh', path: '/bin/sh' },
      ]

      for (const s of standardShells) {
        if (this.checkExists(s.path)) {
          profiles.push({
            id: s.id,
            name: s.name,
            path: s.path,
            icon: 'terminal',
            isDefault: profiles.length === 0,
          })
        }
      }
    }

    return profiles
  }

  private checkExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath)
    } catch {
      return false
    }
  }

  private findExecutableInPath(exeName: string): string | null {
    const envPath = process.env.PATH || ''
    const parts = envPath.split(path.delimiter)
    for (const part of parts) {
      const full = path.join(part, exeName)
      if (this.checkExists(full)) {
        return full
      }
    }
    return null
  }

  /**
   * Loads user terminal configuration from ~/.indoctrinated/terminal.json
   */
  public getConfig(): TerminalConfig {
    const detected = this.detectShells()
    const defaultConfig: TerminalConfig = {
      defaultShellId: detected.find((p) => p.isDefault)?.id || detected[0]?.id || 'cmd',
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
      cursorStyle: 'block',
      cursorBlink: true,
      scrollback: 2000,
      profiles: detected,
    }

    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8')
        const parsed = JSON.parse(raw)
        return {
          ...defaultConfig,
          ...parsed,
          profiles: detected.map((d) => {
            const userCustom = parsed.profiles?.find((p: any) => p.id === d.id)
            return userCustom ? { ...d, ...userCustom } : d
          }),
        }
      }
    } catch (e) {
      console.warn('[TerminalService] Failed to read terminal.json:', e)
    }

    return defaultConfig
  }

  /**
   * Persists user terminal configuration.
   */
  public saveConfig(config: Partial<TerminalConfig>): boolean {
    try {
      const current = this.getConfig()
      const merged = { ...current, ...config }
      fs.writeFileSync(this.configPath, JSON.stringify(merged, null, 2), 'utf8')
      return true
    } catch (e) {
      console.error('[TerminalService] Failed to write terminal.json:', e)
      return false
    }
  }

  /**
   * Resolves the path to the Windows ConPTY runner script.
   */
  private findConPtyRunnerPath(): string | null {
    if (process.platform !== 'win32') return null

    const candidates = [
      path.join((process as any).resourcesPath || '', 'sidecars', 'conpty_runner.ps1'),
      path.join(process.cwd(), 'sidecars', 'conpty_runner.ps1'),
      path.join(__dirname, '..', 'sidecars', 'conpty_runner.ps1'),
      path.join(__dirname, 'sidecars', 'conpty_runner.ps1'),
    ]
    for (const p of candidates) {
      if (fs.existsSync(p)) return p
    }
    return null
  }

  /**
   * Creates an interactive child process session for a given shell profile.
   */
  public createSession(
    options: {
      shellId?: string
      cwd?: string
      cols?: number
      rows?: number
    },
    mainWindow: BrowserWindow
  ): TerminalSessionInfo {
    const config = this.getConfig()
    const targetShellId = options.shellId || config.defaultShellId
    const profile = config.profiles.find((p) => p.id === targetShellId) || config.profiles[0]

    if (!profile) {
      throw new Error(`No available shell profile found for ID: ${targetShellId}`)
    }

    const sessionId = `term-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const targetCwd = options.cwd && fs.existsSync(options.cwd) ? options.cwd : os.homedir()

    // Environment variables with ANSI color and terminal capabilities
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      FORCE_COLOR: '1',
      CLICOLOR: '1',
      CLICOLOR_FORCE: '1',
      TERM_PROGRAM: 'IndoctrinatedEdit',
      PYTHONUNBUFFERED: '1',
      COLUMNS: String(options.cols || 120),
      LINES: String(options.rows || 30),
      INDOCTRINATED_TERMINAL: '1',
    }

    const args = profile.args || []
    const conptyRunner = this.findConPtyRunnerPath()
    let proc: ChildProcessWithoutNullStreams

    if (conptyRunner && process.platform === 'win32') {
      const fullCmd = args.length > 0 ? `"${profile.path}" ${args.join(' ')}` : `"${profile.path}"`
      proc = spawn('powershell.exe', [
        '-NoLogo',
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        conptyRunner,
        '-CommandLine',
        fullCmd,
        '-CurrentDirectory',
        targetCwd,
        '-Cols',
        String(options.cols || 120),
        '-Rows',
        String(options.rows || 30),
      ], {
        cwd: targetCwd,
        env,
        shell: false,
        windowsHide: true,
      })
    } else {
      proc = spawn(profile.path, args, {
        cwd: targetCwd,
        env,
        shell: false,
        windowsHide: true,
      })
    }

    const sessionInfo: TerminalSessionInfo = {
      id: sessionId,
      shellId: profile.id,
      shellName: profile.name,
      pid: proc.pid,
      cwd: targetCwd,
    }

    this.sessions.set(sessionId, { process: proc, info: sessionInfo })

    // Forward stdout & stderr to renderer via IPC
    proc.stdout.on('data', (chunk: Buffer) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:data', {
          id: sessionId,
          data: chunk.toString('utf8'),
        })
      }
    })

    proc.stderr.on('data', (chunk: Buffer) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:data', {
          id: sessionId,
          data: chunk.toString('utf8'),
        })
      }
    })

    proc.on('close', (code, signal) => {
      this.sessions.delete(sessionId)
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:exit', {
          id: sessionId,
          code,
          signal,
        })
      }
    })

    proc.on('error', (err) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:data', {
          id: sessionId,
          data: `\r\n\x1b[31m[Terminal Error] ${err.message}\x1b[0m\r\n`,
        })
      }
    })

    return sessionInfo
  }

  /**
   * Writes input keystrokes or commands into child process stdin.
   */
  public write(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session || !session.process.stdin.writable) {
      return false
    }
    try {
      session.process.stdin.write(data, 'utf8')
      return true
    } catch (e) {
      console.warn(`[TerminalService] Error writing to session ${sessionId}:`, e)
      return false
    }
  }

  /**
   * Terminates an active terminal session.
   */
  public kill(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    try {
      session.process.kill()
      this.sessions.delete(sessionId)
      return true
    } catch (e) {
      console.warn(`[TerminalService] Error killing session ${sessionId}:`, e)
      return false
    }
  }

  /**
   * Registers all terminal IPC channels.
   */
  public setupIPC(ipcMain: IpcMain, getWindow: () => BrowserWindow | null): void {
    ipcMain.handle('terminal:detectShells', async () => {
      return this.detectShells()
    })

    ipcMain.handle('terminal:getConfig', async () => {
      return this.getConfig()
    })

    ipcMain.handle('terminal:saveConfig', async (_, config: Partial<TerminalConfig>) => {
      return this.saveConfig(config)
    })

    ipcMain.handle('terminal:create', async (_, options: { shellId?: string; cwd?: string }) => {
      const win = getWindow()
      if (!win) throw new Error('Main window not available')
      return this.createSession(options, win)
    })

    ipcMain.handle('terminal:write', async (_, { id, data }: { id: string; data: string }) => {
      return this.write(id, data)
    })

    ipcMain.handle('terminal:kill', async (_, id: string) => {
      return this.kill(id)
    })
  }
}

export const terminalService = TerminalService.getInstance()

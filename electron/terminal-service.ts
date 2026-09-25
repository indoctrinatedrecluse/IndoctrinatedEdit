import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { IpcMain, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { IPty } from 'node-pty'

let nodePty: typeof import('node-pty') | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  nodePty = require('node-pty')
} catch (e) {
  console.warn('[TerminalService] node-pty not loaded, falling back to standard child_process:', e)
}

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

type ActiveTerminalProcess = IPty | ChildProcessWithoutNullStreams

export class TerminalService {
  private static instance: TerminalService
  private sessions: Map<
    string,
    { process: ActiveTerminalProcess; isPty: boolean; info: TerminalSessionInfo }
  > = new Map()
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
      const sysRoot = process.env.SystemRoot || process.env.SYSTEMROOT || 'C:\\Windows'
      const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')

      // 1. Windows PowerShell
      const sysPowerShellLocations = [
        path.join(sysRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
        'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
        this.findExecutableInPath('powershell.exe'),
      ]
      const sysPowerShell = sysPowerShellLocations.find((p) => p && this.checkExists(p)) || 'powershell.exe'
      profiles.push({
        id: 'powershell',
        name: 'Windows PowerShell',
        path: sysPowerShell,
        icon: 'powershell',
        args: ['-NoLogo'],
        isDefault: true,
      })

      // 2. PowerShell 7 (pwsh)
      const pwshLocations = [
        this.findExecutableInPath('pwsh.exe'),
        'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
        'C:\\Program Files\\PowerShell\\7-preview\\pwsh.exe',
        path.join(localAppData, 'Programs', 'PowerShell', 'pwsh.exe'),
      ]
      const pwshPath = pwshLocations.find((p) => p && this.checkExists(p)) || 'pwsh.exe'
      profiles.push({
        id: 'pwsh',
        name: 'PowerShell 7',
        path: pwshPath,
        icon: 'powershell',
        args: ['-NoLogo'],
      })

      // 3. Git Bash
      const gitBashLocations = [
        'C:\\Program Files\\Git\\bin\\bash.exe',
        'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
        'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
        path.join(localAppData, 'Programs', 'Git', 'bin', 'bash.exe'),
        path.join(localAppData, 'Programs', 'Git', 'usr', 'bin', 'bash.exe'),
        this.findExecutableInPath('bash.exe'),
      ]
      const gitBashPath = gitBashLocations.find((p) => p && this.checkExists(p)) || 'C:\\Program Files\\Git\\bin\\bash.exe'
      profiles.push({
        id: 'gitbash',
        name: 'Git Bash',
        path: gitBashPath,
        icon: 'git',
        args: ['--login', '-i'],
      })

      // 4. Cygwin
      const cygwinLocations = [
        'C:\\cygwin64\\bin\\bash.exe',
        'C:\\cygwin\\bin\\bash.exe',
        'D:\\cygwin64\\bin\\bash.exe',
        'D:\\cygwin\\bin\\bash.exe',
        'E:\\cygwin64\\bin\\bash.exe',
      ]
      const cygwinPath = cygwinLocations.find((p) => this.checkExists(p)) || 'C:\\cygwin64\\bin\\bash.exe'
      profiles.push({
        id: 'cygwin',
        name: 'Cygwin',
        path: cygwinPath,
        icon: 'cygwin',
        args: ['--login', '-i'],
      })

      // 5. WSL (Linux)
      const wslLocations = [
        path.join(sysRoot, 'System32', 'wsl.exe'),
        'C:\\Windows\\System32\\wsl.exe',
        this.findExecutableInPath('wsl.exe'),
      ]
      const wslPath = wslLocations.find((p) => p && this.checkExists(p)) || 'wsl.exe'
      profiles.push({
        id: 'wsl',
        name: 'WSL (Linux)',
        path: wslPath,
        icon: 'wsl',
      })

      // 6. Command Prompt (cmd.exe)
      const cmdLocations = [
        path.join(sysRoot, 'System32', 'cmd.exe'),
        'C:\\Windows\\System32\\cmd.exe',
        this.findExecutableInPath('cmd.exe'),
      ]
      const cmdPath = cmdLocations.find((p) => p && this.checkExists(p)) || 'cmd.exe'
      profiles.push({
        id: 'cmd',
        name: 'Command Prompt',
        path: cmdPath,
        icon: 'cmd',
      })
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
    const envPath = process.env.PATH || process.env.Path || ''
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
      scrollback: 5000,
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
   * Creates an interactive PTY session for a given shell profile.
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
    const targetCwd = options.cwd && options.cwd !== '.' && fs.existsSync(options.cwd)
      ? path.resolve(options.cwd)
      : (process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd() || os.homedir())

    const cols = options.cols || 100
    const rows = options.rows || 30

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      FORCE_COLOR: '1',
      CLICOLOR: '1',
      CLICOLOR_FORCE: '1',
      TERM_PROGRAM: 'IndoctrinatedEdit',
      PYTHONUNBUFFERED: '1',
      INDOCTRINATED_TERMINAL: '1',
    }

    const args = profile.args || []

    // Prefer native node-pty PseudoConsole (ConPTY on Windows, openpty on POSIX)
    if (nodePty) {
      try {
        const ptyProc = nodePty.spawn(profile.path, args, {
          name: 'xterm-256color',
          cols,
          rows,
          cwd: targetCwd,
          env: env as Record<string, string>,
          useConpty: false,
        })

        const sessionInfo: TerminalSessionInfo = {
          id: sessionId,
          shellId: profile.id,
          shellName: profile.name,
          pid: ptyProc.pid,
          cwd: targetCwd,
        }

        this.sessions.set(sessionId, { process: ptyProc, isPty: true, info: sessionInfo })

        ptyProc.onData((data: string) => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('terminal:data', {
              id: sessionId,
              data,
            })
          }
        })

        ptyProc.onExit(({ exitCode, signal }) => {
          this.sessions.delete(sessionId)
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('terminal:exit', {
              id: sessionId,
              code: exitCode,
              signal: signal ? String(signal) : null,
            })
          }
        })

        return sessionInfo
      } catch (err: any) {
        console.warn('[TerminalService] nodePty.spawn failed, falling back to standard child_process.spawn:', err)
      }
    }

    // Fallback: standard child_process.spawn
    const proc = spawn(profile.path, args, {
      cwd: targetCwd,
      env,
      shell: false,
      windowsHide: true,
    })

    const sessionInfo: TerminalSessionInfo = {
      id: sessionId,
      shellId: profile.id,
      shellName: profile.name,
      pid: proc.pid,
      cwd: targetCwd,
    }

    this.sessions.set(sessionId, { process: proc, isPty: false, info: sessionInfo })

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
   * Writes input keystrokes or commands into terminal session.
   */
  public write(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    try {
      if (session.isPty) {
        ;(session.process as IPty).write(data)
        return true
      } else {
        const streamProc = session.process as ChildProcessWithoutNullStreams
        if (streamProc.stdin.writable) {
          streamProc.stdin.write(data, 'utf8')
          return true
        }
      }
    } catch (e) {
      console.warn(`[TerminalService] Error writing to session ${sessionId}:`, e)
    }
    return false
  }

  /**
   * Resizes the terminal PTY dimensions.
   */
  public resize(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    if (session.isPty) {
      try {
        ;(session.process as IPty).resize(Math.max(10, cols), Math.max(5, rows))
        return true
      } catch (e) {
        console.warn(`[TerminalService] Error resizing session ${sessionId}:`, e)
      }
    }
    return false
  }

  /**
   * Terminates an active terminal session.
   */
  public kill(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    try {
      if (session.isPty) {
        ;(session.process as IPty).kill()
      } else {
        ;(session.process as ChildProcessWithoutNullStreams).kill()
      }
      this.sessions.delete(sessionId)
      return true
    } catch (e) {
      console.warn(`[TerminalService] Error killing session ${sessionId}:`, e)
      return false
    }
  }

  /**
   * Opens the current workspace directory in an external system terminal window.
   */
  public openExternalTerminal(shellId?: string, cwd?: string): boolean {
    const isWin = process.platform === 'win32'
    const targetCwd = cwd && cwd !== '.' && fs.existsSync(cwd)
      ? path.resolve(cwd)
      : (process.cwd() || os.homedir())

    try {
      if (isWin) {
        if (shellId === 'gitbash') {
          const gitBash = 'C:\\Program Files\\Git\\git-bash.exe'
          if (this.checkExists(gitBash)) {
            spawn(gitBash, [`--cd=${targetCwd}`], { detached: true, stdio: 'ignore' }).unref()
            return true
          }
        }
        if (shellId === 'cygwin') {
          const cygMintty = 'C:\\cygwin64\\bin\\mintty.exe'
          if (this.checkExists(cygMintty)) {
            spawn(cygMintty, ['-i', '/Cygwin-Terminal.ico', '-', '/bin/bash', '--login', '-i'], {
              cwd: targetCwd,
              detached: true,
              stdio: 'ignore',
            }).unref()
            return true
          }
        }
        if (shellId === 'wsl') {
          spawn('wsl.exe', [], { cwd: targetCwd, detached: true, stdio: 'ignore' }).unref()
          return true
        }
        if (shellId === 'pwsh') {
          const pwsh = this.findExecutableInPath('pwsh.exe') || 'C:\\Program Files\\PowerShell\\7\\pwsh.exe'
          if (this.checkExists(pwsh)) {
            spawn('cmd.exe', ['/c', 'start', '""', pwsh, '-NoExit', '-Command', `Set-Location -LiteralPath '${targetCwd}'`], {
              detached: true,
              stdio: 'ignore',
            }).unref()
            return true
          }
        }
        // Try Windows Terminal (wt.exe)
        const wt = this.findExecutableInPath('wt.exe')
        if (wt) {
          spawn('wt.exe', ['-d', targetCwd], { detached: true, stdio: 'ignore' }).unref()
          return true
        }
        // Fallback to native Windows PowerShell window
        spawn('cmd.exe', ['/c', 'start', 'powershell.exe', '-NoExit', '-Command', `Set-Location -LiteralPath '${targetCwd}'`], {
          detached: true,
          stdio: 'ignore',
        }).unref()
        return true
      } else if (process.platform === 'darwin') {
        spawn('open', ['-a', 'Terminal', targetCwd], { detached: true, stdio: 'ignore' }).unref()
        return true
      } else {
        spawn('x-terminal-emulator', [], { cwd: targetCwd, detached: true, stdio: 'ignore' }).unref()
        return true
      }
    } catch (err) {
      console.error('[TerminalService] Failed to launch external terminal:', err)
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

    ipcMain.handle('terminal:create', async (_, options: { shellId?: string; cwd?: string; cols?: number; rows?: number }) => {
      const win = getWindow()
      if (!win) throw new Error('Main window not available')
      return this.createSession(options, win)
    })

    ipcMain.handle('terminal:write', async (_, { id, data }: { id: string; data: string }) => {
      return this.write(id, data)
    })

    ipcMain.handle('terminal:resize', async (_, { id, cols, rows }: { id: string; cols: number; rows: number }) => {
      return this.resize(id, cols, rows)
    })

    ipcMain.handle('terminal:kill', async (_, id: string) => {
      return this.kill(id)
    })

    ipcMain.handle('terminal:openExternal', async (_, { shellId, cwd }: { shellId?: string; cwd?: string }) => {
      return this.openExternalTerminal(shellId, cwd)
    })
  }
}

export const terminalService = TerminalService.getInstance()

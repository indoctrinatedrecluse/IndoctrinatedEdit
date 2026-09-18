/**
 * IndoctrinatedEdit - Run & Execution Profiles Service
 * High-performance, configurable runner subsystem inspired by VS Code.
 */

import { terminalService } from './terminalService'

export interface RunProfile {
  id: string
  name: string
  language: string // e.g. 'python', 'javascript', 'typescript', 'cpp', 'rust', 'go', 'java', 'csharp', 'php', 'ruby', 'dart', 'lua', 'shell', 'zig', 'elixir', 'r', 'julia', '*'
  scope: 'file' | 'project'
  commandTemplate: string
  interpreterPath?: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  preLaunchTask?: string
  postLaunchTask?: string
  terminalTarget?: 'integrated' | 'output'
  isDefault?: boolean
}

export interface RunContext {
  filePath?: string
  workspacePath?: string
  customArgs?: string
  customEnv?: Record<string, string>
}

export interface ResolvedRunCommand {
  command: string
  cwd: string
  preLaunchCommand?: string
  postLaunchCommand?: string
  env: Record<string, string>
  profile: RunProfile
}

const STORAGE_KEY = 'indoctrinated:run:profiles_v1'

export class RunService {
  private static instance: RunService
  private profiles: Map<string, RunProfile> = new Map()
  private isRunning: boolean = false
  private listeners: Set<() => void> = new Set()

  public static getInstance(): RunService {
    if (!RunService.instance) {
      RunService.instance = new RunService()
    }
    return RunService.instance
  }

  constructor() {
    this.initializeProfiles()
  }

  /**
   * Initializes built-in profiles and merges user customizations from localStorage.
   */
  public initializeProfiles(): void {
    const builtins = this.getBuiltinProfiles()
    this.profiles.clear()

    for (const p of builtins) {
      this.profiles.set(p.id, p)
    }

    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const userProfiles: RunProfile[] = JSON.parse(saved)
          if (Array.isArray(userProfiles)) {
            for (const up of userProfiles) {
              this.profiles.set(up.id, up)
            }
          }
        }
      }
    } catch (e) {
      console.warn('[RunService] Failed to load custom run profiles from storage:', e)
    }
  }

  /**
   * Default built-in run profiles for 16+ languages.
   */
  public getBuiltinProfiles(): RunProfile[] {
    return [
      {
        id: 'run.python.file',
        name: 'Python: Run Active File',
        language: 'python',
        scope: 'file',
        commandTemplate: 'python -u "${file}" ${args}',
        interpreterPath: 'python',
        args: [],
        cwd: '${fileDirname}',
        isDefault: true,
      },
      {
        id: 'run.node.file',
        name: 'Node.js: Run Active File',
        language: 'javascript',
        scope: 'file',
        commandTemplate: 'node "${file}" ${args}',
        interpreterPath: 'node',
        args: [],
        cwd: '${fileDirname}',
        isDefault: true,
      },
      {
        id: 'run.typescript.file',
        name: 'TypeScript: Run with ts-node/tsx',
        language: 'typescript',
        scope: 'file',
        commandTemplate: 'npx tsx "${file}" ${args}',
        interpreterPath: 'npx tsx',
        args: [],
        cwd: '${fileDirname}',
        isDefault: true,
      },
      {
        id: 'run.cpp.file',
        name: 'C/C++: Compile & Run (GCC/Clang)',
        language: 'cpp',
        scope: 'file',
        commandTemplate: 'g++ "${file}" -o "${fileDirname}/${fileBasenameNoExtension}" && "${fileDirname}/${fileBasenameNoExtension}" ${args}',
        interpreterPath: 'g++',
        args: [],
        cwd: '${fileDirname}',
        isDefault: true,
      },
      {
        id: 'run.c.file',
        name: 'C: Compile & Run (GCC)',
        language: 'c',
        scope: 'file',
        commandTemplate: 'gcc "${file}" -o "${fileDirname}/${fileBasenameNoExtension}" && "${fileDirname}/${fileBasenameNoExtension}" ${args}',
        interpreterPath: 'gcc',
        args: [],
        cwd: '${fileDirname}',
        isDefault: true,
      },
      {
        id: 'run.rust.file',
        name: 'Rust: Compile & Run (rustc)',
        language: 'rust',
        scope: 'file',
        commandTemplate: 'rustc "${file}" -o "${fileDirname}/${fileBasenameNoExtension}" && "${fileDirname}/${fileBasenameNoExtension}" ${args}',
        interpreterPath: 'rustc',
        args: [],
        cwd: '${fileDirname}',
        isDefault: true,
      },
      {
        id: 'run.rust.cargo',
        name: 'Rust: Cargo Run (Project)',
        language: 'rust',
        scope: 'project',
        commandTemplate: 'cargo run ${args}',
        interpreterPath: 'cargo',
        args: [],
        cwd: '${workspaceFolder}',
        isDefault: false,
      },
      {
        id: 'run.go.file',
        name: 'Go: Run Active File',
        language: 'go',
        scope: 'file',
        commandTemplate: 'go run "${file}" ${args}',
        interpreterPath: 'go',
        args: [],
        cwd: '${fileDirname}',
        isDefault: true,
      },
      {
        id: 'run.java.file',
        name: 'Java: Run Single Source File',
        language: 'java',
        scope: 'file',
        commandTemplate: 'java "${file}" ${args}',
        interpreterPath: 'java',
        args: [],
        cwd: '${fileDirname}',
        isDefault: true,
      },
      {
        id: 'run.csharp.dotnet',
        name: 'C#: .NET Run (Project)',
        language: 'csharp',
        scope: 'project',
        commandTemplate: 'dotnet run ${args}',
        interpreterPath: 'dotnet',
        args: [],
        cwd: '${workspaceFolder}',
        isDefault: true,
      },
      {
        id: 'run.php.file',
        name: 'PHP: Run Active Script',
        language: 'php',
        scope: 'file',
        commandTemplate: 'php "${file}" ${args}',
        interpreterPath: 'php',
        args: [],
        cwd: '${fileDirname}',
        isDefault: true,
      },
      {
        id: 'run.ruby.file',
        name: 'Ruby: Run Active Script',
        language: 'ruby',
        scope: 'file',
        commandTemplate: 'ruby "${file}" ${args}',
        interpreterPath: 'ruby',
        args: [],
        cwd: '${fileDirname}',
        isDefault: true,
      },
      {
        id: 'run.dart.file',
        name: 'Dart: Run Active File',
        language: 'dart',
        scope: 'file',
        commandTemplate: 'dart run "${file}" ${args}',
        interpreterPath: 'dart',
        args: [],
        cwd: '${fileDirname}',
        isDefault: true,
      },
      {
        id: 'run.lua.file',
        name: 'Lua: Run Active Script',
        language: 'lua',
        scope: 'file',
        commandTemplate: 'lua "${file}" ${args}',
        interpreterPath: 'lua',
        args: [],
        cwd: '${fileDirname}',
        isDefault: true,
      },
      {
        id: 'run.shell.bash',
        name: 'Bash: Execute Script',
        language: 'shell',
        scope: 'file',
        commandTemplate: 'bash "${file}" ${args}',
        interpreterPath: 'bash',
        args: [],
        cwd: '${fileDirname}',
        isDefault: true,
      },
      {
        id: 'run.powershell.file',
        name: 'PowerShell: Execute Script',
        language: 'powershell',
        scope: 'file',
        commandTemplate: 'pwsh -File "${file}" ${args}',
        interpreterPath: 'pwsh',
        args: [],
        cwd: '${fileDirname}',
        isDefault: true,
      },
      {
        id: 'run.zig.file',
        name: 'Zig: Run Active File',
        language: 'zig',
        scope: 'file',
        commandTemplate: 'zig run "${file}" ${args}',
        interpreterPath: 'zig',
        args: [],
        cwd: '${fileDirname}',
        isDefault: true,
      },
      {
        id: 'run.elixir.file',
        name: 'Elixir: Run Active Script',
        language: 'elixir',
        scope: 'file',
        commandTemplate: 'elixir "${file}" ${args}',
        interpreterPath: 'elixir',
        args: [],
        cwd: '${fileDirname}',
        isDefault: true,
      },
      {
        id: 'run.r.file',
        name: 'R: Run Active Script',
        language: 'r',
        scope: 'file',
        commandTemplate: 'Rscript "${file}" ${args}',
        interpreterPath: 'Rscript',
        args: [],
        cwd: '${fileDirname}',
        isDefault: true,
      },
      {
        id: 'run.julia.file',
        name: 'Julia: Run Active File',
        language: 'julia',
        scope: 'file',
        commandTemplate: 'julia "${file}" ${args}',
        interpreterPath: 'julia',
        args: [],
        cwd: '${fileDirname}',
        isDefault: true,
      },
      {
        id: 'run.npm.start',
        name: 'Node: npm start / dev',
        language: '*',
        scope: 'project',
        commandTemplate: 'npm start ${args}',
        args: [],
        cwd: '${workspaceFolder}',
        isDefault: false,
      },
    ]
  }

  public getProfiles(): RunProfile[] {
    return Array.from(this.profiles.values())
  }

  public getProfileById(id: string): RunProfile | undefined {
    return this.profiles.get(id)
  }

  /**
   * Finds the best matching run profile for a given language ID.
   */
  public getProfileForLanguage(languageId: string): RunProfile | undefined {
    const lang = (languageId || '').toLowerCase().trim()
    const all = this.getProfiles()

    // Map common aliases
    const aliasMap: Record<string, string> = {
      py: 'python',
      js: 'javascript',
      mjs: 'javascript',
      cjs: 'javascript',
      ts: 'typescript',
      mts: 'typescript',
      cts: 'typescript',
      jsx: 'javascript',
      tsx: 'typescript',
      cplusplus: 'cpp',
      cxx: 'cpp',
      cc: 'cpp',
      sh: 'shell',
      bash: 'shell',
      zsh: 'shell',
      ps1: 'powershell',
      psm1: 'powershell',
      rs: 'rust',
      golang: 'go',
      cs: 'csharp',
      dotnet: 'csharp',
      rb: 'ruby',
      jl: 'julia',
      ex: 'elixir',
      exs: 'elixir',
    }

    const normalizedLang = aliasMap[lang] || lang

    // 1. Default profile for exact language
    const exactDefault = all.find((p) => p.language === normalizedLang && p.isDefault)
    if (exactDefault) return exactDefault

    // 2. Any profile for exact language
    const exactAny = all.find((p) => p.language === normalizedLang)
    if (exactAny) return exactAny

    // 3. Fallback to generic project or shell runner
    return all.find((p) => p.language === '*') || all[0]
  }

  /**
   * Save or update a run profile.
   */
  public saveProfile(profile: RunProfile): void {
    if (!profile.id) {
      profile.id = `run.custom.${Date.now()}`
    }

    // If set as default, unset other defaults for this language
    if (profile.isDefault && profile.language) {
      for (const [id, p] of this.profiles.entries()) {
        if (p.language === profile.language && id !== profile.id) {
          p.isDefault = false
        }
      }
    }

    this.profiles.set(profile.id, { ...profile })
    this.persistCustomProfiles()
    this.notifyListeners()
  }

  /**
   * Delete a custom run profile.
   */
  public deleteProfile(profileId: string): boolean {
    const existing = this.profiles.get(profileId)
    if (!existing) return false

    // If it's a builtin, reset it to default builtin state
    const builtins = this.getBuiltinProfiles()
    const builtin = builtins.find((b) => b.id === profileId)
    if (builtin) {
      this.profiles.set(profileId, { ...builtin })
    } else {
      this.profiles.delete(profileId)
    }

    this.persistCustomProfiles()
    this.notifyListeners()
    return true
  }

  /**
   * Reset all profiles to factory defaults.
   */
  public resetToDefaults(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
    this.initializeProfiles()
    this.notifyListeners()
  }

  private persistCustomProfiles(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const custom = Array.from(this.profiles.values())
        localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))
      }
    } catch (e) {
      console.warn('[RunService] Failed to persist custom profiles:', e)
    }
  }

  /**
   * Resolves variable templates (${file}, ${fileDirname}, ${workspaceFolder}, ${args}, etc.)
   */
  public interpolate(template: string, context: RunContext): string {
    if (!template) return ''

    const filePath = context.filePath || ''
    const workspacePath = context.workspacePath || '.'
    const customArgs = context.customArgs || ''

    // Normalizing file path parts
    const normalizedFile = filePath.replace(/\\/g, '/')
    const lastSlash = normalizedFile.lastIndexOf('/')
    const fileDirname = lastSlash !== -1 ? normalizedFile.substring(0, lastSlash) : '.'
    const fileBasename = lastSlash !== -1 ? normalizedFile.substring(lastSlash + 1) : normalizedFile
    const dotIndex = fileBasename.lastIndexOf('.')
    const fileBasenameNoExtension = dotIndex !== -1 ? fileBasename.substring(0, dotIndex) : fileBasename
    const fileExtname = dotIndex !== -1 ? fileBasename.substring(dotIndex) : ''

    return template
      .replace(/\$\{file\}/g, filePath || '')
      .replace(/\$\{fileBasename\}/g, fileBasename)
      .replace(/\$\{fileBasenameNoExtension\}/g, fileBasenameNoExtension)
      .replace(/\$\{fileDirname\}/g, fileDirname)
      .replace(/\$\{fileExtname\}/g, fileExtname)
      .replace(/\$\{workspaceFolder\}/g, workspacePath)
      .replace(/\$\{args\}/g, customArgs)
      .trim()
  }

  /**
   * Prepares and resolves full execution command object for a profile and context.
   */
  public resolveRunCommand(profile: RunProfile, context: RunContext): ResolvedRunCommand {
    let rawCommand = profile.commandTemplate || ''

    // If custom interpreter path is set and template begins with generic binary name
    if (profile.interpreterPath) {
      const parts = rawCommand.split(' ')
      if (parts.length > 0) {
        // e.g. replacing 'python' with 'C:/venv/bin/python.exe' if specified
        rawCommand = rawCommand.replace(parts[0], `"${profile.interpreterPath}"`)
      }
    }

    // Append profile default args if not already supplied
    let combinedArgs = (context.customArgs || '').trim()
    if (profile.args && profile.args.length > 0) {
      const profileArgs = profile.args.join(' ')
      combinedArgs = combinedArgs ? `${profileArgs} ${combinedArgs}` : profileArgs
    }

    const command = this.interpolate(rawCommand, {
      ...context,
      customArgs: combinedArgs,
    })

    const cwd = this.interpolate(profile.cwd || '${fileDirname}', context) || '.'
    const preLaunchCommand = profile.preLaunchTask
      ? this.interpolate(profile.preLaunchTask, context)
      : undefined
    const postLaunchCommand = profile.postLaunchTask
      ? this.interpolate(profile.postLaunchTask, context)
      : undefined

    const env = {
      ...(profile.env || {}),
      ...(context.customEnv || {}),
    }

    return {
      command,
      cwd,
      preLaunchCommand,
      postLaunchCommand,
      env,
      profile,
    }
  }

  /**
   * Executes a RunProfile in the integrated terminal subsystem.
   */
  public async execute(
    profile: RunProfile,
    context: RunContext,
    callbacks?: { onOpenTerminal?: () => void }
  ): Promise<boolean> {
    const resolved = this.resolveRunCommand(profile, context)
    this.isRunning = true
    this.notifyListeners()

    try {
      callbacks?.onOpenTerminal?.()

      // Find or create a dedicated "Run" terminal tab
      const tabs = terminalService.getTabs()
      const runTabTitle = `Run: ${profile.name}`
      let targetTab = tabs.find((t) => t.title === runTabTitle || t.title.startsWith('Run:'))

      if (!targetTab) {
        targetTab = await terminalService.createTab({
          cwd: resolved.cwd !== '.' ? resolved.cwd : undefined,
        })
        targetTab.title = runTabTitle
      } else {
        terminalService.setActiveTab(targetTab.id)
      }

      const timestamp = new Date().toLocaleTimeString()
      const banner =
        `\r\n\x1b[35m╭── [IndoctrinatedEdit Runner] ──────────────────────────────────────────\x1b[0m\r\n` +
        `\x1b[90m│ Profile:   \x1b[37m${profile.name}\x1b[0m\r\n` +
        `\x1b[90m│ Target:    \x1b[36m${context.filePath || 'Workspace'}\x1b[0m\r\n` +
        `\x1b[90m│ WorkingDir:\x1b[90m ${resolved.cwd}\x1b[0m\r\n` +
        `\x1b[90m│ Started:   \x1b[90m ${timestamp}\x1b[0m\r\n` +
        `\x1b[35m╰────────────────────────────────────────────────────────────────────────\x1b[0m\r\n`

      terminalService.appendOutput(targetTab.id, banner)

      // 1. Run Pre-launch step if configured
      if (resolved.preLaunchCommand) {
        terminalService.appendOutput(
          targetTab.id,
          `\x1b[33m> Pre-Launch: ${resolved.preLaunchCommand}\x1b[0m\r\n`
        )
        await terminalService.write(targetTab.id, `${resolved.preLaunchCommand}\r\n`)
        // brief pause before main execution
        await new Promise((r) => setTimeout(r, 400))
      }

      // 2. Run Main Command
      terminalService.appendOutput(
        targetTab.id,
        `\x1b[32m> Executing: ${resolved.command}\x1b[0m\r\n`
      )
      await terminalService.write(targetTab.id, `${resolved.command}\r\n`)

      return true
    } catch (err) {
      console.error('[RunService] Error during run execution:', err)
      return false
    } finally {
      this.isRunning = false
      this.notifyListeners()
    }
  }

  /**
   * Executes the active file using its default or resolved profile.
   */
  public async runActiveFile(
    filePath: string,
    language: string,
    customArgs?: string,
    workspacePath?: string,
    callbacks?: { onOpenTerminal?: () => void }
  ): Promise<boolean> {
    const profile = this.getProfileForLanguage(language)
    if (!profile) {
      console.warn(`[RunService] No run profile found for language: ${language}`)
      return false
    }

    return await this.execute(
      profile,
      {
        filePath,
        workspacePath,
        customArgs,
      },
      callbacks
    )
  }

  public getIsRunning(): boolean {
    return this.isRunning
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    for (const l of this.listeners) {
      try {
        l()
      } catch (e) {
        console.error(e)
      }
    }
  }
}

export const runService = RunService.getInstance()

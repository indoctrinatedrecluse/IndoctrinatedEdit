/**
 * ✨ Workspace Tasks & Launch Configuration Engine (.vscode/tasks.json & launch.json)
 * 
 * Manages automated task execution, build pipelines, problem matching, variable resolution,
 * and launch configurations for multiple runtimes (Node, Rust, Go, Python, C++, Dart).
 */

export interface WorkspaceTask {
  label: string
  type: 'shell' | 'process' | 'npm'
  command: string
  args?: string[]
  group?: 'build' | 'test' | 'clean' | 'none'
  isBackground?: boolean
  problemMatcher?: string[]
  options?: {
    cwd?: string
    env?: Record<string, string>
  }
}

export interface TasksConfiguration {
  version: string
  tasks: WorkspaceTask[]
}

export interface LaunchConfigurationItem {
  name: string
  type: 'node' | 'python' | 'go' | 'lldb' | 'cppdbg' | 'dart'
  request: 'launch' | 'attach'
  program?: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  preLaunchTask?: string
  port?: number
  stopOnEntry?: boolean
}

export interface LaunchConfiguration {
  version: string
  configurations: LaunchConfigurationItem[]
}

export interface TaskExecutionResult {
  taskId: string
  taskLabel: string
  commandExecuted: string
  status: 'running' | 'success' | 'failed'
  durationMs: number
  outputLogs: string[]
}

class TaskLaunchConfigService {
  private tasksConfig: TasksConfiguration = {
    version: '2.0.0',
    tasks: [],
  }

  private launchConfig: LaunchConfiguration = {
    version: '0.2.0',
    configurations: [],
  }

  constructor() {
    this.resetDefaultConfigs()
  }

  public resetDefaultConfigs() {
    this.tasksConfig = {
      version: '2.0.0',
      tasks: [
        {
          label: 'npm: build',
          type: 'npm',
          command: 'npm run build',
          group: 'build',
          problemMatcher: ['$tsc'],
        },
        {
          label: 'npm: test',
          type: 'npm',
          command: 'npm test -- --run',
          group: 'test',
          problemMatcher: [],
        },
        {
          label: 'cargo: build',
          type: 'shell',
          command: 'cargo build',
          group: 'build',
          problemMatcher: ['$rustc'],
        },
        {
          label: 'pytest: run tests',
          type: 'shell',
          command: 'pytest -v',
          group: 'test',
          problemMatcher: [],
        },
      ],
    }

    this.launchConfig = {
      version: '0.2.0',
      configurations: [
        {
          name: 'Launch Active File (Node.js)',
          type: 'node',
          request: 'launch',
          program: '${file}',
          cwd: '${workspaceFolder}',
        },
        {
          name: 'Python: Current File',
          type: 'python',
          request: 'launch',
          program: '${file}',
          cwd: '${workspaceFolder}',
        },
        {
          name: 'Go: Launch Package',
          type: 'go',
          request: 'launch',
          program: '${workspaceFolder}',
        },
        {
          name: 'Rust: Debug Binary (LLDB)',
          type: 'lldb',
          request: 'launch',
          program: '${workspaceFolder}/target/debug/${workspaceFolderBasename}',
          cwd: '${workspaceFolder}',
          preLaunchTask: 'cargo: build',
        },
      ],
    }
  }

  /**
   * Parse tasks.json string into configuration
   */
  public parseTasksJson(jsonString: string): TasksConfiguration {
    try {
      const parsed = JSON.parse(jsonString)
      if (Array.isArray(parsed.tasks)) {
        this.tasksConfig = parsed
      }
      return this.tasksConfig
    } catch (err) {
      console.warn('Failed to parse tasks.json:', err)
      return this.tasksConfig
    }
  }

  /**
   * Parse launch.json string into configuration
   */
  public parseLaunchJson(jsonString: string): LaunchConfiguration {
    try {
      const parsed = JSON.parse(jsonString)
      if (Array.isArray(parsed.configurations)) {
        this.launchConfig = parsed
      }
      return this.launchConfig
    } catch (err) {
      console.warn('Failed to parse launch.json:', err)
      return this.launchConfig
    }
  }

  public getTasks(): WorkspaceTask[] {
    return this.tasksConfig.tasks
  }

  public getLaunchConfigs(): LaunchConfigurationItem[] {
    return this.launchConfig.configurations
  }

  /**
   * Resolve variables like ${file}, ${workspaceFolder}, ${fileBasename}
   */
  public resolveVariables(
    input: string,
    context: {
      workspaceFolder?: string
      filePath?: string
    }
  ): string {
    const ws = context.workspaceFolder || '.'
    const fp = context.filePath || 'untitled.ts'
    const baseName = fp.split(/[/\\]/).pop() || fp
    const dirName = fp.split(/[/\\]/).slice(0, -1).join('/') || '.'
    const wsBaseName = ws.split(/[/\\]/).pop() || 'workspace'

    return input
      .replace(/\${workspaceFolder}/g, ws)
      .replace(/\${workspaceFolderBasename}/g, wsBaseName)
      .replace(/\${file}/g, fp)
      .replace(/\${fileBasename}/g, baseName)
      .replace(/\${fileDirname}/g, dirName)
  }

  /**
   * Execute a task with variable resolution
   */
  public async executeTask(
    task: WorkspaceTask,
    context: { workspaceFolder?: string; filePath?: string }
  ): Promise<TaskExecutionResult> {
    const start = performance.now()
    const resolvedCommand = this.resolveVariables(task.command, context)
    const resolvedArgs = (task.args || []).map((a) => this.resolveVariables(a, context))
    const fullCommand = [resolvedCommand, ...resolvedArgs].join(' ')

    // Simulate task execution
    await new Promise((resolve) => setTimeout(resolve, 60))
    const duration = Math.round(performance.now() - start)

    return {
      taskId: task.label,
      taskLabel: task.label,
      commandExecuted: fullCommand,
      status: 'success',
      durationMs: duration,
      outputLogs: [
        `> Executing task: ${task.label}`,
        `> Command: ${fullCommand}`,
        `Process terminated with exit code 0.`,
      ],
    }
  }
}

export const taskLaunchConfigService = new TaskLaunchConfigService()

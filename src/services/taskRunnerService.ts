/**
 * IndoctrinatedEdit - Task Runner & Cron Expression Studio Service
 */

export interface ProjectTask {
  id: string
  name: string
  command: string
  source: 'package.json' | 'Makefile' | 'Cargo.toml' | 'Python' | 'Custom'
  lastRun?: {
    status: 'success' | 'failed' | 'running'
    durationMs: number
    timestamp: string
    output: string
  }
}

export interface CronScheduleAnalysis {
  expression: string
  isValid: boolean
  humanReadable: string
  error?: string
  nextOccurrences: string[]
}

class TaskRunnerService {
  private tasks: ProjectTask[] = [
    { id: 'task_build', name: 'build', command: 'tsc && vite build', source: 'package.json' },
    { id: 'task_test', name: 'test', command: 'vitest run', source: 'package.json' },
    { id: 'task_dev', name: 'dev', command: 'vite', source: 'package.json' },
    { id: 'task_lint', name: 'lint', command: 'eslint src --ext .ts,.tsx', source: 'package.json' },
    { id: 'task_clean', name: 'clean', command: 'rimraf dist dist-electron', source: 'package.json' },
  ]

  public getTasks(): ProjectTask[] {
    return [...this.tasks]
  }

  public async runTask(taskId: string): Promise<ProjectTask | null> {
    const task = this.tasks.find((t) => t.id === taskId)
    if (!task) return null

    task.lastRun = {
      status: 'running',
      durationMs: 0,
      timestamp: new Date().toLocaleTimeString(),
      output: `> Running "${task.command}"...\n`,
    }

    const start = performance.now()
    await new Promise((r) => setTimeout(r, 600))
    const durationMs = Math.round(performance.now() - start)

    task.lastRun = {
      status: 'success',
      durationMs,
      timestamp: new Date().toLocaleTimeString(),
      output: `> Running "${task.command}"...\n✔ Task finished with exit code 0 (${durationMs}ms)\n`,
    }

    return { ...task }
  }

  /**
   * Parse and explain 5-field standard Cron expressions
   */
  public analyzeCron(expression: string): CronScheduleAnalysis {
    const clean = expression.trim()
    const parts = clean.split(/\s+/)

    if (parts.length !== 5) {
      return {
        expression: clean,
        isValid: false,
        humanReadable: 'Invalid Cron: Must have 5 fields (minute hour day-of-month month day-of-week).',
        error: 'Expected 5 parts: [min] [hour] [day-of-month] [month] [day-of-week]',
        nextOccurrences: [],
      }
    }

    const [min, hour, dom, mon, dow] = parts
    let explanation = 'Runs '

    if (min === '*' && hour === '*') explanation += 'every minute of every hour'
    else if (min.startsWith('*/')) explanation += `every ${min.replace('*/', '')} minutes`
    else if (hour === '*' && min !== '*') explanation += `at minute ${min} of every hour`
    else explanation += `at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`

    if (dow !== '*') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      explanation += ` on ${days[parseInt(dow, 10)] || dow}`
    }

    if (dom !== '*') {
      explanation += ` on day ${dom} of the month`
    }

    if (mon !== '*') {
      explanation += ` in month ${mon}`
    }

    // Calculate next 10 simulated occurrences
    const occurrences: string[] = []
    const now = new Date()
    for (let i = 1; i <= 10; i++) {
      const next = new Date(now.getTime() + i * 3600 * 1000)
      occurrences.push(next.toLocaleString())
    }

    return {
      expression: clean,
      isValid: true,
      humanReadable: explanation,
      nextOccurrences: occurrences,
    }
  }
}

export const taskRunnerService = new TaskRunnerService()

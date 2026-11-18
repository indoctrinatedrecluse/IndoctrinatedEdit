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

const MONTH_NAMES: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
}

const DOW_NAMES: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
}

function parseCronField(
  raw: string,
  min: number,
  max: number,
  names?: Record<string, number>,
  normalizeSevenToZero = false
): { values: Set<number> | null; error?: string } {
  const field = raw.trim().toUpperCase()
  if (!field) return { values: null, error: 'Empty cron field' }

  const values = new Set<number>()
  const segments = field.split(',')

  const parseToken = (tok: string): number | null => {
    if (names && tok in names) return names[tok]
    if (!/^\d+$/.test(tok)) return null
    let num = parseInt(tok, 10)
    if (normalizeSevenToZero && num === 7) num = 0
    if (num < min || num > (normalizeSevenToZero ? 7 : max)) return null
    return num
  }

  for (const seg of segments) {
    if (!seg) return { values: null, error: `Invalid empty list entry in "${raw}"` }
    const [rangePart, stepPart, ...extra] = seg.split('/')
    if (extra.length > 0) return { values: null, error: `Too many "/" operators in "${seg}"` }

    let step = 1
    if (stepPart !== undefined) {
      if (!/^\d+$/.test(stepPart)) return { values: null, error: `Invalid step "${stepPart}" in "${seg}"` }
      step = parseInt(stepPart, 10)
      if (step <= 0) return { values: null, error: `Step must be >= 1 in "${seg}"` }
    }

    if (rangePart === '*') {
      for (let v = min; v <= max; v += step) values.add(v)
    } else if (rangePart.includes('-')) {
      const bounds = rangePart.split('-')
      if (bounds.length !== 2) return { values: null, error: `Invalid range "${rangePart}"` }
      const start = parseToken(bounds[0])
      const end = parseToken(bounds[1])
      if (start === null || end === null || start > end) {
        return { values: null, error: `Out-of-bounds range "${rangePart}" (${min}-${max})` }
      }
      for (let v = start; v <= end; v += step) values.add(v)
    } else {
      const single = parseToken(rangePart)
      if (single === null) return { values: null, error: `Invalid value "${rangePart}" (allowed ${min}-${max})` }
      if (stepPart !== undefined) {
        for (let v = single; v <= max; v += step) values.add(v)
      } else {
        values.add(single)
      }
    }
  }

  return values.size > 0 ? { values } : { values: null, error: `No valid values in "${raw}"` }
}

class TaskRunnerService {
  private customTasksStorageKey = 'indoctrinated_custom_tasks'
  private tasks: ProjectTask[] = [
    { id: 'task_build', name: 'build', command: 'npm run build', source: 'package.json' },
    { id: 'task_test', name: 'test', command: 'npm test', source: 'package.json' },
    { id: 'task_dev', name: 'dev', command: 'npm run dev', source: 'package.json' },
    { id: 'task_lint', name: 'lint', command: 'npm run lint', source: 'package.json' },
  ]
  private workspaceRoot: string | undefined

  constructor() {
    this.loadPersistedCustomTasks()
  }

  private loadPersistedCustomTasks() {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      const raw = localStorage.getItem(this.customTasksStorageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          const nonCustom = this.tasks.filter((t) => !t.id.startsWith('custom_'))
          this.tasks = [...nonCustom, ...parsed]
        }
      }
    } catch {
      // ignore
    }
  }

  private persistCustomTasks() {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      const customTasks = this.tasks.filter((t) => t.source === 'Custom' && t.id.startsWith('custom_'))
      localStorage.setItem(this.customTasksStorageKey, JSON.stringify(customTasks))
    } catch {
      // ignore
    }
  }

  public getTasks(): ProjectTask[] {
    return [...this.tasks]
  }

  public addCustomTask(name: string, command: string): ProjectTask {
    const task: ProjectTask = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim() || 'Custom Task',
      command: command.trim(),
      source: 'Custom',
    }
    this.tasks = [...this.tasks, task]
    this.persistCustomTasks()
    return task
  }

  public deleteCustomTask(taskId: string): boolean {
    const prevLen = this.tasks.length
    this.tasks = this.tasks.filter((t) => t.id !== taskId)
    if (this.tasks.length !== prevLen) {
      this.persistCustomTasks()
      return true
    }
    return false
  }

  /**
   * Discover real workspace tasks from package.json, Makefile, and Cargo.toml when in desktop mode.
   */
  public async discoverWorkspaceTasks(workspaceRoot?: string): Promise<ProjectTask[]> {
    this.workspaceRoot = workspaceRoot
    if (!workspaceRoot || typeof window === 'undefined' || !window.electronAPI?.readFile) {
      return this.getTasks()
    }

    const discovered: ProjectTask[] = []
    const root = workspaceRoot.replace(/[\\/]+$/, '')

    // 1. package.json scripts
    try {
      const pkgRaw = await window.electronAPI.readFile(`${root}/package.json`)
      const pkg = JSON.parse(pkgRaw)
      if (pkg?.scripts && typeof pkg.scripts === 'object') {
        for (const [name, cmd] of Object.entries<any>(pkg.scripts)) {
          if (typeof cmd === 'string') {
            discovered.push({
              id: `pkg_${name}`,
              name,
              command: `npm run ${name}`,
              source: 'package.json',
            })
          }
        }
      }
    } catch {
      // No package.json
    }

    // 2. Makefile targets
    try {
      const makeRaw = await window.electronAPI.readFile(`${root}/Makefile`)
      const targetRegex = /^([a-zA-Z0-9_-]+)\s*:(?!=)/gm
      let m: RegExpExecArray | null
      while ((m = targetRegex.exec(makeRaw)) !== null) {
        const target = m[1]
        if (target === '.PHONY') continue
        discovered.push({
          id: `make_${target}`,
          name: target,
          command: `make ${target}`,
          source: 'Makefile',
        })
      }
    } catch {
      // No Makefile
    }

    // 3. Cargo.toml
    try {
      await window.electronAPI.readFile(`${root}/Cargo.toml`)
      discovered.push(
        { id: 'cargo_build', name: 'cargo build', command: 'cargo build', source: 'Cargo.toml' },
        { id: 'cargo_test', name: 'cargo test', command: 'cargo test', source: 'Cargo.toml' },
        { id: 'cargo_check', name: 'cargo check', command: 'cargo check', source: 'Cargo.toml' }
      )
    } catch {
      // No Cargo.toml
    }

    // 4. pyproject.toml / Python scripts
    try {
      const pyRaw = await window.electronAPI.readFile(`${root}/pyproject.toml`)
      discovered.push({ id: 'py_pytest', name: 'pytest', command: 'pytest -v', source: 'Python' })
      if (pyRaw.includes('ruff')) {
        discovered.push({ id: 'py_ruff', name: 'ruff check', command: 'ruff check .', source: 'Python' })
      }
    } catch {
      // No pyproject.toml
    }

    // 5. .vscode/tasks.json
    try {
      const vscRaw = await window.electronAPI.readFile(`${root}/.vscode/tasks.json`)
      const cleaned = vscRaw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1')
      const parsed = JSON.parse(cleaned)
      if (Array.isArray(parsed.tasks)) {
        for (const t of parsed.tasks) {
          if (t?.label && t?.command) {
            const fullCmd = Array.isArray(t.args) ? `${t.command} ${t.args.join(' ')}` : String(t.command)
            discovered.push({
              id: `vsc_${t.label}`,
              name: t.label,
              command: fullCmd,
              source: 'Custom',
            })
          }
        }
      }
    } catch {
      // No .vscode/tasks.json
    }

    if (discovered.length > 0) {
      const customTasks = this.tasks.filter((t) => t.id.startsWith('custom_'))
      this.tasks = [...discovered, ...customTasks]
    }
    return this.getTasks()
  }

  public async runTask(taskId: string, cwd?: string): Promise<ProjectTask | null> {
    const task = this.tasks.find((t) => t.id === taskId)
    if (!task) return null

    task.lastRun = {
      status: 'running',
      durationMs: 0,
      timestamp: new Date().toLocaleTimeString(),
      output: `> Running "${task.command}"...\n`,
    }

    const start = performance.now()
    if (typeof window !== 'undefined' && window.electronAPI?.workspace?.execCommand) {
      const res = await window.electronAPI.workspace.execCommand({
        command: task.command,
        cwd: cwd || this.workspaceRoot,
        timeoutMs: 120000,
      })
      const combined = [res.stdout, res.stderr].filter(Boolean).join('\n').trim()
      const status = res.exitCode === 0 ? 'success' : 'failed'
      task.lastRun = {
        status,
        durationMs: res.durationMs,
        timestamp: new Date().toLocaleTimeString(),
        output:
          `> ${task.command}\n` +
          (combined ? `${combined.slice(0, 8000)}\n` : '') +
          `${status === 'success' ? '✔' : '✖'} Exited with code ${res.exitCode} (${res.durationMs}ms)${res.timedOut ? ' [Timed Out]' : ''}\n`,
      }
      return { ...task }
    }

    // Browser-only fallback (no local shell available)
    const durationMs = Math.max(1, Math.round(performance.now() - start))
    task.lastRun = {
      status: 'success',
      durationMs,
      timestamp: new Date().toLocaleTimeString(),
      output: `> ${task.command}\n[Browser Preview] Shell execution requires the desktop app (${durationMs}ms)\n`,
    }
    return { ...task }
  }

  /**
   * Strictly parse, validate, explain, and compute genuine next 10 occurrences for 5-field Cron expressions.
   */
  public analyzeCron(expression: string, fromDate: Date = new Date()): CronScheduleAnalysis {
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

    const [minRaw, hourRaw, domRaw, monRaw, dowRaw] = parts
    const minP = parseCronField(minRaw, 0, 59)
    const hourP = parseCronField(hourRaw, 0, 23)
    const domP = parseCronField(domRaw, 1, 31)
    const monP = parseCronField(monRaw, 1, 12, MONTH_NAMES)
    const dowP = parseCronField(dowRaw, 0, 6, DOW_NAMES, true)

    const firstError = minP.error || hourP.error || domP.error || monP.error || dowP.error
    if (firstError || !minP.values || !hourP.values || !domP.values || !monP.values || !dowP.values) {
      return {
        expression: clean,
        isValid: false,
        humanReadable: `Invalid Cron expression: ${firstError}`,
        error: firstError || 'Invalid cron field',
        nextOccurrences: [],
      }
    }

    let explanation = 'Runs '
    if (minRaw === '*' && hourRaw === '*') {
      explanation += 'every minute'
    } else if (minRaw.startsWith('*/') && hourRaw === '*') {
      explanation += `every ${minRaw.slice(2)} minutes`
    } else if (minRaw.startsWith('*/')) {
      explanation += `every ${minRaw.slice(2)} minutes during hour(s) [${hourRaw}]`
    } else if (hourRaw === '*') {
      explanation += `at minute ${minRaw} of every hour`
    } else if (hourRaw.startsWith('*/')) {
      explanation += `at minute ${minRaw} past every ${hourRaw.slice(2)} hours`
    } else if (minRaw.includes(',') || minRaw.includes('-') || hourRaw.includes(',') || hourRaw.includes('-')) {
      explanation += `at minute(s) [${minRaw}] of hour(s) [${hourRaw}]`
    } else {
      explanation += `at ${hourRaw.padStart(2, '0')}:${minRaw.padStart(2, '0')}`
    }

    if (dowRaw !== '*') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      if (dowRaw === '1-5') {
        explanation += ' on weekdays (Mon–Fri)'
      } else if (dowRaw === '6,0' || dowRaw === '0,6') {
        explanation += ' on weekends (Sat–Sun)'
      } else {
        const dayLabels = Array.from(dowP.values).sort((a, b) => a - b).map((d) => days[d] || String(d))
        explanation += ` on ${dayLabels.join(', ')}`
      }
    }
    if (domRaw !== '*') {
      explanation += domRaw.includes(',') || domRaw.includes('-')
        ? ` on days [${domRaw}] of the month`
        : ` on day ${domRaw} of the month`
    }
    if (monRaw !== '*') {
      const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const monLabels = Array.from(monP.values).sort((a, b) => a - b).map((m) => months[m] || String(m))
      explanation += ` in ${monLabels.join(', ')}`
    }

    // Compute genuine next 10 matching timestamps (searching up to 4 years ahead)
    const occurrences: string[] = []
    const cursor = new Date(fromDate.getTime())
    cursor.setSeconds(0, 0)
    cursor.setMinutes(cursor.getMinutes() + 1)

    const maxYear = cursor.getFullYear() + 4
    const domWild = domRaw === '*'
    const dowWild = dowRaw === '*'
    let safety = 0

    while (occurrences.length < 10 && cursor.getFullYear() <= maxYear && safety < 500000) {
      safety++
      const m = cursor.getMonth() + 1
      if (!monP.values.has(m)) {
        cursor.setMonth(cursor.getMonth() + 1, 1)
        cursor.setHours(0, 0, 0, 0)
        continue
      }

      const domMatch = domP.values.has(cursor.getDate())
      const dowMatch = dowP.values.has(cursor.getDay())
      const dayOk = domWild && dowWild ? true : domWild ? dowMatch : dowWild ? domMatch : domMatch || dowMatch

      if (!dayOk) {
        cursor.setDate(cursor.getDate() + 1)
        cursor.setHours(0, 0, 0, 0)
        continue
      }

      if (!hourP.values.has(cursor.getHours())) {
        cursor.setHours(cursor.getHours() + 1, 0, 0, 0)
        continue
      }

      if (!minP.values.has(cursor.getMinutes())) {
        cursor.setMinutes(cursor.getMinutes() + 1, 0, 0)
        continue
      }

      occurrences.push(cursor.toLocaleString())
      cursor.setMinutes(cursor.getMinutes() + 1, 0, 0)
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

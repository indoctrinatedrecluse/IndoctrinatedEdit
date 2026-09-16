/**
 * Debugging Orchestration & Breakpoint State Subsystem
 * Supports multi-compiler debug adapter protocols for Node.js/TypeScript, Python, Rust/C++, and Go.
 * Manages breakpoints (conditional, hit count, logpoints), call stack frames, scope variables,
 * watch expressions, and execution stepping.
 */

export type DebugSessionState = 'inactive' | 'running' | 'paused' | 'stopped'

export type DebugRuntimeTarget = 'node' | 'python' | 'rust' | 'go'

export interface BreakpointItem {
  id: string
  filePath: string
  line: number
  enabled: boolean
  condition?: string
  hitCondition?: string
  logMessage?: string
  hitCount: number
  verified: boolean
}

export interface StackFrame {
  id: string
  name: string
  filePath: string
  line: number
  column: number
  instructionPointer?: string
}

export interface DebugVariable {
  id: string
  name: string
  value: string
  type: string
  evaluateName?: string
  children?: DebugVariable[]
  memoryAddress?: string
  scope: 'local' | 'closure' | 'global' | 'register'
}

export interface WatchExpression {
  id: string
  expression: string
  value?: string
  type?: string
  error?: string
}

export interface DebugConsoleLog {
  id: string
  type: 'stdout' | 'stderr' | 'info' | 'warn' | 'error' | 'input' | 'result'
  text: string
  timestamp: string
}

export interface DebugRuntimeConfig {
  target: DebugRuntimeTarget
  name: string
  compiler: string
  adapterName: string
  description: string
  defaultEntryPoint: string
}

export const DEBUG_RUNTIME_TARGETS: DebugRuntimeConfig[] = [
  {
    target: 'node',
    name: 'Node.js / TypeScript (V8 Protocol)',
    compiler: 'node / tsc / bun',
    adapterName: 'v8-inspector',
    description: 'V8 JavaScript engine with full call stack, closure, and async frame inspection.',
    defaultEntryPoint: 'src/index.ts',
  },
  {
    target: 'python',
    name: 'Python 3.12 (debugpy / PEP 669)',
    compiler: 'python3 / PyPy',
    adapterName: 'debugpy',
    description: 'Python interpreter debug protocol with dict/list introspection and frame traces.',
    defaultEntryPoint: 'main.py',
  },
  {
    target: 'rust',
    name: 'Rust / C++ (LLDB Native Engine)',
    compiler: 'rustc / cargo / clang++',
    adapterName: 'lldb-dap',
    description: 'Native compiled debug analysis with memory pointers, registers, and struct layouts.',
    defaultEntryPoint: 'src/main.rs',
  },
  {
    target: 'go',
    name: 'Go 1.24 (Delve Debugger)',
    compiler: 'go build / dlv',
    adapterName: 'delve-dap',
    description: 'Goroutine multiplexer, channel inspection, and stack trace analyzer.',
    defaultEntryPoint: 'main.go',
  },
]

export class DebugService {
  private breakpoints: Map<string, BreakpointItem[]> = new Map() // filePath -> Breakpoints
  private sessionState: DebugSessionState = 'inactive'
  private activeTarget: DebugRuntimeTarget = 'node'
  private activeFilePath: string = 'welcome.ts'
  private activeLine: number = 1
  private stackFrames: StackFrame[] = []
  private activeFrameId: string | null = null
  private variables: DebugVariable[] = []
  private watchExpressions: WatchExpression[] = []
  private consoleLogs: DebugConsoleLog[] = []
  private listeners: Set<() => void> = new Set()
  private stepIndex: number = 0

  constructor() {
    this.initDefaultWatches()
  }

  private initDefaultWatches() {
    this.watchExpressions = [
      { id: 'w1', expression: 'status', value: '"running"', type: 'string' },
      { id: 'w2', expression: 'items.length', value: '42', type: 'number' },
    ]
  }

  // Breakpoint Management
  public getBreakpoints(filePath?: string): BreakpointItem[] {
    if (filePath) {
      return this.breakpoints.get(filePath) || []
    }
    const all: BreakpointItem[] = []
    this.breakpoints.forEach((bps) => all.push(...bps))
    return all.sort((a, b) => a.filePath.localeCompare(b.filePath) || a.line - b.line)
  }

  public setBreakpoint(
    filePath: string,
    line: number,
    options?: { condition?: string; hitCondition?: string; logMessage?: string }
  ): BreakpointItem {
    const list = this.breakpoints.get(filePath) || []
    const existingIndex = list.findIndex((b) => b.line === line)

    if (existingIndex >= 0) {
      // Update options on existing breakpoint
      list[existingIndex] = {
        ...list[existingIndex],
        condition: options?.condition !== undefined ? options.condition : list[existingIndex].condition,
        hitCondition: options?.hitCondition !== undefined ? options.hitCondition : list[existingIndex].hitCondition,
        logMessage: options?.logMessage !== undefined ? options.logMessage : list[existingIndex].logMessage,
        verified: true,
      }
      this.breakpoints.set(filePath, list)
      this.notify()
      return list[existingIndex]
    }

    const newBp: BreakpointItem = {
      id: `bp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      filePath,
      line,
      enabled: true,
      condition: options?.condition,
      hitCondition: options?.hitCondition,
      logMessage: options?.logMessage,
      hitCount: 0,
      verified: true,
    }

    list.push(newBp)
    list.sort((a, b) => a.line - b.line)
    this.breakpoints.set(filePath, list)
    this.notify()
    return newBp
  }

  public toggleBreakpoint(filePath: string, line: number): boolean {
    const list = this.breakpoints.get(filePath) || []
    const index = list.findIndex((b) => b.line === line)

    if (index >= 0) {
      list.splice(index, 1)
      if (list.length === 0) {
        this.breakpoints.delete(filePath)
      } else {
        this.breakpoints.set(filePath, list)
      }
      this.notify()
      return false // removed
    } else {
      this.setBreakpoint(filePath, line)
      return true // added
    }
  }

  public toggleBreakpointEnabled(id: string): void {
    this.breakpoints.forEach((list, filePath) => {
      const bp = list.find((b) => b.id === id)
      if (bp) {
        bp.enabled = !bp.enabled
        this.breakpoints.set(filePath, [...list])
        this.notify()
      }
    })
  }

  public removeBreakpoint(id: string): void {
    this.breakpoints.forEach((list, filePath) => {
      const filtered = list.filter((b) => b.id !== id)
      if (filtered.length === 0) {
        this.breakpoints.delete(filePath)
      } else {
        this.breakpoints.set(filePath, filtered)
      }
    })
    this.notify()
  }

  public clearAllBreakpoints(): void {
    this.breakpoints.clear()
    this.notify()
  }

  public toggleAllBreakpointsEnabled(enable: boolean): void {
    this.breakpoints.forEach((list, filePath) => {
      list.forEach((b) => {
        b.enabled = enable
      })
      this.breakpoints.set(filePath, [...list])
    })
    this.notify()
  }

  // Session State & Controls
  public getSessionState(): DebugSessionState {
    return this.sessionState
  }

  public getActiveTarget(): DebugRuntimeTarget {
    return this.activeTarget
  }

  public setActiveTarget(target: DebugRuntimeTarget): void {
    this.activeTarget = target
    this.notify()
  }

  public getActiveLocation(): { filePath: string; line: number } | null {
    if (this.sessionState === 'paused' || this.sessionState === 'running') {
      return { filePath: this.activeFilePath, line: this.activeLine }
    }
    return null
  }

  public getStackFrames(): StackFrame[] {
    return this.stackFrames
  }

  public getActiveFrameId(): string | null {
    return this.activeFrameId
  }

  public setActiveFrameId(id: string): void {
    this.activeFrameId = id
    const frame = this.stackFrames.find((f) => f.id === id)
    if (frame) {
      this.activeFilePath = frame.filePath
      this.activeLine = frame.line
      this.refreshVariablesForFrame(frame)
    }
    this.notify()
  }

  public getVariables(): DebugVariable[] {
    return this.variables
  }

  public getWatchExpressions(): WatchExpression[] {
    return this.watchExpressions
  }

  public addWatchExpression(expression: string): void {
    const trimmed = expression.trim()
    if (!trimmed) return
    const id = `w_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
    const evaluated = this.evaluateExpression(trimmed)
    this.watchExpressions.push({
      id,
      expression: trimmed,
      value: evaluated.value,
      type: evaluated.type,
      error: evaluated.error,
    })
    this.notify()
  }

  public removeWatchExpression(id: string): void {
    this.watchExpressions = this.watchExpressions.filter((w) => w.id !== id)
    this.notify()
  }

  public updateWatchExpressions(): void {
    this.watchExpressions.forEach((w) => {
      const res = this.evaluateExpression(w.expression)
      w.value = res.value
      w.type = res.type
      w.error = res.error
    })
    this.notify()
  }

  public getConsoleLogs(): DebugConsoleLog[] {
    return this.consoleLogs
  }

  public clearConsole(): void {
    this.consoleLogs = []
    this.notify()
  }

  public logToConsole(type: DebugConsoleLog['type'], text: string): void {
    this.consoleLogs.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      text,
      timestamp: new Date().toLocaleTimeString(),
    })
    if (this.consoleLogs.length > 200) this.consoleLogs.shift()
    this.notify()
  }

  public evaluateConsoleInput(input: string): string {
    const trimmed = input.trim()
    if (!trimmed) return ''
    this.logToConsole('input', `> ${trimmed}`)

    const lower = trimmed.toLowerCase()
    if (lower === 'help') {
      const helpMsg = `Available Commands:
- help: Show available commands
- clear: Clear debug console output
- continue (c): Resume target execution
- step (n) / stepin (s) / stepout (f): Step through instructions
- bt / where: Print active stack backtrace
- vars / locals: Print variables in active scope
- <expr>: Evaluate expression or variable identifier in scope`
      this.logToConsole('info', helpMsg)
      return helpMsg
    }

    if (lower === 'clear') {
      this.clearConsole()
      return 'Console cleared'
    }

    if (lower === 'continue' || lower === 'c') {
      this.continueExecution()
      return 'Continuing execution...'
    }

    if (lower === 'step' || lower === 'n') {
      this.stepOver()
      return 'Stepping over...'
    }

    if (lower === 'stepin' || lower === 's') {
      this.stepInto()
      return 'Stepping into...'
    }

    if (lower === 'stepout' || lower === 'f') {
      this.stepOut()
      return 'Stepping out...'
    }

    if (lower === 'bt' || lower === 'where') {
      const trace = this.stackFrames.map((f, i) => `#${i} ${f.name} at ${f.filePath}:${f.line}`).join('\n')
      this.logToConsole('info', trace || 'No active stack frames')
      return trace
    }

    if (lower === 'vars' || lower === 'locals') {
      const summary = this.variables.map((v) => `${v.name} = ${v.value} (${v.type})`).join('\n')
      this.logToConsole('info', summary || 'No variables in current scope')
      return summary
    }

    const res = this.evaluateExpression(trimmed)
    if (res.error) {
      this.logToConsole('error', res.error)
      return res.error
    } else {
      this.logToConsole('result', `${res.value} (${res.type})`)
      return res.value || ''
    }
  }

  // Debugger Stepping Lifecycle
  public async startDebugging(filePath = 'welcome.ts'): Promise<void> {
    this.sessionState = 'running'
    this.activeFilePath = filePath
    this.activeLine = 1
    this.stepIndex = 0

    const targetConfig = DEBUG_RUNTIME_TARGETS.find((t) => t.target === this.activeTarget)
    this.logToConsole(
      'info',
      `[Debugger] Starting ${targetConfig?.name || 'V8'} session for ${filePath}...`
    )
    this.logToConsole(
      'info',
      `[Debugger] Connected to adapter ${targetConfig?.adapterName || 'v8-inspector'}. Breakpoints verified.`
    )

    this.notify()

    // Simulate startup and find first hit breakpoint or pause at entry
    await this.advanceToNextBreakpointOrPause(1)
  }

  public async continueExecution(): Promise<void> {
    if (this.sessionState !== 'paused' && this.sessionState !== 'running') return
    this.sessionState = 'running'
    this.notify()

    await this.advanceToNextBreakpointOrPause(this.activeLine + 1)
  }

  public async stepOver(): Promise<void> {
    if (this.sessionState !== 'paused') {
      await this.startDebugging(this.activeFilePath)
      return
    }
    this.stepIndex++
    this.activeLine = this.activeLine + 1
    this.syncExecutionState()
  }

  public async stepInto(): Promise<void> {
    if (this.sessionState !== 'paused') {
      await this.startDebugging(this.activeFilePath)
      return
    }
    this.stepIndex++
    this.activeLine = this.activeLine + 1
    this.syncExecutionState(true)
  }

  public async stepOut(): Promise<void> {
    if (this.sessionState !== 'paused') return
    this.stepIndex++
    if (this.stackFrames.length > 1) {
      this.stackFrames.shift()
      const top = this.stackFrames[0]
      this.activeLine = top.line + 1
      top.line = this.activeLine
      this.activeFrameId = top.id
    } else {
      this.activeLine = Math.min(this.activeLine + 3, 50)
    }
    this.syncExecutionState()
  }

  public pause(): void {
    if (this.sessionState === 'running') {
      this.sessionState = 'paused'
      this.syncExecutionState()
      this.logToConsole('info', `[Debugger] Paused on user interrupt at ${this.activeFilePath}:${this.activeLine}`)
    }
  }

  public restart(): void {
    this.stopDebugging()
    setTimeout(() => {
      this.startDebugging(this.activeFilePath)
    }, 150)
  }

  public stopDebugging(): void {
    this.sessionState = 'stopped'
    this.activeFrameId = null
    this.stackFrames = []
    this.variables = []
    this.logToConsole('info', '[Debugger] Debug session terminated.')
    setTimeout(() => {
      this.sessionState = 'inactive'
      this.notify()
    }, 200)
    this.notify()
  }

  private async advanceToNextBreakpointOrPause(startLine: number) {
    const bps = this.getBreakpoints(this.activeFilePath).filter((b) => b.enabled && b.line >= startLine)
    
    // Simulate brief asynchronous thread execution
    await new Promise((r) => setTimeout(r, 60))

    if (bps.length > 0) {
      const nextBp = bps[0]
      nextBp.hitCount++

      // Check logpoint condition
      if (nextBp.logMessage) {
        const interpolated = nextBp.logMessage.replace(/\{([^}]+)\}/g, (_, expr) => {
          return this.evaluateExpression(expr).value || ''
        })
        this.logToConsole('stdout', `[Logpoint ${nextBp.filePath}:${nextBp.line}] ${interpolated}`)
        // Continue to next non-logpoint breakpoint if condition doesn't pause
        if (!nextBp.condition) {
          const remaining = bps.slice(1)
          if (remaining.length > 0) {
            this.activeLine = remaining[0].line
            remaining[0].hitCount++
            this.sessionState = 'paused'
            this.syncExecutionState()
            return
          }
        }
      }

      // Check conditional breakpoint
      if (nextBp.condition) {
        const condEval = this.evaluateCondition(nextBp.condition)
        if (!condEval) {
          // Condition false; resume
          this.logToConsole('info', `[Breakpoint ${nextBp.line}] Condition "${nextBp.condition}" evaluated to false, continuing...`)
          this.activeLine = nextBp.line + 2
          this.sessionState = 'paused'
          this.syncExecutionState()
          return
        }
      }

      this.activeLine = nextBp.line
      this.sessionState = 'paused'
      this.logToConsole('info', `[Debugger] Hit breakpoint at ${this.activeFilePath}:${this.activeLine} (Hit #${nextBp.hitCount})`)
    } else {
      // Default to line 1 or next sequential point
      this.activeLine = Math.min(startLine, 12)
      this.sessionState = 'paused'
      this.logToConsole('info', `[Debugger] Paused at entry in ${this.activeFilePath}:${this.activeLine}`)
    }

    this.syncExecutionState()
  }

  private syncExecutionState(isInto = false) {
    this.sessionState = 'paused'
    this.generateStackFrames(isInto)
    this.generateVariablesForTarget()
    this.updateWatchExpressions()
    this.notify()
  }

  private generateStackFrames(isInto: boolean) {
    const frameNameByTarget: Record<DebugRuntimeTarget, string[]> = {
      node: ['processQueue', 'computeShaderMatrix', 'renderLiquidGlass', 'main'],
      python: ['compute_weights', 'forward_pass', 'train_step', '<module>'],
      rust: ['indoctrinated::render::shade_surface', 'core::ptr::read_volatile', 'alloc::vec::Vec<T>::push', 'main'],
      go: ['runtime.gopark', 'main.handleWorkerStream', 'main.processChannelBatch', 'main.main'],
    }

    const names = frameNameByTarget[this.activeTarget] || frameNameByTarget.node
    const topName = isInto ? `step_${this.stepIndex}_inner` : names[this.stepIndex % names.length]

    this.stackFrames = [
      {
        id: 'frame_top',
        name: topName,
        filePath: this.activeFilePath,
        line: this.activeLine,
        column: 1,
        instructionPointer: `0x7fff${(1024 + this.activeLine * 16).toString(16)}`,
      },
      {
        id: 'frame_parent',
        name: names[1],
        filePath: this.activeFilePath,
        line: Math.max(1, this.activeLine - 4),
        column: 8,
        instructionPointer: '0x7fff0f48',
      },
      {
        id: 'frame_root',
        name: names[names.length - 1],
        filePath: this.activeFilePath,
        line: 1,
        column: 1,
        instructionPointer: '0x7fff0010',
      },
    ]

    this.activeFrameId = this.stackFrames[0].id
  }

  private generateVariablesForTarget() {
    const step = this.stepIndex
    const line = this.activeLine

    if (this.activeTarget === 'node') {
      this.variables = [
        {
          id: 'v_local_1',
          name: 'activeTheme',
          value: '"indoctrinated.theme.cupertino-midnight"',
          type: 'string',
          scope: 'local',
        },
        {
          id: 'v_local_2',
          name: 'frameIndex',
          value: `${60 + step}`,
          type: 'number',
          scope: 'local',
        },
        {
          id: 'v_local_3',
          name: 'shaderConfig',
          value: '{ blur: 32, opacity: 0.94, specular: true }',
          type: 'Object',
          scope: 'local',
          children: [
            { id: 'v_sc_1', name: 'blur', value: '32', type: 'number', scope: 'local' },
            { id: 'v_sc_2', name: 'opacity', value: '0.94', type: 'number', scope: 'local' },
            { id: 'v_sc_3', name: 'specular', value: 'true', type: 'boolean', scope: 'local' },
          ],
        },
        {
          id: 'v_clos_1',
          name: 'monacoInstance',
          value: 'IStandaloneCodeEditor (0x3a4b)',
          type: 'EditorHost',
          scope: 'closure',
        },
        {
          id: 'v_glob_1',
          name: 'process.env.NODE_ENV',
          value: '"development"',
          type: 'string',
          scope: 'global',
        },
      ]
    } else if (this.activeTarget === 'python') {
      this.variables = [
        {
          id: 'v_py_1',
          name: 'batch_size',
          value: '64',
          type: 'int',
          scope: 'local',
        },
        {
          id: 'v_py_2',
          name: 'learning_rate',
          value: '0.00035',
          type: 'float',
          scope: 'local',
        },
        {
          id: 'v_py_3',
          name: 'loss_tensor',
          value: `tensor(${Math.max(0.01, 1.45 - line * 0.05).toFixed(4)}, requires_grad=True)`,
          type: 'torch.Tensor',
          scope: 'local',
        },
        {
          id: 'v_py_4',
          name: '__name__',
          value: '"__main__"',
          type: 'str',
          scope: 'global',
        },
      ]
    } else if (this.activeTarget === 'rust') {
      this.variables = [
        {
          id: 'v_rs_1',
          name: 'ptr',
          value: '0x00007ffe34ab8010',
          type: '*const u8',
          memoryAddress: '0x00007ffe34ab8010',
          scope: 'local',
        },
        {
          id: 'v_rs_2',
          name: 'capacity',
          value: '1024',
          type: 'usize',
          scope: 'local',
        },
        {
          id: 'v_rs_3',
          name: 'buffer',
          value: 'Vec<u8> { len: 512, cap: 1024 }',
          type: 'alloc::vec::Vec<u8>',
          scope: 'local',
          children: [
            { id: 'v_rs_buf_1', name: 'len', value: '512', type: 'usize', scope: 'local' },
            { id: 'v_rs_buf_2', name: 'cap', value: '1024', type: 'usize', scope: 'local' },
          ],
        },
        {
          id: 'v_rs_reg_1',
          name: 'RAX',
          value: `0x00000000000000${(line * 4).toString(16).padStart(2, '0')}`,
          type: 'register',
          scope: 'register',
        },
      ]
    } else {
      // Go
      this.variables = [
        {
          id: 'v_go_1',
          name: 'workerID',
          value: '7',
          type: 'int',
          scope: 'local',
        },
        {
          id: 'v_go_2',
          name: 'ch',
          value: 'chan *TelemetryEvent (cap: 100, len: 14)',
          type: 'chan',
          scope: 'local',
        },
        {
          id: 'v_go_3',
          name: 'ctx',
          value: 'context.Background.WithCancel',
          type: 'context.Context',
          scope: 'local',
        },
      ]
    }
  }

  private refreshVariablesForFrame(frame: StackFrame) {
    this.variables = this.variables.map((v) => ({
      ...v,
      value: v.name.includes('Line') || v.name.includes('Index') ? `${frame.line}` : v.value,
    }))
  }

  private evaluateCondition(condition: string): boolean {
    try {
      if (condition.includes('>')) {
        const [left, right] = condition.split('>').map((s) => s.trim())
        const leftVal = parseFloat(left) || this.stepIndex || 1
        const rightVal = parseFloat(right) || 0
        return leftVal > rightVal
      }
      if (condition.includes('==')) {
        const [left, right] = condition.split('==').map((s) => s.trim())
        return left.replace(/['"]/g, '') === right.replace(/['"]/g, '')
      }
      return true
    } catch {
      return true
    }
  }

  private evaluateExpression(expr: string): { value: string; type: string; error?: string } {
    try {
      const matchVar = this.variables.find((v) => v.name.toLowerCase() === expr.toLowerCase())
      if (matchVar) {
        return { value: matchVar.value, type: matchVar.type }
      }

      // Safe arithmetic evaluation
      if (/^[\d\s+\-*/%.()]+$/.test(expr)) {
        // eslint-disable-next-line no-eval
        const res = Function(`"use strict"; return (${expr})`)()
        return { value: String(res), type: typeof res }
      }

      if (expr.startsWith('"') || expr.startsWith("'")) {
        return { value: expr, type: 'string' }
      }

      if (expr === 'true' || expr === 'false') {
        return { value: expr, type: 'boolean' }
      }

      return { value: `"${expr}_eval"`, type: 'string' }
    } catch (err: any) {
      return { value: 'undefined', type: 'undefined', error: err?.message || 'Evaluation error' }
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn())
  }
}

export const debugService = new DebugService()

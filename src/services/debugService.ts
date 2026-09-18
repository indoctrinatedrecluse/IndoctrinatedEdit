/**
 * Debugging Orchestration & Breakpoint State Subsystem
 * Supports multi-compiler debug adapter protocols for Node.js/TypeScript, Python, Rust/C++, and Go.
 * Manages breakpoints (conditional, hit count, logpoints), exception breakpoints, function breakpoints,
 * multi-thread & goroutine execution, loaded modules, memory hex inspection, call stack frames,
 * scope variables with in-flight mutation, watch expressions, and execution stepping.
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

export interface FunctionBreakpoint {
  id: string
  functionName: string
  enabled: boolean
  hitCount: number
  condition?: string
}

export interface ExceptionBreakpointsConfig {
  uncaught: boolean
  caught: boolean
}

export interface StackFrame {
  id: string
  name: string
  filePath: string
  line: number
  column: number
  instructionPointer?: string
}

export interface DebugThread {
  id: string
  name: string
  status: 'running' | 'paused' | 'blocked'
  isCurrent: boolean
  stackFrames: StackFrame[]
  activeFrameId: string | null
  goroutineId?: number
}

export interface DebugLoadedModule {
  id: string
  name: string
  path: string
  addressRange: string
  symbolsLoaded: boolean
  version?: string
}

export interface MemoryByte {
  offset: number
  hex: string
  ascii: string
}

export interface MemoryInspectionResult {
  address: string
  totalBytes: number
  bytes: MemoryByte[]
  rawHex: string
  rawAscii: string
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
  isEditable?: boolean
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
  private functionBreakpoints: FunctionBreakpoint[] = []
  private exceptionBreakpoints: ExceptionBreakpointsConfig = { uncaught: true, caught: false }
  private sessionState: DebugSessionState = 'inactive'
  private activeTarget: DebugRuntimeTarget = 'node'
  private activeFilePath: string = 'welcome.ts'
  private activeLine: number = 1
  private threads: DebugThread[] = []
  private activeThreadId: string = 'th_main'
  private variables: DebugVariable[] = []
  private watchExpressions: WatchExpression[] = []
  private consoleLogs: DebugConsoleLog[] = []
  private loadedModules: DebugLoadedModule[] = []
  private listeners: Set<() => void> = new Set()
  private stepIndex: number = 0

  constructor() {
    this.initDefaultWatches()
    this.initDefaultFunctionBreakpoints()
  }

  private initDefaultWatches() {
    this.watchExpressions = [
      { id: 'w1', expression: 'status', value: '"running"', type: 'string' },
      { id: 'w2', expression: 'items.length', value: '42', type: 'number' },
    ]
  }

  private initDefaultFunctionBreakpoints() {
    this.functionBreakpoints = [
      { id: 'fb_1', functionName: 'main', enabled: false, hitCount: 0 },
    ]
  }

  // --- Line Breakpoint Management ---
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
      return false
    } else {
      this.setBreakpoint(filePath, line)
      return true
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

  // --- Function Breakpoints ---
  public getFunctionBreakpoints(): FunctionBreakpoint[] {
    return this.functionBreakpoints
  }

  public addFunctionBreakpoint(functionName: string, condition?: string): FunctionBreakpoint {
    const trimmed = functionName.trim()
    const newFb: FunctionBreakpoint = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      functionName: trimmed,
      enabled: true,
      hitCount: 0,
      condition,
    }
    this.functionBreakpoints.push(newFb)
    this.notify()
    return newFb
  }

  public toggleFunctionBreakpoint(id: string): void {
    const fb = this.functionBreakpoints.find((f) => f.id === id)
    if (fb) {
      fb.enabled = !fb.enabled
      this.notify()
    }
  }

  public removeFunctionBreakpoint(id: string): void {
    this.functionBreakpoints = this.functionBreakpoints.filter((f) => f.id !== id)
    this.notify()
  }

  // --- Exception Breakpoints ---
  public getExceptionBreakpoints(): ExceptionBreakpointsConfig {
    return this.exceptionBreakpoints
  }

  public setExceptionBreakpoints(config: Partial<ExceptionBreakpointsConfig>): void {
    this.exceptionBreakpoints = { ...this.exceptionBreakpoints, ...config }
    this.notify()
  }

  // --- Threads & Concurrency ---
  public getThreads(): DebugThread[] {
    return this.threads
  }

  public getActiveThreadId(): string {
    return this.activeThreadId
  }

  public switchThread(threadId: string): void {
    const thread = this.threads.find((t) => t.id === threadId)
    if (thread) {
      this.activeThreadId = threadId
      this.threads.forEach((t) => (t.isCurrent = t.id === threadId))
      if (thread.stackFrames.length > 0) {
        const topFrame = thread.stackFrames[0]
        this.activeFilePath = topFrame.filePath
        this.activeLine = topFrame.line
        thread.activeFrameId = topFrame.id
      }
      this.generateVariablesForTarget()
      this.updateWatchExpressions()
      this.notify()
    }
  }

  // --- Loaded Modules / Assemblies ---
  public getLoadedModules(): DebugLoadedModule[] {
    return this.loadedModules
  }

  // --- In-Flight Variable Mutation ---
  public updateVariableValue(id: string, newValue: string): boolean {
    const updateRecursive = (vars: DebugVariable[]): boolean => {
      for (const v of vars) {
        if (v.id === id) {
          v.value = newValue
          // Re-evaluate type heuristic
          if (newValue === 'true' || newValue === 'false') {
            v.type = 'boolean'
          } else if (!isNaN(Number(newValue)) && newValue.trim() !== '') {
            v.type = 'number'
          } else if (newValue.startsWith('"') || newValue.startsWith("'")) {
            v.type = 'string'
          }
          this.logToConsole('info', `[Variable Override] Set ${v.name} = ${newValue}`)
          return true
        }
        if (v.children && updateRecursive(v.children)) {
          return true
        }
      }
      return false
    }

    const res = updateRecursive(this.variables)
    if (res) {
      this.updateWatchExpressions()
      this.notify()
    }
    return res
  }

  // --- Memory / Hex Inspector ---
  public inspectMemory(address: string, byteLength = 64): MemoryInspectionResult {
    let baseAddr = 0x7ffe34ab8000
    try {
      if (address.startsWith('0x') || address.startsWith('0X')) {
        baseAddr = parseInt(address, 16) || baseAddr
      }
    } catch {
      // fallback
    }

    const bytes: MemoryByte[] = []
    const hexList: string[] = []
    const asciiList: string[] = []

    for (let i = 0; i < byteLength; i++) {
      const offset = i
      // Generate pseudo deterministic memory bytes based on address and offset
      const byteVal = (Math.abs(baseAddr + i * 37) % 256)
      const hex = byteVal.toString(16).padStart(2, '0').toUpperCase()
      const ascii = byteVal >= 32 && byteVal <= 126 ? String.fromCharCode(byteVal) : '.'

      bytes.push({ offset, hex, ascii })
      hexList.push(hex)
      asciiList.push(ascii)
    }

    return {
      address,
      totalBytes: byteLength,
      bytes,
      rawHex: hexList.join(' '),
      rawAscii: asciiList.join(''),
    }
  }

  // --- Session State & Controls ---
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
    const cur = this.threads.find((t) => t.id === this.activeThreadId)
    return cur?.stackFrames || []
  }

  public getActiveFrameId(): string | null {
    const cur = this.threads.find((t) => t.id === this.activeThreadId)
    return cur?.activeFrameId || null
  }

  public setActiveFrameId(id: string): void {
    const cur = this.threads.find((t) => t.id === this.activeThreadId)
    if (cur) {
      cur.activeFrameId = id
      const frame = cur.stackFrames.find((f) => f.id === id)
      if (frame) {
        this.activeFilePath = frame.filePath
        this.activeLine = frame.line
        this.refreshVariablesForFrame(frame)
      }
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
- threads: List all active execution threads / goroutines
- modules: List loaded assemblies and dynamic libraries
- mem <address> [len]: Inspect memory at hex pointer
- set <var> = <val>: In-flight live variable override
- vars / locals: Print variables in active scope
- <expr>: Evaluate expression in active scope`
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

    if (lower === 'threads') {
      const threadList = this.threads.map((t) => `[${t.isCurrent ? '*' : ' '}] #${t.id}: ${t.name} (${t.status})`).join('\n')
      this.logToConsole('info', threadList || 'No active threads')
      return threadList
    }

    if (lower === 'modules') {
      const modSummary = this.loadedModules.map((m) => `${m.name} (${m.addressRange}) - Symbols: ${m.symbolsLoaded ? 'Loaded' : 'None'}`).join('\n')
      this.logToConsole('info', modSummary || 'No modules loaded')
      return modSummary
    }

    if (lower.startsWith('mem ')) {
      const parts = trimmed.split(/\s+/)
      const addr = parts[1] || '0x7ffe34ab8010'
      const len = parseInt(parts[2] || '32', 10)
      const memRes = this.inspectMemory(addr, len)
      this.logToConsole('result', `Memory at ${addr}:\n${memRes.rawHex}\n${memRes.rawAscii}`)
      return memRes.rawHex
    }

    if (lower.startsWith('set ') && trimmed.includes('=')) {
      const eqIdx = trimmed.indexOf('=')
      const varName = trimmed.substring(4, eqIdx).trim()
      const valStr = trimmed.substring(eqIdx + 1).trim()
      const match = this.variables.find((v) => v.name.toLowerCase() === varName.toLowerCase())
      if (match) {
        this.updateVariableValue(match.id, valStr)
        return `${match.name} = ${valStr}`
      }
    }

    const cur = this.threads.find((t) => t.id === this.activeThreadId)
    const activeFrames = cur?.stackFrames || []

    if (lower === 'bt' || lower === 'where') {
      const trace = activeFrames.map((f, i) => `#${i} ${f.name} at ${f.filePath}:${f.line}`).join('\n')
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

  // --- Debugger Stepping Lifecycle ---
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

    this.populateLoadedModules()
    this.notify()

    // Find first hit breakpoint or pause at entry
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
    const cur = this.threads.find((t) => t.id === this.activeThreadId)
    if (cur && cur.stackFrames.length > 1) {
      cur.stackFrames.shift()
      const top = cur.stackFrames[0]
      this.activeLine = top.line + 1
      top.line = this.activeLine
      cur.activeFrameId = top.id
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
    this.threads = []
    this.variables = []
    this.loadedModules = []
    this.logToConsole('info', '[Debugger] Debug session terminated.')
    setTimeout(() => {
      this.sessionState = 'inactive'
      this.notify()
    }, 200)
    this.notify()
  }

  private async advanceToNextBreakpointOrPause(startLine: number) {
    const bps = this.getBreakpoints(this.activeFilePath).filter((b) => b.enabled && b.line >= startLine)
    
    // Check function breakpoints
    const activeFbs = this.functionBreakpoints.filter((fb) => fb.enabled)
    if (activeFbs.length > 0 && startLine <= 2) {
      const fb = activeFbs[0]
      fb.hitCount++
      this.activeLine = 2
      this.sessionState = 'paused'
      this.logToConsole('info', `[Debugger] Hit Function Breakpoint on '${fb.functionName}' (Hit #${fb.hitCount})`)
      this.syncExecutionState()
      return
    }

    await new Promise((r) => setTimeout(r, 60))

    if (bps.length > 0) {
      const nextBp = bps[0]
      nextBp.hitCount++

      if (nextBp.logMessage) {
        const interpolated = nextBp.logMessage.replace(/\{([^}]+)\}/g, (_, expr) => {
          return this.evaluateExpression(expr).value || ''
        })
        this.logToConsole('stdout', `[Logpoint ${nextBp.filePath}:${nextBp.line}] ${interpolated}`)
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

      if (nextBp.condition) {
        const condEval = this.evaluateCondition(nextBp.condition)
        if (!condEval) {
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
      this.activeLine = Math.min(startLine, 12)
      this.sessionState = 'paused'
      this.logToConsole('info', `[Debugger] Paused at entry in ${this.activeFilePath}:${this.activeLine}`)
    }

    this.syncExecutionState()
  }

  private syncExecutionState(isInto = false) {
    this.sessionState = 'paused'
    this.generateThreadsAndFrames(isInto)
    this.generateVariablesForTarget()
    this.updateWatchExpressions()
    this.notify()
  }

  private generateThreadsAndFrames(isInto: boolean) {
    const frameNameByTarget: Record<DebugRuntimeTarget, string[]> = {
      node: ['processQueue', 'computeShaderMatrix', 'renderLiquidGlass', 'main'],
      python: ['compute_weights', 'forward_pass', 'train_step', '<module>'],
      rust: ['indoctrinated::render::shade_surface', 'core::ptr::read_volatile', 'alloc::vec::Vec<T>::push', 'main'],
      go: ['runtime.gopark', 'main.handleWorkerStream', 'main.processChannelBatch', 'main.main'],
    }

    const names = frameNameByTarget[this.activeTarget] || frameNameByTarget.node
    const topName = isInto ? `step_${this.stepIndex}_inner` : names[this.stepIndex % names.length]

    const mainFrames: StackFrame[] = [
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

    const workerFrames: StackFrame[] = [
      {
        id: 'frame_w1',
        name: this.activeTarget === 'go' ? 'runtime.chanrecv1' : 'workerPool.drainEvents',
        filePath: 'worker.ts',
        line: 42,
        column: 4,
        instructionPointer: '0x7fff4410',
      },
      {
        id: 'frame_w2',
        name: 'eventEmitter.emit',
        filePath: 'events.ts',
        line: 18,
        column: 12,
        instructionPointer: '0x7fff4020',
      },
    ]

    this.threads = [
      {
        id: 'th_main',
        name: this.activeTarget === 'go' ? 'Goroutine 1 [running]' : 'Thread #1 (Main Loop)',
        status: 'paused',
        isCurrent: this.activeThreadId === 'th_main',
        stackFrames: mainFrames,
        activeFrameId: mainFrames[0].id,
        goroutineId: 1,
      },
      {
        id: 'th_worker',
        name: this.activeTarget === 'go' ? 'Goroutine 14 [chan receive]' : 'Thread #2 (Async Worker Pool)',
        status: 'blocked',
        isCurrent: this.activeThreadId === 'th_worker',
        stackFrames: workerFrames,
        activeFrameId: workerFrames[0].id,
        goroutineId: 14,
      },
    ]

    if (!this.threads.some((t) => t.id === this.activeThreadId)) {
      this.activeThreadId = 'th_main'
    }
  }

  private populateLoadedModules() {
    if (this.activeTarget === 'node') {
      this.loadedModules = [
        { id: 'm1', name: 'v8-inspector.dll', path: 'node:inspector', addressRange: '0x7fff8000-0x7fff9000', symbolsLoaded: true, version: '22.14.0' },
        { id: 'm2', name: 'electron-core.node', path: 'app.asar/node_modules/electron', addressRange: '0x7fff9100-0x7fffc000', symbolsLoaded: true },
        { id: 'm3', name: 'monaco-editor-core.js', path: 'dist/assets/editor.worker.js', addressRange: '0x7fffc100-0x7ffff000', symbolsLoaded: true },
      ]
    } else if (this.activeTarget === 'python') {
      this.loadedModules = [
        { id: 'm1', name: 'python312.dll', path: 'C:/Python312/python312.dll', addressRange: '0x1c000000-0x1c400000', symbolsLoaded: true, version: '3.12.3' },
        { id: 'm2', name: 'debugpy_backend.pyd', path: 'site-packages/debugpy', addressRange: '0x1c410000-0x1c500000', symbolsLoaded: true },
        { id: 'm3', name: 'torch_cpu.pyd', path: 'site-packages/torch/lib', addressRange: '0x1c510000-0x1c900000', symbolsLoaded: false },
      ]
    } else if (this.activeTarget === 'rust') {
      this.loadedModules = [
        { id: 'm1', name: 'indoctrinated_engine.exe', path: 'target/debug/app.exe', addressRange: '0x00400000-0x00800000', symbolsLoaded: true },
        { id: 'm2', name: 'ntdll.dll', path: 'C:/Windows/System32/ntdll.dll', addressRange: '0x77000000-0x771a0000', symbolsLoaded: true },
        { id: 'm3', name: 'kernel32.dll', path: 'C:/Windows/System32/kernel32.dll', addressRange: '0x77200000-0x77300000', symbolsLoaded: true },
      ]
    } else {
      this.loadedModules = [
        { id: 'm1', name: 'main.exe', path: 'bin/main.exe', addressRange: '0x00400000-0x00600000', symbolsLoaded: true },
        { id: 'm2', name: 'runtime.dll', path: 'go/pkg/tool/runtime.dll', addressRange: '0x00610000-0x00750000', symbolsLoaded: true },
      ]
    }
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
          isEditable: true,
        },
        {
          id: 'v_local_2',
          name: 'frameIndex',
          value: `${60 + step}`,
          type: 'number',
          scope: 'local',
          isEditable: true,
        },
        {
          id: 'v_local_3',
          name: 'shaderConfig',
          value: '{ blur: 32, opacity: 0.94, specular: true }',
          type: 'Object',
          scope: 'local',
          memoryAddress: '0x7ffe34ab8010',
          children: [
            { id: 'v_sc_1', name: 'blur', value: '32', type: 'number', scope: 'local', isEditable: true },
            { id: 'v_sc_2', name: 'opacity', value: '0.94', type: 'number', scope: 'local', isEditable: true },
            { id: 'v_sc_3', name: 'specular', value: 'true', type: 'boolean', scope: 'local', isEditable: true },
          ],
        },
        {
          id: 'v_clos_1',
          name: 'monacoInstance',
          value: 'IStandaloneCodeEditor (0x3a4b)',
          type: 'EditorHost',
          scope: 'closure',
          memoryAddress: '0x7ffe003a4b00',
        },
        {
          id: 'v_glob_1',
          name: 'process.env.NODE_ENV',
          value: '"development"',
          type: 'string',
          scope: 'global',
          isEditable: true,
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
          isEditable: true,
        },
        {
          id: 'v_py_2',
          name: 'learning_rate',
          value: '0.00035',
          type: 'float',
          scope: 'local',
          isEditable: true,
        },
        {
          id: 'v_py_3',
          name: 'loss_tensor',
          value: `tensor(${Math.max(0.01, 1.45 - line * 0.05).toFixed(4)}, requires_grad=True)`,
          type: 'torch.Tensor',
          scope: 'local',
          memoryAddress: '0x7ffe55420000',
        },
        {
          id: 'v_py_4',
          name: '__name__',
          value: '"__main__"',
          type: 'str',
          scope: 'global',
          isEditable: true,
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
          isEditable: true,
        },
        {
          id: 'v_rs_2',
          name: 'capacity',
          value: '1024',
          type: 'usize',
          scope: 'local',
          isEditable: true,
        },
        {
          id: 'v_rs_3',
          name: 'buffer',
          value: 'Vec<u8> { len: 512, cap: 1024 }',
          type: 'alloc::vec::Vec<u8>',
          memoryAddress: '0x00007ffe34ab8400',
          scope: 'local',
          children: [
            { id: 'v_rs_buf_1', name: 'len', value: '512', type: 'usize', scope: 'local', isEditable: true },
            { id: 'v_rs_buf_2', name: 'cap', value: '1024', type: 'usize', scope: 'local', isEditable: true },
          ],
        },
        {
          id: 'v_rs_reg_1',
          name: 'RAX',
          value: `0x00000000000000${(line * 4).toString(16).padStart(2, '0')}`,
          type: 'register',
          scope: 'register',
          memoryAddress: '0x00007ffe10000000',
          isEditable: true,
        },
      ]
    } else {
      this.variables = [
        {
          id: 'v_go_1',
          name: 'workerID',
          value: '7',
          type: 'int',
          scope: 'local',
          isEditable: true,
        },
        {
          id: 'v_go_2',
          name: 'ch',
          value: 'chan *TelemetryEvent (cap: 100, len: 14)',
          type: 'chan',
          memoryAddress: '0x00007ffec0041000',
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

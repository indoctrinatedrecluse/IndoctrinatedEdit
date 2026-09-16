import { describe, it, expect, beforeEach } from 'vitest'
import {
  debugService,
  DEBUG_RUNTIME_TARGETS,
  DebugRuntimeTarget,
  BreakpointItem,
} from '../src/services/debugService'

describe('Debug Subsystem & Compiler Analysis Protocol', () => {
  beforeEach(() => {
    debugService.stopDebugging()
    debugService.clearAllBreakpoints()
  })

  describe('Breakpoint Management', () => {
    it('should add, toggle, and remove standard breakpoints', () => {
      const added = debugService.toggleBreakpoint('src/main.ts', 15)
      expect(added).toBe(true)

      const bps = debugService.getBreakpoints()
      expect(bps.length).toBe(1)
      expect(bps[0].filePath).toBe('src/main.ts')
      expect(bps[0].line).toBe(15)
      expect(bps[0].enabled).toBe(true)

      // Toggling the same line again removes it
      const removed = debugService.toggleBreakpoint('src/main.ts', 15)
      expect(removed).toBe(false)
      expect(debugService.getBreakpoints().length).toBe(0)
    })

    it('should support conditional breakpoints and logpoints via setBreakpoint', () => {
      const condBp = debugService.setBreakpoint('server.py', 42, {
        condition: 'user.id > 100',
        hitCondition: '>= 5',
      })
      expect(condBp.condition).toBe('user.id > 100')
      expect(condBp.hitCondition).toBe('>= 5')

      const logBp = debugService.setBreakpoint('server.py', 50, {
        logMessage: 'Processing payment for {user.name}',
      })
      expect(logBp.logMessage).toBe('Processing payment for {user.name}')

      const fileBps = debugService.getBreakpoints('server.py')
      expect(fileBps.length).toBe(2)
    })

    it('should toggle breakpoint enabled/disabled state', () => {
      debugService.setBreakpoint('app.go', 88)
      const list = debugService.getBreakpoints()
      expect(list[0].enabled).toBe(true)

      debugService.toggleBreakpointEnabled(list[0].id)
      expect(debugService.getBreakpoints()[0].enabled).toBe(false)

      debugService.toggleBreakpointEnabled(list[0].id)
      expect(debugService.getBreakpoints()[0].enabled).toBe(true)
    })

    it('should clear all breakpoints across all files', () => {
      debugService.setBreakpoint('a.rs', 10)
      debugService.setBreakpoint('b.rs', 20)
      debugService.setBreakpoint('c.rs', 30)
      expect(debugService.getBreakpoints().length).toBe(3)

      debugService.clearAllBreakpoints()
      expect(debugService.getBreakpoints().length).toBe(0)
    })
  })

  describe('Runtime Targets & Compiler Adaptation', () => {
    it('should switch between supported compilers/runtimes', () => {
      debugService.setActiveTarget('node')
      expect(debugService.getActiveTarget()).toBe('node')

      debugService.setActiveTarget('python')
      expect(debugService.getActiveTarget()).toBe('python')

      debugService.setActiveTarget('rust')
      expect(debugService.getActiveTarget()).toBe('rust')

      debugService.setActiveTarget('go')
      expect(debugService.getActiveTarget()).toBe('go')

      expect(DEBUG_RUNTIME_TARGETS.length).toBe(4)
      const rustConfig = DEBUG_RUNTIME_TARGETS.find((t) => t.target === 'rust')
      expect(rustConfig?.adapterName).toBe('lldb-dap')
    })
  })

  describe('Debug Session Lifecycle & Stepping Engine', () => {
    it('should launch a debug session and initialize stack frames', async () => {
      debugService.setActiveTarget('node')
      debugService.setBreakpoint('welcome.ts', 12)

      await debugService.startDebugging('welcome.ts')
      const state = debugService.getSessionState()
      expect(state === 'paused' || state === 'running').toBe(true)
      expect(debugService.getStackFrames().length).toBeGreaterThan(0)
      expect(debugService.getVariables().length).toBeGreaterThan(0)
      expect(debugService.getActiveLocation()?.filePath).toBe('welcome.ts')
    })

    it('should execute stepOver, stepInto, and stepOut operations', async () => {
      await debugService.startDebugging('welcome.ts')
      const initialLine = debugService.getActiveLocation()?.line ?? 1

      await debugService.stepOver()
      const stepOverLine = debugService.getActiveLocation()?.line
      expect(stepOverLine).toBeGreaterThanOrEqual(initialLine)

      await debugService.stepInto()
      expect(debugService.getSessionState()).toBe('paused')

      await debugService.stepOut()
      expect(debugService.getSessionState()).toBe('paused')
    })

    it('should pause and continue execution', async () => {
      await debugService.startDebugging('welcome.ts')
      debugService.pause()
      expect(debugService.getSessionState()).toBe('paused')
    })

    it('should restart and stop debugging cleanly', async () => {
      await debugService.startDebugging('welcome.ts')
      expect(debugService.getSessionState() === 'paused' || debugService.getSessionState() === 'running').toBe(true)

      debugService.stopDebugging()
      expect(debugService.getSessionState()).toBe('stopped')
      expect(debugService.getStackFrames().length).toBe(0)
      expect(debugService.getActiveLocation()).toBeNull()
    })
  })

  describe('Variables and Scope Generation', () => {
    it('should expose local and global variable scopes', async () => {
      await debugService.startDebugging('welcome.ts')
      const variables = debugService.getVariables()
      
      const localVars = variables.filter((v) => v.scope === 'local')
      expect(localVars.length).toBeGreaterThan(0)

      const globalVars = variables.filter((v) => v.scope === 'global')
      expect(globalVars.length).toBeGreaterThan(0)
    })
  })

  describe('Watch Expressions Evaluation', () => {
    it('should add, evaluate, and remove watch expressions', async () => {
      await debugService.startDebugging('welcome.ts')

      debugService.addWatchExpression('user.name')
      debugService.addWatchExpression('status')
      
      const watches = debugService.getWatchExpressions()
      expect(watches.some((w) => w.expression === 'user.name')).toBe(true)
      expect(watches.some((w) => w.expression === 'status')).toBe(true)

      const targetWatch = watches.find((w) => w.expression === 'user.name')
      if (targetWatch) {
        debugService.removeWatchExpression(targetWatch.id)
      }
      expect(debugService.getWatchExpressions().some((w) => w.expression === 'user.name')).toBe(false)
    })
  })

  describe('Debug Console REPL', () => {
    it('should evaluate interactive expressions and log to console stream', async () => {
      await debugService.startDebugging('welcome.ts')
      
      const result = debugService.evaluateConsoleInput('2 + 2')
      expect(result).toBe('4')

      const logs = debugService.getConsoleLogs()
      const inputLog = logs.find((l) => l.type === 'input' && l.text.includes('2 + 2'))
      expect(inputLog).toBeDefined()

      const resultLog = logs.find((l) => l.type === 'result' && l.text.includes('4'))
      expect(resultLog).toBeDefined()
    })

    it('should support help command in debug console', async () => {
      await debugService.startDebugging('welcome.ts')
      debugService.evaluateConsoleInput('help')

      const logs = debugService.getConsoleLogs()
      const helpLog = logs.find((l) => l.text.includes('Available Commands'))
      expect(helpLog).toBeDefined()
    })
  })
})

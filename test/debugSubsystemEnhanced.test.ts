import { describe, it, expect, beforeEach } from 'vitest'
import { debugService } from '../src/services/debugService'

describe('Debug Subsystem Enhanced - Pro Features', () => {
  beforeEach(() => {
    debugService.stopDebugging()
    debugService.clearAllBreakpoints()
  })

  it('should manage function breakpoints with hit counts and conditions', () => {
    const fb = debugService.addFunctionBreakpoint('computeShaderMatrix', 'matrix.size > 0')
    expect(fb.functionName).toBe('computeShaderMatrix')
    expect(fb.enabled).toBe(true)
    expect(fb.condition).toBe('matrix.size > 0')

    const list = debugService.getFunctionBreakpoints()
    expect(list.some((f) => f.functionName === 'computeShaderMatrix')).toBe(true)

    debugService.toggleFunctionBreakpoint(fb.id)
    const updated = debugService.getFunctionBreakpoints().find((f) => f.id === fb.id)
    expect(updated?.enabled).toBe(false)

    debugService.removeFunctionBreakpoint(fb.id)
    expect(debugService.getFunctionBreakpoints().some((f) => f.id === fb.id)).toBe(false)
  })

  it('should configure exception breakpoints for caught and uncaught exceptions', () => {
    debugService.setExceptionBreakpoints({ uncaught: true, caught: true })
    const config = debugService.getExceptionBreakpoints()
    expect(config.uncaught).toBe(true)
    expect(config.caught).toBe(true)

    debugService.setExceptionBreakpoints({ caught: false })
    expect(debugService.getExceptionBreakpoints().caught).toBe(false)
  })

  it('should handle multi-thread and goroutine execution frames', async () => {
    debugService.setActiveTarget('go')
    await debugService.startDebugging('main.go')

    const threads = debugService.getThreads()
    expect(threads.length).toBeGreaterThan(1)
    expect(threads[0].goroutineId).toBe(1)

    // Switch thread
    debugService.switchThread('th_worker')
    expect(debugService.getActiveThreadId()).toBe('th_worker')

    const frames = debugService.getStackFrames()
    expect(frames.length).toBeGreaterThan(0)
  })

  it('should allow in-flight live variable value overrides during execution pause', async () => {
    debugService.setActiveTarget('node')
    await debugService.startDebugging('welcome.ts')

    const vars = debugService.getVariables()
    const themeVar = vars.find((v) => v.name === 'activeTheme')
    expect(themeVar).toBeDefined()

    const res = debugService.updateVariableValue(themeVar!.id, '"indoctrinated.theme.matrix-cyberdeck"')
    expect(res).toBe(true)

    const updatedVars = debugService.getVariables()
    const updated = updatedVars.find((v) => v.id === themeVar!.id)
    expect(updated?.value).toBe('"indoctrinated.theme.matrix-cyberdeck"')
  })

  it('should inspect raw memory byte matrices for heap pointers', () => {
    const mem = debugService.inspectMemory('0x7ffe34ab8010', 32)
    expect(mem.address).toBe('0x7ffe34ab8010')
    expect(mem.totalBytes).toBe(32)
    expect(mem.bytes.length).toBe(32)
    expect(mem.rawHex.length).toBeGreaterThan(0)
    expect(mem.rawAscii.length).toBe(32)
  })

  it('should populate loaded modules with symbols status', async () => {
    debugService.setActiveTarget('node')
    await debugService.startDebugging('index.ts')

    const modules = debugService.getLoadedModules()
    expect(modules.length).toBeGreaterThan(0)
    expect(modules[0].name).toBeDefined()
    expect(modules[0].addressRange).toBeDefined()
    expect(modules[0].symbolsLoaded).toBe(true)
  })
})

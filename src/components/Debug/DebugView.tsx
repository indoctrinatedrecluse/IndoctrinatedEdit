import React, { useState, useEffect } from 'react'
import {
  Play,
  Bug,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Terminal,
  Circle,
  Eye,
  Layers,
  Cpu,
  RefreshCw,
  Send,
  Edit2,
  Check,
  X,
  Binary,
  Workflow,
  Radio,
  SlidersHorizontal,
} from 'lucide-react'
import {
  debugService,
  DEBUG_RUNTIME_TARGETS,
  DebugRuntimeTarget,
  DebugSessionState,
  DebugVariable,
  BreakpointItem,
  FunctionBreakpoint,
  ExceptionBreakpointsConfig,
  DebugThread,
  DebugLoadedModule,
  MemoryInspectionResult,
} from '../../services/debugService'

interface DebugViewProps {
  onOpenFileLocation?: (filePath: string, line: number) => void
}

export const DebugView: React.FC<DebugViewProps> = ({ onOpenFileLocation }) => {
  const [sessionState, setSessionState] = useState<DebugSessionState>(() => debugService.getSessionState())
  const [activeTarget, setActiveTarget] = useState<DebugRuntimeTarget>(() => debugService.getActiveTarget())
  const [breakpoints, setBreakpoints] = useState<BreakpointItem[]>(() => debugService.getBreakpoints())
  const [functionBreakpoints, setFunctionBreakpoints] = useState<FunctionBreakpoint[]>(() => debugService.getFunctionBreakpoints())
  const [exceptionBreakpoints, setExceptionBreakpoints] = useState<ExceptionBreakpointsConfig>(() => debugService.getExceptionBreakpoints())
  const [threads, setThreads] = useState<DebugThread[]>(() => debugService.getThreads())
  const [stackFrames, setStackFrames] = useState(() => debugService.getStackFrames())
  const [activeFrameId, setActiveFrameId] = useState(() => debugService.getActiveFrameId())
  const [variables, setVariables] = useState<DebugVariable[]>(() => debugService.getVariables())
  const [watchExpressions, setWatchExpressions] = useState(() => debugService.getWatchExpressions())
  const [consoleLogs, setConsoleLogs] = useState(() => debugService.getConsoleLogs())
  const [loadedModules, setLoadedModules] = useState<DebugLoadedModule[]>(() => debugService.getLoadedModules())

  // Accordion Section States
  const [expandedSections, setExpandedSections] = useState({
    threads: true,
    variables: true,
    watch: true,
    stack: true,
    breakpoints: true,
    functionBreakpoints: true,
    exceptionBreakpoints: true,
    modules: false,
    console: true,
  })

  // Collapsible nested variables state
  const [expandedVars, setExpandedVars] = useState<Record<string, boolean>>({})

  // In-flight variable editing state
  const [editingVarId, setEditingVarId] = useState<string | null>(null)
  const [editingVarValue, setEditingVarValue] = useState<string>('')

  // Memory Hex Inspector Modal/Drawer state
  const [inspectingMemory, setInspectingMemory] = useState<MemoryInspectionResult | null>(null)

  // Watch input state
  const [newWatchInput, setNewWatchInput] = useState('')
  const [isAddingWatch, setIsAddingWatch] = useState(false)

  // Function Breakpoint input state
  const [newFunctionBpInput, setNewFunctionBpInput] = useState('')
  const [isAddingFunctionBp, setIsAddingFunctionBp] = useState(false)

  // Console input state
  const [consoleInput, setConsoleInput] = useState('')

  useEffect(() => {
    return debugService.subscribe(() => {
      setSessionState(debugService.getSessionState())
      setActiveTarget(debugService.getActiveTarget())
      setBreakpoints(debugService.getBreakpoints())
      setFunctionBreakpoints(debugService.getFunctionBreakpoints())
      setExceptionBreakpoints(debugService.getExceptionBreakpoints())
      setThreads(debugService.getThreads())
      setStackFrames(debugService.getStackFrames())
      setActiveFrameId(debugService.getActiveFrameId())
      setVariables(debugService.getVariables())
      setWatchExpressions(debugService.getWatchExpressions())
      setConsoleLogs(debugService.getConsoleLogs())
      setLoadedModules(debugService.getLoadedModules())
    })
  }, [])

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleVarExpand = (id: string) => {
    setExpandedVars((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const startEditVariable = (v: DebugVariable) => {
    setEditingVarId(v.id)
    setEditingVarValue(v.value)
  }

  const saveEditVariable = (id: string) => {
    debugService.updateVariableValue(id, editingVarValue)
    setEditingVarId(null)
  }

  const cancelEditVariable = () => {
    setEditingVarId(null)
  }

  const handleInspectMemory = (address: string) => {
    const result = debugService.inspectMemory(address, 64)
    setInspectingMemory(result)
  }

  const handleAddWatch = (e: React.FormEvent) => {
    e.preventDefault()
    if (newWatchInput.trim()) {
      debugService.addWatchExpression(newWatchInput.trim())
      setNewWatchInput('')
      setIsAddingWatch(false)
    }
  }

  const handleAddFunctionBp = (e: React.FormEvent) => {
    e.preventDefault()
    if (newFunctionBpInput.trim()) {
      debugService.addFunctionBreakpoint(newFunctionBpInput.trim())
      setNewFunctionBpInput('')
      setIsAddingFunctionBp(false)
    }
  }

  const handleConsoleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (consoleInput.trim()) {
      debugService.evaluateConsoleInput(consoleInput.trim())
      setConsoleInput('')
    }
  }

  const isRunningOrPaused = sessionState === 'running' || sessionState === 'paused'

  return (
    <div className="debug-view custom-scrollbar">
      {/* Target Compiler & Launch Header */}
      <div className="debug-header-box">
        <div className="debug-title-row">
          <div className="debug-title-left">
            <Bug size={15} className="debug-header-icon" />
            <span className="debug-title-text">Run & Debug</span>
          </div>
          <span className={`session-badge ${sessionState}`}>
            {sessionState.toUpperCase()}
          </span>
        </div>

        {/* Runtime Target Picker */}
        <div className="target-select-container">
          <label className="target-label">Debug Engine / Target Protocol:</label>
          <select
            className="target-select glass-interactive"
            value={activeTarget}
            onChange={(e) => debugService.setActiveTarget(e.target.value as DebugRuntimeTarget)}
            disabled={isRunningOrPaused}
          >
            {DEBUG_RUNTIME_TARGETS.map((t) => (
              <option key={t.target} value={t.target}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Launch Button */}
        {!isRunningOrPaused ? (
          <button
            className="debug-start-btn glass-interactive"
            onClick={() => debugService.startDebugging()}
          >
            <Play size={13} fill="currentColor" />
            <span>Start Debugging (F5)</span>
          </button>
        ) : (
          <div className="running-controls-banner">
            <span className="running-hint">Active session attached to {activeTarget.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* 1. Threads & Goroutines Section (When Active) */}
      {threads.length > 0 && (
        <div className="debug-section">
          <div className="section-header glass-interactive" onClick={() => toggleSection('threads')}>
            <div className="header-title-row">
              {expandedSections.threads ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Radio size={13} className="sec-icon thread-icon" />
              <span className="section-title">Threads & Goroutines ({threads.length})</span>
            </div>
          </div>

          {expandedSections.threads && (
            <div className="section-content">
              <div className="threads-list">
                {threads.map((th) => (
                  <div
                    key={th.id}
                    className={`thread-row glass-interactive ${th.isCurrent ? 'active' : ''}`}
                    onClick={() => debugService.switchThread(th.id)}
                  >
                    <span className={`thread-status-dot ${th.status}`} />
                    <span className="thread-name">{th.name}</span>
                    <span className="thread-badge">{th.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Variables Section with Live In-Flight Editing */}
      <div className="debug-section">
        <div className="section-header glass-interactive" onClick={() => toggleSection('variables')}>
          <div className="header-title-row">
            {expandedSections.variables ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Cpu size={13} className="sec-icon" />
            <span className="section-title">Variables</span>
          </div>
        </div>

        {expandedSections.variables && (
          <div className="section-content">
            {variables.length === 0 ? (
              <div className="empty-hint">No active stack frame or paused variables.</div>
            ) : (
              <div className="variables-list">
                {variables.map((v) => {
                  const isExpanded = !!expandedVars[v.id]
                  const hasChildren = v.children && v.children.length > 0
                  const isEditing = editingVarId === v.id

                  return (
                    <div key={v.id} className="var-item-group">
                      <div className={`var-row ${hasChildren ? 'expandable' : ''}`}>
                        <span className="var-scope-badge">{v.scope[0].toUpperCase()}</span>
                        {hasChildren && (
                          <span
                            className="var-expand-icon"
                            onClick={() => toggleVarExpand(v.id)}
                          >
                            {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                          </span>
                        )}
                        <span
                          className="var-name"
                          onClick={() => hasChildren && toggleVarExpand(v.id)}
                        >
                          {v.name}:
                        </span>

                        {/* In-Flight Value Editor */}
                        {isEditing ? (
                          <div className="var-edit-box">
                            <input
                              type="text"
                              className="var-edit-input"
                              value={editingVarValue}
                              onChange={(e) => setEditingVarValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditVariable(v.id)
                                if (e.key === 'Escape') cancelEditVariable()
                              }}
                              autoFocus
                            />
                            <button
                              className="var-btn save"
                              onClick={() => saveEditVariable(v.id)}
                              title="Save Value"
                            >
                              <Check size={11} />
                            </button>
                            <button
                              className="var-btn cancel"
                              onClick={cancelEditVariable}
                              title="Cancel"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`var-value ${v.type}`}
                            onDoubleClick={() => v.isEditable && startEditVariable(v)}
                            title={v.isEditable ? 'Double-click to modify value in flight' : undefined}
                          >
                            {v.value}
                          </span>
                        )}

                        <span className="var-type">{v.type}</span>

                        {/* Action buttons (Edit / Hex Memory) */}
                        <div className="var-actions">
                          {v.isEditable && !isEditing && (
                            <button
                              className="var-icon-btn"
                              onClick={() => startEditVariable(v)}
                              title="Override Variable Value in Runtime"
                            >
                              <Edit2 size={10} />
                            </button>
                          )}
                          {v.memoryAddress && (
                            <button
                              className="var-icon-btn hex"
                              onClick={() => handleInspectMemory(v.memoryAddress!)}
                              title={`Inspect Memory at ${v.memoryAddress}`}
                            >
                              <Binary size={11} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Nested Children */}
                      {hasChildren && isExpanded && (
                        <div className="var-nested-children">
                          {v.children?.map((child) => (
                            <div key={child.id} className="var-row nested">
                              <span className="var-name">{child.name}:</span>
                              <span className={`var-value ${child.type}`}>{child.value}</span>
                              {child.isEditable && (
                                <button
                                  className="var-icon-btn"
                                  onClick={() => startEditVariable(child)}
                                  title="Edit Value"
                                >
                                  <Edit2 size={9} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Watch Expressions Section */}
      <div className="debug-section">
        <div className="section-header glass-interactive" onClick={() => toggleSection('watch')}>
          <div className="header-title-row">
            {expandedSections.watch ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Eye size={13} className="sec-icon" />
            <span className="section-title">Watch</span>
          </div>
          <div className="section-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="sec-action-btn glass-interactive"
              onClick={() => setIsAddingWatch(true)}
              title="Add Watch Expression"
            >
              <Plus size={13} />
            </button>
            <button
              className="sec-action-btn glass-interactive"
              onClick={() => debugService.updateWatchExpressions()}
              title="Refresh Watch Expressions"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        {expandedSections.watch && (
          <div className="section-content">
            {isAddingWatch && (
              <form onSubmit={handleAddWatch} className="add-watch-form">
                <input
                  type="text"
                  className="watch-input"
                  placeholder="Expression (e.g. status, items.length)..."
                  value={newWatchInput}
                  onChange={(e) => setNewWatchInput(e.target.value)}
                  autoFocus
                  onBlur={() => !newWatchInput && setIsAddingWatch(false)}
                />
              </form>
            )}

            {watchExpressions.length === 0 ? (
              <div className="empty-hint">No watch expressions added.</div>
            ) : (
              <div className="watch-list">
                {watchExpressions.map((w) => (
                  <div key={w.id} className="watch-row">
                    <span className="watch-expr">{w.expression}:</span>
                    {w.error ? (
                      <span className="watch-error">{w.error}</span>
                    ) : (
                      <span className="watch-value">{w.value}</span>
                    )}
                    <button
                      className="watch-remove-btn"
                      onClick={() => debugService.removeWatchExpression(w.id)}
                      title="Remove Expression"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Call Stack Section */}
      <div className="debug-section">
        <div className="section-header glass-interactive" onClick={() => toggleSection('stack')}>
          <div className="header-title-row">
            {expandedSections.stack ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Layers size={13} className="sec-icon" />
            <span className="section-title">Call Stack</span>
          </div>
        </div>

        {expandedSections.stack && (
          <div className="section-content">
            {stackFrames.length === 0 ? (
              <div className="empty-hint">No active thread frames.</div>
            ) : (
              <div className="frames-list">
                {stackFrames.map((f) => {
                  const isActive = f.id === activeFrameId
                  return (
                    <div
                      key={f.id}
                      className={`frame-row glass-interactive ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        debugService.setActiveFrameId(f.id)
                        if (onOpenFileLocation) {
                          onOpenFileLocation(f.filePath, f.line)
                        }
                      }}
                    >
                      <div className="frame-left">
                        <span className="frame-name">{f.name}</span>
                        {f.instructionPointer && (
                          <span className="frame-ip">{f.instructionPointer}</span>
                        )}
                      </div>
                      <span className="frame-loc">
                        {f.filePath.split('/').pop()}:{f.line}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Function Breakpoints Section */}
      <div className="debug-section">
        <div className="section-header glass-interactive" onClick={() => toggleSection('functionBreakpoints')}>
          <div className="header-title-row">
            {expandedSections.functionBreakpoints ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <SlidersHorizontal size={13} className="sec-icon fb-icon" />
            <span className="section-title">Function Breakpoints ({functionBreakpoints.length})</span>
          </div>
          <div className="section-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="sec-action-btn glass-interactive"
              onClick={() => setIsAddingFunctionBp(true)}
              title="Add Function Breakpoint"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {expandedSections.functionBreakpoints && (
          <div className="section-content">
            {isAddingFunctionBp && (
              <form onSubmit={handleAddFunctionBp} className="add-watch-form">
                <input
                  type="text"
                  className="watch-input"
                  placeholder="Function symbol name (e.g. main, renderLiquidGlass)..."
                  value={newFunctionBpInput}
                  onChange={(e) => setNewFunctionBpInput(e.target.value)}
                  autoFocus
                  onBlur={() => !newFunctionBpInput && setIsAddingFunctionBp(false)}
                />
              </form>
            )}

            {functionBreakpoints.length === 0 ? (
              <div className="empty-hint">No function breakpoints configured.</div>
            ) : (
              <div className="breakpoints-list">
                {functionBreakpoints.map((fb) => (
                  <div key={fb.id} className="bp-row">
                    <input
                      type="checkbox"
                      checked={fb.enabled}
                      onChange={() => debugService.toggleFunctionBreakpoint(fb.id)}
                      className="bp-checkbox"
                    />
                    <span className="fb-name">{fb.functionName}</span>
                    {fb.hitCount > 0 && <span className="bp-tag cond">Hits: {fb.hitCount}</span>}
                    <button
                      className="bp-remove-btn"
                      onClick={() => debugService.removeFunctionBreakpoint(fb.id)}
                      title="Remove Function Breakpoint"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Exception Breakpoints Section */}
      <div className="debug-section">
        <div className="section-header glass-interactive" onClick={() => toggleSection('exceptionBreakpoints')}>
          <div className="header-title-row">
            {expandedSections.exceptionBreakpoints ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Circle size={13} color="#FF9F0A" className="sec-icon" />
            <span className="section-title">Exception Breakpoints</span>
          </div>
        </div>

        {expandedSections.exceptionBreakpoints && (
          <div className="section-content">
            <div className="exception-bp-list">
              <label className="exception-bp-row">
                <input
                  type="checkbox"
                  checked={exceptionBreakpoints.uncaught}
                  onChange={(e) => debugService.setExceptionBreakpoints({ uncaught: e.target.checked })}
                />
                <span className="exception-label">Uncaught Exceptions</span>
              </label>
              <label className="exception-bp-row">
                <input
                  type="checkbox"
                  checked={exceptionBreakpoints.caught}
                  onChange={(e) => debugService.setExceptionBreakpoints({ caught: e.target.checked })}
                />
                <span className="exception-label">Caught Exceptions (All)</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 7. Line Breakpoints Section */}
      <div className="debug-section">
        <div className="section-header glass-interactive" onClick={() => toggleSection('breakpoints')}>
          <div className="header-title-row">
            {expandedSections.breakpoints ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Circle size={13} fill="#FF453A" color="#FF453A" className="sec-icon" />
            <span className="section-title">Breakpoints ({breakpoints.length})</span>
          </div>
          <div className="section-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="sec-action-btn glass-interactive"
              onClick={() => debugService.clearAllBreakpoints()}
              title="Remove All Breakpoints"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {expandedSections.breakpoints && (
          <div className="section-content">
            {breakpoints.length === 0 ? (
              <div className="empty-hint">
                No breakpoints set. Click the editor gutter to toggle line breakpoints (F9).
              </div>
            ) : (
              <div className="breakpoints-list">
                {breakpoints.map((b) => (
                  <div key={b.id} className="bp-row">
                    <input
                      type="checkbox"
                      checked={b.enabled}
                      onChange={() => debugService.toggleBreakpointEnabled(b.id)}
                      className="bp-checkbox"
                    />
                    <div
                      className="bp-details"
                      onClick={() => onOpenFileLocation?.(b.filePath, b.line)}
                      title={`${b.filePath}:${b.line}`}
                    >
                      <span className="bp-file">{b.filePath.split('/').pop()}</span>
                      <span className="bp-line">:{b.line}</span>
                      {b.condition && <span className="bp-tag cond">cond: {b.condition}</span>}
                      {b.logMessage && <span className="bp-tag log">log: {b.logMessage}</span>}
                    </div>
                    <button
                      className="bp-remove-btn"
                      onClick={() => debugService.removeBreakpoint(b.id)}
                      title="Remove Breakpoint"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 8. Loaded Modules & Assemblies */}
      {loadedModules.length > 0 && (
        <div className="debug-section">
          <div className="section-header glass-interactive" onClick={() => toggleSection('modules')}>
            <div className="header-title-row">
              {expandedSections.modules ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Workflow size={13} className="sec-icon" />
              <span className="section-title">Loaded Modules ({loadedModules.length})</span>
            </div>
          </div>

          {expandedSections.modules && (
            <div className="section-content">
              <div className="modules-list">
                {loadedModules.map((m) => (
                  <div key={m.id} className="module-row">
                    <div className="module-top">
                      <span className="module-name">{m.name}</span>
                      <span className={`module-symbols ${m.symbolsLoaded ? 'loaded' : 'none'}`}>
                        {m.symbolsLoaded ? 'Symbols Loaded' : 'No Symbols'}
                      </span>
                    </div>
                    <div className="module-bottom">
                      <span className="module-range">{m.addressRange}</span>
                      <span className="module-path">{m.path}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 9. Debug Console / REPL Section */}
      <div className="debug-section console-section">
        <div className="section-header glass-interactive" onClick={() => toggleSection('console')}>
          <div className="header-title-row">
            {expandedSections.console ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Terminal size={13} className="sec-icon" />
            <span className="section-title">Debug Console</span>
          </div>
          <div className="section-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="sec-action-btn glass-interactive"
              onClick={() => debugService.clearConsole()}
              title="Clear Console"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {expandedSections.console && (
          <div className="section-content console-content">
            <div className="console-log-feed custom-scrollbar">
              {consoleLogs.map((log) => (
                <div key={log.id} className={`console-log-item ${log.type}`}>
                  <span className="log-time">{log.timestamp}</span>
                  <span className="log-text">{log.text}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleConsoleSubmit} className="console-input-bar">
              <input
                type="text"
                className="console-input"
                placeholder="Evaluate expression or command (e.g. set x = 42, mem 0x7ffe)..."
                value={consoleInput}
                onChange={(e) => setConsoleInput(e.target.value)}
              />
              <button type="submit" className="console-send-btn glass-interactive">
                <Send size={11} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Memory / Hex Inspection Drawer */}
      {inspectingMemory && (
        <div className="memory-inspector-drawer glass-panel">
          <div className="mem-drawer-header">
            <div className="mem-drawer-title">
              <Binary size={13} className="mem-icon" />
              <span>Memory Inspector: {inspectingMemory.address} ({inspectingMemory.totalBytes} bytes)</span>
            </div>
            <button className="mem-close-btn" onClick={() => setInspectingMemory(null)}>
              <X size={12} />
            </button>
          </div>
          <div className="mem-grid custom-scrollbar">
            <div className="mem-hex-block">{inspectingMemory.rawHex}</div>
            <div className="mem-ascii-block">{inspectingMemory.rawAscii}</div>
          </div>
        </div>
      )}

      <style>{`
        .debug-view {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow-y: auto;
          background: rgba(10, 14, 24, 0.4);
          color: rgba(235, 235, 245, 0.9);
          font-size: 0.78rem;
        }

        .debug-header-box {
          padding: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: rgba(255, 255, 255, 0.02);
        }

        .debug-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .debug-title-left {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .debug-header-icon {
          color: #FF453A;
        }

        .debug-title-text {
          font-weight: 700;
          font-size: 0.85rem;
          color: #FFFFFF;
        }

        .session-badge {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(235, 235, 245, 0.6);
        }

        .session-badge.running {
          background: rgba(48, 209, 88, 0.2);
          color: #30D158;
          border: 1px solid rgba(48, 209, 88, 0.4);
        }

        .session-badge.paused {
          background: rgba(255, 159, 10, 0.2);
          color: #FF9F0A;
          border: 1px solid rgba(255, 159, 10, 0.4);
        }

        .target-select-container {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .target-label {
          font-size: 0.7rem;
          color: rgba(235, 235, 245, 0.5);
        }

        .target-select {
          width: 100%;
          padding: 6px 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 6px;
          color: #FFFFFF;
          font-size: 0.75rem;
          outline: none;
          cursor: pointer;
        }

        .target-select:focus {
          border-color: #0A84FF;
        }

        .debug-start-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 7px 12px;
          border-radius: 6px;
          background: linear-gradient(135deg, #0A84FF 0%, #0066CC 100%);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #FFFFFF;
          font-weight: 600;
          font-size: 0.78rem;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(10, 132, 255, 0.3);
          transition: all 0.15s ease;
        }

        .debug-start-btn:hover {
          background: linear-gradient(135deg, #2191FF 0%, #0A84FF 100%);
          box-shadow: 0 4px 16px rgba(10, 132, 255, 0.45);
        }

        .running-controls-banner {
          padding: 6px 8px;
          border-radius: 6px;
          background: rgba(48, 209, 88, 0.1);
          border: 1px solid rgba(48, 209, 88, 0.25);
          text-align: center;
        }

        .running-hint {
          font-size: 0.7rem;
          font-weight: 600;
          color: #30D158;
        }

        .debug-section {
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.18);
          cursor: pointer;
          user-select: none;
        }

        .header-title-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sec-icon {
          color: rgba(235, 235, 245, 0.6);
        }

        .thread-icon {
          color: #30D158;
        }

        .fb-icon {
          color: #BF5AF2;
        }

        .section-title {
          font-weight: 600;
          font-size: 0.73rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: rgba(235, 235, 245, 0.7);
        }

        .section-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .sec-action-btn {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid transparent;
          color: rgba(235, 235, 245, 0.6);
          cursor: pointer;
        }

        .sec-action-btn:hover {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.08);
        }

        .section-content {
          padding: 6px 10px 8px;
        }

        .empty-hint {
          color: rgba(235, 235, 245, 0.4);
          font-size: 0.72rem;
          font-style: italic;
          padding: 4px 0;
        }

        /* Threads List */
        .threads-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .thread-row {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 4px 6px;
          border-radius: 4px;
          font-size: 0.72rem;
          cursor: pointer;
        }

        .thread-row.active {
          background: rgba(48, 209, 88, 0.15);
          border: 1px solid rgba(48, 209, 88, 0.3);
          color: #FFFFFF;
        }

        .thread-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .thread-status-dot.paused { background: #FF9F0A; }
        .thread-status-dot.running { background: #30D158; }
        .thread-status-dot.blocked { background: #FF453A; }

        .thread-name {
          flex: 1;
          font-family: var(--font-mono, monospace);
        }

        .thread-badge {
          font-size: 9px;
          color: rgba(235, 235, 245, 0.5);
          background: rgba(255, 255, 255, 0.06);
          padding: 1px 4px;
          border-radius: 3px;
        }

        /* Variables */
        .variables-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .var-row {
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
          padding: 2px 4px;
          border-radius: 4px;
        }

        .var-row.expandable {
          cursor: pointer;
        }

        .var-row.expandable:hover {
          background: rgba(255, 255, 255, 0.04);
        }

        .var-scope-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(235, 235, 245, 0.5);
        }

        .var-expand-icon {
          display: flex;
          align-items: center;
          color: rgba(235, 235, 245, 0.4);
        }

        .var-name {
          color: #5AC8FA;
        }

        .var-value {
          color: #FFFFFF;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 140px;
        }

        .var-value.string { color: #FF9F0A; }
        .var-value.number { color: #30D158; }
        .var-value.boolean { color: #BF5AF2; }

        .var-edit-box {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .var-edit-input {
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid #0A84FF;
          color: #FFFFFF;
          font-size: 11px;
          padding: 1px 4px;
          border-radius: 3px;
          outline: none;
          width: 110px;
        }

        .var-btn {
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          color: rgba(255, 255, 255, 0.6);
        }

        .var-btn.save:hover { color: #30D158; }
        .var-btn.cancel:hover { color: #FF453A; }

        .var-type {
          font-size: 0.65rem;
          color: rgba(235, 235, 245, 0.35);
          margin-left: auto;
        }

        .var-actions {
          display: flex;
          align-items: center;
          gap: 2px;
          margin-left: 4px;
        }

        .var-icon-btn {
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.3);
          cursor: pointer;
          padding: 1px 2px;
          border-radius: 2px;
        }

        .var-icon-btn:hover {
          color: #0A84FF;
          background: rgba(255, 255, 255, 0.08);
        }

        .var-icon-btn.hex:hover {
          color: #FF9F0A;
        }

        .var-nested-children {
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          border-left: 1px solid rgba(255, 255, 255, 0.06);
          margin-left: 8px;
        }

        /* Exception Breakpoints */
        .exception-bp-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .exception-bp-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          color: rgba(235, 235, 245, 0.8);
          cursor: pointer;
        }

        /* Watch */
        .add-watch-form {
          margin-bottom: 6px;
        }

        .watch-input {
          width: 100%;
          padding: 4px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid #0A84FF;
          color: #FFFFFF;
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
          outline: none;
        }

        .watch-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .watch-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 4px;
          border-radius: 4px;
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
        }

        .watch-row:hover {
          background: rgba(255, 255, 255, 0.04);
        }

        .watch-expr {
          color: #BF5AF2;
        }

        .watch-value {
          color: #30D158;
          flex: 1;
        }

        .watch-error {
          color: #FF453A;
          flex: 1;
        }

        .watch-remove-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
        }

        .watch-remove-btn:hover {
          color: #FF453A;
        }

        /* Call Stack */
        .frames-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .frame-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 6px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.72rem;
        }

        .frame-row:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .frame-row.active {
          background: rgba(10, 132, 255, 0.2);
          border: 1px solid rgba(10, 132, 255, 0.35);
          color: #FFFFFF;
        }

        .frame-left {
          display: flex;
          flex-direction: column;
        }

        .frame-name {
          font-weight: 500;
          font-family: var(--font-mono, monospace);
        }

        .frame-ip {
          font-size: 9px;
          color: rgba(235, 235, 245, 0.35);
          font-family: var(--font-mono, monospace);
        }

        .frame-loc {
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.45);
        }

        /* Breakpoints */
        .breakpoints-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .bp-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 3px 4px;
          border-radius: 4px;
          font-size: 0.72rem;
        }

        .bp-row:hover {
          background: rgba(255, 255, 255, 0.04);
        }

        .bp-checkbox {
          accent-color: #FF453A;
        }

        .bp-details {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          overflow: hidden;
        }

        .bp-file {
          color: #FFFFFF;
        }

        .bp-line {
          color: #FF9F0A;
        }

        .fb-name {
          font-family: var(--font-mono, monospace);
          color: #BF5AF2;
          flex: 1;
        }

        .bp-tag {
          font-size: 9px;
          padding: 1px 4px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.08);
        }

        .bp-tag.cond {
          color: #5AC8FA;
        }

        .bp-tag.log {
          color: #30D158;
        }

        .bp-remove-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.35);
          cursor: pointer;
        }

        .bp-remove-btn:hover {
          color: #FF453A;
        }

        /* Modules */
        .modules-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .module-row {
          padding: 4px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.02);
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 10px;
        }

        .module-top {
          display: flex;
          justify-content: space-between;
        }

        .module-name {
          font-weight: 600;
          color: #FFFFFF;
        }

        .module-symbols.loaded { color: #30D158; }
        .module-symbols.none { color: rgba(235, 235, 245, 0.4); }

        .module-bottom {
          display: flex;
          justify-content: space-between;
          color: rgba(235, 235, 245, 0.4);
          font-family: var(--font-mono, monospace);
        }

        /* Console */
        .console-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 180px;
        }

        .console-content {
          display: flex;
          flex-direction: column;
          flex: 1;
          padding: 4px;
        }

        .console-log-feed {
          flex: 1;
          max-height: 150px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-family: var(--font-mono, monospace);
          font-size: 0.68rem;
          padding: 4px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          margin-bottom: 4px;
        }

        .console-log-item {
          display: flex;
          gap: 6px;
        }

        .console-log-item.input { color: #5AC8FA; }
        .console-log-item.result { color: #30D158; }
        .console-log-item.info { color: rgba(235, 235, 245, 0.7); }
        .console-log-item.error { color: #FF453A; }
        .console-log-item.stdout { color: #E5E5EA; }

        .log-time {
          color: rgba(235, 235, 245, 0.3);
          flex-shrink: 0;
        }

        .log-text {
          white-space: pre-wrap;
          word-break: break-all;
        }

        .console-input-bar {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .console-input {
          flex: 1;
          padding: 4px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #FFFFFF;
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
          outline: none;
        }

        .console-send-btn {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(10, 132, 255, 0.2);
          border: 1px solid rgba(10, 132, 255, 0.4);
          color: #FFFFFF;
          border-radius: 4px;
          cursor: pointer;
        }

        /* Memory Inspector Drawer */
        .memory-inspector-drawer {
          position: sticky;
          bottom: 0;
          background: rgba(14, 18, 30, 0.95);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(10, 132, 255, 0.3);
          padding: 8px 10px;
          z-index: 50;
        }

        .mem-drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .mem-drawer-title {
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 600;
          font-size: 11px;
          color: #5AC8FA;
        }

        .mem-icon {
          color: #FF9F0A;
        }

        .mem-close-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
        }

        .mem-close-btn:hover { color: #FFF; }

        .mem-grid {
          display: flex;
          gap: 12px;
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          max-height: 80px;
          overflow-y: auto;
          background: rgba(0, 0, 0, 0.4);
          padding: 6px;
          border-radius: 4px;
        }

        .mem-hex-block {
          color: #30D158;
          line-height: 1.4;
          flex: 2;
        }

        .mem-ascii-block {
          color: #FF9F0A;
          line-height: 1.4;
          flex: 1;
        }
      `}</style>
    </div>
  )
}

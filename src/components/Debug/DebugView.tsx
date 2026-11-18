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
import './DebugView.css'

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

    </div>
  )
}

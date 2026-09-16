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
} from 'lucide-react'
import {
  debugService,
  DEBUG_RUNTIME_TARGETS,
  DebugRuntimeTarget,
  DebugSessionState,
  DebugVariable,
  BreakpointItem,
} from '../../services/debugService'

interface DebugViewProps {
  onOpenFileLocation?: (filePath: string, line: number) => void
}

export const DebugView: React.FC<DebugViewProps> = ({ onOpenFileLocation }) => {
  const [sessionState, setSessionState] = useState<DebugSessionState>(() => debugService.getSessionState())
  const [activeTarget, setActiveTarget] = useState<DebugRuntimeTarget>(() => debugService.getActiveTarget())
  const [breakpoints, setBreakpoints] = useState<BreakpointItem[]>(() => debugService.getBreakpoints())
  const [stackFrames, setStackFrames] = useState(() => debugService.getStackFrames())
  const [activeFrameId, setActiveFrameId] = useState(() => debugService.getActiveFrameId())
  const [variables, setVariables] = useState<DebugVariable[]>(() => debugService.getVariables())
  const [watchExpressions, setWatchExpressions] = useState(() => debugService.getWatchExpressions())
  const [consoleLogs, setConsoleLogs] = useState(() => debugService.getConsoleLogs())

  // Accordion Section States
  const [expandedSections, setExpandedSections] = useState({
    variables: true,
    watch: true,
    stack: true,
    breakpoints: true,
    console: true,
  })

  // Collapsible nested variables state
  const [expandedVars, setExpandedVars] = useState<Record<string, boolean>>({})

  // Watch input state
  const [newWatchInput, setNewWatchInput] = useState('')
  const [isAddingWatch, setIsAddingWatch] = useState(false)

  // Console input state
  const [consoleInput, setConsoleInput] = useState('')

  useEffect(() => {
    return debugService.subscribe(() => {
      setSessionState(debugService.getSessionState())
      setActiveTarget(debugService.getActiveTarget())
      setBreakpoints(debugService.getBreakpoints())
      setStackFrames(debugService.getStackFrames())
      setActiveFrameId(debugService.getActiveFrameId())
      setVariables(debugService.getVariables())
      setWatchExpressions(debugService.getWatchExpressions())
      setConsoleLogs(debugService.getConsoleLogs())
    })
  }, [])

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleVarExpand = (id: string) => {
    setExpandedVars((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleAddWatch = (e: React.FormEvent) => {
    e.preventDefault()
    if (newWatchInput.trim()) {
      debugService.addWatchExpression(newWatchInput.trim())
      setNewWatchInput('')
      setIsAddingWatch(false)
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
          <label className="target-label">Target Compiler / Engine:</label>
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

      {/* 1. Variables Section */}
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

                  return (
                    <div key={v.id} className="var-item-group">
                      <div
                        className={`var-row ${hasChildren ? 'expandable' : ''}`}
                        onClick={() => hasChildren && toggleVarExpand(v.id)}
                      >
                        <span className="var-scope-badge">{v.scope[0].toUpperCase()}</span>
                        {hasChildren && (
                          <span className="var-expand-icon">
                            {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                          </span>
                        )}
                        <span className="var-name">{v.name}:</span>
                        <span className={`var-value ${v.type}`}>{v.value}</span>
                        <span className="var-type">{v.type}</span>
                      </div>

                      {/* Nested Children */}
                      {hasChildren && isExpanded && (
                        <div className="var-nested-children">
                          {v.children?.map((child) => (
                            <div key={child.id} className="var-row nested">
                              <span className="var-name">{child.name}:</span>
                              <span className={`var-value ${child.type}`}>{child.value}</span>
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

      {/* 2. Watch Expressions Section */}
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

      {/* 3. Call Stack Section */}
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
                      <span className="frame-name">{f.name}</span>
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

      {/* 4. Breakpoints Section */}
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

      {/* 5. Debug Console / REPL Section */}
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
                placeholder="Evaluate expression (e.g. 2 + 2, activeTheme)..."
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

        .var-value.string {
          color: #FF9F0A;
        }

        .var-value.number {
          color: #30D158;
        }

        .var-type {
          font-size: 0.65rem;
          color: rgba(235, 235, 245, 0.35);
          margin-left: auto;
        }

        .var-nested-children {
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          border-left: 1px solid rgba(255, 255, 255, 0.06);
          margin-left: 8px;
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

        .frame-name {
          font-weight: 500;
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
          cursor: pointer;
        }

        .bp-details {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 3px;
          cursor: pointer;
          overflow: hidden;
        }

        .bp-file {
          color: #FFFFFF;
          font-weight: 500;
        }

        .bp-line {
          color: #FF453A;
          font-weight: 700;
        }

        .bp-tag {
          font-size: 0.62rem;
          padding: 1px 4px;
          border-radius: 3px;
          margin-left: 4px;
        }

        .bp-tag.cond {
          background: rgba(255, 214, 10, 0.18);
          color: #FFD60A;
        }

        .bp-tag.log {
          background: rgba(10, 132, 255, 0.18);
          color: #5AC8FA;
        }

        .bp-remove-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
        }

        .bp-remove-btn:hover {
          color: #FF453A;
        }

        /* Console */
        .console-content {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .console-log-feed {
          max-height: 140px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: rgba(0, 0, 0, 0.25);
          padding: 6px;
          border-radius: 4px;
          font-family: var(--font-mono, monospace);
          font-size: 0.7rem;
        }

        .console-log-item {
          display: flex;
          align-items: flex-start;
          gap: 6px;
        }

        .log-time {
          color: rgba(235, 235, 245, 0.3);
          font-size: 0.62rem;
          flex-shrink: 0;
        }

        .log-text {
          flex: 1;
          word-break: break-all;
        }

        .console-log-item.info .log-text {
          color: #5AC8FA;
        }

        .console-log-item.stdout .log-text {
          color: #FFFFFF;
        }

        .console-log-item.input .log-text {
          color: #BF5AF2;
        }

        .console-log-item.result .log-text {
          color: #30D158;
        }

        .console-log-item.error .log-text {
          color: #FF453A;
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

        .console-input:focus {
          border-color: #0A84FF;
        }

        .console-send-btn {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          background: rgba(10, 132, 255, 0.2);
          border: 1px solid rgba(10, 132, 255, 0.35);
          color: #0A84FF;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .console-send-btn:hover {
          background: #0A84FF;
          color: #FFFFFF;
        }
      `}</style>
    </div>
  )
}

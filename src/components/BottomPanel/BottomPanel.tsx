import React, { useState, useRef, useEffect } from 'react'
import {
  Terminal as TerminalIcon,
  AlertCircle,
  FileText,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { TerminalView } from '../Terminal/TerminalView'
import { ProblemsView } from '../Problems/ProblemsView'
import { diagnosticsService } from '../../services/diagnosticsService'

export type BottomPanelTab = 'terminal' | 'problems' | 'output'

interface BottomPanelProps {
  isOpen: boolean
  onClose: () => void
  onOpenTerminalConfig?: () => void
  workspacePath?: string
  defaultTab?: BottomPanelTab
  onGoToLocation?: (filePath: string, line: number, col: number) => void
  onRefreshDiagnostics?: () => void
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  isOpen,
  onClose,
  onOpenTerminalConfig,
  workspacePath,
  defaultTab = 'terminal',
  onGoToLocation,
  onRefreshDiagnostics,
}) => {
  const [activeTab, setActiveTab] = useState<BottomPanelTab>(defaultTab)
  const [panelHeight, setPanelHeight] = useState<number>(260)
  const [isMaximized, setIsMaximized] = useState<boolean>(false)
  const [problemCount, setProblemCount] = useState<number>(() => diagnosticsService.getCounts().total)
  const isDraggingRef = useRef<boolean>(false)
  const startYRef = useRef<number>(0)
  const startHeightRef = useRef<number>(260)

  useEffect(() => {
    return diagnosticsService.subscribe(() => {
      setProblemCount(diagnosticsService.getCounts().total)
    })
  }, [])

  useEffect(() => {
    setActiveTab(defaultTab)
  }, [defaultTab])

  // Resize drag handle handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    startYRef.current = e.clientY
    startHeightRef.current = panelHeight
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return
      const delta = startYRef.current - moveEvent.clientY
      const newHeight = Math.max(140, Math.min(window.innerHeight - 120, startHeightRef.current + delta))
      setPanelHeight(newHeight)
      if (isMaximized) setIsMaximized(false)
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  if (!isOpen) return null

  return (
    <div
      className={`bottom-panel-container glass-panel ${isMaximized ? 'maximized' : ''}`}
      style={{ height: isMaximized ? 'calc(100vh - 72px)' : `${panelHeight}px` }}
    >
      {/* Resizer Handle */}
      <div className="panel-resize-handle" onMouseDown={handleMouseDown}>
        <div className="resize-indicator" />
      </div>

      {/* Panel Top Navigation Bar */}
      <div className="bottom-panel-top-nav">
        <div className="panel-tabs">
          <button
            className={`panel-tab-btn glass-interactive ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            <TerminalIcon size={13} className="tab-icon" />
            <span>TERMINAL</span>
          </button>

          <button
            className={`panel-tab-btn glass-interactive ${activeTab === 'problems' ? 'active' : ''}`}
            onClick={() => setActiveTab('problems')}
          >
            <AlertCircle size={13} className="tab-icon" />
            <span>PROBLEMS</span>
            {problemCount > 0 && <span className="badge-count error">{problemCount}</span>}
          </button>

          <button
            className={`panel-tab-btn glass-interactive ${activeTab === 'output' ? 'active' : ''}`}
            onClick={() => setActiveTab('output')}
          >
            <FileText size={13} className="tab-icon" />
            <span>OUTPUT</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="panel-window-controls">
          <button
            className="control-icon-btn glass-interactive"
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? 'Restore Panel Size' : 'Maximize Panel'}
          >
            {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
          <button
            className="control-icon-btn glass-interactive"
            onClick={onClose}
            title="Close Panel (Ctrl+`)"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="bottom-panel-body">
        {activeTab === 'terminal' && (
          <TerminalView
            onOpenConfig={onOpenTerminalConfig}
            workspacePath={workspacePath}
          />
        )}

        {activeTab === 'problems' && (
          <ProblemsView
            onGoToLocation={onGoToLocation}
            onRefresh={onRefreshDiagnostics}
          />
        )}

        {activeTab === 'output' && (
          <div className="output-log-view">
            <div className="output-header">[IndoctrinatedEdit Core Engine Output]</div>
            <div className="output-line info">[info] Liquid Glass Specular Render Engine active.</div>
            <div className="output-line info">[info] Monaco 0.52.2 workspace initialized.</div>
            <div className="output-line info">[info] Microservice sandboxes and extension hosts online.</div>
            <div className="output-line success">[ready] All language providers and toolchain detectors operational.</div>
          </div>
        )}
      </div>

      <style>{`
        .bottom-panel-container {
          position: relative;
          width: 100%;
          border-top: var(--specular-border);
          background: rgba(8, 12, 20, 0.9);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          display: flex;
          flex-direction: column;
          z-index: 40;
          overflow: hidden;
          box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.4);
        }

        .bottom-panel-container.maximized {
          position: absolute;
          bottom: 24px;
          left: 0;
          right: 0;
          z-index: 50;
        }

        .panel-resize-handle {
          height: 6px;
          width: 100%;
          cursor: row-resize;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          transition: background var(--transition-fast);
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 10;
        }

        .panel-resize-handle:hover {
          background: rgba(0, 122, 255, 0.35);
        }

        .resize-indicator {
          width: 36px;
          height: 2px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.2);
        }

        .bottom-panel-top-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 10px;
          background: rgba(0, 0, 0, 0.35);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          flex-shrink: 0;
        }

        .panel-tabs {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .panel-tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          background: transparent;
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .panel-tab-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        .panel-tab-btn.active {
          color: #FFF;
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .tab-icon {
          color: var(--accent-primary);
        }

        .badge-count {
          font-size: 9px;
          background: rgba(255, 255, 255, 0.1);
          padding: 1px 5px;
          border-radius: 8px;
          font-weight: 800;
        }

        .panel-window-controls {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .control-icon-btn {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .control-icon-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-primary);
        }

        .bottom-panel-body {
          flex: 1;
          height: 100%;
          overflow: hidden;
          position: relative;
        }

        .problems-empty-view {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 8px;
          color: var(--text-muted);
        }

        .clean-icon {
          color: #30D158;
        }

        .clean-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .clean-desc {
          font-size: 11.5px;
          margin: 0;
        }

        .output-log-view {
          padding: 12px 16px;
          font-family: var(--font-mono);
          font-size: 12px;
          line-height: 1.5;
          overflow-y: auto;
          height: 100%;
        }

        .output-header {
          color: #64D2FF;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .output-line.info {
          color: var(--text-secondary);
        }

        .output-line.success {
          color: #30D158;
        }
      `}</style>
    </div>
  )
}

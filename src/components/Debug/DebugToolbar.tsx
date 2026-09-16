import React, { useState, useRef, useEffect } from 'react'
import {
  Play,
  Pause,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  RotateCcw,
  Square,
  GripHorizontal,
  Bug,
} from 'lucide-react'
import { debugService, DebugSessionState } from '../../services/debugService'

interface DebugToolbarProps {
  onGoToActiveLocation?: (filePath: string, line: number) => void
}

export const DebugToolbar: React.FC<DebugToolbarProps> = ({ onGoToActiveLocation }) => {
  const [sessionState, setSessionState] = useState<DebugSessionState>(() => debugService.getSessionState())
  const [activeLocation, setActiveLocation] = useState(() => debugService.getActiveLocation())
  const [activeTarget, setActiveTarget] = useState(() => debugService.getActiveTarget())
  
  // Floating toolbar drag state
  const [position, setPosition] = useState({ x: Math.max(80, window.innerWidth / 2 - 160), y: 36 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })

  useEffect(() => {
    return debugService.subscribe(() => {
      setSessionState(debugService.getSessionState())
      const loc = debugService.getActiveLocation()
      setActiveLocation(loc)
      setActiveTarget(debugService.getActiveTarget())
      if (loc && onGoToActiveLocation) {
        onGoToActiveLocation(loc.filePath, loc.line)
      }
    })
  }, [onGoToActiveLocation])

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
    document.body.style.userSelect = 'none'

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return
      const nextX = Math.max(10, Math.min(window.innerWidth - 340, moveEvent.clientX - dragStart.current.x))
      const nextY = Math.max(30, Math.min(window.innerHeight - 80, moveEvent.clientY - dragStart.current.y))
      setPosition({ x: nextX, y: nextY })
    }

    const handleMouseUp = () => {
      isDragging.current = false
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  if (sessionState === 'inactive') return null

  const isPaused = sessionState === 'paused'

  return (
    <div
      className="debug-floating-toolbar glass-panel"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {/* Specular Ambient Glow */}
      <div className="toolbar-specular-glow" />

      {/* Drag Grip Handle */}
      <div className="toolbar-drag-handle" onMouseDown={handleMouseDown} title="Drag Debug Toolbar">
        <GripHorizontal size={13} className="drag-icon" />
        <Bug size={13} className={`target-icon ${activeTarget}`} />
        <span className="target-label">{activeTarget.toUpperCase()}</span>
      </div>

      {/* Action Controls */}
      <div className="toolbar-actions">
        {isPaused ? (
          <button
            className="toolbar-btn btn-continue glass-interactive"
            onClick={() => debugService.continueExecution()}
            title="Continue (F5)"
          >
            <Play size={13} fill="currentColor" />
          </button>
        ) : (
          <button
            className="toolbar-btn btn-pause glass-interactive"
            onClick={() => debugService.pause()}
            title="Pause (F6)"
          >
            <Pause size={13} fill="currentColor" />
          </button>
        )}

        <button
          className="toolbar-btn glass-interactive"
          onClick={() => debugService.stepOver()}
          title="Step Over (F10)"
        >
          <ArrowRight size={13} />
        </button>

        <button
          className="toolbar-btn glass-interactive"
          onClick={() => debugService.stepInto()}
          title="Step Into (F11)"
        >
          <ArrowDown size={13} />
        </button>

        <button
          className="toolbar-btn glass-interactive"
          onClick={() => debugService.stepOut()}
          title="Step Out (Shift+F11)"
        >
          <ArrowUp size={13} />
        </button>

        <div className="toolbar-divider" />

        <button
          className="toolbar-btn btn-restart glass-interactive"
          onClick={() => debugService.restart()}
          title="Restart Session (Ctrl+Shift+F5)"
        >
          <RotateCcw size={13} />
        </button>

        <button
          className="toolbar-btn btn-stop glass-interactive"
          onClick={() => debugService.stopDebugging()}
          title="Stop Debugging (Shift+F5)"
        >
          <Square size={12} fill="currentColor" />
        </button>
      </div>

      {/* Status Pill */}
      {activeLocation && (
        <div className="toolbar-location-pill" title={`${activeLocation.filePath}:${activeLocation.line}`}>
          <span className="pill-dot" />
          <span className="pill-text">Line {activeLocation.line}</span>
        </div>
      )}

      <style>{`
        .debug-floating-toolbar {
          position: fixed;
          z-index: 1060;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          background: rgba(14, 18, 30, 0.92);
          backdrop-filter: blur(28px) saturate(220%);
          -webkit-backdrop-filter: blur(28px) saturate(220%);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 20px;
          box-shadow: 0 16px 40px -6px rgba(0, 0, 0, 0.75), 0 0 24px rgba(10, 132, 255, 0.25);
          user-select: none;
          animation: floatIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes floatIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .toolbar-specular-glow {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.15), transparent 70%);
          pointer-events: none;
        }

        .toolbar-drag-handle {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 6px;
          cursor: grab;
          border-radius: 12px;
          color: rgba(235, 235, 245, 0.55);
          transition: all 0.15s ease;
        }

        .toolbar-drag-handle:active {
          cursor: grabbing;
        }

        .toolbar-drag-handle:hover {
          color: rgba(255, 255, 255, 0.9);
          background: rgba(255, 255, 255, 0.06);
        }

        .target-icon {
          color: #0A84FF;
        }

        .target-icon.python {
          color: #FFD60A;
        }

        .target-icon.rust {
          color: #FF9F0A;
        }

        .target-icon.go {
          color: #30D158;
        }

        .target-label {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: rgba(255, 255, 255, 0.85);
        }

        .toolbar-actions {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .toolbar-btn {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          background: transparent;
          color: rgba(235, 235, 245, 0.8);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .toolbar-btn:hover {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.14);
        }

        .toolbar-btn.btn-continue {
          color: #30D158;
        }

        .toolbar-btn.btn-continue:hover {
          background: rgba(48, 209, 88, 0.2);
          border-color: rgba(48, 209, 88, 0.4);
          box-shadow: 0 0 12px rgba(48, 209, 88, 0.4);
        }

        .toolbar-btn.btn-pause {
          color: #FF9F0A;
        }

        .toolbar-btn.btn-pause:hover {
          background: rgba(255, 159, 10, 0.2);
          border-color: rgba(255, 159, 10, 0.4);
        }

        .toolbar-btn.btn-restart {
          color: #0A84FF;
        }

        .toolbar-btn.btn-restart:hover {
          background: rgba(10, 132, 255, 0.2);
          border-color: rgba(10, 132, 255, 0.4);
        }

        .toolbar-btn.btn-stop {
          color: #FF453A;
        }

        .toolbar-btn.btn-stop:hover {
          background: rgba(255, 69, 58, 0.25);
          border-color: rgba(255, 69, 58, 0.5);
          box-shadow: 0 0 12px rgba(255, 69, 58, 0.4);
        }

        .toolbar-divider {
          width: 1px;
          height: 16px;
          background: rgba(255, 255, 255, 0.12);
          margin: 0 2px;
        }

        .toolbar-location-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 2px 8px;
          border-radius: 12px;
          background: rgba(10, 132, 255, 0.15);
          border: 1px solid rgba(10, 132, 255, 0.3);
          font-size: 0.7rem;
          font-weight: 600;
          color: #5AC8FA;
          margin-left: 2px;
        }

        .pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #30D158;
          box-shadow: 0 0 6px #30D158;
          animation: pulse 1.5s infinite ease-in-out;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
      `}</style>
    </div>
  )
}

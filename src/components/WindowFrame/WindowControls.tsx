import React from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'

interface WindowControlsProps {
  isMaximized: boolean
  onMinimize: () => void
  onMaximize: () => void
  onClose: () => void
}

export const WindowControls: React.FC<WindowControlsProps> = ({
  isMaximized,
  onMinimize,
  onMaximize,
  onClose,
}) => {
  return (
    <div className="window-controls-capsule">
      {/* Minimize Button (Amber) */}
      <button
        type="button"
        className="ctrl-btn btn-amber"
        onMouseDown={(e) => {
          e.stopPropagation()
        }}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onMinimize()
        }}
        title="Minimize Window"
        aria-label="Minimize"
      >
        <Minus size={11} strokeWidth={3} className="ctrl-icon" />
      </button>

      {/* Maximize / Restore Button (Green) */}
      <button
        type="button"
        className="ctrl-btn btn-green"
        onMouseDown={(e) => {
          e.stopPropagation()
        }}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onMaximize()
        }}
        title={isMaximized ? 'Restore Window' : 'Maximize Window'}
        aria-label={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? (
          <Copy size={10} strokeWidth={2.5} className="ctrl-icon" />
        ) : (
          <Square size={9} strokeWidth={3} className="ctrl-icon" />
        )}
      </button>

      {/* Close Button (Red) */}
      <button
        type="button"
        className="ctrl-btn btn-red"
        onMouseDown={(e) => {
          e.stopPropagation()
        }}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onClose()
        }}
        title="Close Window"
        aria-label="Close"
      >
        <X size={11} strokeWidth={3} className="ctrl-icon" />
      </button>

      <style>{`
        .window-controls-capsule {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.16);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          pointer-events: auto !important;
          -webkit-app-region: no-drag !important;
          user-select: none;
          z-index: 1001;
        }

        .window-controls-capsule *,
        .ctrl-btn,
        .ctrl-btn * {
          -webkit-app-region: no-drag !important;
        }

        .ctrl-btn {
          position: relative;
          width: 17px;
          height: 17px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer !important;
          padding: 0;
          outline: none;
          pointer-events: auto !important;
          -webkit-app-region: no-drag !important;
          transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, filter 0.2s ease;
        }

        .ctrl-btn:hover {
          transform: scale(1.18);
        }

        .ctrl-btn:active {
          transform: scale(0.92);
        }

        .ctrl-icon {
          color: rgba(0, 0, 0, 0.85);
          display: block;
          pointer-events: none !important;
        }

        /* Amber / Minimize */
        .btn-amber {
          background: linear-gradient(135deg, #FFD60A 0%, #FF9F0A 100%);
          box-shadow: 0 0 6px rgba(255, 214, 10, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.6);
        }

        .btn-amber:hover {
          box-shadow: 0 0 12px rgba(255, 214, 10, 0.9), 0 0 20px rgba(255, 159, 10, 0.6);
          border-color: #FFFFFF;
        }

        /* Green / Maximize */
        .btn-green {
          background: linear-gradient(135deg, #30D158 0%, #248A3D 100%);
          box-shadow: 0 0 6px rgba(48, 209, 88, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.6);
        }

        .btn-green:hover {
          box-shadow: 0 0 12px rgba(48, 209, 88, 0.9), 0 0 20px rgba(48, 209, 88, 0.6);
          border-color: #FFFFFF;
        }

        /* Red / Close */
        .btn-red {
          background: linear-gradient(135deg, #FF453A 0%, #D70015 100%);
          box-shadow: 0 0 6px rgba(255, 69, 58, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.6);
        }

        .btn-red:hover {
          box-shadow: 0 0 12px rgba(255, 69, 58, 0.9), 0 0 20px rgba(215, 0, 21, 0.6);
          border-color: #FFFFFF;
        }
      `}</style>
    </div>
  )
}

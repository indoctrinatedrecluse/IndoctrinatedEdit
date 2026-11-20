import React from 'react'

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
    <div className="window-controls-capsule" role="group" aria-label="Window Management Controls">
      {/* Minimize Button (Amber) */}
      <button
        type="button"
        className="ctrl-btn btn-amber"
        onMouseDown={(e) => {
          e.stopPropagation()
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
        }}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onMinimize()
        }}
        title="Minimize Window"
        aria-label="Minimize Window"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          className="ctrl-icon"
        >
          <line x1="2.5" y1="8" x2="13.5" y2="8" />
        </svg>
      </button>

      {/* Maximize / Restore Button (Green) - Dynamically changes based on isMaximized */}
      <button
        type="button"
        className={`ctrl-btn btn-green ${isMaximized ? 'is-maximized' : 'is-normal'}`}
        onMouseDown={(e) => {
          e.stopPropagation()
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
        }}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onMaximize()
        }}
        title={isMaximized ? 'Restore Window (Double-click titlebar)' : 'Maximize Window (Double-click titlebar)'}
        aria-label={isMaximized ? 'Restore Window' : 'Maximize Window'}
      >
        {isMaximized ? (
          /* Dynamic Restore Icon: Overlapping double-window frames */
          <svg
            width="10"
            height="10"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ctrl-icon restore-icon"
          >
            <rect x="5" y="2" width="9" height="9" rx="1.5" />
            <path d="M2.5 5.5v6.5a1.5 1.5 0 0 0 1.5 1.5H11" />
          </svg>
        ) : (
          /* Dynamic Maximize Icon: Single crisp window frame */
          <svg
            width="9"
            height="9"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ctrl-icon max-icon"
          >
            <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
          </svg>
        )}
      </button>

      {/* Close Button (Red) */}
      <button
        type="button"
        className="ctrl-btn btn-red"
        onMouseDown={(e) => {
          e.stopPropagation()
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
        }}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onClose()
        }}
        title="Close Window (Alt+F4)"
        aria-label="Close Window"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="ctrl-icon close-icon"
        >
          <line x1="3" y1="3" x2="13" y2="13" />
          <line x1="13" y1="3" x2="3" y2="13" />
        </svg>
      </button>

      <style>{`
        .window-controls-capsule {
          display: inline-flex;
          align-items: center;
          gap: 13px; /* Slightly increased spacing between buttons */
          padding: 5px 14px; /* Roomier pill capsule */
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.09);
          border: 1px solid rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.22);
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
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer !important;
          padding: 0;
          outline: none;
          pointer-events: auto !important;
          -webkit-app-region: no-drag !important;
          transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, filter 0.2s ease, border-color 0.15s ease;
        }

        .ctrl-btn:hover {
          transform: scale(1.18);
        }

        .ctrl-btn:active {
          transform: scale(0.90);
        }

        .ctrl-icon {
          color: rgba(0, 0, 0, 0.88);
          display: block;
          pointer-events: none !important;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }

        /* Amber / Minimize */
        .btn-amber {
          background: linear-gradient(135deg, #FFD60A 0%, #FF9F0A 100%);
          box-shadow: 0 0 6px rgba(255, 214, 10, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.65);
        }

        .btn-amber:hover {
          box-shadow: 0 0 14px rgba(255, 214, 10, 0.95), 0 0 22px rgba(255, 159, 10, 0.65);
          border-color: #FFFFFF;
        }

        /* Green / Maximize & Restore */
        .btn-green {
          background: linear-gradient(135deg, #30D158 0%, #248A3D 100%);
          box-shadow: 0 0 6px rgba(48, 209, 88, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.65);
        }

        .btn-green:hover {
          box-shadow: 0 0 14px rgba(48, 209, 88, 0.95), 0 0 22px rgba(48, 209, 88, 0.65);
          border-color: #FFFFFF;
        }

        .btn-green.is-maximized {
          background: linear-gradient(135deg, #34C759 0%, #1D7A34 100%);
          border-color: rgba(255, 255, 255, 0.55);
        }

        /* Red / Close */
        .btn-red {
          background: linear-gradient(135deg, #FF453A 0%, #D70015 100%);
          box-shadow: 0 0 6px rgba(255, 69, 58, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.65);
        }

        .btn-red:hover {
          box-shadow: 0 0 14px rgba(255, 69, 58, 0.95), 0 0 22px rgba(215, 0, 21, 0.65);
          border-color: #FFFFFF;
        }
      `}</style>
    </div>
  )
}

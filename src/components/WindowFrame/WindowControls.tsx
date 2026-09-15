import React, { useState } from 'react'
import { Minus, Plus, X, Copy } from 'lucide-react'

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
  const [hovered, setHovered] = useState<boolean>(false)

  return (
    <div
      className="window-controls-capsule window-no-drag"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Minimize Button */}
      <button
        className="capsule-btn minimize"
        onClick={onMinimize}
        title="Minimize"
      >
        <span className="dot dot-amber" />
        <span className={`icon ${hovered ? 'visible' : ''}`}>
          <Minus size={9} strokeWidth={3} />
        </span>
      </button>

      {/* Maximize Button */}
      <button
        className="capsule-btn maximize"
        onClick={onMaximize}
        title={isMaximized ? 'Restore' : 'Maximize'}
      >
        <span className="dot dot-green" />
        <span className={`icon ${hovered ? 'visible' : ''}`}>
          {isMaximized ? <Copy size={8} strokeWidth={2.5} /> : <Plus size={9} strokeWidth={3} />}
        </span>
      </button>

      {/* Close Button */}
      <button
        className="capsule-btn close"
        onClick={onClose}
        title="Close"
      >
        <span className="dot dot-red" />
        <span className={`icon ${hovered ? 'visible' : ''}`}>
          <X size={9} strokeWidth={3} />
        </span>
      </button>

      <style>{`
        .window-controls-capsule {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .window-controls-capsule:hover {
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(255, 255, 255, 0.18);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 4px 16px rgba(0, 0, 0, 0.3);
        }

        .capsule-btn {
          position: relative;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          transition: transform 0.15s ease, filter 0.2s ease;
        }

        .capsule-btn:hover {
          transform: scale(1.15);
        }

        .capsule-btn:active {
          transform: scale(0.95);
        }

        .dot {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          transition: all 0.2s ease;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.4);
        }

        .dot-red {
          background: #FF453A;
          box-shadow: 0 0 6px rgba(255, 69, 58, 0.6);
        }

        .dot-amber {
          background: #FFD60A;
          box-shadow: 0 0 6px rgba(255, 214, 10, 0.6);
        }

        .dot-green {
          background: #30D158;
          box-shadow: 0 0 6px rgba(48, 209, 88, 0.6);
        }

        .capsule-btn.close:hover .dot-red {
          box-shadow: 0 0 10px rgba(255, 69, 58, 0.9), 0 0 16px rgba(255, 69, 58, 0.6);
        }

        .capsule-btn.minimize:hover .dot-amber {
          box-shadow: 0 0 10px rgba(255, 214, 10, 0.9), 0 0 16px rgba(255, 214, 10, 0.6);
        }

        .capsule-btn.maximize:hover .dot-green {
          box-shadow: 0 0 10px rgba(48, 209, 88, 0.9), 0 0 16px rgba(48, 209, 88, 0.6);
        }

        .icon {
          position: relative;
          z-index: 2;
          color: rgba(0, 0, 0, 0.75);
          opacity: 0;
          transition: opacity 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon.visible {
          opacity: 1;
        }
      `}</style>
    </div>
  )
}

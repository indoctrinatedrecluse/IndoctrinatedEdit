import React, { useEffect, useState } from 'react'
import { Minus, Square, Copy, X, FolderOpen } from 'lucide-react'
import { AppIcon } from '../Brand/AppIcon'

interface WindowFrameProps {
  activeFileName?: string
  workspaceName?: string
  onCommandPaletteToggle?: () => void
}

export const WindowFrame: React.FC<WindowFrameProps> = ({
  activeFileName = 'welcome.ts',
  workspaceName = 'IndoctrinatedEdit',
  onCommandPaletteToggle,
}) => {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (window.electronAPI?.isMaximized) {
      window.electronAPI.isMaximized().then(setIsMaximized)
    }
    const cleanup = window.electronAPI?.onMaximizedChange?.((max) => {
      setIsMaximized(max)
    })
    return () => cleanup?.()
  }, [])

  const handleMinimize = () => window.electronAPI?.minimize()
  const handleMaximize = () => window.electronAPI?.maximize()
  const handleClose = () => window.electronAPI?.close()

  return (
    <header className="window-frame window-drag-region">
      {/* Left branding & traffic lights / controls */}
      <div className="window-frame-left window-no-drag">
        <div className="app-badge">
          <AppIcon size={18} />
          <span className="app-title">IndoctrinatedEdit</span>
        </div>
      </div>

      {/* Center active file / search pill */}
      <div className="window-frame-center window-no-drag">
        <button
          className="search-pill glass-pill"
          onClick={onCommandPaletteToggle}
          title="Open Command Palette (Ctrl+Shift+P)"
        >
          <FolderOpen size={13} className="search-pill-icon" />
          <span className="search-pill-workspace">{workspaceName}</span>
          <span className="search-pill-separator">/</span>
          <span className="search-pill-file">{activeFileName}</span>
          <span className="search-pill-shortcut">Ctrl+P</span>
        </button>
      </div>

      {/* Right window control buttons */}
      <div className="window-frame-right window-no-drag">
        <button
          className="window-control-btn minimize"
          onClick={handleMinimize}
          title="Minimize"
        >
          <Minus size={13} />
        </button>
        <button
          className="window-control-btn maximize"
          onClick={handleMaximize}
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Copy size={12} /> : <Square size={11} />}
        </button>
        <button
          className="window-control-btn close"
          onClick={handleClose}
          title="Close"
        >
          <X size={14} />
        </button>
      </div>

      <style>{`
        .window-frame {
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 10px;
          background: var(--glass-bg-subtle);
          border-bottom: var(--specular-border-subtle);
          z-index: 100;
          position: relative;
        }

        .window-frame-left, .window-frame-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .app-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 3px 10px;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .app-badge-icon {
          color: var(--accent-cyan);
          filter: drop-shadow(0 0 8px rgba(100, 210, 255, 0.6));
        }

        .app-title {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.3px;
          background: linear-gradient(135deg, #FFF 0%, #A1A1A6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .window-frame-center {
          flex: 1;
          display: flex;
          justify-content: center;
          max-width: 480px;
          margin: 0 16px;
        }

        .search-pill {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 24px;
          padding: 0 14px;
          font-size: 11.5px;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .search-pill:hover {
          color: var(--text-primary);
          box-shadow: 0 0 14px rgba(10, 132, 255, 0.2);
        }

        .search-pill-icon {
          color: var(--accent-primary);
        }

        .search-pill-workspace {
          color: var(--text-muted);
        }

        .search-pill-separator {
          color: var(--text-muted);
          opacity: 0.5;
        }

        .search-pill-file {
          font-weight: 500;
          color: var(--text-primary);
        }

        .search-pill-shortcut {
          margin-left: auto;
          font-size: 10px;
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-muted);
        }

        .window-control-btn {
          width: 28px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          border-radius: var(--radius-xs);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .window-control-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-primary);
        }

        .window-control-btn.close:hover {
          background: var(--accent-red);
          color: #FFF;
        }
      `}</style>
    </header>
  )
}

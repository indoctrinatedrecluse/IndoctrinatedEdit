import React, { useEffect, useState } from 'react'
import { FolderOpen } from 'lucide-react'
import { AppIcon } from '../Brand/AppIcon'
import { WindowControls } from './WindowControls'

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
  const handleMaximize = async () => {
    if (window.electronAPI?.maximize) {
      const isMax = await window.electronAPI.maximize()
      if (typeof isMax === 'boolean') {
        setIsMaximized(isMax)
      }
    }
  }
  const handleClose = () => window.electronAPI?.close()

  return (
    <header className="window-frame window-drag-region">
      {/* Left branding badge */}
      <div className="window-frame-left window-no-drag">
        <div className="app-brand-badge glass-pill">
          <AppIcon size={18} />
          <span className="app-title">IndoctrinatedEdit</span>
          <span className="app-tag">PRO</span>
        </div>
      </div>

      {/* Center active file / search pill */}
      <div className="window-frame-center window-no-drag">
        <button
          className="search-pill glass-pill"
          onClick={onCommandPaletteToggle}
          title="Open Quick Search & Command Palette (Ctrl+P / Ctrl+Shift+P)"
        >
          <FolderOpen size={13} className="search-pill-icon" />
          <span className="search-pill-workspace">{workspaceName}</span>
          <span className="search-pill-separator">/</span>
          <span className="search-pill-file">{activeFileName}</span>
          <div className="search-pill-shortcuts">
            <kbd>Ctrl+P</kbd>
          </div>
        </button>
      </div>

      {/* Right custom Liquid Glass window control capsules */}
      <div className="window-frame-right window-no-drag">
        <WindowControls
          isMaximized={isMaximized}
          onMinimize={handleMinimize}
          onMaximize={handleMaximize}
          onClose={handleClose}
        />
      </div>

      {/* Dynamic specular rim line */}
      <div className="window-rim-line" />

      <style>{`
        .window-frame {
          height: 42px;
          min-height: 42px;
          width: 100%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          background: rgba(10, 14, 24, 0.70);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          z-index: 1000;
          position: relative;
        }

        .window-rim-line {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.22) 20%,
            rgba(0, 240, 255, 0.45) 50%,
            rgba(255, 255, 255, 0.22) 80%,
            transparent 100%
          );
          pointer-events: none;
        }

        .window-frame-left, .window-frame-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          pointer-events: auto !important;
          -webkit-app-region: no-drag !important;
        }

        .app-brand-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 3px 10px 3px 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .app-title {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.4px;
          background: linear-gradient(135deg, #FFFFFF 0%, #B0B5C0 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .app-tag {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.6px;
          padding: 1px 4px;
          border-radius: 3px;
          background: linear-gradient(135deg, var(--accent-primary) 0%, #BF5AF2 100%);
          color: #FFF;
        }

        .window-frame-center {
          flex: 1;
          display: flex;
          justify-content: center;
          max-width: 460px;
          margin: 0 16px;
        }

        .search-pill {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          height: 26px;
          padding: 0 12px;
          font-size: 11.5px;
          color: var(--text-secondary);
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.2);
        }

        .search-pill:hover {
          color: var(--text-primary);
          border-color: rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 0 16px rgba(10, 132, 255, 0.25);
        }

        .search-pill-icon {
          color: var(--accent-primary);
        }

        .search-pill-workspace {
          color: var(--text-muted);
          font-weight: 500;
        }

        .search-pill-separator {
          color: var(--text-muted);
          opacity: 0.4;
        }

        .search-pill-file {
          font-weight: 600;
          color: var(--text-primary);
        }

        .search-pill-shortcuts {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .search-pill-shortcuts kbd {
          font-family: var(--font-mono);
          font-size: 9.5px;
          padding: 1px 5px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-muted);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </header>
  )
}

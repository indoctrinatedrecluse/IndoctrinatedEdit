import React, { useEffect, useState } from 'react'
import { FolderOpen, Bell, Crown, Sparkles } from 'lucide-react'
import { AppIcon } from '../Brand/AppIcon'
import { WindowControls } from './WindowControls'
import { MenuBar, MenuActionHandlers } from '../MenuBar/MenuBar'
import { licenseService, LicenseInfo } from '../../services/licenseService'

interface WindowFrameProps {
  activeFileName?: string
  workspaceName?: string
  onCommandPaletteToggle?: () => void
  menuHandlers?: MenuActionHandlers
  unreadNotificationsCount?: number
  onNotificationToggle?: () => void
}

export const WindowFrame: React.FC<WindowFrameProps> = ({
  activeFileName = 'welcome.ts',
  workspaceName = 'IndoctrinatedEdit',
  onCommandPaletteToggle,
  menuHandlers,
  unreadNotificationsCount = 0,
  onNotificationToggle,
}) => {
  const [isMaximized, setIsMaximized] = useState(false)
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null)

  useEffect(() => {
    licenseService.getInfo().then(setLicenseInfo)
    return licenseService.subscribe((info) => {
      setLicenseInfo(info)
    })
  }, [])

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
    <header className="window-frame">
      {/* Left branding badge & Top Menus */}
      <div className="window-frame-left window-no-drag">
        <div className="app-brand-badge glass-pill">
          <AppIcon size={18} />
          <span className="app-title">IndoctrinatedEdit</span>
          {licenseInfo?.type === 'ADM' && (
            <span className="app-tag app-tag-adm" title="Administrator Edition (Lifetime Master License)">
              <Crown size={9} className="tag-crown-icon" />
              <span>ADMIN</span>
              <Sparkles size={8} className="tag-sparkle-icon" />
            </span>
          )}
          {licenseInfo?.type === 'DEV' && (
            <span className="app-tag app-tag-dev" title="Developer Pro Edition">
              DEV PRO
            </span>
          )}
          {licenseInfo?.type === 'USER' && (
            <span className="app-tag app-tag-pro" title="Pro Edition">
              PRO
            </span>
          )}
          {(!licenseInfo || licenseInfo.type === 'TRIAL') && (
            <span
              className={`app-tag app-tag-trial ${licenseInfo?.status === 'expired' ? 'is-expired' : ''}`}
              title={
                licenseInfo?.status === 'expired'
                  ? 'Trial License (Expired)'
                  : `Trial Edition (${licenseInfo?.trialDaysRemaining ?? 30} days remaining)`
              }
            >
              {licenseInfo?.status === 'expired' ? 'EXPIRED' : 'TRIAL'}
            </span>
          )}
        </div>
        {menuHandlers && <MenuBar handlers={menuHandlers} />}
      </div>

      {/* Draggable spacer between left badge and center search */}
      <div
        className="window-title-drag-spacer window-drag-region"
        onDoubleClick={handleMaximize}
      />

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

      {/* Draggable spacer between center search and right window controls */}
      <div
        className="window-title-drag-spacer window-drag-region"
        onDoubleClick={handleMaximize}
      />

      {/* Right custom Liquid Glass window control capsules & Notification Bell */}
      <div className="window-frame-right window-no-drag">
        <button
          className={`notif-bell-btn glass-pill ${unreadNotificationsCount > 0 ? 'has-unread' : ''}`}
          onClick={onNotificationToggle}
          title={`Notifications (${unreadNotificationsCount} unread)`}
          aria-label="Toggle Notifications"
        >
          <Bell size={13} className="bell-icon" />
          {unreadNotificationsCount > 0 && (
            <span className="notif-badge">{unreadNotificationsCount}</span>
          )}
        </button>

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
          -webkit-app-region: no-drag;
          user-select: none;
        }

        .window-title-drag-spacer {
          flex: 1;
          height: 100%;
          min-width: 24px;
          -webkit-app-region: drag !important;
          cursor: default;
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

        .notif-bell-btn {
          height: 26px;
          padding: 0 8px;
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
          position: relative;
        }

        .notif-bell-btn:hover {
          color: var(--text-primary);
          border-color: rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.1);
        }

        .notif-bell-btn.has-unread {
          color: #64D2FF;
          border-color: rgba(100, 210, 255, 0.35);
          background: rgba(10, 132, 255, 0.12);
        }

        .notif-badge {
          font-family: var(--font-mono);
          font-size: 9.5px;
          font-weight: 700;
          padding: 0 4px;
          border-radius: 999px;
          background: #FF375F;
          color: #FFF;
          line-height: 14px;
          box-shadow: 0 0 8px rgba(255, 55, 95, 0.5);
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
          font-size: 8.5px;
          font-weight: 800;
          letter-spacing: 0.6px;
          padding: 1px 5px;
          border-radius: 3px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          line-height: 12px;
          color: #FFF;
        }

        .app-tag-adm {
          background: linear-gradient(135deg, #FFD700 0%, #FF9500 30%, #FF2D55 70%, #AF52DE 100%);
          background-size: 200% 200%;
          animation: adminTitleShimmer 3.5s ease infinite;
          border: 1px solid rgba(255, 235, 100, 0.75);
          box-shadow: 0 0 10px rgba(255, 170, 0, 0.55), 0 0 16px rgba(175, 82, 222, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.6);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
        }

        .tag-crown-icon {
          color: #FFF275;
          filter: drop-shadow(0 0 3px #FFD700);
          animation: crownWiggle 2s ease-in-out infinite alternate;
        }

        .tag-sparkle-icon {
          color: #FFFFFF;
          filter: drop-shadow(0 0 3px #FFF);
          animation: sparkleGlint 1.6s ease-in-out infinite alternate;
        }

        @keyframes adminTitleShimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes crownWiggle {
          0% { transform: translateY(0px) rotate(0deg); }
          100% { transform: translateY(-1px) rotate(-4deg); }
        }

        @keyframes sparkleGlint {
          0% { transform: scale(0.85); opacity: 0.75; }
          100% { transform: scale(1.15); opacity: 1; }
        }

        .app-tag-dev {
          background: linear-gradient(135deg, #BF5AF2 0%, #5E5CE6 100%);
          border: 1px solid rgba(191, 90, 242, 0.45);
          box-shadow: 0 0 8px rgba(191, 90, 242, 0.35);
        }

        .app-tag-pro {
          background: linear-gradient(135deg, #0A84FF 0%, #64D2FF 100%);
          border: 1px solid rgba(100, 210, 255, 0.45);
          box-shadow: 0 0 8px rgba(10, 132, 255, 0.35);
        }

        .app-tag-trial {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: var(--text-secondary);
        }

        .app-tag-trial.is-expired {
          background: rgba(255, 69, 58, 0.22);
          border: 1px solid rgba(255, 69, 58, 0.55);
          color: #FF6961;
          box-shadow: 0 0 8px rgba(255, 69, 58, 0.4);
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

import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  FileCode,
  Plus,
  Play,
  ChevronDown,
  Sliders,
  Terminal,
  Bug,
  Columns2,
  Rows2,
  Grid2X2,
} from 'lucide-react'
import { runService } from '../../services/runService'

export interface TabItem {
  id: string
  name: string
  language: string
  isDirty?: boolean
}

interface TabBarProps {
  tabs: TabItem[]
  activeTabId: string
  onSelectTab: (id: string) => void
  onCloseTab: (id: string, e: React.MouseEvent) => void
  onNewTab?: () => void
  onRunActiveFile?: () => void
  onRunWithArgs?: () => void
  onConfigureRun?: () => void
  onStartDebugging?: () => void
  onSplitVertical?: () => void
  onSplitHorizontal?: () => void
  onSplitGrid2x2?: () => void
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onRunActiveFile,
  onRunWithArgs,
  onConfigureRun,
  onStartDebugging,
  onSplitVertical,
  onSplitHorizontal,
  onSplitGrid2x2,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const activeTab = tabs.find((t) => t.id === activeTabId)

  // Find active profile info
  const activeProfile = activeTab ? runService.getProfileForLanguage(activeTab.language) : null

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="tab-bar">
      {/* Scrollable Tabs List */}
      <div className="tab-scroll-container">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          return (
            <div
              key={tab.id}
              className={`tab-item glass-interactive ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(tab.id)}
            >
              <FileCode size={13} className="tab-icon" />
              <span className="tab-title">{tab.name}</span>
              {tab.isDirty && <div className="dirty-bullet" title="Unsaved changes" />}
              <button
                className="tab-close-btn"
                onClick={(e) => onCloseTab(tab.id, e)}
                title="Close Tab (Ctrl+W)"
              >
                <X size={11} />
              </button>
              {isActive && <div className="active-tab-glow" />}
            </div>
          )
        })}

        {onNewTab && (
          <button
            className="new-tab-btn glass-interactive"
            onClick={onNewTab}
            title="New Untitled File (Ctrl+N)"
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      {/* Right-Aligned Editor Actions & Run Toolbar */}
      {activeTab && (
        <div className="tab-actions-bar" ref={dropdownRef}>
          {/* Split Editor Panes Quick Action Buttons */}
          <div className="tab-split-controls-group">
            <button
              className="tab-split-btn glass-interactive"
              onClick={onSplitVertical}
              title="Split Editor Right (Ctrl+\)"
            >
              <Columns2 size={13} />
            </button>
            <button
              className="tab-split-btn glass-interactive"
              onClick={onSplitHorizontal}
              title="Split Editor Down (Ctrl+K Ctrl+\)"
            >
              <Rows2 size={13} />
            </button>
            <button
              className="tab-split-btn glass-interactive"
              onClick={onSplitGrid2x2}
              title="Split Editor 2x2 Grid"
            >
              <Grid2X2 size={13} />
            </button>
          </div>

          {/* Quick Profile Tag */}
          {activeProfile && (
            <div
              className="quick-runner-badge glass-interactive"
              onClick={onConfigureRun}
              title={`Active Runner: ${activeProfile.name} (Click to configure)`}
            >
              <span className="runner-dot" />
              <span className="runner-label">{activeProfile.name.split(':')[0]}</span>
            </div>
          )}

          {/* Run Split Button Group */}
          <div className="run-split-group">
            <button
              className="run-main-btn glass-interactive"
              onClick={onRunActiveFile}
              title={`Run ${activeTab.name} in Terminal (Ctrl+F5)`}
            >
              <Play size={12} className="run-play-icon" fill="currentColor" />
              <span className="run-btn-text">Run</span>
            </button>

            <button
              className={`run-chevron-btn glass-interactive ${isDropdownOpen ? 'active' : ''}`}
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              title="More Run & Debug Options"
            >
              <ChevronDown size={11} />
            </button>

            {/* Run Actions Dropdown Menu */}
            {isDropdownOpen && (
              <div className="run-dropdown-menu glass-panel">
                <div className="dropdown-header">
                  <span className="dropdown-title">RUN & EXECUTION</span>
                </div>

                <button
                  className="dropdown-item"
                  onClick={() => {
                    setIsDropdownOpen(false)
                    onRunActiveFile?.()
                  }}
                >
                  <Play size={13} className="item-icon green-icon" fill="currentColor" />
                  <div className="item-content">
                    <span className="item-label">Run Active File</span>
                    <span className="item-desc">Execute in integrated terminal</span>
                  </div>
                  <span className="item-shortcut">Ctrl+F5</span>
                </button>

                <button
                  className="dropdown-item"
                  onClick={() => {
                    setIsDropdownOpen(false)
                    onRunWithArgs?.()
                  }}
                >
                  <Terminal size={13} className="item-icon cyan-icon" />
                  <div className="item-content">
                    <span className="item-label">Run with Arguments...</span>
                    <span className="item-desc">Pass custom CLI flags & env</span>
                  </div>
                  <span className="item-shortcut">Ctrl+Shift+F5</span>
                </button>

                {onStartDebugging && (
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setIsDropdownOpen(false)
                      onStartDebugging()
                    }}
                  >
                    <Bug size={13} className="item-icon amber-icon" />
                    <div className="item-content">
                      <span className="item-label">Start Debugging</span>
                      <span className="item-desc">Launch debug session</span>
                    </div>
                    <span className="item-shortcut">F5</span>
                  </button>
                )}

                <div className="dropdown-divider" />

                <button
                  className="dropdown-item"
                  onClick={() => {
                    setIsDropdownOpen(false)
                    onConfigureRun?.()
                  }}
                >
                  <Sliders size={13} className="item-icon purple-icon" />
                  <div className="item-content">
                    <span className="item-label">Configure Run Profiles...</span>
                    <span className="item-desc">Custom compilers, paths & tasks</span>
                  </div>
                  <span className="item-shortcut">Ctrl+Alt+R</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .tab-bar {
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(10, 14, 24, 0.45);
          border-bottom: var(--specular-border-subtle);
          padding: 0 6px;
          position: relative;
          user-select: none;
        }

        .tab-scroll-container {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 4px;
          height: 100%;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .tab-scroll-container::-webkit-scrollbar {
          display: none;
        }

        .tab-item {
          position: relative;
          height: 28px;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 10px 0 12px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          color: var(--text-secondary);
          border: 1px solid transparent;
          background: rgba(255, 255, 255, 0.02);
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          flex-shrink: 0;
        }

        .tab-item:hover {
          background: var(--glass-bg-hover);
          color: var(--text-primary);
        }

        .tab-item.active {
          background: rgba(255, 255, 255, 0.09);
          color: #FFF;
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .active-tab-glow {
          position: absolute;
          bottom: -1px;
          left: 12px;
          right: 12px;
          height: 2px;
          border-radius: 999px;
          background: var(--accent-primary);
          box-shadow: 0 0 10px var(--accent-primary);
        }

        .tab-icon {
          color: var(--accent-cyan);
          flex-shrink: 0;
        }

        .tab-title {
          font-weight: 500;
          white-space: nowrap;
        }

        .dirty-bullet {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent-primary);
          box-shadow: 0 0 6px var(--accent-primary);
          flex-shrink: 0;
        }

        .tab-close-btn {
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-xs);
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          margin-left: 2px;
          transition: all 0.15s ease;
        }

        .tab-close-btn:hover {
          background: rgba(255, 255, 255, 0.18);
          color: var(--text-primary);
        }

        .new-tab-btn {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: var(--text-muted);
          border-radius: var(--radius-xs);
          cursor: pointer;
          margin-left: 2px;
          flex-shrink: 0;
        }

        .new-tab-btn:hover {
          background: var(--glass-bg-hover);
          color: var(--text-primary);
        }

        /* Right Actions Toolbar */
        .tab-actions-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-left: 12px;
          position: relative;
          z-index: 10;
        }

        .quick-runner-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: var(--radius-xs);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 11px;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .quick-runner-badge:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .runner-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #30D158;
          box-shadow: 0 0 6px rgba(48, 209, 88, 0.8);
        }

        .runner-label {
          font-weight: 500;
        }

        .run-split-group {
          display: flex;
          align-items: center;
          background: rgba(48, 209, 88, 0.12);
          border: 1px solid rgba(48, 209, 88, 0.3);
          border-radius: var(--radius-sm);
          overflow: visible;
          position: relative;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          transition: all 0.15s ease;
        }

        .run-split-group:hover {
          background: rgba(48, 209, 88, 0.2);
          border-color: rgba(48, 209, 88, 0.5);
          box-shadow: 0 0 12px rgba(48, 209, 88, 0.25);
        }

        .run-main-btn {
          height: 25px;
          padding: 0 9px;
          display: flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          border: none;
          color: #30D158;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .run-main-btn:hover {
          color: #FFF;
        }

        .run-play-icon {
          filter: drop-shadow(0 0 4px rgba(48, 209, 88, 0.6));
        }

        .run-btn-text {
          letter-spacing: 0.3px;
        }

        .run-chevron-btn {
          height: 25px;
          width: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-left: 1px solid rgba(48, 209, 88, 0.25);
          color: #30D158;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .run-chevron-btn:hover, .run-chevron-btn.active {
          background: rgba(48, 209, 88, 0.25);
          color: #FFF;
        }

        /* Dropdown Menu */
        .run-dropdown-menu {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          width: 280px;
          padding: 6px;
          border-radius: var(--radius-md);
          background: rgba(14, 18, 28, 0.94);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: var(--specular-border);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.15);
          z-index: 1020;
          display: flex;
          flex-direction: column;
          gap: 2px;
          animation: dropdownFadeIn 0.12s ease-out;
        }

        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .dropdown-header {
          padding: 4px 8px;
        }

        .dropdown-title {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.6px;
          color: var(--text-muted);
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: var(--radius-sm);
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          text-align: left;
          transition: all 0.15s ease;
        }

        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.07);
          color: #FFF;
        }

        .item-icon {
          flex-shrink: 0;
        }

        .green-icon {
          color: #30D158;
        }

        .cyan-icon {
          color: var(--accent-cyan);
        }

        .amber-icon {
          color: #FFD60A;
        }

        .purple-icon {
          color: #BF5AF2;
        }

        .item-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .item-label {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .item-desc {
          font-size: 10px;
          color: var(--text-muted);
        }

        .item-shortcut {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .dropdown-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 4px 6px;
        }

        .tab-split-controls-group {
          display: flex;
          align-items: center;
          gap: 2px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          padding: 2px;
          margin-right: 6px;
        }

        .tab-split-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px 5px;
          border-radius: 4px;
          transition: all 0.15s ease;
        }

        .tab-split-btn:hover {
          color: #fff;
          background: rgba(191, 90, 242, 0.2);
        }
      `}</style>
    </div>
  )
}

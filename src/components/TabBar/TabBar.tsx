import React from 'react'
import { X, FileCode, Plus } from 'lucide-react'

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
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}) => {
  return (
    <div className="tab-bar">
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

      <style>{`
        .tab-bar {
          height: 36px;
          display: flex;
          align-items: center;
          background: rgba(10, 14, 24, 0.45);
          border-bottom: var(--specular-border-subtle);
          padding: 0 6px;
          overflow-x: auto;
          position: relative;
        }

        .tab-scroll-container {
          display: flex;
          align-items: center;
          gap: 4px;
          height: 100%;
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
        }

        .new-tab-btn:hover {
          background: var(--glass-bg-hover);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  )
}

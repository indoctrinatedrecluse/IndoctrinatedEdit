import React from 'react'
import { X, FileCode } from 'lucide-react'

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
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
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
              {tab.isDirty && <div className="dirty-bullet" />}
              <button
                className="tab-close-btn"
                onClick={(e) => onCloseTab(tab.id, e)}
                title="Close Tab (Ctrl+W)"
              >
                <X size={11} />
              </button>
            </div>
          )
        })}
      </div>

      <style>{`
        .tab-bar {
          height: 34px;
          display: flex;
          align-items: center;
          background: rgba(10, 14, 24, 0.45);
          border-bottom: var(--specular-border-subtle);
          padding: 0 4px;
          overflow-x: auto;
        }

        .tab-scroll-container {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 100%;
        }

        .tab-item {
          height: 28px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 10px;
          border-radius: var(--radius-sm);
          font-size: 11.5px;
          color: var(--text-secondary);
          border: 1px solid transparent;
          cursor: pointer;
        }

        .tab-item:hover {
          background: var(--glass-bg-hover);
          color: var(--text-primary);
        }

        .tab-item.active {
          background: rgba(255, 255, 255, 0.08);
          color: #FFF;
          border: var(--specular-border);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }

        .tab-icon {
          color: var(--accent-cyan);
        }

        .dirty-bullet {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--accent-primary);
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
        }

        .tab-close-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  )
}

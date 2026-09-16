import React from 'react'
import { Files, GitBranch, Search, Blocks, Palette, Settings, Bot, Database } from 'lucide-react'

export type ActivityView = 'files' | 'git' | 'search' | 'extensions' | 'themes' | 'settings'

interface ActivityBarProps {
  activeView: ActivityView | null
  onSelectView: (view: ActivityView) => void
  gitChangesCount?: number
  isAiOpen?: boolean
  onToggleAi?: () => void
  isDatabaseOpen?: boolean
  onToggleDatabase?: () => void
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeView,
  onSelectView,
  gitChangesCount = 0,
  isAiOpen = false,
  onToggleAi,
  isDatabaseOpen = false,
  onToggleDatabase,
}) => {
  const topItems: { id: ActivityView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'files', label: 'Explorer (Ctrl+Shift+E)', icon: <Files size={18} /> },
    { id: 'git', label: 'Source Control & Git Graph (Ctrl+Shift+G)', icon: <GitBranch size={18} />, badge: gitChangesCount },
    { id: 'search', label: 'Search in Files (Ctrl+Shift+F)', icon: <Search size={18} /> },
    { id: 'extensions', label: 'Extensions & Microservices', icon: <Blocks size={18} /> },
    { id: 'themes', label: 'Liquid Glass Themes', icon: <Palette size={18} /> },
  ]

  return (
    <aside className="activity-bar">
      <div className="activity-bar-group top">
        {topItems.map((item) => {
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              className={`activity-btn glass-interactive ${isActive ? 'active' : ''}`}
              onClick={() => onSelectView(item.id)}
              title={item.label}
            >
              {item.icon}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="activity-badge">{item.badge}</span>
              )}
              {isActive && <div className="active-indicator" />}
            </button>
          )
        })}

        {onToggleDatabase && (
          <button
            className={`activity-btn glass-interactive db-bar-btn ${isDatabaseOpen ? 'active' : ''}`}
            onClick={onToggleDatabase}
            title="Database Studio & SQL Query Runner"
          >
            <Database size={18} />
            {isDatabaseOpen && <div className="active-indicator" />}
          </button>
        )}

        {onToggleAi && (
          <button
            className={`activity-btn glass-interactive ai-bar-btn ${isAiOpen ? 'active' : ''}`}
            onClick={onToggleAi}
            title="AI Multi-Model Assistant (Ctrl+Alt+A)"
          >
            <Bot size={18} />
            {isAiOpen && <div className="active-indicator" />}
          </button>
        )}
      </div>

      <div className="activity-bar-group bottom">
        <button
          className={`activity-btn glass-interactive ${activeView === 'settings' ? 'active' : ''}`}
          onClick={() => onSelectView('settings')}
          title="Settings (Ctrl+,)"
        >
          <Settings size={18} />
          {activeView === 'settings' && <div className="active-indicator" />}
        </button>
      </div>

      <style>{`
        .activity-bar {
          width: 48px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          background: rgba(10, 14, 24, 0.65);
          border-right: var(--specular-border-subtle);
          backdrop-filter: var(--glass-blur-sm);
          z-index: 50;
        }

        .activity-bar-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          width: 100%;
        }

        .activity-btn {
          position: relative;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .activity-btn:hover {
          color: var(--text-primary);
          background: var(--glass-bg-hover);
        }

        .activity-btn.active {
          color: #FFF;
          background: var(--glass-bg-active);
          box-shadow: 0 0 16px rgba(10, 132, 255, 0.35);
        }

        .activity-badge {
          position: absolute;
          top: 3px;
          right: 3px;
          font-size: 9px;
          font-weight: 700;
          min-width: 14px;
          height: 14px;
          padding: 0 3px;
          border-radius: 999px;
          background: var(--accent-primary);
          color: #FFF;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 8px var(--accent-primary);
        }

        .active-indicator {
          position: absolute;
          left: -6px;
          top: 8px;
          bottom: 8px;
          width: 3px;
          border-radius: 0 4px 4px 0;
          background: var(--accent-primary);
          box-shadow: 0 0 8px var(--accent-primary);
        }
      `}</style>
    </aside>
  )
}

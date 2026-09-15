import React from 'react'
import { GitBranch, AlertCircle, Check, Palette, Sparkles } from 'lucide-react'

interface StatusBarProps {
  line: number
  column: number
  language: string
  themeName: string
  encoding?: string
  indentation?: string
  onThemeClick?: () => void
}

export const StatusBar: React.FC<StatusBarProps> = ({
  line,
  column,
  language,
  themeName,
  encoding = 'UTF-8',
  indentation = 'Spaces: 2',
  onThemeClick,
}) => {
  return (
    <footer className="status-bar">
      {/* Left items */}
      <div className="status-group left">
        <div className="status-item branch" title="Git Branch: master">
          <GitBranch size={12} />
          <span>master</span>
        </div>
        <div className="status-item diagnostics" title="No syntax errors found">
          <Check size={12} className="check-icon" />
          <span>0 errors</span>
          <AlertCircle size={12} className="warning-icon" />
          <span>0 warnings</span>
        </div>
        <div className="status-item extension-pulse" title="Extension Microservices Running">
          <Sparkles size={11} className="pulse-icon" />
          <span>Microservices: Active</span>
        </div>
      </div>

      {/* Right items */}
      <div className="status-group right">
        <div className="status-item">
          <span>Ln {line}, Col {column}</span>
        </div>
        <div className="status-item">
          <span>{indentation}</span>
        </div>
        <div className="status-item">
          <span>{encoding}</span>
        </div>
        <div className="status-item lang">
          <span>{language}</span>
        </div>
        <button
          className="status-item theme-btn glass-interactive"
          onClick={onThemeClick}
          title="Switch Theme"
        >
          <Palette size={12} />
          <span>{themeName}</span>
        </button>
      </div>

      <style>{`
        .status-bar {
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 10px;
          background: rgba(10, 14, 24, 0.72);
          border-top: var(--specular-border-subtle);
          font-size: 11px;
          color: var(--text-secondary);
          z-index: 50;
        }

        .status-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .status-item.branch {
          color: var(--text-primary);
          font-weight: 500;
        }

        .diagnostics {
          gap: 8px;
        }

        .check-icon {
          color: var(--accent-green);
        }

        .warning-icon {
          color: var(--accent-amber);
        }

        .pulse-icon {
          color: var(--accent-cyan);
          animation: pulse 2s infinite ease-in-out;
        }

        .theme-btn {
          border: none;
          background: transparent;
          color: var(--accent-cyan);
          padding: 2px 6px;
          border-radius: var(--radius-xs);
        }

        .theme-btn:hover {
          background: var(--glass-bg-hover);
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.1); filter: drop-shadow(0 0 6px rgba(100, 210, 255, 0.8)); }
        }
      `}</style>
    </footer>
  )
}

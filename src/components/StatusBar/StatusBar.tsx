import React from 'react'
import { GitBranch, AlertCircle, Check, Palette, Sparkles, Terminal } from 'lucide-react'

interface StatusBarProps {
  line: number
  column: number
  language: string
  themeName: string
  encoding?: string
  indentation?: string
  gitBranch?: string
  onThemeClick?: () => void
  onGitClick?: () => void
}

export const StatusBar: React.FC<StatusBarProps> = ({
  line,
  column,
  language,
  themeName,
  encoding = 'UTF-8',
  indentation = 'Spaces: 2',
  gitBranch = 'master',
  onThemeClick,
  onGitClick,
}) => {
  return (
    <footer className="status-bar">
      {/* Left segmented glass chips */}
      <div className="status-group left">
        <button
          className="status-chip branch-chip glass-interactive"
          onClick={onGitClick}
          title={`Git Branch: ${gitBranch} (Click to open Git Graph)`}
        >
          <GitBranch size={12} className="branch-icon" />
          <span>{gitBranch}</span>
        </button>

        <div className="status-chip diagnostics-chip" title="No syntax errors found">
          <Check size={11} className="check-icon" />
          <span className="diag-count">0</span>
          <AlertCircle size={11} className="warning-icon" />
          <span className="diag-count">0</span>
        </div>

        <div className="status-chip microservice-chip" title="Extension Microservices Running">
          <span className="pulsing-orb" />
          <Sparkles size={11} className="pulse-icon" />
          <span>Microservices: Active</span>
        </div>
      </div>

      {/* Right segmented glass chips */}
      <div className="status-group right">
        <div className="status-chip position-chip" title="Cursor Position">
          <span>Ln {line}, Col {column}</span>
        </div>

        <div className="status-chip encoding-chip" title="Indentation & Encoding">
          <span>{indentation}</span>
          <span className="separator">•</span>
          <span>{encoding}</span>
        </div>

        <div className="status-chip lang-chip" title="Language Grammar">
          <Terminal size={11} className="lang-icon" />
          <span>{language}</span>
        </div>

        <button
          className="status-chip theme-chip glass-interactive"
          onClick={onThemeClick}
          title="Switch Liquid Glass Theme"
        >
          <Palette size={12} className="theme-icon" />
          <span>{themeName}</span>
        </button>
      </div>

      <style>{`
        .status-bar {
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 10px;
          background: rgba(8, 11, 20, 0.78);
          border-top: var(--specular-border-subtle);
          font-size: 11px;
          color: var(--text-secondary);
          z-index: 50;
          position: relative;
        }

        .status-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 8px;
          border-radius: var(--radius-xs);
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: var(--text-secondary);
          font-size: 11px;
          height: 20px;
        }

        .status-chip.glass-interactive {
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.15s ease;
        }

        .status-chip.glass-interactive:hover {
          background: var(--glass-bg-hover);
          color: var(--text-primary);
          border-color: rgba(255, 255, 255, 0.18);
        }

        .branch-chip {
          color: var(--text-primary);
          font-weight: 600;
        }

        .branch-icon {
          color: var(--accent-cyan);
        }

        .diagnostics-chip {
          gap: 5px;
        }

        .diag-count {
          font-size: 10.5px;
          color: var(--text-muted);
        }

        .check-icon {
          color: var(--accent-green);
        }

        .warning-icon {
          color: var(--accent-amber);
        }

        .microservice-chip {
          color: var(--accent-cyan);
        }

        .pulsing-orb {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--accent-cyan);
          box-shadow: 0 0 8px var(--accent-cyan);
          animation: orbPulse 2s infinite ease-in-out;
        }

        .pulse-icon {
          color: var(--accent-cyan);
        }

        .separator {
          color: var(--text-muted);
          opacity: 0.4;
        }

        .lang-chip {
          font-weight: 500;
          color: var(--text-primary);
        }

        .lang-icon {
          color: var(--accent-primary);
        }

        .theme-chip {
          color: var(--accent-primary);
          font-weight: 500;
          background: rgba(10, 132, 255, 0.1);
          border-color: rgba(10, 132, 255, 0.25);
        }

        .theme-chip:hover {
          box-shadow: 0 0 12px rgba(10, 132, 255, 0.35);
        }

        .theme-icon {
          color: var(--accent-primary);
        }

        @keyframes orbPulse {
          0%, 100% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.3); opacity: 1; filter: drop-shadow(0 0 6px rgba(0, 240, 255, 0.8)); }
        }
      `}</style>
    </footer>
  )
}

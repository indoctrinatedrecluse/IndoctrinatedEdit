import React, { useEffect, useState } from 'react'
import { GitBranch, AlertCircle, Check, Palette, Sparkles, Terminal, ArrowUpCircle } from 'lucide-react'
import { AntigravityIcon } from '../Brand/AntigravityIcon'
import { antigravityAcpService } from '../../services/antigravityAcpService'
import { extensionRegistry } from '../../extensions/extensionRegistry'
import { McpService } from '../../services/mcpService'
import { formatterService } from '../../services/formatterService'

interface StatusBarProps {
  line: number
  column: number
  language: string
  themeName: string
  encoding?: string
  indentation?: string
  gitBranch?: string
  errorCount?: number
  warningCount?: number
  isUpdateAvailable?: boolean
  updateVersion?: string
  antigravityUser?: string
  onAntigravityClick?: () => void
  onUpdateClick?: () => void
  onThemeClick?: () => void
  onGitClick?: () => void
  onTerminalClick?: () => void
  onProblemsClick?: () => void
}

export const StatusBar: React.FC<StatusBarProps> = ({
  line,
  column,
  language,
  themeName,
  encoding = 'UTF-8',
  indentation = 'Spaces: 2',
  gitBranch = 'master',
  errorCount = 0,
  warningCount = 0,
  isUpdateAvailable = false,
  updateVersion,
  antigravityUser,
  onAntigravityClick,
  onUpdateClick,
  onThemeClick,
  onGitClick,
  onTerminalClick,
  onProblemsClick,
}) => {
  const [acpState, setAcpState] = useState(() => antigravityAcpService.getStatus())
  const [activeExtCount, setActiveExtCount] = useState(
    () => extensionRegistry.getAll().filter((e) => e.status !== 'Disabled').length
  )
  const [mcpConnectedCount, setMcpConnectedCount] = useState(
    () => McpService.getServers().filter((s) => s.enabled && s.status === 'connected').length
  )
  const [liveIndent, setLiveIndent] = useState(() => {
    const opts = formatterService.getOptions()
    return opts.useTabs ? `Tabs: ${opts.tabWidth}` : `Spaces: ${opts.tabWidth}`
  })

  useEffect(() => {
    const unsubAcp = antigravityAcpService.onStatusChanged((st) => setAcpState(st))
    const unsubExt = extensionRegistry.subscribe(() => {
      setActiveExtCount(extensionRegistry.getAll().filter((e) => e.status !== 'Disabled').length)
    })
    const unsubMcp = McpService.onServersChanged(() => {
      setMcpConnectedCount(McpService.getServers().filter((s) => s.enabled && s.status === 'connected').length)
    })
    const syncIndent = () => {
      const opts = formatterService.getOptions()
      setLiveIndent(opts.useTabs ? `Tabs: ${opts.tabWidth}` : `Spaces: ${opts.tabWidth}`)
    }
    const unsubFormatter = formatterService.subscribe(syncIndent)
    window.addEventListener('storage', syncIndent)
    return () => {
      unsubAcp()
      unsubExt()
      unsubMcp()
      unsubFormatter()
      window.removeEventListener('storage', syncIndent)
    }
  }, [])

  const acpLabel = antigravityUser
    ? `Antigravity: ${antigravityUser}`
    : acpState.state === 'ready'
    ? `Antigravity: ${acpState.agentInfo?.name || 'Connected'}`
    : acpState.state === 'connecting' || acpState.state === 'detecting' || acpState.state === 'authenticating'
    ? 'Antigravity: Connecting...'
    : 'Antigravity: Disconnected'

  const effectiveIndent = indentation && indentation !== 'Spaces: 2' ? indentation : liveIndent

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

        <button
          className="status-chip antigravity-chip glass-interactive"
          onClick={onAntigravityClick}
          title={`Google Antigravity ACP (${acpState.state}) — Click to open Studio`}
        >
          <AntigravityIcon size={12} className="antigravity-status-icon" />
          <span className="antigravity-status-label">{acpLabel}</span>
        </button>

        <button
          className="status-chip diagnostics-chip glass-interactive"
          onClick={onProblemsClick}
          title={`Problems Panel: ${errorCount} Errors, ${warningCount} Warnings`}
        >
          {errorCount === 0 && warningCount === 0 ? (
            <Check size={11} className="check-icon" />
          ) : (
            <AlertCircle size={11} className={`warning-icon ${errorCount > 0 ? 'has-errors' : ''}`} />
          )}
          <span className="diag-count">{errorCount}</span>
          <span className="diag-count warning">{warningCount}</span>
        </button>

        <button
          className="status-chip terminal-toggle-chip glass-interactive"
          onClick={onTerminalClick}
          title="Toggle Integrated Terminal (Ctrl+`)"
        >
          <Terminal size={11} className="term-icon" />
          <span>Terminal</span>
        </button>

        <div
          className="status-chip microservice-chip"
          title={`${activeExtCount} active extensions · ${mcpConnectedCount} connected MCP servers`}
        >
          <span className="pulsing-orb" />
          <Sparkles size={11} className="pulse-icon" />
          <span>{activeExtCount} Ext · {mcpConnectedCount} MCP</span>
        </div>
      </div>

      {/* Right segmented glass chips */}
      <div className="status-group right">
        {isUpdateAvailable && (
          <button
            className="status-chip update-chip glass-interactive"
            onClick={onUpdateClick}
            title={`Software Update Available: v${updateVersion || 'Latest'} (Click to view)`}
          >
            <ArrowUpCircle size={12} className="text-cyan-400" />
            <span className="update-badge-text">Update v{updateVersion}</span>
          </button>
        )}

        <div className="status-chip position-chip" title="Cursor Position">
          <span>Ln {line}, Col {column}</span>
        </div>

        <div className="status-chip encoding-chip" title="Indentation & Encoding">
          <span>{effectiveIndent}</span>
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

        .antigravity-chip {
          background: rgba(100, 210, 255, 0.08) !important;
          border-color: rgba(100, 210, 255, 0.25) !important;
          color: #64D2FF !important;
          font-weight: 500;
        }

        .antigravity-chip:hover {
          background: rgba(100, 210, 255, 0.16) !important;
          border-color: rgba(100, 210, 255, 0.45) !important;
          box-shadow: 0 0 10px rgba(100, 210, 255, 0.3);
        }

        .update-chip {
          background: rgba(10, 132, 255, 0.15) !important;
          border-color: rgba(56, 189, 248, 0.4) !important;
          color: #38bdf8 !important;
          font-weight: 600;
          box-shadow: 0 0 10px rgba(10, 132, 255, 0.25);
        }

        .update-badge-text {
          font-family: monospace;
          font-size: 10px;
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

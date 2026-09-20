import React from 'react'
import {
  Files,
  GitBranch,
  Search,
  Blocks,
  Palette,
  Settings,
  Bot,
  Database,
  Globe,
  Bug,
  ShieldCheck,
  Eye,
  Container,
  Wifi,
  Package,
  Play,
  ShieldAlert,
  Zap,
  KeyRound,
  Server,
  Share2,
  Layers,
  Shapes,
  FlaskConical,
} from 'lucide-react'
import { AntigravityIcon } from '../Brand/AntigravityIcon'

export type ActivityView = 'files' | 'git' | 'search' | 'testing' | 'debug' | 'extensions' | 'themes' | 'settings'

interface ActivityBarProps {
  activeView: ActivityView | null
  onSelectView: (view: ActivityView) => void
  gitChangesCount?: number
  isAntigravityOpen?: boolean
  onToggleAntigravity?: () => void
  isAiOpen?: boolean
  onToggleAi?: () => void
  isDatabaseOpen?: boolean
  onToggleDatabase?: () => void
  isRestClientOpen?: boolean
  onToggleRestClient?: () => void
  isCryptoOpen?: boolean
  onToggleCrypto?: () => void
  isPreviewOpen?: boolean
  onTogglePreview?: () => void
  isDockerOpen?: boolean
  onToggleDocker?: () => void
  isSocketOpen?: boolean
  onToggleSocket?: () => void
  isRegexOpen?: boolean
  onToggleRegex?: () => void
  isPackagesOpen?: boolean
  onTogglePackages?: () => void
  isTasksOpen?: boolean
  onToggleTasks?: () => void
  isPortsOpen?: boolean
  onTogglePorts?: () => void
  isRedisOpen?: boolean
  onToggleRedis?: () => void
  isEnvOpen?: boolean
  onToggleEnv?: () => void
  isMockLabOpen?: boolean
  onToggleMockLab?: () => void
  isGraphQLOpen?: boolean
  onToggleGraphQL?: () => void
  isDiagramOpen?: boolean
  onToggleDiagram?: () => void
  isBundleOpen?: boolean
  onToggleBundle?: () => void
  isSvgOpen?: boolean
  onToggleSvg?: () => void
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeView,
  onSelectView,
  gitChangesCount = 0,
  isAntigravityOpen = false,
  onToggleAntigravity,
  isAiOpen = false,
  onToggleAi,
  isDatabaseOpen = false,
  onToggleDatabase,
  isRestClientOpen = false,
  onToggleRestClient,
  isCryptoOpen = false,
  onToggleCrypto,
  isPreviewOpen = false,
  onTogglePreview,
  isDockerOpen = false,
  onToggleDocker,
  isSocketOpen = false,
  onToggleSocket,
  isRegexOpen = false,
  onToggleRegex,
  isPackagesOpen = false,
  onTogglePackages,
  isTasksOpen = false,
  onToggleTasks,
  isPortsOpen = false,
  onTogglePorts,
  isRedisOpen = false,
  onToggleRedis,
  isEnvOpen = false,
  onToggleEnv,
  isMockLabOpen = false,
  onToggleMockLab,
  isGraphQLOpen = false,
  onToggleGraphQL,
  isDiagramOpen = false,
  onToggleDiagram,
  isBundleOpen = false,
  onToggleBundle,
  isSvgOpen = false,
  onToggleSvg,
}) => {
  const topItems: { id: ActivityView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'files', label: 'Explorer (Ctrl+Shift+E)', icon: <Files size={18} /> },
    { id: 'git', label: 'Source Control & Git Graph (Ctrl+Shift+G)', icon: <GitBranch size={18} />, badge: gitChangesCount },
    { id: 'search', label: 'Search in Files (Ctrl+Shift+F)', icon: <Search size={18} /> },
    { id: 'testing', label: 'Testing & Test Explorer (Ctrl+Shift+T)', icon: <FlaskConical size={18} /> },
    { id: 'debug', label: 'Run & Debug (Ctrl+Shift+D)', icon: <Bug size={18} /> },
    { id: 'extensions', label: 'Extensions & Microservices', icon: <Blocks size={18} /> },
    { id: 'themes', label: 'Liquid Glass Themes', icon: <Palette size={18} /> },
  ]

  return (
    <aside className="activity-bar">
      <div
        className="activity-bar-group top"
        onWheel={(e) => {
          e.currentTarget.scrollTop += e.deltaY
        }}
      >
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

        {onTogglePorts && (
          <button
            className={`activity-btn glass-interactive ${isPortsOpen ? 'active' : ''}`}
            onClick={onTogglePorts}
            title="Port & Process Sentinel (Ctrl+Alt+1)"
          >
            <ShieldAlert size={18} />
            {isPortsOpen && <div className="active-indicator" />}
          </button>
        )}

        {onToggleRedis && (
          <button
            className={`activity-btn glass-interactive ${isRedisOpen ? 'active' : ''}`}
            onClick={onToggleRedis}
            title="Redis & Key-Value Cache Studio (Ctrl+Alt+2)"
          >
            <Zap size={18} />
            {isRedisOpen && <div className="active-indicator" />}
          </button>
        )}

        {onToggleEnv && (
          <button
            className={`activity-btn glass-interactive ${isEnvOpen ? 'active' : ''}`}
            onClick={onToggleEnv}
            title="Env & Secret Vault Studio (Ctrl+Alt+3)"
          >
            <KeyRound size={18} />
            {isEnvOpen && <div className="active-indicator" />}
          </button>
        )}

        {onToggleMockLab && (
          <button
            className={`activity-btn glass-interactive ${isMockLabOpen ? 'active' : ''}`}
            onClick={onToggleMockLab}
            title="MockLab API Mock Server (Ctrl+Alt+4)"
          >
            <Server size={18} />
            {isMockLabOpen && <div className="active-indicator" />}
          </button>
        )}

        {onToggleGraphQL && (
          <button
            className={`activity-btn glass-interactive ${isGraphQLOpen ? 'active' : ''}`}
            onClick={onToggleGraphQL}
            title="GraphQL & gRPC Studio (Ctrl+Alt+5)"
          >
            <Globe size={18} />
            {isGraphQLOpen && <div className="active-indicator" />}
          </button>
        )}

        {onToggleDiagram && (
          <button
            className={`activity-btn glass-interactive ${isDiagramOpen ? 'active' : ''}`}
            onClick={onToggleDiagram}
            title="Architecture & Diagram Studio (Ctrl+Alt+6)"
          >
            <Share2 size={18} />
            {isDiagramOpen && <div className="active-indicator" />}
          </button>
        )}

        {onToggleBundle && (
          <button
            className={`activity-btn glass-interactive ${isBundleOpen ? 'active' : ''}`}
            onClick={onToggleBundle}
            title="Bundle & Dependency Analyzer (Ctrl+Alt+7)"
          >
            <Layers size={18} />
            {isBundleOpen && <div className="active-indicator" />}
          </button>
        )}

        {onToggleSvg && (
          <button
            className={`activity-btn glass-interactive ${isSvgOpen ? 'active' : ''}`}
            onClick={onToggleSvg}
            title="SVG & Asset Studio (Ctrl+Alt+8)"
          >
            <Shapes size={18} />
            {isSvgOpen && <div className="active-indicator" />}
          </button>
        )}

        {onToggleCrypto && (
          <button
            className={`activity-btn glass-interactive ${isCryptoOpen ? 'active' : ''}`}
            onClick={onToggleCrypto}
            title="Cryptography & DevTools Lab (Ctrl+Alt+C)"
          >
            <ShieldCheck size={18} />
            {isCryptoOpen && <div className="active-indicator" />}
          </button>
        )}

        {onTogglePreview && (
          <button
            className={`activity-btn glass-interactive ${isPreviewOpen ? 'active' : ''}`}
            onClick={onTogglePreview}
            title="Live Markdown, HTML & Mermaid Preview (Ctrl+Alt+V)"
          >
            <Eye size={18} />
            {isPreviewOpen && <div className="active-indicator" />}
          </button>
        )}

        {onToggleDocker && (
          <button
            className={`activity-btn glass-interactive ${isDockerOpen ? 'active' : ''}`}
            onClick={onToggleDocker}
            title="Docker & Container Studio (Ctrl+Alt+K)"
          >
            <Container size={18} />
            {isDockerOpen && <div className="active-indicator" />}
          </button>
        )}

        {onToggleSocket && (
          <button
            className={`activity-btn glass-interactive ${isSocketOpen ? 'active' : ''}`}
            onClick={onToggleSocket}
            title="WebSocket & Event Streams Workbench (Ctrl+Alt+W)"
          >
            <Wifi size={18} />
            {isSocketOpen && <div className="active-indicator" />}
          </button>
        )}

        {onToggleRegex && (
          <button
            className={`activity-btn glass-interactive ${isRegexOpen ? 'active' : ''}`}
            onClick={onToggleRegex}
            title="Visual Regex & Pattern Lab (Ctrl+Alt+X)"
          >
            <Search size={18} />
            {isRegexOpen && <div className="active-indicator" />}
          </button>
        )}

        {onTogglePackages && (
          <button
            className={`activity-btn glass-interactive ${isPackagesOpen ? 'active' : ''}`}
            onClick={onTogglePackages}
            title="Package Manager & Audit (Ctrl+Alt+P)"
          >
            <Package size={18} />
            {isPackagesOpen && <div className="active-indicator" />}
          </button>
        )}

        {onToggleTasks && (
          <button
            className={`activity-btn glass-interactive ${isTasksOpen ? 'active' : ''}`}
            onClick={onToggleTasks}
            title="Task Runner & Cron Studio (Ctrl+Alt+T)"
          >
            <Play size={18} />
            {isTasksOpen && <div className="active-indicator" />}
          </button>
        )}

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

        {onToggleRestClient && (
          <button
            className={`activity-btn glass-interactive rest-bar-btn ${isRestClientOpen ? 'active' : ''}`}
            onClick={onToggleRestClient}
            title="REST & GraphQL API Client (Ctrl+Alt+R)"
          >
            <Globe size={18} />
            {isRestClientOpen && <div className="active-indicator" />}
          </button>
        )}

        {onToggleAntigravity && (
          <button
            className={`activity-btn glass-interactive antigravity-bar-btn ${isAntigravityOpen ? 'active' : ''}`}
            onClick={onToggleAntigravity}
            title="Google Antigravity Studio (Personal Account & Python SDK)"
          >
            <AntigravityIcon size={20} className="antigravity-activity-icon" />
            {isAntigravityOpen && <div className="active-indicator" />}
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
          overflow: hidden;
          height: 100%;
        }

        .activity-bar-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          width: 100%;
        }

        .activity-bar-group.top {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding-bottom: 6px;
        }

        .activity-bar-group.top::-webkit-scrollbar {
          display: none;
        }

        .activity-bar-group.bottom {
          flex-shrink: 0;
          padding-top: 6px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .activity-btn {
          position: relative;
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
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

        .activity-btn.antigravity-bar-btn:hover {
          filter: drop-shadow(0 0 8px rgba(100, 210, 255, 0.5));
        }

        .activity-btn.antigravity-bar-btn.active {
          background: rgba(100, 210, 255, 0.15);
          box-shadow: 0 0 18px rgba(100, 210, 255, 0.45);
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

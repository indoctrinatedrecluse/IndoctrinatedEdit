import React, { useState, useEffect } from 'react'
import {
  Bot,
  Database,
  Globe,
  X,
  ShieldCheck,
  Eye,
  Container,
  Wifi,
  Search,
  Package,
  Play,
  GitCompare,
  Binary,
  Bookmark,
  Palette,
  ShieldAlert,
  Zap,
  KeyRound,
  Server,
  Share2,
  Layers,
  Shapes,
  FileCode2,
  BookOpen,
} from 'lucide-react'
import { AiChatPanel } from '../AiChat/AiChatPanel'
import { DatabaseStudio } from '../Database/DatabaseStudio'
import { RestClientView } from '../RestClient/RestClientView'
import { CryptoDevToolsView } from '../CryptoLab/CryptoDevToolsView'
import { LivePreviewView } from '../LivePreview/LivePreviewView'
import { DockerStudioView } from '../Docker/DockerStudioView'
import { WebSocketView } from '../WebSocket/WebSocketView'
import { RegexLabView } from '../RegexLab/RegexLabView'
import { PackageManagerView } from '../PackageManager/PackageManagerView'
import { TaskRunnerView } from '../TaskRunner/TaskRunnerView'
import { DiffStudioView } from '../DiffStudio/DiffStudioView'
import { HexInspectorView } from '../HexInspector/HexInspectorView'
import { SnippetVaultView } from '../SnippetVault/SnippetVaultView'
import { ColorStudioView } from '../ColorStudio/ColorStudioView'
import { PortSentinelView } from '../PortSentinel/PortSentinelView'
import { RedisStudioView } from '../RedisStudio/RedisStudioView'
import { EnvVaultView } from '../EnvVault/EnvVaultView'
import { MockLabView } from '../MockLab/MockLabView'
import { GraphQLStudioView } from '../GraphQLStudio/GraphQLStudioView'
import { DiagramStudioView } from '../DiagramStudio/DiagramStudioView'
import { BundleAnalyzerView } from '../BundleAnalyzer/BundleAnalyzerView'
import { SvgStudioView } from '../SvgStudio/SvgStudioView'
import { JsonStudioView } from '../JsonStudio/JsonStudioView'
import { AntigravityStudioView } from '../Antigravity/AntigravityStudioView'
import { RemoteProtocolStudioView } from '../RemoteProtocolStudio/RemoteProtocolStudioView'
import { JupyterStudioView } from '../Notebook/JupyterStudioView'
import { AntigravityIcon } from '../Brand/AntigravityIcon'
import { SelectionInfo } from '../Editor/EditorHost'
import { LockedExtensionView } from '../Common/LockedExtensionView'
import { licenseService, LicenseInfo } from '../../services/licenseService'
import { extensionRegistry } from '../../extensions/extensionRegistry'

export type RightDockTab =
  | 'jupyter'
  | 'remote'
  | 'antigravity'
  | 'ai'
  | 'database'
  | 'rest'
  | 'crypto'
  | 'json'
  | 'preview'
  | 'docker'
  | 'socket'
  | 'regex'
  | 'packages'
  | 'tasks'
  | 'diff'
  | 'hex'
  | 'snippets'
  | 'colors'
  | 'ports'
  | 'redis'
  | 'env'
  | 'mocklab'
  | 'graphql'
  | 'diagram'
  | 'bundle'
  | 'svg'

interface RightAuxiliaryPaneProps {
  isOpen: boolean
  activeTab: RightDockTab
  onSelectTab: (tab: RightDockTab) => void
  onClose: () => void
  onOpenLicense?: () => void
  onCreateNotebook?: (title: string, templateType?: string) => void
  // AI / Preview Panel Props
  activeFilePath?: string
  activeFileName?: string
  activeFileContent?: string
  currentSelection: SelectionInfo | null
  onInsertAtCursor?: (code: string) => void
  onReplaceSelection?: (code: string) => void
  onReplaceActiveFileContent?: (newContent: string) => void
  pendingAiPrompt?: { id: number; prompt: string; attachSelection?: boolean; attachFile?: boolean } | null
  onPendingAiPromptConsumed?: () => void
  workspaceRoot?: string
  openFiles?: Array<{ path: string; name: string; content?: string }>
  onOpenFile?: (filePath: string, line?: number, column?: number) => void
  onApplyFileEdit?: (filePath: string, newContent: string) => Promise<boolean>
}

export const RightAuxiliaryPane: React.FC<RightAuxiliaryPaneProps> = ({
  isOpen,
  activeTab,
  onSelectTab,
  onClose,
  onOpenLicense,
  onCreateNotebook,
  activeFilePath: _activeFilePath,
  activeFileName = 'untitled.ts',
  activeFileContent = '',
  currentSelection,
  onInsertAtCursor,
  onReplaceSelection,
  onReplaceActiveFileContent,
  pendingAiPrompt,
  onPendingAiPromptConsumed,
  workspaceRoot,
  openFiles,
  onOpenFile,
  onApplyFileEdit,
}) => {
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null)
  const [, setExtTick] = useState(0)

  useEffect(() => {
    licenseService.getInfo().then(setLicenseInfo)
    const unsubLic = licenseService.subscribe(setLicenseInfo)
    const unsubExt = extensionRegistry.subscribe(() => setExtTick((t) => t + 1))
    return () => {
      unsubLic()
      unsubExt()
    }
  }, [])

  const TAB_EXTENSION_MAP: Partial<Record<RightDockTab, string>> = {
    jupyter: 'indoctrinated.ext.jupyter-studio',
    remote: 'indoctrinated.ext.remote-protocol',
    antigravity: 'indoctrinated.ext.antigravity',
    database: 'indoctrinated.ext.database-studio',
    rest: 'indoctrinated.ext.rest-client',
    crypto: 'indoctrinated.ext.crypto-lab',
    json: 'indoctrinated.ext.json-studio',
    preview: 'indoctrinated.ext.live-preview',
    docker: 'indoctrinated.ext.docker',
    socket: 'indoctrinated.ext.websocket',
    regex: 'indoctrinated.ext.regex-lab',
    packages: 'indoctrinated.ext.package-manager',
    tasks: 'indoctrinated.ext.task-runner',
    diff: 'indoctrinated.ext.diff-studio',
    hex: 'indoctrinated.ext.hex-inspector',
    snippets: 'indoctrinated.ext.snippet-vault',
    colors: 'indoctrinated.ext.color-studio',
    ports: 'indoctrinated.ext.port-sentinel',
    redis: 'indoctrinated.ext.redis-studio',
    env: 'indoctrinated.ext.env-vault',
    mocklab: 'indoctrinated.ext.mocklab',
    graphql: 'indoctrinated.ext.graphql-studio',
    diagram: 'indoctrinated.ext.diagram-studio',
    bundle: 'indoctrinated.ext.bundle-analyzer',
    svg: 'indoctrinated.ext.svg-studio',
  }

  const activeExtId = TAB_EXTENSION_MAP[activeTab]
  const activeExtManifest = activeExtId ? extensionRegistry.get(activeExtId) : undefined
  const isActiveTabDisabled = Boolean(activeExtId && activeExtManifest && !extensionRegistry.isEnabled(activeExtId))

  const isUnlocked = Boolean(licenseInfo && !licenseInfo.isTrial && licenseInfo.isValid)

  if (!isOpen) return null

  return (
    <div className="right-auxiliary-pane glass-panel">
      {/* Top Multi-Extension Dock Tabs */}
      <div className="right-dock-tab-bar">
        <div
          className="dock-tabs-left"
          onWheel={(e) => {
            e.currentTarget.scrollLeft += e.deltaY
          }}
        >
          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'ports' ? 'active' : ''}`}
            onClick={() => onSelectTab('ports')}
            title="Port & Process Sentinel (Ctrl+Alt+1)"
          >
            <ShieldAlert size={13} className="tab-icon ports" />
            <span>Port Sentinel</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'redis' ? 'active' : ''}`}
            onClick={() => onSelectTab('redis')}
            title="Redis & Key-Value Cache Studio (Ctrl+Alt+2)"
          >
            <Zap size={13} className="tab-icon redis" />
            <span>Redis Studio</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'env' ? 'active' : ''}`}
            onClick={() => onSelectTab('env')}
            title="Env & Secret Vault Studio (Ctrl+Alt+3)"
          >
            <KeyRound size={13} className="tab-icon env" />
            <span>Env Vault</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'mocklab' ? 'active' : ''}`}
            onClick={() => onSelectTab('mocklab')}
            title="MockLab API Mock Server (Ctrl+Alt+4)"
          >
            <Server size={13} className="tab-icon mocklab" />
            <span>MockLab Server</span>
            <span className="dock-tab-pro-tag">PRO</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'graphql' ? 'active' : ''}`}
            onClick={() => onSelectTab('graphql')}
            title="GraphQL & gRPC Studio (Ctrl+Alt+5)"
          >
            <Globe size={13} className="tab-icon graphql" />
            <span>GraphQL Studio</span>
            <span className="dock-tab-pro-tag">PRO</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'diagram' ? 'active' : ''}`}
            onClick={() => onSelectTab('diagram')}
            title="Architecture & Diagram Studio (Ctrl+Alt+6)"
          >
            <Share2 size={13} className="tab-icon diagram" />
            <span>Diagram Studio</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'bundle' ? 'active' : ''}`}
            onClick={() => onSelectTab('bundle')}
            title="Bundle & Dependency Analyzer (Ctrl+Alt+7)"
          >
            <Layers size={13} className="tab-icon bundle" />
            <span>Bundle Analyzer</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'svg' ? 'active' : ''}`}
            onClick={() => onSelectTab('svg')}
            title="SVG & Asset Studio (Ctrl+Alt+8)"
          >
            <Shapes size={13} className="tab-icon svg" />
            <span>SVG Studio</span>
            <span className="dock-tab-pro-tag">PRO</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'crypto' ? 'active' : ''}`}
            onClick={() => onSelectTab('crypto')}
            title="Cryptography & DevTools Lab (Ctrl+Alt+C)"
          >
            <ShieldCheck size={13} className="tab-icon crypto" />
            <span>Crypto Lab</span>
            <span className="dock-tab-pro-tag">PRO</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'json' ? 'active' : ''}`}
            onClick={() => onSelectTab('json')}
            title="JSON & JQ Structure Studio (Ctrl+Alt+J)"
          >
            <FileCode2 size={13} className="tab-icon json" />
            <span>JSON & JQ</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => onSelectTab('preview')}
            title="Live Markdown, HTML & Mermaid Preview (Ctrl+Alt+V)"
          >
            <Eye size={13} className="tab-icon preview" />
            <span>Live Preview</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'docker' ? 'active' : ''}`}
            onClick={() => onSelectTab('docker')}
            title="Docker & Container Studio (Ctrl+Alt+K)"
          >
            <Container size={13} className="tab-icon docker" />
            <span>Docker</span>
            <span className="dock-tab-pro-tag">PRO</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'socket' ? 'active' : ''}`}
            onClick={() => onSelectTab('socket')}
            title="WebSocket & Event Streams (Ctrl+Alt+W)"
          >
            <Wifi size={13} className="tab-icon socket" />
            <span>WebSocket</span>
            <span className="dock-tab-pro-tag">PRO</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'regex' ? 'active' : ''}`}
            onClick={() => onSelectTab('regex')}
            title="Visual Regex & Pattern Lab (Ctrl+Alt+X)"
          >
            <Search size={13} className="tab-icon regex" />
            <span>Regex Lab</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'packages' ? 'active' : ''}`}
            onClick={() => onSelectTab('packages')}
            title="Package Manager & Audit (Ctrl+Alt+P)"
          >
            <Package size={13} className="tab-icon pkg" />
            <span>Packages</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'diff' ? 'active' : ''}`}
            onClick={() => onSelectTab('diff')}
            title="Visual Diff & 3-Way Merge Studio (Ctrl+Alt+M)"
          >
            <GitCompare size={13} className="tab-icon diff" />
            <span>Diff Studio</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'hex' ? 'active' : ''}`}
            onClick={() => onSelectTab('hex')}
            title="Hex & Binary Inspector (Ctrl+Alt+H)"
          >
            <Binary size={13} className="tab-icon hex" />
            <span>Hex Inspector</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'snippets' ? 'active' : ''}`}
            onClick={() => onSelectTab('snippets')}
            title="Snippet Vault & Scratchpad (Ctrl+Alt+S)"
          >
            <Bookmark size={13} className="tab-icon snippet" />
            <span>Snippets</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'colors' ? 'active' : ''}`}
            onClick={() => onSelectTab('colors')}
            title="Color Palette & Liquid Glass Studio (Ctrl+Alt+O)"
          >
            <Palette size={13} className="tab-icon color" />
            <span>Colors & Glass</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => onSelectTab('tasks')}
            title="Task Runner & Cron Studio (Ctrl+Alt+T)"
          >
            <Play size={13} className="tab-icon task" />
            <span>Tasks & Cron</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'database' ? 'active' : ''}`}
            onClick={() => onSelectTab('database')}
            title="Database Schema Viewer & SQL Query Runner (Ctrl+Shift+D)"
          >
            <Database size={13} className="tab-icon db" />
            <span>Database Studio</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'rest' ? 'active' : ''}`}
            onClick={() => onSelectTab('rest')}
            title="REST & GraphQL API Client (Ctrl+Alt+R)"
          >
            <Globe size={13} className="tab-icon rest" />
            <span>REST Client</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'jupyter' ? 'active' : ''}`}
            onClick={() => onSelectTab('jupyter')}
            title="Jupyter Notebooks & Live Kernel Studio (Ctrl+Alt+J)"
          >
            <BookOpen size={13} className="tab-icon jupyter" />
            <span>Jupyter Studio</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'remote' ? 'active' : ''}`}
            onClick={() => onSelectTab('remote')}
            title="Remote Protocol Studio (SSH, SFTP, FTP & SMTP) (Ctrl+Alt+S)"
          >
            <Server size={13} className="tab-icon remote" />
            <span>Remote Studio</span>
            <span className="dock-tab-pro-tag">PRO</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'antigravity' ? 'active' : ''}`}
            onClick={() => onSelectTab('antigravity')}
            title="Google Antigravity Studio (Personal Account & Python SDK)"
          >
            <AntigravityIcon size={14} className="tab-icon antigravity" />
            <span>Antigravity Studio</span>
            <span className="dock-tab-pro-tag">PRO</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => onSelectTab('ai')}
            title="AI Multi-Model Assistant (Ctrl+Alt+A)"
          >
            <Bot size={13} className="tab-icon ai" />
            <span>AI Assistant</span>
            <span className="dock-tab-pro-tag">PRO</span>
          </button>
        </div>

        <div className="dock-tabs-right">
          <button className="dock-close-trigger glass-interactive" onClick={onClose} title="Close Auxiliary Pane">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Pane Content Area */}
      <div className="right-dock-content">
        {isActiveTabDisabled && activeExtId ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: '#94A3B8', textAlign: 'center' }}>
            <strong style={{ color: '#F8FAFC', fontSize: 14 }}>Extension Disabled</strong>
            <p style={{ fontSize: 12, maxWidth: 280 }}>
              {activeExtManifest?.name || activeExtId} is currently disabled in the Extensions Manager.
            </p>
            <button
              className="glass-interactive"
              onClick={() => extensionRegistry.enable(activeExtId)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                background: 'rgba(10, 132, 255, 0.2)',
                border: '1px solid rgba(10, 132, 255, 0.45)',
                color: '#7DD3FC',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Enable Extension
            </button>
          </div>
        ) : (
        <>
        {activeTab === 'jupyter' && (
          <JupyterStudioView onCreateNotebook={onCreateNotebook} />
        )}
        {activeTab === 'remote' && (
          isUnlocked ? (
            <RemoteProtocolStudioView
              isDocked={true}
              onClose={onClose}
            />
          ) : (
            <LockedExtensionView
              extensionName="Remote Protocol Studio"
              onOpenLicense={onOpenLicense}
            />
          )
        )}
        {activeTab === 'antigravity' && (
          isUnlocked ? (
            <AntigravityStudioView
              workspaceRoot={workspaceRoot}
              activeFileName={activeFileName}
              activeFileContent={activeFileContent}
              currentSelection={currentSelection}
              onInsertAtCursor={onInsertAtCursor}
              onReplaceSelection={onReplaceSelection}
              onOpenFile={onOpenFile}
              onApplyFileEdit={onApplyFileEdit}
              onClose={onClose}
            />
          ) : (
            <LockedExtensionView
              extensionName="Google Antigravity Studio"
              onOpenLicense={onOpenLicense}
            />
          )
        )}
        {activeTab === 'ports' && <PortSentinelView />}
        {activeTab === 'redis' && <RedisStudioView />}
        {activeTab === 'env' && <EnvVaultView />}
        {activeTab === 'mocklab' && (
          isUnlocked ? (
            <MockLabView />
          ) : (
            <LockedExtensionView
              extensionName="MockLab API Mock Server"
              onOpenLicense={onOpenLicense}
            />
          )
        )}
        {activeTab === 'graphql' && (
          isUnlocked ? (
            <GraphQLStudioView />
          ) : (
            <LockedExtensionView
              extensionName="GraphQL and gRPC Studio"
              onOpenLicense={onOpenLicense}
            />
          )
        )}
        {activeTab === 'diagram' && (
          <DiagramStudioView
            activeFileName={activeFileName}
            activeFileContent={activeFileContent}
          />
        )}
        {activeTab === 'bundle' && <BundleAnalyzerView workspaceRoot={workspaceRoot} />}
        {activeTab === 'svg' && (
          isUnlocked ? (
            <SvgStudioView />
          ) : (
            <LockedExtensionView
              extensionName="SVG & Asset Studio"
              onOpenLicense={onOpenLicense}
            />
          )
        )}

        {activeTab === 'crypto' && (
          isUnlocked ? (
            <CryptoDevToolsView isDocked={true} />
          ) : (
            <LockedExtensionView
              extensionName="Cryptography & DevTools Lab"
              onOpenLicense={onOpenLicense}
            />
          )
        )}
        {activeTab === 'json' && <JsonStudioView />}

        {activeTab === 'preview' && (
          <LivePreviewView
            activeFileName={activeFileName}
            activeFileContent={activeFileContent}
            isDocked={true}
            onClose={onClose}
          />
        )}

        {activeTab === 'diff' && (
          <DiffStudioView
            activeFileName={activeFileName}
            activeFileContent={activeFileContent}
            onApplyToEditor={onReplaceActiveFileContent || onReplaceSelection}
          />
        )}

        {activeTab === 'hex' && (
          <HexInspectorView
            activeFileName={activeFileName}
            activeFileContent={activeFileContent}
          />
        )}

        {activeTab === 'snippets' && (
          <SnippetVaultView
            onInsertSnippet={onInsertAtCursor}
          />
        )}

        {activeTab === 'colors' && <ColorStudioView />}

        {activeTab === 'docker' && (
          isUnlocked ? (
            <DockerStudioView workspaceRoot={workspaceRoot} />
          ) : (
            <LockedExtensionView
              extensionName="Docker & Container Studio"
              onOpenLicense={onOpenLicense}
            />
          )
        )}

        {activeTab === 'socket' && (
          isUnlocked ? (
            <WebSocketView />
          ) : (
            <LockedExtensionView
              extensionName="WebSocket & Event Streams Worklab"
              onOpenLicense={onOpenLicense}
            />
          )
        )}

        {activeTab === 'regex' && <RegexLabView />}

        {activeTab === 'packages' && (
          <PackageManagerView
            activeFileName={activeFileName}
            activeFileContent={activeFileContent}
            workspaceRoot={workspaceRoot}
          />
        )}

        {activeTab === 'tasks' && <TaskRunnerView workspaceRoot={workspaceRoot} />}

        {activeTab === 'ai' && (
          isUnlocked ? (
            <AiChatPanel
              isOpen={isOpen}
              onClose={onClose}
              activeFileName={activeFileName}
              activeFileContent={activeFileContent}
              currentSelection={currentSelection}
              workspaceRoot={workspaceRoot}
              openFiles={openFiles}
              onOpenFile={onOpenFile}
              onApplyFileEdit={onApplyFileEdit}
              onInsertAtCursor={onInsertAtCursor}
              onReplaceSelection={onReplaceSelection}
              pendingPrompt={pendingAiPrompt}
              onPendingPromptConsumed={onPendingAiPromptConsumed}
            />
          ) : (
            <LockedExtensionView
              extensionName="AI Multi-Model Assistant"
              onOpenLicense={onOpenLicense}
            />
          )
        )}

        {activeTab === 'database' && (
          <DatabaseStudio
            onClose={onClose}
            isDocked={true}
            dockPosition="right"
          />
        )}

        {activeTab === 'rest' && (
          <RestClientView
            onClose={onClose}
            isDocked={true}
            dockPosition="right"
          />
        )}
        </>
        )}
      </div>

      <style>{`
        .right-auxiliary-pane {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(12, 16, 28, 0.94);
          backdrop-filter: blur(32px) saturate(200%);
          border-left: 1px solid rgba(255, 255, 255, 0.12);
          overflow: hidden;
          position: relative;
          z-index: 10;
        }

        .right-dock-tab-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.25);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        .dock-tabs-left {
          display: flex;
          align-items: center;
          gap: 4px;
          overflow-x: auto;
          overflow-y: hidden;
          white-space: nowrap;
          scrollbar-width: none;
          -ms-overflow-style: none;
          flex: 1;
          margin-right: 6px;
        }

        .dock-tabs-left::-webkit-scrollbar {
          display: none;
        }

        .dock-tab-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 6px;
          background: transparent;
          border: 1px solid transparent;
          color: rgba(235, 235, 245, 0.6);
          font-size: 0.74rem;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }

        .dock-tab-item:hover {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.04);
        }

        .dock-tab-item.active {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.14);
          color: #FFFFFF;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .dock-tab-pro-tag {
          font-size: 7.5px;
          font-weight: 800;
          letter-spacing: 0.5px;
          padding: 1px 4px;
          border-radius: 3px;
          background: linear-gradient(135deg, #BF5AF2 0%, #0A84FF 100%);
          color: #FFF;
          margin-left: 2px;
          line-height: 9px;
          box-shadow: 0 0 6px rgba(191, 90, 242, 0.35);
        }

        .dock-tab-item .tab-icon.ports { color: #30D158; }
        .dock-tab-item .tab-icon.redis { color: #FF453A; }
        .dock-tab-item .tab-icon.env { color: #30D158; }
        .dock-tab-item .tab-icon.mocklab { color: #BF5AF2; }
        .dock-tab-item .tab-icon.graphql { color: #FF9F0A; }
        .dock-tab-item .tab-icon.diagram { color: #64D2FF; }
        .dock-tab-item .tab-icon.bundle { color: #0A84FF; }
        .dock-tab-item .tab-icon.svg { color: #BF5AF2; }
        .dock-tab-item .tab-icon.diff { color: #FF9F0A; }
        .dock-tab-item .tab-icon.hex { color: #64D2FF; }
        .dock-tab-item .tab-icon.snippet { color: #FFD60A; }
        .dock-tab-item .tab-icon.color { color: #BF5AF2; }
        .dock-tab-item .tab-icon.crypto { color: #30D158; }
        .dock-tab-item .tab-icon.preview { color: #64D2FF; }
        .dock-tab-item .tab-icon.docker { color: #0A84FF; }
        .dock-tab-item .tab-icon.socket { color: #FF9F0A; }
        .dock-tab-item .tab-icon.regex { color: #BF5AF2; }
        .dock-tab-item .tab-icon.pkg { color: #FF453A; }
        .dock-tab-item .tab-icon.task { color: #30D158; }
        .dock-tab-item .tab-icon.antigravity { color: #64D2FF; filter: drop-shadow(0 0 6px rgba(100, 210, 255, 0.4)); }
        .dock-tab-item .tab-icon.remote { color: #64D2FF; }
        .dock-tab-item .tab-icon.ai { color: #BF5AF2; }
        .dock-tab-item .tab-icon.db { color: #30D158; }
        .dock-tab-item .tab-icon.rest { color: #0A84FF; }

        .dock-close-trigger {
          width: 24px;
          height: 24px;
          border-radius: 5px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .dock-close-trigger:hover {
          background: rgba(255, 69, 58, 0.2);
          border-color: rgba(255, 69, 58, 0.4);
          color: #FF453A;
        }

        .right-dock-content {
          flex: 1;
          display: flex;
          overflow: hidden;
          position: relative;
        }
      `}</style>
    </div>
  )
}

import React from 'react'
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
import { SelectionInfo } from '../Editor/EditorHost'

export type RightDockTab =
  | 'ai'
  | 'database'
  | 'rest'
  | 'crypto'
  | 'preview'
  | 'docker'
  | 'socket'
  | 'regex'
  | 'packages'
  | 'tasks'

interface RightAuxiliaryPaneProps {
  isOpen: boolean
  activeTab: RightDockTab
  onSelectTab: (tab: RightDockTab) => void
  onClose: () => void
  // AI / Preview Panel Props
  activeFileName?: string
  activeFileContent?: string
  currentSelection: SelectionInfo | null
  onInsertAtCursor?: (code: string) => void
  onReplaceSelection?: (code: string) => void
}

export const RightAuxiliaryPane: React.FC<RightAuxiliaryPaneProps> = ({
  isOpen,
  activeTab,
  onSelectTab,
  onClose,
  activeFileName = 'untitled.ts',
  activeFileContent = '',
  currentSelection,
  onInsertAtCursor,
  onReplaceSelection,
}) => {
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
            className={`dock-tab-item glass-interactive ${activeTab === 'crypto' ? 'active' : ''}`}
            onClick={() => onSelectTab('crypto')}
            title="Cryptography & DevTools Lab (Ctrl+Alt+C)"
          >
            <ShieldCheck size={13} className="tab-icon crypto" />
            <span>Crypto Lab</span>
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
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'socket' ? 'active' : ''}`}
            onClick={() => onSelectTab('socket')}
            title="WebSocket & Event Streams (Ctrl+Alt+W)"
          >
            <Wifi size={13} className="tab-icon socket" />
            <span>WebSocket</span>
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
            className={`dock-tab-item glass-interactive ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => onSelectTab('ai')}
            title="AI Multi-Model Assistant (Ctrl+Alt+A)"
          >
            <Bot size={13} className="tab-icon ai" />
            <span>AI Assistant</span>
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
        {activeTab === 'crypto' && <CryptoDevToolsView isDocked={true} />}

        {activeTab === 'preview' && (
          <LivePreviewView
            activeFileName={activeFileName}
            activeFileContent={activeFileContent}
            isDocked={true}
            onClose={onClose}
          />
        )}

        {activeTab === 'docker' && <DockerStudioView />}

        {activeTab === 'socket' && <WebSocketView />}

        {activeTab === 'regex' && <RegexLabView />}

        {activeTab === 'packages' && (
          <PackageManagerView
            activeFileName={activeFileName}
            activeFileContent={activeFileContent}
          />
        )}

        {activeTab === 'tasks' && <TaskRunnerView />}

        {activeTab === 'ai' && (
          <AiChatPanel
            isOpen={isOpen}
            onClose={onClose}
            activeFileName={activeFileName}
            activeFileContent={activeFileContent}
            currentSelection={currentSelection}
            onInsertAtCursor={onInsertAtCursor}
            onReplaceSelection={onReplaceSelection}
          />
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

        .dock-tab-item .tab-icon.ai {
          color: #BF5AF2;
        }

        .dock-tab-item .tab-icon.db {
          color: #30D158;
        }

        .dock-tab-item .tab-icon.rest {
          color: #0A84FF;
        }

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

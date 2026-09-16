import React from 'react'
import { Bot, Database, X } from 'lucide-react'
import { AiChatPanel } from '../AiChat/AiChatPanel'
import { DatabaseStudio } from '../Database/DatabaseStudio'
import { SelectionInfo } from '../Editor/EditorHost'

export type RightDockTab = 'ai' | 'database' | 'rest'

interface RightAuxiliaryPaneProps {
  isOpen: boolean
  activeTab: RightDockTab
  onSelectTab: (tab: RightDockTab) => void
  onClose: () => void
  // AI Panel Props
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
        <div className="dock-tabs-left">
          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => onSelectTab('ai')}
            title="AI Multi-Model Assistant"
          >
            <Bot size={13} className="tab-icon ai" />
            <span>AI Assistant</span>
          </button>

          <button
            className={`dock-tab-item glass-interactive ${activeTab === 'database' ? 'active' : ''}`}
            onClick={() => onSelectTab('database')}
            title="Database Schema Viewer & SQL Query Runner"
          >
            <Database size={13} className="tab-icon db" />
            <span>Database Studio</span>
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

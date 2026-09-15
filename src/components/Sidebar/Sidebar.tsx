import React from 'react'
import { ActivityView } from '../ActivityBar/ActivityBar'
import { Folder, FileCode, CheckCircle2, Cpu, ShieldCheck, FolderOpen, Plus } from 'lucide-react'
import { registeredThemes } from '@/themes/themeRegistry'

import { GitGraphView } from '../GitGraph/GitGraphView'

export interface WorkspaceFileItem {
  name: string
  path: string
  isDirectory: boolean
  lang?: string
}

interface SidebarProps {
  activeView: ActivityView | null
  currentThemeId: string
  onSelectTheme: (id: string) => void
  onOpenFile: (file: WorkspaceFileItem) => void
  activeFilePath?: string
  workspaceName: string
  workspacePath?: string
  workspaceFiles: WorkspaceFileItem[]
  onOpenFolderClick?: () => void
  onNewFileClick?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  currentThemeId,
  onSelectTheme,
  onOpenFile,
  activeFilePath,
  workspaceName,
  workspacePath,
  workspaceFiles,
  onOpenFolderClick,
  onNewFileClick,
}) => {
  if (!activeView) return null

  const sampleExtensions = [
    { id: 'indoctrinated.ext.typescript', name: 'TypeScript & React Engine', status: 'Running', type: 'Built-in' },
    { id: 'indoctrinated.ext.liquid-glass-fx', name: 'Liquid Glass Shader Shaper', status: 'Running', type: 'Microservice' },
    { id: 'indoctrinated.ext.linter', name: 'Unified Diagnostics Bus', status: 'Idle', type: 'Microservice' },
  ]

  return (
    <div className="sidebar glass-panel">
      {activeView === 'git' && (
        <GitGraphView
          workspacePath={workspacePath}
          onOpenFile={(filePath) =>
            onOpenFile({ name: filePath.split(/[/\\]/).pop() || filePath, path: filePath, isDirectory: false })
          }
        />
      )}

      {activeView === 'files' && (
        <div className="sidebar-section">
          <div className="sidebar-header">
            <span className="sidebar-title">EXPLORER</span>
            <div className="sidebar-actions">
              <button
                className="icon-action-btn"
                onClick={onNewFileClick}
                title="New File (Ctrl+N)"
              >
                <Plus size={14} />
              </button>
              <button
                className="icon-action-btn"
                onClick={onOpenFolderClick}
                title="Open Folder (Ctrl+Shift+O)"
              >
                <FolderOpen size={14} />
              </button>
            </div>
          </div>

          <div className="sidebar-group-title">
            <Folder size={14} className="folder-icon" />
            <span>{workspaceName.toUpperCase()}</span>
          </div>

          <div className="file-list">
            {workspaceFiles.map((file) => {
              const isSelected = activeFilePath === file.path || activeFilePath === file.name
              return (
                <button
                  key={file.path || file.name}
                  className={`file-item glass-interactive ${isSelected ? 'active' : ''}`}
                  onClick={() => onOpenFile(file)}
                >
                  {file.isDirectory ? (
                    <Folder size={14} className="folder-icon" />
                  ) : (
                    <FileCode size={14} className="file-icon" />
                  )}
                  <span className="file-name">{file.name}</span>
                  {file.lang && <span className="file-lang">{file.lang}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {activeView === 'themes' && (
        <div className="sidebar-section">
          <div className="sidebar-header">
            <span className="sidebar-title">LIQUID GLASS THEMES</span>
          </div>
          <div className="theme-list">
            {registeredThemes.map((theme) => {
              const isSelected = currentThemeId === theme.id
              return (
                <div
                  key={theme.id}
                  className={`theme-card glass-interactive ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectTheme(theme.id)}
                >
                  <div className="theme-card-header">
                    <span className="theme-name">{theme.name}</span>
                    {isSelected && <CheckCircle2 size={15} className="theme-check" />}
                  </div>
                  <p className="theme-desc">{theme.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeView === 'extensions' && (
        <div className="sidebar-section">
          <div className="sidebar-header">
            <span className="sidebar-title">MICROSERVICES & EXTENSIONS</span>
          </div>
          <div className="extension-badge-banner">
            <ShieldCheck size={14} className="shield-icon" />
            <span>Process-Isolated Microservices Sandbox</span>
          </div>
          <div className="ext-list">
            {sampleExtensions.map((ext) => (
              <div key={ext.id} className="ext-card glass-panel">
                <div className="ext-header">
                  <Cpu size={14} className="ext-icon" />
                  <span className="ext-name">{ext.name}</span>
                </div>
                <div className="ext-footer">
                  <span className="ext-type">{ext.type}</span>
                  <span className={`ext-status ${ext.status.toLowerCase()}`}>{ext.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'search' && (
        <div className="sidebar-section">
          <div className="sidebar-header">
            <span className="sidebar-title">SEARCH</span>
          </div>
          <div className="search-input-box">
            <input
              type="text"
              placeholder="Search across files..."
              className="glass-input"
            />
          </div>
        </div>
      )}

      {activeView === 'settings' && (
        <div className="sidebar-section">
          <div className="sidebar-header">
            <span className="sidebar-title">PREFERENCES</span>
          </div>
          <div className="settings-list">
            <label className="settings-row">
              <span>Hardware Glass Blur</span>
              <input type="checkbox" defaultChecked className="glass-checkbox" />
            </label>
            <label className="settings-row">
              <span>Specular Border Sheen</span>
              <input type="checkbox" defaultChecked className="glass-checkbox" />
            </label>
            <label className="settings-row">
              <span>Smooth Caret Animation</span>
              <input type="checkbox" defaultChecked className="glass-checkbox" />
            </label>
            <label className="settings-row">
              <span>Minimap Code Preview</span>
              <input type="checkbox" defaultChecked className="glass-checkbox" />
            </label>
          </div>
        </div>
      )}

      <style>{`
        .sidebar {
          width: 260px;
          height: 100%;
          border-left: none;
          border-top: none;
          border-bottom: none;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          z-index: 40;
        }

        .sidebar-section {
          padding: 12px 14px;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .sidebar-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .icon-action-btn {
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          border-radius: var(--radius-xs);
          cursor: pointer;
        }

        .icon-action-btn:hover {
          background: var(--glass-bg-hover);
          color: var(--text-primary);
        }

        .sidebar-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.8px;
          color: var(--text-muted);
        }

        .sidebar-group-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          padding: 4px 6px;
          margin-bottom: 6px;
        }

        .folder-icon {
          color: var(--accent-primary);
        }

        .file-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-secondary);
          font-size: 12px;
          text-align: left;
          cursor: pointer;
        }

        .file-item:hover {
          color: var(--text-primary);
          background: var(--glass-bg-hover);
        }

        .file-item.active {
          color: #FFF;
          background: var(--glass-bg-active);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .file-icon {
          color: var(--accent-cyan);
        }

        .file-name {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .file-lang {
          font-size: 10px;
          color: var(--text-muted);
        }

        .theme-list, .ext-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .theme-card, .ext-card {
          padding: 10px 12px;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.04);
          border: var(--specular-border-subtle);
          cursor: pointer;
        }

        .theme-card:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .theme-card.selected {
          background: rgba(10, 132, 255, 0.18);
          border-color: var(--accent-primary);
          box-shadow: 0 0 16px rgba(10, 132, 255, 0.25);
        }

        .theme-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .theme-name {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .theme-check {
          color: var(--accent-cyan);
        }

        .theme-desc {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .extension-badge-banner {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          margin-bottom: 12px;
          border-radius: var(--radius-sm);
          background: rgba(48, 209, 88, 0.12);
          border: 1px solid rgba(48, 209, 88, 0.25);
          color: var(--accent-green);
          font-size: 11px;
          font-weight: 500;
        }

        .ext-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }

        .ext-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .ext-footer {
          display: flex;
          justify-content: space-between;
          font-size: 10.5px;
        }

        .ext-type {
          color: var(--text-muted);
        }

        .ext-status.running {
          color: var(--accent-green);
          font-weight: 600;
        }

        .ext-status.idle {
          color: var(--accent-amber);
        }

        .glass-input {
          width: 100%;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          border: var(--specular-border);
          background: rgba(0, 0, 0, 0.25);
          color: var(--text-primary);
          font-size: 12px;
          outline: none;
        }

        .glass-input:focus {
          border-color: var(--accent-primary);
          box-shadow: 0 0 10px rgba(10, 132, 255, 0.3);
        }

        .settings-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          font-size: 12px;
          color: var(--text-secondary);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  )
}

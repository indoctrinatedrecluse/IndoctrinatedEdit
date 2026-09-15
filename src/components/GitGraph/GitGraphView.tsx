import React, { useState, useEffect, useCallback } from 'react'
import {
  GitBranch,
  RotateCw,
  Check,
  Plus,
  Minus,
  GitCommit as GitCommitIcon,
  FolderGit2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Layers,
} from 'lucide-react'
import { GitRepoStatus, GitCommit } from '@sdk/types'

interface GitGraphViewProps {
  workspacePath?: string
  onOpenFile?: (path: string) => void
}

const TRACK_COLORS = [
  '#0A84FF', // Electric Blue
  '#BF5AF2', // Deep Purple
  '#30D158', // Neon Emerald
  '#FF9F0A', // Amber Gold
  '#FF0055', // Synthwave Magenta
  '#00F0FF', // Cyan Glow
]

export const GitGraphView: React.FC<GitGraphViewProps> = ({ workspacePath }) => {
  const [status, setStatus] = useState<GitRepoStatus | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<'changes' | 'graph'>('changes')
  const [commitMessage, setCommitMessage] = useState<string>('')
  const [stagedExpanded, setStagedExpanded] = useState<boolean>(true)
  const [changesExpanded, setChangesExpanded] = useState<boolean>(true)
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null)
  const [committing, setCommitting] = useState<boolean>(false)

  const fetchGitStatus = useCallback(async () => {
    if (!window.electronAPI?.git?.getRepoStatus) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const res = await window.electronAPI.git.getRepoStatus(workspacePath)
      setStatus(res)
    } catch (err) {
      console.warn('Failed to fetch git status:', err)
    } finally {
      setLoading(false)
    }
  }, [workspacePath])

  useEffect(() => {
    fetchGitStatus()
  }, [fetchGitStatus])

  const handleStageFile = async (filePath: string) => {
    if (!window.electronAPI?.git?.stageFile) return
    await window.electronAPI.git.stageFile(filePath, workspacePath)
    await fetchGitStatus()
  }

  const handleUnstageFile = async (filePath: string) => {
    if (!window.electronAPI?.git?.unstageFile) return
    await window.electronAPI.git.unstageFile(filePath, workspacePath)
    await fetchGitStatus()
  }

  const handleCommit = async () => {
    if (!commitMessage.trim() || !window.electronAPI?.git?.commit) return
    try {
      setCommitting(true)
      await window.electronAPI.git.commit(commitMessage.trim(), workspacePath)
      setCommitMessage('')
      await fetchGitStatus()
    } finally {
      setCommitting(false)
    }
  }

  const handleInitRepo = async () => {
    if (!window.electronAPI?.git?.initRepo) return
    await window.electronAPI.git.initRepo(workspacePath)
    await fetchGitStatus()
  }

  if (loading && !status) {
    return (
      <div className="git-view-empty">
        <RotateCw size={18} className="spinner" />
        <span>Scanning repository...</span>
      </div>
    )
  }

  if (!status?.isRepo) {
    return (
      <div className="git-view-empty">
        <FolderGit2 size={32} className="git-empty-icon" />
        <h3>No Git Repository Detected</h3>
        <p>Initialize version control to track changes and visualize your commit graph.</p>
        <button className="git-btn primary glass-interactive" onClick={handleInitRepo}>
          <Sparkles size={14} />
          <span>Initialize Git Repository</span>
        </button>
      </div>
    )
  }

  const totalChanges = status.staged.length + status.working.length

  return (
    <div className="git-graph-view">
      {/* Top Header */}
      <div className="git-header">
        <div className="git-header-left">
          <div className="git-branch-pill">
            <GitBranch size={13} className="branch-icon" />
            <span className="branch-name">{status.branch || 'HEAD'}</span>
          </div>
          {(status.ahead > 0 || status.behind > 0) && (
            <span className="sync-counters">
              {status.ahead > 0 && `↑${status.ahead}`} {status.behind > 0 && `↓${status.behind}`}
            </span>
          )}
        </div>
        <button className="icon-btn" onClick={fetchGitStatus} title="Refresh Git Status">
          <RotateCw size={13} className={loading ? 'spinner' : ''} />
        </button>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="git-tab-switcher">
        <button
          className={`switcher-tab ${activeTab === 'changes' ? 'active' : ''}`}
          onClick={() => setActiveTab('changes')}
        >
          <Layers size={13} />
          <span>Changes ({totalChanges})</span>
        </button>
        <button
          className={`switcher-tab ${activeTab === 'graph' ? 'active' : ''}`}
          onClick={() => setActiveTab('graph')}
        >
          <GitCommitIcon size={13} />
          <span>Visual Graph ({status.commits.length})</span>
        </button>
      </div>

      {/* Changes View Mode */}
      {activeTab === 'changes' && (
        <div className="git-content changes-mode">
          {/* Commit Message Box */}
          <div className="commit-box">
            <textarea
              className="commit-textarea glass-input"
              rows={2}
              placeholder="Commit message (Ctrl+Enter)..."
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  handleCommit()
                }
              }}
            />
            <button
              className="commit-submit-btn glass-interactive"
              disabled={!commitMessage.trim() || status.staged.length === 0 || committing}
              onClick={handleCommit}
            >
              <Check size={14} />
              <span>{committing ? 'Committing...' : `Commit (${status.staged.length} staged)`}</span>
            </button>
          </div>

          {/* Staged Changes Section */}
          <div className="changes-section">
            <div
              className="section-header"
              onClick={() => setStagedExpanded(!stagedExpanded)}
            >
              {stagedExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span className="section-title">STAGED CHANGES</span>
              <span className="badge">{status.staged.length}</span>
            </div>

            {stagedExpanded && (
              <div className="file-changes-list">
                {status.staged.length === 0 ? (
                  <div className="empty-hint">No staged changes</div>
                ) : (
                  status.staged.map((file) => (
                    <div key={file.path} className="file-change-row glass-interactive">
                      <span className={`status-code ${file.status.toLowerCase()}`}>{file.status}</span>
                      <span className="file-path">{file.path}</span>
                      <button
                        className="row-action-btn unstage"
                        onClick={() => handleUnstageFile(file.path)}
                        title="Unstage File"
                      >
                        <Minus size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Working Tree Changes Section */}
          <div className="changes-section">
            <div
              className="section-header"
              onClick={() => setChangesExpanded(!changesExpanded)}
            >
              {changesExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span className="section-title">CHANGES</span>
              <span className="badge">{status.working.length}</span>
            </div>

            {changesExpanded && (
              <div className="file-changes-list">
                {status.working.length === 0 ? (
                  <div className="empty-hint">Working tree clean</div>
                ) : (
                  status.working.map((file) => (
                    <div key={file.path} className="file-change-row glass-interactive">
                      <span className={`status-code ${file.status === '?' ? 'u' : file.status.toLowerCase()}`}>
                        {file.status === '?' ? 'U' : file.status}
                      </span>
                      <span className="file-path">{file.path}</span>
                      <button
                        className="row-action-btn stage"
                        onClick={() => handleStageFile(file.path)}
                        title="Stage File"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visual Subway-Map Git Graph Mode */}
      {activeTab === 'graph' && (
        <div className="git-content graph-mode">
          <div className="graph-commit-list">
            {status.commits.map((commit) => {
              const track = commit.trackIndex ?? 0
              const color = TRACK_COLORS[track % TRACK_COLORS.length]
              const isSelected = selectedCommit?.hash === commit.hash

              return (
                <div
                  key={commit.hash}
                  className={`graph-row glass-interactive ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedCommit(commit)}
                >
                  {/* SVG Node and Line Column */}
                  <div className="subway-canvas">
                    <svg width="24" height="42" viewBox="0 0 24 42">
                      {/* Vertical branch rail line */}
                      <line
                        x1="12"
                        y1="0"
                        x2="12"
                        y2="42"
                        stroke={color}
                        strokeWidth="2.5"
                        strokeOpacity="0.5"
                      />
                      {/* Node Glow Halo */}
                      <circle
                        cx="12"
                        cy="21"
                        r="6"
                        fill={color}
                        fillOpacity="0.35"
                        filter="drop-shadow(0 0 4px color)"
                      />
                      {/* Core Node Dot */}
                      <circle cx="12" cy="21" r="3.5" fill="#FFF" stroke={color} strokeWidth="1.5" />
                    </svg>
                  </div>

                  {/* Commit Details Row */}
                  <div className="graph-commit-info">
                    <div className="commit-top-line">
                      <span className="commit-hash">{commit.shortHash}</span>
                      {commit.refs.length > 0 && (
                        <div className="refs-container">
                          {commit.refs.map((ref) => (
                            <span key={ref} className="ref-pill">
                              {ref}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="commit-msg">{commit.message}</span>
                    </div>

                    <div className="commit-bottom-line">
                      <span className="commit-author">{commit.authorName}</span>
                      <span className="commit-date">{commit.relativeDate}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Selected Commit Drawer Inspector */}
          {selectedCommit && (
            <div className="selected-commit-drawer glass-panel">
              <div className="drawer-header">
                <span className="drawer-hash">{selectedCommit.hash.substring(0, 10)}</span>
                <button className="close-btn" onClick={() => setSelectedCommit(null)}>
                  ✕
                </button>
              </div>
              <p className="drawer-message">{selectedCommit.message}</p>
              <div className="drawer-meta">
                <span>By {selectedCommit.authorName} &lt;{selectedCommit.authorEmail}&gt;</span>
                <span>{new Date(selectedCommit.date).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .git-graph-view {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .git-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: var(--specular-border-subtle);
        }

        .git-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .git-branch-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 3px 8px;
          border-radius: var(--radius-xs);
          background: rgba(10, 132, 255, 0.15);
          border: 1px solid rgba(10, 132, 255, 0.3);
          color: var(--accent-cyan);
          font-size: 11.5px;
          font-weight: 600;
        }

        .branch-icon {
          color: var(--accent-primary);
        }

        .sync-counters {
          font-size: 11px;
          color: var(--accent-green);
          font-weight: 500;
        }

        .icon-btn {
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          border-radius: var(--radius-xs);
          cursor: pointer;
        }

        .icon-btn:hover {
          background: var(--glass-bg-hover);
          color: var(--text-primary);
        }

        .git-tab-switcher {
          display: flex;
          padding: 6px 10px;
          gap: 4px;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: var(--specular-border-subtle);
        }

        .switcher-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 5px 8px;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-secondary);
          border-radius: var(--radius-xs);
          border: none;
          background: transparent;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .switcher-tab:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        .switcher-tab.active {
          color: #FFF;
          background: rgba(255, 255, 255, 0.1);
          border: var(--specular-border-subtle);
        }

        .git-content {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .changes-mode {
          padding: 10px 12px;
          gap: 12px;
        }

        .commit-box {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .commit-textarea {
          width: 100%;
          resize: none;
          font-family: var(--font-ui);
          font-size: 12px;
          padding: 8px 10px;
        }

        .commit-submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(10, 132, 255, 0.4);
          background: rgba(10, 132, 255, 0.22);
          color: #FFF;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
        }

        .commit-submit-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .changes-section {
          display: flex;
          flex-direction: column;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-muted);
          padding: 4px 0;
          cursor: pointer;
        }

        .badge {
          margin-left: auto;
          font-size: 10px;
          padding: 1px 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
        }

        .file-changes-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .empty-hint {
          font-size: 11px;
          color: var(--text-muted);
          padding: 6px 12px;
          font-style: italic;
        }

        .file-change-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 8px;
          border-radius: var(--radius-xs);
          font-size: 12px;
        }

        .file-path {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--text-primary);
        }

        .status-code {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          width: 14px;
        }

        .status-code.m { color: var(--accent-amber); }
        .status-code.a { color: var(--accent-green); }
        .status-code.d { color: var(--accent-red); }
        .status-code.u { color: var(--accent-cyan); }

        .row-action-btn {
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-xs);
          color: var(--text-secondary);
          cursor: pointer;
        }

        .row-action-btn:hover {
          background: var(--glass-bg-hover);
          color: var(--text-primary);
        }

        /* Subway-Map Graph Mode */
        .graph-mode {
          position: relative;
        }

        .graph-commit-list {
          display: flex;
          flex-direction: column;
        }

        .graph-row {
          display: flex;
          align-items: center;
          padding: 0 8px;
          height: 42px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          cursor: pointer;
        }

        .graph-row:hover {
          background: var(--glass-bg-hover);
        }

        .graph-row.selected {
          background: rgba(10, 132, 255, 0.16);
          border-color: rgba(10, 132, 255, 0.3);
        }

        .subway-canvas {
          width: 24px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .graph-commit-info {
          flex: 1;
          margin-left: 8px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          gap: 2px;
        }

        .commit-top-line {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow: hidden;
        }

        .commit-hash {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--accent-cyan);
          background: rgba(0, 240, 255, 0.1);
          padding: 1px 4px;
          border-radius: 3px;
          flex-shrink: 0;
        }

        .refs-container {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }

        .ref-pill {
          font-size: 9.5px;
          font-weight: 600;
          color: #FFF;
          background: rgba(48, 209, 88, 0.25);
          border: 1px solid rgba(48, 209, 88, 0.4);
          padding: 0 4px;
          border-radius: 3px;
        }

        .commit-msg {
          font-size: 11.5px;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .commit-bottom-line {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: var(--text-muted);
        }

        .selected-commit-drawer {
          padding: 10px 12px;
          border-top: var(--specular-border);
          background: rgba(10, 14, 24, 0.85);
        }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .drawer-hash {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--accent-primary);
        }

        .close-btn {
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
        }

        .drawer-message {
          font-size: 12px;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .drawer-meta {
          display: flex;
          flex-direction: column;
          font-size: 10px;
          color: var(--text-muted);
        }

        .git-view-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 30px 16px;
          text-align: center;
          gap: 12px;
          color: var(--text-secondary);
        }

        .git-empty-icon {
          color: var(--accent-primary);
          opacity: 0.8;
        }

        .git-view-empty h3 {
          font-size: 13px;
          color: var(--text-primary);
        }

        .git-view-empty p {
          font-size: 11.5px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .git-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: var(--radius-sm);
          border: var(--specular-border);
          background: var(--accent-primary);
          color: #FFF;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

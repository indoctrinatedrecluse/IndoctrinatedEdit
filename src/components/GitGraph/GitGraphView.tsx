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
  Workflow,
  Play,
  CheckCircle2,
  Clock,
  XCircle,
  Terminal,
} from 'lucide-react'
import { GitRepoStatus, GitCommit } from '@sdk/types'
import {
  gitWorkflowService,
  WorkflowFile,
  WorkflowRun,
  WorkflowJob,
} from '../../services/gitWorkflowService'

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

export const GitGraphView: React.FC<GitGraphViewProps> = ({ workspacePath, onOpenFile }) => {
  const [status, setStatus] = useState<GitRepoStatus | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<'changes' | 'graph' | 'workflows'>('changes')
  const [commitMessage, setCommitMessage] = useState<string>('')
  const [stagedExpanded, setStagedExpanded] = useState<boolean>(true)
  const [changesExpanded, setChangesExpanded] = useState<boolean>(true)
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null)
  const [committing, setCommitting] = useState<boolean>(false)

  // Workflows state
  const [workflows, setWorkflows] = useState<WorkflowFile[]>(() => gitWorkflowService.getWorkflows())
  const [runs, setRuns] = useState<WorkflowRun[]>(() => gitWorkflowService.getRuns())
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(() => gitWorkflowService.getSelectedRun())
  const [selectedJob, setSelectedJob] = useState<WorkflowJob | null>(() => gitWorkflowService.getSelectedJob())
  const [jobLogs, setJobLogs] = useState<string[]>([])
  const [selectedWorkflowFilter, setSelectedWorkflowFilter] = useState<string>('all')
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false)
  const [dispatchWorkflowId, setDispatchWorkflowId] = useState<string>('release.yml')
  const [dispatchBranch, setDispatchBranch] = useState<string>('master')
  const [dispatchTagInput, setDispatchTagInput] = useState<string>('v4.1.0')

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

  useEffect(() => {
    return gitWorkflowService.subscribe(() => {
      setWorkflows(gitWorkflowService.getWorkflows())
      setRuns(gitWorkflowService.getRuns(selectedWorkflowFilter === 'all' ? undefined : selectedWorkflowFilter))
      const run = gitWorkflowService.getSelectedRun()
      setSelectedRun(run)
      const job = gitWorkflowService.getSelectedJob()
      setSelectedJob(job)
      if (run && job) {
        setJobLogs(gitWorkflowService.getJobLogs(run.id, job.id))
      }
    })
  }, [selectedWorkflowFilter])

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

  const handleStageAll = async () => {
    if (!status) return
    for (const f of status.working) {
      await handleStageFile(f.path)
    }
  }

  const handleUnstageAll = async () => {
    if (!status) return
    for (const f of status.staged) {
      await handleUnstageFile(f.path)
    }
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

  const handleTriggerDispatch = () => {
    gitWorkflowService.triggerWorkflow(dispatchWorkflowId, dispatchBranch, { tag: dispatchTagInput })
    setIsDispatchModalOpen(false)
    setActiveTab('workflows')
  }

  const handleSelectRun = (run: WorkflowRun) => {
    gitWorkflowService.setSelectedRunId(run.id)
    setSelectedRun(run)
    if (run.jobs.length > 0) {
      setSelectedJob(run.jobs[0])
      setJobLogs(gitWorkflowService.getJobLogs(run.id, run.jobs[0].id))
    }
  }

  const handleSelectJob = (job: WorkflowJob) => {
    gitWorkflowService.setSelectedJobId(job.id)
    setSelectedJob(job)
    if (selectedRun) {
      setJobLogs(gitWorkflowService.getJobLogs(selectedRun.id, job.id))
    }
  }

  if (loading && !status) {
    return (
      <div className="git-view-empty">
        <RotateCw size={18} className="spinner" />
        <span>Scanning Git repository...</span>
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
  const activeRunsCount = runs.filter((r) => r.status === 'in_progress').length

  return (
    <div className="git-graph-view">
      {/* Top Stylish Header */}
      <div className="git-header">
        <div className="git-header-left">
          <div className="git-branch-pill">
            <GitBranch size={13} className="branch-icon" />
            <span className="branch-name">{status.branch || 'master'}</span>
          </div>
          {(status.ahead > 0 || status.behind > 0) && (
            <div className="sync-badge">
              {status.ahead > 0 && <span className="sync-up">↑ {status.ahead}</span>}
              {status.behind > 0 && <span className="sync-down">↓ {status.behind}</span>}
            </div>
          )}
        </div>

        <div className="git-header-right">
          <button
            className="icon-btn"
            onClick={() => setIsDispatchModalOpen(true)}
            title="Run GitHub Actions Workflow"
          >
            <Play size={12} fill="currentColor" color="#0A84FF" />
          </button>
          <button className="icon-btn" onClick={fetchGitStatus} title="Refresh Git Status">
            <RotateCw size={13} className={loading ? 'spinner' : ''} />
          </button>
        </div>
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
          <span>Graph ({status.commits.length})</span>
        </button>
        <button
          className={`switcher-tab workflows-tab ${activeTab === 'workflows' ? 'active' : ''}`}
          onClick={() => setActiveTab('workflows')}
        >
          <Workflow size={13} />
          <span>Workflows</span>
          {activeRunsCount > 0 && <span className="tab-pulse-dot" />}
        </button>
      </div>

      {/* 1. Changes View Mode */}
      {activeTab === 'changes' && (
        <div className="git-content changes-mode custom-scrollbar">
          {/* Commit Message Box */}
          <div className="commit-box glass-panel">
            <textarea
              className="commit-textarea glass-input"
              rows={2}
              placeholder="Commit message (Ctrl+Enter to commit)..."
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
            <div className="section-header" onClick={() => setStagedExpanded(!stagedExpanded)}>
              <div className="sec-header-left">
                {stagedExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="section-title">STAGED CHANGES</span>
                <span className="badge emerald">{status.staged.length}</span>
              </div>
              {status.staged.length > 0 && (
                <button
                  className="sec-action-link"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUnstageAll()
                  }}
                  title="Unstage all files"
                >
                  Unstage All
                </button>
              )}
            </div>

            {stagedExpanded && (
              <div className="file-changes-list">
                {status.staged.length === 0 ? (
                  <div className="empty-hint">No staged changes</div>
                ) : (
                  status.staged.map((file) => (
                    <div
                      key={file.path}
                      className="file-change-row glass-interactive"
                      onClick={() => onOpenFile?.(file.path)}
                    >
                      <span className={`status-code ${file.status.toLowerCase()}`}>{file.status}</span>
                      <span className="file-path">{file.path}</span>
                      <button
                        className="row-action-btn unstage"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUnstageFile(file.path)
                        }}
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
            <div className="section-header" onClick={() => setChangesExpanded(!changesExpanded)}>
              <div className="sec-header-left">
                {changesExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="section-title">CHANGES</span>
                <span className="badge">{status.working.length}</span>
              </div>
              {status.working.length > 0 && (
                <button
                  className="sec-action-link"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStageAll()
                  }}
                  title="Stage all files"
                >
                  Stage All
                </button>
              )}
            </div>

            {changesExpanded && (
              <div className="file-changes-list">
                {status.working.length === 0 ? (
                  <div className="empty-hint">Working tree clean</div>
                ) : (
                  status.working.map((file) => (
                    <div
                      key={file.path}
                      className="file-change-row glass-interactive"
                      onClick={() => onOpenFile?.(file.path)}
                    >
                      <span className={`status-code ${file.status === '?' ? 'u' : file.status.toLowerCase()}`}>
                        {file.status === '?' ? 'U' : file.status}
                      </span>
                      <span className="file-path">{file.path}</span>
                      <button
                        className="row-action-btn stage"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStageFile(file.path)
                        }}
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

      {/* 2. Visual Subway-Map Git Graph Mode */}
      {activeTab === 'graph' && (
        <div className="git-content graph-mode custom-scrollbar">
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
                  <div className="subway-canvas">
                    <svg width="24" height="42" viewBox="0 0 24 42">
                      <line
                        x1="12"
                        y1="0"
                        x2="12"
                        y2="42"
                        stroke={color}
                        strokeWidth="2.5"
                        strokeOpacity="0.5"
                      />
                      <circle
                        cx="12"
                        cy="21"
                        r="6"
                        fill={color}
                        fillOpacity="0.35"
                      />
                      <circle cx="12" cy="21" r="3.5" fill="#FFF" stroke={color} strokeWidth="1.5" />
                    </svg>
                  </div>

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

      {/* 3. GitHub Actions Workflows Tab */}
      {activeTab === 'workflows' && (
        <div className="git-content workflows-mode custom-scrollbar">
          {/* Workflows Filter & Action Bar */}
          <div className="workflow-toolbar">
            <select
              className="workflow-select glass-interactive"
              value={selectedWorkflowFilter}
              onChange={(e) => setSelectedWorkflowFilter(e.target.value)}
            >
              <option value="all">All Workflows ({runs.length} runs)</option>
              {workflows.map((wf) => (
                <option key={wf.id} value={wf.id}>
                  {wf.name}
                </option>
              ))}
            </select>
            <button
              className="run-dispatch-btn glass-interactive"
              onClick={() => setIsDispatchModalOpen(true)}
            >
              <Play size={11} fill="currentColor" />
              <span>Run Workflow</span>
            </button>
          </div>

          {/* Workflow Runs List */}
          <div className="runs-section">
            <div className="section-label">RECENT WORKFLOW RUNS</div>
            <div className="runs-list">
              {runs.map((run) => {
                const isSelected = selectedRun?.id === run.id
                return (
                  <div
                    key={run.id}
                    className={`run-card glass-interactive ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectRun(run)}
                  >
                    <div className="run-card-header">
                      <div className="run-status-icon">
                        {run.status === 'in_progress' ? (
                          <RotateCw size={13} className="spinner cyan" />
                        ) : run.conclusion === 'success' ? (
                          <CheckCircle2 size={13} color="#30D158" />
                        ) : (
                          <XCircle size={13} color="#FF453A" />
                        )}
                      </div>
                      <span className="run-title">{run.name}</span>
                      <span className="run-number">#{run.runNumber}</span>
                    </div>

                    <div className="run-commit-row">
                      <GitBranch size={11} className="run-branch-icon" />
                      <span className="run-branch">{run.branch}</span>
                      <span className="run-commit-msg">{run.commit.message}</span>
                    </div>

                    <div className="run-footer-row">
                      <span className="run-actor">by {run.actor.name}</span>
                      <span className="run-duration">
                        <Clock size={10} /> {run.durationFormatted}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected Run Details & Matrix Inspector */}
          {selectedRun && (
            <div className="run-details-box glass-panel">
              <div className="run-details-header">
                <div className="run-details-title-row">
                  <span className="details-title">{selectedRun.name} #{selectedRun.runNumber}</span>
                  <div className="details-actions">
                    <button
                      className="details-btn glass-interactive"
                      onClick={() => gitWorkflowService.rerunWorkflow(selectedRun.id)}
                      title="Re-run all jobs in workflow"
                    >
                      <RotateCw size={11} /> Re-run
                    </button>
                  </div>
                </div>

                {/* Job Selector Chips */}
                <div className="jobs-chip-list">
                  {selectedRun.jobs.map((job) => {
                    const isJobActive = selectedJob?.id === job.id
                    return (
                      <button
                        key={job.id}
                        className={`job-chip glass-interactive ${isJobActive ? 'active' : ''}`}
                        onClick={() => handleSelectJob(job)}
                      >
                        {job.status === 'in_progress' ? (
                          <RotateCw size={11} className="spinner cyan" />
                        ) : job.conclusion === 'success' ? (
                          <CheckCircle2 size={11} color="#30D158" />
                        ) : (
                          <XCircle size={11} color="#FF453A" />
                        )}
                        <span>{job.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Steps Progress Checklist */}
              {selectedJob && (
                <div className="job-steps-box">
                  <div className="steps-header">
                    <span>STEPS FOR {selectedJob.runner.toUpperCase()}</span>
                    <span className="steps-duration">{selectedJob.durationSeconds}s</span>
                  </div>
                  <div className="steps-list">
                    {selectedJob.steps.map((step) => (
                      <div key={step.number} className="step-row">
                        <span className="step-num">{step.number}</span>
                        <div className="step-status-icon">
                          {step.status === 'in_progress' ? (
                            <RotateCw size={11} className="spinner cyan" />
                          ) : step.conclusion === 'success' ? (
                            <Check size={11} color="#30D158" />
                          ) : (
                            <Clock size={11} color="rgba(255,255,255,0.4)" />
                          )}
                        </div>
                        <span className="step-name">{step.name}</span>
                        <span className="step-time">{step.durationSeconds}s</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Real-time Terminal Log Viewer */}
              <div className="workflow-log-viewer">
                <div className="log-viewer-header">
                  <Terminal size={12} className="log-term-icon" />
                  <span>Execution Logs ({selectedJob?.name})</span>
                </div>
                <div className="log-terminal custom-scrollbar">
                  {jobLogs.map((line, idx) => (
                    <div
                      key={idx}
                      className={`log-line ${
                        line.includes('[SUCCESS]')
                          ? 'success'
                          : line.includes('[STEP')
                          ? 'step'
                          : line.includes('[RUNNING]')
                          ? 'running'
                          : line.includes('[INFO]')
                          ? 'info'
                          : ''
                      }`}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trigger Workflow Dispatch Modal */}
      {isDispatchModalOpen && (
        <div className="dispatch-modal-overlay">
          <div className="dispatch-modal glass-panel">
            <div className="dispatch-modal-header">
              <div className="dispatch-modal-title">
                <Play size={14} fill="currentColor" color="#0A84FF" />
                <span>Run GitHub Actions Workflow</span>
              </div>
              <button className="close-btn" onClick={() => setIsDispatchModalOpen(false)}>
                ✕
              </button>
            </div>

            <div className="dispatch-modal-body">
              <label className="input-label">Workflow to trigger:</label>
              <select
                className="dispatch-input glass-interactive"
                value={dispatchWorkflowId}
                onChange={(e) => setDispatchWorkflowId(e.target.value)}
              >
                {workflows.map((wf) => (
                  <option key={wf.id} value={wf.id}>
                    {wf.name} ({wf.path})
                  </option>
                ))}
              </select>

              <label className="input-label">Target Branch / Ref:</label>
              <input
                type="text"
                className="dispatch-input text"
                value={dispatchBranch}
                onChange={(e) => setDispatchBranch(e.target.value)}
                placeholder="master"
              />

              <label className="input-label">Release Tag / Matrix Parameter (optional):</label>
              <input
                type="text"
                className="dispatch-input text"
                value={dispatchTagInput}
                onChange={(e) => setDispatchTagInput(e.target.value)}
                placeholder="v4.1.0"
              />
            </div>

            <div className="dispatch-modal-footer">
              <button
                className="dispatch-cancel-btn glass-interactive"
                onClick={() => setIsDispatchModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="dispatch-confirm-btn glass-interactive"
                onClick={handleTriggerDispatch}
              >
                <Play size={12} fill="currentColor" />
                <span>Trigger Workflow Run</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .git-graph-view {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          background: rgba(10, 14, 24, 0.4);
        }

        .git-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
          border-radius: 6px;
          background: rgba(10, 132, 255, 0.15);
          border: 1px solid rgba(10, 132, 255, 0.3);
          color: #5AC8FA;
          font-size: 11px;
          font-weight: 600;
        }

        .branch-icon {
          color: #0A84FF;
        }

        .sync-badge {
          display: flex;
          gap: 4px;
          font-size: 10px;
          font-weight: 600;
          color: #30D158;
          background: rgba(48, 209, 88, 0.12);
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid rgba(48, 209, 88, 0.25);
        }

        .git-header-right {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .icon-btn {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid transparent;
          color: rgba(235, 235, 245, 0.7);
          border-radius: 4px;
          cursor: pointer;
        }

        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #FFFFFF;
        }

        .git-tab-switcher {
          display: flex;
          padding: 4px 8px;
          gap: 4px;
          background: rgba(0, 0, 0, 0.22);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .switcher-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 5px 6px;
          font-size: 11px;
          font-weight: 500;
          color: rgba(235, 235, 245, 0.65);
          border-radius: 5px;
          border: none;
          background: transparent;
          cursor: pointer;
          position: relative;
          transition: all 0.15s ease;
        }

        .switcher-tab:hover {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.06);
        }

        .switcher-tab.active {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .tab-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #5AC8FA;
          box-shadow: 0 0 6px #5AC8FA;
          animation: pulse 1.5s infinite;
        }

        .git-content {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .changes-mode {
          padding: 10px;
          gap: 12px;
        }

        .commit-box {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .commit-textarea {
          width: 100%;
          resize: none;
          font-size: 11.5px;
          padding: 6px 8px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          color: #FFFFFF;
          outline: none;
        }

        .commit-textarea:focus {
          border-color: #0A84FF;
        }

        .commit-submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 5px;
          border: 1px solid rgba(10, 132, 255, 0.4);
          background: rgba(10, 132, 255, 0.25);
          color: #FFFFFF;
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
          justify-content: space-between;
          padding: 4px 0;
          cursor: pointer;
        }

        .sec-header-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .section-title {
          font-size: 10.5px;
          font-weight: 700;
          color: rgba(235, 235, 245, 0.6);
        }

        .sec-action-link {
          font-size: 10px;
          color: #5AC8FA;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .sec-action-link:hover { text-decoration: underline; }

        .badge {
          font-size: 10px;
          padding: 1px 6px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(235, 235, 245, 0.7);
        }

        .badge.emerald {
          background: rgba(48, 209, 88, 0.2);
          color: #30D158;
        }

        .file-changes-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .file-change-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 6px;
          border-radius: 4px;
          font-size: 11.5px;
          cursor: pointer;
        }

        .file-change-row:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .file-path {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #FFFFFF;
        }

        .status-code {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          font-weight: 700;
          width: 14px;
        }

        .status-code.m { color: #FF9F0A; }
        .status-code.a { color: #30D158; }
        .status-code.d { color: #FF453A; }
        .status-code.u { color: #5AC8FA; }

        .row-action-btn {
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 3px;
          color: rgba(235, 235, 245, 0.7);
          cursor: pointer;
        }

        .row-action-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #FFFFFF;
        }

        /* Subway Graph */
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
          background: rgba(255, 255, 255, 0.04);
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
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: #5AC8FA;
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
          color: #FFFFFF;
          background: rgba(48, 209, 88, 0.25);
          border: 1px solid rgba(48, 209, 88, 0.4);
          padding: 0 4px;
          border-radius: 3px;
        }

        .commit-msg {
          font-size: 11.5px;
          font-weight: 500;
          color: #FFFFFF;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .commit-bottom-line {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: rgba(235, 235, 245, 0.4);
        }

        .selected-commit-drawer {
          padding: 10px 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(10, 14, 24, 0.9);
        }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .drawer-hash {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          color: #0A84FF;
        }

        .close-btn {
          border: none;
          background: transparent;
          color: rgba(235, 235, 245, 0.5);
          cursor: pointer;
        }

        .drawer-message {
          font-size: 12px;
          color: #FFFFFF;
          margin-bottom: 6px;
        }

        .drawer-meta {
          display: flex;
          flex-direction: column;
          font-size: 10px;
          color: rgba(235, 235, 245, 0.5);
        }

        /* Workflows Mode */
        .workflows-mode {
          padding: 10px;
          gap: 10px;
        }

        .workflow-toolbar {
          display: flex;
          gap: 6px;
        }

        .workflow-select {
          flex: 1;
          padding: 5px 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 5px;
          color: #FFFFFF;
          font-size: 11px;
          outline: none;
        }

        .run-dispatch-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          background: linear-gradient(135deg, #0A84FF 0%, #0066CC 100%);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 5px;
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .section-label {
          font-size: 10px;
          font-weight: 700;
          color: rgba(235, 235, 245, 0.5);
          margin-bottom: 6px;
        }

        .runs-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .run-card {
          padding: 8px 10px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          gap: 4px;
          cursor: pointer;
        }

        .run-card:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .run-card.active {
          background: rgba(10, 132, 255, 0.15);
          border-color: rgba(10, 132, 255, 0.35);
        }

        .run-card-header {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .run-title {
          font-weight: 600;
          font-size: 11.5px;
          color: #FFFFFF;
          flex: 1;
        }

        .run-number {
          font-size: 10px;
          color: rgba(235, 235, 245, 0.5);
          font-family: var(--font-mono, monospace);
        }

        .run-commit-row {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 10.5px;
          color: rgba(235, 235, 245, 0.75);
          overflow: hidden;
        }

        .run-branch-icon { color: #5AC8FA; }
        .run-branch { color: #5AC8FA; font-weight: 600; }
        .run-commit-msg {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .run-footer-row {
          display: flex;
          justify-content: space-between;
          font-size: 9.5px;
          color: rgba(235, 235, 245, 0.4);
        }

        .run-duration {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        /* Run Details & Matrix */
        .run-details-box {
          padding: 8px 10px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .run-details-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .details-title {
          font-size: 11.5px;
          font-weight: 700;
          color: #FFFFFF;
        }

        .details-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 4px;
          color: #FFFFFF;
          font-size: 10px;
          cursor: pointer;
        }

        .jobs-chip-list {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 6px;
        }

        .job-chip {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(235, 235, 245, 0.8);
          font-size: 10.5px;
          cursor: pointer;
        }

        .job-chip.active {
          background: rgba(10, 132, 255, 0.2);
          border-color: rgba(10, 132, 255, 0.4);
          color: #FFFFFF;
        }

        .job-steps-box {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 4px;
          padding: 6px;
        }

        .steps-header {
          display: flex;
          justify-content: space-between;
          font-size: 9.5px;
          font-weight: 700;
          color: rgba(235, 235, 245, 0.45);
          margin-bottom: 4px;
        }

        .steps-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .step-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10.5px;
          padding: 2px 4px;
        }

        .step-num {
          font-size: 9px;
          color: rgba(235, 235, 245, 0.35);
          width: 12px;
        }

        .step-name {
          flex: 1;
          color: rgba(235, 235, 245, 0.9);
        }

        .step-time {
          font-size: 9.5px;
          color: rgba(235, 235, 245, 0.4);
        }

        /* Terminal Log Viewer */
        .workflow-log-viewer {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .log-viewer-header {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          font-weight: 600;
          color: rgba(235, 235, 245, 0.6);
        }

        .log-term-icon { color: #5AC8FA; }

        .log-terminal {
          background: rgba(0, 0, 0, 0.5);
          border-radius: 4px;
          padding: 6px 8px;
          max-height: 120px;
          overflow-y: auto;
          font-family: var(--font-mono, monospace);
          font-size: 9.5px;
          line-height: 1.4;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .log-line {
          color: rgba(235, 235, 245, 0.7);
          white-space: pre-wrap;
          word-break: break-all;
        }

        .log-line.success { color: #30D158; font-weight: 600; }
        .log-line.step { color: #5AC8FA; font-weight: 600; }
        .log-line.running { color: #FF9F0A; }
        .log-line.info { color: rgba(235, 235, 245, 0.5); }

        /* Dispatch Modal */
        .dispatch-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .dispatch-modal {
          width: 90%;
          max-width: 440px;
          background: rgba(14, 18, 30, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
        }

        .dispatch-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dispatch-modal-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          font-size: 13px;
          color: #FFFFFF;
        }

        .dispatch-modal-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-label {
          font-size: 11px;
          color: rgba(235, 235, 245, 0.7);
        }

        .dispatch-input {
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          color: #FFFFFF;
          font-size: 12px;
          outline: none;
        }

        .dispatch-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 6px;
        }

        .dispatch-cancel-btn {
          padding: 6px 12px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(235, 235, 245, 0.8);
          font-size: 11.5px;
          cursor: pointer;
        }

        .dispatch-confirm-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 6px;
          background: linear-gradient(135deg, #0A84FF 0%, #0066CC 100%);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #FFFFFF;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
        }

        .empty-hint {
          font-size: 11px;
          color: rgba(235, 235, 245, 0.4);
          padding: 6px 12px;
          font-style: italic;
        }

        .git-view-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 30px 16px;
          text-align: center;
          gap: 12px;
          color: rgba(235, 235, 245, 0.6);
        }

        .git-empty-icon {
          color: #0A84FF;
          opacity: 0.8;
        }

        .git-view-empty h3 {
          font-size: 13px;
          color: #FFFFFF;
        }

        .git-view-empty p {
          font-size: 11.5px;
          color: rgba(235, 235, 245, 0.5);
          line-height: 1.4;
        }

        .git-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 6px;
          background: #0A84FF;
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        .spinner.cyan {
          color: #5AC8FA;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  )
}

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
import './GitGraphView.css'

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
            {(() => {
              const trackByHash = new Map<string, number>()
              let maxTrack = 0
              for (const c of status.commits) {
                const t = c.trackIndex ?? 0
                trackByHash.set(c.hash, t)
                if (t > maxTrack) maxTrack = t
              }
              const laneGap = 14
              const svgWidth = Math.max(28, (Math.min(maxTrack, 6) + 1) * laneGap + 12)

              return status.commits.map((commit, rowIdx) => {
                const track = Math.min(commit.trackIndex ?? 0, 6)
                const cx = 12 + track * laneGap
                const color = TRACK_COLORS[track % TRACK_COLORS.length]
                const isSelected = selectedCommit?.hash === commit.hash
                const parentTracks = (commit.parents || []).map((p) =>
                  Math.min(trackByHash.get(p) ?? track, 6)
                )

                return (
                  <div
                    key={commit.hash}
                    className={`graph-row glass-interactive ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedCommit(commit)}
                  >
                    <div className="subway-canvas" style={{ minWidth: svgWidth }}>
                      <svg width={svgWidth} height="42" viewBox={`0 0 ${svgWidth} 42`}>
                        {/* Incoming rail from top (unless HEAD/first row) */}
                        {rowIdx > 0 && (
                          <line
                            x1={cx}
                            y1="0"
                            x2={cx}
                            y2="21"
                            stroke={color}
                            strokeWidth="2.2"
                            strokeOpacity="0.65"
                          />
                        )}
                        {/* Outgoing rails / Bezier merge branches to each parent track */}
                        {parentTracks.length > 0 ? (
                          parentTracks.map((pTrack, pIdx) => {
                            const px = 12 + pTrack * laneGap
                            const pColor = TRACK_COLORS[pTrack % TRACK_COLORS.length]
                            if (px === cx) {
                              return (
                                <line
                                  key={pIdx}
                                  x1={cx}
                                  y1="21"
                                  x2={px}
                                  y2="42"
                                  stroke={pColor}
                                  strokeWidth="2.2"
                                  strokeOpacity="0.65"
                                />
                              )
                            }
                            return (
                              <path
                                key={pIdx}
                                d={`M ${cx} 21 C ${cx} 32, ${px} 30, ${px} 42`}
                                fill="none"
                                stroke={pColor}
                                strokeWidth="2.2"
                                strokeOpacity="0.75"
                              />
                            )
                          })
                        ) : (
                          rowIdx < status.commits.length - 1 && (
                            <line
                              x1={cx}
                              y1="21"
                              x2={cx}
                              y2="42"
                              stroke={color}
                              strokeWidth="2.2"
                              strokeOpacity="0.35"
                            />
                          )
                        )}
                        <circle cx={cx} cy="21" r="6" fill={color} fillOpacity="0.35" />
                        <circle cx={cx} cy="21" r="3.5" fill="#FFF" stroke={color} strokeWidth="1.5" />
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
            })
            })()}
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

    </div>
  )
}

import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  ArrowDownToLine,
  ArrowUpFromLine,
  Archive,
  Undo2,
  GitMerge,
  FileDiff,
  Square,
  Tag,
  GitPullRequest,
  Search,
  Copy,
  ExternalLink,
  Sliders,
  AlertTriangle,
  Radio,
  FileCode,
} from 'lucide-react'
import { GitRepoStatus, GitCommit } from '@sdk/types'
import {
  gitWorkflowService,
  WorkflowFile,
  WorkflowRun,
  WorkflowJob,
  GitHubPullRequest,
  GitHubReleaseItem,
  GhCliStatus,
} from '../../services/gitWorkflowService'
import { notificationService } from '../../services/notificationService'
import { MergeStudioModal } from '../Git/MergeStudioModal'
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
  '#FFD60A', // Cyber Gold
]

export const GitGraphView: React.FC<GitGraphViewProps> = ({ workspacePath, onOpenFile }) => {
  const [status, setStatus] = useState<GitRepoStatus | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<'changes' | 'graph' | 'workflows' | 'prs' | 'releases'>('changes')
  const [commitMessage, setCommitMessage] = useState<string>('')
  const [stagedExpanded, setStagedExpanded] = useState<boolean>(true)
  const [changesExpanded, setChangesExpanded] = useState<boolean>(true)
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null)
  const [commitDetail, setCommitDetail] = useState<{ hash: string; stat: string; files: string[]; diff: string } | null>(null)
  const [committing, setCommitting] = useState<boolean>(false)
  const [gitToast, setGitToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)

  // Branch, Stash & Tag state
  const [branches, setBranches] = useState<{ current: string; local: string[]; remote: string[] }>({ current: '', local: [], remote: [] })
  const [showBranchMenu, setShowBranchMenu] = useState<boolean>(false)
  const [newBranchName, setNewBranchName] = useState<string>('')
  const [stashes, setStashes] = useState<Array<{ ref: string; message: string; date: string }>>([])
  const [stashExpanded, setStashExpanded] = useState<boolean>(false)
  const [stashMsg, setStashMsg] = useState<string>('')
  const [tags, setTags] = useState<Array<{ name: string; hash: string; date: string; message: string }>>([])
  const [tagsExpanded, setTagsExpanded] = useState<boolean>(false)
  const [newTagName, setNewTagName] = useState<string>('')
  const [newTagMessage, setNewTagMessage] = useState<string>('')
  const [showTagCreateDrawer, setShowTagCreateDrawer] = useState<boolean>(false)

  // Graph UI enhancements state
  const [graphSearch, setGraphSearch] = useState<string>('')
  const [graphBranchFilter, setGraphBranchFilter] = useState<string>('all')
  const [graphDensity, setGraphDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [resetModalCommit, setResetModalCommit] = useState<string | null>(null)
  const [resetMode, setResetMode] = useState<'soft' | 'mixed' | 'hard'>('mixed')
  const [newBranchAtCommit, setNewBranchAtCommit] = useState<{ hash: string; name: string } | null>(null)

  // Diff Preview & 3-Way Merge Studio state
  const [diffPreview, setDiffPreview] = useState<{ filePath: string; diff: string } | null>(null)
  const [mergeTarget, setMergeTarget] = useState<{ filePath: string; content: string } | null>(null)

  // Workflows & GitHub CLI state
  const [workflows, setWorkflows] = useState<WorkflowFile[]>(() => gitWorkflowService.getWorkflows())
  const [runs, setRuns] = useState<WorkflowRun[]>(() => gitWorkflowService.getRuns())
  const [workflowDataSource, setWorkflowDataSource] = useState(() => gitWorkflowService.getDataSource())
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(() => gitWorkflowService.getSelectedRun())
  const [selectedJob, setSelectedJob] = useState<WorkflowJob | null>(() => gitWorkflowService.getSelectedJob())
  const [jobLogs, setJobLogs] = useState<string[]>([])
  const [selectedWorkflowFilter, setSelectedWorkflowFilter] = useState<string>('all')
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false)
  const [dispatchWorkflowId, setDispatchWorkflowId] = useState<string>('release.yml')
  const [dispatchBranch, setDispatchBranch] = useState<string>('master')
  const [dispatchTagInput, setDispatchTagInput] = useState<string>('')
  const [isLiveWatching, setIsLiveWatching] = useState<boolean>(false)
  const [ghStatus, setGhStatus] = useState<GhCliStatus | null>(null)
  const [showingFailedLogsOnly, setShowingFailedLogsOnly] = useState<boolean>(false)

  // Pull Requests & Releases state
  const [pullRequests, setPullRequests] = useState<GitHubPullRequest[]>([])
  const [releases, setReleases] = useState<GitHubReleaseItem[]>([])
  const [loadingGhData, setLoadingGhData] = useState<boolean>(false)

  const showToast = useCallback((type: 'ok' | 'err', text: string) => {
    setGitToast({ type, text })
    setTimeout(() => setGitToast((prev) => (prev?.text === text ? null : prev)), 4000)
  }, [])

  const copyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash)
      setCopiedHash(hash)
      setTimeout(() => setCopiedHash((curr) => (curr === hash ? null : curr)), 2000)
      showToast('ok', `Copied commit hash ${hash.slice(0, 8)}`)
    } catch {}
  }

  const fetchGitStatus = useCallback(async () => {
    if (!window.electronAPI?.git?.getRepoStatus) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const res = await window.electronAPI.git.getRepoStatus(workspacePath)
      setStatus(res)
      if (res.branch) setDispatchBranch(res.branch)
      if (window.electronAPI.git.branches) {
        const br = await window.electronAPI.git.branches(workspacePath)
        setBranches(br)
      }
      if (window.electronAPI.git.stashList) {
        const st = await window.electronAPI.git.stashList(workspacePath)
        setStashes(st)
      }
      if (window.electronAPI.git.listTags) {
        const tg = await window.electronAPI.git.listTags(workspacePath)
        setTags(tg)
      }
    } catch (err) {
      console.warn('Failed to fetch git status:', err)
    } finally {
      setLoading(false)
    }
  }, [workspacePath])

  const checkGh = useCallback(async () => {
    const status = await gitWorkflowService.checkGhCliStatus(workspacePath)
    setGhStatus(status)
  }, [workspacePath])

  useEffect(() => {
    fetchGitStatus()
    void checkGh()
    void gitWorkflowService.loadWorkspaceWorkflows(workspacePath)
  }, [fetchGitStatus, checkGh, workspacePath])

  // Subscribe to workflow service updates
  useEffect(() => {
    return gitWorkflowService.subscribe(() => {
      const wfs = gitWorkflowService.getWorkflows()
      setWorkflows(wfs)
      if (wfs.length > 0 && !wfs.some((w) => w.id === dispatchWorkflowId)) {
        setDispatchWorkflowId(wfs[0].id)
      }
      setWorkflowDataSource(gitWorkflowService.getDataSource())
      setRuns(gitWorkflowService.getRuns(selectedWorkflowFilter === 'all' ? undefined : selectedWorkflowFilter))
      const run = gitWorkflowService.getSelectedRun()
      setSelectedRun(run)
      const job = gitWorkflowService.getSelectedJob()
      setSelectedJob(job)
      if (run && job) {
        setJobLogs(gitWorkflowService.getJobLogs(run.id, job.id))
      }
    })
  }, [selectedWorkflowFilter, dispatchWorkflowId])

  // Live Watch Poller for GitHub Actions active runs
  useEffect(() => {
    if (!isLiveWatching) return
    const interval = setInterval(async () => {
      await gitWorkflowService.loadWorkspaceWorkflows(workspacePath)
      if (selectedRun?.id) {
        await gitWorkflowService.fetchRunDetailsAsync(selectedRun.id)
        if (selectedJob?.id) {
          const lines = await gitWorkflowService.fetchJobLogsAsync(selectedRun.id, selectedJob.id, showingFailedLogsOnly)
          setJobLogs(lines)
        }
      }
    }, 3500)

    return () => clearInterval(interval)
  }, [isLiveWatching, workspacePath, selectedRun?.id, selectedJob?.id, showingFailedLogsOnly])

  // Load Pull Requests & Releases when respective tabs are opened
  useEffect(() => {
    if (activeTab === 'prs') {
      setLoadingGhData(true)
      gitWorkflowService
        .fetchPullRequestsAsync(workspacePath)
        .then((prs) => setPullRequests(prs))
        .finally(() => setLoadingGhData(false))
    } else if (activeTab === 'releases') {
      setLoadingGhData(true)
      gitWorkflowService
        .fetchReleasesAsync(workspacePath)
        .then((rels) => setReleases(rels))
        .finally(() => setLoadingGhData(false))
    }
  }, [activeTab, workspacePath])

  const handleCheckout = async (branch: string, createNew = false) => {
    if (!window.electronAPI?.git?.checkout || !branch.trim()) return
    const res = await window.electronAPI.git.checkout(branch.trim(), createNew, workspacePath)
    if (res.success) {
      showToast('ok', createNew ? `Created & switched to ${branch}` : `Switched to ${branch}`)
      setShowBranchMenu(false)
      setNewBranchName('')
      await fetchGitStatus()
    } else {
      showToast('err', res.error || 'Checkout failed')
    }
  }

  const handleGitSync = async (action: 'fetch' | 'pull' | 'push') => {
    const fn = window.electronAPI?.git?.[action]
    if (!fn) return
    setLoading(true)
    try {
      const res = await fn(workspacePath)
      if (res.success) {
        showToast('ok', `git ${action} succeeded${res.output ? `: ${res.output.slice(0, 80)}` : ''}`)
        await fetchGitStatus()
      } else {
        showToast('err', res.error || `git ${action} failed`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDiscardFile = async (filePath: string, isUntracked: boolean) => {
    if (!window.electronAPI?.git?.discardFile) return
    const res = await window.electronAPI.git.discardFile(filePath, isUntracked, workspacePath)
    if (res.success) {
      showToast('ok', `Discarded changes in ${filePath}`)
      await fetchGitStatus()
    } else {
      showToast('err', res.error || 'Discard failed')
    }
  }

  const handlePreviewDiff = async (filePath: string, staged: boolean) => {
    if (!window.electronAPI?.git?.diff) return
    const diff = await window.electronAPI.git.diff({ filePath, staged, cwd: workspacePath })
    setDiffPreview({ filePath, diff: diff || '(No diff output — untracked or binary file)' })
  }

  const handleOpenMergeStudio = async (relPath: string) => {
    if (!window.electronAPI?.readFile) return
    const fullPath = workspacePath ? `${workspacePath.replace(/[/\\]+$/, '')}/${relPath}` : relPath
    try {
      const content = await window.electronAPI.readFile(fullPath)
      setMergeTarget({ filePath: fullPath, content })
    } catch (err: any) {
      showToast('err', `Could not read ${relPath}: ${err?.message || err}`)
    }
  }

  const handleStashSave = async () => {
    if (!window.electronAPI?.git?.stashSave) return
    const res = await window.electronAPI.git.stashSave(stashMsg || undefined, workspacePath)
    if (res.success) {
      setStashMsg('')
      showToast('ok', 'Saved working tree to stash')
      await fetchGitStatus()
    } else {
      showToast('err', res.error || 'Stash save failed')
    }
  }

  const handleStashPop = async (ref: string) => {
    if (!window.electronAPI?.git?.stashPop) return
    const res = await window.electronAPI.git.stashPop(ref, workspacePath)
    if (res.success) {
      showToast('ok', `Applied ${ref}`)
      await fetchGitStatus()
    } else {
      showToast('err', res.error || 'Stash pop failed')
    }
  }

  const handleStashDrop = async (ref: string) => {
    if (!window.electronAPI?.git?.stashDrop) return
    const res = await window.electronAPI.git.stashDrop(ref, workspacePath)
    if (res.success) {
      showToast('ok', `Dropped ${ref}`)
      await fetchGitStatus()
    } else {
      showToast('err', res.error || 'Stash drop failed')
    }
  }

  const handleCreateTag = async () => {
    if (!window.electronAPI?.git?.createTag || !newTagName.trim()) return
    const res = await window.electronAPI.git.createTag(
      newTagName.trim(),
      newTagMessage.trim() || undefined,
      selectedCommit?.hash || undefined,
      workspacePath
    )
    if (res.success) {
      showToast('ok', `Created tag ${newTagName.trim()}`)
      setNewTagName('')
      setNewTagMessage('')
      setShowTagCreateDrawer(false)
      await fetchGitStatus()
    } else {
      showToast('err', res.error || 'Tag creation failed')
    }
  }

  const handleDeleteTag = async (tagName: string) => {
    if (!window.electronAPI?.git?.deleteTag) return
    const res = await window.electronAPI.git.deleteTag(tagName, workspacePath)
    if (res.success) {
      showToast('ok', `Deleted tag ${tagName}`)
      await fetchGitStatus()
    } else {
      showToast('err', res.error || 'Tag deletion failed')
    }
  }

  const handleResetToCommit = async () => {
    if (!window.electronAPI?.git?.resetToCommit || !resetModalCommit) return
    const res = await window.electronAPI.git.resetToCommit(resetModalCommit, resetMode, workspacePath)
    if (res.success) {
      showToast('ok', `Reset to ${resetModalCommit.slice(0, 8)} (${resetMode})`)
      setResetModalCommit(null)
      await fetchGitStatus()
    } else {
      showToast('err', res.error || 'Reset failed')
    }
  }

  const handleCreateBranchAtCommit = async () => {
    if (!newBranchAtCommit?.name.trim() || !window.electronAPI?.git?.checkout) return
    const { hash, name } = newBranchAtCommit
    try {
      if (window.electronAPI?.workspace?.execCommand) {
        const res = await window.electronAPI.workspace.execCommand({
          command: `git branch ${name.trim()} ${hash}`,
          cwd: workspacePath,
        })
        if (res.exitCode === 0) {
          showToast('ok', `Created branch ${name.trim()} at ${hash.slice(0, 7)}`)
          setNewBranchAtCommit(null)
          await fetchGitStatus()
          return
        }
      }
      showToast('err', 'Failed to create branch at commit')
    } catch (err: any) {
      showToast('err', err?.message || 'Branch creation failed')
    }
  }

  const handleSelectCommit = async (commit: GitCommit) => {
    setSelectedCommit(commit)
    setCommitDetail(null)
    if (window.electronAPI?.git?.showCommit) {
      const detail = await window.electronAPI.git.showCommit(commit.hash, workspacePath)
      setCommitDetail(detail)
    }
  }

  const handleCommitAction = async (action: 'cherryPick' | 'revert', hash: string) => {
    const fn = window.electronAPI?.git?.[action]
    if (!fn) return
    const res = await fn(hash, workspacePath)
    if (res.success) {
      showToast('ok', `${action === 'cherryPick' ? 'Cherry-picked' : 'Reverted'} ${hash.slice(0, 7)}`)
      await fetchGitStatus()
    } else {
      showToast('err', res.error || `${action} failed`)
    }
  }

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

  const handleTriggerDispatch = async () => {
    const res = await gitWorkflowService.triggerWorkflowAsync(
      dispatchWorkflowId,
      dispatchBranch,
      dispatchTagInput.trim() ? { tag: dispatchTagInput.trim() } : {}
    )
    showToast(res.ok ? 'ok' : 'err', res.message)
    setIsDispatchModalOpen(false)
    setActiveTab('workflows')
  }

  const handleSelectRun = async (run: WorkflowRun) => {
    gitWorkflowService.setSelectedRunId(run.id)
    setSelectedRun(run)
    // Deep populate jobs & steps from gh run view
    const enriched = await gitWorkflowService.fetchRunDetailsAsync(run.id)
    if (enriched && enriched.jobs.length > 0) {
      setSelectedJob(enriched.jobs[0])
      const lines = await gitWorkflowService.fetchJobLogsAsync(run.id, enriched.jobs[0].id, showingFailedLogsOnly)
      setJobLogs(lines)
    }
  }

  const handleSelectJob = async (job: WorkflowJob) => {
    gitWorkflowService.setSelectedJobId(job.id)
    setSelectedJob(job)
    if (selectedRun) {
      const lines = await gitWorkflowService.fetchJobLogsAsync(selectedRun.id, job.id, showingFailedLogsOnly)
      setJobLogs(lines)
    }
  }

  const handleToggleFailedLogs = async () => {
    const next = !showingFailedLogsOnly
    setShowingFailedLogsOnly(next)
    if (selectedRun && selectedJob) {
      const lines = await gitWorkflowService.fetchJobLogsAsync(selectedRun.id, selectedJob.id, next)
      setJobLogs(lines)
    }
  }

  const handleRerunFailedJobs = async (runId: string) => {
    const res = await gitWorkflowService.rerunFailedJobsAsync(runId)
    showToast(res.ok ? 'ok' : 'err', res.message)
  }

  const handleCheckoutPr = async (prNumber: number) => {
    const res = await gitWorkflowService.checkoutPullRequestAsync(prNumber, workspacePath)
    showToast(res.ok ? 'ok' : 'err', res.message)
    if (res.ok) await fetchGitStatus()
  }

  // Filter commits for graph view
  const filteredCommits = useMemo(() => {
    if (!status?.commits) return []
    let list = status.commits
    if (graphBranchFilter !== 'all' && status.branch) {
      list = list.filter((c) => c.refs.includes(status.branch) || c.refs.includes(`origin/${status.branch}`))
    }
    if (graphSearch.trim()) {
      const q = graphSearch.toLowerCase()
      list = list.filter(
        (c) =>
          c.message.toLowerCase().includes(q) ||
          c.authorName.toLowerCase().includes(q) ||
          c.hash.toLowerCase().includes(q) ||
          c.shortHash.toLowerCase().includes(q)
      )
    }
    return list
  }, [status?.commits, status?.branch, graphBranchFilter, graphSearch])

  if (loading && !status) {
    return (
      <div className="git-view-empty">
        <RotateCw size={18} className="spinner" />
        <span>Scanning Git repository & GitHub services...</span>
      </div>
    )
  }

  if (!status?.isRepo) {
    return (
      <div className="git-view-empty">
        <FolderGit2 size={32} className="git-empty-icon" />
        <h3>No Git Repository Detected</h3>
        <p>Initialize version control to track changes, view visual commit graphs, and stream GitHub CI/CD runs.</p>
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
        <div className="git-header-left" style={{ position: 'relative' }}>
          <button
            className="git-branch-pill glass-interactive"
            onClick={() => setShowBranchMenu((v) => !v)}
            title="Switch or Create Branch"
            style={{ cursor: 'pointer', border: 'none' }}
          >
            <GitBranch size={13} className="branch-icon" />
            <span className="branch-name">{status.branch || 'master'}</span>
            <ChevronDown size={11} />
          </button>
          {(status.ahead > 0 || status.behind > 0) && (
            <div className="sync-badge">
              {status.ahead > 0 && <span className="sync-up">↑ {status.ahead}</span>}
              {status.behind > 0 && <span className="sync-down">↓ {status.behind}</span>}
            </div>
          )}
          {ghStatus?.installed && (
            <div className="gh-connected-pill" title={`GitHub CLI active${ghStatus.account ? ` as @${ghStatus.account}` : ''}`}>
              <span className="gh-dot-active" />
              <span>gh {ghStatus.account ? `@${ghStatus.account}` : 'v' + (ghStatus.version || '')}</span>
            </div>
          )}
        </div>

        <div className="git-header-right">
          <button className="icon-btn" onClick={() => void handleGitSync('pull')} title="Git Pull">
            <ArrowDownToLine size={12} />
          </button>
          <button className="icon-btn" onClick={() => void handleGitSync('push')} title="Git Push">
            <ArrowUpFromLine size={12} />
          </button>
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

      {/* GitHub CLI Missing Banner */}
      {ghStatus && !ghStatus.installed && (
        <div className="gh-missing-banner glass-panel">
          <div className="gh-banner-left">
            <AlertTriangle size={13} color="#FF9F0A" />
            <span>GitHub CLI (`gh`) not detected in PATH.</span>
          </div>
          <div className="gh-banner-right">
            <button
              className="gh-banner-btn primary"
              onClick={() => window.open('https://cli.github.com', '_blank')}
            >
              Install gh
            </button>
            <button
              className="gh-banner-btn secondary"
              onClick={() => {
                notificationService.notifyGitHubCliMissing()
                showToast('ok', 'Pinned GitHub CLI setup to Notification Center')
              }}
              title="Pin alert to Notification Center"
            >
              Notify Me
            </button>
          </div>
        </div>
      )}

      {/* Inline Branch Switcher / Create Drawer */}
      {showBranchMenu && (
        <div className="glass-panel" style={{ margin: '0 8px 6px', padding: 8, borderRadius: 8, fontSize: 11 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            <input
              type="text"
              className="commit-textarea glass-input"
              style={{ flex: 1, padding: '3px 6px', fontSize: 11 }}
              placeholder="New branch name..."
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newBranchName.trim()) void handleCheckout(newBranchName, true)
              }}
            />
            <button
              className="sec-action-link"
              onClick={() => void handleCheckout(newBranchName, true)}
              disabled={!newBranchName.trim()}
            >
              + Create
            </button>
            <button className="sec-action-link" onClick={() => void handleGitSync('fetch')}>
              Fetch
            </button>
          </div>
          <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {branches.local.map((b) => (
              <button
                key={b}
                className="file-change-row glass-interactive"
                style={{ textAlign: 'left', border: 'none', background: b === branches.current ? 'rgba(10,132,255,0.2)' : 'transparent', color: '#E2E8F0', cursor: 'pointer' }}
                onClick={() => void handleCheckout(b, false)}
              >
                <GitBranch size={11} />
                <span style={{ flex: 1 }}>{b}</span>
                {b === branches.current && <Check size={11} color="#30D158" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {gitToast && (
        <div
          style={{
            margin: '0 8px 6px',
            padding: '5px 8px',
            borderRadius: 6,
            fontSize: 11,
            color: gitToast.type === 'ok' ? '#30D158' : '#FF453A',
            background: gitToast.type === 'ok' ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.14)',
          }}
        >
          {gitToast.text}
        </div>
      )}

      {/* 5-Mode Switcher Tabs */}
      <div className="git-tab-switcher">
        <button
          className={`switcher-tab ${activeTab === 'changes' ? 'active' : ''}`}
          onClick={() => setActiveTab('changes')}
          title="Staged & Working Tree Changes"
        >
          <Layers size={13} />
          <span>Changes ({totalChanges})</span>
        </button>
        <button
          className={`switcher-tab ${activeTab === 'graph' ? 'active' : ''}`}
          onClick={() => setActiveTab('graph')}
          title="Subway-Map Visual Commit Graph"
        >
          <GitCommitIcon size={13} />
          <span>Graph ({status.commits.length})</span>
        </button>
        <button
          className={`switcher-tab workflows-tab ${activeTab === 'workflows' ? 'active' : ''}`}
          onClick={() => setActiveTab('workflows')}
          title="GitHub Actions CI/CD Pipeline Monitor"
        >
          <Workflow size={13} />
          <span>Workflows</span>
          {activeRunsCount > 0 && <span className="tab-pulse-dot" />}
        </button>
        <button
          className={`switcher-tab ${activeTab === 'prs' ? 'active' : ''}`}
          onClick={() => setActiveTab('prs')}
          title="GitHub Pull Requests"
        >
          <GitPullRequest size={13} />
          <span>PRs</span>
        </button>
        <button
          className={`switcher-tab ${activeTab === 'releases' ? 'active' : ''}`}
          onClick={() => setActiveTab('releases')}
          title="GitHub Releases"
        >
          <Tag size={13} />
          <span>Releases</span>
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
                        className="row-action-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          void handlePreviewDiff(file.path, true)
                        }}
                        title="Preview Staged Diff"
                      >
                        <FileDiff size={11} />
                      </button>
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
                      {file.status === 'U' && (
                        <button
                          className="row-action-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleOpenMergeStudio(file.path)
                          }}
                          title="Resolve Conflict in 3-Way Merge Studio"
                        >
                          <GitMerge size={11} color="#BF5AF2" />
                        </button>
                      )}
                      <button
                        className="row-action-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          void handlePreviewDiff(file.path, false)
                        }}
                        title="Preview File Diff"
                      >
                        <FileDiff size={11} />
                      </button>
                      <button
                        className="row-action-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleDiscardFile(file.path, file.status === '?')
                        }}
                        title="Discard Working Tree Changes"
                      >
                        <Undo2 size={11} />
                      </button>
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

          {/* Diff Preview Drawer */}
          {diffPreview && (
            <div className="selected-commit-drawer glass-panel" style={{ marginTop: 8 }}>
              <div className="drawer-header">
                <span className="drawer-hash">DIFF: {diffPreview.filePath}</span>
                <button className="close-btn" onClick={() => setDiffPreview(null)}>
                  ✕
                </button>
              </div>
              <pre style={{ fontSize: 10.5, fontFamily: 'monospace', maxHeight: 180, overflow: 'auto', margin: 0, whiteSpace: 'pre-wrap' }}>
                {diffPreview.diff}
              </pre>
            </div>
          )}

          {/* Stashes Section */}
          <div className="changes-section" style={{ marginTop: 8 }}>
            <div className="section-header" onClick={() => setStashExpanded((v) => !v)}>
              <div className="sec-header-left">
                {stashExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Archive size={12} />
                <span className="section-title">STASHES</span>
                <span className="badge">{stashes.length}</span>
              </div>
            </div>
            {stashExpanded && (
              <div style={{ padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input
                    type="text"
                    className="commit-textarea glass-input"
                    style={{ flex: 1, padding: '3px 6px', fontSize: 11 }}
                    placeholder="Stash message (optional)..."
                    value={stashMsg}
                    onChange={(e) => setStashMsg(e.target.value)}
                  />
                  <button className="sec-action-link" onClick={() => void handleStashSave()}>
                    Save
                  </button>
                </div>
                {stashes.length === 0 ? (
                  <div className="empty-hint">No stashes saved</div>
                ) : (
                  stashes.map((s) => (
                    <div key={s.ref} className="file-change-row glass-interactive" style={{ fontSize: 11 }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <strong>{s.ref}</strong> {s.message}
                      </span>
                      <button className="sec-action-link" onClick={() => void handleStashPop(s.ref)}>
                        Pop
                      </button>
                      <button className="sec-action-link" onClick={() => void handleStashDrop(s.ref)}>
                        Drop
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Enhanced Visual Subway-Map Git Graph Mode */}
      {activeTab === 'graph' && (
        <div className="git-content graph-mode custom-scrollbar">
          {/* Graph Toolbar with Search, Branch Filter & Density Toggle */}
          <div className="graph-toolbar glass-panel">
            <div className="graph-search-box">
              <Search size={11} className="search-icon" />
              <input
                type="text"
                placeholder="Search commits by message, author, or hash..."
                value={graphSearch}
                onChange={(e) => setGraphSearch(e.target.value)}
              />
              {graphSearch && (
                <button className="clear-search-btn" onClick={() => setGraphSearch('')}>
                  ✕
                </button>
              )}
            </div>

            <div className="graph-toolbar-actions">
              <select
                className="graph-filter-select glass-interactive"
                value={graphBranchFilter}
                onChange={(e) => setGraphBranchFilter(e.target.value)}
                title="Filter by branch"
              >
                <option value="all">All Branches</option>
                {status.branch && <option value={status.branch}>Current ({status.branch})</option>}
              </select>

              <button
                className={`density-toggle-btn glass-interactive ${graphDensity === 'compact' ? 'active' : ''}`}
                onClick={() => setGraphDensity((d) => (d === 'comfortable' ? 'compact' : 'comfortable'))}
                title={`Row Density: ${graphDensity}`}
              >
                <Sliders size={11} />
                <span>{graphDensity === 'compact' ? 'Compact' : 'Comfy'}</span>
              </button>

              <button
                className="density-toggle-btn glass-interactive"
                onClick={() => setTagsExpanded((t) => !t)}
                title="View & manage repository tags"
              >
                <Tag size={11} />
                <span>Tags ({tags.length})</span>
              </button>
            </div>
          </div>

          {/* Tags Drawer in Graph View */}
          {tagsExpanded && (
            <div className="tags-drawer glass-panel">
              <div className="tags-drawer-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Tag size={12} color="#FFD60A" />
                  <span style={{ fontWeight: 600, fontSize: 11 }}>REPOSITORY TAGS</span>
                </div>
                <button
                  className="sec-action-link"
                  onClick={() => setShowTagCreateDrawer((v) => !v)}
                >
                  {showTagCreateDrawer ? 'Cancel' : '+ New Tag'}
                </button>
              </div>

              {showTagCreateDrawer && (
                <div className="tag-create-form">
                  <input
                    type="text"
                    className="tag-input glass-input"
                    placeholder="Tag name (e.g. v6.2.0)..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                  />
                  <input
                    type="text"
                    className="tag-input glass-input"
                    placeholder="Annotation message (optional)..."
                    value={newTagMessage}
                    onChange={(e) => setNewTagMessage(e.target.value)}
                  />
                  <button
                    className="tag-submit-btn glass-interactive"
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim()}
                  >
                    Create Tag
                  </button>
                </div>
              )}

              <div className="tags-chips-list">
                {tags.length === 0 ? (
                  <div className="empty-hint">No tags created yet</div>
                ) : (
                  tags.map((t) => (
                    <div key={t.name} className="tag-chip glass-interactive">
                      <Tag size={10} color="#FFD60A" />
                      <span className="tag-name">{t.name}</span>
                      <span className="tag-hash">{t.hash}</span>
                      <button
                        className="tag-del-btn"
                        onClick={() => handleDeleteTag(t.name)}
                        title={`Delete tag ${t.name}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Visual Subway Commit Rows */}
          <div className={`graph-commit-list density-${graphDensity}`}>
            {(() => {
              const trackByHash = new Map<string, number>()
              let maxTrack = 0
              for (const c of filteredCommits) {
                const t = c.trackIndex ?? 0
                trackByHash.set(c.hash, t)
                if (t > maxTrack) maxTrack = t
              }
              const laneGap = 16
              const svgWidth = Math.max(32, (Math.min(maxTrack, 7) + 1) * laneGap + 12)
              const rowHeight = graphDensity === 'compact' ? 32 : 44
              const centerY = rowHeight / 2

              if (filteredCommits.length === 0) {
                return (
                  <div className="empty-hint" style={{ padding: 24, textAlign: 'center' }}>
                    No commits match "{graphSearch}".
                  </div>
                )
              }

              return filteredCommits.map((commit, rowIdx) => {
                const track = Math.min(commit.trackIndex ?? 0, 7)
                const cx = 14 + track * laneGap
                const color = TRACK_COLORS[track % TRACK_COLORS.length]
                const isSelected = selectedCommit?.hash === commit.hash
                const isHead = rowIdx === 0
                const isMerge = (commit.parents || []).length > 1
                const parentTracks = (commit.parents || []).map((p) =>
                  Math.min(trackByHash.get(p) ?? track, 7)
                )

                // Author Initials Avatar
                const initials = (commit.authorName || 'Dev')
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()

                return (
                  <div
                    key={commit.hash}
                    className={`graph-row glass-interactive ${isSelected ? 'selected' : ''} ${isHead ? 'is-head' : ''}`}
                    onClick={() => void handleSelectCommit(commit)}
                  >
                    <div className="subway-canvas" style={{ minWidth: svgWidth, width: svgWidth }}>
                      <svg width={svgWidth} height={rowHeight} viewBox={`0 0 ${svgWidth} ${rowHeight}`}>
                        {/* Smooth Incoming rail from top (unless HEAD/first row) */}
                        {rowIdx > 0 && (
                          <line
                            x1={cx}
                            y1="0"
                            x2={cx}
                            y2={centerY}
                            stroke={color}
                            strokeWidth="2.5"
                            strokeOpacity="0.75"
                            strokeLinecap="round"
                          />
                        )}

                        {/* Smooth Bezier curves to parents */}
                        {parentTracks.length > 0 ? (
                          parentTracks.map((pTrack, pIdx) => {
                            const px = 14 + pTrack * laneGap
                            const pColor = TRACK_COLORS[pTrack % TRACK_COLORS.length]
                            if (px === cx) {
                              return (
                                <line
                                  key={pIdx}
                                  x1={cx}
                                  y1={centerY}
                                  x2={px}
                                  y2={rowHeight}
                                  stroke={pColor}
                                  strokeWidth="2.5"
                                  strokeOpacity="0.75"
                                  strokeLinecap="round"
                                />
                              )
                            }
                            return (
                              <path
                                key={pIdx}
                                d={`M ${cx} ${centerY} C ${cx} ${centerY + 10}, ${px} ${centerY + 4}, ${px} ${rowHeight}`}
                                fill="none"
                                stroke={pColor}
                                strokeWidth="2.5"
                                strokeOpacity="0.8"
                                strokeLinecap="round"
                              />
                            )
                          })
                        ) : (
                          rowIdx < filteredCommits.length - 1 && (
                            <line
                              x1={cx}
                              y1={centerY}
                              x2={cx}
                              y2={rowHeight}
                              stroke={color}
                              strokeWidth="2.5"
                              strokeOpacity="0.4"
                              strokeLinecap="round"
                            />
                          )
                        )}

                        {/* Commit Node with glow and specular ring */}
                        {isHead && (
                          <circle
                            cx={cx}
                            cy={centerY}
                            r="9"
                            fill="none"
                            stroke="#0A84FF"
                            strokeWidth="1.2"
                            strokeDasharray="2,2"
                            className="head-pulse-halo"
                          />
                        )}
                        <circle cx={cx} cy={centerY} r="6.5" fill={color} fillOpacity="0.4" />
                        <circle
                          cx={cx}
                          cy={centerY}
                          r={isMerge ? '4.5' : '3.8'}
                          fill={isMerge ? color : '#FFFFFF'}
                          stroke={isMerge ? '#FFFFFF' : color}
                          strokeWidth="1.8"
                        />
                        {isMerge && (
                          <circle cx={cx} cy={centerY} r="1.5" fill="#FFFFFF" />
                        )}
                      </svg>
                    </div>

                    <div className="graph-commit-info">
                      <div className="commit-top-line">
                        <button
                          className="commit-hash-pill"
                          onClick={(e) => {
                            e.stopPropagation()
                            void copyHash(commit.hash)
                          }}
                          title="Click to copy SHA-1 hash"
                        >
                          <Copy size={9} />
                          <span>{commit.shortHash}</span>
                        </button>

                        {commit.refs.length > 0 && (
                          <div className="refs-container">
                            {commit.refs.map((ref) => {
                              const isTag = ref.startsWith('tag: ') || tags.some((t) => t.name === ref)
                              const cleanRef = ref.replace(/^tag:\s*/, '')
                              return (
                                <span
                                  key={ref}
                                  className={`ref-pill ${isTag ? 'is-tag' : 'is-branch'}`}
                                >
                                  {isTag ? <Tag size={9} /> : <GitBranch size={9} />}
                                  <span>{cleanRef}</span>
                                </span>
                              )
                            })}
                          </div>
                        )}

                        <span className="commit-msg">{commit.message}</span>
                      </div>

                      <div className="commit-bottom-line">
                        <span className="author-avatar-chip" title={commit.authorEmail}>
                          {initials}
                        </span>
                        <span className="commit-author">{commit.authorName}</span>
                        <span className="commit-date" title={new Date(commit.date).toLocaleString()}>
                          {commit.relativeDate}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
          </div>

          {/* Selected Commit Rich Inspector Drawer */}
          {selectedCommit && (
            <div className="selected-commit-drawer glass-panel">
              <div className="drawer-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <GitCommitIcon size={13} color="#0A84FF" />
                  <span className="drawer-hash">{selectedCommit.hash.substring(0, 10)}</span>
                  <button
                    className="copy-hash-btn"
                    onClick={() => void copyHash(selectedCommit.hash)}
                    title="Copy full 40-char SHA"
                  >
                    <Copy size={10} />
                    <span>{copiedHash === selectedCommit.hash ? 'Copied' : 'Copy SHA'}</span>
                  </button>
                </div>
                <button className="close-btn" onClick={() => setSelectedCommit(null)}>
                  ✕
                </button>
              </div>

              <p className="drawer-message">{selectedCommit.message}</p>
              <div className="drawer-meta">
                <span>By {selectedCommit.authorName} &lt;{selectedCommit.authorEmail}&gt;</span>
                <span>{new Date(selectedCommit.date).toLocaleString()}</span>
              </div>

              {/* Action Buttons for Commit */}
              <div className="commit-action-strip">
                <button
                  className="details-btn glass-interactive"
                  onClick={() => void handleCommitAction('cherryPick', selectedCommit.hash)}
                  title="Cherry-pick this commit into current branch"
                >
                  Cherry-Pick
                </button>
                <button
                  className="details-btn glass-interactive"
                  onClick={() => void handleCommitAction('revert', selectedCommit.hash)}
                  title="Create revert commit"
                >
                  Revert
                </button>
                <button
                  className="details-btn glass-interactive"
                  onClick={() => setNewBranchAtCommit({ hash: selectedCommit.hash, name: '' })}
                  title="Create branch pointing to this commit"
                >
                  Branch Here
                </button>
                <button
                  className="details-btn glass-interactive"
                  onClick={() => {
                    setNewTagName(`v-${selectedCommit.shortHash}`)
                    setShowTagCreateDrawer(true)
                  }}
                  title="Create tag on this commit"
                >
                  Tag Here
                </button>
                <button
                  className="details-btn glass-interactive reset-btn"
                  onClick={() => setResetModalCommit(selectedCommit.hash)}
                  title="Reset HEAD to this commit"
                >
                  Reset...
                </button>
              </div>

              {/* Inline Branch Creation at Selected Commit */}
              {newBranchAtCommit && newBranchAtCommit.hash === selectedCommit.hash && (
                <div className="inline-branch-form glass-panel">
                  <input
                    type="text"
                    className="branch-name-input glass-input"
                    placeholder="New branch name..."
                    value={newBranchAtCommit.name}
                    onChange={(e) =>
                      setNewBranchAtCommit({ hash: newBranchAtCommit.hash, name: e.target.value })
                    }
                  />
                  <button
                    className="sec-action-link"
                    onClick={handleCreateBranchAtCommit}
                    disabled={!newBranchAtCommit.name.trim()}
                  >
                    Create Branch
                  </button>
                  <button className="sec-action-link" onClick={() => setNewBranchAtCommit(null)}>
                    Cancel
                  </button>
                </div>
              )}

              {/* Changed Files Breakdown */}
              {commitDetail && commitDetail.files.length > 0 && (
                <div className="commit-files-section">
                  <div className="files-header-label">
                    <span>CHANGED FILES ({commitDetail.files.length})</span>
                  </div>
                  <div className="commit-files-list custom-scrollbar">
                    {commitDetail.files.map((fp) => (
                      <div
                        key={fp}
                        className="commit-file-item glass-interactive"
                        onClick={() => onOpenFile?.(fp)}
                      >
                        <FileCode size={11} color="#64D2FF" />
                        <span className="file-name">{fp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reset Confirmation Modal */}
          {resetModalCommit && (
            <div className="dispatch-modal-overlay">
              <div className="dispatch-modal glass-panel" style={{ maxWidth: 360 }}>
                <div className="dispatch-modal-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={14} color="#FF453A" />
                    <span>Reset HEAD to Commit</span>
                  </div>
                  <button className="close-btn" onClick={() => setResetModalCommit(null)}>
                    ✕
                  </button>
                </div>

                <div className="dispatch-modal-body">
                  <p style={{ fontSize: 11, color: '#CBD5E1', margin: '0 0 10px' }}>
                    Reset current branch to <strong>{resetModalCommit.slice(0, 10)}</strong>:
                  </p>
                  <label className="input-label">Reset Mode:</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="resetMode"
                        checked={resetMode === 'soft'}
                        onChange={() => setResetMode('soft')}
                      />
                      <span><strong>Soft:</strong> Keep working tree & staged files</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="resetMode"
                        checked={resetMode === 'mixed'}
                        onChange={() => setResetMode('mixed')}
                      />
                      <span><strong>Mixed:</strong> Keep files unstaged in working tree</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#FF453A' }}>
                      <input
                        type="radio"
                        name="resetMode"
                        checked={resetMode === 'hard'}
                        onChange={() => setResetMode('hard')}
                      />
                      <span><strong>Hard:</strong> Discard all changes (irreversible)</span>
                    </label>
                  </div>
                </div>

                <div className="dispatch-modal-footer">
                  <button
                    className="dispatch-cancel-btn glass-interactive"
                    onClick={() => setResetModalCommit(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="dispatch-confirm-btn glass-interactive"
                    style={{ background: resetMode === 'hard' ? '#FF453A' : undefined }}
                    onClick={handleResetToCommit}
                  >
                    Confirm Reset
                  </button>
                </div>
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
              className={`run-dispatch-btn glass-interactive ${isLiveWatching ? 'active-watch' : ''}`}
              onClick={() => setIsLiveWatching((w) => !w)}
              title={isLiveWatching ? 'Live Watch active (polling every 3.5s)' : 'Click to enable live watching'}
            >
              <Radio size={11} className={isLiveWatching ? 'spinner' : ''} />
              <span>{isLiveWatching ? 'WATCHING' : 'WATCH'}</span>
            </button>

            <button
              className="run-dispatch-btn glass-interactive"
              onClick={() => void gitWorkflowService.loadWorkspaceWorkflows(workspacePath)}
              title={`Source: ${workflowDataSource} — Refresh`}
            >
              <RotateCw size={11} />
              <span>{workflowDataSource === 'live-gh' ? 'LIVE' : workflowDataSource === 'github-api' ? 'API' : workflowDataSource === 'local-yaml' ? 'YAML' : 'SYNC'}</span>
            </button>

            <button
              className="run-dispatch-btn glass-interactive primary"
              onClick={() => setIsDispatchModalOpen(true)}
            >
              <Play size={11} fill="currentColor" />
              <span>Run</span>
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
                    {selectedRun.status === 'in_progress' && (
                      <button
                        className="details-btn glass-interactive cancel-btn"
                        onClick={() => void gitWorkflowService.cancelWorkflowAsync(selectedRun.id)}
                        title="Cancel running workflow"
                      >
                        <Square size={10} /> Cancel
                      </button>
                    )}
                    {selectedRun.conclusion === 'failure' && (
                      <button
                        className="details-btn glass-interactive rerun-failed-btn"
                        onClick={() => void handleRerunFailedJobs(selectedRun.id)}
                        title="Re-run only failed jobs in workflow"
                      >
                        <RotateCw size={10} /> Re-run Failed
                      </button>
                    )}
                    <button
                      className="details-btn glass-interactive"
                      onClick={() => void gitWorkflowService.rerunWorkflowAsync(selectedRun.id)}
                      title="Re-run all jobs in workflow"
                    >
                      <RotateCw size={11} /> Re-run All
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
                    <span>STEPS ({selectedJob.name})</span>
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
                          ) : step.conclusion === 'failure' ? (
                            <XCircle size={11} color="#FF453A" />
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

              {/* Real-time Terminal Log Viewer with Failed Logs Switcher */}
              <div className="workflow-log-viewer">
                <div className="log-viewer-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Terminal size={12} className="log-term-icon" />
                    <span>Logs: {selectedJob?.name || selectedRun.name}</span>
                  </div>
                  <button
                    className={`log-filter-btn ${showingFailedLogsOnly ? 'active' : ''}`}
                    onClick={handleToggleFailedLogs}
                    title="Toggle failed step logs only vs full logs"
                  >
                    <span>{showingFailedLogsOnly ? 'Failed Steps Only' : 'All Logs'}</span>
                  </button>
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
                          : line.toLowerCase().includes('error') || line.includes('FAIL')
                          ? 'error'
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

      {/* 4. GitHub Pull Requests Tab */}
      {activeTab === 'prs' && (
        <div className="git-content prs-mode custom-scrollbar">
          <div className="sub-view-toolbar glass-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <GitPullRequest size={13} color="#BF5AF2" />
              <span style={{ fontWeight: 600, fontSize: 11 }}>PULL REQUESTS</span>
            </div>
            <button
              className="sec-action-link"
              onClick={() => {
                setLoadingGhData(true)
                gitWorkflowService
                  .fetchPullRequestsAsync(workspacePath)
                  .then((prs) => setPullRequests(prs))
                  .finally(() => setLoadingGhData(false))
              }}
            >
              <RotateCw size={11} className={loadingGhData ? 'spinner' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {loadingGhData ? (
            <div className="git-view-empty">
              <RotateCw size={16} className="spinner" />
              <span>Fetching pull requests via GitHub CLI...</span>
            </div>
          ) : pullRequests.length === 0 ? (
            <div className="empty-hint" style={{ padding: 24, textAlign: 'center' }}>
              No open pull requests found for this repository.
            </div>
          ) : (
            <div className="pr-list-container">
              {pullRequests.map((pr) => (
                <div key={pr.number} className="pr-card glass-panel">
                  <div className="pr-card-header">
                    <span className="pr-number">#{pr.number}</span>
                    <span className="pr-title">{pr.title}</span>
                    <span className={`pr-state-badge ${pr.state.toLowerCase()}`}>{pr.state}</span>
                  </div>
                  <div className="pr-card-meta">
                    <span>By @{pr.author.login}</span>
                    <span>{pr.headRefName} → {pr.baseRefName}</span>
                    <span>{new Date(pr.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="pr-card-actions">
                    <button
                      className="pr-action-btn primary"
                      onClick={() => handleCheckoutPr(pr.number)}
                      title={`Checkout branch ${pr.headRefName}`}
                    >
                      <GitBranch size={11} />
                      <span>Checkout Branch</span>
                    </button>
                    {pr.url && (
                      <button
                        className="pr-action-btn secondary"
                        onClick={() => window.open(pr.url, '_blank')}
                        title="View on GitHub"
                      >
                        <ExternalLink size={11} />
                        <span>View PR</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. GitHub Releases Tab */}
      {activeTab === 'releases' && (
        <div className="git-content releases-mode custom-scrollbar">
          <div className="sub-view-toolbar glass-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Tag size={13} color="#FFD60A" />
              <span style={{ fontWeight: 600, fontSize: 11 }}>GITHUB RELEASES</span>
            </div>
            <button
              className="sec-action-link"
              onClick={() => {
                setLoadingGhData(true)
                gitWorkflowService
                  .fetchReleasesAsync(workspacePath)
                  .then((rels) => setReleases(rels))
                  .finally(() => setLoadingGhData(false))
              }}
            >
              <RotateCw size={11} className={loadingGhData ? 'spinner' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {loadingGhData ? (
            <div className="git-view-empty">
              <RotateCw size={16} className="spinner" />
              <span>Fetching releases via GitHub CLI...</span>
            </div>
          ) : releases.length === 0 ? (
            <div className="empty-hint" style={{ padding: 24, textAlign: 'center' }}>
              No releases found for this repository.
            </div>
          ) : (
            <div className="pr-list-container">
              {releases.map((rel) => (
                <div key={rel.tagName} className="pr-card glass-panel">
                  <div className="pr-card-header">
                    <Tag size={12} color="#FFD60A" />
                    <span className="pr-title" style={{ fontWeight: 700 }}>
                      {rel.name || rel.tagName}
                    </span>
                    {rel.isPrerelease && <span className="pr-state-badge prerelease">Pre-release</span>}
                    {rel.isDraft && <span className="pr-state-badge draft">Draft</span>}
                  </div>
                  <div className="pr-card-meta">
                    <span>Tag: <strong>{rel.tagName}</strong></span>
                    <span>Published: {new Date(rel.publishedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="pr-card-actions">
                    <button
                      className="pr-action-btn secondary"
                      onClick={() =>
                        window.open(
                          `https://github.com/indoctrinatedrecluse/IndoctrinatedEdit/releases/tag/${rel.tagName}`,
                          '_blank'
                        )
                      }
                      title="View release notes and download assets"
                    >
                      <ExternalLink size={11} />
                      <span>Release Notes & Assets</span>
                    </button>
                  </div>
                </div>
              ))}
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
                placeholder="v6.1.1"
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

      {/* Inline 3-Way Merge Studio Modal for Conflicted Files */}
      {mergeTarget && (
        <MergeStudioModal
          isOpen={true}
          filePath={mergeTarget.filePath}
          fileContent={mergeTarget.content}
          workspacePath={workspacePath}
          onClose={() => setMergeTarget(null)}
          onSaveResolvedContent={async (resolved) => {
            if (window.electronAPI?.saveFile) {
              await window.electronAPI.saveFile(mergeTarget.filePath, resolved)
              showToast('ok', `Saved resolved conflict to ${mergeTarget.filePath}`)
              await fetchGitStatus()
            }
          }}
        />
      )}

    </div>
  )
}

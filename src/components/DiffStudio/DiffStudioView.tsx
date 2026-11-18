import React, { useState, useEffect } from 'react'
import {
  GitCompare,
  Copy,
  Check,
  FileCode,
  Sparkles,
  Split,
  FileText,
  CheckCircle2,
  Download,
} from 'lucide-react'
import { diffStudioService, DiffLine, DiffSummary, MergeConflictBlock } from '../../services/diffStudioService'
import './DiffStudioView.css'

interface DiffStudioViewProps {
  activeFilePath?: string
  activeFileName?: string
  activeFileContent?: string
  workspaceRoot?: string
  onApplyToEditor?: (newContent: string) => void
}

const sampleOriginal = `function calculateTotal(items: CartItem[]): number {
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += items[i].price * items[i].quantity;
  }
  return sum;
}`

const sampleModified = `function calculateTotal(items: CartItem[], discountRate = 0): number {
  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const discount = subtotal * Math.max(0, Math.min(1, discountRate));
  return Math.round((subtotal - discount) * 100) / 100;
}`

const sampleConflictText = `function authenticateUser(token: string) {
<<<<<<< HEAD
  const user = legacyAuthService.verify(token);
  return { id: user.id, role: 'admin' };
=======
  const claims = modernJwtService.decodeAndVerify(token, { issuer: 'indoctrinated.io' });
  return { id: claims.sub, permissions: claims.permissions };
>>>>>>> feature/modern-jwt-auth
}`

export const DiffStudioView: React.FC<DiffStudioViewProps> = ({
  activeFilePath,
  activeFileName = 'welcome.ts',
  activeFileContent = '',
  workspaceRoot,
  onApplyToEditor,
}) => {
  const [activeTab, setActiveTab] = useState<'diff' | 'merge' | 'patch'>('diff')
  const [diffViewMode, setDiffViewMode] = useState<'split' | 'unified'>('split')
  const [gitDiffStatus, setGitDiffStatus] = useState<string>('')
  const [isComparingGitHead, setIsComparingGitHead] = useState<boolean>(false)
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null)
  
  // Diff Inputs
  const [origText, setOrigText] = useState<string>(() => activeFileContent || sampleOriginal)
  const [modText, setModText] = useState<string>(sampleModified)
  const [diffLines, setDiffLines] = useState<DiffLine[]>([])
  const [diffSummary, setDiffSummary] = useState<DiffSummary | null>(null)

  // Merge Conflict State
  const [conflictInput, setConflictInput] = useState<string>(sampleConflictText)
  const [conflicts, setConflicts] = useState<MergeConflictBlock[]>([])

  // Copied indicator
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (activeFileContent) {
      if (!isComparingGitHead) {
        setOrigText(activeFileContent)
      } else {
        setModText(activeFileContent)
      }
      if (activeFileContent.includes('<<<<<<<') && activeFileContent.includes('>>>>>>>')) {
        setConflictInput(activeFileContent)
      }
    }
  }, [activeFileContent, isComparingGitHead])

  useEffect(() => {
    const res = diffStudioService.computeDiff(origText, modText)
    setDiffLines(res.lines)
    setDiffSummary(res.summary)
  }, [origText, modText])

  useEffect(() => {
    setConflicts(diffStudioService.parseMergeConflicts(conflictInput))
  }, [conflictInput])

  const handleResolve = (conflictId: string, resolution: 'accept-current' | 'accept-incoming' | 'accept-both') => {
    const resolved = diffStudioService.resolveConflict(conflictInput, conflictId, resolution)
    setConflictInput(resolved)
    // Only auto-apply if the active file was the actual source of this conflict text
    if (activeFileContent && activeFileContent.includes('<<<<<<<') && activeFileContent.includes('>>>>>>>')) {
      onApplyToEditor?.(resolved)
    }
  }

  const handleApplyResolutionToEditor = () => {
    if (onApplyToEditor) {
      onApplyToEditor(conflictInput)
      setAppliedNotice('Applied resolved merge buffer to active editor.')
      setTimeout(() => setAppliedNotice(null), 2500)
    }
  }

  const handleCompareWithGitHead = async () => {
    if (!activeFilePath || !window.electronAPI?.workspace?.execCommand) {
      setGitDiffStatus('Open a file inside a Git repository to compare with HEAD.')
      return
    }
    const cwd = workspaceRoot || activeFilePath.replace(/[\\/][^\\/]+$/, '')
    const normRoot = cwd.replace(/\\/g, '/').replace(/\/$/, '')
    const normFile = activeFilePath.replace(/\\/g, '/')
    const relPath = normFile.startsWith(normRoot + '/') ? normFile.slice(normRoot.length + 1) : activeFileName
    const safeRel = relPath.replace(/["`$]/g, '')
    setGitDiffStatus('Loading HEAD revision...')
    try {
      const res = await window.electronAPI.workspace.execCommand({
        command: `git show "HEAD:${safeRel}"`,
        cwd,
      })
      if (res.exitCode === 0) {
        setOrigText(res.stdout)
        setModText(activeFileContent || '')
        setIsComparingGitHead(true)
        setGitDiffStatus(`Comparing HEAD:${relPath} → Working Tree`)
      } else {
        setGitDiffStatus(res.stderr.trim() || 'File not found in Git HEAD')
      }
    } catch (err: any) {
      setGitDiffStatus(err?.message || 'Git comparison failed')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="diff-studio-root">
      {/* Sub-Nav Strip */}
      <div
        className="diff-subnav-strip"
        onWheel={(e) => {
          e.currentTarget.scrollLeft += e.deltaY
        }}
      >
        <button
          className={`diff-nav-btn glass-interactive ${activeTab === 'diff' ? 'active' : ''}`}
          onClick={() => setActiveTab('diff')}
        >
          <GitCompare size={12} />
          <span>Visual Diff {diffSummary && `(${diffSummary.similarityPercentage}% Match)`}</span>
        </button>

        <button
          className={`diff-nav-btn glass-interactive ${activeTab === 'merge' ? 'active' : ''}`}
          onClick={() => setActiveTab('merge')}
        >
          <Split size={12} />
          <span>3-Way Merge ({conflicts.length})</span>
        </button>

        <button
          className={`diff-nav-btn glass-interactive ${activeTab === 'patch' ? 'active' : ''}`}
          onClick={() => setActiveTab('patch')}
        >
          <Download size={12} />
          <span>Unified Patch</span>
        </button>
      </div>

      {/* Main Viewport */}
      <div className="diff-body-viewport">
        {/* TAB 1: VISUAL DIFF */}
        {activeTab === 'diff' && (
          <div className="diff-section">
            {/* Diff Controls Header */}
            <div className="diff-controls-bar glass-panel">
              <div
                className="mode-toggle-group"
                onWheel={(e) => {
                  e.currentTarget.scrollLeft += e.deltaY
                }}
              >
                <button
                  className={`mode-btn ${diffViewMode === 'split' ? 'active' : ''}`}
                  onClick={() => setDiffViewMode('split')}
                >
                  Side-by-Side (Split)
                </button>
                <button
                  className={`mode-btn ${diffViewMode === 'unified' ? 'active' : ''}`}
                  onClick={() => setDiffViewMode('unified')}
                >
                  Unified
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="copy-btn glass-interactive"
                  onClick={handleCompareWithGitHead}
                  title="Load Git HEAD version of active file into Original pane and compare against working buffer"
                >
                  <GitCompare size={11} /> Compare vs Git HEAD
                </button>
                {gitDiffStatus && (
                  <span style={{ fontSize: '0.68rem', color: '#64D2FF' }}>{gitDiffStatus}</span>
                )}
                {diffSummary && (
                  <div className="diff-stats-pill">
                    <span className="stat-add">+{diffSummary.additions}</span>
                    <span className="stat-del">-{diffSummary.deletions}</span>
                    <span className="stat-mod">~{diffSummary.modifications}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Side-by-Side Text Inputs Accordion */}
            <div className="diff-inputs-grid">
              <div className="input-pane glass-panel">
                <div className="pane-header">
                  <FileCode size={11} />
                  <span>ORIGINAL ({activeFileName})</span>
                </div>
                <textarea
                  className="diff-textarea"
                  value={origText}
                  onChange={(e) => setOrigText(e.target.value)}
                  rows={4}
                  placeholder="Original text..."
                />
              </div>

              <div className="input-pane glass-panel">
                <div className="pane-header">
                  <Sparkles size={11} />
                  <span>MODIFIED / TARGET</span>
                </div>
                <textarea
                  className="diff-textarea"
                  value={modText}
                  onChange={(e) => setModText(e.target.value)}
                  rows={4}
                  placeholder="Modified text..."
                />
              </div>
            </div>

            {/* Rendered Diff View */}
            <div className="diff-results-viewer glass-panel">
              <div className="viewer-header">
                <span>DIFF INSPECTION VIEWER</span>
                <button
                  className="copy-btn glass-interactive"
                  onClick={() => copyToClipboard(diffStudioService.generateUnifiedPatch(activeFileName, origText, modText))}
                >
                  {copied ? <Check size={11} color="#30D158" /> : <Copy size={11} />} Copy Patch
                </button>
              </div>

              <div className={`diff-lines-container ${diffViewMode}`}>
                {diffViewMode === 'split' ? (
                  <div className="diff-split-container">
                    <div className="split-column left">
                      <div className="split-column-header">ORIGINAL</div>
                      {diffLines.map((line, idx) => (
                        <div key={idx} className={`split-line-row ${line.type === 'added' ? 'empty-placeholder' : line.type}`}>
                          <span className="line-num">{line.leftLineNumber || ''}</span>
                          <span className="line-marker">{line.type === 'deleted' ? '-' : line.type === 'modified' ? '~' : ' '}</span>
                          <span className="line-text">
                            {line.type === 'modified' && line.charChanges?.left ? (
                              <span>
                                {line.charChanges.left.map((c, cIdx) => (
                                  <span key={cIdx} className={`char-chunk ${c.type}`}>{c.text}</span>
                                ))}
                              </span>
                            ) : (
                              line.leftContent ?? ''
                            )}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="split-column right">
                      <div className="split-column-header">MODIFIED</div>
                      {diffLines.map((line, idx) => (
                        <div key={idx} className={`split-line-row ${line.type === 'deleted' ? 'empty-placeholder' : line.type}`}>
                          <span className="line-num">{line.rightLineNumber || ''}</span>
                          <span className="line-marker">{line.type === 'added' ? '+' : line.type === 'modified' ? '~' : ' '}</span>
                          <span className="line-text">
                            {line.type === 'modified' && line.charChanges?.right ? (
                              <span>
                                {line.charChanges.right.map((c, cIdx) => (
                                  <span key={cIdx} className={`char-chunk ${c.type}`}>{c.text}</span>
                                ))}
                              </span>
                            ) : (
                              line.rightContent ?? ''
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  diffLines.map((line, idx) => (
                    <div key={idx} className={`diff-line-row ${line.type}`}>
                      <span className="line-num left">{line.leftLineNumber || ''}</span>
                      <span className="line-num right">{line.rightLineNumber || ''}</span>
                      <span className="line-marker">
                        {line.type === 'added' ? '+' : line.type === 'deleted' ? '-' : line.type === 'modified' ? '~' : ' '}
                      </span>
                      <span className="line-text">
                        {line.type === 'modified' && line.charChanges ? (
                          <span className="char-diff-wrapper">
                            <span className="char-left">
                              {line.charChanges.left?.map((c, cIdx) => (
                                <span key={cIdx} className={`char-chunk ${c.type}`}>{c.text}</span>
                              ))}
                            </span>
                            <span className="char-arrow">➔</span>
                            <span className="char-right">
                              {line.charChanges.right?.map((c, cIdx) => (
                                <span key={cIdx} className={`char-chunk ${c.type}`}>{c.text}</span>
                              ))}
                            </span>
                          </span>
                        ) : (
                          line.rightContent ?? line.leftContent ?? ''
                        )}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 3-WAY MERGE RESOLVER */}
        {activeTab === 'merge' && (
          <div className="merge-section">
            <div className="merge-instructions glass-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="inst-title">GIT MERGE CONFLICT RESOLVER</div>
                {onApplyToEditor && (
                  <button
                    className="c-btn accept-current"
                    onClick={handleApplyResolutionToEditor}
                    title="Apply the current merge buffer to your active editor file"
                  >
                    Apply to Active Editor
                  </button>
                )}
              </div>
              {appliedNotice && (
                <div style={{ color: '#30D158', fontSize: 11, marginTop: 4 }}>{appliedNotice}</div>
              )}
              <p className="inst-desc">
                Paste file content containing conflict markers (<code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code>, <code>=======</code>, <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code>) to inspect and resolve conflicts with one click.
              </p>
            </div>

            <textarea
              className="merge-raw-input glass-panel"
              value={conflictInput}
              onChange={(e) => setConflictInput(e.target.value)}
              rows={6}
              placeholder="Paste text with merge conflicts..."
            />

            {conflicts.length === 0 ? (
              <div className="no-conflicts-state glass-panel">
                <CheckCircle2 size={24} color="#30D158" />
                <span>Zero merge conflicts detected! File is clean and ready to commit.</span>
              </div>
            ) : (
              <div className="conflicts-list">
                {conflicts.map((c, idx) => (
                  <div key={c.id} className="conflict-card glass-panel">
                    <div className="conflict-header">
                      <span className="c-badge">Conflict #{idx + 1} (Lines {c.startLine}-{c.endLine})</span>
                      <div className="c-actions">
                        <button
                          className="c-btn accept-current"
                          onClick={() => handleResolve(c.id, 'accept-current')}
                        >
                          Accept Current
                        </button>
                        <button
                          className="c-btn accept-incoming"
                          onClick={() => handleResolve(c.id, 'accept-incoming')}
                        >
                          Accept Incoming
                        </button>
                        <button
                          className="c-btn accept-both"
                          onClick={() => handleResolve(c.id, 'accept-both')}
                        >
                          Accept Both
                        </button>
                      </div>
                    </div>

                    <div className="conflict-branches">
                      <div className="branch-box current">
                        <div className="branch-tag">HEAD: {c.currentLabel}</div>
                        <pre className="branch-pre">{c.currentText}</pre>
                      </div>
                      {c.baseText !== undefined && (
                        <div className="branch-box" style={{ borderColor: 'rgba(100, 210, 255, 0.3)' }}>
                          <div className="branch-tag">BASE (common ancestor)</div>
                          <pre className="branch-pre">{c.baseText}</pre>
                        </div>
                      )}
                      <div className="branch-box incoming">
                        <div className="branch-tag">INCOMING: {c.incomingLabel}</div>
                        <pre className="branch-pre">{c.incomingText}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: UNIFIED PATCH */}
        {activeTab === 'patch' && (
          <div className="patch-section">
            <div className="patch-header glass-panel">
              <div className="patch-info">
                <FileText size={14} color="#64D2FF" />
                <span>UNIFIED DIFF PATCH ({activeFileName})</span>
              </div>
              <button
                className="copy-patch-btn glass-interactive"
                onClick={() => copyToClipboard(diffStudioService.generateUnifiedPatch(activeFileName, origText, modText))}
              >
                {copied ? <Check size={12} color="#30D158" /> : <Copy size={12} />}
                <span>{copied ? 'Copied!' : 'Copy Patch'}</span>
              </button>
            </div>
            <pre className="patch-code-viewer glass-panel">
              <code>{diffStudioService.generateUnifiedPatch(activeFileName, origText, modText)}</code>
            </pre>
          </div>
        )}
      </div>

    </div>
  )
}

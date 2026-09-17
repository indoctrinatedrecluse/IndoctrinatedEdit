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

interface DiffStudioViewProps {
  activeFileName?: string
  activeFileContent?: string
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
  activeFileName = 'welcome.ts',
  activeFileContent = '',
}) => {
  const [activeTab, setActiveTab] = useState<'diff' | 'merge' | 'patch'>('diff')
  const [diffViewMode, setDiffViewMode] = useState<'split' | 'unified'>('split')
  
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
      setOrigText(activeFileContent)
    }
  }, [activeFileContent])

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

              {diffSummary && (
                <div className="diff-stats-pill">
                  <span className="stat-add">+{diffSummary.additions}</span>
                  <span className="stat-del">-{diffSummary.deletions}</span>
                  <span className="stat-mod">~{diffSummary.modifications}</span>
                </div>
              )}
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
                {diffLines.map((line, idx) => (
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
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 3-WAY MERGE RESOLVER */}
        {activeTab === 'merge' && (
          <div className="merge-section">
            <div className="merge-instructions glass-panel">
              <div className="inst-title">GIT MERGE CONFLICT RESOLVER</div>
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

      <style>{`
        .diff-studio-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(10, 14, 24, 0.95);
          color: var(--text-primary);
          overflow: hidden;
          font-family: var(--font-ui);
        }

        .diff-subnav-strip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
        }

        .diff-nav-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: var(--radius-sm);
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .diff-nav-btn.active {
          background: rgba(10, 132, 255, 0.25);
          border-color: rgba(10, 132, 255, 0.45);
          color: #FFF;
        }

        .diff-body-viewport {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .diff-section, .merge-section, .patch-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .diff-controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
        }

        .mode-toggle-group {
          display: flex;
          gap: 4px;
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
        }

        .mode-btn {
          font-size: 10px;
          padding: 3px 8px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: var(--text-muted);
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .mode-btn.active {
          background: rgba(10, 132, 255, 0.25);
          color: #64D2FF;
          border-color: rgba(10, 132, 255, 0.45);
        }

        .diff-stats-pill {
          display: flex;
          gap: 6px;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
        }

        .stat-add { color: #30D158; }
        .stat-del { color: #FF453A; }
        .stat-mod { color: #FFD60A; }

        .diff-inputs-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .input-pane {
          padding: 8px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .pane-header {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 9.5px;
          font-weight: 800;
          color: var(--text-muted);
        }

        .diff-textarea {
          width: 100%;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-xs);
          padding: 6px 8px;
          color: #E2E8F0;
          font-family: var(--font-mono);
          font-size: 11px;
          outline: none;
          resize: vertical;
        }

        .diff-results-viewer {
          padding: 10px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .viewer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 800;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .copy-btn {
          font-size: 10px;
          color: #64D2FF;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .diff-lines-container {
          display: flex;
          flex-direction: column;
          font-family: var(--font-mono);
          font-size: 11px;
          border-radius: var(--radius-xs);
          overflow-x: auto;
          background: rgba(0, 0, 0, 0.5);
        }

        .diff-line-row {
          display: flex;
          align-items: center;
          padding: 1px 8px;
          border-left: 3px solid transparent;
        }

        .diff-line-row.added {
          background: rgba(48, 209, 88, 0.12);
          border-left-color: #30D158;
          color: #A3E635;
        }

        .diff-line-row.deleted {
          background: rgba(255, 69, 58, 0.12);
          border-left-color: #FF453A;
          color: #F87171;
        }

        .diff-line-row.modified {
          background: rgba(255, 214, 10, 0.12);
          border-left-color: #FFD60A;
          color: #FDE047;
        }

        .line-num {
          width: 28px;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.25);
          user-select: none;
          flex-shrink: 0;
        }

        .line-marker {
          width: 14px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .line-text {
          flex: 1;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .char-diff-wrapper {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .char-chunk.del {
          background: rgba(255, 69, 58, 0.35);
          color: #FFA39E;
          text-decoration: line-through;
        }

        .char-chunk.add {
          background: rgba(48, 209, 88, 0.35);
          color: #B7EB8F;
        }

        .char-arrow { color: var(--text-muted); font-size: 9px; }

        /* Merge Conflicts Styling */
        .merge-raw-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          color: #E2E8F0;
          font-family: var(--font-mono);
          font-size: 11px;
          outline: none;
        }

        .no-conflicts-state {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px;
          border-radius: var(--radius-sm);
          background: rgba(48, 209, 88, 0.08);
          border: 1px solid rgba(48, 209, 88, 0.25);
          color: #30D158;
          font-size: 11.5px;
          font-weight: 600;
        }

        .conflict-card {
          padding: 10px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 69, 58, 0.3);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .conflict-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 6px;
        }

        .c-badge {
          font-size: 10.5px;
          font-weight: 700;
          color: #FF453A;
        }

        .c-actions {
          display: flex;
          gap: 4px;
        }

        .c-btn {
          font-size: 9.5px;
          padding: 3px 6px;
          border-radius: 3px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #FFF;
          cursor: pointer;
        }

        .c-btn.accept-current { background: rgba(10, 132, 255, 0.3); border-color: rgba(10, 132, 255, 0.5); }
        .c-btn.accept-incoming { background: rgba(48, 209, 88, 0.3); border-color: rgba(48, 209, 88, 0.5); }
        .c-btn.accept-both { background: rgba(255, 214, 10, 0.3); border-color: rgba(255, 214, 10, 0.5); }

        .conflict-branches {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .branch-box {
          padding: 6px 8px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.4);
        }

        .branch-box.current { border-left: 3px solid #0A84FF; }
        .branch-box.incoming { border-left: 3px solid #30D158; }

        .branch-tag {
          font-size: 9px;
          font-weight: 800;
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .branch-pre {
          margin: 0;
          font-family: var(--font-mono);
          font-size: 10.5px;
          color: #E2E8F0;
        }

        /* Patch Styling */
        .patch-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
        }

        .patch-info {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10.5px;
          font-weight: 700;
          color: #64D2FF;
        }

        .copy-patch-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: #64D2FF;
          background: rgba(10, 132, 255, 0.15);
          border: 1px solid rgba(10, 132, 255, 0.3);
          padding: 3px 8px;
          border-radius: 4px;
          cursor: pointer;
        }

        .patch-code-viewer {
          margin: 0;
          padding: 12px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          font-family: var(--font-mono);
          font-size: 11px;
          color: #A3E635;
          overflow-x: auto;
        }
      `}</style>
    </div>
  )
}

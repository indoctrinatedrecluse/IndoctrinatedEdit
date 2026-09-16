import React, { useState, useEffect, useMemo } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Search,
  FileCode,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react'
import {
  diagnosticsService,
  FileDiagnosticsGroup,
  DiagnosticItem,
  DiagnosticSeverity,
} from '../../services/diagnosticsService'

interface ProblemsViewProps {
  onGoToLocation?: (filePath: string, line: number, col: number) => void
  onRefresh?: () => void
}

export const ProblemsView: React.FC<ProblemsViewProps> = ({ onGoToLocation, onRefresh }) => {
  const [groups, setGroups] = useState<FileDiagnosticsGroup[]>(() => diagnosticsService.getAllGroups())
  const [severityFilter, setSeverityFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    return diagnosticsService.subscribe((updated) => {
      setGroups(updated)
    })
  }, [])

  const counts = useMemo(() => diagnosticsService.getCounts(), [groups])

  const toggleFileCollapse = (filePath: string) => {
    setCollapsedFiles((prev) => ({ ...prev, [filePath]: !prev[filePath] }))
  }

  const handleCopyDetails = (item: DiagnosticItem, e: React.MouseEvent) => {
    e.stopPropagation()
    const text = `[${item.severity.toUpperCase()}] ${item.fileName}:${item.startLineNumber}:${item.startColumn} - ${item.message} (${item.source || 'linter'} ${item.code || ''})`
    navigator.clipboard.writeText(text)
    setCopiedId(item.id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  // Filter groups and items
  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return groups
      .map((group) => {
        const matchingItems = group.items.filter((item) => {
          // Severity match
          if (severityFilter === 'error' && item.severity !== 'error') return false
          if (severityFilter === 'warning' && item.severity !== 'warning') return false
          if (severityFilter === 'info' && item.severity !== 'info' && item.severity !== 'hint') return false

          // Query match
          if (!query) return true
          return (
            item.message.toLowerCase().includes(query) ||
            item.fileName.toLowerCase().includes(query) ||
            (item.source && item.source.toLowerCase().includes(query)) ||
            (item.code && String(item.code).toLowerCase().includes(query))
          )
        })

        return {
          ...group,
          items: matchingItems,
        }
      })
      .filter((g) => g.items.length > 0)
  }, [groups, severityFilter, searchQuery])

  const renderSeverityIcon = (severity: DiagnosticSeverity) => {
    switch (severity) {
      case 'error':
        return <AlertCircle size={13} className="diag-icon error" />
      case 'warning':
        return <AlertTriangle size={13} className="diag-icon warning" />
      case 'info':
      case 'hint':
      default:
        return <Info size={13} className="diag-icon info" />
    }
  }

  return (
    <div className="problems-view-root">
      {/* Top Filter & Search Controls Bar */}
      <div className="problems-controls-bar">
        {/* Severity Filter Chips */}
        <div className="severity-chips-group">
          <button
            className={`severity-chip glass-interactive ${severityFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSeverityFilter('all')}
          >
            <span>All</span>
            <span className="chip-count total">{counts.total}</span>
          </button>

          <button
            className={`severity-chip glass-interactive error ${severityFilter === 'error' ? 'active' : ''}`}
            onClick={() => setSeverityFilter('error')}
          >
            <AlertCircle size={11} />
            <span>Errors</span>
            <span className="chip-count error">{counts.errors}</span>
          </button>

          <button
            className={`severity-chip glass-interactive warning ${severityFilter === 'warning' ? 'active' : ''}`}
            onClick={() => setSeverityFilter('warning')}
          >
            <AlertTriangle size={11} />
            <span>Warnings</span>
            <span className="chip-count warning">{counts.warnings}</span>
          </button>

          <button
            className={`severity-chip glass-interactive info ${severityFilter === 'info' ? 'active' : ''}`}
            onClick={() => setSeverityFilter('info')}
          >
            <Info size={11} />
            <span>Info</span>
            <span className="chip-count info">{counts.infos}</span>
          </button>
        </div>

        {/* Live Search Filter Box */}
        <div className="problems-search-box">
          <Search size={12} className="search-icon" />
          <input
            type="text"
            className="problems-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter problems by message, code, or file..."
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              ×
            </button>
          )}
        </div>

        {/* Refresh Linter Button */}
        {onRefresh && (
          <button className="refresh-linter-btn glass-interactive" onClick={onRefresh} title="Re-run Diagnostic Analysis">
            <RefreshCw size={12} />
          </button>
        )}
      </div>

      {/* Problems Body List */}
      <div className="problems-body-viewport">
        {filteredGroups.length === 0 ? (
          <div className="problems-clean-state">
            <CheckCircle2 size={36} className="clean-icon" />
            <span className="clean-title">No problems detected in workspace</span>
            <p className="clean-subtitle">
              All files and active buffers passed syntax validation and lint rules cleanly.
            </p>
          </div>
        ) : (
          <div className="problems-tree-list">
            {filteredGroups.map((group) => {
              const isCollapsed = !!collapsedFiles[group.filePath]
              return (
                <div key={group.filePath} className="problem-file-section">
                  {/* File Header Row */}
                  <div
                    className="problem-file-header glass-interactive"
                    onClick={() => toggleFileCollapse(group.filePath)}
                  >
                    <button className="collapse-toggle-btn">
                      {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    </button>
                    <FileCode size={13} className="file-icon" />
                    <span className="file-name">{group.fileName}</span>
                    <span className="file-path">{group.filePath}</span>
                    <div className="file-badges">
                      {group.errorCount > 0 && <span className="file-badge error">{group.errorCount}</span>}
                      {group.warningCount > 0 && <span className="file-badge warning">{group.warningCount}</span>}
                      {group.infoCount > 0 && <span className="file-badge info">{group.infoCount}</span>}
                    </div>
                  </div>

                  {/* Problem Items */}
                  {!isCollapsed && (
                    <div className="problem-items-container">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="problem-item-row glass-interactive"
                          onClick={() => onGoToLocation?.(item.filePath, item.startLineNumber, item.startColumn)}
                        >
                          <div className="item-icon-col">{renderSeverityIcon(item.severity)}</div>
                          <div className="item-content-col">
                            <span className="item-message">{item.message}</span>
                            <div className="item-metadata-row">
                              <span className="meta-pos">
                                [{item.startLineNumber}, {item.startColumn}]
                              </span>
                              {item.source && <span className="meta-source">{item.source}</span>}
                              {item.code && <span className="meta-code">({item.code})</span>}
                            </div>
                          </div>
                          <button
                            className="copy-details-btn"
                            onClick={(e) => handleCopyDetails(item, e)}
                            title="Copy problem details"
                          >
                            {copiedId === item.id ? <Check size={11} className="copied" /> : <Copy size={11} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        .problems-view-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(10, 14, 24, 0.85);
          overflow: hidden;
          font-family: var(--font-mono);
        }

        .problems-controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
          gap: 12px;
          flex-shrink: 0;
        }

        .severity-chips-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .severity-chip {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.07);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .severity-chip:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.08);
        }

        .severity-chip.active {
          background: rgba(255, 255, 255, 0.1);
          color: #FFF;
          border-color: rgba(255, 255, 255, 0.2);
        }

        .severity-chip.error.active {
          background: rgba(255, 69, 58, 0.2);
          border-color: rgba(255, 69, 58, 0.4);
          color: #FF453A;
        }

        .severity-chip.warning.active {
          background: rgba(255, 214, 10, 0.2);
          border-color: rgba(255, 214, 10, 0.4);
          color: #FFD60A;
        }

        .severity-chip.info.active {
          background: rgba(100, 210, 255, 0.2);
          border-color: rgba(100, 210, 255, 0.4);
          color: #64D2FF;
        }

        .chip-count {
          font-size: 9.5px;
          font-weight: 800;
          padding: 0 4px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.1);
        }

        .chip-count.error {
          background: rgba(255, 69, 58, 0.3);
          color: #FF453A;
        }

        .chip-count.warning {
          background: rgba(255, 214, 10, 0.3);
          color: #FFD60A;
        }

        .chip-count.info {
          background: rgba(100, 210, 255, 0.3);
          color: #64D2FF;
        }

        .problems-search-box {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          padding: 3px 8px;
          flex: 1;
          max-width: 360px;
        }

        .search-icon {
          color: var(--text-muted);
        }

        .problems-search-input {
          background: transparent;
          border: none;
          outline: none;
          color: #FFF;
          font-size: 11.5px;
          width: 100%;
          font-family: inherit;
        }

        .clear-search-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 14px;
        }

        .refresh-linter-btn {
          width: 24px;
          height: 24px;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .problems-body-viewport {
          flex: 1;
          overflow-y: auto;
          padding: 6px 10px;
        }

        .problems-clean-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 180px;
          gap: 8px;
          color: var(--text-muted);
        }

        .clean-icon {
          color: #30D158;
        }

        .clean-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .clean-subtitle {
          font-size: 11.5px;
          margin: 0;
        }

        .problems-tree-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .problem-file-section {
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .problem-file-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.04);
          cursor: pointer;
          font-size: 11.5px;
        }

        .collapse-toggle-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          padding: 0;
          display: flex;
          align-items: center;
          cursor: pointer;
        }

        .file-icon {
          color: var(--accent-primary);
        }

        .file-name {
          font-weight: 700;
          color: var(--text-primary);
        }

        .file-path {
          font-size: 10px;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }

        .file-badges {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .file-badge {
          font-size: 9px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 3px;
        }

        .file-badge.error {
          background: rgba(255, 69, 58, 0.25);
          color: #FF453A;
        }

        .file-badge.warning {
          background: rgba(255, 214, 10, 0.25);
          color: #FFD60A;
        }

        .file-badge.info {
          background: rgba(100, 210, 255, 0.25);
          color: #64D2FF;
        }

        .problem-items-container {
          display: flex;
          flex-direction: column;
        }

        .problem-item-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 5px 8px 5px 24px;
          cursor: pointer;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          transition: background var(--transition-fast);
        }

        .problem-item-row:last-child {
          border-bottom: none;
        }

        .problem-item-row:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .diag-icon.error {
          color: #FF453A;
          margin-top: 2px;
        }

        .diag-icon.warning {
          color: #FFD60A;
          margin-top: 2px;
        }

        .diag-icon.info {
          color: #64D2FF;
          margin-top: 2px;
        }

        .item-content-col {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }

        .item-message {
          font-size: 11.5px;
          color: var(--text-primary);
          line-height: 1.35;
        }

        .item-metadata-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
        }

        .meta-pos {
          color: var(--text-muted);
          font-weight: 600;
        }

        .meta-source {
          color: var(--accent-cyan);
          background: rgba(100, 210, 255, 0.1);
          padding: 0 4px;
          border-radius: 2px;
        }

        .meta-code {
          color: var(--text-muted);
        }

        .copy-details-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 3px;
          border-radius: 3px;
          opacity: 0.6;
          transition: all var(--transition-fast);
        }

        .copy-details-btn:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-primary);
        }

        .copied {
          color: #30D158;
        }
      `}</style>
    </div>
  )
}

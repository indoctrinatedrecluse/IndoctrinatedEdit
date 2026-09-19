import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search,
  Replace,
  ChevronDown,
  ChevronRight,
  CaseSensitive,
  WholeWord,
  Regex,
  RefreshCw,
  X,
  FileCode,
  Check,
  Filter,
  CheckCheck,
  AlertCircle,
} from 'lucide-react'
import {
  globalSearchService,
  GlobalSearchResultSummary,
  SearchMatch,
  BatchReplaceResult,
} from '../../services/globalSearchService'

interface GlobalSearchPanelProps {
  onOpenFileAndNavigate?: (filePath: string, lineNumber: number, column?: number) => void
}

export const GlobalSearchPanel: React.FC<GlobalSearchPanelProps> = ({
  onOpenFileAndNavigate,
}) => {
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [isReplaceVisible, setIsReplaceVisible] = useState(false)
  const [isDetailsVisible, setIsDetailsVisible] = useState(false)

  // Search Options
  const [matchCase, setMatchCase] = useState(false)
  const [matchWholeWord, setMatchWholeWord] = useState(false)
  const [isRegex, setIsRegex] = useState(false)
  const [preserveCase, setPreserveCase] = useState(false)
  const [includePattern, setIncludePattern] = useState('')
  const [excludePattern, setExcludePattern] = useState('node_modules, dist, .git')

  // Search Results State
  const [results, setResults] = useState<GlobalSearchResultSummary | null>(() =>
    globalSearchService.getLastResults()
  )
  const [isSearching, setIsSearching] = useState(false)
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({})
  const [replaceNotice, setReplaceNotice] = useState<string | null>(null)

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Subscribe to search service
  useEffect(() => {
    const unsub = globalSearchService.subscribe((newResults) => {
      setResults(newResults)
      setIsSearching(false)
    })
    return () => unsub()
  }, [])

  const triggerSearch = useCallback(
    (currentQuery: string) => {
      if (!currentQuery.trim()) {
        globalSearchService.search('')
        return
      }
      setIsSearching(true)
      globalSearchService.search(currentQuery, {
        matchCase,
        matchWholeWord,
        isRegex,
        includePattern,
        excludePattern,
      })
    },
    [matchCase, matchWholeWord, isRegex, includePattern, excludePattern]
  )

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }
    searchDebounceRef.current = setTimeout(() => {
      triggerSearch(val)
    }, 200)
  }

  const handleToggleOption = (type: 'case' | 'word' | 'regex' | 'preserve') => {
    let nextCase = matchCase
    let nextWord = matchWholeWord
    let nextRegex = isRegex
    let nextPreserve = preserveCase

    if (type === 'case') nextCase = !matchCase
    if (type === 'word') nextWord = !matchWholeWord
    if (type === 'regex') nextRegex = !isRegex
    if (type === 'preserve') nextPreserve = !preserveCase

    setMatchCase(nextCase)
    setMatchWholeWord(nextWord)
    setIsRegex(nextRegex)
    setPreserveCase(nextPreserve)

    setIsSearching(true)
    globalSearchService.search(query, {
      matchCase: nextCase,
      matchWholeWord: nextWord,
      isRegex: nextRegex,
      includePattern,
      excludePattern,
    })
  }

  const handleToggleFileCollapse = (filePath: string) => {
    setCollapsedFiles((prev) => ({
      ...prev,
      [filePath]: !prev[filePath],
    }))
  }

  const handleExpandAll = () => setCollapsedFiles({})
  const handleCollapseAll = () => {
    if (!results) return
    const map: Record<string, boolean> = {}
    for (const f of results.fileResults) {
      map[f.filePath] = true
    }
    setCollapsedFiles(map)
  }

  const handleClear = () => {
    setQuery('')
    setReplacement('')
    globalSearchService.search('')
  }

  const handleReplaceAll = async () => {
    if (!query || !results || results.totalMatches === 0) return
    setIsSearching(true)
    const res: BatchReplaceResult = await globalSearchService.executeBatchReplace(
      query,
      replacement,
      {
        matchCase,
        matchWholeWord,
        isRegex,
        preserveCase,
        includePattern,
        excludePattern,
      }
    )
    setReplaceNotice(`Replaced ${res.totalReplaced} occurrences across ${res.filesAffected} files`)
    setTimeout(() => setReplaceNotice(null), 4000)
  }

  const handleReplaceSingle = (match: SearchMatch, e: React.MouseEvent) => {
    e.stopPropagation()
    globalSearchService.replaceSingleMatch(match, replacement)
  }

  return (
    <div className="global-search-container">
      {/* Header */}
      <div className="sidebar-header">
        <span className="sidebar-title">WORKSPACE SEARCH</span>
        <div className="sidebar-actions">
          <button
            className="icon-action-btn"
            onClick={() => triggerSearch(query)}
            title="Refresh Search"
          >
            <RefreshCw size={13} className={isSearching ? 'animate-spin' : ''} />
          </button>
          <button
            className="icon-action-btn"
            onClick={handleClear}
            title="Clear Search"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Inputs Area */}
      <div className="search-input-suite glass-panel">
        {/* Search Box */}
        <div className="search-box-row">
          <button
            className="replace-toggle-btn"
            onClick={() => setIsReplaceVisible(!isReplaceVisible)}
            title="Toggle Replace"
          >
            {isReplaceVisible ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <div className="search-input-wrapper">
            <Search size={14} className="input-icon" />
            <input
              type="text"
              className="glass-input search-input-field"
              placeholder="Search..."
              value={query}
              onChange={handleQueryChange}
              onKeyDown={(e) => e.key === 'Enter' && triggerSearch(query)}
              autoFocus
            />
            {/* Search Option Toggles */}
            <div className="search-toggles-row">
              <button
                className={`search-toggle-btn ${matchCase ? 'active' : ''}`}
                onClick={() => handleToggleOption('case')}
                title="Match Case (Alt+C)"
              >
                <CaseSensitive size={13} />
              </button>
              <button
                className={`search-toggle-btn ${matchWholeWord ? 'active' : ''}`}
                onClick={() => handleToggleOption('word')}
                title="Match Whole Word (Alt+W)"
              >
                <WholeWord size={13} />
              </button>
              <button
                className={`search-toggle-btn ${isRegex ? 'active' : ''}`}
                onClick={() => handleToggleOption('regex')}
                title="Use Regular Expression (Alt+R)"
              >
                <Regex size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Replace Box */}
        {isReplaceVisible && (
          <div className="replace-box-row">
            <div style={{ width: 14 }} />
            <div className="search-input-wrapper">
              <Replace size={14} className="input-icon" />
              <input
                type="text"
                className="glass-input search-input-field"
                placeholder="Replace with..."
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReplaceAll()}
              />
              <div className="search-toggles-row">
                <button
                  className={`search-toggle-btn ${preserveCase ? 'active' : ''}`}
                  onClick={() => handleToggleOption('preserve')}
                  title="Preserve Case (AB)"
                >
                  <span style={{ fontSize: 10, fontWeight: 'bold' }}>AB</span>
                </button>
                <button
                  className="search-replace-action-btn"
                  onClick={handleReplaceAll}
                  disabled={!results || results.totalMatches === 0}
                  title="Replace All in Workspace"
                >
                  <CheckCheck size={13} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters Toggle Header */}
        <div className="filters-toggle-row" onClick={() => setIsDetailsVisible(!isDetailsVisible)}>
          <Filter size={11} className="filter-icon" />
          <span>Files to include / exclude</span>
          {isDetailsVisible ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </div>

        {/* Inclusion/Exclusion Filter Inputs */}
        {isDetailsVisible && (
          <div className="filter-details-box">
            <div className="filter-field">
              <span className="filter-label">files to include:</span>
              <input
                type="text"
                className="glass-input filter-input"
                placeholder="e.g. *.ts, src/**"
                value={includePattern}
                onChange={(e) => setIncludePattern(e.target.value)}
                onBlur={() => triggerSearch(query)}
              />
            </div>
            <div className="filter-field">
              <span className="filter-label">files to exclude:</span>
              <input
                type="text"
                className="glass-input filter-input"
                placeholder="e.g. node_modules, dist"
                value={excludePattern}
                onChange={(e) => setExcludePattern(e.target.value)}
                onBlur={() => triggerSearch(query)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Replace Feedback Notification */}
      {replaceNotice && (
        <div className="search-notice-banner glass-panel">
          <Check size={13} className="text-emerald-400" />
          <span>{replaceNotice}</span>
        </div>
      )}

      {/* Search Stats & Controls Header */}
      {results && results.query && (
        <div className="search-stats-bar">
          <span className="search-stats-count">
            {results.totalMatches} results in {results.totalFiles} files
            {results.durationMs > 0 && <span className="duration-tag"> ({results.durationMs}ms)</span>}
          </span>
          <div className="search-stats-actions">
            <button className="text-action-link" onClick={handleCollapseAll} title="Collapse All">
              Collapse
            </button>
            <span className="divider">|</span>
            <button className="text-action-link" onClick={handleExpandAll} title="Expand All">
              Expand
            </button>
          </div>
        </div>
      )}

      {/* Search Results Tree */}
      <div className="search-results-tree custom-scrollbar">
        {results && results.fileResults.length > 0 ? (
          results.fileResults.map((fileRes) => {
            const isCollapsed = !!collapsedFiles[fileRes.filePath]
            return (
              <div key={fileRes.filePath} className="search-file-group">
                {/* File Header */}
                <div
                  className="search-file-header glass-interactive"
                  onClick={() => handleToggleFileCollapse(fileRes.filePath)}
                >
                  <span className="chevron-icon">
                    {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  </span>
                  <FileCode size={14} className="file-icon" />
                  <span className="file-name" title={fileRes.filePath}>
                    {fileRes.fileName}
                  </span>
                  <span className="file-path-sub">{fileRes.filePath}</span>
                  <span className="match-count-pill">{fileRes.matches.length}</span>
                </div>

                {/* Match Items */}
                {!isCollapsed && (
                  <div className="search-matches-list">
                    {fileRes.matches.map((match) => (
                      <div
                        key={match.id}
                        className="search-match-item glass-interactive"
                        onClick={() =>
                          onOpenFileAndNavigate?.(
                            match.filePath,
                            match.lineNumber,
                            match.columnStart
                          )
                        }
                      >
                        <span className="match-line-badge">{match.lineNumber}</span>
                        <div className="match-snippet-row">
                          <span className="snippet-prefix">{match.previewPrefix}</span>
                          <span className="snippet-highlight">{match.previewMatch}</span>
                          <span className="snippet-suffix">{match.previewSuffix}</span>
                        </div>
                        {isReplaceVisible && (
                          <button
                            className="match-replace-btn"
                            onClick={(e) => handleReplaceSingle(match, e)}
                            title="Replace this match"
                          >
                            <Replace size={11} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        ) : query.trim() && !isSearching ? (
          <div className="search-empty-state">
            <AlertCircle size={20} className="text-violet-400 opacity-60" />
            <p>No results found for &ldquo;{query}&rdquo;</p>
          </div>
        ) : null}
      </div>

      <style>{`
        .global-search-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          font-family: inherit;
        }

        .search-input-suite {
          margin: 8px 12px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          backdrop-filter: blur(20px);
        }

        .search-box-row, .replace-box-row {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .replace-toggle-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
          border-radius: 4px;
          transition: all 0.15s ease;
        }

        .replace-toggle-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
        }

        .search-input-wrapper .input-icon {
          position: absolute;
          left: 8px;
          color: rgba(255, 255, 255, 0.4);
          pointer-events: none;
        }

        .search-input-field {
          width: 100%;
          padding: 6px 74px 6px 28px !important;
          font-size: 12px;
          background: rgba(0, 0, 0, 0.35) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 6px;
          color: #f5f5f7;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .search-input-field:focus {
          border-color: rgba(191, 90, 242, 0.6) !important;
          box-shadow: 0 0 10px rgba(191, 90, 242, 0.25);
        }

        .search-toggles-row {
          position: absolute;
          right: 4px;
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .search-toggle-btn {
          background: transparent;
          border: 1px solid transparent;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          padding: 3px 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .search-toggle-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
        }

        .search-toggle-btn.active {
          background: rgba(191, 90, 242, 0.25);
          border-color: rgba(191, 90, 242, 0.6);
          color: #bf5af2;
        }

        .search-replace-action-btn {
          background: rgba(191, 90, 242, 0.2);
          border: 1px solid rgba(191, 90, 242, 0.4);
          color: #bf5af2;
          cursor: pointer;
          padding: 3px 5px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .search-replace-action-btn:hover:not(:disabled) {
          background: rgba(191, 90, 242, 0.4);
          color: #fff;
        }

        .search-replace-action-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .filters-toggle-row {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.45);
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 4px;
          user-select: none;
          margin-top: 2px;
        }

        .filters-toggle-row:hover {
          color: rgba(255, 255, 255, 0.8);
        }

        .filter-details-box {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 4px 0 2px 0;
        }

        .filter-field {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .filter-label {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
          text-transform: lowercase;
        }

        .filter-input {
          font-size: 11px;
          padding: 4px 8px !important;
          background: rgba(0, 0, 0, 0.25) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 4px;
        }

        .search-notice-banner {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 0 12px 6px 12px;
          padding: 6px 10px;
          font-size: 11px;
          color: #30d158;
          background: rgba(48, 209, 88, 0.1);
          border: 1px solid rgba(48, 209, 88, 0.2);
          border-radius: 6px;
        }

        .search-stats-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 14px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .search-stats-count .duration-tag {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.35);
        }

        .search-stats-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .text-action-link {
          background: none;
          border: none;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.45);
          cursor: pointer;
          padding: 0;
        }

        .text-action-link:hover {
          color: #bf5af2;
        }

        .divider {
          color: rgba(255, 255, 255, 0.2);
          font-size: 10px;
        }

        .search-results-tree {
          flex: 1;
          overflow-y: auto;
          padding: 6px 0;
        }

        .search-file-group {
          margin-bottom: 2px;
        }

        .search-file-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          color: #f5f5f7;
          user-select: none;
        }

        .search-file-header:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .file-icon {
          color: #bf5af2;
          flex-shrink: 0;
        }

        .file-name {
          font-weight: 600;
          white-space: nowrap;
        }

        .file-path-sub {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.35);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }

        .match-count-pill {
          font-size: 10px;
          background: rgba(191, 90, 242, 0.2);
          color: #bf5af2;
          padding: 1px 6px;
          border-radius: 10px;
          font-weight: 600;
        }

        .search-matches-list {
          display: flex;
          flex-direction: column;
        }

        .search-match-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px 4px 28px;
          cursor: pointer;
          font-family: 'Fira Code', monospace;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.7);
          transition: background 0.15s;
        }

        .search-match-item:hover {
          background: rgba(191, 90, 242, 0.1);
        }

        .match-line-badge {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
          min-width: 24px;
          text-align: right;
        }

        .match-snippet-row {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .snippet-highlight {
          background: rgba(191, 90, 242, 0.35);
          color: #fff;
          font-weight: bold;
          border-radius: 2px;
          padding: 0 2px;
        }

        .match-replace-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 3px;
          display: flex;
          align-items: center;
        }

        .match-replace-btn:hover {
          color: #bf5af2;
          background: rgba(191, 90, 242, 0.2);
        }

        .search-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 40px 20px;
          text-align: center;
          color: rgba(255, 255, 255, 0.45);
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}

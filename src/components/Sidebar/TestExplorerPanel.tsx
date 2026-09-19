import React, { useState, useEffect } from 'react'
import {
  Play,
  RotateCcw,
  RefreshCw,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  FlaskConical,
  FileCode,
  Layers,
} from 'lucide-react'
import {
  testExplorerService,
  TestExplorerState,
  TestItemStatus,
} from '../../services/testExplorerService'

interface TestExplorerPanelProps {
  onOpenFileAndNavigate?: (filePath: string, lineNumber: number, column?: number) => void
}

export const TestExplorerPanel: React.FC<TestExplorerPanelProps> = ({
  onOpenFileAndNavigate,
}) => {
  const [state, setState] = useState<TestExplorerState>(() =>
    testExplorerService.getState()
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({})
  const [collapsedSuites, setCollapsedSuites] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const unsub = testExplorerService.subscribe((newState) => {
      setState(newState)
    })
    return () => unsub()
  }, [])

  const handleRunAll = () => {
    testExplorerService.runAllTests()
  }

  const handleRunFailed = () => {
    testExplorerService.runFailedTests()
  }

  const handleClear = () => {
    testExplorerService.clearResults()
  }

  const handleRefresh = () => {
    testExplorerService.discoverTests()
  }

  const handleToggleFileCollapse = (filePath: string) => {
    setCollapsedFiles((prev) => ({
      ...prev,
      [filePath]: !prev[filePath],
    }))
  }

  const handleToggleSuiteCollapse = (suiteId: string) => {
    setCollapsedSuites((prev) => ({
      ...prev,
      [suiteId]: !prev[suiteId],
    }))
  }

  const handleCollapseAll = () => {
    const fMap: Record<string, boolean> = {}
    const sMap: Record<string, boolean> = {}
    for (const f of state.files) {
      fMap[f.filePath] = true
      for (const s of f.suites) {
        sMap[s.id] = true
      }
    }
    setCollapsedFiles(fMap)
    setCollapsedSuites(sMap)
  }

  const handleExpandAll = () => {
    setCollapsedFiles({})
    setCollapsedSuites({})
  }

  const renderStatusIcon = (status: TestItemStatus) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 size={13} className="text-emerald-400" />
      case 'failed':
        return <XCircle size={13} className="text-rose-400" />
      case 'running':
        return <RefreshCw size={13} className="text-violet-400 animate-spin" />
      case 'skipped':
        return <Clock size={13} className="text-amber-400" />
      default:
        return <span className="test-idle-dot" />
    }
  }

  // Filter files and tests by search query
  const filteredFiles = state.files.filter((file) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    if (file.fileName.toLowerCase().includes(q)) return true
    if (file.suites.some((s) => s.name.toLowerCase().includes(q))) return true
    if (file.directTests.some((t) => t.name.toLowerCase().includes(q))) return true
    return file.suites.some((s) => s.testCases.some((t) => t.name.toLowerCase().includes(q)))
  })

  return (
    <div className="test-explorer-container">
      {/* Header Bar */}
      <div className="sidebar-header">
        <span className="sidebar-title">TEST EXPLORER</span>
        <div className="sidebar-actions">
          <button
            className="icon-action-btn primary-action"
            onClick={handleRunAll}
            disabled={state.summary.isRunning}
            title="Run All Tests in Workspace"
          >
            <Play size={13} fill="currentColor" />
          </button>
          <button
            className="icon-action-btn"
            onClick={handleRunFailed}
            disabled={state.summary.isRunning || state.summary.failed === 0}
            title="Rerun Failed Tests"
          >
            <RotateCcw size={13} />
          </button>
          <button
            className="icon-action-btn"
            onClick={handleRefresh}
            title="Rediscover Tests"
          >
            <RefreshCw size={13} />
          </button>
          <button
            className="icon-action-btn"
            onClick={handleClear}
            title="Clear Results"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Summary Chips Bar */}
      <div className="test-summary-bar glass-panel">
        <div className="summary-chip total">
          <span>{state.summary.totalTests} tests</span>
        </div>
        {state.summary.passed > 0 && (
          <div className="summary-chip passed">
            <CheckCircle2 size={11} />
            <span>{state.summary.passed}</span>
          </div>
        )}
        {state.summary.failed > 0 && (
          <div className="summary-chip failed">
            <XCircle size={11} />
            <span>{state.summary.failed}</span>
          </div>
        )}
        {state.summary.running > 0 && (
          <div className="summary-chip running">
            <RefreshCw size={11} className="animate-spin" />
            <span>{state.summary.running}</span>
          </div>
        )}
        {state.summary.totalDurationMs > 0 && (
          <div className="summary-duration">
            <span>{state.summary.totalDurationMs}ms</span>
          </div>
        )}
      </div>

      {/* Filter Input */}
      <div className="test-search-box">
        <Search size={13} className="search-icon" />
        <input
          type="text"
          className="glass-input test-search-input"
          placeholder="Filter tests..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
            <X size={11} />
          </button>
        )}
      </div>

      {/* Controls Link Row */}
      <div className="test-links-row">
        <span className="file-count-label">
          {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'} discovered
        </span>
        <div className="links-actions">
          <button className="text-action-link" onClick={handleCollapseAll}>
            Collapse
          </button>
          <span className="divider">|</span>
          <button className="text-action-link" onClick={handleExpandAll}>
            Expand
          </button>
        </div>
      </div>

      {/* Test Tree View */}
      <div className="test-tree custom-scrollbar">
        {filteredFiles.length > 0 ? (
          filteredFiles.map((file) => {
            const isFileCollapsed = !!collapsedFiles[file.filePath]
            const totalFileTests =
              file.directTests.length +
              file.suites.reduce((acc, s) => acc + s.testCases.length, 0)

            return (
              <div key={file.filePath} className="test-file-node">
                {/* File Header */}
                <div
                  className="tree-node-header file-header glass-interactive"
                  onClick={() => handleToggleFileCollapse(file.filePath)}
                >
                  <span className="chevron-icon">
                    {isFileCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  </span>
                  <span className="status-icon-wrap">{renderStatusIcon(file.status)}</span>
                  <FileCode size={13} className="node-icon file-color" />
                  <span className="node-title file-title" title={file.filePath}>
                    {file.fileName}
                  </span>
                  {file.durationMs !== undefined && (
                    <span className="duration-pill">{file.durationMs}ms</span>
                  )}
                  <span className="test-count-badge">{totalFileTests}</span>
                  <button
                    className="run-node-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      testExplorerService.runFile(file.filePath)
                    }}
                    title={`Run ${file.fileName}`}
                  >
                    <Play size={10} fill="currentColor" />
                  </button>
                </div>

                {/* Suites and Tests */}
                {!isFileCollapsed && (
                  <div className="file-children">
                    {/* Suites */}
                    {file.suites.map((suite) => {
                      const isSuiteCollapsed = !!collapsedSuites[suite.id]
                      return (
                        <div key={suite.id} className="test-suite-node">
                          <div
                            className="tree-node-header suite-header glass-interactive"
                            onClick={() => handleToggleSuiteCollapse(suite.id)}
                          >
                            <span className="chevron-icon">
                              {isSuiteCollapsed ? (
                                <ChevronRight size={12} />
                              ) : (
                                <ChevronDown size={12} />
                              )}
                            </span>
                            <span className="status-icon-wrap">{renderStatusIcon(suite.status)}</span>
                            <Layers size={12} className="node-icon suite-color" />
                            <span
                              className="node-title suite-title"
                              onClick={(e) => {
                                e.stopPropagation()
                                onOpenFileAndNavigate?.(suite.filePath, suite.lineNumber)
                              }}
                            >
                              {suite.name}
                            </span>
                            <span className="test-count-badge">{suite.testCases.length}</span>
                          </div>

                          {/* Suite Test Cases */}
                          {!isSuiteCollapsed && (
                            <div className="suite-children">
                              {suite.testCases.map((test) => (
                                <div
                                  key={test.id}
                                  className="tree-node-header test-header glass-interactive"
                                  onClick={() =>
                                    onOpenFileAndNavigate?.(test.filePath, test.lineNumber)
                                  }
                                >
                                  <span className="indent-spacer" />
                                  <span className="status-icon-wrap">
                                    {renderStatusIcon(test.status)}
                                  </span>
                                  <FlaskConical size={11} className="node-icon test-color" />
                                  <span className="node-title test-title">{test.name}</span>
                                  {test.durationMs !== undefined && (
                                    <span className="duration-pill">{test.durationMs}ms</span>
                                  )}
                                  <button
                                    className="run-node-btn"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      testExplorerService.runSingleTest(test.id)
                                    }}
                                    title={`Run test: ${test.name}`}
                                  >
                                    <Play size={9} fill="currentColor" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Direct Tests outside suites */}
                    {file.directTests.map((test) => (
                      <div
                        key={test.id}
                        className="tree-node-header test-header glass-interactive"
                        onClick={() =>
                          onOpenFileAndNavigate?.(test.filePath, test.lineNumber)
                        }
                      >
                        <span className="indent-spacer" />
                        <span className="status-icon-wrap">
                          {renderStatusIcon(test.status)}
                        </span>
                        <FlaskConical size={11} className="node-icon test-color" />
                        <span className="node-title test-title">{test.name}</span>
                        {test.durationMs !== undefined && (
                          <span className="duration-pill">{test.durationMs}ms</span>
                        )}
                        <button
                          className="run-node-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            testExplorerService.runSingleTest(test.id)
                          }}
                          title={`Run test: ${test.name}`}
                        >
                          <Play size={9} fill="currentColor" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="test-empty-state">
            <FlaskConical size={24} className="text-violet-400 opacity-60" />
            <p>No test files discovered in workspace</p>
            <span className="empty-sub">
              Support for Vitest, Jest, PyTest, Go test, Cargo & Dart
            </span>
          </div>
        )}
      </div>

      <style>{`
        .test-explorer-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          font-family: inherit;
        }

        .primary-action {
          color: #bf5af2 !important;
        }

        .primary-action:hover {
          background: rgba(191, 90, 242, 0.2) !important;
        }

        .test-summary-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 6px 12px;
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
        }

        .summary-chip {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 500;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .summary-chip.total {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.8);
        }

        .summary-chip.passed {
          background: rgba(48, 209, 88, 0.15);
          color: #30d158;
        }

        .summary-chip.failed {
          background: rgba(255, 69, 58, 0.15);
          color: #ff453a;
        }

        .summary-chip.running {
          background: rgba(191, 90, 242, 0.15);
          color: #bf5af2;
        }

        .summary-duration {
          margin-left: auto;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
          font-family: monospace;
        }

        .test-search-box {
          position: relative;
          display: flex;
          align-items: center;
          margin: 4px 12px;
        }

        .test-search-box .search-icon {
          position: absolute;
          left: 8px;
          color: rgba(255, 255, 255, 0.4);
          pointer-events: none;
        }

        .test-search-input {
          width: 100%;
          padding: 5px 24px 5px 28px !important;
          font-size: 11.5px;
          background: rgba(0, 0, 0, 0.25) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 6px;
        }

        .search-clear-btn {
          position: absolute;
          right: 6px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          padding: 2px;
          display: flex;
        }

        .test-links-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 14px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.45);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .test-tree {
          flex: 1;
          overflow-y: auto;
          padding: 6px 0;
        }

        .tree-node-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          cursor: pointer;
          user-select: none;
          font-size: 12px;
          transition: background 0.12s;
        }

        .tree-node-header:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .status-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          flex-shrink: 0;
        }

        .test-idle-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.25);
        }

        .node-icon {
          flex-shrink: 0;
        }

        .file-color {
          color: #0a84ff;
        }

        .suite-color {
          color: #bf5af2;
        }

        .test-color {
          color: #64d2ff;
        }

        .node-title {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 500;
        }

        .file-title {
          color: #f5f5f7;
        }

        .suite-title {
          color: rgba(255, 255, 255, 0.85);
          font-size: 11.5px;
        }

        .test-title {
          color: rgba(255, 255, 255, 0.7);
          font-size: 11px;
          font-family: 'Fira Code', monospace;
        }

        .duration-pill {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.35);
          font-family: monospace;
          margin-right: 4px;
        }

        .test-count-badge {
          font-size: 10px;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.6);
          padding: 1px 5px;
          border-radius: 8px;
        }

        .run-node-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          padding: 3px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.15s, color 0.15s;
        }

        .tree-node-header:hover .run-node-btn {
          opacity: 1;
        }

        .run-node-btn:hover {
          color: #bf5af2;
          background: rgba(191, 90, 242, 0.2);
        }

        .file-children {
          padding-left: 12px;
        }

        .suite-children {
          padding-left: 12px;
        }

        .indent-spacer {
          width: 6px;
        }

        .test-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 40px 20px;
          text-align: center;
          color: rgba(255, 255, 255, 0.45);
          font-size: 12px;
        }

        .empty-sub {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  )
}

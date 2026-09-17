import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Database,
  Table as TableIcon,
  Columns,
  Play,
  History,
  Download,
  Check,
  Search,
  ChevronRight,
  ChevronDown,
  Key,
  Link,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react'
import {
  databaseService,
  DatabaseSchema,
  QueryResult,
  QueryHistoryItem,
} from '../../services/databaseService'

interface DatabaseStudioProps {
  onClose?: () => void
  isDocked?: boolean
  dockPosition?: 'left' | 'right' | 'full'
  onToggleDockPosition?: () => void
}

export const DatabaseStudio: React.FC<DatabaseStudioProps> = ({
  onClose,
  isDocked: _isDocked = true,
  dockPosition = 'right',
  onToggleDockPosition,
}) => {
  const [activeDb, setActiveDb] = useState<DatabaseSchema>(() => databaseService.getActiveDatabase())
  const [allDbs, setAllDbs] = useState(() => databaseService.getAllDatabases())
  const [tableSearch, setTableSearch] = useState('')
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({ customers: true, clusters: true })
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM customers LIMIT 25;')
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [activeViewTab, setActiveViewTab] = useState<'results' | 'history' | 'schema'>('results')
  const [historyList, setHistoryList] = useState<QueryHistoryItem[]>(() => databaseService.getHistory())
  const [copiedCell, setCopiedCell] = useState<string | null>(null)
  const [selectedJsonValue, setSelectedJsonValue] = useState<any | null>(null)
  const [resultFilter, setResultFilter] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    return databaseService.subscribe((db) => {
      setActiveDb(db)
      setAllDbs(databaseService.getAllDatabases())
    })
  }, [])

  // Auto-run initial sample query on mount
  useEffect(() => {
    handleRunQuery('SELECT * FROM customers LIMIT 25;')
  }, [])

  const handleRunQuery = (customSql?: string) => {
    const code = customSql ?? sqlQuery
    if (!code.trim()) return

    setIsRunning(true)
    setTimeout(() => {
      const res = databaseService.executeQuery(code)
      setQueryResult(res)
      setHistoryList(databaseService.getHistory())
      setIsRunning(false)
      setActiveViewTab('results')
    }, 40)
  }

  const handleTableQuickSelect = (tableName: string) => {
    const q = `SELECT * FROM ${tableName} LIMIT 50;`
    setSqlQuery(q)
    handleRunQuery(q)
  }

  const handleToggleTableExpand = (name: string) => {
    setExpandedTables((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  const handleDatabaseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    databaseService.setActiveDatabase(id)
    const newActive = databaseService.getActiveDatabase()
    const firstTable = Object.keys(newActive.tables)[0]
    if (firstTable) {
      const q = `SELECT * FROM ${firstTable} LIMIT 25;`
      setSqlQuery(q)
      handleRunQuery(q)
    }
  }

  const handleExportCsv = () => {
    if (!queryResult) return
    const csv = databaseService.exportToCsv(queryResult)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query_export_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportJson = () => {
    if (!queryResult) return
    const json = databaseService.exportToJson(queryResult)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query_export_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyCell = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCell(id)
    setTimeout(() => setCopiedCell(null), 1200)
  }

  const filteredTables = useMemo(() => {
    const q = tableSearch.toLowerCase().trim()
    if (!q) return Object.values(activeDb.tables)
    return Object.values(activeDb.tables).filter(
      (t) => t.name.toLowerCase().includes(q) || t.columns.some((c) => c.name.toLowerCase().includes(q))
    )
  }, [activeDb, tableSearch])

  // Filter and sort query result rows
  const displayRows = useMemo(() => {
    if (!queryResult || queryResult.rows.length === 0) return []
    let rows = [...queryResult.rows]

    if (resultFilter.trim()) {
      const term = resultFilter.toLowerCase().trim()
      rows = rows.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(term))
      )
    }

    if (sortConfig) {
      rows.sort((a, b) => {
        const valA = a[sortConfig.key]
        const valB = b[sortConfig.key]
        if (valA === valB) return 0
        if (valA === null || valA === undefined) return 1
        if (valB === null || valB === undefined) return -1
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA
        }
        return sortConfig.direction === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA))
      })
    }

    return rows
  }, [queryResult, resultFilter, sortConfig])

  const handleHeaderClick = (colName: string) => {
    setSortConfig((prev) => {
      if (prev && prev.key === colName) {
        if (prev.direction === 'asc') return { key: colName, direction: 'desc' }
        return null
      }
      return { key: colName, direction: 'asc' }
    })
  }

  // Handle Ctrl+Enter in SQL textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleRunQuery()
    }
  }

  return (
    <div className="db-studio-container glass-panel">
      {/* Studio Header Bar */}
      <div className="db-studio-header">
        <div className="header-left">
          <div className="db-icon-pill">
            <Database size={16} className="db-main-icon" />
          </div>
          <div>
            <div className="title-row">
              <span className="studio-title">Database Studio</span>
              <span className="dialect-badge">{activeDb.dialect.toUpperCase()}</span>
            </div>
            <select
              className="db-select-dropdown glass-interactive"
              value={activeDb.id}
              onChange={handleDatabaseChange}
            >
              {allDbs.map((db) => (
                <option key={db.id} value={db.id}>
                  {db.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="header-actions">
          {onToggleDockPosition && (
            <button
              className="dock-action-btn glass-interactive"
              onClick={onToggleDockPosition}
              title={`Switch Dock Position (Current: ${dockPosition})`}
            >
              {dockPosition === 'right' ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
            </button>
          )}
          {onClose && (
            <button className="dock-close-btn glass-interactive" onClick={onClose} title="Close Database Studio">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Studio Body: Split into Schema Explorer & Query Runner */}
      <div className="db-studio-body">
        {/* Left / Top: Schema Explorer Drawer */}
        <div className="schema-sidebar custom-scrollbar">
          <div className="schema-header">
            <span className="schema-section-title">TABLES & SCHEMAS</span>
            <span className="table-count-badge">{Object.keys(activeDb.tables).length}</span>
          </div>

          <div className="schema-search-box">
            <Search size={12} className="search-icon" />
            <input
              type="text"
              className="schema-search-input"
              placeholder="Search tables & columns..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
          </div>

          <div className="tables-list">
            {filteredTables.map((table) => {
              const isExpanded = expandedTables[table.name] ?? false
              return (
                <div key={table.name} className="table-tree-item">
                  <div
                    className="table-row-header glass-interactive"
                    onClick={() => handleToggleTableExpand(table.name)}
                  >
                    <div className="table-info-left">
                      {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      <TableIcon size={13} className="table-icon" />
                      <span className="table-name">{table.name}</span>
                    </div>
                    <div className="table-meta">
                      <span className="row-count-tag">{table.rowCount} rows</span>
                      <button
                        className="quick-select-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTableQuickSelect(table.name)
                        }}
                        title={`SELECT * FROM ${table.name}`}
                      >
                        <Play size={10} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="columns-sublist">
                      {table.columns.map((col) => (
                        <div key={col.name} className="column-row-item">
                          <div className="column-name-box">
                            {col.isPrimaryKey ? (
                              <span title="Primary Key"><Key size={11} className="key-icon primary" /></span>
                            ) : col.isForeignKey ? (
                              <span title={`Foreign Key -> ${col.foreignKeyRef?.table}`}><Link size={11} className="key-icon foreign" /></span>
                            ) : (
                              <Columns size={11} className="col-icon" />
                            )}
                            <span className="col-name">{col.name}</span>
                          </div>
                          <span className="col-type">{col.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right / Main: SQL Editor + Tabular Results Grid */}
        <div className="query-workspace">
          {/* SQL Editor Area */}
          <div className="sql-editor-container">
            <div className="editor-top-bar">
              <span className="editor-label">SQL QUERY RUNNER</span>
              <span className="shortcut-tip">Ctrl+Enter to Execute</span>
            </div>

            <textarea
              ref={textareaRef}
              className="sql-input-area custom-scrollbar"
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter SQL statement (e.g. SELECT * FROM customers JOIN orders ON customers.id = orders.customer_id;)"
              rows={3}
              spellCheck={false}
            />

            <div className="editor-action-bar">
              <div className="action-bar-left">
                <button
                  className={`run-query-btn glass-interactive ${isRunning ? 'running' : ''}`}
                  onClick={() => handleRunQuery()}
                  disabled={isRunning}
                >
                  <Play size={12} className="btn-icon" />
                  <span>{isRunning ? 'Executing...' : 'Run Query'}</span>
                </button>

                <button
                  className="preset-btn glass-interactive"
                  onClick={() => {
                    const first = Object.keys(activeDb.tables)[0]
                    setSqlQuery(`SELECT * FROM ${first} LIMIT 50;`)
                  }}
                  title="Reset query to default SELECT"
                >
                  <Sparkles size={11} />
                  <span>Preset</span>
                </button>

                <button
                  className="preset-btn glass-interactive"
                  onClick={() => setSqlQuery('')}
                  title="Clear SQL Editor"
                >
                  <span>Clear</span>
                </button>
              </div>

              {queryResult && (
                <div className="execution-stats">
                  {queryResult.error ? (
                    <span className="stat-error">
                      <AlertCircle size={12} /> Error
                    </span>
                  ) : (
                    <span className="stat-success">
                      <CheckCircle2 size={12} /> {queryResult.rowCount} rows in {queryResult.executionTimeMs}ms
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Results / History Navigation Tabs */}
          <div className="results-navigation-bar">
            <div
              className="nav-tabs"
              onWheel={(e) => {
                e.currentTarget.scrollLeft += e.deltaY
              }}
            >
              <button
                className={`tab-btn glass-interactive ${activeViewTab === 'results' ? 'active' : ''}`}
                onClick={() => setActiveViewTab('results')}
              >
                <TableIcon size={12} />
                <span>Results</span>
                {queryResult && !queryResult.error && (
                  <span className="tab-badge">{displayRows.length}</span>
                )}
              </button>
              <button
                className={`tab-btn glass-interactive ${activeViewTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveViewTab('history')}
              >
                <History size={12} />
                <span>History</span>
                <span className="tab-badge">{historyList.length}</span>
              </button>
            </div>

            {activeViewTab === 'results' && queryResult && !queryResult.error && queryResult.rows.length > 0 && (
              <div className="results-actions">
                <input
                  type="text"
                  className="results-filter-input"
                  placeholder="Filter rows..."
                  value={resultFilter}
                  onChange={(e) => setResultFilter(e.target.value)}
                />
                <button className="export-btn glass-interactive" onClick={handleExportCsv} title="Export CSV">
                  <Download size={12} />
                  <span>CSV</span>
                </button>
                <button className="export-btn glass-interactive" onClick={handleExportJson} title="Export JSON">
                  <Download size={12} />
                  <span>JSON</span>
                </button>
              </div>
            )}
          </div>

          {/* Tab Content: Tabular Results or Query History */}
          <div className="results-content-area custom-scrollbar">
            {activeViewTab === 'results' ? (
              queryResult ? (
                queryResult.error ? (
                  <div className="query-error-banner">
                    <AlertCircle size={18} className="error-icon" />
                    <div>
                      <div className="error-title">SQL Execution Failed</div>
                      <div className="error-desc">{queryResult.error}</div>
                    </div>
                  </div>
                ) : displayRows.length === 0 ? (
                  <div className="results-empty-state">
                    <Sparkles size={24} className="empty-sparkle" />
                    <p>Query executed successfully with 0 rows returned.</p>
                  </div>
                ) : (
                  <div className="table-scroll-wrapper custom-scrollbar">
                    <table className="db-data-table">
                      <thead>
                        <tr>
                          <th className="row-index-header">#</th>
                          {queryResult.columns.map((col) => (
                            <th
                              key={col}
                              className="sortable-header"
                              onClick={() => handleHeaderClick(col)}
                            >
                              <div className="th-content">
                                <span>{col}</span>
                                {sortConfig?.key === col && (
                                  <span className="sort-indicator">
                                    {sortConfig.direction === 'asc' ? '▲' : '▼'}
                                  </span>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayRows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            <td className="row-index-cell">{rIdx + 1}</td>
                            {queryResult.columns.map((col) => {
                              const val = row[col]
                              const isObject = typeof val === 'object' && val !== null
                              const displayVal = isObject
                                ? JSON.stringify(val)
                                : val === null || val === undefined
                                ? '<null>'
                                : String(val)
                              const cellId = `${rIdx}_${col}`

                              return (
                                <td
                                  key={col}
                                  className={`data-cell ${val === null ? 'null-cell' : ''}`}
                                  onDoubleClick={() => handleCopyCell(displayVal, cellId)}
                                  title="Double-click to copy cell value"
                                >
                                  <div className="cell-content">
                                    <span className="cell-text">{displayVal}</span>
                                    {copiedCell === cellId && (
                                      <span className="copy-badge">
                                        <Check size={10} />
                                      </span>
                                    )}
                                    {isObject && (
                                      <button
                                        className="view-json-btn"
                                        onClick={() => setSelectedJsonValue(val)}
                                        title="View nested JSON"
                                      >
                                        JSON
                                      </button>
                                    )}
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <div className="results-empty-state">
                  <Play size={24} className="empty-sparkle" />
                  <p>Write an SQL statement above and click <strong>Run Query</strong>.</p>
                </div>
              )
            ) : (
              /* History Tab */
              <div className="history-list">
                {historyList.length === 0 ? (
                  <div className="results-empty-state">
                    <History size={24} className="empty-sparkle" />
                    <p>No query execution history yet.</p>
                  </div>
                ) : (
                  historyList.map((item) => (
                    <div key={item.id} className="history-item glass-interactive">
                      <div className="history-header">
                        <div className="history-meta-left">
                          {item.success ? (
                            <CheckCircle2 size={12} className="history-icon success" />
                          ) : (
                            <AlertCircle size={12} className="history-icon error" />
                          )}
                          <span className="history-time">
                            <Clock size={10} /> {new Date(item.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="history-duration">{item.executionTimeMs}ms</span>
                          {item.success && (
                            <span className="history-rows">{item.rowCount} rows</span>
                          )}
                        </div>
                        <button
                          className="history-rerun-btn glass-interactive"
                          onClick={() => {
                            setSqlQuery(item.query)
                            handleRunQuery(item.query)
                          }}
                          title="Load & Rerun Query"
                        >
                          <Play size={10} />
                          <span>Run</span>
                        </button>
                      </div>
                      <pre className="history-sql">{item.query}</pre>
                      {item.error && <div className="history-error">{item.error}</div>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* JSON Viewer Modal Popup for nested complex fields */}
      {selectedJsonValue && (
        <div className="json-modal-backdrop" onClick={() => setSelectedJsonValue(null)}>
          <div className="json-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="json-modal-header">
              <span className="json-modal-title">JSON Document Inspector</span>
              <button className="dock-close-btn" onClick={() => setSelectedJsonValue(null)}>
                <X size={14} />
              </button>
            </div>
            <pre className="json-modal-content custom-scrollbar">
              {JSON.stringify(selectedJsonValue, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <style>{`
        .db-studio-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(14, 18, 30, 0.92);
          backdrop-filter: blur(28px) saturate(190%);
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.9);
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        .db-studio-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
          flex-shrink: 0;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .db-icon-pill {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, rgba(10, 132, 255, 0.3), rgba(48, 209, 88, 0.3));
          border: 1px solid rgba(255, 255, 255, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .db-main-icon {
          color: #30D158;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .studio-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: #FFFFFF;
        }

        .dialect-badge {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(48, 209, 88, 0.2);
          border: 1px solid rgba(48, 209, 88, 0.4);
          color: #30D158;
        }

        .db-select-dropdown {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: rgba(255, 255, 255, 0.9);
          border-radius: 6px;
          font-size: 0.74rem;
          padding: 2px 6px;
          margin-top: 2px;
          outline: none;
          cursor: pointer;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .dock-action-btn, .dock-close-btn {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .dock-action-btn:hover, .dock-close-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #FFFFFF;
        }

        .db-studio-body {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        /* Schema Sidebar */
        .schema-sidebar {
          width: 220px;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          flex-shrink: 0;
        }

        .schema-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .schema-section-title {
          font-size: 0.68rem;
          font-weight: 700;
          color: rgba(235, 235, 245, 0.5);
          letter-spacing: 0.05em;
        }

        .table-count-badge {
          font-size: 0.65rem;
          background: rgba(255, 255, 255, 0.08);
          padding: 1px 6px;
          border-radius: 10px;
        }

        .schema-search-box {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 6px 10px;
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
        }

        .schema-search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #FFFFFF;
          font-size: 0.72rem;
        }

        .schema-search-input::placeholder {
          color: rgba(235, 235, 245, 0.35);
        }

        .tables-list {
          padding: 4px 6px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .table-tree-item {
          display: flex;
          flex-direction: column;
        }

        .table-row-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 5px 8px;
          border-radius: 6px;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.02);
          transition: background 0.15s ease;
        }

        .table-row-header:hover {
          background: rgba(255, 255, 255, 0.07);
        }

        .table-info-left {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow: hidden;
        }

        .table-icon {
          color: #0A84FF;
          flex-shrink: 0;
        }

        .table-name {
          font-size: 0.76rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .table-meta {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .row-count-tag {
          font-size: 0.62rem;
          color: rgba(235, 235, 245, 0.4);
        }

        .quick-select-btn {
          background: rgba(10, 132, 255, 0.15);
          border: 1px solid rgba(10, 132, 255, 0.3);
          border-radius: 4px;
          color: #5AC8FA;
          padding: 2px 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .quick-select-btn:hover {
          background: rgba(10, 132, 255, 0.3);
        }

        .columns-sublist {
          display: flex;
          flex-direction: column;
          padding-left: 18px;
          margin: 2px 0 4px;
          gap: 2px;
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          margin-left: 12px;
        }

        .column-row-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 3px 6px;
          border-radius: 4px;
        }

        .column-row-item:hover {
          background: rgba(255, 255, 255, 0.04);
        }

        .column-name-box {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .key-icon.primary {
          color: #FFD60A;
        }

        .key-icon.foreign {
          color: #BF5AF2;
        }

        .col-icon {
          color: rgba(235, 235, 245, 0.35);
        }

        .col-name {
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.85);
        }

        .col-type {
          font-size: 0.62rem;
          color: rgba(235, 235, 245, 0.45);
          font-family: monospace;
        }

        /* Query Workspace */
        .query-workspace {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .sql-editor-container {
          padding: 10px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
        }

        .editor-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .editor-label {
          font-size: 0.68rem;
          font-weight: 700;
          color: rgba(235, 235, 245, 0.5);
          letter-spacing: 0.05em;
        }

        .shortcut-tip {
          font-size: 0.65rem;
          color: rgba(235, 235, 245, 0.4);
        }

        .sql-input-area {
          width: 100%;
          background: rgba(10, 14, 26, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          color: #FFFFFF;
          font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
          font-size: 0.82rem;
          padding: 8px 10px;
          resize: vertical;
          outline: none;
          box-sizing: border-box;
          line-height: 1.4;
        }

        .sql-input-area:focus {
          border-color: #0A84FF;
          box-shadow: 0 0 0 2px rgba(10, 132, 255, 0.2);
        }

        .editor-action-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 8px;
        }

        .action-bar-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .run-query-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 6px;
          background: linear-gradient(135deg, #0A84FF, #0070D2);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #FFFFFF;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(10, 132, 255, 0.3);
          transition: all 0.15s ease;
        }

        .run-query-btn:hover {
          filter: brightness(1.1);
        }

        .preset-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.72rem;
          cursor: pointer;
        }

        .preset-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #FFFFFF;
        }

        .execution-stats {
          font-size: 0.72rem;
        }

        .stat-success {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #30D158;
        }

        .stat-error {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #FF453A;
        }

        /* Results Navigation */
        .results-navigation-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
        }

        .nav-tabs {
          display: flex;
          gap: 4px;
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 6px;
          background: transparent;
          border: 1px solid transparent;
          color: rgba(235, 235, 245, 0.6);
          font-size: 0.74rem;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .tab-btn:hover {
          color: #FFFFFF;
        }

        .tab-btn.active {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.14);
          color: #FFFFFF;
        }

        .tab-badge {
          font-size: 0.65rem;
          background: rgba(255, 255, 255, 0.12);
          padding: 1px 5px;
          border-radius: 8px;
        }

        .results-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .results-filter-input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #FFFFFF;
          font-size: 0.72rem;
          padding: 3px 8px;
          outline: none;
          width: 110px;
        }

        .export-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(235, 235, 245, 0.8);
          font-size: 0.7rem;
          cursor: pointer;
        }

        .export-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #FFFFFF;
        }

        /* Results Content & Data Table */
        .results-content-area {
          flex: 1;
          overflow: auto;
          position: relative;
        }

        .query-error-banner {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 16px;
          padding: 12px 16px;
          border-radius: 8px;
          background: rgba(255, 69, 58, 0.12);
          border: 1px solid rgba(255, 69, 58, 0.3);
          color: #FF453A;
        }

        .error-title {
          font-weight: 700;
          font-size: 0.8rem;
        }

        .error-desc {
          font-size: 0.74rem;
          margin-top: 2px;
          opacity: 0.9;
        }

        .results-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: rgba(235, 235, 245, 0.4);
          gap: 8px;
          font-size: 0.8rem;
        }

        .table-scroll-wrapper {
          width: 100%;
          height: 100%;
          overflow: auto;
        }

        .db-data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.74rem;
          text-align: left;
        }

        .db-data-table th {
          position: sticky;
          top: 0;
          background: rgba(18, 22, 38, 0.95);
          backdrop-filter: blur(12px);
          padding: 7px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          font-weight: 600;
          color: rgba(255, 255, 255, 0.85);
          white-space: nowrap;
          z-index: 2;
        }

        .sortable-header {
          cursor: pointer;
          user-select: none;
        }

        .sortable-header:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #0A84FF;
        }

        .th-content {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .sort-indicator {
          font-size: 0.6rem;
          color: #0A84FF;
        }

        .row-index-header, .row-index-cell {
          width: 32px;
          text-align: center;
          color: rgba(235, 235, 245, 0.35);
          font-family: monospace;
          background: rgba(0, 0, 0, 0.15);
        }

        .db-data-table td {
          padding: 6px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.88);
          white-space: nowrap;
          max-width: 280px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .db-data-table tr:hover td {
          background: rgba(255, 255, 255, 0.04);
        }

        .null-cell {
          color: rgba(235, 235, 245, 0.3) !important;
          font-style: italic;
        }

        .cell-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4px;
        }

        .view-json-btn {
          font-size: 0.6rem;
          padding: 1px 4px;
          border-radius: 3px;
          background: rgba(191, 90, 242, 0.2);
          border: 1px solid rgba(191, 90, 242, 0.4);
          color: #BF5AF2;
          cursor: pointer;
        }

        .copy-badge {
          color: #30D158;
        }

        /* History Tab */
        .history-list {
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .history-item {
          padding: 8px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .history-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .history-meta-left {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.5);
        }

        .history-icon.success {
          color: #30D158;
        }

        .history-icon.error {
          color: #FF453A;
        }

        .history-rerun-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 4px;
          background: rgba(10, 132, 255, 0.15);
          border: 1px solid rgba(10, 132, 255, 0.3);
          color: #5AC8FA;
          font-size: 0.68rem;
          cursor: pointer;
        }

        .history-sql {
          margin: 0;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.9);
          white-space: pre-wrap;
        }

        .history-error {
          font-size: 0.68rem;
          color: #FF453A;
          margin-top: 4px;
        }

        /* JSON Modal */
        .json-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          z-index: 1100;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .json-modal {
          width: 500px;
          max-width: 90vw;
          max-height: 80vh;
          border-radius: 12px;
          background: rgba(16, 20, 36, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.15);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .json-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .json-modal-title {
          font-size: 0.85rem;
          font-weight: 600;
        }

        .json-modal-content {
          padding: 14px 16px;
          font-family: monospace;
          font-size: 0.75rem;
          color: #30D158;
          overflow-y: auto;
          margin: 0;
        }
      `}</style>
    </div>
  )
}

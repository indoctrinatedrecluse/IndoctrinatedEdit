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
  FolderOpen,
  Plus,
  Save,
  Trash2,
  RotateCcw,
} from 'lucide-react'
import {
  databaseService,
  DatabaseSchema,
  QueryResult,
  QueryHistoryItem,
} from '../../services/databaseService'
import './DatabaseStudio.css'

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
  const [statusBanner, setStatusBanner] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    return databaseService.subscribe((db) => {
      setActiveDb(db)
      setAllDbs(databaseService.getAllDatabases())
    })
  }, [])

  // Auto-run initial query on mount for the active database's first table
  useEffect(() => {
    const firstTable = Object.keys(activeDb.tables)[0]
    if (firstTable) {
      const q = `SELECT * FROM ${firstTable} LIMIT 25;`
      setSqlQuery(q)
      void handleRunQuery(q)
    }
  }, [])

  const handleRunQuery = async (customSql?: string) => {
    const code = customSql ?? sqlQuery
    if (!code.trim()) return

    setIsRunning(true)
    try {
      const res = await databaseService.executeQueryAsync(code)
      setQueryResult(res)
      setHistoryList(databaseService.getHistory())
      setActiveViewTab('results')
    } finally {
      setIsRunning(false)
    }
  }

  const handleOpenSqlite = async () => {
    const res = await databaseService.openSqliteFileAsync()
    if (res.ok && res.db) {
      setStatusBanner(`Opened ${res.db.name}`)
      const firstTable = Object.keys(res.db.tables)[0]
      if (firstTable) {
        const q = `SELECT * FROM "${firstTable}" LIMIT 50;`
        setSqlQuery(q)
        await handleRunQuery(q)
      }
    } else if (res.error && !res.canceled) {
      setStatusBanner(`Error: ${res.error}`)
    }
  }

  const handleNewSqlite = async () => {
    const res = await databaseService.createSqliteDbAsync()
    if (res.ok && res.db) {
      setStatusBanner(`Created live SQLite 3 WASM database: ${res.db.name}`)
      const q = 'SELECT * FROM notes LIMIT 25;'
      setSqlQuery(q)
      await handleRunQuery(q)
    } else if (res.error) {
      setStatusBanner(`Error: ${res.error}`)
    }
  }

  const handleSaveSqlite = async () => {
    const res = await databaseService.saveSqliteFileAsync()
    if (res.ok && res.filePath) {
      setStatusBanner(`Saved SQLite DB to ${res.filePath}`)
    } else if (res.error && !res.canceled) {
      setStatusBanner(`Error: ${res.error}`)
    }
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
          <button
            className="dock-action-btn glass-interactive"
            onClick={() => void handleOpenSqlite()}
            title="Open local .sqlite / .db file (sql.js WASM)"
          >
            <FolderOpen size={13} />
          </button>
          <button
            className="dock-action-btn glass-interactive"
            onClick={() => void handleNewSqlite()}
            title="New Live SQLite 3 Database (sql.js WASM)"
          >
            <Plus size={13} />
          </button>
          {activeDb.isLiveSqlite && (
            <button
              className="dock-action-btn glass-interactive"
              onClick={() => void handleSaveSqlite()}
              title="Save SQLite Database to Disk"
            >
              <Save size={13} />
            </button>
          )}
          <button
            className="dock-action-btn glass-interactive"
            onClick={() => {
              databaseService.resetToDefaults()
              setAllDbs(databaseService.getAllDatabases())
              setActiveDb(databaseService.getActiveDatabase())
              setStatusBanner('Reset sample databases to defaults.')
            }}
            title="Reset Sample Databases"
          >
            <RotateCcw size={13} />
          </button>
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
              <button
                className={`tab-btn glass-interactive ${activeViewTab === 'schema' ? 'active' : ''}`}
                onClick={() => setActiveViewTab('schema')}
              >
                <Columns size={12} />
                <span>Schema &amp; DDL</span>
                <span className="tab-badge">{Object.keys(activeDb.tables).length}</span>
              </button>
            </div>

            {statusBanner && (
              <span style={{ fontSize: 11, color: '#64D2FF', marginLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {statusBanner}
              </span>
            )}

            {activeViewTab === 'history' && historyList.length > 0 && (
              <div className="results-actions">
                <button
                  className="export-btn glass-interactive"
                  onClick={() => {
                    databaseService.clearHistory()
                    setHistoryList([])
                  }}
                  title="Clear Query History"
                >
                  <Trash2 size={12} />
                  <span>Clear</span>
                </button>
              </div>
            )}

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
            ) : activeViewTab === 'schema' ? (
              <div className="schema-ddl-view" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.values(activeDb.tables).length === 0 ? (
                  <div className="results-empty-state">
                    <Columns size={24} className="empty-sparkle" />
                    <p>No tables found in this database. Run a <code>CREATE TABLE</code> query above.</p>
                  </div>
                ) : (
                  Object.values(activeDb.tables).map((tbl) => {
                    const ddlCols = tbl.columns
                      .map((c) => {
                        const parts = [`  "${c.name}" ${c.type}`]
                        if (c.isPrimaryKey) parts.push('PRIMARY KEY')
                        if (c.isNullable === false && !c.isPrimaryKey) parts.push('NOT NULL')
                        if (c.defaultValue !== undefined) parts.push(`DEFAULT ${c.defaultValue}`)
                        if (c.isForeignKey && c.foreignKeyRef) {
                          parts.push(`REFERENCES "${c.foreignKeyRef.table}"("${c.foreignKeyRef.column}")`)
                        }
                        return parts.join(' ')
                      })
                      .join(',\n')
                    const ddl = `CREATE TABLE "${tbl.name}" (\n${ddlCols}\n);`
                    return (
                      <div key={tbl.name} className="history-item">
                        <div className="history-header">
                          <div className="history-meta-left">
                            <TableIcon size={12} className="table-icon" />
                            <strong style={{ color: '#F8FAFC' }}>{tbl.name}</strong>
                            <span className="history-rows">{tbl.columns.length} cols · {tbl.rowCount ?? tbl.data.length} rows</span>
                            {tbl.indexes && tbl.indexes.length > 0 && (
                              <span className="history-duration">Indexes: {tbl.indexes.map((ix) => ix.name).join(', ')}</span>
                            )}
                          </div>
                          <button
                            className="history-rerun-btn glass-interactive"
                            onClick={() => handleTableQuickSelect(tbl.name)}
                          >
                            <Play size={10} /> <span>Inspect</span>
                          </button>
                        </div>
                        <pre className="history-sql">{ddl}</pre>
                      </div>
                    )
                  })
                )}
              </div>
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

    </div>
  )
}

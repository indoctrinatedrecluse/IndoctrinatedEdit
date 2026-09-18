import React, { useState, useMemo } from 'react'
import {
  Globe,
  Play,
  Copy,
  Check,
  Code2,
  Search,
} from 'lucide-react'
import {
  graphQLStudioService,
  GraphQLQueryExecutionResult,
} from '../../services/graphQLStudioService'

export const GraphQLStudioView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'composer' | 'schema' | 'export'>('composer')
  const [endpointUrl, setEndpointUrl] = useState<string>(() => graphQLStudioService.getDefaultEndpoint())
  const [queryCode, setQueryCode] = useState<string>(`query GetWorkspaceData {
  users(limit: 5) {
    id
    username
    email
    role
    activeProjectsCount
  }
  workspaceMetrics {
    cpuUsagePercent
    memoryUsageMb
    activeAiSessions
  }
}`)
  const [variablesJson, setVariablesJson] = useState<string>('{\n  "limit": 5\n}')
  const [execResult, setExecResult] = useState<GraphQLQueryExecutionResult | null>(null)
  const [isExecuting, setIsExecuting] = useState<boolean>(false)
  const [schemaFilter, setSchemaFilter] = useState<string>('')
  const [exportLang, setExportLang] = useState<'apollo' | 'urql' | 'fetch' | 'curl' | 'typescript'>('apollo')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const schemaDoc = useMemo(() => {
    return graphQLStudioService.getSchema()
  }, [])

  const filteredTypes = useMemo(() => {
    if (!schemaFilter.trim()) return schemaDoc.types
    const q = schemaFilter.toLowerCase()
    return schemaDoc.types.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.fields?.some((f) => f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q))
    )
  }, [schemaDoc, schemaFilter])

  const handleRunQuery = async () => {
    setIsExecuting(true)
    try {
      const res = await graphQLStudioService.executeQuery(endpointUrl, queryCode, variablesJson)
      setExecResult(res)
    } finally {
      setIsExecuting(false)
    }
  }

  const exportedCode = useMemo(() => {
    return graphQLStudioService.exportCode(queryCode, exportLang)
  }, [queryCode, exportLang])

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1800)
  }

  return (
    <div className="graphql-studio-root">
      {/* Sub-Nav Strip */}
      <div
        className="graphql-subnav"
        onWheel={(e) => {
          e.currentTarget.scrollLeft += e.deltaY
        }}
      >
        <button
          className={`gql-tab-btn glass-interactive ${activeTab === 'composer' ? 'active' : ''}`}
          onClick={() => setActiveTab('composer')}
        >
          <Play size={12} />
          <span>Query Runner</span>
        </button>

        <button
          className={`gql-tab-btn glass-interactive ${activeTab === 'schema' ? 'active' : ''}`}
          onClick={() => setActiveTab('schema')}
        >
          <Globe size={12} />
          <span>Schema Explorer</span>
        </button>

        <button
          className={`gql-tab-btn glass-interactive ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          <Code2 size={12} />
          <span>Code Exporter</span>
        </button>
      </div>

      {/* Composer & Execution Tab */}
      {activeTab === 'composer' && (
        <div className="composer-layout">
          {/* Endpoint Bar */}
          <div className="endpoint-bar glass-panel">
            <span className="post-badge">POST</span>
            <input
              type="text"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              className="endpoint-input"
            />
            <button
              className="run-query-btn glass-interactive"
              onClick={handleRunQuery}
              disabled={isExecuting}
            >
              <Play size={11} className={isExecuting ? 'spinning' : ''} fill="#30D158" />
              <span>{isExecuting ? 'Running...' : 'Execute'}</span>
            </button>
          </div>

          {/* Split Query Editor & Result Viewer */}
          <div className="composer-grid">
            <div className="editor-col">
              <div className="col-header">
                <span>GraphQL Query</span>
              </div>
              <textarea
                value={queryCode}
                onChange={(e) => setQueryCode(e.target.value)}
                className="query-textarea"
                rows={10}
              />
              <div className="variables-header">
                <span>Query Variables (JSON)</span>
              </div>
              <textarea
                value={variablesJson}
                onChange={(e) => setVariablesJson(e.target.value)}
                className="variables-textarea"
                rows={4}
              />
            </div>

            <div className="result-col">
              <div className="col-header result-head">
                <span>Response</span>
                {execResult && (
                  <div className="result-stats">
                    <span className="timing">{execResult.durationMs}ms</span>
                    <span className="size">{execResult.sizeBytes} B</span>
                    <button
                      className="copy-res-btn glass-interactive"
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(execResult.data || execResult.errors, null, 2),
                          'gql_res'
                        )
                      }
                    >
                      {copiedKey === 'gql_res' ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  </div>
                )}
              </div>
              <pre className="result-body-box">
                <code>
                  {execResult
                    ? JSON.stringify(execResult.data || execResult.errors, null, 2)
                    : '// Hit Execute to run GraphQL query against endpoint'}
                </code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Schema Introspection Explorer */}
      {activeTab === 'schema' && (
        <div className="schema-layout">
          <div className="schema-search-box">
            <Search size={12} className="search-icon" />
            <input
              type="text"
              value={schemaFilter}
              onChange={(e) => setSchemaFilter(e.target.value)}
              placeholder="Search types, queries, fields..."
              className="schema-search-input"
            />
          </div>

          <div className="types-tree-feed">
            {filteredTypes.map((t) => (
              <div key={t.name} className="type-card glass-panel">
                <div className="type-top">
                  <span className={`kind-pill ${t.kind.toLowerCase()}`}>{t.kind}</span>
                  <span className="type-name">{t.name}</span>
                </div>
                {t.description && <div className="type-desc">{t.description}</div>}
                {t.fields && (
                  <div className="fields-table">
                    {t.fields.map((f) => (
                      <div key={f.name} className="field-row">
                        <span className="field-name">{f.name}</span>
                        <span className="field-type">{f.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code Exporter Tab */}
      {activeTab === 'export' && (
        <div className="export-layout">
          <div className="export-lang-bar">
            {(['apollo', 'urql', 'fetch', 'curl', 'typescript'] as const).map((lang) => (
              <button
                key={lang}
                className={`lang-pill glass-interactive ${exportLang === lang ? 'active' : ''}`}
                onClick={() => setExportLang(lang)}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="export-code-box glass-panel">
            <div className="export-head">
              <span>{exportLang.toUpperCase()} Implementation</span>
              <button
                className="copy-export-btn glass-interactive"
                onClick={() => copyToClipboard(exportedCode, 'exported_gql')}
              >
                {copiedKey === 'exported_gql' ? <Check size={11} /> : <Copy size={11} />}
                <span>Copy</span>
              </button>
            </div>
            <pre className="export-body">
              <code>{exportedCode}</code>
            </pre>
          </div>
        </div>
      )}

      <style>{`
        .graphql-studio-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(10, 14, 24, 0.95);
          color: #E2E8F0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 0.78rem;
          overflow: hidden;
        }

        .graphql-subnav {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.25);
          overflow-x: auto;
          white-space: nowrap;
        }

        .gql-tab-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          border-radius: 5px;
          background: transparent;
          border: 1px solid transparent;
          color: rgba(235, 235, 245, 0.65);
          font-size: 0.72rem;
          cursor: pointer;
        }

        .gql-tab-btn.active {
          background: rgba(255, 159, 10, 0.15);
          border-color: rgba(255, 159, 10, 0.35);
          color: #FF9F0A;
          font-weight: 600;
        }

        .composer-layout {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
          padding: 8px;
          gap: 8px;
        }

        .endpoint-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 8px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.3);
        }

        .post-badge {
          background: rgba(255, 159, 10, 0.2);
          color: #FF9F0A;
          font-weight: 700;
          font-size: 0.65rem;
          padding: 1px 4px;
          border-radius: 3px;
        }

        .endpoint-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #FFFFFF;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          outline: none;
        }

        .run-query-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(48, 209, 88, 0.15);
          border: 1px solid rgba(48, 209, 88, 0.35);
          color: #30D158;
          border-radius: 4px;
          padding: 3px 8px;
          font-weight: 600;
          font-size: 0.7rem;
          cursor: pointer;
        }

        .composer-grid {
          display: flex;
          flex: 1;
          gap: 8px;
          overflow: hidden;
        }

        .editor-col, .result-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }

        .col-header {
          padding: 5px 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.5);
          background: rgba(255, 255, 255, 0.02);
        }

        .result-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .result-stats {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.65rem;
          color: #30D158;
        }

        .copy-res-btn {
          background: transparent;
          border: none;
          color: rgba(235, 235, 245, 0.6);
          cursor: pointer;
        }

        .query-textarea, .variables-textarea {
          background: transparent;
          border: none;
          padding: 8px;
          color: #64D2FF;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          outline: none;
          resize: none;
        }

        .query-textarea { flex: 2; }
        .variables-textarea { flex: 1; border-top: 1px solid rgba(255, 255, 255, 0.06); color: #FFD60A; }

        .variables-header {
          padding: 3px 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 0.65rem;
          color: rgba(235, 235, 245, 0.4);
          background: rgba(255, 255, 255, 0.01);
        }

        .result-body-box {
          margin: 0;
          padding: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          color: #FFD60A;
          overflow-y: auto;
          flex: 1;
        }

        .schema-layout {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
          padding: 8px;
          gap: 6px;
        }

        .schema-search-box {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 5px;
          padding: 4px 8px;
        }

        .schema-search-input {
          background: transparent;
          border: none;
          color: #FFFFFF;
          font-size: 0.72rem;
          width: 100%;
          outline: none;
        }

        .types-tree-feed {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .type-card {
          padding: 8px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.02);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .type-top {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .kind-pill {
          font-size: 0.58rem;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 3px;
        }

        .kind-pill.object { background: rgba(10, 132, 255, 0.2); color: #64D2FF; }
        .kind-pill.enum { background: rgba(255, 159, 10, 0.2); color: #FF9F0A; }
        .kind-pill.input_object { background: rgba(191, 90, 242, 0.2); color: #BF5AF2; }

        .type-name {
          font-weight: 600;
          color: #FFFFFF;
          font-family: 'JetBrains Mono', monospace;
        }

        .type-desc {
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.6);
        }

        .fields-table {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-top: 4px;
          padding-left: 8px;
          border-left: 2px solid rgba(255, 255, 255, 0.08);
        }

        .field-row {
          display: flex;
          justify-content: space-between;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem;
        }

        .field-name { color: #64D2FF; }
        .field-type { color: #FF9F0A; }

        .export-layout {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
          padding: 8px;
          gap: 8px;
        }

        .export-lang-bar {
          display: flex;
          gap: 4px;
        }

        .lang-pill {
          padding: 3px 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(235, 235, 245, 0.6);
          font-size: 0.68rem;
          font-weight: 600;
          cursor: pointer;
        }

        .lang-pill.active {
          background: rgba(255, 159, 10, 0.2);
          border-color: rgba(255, 159, 10, 0.4);
          color: #FF9F0A;
        }

        .export-code-box {
          flex: 1;
          display: flex;
          flex-direction: column;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.4);
          overflow: hidden;
        }

        .export-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.5);
        }

        .copy-export-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: transparent;
          border: none;
          color: #64D2FF;
          font-size: 0.68rem;
          cursor: pointer;
        }

        .export-body {
          margin: 0;
          padding: 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          color: #FFD60A;
          overflow-y: auto;
          flex: 1;
        }
      `}</style>
    </div>
  )
}

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
import './GraphQLStudioView.css'

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

    </div>
  )
}

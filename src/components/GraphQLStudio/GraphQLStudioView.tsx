import React, { useState, useMemo } from 'react'
import {
  Globe,
  Play,
  Copy,
  Check,
  Code2,
  Search,
  RefreshCw,
  FolderOpen,
  Cpu,
} from 'lucide-react'
import {
  graphQLStudioService,
  GraphQLQueryExecutionResult,
  GraphQLSchemaDoc,
} from '../../services/graphQLStudioService'
import './GraphQLStudioView.css'

export const GraphQLStudioView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'composer' | 'schema' | 'grpc' | 'export'>('composer')
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
  const [headersJson, setHeadersJson] = useState<string>('{\n  "Content-Type": "application/json"\n}')
  const [headersError, setHeadersError] = useState<string | null>(null)
  const [execResult, setExecResult] = useState<GraphQLQueryExecutionResult | null>(null)
  const [isExecuting, setIsExecuting] = useState<boolean>(false)
  const [schemaDoc, setSchemaDoc] = useState<GraphQLSchemaDoc>(() => graphQLStudioService.getSchema())
  const [isIntrospecting, setIsIntrospecting] = useState<boolean>(false)
  const [schemaStatus, setSchemaStatus] = useState<string | null>(null)
  const [schemaFilter, setSchemaFilter] = useState<string>('')
  const [exportLang, setExportLang] = useState<'apollo' | 'urql' | 'fetch' | 'curl' | 'typescript'>('apollo')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Real gRPC Client State (wired to Electron @grpc/grpc-js + @grpc/proto-loader)
  const [protoPath, setProtoPath] = useState<string>('')
  const [grpcServices, setGrpcServices] = useState<Array<{ name: string; methods: string[] }>>([])
  const [selectedService, setSelectedService] = useState<string>('')
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [grpcAddress, setGrpcAddress] = useState<string>('127.0.0.1:50051')
  const [grpcUseTls, setGrpcUseTls] = useState<boolean>(false)
  const [grpcMetadata, setGrpcMetadata] = useState<string>('{}')
  const [grpcPayload, setGrpcPayload] = useState<string>('{\n  "name": "world"\n}')
  const [grpcResponse, setGrpcResponse] = useState<string>('')
  const [grpcLatency, setGrpcLatency] = useState<number | null>(null)
  const [isGrpcRunning, setIsGrpcRunning] = useState<boolean>(false)

  const filteredTypes = useMemo(() => {
    if (!schemaFilter.trim()) return schemaDoc.types
    const q = schemaFilter.toLowerCase()
    return schemaDoc.types.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.fields?.some((f) => f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q))
    )
  }, [schemaDoc, schemaFilter])

  const parseHeaders = (): Record<string, string> | null => {
    try {
      const p = JSON.parse(headersJson || '{}')
      if (p && typeof p === 'object' && !Array.isArray(p)) {
        setHeadersError(null)
        return p
      }
      setHeadersError('HTTP Headers must be a JSON object')
      return null
    } catch (err: any) {
      setHeadersError(`Invalid Headers JSON: ${err?.message || 'parse error'}`)
      return null
    }
  }

  const handleRunQuery = async () => {
    const parsedHeaders = parseHeaders()
    if (!parsedHeaders) return
    setIsExecuting(true)
    try {
      const res = await graphQLStudioService.executeQuery(endpointUrl, queryCode, variablesJson, parsedHeaders)
      setExecResult(res)
    } finally {
      setIsExecuting(false)
    }
  }

  const handleIntrospectLive = async () => {
    const parsedHeaders = parseHeaders()
    if (!parsedHeaders) return
    setIsIntrospecting(true)
    setSchemaStatus(null)
    try {
      const types = await graphQLStudioService.introspectSchema(endpointUrl, parsedHeaders)
      if (types && types.length > 0) {
        setSchemaDoc({ queryType: 'Query', types })
        setSchemaStatus(`Introspected ${types.length} live GraphQL types from ${endpointUrl}`)
      } else {
        setSchemaStatus(`Introspection failed: endpoint unreachable or introspection disabled`)
      }
    } finally {
      setIsIntrospecting(false)
    }
  }

  const handlePickProto = async () => {
    const picked = await window.electronAPI?.openFileDialog?.()
    if (!picked?.path) return
    setProtoPath(picked.path)
    await handleInspectProto(picked.path)
  }

  const handleInspectProto = async (targetPath = protoPath) => {
    if (!targetPath.trim()) return
    setIsGrpcRunning(true)
    try {
      const res = await graphQLStudioService.inspectGrpcProto(targetPath.trim())
      if (res.ok && res.services.length > 0) {
        setGrpcServices(res.services)
        setSelectedService(res.services[0].name)
        setSelectedMethod(res.services[0].methods[0] || '')
        setGrpcResponse(`// Loaded ${res.services.length} gRPC service(s) from ${targetPath}`)
      } else {
        setGrpcServices([])
        setGrpcResponse(`// Proto inspection failed: ${res.error || 'No services found'}`)
      }
    } finally {
      setIsGrpcRunning(false)
    }
  }

  const handleInvokeGrpc = async () => {
    if (!protoPath || !selectedService || !selectedMethod) return
    setIsGrpcRunning(true)
    setGrpcLatency(null)
    try {
      let payloadObj: Record<string, any> = {}
      let metaObj: Record<string, string> = {}
      try {
        payloadObj = JSON.parse(grpcPayload || '{}')
      } catch (err: any) {
        setGrpcResponse(`Payload JSON Error: ${err?.message || 'Invalid JSON'}`)
        return
      }
      try {
        metaObj = JSON.parse(grpcMetadata || '{}')
      } catch (err: any) {
        setGrpcResponse(`Metadata JSON Error: ${err?.message || 'Invalid JSON'}`)
        return
      }
      const res = await graphQLStudioService.invokeGrpcUnary({
        protoPath,
        address: grpcAddress,
        serviceName: selectedService,
        methodName: selectedMethod,
        payload: payloadObj,
        metadata: metaObj,
        useTls: grpcUseTls,
      })
      setGrpcLatency(res.latencyMs)
      setGrpcResponse(res.ok ? JSON.stringify(res.response, null, 2) : `gRPC Error: ${res.error}`)
    } finally {
      setIsGrpcRunning(false)
    }
  }

  const exportedCode = useMemo(() => {
    let parsedHeaders: Record<string, string> = {}
    try {
      const p = JSON.parse(headersJson || '{}')
      if (p && typeof p === 'object' && !Array.isArray(p)) parsedHeaders = p
    } catch {}
    return graphQLStudioService.exportCode(queryCode, exportLang, endpointUrl, variablesJson, parsedHeaders)
  }, [queryCode, exportLang, endpointUrl, variablesJson, headersJson])

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
          className={`gql-tab-btn glass-interactive ${activeTab === 'grpc' ? 'active' : ''}`}
          onClick={() => setActiveTab('grpc')}
        >
          <Cpu size={12} />
          <span>gRPC Client</span>
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
                rows={3}
              />
              <div className="variables-header">
                <span>HTTP Headers (JSON)</span>
              </div>
              <textarea
                value={headersJson}
                onChange={(e) => { setHeadersJson(e.target.value); if (headersError) setHeadersError(null) }}
                className="variables-textarea"
                rows={2}
              />
              {headersError && (
                <div style={{ fontSize: 10, color: '#FB7185', marginTop: 2 }}>{headersError}</div>
              )}
            </div>

            <div className="result-col">
              <div className="col-header result-head">
                <span>Response</span>
                {execResult && (
                  <div className="result-stats">
                    <span className="timing">HTTP {execResult.statusCode}</span>
                    <span className="timing">{execResult.durationMs}ms</span>
                    <span className="size">{execResult.sizeBytes} B</span>
                    <button
                      className="copy-res-btn glass-interactive"
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(
                            { ...(execResult.data !== undefined ? { data: execResult.data } : {}), ...(execResult.errors ? { errors: execResult.errors } : {}) },
                            null,
                            2
                          ),
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
                    ? JSON.stringify(
                        { ...(execResult.data !== undefined ? { data: execResult.data } : {}), ...(execResult.errors ? { errors: execResult.errors } : {}) },
                        null,
                        2
                      )
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
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div className="schema-search-box" style={{ flex: 1 }}>
              <Search size={12} className="search-icon" />
              <input
                type="text"
                value={schemaFilter}
                onChange={(e) => setSchemaFilter(e.target.value)}
                placeholder="Search types, queries, fields..."
                className="schema-search-input"
              />
            </div>
            <button
              className="run-query-btn glass-interactive"
              onClick={() => void handleIntrospectLive()}
              disabled={isIntrospecting}
              title="Run live GraphQL __schema introspection against active endpoint"
            >
              <RefreshCw size={11} className={isIntrospecting ? 'spinning' : ''} />
              <span>{isIntrospecting ? 'Introspecting...' : 'Introspect Live'}</span>
            </button>
          </div>
          {schemaStatus && <div style={{ fontSize: 11, color: '#7DD3FC', padding: '4px 2px' }}>{schemaStatus}</div>}

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
                      <div key={f.name} className="field-row" style={{ flexWrap: 'wrap' }}>
                        <span className="field-name">
                          {f.name}
                          {f.args && f.args.length > 0 && (
                            <span style={{ opacity: 0.72, fontWeight: 400 }}>
                              ({f.args.map((a) => `${a.name}: ${a.type}${a.defaultValue ? ` = ${a.defaultValue}` : ''}`).join(', ')})
                            </span>
                          )}
                        </span>
                        <span className="field-type">{f.type}</span>
                        {f.description && (
                          <div style={{ width: '100%', fontSize: 10, opacity: 0.65, marginTop: 2 }}>
                            {f.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pure-JS gRPC Unary Client Tab */}
      {activeTab === 'grpc' && (
        <div className="composer-layout">
          <div className="endpoint-bar glass-panel" style={{ flexWrap: 'wrap', gap: 6 }}>
            <button className="run-query-btn glass-interactive" onClick={() => void handlePickProto()}>
              <FolderOpen size={11} /> <span>Load .proto</span>
            </button>
            <input
              type="text"
              value={protoPath}
              onChange={(e) => setProtoPath(e.target.value)}
              placeholder="Path to .proto definition file..."
              className="endpoint-input"
            />
            <button className="run-query-btn glass-interactive" onClick={() => void handleInspectProto()} disabled={isGrpcRunning || !protoPath}>
              <RefreshCw size={11} /> <span>Inspect</span>
            </button>
          </div>

          <div className="endpoint-bar glass-panel" style={{ flexWrap: 'wrap', gap: 6 }}>
            <input
              type="text"
              value={grpcAddress}
              onChange={(e) => setGrpcAddress(e.target.value)}
              placeholder="127.0.0.1:50051"
              className="endpoint-input"
              style={{ maxWidth: 160 }}
            />
            <select
              value={selectedService}
              onChange={(e) => {
                setSelectedService(e.target.value)
                const svc = grpcServices.find((s) => s.name === e.target.value)
                setSelectedMethod(svc?.methods[0] || '')
              }}
              className="endpoint-input"
            >
              {grpcServices.length === 0 && <option value="">No .proto services loaded</option>}
              {grpcServices.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="endpoint-input"
            >
              {(grpcServices.find((s) => s.name === selectedService)?.methods || []).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#CBD5E1' }}>
              <input type="checkbox" checked={grpcUseTls} onChange={(e) => setGrpcUseTls(e.target.checked)} /> TLS
            </label>
            <button
              className="run-query-btn glass-interactive"
              onClick={() => void handleInvokeGrpc()}
              disabled={isGrpcRunning || !selectedMethod}
            >
              <Play size={11} fill="#30D158" /> <span>{isGrpcRunning ? 'Invoking...' : 'Invoke RPC'}</span>
            </button>
          </div>

          <div className="composer-grid">
            <div className="editor-col">
              <div className="col-header"><span>Request Payload (JSON)</span></div>
              <textarea value={grpcPayload} onChange={(e) => setGrpcPayload(e.target.value)} className="query-textarea" rows={8} />
              <div className="variables-header"><span>gRPC Metadata Headers (JSON)</span></div>
              <textarea value={grpcMetadata} onChange={(e) => setGrpcMetadata(e.target.value)} className="variables-textarea" rows={3} />
            </div>
            <div className="result-col">
              <div className="col-header result-head">
                <span>gRPC Response</span>
                {grpcLatency !== null && <span className="timing">{grpcLatency}ms</span>}
              </div>
              <pre className="result-body-box">
                <code>{grpcResponse || '// Load a .proto file, pick Service & Method, and click Invoke RPC'}</code>
              </pre>
            </div>
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

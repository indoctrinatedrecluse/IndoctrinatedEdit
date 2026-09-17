import React, { useState, useEffect, useMemo } from 'react'
import {
  Send,
  Globe,
  Folder,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Clock,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Minimize2,
  X,
  History,
} from 'lucide-react'
import {
  restClientService,
  ApiRequest,
  ApiResponse,
  ApiCollection,
  ApiEnvironment,
  HttpMethod,
  BodyType,
  AuthType,
} from '../../services/restClientService'

interface RestClientViewProps {
  onClose?: () => void
  isDocked?: boolean
  dockPosition?: 'left' | 'right' | 'full'
  onToggleDockPosition?: () => void
}

export const RestClientView: React.FC<RestClientViewProps> = ({
  onClose,
  isDocked: _isDocked = true,
  dockPosition = 'right',
  onToggleDockPosition,
}) => {
  const [environments, setEnvironments] = useState<ApiEnvironment[]>(() => restClientService.getEnvironments())
  const [activeEnv, setActiveEnv] = useState<ApiEnvironment>(() => restClientService.getActiveEnvironment())
  const [collections, setCollections] = useState<ApiCollection[]>(() => restClientService.getCollections())
  const [historyList, setHistoryList] = useState(() => restClientService.getHistory())

  // Active Request Builder State
  const [request, setRequest] = useState<ApiRequest>(() => collections[0]?.requests[0] || {
    id: 'custom_req',
    name: 'Custom Request',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    params: [],
    headers: [{ id: 'h1', key: 'Accept', value: 'application/json', enabled: true }],
    auth: { type: 'none' },
    bodyType: 'none',
  })

  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeReqTab, setActiveReqTab] = useState<'params' | 'headers' | 'auth' | 'body'>('params')
  const [activeResTab, setActiveResTab] = useState<'body' | 'headers' | 'curl' | 'raw'>('body')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedCollections, setExpandedCollections] = useState<Record<string, boolean>>({ jsonplaceholder: true, cloud_ai: true })
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    return restClientService.subscribe(() => {
      setEnvironments(restClientService.getEnvironments())
      setActiveEnv(restClientService.getActiveEnvironment())
      setCollections(restClientService.getCollections())
      setHistoryList(restClientService.getHistory())
    })
  }, [])

  // Auto-run first sample on mount if no response
  useEffect(() => {
    if (!response && request) {
      handleSendRequest()
    }
  }, [])

  const handleSendRequest = async () => {
    setIsLoading(true)
    try {
      const res = await restClientService.executeRequest(request)
      setResponse(res)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectRequest = (req: ApiRequest) => {
    setRequest(JSON.parse(JSON.stringify(req)))
    setShowHistory(false)
  }

  const handleEnvironmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    restClientService.setActiveEnvironment(id)
    setActiveEnv(restClientService.getActiveEnvironment())
  }

  // Params / Headers Key-Value operations
  const handleAddParam = () => {
    setRequest((prev) => ({
      ...prev,
      params: [...prev.params, { id: `p_${Date.now()}`, key: '', value: '', enabled: true }],
    }))
  }

  const handleUpdateParam = (id: string, field: 'key' | 'value' | 'enabled', val: any) => {
    setRequest((prev) => ({
      ...prev,
      params: prev.params.map((p) => (p.id === id ? { ...p, [field]: val } : p)),
    }))
  }

  const handleRemoveParam = (id: string) => {
    setRequest((prev) => ({
      ...prev,
      params: prev.params.filter((p) => p.id !== id),
    }))
  }

  const handleAddHeader = () => {
    setRequest((prev) => ({
      ...prev,
      headers: [...prev.headers, { id: `h_${Date.now()}`, key: '', value: '', enabled: true }],
    }))
  }

  const handleUpdateHeader = (id: string, field: 'key' | 'value' | 'enabled', val: any) => {
    setRequest((prev) => ({
      ...prev,
      headers: prev.headers.map((h) => (h.id === id ? { ...h, [field]: val } : h)),
    }))
  }

  const handleRemoveHeader = (id: string) => {
    setRequest((prev) => ({
      ...prev,
      headers: prev.headers.filter((h) => h.id !== id),
    }))
  }

  const handleFormatJsonBody = () => {
    try {
      if (request.bodyContent) {
        const formatted = JSON.stringify(JSON.parse(request.bodyContent), null, 2)
        setRequest((prev) => ({ ...prev, bodyContent: formatted }))
      }
    } catch {
      // Ignore if syntax error
    }
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1200)
  }

  const getMethodBadgeClass = (method: HttpMethod) => {
    switch (method) {
      case 'GET':
        return 'method-get'
      case 'POST':
        return 'method-post'
      case 'PUT':
        return 'method-put'
      case 'PATCH':
        return 'method-patch'
      case 'DELETE':
        return 'method-delete'
      default:
        return 'method-other'
    }
  }

  const generatedCurl = useMemo(() => {
    return restClientService.exportToCurl(request, activeEnv)
  }, [request, activeEnv])

  return (
    <div className="rest-client-container glass-panel">
      {/* Client Header Bar */}
      <div className="rest-header">
        <div className="header-left">
          <div className="rest-icon-pill">
            <Globe size={16} className="rest-main-icon" />
          </div>
          <div>
            <div className="title-row">
              <span className="client-title">REST & API Client</span>
              <span className="env-badge">{activeEnv.name}</span>
            </div>
            <select
              className="env-select-dropdown glass-interactive"
              value={activeEnv.id}
              onChange={handleEnvironmentChange}
            >
              {environments.map((env) => (
                <option key={env.id} value={env.id}>
                  Env: {env.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="header-actions">
          <button
            className={`action-pill-btn glass-interactive ${showHistory ? 'active' : ''}`}
            onClick={() => setShowHistory((prev) => !prev)}
            title="Toggle Request History"
          >
            <History size={13} />
            <span>History ({historyList.length})</span>
          </button>

          {onToggleDockPosition && (
            <button
              className="dock-btn glass-interactive"
              onClick={onToggleDockPosition}
              title={`Switch Dock (Current: ${dockPosition})`}
            >
              {dockPosition === 'right' ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
            </button>
          )}

          {onClose && (
            <button className="dock-close-btn glass-interactive" onClick={onClose} title="Close REST Client">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Client Body */}
      <div className="rest-body">
        {/* Left Drawer: Collections Tree & History */}
        <div className="collections-sidebar custom-scrollbar">
          <div className="sidebar-header">
            <span className="sidebar-title">{showHistory ? 'REQUEST HISTORY' : 'API COLLECTIONS'}</span>
          </div>

          {!showHistory ? (
            <div className="collections-tree">
              {collections.map((col) => {
                const isExpanded = expandedCollections[col.id] ?? true
                return (
                  <div key={col.id} className="collection-group">
                    <div
                      className="collection-group-header glass-interactive"
                      onClick={() =>
                        setExpandedCollections((prev) => ({ ...prev, [col.id]: !isExpanded }))
                      }
                    >
                      <div className="group-title-left">
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        <Folder size={13} className="folder-icon" />
                        <span className="group-name">{col.name}</span>
                      </div>
                      <span className="req-count">{col.requests.length}</span>
                    </div>

                    {isExpanded && (
                      <div className="requests-sublist">
                        {col.requests.map((r) => {
                          const isCurrent = request.id === r.id
                          return (
                            <div
                              key={r.id}
                              className={`request-list-item glass-interactive ${isCurrent ? 'active' : ''}`}
                              onClick={() => handleSelectRequest(r)}
                            >
                              <span className={`method-tag ${getMethodBadgeClass(r.method)}`}>
                                {r.method}
                              </span>
                              <span className="req-item-name">{r.name}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            /* History List */
            <div className="history-drawer custom-scrollbar">
              {historyList.length === 0 ? (
                <div className="empty-history">
                  <Clock size={20} className="empty-icon" />
                  <span>No executed requests in history</span>
                </div>
              ) : (
                historyList.map((item) => (
                  <div
                    key={item.id}
                    className="history-card glass-interactive"
                    onClick={() => handleSelectRequest(item.request)}
                  >
                    <div className="history-card-top">
                      <span className={`method-tag ${getMethodBadgeClass(item.request.method)}`}>
                        {item.request.method}
                      </span>
                      <span
                        className={`status-pill ${item.response.status >= 200 && item.response.status < 300 ? 'status-2xx' : 'status-err'}`}
                      >
                        {item.response.status || 'ERR'}
                      </span>
                      <span className="history-time">{item.response.executionTimeMs}ms</span>
                    </div>
                    <span className="history-url">{item.request.url}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right / Center: Request Builder + Response Viewer */}
        <div className="request-workspace custom-scrollbar">
          {/* URL & Send Bar */}
          <div className="url-bar-container">
            <select
              className={`method-select ${getMethodBadgeClass(request.method)}`}
              value={request.method}
              onChange={(e) => setRequest((prev) => ({ ...prev, method: e.target.value as HttpMethod }))}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
              <option value="HEAD">HEAD</option>
              <option value="OPTIONS">OPTIONS</option>
            </select>

            <input
              type="text"
              className="url-input"
              value={request.url}
              onChange={(e) => setRequest((prev) => ({ ...prev, url: e.target.value }))}
              placeholder="Enter request URL (e.g. {{baseUrl}}/posts)..."
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault()
                  handleSendRequest()
                }
              }}
            />

            <button
              className={`send-request-btn glass-interactive ${isLoading ? 'loading' : ''}`}
              onClick={handleSendRequest}
              disabled={isLoading}
              title="Send Request (Ctrl+Enter)"
            >
              <Send size={13} className="btn-icon" />
              <span>{isLoading ? 'Sending...' : 'Send'}</span>
            </button>
          </div>

          {/* Request Config Tabs */}
          <div className="request-config-section">
            <div
              className="config-tabs-header"
              onWheel={(e) => {
                e.currentTarget.scrollLeft += e.deltaY
              }}
            >
              <button
                className={`req-tab-btn ${activeReqTab === 'params' ? 'active' : ''}`}
                onClick={() => setActiveReqTab('params')}
              >
                Params {request.params.filter((p) => p.enabled).length > 0 && `(${request.params.filter((p) => p.enabled).length})`}
              </button>
              <button
                className={`req-tab-btn ${activeReqTab === 'headers' ? 'active' : ''}`}
                onClick={() => setActiveReqTab('headers')}
              >
                Headers {request.headers.filter((h) => h.enabled).length > 0 && `(${request.headers.filter((h) => h.enabled).length})`}
              </button>
              <button
                className={`req-tab-btn ${activeReqTab === 'auth' ? 'active' : ''}`}
                onClick={() => setActiveReqTab('auth')}
              >
                Auth {request.auth.type !== 'none' && '•'}
              </button>
              <button
                className={`req-tab-btn ${activeReqTab === 'body' ? 'active' : ''}`}
                onClick={() => setActiveReqTab('body')}
              >
                Body {request.bodyType !== 'none' && `(${request.bodyType})`}
              </button>
            </div>

            <div className="config-tab-content custom-scrollbar">
              {/* Params Tab */}
              {activeReqTab === 'params' && (
                <div className="kv-table-container">
                  <div className="kv-header-row">
                    <span className="kv-col check">Active</span>
                    <span className="kv-col key">Key</span>
                    <span className="kv-col val">Value</span>
                    <span className="kv-col action"></span>
                  </div>
                  {request.params.map((p) => (
                    <div key={p.id} className="kv-row">
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={(e) => handleUpdateParam(p.id, 'enabled', e.target.checked)}
                      />
                      <input
                        type="text"
                        className="kv-input"
                        placeholder="Parameter Name"
                        value={p.key}
                        onChange={(e) => handleUpdateParam(p.id, 'key', e.target.value)}
                      />
                      <input
                        type="text"
                        className="kv-input"
                        placeholder="Value (e.g. {{token}})"
                        value={p.value}
                        onChange={(e) => handleUpdateParam(p.id, 'value', e.target.value)}
                      />
                      <button className="kv-delete-btn" onClick={() => handleRemoveParam(p.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button className="add-kv-btn glass-interactive" onClick={handleAddParam}>
                    <Plus size={12} /> Add Parameter
                  </button>
                </div>
              )}

              {/* Headers Tab */}
              {activeReqTab === 'headers' && (
                <div className="kv-table-container">
                  <div className="kv-header-row">
                    <span className="kv-col check">Active</span>
                    <span className="kv-col key">Header</span>
                    <span className="kv-col val">Value</span>
                    <span className="kv-col action"></span>
                  </div>
                  {request.headers.map((h) => (
                    <div key={h.id} className="kv-row">
                      <input
                        type="checkbox"
                        checked={h.enabled}
                        onChange={(e) => handleUpdateHeader(h.id, 'enabled', e.target.checked)}
                      />
                      <input
                        type="text"
                        className="kv-input"
                        placeholder="Header (e.g. Content-Type)"
                        value={h.key}
                        onChange={(e) => handleUpdateHeader(h.id, 'key', e.target.value)}
                      />
                      <input
                        type="text"
                        className="kv-input"
                        placeholder="Value (e.g. application/json)"
                        value={h.value}
                        onChange={(e) => handleUpdateHeader(h.id, 'value', e.target.value)}
                      />
                      <button className="kv-delete-btn" onClick={() => handleRemoveHeader(h.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button className="add-kv-btn glass-interactive" onClick={handleAddHeader}>
                    <Plus size={12} /> Add Header
                  </button>
                </div>
              )}

              {/* Auth Tab */}
              {activeReqTab === 'auth' && (
                <div className="auth-container">
                  <div className="auth-type-row">
                    <span className="label">Auth Type:</span>
                    <select
                      className="auth-type-select"
                      value={request.auth.type}
                      onChange={(e) =>
                        setRequest((prev) => ({
                          ...prev,
                          auth: { ...prev.auth, type: e.target.value as AuthType },
                        }))
                      }
                    >
                      <option value="none">No Auth</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="basic">Basic Auth</option>
                      <option value="apiKey">API Key</option>
                    </select>
                  </div>

                  {request.auth.type === 'bearer' && (
                    <div className="auth-fields">
                      <label className="field-label">Bearer Token</label>
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="Bearer token string or {{token}}"
                        value={request.auth.bearerToken || ''}
                        onChange={(e) =>
                          setRequest((prev) => ({
                            ...prev,
                            auth: { ...prev.auth, bearerToken: e.target.value },
                          }))
                        }
                      />
                    </div>
                  )}

                  {request.auth.type === 'basic' && (
                    <div className="auth-fields">
                      <label className="field-label">Username</label>
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="Username"
                        value={request.auth.basicUsername || ''}
                        onChange={(e) =>
                          setRequest((prev) => ({
                            ...prev,
                            auth: { ...prev.auth, basicUsername: e.target.value },
                          }))
                        }
                      />
                      <label className="field-label" style={{ marginTop: 6 }}>Password</label>
                      <input
                        type="password"
                        className="auth-input"
                        placeholder="Password"
                        value={request.auth.basicPassword || ''}
                        onChange={(e) =>
                          setRequest((prev) => ({
                            ...prev,
                            auth: { ...prev.auth, basicPassword: e.target.value },
                          }))
                        }
                      />
                    </div>
                  )}

                  {request.auth.type === 'apiKey' && (
                    <div className="auth-fields">
                      <label className="field-label">Key Name</label>
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="e.g. X-API-Key"
                        value={request.auth.apiKeyName || ''}
                        onChange={(e) =>
                          setRequest((prev) => ({
                            ...prev,
                            auth: { ...prev.auth, apiKeyName: e.target.value },
                          }))
                        }
                      />
                      <label className="field-label" style={{ marginTop: 6 }}>Key Value</label>
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="e.g. {{apiKey}}"
                        value={request.auth.apiKeyValue || ''}
                        onChange={(e) =>
                          setRequest((prev) => ({
                            ...prev,
                            auth: { ...prev.auth, apiKeyValue: e.target.value },
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Body Tab */}
              {activeReqTab === 'body' && (
                <div className="body-editor-container">
                  <div className="body-type-bar">
                    {(['none', 'json', 'raw', 'graphql'] as BodyType[]).map((bt) => (
                      <button
                        key={bt}
                        className={`body-type-chip ${request.bodyType === bt ? 'active' : ''}`}
                        onClick={() => setRequest((prev) => ({ ...prev, bodyType: bt }))}
                      >
                        {bt.toUpperCase()}
                      </button>
                    ))}
                    {request.bodyType === 'json' && (
                      <button className="format-json-btn glass-interactive" onClick={handleFormatJsonBody}>
                        <Sparkles size={11} /> Format JSON
                      </button>
                    )}
                  </div>

                  {request.bodyType === 'json' || request.bodyType === 'raw' ? (
                    <textarea
                      className="body-textarea custom-scrollbar"
                      placeholder={request.bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Raw payload...'}
                      value={request.bodyContent || ''}
                      onChange={(e) => setRequest((prev) => ({ ...prev, bodyContent: e.target.value }))}
                      rows={5}
                      spellCheck={false}
                    />
                  ) : request.bodyType === 'graphql' ? (
                    <div className="graphql-editor-split">
                      <div className="gql-box">
                        <span className="gql-label">QUERY</span>
                        <textarea
                          className="body-textarea custom-scrollbar"
                          placeholder="query GetItems { items { id name } }"
                          value={request.graphqlQuery || ''}
                          onChange={(e) => setRequest((prev) => ({ ...prev, graphqlQuery: e.target.value }))}
                          rows={4}
                          spellCheck={false}
                        />
                      </div>
                      <div className="gql-box">
                        <span className="gql-label">VARIABLES (JSON)</span>
                        <textarea
                          className="body-textarea custom-scrollbar"
                          placeholder='{ "limit": 10 }'
                          value={request.graphqlVariables || ''}
                          onChange={(e) => setRequest((prev) => ({ ...prev, graphqlVariables: e.target.value }))}
                          rows={2}
                          spellCheck={false}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="no-body-state">
                      <span>This request does not have a body payload.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Response Inspector Section */}
          <div className="response-inspector-section">
            <div className="response-header-bar">
              <div className="res-tabs">
                <button
                  className={`res-tab-btn ${activeResTab === 'body' ? 'active' : ''}`}
                  onClick={() => setActiveResTab('body')}
                >
                  Response Body
                </button>
                <button
                  className={`res-tab-btn ${activeResTab === 'headers' ? 'active' : ''}`}
                  onClick={() => setActiveResTab('headers')}
                >
                  Headers {response && `(${Object.keys(response.headers).length})`}
                </button>
                <button
                  className={`res-tab-btn ${activeResTab === 'curl' ? 'active' : ''}`}
                  onClick={() => setActiveResTab('curl')}
                >
                  cURL Snippet
                </button>
                <button
                  className={`res-tab-btn ${activeResTab === 'raw' ? 'active' : ''}`}
                  onClick={() => setActiveResTab('raw')}
                >
                  Raw
                </button>
              </div>

              {response && (
                <div className="response-metrics">
                  <span
                    className={`metric-badge status ${
                      response.status >= 200 && response.status < 300
                        ? 'status-2xx'
                        : response.status >= 400
                        ? 'status-4xx'
                        : 'status-other'
                    }`}
                  >
                    {response.status} {response.statusText}
                  </span>
                  <span className="metric-badge time">
                    <Clock size={11} /> {response.executionTimeMs} ms
                  </span>
                  <span className="metric-badge size">
                    {(response.sizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>
              )}
            </div>

            {/* Response Content View */}
            <div className="response-body-area custom-scrollbar">
              {isLoading ? (
                <div className="response-loading-state">
                  <Sparkles size={24} className="spinning-sparkle" />
                  <span>Executing HTTP Request...</span>
                </div>
              ) : response ? (
                activeResTab === 'body' ? (
                  <div className="res-body-wrapper">
                    <div className="res-body-actions">
                      <button
                        className="copy-res-btn glass-interactive"
                        onClick={() => handleCopy(response.rawText, 'body')}
                      >
                        {copiedId === 'body' ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedId === 'body' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="json-pre-code custom-scrollbar">
                      {typeof response.data === 'object'
                        ? JSON.stringify(response.data, null, 2)
                        : response.rawText}
                    </pre>
                  </div>
                ) : activeResTab === 'headers' ? (
                  <div className="res-headers-table">
                    {Object.entries(response.headers).map(([k, v]) => (
                      <div key={k} className="header-row">
                        <span className="header-key">{k}</span>
                        <span className="header-val">{v}</span>
                      </div>
                    ))}
                  </div>
                ) : activeResTab === 'curl' ? (
                  <div className="res-body-wrapper">
                    <div className="res-body-actions">
                      <button
                        className="copy-res-btn glass-interactive"
                        onClick={() => handleCopy(generatedCurl, 'curl')}
                      >
                        {copiedId === 'curl' ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedId === 'curl' ? 'Copied' : 'Copy cURL'}</span>
                      </button>
                    </div>
                    <pre className="curl-pre-code custom-scrollbar">{generatedCurl}</pre>
                  </div>
                ) : (
                  <pre className="raw-pre-code custom-scrollbar">{response.rawText}</pre>
                )
              ) : (
                <div className="response-empty-state">
                  <Send size={24} className="empty-icon" />
                  <span>Click <strong>Send</strong> to execute API request.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .rest-client-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(12, 16, 28, 0.94);
          backdrop-filter: blur(28px) saturate(190%);
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.9);
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        .rest-header {
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

        .rest-icon-pill {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, rgba(10, 132, 255, 0.3), rgba(191, 90, 242, 0.3));
          border: 1px solid rgba(255, 255, 255, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rest-main-icon {
          color: #5AC8FA;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .client-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: #FFFFFF;
        }

        .env-badge {
          font-size: 0.65rem;
          font-weight: 600;
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(10, 132, 255, 0.2);
          border: 1px solid rgba(10, 132, 255, 0.4);
          color: #5AC8FA;
        }

        .env-select-dropdown {
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

        .action-pill-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(235, 235, 245, 0.7);
          font-size: 0.72rem;
          cursor: pointer;
        }

        .action-pill-btn.active {
          background: rgba(10, 132, 255, 0.2);
          border-color: rgba(10, 132, 255, 0.4);
          color: #FFFFFF;
        }

        .dock-btn, .dock-close-btn {
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
        }

        .dock-btn:hover, .dock-close-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #FFFFFF;
        }

        .rest-body {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        /* Sidebar Collections */
        .collections-sidebar {
          width: 210px;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          flex-shrink: 0;
        }

        .sidebar-header {
          padding: 8px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .sidebar-title {
          font-size: 0.68rem;
          font-weight: 700;
          color: rgba(235, 235, 245, 0.5);
          letter-spacing: 0.05em;
        }

        .collections-tree {
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .collection-group-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 5px 8px;
          border-radius: 6px;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.02);
        }

        .collection-group-header:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .group-title-left {
          display: flex;
          align-items: center;
          gap: 5px;
          overflow: hidden;
        }

        .folder-icon {
          color: #FFD60A;
          flex-shrink: 0;
        }

        .group-name {
          font-size: 0.74rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .req-count {
          font-size: 0.62rem;
          color: rgba(235, 235, 245, 0.4);
        }

        .requests-sublist {
          display: flex;
          flex-direction: column;
          padding-left: 14px;
          margin-top: 2px;
          gap: 2px;
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          margin-left: 10px;
        }

        .request-list-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 6px;
          border-radius: 4px;
          cursor: pointer;
        }

        .request-list-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .request-list-item.active {
          background: rgba(10, 132, 255, 0.18);
          border: 1px solid rgba(10, 132, 255, 0.3);
        }

        .req-item-name {
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.85);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .method-tag {
          font-size: 0.6rem;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 3px;
          flex-shrink: 0;
        }

        .method-get {
          background: rgba(48, 209, 88, 0.2);
          color: #30D158;
          border: 1px solid rgba(48, 209, 88, 0.4);
        }

        .method-post {
          background: rgba(10, 132, 255, 0.2);
          color: #0A84FF;
          border: 1px solid rgba(10, 132, 255, 0.4);
        }

        .method-put {
          background: rgba(255, 159, 10, 0.2);
          color: #FF9F0A;
          border: 1px solid rgba(255, 159, 10, 0.4);
        }

        .method-patch {
          background: rgba(191, 90, 242, 0.2);
          color: #BF5AF2;
          border: 1px solid rgba(191, 90, 242, 0.4);
        }

        .method-delete {
          background: rgba(255, 69, 58, 0.2);
          color: #FF453A;
          border: 1px solid rgba(255, 69, 58, 0.4);
        }

        /* History Drawer */
        .history-drawer {
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .history-card {
          padding: 6px 8px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          cursor: pointer;
        }

        .history-card:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .history-card-top {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 2px;
        }

        .status-pill {
          font-size: 0.62rem;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 3px;
        }

        .status-2xx {
          background: rgba(48, 209, 88, 0.2);
          color: #30D158;
        }

        .status-4xx, .status-err {
          background: rgba(255, 69, 58, 0.2);
          color: #FF453A;
        }

        .history-time {
          font-size: 0.6rem;
          color: rgba(235, 235, 245, 0.4);
          margin-left: auto;
        }

        .history-url {
          font-size: 0.68rem;
          color: rgba(255, 255, 255, 0.7);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        /* Request Workspace */
        .request-workspace {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .url-bar-container {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
        }

        .method-select {
          font-size: 0.76rem;
          font-weight: 700;
          padding: 6px 10px;
          border-radius: 6px;
          outline: none;
          cursor: pointer;
        }

        .url-input {
          flex: 1;
          background: rgba(10, 14, 26, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 6px;
          color: #FFFFFF;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.78rem;
          padding: 6px 10px;
          outline: none;
        }

        .url-input:focus {
          border-color: #0A84FF;
        }

        .send-request-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 6px;
          background: linear-gradient(135deg, #0A84FF, #0070D2);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #FFFFFF;
          font-size: 0.76rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(10, 132, 255, 0.3);
        }

        .send-request-btn:hover {
          filter: brightness(1.1);
        }

        /* Config Section */
        .request-config-section {
          display: flex;
          flex-direction: column;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.015);
        }

        .config-tabs-header {
          display: flex;
          gap: 2px;
          padding: 6px 14px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
        }

        .req-tab-btn {
          padding: 5px 12px;
          font-size: 0.74rem;
          font-weight: 500;
          color: rgba(235, 235, 245, 0.6);
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .req-tab-btn.active {
          color: #FFFFFF;
          border-bottom-color: #0A84FF;
        }

        .config-tab-content {
          padding: 10px 14px;
          max-height: 180px;
          overflow-y: auto;
        }

        /* Key Value Tables */
        .kv-table-container {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .kv-header-row, .kv-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .kv-col {
          font-size: 0.65rem;
          font-weight: 600;
          color: rgba(235, 235, 245, 0.4);
        }

        .kv-col.check { width: 24px; text-align: center; }
        .kv-col.key { flex: 1; }
        .kv-col.val { flex: 1; }
        .kv-col.action { width: 24px; }

        .kv-input {
          flex: 1;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          color: #FFFFFF;
          font-size: 0.72rem;
          padding: 4px 6px;
          outline: none;
        }

        .kv-delete-btn {
          background: transparent;
          border: none;
          color: rgba(235, 235, 245, 0.4);
          cursor: pointer;
        }

        .kv-delete-btn:hover {
          color: #FF453A;
        }

        .add-kv-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.7rem;
          cursor: pointer;
          align-self: flex-start;
          margin-top: 4px;
        }

        /* Auth */
        .auth-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .auth-type-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.74rem;
        }

        .auth-type-select {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #FFFFFF;
          border-radius: 4px;
          padding: 3px 6px;
          font-size: 0.72rem;
        }

        .auth-fields {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .field-label {
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.5);
        }

        .auth-input {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          color: #FFFFFF;
          font-size: 0.72rem;
          padding: 4px 8px;
        }

        /* Body Editor */
        .body-editor-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .body-type-bar {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .body-type-chip {
          font-size: 0.65rem;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(235, 235, 245, 0.6);
          cursor: pointer;
        }

        .body-type-chip.active {
          background: rgba(10, 132, 255, 0.2);
          border-color: rgba(10, 132, 255, 0.4);
          color: #FFFFFF;
        }

        .format-json-btn {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.65rem;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(191, 90, 242, 0.2);
          border: 1px solid rgba(191, 90, 242, 0.4);
          color: #BF5AF2;
          cursor: pointer;
        }

        .body-textarea {
          width: 100%;
          background: rgba(10, 14, 26, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #FFFFFF;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.76rem;
          padding: 6px 8px;
          resize: vertical;
          outline: none;
          box-sizing: border-box;
        }

        .graphql-editor-split {
          display: flex;
          gap: 8px;
        }

        .gql-box {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .gql-label {
          font-size: 0.62rem;
          font-weight: 700;
          color: rgba(235, 235, 245, 0.4);
        }

        .no-body-state {
          font-size: 0.72rem;
          color: rgba(235, 235, 245, 0.4);
          padding: 10px 0;
        }

        /* Response Inspector */
        .response-inspector-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.2);
        }

        .response-header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        .res-tabs {
          display: flex;
          gap: 2px;
        }

        .res-tab-btn {
          padding: 4px 10px;
          font-size: 0.72rem;
          font-weight: 500;
          color: rgba(235, 235, 245, 0.6);
          background: transparent;
          border: 1px solid transparent;
          border-radius: 4px;
          cursor: pointer;
        }

        .res-tab-btn.active {
          background: rgba(255, 255, 255, 0.08);
          color: #FFFFFF;
        }

        .response-metrics {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .metric-badge {
          font-size: 0.68rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .metric-badge.time, .metric-badge.size {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(235, 235, 245, 0.7);
        }

        .response-body-area {
          flex: 1;
          overflow: auto;
          position: relative;
          padding: 10px 14px;
        }

        .res-body-wrapper {
          position: relative;
        }

        .res-body-actions {
          position: absolute;
          top: 4px;
          right: 4px;
          z-index: 2;
        }

        .copy-res-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #FFFFFF;
          font-size: 0.68rem;
          cursor: pointer;
        }

        .json-pre-code, .curl-pre-code, .raw-pre-code {
          margin: 0;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          color: #30D158;
          white-space: pre-wrap;
          line-height: 1.4;
        }

        .curl-pre-code {
          color: #5AC8FA;
        }

        .raw-pre-code {
          color: rgba(255, 255, 255, 0.85);
        }

        .res-headers-table {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .header-row {
          display: flex;
          padding: 3px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          font-size: 0.72rem;
        }

        .header-key {
          width: 180px;
          font-weight: 600;
          color: rgba(235, 235, 245, 0.6);
        }

        .header-val {
          flex: 1;
          color: rgba(255, 255, 255, 0.9);
          word-break: break-all;
        }

        .response-empty-state, .response-loading-state, .empty-history {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 30px;
          color: rgba(235, 235, 245, 0.4);
          gap: 6px;
          font-size: 0.76rem;
        }
      `}</style>
    </div>
  )
}

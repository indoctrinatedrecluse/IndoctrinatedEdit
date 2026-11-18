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
  Save,
  SlidersHorizontal,
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
import './RestClientView.css'

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
  const [showEnvEditor, setShowEnvEditor] = useState(false)
  const [envVarsText, setEnvVarsText] = useState<string>('')
  const [envError, setEnvError] = useState<string | null>(null)
  const [newEnvName, setNewEnvName] = useState('')
  const [newCollectionName, setNewCollectionName] = useState('')
  const [showNewColInput, setShowNewColInput] = useState(false)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)

  useEffect(() => {
    return restClientService.subscribe(() => {
      setEnvironments(restClientService.getEnvironments())
      setActiveEnv(restClientService.getActiveEnvironment())
      setCollections(restClientService.getCollections())
      setHistoryList(restClientService.getHistory())
    })
  }, [])

  const handleNewRequest = () => {
    setRequest({
      id: `req_${Date.now()}`,
      name: 'New Request',
      method: 'GET',
      url: '{{baseUrl}}/',
      params: [],
      headers: [{ id: `h_${Date.now()}`, key: 'Accept', value: 'application/json', enabled: true }],
      auth: { type: 'none' },
      bodyType: 'none',
    })
    setResponse(null)
  }

  const handleSaveRequest = () => {
    const targetColId =
      collections.find((c) => c.requests.some((r) => r.id === request.id))?.id ||
      collections[0]?.id ||
      'default'
    const saved = restClientService.saveRequest(targetColId, {
      ...request,
      name: request.name.trim() || `${request.method} ${request.url}`,
    })
    setRequest(saved)
    setSaveNotice('Saved')
    setTimeout(() => setSaveNotice(null), 1500)
  }

  const handleDeleteRequest = (colId: string, reqId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    restClientService.deleteRequest(colId, reqId)
  }

  const handleOpenEnvEditor = () => {
    if (!showEnvEditor) {
      setEnvVarsText(JSON.stringify(activeEnv.variables, null, 2))
    }
    setShowEnvEditor((prev) => !prev)
  }

  const handleSaveEnvVars = () => {
    try {
      const parsed = JSON.parse(envVarsText)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setEnvError('Environment variables must be a JSON object of key/value strings.')
        return
      }
      const cleaned: Record<string, string> = {}
      for (const [k, v] of Object.entries(parsed)) cleaned[k] = String(v)
      restClientService.updateEnvironmentVariables(activeEnv.id, cleaned)
      setEnvError(null)
      setShowEnvEditor(false)
    } catch (err: any) {
      setEnvError(err?.message || 'Invalid JSON syntax')
    }
  }

  const handleAddEnvironment = () => {
    const trimmed = newEnvName.trim()
    if (!trimmed) return
    const created = restClientService.addEnvironment(trimmed, { baseUrl: 'http://localhost:3000' })
    setActiveEnv(created)
    setEnvVarsText(JSON.stringify(created.variables, null, 2))
    setNewEnvName('')
    setEnvError(null)
  }

  const handleCreateCollection = () => {
    const trimmed = newCollectionName.trim()
    if (!trimmed) return
    const col = restClientService.createCollection(trimmed)
    setExpandedCollections((prev) => ({ ...prev, [col.id]: true }))
    setNewCollectionName('')
    setShowNewColInput(false)
  }

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
            className="action-pill-btn glass-interactive"
            onClick={handleNewRequest}
            title="New Request"
          >
            <Plus size={13} />
            <span>New</span>
          </button>

          <button
            className="action-pill-btn glass-interactive"
            onClick={handleSaveRequest}
            title="Save Request to Collection"
          >
            <Save size={13} />
            <span>{saveNotice || 'Save'}</span>
          </button>

          <button
            className={`action-pill-btn glass-interactive ${showEnvEditor ? 'active' : ''}`}
            onClick={handleOpenEnvEditor}
            title="Edit Active Environment Variables"
          >
            <SlidersHorizontal size={13} />
            <span>Env</span>
          </button>

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

      {/* Environment Variables Editor Drawer */}
      {showEnvEditor && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.55)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#CBD5E1' }}>
              Environment Variables — {activeEnv.name} (JSON)
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="text"
                className="kv-input"
                style={{ width: 130, fontSize: 11 }}
                placeholder="New env name..."
                value={newEnvName}
                onChange={(e) => setNewEnvName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddEnvironment() }}
              />
              <button className="action-pill-btn glass-interactive" onClick={handleAddEnvironment} title="Create Environment">
                <Plus size={12} /> Add Env
              </button>
              <button className="action-pill-btn glass-interactive" onClick={handleSaveEnvVars}>
                <Check size={12} /> Apply
              </button>
              <button className="action-pill-btn glass-interactive" onClick={() => { setEnvError(null); setShowEnvEditor(false) }}>
                <X size={12} />
              </button>
            </div>
          </div>
          {envError && (
            <div style={{ fontSize: 11, color: '#FB7185', marginBottom: 6 }}>
              Invalid JSON: {envError}
            </div>
          )}
          <textarea
            className="body-textarea custom-scrollbar"
            rows={4}
            value={envVarsText}
            onChange={(e) => { setEnvVarsText(e.target.value); if (envError) setEnvError(null) }}
            spellCheck={false}
          />
        </div>
      )}

      {/* Main Client Body */}
      <div className="rest-body">
        {/* Left Drawer: Collections Tree & History */}
        <div className="collections-sidebar custom-scrollbar">
          <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="sidebar-title">{showHistory ? 'REQUEST HISTORY' : 'API COLLECTIONS'}</span>
            {!showHistory && (
              <button
                className="kv-delete-btn"
                onClick={() => setShowNewColInput((prev) => !prev)}
                title="Create New Collection"
              >
                <Plus size={12} />
              </button>
            )}
            {showHistory && historyList.length > 0 && (
              <button
                className="kv-delete-btn"
                onClick={() => restClientService.clearHistory()}
                title="Clear History"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
          {!showHistory && showNewColInput && (
            <div style={{ display: 'flex', gap: 4, padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <input
                type="text"
                className="kv-input"
                style={{ flex: 1, fontSize: 11 }}
                placeholder="Collection name..."
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCollection() }}
              />
              <button className="action-pill-btn glass-interactive" onClick={handleCreateCollection} title="Create">
                <Check size={11} />
              </button>
            </div>
          )}

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
                              <button
                                className="kv-delete-btn"
                                onClick={(e) => handleDeleteRequest(col.id, r.id, e)}
                                title="Delete Saved Request"
                                style={{ marginLeft: 'auto', opacity: 0.6 }}
                              >
                                <Trash2 size={10} />
                              </button>
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
          {/* Request Name Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 0' }}>
            <input
              type="text"
              className="kv-input"
              style={{ flex: 1, fontSize: 12, fontWeight: 600, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)' }}
              value={request.name}
              onChange={(e) => setRequest((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Request name..."
              aria-label="Request Name"
            />
          </div>

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
                      onChange={(e) => {
                        const nextType = e.target.value as AuthType
                        setRequest((prev) => ({
                          ...prev,
                          auth: {
                            ...prev.auth,
                            type: nextType,
                            ...(nextType === 'apiKey' && !prev.auth.apiKeyLocation ? { apiKeyLocation: 'header' } : {}),
                          },
                        }))
                      }}
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
                      <label className="field-label">Add To</label>
                      <select
                        className="auth-type-select"
                        value={request.auth.apiKeyLocation || 'header'}
                        onChange={(e) =>
                          setRequest((prev) => ({
                            ...prev,
                            auth: { ...prev.auth, apiKeyLocation: e.target.value as 'header' | 'query' },
                          }))
                        }
                      >
                        <option value="header">Header</option>
                        <option value="query">Query Params</option>
                      </select>
                      <label className="field-label" style={{ marginTop: 6 }}>Key Name</label>
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
                    {(['none', 'json', 'x-www-form-urlencoded', 'form-data', 'raw', 'graphql'] as BodyType[]).map((bt) => (
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

                  {request.bodyType === 'json' ||
                  request.bodyType === 'raw' ||
                  request.bodyType === 'x-www-form-urlencoded' ||
                  request.bodyType === 'form-data' ? (
                    <textarea
                      className="body-textarea custom-scrollbar"
                      placeholder={
                        request.bodyType === 'json'
                          ? '{\n  "key": "value"\n}'
                          : request.bodyType === 'x-www-form-urlencoded'
                          ? 'key1=value1\nkey2=value2\n(or JSON object {"key":"value"})'
                          : request.bodyType === 'form-data'
                          ? 'field1=value1\nfield2=value2\n(or JSON object {"field":"value"})'
                          : 'Raw payload...'
                      }
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
              {activeResTab === 'curl' ? (
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
              ) : isLoading ? (
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

    </div>
  )
}

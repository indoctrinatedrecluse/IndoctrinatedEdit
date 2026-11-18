import React, { useState, useMemo } from 'react'
import {
  Server,
  Play,
  Square,
  Plus,
  Send,
  Trash2,
  Copy,
  Check,
  Zap,
} from 'lucide-react'
import {
  mockLabService,
  MockEndpoint,
  HttpMethod,
} from '../../services/mockLabService'
import './MockLabView.css'

export const MockLabView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'endpoints' | 'traffic' | 'runner'>('endpoints')
  const [isServerOn, setIsServerOn] = useState<boolean>(() => mockLabService.isRunning())
  const [selectedEndpoint, setSelectedEndpoint] = useState<MockEndpoint | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Request Runner Test State
  const [runnerMethod, setRunnerMethod] = useState<HttpMethod>('GET')
  const [runnerPath, setRunnerPath] = useState<string>('/api/v1/users')
  const [runnerResult, setRunnerResult] = useState<{
    statusCode: number
    headers: Record<string, string>
    body: string
    durationMs: number
  } | null>(null)
  const [isTesting, setIsTesting] = useState<boolean>(false)

  // Add Endpoint Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false)
  const [newMethod, setNewMethod] = useState<HttpMethod>('GET')
  const [newPath, setNewPath] = useState<string>('/api/v1/items')
  const [newStatus, setNewStatus] = useState<number>(200)
  const [newDelay, setNewDelay] = useState<number>(100)
  const [newBody, setNewBody] = useState<string>('{\n  "status": "ok"\n}')

  const [portInput, setPortInput] = useState<number>(() => mockLabService.getPort())
  const [serverError, setServerError] = useState<string | null>(null)
  const [runnerBody, setRunnerBody] = useState<string>('')
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [headersDraft, setHeadersDraft] = useState<string>('')
  const [headersJsonError, setHeadersJsonError] = useState<string | null>(null)
  const [revision, setRevision] = useState<number>(0)

  React.useEffect(() => {
    if (selectedEndpoint) {
      setHeadersDraft(JSON.stringify(selectedEndpoint.headers || {}, null, 2))
      setHeadersJsonError(null)
    }
  }, [selectedEndpoint?.id])

  React.useEffect(() => {
    mockLabService.initElectronSync()
    const unsub = mockLabService.subscribe(() => {
      setIsServerOn(mockLabService.isRunning())
      setPortInput(mockLabService.getPort())
      setServerError(mockLabService.getLastError())
      setRevision((r) => r + 1)
    })
    return unsub
  }, [])

  const endpoints = useMemo(() => {
    return mockLabService.getEndpoints()
  }, [revision, showAddModal, isServerOn])

  const trafficLogs = useMemo(() => {
    return mockLabService.getTrafficLogs()
  }, [revision, runnerResult, activeTab])

  const handleToggleServer = async () => {
    const res = await mockLabService.toggleServerAsync()
    setIsServerOn(res.running)
    setServerError(res.error || null)
  }

  const handleTestRequest = async () => {
    setIsTesting(true)
    try {
      const res = await mockLabService.sendLiveOrSimulatedRequest(
        runnerMethod,
        runnerPath,
        runnerBody.trim() || undefined
      )
      setRunnerResult(res)
    } finally {
      setIsTesting(false)
    }
  }

  const handleAddEndpoint = () => {
    const created = mockLabService.addEndpoint({
      name: `${newMethod} ${newPath}`,
      method: newMethod,
      path: newPath,
      statusCode: newStatus,
      delayMs: newDelay,
      headers: { 'Content-Type': 'application/json' },
      responseBody: newBody,
      contentType: 'application/json',
      isEnabled: true,
    })
    setSelectedEndpoint(created)
    setShowAddModal(false)
  }

  const handleDeleteEndpoint = (id: string) => {
    mockLabService.deleteEndpoint(id)
    if (selectedEndpoint?.id === id) {
      setSelectedEndpoint(null)
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1800)
  }

  return (
    <div className="mocklab-root">
      {/* Top Header & Server Power Bar */}
      <div className="mocklab-header-bar">
        <div className="header-left">
          <Server size={14} className="accent-icon" />
          <span className="title-text">MockLab API Server</span>
          <span className={`status-pill ${isServerOn ? 'online' : 'offline'}`}>
            {isServerOn ? `PORT ${portInput} ONLINE` : 'OFFLINE'}
          </span>
        </div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="number"
            value={portInput}
            onChange={(e) => setPortInput(Number(e.target.value) || 4040)}
            onBlur={() => void mockLabService.setPortAsync(portInput)}
            title="Server Port"
            style={{ width: 58, padding: '2px 5px', fontSize: 11, borderRadius: 4, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0' }}
          />
          <button
            className={`server-toggle-btn glass-interactive ${isServerOn ? 'stop' : 'start'}`}
            onClick={() => void handleToggleServer()}
          >
            {isServerOn ? <Square size={11} fill="#FF453A" /> : <Play size={11} fill="#30D158" />}
            <span>{isServerOn ? 'Stop' : 'Start'}</span>
          </button>
        </div>
      </div>
      {serverError && (
        <div style={{ padding: '4px 12px', fontSize: 11, color: '#FF453A', background: 'rgba(255,69,58,0.12)' }}>
          {serverError}
        </div>
      )}

      {/* Sub-Nav Tabs */}
      <div
        className="mocklab-nav-bar"
        onWheel={(e) => {
          e.currentTarget.scrollLeft += e.deltaY
        }}
      >
        <button
          className={`nav-tab-btn glass-interactive ${activeTab === 'endpoints' ? 'active' : ''}`}
          onClick={() => setActiveTab('endpoints')}
        >
          <Server size={12} />
          <span>Routes ({endpoints.length})</span>
        </button>

        <button
          className={`nav-tab-btn glass-interactive ${activeTab === 'runner' ? 'active' : ''}`}
          onClick={() => setActiveTab('runner')}
        >
          <Send size={12} />
          <span>Test Client</span>
        </button>

        <button
          className={`nav-tab-btn glass-interactive ${activeTab === 'traffic' ? 'active' : ''}`}
          onClick={() => setActiveTab('traffic')}
        >
          <Zap size={12} />
          <span>Traffic Logs ({trafficLogs.length})</span>
        </button>
      </div>

      {/* Endpoints Route Builder View */}
      {activeTab === 'endpoints' && (
        <div className="endpoints-layout">
          <div className="endpoints-list-col">
            <div className="list-toolbar">
              <span className="toolbar-label">Active Mock Routes</span>
              <button
                className="add-route-btn glass-interactive"
                onClick={() => setShowAddModal(true)}
                title="Create New Endpoint"
              >
                <Plus size={12} />
              </button>
            </div>

            <div className="routes-list">
              {endpoints.map((ep) => {
                const isSelected = selectedEndpoint?.id === ep.id
                return (
                  <div
                    key={ep.id}
                    className={`route-card glass-interactive ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedEndpoint(ep)}
                  >
                    <div className="route-top">
                      <span className={`method-badge ${ep.method.toLowerCase()}`}>{ep.method}</span>
                      <span className={`status-tag code-${Math.floor(ep.statusCode / 100)}xx`}>
                        {ep.statusCode}
                      </span>
                    </div>
                    <div className="route-path" title={ep.path}>
                      {ep.path}
                    </div>
                    <div className="route-footer">
                      <span>{ep.delayMs}ms delay</span>
                      <span>{ep.callCount} calls</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="endpoint-detail-col">
            {selectedEndpoint ? (
              <div className="detail-pane">
                <div className="detail-head">
                  <div className="detail-title-group">
                    <span className={`method-badge ${selectedEndpoint.method.toLowerCase()}`}>
                      {selectedEndpoint.method}
                    </span>
                    <span className="path-text">{selectedEndpoint.path}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#CBD5E1', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedEndpoint.isEnabled}
                        onChange={(e) => {
                          const enabled = e.target.checked
                          mockLabService.updateEndpoint(selectedEndpoint.id, { isEnabled: enabled })
                          setSelectedEndpoint({ ...selectedEndpoint, isEnabled: enabled })
                        }}
                      />
                      <span>{selectedEndpoint.isEnabled ? 'Enabled' : 'Disabled'}</span>
                    </label>
                    <button
                      className="del-btn glass-interactive"
                      onClick={() => handleDeleteEndpoint(selectedEndpoint.id)}
                      title="Delete Route"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="detail-form">
                  <div className="form-row">
                    <label>HTTP Method</label>
                    <select
                      value={selectedEndpoint.method}
                      onChange={(e) => {
                        const method = e.target.value as HttpMethod
                        mockLabService.updateEndpoint(selectedEndpoint.id, { method })
                        setSelectedEndpoint({ ...selectedEndpoint, method })
                      }}
                      className="form-input"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>

                  <div className="form-row">
                    <label>Route Path</label>
                    <input
                      type="text"
                      value={selectedEndpoint.path}
                      onChange={(e) => {
                        const path = e.target.value
                        mockLabService.updateEndpoint(selectedEndpoint.id, { path })
                        setSelectedEndpoint({ ...selectedEndpoint, path })
                      }}
                      className="form-input"
                    />
                  </div>

                  <div className="form-row">
                    <label>HTTP Status</label>
                    <input
                      type="number"
                      value={selectedEndpoint.statusCode}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 200
                        mockLabService.updateEndpoint(selectedEndpoint.id, { statusCode: val })
                        setSelectedEndpoint({ ...selectedEndpoint, statusCode: val })
                      }}
                      className="form-input"
                    />
                  </div>

                  <div className="form-row">
                    <label>Simulated Delay (ms)</label>
                    <input
                      type="number"
                      value={selectedEndpoint.delayMs}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0)
                        mockLabService.updateEndpoint(selectedEndpoint.id, { delayMs: val })
                        setSelectedEndpoint({ ...selectedEndpoint, delayMs: val })
                      }}
                      className="form-input"
                    />
                  </div>

                  <div className="form-row">
                    <label>Content-Type</label>
                    <select
                      value={selectedEndpoint.contentType}
                      onChange={(e) => {
                        const ct = e.target.value as MockEndpoint['contentType']
                        const nextHeaders = { ...(selectedEndpoint.headers || {}), 'Content-Type': ct }
                        mockLabService.updateEndpoint(selectedEndpoint.id, { contentType: ct, headers: nextHeaders })
                        setSelectedEndpoint({ ...selectedEndpoint, contentType: ct, headers: nextHeaders })
                        setHeadersDraft(JSON.stringify(nextHeaders, null, 2))
                      }}
                      className="form-input"
                    >
                      <option value="application/json">application/json</option>
                      <option value="text/plain">text/plain</option>
                      <option value="text/html">text/html</option>
                      <option value="application/xml">application/xml</option>
                    </select>
                  </div>

                  <div className="form-row full">
                    <label>Custom Response Headers (JSON)</label>
                    <textarea
                      value={headersDraft}
                      onChange={(e) => {
                        const raw = e.target.value
                        setHeadersDraft(raw)
                        try {
                          const parsed = JSON.parse(raw)
                          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                            const cleaned = Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)]))
                            mockLabService.updateEndpoint(selectedEndpoint.id, { headers: cleaned })
                            setSelectedEndpoint({ ...selectedEndpoint, headers: cleaned })
                            setHeadersJsonError(null)
                          } else {
                            setHeadersJsonError('Headers must be a JSON object')
                          }
                        } catch (err: any) {
                          setHeadersJsonError(err?.message || 'Invalid JSON')
                        }
                      }}
                      rows={3}
                      className="body-textarea"
                      spellCheck={false}
                    />
                    {headersJsonError && (
                      <div style={{ fontSize: 10, color: '#FB7185', marginTop: 2 }}>{headersJsonError}</div>
                    )}
                  </div>

                  <div className="form-row full">
                    <div className="body-header">
                      <label>Dynamic Response JSON Template</label>
                      <button
                        className="copy-btn glass-interactive"
                        onClick={() => copyToClipboard(selectedEndpoint.responseBody, 'ep_body')}
                      >
                        {copiedKey === 'ep_body' ? <Check size={11} /> : <Copy size={11} />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <textarea
                      value={selectedEndpoint.responseBody}
                      onChange={(e) => {
                        mockLabService.updateEndpoint(selectedEndpoint.id, { responseBody: e.target.value })
                        setSelectedEndpoint({ ...selectedEndpoint, responseBody: e.target.value })
                      }}
                      rows={8}
                      className="body-textarea"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">Select a mock endpoint on the left to configure response template and latency</div>
            )}
          </div>
        </div>
      )}

      {/* Test Client Runner View */}
      {activeTab === 'runner' && (
        <div className="runner-layout">
          <div className="runner-bar glass-panel">
            <select
              value={runnerMethod}
              onChange={(e) => setRunnerMethod(e.target.value as HttpMethod)}
              className="runner-select"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
            <input
              type="text"
              value={runnerPath}
              onChange={(e) => setRunnerPath(e.target.value)}
              placeholder="/api/v1/users..."
              className="runner-input"
            />
            <button
              className="runner-send-btn glass-interactive"
              onClick={handleTestRequest}
              disabled={isTesting}
            >
              <Send size={11} />
              <span>{isTesting ? 'Sending...' : 'Send'}</span>
            </button>
          </div>

          {(['POST', 'PUT', 'PATCH'] as HttpMethod[]).includes(runnerMethod) && (
            <div style={{ padding: '0 0 8px 0' }}>
              <textarea
                value={runnerBody}
                onChange={(e) => setRunnerBody(e.target.value)}
                placeholder='Optional JSON request body (e.g. {"name": "Alice"})'
                rows={3}
                className="body-textarea"
                style={{ width: '100%' }}
              />
            </div>
          )}

          <div className="runner-response-area">
            {runnerResult ? (
              <div className="response-box glass-panel">
                <div className="response-meta">
                  <span className={`status-badge code-${Math.floor(runnerResult.statusCode / 100)}xx`}>
                    {runnerResult.statusCode}
                  </span>
                  <span className="timing-text">{runnerResult.durationMs}ms latency</span>
                </div>
                <pre className="response-body">
                  <code>{runnerResult.body}</code>
                </pre>
              </div>
            ) : (
              <div className="empty-state">Hit Send above to trigger simulated request against MockLab router</div>
            )}
          </div>
        </div>
      )}

      {/* Traffic Logs View */}
      {activeTab === 'traffic' && (
        <div className="traffic-layout">
          <div className="traffic-toolbar">
            <span>Incoming Traffic Stream</span>
            <button
              className="clear-btn glass-interactive"
              onClick={() => mockLabService.clearTrafficLogs()}
            >
              Clear Logs
            </button>
          </div>

          <div className="traffic-feed">
            {trafficLogs.map((log) => {
              const isExpanded = expandedLogId === log.id
              return (
                <div
                  key={log.id}
                  className="traffic-card glass-panel"
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  style={{ cursor: 'pointer' }}
                  title="Click to inspect request/response headers & body"
                >
                  <div className="traffic-top">
                    <span className={`method-badge ${log.method.toLowerCase()}`}>{log.method}</span>
                    <span className="url-text">{log.url}</span>
                    <span className={`status-badge code-${Math.floor(log.statusCode / 100)}xx`}>
                      {log.statusCode}
                    </span>
                  </div>
                  <div className="traffic-bottom">
                    <span>{log.durationMs}ms duration</span>
                    <span>{log.timestamp}</span>
                  </div>
                  {isExpanded && (
                    <div
                      style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 11 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {log.requestHeaders && Object.keys(log.requestHeaders).length > 0 && (
                        <div style={{ marginBottom: 6 }}>
                          <div style={{ color: '#94A3B8', fontWeight: 600, marginBottom: 2 }}>Request Headers</div>
                          <pre className="response-body" style={{ margin: 0, maxHeight: 90 }}>
                            <code>{JSON.stringify(log.requestHeaders, null, 2)}</code>
                          </pre>
                        </div>
                      )}
                      {log.requestBody && (
                        <div style={{ marginBottom: 6 }}>
                          <div style={{ color: '#94A3B8', fontWeight: 600, marginBottom: 2 }}>Request Body</div>
                          <pre className="response-body" style={{ margin: 0, maxHeight: 110 }}>
                            <code>{log.requestBody}</code>
                          </pre>
                        </div>
                      )}
                      <div>
                        <div style={{ color: '#94A3B8', fontWeight: 600, marginBottom: 2 }}>Response Body</div>
                        <pre className="response-body" style={{ margin: 0, maxHeight: 140 }}>
                          <code>{log.responseBody || '(empty)'}</code>
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add New Route Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-card glass-panel">
            <div className="modal-head">Create Mock Route</div>
            <div className="form-group">
              <label>Method</label>
              <select
                value={newMethod}
                onChange={(e) => setNewMethod(e.target.value as HttpMethod)}
                className="input-select"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="form-group">
              <label>Path Pattern</label>
              <input
                type="text"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                className="input-text"
              />
            </div>
            <div className="form-group">
              <label>Status Code</label>
              <input
                type="number"
                value={newStatus}
                onChange={(e) => setNewStatus(parseInt(e.target.value, 10) || 200)}
                className="input-text"
              />
            </div>
            <div className="form-group">
              <label>Delay (ms)</label>
              <input
                type="number"
                value={newDelay}
                onChange={(e) => setNewDelay(parseInt(e.target.value, 10) || 0)}
                className="input-text"
              />
            </div>
            <div className="form-group">
              <label>JSON Response Body</label>
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={4}
                className="input-text textarea"
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel glass-interactive" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn-save glass-interactive" onClick={handleAddEndpoint}>
                Create Route
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

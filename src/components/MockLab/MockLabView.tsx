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

  const endpoints = useMemo(() => {
    return mockLabService.getEndpoints()
  }, [showAddModal, isServerOn])

  const trafficLogs = useMemo(() => {
    return mockLabService.getTrafficLogs()
  }, [runnerResult, activeTab])

  const handleToggleServer = () => {
    const running = mockLabService.toggleServer()
    setIsServerOn(running)
  }

  const handleTestRequest = async () => {
    setIsTesting(true)
    try {
      const res = await mockLabService.handleRequest(runnerMethod, runnerPath)
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
            {isServerOn ? 'PORT 4040 ONLINE' : 'OFFLINE'}
          </span>
        </div>
        <div className="header-right">
          <button
            className={`server-toggle-btn glass-interactive ${isServerOn ? 'stop' : 'start'}`}
            onClick={handleToggleServer}
          >
            {isServerOn ? <Square size={11} fill="#FF453A" /> : <Play size={11} fill="#30D158" />}
            <span>{isServerOn ? 'Stop' : 'Start'}</span>
          </button>
        </div>
      </div>

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
                  <button
                    className="del-btn glass-interactive"
                    onClick={() => handleDeleteEndpoint(selectedEndpoint.id)}
                    title="Delete Route"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div className="detail-form">
                  <div className="form-row">
                    <label>HTTP Status</label>
                    <input
                      type="number"
                      value={selectedEndpoint.statusCode}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10)
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
                        const val = parseInt(e.target.value, 10)
                        mockLabService.updateEndpoint(selectedEndpoint.id, { delayMs: val })
                        setSelectedEndpoint({ ...selectedEndpoint, delayMs: val })
                      }}
                      className="form-input"
                    />
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
            {trafficLogs.map((log) => (
              <div key={log.id} className="traffic-card glass-panel">
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
              </div>
            ))}
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

      <style>{`
        .mocklab-root {
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

        .mocklab-header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.25);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .accent-icon { color: #BF5AF2; }

        .title-text {
          font-weight: 600;
          color: #FFFFFF;
        }

        .status-pill {
          font-size: 0.6rem;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 4px;
        }

        .status-pill.online {
          background: rgba(48, 209, 88, 0.2);
          color: #30D158;
          border: 1px solid rgba(48, 209, 88, 0.4);
        }

        .status-pill.offline {
          background: rgba(255, 69, 58, 0.2);
          color: #FF453A;
          border: 1px solid rgba(255, 69, 58, 0.4);
        }

        .server-toggle-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          cursor: pointer;
        }

        .server-toggle-btn.stop {
          background: rgba(255, 69, 58, 0.15);
          border: 1px solid rgba(255, 69, 58, 0.35);
          color: #FF453A;
        }

        .server-toggle-btn.start {
          background: rgba(48, 209, 88, 0.15);
          border: 1px solid rgba(48, 209, 88, 0.35);
          color: #30D158;
        }

        .mocklab-nav-bar {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.15);
          overflow-x: auto;
          white-space: nowrap;
        }

        .nav-tab-btn {
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

        .nav-tab-btn.active {
          background: rgba(191, 90, 242, 0.15);
          border-color: rgba(191, 90, 242, 0.35);
          color: #BF5AF2;
          font-weight: 600;
        }

        .endpoints-layout {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .endpoints-list-col {
          width: 44%;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          overflow-y: auto;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .list-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.5);
          margin-bottom: 2px;
        }

        .add-route-btn {
          background: rgba(191, 90, 242, 0.2);
          border: 1px solid rgba(191, 90, 242, 0.4);
          color: #BF5AF2;
          border-radius: 4px;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .routes-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .route-card {
          padding: 8px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .route-card.selected {
          background: rgba(191, 90, 242, 0.12);
          border-color: rgba(191, 90, 242, 0.35);
        }

        .route-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .method-badge {
          font-size: 0.6rem;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 3px;
          font-family: 'JetBrains Mono', monospace;
        }

        .method-badge.get { background: rgba(48, 209, 88, 0.2); color: #30D158; }
        .method-badge.post { background: rgba(10, 132, 255, 0.2); color: #64D2FF; }
        .method-badge.put { background: rgba(255, 159, 10, 0.2); color: #FF9F0A; }
        .method-badge.delete { background: rgba(255, 69, 58, 0.2); color: #FF453A; }

        .status-tag, .status-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.62rem;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 3px;
        }

        .code-2xx { background: rgba(48, 209, 88, 0.15); color: #30D158; }
        .code-4xx { background: rgba(255, 159, 10, 0.15); color: #FF9F0A; }
        .code-5xx { background: rgba(255, 69, 58, 0.15); color: #FF453A; }

        .route-path {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          color: #FFFFFF;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .route-footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.65rem;
          color: rgba(235, 235, 245, 0.4);
        }

        .endpoint-detail-col {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
        }

        .detail-pane {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .detail-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 8px;
        }

        .detail-title-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .path-text {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 600;
          color: #FFFFFF;
        }

        .del-btn {
          background: rgba(255, 69, 58, 0.15);
          border: 1px solid rgba(255, 69, 58, 0.3);
          color: #FF453A;
          border-radius: 4px;
          padding: 4px;
          cursor: pointer;
        }

        .detail-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-row {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .form-row label {
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.5);
        }

        .form-input {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 4px 6px;
          color: #FFFFFF;
          font-size: 0.72rem;
          font-family: 'JetBrains Mono', monospace;
        }

        .body-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .copy-btn {
          background: transparent;
          border: none;
          color: rgba(235, 235, 245, 0.6);
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 0.68rem;
          cursor: pointer;
        }

        .body-textarea {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 8px;
          color: #64D2FF;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          resize: vertical;
        }

        .runner-layout {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
          padding: 10px;
          gap: 8px;
        }

        .runner-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.3);
        }

        .runner-select {
          background: #141A2A;
          color: #30D158;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 3px 6px;
          font-weight: 700;
          font-size: 0.7rem;
        }

        .runner-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #FFFFFF;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.74rem;
          outline: none;
        }

        .runner-send-btn {
          background: rgba(48, 209, 88, 0.2);
          border: 1px solid rgba(48, 209, 88, 0.4);
          color: #30D158;
          border-radius: 4px;
          padding: 4px 10px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
          font-size: 0.7rem;
          cursor: pointer;
        }

        .runner-response-area {
          flex: 1;
          overflow-y: auto;
        }

        .response-box {
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
        }

        .response-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .timing-text {
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.5);
        }

        .response-body {
          margin: 0;
          padding: 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          color: #FFD60A;
          overflow-x: auto;
          max-height: 320px;
        }

        .traffic-layout {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
          padding: 10px;
          gap: 6px;
        }

        .traffic-toolbar {
          display: flex;
          justify-content: space-between;
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.5);
        }

        .clear-btn {
          background: transparent;
          border: none;
          color: rgba(235, 235, 245, 0.6);
          cursor: pointer;
        }

        .traffic-feed {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .traffic-card {
          padding: 6px 8px;
          border-radius: 5px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.02);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .traffic-top {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .url-text {
          flex: 1;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          color: #FFFFFF;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .traffic-bottom {
          display: flex;
          justify-content: space-between;
          font-size: 0.62rem;
          color: rgba(235, 235, 245, 0.4);
        }

        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          color: rgba(235, 235, 245, 0.4);
          font-size: 0.74rem;
          padding: 16px;
        }

        .modal-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
        }

        .modal-card {
          width: 280px;
          background: rgba(20, 26, 42, 0.96);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .modal-head { font-weight: 600; color: #FFFFFF; }
        .form-group { display: flex; flex-direction: column; gap: 2px; }
        .form-group label { font-size: 0.65rem; color: rgba(235, 235, 245, 0.6); }

        .input-text, .input-select {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 4px 6px;
          color: #FFFFFF;
          font-size: 0.72rem;
          font-family: 'JetBrains Mono', monospace;
        }

        .input-select { background: #141A2A; }
        .textarea { resize: vertical; }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
          margin-top: 4px;
        }

        .btn-cancel {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(235, 235, 245, 0.7);
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 0.7rem;
          cursor: pointer;
        }

        .btn-save {
          background: rgba(191, 90, 242, 0.2);
          border: 1px solid rgba(191, 90, 242, 0.4);
          color: #BF5AF2;
          border-radius: 4px;
          padding: 4px 10px;
          font-size: 0.7rem;
          font-weight: 600;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}

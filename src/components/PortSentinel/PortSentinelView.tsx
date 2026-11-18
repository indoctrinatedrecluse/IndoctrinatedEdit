import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldAlert,
  RefreshCw,
  Search,
  Activity,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  Power,
  Plus,
} from 'lucide-react'
import { portSentinelService, ActivePort, PortPingResult } from '../../services/portSentinelService'
import './PortSentinelView.css'

export const PortSentinelView: React.FC = () => {
  const [ports, setPorts] = useState<ActivePort[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedPort, setSelectedPort] = useState<ActivePort | null>(null)
  const [pingResult, setPingResult] = useState<PortPingResult | null>(null)
  const [isPinging, setIsPinging] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Custom port add dialog
  const [showAddModal, setShowAddModal] = useState<boolean>(false)
  const [customPortNum, setCustomPortNum] = useState<string>('8081')
  const [customProcName, setCustomProcName] = useState<string>('my-server.exe')

  const loadPorts = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await portSentinelService.scanActivePorts(searchQuery)
      setPorts(data)
      setSelectedPort((prev) => {
        if (prev && data.some((p) => p.port === prev.port && p.pid === prev.pid)) return prev
        return data.length > 0 ? data[0] : null
      })
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    loadPorts()
  }, [loadPorts])

  // Clear stale ping result whenever selected port changes
  useEffect(() => {
    setPingResult(null)
  }, [selectedPort?.port, selectedPort?.pid])

  const handlePing = async (port: number) => {
    setIsPinging(true)
    setPingResult(null)
    try {
      const res = await portSentinelService.pingPort(port)
      setPingResult(res)
    } finally {
      setIsPinging(false)
    }
  }

  const handleKill = async (pid: number) => {
    const res = await portSentinelService.killProcessAsync(pid)
    setStatusMessage(res.message)
    setTimeout(() => setStatusMessage(null), 4000)
    await loadPorts()
    if (selectedPort?.pid === pid) {
      setSelectedPort(null)
    }
  }

  const handleAddCustom = () => {
    const num = parseInt(customPortNum, 10)
    if (!isNaN(num) && num > 0 && num <= 65535) {
      const created = portSentinelService.registerCustomPort(num, customProcName)
      setShowAddModal(false)
      loadPorts()
      setSelectedPort(created)
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1800)
  }

  const conflictsCount = ports.filter((p) => p.isConflict).length

  return (
    <div className="port-sentinel-root">
      {/* Header Bar */}
      <div className="sentinel-header-strip">
        <div className="sentinel-title-row">
          <div className="title-left">
            <ShieldAlert size={14} className="accent-icon" />
            <span className="sentinel-title">Port & Process Sentinel</span>
            {conflictsCount > 0 && (
              <span className="badge-conflict" title="Port conflicts detected">
                <AlertTriangle size={10} /> {conflictsCount} Conflict{conflictsCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="actions-right">
            <button
              className="sentinel-action-btn glass-interactive"
              onClick={() => setShowAddModal(true)}
              title="Add Custom Port Watcher"
            >
              <Plus size={12} />
            </button>
            <button
              className={`sentinel-action-btn glass-interactive ${isLoading ? 'spinning' : ''}`}
              onClick={loadPorts}
              title="Refresh Ports (Rescan)"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        {/* Search / Filter Input */}
        <div className="sentinel-search-wrap">
          <Search size={12} className="search-icon" />
          <input
            type="text"
            className="sentinel-search-input"
            placeholder="Filter by port (3000, 5173), PID, or process..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {statusMessage && (
        <div className="sentinel-alert-banner">
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Split Grid */}
      <div className="sentinel-main-grid">
        {/* Left List of Active Ports */}
        <div className="port-list-pane">
          {ports.length === 0 ? (
            <div className="empty-state">No matching active listening ports</div>
          ) : (
            ports.map((p) => {
              const isSelected = selectedPort?.port === p.port && selectedPort?.pid === p.pid
              return (
                <div
                  key={`${p.port}-${p.pid}`}
                  className={`port-card glass-interactive ${isSelected ? 'selected' : ''} ${p.isConflict ? 'conflict' : ''}`}
                  onClick={() => setSelectedPort(p)}
                >
                  <div className="card-top-line">
                    <span className="port-number">:{p.port}</span>
                    <span className={`proto-badge ${p.category}`}>{p.protocol}</span>
                  </div>
                  <div className="card-sub-line">
                    <span className="process-name">{p.processName}</span>
                    <span className="pid-tag">PID {p.pid}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right Detail & Probe Inspector */}
        <div className="port-detail-pane">
          {selectedPort ? (
            <div className="detail-container">
              <div className="detail-header">
                <div className="detail-title-block">
                  <div className="port-big">Port :{selectedPort.port}</div>
                  <div className="proc-desc">{selectedPort.description}</div>
                </div>
                <button
                  className="kill-btn glass-interactive"
                  onClick={() => handleKill(selectedPort.pid)}
                  title="Terminate Process and Free Port"
                >
                  <Power size={12} />
                  <span>Release Port</span>
                </button>
              </div>

              {/* Meta Property Table */}
              <div className="meta-grid">
                <div className="meta-row">
                  <span className="meta-label">Process</span>
                  <span className="meta-val">{selectedPort.processName} (PID: {selectedPort.pid})</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Local Address</span>
                  <span className="meta-val">{selectedPort.localAddress}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Status</span>
                  <span className="meta-val status-listening">{selectedPort.state}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Category</span>
                  <span className="meta-val capitalize">{selectedPort.category}</span>
                </div>
              </div>

              {/* Health Probe Box */}
              <div className="probe-box glass-panel">
                <div className="probe-header">
                  <div className="probe-title">
                    <Activity size={12} />
                    <span>HTTP / TCP Health Probe</span>
                  </div>
                  <button
                    className="probe-btn glass-interactive"
                    onClick={() => handlePing(selectedPort.port)}
                    disabled={isPinging}
                  >
                    <Zap size={11} className={isPinging ? 'spinning' : ''} />
                    <span>{isPinging ? 'Probing...' : 'Ping Port'}</span>
                  </button>
                </div>

                {pingResult && (
                  <div className={`ping-result-card ${pingResult.isReachable ? 'success' : 'failed'}`}>
                    <div className="ping-status-row">
                      {pingResult.isReachable ? (
                        <CheckCircle size={14} className="ping-icon ok" />
                      ) : (
                        <XCircle size={14} className="ping-icon fail" />
                      )}
                      <span className="ping-status-text">
                        {pingResult.statusCode} {pingResult.statusText} ({pingResult.latencyMs}ms)
                      </span>
                    </div>
                    <div className="ping-footer">
                      <span>Tested at {pingResult.checkedAt}</span>
                      {pingResult.serverHeader && (
                        <span style={{ marginLeft: 8, opacity: 0.85 }}>Server: {pingResult.serverHeader}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Terminal Kill Command */}
              {(() => {
                const isWin =
                  typeof navigator !== 'undefined' &&
                  /win/i.test(navigator.platform || navigator.userAgent || '')
                const killCmd = isWin
                  ? `Stop-Process -Id ${selectedPort.pid} -Force`
                  : `kill -9 ${selectedPort.pid}`
                return (
                  <div className="cmd-helper-box">
                    <div className="helper-label">Terminal Kill Command:</div>
                    <div className="cmd-snippet">
                      <code>{killCmd}</code>
                      <button
                        className="copy-btn glass-interactive"
                        onClick={() => copyToClipboard(killCmd, 'killCmd')}
                      >
                        {copiedKey === 'killCmd' ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          ) : (
            <div className="empty-detail">Select a port on the left to inspect properties and test latency</div>
          )}
        </div>
      </div>

      {/* Add Custom Port Watcher Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-box glass-panel">
            <div className="modal-title">Register Port Watcher</div>
            <div className="form-group">
              <label>Port Number (1 - 65535)</label>
              <input
                type="number"
                value={customPortNum}
                onChange={(e) => setCustomPortNum(e.target.value)}
                className="modal-input"
              />
            </div>
            <div className="form-group">
              <label>Process Name</label>
              <input
                type="text"
                value={customProcName}
                onChange={(e) => setCustomProcName(e.target.value)}
                className="modal-input"
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel glass-interactive" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn-save glass-interactive" onClick={handleAddCustom}>
                Add Port
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

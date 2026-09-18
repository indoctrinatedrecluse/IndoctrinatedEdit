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
      if (data.length > 0 && !selectedPort) {
        setSelectedPort(data[0])
      }
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, selectedPort])

  useEffect(() => {
    loadPorts()
  }, [loadPorts])

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

  const handleKill = (pid: number) => {
    const res = portSentinelService.killProcess(pid)
    setStatusMessage(res.message)
    setTimeout(() => setStatusMessage(null), 3000)
    loadPorts()
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
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Terminal Kill Command */}
              <div className="cmd-helper-box">
                <div className="helper-label">Terminal Kill Command:</div>
                <div className="cmd-snippet">
                  <code>Stop-Process -Id {selectedPort.pid} -Force</code>
                  <button
                    className="copy-btn glass-interactive"
                    onClick={() =>
                      copyToClipboard(`Stop-Process -Id ${selectedPort.pid} -Force`, 'killCmd')
                    }
                  >
                    {copiedKey === 'killCmd' ? <Check size={11} /> : <Copy size={11} />}
                  </button>
                </div>
              </div>
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

      <style>{`
        .port-sentinel-root {
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

        .sentinel-header-strip {
          padding: 8px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .sentinel-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .title-left {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          color: #FFFFFF;
        }

        .accent-icon {
          color: #30D158;
        }

        .badge-conflict {
          background: rgba(255, 69, 58, 0.2);
          border: 1px solid rgba(255, 69, 58, 0.4);
          color: #FF453A;
          font-size: 0.65rem;
          font-weight: 600;
          padding: 1px 5px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .actions-right {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .sentinel-action-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(235, 235, 245, 0.8);
          border-radius: 5px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .sentinel-search-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          padding: 3px 8px;
        }

        .sentinel-search-input {
          background: transparent;
          border: none;
          outline: none;
          color: #FFFFFF;
          font-size: 0.74rem;
          width: 100%;
        }

        .sentinel-alert-banner {
          background: rgba(48, 209, 88, 0.15);
          border-bottom: 1px solid rgba(48, 209, 88, 0.3);
          color: #30D158;
          padding: 4px 12px;
          font-size: 0.72rem;
        }

        .sentinel-main-grid {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .port-list-pane {
          width: 42%;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          overflow-y: auto;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .port-card {
          padding: 8px 10px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .port-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .port-card.selected {
          background: rgba(48, 209, 88, 0.12);
          border-color: rgba(48, 209, 88, 0.35);
        }

        .port-card.conflict {
          border-left: 3px solid #FF453A;
        }

        .card-top-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 600;
        }

        .port-number {
          font-family: 'JetBrains Mono', monospace;
          color: #64D2FF;
          font-size: 0.85rem;
        }

        .proto-badge {
          font-size: 0.62rem;
          padding: 1px 4px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(235, 235, 245, 0.7);
        }

        .card-sub-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.6);
          margin-top: 3px;
        }

        .port-detail-pane {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .detail-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .detail-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 10px;
        }

        .port-big {
          font-size: 1.1rem;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          color: #64D2FF;
        }

        .proc-desc {
          font-size: 0.72rem;
          color: rgba(235, 235, 245, 0.65);
        }

        .kill-btn {
          background: rgba(255, 69, 58, 0.15);
          border: 1px solid rgba(255, 69, 58, 0.35);
          color: #FF453A;
          border-radius: 5px;
          padding: 4px 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
        }

        .meta-grid {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 6px;
          padding: 8px 10px;
        }

        .meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.72rem;
        }

        .meta-label {
          color: rgba(235, 235, 245, 0.5);
        }

        .meta-val {
          font-family: 'JetBrains Mono', monospace;
          color: #FFFFFF;
        }

        .status-listening {
          color: #30D158;
          font-weight: 600;
        }

        .probe-box {
          padding: 10px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .probe-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .probe-title {
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 600;
          color: #FFFFFF;
        }

        .probe-btn {
          background: rgba(10, 132, 255, 0.2);
          border: 1px solid rgba(10, 132, 255, 0.4);
          color: #64D2FF;
          border-radius: 4px;
          padding: 3px 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          cursor: pointer;
        }

        .ping-result-card {
          padding: 8px;
          border-radius: 5px;
          font-size: 0.72rem;
        }

        .ping-result-card.success {
          background: rgba(48, 209, 88, 0.1);
          border: 1px solid rgba(48, 209, 88, 0.25);
        }

        .ping-result-card.failed {
          background: rgba(255, 69, 58, 0.1);
          border: 1px solid rgba(255, 69, 58, 0.25);
        }

        .ping-status-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
        }

        .ping-icon.ok { color: #30D158; }
        .ping-icon.fail { color: #FF453A; }

        .ping-footer {
          font-size: 0.65rem;
          color: rgba(235, 235, 245, 0.4);
          margin-top: 3px;
        }

        .cmd-helper-box {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .helper-label {
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.5);
        }

        .cmd-snippet {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          padding: 4px 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          color: #FF9F0A;
        }

        .copy-btn {
          background: transparent;
          border: none;
          color: rgba(235, 235, 245, 0.6);
          cursor: pointer;
        }

        .empty-detail {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          color: rgba(235, 235, 245, 0.4);
          font-size: 0.75rem;
          padding: 20px;
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

        .modal-box {
          width: 260px;
          background: rgba(20, 26, 42, 0.96);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .modal-title {
          font-weight: 600;
          color: #FFFFFF;
          font-size: 0.85rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .form-group label {
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.6);
        }

        .modal-input {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 4px 8px;
          color: #FFFFFF;
          font-size: 0.75rem;
        }

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
          padding: 4px 10px;
          font-size: 0.72rem;
          cursor: pointer;
        }

        .btn-save {
          background: rgba(48, 209, 88, 0.2);
          border: 1px solid rgba(48, 209, 88, 0.4);
          color: #30D158;
          border-radius: 4px;
          padding: 4px 10px;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

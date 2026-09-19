import React, { useState, useEffect, useRef } from 'react'
import {
  Wifi,
  WifiOff,
  Send,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Radio,
  Activity,
  KeyRound,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react'
import { socketService, SocketMessage, PresetPayload } from '../../services/socketService'

export const WebSocketView: React.FC = () => {
  const [url, setUrl] = useState<string>('wss://echo.websocket.events')
  const [protocolType, setProtocolType] = useState<'websocket' | 'sse'>('websocket')
  const [authToken, setAuthToken] = useState<string>('')
  const [showConfig, setShowConfig] = useState<boolean>(false)
  const [heartbeatActive, setHeartbeatActive] = useState<boolean>(false)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [messages, setMessages] = useState<SocketMessage[]>([])
  const [inputPayload, setInputPayload] = useState<string>(
    JSON.stringify(
      {
        action: 'subscribe',
        channel: 'telemetry',
        timestamp: Date.now(),
      },
      null,
      2
    )
  )

  const messageEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const unsubMsg = socketService.subscribe((msgs) => setMessages(msgs))
    const unsubStatus = socketService.subscribeStatus((connected) => setIsConnected(connected))
    return () => {
      unsubMsg()
      unsubStatus()
    }
  }, [])

  const handleToggleConnect = async () => {
    if (isConnected) {
      socketService.disconnect()
      setHeartbeatActive(false)
    } else {
      await socketService.connect({
        url,
        protocolType,
        authToken: authToken.trim() || undefined,
        heartbeatIntervalMs: heartbeatActive ? 5000 : 0,
      })
    }
  }

  const handleSend = () => {
    if (!inputPayload.trim()) return
    socketService.send(inputPayload)
  }

  const handleClear = () => {
    socketService.clearMessages()
  }

  const handleSendPing = () => {
    socketService.sendPing()
  }

  const handleApplyPreset = (p: PresetPayload) => {
    setInputPayload(p.payload)
  }

  return (
    <div className="websocket-workbench-root">
      {/* Protocol & Connection Bar */}
      <div className="ws-connect-bar glass-panel">
        <div className="protocol-toggle-strip">
          <button
            className={`proto-btn ${protocolType === 'websocket' ? 'active' : ''}`}
            onClick={() => {
              setProtocolType('websocket')
              if (url.includes('/events')) setUrl('wss://echo.websocket.events')
            }}
          >
            <Wifi size={11} />
            <span>WebSocket</span>
          </button>
          <button
            className={`proto-btn ${protocolType === 'sse' ? 'active' : ''}`}
            onClick={() => {
              setProtocolType('sse')
              if (url.startsWith('wss://')) setUrl('https://api.indoctrinated.io/v1/events')
            }}
          >
            <Radio size={11} />
            <span>SSE Stream</span>
          </button>
        </div>

        <div className="ws-input-row">
          <div className="ws-input-wrapper">
            <span className={`ws-status-indicator ${isConnected ? 'online' : 'offline'}`} />
            <input
              type="text"
              className="ws-url-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={protocolType === 'websocket' ? 'wss://echo.websocket.events' : 'https://api.domain.io/events'}
              disabled={isConnected}
            />
          </div>

          <button
            className={`ws-connect-btn glass-interactive ${isConnected ? 'connected' : ''}`}
            onClick={handleToggleConnect}
          >
            {isConnected ? <WifiOff size={12} /> : <Wifi size={12} />}
            <span>{isConnected ? 'Disconnect' : 'Connect'}</span>
          </button>
        </div>
      </div>

      {/* Advanced Auth & Heartbeat Header Accordion */}
      <div className="ws-config-bar">
        <button className="config-toggle-btn" onClick={() => setShowConfig(!showConfig)}>
          {showConfig ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          <span>Headers, Auth & Heartbeat</span>
        </button>

        {isConnected && protocolType === 'websocket' && (
          <button className="ping-btn glass-interactive" onClick={handleSendPing} title="Send Ping Frame">
            <Activity size={11} />
            <span>Ping</span>
          </button>
        )}
      </div>

      {showConfig && (
        <div className="ws-config-drawer glass-panel">
          <div className="config-field">
            <label className="cfg-label">
              <KeyRound size={10} /> Auth Bearer Token:
            </label>
            <input
              type="password"
              className="cfg-input"
              placeholder="Bearer eyJhbGci..."
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
            />
          </div>
          <div className="config-field-row">
            <label className="cfg-checkbox-label">
              <input
                type="checkbox"
                checked={heartbeatActive}
                onChange={(e) => setHeartbeatActive(e.target.checked)}
              />
              <span>Auto Heartbeat (5s Ping/Pong interval)</span>
            </label>
          </div>
        </div>
      )}

      {/* Live Message Stream Feed */}
      <div className="ws-messages-viewport">
        <div className="ws-feed-header">
          <span>LIVE EVENT STREAM ({messages.length})</span>
          <button className="ws-clear-btn" onClick={handleClear} title="Clear Messages">
            <Trash2 size={11} /> Clear
          </button>
        </div>

        <div className="ws-messages-list">
          {messages.length === 0 ? (
            <div className="ws-empty-feed">
              <Radio size={24} color="rgba(255,255,255,0.2)" />
              <span>Connect to a WebSocket or SSE server to begin live packet streaming</span>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`ws-msg-card glass-panel ${m.direction} ${m.type}`}>
                <div className="msg-meta">
                  <span className={`dir-badge ${m.direction}`}>
                    {m.direction === 'in' ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                    <span>{m.direction === 'in' ? 'IN' : 'OUT'}</span>
                  </span>
                  <span className={`msg-type-pill ${m.type}`}>{m.type.toUpperCase()}</span>
                  {m.eventName && <span className="event-name-pill">{m.eventName}</span>}
                  <span className="msg-size">{m.sizeBytes} B</span>
                  <span className="msg-time">{m.timestamp}</span>
                </div>
                <pre className="msg-payload">{m.data}</pre>
              </div>
            ))
          )}
          <div ref={messageEndRef} />
        </div>
      </div>

      {/* Message Composer & Forge Presets */}
      {protocolType === 'websocket' && (
        <div className="ws-composer-bar glass-panel">
          {/* Preset Chips */}
          <div className="preset-forge-row">
            <span className="forge-label">
              <Layers size={10} /> FORGE:
            </span>
            {socketService.presets.map((p) => (
              <button
                key={p.name}
                className="forge-chip glass-interactive"
                onClick={() => handleApplyPreset(p)}
              >
                {p.name}
              </button>
            ))}
          </div>

          <textarea
            className="composer-textarea"
            value={inputPayload}
            onChange={(e) => setInputPayload(e.target.value)}
            placeholder="Enter JSON or text payload..."
            rows={3}
          />
          <div className="composer-footer">
            <button
              className="ws-send-btn glass-interactive"
              onClick={handleSend}
              disabled={!isConnected}
            >
              <Send size={12} />
              <span>Send Packet</span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        .websocket-workbench-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(10, 14, 24, 0.95);
          color: var(--text-primary);
          overflow: hidden;
          font-family: var(--font-ui);
        }

        .ws-connect-bar {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.35);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        .protocol-toggle-strip {
          display: flex;
          gap: 4px;
        }

        .proto-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 7px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          cursor: pointer;
        }

        .proto-btn.active {
          color: #FFF;
          background: rgba(10, 132, 255, 0.25);
          border-color: rgba(10, 132, 255, 0.45);
        }

        .ws-input-row {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .ws-input-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-xs);
          padding: 4px 8px;
        }

        .ws-status-indicator {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .ws-status-indicator.online { background: #30D158; box-shadow: 0 0 6px #30D158; }
        .ws-status-indicator.offline { background: #FF453A; }

        .ws-url-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #FFF;
          font-family: var(--font-mono);
          font-size: 11.5px;
        }

        .ws-connect-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          background: rgba(10, 132, 255, 0.2);
          border: 1px solid rgba(10, 132, 255, 0.4);
          color: #64D2FF;
          cursor: pointer;
          white-space: nowrap;
        }

        .ws-connect-btn.connected {
          background: rgba(255, 69, 58, 0.2);
          border-color: rgba(255, 69, 58, 0.4);
          color: #FF453A;
        }

        .ws-config-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 3px 10px;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .config-toggle-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 10px;
          cursor: pointer;
        }

        .ping-btn {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 9.5px;
          padding: 1px 6px;
          border-radius: 3px;
          background: rgba(48, 209, 88, 0.15);
          border: 1px solid rgba(48, 209, 88, 0.3);
          color: #30D158;
          cursor: pointer;
        }

        .ws-config-drawer {
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .config-field { display: flex; flex-direction: column; gap: 2px; }
        .cfg-label { font-size: 9.5px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
        .cfg-input {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #FFF;
          padding: 3px 6px;
          border-radius: 3px;
          font-family: var(--font-mono);
          font-size: 10.5px;
        }

        .cfg-checkbox-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .ws-messages-viewport {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ws-feed-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          font-weight: 800;
          color: var(--text-muted);
        }

        .ws-clear-btn {
          display: flex;
          align-items: center;
          gap: 3px;
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 9.5px;
          cursor: pointer;
        }

        .ws-clear-btn:hover { color: #FFF; }

        .ws-empty-feed {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 40px 20px;
          gap: 8px;
          color: var(--text-muted);
          font-size: 11px;
        }

        .ws-messages-list { display: flex; flex-direction: column; gap: 6px; }

        .ws-msg-card {
          padding: 6px 8px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.35);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .ws-msg-card.in { border-left: 3px solid #30D158; }
        .ws-msg-card.out { border-left: 3px solid #64D2FF; }
        .ws-msg-card.ping, .ws-msg-card.pong { border-left: 3px solid #FFD60A; }
        .ws-msg-card.sse { border-left: 3px solid #BF5AF2; }

        .msg-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 9px;
        }

        .dir-badge {
          display: flex;
          align-items: center;
          gap: 2px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 2px;
        }

        .dir-badge.in { background: rgba(48, 209, 88, 0.2); color: #30D158; }
        .dir-badge.out { background: rgba(10, 132, 255, 0.2); color: #64D2FF; }

        .msg-type-pill {
          font-size: 8px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.08);
          padding: 1px 4px;
          border-radius: 2px;
          color: var(--text-muted);
        }

        .event-name-pill {
          font-size: 8.5px;
          background: rgba(191, 90, 242, 0.2);
          color: #BF5AF2;
          padding: 1px 4px;
          border-radius: 2px;
        }

        .msg-size, .msg-time { color: var(--text-muted); font-family: var(--font-mono); }
        .msg-time { margin-left: auto; }

        .msg-payload {
          margin: 0;
          padding: 4px 6px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 3px;
          font-family: var(--font-mono);
          font-size: 10.5px;
          color: #E2E8F0;
          white-space: pre-wrap;
          word-break: break-all;
          max-height: 120px;
          overflow-y: auto;
        }

        .ws-composer-bar {
          padding: 8px 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex-shrink: 0;
        }

        .preset-forge-row {
          display: flex;
          align-items: center;
          gap: 4px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .forge-label { font-size: 9.5px; font-weight: 800; color: var(--text-muted); display: flex; align-items: center; gap: 3px; }

        .forge-chip {
          font-size: 9.5px;
          padding: 1px 6px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
          cursor: pointer;
          white-space: nowrap;
        }

        .forge-chip:hover { background: rgba(255, 255, 255, 0.09); color: #FFF; }

        .composer-textarea {
          width: 100%;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 6px;
          color: #FFF;
          font-family: var(--font-mono);
          font-size: 11px;
          outline: none;
          box-sizing: border-box;
          resize: none;
        }

        .composer-footer { display: flex; justify-content: flex-end; }

        .ws-send-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          background: rgba(10, 132, 255, 0.25);
          border: 1px solid rgba(10, 132, 255, 0.5);
          color: #64D2FF;
          cursor: pointer;
        }

        .ws-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>
    </div>
  )
}

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
import './WebSocketView.css'

export const WebSocketView: React.FC = () => {
  const [url, setUrl] = useState<string>('wss://echo.websocket.events')
  const [protocolType, setProtocolType] = useState<'websocket' | 'sse'>('websocket')
  const [authToken, setAuthToken] = useState<string>('')
  const [subprotocol, setSubprotocol] = useState<string>('')
  const [customHeadersJson, setCustomHeadersJson] = useState<string>('')
  const [headersError, setHeadersError] = useState<string | null>(null)
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

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleToggleConnect = async () => {
    if (isConnected) {
      socketService.disconnect()
      setHeartbeatActive(false)
    } else {
      let parsedHeaders: Record<string, string> | undefined
      if (customHeadersJson.trim()) {
        try {
          const obj = JSON.parse(customHeadersJson)
          if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
            parsedHeaders = Object.fromEntries(
              Object.entries(obj).map(([k, v]) => [String(k), String(v)])
            )
            setHeadersError(null)
          } else {
            setHeadersError('Headers must be a JSON object (e.g. {"X-Client": "ide"})')
            return
          }
        } catch (err: any) {
          setHeadersError(`Invalid Headers JSON: ${err?.message || 'parse error'}`)
          return
        }
      } else {
        setHeadersError(null)
      }

      await socketService.connect({
        url,
        protocolType,
        protocol: subprotocol.trim() || undefined,
        headers: parsedHeaders,
        authToken: authToken.trim() || undefined,
        heartbeatIntervalMs: heartbeatActive ? 5000 : 0,
      })
    }
  }

  const handleToggleHeartbeat = (checked: boolean) => {
    setHeartbeatActive(checked)
    if (isConnected && protocolType === 'websocket') {
      socketService.setHeartbeatInterval(checked ? 5000 : 0)
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
            disabled={isConnected}
            onClick={() => {
              setProtocolType('websocket')
              if (/^https?:\/\//i.test(url)) setUrl('wss://echo.websocket.events')
            }}
          >
            <Wifi size={11} />
            <span>WebSocket</span>
          </button>
          <button
            className={`proto-btn ${protocolType === 'sse' ? 'active' : ''}`}
            disabled={isConnected}
            onClick={() => {
              setProtocolType('sse')
              if (/^wss?:\/\//i.test(url)) setUrl('http://localhost:4040/events')
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
              placeholder={protocolType === 'websocket' ? 'wss://echo.websocket.events' : 'http://localhost:4040/events'}
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
              disabled={isConnected}
            />
          </div>
          {protocolType === 'websocket' && (
            <div className="config-field">
              <label className="cfg-label">Subprotocol (optional):</label>
              <input
                type="text"
                className="cfg-input"
                placeholder="graphql-transport-ws, json-rpc..."
                value={subprotocol}
                onChange={(e) => setSubprotocol(e.target.value)}
                disabled={isConnected}
              />
            </div>
          )}
          <div className="config-field">
            <label className="cfg-label">Custom Headers (JSON):</label>
            <textarea
              className="cfg-input"
              rows={2}
              placeholder='{"X-Client-Version": "6.0.0"}'
              value={customHeadersJson}
              onChange={(e) => {
                setCustomHeadersJson(e.target.value)
                setHeadersError(null)
              }}
              disabled={isConnected}
            />
            {headersError && (
              <span style={{ color: '#FF453A', fontSize: 10 }}>{headersError}</span>
            )}
          </div>
          {protocolType === 'websocket' && (
            <div className="config-field-row">
              <label className="cfg-checkbox-label">
                <input
                  type="checkbox"
                  checked={heartbeatActive}
                  onChange={(e) => handleToggleHeartbeat(e.target.checked)}
                />
                <span>Auto Heartbeat (5s Ping/Pong interval)</span>
              </label>
            </div>
          )}
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

    </div>
  )
}

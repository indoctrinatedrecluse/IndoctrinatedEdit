import React, { useState, useEffect, useRef } from 'react'
import {
  Wifi,
  WifiOff,
  Send,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'
import { socketService, SocketMessage } from '../../services/socketService'

export const WebSocketView: React.FC = () => {
  const [url, setUrl] = useState<string>('wss://echo.websocket.events')
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [messages, setMessages] = useState<SocketMessage[]>([])
  const [inputPayload, setInputPayload] = useState<string>('{\n  "action": "subscribe",\n  "channel": "telemetry",\n  "timestamp": 1789500000\n}')

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
    } else {
      await socketService.connect({ url })
    }
  }

  const handleSend = () => {
    if (!inputPayload.trim()) return
    socketService.send(inputPayload)
  }

  const handleClear = () => {
    socketService.clearMessages()
  }

  return (
    <div className="websocket-workbench-root">
      {/* Top Connection Bar */}
      <div className="ws-connect-bar glass-panel">
        <div className="ws-input-wrapper">
          <span className={`ws-status-indicator ${isConnected ? 'online' : 'offline'}`} />
          <input
            type="text"
            className="ws-url-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="wss://echo.websocket.events"
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

      {/* Message Stream Feed */}
      <div className="ws-messages-viewport">
        <div className="ws-feed-header">
          <span>LIVE MESSAGE STREAM ({messages.length})</span>
          <button className="ws-clear-btn" onClick={handleClear} title="Clear Messages">
            <Trash2 size={11} /> Clear
          </button>
        </div>

        <div className="ws-messages-list">
          {messages.map((m) => (
            <div key={m.id} className={`ws-msg-card glass-panel ${m.direction}`}>
              <div className="msg-meta">
                <span className={`dir-badge ${m.direction}`}>
                  {m.direction === 'in' ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                  <span>{m.direction === 'in' ? 'IN' : 'OUT'}</span>
                </span>
                <span className="msg-type">{m.type.toUpperCase()}</span>
                <span className="msg-size">{m.sizeBytes} B</span>
                <span className="msg-time">{m.timestamp}</span>
              </div>
              <pre className="msg-payload">{m.data}</pre>
            </div>
          ))}
          <div ref={messageEndRef} />
        </div>
      </div>

      {/* Payload Composer */}
      <div className="ws-composer-bar glass-panel">
        <div className="composer-header">
          <span>MESSAGE COMPOSER</span>
          <button
            className="sample-btn"
            onClick={() =>
              setInputPayload(
                JSON.stringify(
                  { event: 'ping', client: 'IndoctrinatedEdit', id: Math.random().toString(36).substr(2, 6) },
                  null,
                  2
                )
              )
            }
          >
            <Sparkles size={10} /> Sample Ping
          </button>
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
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.35);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        .ws-input-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-sm);
          padding: 4px 8px;
        }

        .ws-status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .ws-status-indicator.online { background: #30D158; box-shadow: 0 0 8px #30D158; }
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
          gap: 5px;
          padding: 5px 12px;
          font-size: 11px;
          font-weight: 700;
          color: #FFF;
          background: rgba(10, 132, 255, 0.25);
          border: 1px solid rgba(10, 132, 255, 0.45);
          border-radius: var(--radius-sm);
          cursor: pointer;
        }

        .ws-connect-btn.connected {
          background: rgba(255, 69, 58, 0.25);
          border-color: rgba(255, 69, 58, 0.45);
        }

        .ws-messages-viewport {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 10px 12px;
        }

        .ws-feed-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 800;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .ws-clear-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 10px;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .ws-clear-btn:hover { color: #FFF; }

        .ws-messages-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ws-msg-card {
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .ws-msg-card.in { border-left: 3px solid #30D158; }
        .ws-msg-card.out { border-left: 3px solid #0A84FF; }

        .msg-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 9.5px;
          color: var(--text-muted);
          margin-bottom: 3px;
        }

        .dir-badge {
          display: flex;
          align-items: center;
          gap: 2px;
          font-weight: 800;
        }

        .dir-badge.in { color: #30D158; }
        .dir-badge.out { color: #0A84FF; }

        .msg-payload {
          font-family: var(--font-mono);
          font-size: 11px;
          color: #E2E8F0;
          margin: 0;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .ws-composer-bar {
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.4);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .composer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 800;
          color: var(--text-muted);
        }

        .sample-btn {
          background: none;
          border: none;
          color: #64D2FF;
          font-size: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .composer-textarea {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-sm);
          padding: 6px 8px;
          color: #FFF;
          font-family: var(--font-mono);
          font-size: 11px;
          outline: none;
          resize: none;
        }

        .composer-footer {
          display: flex;
          justify-content: flex-end;
        }

        .ws-send-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 700;
          color: #FFF;
          background: rgba(48, 209, 88, 0.25);
          border: 1px solid rgba(48, 209, 88, 0.45);
          border-radius: var(--radius-sm);
          cursor: pointer;
        }

        .ws-send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}

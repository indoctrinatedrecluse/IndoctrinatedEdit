import React, { useState, useMemo } from 'react'
import {
  Database,
  Search,
  Plus,
  Terminal,
  Clock,
  Radio,
  Trash2,
  Send,
  Check,
  Copy,
} from 'lucide-react'
import {
  redisStudioService,
  RedisKeyEntry,
  RedisValueType,
  RedisCommandLog,
} from '../../services/redisStudioService'

export const RedisStudioView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'keys' | 'cli' | 'pubsub'>('keys')
  const [searchPattern, setSearchPattern] = useState<string>('*')
  const [selectedKey, setSelectedKey] = useState<RedisKeyEntry | null>(null)
  const [commandInput, setCommandInput] = useState<string>('GET cache:featured_products:v2')
  const [commandHistory, setCommandHistory] = useState<RedisCommandLog[]>([])
  const [pubSubMessage, setPubSubMessage] = useState<string>('')
  const [pubSubChannel, setPubSubChannel] = useState<string>('events:audit')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // New Key Modal
  const [showAddKey, setShowAddKey] = useState<boolean>(false)
  const [newKeyName, setNewKeyName] = useState<string>('app:config:theme')
  const [newKeyType, setNewKeyType] = useState<RedisValueType>('string')
  const [newKeyValue, setNewKeyValue] = useState<string>('dark_velvet')
  const [newKeyTtl, setNewKeyTtl] = useState<string>('-1')

  const keys = useMemo(() => {
    return redisStudioService.getKeys(searchPattern)
  }, [searchPattern, showAddKey, commandHistory])

  const pubSubMessages = useMemo(() => {
    return redisStudioService.getPubSubMessages()
  }, [pubSubMessage])

  const handleExecuteCli = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!commandInput.trim()) return
    const res = redisStudioService.executeCommand(commandInput)
    setCommandHistory((prev) => [res, ...prev.slice(0, 40)])
    setCommandInput('')
  }

  const handleSaveNewKey = () => {
    if (!newKeyName.trim()) return
    const ttl = parseInt(newKeyTtl, 10) || -1
    const entry = redisStudioService.setStringKey(newKeyName, newKeyValue, ttl)
    setSelectedKey(entry)
    setShowAddKey(false)
  }

  const handleDeleteKey = (key: string) => {
    redisStudioService.deleteKey(key)
    if (selectedKey?.key === key) {
      setSelectedKey(null)
    }
    setCommandHistory((prev) => [
      {
        id: `del_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        command: `DEL ${key}`,
        response: '(integer) 1',
        isError: false,
        durationMs: 1,
      },
      ...prev,
    ])
  }

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault()
    if (!pubSubMessage.trim()) return
    redisStudioService.publishMessage(pubSubChannel, pubSubMessage)
    setPubSubMessage('')
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1800)
  }

  return (
    <div className="redis-studio-root">
      {/* Sub-Nav Bar */}
      <div
        className="redis-nav-bar"
        onWheel={(e) => {
          e.currentTarget.scrollLeft += e.deltaY
        }}
      >
        <button
          className={`redis-tab-btn glass-interactive ${activeTab === 'keys' ? 'active' : ''}`}
          onClick={() => setActiveTab('keys')}
        >
          <Database size={12} />
          <span>Key Explorer</span>
        </button>

        <button
          className={`redis-tab-btn glass-interactive ${activeTab === 'cli' ? 'active' : ''}`}
          onClick={() => setActiveTab('cli')}
        >
          <Terminal size={12} />
          <span>Redis CLI REPL</span>
        </button>

        <button
          className={`redis-tab-btn glass-interactive ${activeTab === 'pubsub' ? 'active' : ''}`}
          onClick={() => setActiveTab('pubsub')}
        >
          <Radio size={12} />
          <span>Pub/Sub Monitor</span>
        </button>
      </div>

      {/* Main Tab Views */}
      {activeTab === 'keys' && (
        <div className="keys-tab-layout">
          {/* Top Search & Filter Strip */}
          <div className="keys-search-strip">
            <div className="search-box">
              <Search size={12} className="icon" />
              <input
                type="text"
                value={searchPattern}
                onChange={(e) => setSearchPattern(e.target.value)}
                placeholder="Key pattern (e.g. user:*, cache:*)..."
                className="search-input"
              />
            </div>
            <button
              className="add-key-btn glass-interactive"
              onClick={() => setShowAddKey(true)}
              title="Add New Redis Key"
            >
              <Plus size={13} />
            </button>
          </div>

          {/* Split Key List and Key Editor */}
          <div className="keys-grid">
            <div className="keys-list-col">
              {keys.length === 0 ? (
                <div className="empty-state">No keys matching pattern</div>
              ) : (
                keys.map((k) => {
                  const isSelected = selectedKey?.key === k.key
                  return (
                    <div
                      key={k.key}
                      className={`key-row glass-interactive ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedKey(k)}
                    >
                      <span className={`type-tag ${k.type}`}>{k.type.toUpperCase()}</span>
                      <span className="key-name-text" title={k.key}>
                        {k.key}
                      </span>
                    </div>
                  )
                })
              )}
            </div>

            <div className="key-detail-col">
              {selectedKey ? (
                <div className="key-inspector-card">
                  <div className="inspector-header">
                    <div className="title-area">
                      <div className="key-title">{selectedKey.key}</div>
                      <div className="ttl-sub">
                        <Clock size={11} />
                        <span>TTL: {selectedKey.ttl === -1 ? 'Infinite (-1)' : `${selectedKey.ttl}s`}</span>
                      </div>
                    </div>
                    <div className="header-actions">
                      <button
                        className="del-key-btn glass-interactive"
                        onClick={() => handleDeleteKey(selectedKey.key)}
                        title="Delete Key"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Value Inspector / JSON Editor */}
                  <div className="value-area">
                    <div className="value-header">
                      <span className="value-label">Value ({selectedKey.sizeBytes} bytes)</span>
                      <button
                        className="copy-val-btn glass-interactive"
                        onClick={() =>
                          copyToClipboard(
                            typeof selectedKey.value === 'object'
                              ? JSON.stringify(selectedKey.value, null, 2)
                              : String(selectedKey.value),
                            'val'
                          )
                        }
                      >
                        {copiedKey === 'val' ? <Check size={11} /> : <Copy size={11} />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <pre className="value-raw-box">
                      <code>
                        {typeof selectedKey.value === 'object'
                          ? JSON.stringify(selectedKey.value, null, 2)
                          : String(selectedKey.value)}
                      </code>
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="empty-state">Select a Redis key to inspect value, TTL, and structure</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Redis CLI REPL Tab */}
      {activeTab === 'cli' && (
        <div className="cli-tab-layout">
          <div className="cli-history-feed">
            {commandHistory.map((cmd) => (
              <div key={cmd.id} className="cli-entry">
                <div className="cli-cmd-line">
                  <span className="prompt">redis:6379&gt;</span>
                  <span className="cmd-text">{cmd.command}</span>
                  <span className="duration">({cmd.durationMs}ms)</span>
                </div>
                <pre className={`cli-response ${cmd.isError ? 'err' : 'ok'}`}>
                  <code>{cmd.response}</code>
                </pre>
              </div>
            ))}
          </div>

          <form onSubmit={handleExecuteCli} className="cli-input-form">
            <span className="prompt-label">&gt;</span>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Enter Redis command (e.g. GET key, KEYS *, INFO, PING)..."
              className="cli-input"
            />
            <button type="submit" className="cli-send-btn glass-interactive">
              <Send size={12} />
            </button>
          </form>
        </div>
      )}

      {/* Pub/Sub Stream Monitor Tab */}
      {activeTab === 'pubsub' && (
        <div className="pubsub-tab-layout">
          <div className="pubsub-feed">
            {pubSubMessages.map((msg) => (
              <div key={msg.id} className="pubsub-msg-card glass-panel">
                <div className="msg-top">
                  <span className="channel-badge">{msg.channel}</span>
                  <span className="time-badge">{msg.receivedAt}</span>
                </div>
                <div className="msg-payload">{msg.message}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handlePublish} className="pubsub-publish-form">
            <input
              type="text"
              value={pubSubChannel}
              onChange={(e) => setPubSubChannel(e.target.value)}
              placeholder="Channel..."
              className="channel-input"
            />
            <input
              type="text"
              value={pubSubMessage}
              onChange={(e) => setPubSubMessage(e.target.value)}
              placeholder="Publish message payload (JSON or text)..."
              className="payload-input"
            />
            <button type="submit" className="publish-btn glass-interactive">
              <Send size={12} />
            </button>
          </form>
        </div>
      )}

      {/* Add New Key Modal */}
      {showAddKey && (
        <div className="modal-backdrop">
          <div className="modal-card glass-panel">
            <div className="modal-head">Create Key in Redis</div>
            <div className="form-item">
              <label>Key Name</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="input-box"
              />
            </div>
            <div className="form-item">
              <label>Value Type</label>
              <select
                value={newKeyType}
                onChange={(e) => setNewKeyType(e.target.value as RedisValueType)}
                className="input-box select-box"
              >
                <option value="string">String</option>
                <option value="json">JSON Object</option>
                <option value="hash">Hash Map</option>
                <option value="list">List</option>
                <option value="set">Set</option>
              </select>
            </div>
            <div className="form-item">
              <label>Value Content</label>
              <textarea
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
                rows={3}
                className="input-box textarea-box"
              />
            </div>
            <div className="form-item">
              <label>TTL in Seconds (-1 for permanent)</label>
              <input
                type="number"
                value={newKeyTtl}
                onChange={(e) => setNewKeyTtl(e.target.value)}
                className="input-box"
              />
            </div>
            <div className="modal-btns">
              <button className="btn-cancel glass-interactive" onClick={() => setShowAddKey(false)}>
                Cancel
              </button>
              <button className="btn-save glass-interactive" onClick={handleSaveNewKey}>
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .redis-studio-root {
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

        .redis-nav-bar {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.25);
          overflow-x: auto;
          white-space: nowrap;
        }

        .redis-tab-btn {
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

        .redis-tab-btn.active {
          background: rgba(255, 69, 58, 0.15);
          border-color: rgba(255, 69, 58, 0.35);
          color: #FF453A;
          font-weight: 600;
        }

        .keys-tab-layout {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
        }

        .keys-search-strip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 5px;
          padding: 3px 8px;
          flex: 1;
        }

        .search-input {
          background: transparent;
          border: none;
          outline: none;
          color: #FFFFFF;
          font-size: 0.74rem;
          width: 100%;
          font-family: 'JetBrains Mono', monospace;
        }

        .add-key-btn {
          background: rgba(48, 209, 88, 0.15);
          border: 1px solid rgba(48, 209, 88, 0.3);
          color: #30D158;
          border-radius: 5px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .keys-grid {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .keys-list-col {
          width: 44%;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          overflow-y: auto;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .key-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 8px;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          cursor: pointer;
        }

        .key-row.selected {
          background: rgba(255, 69, 58, 0.15);
          border-color: rgba(255, 69, 58, 0.35);
        }

        .type-tag {
          font-size: 0.58rem;
          font-weight: 700;
          padding: 1px 3px;
          border-radius: 3px;
          font-family: 'JetBrains Mono', monospace;
        }

        .type-tag.string { background: rgba(10, 132, 255, 0.2); color: #64D2FF; }
        .type-tag.json { background: rgba(191, 90, 242, 0.2); color: #BF5AF2; }
        .type-tag.hash { background: rgba(255, 159, 10, 0.2); color: #FF9F0A; }
        .type-tag.list { background: rgba(48, 209, 88, 0.2); color: #30D158; }
        .type-tag.set, .type-tag.zset { background: rgba(255, 214, 10, 0.2); color: #FFD60A; }

        .key-name-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #FFFFFF;
        }

        .key-detail-col {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
        }

        .key-inspector-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .inspector-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 8px;
        }

        .key-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          font-weight: 600;
          color: #64D2FF;
          word-break: break-all;
        }

        .ttl-sub {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.6);
          margin-top: 2px;
        }

        .del-key-btn {
          background: rgba(255, 69, 58, 0.15);
          border: 1px solid rgba(255, 69, 58, 0.3);
          color: #FF453A;
          border-radius: 4px;
          padding: 4px;
          cursor: pointer;
        }

        .value-area {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .value-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .value-label {
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.5);
        }

        .copy-val-btn {
          background: transparent;
          border: none;
          color: rgba(235, 235, 245, 0.7);
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 0.68rem;
          cursor: pointer;
        }

        .value-raw-box {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          padding: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          color: #FFD60A;
          overflow-x: auto;
          max-height: 300px;
        }

        .cli-tab-layout {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
          background: #080B14;
        }

        .cli-history-feed {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column-reverse;
          gap: 8px;
        }

        .cli-entry {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .cli-cmd-line {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
        }

        .prompt { color: #30D158; font-weight: 600; }
        .cmd-text { color: #FFFFFF; }
        .duration { color: rgba(235, 235, 245, 0.4); font-size: 0.65rem; }

        .cli-response {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          margin: 0;
          padding: 3px 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.03);
        }

        .cli-response.ok { color: #64D2FF; }
        .cli-response.err { color: #FF453A; }

        .cli-input-form {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.3);
        }

        .prompt-label {
          color: #30D158;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
        }

        .cli-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #FFFFFF;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.74rem;
        }

        .cli-send-btn {
          background: rgba(48, 209, 88, 0.2);
          border: 1px solid rgba(48, 209, 88, 0.4);
          color: #30D158;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
        }

        .pubsub-tab-layout {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
        }

        .pubsub-feed {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .pubsub-msg-card {
          padding: 8px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
        }

        .msg-top {
          display: flex;
          justify-content: space-between;
          font-size: 0.65rem;
          margin-bottom: 4px;
        }

        .channel-badge {
          color: #FF9F0A;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 600;
        }

        .time-badge { color: rgba(235, 235, 245, 0.4); }

        .msg-payload {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          color: #FFFFFF;
          word-break: break-all;
        }

        .pubsub-publish-form {
          display: flex;
          gap: 6px;
          padding: 8px 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.2);
        }

        .channel-input {
          width: 30%;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 3px 6px;
          color: #FF9F0A;
          font-size: 0.7rem;
        }

        .payload-input {
          flex: 1;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 3px 6px;
          color: #FFFFFF;
          font-size: 0.7rem;
        }

        .publish-btn {
          background: rgba(255, 159, 10, 0.2);
          border: 1px solid rgba(255, 159, 10, 0.4);
          color: #FF9F0A;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
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

        .modal-head {
          font-weight: 600;
          color: #FFFFFF;
        }

        .form-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .form-item label {
          font-size: 0.65rem;
          color: rgba(235, 235, 245, 0.6);
        }

        .input-box {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 4px 6px;
          color: #FFFFFF;
          font-size: 0.72rem;
          font-family: 'JetBrains Mono', monospace;
        }

        .select-box {
          background: #141A2A;
        }

        .textarea-box {
          resize: vertical;
        }

        .modal-btns {
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
          background: rgba(255, 69, 58, 0.2);
          border: 1px solid rgba(255, 69, 58, 0.4);
          color: #FF453A;
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

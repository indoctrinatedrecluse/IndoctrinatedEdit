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
import './RedisStudioView.css'

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

    </div>
  )
}

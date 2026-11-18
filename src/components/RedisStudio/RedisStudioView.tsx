import React, { useState, useEffect, useCallback } from 'react'
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
  RefreshCw,
} from 'lucide-react'
import {
  redisStudioService,
  RedisKeyEntry,
  RedisValueType,
  RedisCommandLog,
  PubSubMessage,
} from '../../services/redisStudioService'
import './RedisStudioView.css'

export const RedisStudioView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'keys' | 'cli' | 'pubsub'>('keys')
  const [host, setHost] = useState('127.0.0.1')
  const [port, setPort] = useState(6379)
  const [password, setPassword] = useState('')
  const [dbIndex, setDbIndex] = useState(0)
  const [useTls, setUseTls] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [connStatus, setConnStatus] = useState<string>('Sandbox')

  const [searchPattern, setSearchPattern] = useState<string>('*')
  const [keys, setKeys] = useState<RedisKeyEntry[]>(() => redisStudioService.getKeys('*'))
  const [selectedKey, setSelectedKey] = useState<RedisKeyEntry | null>(null)
  const [commandInput, setCommandInput] = useState<string>('PING')
  const [commandHistory, setCommandHistory] = useState<RedisCommandLog[]>([])
  const [pubSubMessage, setPubSubMessage] = useState<string>('')
  const [pubSubChannel, setPubSubChannel] = useState<string>('events:audit')
  const [pubSubMessages, setPubSubMessages] = useState<PubSubMessage[]>(() => redisStudioService.getPubSubMessages())
  const [isSubscribedLive, setIsSubscribedLive] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // New Key Modal
  const [showAddKey, setShowAddKey] = useState<boolean>(false)
  const [newKeyName, setNewKeyName] = useState<string>('app:config:theme')
  const [newKeyType, setNewKeyType] = useState<RedisValueType>('string')
  const [newKeyValue, setNewKeyValue] = useState<string>('dark_velvet')
  const [newKeyTtl, setNewKeyTtl] = useState<string>('-1')

  const refreshKeys = useCallback(async (pattern = searchPattern) => {
    const list = await redisStudioService.scanKeysLive(pattern)
    setKeys(list)
  }, [searchPattern])

  useEffect(() => {
    void refreshKeys(searchPattern)
  }, [searchPattern, isLive, refreshKeys])

  useEffect(() => {
    const infra = typeof window !== 'undefined' ? (window as any).electronAPI?.infra : undefined
    if (!infra?.onRedisPubSubEvent) return
    const unsub = infra.onRedisPubSubEvent((ev: any) => {
      if (ev.id !== 'redis_studio_sub') return
      if (ev.type === 'message') {
        setPubSubMessages((prev) => [
          {
            id: `live_ps_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            channel: ev.channel,
            message: ev.payload,
            receivedAt: ev.timestamp || new Date().toLocaleTimeString(),
          },
          ...prev.slice(0, 100),
        ])
      } else if (ev.type === 'close' || ev.type === 'error') {
        setIsSubscribedLive(false)
      }
    })
    return () => {
      unsub()
      void infra.redisUnsubscribe?.('redis_studio_sub')
    }
  }, [])

  const handleToggleLiveConnection = async () => {
    if (isLive) {
      redisStudioService.disconnectLive()
      setIsLive(false)
      setConnStatus('Sandbox')
      setKeys(redisStudioService.getKeys(searchPattern))
      return
    }
    setConnStatus('Connecting...')
    const res = await redisStudioService.connectLive({ host, port, password, dbIndex, tls: useTls })
    if (res.ok) {
      setIsLive(true)
      setConnStatus(`LIVE (${res.latencyMs ?? 1}ms)`)
      await refreshKeys(searchPattern)
    } else {
      setIsLive(false)
      setConnStatus(`Error: ${res.error || 'Refused'}`)
    }
  }

  const handleExecuteCli = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!commandInput.trim()) return
    const res = await redisStudioService.executeLiveCommand(commandInput)
    setCommandHistory((prev) => [res, ...prev.slice(0, 40)])
    setCommandInput('')
    await refreshKeys(searchPattern)
  }

  const handleSaveNewKey = async () => {
    if (!newKeyName.trim()) return
    const ttl = parseInt(newKeyTtl, 10) || -1
    const entry = await redisStudioService.saveKeyTypedAsync(newKeyName, newKeyType, newKeyValue, ttl)
    setSelectedKey(entry)
    setShowAddKey(false)
    await refreshKeys(searchPattern)
  }

  const handleDeleteKey = async (key: string) => {
    await redisStudioService.deleteKeyAsync(key)
    if (selectedKey?.key === key) {
      setSelectedKey(null)
    }
    await refreshKeys(searchPattern)
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

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pubSubMessage.trim()) return
    await redisStudioService.publishLiveAsync(pubSubChannel, pubSubMessage)
    setPubSubMessages(redisStudioService.getPubSubMessages())
    setPubSubMessage('')
  }

  const handleToggleSubscribe = async () => {
    const infra = typeof window !== 'undefined' ? (window as any).electronAPI?.infra : undefined
    if (!infra?.redisSubscribe) return
    if (isSubscribedLive) {
      await infra.redisUnsubscribe('redis_studio_sub')
      setIsSubscribedLive(false)
      return
    }
    const res = await infra.redisSubscribe({
      id: 'redis_studio_sub',
      host,
      port,
      password: password || undefined,
      tls: useTls,
      channel: pubSubChannel,
    })
    if (res.ok) setIsSubscribedLive(true)
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1800)
  }

  return (
    <div className="redis-studio-root">
      {/* Live RESP2 Connection Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.22)', fontSize: 11 }}>
        <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="Host" style={{ width: 96, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0', fontSize: 11 }} />
        <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} style={{ width: 56, padding: '2px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0', fontSize: 11 }} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Auth" style={{ width: 64, padding: '2px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0', fontSize: 11 }} />
        <input type="number" min={0} max={15} value={dbIndex} onChange={(e) => setDbIndex(Number(e.target.value))} title="DB Index" style={{ width: 40, padding: '2px 4px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0', fontSize: 11 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#94A3B8' }}>
          <input type="checkbox" checked={useTls} onChange={(e) => setUseTls(e.target.checked)} /> TLS
        </label>
        <button className="add-key-btn glass-interactive" onClick={() => void handleToggleLiveConnection()} style={{ padding: '2px 8px', width: 'auto', fontSize: 11 }}>
          {isLive ? 'Disconnect' : 'Connect'}
        </button>
        <span style={{ fontSize: 10, color: isLive ? '#30D158' : '#94A3B8', marginLeft: 'auto' }}>{connStatus}</span>
      </div>

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
              onClick={() => void refreshKeys(searchPattern)}
              title="Refresh / SCAN Keys"
            >
              <RefreshCw size={12} />
            </button>
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
                  <span className="prompt">{host}:{port}&gt;</span>
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
            <button
              type="button"
              className="publish-btn glass-interactive"
              onClick={() => void handleToggleSubscribe()}
              title="Subscribe / Unsubscribe Live RESP2 Channel"
              style={{ padding: '0 8px', width: 'auto', fontSize: 11 }}
            >
              {isSubscribedLive ? 'Unsub' : 'Sub'}
            </button>
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

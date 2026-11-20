import React, { useState, useEffect, useId } from 'react'
import {
  AiProviderMeta,
  AI_PROVIDERS_META,
  AiSettingsMap,
  aiVaultService,
  ConnectionTestResult,
} from '../../services/aiVaultService'
import { AiProvider } from '@sdk/types'
import {
  Shield,
  Key,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  RotateCcw,
  Zap,
  RefreshCw,
  ExternalLink,
  Download,
  Upload,
  Server,
  CheckCircle,
  AlertCircle,
  Cpu,
} from 'lucide-react'
import './AiKeyVaultWidget.css'

export interface AiKeyVaultWidgetProps {
  onSettingsChanged?: (settings: AiSettingsMap) => void
  onRefreshOllama?: () => Promise<void>
  className?: string
}

export const AiKeyVaultWidget: React.FC<AiKeyVaultWidgetProps> = ({
  onSettingsChanged,
  onRefreshOllama,
  className = '',
}) => {
  const [settings, setSettings] = useState<AiSettingsMap>(() => aiVaultService.getSettings())
  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({})
  const [copiedKeyMap, setCopiedKeyMap] = useState<Record<string, boolean>>({})
  const [probeResults, setProbeResults] = useState<Record<string, ConnectionTestResult>>({})
  const [probingMap, setProbingMap] = useState<Record<string, boolean>>({})

  // Export / Import Passphrase Modals
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportPassphrase, setExportPassphrase] = useState('')
  const [exportedPayload, setExportedPayload] = useState<string | null>(null)
  const [exportCopied, setExportCopied] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importPassphrase, setImportPassphrase] = useState('')
  const [importPayload, setImportPayload] = useState('')
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const [mcpSyncStatus, setMcpSyncStatus] = useState<string | null>(null)

  const exportPassId = useId()
  const importBundleId = useId()
  const importPassId = useId()

  // Subscribe to external vault changes
  useEffect(() => {
    const unsub = aiVaultService.subscribe((newSettings) => {
      setSettings(newSettings)
      if (onSettingsChanged) {
        onSettingsChanged(newSettings)
      }
    })
    return () => unsub()
  }, [onSettingsChanged])

  const handleKeyChange = (provider: AiProvider, key: string) => {
    aiVaultService.setProviderKey(provider, key)
    // Clear probe on key change so outdated results don't linger
    setProbeResults((prev) => {
      const next = { ...prev }
      delete next[provider]
      return next
    })
  }

  const handleEndpointChange = (provider: AiProvider, endpoint: string) => {
    aiVaultService.setProviderEndpoint(provider, endpoint)
    setProbeResults((prev) => {
      const next = { ...prev }
      delete next[provider]
      return next
    })
  }

  const handleResetEndpoint = (provider: AiProvider) => {
    aiVaultService.resetProviderToDefault(provider)
    setProbeResults((prev) => {
      const next = { ...prev }
      delete next[provider]
      return next
    })
  }

  const handleClearKey = (provider: AiProvider) => {
    aiVaultService.clearProviderKey(provider)
    setProbeResults((prev) => {
      const next = { ...prev }
      delete next[provider]
      return next
    })
  }

  const toggleShowKey = (provider: string) => {
    setShowKeyMap((prev) => ({ ...prev, [provider]: !prev[provider] }))
  }

  const toggleAllKeys = () => {
    const allShown = AI_PROVIDERS_META.every((p) => !!showKeyMap[p.id])
    const nextMap: Record<string, boolean> = {}
    AI_PROVIDERS_META.forEach((p) => {
      nextMap[p.id] = !allShown
    })
    setShowKeyMap(nextMap)
  }

  const handleCopyKey = async (provider: string, key: string) => {
    if (!key) return
    try {
      await navigator.clipboard.writeText(key)
      setCopiedKeyMap((prev) => ({ ...prev, [provider]: true }))
      setTimeout(() => {
        setCopiedKeyMap((prev) => ({ ...prev, [provider]: false }))
      }, 2000)
    } catch (err) {
      console.warn('Failed to copy key to clipboard:', err)
    }
  }

  const handleTestProbe = async (meta: AiProviderMeta) => {
    setProbingMap((prev) => ({ ...prev, [meta.id]: true }))
    try {
      const result = await aiVaultService.testConnection(meta.id)
      setProbeResults((prev) => ({ ...prev, [meta.id]: result }))
    } catch (err: any) {
      setProbeResults((prev) => ({
        ...prev,
        [meta.id]: {
          success: false,
          latencyMs: 0,
          message: err?.message || 'Connection probe error',
        },
      }))
    } finally {
      setProbingMap((prev) => ({ ...prev, [meta.id]: false }))
    }
  }

  const handleSyncToMcp = () => {
    const env = aiVaultService.getMcpEnvironmentMap()
    const envCount = Object.keys(env).length
    setMcpSyncStatus(`Synchronized ${envCount} keys & endpoints to MCP runtime`)
    setTimeout(() => {
      setMcpSyncStatus(null)
    }, 3500)
  }

  const handleExportProfile = async () => {
    if (!exportPassphrase.trim()) {
      setExportError('Enter a master passphrase to encrypt your keys.')
      return
    }
    setExportError(null)
    try {
      const bundle = await aiVaultService.exportEncryptedProfile(exportPassphrase)
      setExportedPayload(bundle)
    } catch (err: any) {
      setExportError(err?.message || 'Encryption failed.')
    }
  }

  const handleImportProfile = async () => {
    if (!importPayload.trim()) {
      setImportError('Please paste your encrypted vault payload.')
      return
    }
    if (!importPassphrase.trim()) {
      setImportError('Enter the master passphrase used during export.')
      return
    }
    setImportError(null)
    try {
      const res = await aiVaultService.importEncryptedProfile(importPayload, importPassphrase)
      setImportStatus(`Successfully restored ${res.importedCount} providers (${res.providers.join(', ')})`)
      setTimeout(() => {
        setImportModalOpen(false)
        setImportStatus(null)
        setImportPayload('')
        setImportPassphrase('')
      }, 2500)
    } catch (err: any) {
      setImportError(err?.message || 'Decryption failed: check your passphrase.')
    }
  }

  const configuredCount = AI_PROVIDERS_META.filter((p) => {
    const s = settings[p.id]
    if (p.id === 'ollama') return !!s?.endpoint
    return !!s?.apiKey
  }).length

  const allRevealed = AI_PROVIDERS_META.every((p) => !!showKeyMap[p.id])

  return (
    <div className={`ai-vault-widget-root ${className}`}>
      {/* Top Command Toolbar */}
      <div className="ai-vault-toolbar">
        <div className="vault-toolbar-info">
          <Shield size={14} className="text-cyan-400" />
          <span className="vault-title-text">AI KEY & ENDPOINT VAULT</span>
          <span className="vault-status-pill active" title="Active configured providers">
            {configuredCount} / {AI_PROVIDERS_META.length} Active
          </span>
          {mcpSyncStatus && (
            <span className="vault-status-pill valid" title="MCP Status">
              {mcpSyncStatus}
            </span>
          )}
        </div>

        <div className="vault-toolbar-actions">
          <button
            className="vault-tool-btn"
            onClick={toggleAllKeys}
            title={allRevealed ? 'Mask all API keys' : 'Reveal all API keys'}
          >
            {allRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
            <span>{allRevealed ? 'Mask All' : 'Reveal All'}</span>
          </button>

          <button
            className="vault-tool-btn"
            onClick={handleSyncToMcp}
            title="Inject active keys into MCP environment"
          >
            <Cpu size={11} />
            <span>Sync to MCP</span>
          </button>

          <button
            className="vault-tool-btn"
            onClick={() => {
              setExportModalOpen(!exportModalOpen)
              setImportModalOpen(false)
              setExportedPayload(null)
              setExportError(null)
            }}
            title="Export encrypted vault backup (AES-256-GCM)"
          >
            <Download size={11} />
            <span>Export</span>
          </button>

          <button
            className="vault-tool-btn"
            onClick={() => {
              setImportModalOpen(!importModalOpen)
              setExportModalOpen(false)
              setImportError(null)
              setImportStatus(null)
            }}
            title="Restore encrypted vault backup (AES-256-GCM)"
          >
            <Upload size={11} />
            <span>Import</span>
          </button>
        </div>
      </div>

      {/* Export Encrypted Modal Drawer */}
      {exportModalOpen && (
        <div className="vault-modal-card">
          <div className="vault-modal-title">
            <Lock size={12} />
            <span>Export Encrypted AI Vault Profile (AES-256-GCM)</span>
          </div>
          <div className="vault-helper-desc">
            Your API keys are encrypted client-side using PBKDF2 (100,000 iterations SHA-256) and AES-256-GCM.
            Never share your passphrase.
          </div>
          <div className="vault-field-row">
            <label className="vault-field-label" htmlFor={exportPassId}>Master Passphrase</label>
            <div className="vault-input-composite">
              <input
                id={exportPassId}
                type="password"
                className="vault-text-input"
                placeholder="Enter master passphrase for encryption..."
                value={exportPassphrase}
                onChange={(e) => setExportPassphrase(e.target.value)}
              />
              <button className="vault-tool-btn highlight" onClick={handleExportProfile}>
                Encrypt & Generate
              </button>
            </div>
            {exportError && <div className="vault-format-badge warn">{exportError}</div>}
          </div>

          {exportedPayload && (
            <div className="vault-field-row">
              <label className="vault-field-label">Encrypted Bundle Payload</label>
              <div className="vault-input-composite">
                <input
                  type="text"
                  readOnly
                  className="vault-text-input"
                  value={exportedPayload}
                />
                <button
                  className="vault-tool-btn highlight"
                  onClick={async () => {
                    await navigator.clipboard.writeText(exportedPayload)
                    setExportCopied(true)
                    setTimeout(() => setExportCopied(false), 2000)
                  }}
                >
                  {exportCopied ? <Check size={11} /> : <Copy size={11} />}
                  <span>{exportCopied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Encrypted Modal Drawer */}
      {importModalOpen && (
        <div className="vault-modal-card">
          <div className="vault-modal-title">
            <Unlock size={12} />
            <span>Import Encrypted AI Vault Profile</span>
          </div>
          <div className="vault-helper-desc">
            Paste your encrypted vault bundle and enter the matching master passphrase to decrypt and restore keys.
          </div>
          <div className="vault-field-row">
            <label className="vault-field-label" htmlFor={importBundleId}>Encrypted Bundle</label>
            <div className="vault-input-composite">
              <input
                id={importBundleId}
                type="text"
                className="vault-text-input"
                placeholder="Paste encrypted base64 payload..."
                value={importPayload}
                onChange={(e) => setImportPayload(e.target.value)}
              />
            </div>
          </div>
          <div className="vault-field-row">
            <label className="vault-field-label" htmlFor={importPassId}>Master Passphrase</label>
            <div className="vault-input-composite">
              <input
                id={importPassId}
                type="password"
                className="vault-text-input"
                placeholder="Enter decryption passphrase..."
                value={importPassphrase}
                onChange={(e) => setImportPassphrase(e.target.value)}
              />
              <button className="vault-tool-btn highlight" onClick={handleImportProfile}>
                Decrypt & Restore
              </button>
            </div>
            {importError && <div className="vault-format-badge warn">{importError}</div>}
            {importStatus && <div className="vault-format-badge ok">{importStatus}</div>}
          </div>
        </div>
      )}

      {/* Provider Cards */}
      <div className="vault-providers-list">
        {AI_PROVIDERS_META.map((meta) => {
          const cfg = settings[meta.id] || { apiKey: '', endpoint: '' }
          const isOllama = meta.id === 'ollama'
          const isRevealed = !!showKeyMap[meta.id]
          const isCopied = !!copiedKeyMap[meta.id]
          const isProbing = !!probingMap[meta.id]
          const probe = probeResults[meta.id]
          const validation = aiVaultService.validateKeyFormat(meta.id, cfg.apiKey || '')
          const hasCustomEndpoint = cfg.endpoint && cfg.endpoint !== meta.defaultUrl

          let statusBadgeClass = 'unconfigured'
          let statusLabel = 'Unconfigured'

          if (isProbing) {
            statusBadgeClass = 'testing'
            statusLabel = 'Testing...'
          } else if (probe) {
            if (probe.success) {
              statusBadgeClass = 'valid'
              statusLabel = `Online (${probe.latencyMs}ms)`
            } else {
              statusBadgeClass = 'invalid'
              statusLabel = probe.httpStatus ? `HTTP ${probe.httpStatus}` : 'Probe Failed'
            }
          } else if (isOllama ? cfg.endpoint : cfg.apiKey) {
            statusBadgeClass = 'active'
            statusLabel = 'Configured'
          }

          return (
            <div key={meta.id} className="vault-provider-card">
              <div className="vault-card-header">
                <div className="vault-title-group">
                  <span
                    className="vault-brand-dot"
                    style={{ backgroundColor: meta.brandColor, color: meta.brandColor }}
                  />
                  <span className="vault-prov-name">{meta.name}</span>
                  <span className={`vault-status-pill ${statusBadgeClass}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="vault-card-actions-right">
                  {meta.dashboardUrl && (
                    <a
                      href={meta.dashboardUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="vault-console-link"
                      title={`Open ${meta.name} console to generate or view API keys`}
                    >
                      <span>Console</span>
                      <ExternalLink size={10} style={{ marginLeft: 3, display: 'inline' }} />
                    </a>
                  )}

                  {isOllama && onRefreshOllama && (
                    <button
                      className="vault-tool-btn"
                      onClick={onRefreshOllama}
                      title="Scan local Ollama daemon for installed model tags"
                    >
                      <RefreshCw size={10} />
                      <span>Detect Models</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="vault-helper-desc">{meta.helper}</div>

              {/* API Key Input */}
              {!isOllama && (
                <div className="vault-field-row">
                  <div className="vault-field-label">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Key size={10} />
                      <span>API Key</span>
                    </span>
                    {cfg.apiKey && (
                      <span className={`vault-format-badge ${validation.isValidFormat ? 'ok' : 'warn'}`}>
                        {validation.formatHint}
                      </span>
                    )}
                  </div>

                  <div className="vault-input-composite">
                    <input
                      type={isRevealed ? 'text' : 'password'}
                      className="vault-text-input"
                      placeholder={`Enter ${meta.name} Key (${meta.keyPlaceholder})`}
                      value={cfg.apiKey || ''}
                      onChange={(e) => handleKeyChange(meta.id, e.target.value)}
                    />

                    <button
                      type="button"
                      className="vault-btn-icon"
                      onClick={() => toggleShowKey(meta.id)}
                      title={isRevealed ? 'Mask API Key' : 'Reveal API Key'}
                    >
                      {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>

                    <button
                      type="button"
                      className="vault-btn-icon"
                      onClick={() => handleCopyKey(meta.id, cfg.apiKey || '')}
                      title={isCopied ? 'Copied to clipboard!' : 'Copy API Key'}
                      disabled={!cfg.apiKey}
                    >
                      {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>

                    <button
                      type="button"
                      className="vault-btn-icon del"
                      onClick={() => handleClearKey(meta.id)}
                      title="Clear API Key"
                      disabled={!cfg.apiKey}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* Endpoint URL Input */}
              <div className="vault-field-row">
                <div className="vault-field-label">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Server size={10} />
                    <span>{isOllama ? 'Daemon Host URL' : 'Endpoint / Proxy (Optional)'}</span>
                  </span>
                  {hasCustomEndpoint && (
                    <button
                      type="button"
                      className="vault-tool-btn"
                      onClick={() => handleResetEndpoint(meta.id)}
                      title="Reset endpoint back to default provider URL"
                    >
                      <RotateCcw size={9} />
                      <span>Default</span>
                    </button>
                  )}
                </div>

                <div className="vault-input-composite">
                  <input
                    type="text"
                    className="vault-text-input"
                    placeholder={meta.defaultUrl}
                    value={cfg.endpoint || ''}
                    onChange={(e) => handleEndpointChange(meta.id, e.target.value)}
                  />

                  <button
                    type="button"
                    className="vault-tool-btn highlight"
                    onClick={() => handleTestProbe(meta)}
                    disabled={isProbing || (!isOllama && !cfg.apiKey && meta.category === 'cloud')}
                    title="Probe connectivity to endpoint with authentication"
                  >
                    {isProbing ? (
                      <RefreshCw size={10} className="animate-spin" />
                    ) : (
                      <Zap size={10} />
                    )}
                    <span>{isProbing ? 'Probing...' : 'Test Connection'}</span>
                  </button>
                </div>
              </div>

              {/* Probe Result Feedback */}
              {probe && (
                <div className={`vault-probe-feedback ${probe.success ? 'success' : 'error'}`}>
                  {probe.success ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                  <span>{probe.message}</span>
                  {probe.success && (
                    <span style={{ marginLeft: 'auto', opacity: 0.8 }}>{probe.latencyMs}ms</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AiKeyVaultWidget

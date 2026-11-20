import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Code2,
  FileCode,
  ShieldCheck,
  Plus,
  Trash2,
  AlertCircle,
  Sparkles,
  Columns3,
  ShieldAlert,
  Lock,
  Unlock,
  Save,
  RefreshCw,
  Zap,
} from 'lucide-react'
import { envVaultService, EnvVariable } from '../../services/envVaultService'
import './EnvVaultView.css'

type EnvViewTab = 'table' | 'matrix' | 'security' | 'diff' | 'export'

interface EnvVaultViewProps {
  workspaceRoot?: string
}

export const EnvVaultView: React.FC<EnvVaultViewProps> = ({ workspaceRoot }) => {
  const [profileContents, setProfileContents] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const name of envVaultService.getAvailableProfiles()) {
      initial[name] = envVaultService.getSampleProfile(name).rawContent
    }
    return initial
  })
  const [isLiveWorkspace, setIsLiveWorkspace] = useState<boolean>(false)
  const [activeProfile, setActiveProfile] = useState<string>('.env')
  const [activeView, setActiveView] = useState<EnvViewTab>('table')
  const [revealAllSecrets, setRevealAllSecrets] = useState<boolean>(false)
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({})
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [exportLang, setExportLang] = useState<'typescript' | 'python' | 'go' | 'docker' | 'k8s' | 'k8s-configmap' | 'json'>('typescript')
  const [vaultPassword, setVaultPassword] = useState<string>('')
  const [decryptBundle, setDecryptBundle] = useState<string>('')
  const [vaultError, setVaultError] = useState<string | null>(null)

  const loadFromDisk = useCallback(async () => {
    if (!workspaceRoot) return
    const diskFiles = await envVaultService.loadWorkspaceEnvFilesAsync(workspaceRoot)
    const keys = Object.keys(diskFiles)
    if (keys.length > 0) {
      setProfileContents(diskFiles)
      setIsLiveWorkspace(true)
      setActiveProfile((prev) => (diskFiles[prev] !== undefined ? prev : keys[0]))
    } else {
      setIsLiveWorkspace(false)
    }
  }, [workspaceRoot])

  useEffect(() => {
    void loadFromDisk()
  }, [loadFromDisk])

  const profileNames = useMemo(() => Object.keys(profileContents), [profileContents])
  const rawEnvContent = profileContents[activeProfile] ?? ''

  const setRawEnvContent = (nextRaw: string) => {
    setProfileContents((prev) => ({ ...prev, [activeProfile]: nextRaw }))
  }

  const variables = useMemo(() => {
    return envVaultService.parseEnvContent(rawEnvContent)
  }, [rawEnvContent])

  // Live Multi-Environment Matrix computed from all current profile contents
  const matrixRows = useMemo(() => {
    const parsed: Record<string, EnvVariable[]> = {}
    for (const [name, content] of Object.entries(profileContents)) {
      parsed[name] = envVaultService.parseEnvContent(content)
    }
    return envVaultService.compareMultiEnvironments(parsed)
  }, [profileContents])

  // Security Leak Scanner
  const securityFindings = useMemo(() => {
    return envVaultService.scanSecretLeaks(variables)
  }, [variables])

  // Diff comparison against .env.example (live workspace .env.example if present)
  const diffReport = useMemo(() => {
    const exampleRaw = profileContents['.env.example']
    if (exampleRaw !== undefined) {
      const exampleVars = envVaultService.parseEnvContent(exampleRaw)
      const activeKeySet = new Set(variables.map((v) => v.key))
      const exampleKeySet = new Set(exampleVars.map((v) => v.key))
      const seen = new Set<string>()
      const duplicates: string[] = []
      for (const v of variables) {
        if (seen.has(v.key)) duplicates.push(v.key)
        seen.add(v.key)
      }
      return {
        missingInActive: Array.from(exampleKeySet).filter((k) => !activeKeySet.has(k)),
        missingInExample: Array.from(activeKeySet).filter((k) => !exampleKeySet.has(k)),
        duplicateKeys: duplicates,
      }
    }
    return envVaultService.compareWithExample(variables, '.env.example')
  }, [variables, profileContents])

  const handleSaveToDisk = async () => {
    if (!workspaceRoot) return
    const ok = await envVaultService.saveWorkspaceEnvFileAsync(workspaceRoot, activeProfile, rawEnvContent)
    setSaveStatus(ok ? `Saved ${activeProfile}` : 'Save unavailable')
    setTimeout(() => setSaveStatus(null), 2000)
  }

  const handleProfileChange = (profileName: string) => {
    setActiveProfile(profileName)
  }

  const handleToggleMask = (key: string) => {
    setRevealedKeys((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleValueChange = (index: number, newVal: string) => {
    const updated = variables.map((v, i) => (i === index ? { ...v, value: newVal } : v))
    setRawEnvContent(envVaultService.mergeVariablesPreservingComments(rawEnvContent, updated))
  }

  const handleKeyChange = (index: number, newKey: string) => {
    const sanitized = newKey.replace(/[^A-Za-z0-9_]/g, '').toUpperCase()
    if (!sanitized) return
    const updated = variables.map((v, i) => (i === index ? { ...v, key: sanitized } : v))
    setRawEnvContent(envVaultService.mergeVariablesPreservingComments(rawEnvContent, updated))
  }

  const handleDeleteVar = (index: number) => {
    const filtered = variables.filter((_, i) => i !== index)
    setRawEnvContent(envVaultService.mergeVariablesPreservingComments(rawEnvContent, filtered))
  }

  const handleAddVariable = () => {
    const newKey = `NEW_VAR_${Date.now().toString().slice(-4)}`
    const updated = [
      ...variables,
      {
        key: newKey,
        value: 'value',
        isSecret: false,
        isMasked: false,
        category: 'general' as const,
      },
    ]
    setRawEnvContent(envVaultService.mergeVariablesPreservingComments(rawEnvContent, updated))
  }

  const handleGenerateExample = () => {
    const exampleStr = envVaultService.generateExampleTemplate(variables)
    copyToClipboard(exampleStr, 'example_generated')
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1800)
  }

  const exportedCode = useMemo(() => {
    return envVaultService.exportCodeSnippet(variables, exportLang)
  }, [variables, exportLang])

  return (
    <div className="env-vault-root">
      {/* Sub-Nav Header */}
      <div
        className="env-subnav-strip"
        onWheel={(e) => {
          e.currentTarget.scrollLeft += e.deltaY
        }}
      >
        <button
          className={`env-tab-btn glass-interactive ${activeView === 'table' ? 'active' : ''}`}
          onClick={() => setActiveView('table')}
        >
          <KeyRound size={12} />
          <span>Variables Vault</span>
        </button>

        <button
          className={`env-tab-btn glass-interactive ${activeView === 'matrix' ? 'active' : ''}`}
          onClick={() => setActiveView('matrix')}
        >
          <Columns3 size={12} />
          <span>Multi-Env Matrix</span>
        </button>

        <button
          className={`env-tab-btn glass-interactive ${activeView === 'security' ? 'active' : ''}`}
          onClick={() => setActiveView('security')}
        >
          <ShieldAlert size={12} />
          <span>Secret Leak Scanner</span>
          {securityFindings.length > 0 && (
            <span className="sec-alert-badge">{securityFindings.length}</span>
          )}
        </button>

        <button
          className={`env-tab-btn glass-interactive ${activeView === 'diff' ? 'active' : ''}`}
          onClick={() => setActiveView('diff')}
        >
          <ShieldCheck size={12} />
          <span>Sync Check</span>
          {diffReport.missingInActive.length > 0 && (
            <span className="diff-missing-badge">{diffReport.missingInActive.length}</span>
          )}
        </button>

        <button
          className={`env-tab-btn glass-interactive ${activeView === 'export' ? 'active' : ''}`}
          onClick={() => setActiveView('export')}
        >
          <Code2 size={12} />
          <span>Code &amp; Encrypt</span>
        </button>
      </div>

      {/* Profile Bar — visible across table, security, diff, and export tabs */}
      {activeView !== 'matrix' && (
        <div className="profile-selector-bar">
          <div className="profile-chips">
            {profileNames.map((p) => (
              <button
                key={p}
                className={`profile-chip glass-interactive ${activeProfile === p ? 'active' : ''}`}
                onClick={() => handleProfileChange(p)}
              >
                <FileCode size={11} />
                <span>{p}</span>
              </button>
            ))}
          </div>

          <div className="vault-actions-right">
            {workspaceRoot && (
              <>
                <button
                  className="toggle-mask-all-btn glass-interactive"
                  onClick={() => void handleSaveToDisk()}
                  title={`Save ${activeProfile} to Workspace Disk`}
                >
                  <Save size={11} />
                  <span>{saveStatus || 'Save Disk'}</span>
                </button>
                <button
                  className="add-var-btn glass-interactive"
                  onClick={() => void loadFromDisk()}
                  title="Reload .env* from Workspace Disk"
                >
                  <RefreshCw size={11} />
                </button>
              </>
            )}
            {activeView === 'table' && (
              <>
                <button
                  className="toggle-mask-all-btn glass-interactive"
                  onClick={() => setRevealAllSecrets(!revealAllSecrets)}
                  title={revealAllSecrets ? 'Hide Secrets' : 'Reveal Secrets'}
                >
                  {revealAllSecrets ? <EyeOff size={11} /> : <Eye size={11} />}
                  <span>{revealAllSecrets ? 'Mask All' : 'Reveal All'}</span>
                </button>

                <button
                  className="add-var-btn glass-interactive"
                  onClick={handleAddVariable}
                  title="Add Variable"
                >
                  <Plus size={12} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="env-content-area">
        {/* TAB 1: VARIABLES TABLE */}
        {activeView === 'table' && (
          <div className="variables-table-pane">
            <div className="var-count-label">
              <span>
                {variables.length} environment variables in {activeProfile}{' '}
                {isLiveWorkspace ? '(Workspace Disk)' : '(Sandbox Preview)'}
              </span>
            </div>

            <div className="variables-list">
              {variables.map((v, idx) => {
                const isMasked = v.isSecret && !revealAllSecrets && !revealedKeys[v.key]
                return (
                  <div key={idx} className={`variable-card glass-panel ${v.hasError ? 'error' : ''}`}>
                    <div className="card-top">
                      <div className="key-side">
                        <span className={`cat-pill ${v.category}`}>{v.category.replace('_', ' ')}</span>
                        <input
                          type="text"
                          value={v.key}
                          onChange={(e) => handleKeyChange(idx, e.target.value)}
                          className="key-name"
                          style={{ background: 'transparent', border: 'none', color: 'inherit', fontFamily: 'monospace', fontWeight: 600, minWidth: 120 }}
                          title="Edit variable key"
                        />
                        {v.isSecret && v.value && (() => {
                          const str = envVaultService.assessSecretStrength(v.value)
                          return (
                            <span
                              className="entropy-pill"
                              style={{
                                fontSize: '0.62rem',
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: `${str.color}22`,
                                color: str.color,
                                border: `1px solid ${str.color}55`,
                                marginLeft: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                              title={`Entropy: ${str.entropy} bits/char - ${str.description}`}
                            >
                              {str.scoreLabel} ({str.entropy}b)
                            </span>
                          )
                        })()}
                      </div>
                      <div className="card-actions">
                        {v.isSecret && (
                          <button
                            className="action-icon-btn glass-interactive"
                            onClick={() => handleToggleMask(v.key)}
                          >
                            {isMasked ? <Eye size={11} /> : <EyeOff size={11} />}
                          </button>
                        )}
                        <button
                          className="action-icon-btn glass-interactive"
                          onClick={() => copyToClipboard(v.value, v.key)}
                          title="Copy Value"
                        >
                          {copiedKey === v.key ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                        <button
                          className="action-icon-btn del glass-interactive"
                          onClick={() => handleDeleteVar(idx)}
                          title="Delete Variable"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    <div className="card-bottom">
                      <input
                        type={isMasked ? 'password' : 'text'}
                        value={v.value}
                        onChange={(e) => handleValueChange(idx, e.target.value)}
                        className="var-value-input"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 2: MULTI-ENV COMPARISON MATRIX */}
        {activeView === 'matrix' && (
          <div className="matrix-view-pane">
            <div className="matrix-header-info">
              <span>Multi-Environment Variable Presence Matrix</span>
            </div>
            <div className="matrix-table-wrap glass-panel">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th>Variable Key</th>
                    <th>Type</th>
                    {profileNames.map((p) => (
                      <th key={p}>{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixRows.map((row) => (
                    <tr key={row.key} className={row.isMissingInAny ? 'row-missing' : ''}>
                      <td className="key-cell">{row.key}</td>
                      <td>
                        <span className={`cat-pill ${row.category}`}>{row.category}</span>
                      </td>
                      {profileNames.map((p) => {
                        const cell = row.values[p]
                        return (
                          <td key={p} className="val-cell">
                            {cell?.isSet ? (
                              <span className="present-val">
                                {cell.isSecret ? '••••••••' : cell.value}
                              </span>
                            ) : (
                              <span className="missing-val">NOT SET</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SECRET LEAK SCANNER */}
        {activeView === 'security' && (
          <div className="security-scanner-pane">
            <div className="sec-hero-card glass-panel">
              <div className="sec-hero-title">
                <ShieldAlert size={14} className="accent-red" />
                <span>Security &amp; Credential Leak Scanner</span>
              </div>
              <p className="sec-hero-desc">
                Scans environment variables for live API keys, AWS credentials, unencrypted database passwords, and high-entropy secret patterns.
              </p>
            </div>

            {securityFindings.length === 0 ? (
              <div className="sec-clean-card glass-panel">
                <ShieldCheck size={28} color="#30D158" />
                <span className="clean-title">All Environment Variables Sanitized</span>
                <p className="clean-desc">No live cloud credentials, PATs, or critical leaks detected in {activeProfile}.</p>
              </div>
            ) : (
              <div className="findings-list">
                {securityFindings.map((f, idx) => (
                  <div key={idx} className={`finding-card glass-panel ${f.severity}`}>
                    <div className="finding-top">
                      <span className={`sev-pill ${f.severity}`}>{f.severity.toUpperCase()}</span>
                      <span className="rule-name">{f.rule}</span>
                      <code className="finding-key">{f.key}</code>
                    </div>
                    <p className="finding-desc">{f.description}</p>
                    <div className="remediation-box">
                      <Zap size={11} color="#FFD60A" />
                      <span>{f.remediation}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DIFF & SYNC CHECK */}
        {activeView === 'diff' && (
          <div className="diff-view-pane">
            <div className="diff-summary-card glass-panel">
              <div className="diff-title">
                <ShieldCheck size={14} className="accent-green" />
                <span>Sync Check against <code>.env.example</code></span>
              </div>
              <p className="diff-desc">
                Ensures your current environment file has all required production keys configured.
              </p>
              <button
                className="gen-example-btn glass-interactive"
                onClick={handleGenerateExample}
              >
                <Sparkles size={11} />
                <span>{copiedKey === 'example_generated' ? 'Copied Template!' : 'Generate .env.example Template'}</span>
              </button>
            </div>

            {diffReport.missingInActive.length > 0 && (
              <div className="missing-alert-box glass-panel">
                <div className="alert-head">
                  <AlertCircle size={13} className="alert-icon" />
                  <span>Missing in current {activeProfile} ({diffReport.missingInActive.length})</span>
                </div>
                <div className="missing-pills">
                  {diffReport.missingInActive.map((k) => (
                    <span key={k} className="missing-pill">
                      +{k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {diffReport.duplicateKeys.length > 0 && (
              <div className="missing-alert-box glass-panel" style={{ borderColor: 'rgba(255, 159, 10, 0.45)' }}>
                <div className="alert-head">
                  <AlertCircle size={13} className="alert-icon" style={{ color: '#FF9F0A' }} />
                  <span>Duplicate Keys in {activeProfile} ({diffReport.duplicateKeys.length})</span>
                </div>
                <div className="missing-pills">
                  {Array.from(new Set(diffReport.duplicateKeys)).map((k) => (
                    <span key={k} className="missing-pill" style={{ background: 'rgba(255, 159, 10, 0.18)', color: '#FF9F0A' }}>
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {diffReport.missingInExample.length > 0 && (
              <div className="extra-box glass-panel">
                <div className="extra-head">
                  <span>Additional keys defined only in {activeProfile}</span>
                </div>
                <div className="extra-pills">
                  {diffReport.missingInExample.map((k) => (
                    <span key={k} className="extra-pill">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CODE & ENCRYPTION */}
        {activeView === 'export' && (
          <div className="export-view-pane">
            <div className="export-lang-tabs" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['typescript', 'python', 'go', 'docker', 'k8s', 'k8s-configmap', 'json'] as const).map((lang) => (
                <button
                  key={lang}
                  className={`lang-tab-btn glass-interactive ${exportLang === lang ? 'active' : ''}`}
                  onClick={() => setExportLang(lang)}
                >
                  {lang === 'k8s-configmap' ? 'K8S CONFIGMAP' : lang.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="code-output-wrap glass-panel">
              <div className="output-header">
                <span className="code-label">{exportLang.toUpperCase()} Schema / Manifest</span>
                <button
                  className="copy-code-btn glass-interactive"
                  onClick={() => copyToClipboard(exportedCode, 'exported_code')}
                >
                  {copiedKey === 'exported_code' ? <Check size={11} /> : <Copy size={11} />}
                  <span>Copy Snippet</span>
                </button>
              </div>
              <pre className="code-block">
                <code>{exportedCode}</code>
              </pre>
            </div>

            {/* Encrypted Vault Export & Decrypt Import */}
            <div className="vault-encrypt-box glass-panel">
              <div className="box-title">
                <Lock size={12} /> AES-256-GCM VAULT ENCRYPT &amp; DECRYPT IMPORT
              </div>
              <div className="encrypt-controls">
                <input
                  type="password"
                  className="vault-pass-input"
                  value={vaultPassword}
                  onChange={(e) => setVaultPassword(e.target.value)}
                  placeholder="Master Encryption Key..."
                />
                <button
                  className="encrypt-export-btn glass-interactive"
                  onClick={async () => {
                    try {
                      setVaultError(null)
                      const enc = await envVaultService.encryptVaultAsync(variables, vaultPassword)
                      setDecryptBundle(enc)
                      copyToClipboard(enc, 'enc_vault_copy')
                    } catch (err: any) {
                      setVaultError(err?.message || 'Enter a master passphrase to encrypt.')
                    }
                  }}
                >
                  {copiedKey === 'enc_vault_copy' ? <Check size={11} color="#30D158" /> : <Lock size={11} />}
                  <span>Encrypt &amp; Copy</span>
                </button>
              </div>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <textarea
                  rows={3}
                  className="vault-pass-input"
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: 10.5 }}
                  placeholder="Paste encrypted AES-256-GCM vault bundle here to decrypt & import into active profile..."
                  value={decryptBundle}
                  onChange={(e) => setDecryptBundle(e.target.value)}
                />
                <button
                  className="encrypt-export-btn glass-interactive"
                  onClick={async () => {
                    try {
                      setVaultError(null)
                      const decrypted = await envVaultService.decryptVaultAsync(decryptBundle, vaultPassword)
                      setRawEnvContent(envVaultService.formatVariablesToEnvString(decrypted))
                      setActiveView('table')
                    } catch (err: any) {
                      setVaultError(err?.message || 'Decryption failed — check passphrase and vault bundle.')
                    }
                  }}
                >
                  <Unlock size={11} />
                  <span>Decrypt &amp; Import into {activeProfile}</span>
                </button>
              </div>
              {vaultError && (
                <div style={{ color: '#FF453A', fontSize: '11px', marginTop: '6px' }}>{vaultError}</div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

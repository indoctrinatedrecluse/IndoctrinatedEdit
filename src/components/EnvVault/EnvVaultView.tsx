import React, { useState, useMemo } from 'react'
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
  Zap,
} from 'lucide-react'
import { envVaultService } from '../../services/envVaultService'

type EnvViewTab = 'table' | 'matrix' | 'security' | 'diff' | 'export'

export const EnvVaultView: React.FC = () => {
  const [activeProfile, setActiveProfile] = useState<string>('.env')
  const [activeView, setActiveView] = useState<EnvViewTab>('table')
  const [rawEnvContent, setRawEnvContent] = useState<string>(() => {
    return envVaultService.getSampleProfile('.env').rawContent
  })
  const [revealAllSecrets, setRevealAllSecrets] = useState<boolean>(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [exportLang, setExportLang] = useState<'typescript' | 'python' | 'go' | 'docker' | 'k8s'>('typescript')
  const [vaultPassword, setVaultPassword] = useState<string>('master_key_99')

  // Parse current variables from content
  const variables = useMemo(() => {
    return envVaultService.parseEnvContent(rawEnvContent)
  }, [rawEnvContent])

  // Multi-Environment Matrix
  const matrixRows = useMemo(() => {
    return envVaultService.compareMultiEnvironments()
  }, [])

  // Security Leak Scanner
  const securityFindings = useMemo(() => {
    return envVaultService.scanSecretLeaks(variables)
  }, [variables])

  // Diff comparison against .env.example
  const diffReport = useMemo(() => {
    return envVaultService.compareWithExample(variables, '.env.example')
  }, [variables])

  const handleProfileChange = (profileName: string) => {
    setActiveProfile(profileName)
    const profile = envVaultService.getSampleProfile(profileName)
    setRawEnvContent(profile.rawContent)
  }

  const handleToggleMask = (key: string) => {
    const updated = variables.map((v) => (v.key === key ? { ...v, isMasked: !v.isMasked } : v))
    setRawEnvContent(envVaultService.formatVariablesToEnvString(updated))
  }

  const handleValueChange = (key: string, newVal: string) => {
    const updated = variables.map((v) => (v.key === key ? { ...v, value: newVal } : v))
    setRawEnvContent(envVaultService.formatVariablesToEnvString(updated))
  }

  const handleDeleteVar = (key: string) => {
    const filtered = variables.filter((v) => v.key !== key)
    setRawEnvContent(envVaultService.formatVariablesToEnvString(filtered))
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
    setRawEnvContent(envVaultService.formatVariablesToEnvString(updated))
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
          <span>Code & Encrypt</span>
        </button>
      </div>

      {/* Profile Bar */}
      {activeView === 'table' && (
        <div className="profile-selector-bar">
          <div className="profile-chips">
            {envVaultService.getAvailableProfiles().map((p) => (
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
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="env-content-area">
        {/* TAB 1: VARIABLES TABLE */}
        {activeView === 'table' && (
          <div className="variables-table-pane">
            <div className="var-count-label">
              <span>{variables.length} environment variables in {activeProfile}</span>
            </div>

            <div className="variables-list">
              {variables.map((v) => {
                const isMasked = !revealAllSecrets && v.isSecret
                return (
                  <div key={v.key} className={`variable-card glass-panel ${v.hasError ? 'error' : ''}`}>
                    <div className="card-top">
                      <div className="key-side">
                        <span className={`cat-pill ${v.category}`}>{v.category.replace('_', ' ')}</span>
                        <span className="key-name">{v.key}</span>
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
                          onClick={() => handleDeleteVar(v.key)}
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
                        onChange={(e) => handleValueChange(v.key, e.target.value)}
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
                    {envVaultService.getAvailableProfiles().map((p) => (
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
                      {envVaultService.getAvailableProfiles().map((p) => {
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
                <span>Security & Credential Leak Scanner</span>
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
            <div className="export-lang-tabs">
              {(['typescript', 'python', 'go', 'docker', 'k8s'] as const).map((lang) => (
                <button
                  key={lang}
                  className={`lang-tab-btn glass-interactive ${exportLang === lang ? 'active' : ''}`}
                  onClick={() => setExportLang(lang)}
                >
                  {lang.toUpperCase()}
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

            {/* Encrypted Vault Export */}
            <div className="vault-encrypt-box glass-panel">
              <div className="box-title">
                <Lock size={12} /> ENCRYPTED VAULT BUNDLE EXPORT
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
                  onClick={() => {
                    const enc = envVaultService.exportEncryptedVault(variables, vaultPassword)
                    copyToClipboard(enc, 'enc_vault_copy')
                  }}
                >
                  {copiedKey === 'enc_vault_copy' ? <Check size={11} color="#30D158" /> : <Lock size={11} />}
                  <span>Copy Encrypted Vault</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .env-vault-root {
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

        .env-subnav-strip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.35);
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
        }

        .env-tab-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 10.5px;
          font-weight: 600;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid transparent;
          cursor: pointer;
          white-space: nowrap;
        }

        .env-tab-btn.active {
          color: #FFF;
          background: rgba(10, 132, 255, 0.22);
          border-color: rgba(10, 132, 255, 0.4);
          box-shadow: 0 0 8px rgba(10, 132, 255, 0.2);
        }

        .sec-alert-badge {
          background: #FF453A;
          color: #FFF;
          font-size: 8.5px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 3px;
        }

        .diff-missing-badge {
          background: #FF9F0A;
          color: #000;
          font-size: 8.5px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 3px;
        }

        .profile-selector-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(0, 0, 0, 0.18);
          flex-shrink: 0;
        }

        .profile-chips {
          display: flex;
          gap: 4px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .profile-chip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 7px;
          border-radius: 3px;
          font-size: 10px;
          font-family: var(--font-mono);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-muted);
          cursor: pointer;
        }

        .profile-chip.active {
          background: rgba(10, 132, 255, 0.2);
          border-color: rgba(10, 132, 255, 0.4);
          color: #64D2FF;
        }

        .vault-actions-right {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .toggle-mask-all-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 9.5px;
          padding: 2px 6px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
          cursor: pointer;
        }

        .add-var-btn {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
          background: rgba(48, 209, 88, 0.2);
          border: 1px solid rgba(48, 209, 88, 0.4);
          color: #30D158;
          cursor: pointer;
        }

        .env-content-area {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
        }

        .variables-table-pane, .matrix-view-pane, .security-scanner-pane, .diff-view-pane, .export-view-pane {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .var-count-label {
          font-size: 10px;
          color: var(--text-muted);
          margin-bottom: 2px;
        }

        .variables-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .variable-card {
          padding: 6px 8px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.07);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .key-side {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cat-pill {
          font-size: 8.5px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 1px 4px;
          border-radius: 2px;
        }

        .cat-pill.api_key { background: rgba(255, 69, 58, 0.2); color: #FF453A; }
        .cat-pill.database { background: rgba(191, 90, 242, 0.2); color: #BF5AF2; }
        .cat-pill.auth { background: rgba(255, 159, 10, 0.2); color: #FF9F0A; }
        .cat-pill.port { background: rgba(100, 210, 255, 0.2); color: #64D2FF; }
        .cat-pill.url { background: rgba(48, 209, 88, 0.2); color: #30D158; }
        .cat-pill.boolean { background: rgba(255, 214, 10, 0.2); color: #FFD60A; }
        .cat-pill.general { background: rgba(255, 255, 255, 0.1); color: #E2E8F0; }

        .key-name {
          font-family: var(--font-mono);
          font-weight: 700;
          font-size: 11px;
          color: #FFF;
        }

        .card-actions {
          display: flex;
          gap: 3px;
        }

        .action-icon-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 2px;
        }

        .action-icon-btn:hover { color: #FFF; }
        .action-icon-btn.del:hover { color: #FF453A; }

        .var-value-input, .vault-pass-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 3px;
          padding: 4px 6px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: #CBD5E1;
          outline: none;
          box-sizing: border-box;
        }

        .matrix-table-wrap {
          overflow-x: auto;
          padding: 8px;
        }

        .matrix-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10.5px;
        }

        .matrix-table th {
          text-align: left;
          padding: 4px 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-muted);
        }

        .matrix-table td {
          padding: 4px 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .row-missing { background: rgba(255, 159, 10, 0.06); }
        .key-cell { font-family: var(--font-mono); font-weight: 700; color: #FFF; }
        .present-val { font-family: var(--font-mono); color: #30D158; }
        .missing-val { font-size: 9px; font-weight: 700; color: #FF453A; background: rgba(255, 69, 58, 0.15); padding: 1px 4px; border-radius: 2px; }

        .sec-hero-card, .sec-clean-card, .finding-card, .diff-summary-card, .missing-alert-box, .extra-box, .code-output-wrap, .vault-encrypt-box {
          padding: 10px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .sec-hero-title, .diff-title, .box-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          font-size: 11px;
          color: #FFF;
          margin-bottom: 4px;
        }

        .accent-red { color: #FF453A; }
        .accent-green { color: #30D158; }

        .sec-hero-desc, .diff-desc {
          margin: 0;
          font-size: 10.5px;
          color: var(--text-secondary);
        }

        .sec-clean-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 24px;
          gap: 6px;
        }

        .clean-title { font-weight: 700; color: #FFF; font-size: 12px; }
        .clean-desc { font-size: 10.5px; color: var(--text-muted); margin: 0; }

        .findings-list { display: flex; flex-direction: column; gap: 6px; }

        .finding-card { display: flex; flex-direction: column; gap: 4px; }
        .finding-card.critical { border-left: 3px solid #FF453A; }
        .finding-card.high { border-left: 3px solid #FF9F0A; }
        .finding-card.medium { border-left: 3px solid #FFD60A; }

        .finding-top { display: flex; align-items: center; gap: 6px; font-size: 10.5px; }
        .sev-pill { font-size: 8px; font-weight: 800; padding: 1px 4px; border-radius: 2px; }
        .sev-pill.critical { background: rgba(255, 69, 58, 0.25); color: #FF453A; }
        .sev-pill.high { background: rgba(255, 159, 10, 0.25); color: #FF9F0A; }
        .sev-pill.medium { background: rgba(255, 214, 10, 0.25); color: #FFD60A; }

        .rule-name { font-weight: 700; color: #FFF; }
        .finding-key { font-family: var(--font-mono); color: #64D2FF; font-size: 10px; }
        .finding-desc { margin: 0; font-size: 10.5px; color: var(--text-secondary); }

        .remediation-box {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: #FFD60A;
          background: rgba(255, 214, 10, 0.08);
          padding: 3px 6px;
          border-radius: 3px;
        }

        .export-lang-tabs { display: flex; gap: 4px; }
        .lang-tab-btn {
          font-size: 9.5px;
          padding: 2px 7px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-muted);
          cursor: pointer;
        }

        .lang-tab-btn.active { background: rgba(10, 132, 255, 0.25); color: #64D2FF; }

        .output-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .code-label { font-size: 10px; font-weight: 700; color: var(--text-muted); }
        .copy-code-btn, .gen-example-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: #64D2FF;
          background: rgba(10, 132, 255, 0.15);
          border: 1px solid rgba(10, 132, 255, 0.3);
          border-radius: 3px;
          padding: 2px 6px;
          cursor: pointer;
        }

        .code-block {
          margin: 0;
          padding: 8px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 10.5px;
          color: #E2E8F0;
          overflow-x: auto;
        }

        .encrypt-controls { display: flex; gap: 6px; margin-top: 6px; }
        .encrypt-export-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 3px;
          background: rgba(191, 90, 242, 0.25);
          border: 1px solid rgba(191, 90, 242, 0.45);
          color: #BF5AF2;
          cursor: pointer;
          white-space: nowrap;
        }
      `}</style>
    </div>
  )
}

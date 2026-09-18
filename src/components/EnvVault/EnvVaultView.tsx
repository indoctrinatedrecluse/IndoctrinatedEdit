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
} from 'lucide-react'
import { envVaultService } from '../../services/envVaultService'

export const EnvVaultView: React.FC = () => {
  const [activeProfile, setActiveProfile] = useState<string>('.env')
  const [activeView, setActiveView] = useState<'table' | 'diff' | 'export'>('table')
  const [rawEnvContent, setRawEnvContent] = useState<string>(() => {
    return envVaultService.getSampleProfile('.env').rawContent
  })
  const [revealAllSecrets, setRevealAllSecrets] = useState<boolean>(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [exportLang, setExportLang] = useState<'typescript' | 'python' | 'go' | 'docker' | 'k8s'>('typescript')

  // Parse current variables from content
  const variables = useMemo(() => {
    return envVaultService.parseEnvContent(rawEnvContent)
  }, [rawEnvContent])

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
    // Keep raw content unchanged, update local rendering state
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
    const newKey = `NEW_VARIABLE_${Date.now().toString().slice(-4)}`
    const updated = [...variables, {
      key: newKey,
      value: 'value',
      isSecret: false,
      isMasked: false,
      category: 'general' as const,
    }]
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
          className={`env-tab-btn glass-interactive ${activeView === 'diff' ? 'active' : ''}`}
          onClick={() => setActiveView('diff')}
        >
          <ShieldCheck size={12} />
          <span>Sync & Diff Check</span>
          {diffReport.missingInActive.length > 0 && (
            <span className="diff-missing-badge">{diffReport.missingInActive.length}</span>
          )}
        </button>

        <button
          className={`env-tab-btn glass-interactive ${activeView === 'export' ? 'active' : ''}`}
          onClick={() => setActiveView('export')}
        >
          <Code2 size={12} />
          <span>Code Generator</span>
        </button>
      </div>

      {/* Profile Bar */}
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

        {activeView === 'table' && (
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
        )}
      </div>

      {/* Main Content Area */}
      <div className="env-content-area">
        {activeView === 'table' && (
          <div className="variables-table-pane">
            <div className="var-count-label">
              <span>{variables.length} environment variables loaded</span>
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

        {/* Diff & Missing Keys Checker */}
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

        {/* Code Generator */}
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
          background: rgba(0, 0, 0, 0.25);
          overflow-x: auto;
          white-space: nowrap;
        }

        .env-tab-btn {
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

        .env-tab-btn.active {
          background: rgba(48, 209, 88, 0.15);
          border-color: rgba(48, 209, 88, 0.35);
          color: #30D158;
          font-weight: 600;
        }

        .diff-missing-badge {
          background: #FF453A;
          color: #FFFFFF;
          border-radius: 10px;
          padding: 0 4px;
          font-size: 0.6rem;
          font-weight: 700;
        }

        .profile-selector-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(0, 0, 0, 0.15);
        }

        .profile-chips {
          display: flex;
          align-items: center;
          gap: 4px;
          overflow-x: auto;
        }

        .profile-chip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(235, 235, 245, 0.6);
          font-size: 0.68rem;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
        }

        .profile-chip.active {
          background: rgba(10, 132, 255, 0.2);
          border-color: rgba(10, 132, 255, 0.4);
          color: #64D2FF;
          font-weight: 600;
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
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(235, 235, 245, 0.7);
          font-size: 0.68rem;
          cursor: pointer;
        }

        .add-var-btn {
          background: rgba(48, 209, 88, 0.2);
          border: 1px solid rgba(48, 209, 88, 0.4);
          color: #30D158;
          border-radius: 4px;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .env-content-area {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
        }

        .variables-table-pane {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .var-count-label {
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.4);
        }

        .variables-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .variable-card {
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.02);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .key-side {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cat-pill {
          font-size: 0.58rem;
          text-transform: uppercase;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 3px;
        }

        .cat-pill.api_key { background: rgba(255, 69, 58, 0.2); color: #FF453A; }
        .cat-pill.database { background: rgba(48, 209, 88, 0.2); color: #30D158; }
        .cat-pill.port { background: rgba(10, 132, 255, 0.2); color: #64D2FF; }
        .cat-pill.url { background: rgba(255, 159, 10, 0.2); color: #FF9F0A; }
        .cat-pill.boolean { background: rgba(191, 90, 242, 0.2); color: #BF5AF2; }
        .cat-pill.general { background: rgba(255, 255, 255, 0.08); color: rgba(235, 235, 245, 0.6); }

        .key-name {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 600;
          color: #FFFFFF;
          font-size: 0.74rem;
        }

        .card-actions {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .action-icon-btn {
          background: transparent;
          border: none;
          color: rgba(235, 235, 245, 0.6);
          cursor: pointer;
          padding: 2px 4px;
        }

        .action-icon-btn.del:hover {
          color: #FF453A;
        }

        .var-value-input {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          padding: 3px 6px;
          color: #64D2FF;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          width: 100%;
          outline: none;
        }

        .diff-view-pane {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .diff-summary-card {
          padding: 10px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .diff-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          color: #FFFFFF;
        }

        .accent-green { color: #30D158; }

        .diff-desc {
          font-size: 0.7rem;
          color: rgba(235, 235, 245, 0.6);
          margin: 0;
        }

        .gen-example-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(48, 209, 88, 0.15);
          border: 1px solid rgba(48, 209, 88, 0.35);
          color: #30D158;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 0.7rem;
          font-weight: 600;
          cursor: pointer;
          align-self: flex-start;
        }

        .missing-alert-box {
          padding: 8px 10px;
          border-radius: 6px;
          background: rgba(255, 69, 58, 0.1);
          border: 1px solid rgba(255, 69, 58, 0.25);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .alert-head {
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 600;
          color: #FF453A;
          font-size: 0.72rem;
        }

        .missing-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .missing-pill {
          background: rgba(255, 69, 58, 0.2);
          border: 1px solid rgba(255, 69, 58, 0.4);
          color: #FF453A;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .extra-box {
          padding: 8px 10px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .extra-head {
          font-size: 0.7rem;
          color: rgba(235, 235, 245, 0.6);
        }

        .extra-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .extra-pill {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(235, 235, 245, 0.8);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .export-view-pane {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .export-lang-tabs {
          display: flex;
          gap: 4px;
        }

        .lang-tab-btn {
          padding: 3px 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(235, 235, 245, 0.6);
          font-size: 0.68rem;
          font-weight: 600;
          cursor: pointer;
        }

        .lang-tab-btn.active {
          background: rgba(10, 132, 255, 0.2);
          border-color: rgba(10, 132, 255, 0.4);
          color: #64D2FF;
        }

        .code-output-wrap {
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
        }

        .output-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .code-label {
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.5);
        }

        .copy-code-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: transparent;
          border: none;
          color: #64D2FF;
          font-size: 0.68rem;
          cursor: pointer;
        }

        .code-block {
          margin: 0;
          padding: 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          color: #FFD60A;
          overflow-x: auto;
          max-height: 360px;
        }
      `}</style>
    </div>
  )
}

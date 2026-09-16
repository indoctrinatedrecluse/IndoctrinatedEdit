import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Terminal, Save } from 'lucide-react'
import { terminalService } from '../../services/terminalService'
import { TerminalConfig, ShellProfile } from '../../../electron/preload'

interface TerminalConfigModalProps {
  isOpen: boolean
  onClose: () => void
}

export const TerminalConfigModal: React.FC<TerminalConfigModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<TerminalConfig>(terminalService.getConfig())
  const [profiles, setProfiles] = useState<ShellProfile[]>(terminalService.getProfiles())
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [activeMode, setActiveMode] = useState<'visual' | 'json'>('visual')

  useEffect(() => {
    if (isOpen) {
      const cfg = terminalService.getConfig()
      setConfig(cfg)
      setProfiles(terminalService.getProfiles())
      setJsonText(JSON.stringify(cfg, null, 2))
      setSavedSuccess(false)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSave = async () => {
    let finalConfig = config
    if (activeMode === 'json') {
      try {
        finalConfig = JSON.parse(jsonText)
      } catch (err) {
        alert('Invalid JSON syntax: ' + (err instanceof Error ? err.message : String(err)))
        return
      }
    }

    const success = await terminalService.saveConfig(finalConfig)
    if (success) {
      setConfig(terminalService.getConfig())
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2000)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-backdrop" onClick={onClose}>
          <motion.div
            className="terminal-config-modal glass-panel"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            {/* Header */}
            <div className="modal-header">
              <div className="modal-title-group">
                <Terminal size={16} className="modal-icon" />
                <span className="modal-title">TERMINAL CONFIGURATION</span>
                <span className="modal-file-badge">~/.indoctrinated/terminal.json</span>
              </div>
              <button className="close-btn glass-interactive" onClick={onClose} title="Close (Esc)">
                <X size={14} />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="config-mode-tabs">
              <button
                className={`mode-tab ${activeMode === 'visual' ? 'active' : ''}`}
                onClick={() => {
                  setActiveMode('visual')
                  setJsonText(JSON.stringify(config, null, 2))
                }}
              >
                Visual Settings
              </button>
              <button
                className={`mode-tab ${activeMode === 'json' ? 'active' : ''}`}
                onClick={() => {
                  setActiveMode('json')
                  setJsonText(JSON.stringify(config, null, 2))
                }}
              >
                Raw JSON Editor
              </button>
            </div>

            {/* Content Area */}
            <div className="config-body">
              {activeMode === 'visual' ? (
                <div className="visual-form">
                  {/* Default Shell Selection */}
                  <div className="form-group">
                    <label className="form-label">Default Shell Environment</label>
                    <select
                      className="form-select glass-interactive"
                      value={config.defaultShellId}
                      onChange={(e) => setConfig({ ...config, defaultShellId: e.target.value })}
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.path})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Font Size & Family */}
                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label className="form-label">Font Size (px)</label>
                      <input
                        type="number"
                        min="10"
                        max="24"
                        className="form-input glass-interactive"
                        value={config.fontSize}
                        onChange={(e) => setConfig({ ...config, fontSize: Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-group flex-1">
                      <label className="form-label">Cursor Style</label>
                      <select
                        className="form-select glass-interactive"
                        value={config.cursorStyle}
                        onChange={(e) =>
                          setConfig({ ...config, cursorStyle: e.target.value as 'block' | 'underline' | 'line' })
                        }
                      >
                        <option value="block">Block</option>
                        <option value="underline">Underline</option>
                        <option value="line">Line</option>
                      </select>
                    </div>
                  </div>

                  {/* Font Family */}
                  <div className="form-group">
                    <label className="form-label">Font Family</label>
                    <input
                      type="text"
                      className="form-input glass-interactive font-mono"
                      value={config.fontFamily}
                      onChange={(e) => setConfig({ ...config, fontFamily: e.target.value })}
                    />
                  </div>

                  {/* Scrollback buffer */}
                  <div className="form-group">
                    <label className="form-label">Scrollback History Buffer (Lines)</label>
                    <input
                      type="number"
                      min="500"
                      max="10000"
                      step="500"
                      className="form-input glass-interactive"
                      value={config.scrollback}
                      onChange={(e) => setConfig({ ...config, scrollback: Number(e.target.value) })}
                    />
                  </div>
                </div>
              ) : (
                <div className="json-editor-container">
                  <textarea
                    className="json-textarea glass-panel"
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    spellCheck={false}
                  />
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="modal-footer">
              <span className="config-hint">
                {savedSuccess ? '✅ Configuration saved successfully!' : 'Changes apply immediately to new sessions.'}
              </span>
              <div className="footer-btns">
                <button className="cancel-btn glass-interactive" onClick={onClose}>
                  Cancel
                </button>
                <button className="save-btn glass-interactive" onClick={handleSave}>
                  {savedSuccess ? <Check size={13} /> : <Save size={13} />}
                  <span>{savedSuccess ? 'Saved' : 'Save Config'}</span>
                </button>
              </div>
            </div>

            <style>{`
              .modal-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(4, 6, 12, 0.7);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2100;
                padding: 16px;
              }

              .terminal-config-modal {
                width: 100%;
                max-width: 540px;
                border-radius: var(--radius-lg);
                padding: 20px;
                border: var(--specular-border);
                box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8);
                display: flex;
                flex-direction: column;
                gap: 14px;
                background: rgba(12, 16, 26, 0.95);
              }

              .modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
              }

              .modal-title-group {
                display: flex;
                align-items: center;
                gap: 8px;
              }

              .modal-icon {
                color: var(--accent-primary);
              }

              .modal-title {
                font-size: 13px;
                font-weight: 800;
                letter-spacing: 0.5px;
                color: var(--text-primary);
              }

              .modal-file-badge {
                font-size: 10px;
                font-family: var(--font-mono);
                color: var(--accent-cyan);
                background: rgba(100, 210, 255, 0.1);
                border: 1px solid rgba(100, 210, 255, 0.2);
                padding: 1px 6px;
                border-radius: 4px;
              }

              .close-btn {
                width: 26px;
                height: 26px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: var(--text-secondary);
                cursor: pointer;
              }

              .config-mode-tabs {
                display: flex;
                gap: 6px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                padding-bottom: 8px;
              }

              .mode-tab {
                padding: 4px 12px;
                border-radius: var(--radius-sm);
                font-size: 11.5px;
                font-weight: 600;
                color: var(--text-muted);
                background: transparent;
                border: none;
                cursor: pointer;
                transition: all var(--transition-fast);
              }

              .mode-tab.active {
                background: rgba(255, 255, 255, 0.08);
                color: #FFF;
              }

              .config-body {
                display: flex;
                flex-direction: column;
                max-height: 380px;
                overflow-y: auto;
              }

              .visual-form {
                display: flex;
                flex-direction: column;
                gap: 12px;
              }

              .form-row {
                display: flex;
                gap: 12px;
              }

              .form-group {
                display: flex;
                flex-direction: column;
                gap: 6px;
              }

              .form-group.flex-1 {
                flex: 1;
              }

              .form-label {
                font-size: 11px;
                font-weight: 700;
                color: var(--text-secondary);
              }

              .form-select, .form-input {
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: var(--radius-sm);
                padding: 6px 10px;
                color: #FFF;
                font-size: 12px;
                outline: none;
              }

              .form-input.font-mono {
                font-family: var(--font-mono);
              }

              .form-select option {
                background: #0E121E;
                color: #FFF;
              }

              .json-editor-container {
                height: 260px;
              }

              .json-textarea {
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: var(--radius-sm);
                color: #64D2FF;
                font-family: var(--font-mono);
                font-size: 11.5px;
                padding: 10px;
                resize: none;
                outline: none;
              }

              .modal-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                padding-top: 12px;
              }

              .config-hint {
                font-size: 11px;
                color: var(--text-muted);
              }

              .footer-btns {
                display: flex;
                align-items: center;
                gap: 8px;
              }

              .cancel-btn {
                padding: 6px 14px;
                border-radius: var(--radius-sm);
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: var(--text-secondary);
                font-size: 12px;
                cursor: pointer;
              }

              .save-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 16px;
                border-radius: var(--radius-sm);
                background: linear-gradient(135deg, #0A84FF 0%, #0066CC 100%);
                border: 1px solid rgba(10, 132, 255, 0.5);
                color: #FFF;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
              }
            `}</style>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

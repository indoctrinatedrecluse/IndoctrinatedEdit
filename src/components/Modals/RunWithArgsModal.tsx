import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Terminal, Sliders } from 'lucide-react'
import { runService, RunProfile } from '../../services/runService'

interface RunWithArgsModalProps {
  isOpen: boolean
  onClose: () => void
  activeFilePath?: string
  activeLanguage?: string
  workspacePath?: string
  onExecute: (profile: RunProfile, customArgs: string, customEnv?: Record<string, string>) => void
  onOpenSettings?: () => void
}

export const RunWithArgsModal: React.FC<RunWithArgsModalProps> = ({
  isOpen,
  onClose,
  activeFilePath,
  activeLanguage,
  workspacePath,
  onExecute,
  onOpenSettings,
}) => {
  const [selectedProfile, setSelectedProfile] = useState<RunProfile | null>(null)
  const [profiles, setProfiles] = useState<RunProfile[]>([])
  const [args, setArgs] = useState('')
  const [previewCommand, setPreviewCommand] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      const all = runService.getProfiles()
      setProfiles(all)

      let target = all[0]
      if (activeLanguage) {
        const matching = runService.getProfileForLanguage(activeLanguage)
        if (matching) target = matching
      }
      setSelectedProfile(target || null)
      setArgs(target?.args?.join(' ') || '')

      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
    }
  }, [isOpen, activeLanguage])

  // Update preview
  useEffect(() => {
    if (selectedProfile) {
      const resolved = runService.resolveRunCommand(selectedProfile, {
        filePath: activeFilePath,
        workspacePath,
        customArgs: args,
      })
      setPreviewCommand(resolved.command)
    } else {
      setPreviewCommand('')
    }
  }, [selectedProfile, args, activeFilePath, workspacePath])

  // Key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleRun()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedProfile, args])

  const handleRun = () => {
    if (!selectedProfile) return
    onExecute(selectedProfile, args)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-backdrop" onClick={onClose}>
          <motion.div
            className="run-with-args-modal glass-panel"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
          >
            {/* Header */}
            <div className="modal-header">
              <div className="modal-title-group">
                <Play size={15} className="glow-play" />
                <span className="modal-title">RUN WITH ARGUMENTS</span>
              </div>
              <div className="header-actions">
                {onOpenSettings && (
                  <button
                    className="configure-btn glass-interactive"
                    onClick={() => {
                      onClose()
                      onOpenSettings()
                    }}
                    title="Configure Run Profiles"
                  >
                    <Sliders size={13} /> Config
                  </button>
                )}
                <button className="close-btn glass-interactive" onClick={onClose} title="Close (Esc)">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Content Form */}
            <div className="modal-body">
              <div className="target-file-badge">
                <span className="badge-label">TARGET:</span>
                <span className="badge-path">{activeFilePath || 'Current Active File'}</span>
              </div>

              {/* Profile Selector */}
              <div className="form-row">
                <label className="field-label">Runner Profile:</label>
                <select
                  className="profile-select"
                  value={selectedProfile?.id || ''}
                  onChange={(e) => {
                    const found = profiles.find((p) => p.id === e.target.value)
                    if (found) setSelectedProfile(found)
                  }}
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.language})
                    </option>
                  ))}
                </select>
              </div>

              {/* Arguments Input */}
              <div className="form-group">
                <label className="field-label">Additional CLI Arguments / Flags:</label>
                <div className="input-box-wrapper">
                  <Terminal size={14} className="input-icon" />
                  <input
                    ref={inputRef}
                    type="text"
                    className="args-input"
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                    placeholder="e.g. --port 8080 --verbose --debug arg1 arg2"
                  />
                </div>
              </div>

              {/* Command Preview */}
              <div className="preview-card">
                <div className="preview-label">Command Preview:</div>
                <code className="preview-code">{previewCommand || 'No command resolved'}</code>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button className="cancel-btn glass-interactive" onClick={onClose}>
                Cancel (Esc)
              </button>
              <button className="run-submit-btn" onClick={handleRun}>
                <Play size={13} fill="currentColor" /> Execute Run (Enter)
              </button>
            </div>
          </motion.div>

          <style>{`
            .modal-backdrop {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(4, 6, 14, 0.75);
              backdrop-filter: blur(10px);
              -webkit-backdrop-filter: blur(10px);
              display: flex;
              align-items: flex-start;
              justify-content: center;
              padding-top: 120px;
              z-index: 2000;
            }

            .run-with-args-modal {
              width: 560px;
              max-width: 92vw;
              background: rgba(14, 18, 28, 0.95);
              border: var(--specular-border);
              border-radius: var(--radius-md);
              box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.15);
              overflow: hidden;
            }

            .modal-header {
              height: 42px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0 14px;
              border-bottom: var(--specular-border-subtle);
              background: rgba(255, 255, 255, 0.02);
            }

            .modal-title-group {
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .glow-play {
              color: var(--accent-green, #30D158);
              filter: drop-shadow(0 0 6px rgba(48, 209, 88, 0.6));
            }

            .modal-title {
              font-size: 12px;
              font-weight: 700;
              letter-spacing: 0.6px;
              color: var(--text-primary);
            }

            .header-actions {
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .configure-btn {
              height: 24px;
              padding: 0 8px;
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 11px;
              font-weight: 500;
              color: var(--text-muted);
              background: rgba(255, 255, 255, 0.04);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: var(--radius-xs);
              cursor: pointer;
            }

            .modal-body {
              padding: 16px;
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            .target-file-badge {
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 6px 10px;
              border-radius: var(--radius-xs);
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.06);
              font-size: 11.5px;
            }

            .badge-label {
              font-weight: 700;
              font-size: 10px;
              color: var(--accent-cyan);
            }

            .badge-path {
              color: var(--text-secondary);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              font-family: var(--font-mono, monospace);
            }

            .form-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
            }

            .field-label {
              font-size: 11.5px;
              font-weight: 600;
              color: var(--text-secondary);
            }

            .profile-select {
              flex: 1;
              height: 30px;
              padding: 0 8px;
              border-radius: var(--radius-sm);
              border: 1px solid rgba(255, 255, 255, 0.1);
              background: rgba(0, 0, 0, 0.4);
              color: var(--text-primary);
              font-size: 12px;
              outline: none;
            }

            .form-group {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }

            .input-box-wrapper {
              position: relative;
              display: flex;
              align-items: center;
            }

            .input-icon {
              position: absolute;
              left: 10px;
              color: var(--text-muted);
            }

            .args-input {
              width: 100%;
              height: 36px;
              padding: 0 12px 0 32px;
              border-radius: var(--radius-sm);
              border: 1px solid rgba(10, 132, 255, 0.35);
              background: rgba(0, 0, 0, 0.45);
              color: #FFF;
              font-family: var(--font-mono, monospace);
              font-size: 12.5px;
              outline: none;
              box-shadow: 0 0 12px rgba(10, 132, 255, 0.15);
            }

            .args-input:focus {
              border-color: var(--accent-primary);
              box-shadow: 0 0 16px rgba(10, 132, 255, 0.3);
            }

            .preview-card {
              background: rgba(0, 0, 0, 0.3);
              border: 1px solid rgba(255, 255, 255, 0.06);
              border-radius: var(--radius-sm);
              padding: 8px 10px;
              display: flex;
              flex-direction: column;
              gap: 4px;
            }

            .preview-label {
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.5px;
              color: var(--text-muted);
            }

            .preview-code {
              font-family: var(--font-mono, monospace);
              font-size: 11.5px;
              color: var(--accent-cyan);
              word-break: break-all;
            }

            .modal-footer {
              height: 48px;
              padding: 0 14px;
              display: flex;
              align-items: center;
              justify-content: flex-end;
              gap: 8px;
              border-top: 1px solid rgba(255, 255, 255, 0.06);
              background: rgba(0, 0, 0, 0.2);
            }

            .cancel-btn {
              height: 30px;
              padding: 0 12px;
              font-size: 11.5px;
              color: var(--text-muted);
              background: transparent;
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: var(--radius-sm);
              cursor: pointer;
            }

            .run-submit-btn {
              height: 30px;
              padding: 0 14px;
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 12px;
              font-weight: 600;
              border-radius: var(--radius-sm);
              background: linear-gradient(135deg, #30D158 0%, #248A3D 100%);
              border: none;
              color: #FFF;
              cursor: pointer;
              box-shadow: 0 2px 10px rgba(48, 209, 88, 0.35);
              transition: all 0.15s ease;
            }

            .run-submit-btn:hover {
              filter: brightness(1.1);
              transform: translateY(-1px);
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  )
}

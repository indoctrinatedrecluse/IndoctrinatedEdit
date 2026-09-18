import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Play,
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  Check,
  Code2,
  Terminal,
  Sparkles,
  Layers,
  FileCode,
  Sliders,
  Cpu,
} from 'lucide-react'
import { runService, RunProfile } from '../../services/runService'
import { toolchainService } from '../../services/toolchainService'
import { DetectedToolchain } from '../../../packages/sdk/types'

interface RunConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onRunProfile?: (profile: RunProfile) => void
  activeLanguage?: string
}

export const RunConfigModal: React.FC<RunConfigModalProps> = ({
  isOpen,
  onClose,
  onRunProfile,
  activeLanguage,
}) => {
  const [profiles, setProfiles] = useState<RunProfile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual')
  const [jsonText, setJsonText] = useState('')
  const [detectedToolchains, setDetectedToolchains] = useState<DetectedToolchain[]>([])
  const [savedToast, setSavedToast] = useState(false)

  // Current editing state
  const [currentProfile, setCurrentProfile] = useState<RunProfile | null>(null)

  useEffect(() => {
    if (isOpen) {
      const all = runService.getProfiles()
      setProfiles(all)

      // Find best default selected profile
      let initial = all[0]
      if (activeLanguage) {
        const matching = runService.getProfileForLanguage(activeLanguage)
        if (matching) initial = matching
      }
      setSelectedProfileId(initial?.id || '')
      setCurrentProfile(initial ? { ...initial } : null)
      setJsonText(JSON.stringify(all, null, 2))

      // Discover detected toolchains
      toolchainService.detectAll().then((res) => {
        setDetectedToolchains(res)
      })
    }
  }, [isOpen, activeLanguage])

  // Key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSelectProfile = (id: string) => {
    setSelectedProfileId(id)
    const target = profiles.find((p) => p.id === id)
    if (target) {
      setCurrentProfile({ ...target })
    }
  }

  const handleUpdateField = <K extends keyof RunProfile>(field: K, value: RunProfile[K]) => {
    if (!currentProfile) return
    const updated = { ...currentProfile, [field]: value }
    setCurrentProfile(updated)

    // update in list
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  const handleSaveCurrent = () => {
    if (!currentProfile) return
    runService.saveProfile(currentProfile)
    setProfiles(runService.getProfiles())
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 2000)
  }

  const handleCreateNewProfile = () => {
    const newProfile: RunProfile = {
      id: `run.custom.${Date.now()}`,
      name: 'Custom Runner',
      language: activeLanguage || 'python',
      scope: 'file',
      commandTemplate: '${file}',
      interpreterPath: '',
      args: [],
      cwd: '${fileDirname}',
      isDefault: false,
    }
    runService.saveProfile(newProfile)
    const updated = runService.getProfiles()
    setProfiles(updated)
    setSelectedProfileId(newProfile.id)
    setCurrentProfile({ ...newProfile })
  }

  const handleDuplicateProfile = () => {
    if (!currentProfile) return
    const cloned: RunProfile = {
      ...currentProfile,
      id: `run.custom.${Date.now()}`,
      name: `${currentProfile.name} (Copy)`,
      isDefault: false,
    }
    runService.saveProfile(cloned)
    const updated = runService.getProfiles()
    setProfiles(updated)
    setSelectedProfileId(cloned.id)
    setCurrentProfile({ ...cloned })
  }

  const handleDeleteProfile = (id: string) => {
    runService.deleteProfile(id)
    const updated = runService.getProfiles()
    setProfiles(updated)
    if (selectedProfileId === id) {
      const next = updated[0] || null
      setSelectedProfileId(next?.id || '')
      setCurrentProfile(next ? { ...next } : null)
    }
  }

  const handleResetDefaults = () => {
    if (confirm('Reset all run profiles to factory defaults? Custom profiles will be removed.')) {
      runService.resetToDefaults()
      const updated = runService.getProfiles()
      setProfiles(updated)
      setSelectedProfileId(updated[0]?.id || '')
      setCurrentProfile(updated[0] ? { ...updated[0] } : null)
    }
  }

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonText)
      if (Array.isArray(parsed)) {
        for (const p of parsed) {
          if (p.id && p.name && p.commandTemplate) {
            runService.saveProfile(p)
          }
        }
        const updated = runService.getProfiles()
        setProfiles(updated)
        setSavedToast(true)
        setTimeout(() => setSavedToast(false), 2000)
      }
    } catch (e) {
      alert('Invalid JSON: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-backdrop" onClick={onClose}>
          <motion.div
            className="run-config-modal glass-panel"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-title-group">
                <Play size={16} className="modal-icon glow-play" />
                <span className="modal-title">RUN & BUILD CONFIGURATION STUDIO</span>
                <span className="modal-badge">VS Code Compatible</span>
              </div>

              <div className="header-actions">
                <div className="tab-pill-group">
                  <button
                    className={`pill-btn ${activeTab === 'visual' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('visual')
                      setJsonText(JSON.stringify(profiles, null, 2))
                    }}
                  >
                    <Sliders size={12} /> Visual
                  </button>
                  <button
                    className={`pill-btn ${activeTab === 'json' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('json')
                      setJsonText(JSON.stringify(profiles, null, 2))
                    }}
                  >
                    <Code2 size={12} /> launch.json
                  </button>
                </div>

                <button className="close-btn glass-interactive" onClick={onClose} title="Close (Esc)">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="modal-body-layout">
              {activeTab === 'visual' ? (
                <>
                  {/* Left Sidebar: Profile Selector */}
                  <div className="profiles-sidebar">
                    <div className="sidebar-header">
                      <span className="sidebar-title">CONFIGURED PROFILES</span>
                      <button
                        className="sidebar-add-btn glass-interactive"
                        onClick={handleCreateNewProfile}
                        title="Create New Run Profile"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <div className="profile-list-scroll">
                      {profiles.map((p) => {
                        const isSelected = p.id === selectedProfileId
                        return (
                          <div
                            key={p.id}
                            className={`profile-item glass-interactive ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSelectProfile(p.id)}
                          >
                            <div className="profile-icon-col">
                              {p.scope === 'project' ? <Layers size={13} /> : <FileCode size={13} />}
                            </div>
                            <div className="profile-meta-col">
                              <span className="profile-name">{p.name}</span>
                              <div className="profile-sub-badges">
                                <span className="lang-badge">{p.language}</span>
                                {p.isDefault && <span className="default-badge">DEFAULT</span>}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="sidebar-footer">
                      <button
                        className="reset-defaults-btn glass-interactive"
                        onClick={handleResetDefaults}
                        title="Reset all to defaults"
                      >
                        <RotateCcw size={12} /> Reset Defaults
                      </button>
                    </div>
                  </div>

                  {/* Right Form: Profile Editor */}
                  <div className="profile-editor-pane">
                    {currentProfile ? (
                      <div className="editor-form-scroll">
                        {/* Profile Top Bar */}
                        <div className="form-section-header">
                          <div>
                            <h3 className="section-heading">{currentProfile.name}</h3>
                            <p className="section-subheading">
                              Profile ID: <code>{currentProfile.id}</code>
                            </p>
                          </div>
                          <div className="form-top-actions">
                            <button
                              className="action-btn duplicate-btn glass-interactive"
                              onClick={handleDuplicateProfile}
                              title="Duplicate Profile"
                            >
                              <Copy size={13} /> Duplicate
                            </button>
                            <button
                              className="action-btn delete-btn glass-interactive"
                              onClick={() => handleDeleteProfile(currentProfile.id)}
                              title="Delete Profile"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                            {onRunProfile && (
                              <button
                                className="action-btn run-now-btn"
                                onClick={() => {
                                  handleSaveCurrent()
                                  onRunProfile(currentProfile)
                                  onClose()
                                }}
                              >
                                <Play size={13} fill="currentColor" /> Run Now
                              </button>
                            )}
                          </div>
                        </div>

                        {/* General Settings */}
                        <div className="form-grid">
                          <div className="form-group">
                            <label className="form-label">Profile Display Name</label>
                            <input
                              type="text"
                              className="form-input"
                              value={currentProfile.name}
                              onChange={(e) => handleUpdateField('name', e.target.value)}
                              placeholder="e.g. Python: Run Active File"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Target Language ID</label>
                            <input
                              type="text"
                              className="form-input"
                              value={currentProfile.language}
                              onChange={(e) => handleUpdateField('language', e.target.value)}
                              placeholder="e.g. python, typescript, cpp, rust, *"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Execution Scope</label>
                            <select
                              className="form-select"
                              value={currentProfile.scope}
                              onChange={(e) =>
                                handleUpdateField('scope', e.target.value as 'file' | 'project')
                              }
                            >
                              <option value="file">Active Editor File (${'{file}'})</option>
                              <option value="project">Project / Workspace Root</option>
                            </select>
                          </div>

                          <div className="form-group checkbox-group">
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={!!currentProfile.isDefault}
                                onChange={(e) => handleUpdateField('isDefault', e.target.checked)}
                              />
                              <span>Set as Default Runner for <code>{currentProfile.language}</code></span>
                            </label>
                          </div>
                        </div>

                        {/* Command & Interpreter Section */}
                        <div className="form-section-card">
                          <div className="card-title-row">
                            <Terminal size={14} className="card-icon" />
                            <span className="card-title">Execution Command & Toolchain</span>
                          </div>

                          <div className="form-group">
                            <label className="form-label">Command Line Template</label>
                            <input
                              type="text"
                              className="form-input mono-input"
                              value={currentProfile.commandTemplate}
                              onChange={(e) => handleUpdateField('commandTemplate', e.target.value)}
                              placeholder='e.g. python -u "${file}" ${args}'
                            />
                            <span className="form-help">
                              Available variables: <code>${'{file}'}</code>, <code>${'{fileBasename}'}</code>, <code>${'{fileBasenameNoExtension}'}</code>, <code>${'{fileDirname}'}</code>, <code>${'{workspaceFolder}'}</code>, <code>${'{args}'}</code>
                            </span>
                          </div>

                          <div className="form-group">
                            <div className="label-with-addon">
                              <label className="form-label">Interpreter / Compiler Binary Path</label>
                              {detectedToolchains.length > 0 && (
                                <span className="auto-detect-tag">
                                  <Cpu size={11} /> {detectedToolchains.filter((t) => t.found).length} toolchains detected
                                </span>
                              )}
                            </div>
                            <div className="input-with-button">
                              <input
                                type="text"
                                className="form-input mono-input"
                                value={currentProfile.interpreterPath || ''}
                                onChange={(e) => handleUpdateField('interpreterPath', e.target.value)}
                                placeholder="e.g. python, /usr/bin/python3, C:/Python312/python.exe, gcc, cargo"
                              />
                              {detectedToolchains.length > 0 && (
                                <select
                                  className="form-select toolchain-quick-pick"
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleUpdateField('interpreterPath', e.target.value)
                                    }
                                  }}
                                >
                                  <option value="">Quick Pick Toolchain...</option>
                                  {detectedToolchains
                                    .filter((t) => t.found)
                                    .map((t) => (
                                      <option key={t.id} value={t.path || t.name}>
                                        {t.name} ({t.version || 'installed'})
                                      </option>
                                    ))}
                                </select>
                              )}
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label">Working Directory (cwd)</label>
                            <input
                              type="text"
                              className="form-input mono-input"
                              value={currentProfile.cwd || ''}
                              onChange={(e) => handleUpdateField('cwd', e.target.value)}
                              placeholder="${fileDirname} or ${workspaceFolder}"
                            />
                          </div>
                        </div>

                        {/* Optional Build Tasks */}
                        <div className="form-section-card">
                          <div className="card-title-row">
                            <Sparkles size={14} className="card-icon" />
                            <span className="card-title">Pre-Launch Build Task (Optional)</span>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Pre-Launch Task Command</label>
                            <input
                              type="text"
                              className="form-input mono-input"
                              value={currentProfile.preLaunchTask || ''}
                              onChange={(e) => handleUpdateField('preLaunchTask', e.target.value)}
                              placeholder='e.g. g++ -c "${file}" or tsc or cargo build'
                            />
                            <span className="form-help">
                              Executed right before the main command in the same runner terminal.
                            </span>
                          </div>
                        </div>

                        {/* Save Button Bar */}
                        <div className="editor-footer-bar">
                          {savedToast && (
                            <div className="save-toast">
                              <Check size={13} /> Settings saved successfully!
                            </div>
                          )}
                          <button className="save-changes-btn" onClick={handleSaveCurrent}>
                            <Check size={14} /> Save Profile Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="empty-selection">
                        <Play size={32} />
                        <p>Select or create a run profile from the sidebar.</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* JSON Mode */
                <div className="json-editor-pane">
                  <div className="json-editor-header">
                    <span>Direct Configuration Editor (launch.json / run-profiles.json)</span>
                    <button className="apply-json-btn" onClick={handleApplyJson}>
                      <Check size={13} /> Apply & Save JSON
                    </button>
                  </div>
                  <textarea
                    className="json-textarea"
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    spellCheck={false}
                  />
                </div>
              )}
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
              backdrop-filter: blur(12px);
              -webkit-backdrop-filter: blur(12px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 2000;
              padding: 24px;
            }

            .run-config-modal {
              width: 920px;
              max-width: 95vw;
              height: 640px;
              max-height: 90vh;
              display: flex;
              flex-direction: column;
              background: rgba(14, 18, 28, 0.94);
              border: var(--specular-border);
              border-radius: var(--radius-lg);
              box-shadow: 0 24px 64px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.15);
              overflow: hidden;
            }

            .modal-header {
              height: 48px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0 16px;
              border-bottom: var(--specular-border-subtle);
              background: rgba(255, 255, 255, 0.02);
            }

            .modal-title-group {
              display: flex;
              align-items: center;
              gap: 9px;
            }

            .glow-play {
              color: var(--accent-green, #30D158);
              filter: drop-shadow(0 0 8px rgba(48, 209, 88, 0.5));
            }

            .modal-title {
              font-size: 13px;
              font-weight: 700;
              letter-spacing: 0.8px;
              color: var(--text-primary);
            }

            .modal-badge {
              font-size: 10px;
              font-weight: 600;
              padding: 2px 7px;
              border-radius: 999px;
              background: rgba(10, 132, 255, 0.16);
              color: var(--accent-cyan);
              border: 1px solid rgba(10, 132, 255, 0.3);
            }

            .header-actions {
              display: flex;
              align-items: center;
              gap: 12px;
            }

            .tab-pill-group {
              display: flex;
              background: rgba(0, 0, 0, 0.35);
              padding: 2px;
              border-radius: var(--radius-sm);
              border: 1px solid rgba(255, 255, 255, 0.08);
            }

            .pill-btn {
              height: 24px;
              padding: 0 10px;
              display: flex;
              align-items: center;
              gap: 5px;
              font-size: 11px;
              font-weight: 500;
              color: var(--text-muted);
              background: transparent;
              border: none;
              border-radius: var(--radius-xs);
              cursor: pointer;
              transition: all 0.15s ease;
            }

            .pill-btn.active {
              color: #FFF;
              background: rgba(255, 255, 255, 0.12);
              box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
            }

            .modal-body-layout {
              flex: 1;
              display: flex;
              overflow: hidden;
            }

            /* Sidebar */
            .profiles-sidebar {
              width: 260px;
              display: flex;
              flex-direction: column;
              border-right: var(--specular-border-subtle);
              background: rgba(0, 0, 0, 0.22);
            }

            .sidebar-header {
              height: 36px;
              padding: 0 12px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }

            .sidebar-title {
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.5px;
              color: var(--text-muted);
            }

            .sidebar-add-btn {
              width: 22px;
              height: 22px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: var(--radius-xs);
              border: 1px solid rgba(255, 255, 255, 0.1);
              background: rgba(255, 255, 255, 0.04);
              color: var(--text-primary);
              cursor: pointer;
            }

            .profile-list-scroll {
              flex: 1;
              overflow-y: auto;
              padding: 6px;
              display: flex;
              flex-direction: column;
              gap: 3px;
            }

            .profile-item {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 8px 10px;
              border-radius: var(--radius-sm);
              border: 1px solid transparent;
              cursor: pointer;
              transition: all 0.15s ease;
            }

            .profile-item:hover {
              background: rgba(255, 255, 255, 0.05);
            }

            .profile-item.selected {
              background: rgba(10, 132, 255, 0.15);
              border-color: rgba(10, 132, 255, 0.35);
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
            }

            .profile-icon-col {
              color: var(--accent-cyan);
            }

            .profile-meta-col {
              flex: 1;
              min-width: 0;
              display: flex;
              flex-direction: column;
              gap: 2px;
            }

            .profile-name {
              font-size: 12px;
              font-weight: 500;
              color: var(--text-primary);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .profile-sub-badges {
              display: flex;
              align-items: center;
              gap: 4px;
            }

            .lang-badge {
              font-size: 9.5px;
              padding: 1px 4px;
              border-radius: 3px;
              background: rgba(255, 255, 255, 0.06);
              color: var(--text-muted);
            }

            .default-badge {
              font-size: 8.5px;
              font-weight: 700;
              padding: 1px 4px;
              border-radius: 3px;
              background: rgba(48, 209, 88, 0.18);
              color: #30D158;
              border: 1px solid rgba(48, 209, 88, 0.3);
            }

            .sidebar-footer {
              padding: 8px;
              border-top: 1px solid rgba(255, 255, 255, 0.05);
            }

            .reset-defaults-btn {
              width: 100%;
              height: 26px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              font-size: 11px;
              color: var(--text-muted);
              background: transparent;
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: var(--radius-xs);
              cursor: pointer;
            }

            /* Editor Pane */
            .profile-editor-pane {
              flex: 1;
              display: flex;
              flex-direction: column;
              overflow: hidden;
            }

            .editor-form-scroll {
              flex: 1;
              overflow-y: auto;
              padding: 18px 24px;
              display: flex;
              flex-direction: column;
              gap: 16px;
            }

            .form-section-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding-bottom: 12px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.07);
            }

            .section-heading {
              font-size: 16px;
              font-weight: 600;
              color: #FFF;
              margin: 0;
            }

            .section-subheading {
              font-size: 11.5px;
              color: var(--text-muted);
              margin: 2px 0 0;
            }

            .form-top-actions {
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .action-btn {
              height: 28px;
              padding: 0 10px;
              display: flex;
              align-items: center;
              gap: 5px;
              font-size: 11.5px;
              font-weight: 500;
              border-radius: var(--radius-sm);
              cursor: pointer;
              transition: all 0.15s ease;
            }

            .duplicate-btn {
              background: rgba(255, 255, 255, 0.06);
              border: 1px solid rgba(255, 255, 255, 0.12);
              color: var(--text-secondary);
            }

            .delete-btn {
              background: rgba(255, 69, 58, 0.12);
              border: 1px solid rgba(255, 69, 58, 0.25);
              color: #FF453A;
            }

            .run-now-btn {
              background: linear-gradient(135deg, #30D158 0%, #248A3D 100%);
              border: none;
              color: #FFF;
              box-shadow: 0 2px 10px rgba(48, 209, 88, 0.35);
            }

            .form-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }

            .form-group {
              display: flex;
              flex-direction: column;
              gap: 5px;
            }

            .form-label {
              font-size: 11.5px;
              font-weight: 600;
              color: var(--text-secondary);
            }

            .form-input, .form-select {
              height: 32px;
              padding: 0 10px;
              border-radius: var(--radius-sm);
              border: 1px solid rgba(255, 255, 255, 0.1);
              background: rgba(0, 0, 0, 0.3);
              color: var(--text-primary);
              font-size: 12px;
              outline: none;
              transition: border-color 0.15s ease;
            }

            .form-input:focus, .form-select:focus {
              border-color: var(--accent-primary);
            }

            .mono-input {
              font-family: var(--font-mono, monospace);
              font-size: 11.5px;
            }

            .checkbox-group {
              grid-column: span 2;
              margin-top: 4px;
            }

            .checkbox-label {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 12px;
              color: var(--text-secondary);
              cursor: pointer;
            }

            .form-section-card {
              background: rgba(0, 0, 0, 0.25);
              border: 1px solid rgba(255, 255, 255, 0.06);
              border-radius: var(--radius-md);
              padding: 14px;
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            .card-title-row {
              display: flex;
              align-items: center;
              gap: 7px;
            }

            .card-icon {
              color: var(--accent-primary);
            }

            .card-title {
              font-size: 12px;
              font-weight: 700;
              color: var(--text-primary);
              letter-spacing: 0.3px;
            }

            .form-help {
              font-size: 10.5px;
              color: var(--text-muted);
            }

            .form-help code {
              background: rgba(255, 255, 255, 0.08);
              padding: 1px 4px;
              border-radius: 3px;
              color: var(--accent-cyan);
            }

            .label-with-addon {
              display: flex;
              align-items: center;
              justify-content: space-between;
            }

            .auto-detect-tag {
              font-size: 10.5px;
              color: #30D158;
              display: flex;
              align-items: center;
              gap: 4px;
            }

            .input-with-button {
              display: flex;
              gap: 8px;
            }

            .input-with-button .form-input {
              flex: 1;
            }

            .toolchain-quick-pick {
              width: 180px;
            }

            .editor-footer-bar {
              display: flex;
              align-items: center;
              justify-content: flex-end;
              gap: 12px;
              margin-top: 8px;
              padding-top: 12px;
              border-top: 1px solid rgba(255, 255, 255, 0.07);
            }

            .save-toast {
              font-size: 12px;
              color: #30D158;
              display: flex;
              align-items: center;
              gap: 5px;
            }

            .save-changes-btn {
              height: 32px;
              padding: 0 16px;
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 12px;
              font-weight: 600;
              border-radius: var(--radius-sm);
              background: var(--accent-primary);
              border: none;
              color: #FFF;
              cursor: pointer;
              box-shadow: 0 2px 10px rgba(10, 132, 255, 0.35);
            }

            /* JSON Editor */
            .json-editor-pane {
              flex: 1;
              display: flex;
              flex-direction: column;
              padding: 12px;
              gap: 10px;
            }

            .json-editor-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              font-size: 12px;
              color: var(--text-secondary);
            }

            .apply-json-btn {
              height: 26px;
              padding: 0 12px;
              display: flex;
              align-items: center;
              gap: 5px;
              font-size: 11.5px;
              border-radius: var(--radius-xs);
              background: var(--accent-primary);
              border: none;
              color: #FFF;
              cursor: pointer;
            }

            .json-textarea {
              flex: 1;
              background: rgba(0, 0, 0, 0.45);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: var(--radius-sm);
              padding: 12px;
              color: #FFF;
              font-family: var(--font-mono, monospace);
              font-size: 12px;
              line-height: 1.5;
              resize: none;
              outline: none;
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  )
}

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Sparkles,
  ArrowUpCircle,
  Download,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  HardDrive,
  Clock,
  Radio,
  Settings2,
  AlertCircle,
} from 'lucide-react'
import {
  rendererUpdateService,
  UpdateInfo,
  DownloadProgress,
  UpdateStatus,
  UpdateChannel,
  AutoCheckInterval,
} from '../../services/updateService'

interface UpdateModalProps {
  isOpen: boolean
  onClose: () => void
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [config, setConfig] = useState(rendererUpdateService.getConfig())
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const updateLocalState = () => {
      setStatus(rendererUpdateService.getStatus())
      setUpdateInfo(rendererUpdateService.getUpdateInfo())
      setProgress(rendererUpdateService.getDownloadProgress())
      setConfig(rendererUpdateService.getConfig())
    }

    updateLocalState()
    const unsubscribe = rendererUpdateService.subscribe(updateLocalState)
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (status === 'downloading') {
          // Confirm or allow closing modal in background
          onClose()
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, status, onClose])

  const handleCheckNow = () => {
    rendererUpdateService.checkForUpdates(true)
  }

  const handleDownload = () => {
    rendererUpdateService.downloadUpdate()
  }

  const handleInstall = () => {
    rendererUpdateService.installUpdate()
  }

  const handleCancelDownload = () => {
    rendererUpdateService.cancelDownload()
  }

  const handleChannelChange = (channel: UpdateChannel) => {
    rendererUpdateService.saveConfig({ channel })
    rendererUpdateService.checkForUpdates(true)
  }

  const handleIntervalChange = (interval: AutoCheckInterval) => {
    rendererUpdateService.saveConfig({ interval })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="update-modal-backdrop" onClick={onClose}>
          <motion.div
            className="update-modal-card glass-panel"
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="update-modal-header">
              <div className="update-header-left">
                <div className="update-icon-glow">
                  {status === 'downloaded' ? (
                    <CheckCircle2 size={22} className="text-emerald-400" />
                  ) : (
                    <ArrowUpCircle size={22} className="text-cyan-400" />
                  )}
                </div>
                <div>
                  <h3 className="update-modal-title">Software Update</h3>
                  <p className="update-modal-subtitle">
                    IndoctrinatedEdit Release & Package Manager
                  </p>
                </div>
              </div>

              <div className="update-header-actions">
                <button
                  className={`update-hdr-btn ${showSettings ? 'active' : ''}`}
                  onClick={() => setShowSettings(!showSettings)}
                  title="Update Preferences"
                >
                  <Settings2 size={16} />
                </button>
                <button className="update-hdr-btn close" onClick={onClose} title="Close (Esc)">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Quick Preferences Drawer */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  className="update-settings-drawer"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <div className="update-settings-grid">
                    <div className="setting-col">
                      <label className="setting-lbl">
                        <Radio size={13} /> Update Channel
                      </label>
                      <select
                        value={config.channel}
                        onChange={(e) => handleChannelChange(e.target.value as UpdateChannel)}
                        className="update-select"
                      >
                        <option value="stable">Stable (Recommended)</option>
                        <option value="beta">Beta (Early Features)</option>
                        <option value="nightly">Nightly (Cutting Edge)</option>
                      </select>
                    </div>

                    <div className="setting-col">
                      <label className="setting-lbl">
                        <Clock size={13} /> Auto-Check Frequency
                      </label>
                      <select
                        value={config.interval}
                        onChange={(e) => handleIntervalChange(e.target.value as AutoCheckInterval)}
                        className="update-select"
                      >
                        <option value="startup">On Every App Startup</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly (Default)</option>
                        <option value="manual">Manual Only</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Modal Body */}
            <div className="update-modal-body">
              {/* Checking State */}
              {status === 'checking' && (
                <div className="update-status-state">
                  <div className="update-spinner" />
                  <h4>Checking for updates...</h4>
                  <p>Querying GitHub Releases repository for latest packages</p>
                </div>
              )}

              {/* Up to date state */}
              {(status === 'upToDate' || (status === 'idle' && (!updateInfo || !updateInfo.updateAvailable))) && (
                <div className="update-status-state">
                  <div className="state-circle-icon success">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4>IndoctrinatedEdit is up to date</h4>
                  <div className="version-pill current">Version {updateInfo?.currentVersion || '4.5.0'} ({config.channel})</div>
                  <p className="state-desc">
                    You have the latest release with all the newest developer GUI studios and enhancements.
                  </p>
                  {config.lastCheckedTimestamp > 0 && (
                    <span className="last-checked-tag">
                      Last checked: {new Date(config.lastCheckedTimestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              )}

              {/* Update Available / Downloading / Ready State */}
              {(status === 'available' || status === 'downloading' || status === 'downloaded') && updateInfo && (
                <div className="update-release-view">
                  {/* Version Comparison Header */}
                  <div className="release-version-banner">
                    <div className="version-diff-group">
                      <span className="ver-badge current">v{updateInfo.currentVersion}</span>
                      <span className="ver-arrow">&rarr;</span>
                      <span className="ver-badge new">v{updateInfo.latestVersion}</span>
                      <span className="channel-badge">{updateInfo.channel}</span>
                    </div>

                    <div className="release-name-tag">{updateInfo.releaseName}</div>
                  </div>

                  {/* Matched Platform Asset Info */}
                  {updateInfo.matchedAsset && (
                    <div className="platform-asset-card">
                      <HardDrive size={16} className="text-cyan-400" />
                      <div className="asset-details">
                        <span className="asset-name">{updateInfo.matchedAsset.displayName}</span>
                        <span className="asset-meta">
                          {((updateInfo.matchedAsset.asset.size || 0) / (1024 * 1024)).toFixed(1)} MB &bull; {updateInfo.matchedAsset.asset.name}
                        </span>
                      </div>
                      <div className="asset-sha-badge">
                        <ShieldCheck size={13} /> SHA-256 Verified
                      </div>
                    </div>
                  )}

                  {/* Download Progress Bar */}
                  {status === 'downloading' && progress && (
                    <div className="download-progress-container">
                      <div className="progress-top-labels">
                        <span className="progress-pct">{progress.percentage}%</span>
                        <span className="progress-counters">
                          {progress.formattedDownloaded} / {progress.formattedTotal}
                        </span>
                        <span className="progress-speed">{progress.formattedSpeed}</span>
                      </div>

                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>

                      <div className="progress-bottom-labels">
                        <span>ETA: {progress.etaSeconds > 0 ? `${progress.etaSeconds}s remaining` : 'Calculating...'}</span>
                        <button className="btn-cancel-dl" onClick={handleCancelDownload}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Downloaded Ready Banner */}
                  {status === 'downloaded' && (
                    <div className="downloaded-ready-card">
                      <CheckCircle2 size={18} className="text-emerald-400" />
                      <div>
                        <strong>Update Ready to Install</strong>
                        <p>The package has been verified and staged. Restart IndoctrinatedEdit to apply.</p>
                      </div>
                    </div>
                  )}

                  {/* Release Notes Changelog Scrollbox */}
                  <div className="release-notes-box">
                    <div className="notes-header">
                      <Sparkles size={14} className="text-amber-400" /> What's New in v{updateInfo.latestVersion}
                    </div>
                    <div className="notes-content">
                      <pre>{updateInfo.releaseNotes}</pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Error State */}
              {status === 'error' && (
                <div className="update-status-state error">
                  <div className="state-circle-icon error">
                    <AlertCircle size={32} />
                  </div>
                  <h4>Update Check Failed</h4>
                  <p className="state-desc">
                    {updateInfo?.error || 'Unable to connect to GitHub release servers.'}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="update-modal-footer">
              <div className="footer-left">
                {updateInfo?.releaseUrl && (
                  <a
                    href={updateInfo.releaseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-github-link"
                    title="View Full Release on GitHub"
                  >
                    <ExternalLink size={13} /> View on GitHub
                  </a>
                )}
              </div>

              <div className="footer-right">
                {status === 'checking' && (
                  <button className="update-btn secondary" disabled>
                    Checking...
                  </button>
                )}

                {(status === 'upToDate' || (status === 'idle' && (!updateInfo || !updateInfo.updateAvailable)) || status === 'error') && (
                  <>
                    <button className="update-btn secondary" onClick={onClose}>
                      Close
                    </button>
                    <button className="update-btn primary" onClick={handleCheckNow}>
                      <RotateCcw size={14} /> Check Again
                    </button>
                  </>
                )}

                {status === 'available' && (
                  <>
                    <button className="update-btn secondary" onClick={onClose}>
                      Remind Later
                    </button>
                    <button className="update-btn primary highlight" onClick={handleDownload}>
                      <Download size={15} /> Download & Install
                    </button>
                  </>
                )}

                {status === 'downloading' && (
                  <button className="update-btn secondary" onClick={onClose}>
                    Download in Background
                  </button>
                )}

                {status === 'downloaded' && (
                  <>
                    <button className="update-btn secondary" onClick={onClose}>
                      Install on Exit
                    </button>
                    <button className="update-btn primary success" onClick={handleInstall}>
                      <RotateCcw size={15} /> Restart & Apply Update
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          <style>{`
            .update-modal-backdrop {
              position: fixed;
              inset: 0;
              z-index: 9999;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(4, 7, 14, 0.78);
              backdrop-filter: blur(14px);
              padding: 16px;
            }

            .update-modal-card {
              position: relative;
              width: 100%;
              max-width: 580px;
              max-height: 88vh;
              display: flex;
              flex-direction: column;
              background: rgba(13, 19, 33, 0.94);
              border: 1px solid rgba(255, 255, 255, 0.12);
              border-radius: 14px;
              box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65), 0 0 30px rgba(10, 132, 255, 0.15);
              overflow: hidden;
            }

            .update-modal-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 16px 20px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.08);
              background: rgba(255, 255, 255, 0.02);
            }

            .update-header-left {
              display: flex;
              align-items: center;
              gap: 12px;
            }

            .update-icon-glow {
              width: 38px;
              height: 38px;
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(10, 132, 255, 0.12);
              border: 1px solid rgba(10, 132, 255, 0.25);
            }

            .update-modal-title {
              font-size: 15px;
              font-weight: 600;
              color: #f3f4f6;
              margin: 0;
            }

            .update-modal-subtitle {
              font-size: 11px;
              color: #94a3b8;
              margin: 2px 0 0 0;
            }

            .update-header-actions {
              display: flex;
              align-items: center;
              gap: 6px;
            }

            .update-hdr-btn {
              width: 28px;
              height: 28px;
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: transparent;
              border: 1px solid transparent;
              color: #94a3b8;
              cursor: pointer;
              transition: all 0.15s;
            }

            .update-hdr-btn:hover {
              background: rgba(255, 255, 255, 0.08);
              color: #fff;
            }

            .update-hdr-btn.active {
              background: rgba(10, 132, 255, 0.2);
              color: #38bdf8;
              border-color: rgba(10, 132, 255, 0.4);
            }

            .update-settings-drawer {
              padding: 12px 20px;
              background: rgba(10, 14, 26, 0.85);
              border-bottom: 1px solid rgba(255, 255, 255, 0.08);
              overflow: hidden;
            }

            .update-settings-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }

            .setting-col {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }

            .setting-lbl {
              font-size: 11px;
              font-weight: 500;
              color: #94a3b8;
              display: flex;
              align-items: center;
              gap: 4px;
            }

            .update-select {
              background: rgba(20, 27, 45, 0.9);
              border: 1px solid rgba(255, 255, 255, 0.1);
              color: #e2e8f0;
              font-size: 11px;
              padding: 6px 8px;
              border-radius: 6px;
              outline: none;
            }

            .update-modal-body {
              padding: 20px;
              overflow-y: auto;
              max-height: calc(88vh - 140px);
              display: flex;
              flex-direction: column;
              gap: 16px;
            }

            .update-status-state {
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              padding: 24px 12px;
              gap: 8px;
            }

            .update-spinner {
              width: 32px;
              height: 32px;
              border: 3px solid rgba(10, 132, 255, 0.2);
              border-top-color: #38bdf8;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
              margin-bottom: 8px;
            }

            @keyframes spin {
              to { transform: rotate(360deg); }
            }

            .state-circle-icon {
              width: 54px;
              height: 54px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 6px;
            }

            .state-circle-icon.success {
              background: rgba(16, 185, 129, 0.12);
              border: 1px solid rgba(16, 185, 129, 0.3);
              color: #34d399;
            }

            .state-circle-icon.error {
              background: rgba(239, 68, 68, 0.12);
              border: 1px solid rgba(239, 68, 68, 0.3);
              color: #f87171;
            }

            .version-pill.current {
              background: rgba(255, 255, 255, 0.06);
              border: 1px solid rgba(255, 255, 255, 0.1);
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 11px;
              color: #cbd5e1;
              font-family: monospace;
            }

            .state-desc {
              font-size: 12px;
              color: #94a3b8;
              max-width: 360px;
              line-height: 1.5;
            }

            .last-checked-tag {
              font-size: 10px;
              color: #64748b;
              margin-top: 4px;
            }

            .release-version-banner {
              display: flex;
              flex-direction: column;
              gap: 6px;
              padding: 12px 14px;
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 10px;
            }

            .version-diff-group {
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .ver-badge {
              font-family: monospace;
              font-size: 12px;
              font-weight: 600;
              padding: 3px 8px;
              border-radius: 6px;
            }

            .ver-badge.current {
              background: rgba(148, 163, 184, 0.15);
              color: #94a3b8;
            }

            .ver-badge.new {
              background: rgba(56, 189, 248, 0.2);
              color: #38bdf8;
              border: 1px solid rgba(56, 189, 248, 0.4);
            }

            .ver-arrow {
              color: #64748b;
              font-weight: bold;
            }

            .channel-badge {
              font-size: 10px;
              text-transform: uppercase;
              padding: 2px 6px;
              border-radius: 4px;
              background: rgba(168, 85, 247, 0.15);
              color: #c084fc;
              border: 1px solid rgba(168, 85, 247, 0.3);
            }

            .release-name-tag {
              font-size: 13px;
              font-weight: 500;
              color: #e2e8f0;
            }

            .platform-asset-card {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 10px 14px;
              background: rgba(10, 132, 255, 0.06);
              border: 1px solid rgba(10, 132, 255, 0.2);
              border-radius: 8px;
            }

            .asset-details {
              flex: 1;
              display: flex;
              flex-direction: column;
            }

            .asset-name {
              font-size: 12px;
              font-weight: 500;
              color: #f1f5f9;
            }

            .asset-meta {
              font-size: 10px;
              color: #94a3b8;
            }

            .asset-sha-badge {
              font-size: 10px;
              color: #34d399;
              display: flex;
              align-items: center;
              gap: 4px;
              background: rgba(16, 185, 129, 0.1);
              padding: 3px 8px;
              border-radius: 12px;
              border: 1px solid rgba(16, 185, 129, 0.25);
            }

            .download-progress-container {
              display: flex;
              flex-direction: column;
              gap: 6px;
              padding: 12px 14px;
              background: rgba(15, 23, 42, 0.6);
              border: 1px solid rgba(56, 189, 248, 0.2);
              border-radius: 10px;
            }

            .progress-top-labels {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #cbd5e1;
            }

            .progress-pct {
              font-weight: 600;
              color: #38bdf8;
            }

            .progress-speed {
              color: #94a3b8;
              font-family: monospace;
            }

            .progress-track {
              height: 8px;
              width: 100%;
              background: rgba(255, 255, 255, 0.08);
              border-radius: 4px;
              overflow: hidden;
            }

            .progress-fill {
              height: 100%;
              background: linear-gradient(90deg, #0284c7, #38bdf8);
              border-radius: 4px;
              transition: width 0.25s ease-out;
            }

            .progress-bottom-labels {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 10px;
              color: #64748b;
            }

            .btn-cancel-dl {
              background: none;
              border: none;
              color: #f87171;
              cursor: pointer;
              font-size: 11px;
              padding: 0;
            }

            .btn-cancel-dl:hover {
              text-decoration: underline;
            }

            .downloaded-ready-card {
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 12px 14px;
              background: rgba(16, 185, 129, 0.1);
              border: 1px solid rgba(16, 185, 129, 0.3);
              border-radius: 10px;
              color: #e2e8f0;
              font-size: 12px;
            }

            .downloaded-ready-card p {
              font-size: 11px;
              color: #94a3b8;
              margin: 2px 0 0 0;
            }

            .release-notes-box {
              display: flex;
              flex-direction: column;
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 10px;
              background: rgba(6, 10, 20, 0.5);
              overflow: hidden;
            }

            .notes-header {
              padding: 8px 12px;
              font-size: 11px;
              font-weight: 600;
              color: #cbd5e1;
              background: rgba(255, 255, 255, 0.03);
              border-bottom: 1px solid rgba(255, 255, 255, 0.06);
              display: flex;
              align-items: center;
              gap: 6px;
            }

            .notes-content {
              padding: 12px;
              max-height: 180px;
              overflow-y: auto;
            }

            .notes-content pre {
              margin: 0;
              font-family: inherit;
              font-size: 11px;
              color: #94a3b8;
              white-space: pre-wrap;
              line-height: 1.6;
            }

            .update-modal-footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 14px 20px;
              border-top: 1px solid rgba(255, 255, 255, 0.08);
              background: rgba(255, 255, 255, 0.02);
            }

            .btn-github-link {
              display: flex;
              align-items: center;
              gap: 5px;
              font-size: 11px;
              color: #94a3b8;
              text-decoration: none;
              transition: color 0.15s;
            }

            .btn-github-link:hover {
              color: #38bdf8;
            }

            .footer-right {
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .update-btn {
              padding: 7px 14px;
              border-radius: 7px;
              font-size: 12px;
              font-weight: 500;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 6px;
              transition: all 0.15s;
              border: none;
            }

            .update-btn.secondary {
              background: rgba(255, 255, 255, 0.06);
              border: 1px solid rgba(255, 255, 255, 0.1);
              color: #cbd5e1;
            }

            .update-btn.secondary:hover {
              background: rgba(255, 255, 255, 0.1);
              color: #fff;
            }

            .update-btn.primary {
              background: #0284c7;
              color: #fff;
            }

            .update-btn.primary:hover {
              background: #0369a1;
            }

            .update-btn.primary.highlight {
              background: linear-gradient(135deg, #0284c7, #2563eb);
              box-shadow: 0 0 15px rgba(2, 132, 199, 0.4);
            }

            .update-btn.primary.success {
              background: linear-gradient(135deg, #059669, #10b981);
              box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  )
}

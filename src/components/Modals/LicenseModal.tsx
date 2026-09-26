import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Check,
  Copy,
  Mail,
  ShieldAlert,
  ShieldCheck,
  FileText,
  GitFork,
  KeyRound,
  Eye,
  EyeOff,
  Clock,
  Laptop,
  User,
  Lock,
  Trash2,
  Sparkles,
  AlertCircle,
  Loader2,
  Crown,
} from 'lucide-react'
import { AppIcon } from '../Brand/AppIcon'
import { licenseService } from '../../services/licenseService'
import { LicenseInfo } from '../../../electron/preload'

interface LicenseModalProps {
  isOpen: boolean
  onClose: () => void
  version?: string
  isForceLockout?: boolean
}

const AUTHOR_EMAIL = 'abmitra1999@gmail.com'
const COPYRIGHT_HOLDER = 'indoctrinatedrecluse (Abhishek Mitra)'

const FULL_LICENSE_TEXT = `INDOCTRINATED EDIT PROPRIETARY SOFTWARE LICENSE & PERMISSION AGREEMENT
Copyright (c) 2024-2026 indoctrinatedrecluse (Abhishek Mitra). All Rights Reserved.
Author Contact: abmitra1999@gmail.com

================================================================================
1. COPYRIGHT OWNERSHIP
================================================================================
All title, intellectual property rights, and copyrights in and to IndoctrinatedEdit
(including but not limited to source code, binary executables, architecture, visual
designs, Liquid Glass UI systems, icons, sound assets, extensions, and documentation)
belong exclusively to the author, indoctrinatedrecluse (Abhishek Mitra).

================================================================================
2. PERMITTED USE & COMPLIMENTARY DOWNLOAD
================================================================================
IndoctrinatedEdit is free to download, install, execute, and use for personal,
educational, and commercial software development purposes without any license fee
or recurring subscription charges.

================================================================================
3. MODIFICATION, FORKING, AND REDISTRIBUTION RESTRICTIONS
================================================================================
Forking the repository, modifying the underlying code, extending subsystems, and
redistributing builds are warmly encouraged, subject to the following STRICT condition:

  * MANDATORY PRIOR PERMISSION: You MUST contact the author first at
    abmitra1999@gmail.com and obtain prior written authorization before forking,
    modifying, redistributing, mirroring, packaging, or creating derivative works
    from this software or its codebase.

================================================================================
4. LEGAL ACTION & ENFORCEMENT NOTICE
================================================================================
Any unauthorized modification, forking, commercial redistribution, sublicensing,
or proprietary re-branding without prior written permission from the author constitutes
willful copyright infringement under applicable national and international intellectual
property conventions and will result in swift legal action and DMCA enforcement.

================================================================================
5. DISCLAIMER OF WARRANTY
================================================================================
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHOR BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH
THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`

export const LicenseModal: React.FC<LicenseModalProps> = ({
  isOpen,
  onClose,
  version = '5.0.0',
  isForceLockout = false,
}) => {
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isEnterLicenseOpen, setIsEnterLicenseOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  // Activation form fields
  const [keyInput, setKeyInput] = useState('')
  const [userInput, setUserInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [isActivating, setIsActivating] = useState(false)
  const [activationError, setActivationError] = useState<string | null>(null)
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null)

  // Copy feedback states
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedHwid, setCopiedHwid] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedLicense, setCopiedLicense] = useState(false)
  const [showFullText, setShowFullText] = useState(false)

  const isLockedOut = Boolean(
    isForceLockout ||
    (licenseInfo && licenseInfo.type !== 'ADM' && (
      licenseInfo.status === 'expired' ||
      !licenseInfo.isValid ||
      (licenseInfo.isTrial && (licenseInfo.trialDaysRemaining ?? 0) <= 0)
    ))
  )

  // Auto-open enter license form if locked out
  useEffect(() => {
    if (isLockedOut) {
      setIsEnterLicenseOpen(true)
    }
  }, [isLockedOut])

  // Load license info on modal open and subscribe to changes
  useEffect(() => {
    if (!isOpen) {
      setIsEnterLicenseOpen(false)
      setConfirmRemove(false)
      setActivationError(null)
      setActivationSuccess(null)
      return
    }

    const load = async () => {
      const info = await licenseService.getInfo()
      setLicenseInfo(info)
    }

    load()
    const unsubscribe = licenseService.subscribe((info) => {
      setLicenseInfo(info)
    })

    return () => {
      unsubscribe()
    }
  }, [isOpen])

  // Close on Escape key (disabled if trial is locked out)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isLockedOut) {
          // Disallow escaping while trial is expired & locked
          return
        }
        if (isEnterLicenseOpen) {
          setIsEnterLicenseOpen(false)
          setActivationError(null)
        } else if (confirmRemove) {
          setConfirmRemove(false)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isEnterLicenseOpen, confirmRemove, onClose, isLockedOut])

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(AUTHOR_EMAIL)
    setCopiedEmail(true)
    setTimeout(() => setCopiedEmail(false), 2000)
  }

  const handleCopyLicense = () => {
    navigator.clipboard.writeText(FULL_LICENSE_TEXT)
    setCopiedLicense(true)
    setTimeout(() => setCopiedLicense(false), 2000)
  }

  const handleCopyKey = () => {
    if (licenseInfo?.licenseKey) {
      navigator.clipboard.writeText(licenseInfo.licenseKey)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    }
  }

  const handleCopyHwid = () => {
    if (licenseInfo?.hwid) {
      navigator.clipboard.writeText(licenseInfo.hwid)
      setCopiedHwid(true)
      setTimeout(() => setCopiedHwid(false), 2000)
    }
  }

  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setActivationError(null)
    setActivationSuccess(null)

    const rawKey = keyInput.trim().toUpperCase()
    if (!rawKey) {
      setActivationError('Please enter a valid license key.')
      return
    }

    const isAdm = rawKey.startsWith('ADM-') || rawKey.startsWith('ADMIN-')
    if (!isAdm && !userInput.trim()) {
      setActivationError('Username is required for this license.')
      return
    }

    setIsActivating(true)
    try {
      const res = await licenseService.activate({
        licenseKey: rawKey,
        username: userInput.trim() || undefined,
        password: passwordInput || undefined,
      })

      if (res.success) {
        setActivationSuccess(res.message || 'License activated successfully!')
        if (res.info) setLicenseInfo(res.info)
        setTimeout(() => {
          setIsEnterLicenseOpen(false)
          setKeyInput('')
          setUserInput('')
          setPasswordInput('')
          setActivationSuccess(null)
        }, 1200)
      } else {
        setActivationError(res.error || 'Activation failed. Please verify credentials and seat limits.')
      }
    } catch (err: any) {
      setActivationError(err.message || 'Network error communicating with license server.')
    } finally {
      setIsActivating(false)
    }
  }

  const handleRemoveLicense = async () => {
    try {
      const res = await licenseService.remove()
      if (res.info) {
        setLicenseInfo(res.info)
      }
      setConfirmRemove(false)
      setIsRevealed(false)
    } catch (err: any) {
      console.error('Failed to remove license:', err)
    }
  }

  const isKeyAdm = keyInput.trim().toUpperCase().startsWith('ADM-') || keyInput.trim().toUpperCase().startsWith('ADMIN-')
  const isKeyDev = keyInput.trim().toUpperCase().startsWith('DEV-')
  const isKeyUser = keyInput.trim().toUpperCase().startsWith('USER-')

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={`modal-backdrop ${isLockedOut ? 'lockout-backdrop' : ''}`}
          onClick={() => !isLockedOut && onClose()}
        >
          <motion.div
            className={`license-modal glass-panel custom-scrollbar ${isLockedOut ? 'lockout-modal-glow' : ''}`}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            {/* Ambient Background Glow Orbs */}
            <div className="license-glow orb-1" />
            <div className="license-glow orb-2" />

            {/* Header / Close Button */}
            <div className="license-modal-header">
              <span className="license-modal-subtitle">SOFTWARE LICENSING & SUBSCRIPTION</span>
              {isLockedOut ? (
                <div className="license-locked-badge" title="Trial Expired — Enter License Key to Unlock">
                  <Lock size={12} className="lock-icon text-danger" />
                  <span>LOCKED OUT</span>
                </div>
              ) : (
                <button className="license-close-btn glass-interactive" onClick={onClose} title="Close (Esc)">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* App Branding & Tagline */}
            <div className="license-branding-section">
              <div className="license-icon-wrapper">
                <AppIcon size={46} />
              </div>
              <div className="license-title-group">
                <div className="license-app-name-row">
                  <h1 className="license-app-title">IndoctrinatedEdit</h1>
                  {licenseInfo?.type === 'ADM' && (
                    <span className="license-pro-badge adm-edition-ultra">
                      <Crown size={12} className="adm-crown-icon" />
                      <span className="adm-shine-text">ADMIN EDITION</span>
                      <Sparkles size={11} className="adm-sparkles-icon" />
                    </span>
                  )}
                  {licenseInfo?.type === 'DEV' && <span className="license-pro-badge dev">DEV PRO EDITION</span>}
                  {licenseInfo?.type === 'USER' && <span className="license-pro-badge user">PRO EDITION</span>}
                  {licenseInfo?.type === 'TRIAL' && (
                    <span className={`license-pro-badge ${isLockedOut ? 'locked-trial' : 'trial'}`}>
                      {isLockedOut ? 'TRIAL EXPIRED' : 'TRIAL EDITION'}
                    </span>
                  )}
                </div>
                <div className="license-version-row">
                  <span className="license-version-tag">v{version}</span>
                  <span className="license-status-badge">
                    <ShieldCheck size={12} /> Copyright &copy; 2024-2026 indoctrinatedrecluse
                  </span>
                </div>
              </div>
            </div>

            {/* Expired License Lockout Alert Banner */}
            {isLockedOut && (
              <motion.div
                className="trial-expired-lockout-banner glass-interactive"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="lockout-banner-top">
                  <div className="lockout-icon-pulse">
                    <ShieldAlert size={20} className="lockout-alert-icon" />
                  </div>
                  <div className="lockout-banner-content">
                    <span className="lockout-title">
                      {licenseInfo?.isTrial
                        ? 'TRIAL LICENSE EXPIRED — SOFTWARE LOCKED'
                        : `${(licenseInfo?.typeName || 'LICENSE').toUpperCase()} EXPIRED — SOFTWARE LOCKED`}
                    </span>
                    <p className="lockout-description">
                      {licenseInfo?.isTrial
                        ? 'Your 30-day evaluation trial of IndoctrinatedEdit has expired. Continued usage of the editor, workspaces, AI models, and integrated terminal subsystems is restricted. Please enter and activate a valid non-trial license key (Administrator, Developer, or Pro) below to unlock.'
                        : 'Your IndoctrinatedEdit license subscription has expired. Continued usage of the editor, workspaces, AI models, and integrated terminal subsystems is restricted. Please enter and activate a renewed or valid license key (Administrator, Developer, or Pro) below to unlock.'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ========================================================= */}
            {/* LIVE LICENSE STATUS & NODE-LOCKING CARD                   */}
            {/* ========================================================= */}
            <div className="license-status-master-card glass-interactive">
              <div className="status-master-header">
                <div className="status-title-row">
                  <KeyRound size={15} className="status-icon" />
                  <span className="status-main-heading">
                    {licenseInfo?.type === 'TRIAL' ? 'TRIAL LICENSE' : licenseInfo?.typeName || 'ACTIVE LICENSE'}
                  </span>
                </div>
                {licenseInfo?.type === 'TRIAL' ? (
                  <span className={`status-pill ${licenseInfo.status === 'expired' ? 'pill-danger' : 'pill-warning'}`}>
                    <Clock size={11} />
                    {licenseInfo.status === 'expired'
                      ? 'EXPIRED'
                      : `${licenseInfo.trialDaysRemaining ?? 30} DAYS LEFT`}
                  </span>
                ) : (
                  <span className="status-pill pill-success">
                    <Check size={11} /> ACTIVE
                  </span>
                )}
              </div>

              {/* Body: Active License Mode vs Trial Mode */}
              {licenseInfo && licenseInfo.type !== 'TRIAL' ? (
                <div className="active-license-details">
                  {/* License Key with Reveal Button */}
                  <div className="license-field-row">
                    <div className="field-info">
                      <span className="field-label">LICENSE KEY</span>
                      <code className="field-value key-value">
                        {isRevealed
                          ? licenseInfo.licenseKey
                          : licenseInfo.maskedKey || licenseService.maskKey(licenseInfo.licenseKey)}
                      </code>
                    </div>
                    <div className="field-actions">
                      <button
                        type="button"
                        className="field-action-btn glass-interactive"
                        onClick={() => setIsRevealed(!isRevealed)}
                        title={isRevealed ? 'Hide license digits' : 'Reveal license key'}
                      >
                        {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                        <span>{isRevealed ? 'Hide' : 'Reveal'}</span>
                      </button>
                      <button
                        type="button"
                        className={`field-action-btn glass-interactive ${copiedKey ? 'copied' : ''}`}
                        onClick={handleCopyKey}
                        title="Copy License Key"
                      >
                        {copiedKey ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Registered Owner & HWID Binding */}
                  <div className="license-meta-grid">
                    <div className="meta-box">
                      <span className="meta-label">
                        <User size={11} /> REGISTERED TO
                      </span>
                      <span className="meta-val">{licenseInfo.username || 'Authorized User'}</span>
                    </div>
                    <div className="meta-box">
                      <span className="meta-label">
                        <Laptop size={11} /> HARDWARE ID (NODE-LOCK)
                      </span>
                      <div className="hwid-val-row">
                        <code className="hwid-code">{licenseInfo.hwid}</code>
                        <button
                          type="button"
                          className="hwid-copy-icon-btn"
                          onClick={handleCopyHwid}
                          title="Copy HWID"
                        >
                          {copiedHwid ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Remove License Button & Confirmation */}
                  <div className="license-management-footer">
                    {!confirmRemove ? (
                      <button
                        type="button"
                        className="remove-license-btn glass-interactive"
                        onClick={() => setConfirmRemove(true)}
                        title="Deactivate this machine and revert to a Trial License"
                      >
                        <Trash2 size={13} />
                        <span>Remove License</span>
                      </button>
                    ) : (
                      <div className="remove-confirm-bar">
                        <span className="confirm-text">Deactivate machine & revert to 30-day Trial?</span>
                        <div className="confirm-btns">
                          <button
                            type="button"
                            className="confirm-yes-btn"
                            onClick={handleRemoveLicense}
                          >
                            Yes, Deactivate
                          </button>
                          <button
                            type="button"
                            className="confirm-cancel-btn"
                            onClick={() => setConfirmRemove(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Trial Mode View */
                <div className="trial-license-details">
                  <div className="trial-banner">
                    <Clock size={16} className="trial-clock-icon" />
                    <div className="trial-banner-text">
                      <span className="trial-headline">
                        {licenseInfo?.status === 'expired'
                          ? 'Trial License Expired'
                          : `30-Day Evaluation License (${licenseInfo?.trialDaysRemaining ?? 30} Days Remaining)`}
                      </span>
                      <span className="trial-subtext">
                        {licenseInfo?.status === 'expired'
                          ? 'Your evaluation period has ended. Activate a license to unlock full features.'
                          : 'Full access to all editing, AI, compiler, terminal, and extension tools is unlocked.'}
                      </span>
                    </div>
                  </div>

                  <div className="trial-hwid-row">
                    <span className="hwid-title">Machine HWID:</span>
                    <code className="hwid-text">{licenseInfo?.hwid || 'Detecting...'}</code>
                    <button
                      type="button"
                      className="hwid-copy-icon-btn"
                      onClick={handleCopyHwid}
                      title="Copy Hardware Fingerprint"
                    >
                      {copiedHwid ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                    </button>
                  </div>

                  {/* Action Buttons: Enter License & Purchase License */}
                  <div className="trial-action-buttons">
                    <button
                      type="button"
                      className="enter-license-btn glass-interactive"
                      onClick={() => {
                        setIsEnterLicenseOpen(true)
                        setActivationError(null)
                      }}
                    >
                      <Sparkles size={14} />
                      <span>Enter License</span>
                    </button>

                    <button
                      type="button"
                      className="purchase-license-btn disabled"
                      disabled
                      title="Online purchasing coming soon (Website currently in progress)"
                    >
                      <Lock size={13} />
                      <span>Purchase License</span>
                      <span className="coming-soon-badge">Coming Soon</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* INLINE "ENTER LICENSE" ACTIVATION MODAL FORM             */}
            {/* ========================================================= */}
            <AnimatePresence>
              {isEnterLicenseOpen && (
                <motion.form
                  className="activation-form-card glass-panel"
                  onSubmit={handleActivateSubmit}
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="activation-card-header">
                    <div className="activation-heading-row">
                      <KeyRound size={15} className="text-cyan" />
                      <span>ACTIVATE PRODUCT LICENSE</span>
                    </div>
                    <button
                      type="button"
                      className="form-close-btn"
                      onClick={() => setIsEnterLicenseOpen(false)}
                    >
                      <X size={13} />
                    </button>
                  </div>

                  {/* License Key Input */}
                  <div className="form-group">
                    <div className="form-label-row">
                      <label htmlFor="license-key-input">License Key</label>
                      {isKeyAdm && <span className="key-detect-tag adm">ADM (Admin Bypass)</span>}
                      {isKeyDev && <span className="key-detect-tag dev">DEV (Developer)</span>}
                      {isKeyUser && <span className="key-detect-tag user">USER (Retail)</span>}
                    </div>
                    <input
                      id="license-key-input"
                      type="text"
                      className="license-input mono"
                      placeholder="e.g. USER-XXXX-XXXX-XXXX or ADM-XXXX-XXXX-XXXX"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>

                  {/* Username (Optional for ADM, required for USER/DEV) */}
                  <div className="form-group">
                    <label htmlFor="license-username-input">
                      Username {isKeyAdm && <span className="optional-tag">(Optional for Admin)</span>}
                    </label>
                    <input
                      id="license-username-input"
                      type="text"
                      className="license-input"
                      placeholder={isKeyAdm ? 'Administrator' : 'License owner username'}
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      required={!isKeyAdm}
                    />
                  </div>

                  {/* Password (Optional for ADM, required for assigned USER/DEV) */}
                  <div className="form-group">
                    <label htmlFor="license-password-input">
                      Password {isKeyAdm && <span className="optional-tag">(Optional for Admin)</span>}
                    </label>
                    <input
                      id="license-password-input"
                      type="password"
                      className="license-input"
                      placeholder={isKeyAdm ? 'Bypassed for Admin' : 'License owner password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                    />
                  </div>

                  {/* Hardware Fingerprint Note */}
                  <div className="hwid-info-notice">
                    <Laptop size={13} className="notice-icon" />
                    <span>Machine HWID: <code>{licenseInfo?.hwid || 'HWID-AUTO-DETECT'}</code> will be bound to this seat.</span>
                  </div>

                  {/* Error & Success Messages */}
                  {activationError && (
                    <div className="form-alert error">
                      <AlertCircle size={14} />
                      <span>{activationError}</span>
                    </div>
                  )}

                  {activationSuccess && (
                    <div className="form-alert success">
                      <Check size={14} />
                      <span>{activationSuccess}</span>
                    </div>
                  )}

                  {/* Form Action Buttons */}
                  <div className="form-actions-row">
                    <button
                      type="button"
                      className="cancel-form-btn glass-interactive"
                      onClick={() => setIsEnterLicenseOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="submit-form-btn glass-interactive"
                      disabled={isActivating || !keyInput.trim()}
                    >
                      {isActivating ? (
                        <>
                          <Loader2 size={13} className="spin-icon" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <Check size={13} />
                          <span>Activate Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Author Contact & Permission Card */}
            <div className="license-key-card glass-interactive">
              <div className="license-key-header">
                <div className="license-key-label">
                  <Mail size={13} className="key-icon" />
                  <span>AUTHOR & PERMISSION CONTACT</span>
                </div>
                <span className="license-status-pill">COPYRIGHT HOLDER</span>
              </div>
              <div className="license-key-display-row">
                <div className="license-author-info">
                  <span className="author-name">{COPYRIGHT_HOLDER}</span>
                  <code className="author-email">{AUTHOR_EMAIL}</code>
                </div>
                <button
                  className={`license-copy-btn ${copiedEmail ? 'copied' : ''}`}
                  onClick={handleCopyEmail}
                  title="Copy Contact Email"
                >
                  {copiedEmail ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedEmail ? 'Copied!' : 'Copy Email'}</span>
                </button>
              </div>
            </div>

            {/* Key License Terms Overview */}
            <div className="license-terms-grid">
              <div className="license-term-card glass-subcard">
                <div className="term-header">
                  <ShieldCheck size={14} className="term-icon text-success" />
                  <span className="term-title">Free to Download & Use</span>
                </div>
                <p className="term-text">
                  IndoctrinatedEdit is complimentary to download, install, and use for all personal, educational, and
                  commercial development workflows without recurring subscriptions or fees.
                </p>
              </div>

              <div className="license-term-card glass-subcard highlight-warning">
                <div className="term-header">
                  <GitFork size={14} className="term-icon text-warning" />
                  <span className="term-title">Forking & Modifying (Permission Required)</span>
                </div>
                <p className="term-text">
                  Forking, modifying the underlying code, and redistributing are <strong>warmly encouraged</strong>, but you
                  <strong> MUST contact the author first at {AUTHOR_EMAIL}</strong> to obtain written authorization.
                </p>
              </div>

              <div className="license-term-card glass-subcard highlight-danger">
                <div className="term-header">
                  <ShieldAlert size={14} className="term-icon text-danger" />
                  <span className="term-title">Legal Action & Enforcement</span>
                </div>
                <p className="term-text">
                  All copyrights belong exclusively to <strong>indoctrinatedrecluse</strong>. Unauthorized copying,
                  unauthorized redistribution, or forking without prior written permission is strictly prohibited and will
                  result in immediate civil and legal enforcement action.
                </p>
              </div>
            </div>

            {/* Collapsible Full License Text */}
            <div className="full-license-section">
              <div className="full-license-header">
                <button
                  className="toggle-full-license-btn glass-interactive"
                  onClick={() => setShowFullText(!showFullText)}
                >
                  <FileText size={12} />
                  <span>{showFullText ? 'Hide Complete License Agreement' : 'View Complete License Agreement'}</span>
                </button>
                <button
                  className={`copy-license-btn glass-interactive ${copiedLicense ? 'copied' : ''}`}
                  onClick={handleCopyLicense}
                  title="Copy Full License Text"
                >
                  {copiedLicense ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedLicense ? 'Copied License' : 'Copy License'}</span>
                </button>
              </div>

              {showFullText && (
                <pre className="full-license-viewer custom-scrollbar">
                  <code>{FULL_LICENSE_TEXT}</code>
                </pre>
              )}
            </div>

            {/* Footer */}
            <div className="license-modal-footer">
              <span>
                Copyright &copy; 2024-2026 <strong>indoctrinatedrecluse (Abhishek Mitra)</strong> • All Rights Reserved
              </span>
            </div>

            <style>{`
              .modal-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(4, 6, 12, 0.76);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                padding: 16px;
              }

              .license-modal {
                width: 100%;
                max-width: 580px;
                max-height: 90vh;
                overflow-y: auto;
                border-radius: var(--radius-lg);
                padding: 24px;
                position: relative;
                border: var(--specular-border);
                box-shadow: 0 24px 64px -12px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.22);
              }

              .license-glow {
                position: absolute;
                border-radius: 50%;
                filter: blur(70px);
                pointer-events: none;
                opacity: 0.22;
              }

              .license-glow.orb-1 {
                width: 260px;
                height: 260px;
                background: #0A84FF;
                top: -60px;
                right: -40px;
              }

              .license-glow.orb-2 {
                width: 220px;
                height: 220px;
                background: #BF5AF2;
                bottom: -40px;
                left: -20px;
              }

              .license-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 16px;
                position: relative;
                z-index: 2;
              }

              .license-modal-subtitle {
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.8px;
                color: var(--text-muted);
              }

              .license-close-btn {
                width: 28px;
                height: 28px;
                border-radius: var(--radius-sm);
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(255, 255, 255, 0.05);
                color: var(--text-secondary);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
              }

              .license-branding-section {
                display: flex;
                align-items: center;
                gap: 16px;
                margin-bottom: 16px;
                position: relative;
                z-index: 2;
              }

              .license-icon-wrapper {
                filter: drop-shadow(0 0 16px var(--accent-glow));
              }

              .license-title-group {
                display: flex;
                flex-direction: column;
                gap: 4px;
              }

              .license-app-name-row {
                display: flex;
                align-items: center;
                gap: 8px;
              }

              .license-app-title {
                font-size: 19px;
                font-weight: 800;
                letter-spacing: 0.3px;
                background: linear-gradient(135deg, #FFFFFF 0%, #B8C0D0 100%);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                margin: 0;
              }

              .license-pro-badge {
                display: inline-flex;
                align-items: center;
                gap: 4.5px;
                font-size: 9.5px;
                font-weight: 800;
                letter-spacing: 0.6px;
                padding: 2.5px 8px;
                border-radius: 5px;
                color: #FFF;
              }
              .license-pro-badge.adm-edition-ultra {
                background: linear-gradient(135deg, #FFD700 0%, #FF9500 30%, #FF2D55 70%, #AF52DE 100%);
                background-size: 200% 200%;
                animation: adminGoldShimmer 4s ease infinite;
                border: 1px solid rgba(255, 235, 100, 0.75);
                box-shadow: 0 0 16px rgba(255, 170, 0, 0.6), 0 0 28px rgba(175, 82, 222, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.6);
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
                position: relative;
                overflow: hidden;
              }
              .adm-crown-icon {
                color: #FFF275;
                filter: drop-shadow(0 0 4px #FFD700);
                animation: crownFloat 2s ease-in-out infinite alternate;
              }
              .adm-sparkles-icon {
                color: #FFFFFF;
                filter: drop-shadow(0 0 4px #FFF);
                animation: sparkleTwinkle 1.8s ease-in-out infinite alternate;
              }
              .adm-shine-text {
                font-weight: 900;
                letter-spacing: 0.8px;
              }
              @keyframes adminGoldShimmer {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
              }
              @keyframes crownFloat {
                0% { transform: translateY(0px) rotate(0deg); }
                100% { transform: translateY(-1.5px) rotate(-3deg); }
              }
              @keyframes sparkleTwinkle {
                0% { transform: scale(0.85); opacity: 0.8; }
                100% { transform: scale(1.15); opacity: 1; }
              }
              .license-pro-badge.dev {
                background: linear-gradient(135deg, #BF5AF2 0%, #5E5CE6 100%);
                box-shadow: 0 0 12px rgba(191, 90, 242, 0.4);
                border: 1px solid rgba(191, 90, 242, 0.35);
              }
              .license-pro-badge.user {
                background: linear-gradient(135deg, #0A84FF 0%, #64D2FF 100%);
                box-shadow: 0 0 12px rgba(10, 132, 255, 0.4);
                border: 1px solid rgba(100, 210, 255, 0.35);
              }
              .license-pro-badge.trial {
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.18);
                color: var(--text-primary);
              }
              .license-pro-badge.locked-trial {
                background: linear-gradient(135deg, rgba(255, 69, 58, 0.3) 0%, rgba(255, 55, 95, 0.3) 100%);
                border: 1px solid rgba(255, 69, 58, 0.6);
                color: #FF6961;
                box-shadow: 0 0 12px rgba(255, 69, 58, 0.35);
                font-weight: 900;
              }

              .license-locked-badge {
                display: flex;
                align-items: center;
                gap: 5px;
                padding: 3px 8px;
                border-radius: 4px;
                background: rgba(255, 69, 58, 0.18);
                border: 1px solid rgba(255, 69, 58, 0.45);
                color: #FF453A;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.5px;
              }

              .lockout-backdrop {
                backdrop-filter: blur(28px) saturate(220%) !important;
                background: rgba(8, 5, 14, 0.88) !important;
                cursor: not-allowed !important;
              }

              .lockout-modal-glow {
                border-color: rgba(255, 69, 58, 0.4) !important;
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 45px rgba(255, 69, 58, 0.25) !important;
              }

              .trial-expired-lockout-banner {
                margin-bottom: 16px;
                padding: 12px 14px;
                border-radius: var(--radius-md);
                background: linear-gradient(135deg, rgba(255, 69, 58, 0.14) 0%, rgba(255, 55, 95, 0.08) 100%);
                border: 1px solid rgba(255, 69, 58, 0.4);
                box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1), 0 0 18px rgba(255, 69, 58, 0.2);
                position: relative;
                z-index: 2;
              }

              .lockout-banner-top {
                display: flex;
                align-items: flex-start;
                gap: 12px;
              }

              .lockout-icon-pulse {
                color: #FF453A;
                animation: alertPulse 1.8s ease-in-out infinite alternate;
                margin-top: 1px;
                flex-shrink: 0;
              }

              @keyframes alertPulse {
                0% { transform: scale(0.95); opacity: 0.85; filter: drop-shadow(0 0 2px #FF453A); }
                100% { transform: scale(1.1); opacity: 1; filter: drop-shadow(0 0 8px #FF453A); }
              }

              .lockout-banner-content {
                display: flex;
                flex-direction: column;
                gap: 4px;
              }

              .lockout-title {
                font-size: 12px;
                font-weight: 800;
                color: #FF453A;
                letter-spacing: 0.4px;
              }

              .lockout-description {
                font-size: 11.5px;
                line-height: 1.45;
                color: rgba(255, 235, 235, 0.85);
                margin: 0;
              }

              .license-version-row {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
              }

              .license-version-tag {
                font-size: 11px;
                font-weight: 600;
                color: var(--accent-cyan);
                background: rgba(100, 210, 255, 0.1);
                border: 1px solid rgba(100, 210, 255, 0.2);
                padding: 1px 6px;
                border-radius: 4px;
              }

              .license-status-badge {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 11px;
                font-weight: 500;
                color: rgba(235, 235, 245, 0.75);
              }

              /* Status Master Card */
              .license-status-master-card {
                padding: 14px 16px;
                border-radius: var(--radius-md);
                background: rgba(10, 14, 26, 0.65);
                border: 1px solid rgba(255, 255, 255, 0.14);
                margin-bottom: 14px;
                position: relative;
                z-index: 2;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
              }

              .status-master-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.07);
                padding-bottom: 8px;
              }

              .status-title-row {
                display: flex;
                align-items: center;
                gap: 7px;
              }

              .status-icon {
                color: #64D2FF;
              }

              .status-main-heading {
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.5px;
                color: #FFF;
              }

              .status-pill {
                font-size: 10px;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                gap: 4px;
                letter-spacing: 0.4px;
              }
              .status-pill.pill-success {
                background: rgba(48, 209, 88, 0.18);
                color: #30D158;
                border: 1px solid rgba(48, 209, 88, 0.35);
              }
              .status-pill.pill-warning {
                background: rgba(255, 159, 10, 0.18);
                color: #FF9F0A;
                border: 1px solid rgba(255, 159, 10, 0.35);
              }
              .status-pill.pill-danger {
                background: rgba(255, 69, 58, 0.18);
                color: #FF453A;
                border: 1px solid rgba(255, 69, 58, 0.35);
              }

              /* Active License details */
              .active-license-details {
                display: flex;
                flex-direction: column;
                gap: 10px;
              }

              .license-field-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                background: rgba(0, 0, 0, 0.35);
                padding: 8px 12px;
                border-radius: var(--radius-sm);
                border: 1px solid rgba(255, 255, 255, 0.08);
              }

              .field-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
              }

              .field-label {
                font-size: 9px;
                font-weight: 700;
                letter-spacing: 0.6px;
                color: var(--text-muted);
              }

              .key-value {
                font-size: 12.5px;
                font-weight: 700;
                color: #64D2FF;
                letter-spacing: 1px;
                user-select: all;
              }

              .field-actions {
                display: flex;
                align-items: center;
                gap: 5px;
              }

              .field-action-btn {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 10.5px;
                font-weight: 600;
                padding: 4px 8px;
                border-radius: var(--radius-xs);
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.12);
                color: var(--text-primary);
                cursor: pointer;
                transition: all 0.12s;
              }
              .field-action-btn:hover {
                background: rgba(255, 255, 255, 0.12);
              }
              .field-action-btn.copied {
                color: #30D158;
                border-color: rgba(48, 209, 88, 0.4);
              }

              .license-meta-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
              }

              .meta-box {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.06);
                padding: 6px 10px;
                border-radius: var(--radius-xs);
                display: flex;
                flex-direction: column;
                gap: 3px;
              }

              .meta-label {
                font-size: 9px;
                font-weight: 700;
                letter-spacing: 0.5px;
                color: var(--text-muted);
                display: flex;
                align-items: center;
                gap: 4px;
              }

              .meta-val {
                font-size: 11px;
                font-weight: 600;
                color: #FFF;
              }

              .hwid-val-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 4px;
              }

              .hwid-code {
                font-size: 10px;
                color: #A4FFFF;
                font-family: var(--font-mono);
              }

              .hwid-copy-icon-btn {
                background: none;
                border: none;
                color: var(--text-muted);
                cursor: pointer;
                padding: 1px 3px;
                display: flex;
                align-items: center;
              }
              .hwid-copy-icon-btn:hover {
                color: #FFF;
              }

              .license-management-footer {
                display: flex;
                justify-content: flex-end;
                margin-top: 4px;
              }

              .remove-license-btn {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 10.5px;
                font-weight: 600;
                padding: 4px 10px;
                border-radius: var(--radius-xs);
                background: rgba(255, 69, 58, 0.1);
                border: 1px solid rgba(255, 69, 58, 0.3);
                color: #FF6E6E;
                cursor: pointer;
                transition: all 0.15s;
              }
              .remove-license-btn:hover {
                background: rgba(255, 69, 58, 0.2);
                border-color: rgba(255, 69, 58, 0.5);
              }

              .remove-confirm-bar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
                background: rgba(255, 69, 58, 0.14);
                border: 1px solid rgba(255, 69, 58, 0.4);
                padding: 6px 10px;
                border-radius: var(--radius-xs);
                gap: 8px;
              }

              .confirm-text {
                font-size: 10.5px;
                font-weight: 600;
                color: #FFF;
              }

              .confirm-btns {
                display: flex;
                gap: 5px;
              }

              .confirm-yes-btn {
                background: #FF453A;
                color: #FFF;
                border: none;
                padding: 3px 8px;
                border-radius: 3px;
                font-size: 10px;
                font-weight: 700;
                cursor: pointer;
              }

              .confirm-cancel-btn {
                background: rgba(255, 255, 255, 0.1);
                color: #FFF;
                border: 1px solid rgba(255, 255, 255, 0.2);
                padding: 3px 8px;
                border-radius: 3px;
                font-size: 10px;
                font-weight: 600;
                cursor: pointer;
              }

              /* Trial License details */
              .trial-license-details {
                display: flex;
                flex-direction: column;
                gap: 10px;
              }

              .trial-banner {
                display: flex;
                align-items: center;
                gap: 10px;
                background: rgba(255, 159, 10, 0.08);
                border: 1px solid rgba(255, 159, 10, 0.25);
                padding: 8px 12px;
                border-radius: var(--radius-sm);
              }

              .trial-clock-icon {
                color: #FF9F0A;
                flex-shrink: 0;
              }

              .trial-banner-text {
                display: flex;
                flex-direction: column;
                gap: 2px;
              }

              .trial-headline {
                font-size: 11.5px;
                font-weight: 700;
                color: #FFFFFF;
              }

              .trial-subtext {
                font-size: 10.5px;
                color: rgba(235, 235, 245, 0.7);
              }

              .trial-hwid-row {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 10.5px;
                background: rgba(0, 0, 0, 0.3);
                padding: 6px 10px;
                border-radius: var(--radius-xs);
                border: 1px solid rgba(255, 255, 255, 0.06);
              }

              .hwid-title {
                color: var(--text-muted);
                font-weight: 600;
              }

              .hwid-text {
                color: #64D2FF;
                font-family: var(--font-mono);
                flex: 1;
              }

              .trial-action-buttons {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-top: 4px;
              }

              .enter-license-btn {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                padding: 8px 14px;
                border-radius: var(--radius-sm);
                background: linear-gradient(135deg, #0A84FF 0%, #0066CC 100%);
                border: 1px solid rgba(100, 210, 255, 0.4);
                color: #FFFFFF;
                font-size: 11.5px;
                font-weight: 700;
                cursor: pointer;
                box-shadow: 0 4px 14px rgba(10, 132, 255, 0.3);
                transition: all 0.15s;
              }
              .enter-license-btn:hover {
                background: linear-gradient(135deg, #2A94FF 0%, #0077EE 100%);
                transform: translateY(-1px);
                box-shadow: 0 6px 18px rgba(10, 132, 255, 0.45);
              }

              .purchase-license-btn {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                padding: 8px 14px;
                border-radius: var(--radius-sm);
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: var(--text-muted);
                font-size: 11.5px;
                font-weight: 600;
                cursor: not-allowed;
                position: relative;
              }
              .coming-soon-badge {
                font-size: 8px;
                font-weight: 800;
                background: rgba(255, 255, 255, 0.12);
                padding: 1px 4px;
                border-radius: 3px;
                color: #A0AAB8;
                letter-spacing: 0.4px;
              }

              /* Inline Activation Form */
              .activation-form-card {
                background: rgba(14, 20, 36, 0.95);
                border: 1px solid rgba(100, 210, 255, 0.3);
                border-radius: var(--radius-md);
                padding: 14px;
                margin-bottom: 14px;
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
                position: relative;
                z-index: 5;
              }

              .activation-card-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
                padding-bottom: 6px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
              }

              .activation-heading-row {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 0.6px;
                color: #FFF;
              }

              .form-close-btn {
                background: none;
                border: none;
                color: var(--text-muted);
                cursor: pointer;
                padding: 2px;
              }
              .form-close-btn:hover {
                color: #FFF;
              }

              .form-group {
                display: flex;
                flex-direction: column;
                gap: 4px;
                margin-bottom: 10px;
              }

              .form-label-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
              }

              .form-group label {
                font-size: 10.5px;
                font-weight: 700;
                color: var(--text-secondary);
              }

              .optional-tag {
                font-size: 9px;
                color: var(--text-muted);
                font-weight: 500;
              }

              .key-detect-tag {
                font-size: 9px;
                font-weight: 800;
                padding: 1px 5px;
                border-radius: 3px;
              }
              .key-detect-tag.adm {
                background: rgba(255, 159, 10, 0.2);
                color: #FFB340;
                border: 1px solid rgba(255, 159, 10, 0.4);
              }
              .key-detect-tag.dev {
                background: rgba(191, 90, 242, 0.2);
                color: #DA8FFF;
                border: 1px solid rgba(191, 90, 242, 0.4);
              }
              .key-detect-tag.user {
                background: rgba(10, 132, 255, 0.2);
                color: #64D2FF;
                border: 1px solid rgba(10, 132, 255, 0.4);
              }

              .license-input {
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.16);
                border-radius: var(--radius-xs);
                padding: 6px 10px;
                color: #FFF;
                font-size: 11.5px;
                outline: none;
                transition: border-color 0.15s;
              }
              .license-input:focus {
                border-color: #0A84FF;
                box-shadow: 0 0 8px rgba(10, 132, 255, 0.3);
              }
              .license-input.mono {
                font-family: var(--font-mono);
                letter-spacing: 0.5px;
              }

              .hwid-info-notice {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 10px;
                color: var(--text-muted);
                background: rgba(255, 255, 255, 0.03);
                padding: 5px 8px;
                border-radius: var(--radius-xs);
                margin-bottom: 10px;
              }
              .hwid-info-notice code {
                color: #64D2FF;
              }

              .form-alert {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                padding: 7px 10px;
                border-radius: var(--radius-xs);
                margin-bottom: 10px;
              }
              .form-alert.error {
                background: rgba(255, 69, 58, 0.15);
                border: 1px solid rgba(255, 69, 58, 0.35);
                color: #FF6E6E;
              }
              .form-alert.success {
                background: rgba(48, 209, 88, 0.15);
                border: 1px solid rgba(48, 209, 88, 0.35);
                color: #30D158;
              }

              .form-actions-row {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 8px;
                margin-top: 4px;
              }

              .cancel-form-btn {
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.14);
                color: var(--text-secondary);
                padding: 6px 12px;
                border-radius: var(--radius-xs);
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
              }

              .submit-form-btn {
                display: flex;
                align-items: center;
                gap: 5px;
                background: linear-gradient(135deg, #0A84FF 0%, #0066CC 100%);
                border: 1px solid rgba(100, 210, 255, 0.4);
                color: #FFF;
                padding: 6px 14px;
                border-radius: var(--radius-xs);
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(10, 132, 255, 0.3);
              }
              .submit-form-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
              }

              .spin-icon {
                animation: spin 1s linear infinite;
              }

              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }

              /* Author info card */
              .license-key-card {
                padding: 12px 14px;
                border-radius: var(--radius-md);
                background: rgba(0, 0, 0, 0.45);
                border: 1px solid rgba(255, 255, 255, 0.12);
                margin-bottom: 14px;
                position: relative;
                z-index: 2;
              }

              .license-key-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
              }

              .license-key-label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.5px;
                color: var(--text-muted);
              }

              .key-icon {
                color: #0A84FF;
              }

              .license-status-pill {
                font-size: 9px;
                font-weight: 800;
                padding: 2px 6px;
                border-radius: 3px;
                background: rgba(10, 132, 255, 0.18);
                color: #5AC8FA;
                border: 1px solid rgba(10, 132, 255, 0.35);
              }

              .license-key-display-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
              }

              .license-author-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
              }

              .author-name {
                font-size: 12px;
                font-weight: 700;
                color: #FFFFFF;
              }

              .author-email {
                font-family: var(--font-mono);
                font-size: 11.5px;
                color: #64D2FF;
                user-select: all;
              }

              .license-copy-btn {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 11px;
                font-weight: 600;
                padding: 5px 10px;
                border-radius: var(--radius-sm);
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.14);
                color: var(--text-primary);
                cursor: pointer;
                transition: all var(--transition-fast);
              }

              .license-copy-btn:hover {
                background: rgba(255, 255, 255, 0.14);
                border-color: rgba(255, 255, 255, 0.25);
              }

              .license-copy-btn.copied {
                background: rgba(48, 209, 88, 0.2);
                border-color: rgba(48, 209, 88, 0.4);
                color: #30D158;
              }

              .license-terms-grid {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-bottom: 14px;
                position: relative;
                z-index: 2;
              }

              .license-term-card {
                padding: 10px 12px;
                border-radius: var(--radius-sm);
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.08);
              }

              .license-term-card.highlight-warning {
                background: rgba(255, 159, 10, 0.06);
                border-color: rgba(255, 159, 10, 0.25);
              }

              .license-term-card.highlight-danger {
                background: rgba(255, 69, 58, 0.06);
                border-color: rgba(255, 69, 58, 0.25);
              }

              .term-header {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-bottom: 4px;
              }

              .term-title {
                font-size: 11px;
                font-weight: 700;
                color: #FFFFFF;
              }

              .term-text {
                font-size: 11px;
                line-height: 1.45;
                color: rgba(235, 235, 245, 0.7);
                margin: 0;
              }

              .term-text strong {
                color: #FFFFFF;
              }

              .text-success { color: #30D158; }
              .text-warning { color: #FF9F0A; }
              .text-danger { color: #FF453A; }

              .full-license-section {
                margin-bottom: 14px;
                position: relative;
                z-index: 2;
              }

              .full-license-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                margin-bottom: 8px;
              }

              .toggle-full-license-btn, .copy-license-btn {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 10.5px;
                font-weight: 600;
                padding: 4px 8px;
                border-radius: 4px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: rgba(235, 235, 245, 0.8);
                cursor: pointer;
                transition: all 0.15s;
              }

              .toggle-full-license-btn:hover, .copy-license-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #FFFFFF;
              }

              .copy-license-btn.copied {
                background: rgba(48, 209, 88, 0.2);
                border-color: rgba(48, 209, 88, 0.4);
                color: #30D158;
              }

              .full-license-viewer {
                background: rgba(0, 0, 0, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                padding: 10px;
                font-family: var(--font-mono);
                font-size: 10px;
                line-height: 1.4;
                color: rgba(235, 235, 245, 0.8);
                max-height: 150px;
                overflow-y: auto;
                white-space: pre-wrap;
                margin: 0;
              }

              .license-modal-footer {
                text-align: center;
                font-size: 10.5px;
                color: var(--text-muted);
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                padding-top: 10px;
                position: relative;
                z-index: 2;
              }

              .license-modal-footer strong {
                color: var(--text-secondary);
              }
            `}</style>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

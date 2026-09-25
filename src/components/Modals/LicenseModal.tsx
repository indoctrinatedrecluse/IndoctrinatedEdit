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
} from 'lucide-react'
import { AppIcon } from '../Brand/AppIcon'

interface LicenseModalProps {
  isOpen: boolean
  onClose: () => void
  version?: string
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
  version = '4.9.1',
}) => {
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedLicense, setCopiedLicense] = useState(false)
  const [showFullText, setShowFullText] = useState(false)

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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-backdrop" onClick={onClose}>
          <motion.div
            className="license-modal glass-panel custom-scrollbar"
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
              <span className="license-modal-subtitle">SOFTWARE LICENSE & COPYRIGHT NOTICE</span>
              <button className="license-close-btn glass-interactive" onClick={onClose} title="Close (Esc)">
                <X size={14} />
              </button>
            </div>

            {/* App Branding & Tagline */}
            <div className="license-branding-section">
              <div className="license-icon-wrapper">
                <AppIcon size={44} />
              </div>
              <div className="license-title-group">
                <div className="license-app-name-row">
                  <h1 className="license-app-title">IndoctrinatedEdit</h1>
                  <span className="license-pro-badge">PRO EDITION</span>
                </div>
                <div className="license-version-row">
                  <span className="license-version-tag">v{version}</span>
                  <span className="license-status-badge">
                    <ShieldCheck size={12} /> Copyright &copy; 2024-2026 indoctrinatedrecluse
                  </span>
                </div>
              </div>
            </div>

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
                background: rgba(4, 6, 12, 0.72);
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
                max-width: 540px;
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
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.6px;
                padding: 2px 6px;
                border-radius: 4px;
                background: linear-gradient(135deg, #0A84FF 0%, #BF5AF2 100%);
                color: #FFF;
                box-shadow: 0 0 12px rgba(10, 132, 255, 0.35);
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

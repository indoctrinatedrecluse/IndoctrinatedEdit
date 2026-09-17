import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Copy, KeyRound, ShieldCheck, Sparkles, Zap, Award } from 'lucide-react'
import { AppIcon } from '../Brand/AppIcon'

interface LicenseModalProps {
  isOpen: boolean
  onClose: () => void
  version?: string
}

export const LicenseModal: React.FC<LicenseModalProps> = ({
  isOpen,
  onClose,
  version = '4.0.0',
}) => {
  const [licenseKey, setLicenseKey] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Generate an authentic deterministic or random license key for this session
    const segments = [
      'INDC',
      'PRO',
      Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase(),
      Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase(),
      'GLAS',
    ]
    setLicenseKey(segments.join('-'))
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

  const handleCopy = () => {
    navigator.clipboard.writeText(licenseKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-backdrop" onClick={onClose}>
          <motion.div
            className="license-modal glass-panel"
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
              <span className="license-modal-subtitle">LICENSE & SUBSCRIPTION</span>
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
                    <ShieldCheck size={12} /> Active Lifetime Seat
                  </span>
                </div>
              </div>
            </div>

            {/* License Key Card */}
            <div className="license-key-card glass-interactive">
              <div className="license-key-header">
                <div className="license-key-label">
                  <KeyRound size={13} className="key-icon" />
                  <span>PERPETUAL COMMUNITY LICENSE KEY</span>
                </div>
                <span className="license-status-pill">VALIDATED</span>
              </div>
              <div className="license-key-display-row">
                <code className="license-key-code">{licenseKey}</code>
                <button
                  className={`license-copy-btn ${copied ? 'copied' : ''}`}
                  onClick={handleCopy}
                  title="Copy License Key to Clipboard"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* License Entitlements */}
            <div className="license-perks-section">
              <div className="perks-title">
                <Award size={13} className="perks-icon" />
                <span>INCLUDED PRO ENTITLEMENTS</span>
              </div>
              <div className="perks-list">
                <div className="perk-item">
                  <Zap size={13} className="perk-bullet" />
                  <span>Multi-Model AI Streaming Assistant (OpenAI, Anthropic, Gemini, Groq, DeepSeek)</span>
                </div>
                <div className="perk-item">
                  <Sparkles size={13} className="perk-bullet" />
                  <span>Ultra-Luxe iOS Liquid Glass Design System & Specular Theme Engine</span>
                </div>
                <div className="perk-item">
                  <ShieldCheck size={13} className="perk-bullet" />
                  <span>Heavyweight Monaco Core Engine & Offline Visual Git Graph</span>
                </div>
              </div>
            </div>

            {/* Disclaimer & Notice */}
            <p className="license-notice">
              🎉 <strong>Complimentary Lifetime Activation:</strong> You are using the authentic community
              pre-activated build. All premium features, AI toolchains, and visual customizers are unlocked permanently.
            </p>

            {/* Footer */}
            <div className="license-modal-footer">
              <span>Licensed to: <strong>Global Developer Community</strong> • No recurring fees</span>
            </div>

            <style>{`
              .modal-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(4, 6, 12, 0.65);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                padding: 16px;
              }

              .license-modal {
                width: 100%;
                max-width: 500px;
                border-radius: var(--radius-lg);
                padding: 24px;
                position: relative;
                overflow: hidden;
                border: var(--specular-border);
                box-shadow: 0 24px 64px -12px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.22);
              }

              .license-glow {
                position: absolute;
                border-radius: 50%;
                filter: blur(60px);
                pointer-events: none;
                opacity: 0.25;
              }

              .license-glow.orb-1 {
                width: 240px;
                height: 240px;
                background: #30D158;
                top: -60px;
                right: -40px;
              }

              .license-glow.orb-2 {
                width: 200px;
                height: 200px;
                background: var(--accent-primary);
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
              }

              .license-pro-badge {
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.6px;
                padding: 2px 6px;
                border-radius: 4px;
                background: linear-gradient(135deg, #30D158 0%, #0A84FF 100%);
                color: #FFF;
                box-shadow: 0 0 12px rgba(48, 209, 88, 0.35);
              }

              .license-version-row {
                display: flex;
                align-items: center;
                gap: 8px;
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
                font-weight: 600;
                color: #30D158;
              }

              .license-key-card {
                padding: 12px 14px;
                border-radius: var(--radius-md);
                background: rgba(0, 0, 0, 0.35);
                border: 1px solid rgba(255, 255, 255, 0.1);
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
                color: #FFD60A;
              }

              .license-status-pill {
                font-size: 9px;
                font-weight: 800;
                padding: 2px 6px;
                border-radius: 3px;
                background: rgba(48, 209, 88, 0.15);
                color: #30D158;
                border: 1px solid rgba(48, 209, 88, 0.3);
              }

              .license-key-display-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
              }

              .license-key-code {
                font-family: var(--font-mono);
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 1.2px;
                color: #64D2FF;
                user-select: all;
              }

              .license-copy-btn {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 11px;
                font-weight: 600;
                padding: 4px 10px;
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

              .license-perks-section {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-bottom: 14px;
                position: relative;
                z-index: 2;
              }

              .perks-title {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.5px;
                color: var(--text-muted);
              }

              .perks-icon {
                color: var(--accent-primary);
              }

              .perks-list {
                display: flex;
                flex-direction: column;
                gap: 6px;
              }

              .perk-item {
                display: flex;
                align-items: flex-start;
                gap: 8px;
                font-size: 11.5px;
                color: var(--text-secondary);
                line-height: 1.4;
              }

              .perk-bullet {
                color: #0A84FF;
                flex-shrink: 0;
                margin-top: 2px;
              }

              .license-notice {
                font-size: 11.5px;
                line-height: 1.5;
                color: var(--text-secondary);
                margin-bottom: 14px;
                padding: 8px 12px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: var(--radius-sm);
                border: 1px solid rgba(255, 255, 255, 0.06);
                position: relative;
                z-index: 2;
              }

              .license-notice strong {
                color: var(--text-primary);
              }

              .license-modal-footer {
                text-align: center;
                font-size: 10.5px;
                color: var(--text-muted);
                border-top: 1px solid rgba(255, 255, 255, 0.06);
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

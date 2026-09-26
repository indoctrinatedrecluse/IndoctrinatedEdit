import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Lock, KeyRound, Copy, Check, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react'
import { licenseService, LicenseInfo } from '../../services/licenseService'

interface LockedExtensionViewProps {
  extensionName: string
  onOpenLicense?: () => void
  customDescription?: string
}

export const LockedExtensionView: React.FC<LockedExtensionViewProps> = ({
  extensionName,
  onOpenLicense,
  customDescription,
}) => {
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null)
  const [copiedHwid, setCopiedHwid] = useState<boolean>(false)

  useEffect(() => {
    licenseService.getInfo().then(setLicenseInfo)
    return licenseService.subscribe(setLicenseInfo)
  }, [])

  const handleCopyHwid = () => {
    if (licenseInfo?.hwid) {
      navigator.clipboard.writeText(licenseInfo.hwid)
      setCopiedHwid(true)
      setTimeout(() => setCopiedHwid(false), 2000)
    }
  }

  return (
    <div className="locked-extension-container custom-scrollbar">
      <motion.div
        className="locked-extension-card glass-panel"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      >
        {/* Ambient Glows */}
        <div className="locked-glow glow-1" />
        <div className="locked-glow glow-2" />

        {/* Lock Icon Emblem */}
        <div className="locked-icon-shield">
          <div className="shield-ring">
            <Lock size={28} className="lock-core-icon" />
          </div>
          <span className="pro-pill-badge">
            <Sparkles size={11} className="sparkle-icon" />
            <span>PRO FEATURE</span>
          </span>
        </div>

        {/* Title & Description */}
        <h2 className="locked-title">{extensionName}</h2>
        <div className="locked-sub-banner">
          <ShieldAlert size={14} className="alert-icon" />
          <span>LOCKED UNDER TRIAL LICENSE</span>
        </div>

        <p className="locked-description">
          {customDescription ||
            `${extensionName} is a licensed Pro extension. Continuous usage of this microservice is restricted while on a Trial License. Enter an Administrator, Developer, or Pro license key to unlock this feature instantly.`}
        </p>

        {/* Action Button */}
        <div className="locked-actions-row">
          <button
            className="unlock-license-btn glass-interactive"
            onClick={onOpenLicense}
            title="Open Software License dialog to enter key"
          >
            <KeyRound size={15} />
            <span>Enter License Key</span>
            <ArrowRight size={14} className="arrow-icon" />
          </button>
        </div>

        {/* Hardware ID & Quick Copy */}
        {licenseInfo?.hwid && (
          <div className="locked-hwid-box">
            <div className="hwid-label-row">
              <span className="hwid-label">Node-Locked Machine HWID</span>
              <button
                className="hwid-copy-btn glass-interactive"
                onClick={handleCopyHwid}
                title="Copy hardware fingerprint"
              >
                {copiedHwid ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                <span>{copiedHwid ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <code className="hwid-code-pill">{licenseInfo.hwid}</code>
          </div>
        )}

        {/* Trial Days Counter */}
        {licenseInfo?.isTrial && (
          <div className="locked-trial-footer">
            <span className="trial-counter-tag">
              Trial Evaluation: {licenseInfo.trialDaysRemaining ?? 0} days remaining
            </span>
          </div>
        )}
      </motion.div>

      <style>{`
        .locked-extension-container {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          overflow-y: auto;
          user-select: none;
        }

        .locked-extension-card {
          width: 100%;
          max-width: 440px;
          padding: 28px 24px;
          border-radius: var(--radius-lg);
          background: rgba(14, 18, 28, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.18);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .locked-glow {
          position: absolute;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(50px);
          opacity: 0.35;
          z-index: 0;
        }

        .locked-glow.glow-1 {
          top: -40px;
          left: -40px;
          background: radial-gradient(circle, #BF5AF2 0%, transparent 70%);
        }

        .locked-glow.glow-2 {
          bottom: -40px;
          right: -40px;
          background: radial-gradient(circle, #0A84FF 0%, transparent 70%);
        }

        .locked-icon-shield {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          position: relative;
          z-index: 1;
        }

        .shield-ring {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(191, 90, 242, 0.25) 0%, rgba(10, 132, 255, 0.25) 100%);
          border: 1.5px solid rgba(191, 90, 242, 0.55);
          box-shadow: 0 0 24px rgba(191, 90, 242, 0.35), inset 0 0 12px rgba(255, 255, 255, 0.2);
        }

        .lock-core-icon {
          color: #BF5AF2;
          filter: drop-shadow(0 0 6px rgba(191, 90, 242, 0.6));
          animation: lockPulse 2.4s ease-in-out infinite alternate;
        }

        @keyframes lockPulse {
          0% { transform: scale(0.96); filter: drop-shadow(0 0 4px #BF5AF2); }
          100% { transform: scale(1.06); filter: drop-shadow(0 0 12px #BF5AF2); }
        }

        .pro-pill-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 999px;
          background: linear-gradient(135deg, #BF5AF2 0%, #0A84FF 100%);
          color: #FFF;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.6px;
          box-shadow: 0 0 12px rgba(191, 90, 242, 0.4);
        }

        .sparkle-icon {
          animation: sparkleSpin 3s linear infinite;
        }

        @keyframes sparkleSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .locked-title {
          font-size: 17px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 8px 0;
          letter-spacing: 0.3px;
          position: relative;
          z-index: 1;
        }

        .locked-sub-banner {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 4px;
          background: rgba(255, 69, 58, 0.12);
          border: 1px solid rgba(255, 69, 58, 0.35);
          color: #FF453A;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.4px;
          margin-bottom: 14px;
          position: relative;
          z-index: 1;
        }

        .locked-description {
          font-size: 12px;
          line-height: 1.55;
          color: var(--text-secondary);
          margin: 0 0 20px 0;
          position: relative;
          z-index: 1;
        }

        .locked-actions-row {
          width: 100%;
          display: flex;
          justify-content: center;
          margin-bottom: 18px;
          position: relative;
          z-index: 1;
        }

        .unlock-license-btn {
          width: 100%;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #0A84FF 0%, #BF5AF2 100%);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: var(--radius-md);
          color: #FFF;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.3px;
          cursor: pointer;
          box-shadow: 0 4px 18px rgba(10, 132, 255, 0.35);
          transition: all var(--transition-fast);
        }

        .unlock-license-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(191, 90, 242, 0.5);
          border-color: rgba(255, 255, 255, 0.4);
        }

        .locked-hwid-box {
          width: 100%;
          padding: 10px 12px;
          border-radius: var(--radius-md);
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 14px;
          position: relative;
          z-index: 1;
        }

        .hwid-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .hwid-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .hwid-copy-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: var(--text-secondary);
          font-size: 10px;
          cursor: pointer;
        }

        .hwid-code-pill {
          display: block;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--accent-cyan);
          background: rgba(0, 240, 255, 0.06);
          padding: 3px 6px;
          border-radius: 4px;
          word-break: break-all;
          text-align: center;
        }

        .locked-trial-footer {
          position: relative;
          z-index: 1;
        }

        .trial-counter-tag {
          font-size: 10.5px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  )
}

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Sparkles, Heart, Code2, Layers, Cpu, ShieldCheck } from 'lucide-react'
import { AppIcon } from '../Brand/AppIcon'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
  version?: string
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  version = '1.0.1',
}) => {
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-backdrop" onClick={onClose}>
          <motion.div
            className="about-modal glass-panel"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            {/* Ambient Background Glow Orbs */}
            <div className="about-glow orb-1" />
            <div className="about-glow orb-2" />

            {/* Header / Close Button */}
            <div className="about-modal-header">
              <span className="about-modal-subtitle">ABOUT APPLICATION</span>
              <button className="about-close-btn glass-interactive" onClick={onClose} title="Close (Esc)">
                <X size={14} />
              </button>
            </div>

            {/* App Branding & Tagline */}
            <div className="about-branding-section">
              <div className="about-icon-wrapper">
                <AppIcon size={48} />
              </div>
              <div className="about-title-group">
                <div className="about-app-name-row">
                  <h1 className="about-app-title">IndoctrinatedEdit</h1>
                  <span className="about-pro-badge">PRO</span>
                </div>
                <div className="about-version-row">
                  <span className="about-version-tag">v{version}</span>
                  <span className="about-build-tag">Liquid Glass Edition</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="about-description">
              The flashy, next-generation general-purpose desktop code editor for Linux & Windows,
              crafted with an authentic <strong>iOS Liquid Glass</strong> aesthetic, heavyweight Monaco core,
              multi-provider AI multi-model streaming dock, and microservice architecture.
            </p>

            {/* Author Link & Sister Projects */}
            <div className="about-cards-container">
              {/* Author Portfolio Card */}
              <a
                href="https://portfolio-flutter-78bcf.web.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="about-meta-card glass-interactive"
              >
                <div className="meta-card-left">
                  <div className="meta-icon author-icon">
                    <Heart size={16} />
                  </div>
                  <div className="meta-card-text">
                    <div className="meta-card-label">Crafted with passion by</div>
                    <div className="meta-card-value author-name">
                      indoctrinatedrecluse <Sparkles size={12} className="author-sparkle" />
                    </div>
                  </div>
                </div>
                <ExternalLink size={14} className="meta-card-arrow" />
              </a>

              {/* Sister Project Card */}
              <a
                href="https://github.com/indoctrinatedrecluse/RecluseEdit"
                target="_blank"
                rel="noopener noreferrer"
                className="about-meta-card glass-interactive"
              >
                <div className="meta-card-left">
                  <div className="meta-icon sister-icon">
                    <Code2 size={16} />
                  </div>
                  <div className="meta-card-text">
                    <div className="meta-card-label">Sister Project</div>
                    <div className="meta-card-value">RecluseEdit (WPF & .NET 10 Web Editor)</div>
                  </div>
                </div>
                <ExternalLink size={14} className="meta-card-arrow" />
              </a>
            </div>

            {/* Architecture Highlights */}
            <div className="about-tech-grid">
              <div className="tech-pill">
                <Layers size={12} />
                <span>React 19 & Monaco Editor</span>
              </div>
              <div className="tech-pill">
                <Cpu size={12} />
                <span>Multi-Model AI Streaming</span>
              </div>
              <div className="tech-pill">
                <ShieldCheck size={12} />
                <span>Process-Isolated Sandboxing</span>
              </div>
            </div>

            {/* Footer Copyright */}
            <div className="about-modal-footer">
              <span>© 2026 indoctrinatedrecluse. All rights reserved.</span>
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

              .about-modal {
                width: 100%;
                max-width: 480px;
                border-radius: var(--radius-lg);
                padding: 24px;
                position: relative;
                overflow: hidden;
                border: var(--specular-border);
                box-shadow: 0 24px 64px -12px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.22);
              }

              .about-glow {
                position: absolute;
                border-radius: 50%;
                filter: blur(60px);
                pointer-events: none;
                opacity: 0.3;
              }

              .about-glow.orb-1 {
                width: 240px;
                height: 240px;
                background: var(--accent-primary);
                top: -60px;
                right: -40px;
              }

              .about-glow.orb-2 {
                width: 200px;
                height: 200px;
                background: #BF5AF2;
                bottom: -40px;
                left: -20px;
              }

              .about-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 16px;
                position: relative;
                z-index: 2;
              }

              .about-modal-subtitle {
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.8px;
                color: var(--text-muted);
              }

              .about-close-btn {
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

              .about-branding-section {
                display: flex;
                align-items: center;
                gap: 16px;
                margin-bottom: 16px;
                position: relative;
                z-index: 2;
              }

              .about-icon-wrapper {
                filter: drop-shadow(0 0 16px var(--accent-glow));
              }

              .about-title-group {
                display: flex;
                flex-direction: column;
                gap: 4px;
              }

              .about-app-name-row {
                display: flex;
                align-items: center;
                gap: 8px;
              }

              .about-app-title {
                font-size: 20px;
                font-weight: 800;
                letter-spacing: 0.3px;
                background: linear-gradient(135deg, #FFFFFF 0%, #B8C0D0 100%);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
              }

              .about-pro-badge {
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.6px;
                padding: 2px 6px;
                border-radius: 4px;
                background: linear-gradient(135deg, var(--accent-primary) 0%, #BF5AF2 100%);
                color: #FFF;
                box-shadow: 0 0 10px rgba(10, 132, 255, 0.4);
              }

              .about-version-row {
                display: flex;
                align-items: center;
                gap: 6px;
              }

              .about-version-tag {
                font-size: 11px;
                font-weight: 600;
                color: var(--accent-cyan);
                background: rgba(100, 210, 255, 0.1);
                border: 1px solid rgba(100, 210, 255, 0.2);
                padding: 1px 6px;
                border-radius: 4px;
              }

              .about-build-tag {
                font-size: 11px;
                color: var(--text-secondary);
              }

              .about-description {
                font-size: 12.5px;
                line-height: 1.55;
                color: var(--text-secondary);
                margin-bottom: 18px;
                position: relative;
                z-index: 2;
              }

              .about-description strong {
                color: var(--text-primary);
              }

              .about-cards-container {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-bottom: 16px;
                position: relative;
                z-index: 2;
              }

              .about-meta-card {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 14px;
                border-radius: var(--radius-md);
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.08);
                text-decoration: none;
                color: inherit;
              }

              .about-meta-card:hover {
                border-color: rgba(255, 255, 255, 0.22);
                background: rgba(255, 255, 255, 0.08);
              }

              .meta-card-left {
                display: flex;
                align-items: center;
                gap: 12px;
              }

              .meta-icon {
                width: 32px;
                height: 32px;
                border-radius: var(--radius-sm);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
              }

              .meta-icon.author-icon {
                background: rgba(255, 55, 95, 0.15);
                border: 1px solid rgba(255, 55, 95, 0.3);
                color: #FF375F;
              }

              .meta-icon.sister-icon {
                background: rgba(10, 132, 255, 0.15);
                border: 1px solid rgba(10, 132, 255, 0.3);
                color: #64D2FF;
              }

              .meta-card-text {
                display: flex;
                flex-direction: column;
                gap: 2px;
              }

              .meta-card-label {
                font-size: 10px;
                color: var(--text-muted);
              }

              .meta-card-value {
                font-size: 12px;
                font-weight: 600;
                color: var(--text-primary);
              }

              .author-name {
                display: flex;
                align-items: center;
                gap: 4px;
                color: #FF7597;
              }

              .author-sparkle {
                color: #FFD60A;
              }

              .meta-card-arrow {
                color: var(--text-muted);
              }

              .about-meta-card:hover .meta-card-arrow {
                color: var(--text-primary);
              }

              .about-tech-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-bottom: 16px;
                position: relative;
                z-index: 2;
              }

              .tech-pill {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 4px 9px;
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.07);
                font-size: 10.5px;
                color: var(--text-secondary);
              }

              .about-modal-footer {
                text-align: center;
                font-size: 10.5px;
                color: var(--text-muted);
                border-top: 1px solid rgba(255, 255, 255, 0.06);
                padding-top: 12px;
                position: relative;
                z-index: 2;
              }
            `}</style>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

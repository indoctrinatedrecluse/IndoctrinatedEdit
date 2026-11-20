import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, X } from 'lucide-react'
import { AiKeyVaultWidget } from './AiKeyVaultWidget'
import './AiKeyVaultWidget.css'

export interface AiKeyVaultModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AiKeyVaultModal: React.FC<AiKeyVaultModalProps> = ({ isOpen, onClose }) => {
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
        <div className="ai-key-vault-modal-overlay" onClick={onClose}>
          <motion.div
            className="ai-key-vault-modal-dialog glass-panel"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            {/* Header */}
            <div className="ai-key-vault-modal-header">
              <div className="ai-key-vault-modal-header-left">
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(10, 132, 255, 0.15)',
                    border: '1px solid rgba(10, 132, 255, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64d2ff',
                  }}
                >
                  <Shield size={17} />
                </div>
                <div>
                  <div className="ai-key-vault-modal-header-title">
                    AI KEY &amp; ENDPOINT VAULT
                  </div>
                  <div className="ai-key-vault-modal-header-sub">
                    Manage API keys, endpoints, AES-256-GCM backups, and MCP runtime synchronization.
                  </div>
                </div>
              </div>

              <button
                className="vault-btn-icon"
                onClick={onClose}
                title="Close Vault (Esc)"
                style={{ width: 28, height: 28 }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="ai-key-vault-modal-body custom-scrollbar">
              <AiKeyVaultWidget />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default AiKeyVaultModal

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Save, Trash2, X, FolderOpen, FileCode } from 'lucide-react'
import { TabItem } from '../TabBar/TabBar'

interface UnsavedChangesModalProps {
  isOpen: boolean
  onClose: () => void
  targetFolderName?: string
  dirtyTabs: TabItem[]
  onSaveAllAndProceed: () => void
  onDiscardAndProceed: () => void
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onClose,
  targetFolderName,
  dirtyTabs,
  onSaveAllAndProceed,
  onDiscardAndProceed,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-backdrop" onClick={onClose}>
          <motion.div
            className="unsaved-modal glass-panel"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          >
            {/* Header */}
            <div className="modal-header">
              <div className="modal-title-group">
                <AlertTriangle size={17} className="warning-icon" />
                <span className="modal-title">UNSAVED CHANGES</span>
              </div>
              <button className="close-btn glass-interactive" onClick={onClose} title="Cancel (Esc)">
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body">
              <div className="prompt-text">
                You have <strong>{dirtyTabs.length}</strong> unsaved{' '}
                {dirtyTabs.length === 1 ? 'file' : 'files'}. Do you want to save changes before opening{' '}
                <span className="folder-name-tag">
                  <FolderOpen size={12} /> {targetFolderName || 'new workspace'}
                </span>
                ?
              </div>

              <div className="dirty-files-list">
                {dirtyTabs.map((tab) => (
                  <div key={tab.id} className="dirty-file-item">
                    <FileCode size={14} className="file-icon" />
                    <span className="file-name">{tab.name}</span>
                    <span className="file-badge">Unsaved</span>
                  </div>
                ))}
              </div>

              <div className="helper-note">
                Clean and unmodified files have already been closed to prepare your new workspace.
              </div>
            </div>

            {/* Footer Actions */}
            <div className="modal-footer">
              <button className="btn btn-cancel glass-interactive" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-discard glass-interactive" onClick={onDiscardAndProceed}>
                <Trash2 size={13} /> Don't Save
              </button>
              <button className="btn btn-save" onClick={onSaveAllAndProceed}>
                <Save size={13} /> Save All & Open
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
              background: rgba(4, 6, 14, 0.78);
              backdrop-filter: blur(12px);
              -webkit-backdrop-filter: blur(12px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 2500;
              padding: 20px;
            }

            .unsaved-modal {
              width: 520px;
              max-width: 95vw;
              background: rgba(16, 20, 32, 0.96);
              border: var(--specular-border);
              border-radius: var(--radius-lg);
              box-shadow: 0 24px 64px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.15);
              overflow: hidden;
              display: flex;
              flex-direction: column;
            }

            .modal-header {
              height: 44px;
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
              gap: 8px;
            }

            .warning-icon {
              color: #FF9F0A;
              filter: drop-shadow(0 0 6px rgba(255, 159, 10, 0.6));
            }

            .modal-title {
              font-size: 12.5px;
              font-weight: 700;
              letter-spacing: 0.8px;
              color: var(--text-primary);
            }

            .modal-body {
              padding: 18px 20px;
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            .prompt-text {
              font-size: 13px;
              color: var(--text-secondary);
              line-height: 1.5;
            }

            .prompt-text strong {
              color: #FFF;
            }

            .folder-name-tag {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              background: rgba(10, 132, 255, 0.15);
              color: var(--accent-cyan);
              border: 1px solid rgba(10, 132, 255, 0.3);
              padding: 1px 6px;
              border-radius: 4px;
              font-weight: 600;
              font-size: 11.5px;
            }

            .dirty-files-list {
              max-height: 160px;
              overflow-y: auto;
              background: rgba(0, 0, 0, 0.35);
              border: 1px solid rgba(255, 255, 255, 0.07);
              border-radius: var(--radius-sm);
              padding: 6px;
              display: flex;
              flex-direction: column;
              gap: 4px;
            }

            .dirty-file-item {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 6px 10px;
              border-radius: var(--radius-xs);
              background: rgba(255, 255, 255, 0.03);
            }

            .file-icon {
              color: #FF9F0A;
              flex-shrink: 0;
            }

            .file-name {
              flex: 1;
              font-size: 12px;
              color: var(--text-primary);
              font-family: var(--font-mono, monospace);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .file-badge {
              font-size: 9.5px;
              font-weight: 600;
              padding: 1px 6px;
              border-radius: 3px;
              background: rgba(255, 69, 58, 0.15);
              color: #FF453A;
              border: 1px solid rgba(255, 69, 58, 0.3);
            }

            .helper-note {
              font-size: 11px;
              color: var(--text-muted);
            }

            .modal-footer {
              height: 52px;
              padding: 0 16px;
              display: flex;
              align-items: center;
              justify-content: flex-end;
              gap: 8px;
              border-top: 1px solid rgba(255, 255, 255, 0.06);
              background: rgba(0, 0, 0, 0.25);
            }

            .btn {
              height: 32px;
              padding: 0 14px;
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 12px;
              font-weight: 600;
              border-radius: var(--radius-sm);
              cursor: pointer;
              transition: all 0.15s ease;
            }

            .btn-cancel {
              background: transparent;
              border: 1px solid rgba(255, 255, 255, 0.1);
              color: var(--text-muted);
            }

            .btn-cancel:hover {
              color: var(--text-primary);
              background: rgba(255, 255, 255, 0.05);
            }

            .btn-discard {
              background: rgba(255, 69, 58, 0.12);
              border: 1px solid rgba(255, 69, 58, 0.3);
              color: #FF453A;
            }

            .btn-discard:hover {
              background: rgba(255, 69, 58, 0.25);
              color: #FFF;
            }

            .btn-save {
              background: var(--accent-primary);
              border: none;
              color: #FFF;
              box-shadow: 0 2px 10px rgba(10, 132, 255, 0.35);
            }

            .btn-save:hover {
              filter: brightness(1.1);
              transform: translateY(-1px);
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  )
}

import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Trash2,
  ExternalLink,
  CheckCheck,
} from 'lucide-react'
import { NotificationItem } from '../../services/notificationService'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  notifications: NotificationItem[]
  onDismiss: (id: string) => void
  onDismissAll: () => void
  onMarkAllAsRead: () => void
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onDismiss,
  onDismissAll,
  onMarkAllAsRead,
}) => {
  const panelRef = useRef<HTMLDivElement>(null)

  // Mark all as read when opening
  useEffect(() => {
    if (isOpen) {
      onMarkAllAsRead()
    }
  }, [isOpen, onMarkAllAsRead])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000)
    if (diff < 30) return 'Just now'
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const renderIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'error':
        return <AlertCircle size={15} className="notif-icon-error" />
      case 'warning':
        return <AlertTriangle size={15} className="notif-icon-warning" />
      case 'success':
        return <CheckCircle2 size={15} className="notif-icon-success" />
      case 'info':
      default:
        return <Info size={15} className="notif-icon-info" />
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="notification-center-popover glass-panel"
          ref={panelRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        >
          {/* Header */}
          <div className="notif-header">
            <div className="notif-title-group">
              <Bell size={14} className="notif-bell-icon" />
              <span className="notif-title">NOTIFICATIONS</span>
              <span className="notif-count-pill">{notifications.length}</span>
            </div>

            <div className="notif-header-actions">
              {notifications.length > 0 && (
                <button
                  className="notif-action-btn dismiss-all-btn"
                  onClick={onDismissAll}
                  title="Dismiss All Notifications"
                >
                  <Trash2 size={12} />
                  <span>Dismiss All</span>
                </button>
              )}
              <button
                className="notif-action-btn close-panel-btn"
                onClick={onClose}
                title="Close (Esc)"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="notif-body">
            {notifications.length === 0 ? (
              <div className="notif-empty-state">
                <div className="empty-bell-glow">
                  <CheckCheck size={28} className="empty-check-icon" />
                </div>
                <span className="empty-title">All Caught Up</span>
                <span className="empty-desc">No pending notifications or system alerts.</span>
              </div>
            ) : (
              <div className="notif-list">
                {notifications.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`notif-card notif-${item.type} glass-interactive`}
                  >
                    <div className="notif-card-header">
                      <div className="notif-card-left">
                        {renderIcon(item.type)}
                        <span className="notif-card-title">{item.title}</span>
                      </div>
                      <div className="notif-card-right">
                        <span className="notif-card-time">{formatTime(item.timestamp)}</span>
                        <button
                          className="notif-dismiss-btn"
                          onClick={() => onDismiss(item.id)}
                          title="Dismiss notification"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>

                    <p className="notif-card-message">{item.message}</p>

                    <div className="notif-card-footer">
                      {item.source && (
                        <span className="notif-source-badge">{item.source}</span>
                      )}

                      {item.actions && item.actions.length > 0 && (
                        <div className="notif-actions-row">
                          {item.actions.map((act, idx) => (
                            <button
                              key={idx}
                              className={`notif-btn ${act.primary ? 'primary' : 'secondary'}`}
                              onClick={() => {
                                act.onClick()
                              }}
                            >
                              <span>{act.label}</span>
                              <ExternalLink size={10} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <style>{`
            .notification-center-popover {
              position: absolute;
              top: 46px;
              right: 140px;
              width: 380px;
              max-width: calc(100vw - 32px);
              max-height: 480px;
              border-radius: var(--radius-lg);
              background: rgba(14, 18, 28, 0.92);
              backdrop-filter: blur(28px);
              -webkit-backdrop-filter: blur(28px);
              border: var(--specular-border);
              box-shadow: 0 16px 48px -8px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.18);
              z-index: 1200;
              display: flex;
              flex-direction: column;
              overflow: hidden;
              user-select: none;
            }

            .notif-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 10px 14px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.08);
              background: rgba(255, 255, 255, 0.02);
            }

            .notif-title-group {
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .notif-bell-icon {
              color: var(--accent-cyan);
            }

            .notif-title {
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.6px;
              color: var(--text-primary);
            }

            .notif-count-pill {
              font-family: var(--font-mono);
              font-size: 10px;
              font-weight: 700;
              padding: 1px 6px;
              border-radius: 999px;
              background: rgba(10, 132, 255, 0.2);
              border: 1px solid rgba(10, 132, 255, 0.35);
              color: #64D2FF;
            }

            .notif-header-actions {
              display: flex;
              align-items: center;
              gap: 6px;
            }

            .notif-action-btn {
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 11px;
              font-weight: 500;
              color: var(--text-secondary);
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: var(--radius-sm);
              padding: 3px 8px;
              cursor: pointer;
              transition: all var(--transition-fast);
            }

            .notif-action-btn:hover {
              color: var(--text-primary);
              background: rgba(255, 255, 255, 0.1);
            }

            .dismiss-all-btn:hover {
              color: #FF453A;
              border-color: rgba(255, 69, 58, 0.3);
              background: rgba(255, 69, 58, 0.1);
            }

            .close-panel-btn {
              padding: 4px 6px;
            }

            .notif-body {
              padding: 10px;
              overflow-y: auto;
              max-height: 420px;
              display: flex;
              flex-direction: column;
            }

            .notif-empty-state {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 36px 16px;
              text-align: center;
            }

            .empty-bell-glow {
              width: 52px;
              height: 52px;
              border-radius: 50%;
              background: rgba(48, 209, 88, 0.12);
              border: 1px solid rgba(48, 209, 88, 0.25);
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 12px;
              box-shadow: 0 0 20px rgba(48, 209, 88, 0.2);
            }

            .empty-check-icon {
              color: #30D158;
            }

            .empty-title {
              font-size: 13px;
              font-weight: 700;
              color: var(--text-primary);
              margin-bottom: 4px;
            }

            .empty-desc {
              font-size: 11px;
              color: var(--text-muted);
            }

            .notif-list {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }

            .notif-card {
              padding: 10px 12px;
              border-radius: var(--radius-md);
              background: rgba(255, 255, 255, 0.035);
              border: 1px solid rgba(255, 255, 255, 0.08);
              display: flex;
              flex-direction: column;
              gap: 6px;
              transition: all var(--transition-fast);
            }

            .notif-card:hover {
              border-color: rgba(255, 255, 255, 0.18);
              background: rgba(255, 255, 255, 0.06);
            }

            .notif-card.notif-warning {
              border-left: 3px solid #FFD60A;
            }

            .notif-card.notif-error {
              border-left: 3px solid #FF453A;
            }

            .notif-card.notif-info {
              border-left: 3px solid #0A84FF;
            }

            .notif-card.notif-success {
              border-left: 3px solid #30D158;
            }

            .notif-card-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
            }

            .notif-card-left {
              display: flex;
              align-items: center;
              gap: 6px;
              min-width: 0;
            }

            .notif-icon-warning {
              color: #FFD60A;
              flex-shrink: 0;
            }

            .notif-icon-error {
              color: #FF453A;
              flex-shrink: 0;
            }

            .notif-icon-info {
              color: #64D2FF;
              flex-shrink: 0;
            }

            .notif-icon-success {
              color: #30D158;
              flex-shrink: 0;
            }

            .notif-card-title {
              font-size: 11.5px;
              font-weight: 700;
              color: var(--text-primary);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .notif-card-right {
              display: flex;
              align-items: center;
              gap: 6px;
              flex-shrink: 0;
            }

            .notif-card-time {
              font-size: 10px;
              color: var(--text-muted);
            }

            .notif-dismiss-btn {
              width: 20px;
              height: 20px;
              border-radius: var(--radius-xs);
              background: transparent;
              border: none;
              color: var(--text-muted);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all var(--transition-fast);
            }

            .notif-dismiss-btn:hover {
              color: var(--text-primary);
              background: rgba(255, 255, 255, 0.1);
            }

            .notif-card-message {
              font-size: 11px;
              line-height: 1.45;
              color: var(--text-secondary);
              margin: 0;
            }

            .notif-card-footer {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              margin-top: 2px;
            }

            .notif-source-badge {
              font-size: 9px;
              font-weight: 600;
              padding: 1px 5px;
              border-radius: 3px;
              background: rgba(255, 255, 255, 0.05);
              color: var(--text-muted);
            }

            .notif-actions-row {
              display: flex;
              align-items: center;
              gap: 6px;
              margin-left: auto;
            }

            .notif-btn {
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 10px;
              font-weight: 600;
              padding: 3px 8px;
              border-radius: var(--radius-xs);
              cursor: pointer;
              transition: all var(--transition-fast);
              border: 1px solid transparent;
            }

            .notif-btn.primary {
              background: rgba(10, 132, 255, 0.25);
              border-color: rgba(10, 132, 255, 0.4);
              color: #64D2FF;
            }

            .notif-btn.primary:hover {
              background: rgba(10, 132, 255, 0.4);
              box-shadow: 0 0 10px rgba(10, 132, 255, 0.3);
            }

            .notif-btn.secondary {
              background: rgba(255, 255, 255, 0.06);
              color: var(--text-primary);
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  ExternalLink,
  GitBranch,
  Terminal,
  Cpu,
  Sparkles,
} from 'lucide-react'
import {
  notificationService,
  NotificationItem,
  NotificationType,
} from '../../services/notificationService'

interface ActiveToast extends NotificationItem {
  toastKey: string
  paused?: boolean
  progress: number
}

const TOAST_LIFETIME_MS = 5500

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ActiveToast[]>([])

  useEffect(() => {
    return notificationService.onToast((notif) => {
      setToasts((prev) => {
        // Limit max concurrent visible toasts to 4
        const filtered = prev.filter((t) => t.id !== notif.id).slice(-3)
        return [
          ...filtered,
          {
            ...notif,
            toastKey: `${notif.id}-${Date.now()}`,
            progress: 100,
          },
        ]
      })
    })
  }, [])

  // Auto-dismiss countdown timer
  useEffect(() => {
    if (toasts.length === 0) return

    const interval = setInterval(() => {
      setToasts((prev) =>
        prev
          .map((t) => {
            if (t.paused) return t
            const step = (100 / (TOAST_LIFETIME_MS / 100))
            const nextProgress = Math.max(0, t.progress - step)
            return { ...t, progress: nextProgress }
          })
          .filter((t) => t.progress > 0)
      )
    }, 100)

    return () => clearInterval(interval)
  }, [toasts.length])

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const handlePause = (id: string, paused: boolean) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, paused } : t)))
  }

  const renderIcon = (type: NotificationType) => {
    switch (type) {
      case 'error':
        return <AlertCircle size={15} color="#FF453A" />
      case 'warning':
        return <AlertTriangle size={15} color="#FF9F0A" />
      case 'success':
        return <CheckCircle2 size={15} color="#30D158" />
      case 'info':
      default:
        return <Info size={15} color="#0A84FF" />
    }
  }

  const renderCategoryIcon = (category?: string) => {
    switch (category) {
      case 'git':
        return <GitBranch size={10} />
      case 'compiler':
        return <Cpu size={10} />
      case 'ai':
        return <Sparkles size={10} />
      default:
        return <Terminal size={10} />
    }
  }

  return (
    <div className="floating-toast-container" style={{ pointerEvents: 'none' }}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.toastKey}
            layout
            initial={{ opacity: 0, y: 30, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, y: 15, scale: 0.85, x: 30 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className={`toast-banner toast-${toast.type} glass-panel`}
            style={{ pointerEvents: 'auto' }}
            onMouseEnter={() => handlePause(toast.id, true)}
            onMouseLeave={() => handlePause(toast.id, false)}
          >
            <div className="toast-glow-accent" />
            <div className="toast-body">
              <div className="toast-header-row">
                <div className="toast-title-group">
                  <div className="toast-icon-wrapper">{renderIcon(toast.type)}</div>
                  <span className="toast-title">{toast.title}</span>
                  {toast.category && (
                    <span className="toast-cat-badge">
                      {renderCategoryIcon(toast.category)}
                      <span>{toast.category.toUpperCase()}</span>
                    </span>
                  )}
                </div>
                <button
                  className="toast-close-btn"
                  onClick={() => handleDismiss(toast.id)}
                  title="Dismiss toast"
                >
                  <X size={12} />
                </button>
              </div>

              <p className="toast-message">{toast.message}</p>

              {toast.actions && toast.actions.length > 0 && (
                <div className="toast-actions-row">
                  {toast.actions.map((act, idx) => (
                    <button
                      key={idx}
                      className={`toast-action-btn ${act.primary ? 'primary' : 'secondary'}`}
                      onClick={() => {
                        act.onClick()
                        handleDismiss(toast.id)
                      }}
                    >
                      <span>{act.label}</span>
                      <ExternalLink size={10} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Countdown progress bar */}
            <div className="toast-progress-track">
              <div
                className="toast-progress-bar"
                style={{
                  width: `${toast.progress}%`,
                  background:
                    toast.type === 'error'
                      ? '#FF453A'
                      : toast.type === 'warning'
                      ? '#FF9F0A'
                      : toast.type === 'success'
                      ? '#30D158'
                      : '#0A84FF',
                }}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <style>{`
        .floating-toast-container {
          position: fixed;
          bottom: 28px;
          right: 24px;
          display: flex;
          flex-direction: column-reverse;
          gap: 10px;
          z-index: 99999;
          max-width: 400px;
          width: calc(100vw - 48px);
        }

        .toast-banner {
          position: relative;
          border-radius: var(--radius-md, 12px);
          background: rgba(14, 18, 28, 0.94);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          border: var(--specular-border, 1px solid rgba(255, 255, 255, 0.14));
          box-shadow: 0 16px 40px -10px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          overflow: hidden;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .toast-banner:hover {
          transform: translateY(-2px);
        }

        .toast-glow-accent {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: 3.5px;
        }

        .toast-error .toast-glow-accent {
          background: #FF453A;
          box-shadow: 0 0 12px rgba(255, 69, 58, 0.6);
        }
        .toast-warning .toast-glow-accent {
          background: #FF9F0A;
          box-shadow: 0 0 12px rgba(255, 159, 10, 0.6);
        }
        .toast-success .toast-glow-accent {
          background: #30D158;
          box-shadow: 0 0 12px rgba(48, 209, 88, 0.6);
        }
        .toast-info .toast-glow-accent {
          background: #0A84FF;
          box-shadow: 0 0 12px rgba(10, 132, 255, 0.6);
        }

        .toast-body {
          padding: 12px 14px 10px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .toast-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .toast-title-group {
          display: flex;
          align-items: center;
          gap: 7px;
          flex: 1;
          overflow: hidden;
        }

        .toast-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .toast-title {
          font-size: 11.5px;
          font-weight: 700;
          color: #F8FAFC;
          letter-spacing: 0.2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .toast-cat-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 1px 5px;
          border-radius: 999px;
          font-size: 8.5px;
          font-weight: 700;
          font-family: var(--font-mono, monospace);
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #CBD5E1;
        }

        .toast-close-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.45);
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .toast-close-btn:hover {
          color: #FFF;
          background: rgba(255, 255, 255, 0.1);
        }

        .toast-message {
          font-size: 11px;
          line-height: 1.45;
          color: #94A3B8;
          margin: 0;
          word-break: break-word;
        }

        .toast-actions-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
        }

        .toast-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 10.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          border: none;
        }

        .toast-action-btn.primary {
          background: linear-gradient(135deg, #0A84FF, #5E5CE6);
          color: #FFF;
          box-shadow: 0 2px 8px rgba(10, 132, 255, 0.35);
        }
        .toast-action-btn.primary:hover {
          background: linear-gradient(135deg, #0070E0, #4A48C8);
          box-shadow: 0 4px 12px rgba(10, 132, 255, 0.5);
        }

        .toast-action-btn.secondary {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #E2E8F0;
        }
        .toast-action-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #FFF;
        }

        .toast-progress-track {
          width: 100%;
          height: 2px;
          background: rgba(255, 255, 255, 0.06);
        }

        .toast-progress-bar {
          height: 100%;
          transition: width 0.1s linear;
        }
      `}</style>
    </div>
  )
}

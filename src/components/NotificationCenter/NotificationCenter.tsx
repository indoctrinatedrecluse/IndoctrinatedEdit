import React, { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Trash2,
  ExternalLink,
  CheckCheck,
  Search,
  Copy,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Cpu,
  Sparkles,
  Terminal,
} from 'lucide-react'
import {
  notificationService,
  NotificationItem,
} from '../../services/notificationService'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  notifications: NotificationItem[]
  onDismiss: (id: string) => void
  onDismissAll: () => void
  onMarkAllAsRead: () => void
}

type FilterCategory = 'all' | 'unread' | 'errors' | 'git' | 'compiler'

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onDismiss,
  onDismissAll,
  onMarkAllAsRead,
}) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(() => notificationService.isSoundEnabled())
  const [dndEnabled, setDndEnabled] = useState(() => notificationService.isDndEnabled())

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

  const toggleSound = () => {
    const next = !soundEnabled
    notificationService.setSoundEnabled(next)
    setSoundEnabled(next)
  }

  const toggleDnd = () => {
    const next = !dndEnabled
    notificationService.setDndEnabled(next)
    setDndEnabled(next)
  }

  const toggleDetails = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const copyDetails = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 2000)
    } catch {}
  }

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Category filter
      if (filterCategory === 'unread' && item.read) return false
      if (filterCategory === 'errors' && item.type !== 'error' && item.type !== 'warning') return false
      if (filterCategory === 'git' && item.category !== 'git' && !item.source?.toLowerCase().includes('git')) return false
      if (filterCategory === 'compiler' && item.category !== 'compiler' && !item.source?.toLowerCase().includes('compiler') && !item.source?.toLowerCase().includes('toolchain')) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = item.title.toLowerCase().includes(q)
        const matchMsg = item.message.toLowerCase().includes(q)
        const matchSource = (item.source || '').toLowerCase().includes(q)
        const matchDetails = (item.details || '').toLowerCase().includes(q)
        if (!matchTitle && !matchMsg && !matchSource && !matchDetails) return false
      }

      return true
    })
  }, [notifications, filterCategory, searchQuery])

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

  const renderCategoryIcon = (category?: string) => {
    switch (category) {
      case 'git':
        return <GitBranch size={9} />
      case 'compiler':
        return <Cpu size={9} />
      case 'ai':
        return <Sparkles size={9} />
      default:
        return <Terminal size={9} />
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const errorCount = notifications.filter((n) => n.type === 'error' || n.type === 'warning').length

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
              {unreadCount > 0 && <span className="notif-unread-pill">{unreadCount} new</span>}
            </div>

            <div className="notif-header-actions">
              <button
                className={`notif-action-btn ${!soundEnabled ? 'active-mute' : ''}`}
                onClick={toggleSound}
                title={soundEnabled ? 'Mute Chime Sound' : 'Enable Chime Sound'}
              >
                {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} color="#FF9F0A" />}
              </button>

              <button
                className={`notif-action-btn ${dndEnabled ? 'active-dnd' : ''}`}
                onClick={toggleDnd}
                title={dndEnabled ? 'Do Not Disturb: Active' : 'Enable Do Not Disturb'}
              >
                {dndEnabled ? <BellOff size={12} color="#FF453A" /> : <Bell size={12} />}
              </button>

              {unreadCount > 0 && (
                <button
                  className="notif-action-btn"
                  onClick={onMarkAllAsRead}
                  title="Mark All as Read"
                >
                  <CheckCheck size={12} />
                  <span>Read</span>
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  className="notif-action-btn dismiss-all-btn"
                  onClick={onDismissAll}
                  title="Dismiss All Notifications"
                >
                  <Trash2 size={12} />
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

          {/* Search & Category Filter Toolbar */}
          <div className="notif-toolbar">
            <div className="notif-search-box glass-input">
              <Search size={11} className="search-icon" />
              <input
                type="text"
                placeholder="Search alerts & logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
                  <X size={10} />
                </button>
              )}
            </div>

            <div className="notif-tabs-row">
              <button
                className={`notif-tab ${filterCategory === 'all' ? 'active' : ''}`}
                onClick={() => setFilterCategory('all')}
              >
                All
              </button>
              <button
                className={`notif-tab ${filterCategory === 'unread' ? 'active' : ''}`}
                onClick={() => setFilterCategory('unread')}
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </button>
              <button
                className={`notif-tab ${filterCategory === 'errors' ? 'active' : ''}`}
                onClick={() => setFilterCategory('errors')}
              >
                Errors & Warnings {errorCount > 0 && `(${errorCount})`}
              </button>
              <button
                className={`notif-tab ${filterCategory === 'git' ? 'active' : ''}`}
                onClick={() => setFilterCategory('git')}
              >
                Git & CI
              </button>
              <button
                className={`notif-tab ${filterCategory === 'compiler' ? 'active' : ''}`}
                onClick={() => setFilterCategory('compiler')}
              >
                Compilers
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="notif-body custom-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="notif-empty-state">
                <div className="empty-bell-glow">
                  <CheckCheck size={28} className="empty-check-icon" />
                </div>
                <span className="empty-title">
                  {searchQuery ? 'No Matching Notifications' : 'All Caught Up'}
                </span>
                <span className="empty-desc">
                  {searchQuery
                    ? `No notification matched "${searchQuery}".`
                    : 'No pending alerts, issues, or background warnings.'}
                </span>
              </div>
            ) : (
              <div className="notif-list">
                {filteredNotifications.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`notif-card notif-${item.type} ${!item.read ? 'is-unread' : ''} glass-interactive`}
                  >
                    <div className="notif-card-header">
                      <div className="notif-card-left">
                        {renderIcon(item.type)}
                        <span className="notif-card-title">{item.title}</span>
                        {item.category && (
                          <span className="notif-cat-chip">
                            {renderCategoryIcon(item.category)}
                            <span>{item.category.toUpperCase()}</span>
                          </span>
                        )}
                        {!item.read && <span className="unread-dot" />}
                      </div>
                      <div className="notif-card-right">
                        <span className="notif-card-time" title={new Date(item.timestamp).toLocaleString()}>
                          {formatTime(item.timestamp)}
                        </span>
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

                    {/* Expandable Technical Details Drawer */}
                    {item.details && (
                      <div className="notif-details-container">
                        <button
                          className="notif-toggle-details-btn"
                          onClick={() => toggleDetails(item.id)}
                        >
                          {expandedDetails[item.id] ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                          <span>{expandedDetails[item.id] ? 'Hide Details' : 'Show Error Stack / Logs'}</span>
                        </button>
                        {expandedDetails[item.id] && (
                          <div className="notif-details-content glass-panel">
                            <div className="details-header">
                              <span>DIAGNOSTIC OUTPUT</span>
                              <button
                                className="copy-details-btn"
                                onClick={() => copyDetails(item.id, item.details!)}
                                title="Copy technical details"
                              >
                                <Copy size={10} />
                                <span>{copiedId === item.id ? 'Copied!' : 'Copy'}</span>
                              </button>
                            </div>
                            <pre className="details-pre custom-scrollbar">{item.details}</pre>
                          </div>
                        )}
                      </div>
                    )}

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
              width: 440px;
              max-width: calc(100vw - 32px);
              max-height: 560px;
              border-radius: var(--radius-lg, 14px);
              background: rgba(14, 18, 28, 0.94);
              backdrop-filter: blur(32px);
              -webkit-backdrop-filter: blur(32px);
              border: var(--specular-border, 1px solid rgba(255, 255, 255, 0.14));
              box-shadow: 0 20px 56px -10px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.2);
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
              color: var(--accent-cyan, #00F0FF);
            }

            .notif-title {
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.6px;
              color: var(--text-primary, #F8FAFC);
            }

            .notif-count-pill {
              font-family: var(--font-mono, monospace);
              font-size: 9.5px;
              font-weight: 700;
              padding: 1px 6px;
              border-radius: 999px;
              background: rgba(255, 255, 255, 0.08);
              border: 1px solid rgba(255, 255, 255, 0.12);
              color: #CBD5E1;
            }

            .notif-unread-pill {
              font-family: var(--font-mono, monospace);
              font-size: 9.5px;
              font-weight: 700;
              padding: 1px 6px;
              border-radius: 999px;
              background: rgba(10, 132, 255, 0.2);
              border: 1px solid rgba(10, 132, 255, 0.4);
              color: #64D2FF;
            }

            .notif-header-actions {
              display: flex;
              align-items: center;
              gap: 5px;
            }

            .notif-action-btn {
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 10.5px;
              font-weight: 500;
              color: var(--text-secondary, #94A3B8);
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: var(--radius-sm, 6px);
              padding: 3px 7px;
              cursor: pointer;
              transition: all var(--transition-fast, 0.15s ease);
            }

            .notif-action-btn:hover {
              color: var(--text-primary, #FFF);
              background: rgba(255, 255, 255, 0.12);
            }

            .notif-action-btn.active-mute {
              background: rgba(255, 159, 10, 0.15);
              border-color: rgba(255, 159, 10, 0.35);
            }

            .notif-action-btn.active-dnd {
              background: rgba(255, 69, 58, 0.15);
              border-color: rgba(255, 69, 58, 0.35);
            }

            .dismiss-all-btn:hover {
              color: #FF453A;
              border-color: rgba(255, 69, 58, 0.3);
              background: rgba(255, 69, 58, 0.1);
            }

            .close-panel-btn {
              padding: 4px 6px;
            }

            .notif-toolbar {
              display: flex;
              flex-direction: column;
              gap: 6px;
              padding: 8px 12px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.06);
              background: rgba(0, 0, 0, 0.15);
            }

            .notif-search-box {
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 4px 8px;
              border-radius: 6px;
              background: rgba(255, 255, 255, 0.04);
              border: 1px solid rgba(255, 255, 255, 0.08);
            }

            .notif-search-box input {
              background: transparent;
              border: none;
              outline: none;
              color: #E2E8F0;
              font-size: 11px;
              flex: 1;
            }

            .search-icon {
              color: rgba(255, 255, 255, 0.4);
            }

            .search-clear-btn {
              background: transparent;
              border: none;
              color: rgba(255, 255, 255, 0.4);
              cursor: pointer;
              display: flex;
              align-items: center;
              padding: 2px;
            }

            .notif-tabs-row {
              display: flex;
              align-items: center;
              gap: 4px;
              overflow-x: auto;
            }

            .notif-tab {
              background: transparent;
              border: none;
              color: #94A3B8;
              font-size: 10.5px;
              font-weight: 500;
              padding: 3px 7px;
              border-radius: 5px;
              cursor: pointer;
              white-space: nowrap;
              transition: all 0.15s ease;
            }

            .notif-tab:hover {
              color: #FFF;
              background: rgba(255, 255, 255, 0.05);
            }

            .notif-tab.active {
              color: #FFF;
              background: rgba(10, 132, 255, 0.22);
              border: 1px solid rgba(10, 132, 255, 0.35);
              font-weight: 600;
            }

            .notif-body {
              padding: 10px;
              overflow-y: auto;
              max-height: 440px;
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
              gap: 8px;
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
              margin-bottom: 4px;
            }

            .empty-check-icon {
              color: #30D158;
            }

            .empty-title {
              font-size: 13px;
              font-weight: 600;
              color: #F8FAFC;
            }

            .empty-desc {
              font-size: 11px;
              color: #64748B;
              max-width: 240px;
              line-height: 1.4;
            }

            .notif-list {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }

            .notif-card {
              position: relative;
              padding: 10px 12px;
              border-radius: var(--radius-md, 10px);
              background: rgba(255, 255, 255, 0.025);
              border: 1px solid rgba(255, 255, 255, 0.06);
              display: flex;
              flex-direction: column;
              gap: 5px;
              transition: all var(--transition-fast, 0.15s ease);
            }

            .notif-card.is-unread {
              background: rgba(10, 132, 255, 0.05);
              border-color: rgba(10, 132, 255, 0.22);
            }

            .notif-card:hover {
              background: rgba(255, 255, 255, 0.05);
              border-color: rgba(255, 255, 255, 0.12);
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
              flex: 1;
              overflow: hidden;
            }

            .notif-icon-error { color: #FF453A; }
            .notif-icon-warning { color: #FF9F0A; }
            .notif-icon-success { color: #30D158; }
            .notif-icon-info { color: #0A84FF; }

            .notif-card-title {
              font-size: 11.5px;
              font-weight: 600;
              color: #F1F5F9;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .notif-cat-chip {
              display: inline-flex;
              align-items: center;
              gap: 3px;
              padding: 1px 5px;
              border-radius: 999px;
              font-size: 8px;
              font-weight: 700;
              font-family: var(--font-mono, monospace);
              background: rgba(255, 255, 255, 0.06);
              border: 1px solid rgba(255, 255, 255, 0.1);
              color: #94A3B8;
            }

            .unread-dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: #0A84FF;
              box-shadow: 0 0 6px #0A84FF;
              flex-shrink: 0;
            }

            .notif-card-right {
              display: flex;
              align-items: center;
              gap: 6px;
              flex-shrink: 0;
            }

            .notif-card-time {
              font-size: 10px;
              color: #64748B;
              font-family: var(--font-mono, monospace);
            }

            .notif-dismiss-btn {
              background: transparent;
              border: none;
              color: rgba(255, 255, 255, 0.35);
              cursor: pointer;
              padding: 2px;
              border-radius: 4px;
              display: flex;
              align-items: center;
            }

            .notif-dismiss-btn:hover {
              color: #FF453A;
              background: rgba(255, 69, 58, 0.1);
            }

            .notif-card-message {
              font-size: 11px;
              line-height: 1.45;
              color: #94A3B8;
              margin: 0;
              word-break: break-word;
            }

            .notif-details-container {
              margin-top: 3px;
            }

            .notif-toggle-details-btn {
              background: transparent;
              border: none;
              color: #64D2FF;
              font-size: 10px;
              font-weight: 500;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 4px;
              padding: 2px 0;
            }

            .notif-toggle-details-btn:hover {
              text-decoration: underline;
            }

            .notif-details-content {
              margin-top: 4px;
              padding: 6px 8px;
              border-radius: 6px;
              background: rgba(0, 0, 0, 0.35);
              border: 1px solid rgba(255, 255, 255, 0.08);
            }

            .details-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              font-size: 9px;
              font-weight: 700;
              color: #64748B;
              margin-bottom: 4px;
            }

            .copy-details-btn {
              background: rgba(255, 255, 255, 0.06);
              border: 1px solid rgba(255, 255, 255, 0.1);
              color: #CBD5E1;
              border-radius: 4px;
              padding: 1px 5px;
              font-size: 9.5px;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 3px;
            }

            .copy-details-btn:hover {
              background: rgba(255, 255, 255, 0.12);
              color: #FFF;
            }

            .details-pre {
              font-size: 10px;
              font-family: var(--font-mono, monospace);
              color: #F87171;
              margin: 0;
              white-space: pre-wrap;
              word-break: break-all;
              max-height: 120px;
              overflow-y: auto;
            }

            .notif-card-footer {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-top: 4px;
              flex-wrap: wrap;
              gap: 6px;
            }

            .notif-source-badge {
              font-size: 9.5px;
              font-weight: 500;
              color: #64748B;
              background: rgba(255, 255, 255, 0.04);
              padding: 2px 6px;
              border-radius: 4px;
              border: 1px solid rgba(255, 255, 255, 0.06);
            }

            .notif-actions-row {
              display: flex;
              align-items: center;
              gap: 6px;
            }

            .notif-btn {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              padding: 3px 8px;
              border-radius: 5px;
              font-size: 10px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.15s ease;
              border: none;
            }

            .notif-btn.primary {
              background: linear-gradient(135deg, #0A84FF, #5E5CE6);
              color: #FFF;
            }

            .notif-btn.primary:hover {
              background: linear-gradient(135deg, #0070E0, #4A48C8);
            }

            .notif-btn.secondary {
              background: rgba(255, 255, 255, 0.08);
              border: 1px solid rgba(255, 255, 255, 0.12);
              color: #E2E8F0;
            }

            .notif-btn.secondary:hover {
              background: rgba(255, 255, 255, 0.15);
              color: #FFF;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

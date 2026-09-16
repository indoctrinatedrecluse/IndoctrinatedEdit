import React, { useState, useEffect, useRef } from 'react'
import {
  FileCode,
  FolderOpen,
  Save,
  FilePlus,
  XCircle,
  LogOut,
  Terminal,
  Files,
  GitBranch,
  Search,
  Bot,
  PanelLeft,
  Settings,
  Sparkles,
  KeyRound,
  Info,
  Bell,
  Keyboard,
  Database,
} from 'lucide-react'

export interface MenuActionHandlers {
  onNewFile?: () => void
  onOpenFile?: () => void
  onOpenFolder?: () => void
  onSaveFile?: () => void
  onSaveFileAs?: () => void
  onCloseTab?: () => void
  onExit?: () => void
  onCommandPalette?: () => void
  onQuickOpen?: () => void
  onShowExplorer?: () => void
  onShowGitGraph?: () => void
  onShowSearch?: () => void
  onToggleAi?: () => void
  onToggleSidebar?: () => void
  onOpenSettings?: () => void
  onToggleNotifications?: () => void
  onWelcomeGuide?: () => void
  onOpenShortcuts?: () => void
  onOpenLicense?: () => void
  onOpenAbout?: () => void
  onToggleTerminal?: () => void
  onOpenTerminalConfig?: () => void
  onOpenProblems?: () => void
  onToggleDatabase?: () => void
}

interface MenuItem {
  id: string
  label: string
  shortcut?: string
  icon?: React.ReactNode
  isSeparator?: boolean
  onClick?: () => void
  disabled?: boolean
}

interface MenuDefinition {
  id: string
  label: string
  items: MenuItem[]
}

interface MenuBarProps {
  handlers: MenuActionHandlers
}

export const MenuBar: React.FC<MenuBarProps> = ({ handlers }) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)

  const menus: MenuDefinition[] = [
    {
      id: 'file',
      label: 'File',
      items: [
        {
          id: 'file.new',
          label: 'New Text File',
          shortcut: 'Ctrl+N',
          icon: <FilePlus size={14} />,
          onClick: handlers.onNewFile,
        },
        {
          id: 'file.open',
          label: 'Open File...',
          shortcut: 'Ctrl+O',
          icon: <FileCode size={14} />,
          onClick: handlers.onOpenFile,
        },
        {
          id: 'file.openFolder',
          label: 'Open Folder...',
          shortcut: 'Ctrl+K Ctrl+O',
          icon: <FolderOpen size={14} />,
          onClick: handlers.onOpenFolder,
        },
        { id: 'sep1', label: '', isSeparator: true },
        {
          id: 'file.save',
          label: 'Save',
          shortcut: 'Ctrl+S',
          icon: <Save size={14} />,
          onClick: handlers.onSaveFile,
        },
        {
          id: 'file.saveAs',
          label: 'Save As...',
          shortcut: 'Ctrl+Shift+S',
          icon: <Save size={14} />,
          onClick: handlers.onSaveFileAs,
        },
        { id: 'sep2', label: '', isSeparator: true },
        {
          id: 'file.close',
          label: 'Close Editor Tab',
          shortcut: 'Ctrl+W',
          icon: <XCircle size={14} />,
          onClick: handlers.onCloseTab,
        },
        { id: 'sep3', label: '', isSeparator: true },
        {
          id: 'file.exit',
          label: 'Exit',
          shortcut: 'Alt+F4',
          icon: <LogOut size={14} />,
          onClick: handlers.onExit || (() => window.electronAPI?.close?.()),
        },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        {
          id: 'view.commandPalette',
          label: 'Command Palette...',
          shortcut: 'Ctrl+Shift+P',
          icon: <Terminal size={14} />,
          onClick: handlers.onCommandPalette,
        },
        {
          id: 'view.quickOpen',
          label: 'Quick Open File...',
          shortcut: 'Ctrl+P',
          icon: <Search size={14} />,
          onClick: handlers.onQuickOpen,
        },
        { id: 'sep4', label: '', isSeparator: true },
        {
          id: 'view.explorer',
          label: 'Explorer',
          shortcut: 'Ctrl+Shift+E',
          icon: <Files size={14} />,
          onClick: handlers.onShowExplorer,
        },
        {
          id: 'view.git',
          label: 'Source Control & Git Graph',
          shortcut: 'Ctrl+Shift+G',
          icon: <GitBranch size={14} />,
          onClick: handlers.onShowGitGraph,
        },
        {
          id: 'view.search',
          label: 'Search in Workspace',
          shortcut: 'Ctrl+Shift+F',
          icon: <Search size={14} />,
          onClick: handlers.onShowSearch,
        },
        {
          id: 'view.ai',
          label: 'AI Multi-Model Assistant',
          shortcut: 'Ctrl+Alt+A',
          icon: <Bot size={14} />,
          onClick: handlers.onToggleAi,
        },
        {
          id: 'view.database',
          label: 'Database Studio (SQL Runner)',
          icon: <Database size={14} />,
          onClick: handlers.onToggleDatabase,
        },
        { id: 'sep5', label: '', isSeparator: true },
        {
          id: 'view.terminal',
          label: 'Integrated Terminal',
          shortcut: 'Ctrl+`',
          icon: <Terminal size={14} />,
          onClick: handlers.onToggleTerminal,
        },
        {
          id: 'view.problems',
          label: 'Problems Panel',
          icon: <Info size={14} />,
          onClick: handlers.onOpenProblems,
        },
        { id: 'sep5b', label: '', isSeparator: true },
        {
          id: 'view.toggleSidebar',
          label: 'Toggle Primary Sidebar',
          shortcut: 'Ctrl+B',
          icon: <PanelLeft size={14} />,
          onClick: handlers.onToggleSidebar,
        },
        {
          id: 'view.notifications',
          label: 'Notifications & Alerts',
          shortcut: 'Ctrl+Shift+N',
          icon: <Bell size={14} />,
          onClick: handlers.onToggleNotifications,
        },
        { id: 'sep6', label: '', isSeparator: true },
        {
          id: 'view.settings',
          label: 'Preferences / Settings',
          shortcut: 'Ctrl+,',
          icon: <Settings size={14} />,
          onClick: handlers.onOpenSettings,
        },
      ],
    },
    {
      id: 'terminal',
      label: 'Terminal',
      items: [
        {
          id: 'terminal.new',
          label: 'New Terminal',
          shortcut: 'Ctrl+`',
          icon: <Terminal size={14} />,
          onClick: handlers.onToggleTerminal,
        },
        {
          id: 'terminal.config',
          label: 'Configure Terminal (JSON)...',
          icon: <Settings size={14} />,
          onClick: handlers.onOpenTerminalConfig,
        },
      ],
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        {
          id: 'help.welcome',
          label: 'Welcome & Getting Started',
          icon: <Sparkles size={14} />,
          onClick: handlers.onWelcomeGuide,
        },
        {
          id: 'help.shortcuts',
          label: 'Keyboard Shortcuts',
          shortcut: 'Ctrl+K Ctrl+S',
          icon: <Keyboard size={14} />,
          onClick: handlers.onOpenShortcuts,
        },
        { id: 'sep7', label: '', isSeparator: true },
        {
          id: 'help.license',
          label: 'License & Subscription...',
          icon: <KeyRound size={14} />,
          onClick: handlers.onOpenLicense,
        },
        {
          id: 'help.about',
          label: 'About IndoctrinatedEdit',
          icon: <Info size={14} />,
          onClick: handlers.onOpenAbout,
        },
      ],
    },
  ]

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenuId(null)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeMenuId !== null) {
        setActiveMenuId(null)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeMenuId])

  const handleMenuTriggerClick = (menuId: string) => {
    setActiveMenuId((prev) => (prev === menuId ? null : menuId))
  }

  const handleMenuTriggerMouseEnter = (menuId: string) => {
    if (activeMenuId !== null && activeMenuId !== menuId) {
      setActiveMenuId(menuId)
    }
  }

  const handleItemClick = (item: MenuItem) => {
    if (item.disabled || item.isSeparator) return
    setActiveMenuId(null)
    item.onClick?.()
  }

  return (
    <nav className="menu-bar" ref={menuBarRef} aria-label="Main Menu">
      {menus.map((menu) => {
        const isOpen = activeMenuId === menu.id
        return (
          <div key={menu.id} className="menu-group">
            <button
              className={`menu-trigger ${isOpen ? 'active' : ''}`}
              onClick={() => handleMenuTriggerClick(menu.id)}
              onMouseEnter={() => handleMenuTriggerMouseEnter(menu.id)}
              aria-haspopup="true"
              aria-expanded={isOpen}
            >
              {menu.label}
            </button>

            {isOpen && (
              <div className="menu-dropdown glass-panel">
                {menu.items.map((item, idx) => {
                  if (item.isSeparator) {
                    return <div key={`sep-${idx}`} className="menu-separator" />
                  }

                  return (
                    <button
                      key={item.id}
                      className={`menu-item ${item.disabled ? 'disabled' : ''}`}
                      onClick={() => handleItemClick(item)}
                      disabled={item.disabled}
                    >
                      <span className="menu-item-icon">{item.icon}</span>
                      <span className="menu-item-label">{item.label}</span>
                      {item.shortcut && (
                        <span className="menu-item-shortcut">{item.shortcut}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      <style>{`
        .menu-bar {
          display: flex;
          align-items: center;
          gap: 2px;
          height: 28px;
          -webkit-app-region: no-drag !important;
          user-select: none;
          position: relative;
          z-index: 1005;
        }

        .menu-group {
          position: relative;
        }

        .menu-trigger {
          height: 24px;
          padding: 0 8px;
          font-size: 11.5px;
          font-weight: 500;
          color: var(--text-secondary);
          background: transparent;
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all var(--transition-fast);
        }

        .menu-trigger:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.08);
        }

        .menu-trigger.active {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.15);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .menu-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          min-width: 240px;
          padding: 5px;
          border-radius: var(--radius-md);
          background: rgba(14, 18, 28, 0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: var(--specular-border);
          box-shadow: 0 12px 36px -4px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15);
          z-index: 1010;
          display: flex;
          flex-direction: column;
          gap: 1px;
          animation: menuFadeIn 0.12s ease-out;
        }

        @keyframes menuFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 9px;
          width: 100%;
          height: 28px;
          padding: 0 8px;
          font-size: 11.5px;
          font-weight: 500;
          color: var(--text-secondary);
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          text-align: left;
          transition: all var(--transition-fast);
        }

        .menu-item:hover:not(.disabled) {
          color: var(--text-primary);
          background: linear-gradient(90deg, rgba(10, 132, 255, 0.25) 0%, rgba(10, 132, 255, 0.12) 100%);
        }

        .menu-item.disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .menu-item-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .menu-item:hover:not(.disabled) .menu-item-icon {
          color: var(--accent-primary);
        }

        .menu-item-label {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .menu-item-shortcut {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--text-muted);
          margin-left: 16px;
          flex-shrink: 0;
        }

        .menu-item:hover:not(.disabled) .menu-item-shortcut {
          color: var(--text-secondary);
        }

        .menu-separator {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 4px 6px;
        }
      `}</style>
    </nav>
  )
}

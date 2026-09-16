import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Keyboard,
  Search,
  X,
  Sparkles,
  Command,
  FileCode,
  Compass,
  Eye,
  Bot,
  GitBranch,
  Play,
  Check,
  Bug,
} from 'lucide-react'

export interface ShortcutEntry {
  id: string
  title: string
  category: 'General' | 'File' | 'Edit' | 'Navigation' | 'View' | 'AI' | 'Git' | 'Debug'
  keys: string[]
  description: string
  actionId?: string
  onExecute?: () => void
}

interface ShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
  onExecuteCommand?: (commandId: string) => void
}

const SHORTCUT_DATABASE: Omit<ShortcutEntry, 'onExecute'>[] = [
  // General & Navigation
  {
    id: 'gen.palette',
    title: 'Command Palette',
    category: 'General',
    keys: ['Ctrl', 'Shift', 'P'],
    description: 'Open the universal command and action launcher',
    actionId: 'view.commandPalette',
  },
  {
    id: 'gen.palette.f1',
    title: 'Command Palette (Alternative)',
    category: 'General',
    keys: ['F1'],
    description: 'Quick launcher for all editor commands and actions',
    actionId: 'view.commandPalette',
  },
  {
    id: 'gen.shortcuts',
    title: 'Keyboard Shortcuts Reference',
    category: 'General',
    keys: ['Ctrl', 'K', 'Ctrl', 'S'],
    description: 'Show this interactive keyboard shortcuts modal',
    actionId: 'help.shortcuts',
  },
  {
    id: 'gen.settings',
    title: 'Open Preferences / Settings',
    category: 'General',
    keys: ['Ctrl', ','],
    description: 'Customize editor, theme, and font configurations',
    actionId: 'view.settings',
  },
  {
    id: 'gen.notifications',
    title: 'Notifications & Alerts',
    category: 'General',
    keys: ['Ctrl', 'Shift', 'N'],
    description: 'Open the notification drawer and toolchain log feed',
    actionId: 'view.notifications',
  },

  // File & Workspace
  {
    id: 'file.new',
    title: 'New Untitled File',
    category: 'File',
    keys: ['Ctrl', 'N'],
    description: 'Create a new buffer in the current workspace',
    actionId: 'file.new',
  },
  {
    id: 'file.open',
    title: 'Open File...',
    category: 'File',
    keys: ['Ctrl', 'O'],
    description: 'Open a local file from disk',
    actionId: 'file.open',
  },
  {
    id: 'file.openFolder',
    title: 'Open Folder / Workspace...',
    category: 'File',
    keys: ['Ctrl', 'K', 'Ctrl', 'O'],
    description: 'Open a directory tree in the primary file explorer',
    actionId: 'file.openFolder',
  },
  {
    id: 'file.save',
    title: 'Save File',
    category: 'File',
    keys: ['Ctrl', 'S'],
    description: 'Save changes to the active document',
    actionId: 'file.save',
  },
  {
    id: 'file.saveAs',
    title: 'Save File As...',
    category: 'File',
    keys: ['Ctrl', 'Shift', 'S'],
    description: 'Save current buffer to a new path or file name',
    actionId: 'file.saveAs',
  },
  {
    id: 'file.closeTab',
    title: 'Close Active Tab',
    category: 'File',
    keys: ['Ctrl', 'W'],
    description: 'Close the current editor tab',
    actionId: 'file.close',
  },

  // Navigation & Search
  {
    id: 'nav.quickOpen',
    title: 'Quick Open File',
    category: 'Navigation',
    keys: ['Ctrl', 'P'],
    description: 'Fuzzy search and jump to any file in workspace',
    actionId: 'view.quickOpen',
  },
  {
    id: 'nav.gotoLine',
    title: 'Go to Line / Column',
    category: 'Navigation',
    keys: ['Ctrl', 'G'],
    description: 'Jump directly to line number (:line:col in palette)',
    actionId: 'edit.gotoLine',
  },
  {
    id: 'nav.symbols',
    title: 'Go to Symbol in File',
    category: 'Navigation',
    keys: ['Ctrl', 'Shift', 'O'],
    description: 'Outline symbol search (@ in command palette)',
    actionId: 'edit.symbols',
  },
  {
    id: 'nav.workspaceSymbols',
    title: 'Go to Symbol in Workspace',
    category: 'Navigation',
    keys: ['Ctrl', 'T'],
    description: 'Global symbol and feature search (# in command palette)',
    actionId: 'edit.workspaceSymbols',
  },
  {
    id: 'nav.globalSearch',
    title: 'Search in Workspace',
    category: 'Navigation',
    keys: ['Ctrl', 'Shift', 'F'],
    description: 'Find text patterns across all project files',
    actionId: 'view.search',
  },

  // Editing & Code
  {
    id: 'edit.format',
    title: 'Format Document',
    category: 'Edit',
    keys: ['Shift', 'Alt', 'F'],
    description: 'Format active buffer using language formatter or Prettier',
    actionId: 'edit.format',
  },
  {
    id: 'edit.find',
    title: 'Find in Active Buffer',
    category: 'Edit',
    keys: ['Ctrl', 'F'],
    description: 'Open in-editor find overlay',
    actionId: 'edit.find',
  },
  {
    id: 'edit.findAll',
    title: 'Find All Matches',
    category: 'Edit',
    keys: ['Alt', 'Enter'],
    description: 'Find and select all matching occurrences in active buffer',
    actionId: 'edit.findAll',
  },
  {
    id: 'edit.replace',
    title: 'Replace in Active Buffer',
    category: 'Edit',
    keys: ['Ctrl', 'H'],
    description: 'Open in-editor find and replace overlay',
    actionId: 'edit.replace',
  },
  {
    id: 'edit.replaceAll',
    title: 'Replace All Matches',
    category: 'Edit',
    keys: ['Ctrl', 'Alt', 'Enter'],
    description: 'Batch replace all matching occurrences in the active document',
    actionId: 'edit.replaceAll',
  },
  {
    id: 'edit.nextMatch',
    title: 'Add Selection to Next Find Match',
    category: 'Edit',
    keys: ['Ctrl', 'D'],
    description: 'Add the next matching word occurrence to multi-cursor selection',
    actionId: 'edit.nextMatch',
  },
  {
    id: 'edit.selectAllMatches',
    title: 'Select All Occurrences (Multi-Cursor)',
    category: 'Edit',
    keys: ['Ctrl', 'Shift', 'L'],
    description: 'Spawn multi-cursors across all matches of selected text',
    actionId: 'edit.selectAllMatches',
  },
  {
    id: 'edit.cursorAbove',
    title: 'Insert Cursor Above',
    category: 'Edit',
    keys: ['Ctrl', 'Alt', 'Up'],
    description: 'Insert an additional cursor directly on the line above',
    actionId: 'edit.cursorAbove',
  },
  {
    id: 'edit.cursorBelow',
    title: 'Insert Cursor Below',
    category: 'Edit',
    keys: ['Ctrl', 'Alt', 'Down'],
    description: 'Insert an additional cursor directly on the line below',
    actionId: 'edit.cursorBelow',
  },
  {
    id: 'edit.multiCursorClick',
    title: 'Add Multi-Cursor (Mouse)',
    category: 'Edit',
    keys: ['Alt', 'Click'],
    description: 'Place an extra editing cursor at the mouse cursor position',
    actionId: 'edit.multiCursorClick',
  },
  {
    id: 'edit.commentLine',
    title: 'Toggle Line Comment',
    category: 'Edit',
    keys: ['Ctrl', '/'],
    description: 'Comment or uncomment selected lines',
    actionId: 'edit.commentLine',
  },
  {
    id: 'edit.duplicateLine',
    title: 'Duplicate Line Down',
    category: 'Edit',
    keys: ['Shift', 'Alt', 'Down'],
    description: 'Duplicate current line or selection downwards',
    actionId: 'edit.duplicateLine',
  },
  {
    id: 'edit.deleteLine',
    title: 'Delete Current Line',
    category: 'Edit',
    keys: ['Ctrl', 'Shift', 'K'],
    description: 'Delete entire line without copying to clipboard',
    actionId: 'edit.deleteLine',
  },
  {
    id: 'edit.wordWrap',
    title: 'Toggle Word Wrap',
    category: 'Edit',
    keys: ['Alt', 'Z'],
    description: 'Toggle viewport line wrapping on or off',
    actionId: 'view.wordWrap',
  },

  // View & Layout
  {
    id: 'view.terminal',
    title: 'Toggle Integrated Terminal',
    category: 'View',
    keys: ['Ctrl', '`'],
    description: 'Show, focus, or collapse integrated liquid glass terminal',
    actionId: 'view.terminal',
  },
  {
    id: 'view.problems',
    title: 'Toggle Problems & Diagnostics',
    category: 'View',
    keys: ['Ctrl', 'Shift', 'M'],
    description: 'Open bottom diagnostics drawer with real-time error/warning tree',
    actionId: 'view.problems',
  },
  {
    id: 'view.database',
    title: 'Toggle Database Studio (SQL Runner)',
    category: 'View',
    keys: ['Ctrl', 'Shift', 'D'],
    description: 'Open right-docked database schema explorer and SQL runner',
    actionId: 'db.toggle',
  },
  {
    id: 'view.restClient',
    title: 'Toggle REST & GraphQL API Client',
    category: 'View',
    keys: ['Ctrl', 'Alt', 'R'],
    description: 'Open right-docked REST & GraphQL API client and request runner',
    actionId: 'rest.toggle',
  },
  {
    id: 'view.sidebar',
    title: 'Toggle Primary Sidebar',
    category: 'View',
    keys: ['Ctrl', 'B'],
    description: 'Show or hide the activity sidebar dock',
    actionId: 'view.toggleSidebar',
  },
  {
    id: 'view.explorer',
    title: 'Show File Explorer',
    category: 'View',
    keys: ['Ctrl', 'Shift', 'E'],
    description: 'Focus file tree and directory navigator',
    actionId: 'view.explorer',
  },
  {
    id: 'view.zoomIn',
    title: 'Zoom In Window',
    category: 'View',
    keys: ['Ctrl', '='],
    description: 'Increase UI and editor font scaling',
    actionId: 'view.zoomIn',
  },
  {
    id: 'view.zoomOut',
    title: 'Zoom Out Window',
    category: 'View',
    keys: ['Ctrl', '-'],
    description: 'Decrease UI and editor font scaling',
    actionId: 'view.zoomOut',
  },
  {
    id: 'view.resetZoom',
    title: 'Reset Zoom Scale',
    category: 'View',
    keys: ['Ctrl', '0'],
    description: 'Reset window scale to default 100%',
    actionId: 'view.resetZoom',
  },
  {
    id: 'view.fullscreen',
    title: 'Toggle Zen Fullscreen Mode',
    category: 'View',
    keys: ['F11'],
    description: 'Distraction-free liquid glass coding canvas',
    actionId: 'view.fullscreen',
  },

  // AI & Multi-Model
  {
    id: 'ai.toggle',
    title: 'Toggle AI Assistant Panel',
    category: 'AI',
    keys: ['Ctrl', 'Alt', 'A'],
    description: 'Open multi-model conversational assistant dock',
    actionId: 'ai.toggle',
  },
  {
    id: 'ai.explain',
    title: 'AI: Explain Active Selection',
    category: 'AI',
    keys: ['Ctrl', 'Shift', 'I'],
    description: 'Ask AI model to analyze and document selected code',
    actionId: 'ai.explain',
  },

  // Git & Source Control
  {
    id: 'git.view',
    title: 'Show Source Control & Git Graph',
    category: 'Git',
    keys: ['Ctrl', 'Shift', 'G'],
    description: 'Inspect staged files, commit tree, and git branch graph',
    actionId: 'view.git',
  },
  {
    id: 'git.refresh',
    title: 'Git: Refresh Status',
    category: 'Git',
    keys: ['Ctrl', 'Shift', 'R'],
    description: 'Query status of tracked and untracked files',
    actionId: 'git.refresh',
  },

  // Debug & Execution
  {
    id: 'debug.start',
    title: 'Start / Continue Debugging',
    category: 'Debug',
    keys: ['F5'],
    description: 'Launch active compiler debugger or resume paused execution',
    actionId: 'debug.start',
  },
  {
    id: 'debug.pause',
    title: 'Pause Execution',
    category: 'Debug',
    keys: ['F6'],
    description: 'Pause runtime execution at current instruction or thread',
    actionId: 'debug.pause',
  },
  {
    id: 'debug.stop',
    title: 'Stop Debugging',
    category: 'Debug',
    keys: ['Shift', 'F5'],
    description: 'Terminate active debug session and detach adapters',
    actionId: 'debug.stop',
  },
  {
    id: 'debug.restart',
    title: 'Restart Debugging',
    category: 'Debug',
    keys: ['Ctrl', 'Shift', 'F5'],
    description: 'Recompile and re-launch active target debug session',
    actionId: 'debug.restart',
  },
  {
    id: 'debug.toggleBreakpoint',
    title: 'Toggle Breakpoint',
    category: 'Debug',
    keys: ['F9'],
    description: 'Toggle breakpoint on current cursor line in active buffer',
    actionId: 'debug.toggleBreakpoint',
  },
  {
    id: 'debug.stepOver',
    title: 'Step Over',
    category: 'Debug',
    keys: ['F10'],
    description: 'Execute next statement without stepping into nested routines',
    actionId: 'debug.stepOver',
  },
  {
    id: 'debug.stepInto',
    title: 'Step Into',
    category: 'Debug',
    keys: ['F11'],
    description: 'Step into function or method call on current execution line',
    actionId: 'debug.stepInto',
  },
  {
    id: 'debug.stepOut',
    title: 'Step Out',
    category: 'Debug',
    keys: ['Shift', 'F11'],
    description: 'Step out of current function to parent calling stack frame',
    actionId: 'debug.stepOut',
  },
  {
    id: 'view.debug',
    title: 'Show Run & Debug Sidebar',
    category: 'Debug',
    keys: ['Ctrl', 'Shift', 'D'],
    description: 'Open debug controls, variables inspector, watch list, and console',
    actionId: 'view.debug',
  },
]

type CategoryTab = 'All' | 'General' | 'File' | 'Edit' | 'Navigation' | 'View' | 'AI' | 'Git' | 'Debug'

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  onExecuteCommand,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CategoryTab>('All')
  const [executedId, setExecutedId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('')
      setSelectedCategory('All')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const filteredShortcuts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return SHORTCUT_DATABASE.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
      if (!matchesCategory) return false

      if (!term) return true
      const keysString = item.keys.join(' ').toLowerCase()
      return (
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        keysString.includes(term)
      )
    })
  }, [searchTerm, selectedCategory])

  const handleRun = (item: Omit<ShortcutEntry, 'onExecute'>) => {
    if (item.actionId && onExecuteCommand) {
      onExecuteCommand(item.actionId)
      setExecutedId(item.id)
      setTimeout(() => setExecutedId(null), 1200)
    }
  }

  const getCategoryIcon = (cat: CategoryTab) => {
    switch (cat) {
      case 'General':
        return <Command size={13} />
      case 'File':
        return <FileCode size={13} />
      case 'Navigation':
        return <Compass size={13} />
      case 'View':
        return <Eye size={13} />
      case 'AI':
        return <Bot size={13} />
      case 'Git':
        return <GitBranch size={13} />
      case 'Debug':
        return <Bug size={13} />
      default:
        return <Sparkles size={13} />
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="shortcuts-backdrop" onClick={onClose}>
          <motion.div
            className="shortcuts-modal glass-panel"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 440, damping: 32 }}
          >
            {/* Specular Ambient Glow Orbs */}
            <div className="shortcuts-glow orb-1" />
            <div className="shortcuts-glow orb-2" />

            {/* Header */}
            <div className="shortcuts-header">
              <div className="shortcuts-header-left">
                <div className="shortcuts-icon-pill">
                  <Keyboard size={18} className="shortcuts-main-icon" />
                </div>
                <div>
                  <div className="shortcuts-title-row">
                    <h2 className="shortcuts-title">Keyboard Shortcuts</h2>
                    <span className="shortcuts-count-badge">
                      {filteredShortcuts.length} of {SHORTCUT_DATABASE.length}
                    </span>
                  </div>
                  <p className="shortcuts-subtitle">
                    Standard VS Code bindings & Liquid Glass workspace accelerators
                  </p>
                </div>
              </div>

              <button className="shortcuts-close-btn glass-interactive" onClick={onClose} title="Close (Esc)">
                <X size={15} />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="shortcuts-search-bar">
              <Search size={15} className="search-icon" />
              <input
                ref={inputRef}
                type="text"
                className="shortcuts-input"
                placeholder="Search shortcuts by action, key combo (e.g. 'ctrl+p', 'save', 'format')..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="search-clear-btn" onClick={() => setSearchTerm('')}>
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category Tabs */}
            <div className="shortcuts-category-tabs">
              {(['All', 'General', 'File', 'Edit', 'Navigation', 'View', 'AI', 'Git', 'Debug'] as CategoryTab[]).map(
                (cat) => (
                  <button
                    key={cat}
                    className={`category-tab-pill glass-interactive ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {getCategoryIcon(cat)}
                    <span>{cat}</span>
                  </button>
                )
              )}
            </div>

            {/* Shortcuts Table List */}
            <div className="shortcuts-list-container custom-scrollbar">
              {filteredShortcuts.length === 0 ? (
                <div className="shortcuts-empty-state">
                  <Sparkles size={24} className="empty-sparkle" />
                  <p className="empty-text">No shortcuts matching "{searchTerm}"</p>
                  <button className="clear-filter-btn" onClick={() => { setSearchTerm(''); setSelectedCategory('All') }}>
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="shortcuts-table">
                  {filteredShortcuts.map((item) => (
                    <div key={item.id} className="shortcut-row glass-interactive">
                      <div className="shortcut-info">
                        <div className="shortcut-title-row">
                          <span className="shortcut-title">{item.title}</span>
                          <span className={`category-tag cat-${item.category.toLowerCase()}`}>
                            {item.category}
                          </span>
                        </div>
                        <span className="shortcut-description">{item.description}</span>
                      </div>

                      <div className="shortcut-action-group">
                        <div className="shortcut-keys-wrapper">
                          {item.keys.map((k, idx) => (
                            <React.Fragment key={idx}>
                              <kbd className="key-cap">{k}</kbd>
                              {idx < item.keys.length - 1 && item.keys[idx] !== 'Ctrl' && (
                                <span className="key-plus">+</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>

                        {item.actionId && (
                          <button
                            className={`run-command-btn glass-interactive ${executedId === item.id ? 'success' : ''}`}
                            onClick={() => handleRun(item)}
                            title={`Execute "${item.title}"`}
                          >
                            {executedId === item.id ? (
                              <Check size={12} className="btn-icon success" />
                            ) : (
                              <Play size={11} className="btn-icon" />
                            )}
                            <span>{executedId === item.id ? 'Ran' : 'Run'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shortcuts-footer">
              <div className="footer-left">
                <span className="footer-hint">
                  <kbd>Esc</kbd> Close modal
                </span>
                <span className="footer-hint">
                  <kbd>Ctrl+Shift+P</kbd> Open Palette
                </span>
              </div>
              <div className="footer-right">
                <span className="footer-brand">IndoctrinatedEdit Pro</span>
              </div>
            </div>
          </motion.div>

          <style>{`
            .shortcuts-backdrop {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.55);
              backdrop-filter: blur(12px);
              -webkit-backdrop-filter: blur(12px);
              z-index: 1050;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 24px;
            }

            .shortcuts-modal {
              position: relative;
              width: 780px;
              max-width: 94vw;
              max-height: 86vh;
              display: flex;
              flex-direction: column;
              background: rgba(14, 18, 32, 0.88);
              backdrop-filter: blur(40px) saturate(210%) brightness(1.12);
              -webkit-backdrop-filter: blur(40px) saturate(210%) brightness(1.12);
              border: 1px solid rgba(255, 255, 255, 0.16);
              border-radius: var(--radius-xl, 16px);
              box-shadow: 0 32px 80px -10px rgba(0, 0, 0, 0.8), 0 0 40px rgba(10, 132, 255, 0.22);
              overflow: hidden;
            }

            .shortcuts-glow {
              position: absolute;
              border-radius: 50%;
              filter: blur(50px);
              pointer-events: none;
              opacity: 0.35;
            }

            .shortcuts-glow.orb-1 {
              width: 220px;
              height: 220px;
              background: radial-gradient(circle, #0A84FF 0%, transparent 70%);
              top: -60px;
              right: -60px;
            }

            .shortcuts-glow.orb-2 {
              width: 180px;
              height: 180px;
              background: radial-gradient(circle, #BF5AF2 0%, transparent 70%);
              bottom: -40px;
              left: -40px;
            }

            .shortcuts-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 20px 24px 14px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.08);
              position: relative;
              z-index: 1;
            }

            .shortcuts-header-left {
              display: flex;
              align-items: center;
              gap: 14px;
            }

            .shortcuts-icon-pill {
              width: 40px;
              height: 40px;
              border-radius: 12px;
              background: linear-gradient(135deg, rgba(10, 132, 255, 0.25), rgba(191, 90, 242, 0.25));
              border: 1px solid rgba(255, 255, 255, 0.2);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 16px rgba(10, 132, 255, 0.2);
            }

            .shortcuts-main-icon {
              color: var(--accent-primary, #0A84FF);
            }

            .shortcuts-title-row {
              display: flex;
              align-items: center;
              gap: 10px;
            }

            .shortcuts-title {
              margin: 0;
              font-size: 1.15rem;
              font-weight: 700;
              letter-spacing: -0.01em;
              color: rgba(255, 255, 255, 0.95);
            }

            .shortcuts-count-badge {
              font-size: 0.72rem;
              font-weight: 600;
              padding: 2px 8px;
              border-radius: 12px;
              background: rgba(10, 132, 255, 0.16);
              border: 1px solid rgba(10, 132, 255, 0.3);
              color: #5AC8FA;
            }

            .shortcuts-subtitle {
              margin: 2px 0 0;
              font-size: 0.78rem;
              color: rgba(235, 235, 245, 0.55);
            }

            .shortcuts-close-btn {
              width: 30px;
              height: 30px;
              border-radius: 8px;
              border: 1px solid rgba(255, 255, 255, 0.12);
              background: rgba(255, 255, 255, 0.05);
              color: rgba(255, 255, 255, 0.7);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all 0.15s ease;
            }

            .shortcuts-close-btn:hover {
              background: rgba(255, 69, 58, 0.2);
              border-color: rgba(255, 69, 58, 0.4);
              color: #FF453A;
            }

            .shortcuts-search-bar {
              display: flex;
              align-items: center;
              gap: 10px;
              margin: 14px 24px 8px;
              padding: 9px 14px;
              background: rgba(255, 255, 255, 0.04);
              border: 1px solid rgba(255, 255, 255, 0.12);
              border-radius: 10px;
              position: relative;
              z-index: 1;
            }

            .shortcuts-search-bar:focus-within {
              border-color: var(--accent-primary, #0A84FF);
              background: rgba(255, 255, 255, 0.07);
              box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.2);
            }

            .search-icon {
              color: rgba(235, 235, 245, 0.45);
            }

            .shortcuts-input {
              flex: 1;
              background: transparent;
              border: none;
              outline: none;
              color: rgba(255, 255, 255, 0.95);
              font-size: 0.85rem;
            }

            .shortcuts-input::placeholder {
              color: rgba(235, 235, 245, 0.35);
            }

            .search-clear-btn {
              background: rgba(255, 255, 255, 0.1);
              border: none;
              border-radius: 50%;
              width: 18px;
              height: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: rgba(255, 255, 255, 0.6);
              cursor: pointer;
            }

            .shortcuts-category-tabs {
              display: flex;
              gap: 6px;
              padding: 6px 24px 10px;
              overflow-x: auto;
              position: relative;
              z-index: 1;
            }

            .category-tab-pill {
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 5px 12px;
              border-radius: 8px;
              background: rgba(255, 255, 255, 0.04);
              border: 1px solid rgba(255, 255, 255, 0.08);
              color: rgba(235, 235, 245, 0.65);
              font-size: 0.76rem;
              font-weight: 500;
              cursor: pointer;
              white-space: nowrap;
              transition: all 0.15s ease;
            }

            .category-tab-pill:hover {
              background: rgba(255, 255, 255, 0.08);
              color: rgba(255, 255, 255, 0.9);
            }

            .category-tab-pill.active {
              background: linear-gradient(135deg, rgba(10, 132, 255, 0.28), rgba(90, 200, 250, 0.18));
              border-color: rgba(10, 132, 255, 0.45);
              color: #FFFFFF;
              box-shadow: 0 2px 10px rgba(10, 132, 255, 0.2);
            }

            .shortcuts-list-container {
              flex: 1;
              overflow-y: auto;
              padding: 4px 24px 16px;
              position: relative;
              z-index: 1;
            }

            .shortcuts-table {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }

            .shortcut-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 10px 14px;
              background: rgba(255, 255, 255, 0.025);
              border: 1px solid rgba(255, 255, 255, 0.06);
              border-radius: 10px;
              transition: all 0.15s ease;
            }

            .shortcut-row:hover {
              background: rgba(255, 255, 255, 0.06);
              border-color: rgba(255, 255, 255, 0.14);
              transform: translateX(2px);
            }

            .shortcut-info {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }

            .shortcut-title-row {
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .shortcut-title {
              font-size: 0.84rem;
              font-weight: 600;
              color: rgba(255, 255, 255, 0.92);
            }

            .category-tag {
              font-size: 0.65rem;
              font-weight: 600;
              padding: 1px 6px;
              border-radius: 4px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }

            .category-tag.cat-general { background: rgba(10, 132, 255, 0.15); color: #5AC8FA; }
            .category-tag.cat-file { background: rgba(48, 209, 88, 0.15); color: #30D158; }
            .category-tag.cat-edit { background: rgba(255, 214, 10, 0.15); color: #FFD60A; }
            .category-tag.cat-navigation { background: rgba(191, 90, 242, 0.15); color: #BF5AF2; }
            .category-tag.cat-view { background: rgba(100, 210, 255, 0.15); color: #64D2FF; }
            .category-tag.cat-ai { background: rgba(255, 45, 85, 0.15); color: #FF2D55; }
            .category-tag.cat-git { background: rgba(255, 159, 10, 0.15); color: #FF9F0A; }

            .shortcut-description {
              font-size: 0.74rem;
              color: rgba(235, 235, 245, 0.5);
            }

            .shortcut-action-group {
              display: flex;
              align-items: center;
              gap: 12px;
            }

            .shortcut-keys-wrapper {
              display: flex;
              align-items: center;
              gap: 4px;
            }

            .key-cap {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              padding: 3px 7px;
              min-width: 22px;
              height: 22px;
              background: linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.05) 100%);
              border: 1px solid rgba(255, 255, 255, 0.18);
              border-bottom: 2px solid rgba(255, 255, 255, 0.28);
              border-radius: 5px;
              font-family: var(--font-code, 'SF Mono', Consolas, monospace);
              font-size: 0.72rem;
              font-weight: 600;
              color: rgba(255, 255, 255, 0.95);
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
            }

            .key-plus {
              font-size: 0.7rem;
              color: rgba(235, 235, 245, 0.4);
              margin: 0 1px;
            }

            .run-command-btn {
              display: flex;
              align-items: center;
              gap: 4px;
              padding: 4px 8px;
              border-radius: 6px;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
              color: rgba(235, 235, 245, 0.75);
              font-size: 0.72rem;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.15s ease;
            }

            .run-command-btn:hover {
              background: rgba(10, 132, 255, 0.2);
              border-color: rgba(10, 132, 255, 0.4);
              color: #FFFFFF;
            }

            .run-command-btn.success {
              background: rgba(48, 209, 88, 0.2);
              border-color: rgba(48, 209, 88, 0.4);
              color: #30D158;
            }

            .shortcuts-empty-state {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 40px 20px;
              text-align: center;
              gap: 10px;
            }

            .empty-sparkle {
              color: rgba(235, 235, 245, 0.3);
            }

            .empty-text {
              margin: 0;
              font-size: 0.84rem;
              color: rgba(235, 235, 245, 0.6);
            }

            .clear-filter-btn {
              padding: 5px 12px;
              border-radius: 6px;
              background: rgba(255, 255, 255, 0.08);
              border: 1px solid rgba(255, 255, 255, 0.15);
              color: #5AC8FA;
              font-size: 0.76rem;
              cursor: pointer;
            }

            .shortcuts-footer {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 10px 24px;
              border-top: 1px solid rgba(255, 255, 255, 0.08);
              background: rgba(0, 0, 0, 0.15);
              font-size: 0.72rem;
              color: rgba(235, 235, 245, 0.5);
              position: relative;
              z-index: 1;
            }

            .footer-left {
              display: flex;
              gap: 14px;
            }

            .footer-hint kbd {
              padding: 1px 4px;
              background: rgba(255, 255, 255, 0.08);
              border: 1px solid rgba(255, 255, 255, 0.15);
              border-radius: 3px;
              font-size: 0.68rem;
              margin-right: 4px;
            }

            .footer-brand {
              font-weight: 600;
              color: rgba(255, 255, 255, 0.4);
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  )
}

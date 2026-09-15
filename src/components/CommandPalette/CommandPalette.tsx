import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  FileCode,
  Terminal,
  Palette,
  FolderOpen,
  GitBranch,
  Settings,
  Sparkles,
} from 'lucide-react'
import { commandRegistry, CommandItem } from '@/services/commandRegistry'
import { WorkspaceFileItem } from '../Sidebar/Sidebar'
import { TabItem } from '../TabBar/TabBar'

interface CommandPaletteProps {
  isOpen: boolean
  initialQuery?: string
  onClose: () => void
  workspaceFiles: WorkspaceFileItem[]
  tabs: TabItem[]
  onOpenFile: (file: { path: string; name: string }) => void
}

type PaletteItem =
  | { type: 'command'; item: CommandItem }
  | { type: 'file'; item: { path: string; name: string; isTab?: boolean } }

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  initialQuery = '>',
  onClose,
  workspaceFiles,
  tabs,
  onOpenFile,
}) => {
  const [query, setQuery] = useState<string>(initialQuery)
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [commands, setCommands] = useState<CommandItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Sync commands from registry
  useEffect(() => {
    setCommands(commandRegistry.getAll())
    return commandRegistry.subscribe(() => {
      setCommands(commandRegistry.getAll())
    })
  }, [])

  // Reset query and selected index on open
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery)
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, initialQuery])

  const isCommandMode = query.startsWith('>')

  // Filter items based on query
  const filteredItems: PaletteItem[] = useMemo(() => {
    if (isCommandMode) {
      const searchTerm = query.substring(1).trim().toLowerCase()
      if (!searchTerm) {
        return commands.map((cmd) => ({ type: 'command', item: cmd }))
      }
      return commands
        .filter(
          (cmd) =>
            cmd.title.toLowerCase().includes(searchTerm) ||
            cmd.category.toLowerCase().includes(searchTerm) ||
            cmd.shortcut?.toLowerCase().includes(searchTerm)
        )
        .map((cmd) => ({ type: 'command', item: cmd }))
    } else {
      const searchTerm = query.trim().toLowerCase()
      // Combine open tabs and workspace files
      const tabPaths = new Set(tabs.map((t) => t.id))
      const combined: { path: string; name: string; isTab?: boolean }[] = [
        ...tabs.map((t) => ({ path: t.id, name: t.name, isTab: true })),
        ...workspaceFiles
          .filter((f) => !f.isDirectory && !tabPaths.has(f.path))
          .map((f) => ({ path: f.path, name: f.name, isTab: false })),
      ]

      if (!searchTerm) {
        return combined.map((f) => ({ type: 'file', item: f }))
      }

      return combined
        .filter(
          (f) =>
            f.name.toLowerCase().includes(searchTerm) ||
            f.path.toLowerCase().includes(searchTerm)
        )
        .map((f) => ({ type: 'file', item: f }))
    }
  }, [query, isCommandMode, commands, workspaceFiles, tabs])

  // Clamp selection index
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      executeSelectedItem()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  const executeSelectedItem = () => {
    if (filteredItems.length === 0) return
    const selected = filteredItems[selectedIndex]
    if (selected.type === 'command') {
      onClose()
      selected.item.handler()
    } else if (selected.type === 'file') {
      onClose()
      onOpenFile(selected.item)
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'File':
        return <FolderOpen size={14} className="cat-icon file" />
      case 'Git':
        return <GitBranch size={14} className="cat-icon git" />
      case 'Themes':
        return <Palette size={14} className="cat-icon theme" />
      case 'Preferences':
        return <Settings size={14} className="cat-icon settings" />
      default:
        return <Terminal size={14} className="cat-icon default" />
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="palette-backdrop" onClick={onClose}>
          <motion.div
            className="palette-modal glass-panel"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: -24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
          >
            {/* Input Bar */}
            <div className="palette-input-bar">
              {isCommandMode ? (
                <Terminal size={16} className="palette-mode-icon command" />
              ) : (
                <Search size={16} className="palette-mode-icon search" />
              )}
              <input
                ref={inputRef}
                type="text"
                className="palette-input"
                placeholder={isCommandMode ? 'Type a command or category...' : 'Search files by name (type > for commands)...'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div className="palette-hint-pill">
                <span>{isCommandMode ? 'Commands' : 'Files'}</span>
              </div>
            </div>

            {/* Results List */}
            <div className="palette-list" ref={listRef}>
              {filteredItems.length === 0 ? (
                <div className="palette-empty">
                  <Sparkles size={20} className="empty-icon" />
                  <span>No matching {isCommandMode ? 'commands' : 'files'} found</span>
                </div>
              ) : (
                filteredItems.map((item, idx) => {
                  const isSelected = idx === selectedIndex
                  return (
                    <div
                      key={item.type === 'command' ? item.item.id : item.item.path}
                      className={`palette-row glass-interactive ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedIndex(idx)
                        if (item.type === 'command') {
                          onClose()
                          item.item.handler()
                        } else {
                          onClose()
                          onOpenFile(item.item)
                        }
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      {item.type === 'command' ? (
                        <>
                          <div className="row-left">
                            {getCategoryIcon(item.item.category)}
                            <div className="row-text">
                              <span className="row-category">{item.item.category}:</span>
                              <span className="row-title">{item.item.title}</span>
                            </div>
                          </div>
                          {item.item.shortcut && (
                            <span className="row-shortcut">{item.item.shortcut}</span>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="row-left">
                            <FileCode size={14} className="cat-icon file" />
                            <div className="row-text">
                              <span className="row-title">{item.item.name}</span>
                              <span className="row-subtitle">{item.item.path}</span>
                            </div>
                          </div>
                          {item.item.isTab && <span className="tab-pill">Open Tab</span>}
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer shortcuts hint */}
            <div className="palette-footer">
              <span className="footer-tip">
                <kbd>↑</kbd> <kbd>↓</kbd> to navigate
              </span>
              <span className="footer-tip">
                <kbd>Enter</kbd> to select
              </span>
              <span className="footer-tip">
                <kbd>Esc</kbd> to dismiss
              </span>
              <span className="footer-tip">
                <kbd>&gt;</kbd> toggle command mode
              </span>
            </div>
          </motion.div>

          <style>{`
            .palette-backdrop {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.45);
              backdrop-filter: blur(8px);
              -webkit-backdrop-filter: blur(8px);
              z-index: 999;
              display: flex;
              justify-content: center;
              padding-top: 60px;
            }

            .palette-modal {
              width: 580px;
              max-height: 440px;
              display: flex;
              flex-direction: column;
              background: rgba(14, 18, 30, 0.88);
              backdrop-filter: blur(36px) saturate(200%) brightness(1.15);
              -webkit-backdrop-filter: blur(36px) saturate(200%) brightness(1.15);
              border: 1px solid rgba(255, 255, 255, 0.18);
              border-radius: var(--radius-lg);
              box-shadow: 0 24px 60px -10px rgba(0, 0, 0, 0.75), 0 0 30px rgba(10, 132, 255, 0.25);
              overflow: hidden;
            }

            .palette-input-bar {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 12px 16px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1);
              background: rgba(255, 255, 255, 0.03);
            }

            .palette-mode-icon.command {
              color: var(--accent-cyan);
            }

            .palette-mode-icon.search {
              color: var(--accent-primary);
            }

            .palette-input {
              flex: 1;
              border: none;
              background: transparent;
              color: var(--text-primary);
              font-family: var(--font-ui);
              font-size: 14px;
              font-weight: 500;
              outline: none;
            }

            .palette-hint-pill {
              font-size: 10.5px;
              font-weight: 600;
              padding: 2px 8px;
              border-radius: 999px;
              background: rgba(255, 255, 255, 0.08);
              color: var(--text-muted);
              border: 1px solid rgba(255, 255, 255, 0.12);
            }

            .palette-list {
              flex: 1;
              overflow-y: auto;
              padding: 6px;
              max-height: 330px;
            }

            .palette-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 8px 12px;
              border-radius: var(--radius-sm);
              border: 1px solid transparent;
              cursor: pointer;
            }

            .palette-row:hover {
              background: rgba(255, 255, 255, 0.06);
            }

            .palette-row.selected {
              background: rgba(10, 132, 255, 0.22);
              border-color: rgba(10, 132, 255, 0.45);
              box-shadow: 0 0 16px rgba(10, 132, 255, 0.2);
            }

            .row-left {
              display: flex;
              align-items: center;
              gap: 10px;
              overflow: hidden;
            }

            .cat-icon {
              flex-shrink: 0;
            }

            .cat-icon.file { color: var(--accent-cyan); }
            .cat-icon.git { color: var(--accent-green); }
            .cat-icon.theme { color: var(--accent-purple); }
            .cat-icon.settings { color: var(--accent-amber); }
            .cat-icon.default { color: var(--text-muted); }

            .row-text {
              display: flex;
              align-items: center;
              gap: 6px;
              overflow: hidden;
            }

            .row-category {
              font-size: 11px;
              color: var(--text-muted);
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.4px;
            }

            .row-title {
              font-size: 13px;
              font-weight: 500;
              color: var(--text-primary);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .row-subtitle {
              font-size: 11px;
              color: var(--text-muted);
              margin-left: 6px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .row-shortcut {
              font-family: var(--font-mono);
              font-size: 11px;
              padding: 2px 6px;
              border-radius: 4px;
              background: rgba(255, 255, 255, 0.08);
              color: var(--text-secondary);
              border: 1px solid rgba(255, 255, 255, 0.1);
              flex-shrink: 0;
            }

            .tab-pill {
              font-size: 10px;
              padding: 2px 6px;
              border-radius: 4px;
              background: rgba(48, 209, 88, 0.15);
              color: var(--accent-green);
              border: 1px solid rgba(48, 209, 88, 0.3);
              flex-shrink: 0;
            }

            .palette-empty {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 40px 16px;
              color: var(--text-muted);
              gap: 8px;
              font-size: 12.5px;
            }

            .empty-icon {
              color: var(--accent-primary);
              opacity: 0.6;
            }

            .palette-footer {
              display: flex;
              align-items: center;
              justify-content: flex-end;
              gap: 14px;
              padding: 8px 16px;
              background: rgba(0, 0, 0, 0.25);
              border-top: 1px solid rgba(255, 255, 255, 0.06);
            }

            .footer-tip {
              font-size: 10.5px;
              color: var(--text-muted);
              display: flex;
              align-items: center;
              gap: 4px;
            }

            .footer-tip kbd {
              padding: 1px 5px;
              border-radius: 3px;
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.15);
              font-family: var(--font-mono);
              color: var(--text-primary);
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  )
}

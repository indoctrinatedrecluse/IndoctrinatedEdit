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
  Compass,
  Code2,
  Hash,
  HelpCircle,
  Bot,
  Layers,
  Wrench,
  BookOpen,
} from 'lucide-react'
import { commandRegistry, CommandItem } from '@/services/commandRegistry'
import { WorkspaceFileItem } from '../Sidebar/Sidebar'
import { TabItem } from '../TabBar/TabBar'
import { DocumentSymbol } from '../Editor/EditorHost'

interface CommandPaletteProps {
  isOpen: boolean
  initialQuery?: string
  onClose: () => void
  workspaceFiles: WorkspaceFileItem[]
  tabs: TabItem[]
  onOpenFile: (file: { path: string; name: string }) => void
  symbols?: DocumentSymbol[]
  onGoToLine?: (lineNumber: number, column?: number) => void
  activeTabName?: string
}

type PaletteItem =
  | { type: 'command'; item: CommandItem }
  | { type: 'file'; item: { path: string; name: string; isTab?: boolean } }
  | { type: 'symbol'; item: DocumentSymbol }
  | { type: 'gotoline'; line: number; col: number }
  | { type: 'help'; prefix: string; title: string; desc: string }

type FilterTab = 'All' | 'Files' | 'Commands' | 'Symbols' | 'Themes' | 'Edit'

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  initialQuery = '>',
  onClose,
  workspaceFiles,
  tabs,
  onOpenFile,
  symbols = [],
  onGoToLine,
  activeTabName,
}) => {
  const [query, setQuery] = useState<string>(initialQuery)
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [activeTab, setActiveTab] = useState<FilterTab>('All')
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
      setActiveTab('All')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, initialQuery])

  // Determine current mode based on query prefix
  const mode = useMemo(() => {
    const trimmed = query.trimStart()
    if (trimmed.startsWith('>')) return 'command'
    if (trimmed.startsWith('@')) return 'symbol'
    if (trimmed.startsWith('#')) return 'workspace-symbol'
    if (trimmed.startsWith(':')) return 'gotoline'
    if (trimmed.startsWith('?') || trimmed.startsWith('help')) return 'help'
    return 'unified'
  }, [query])

  // Parse Go to Line parameters (:line or :line:col)
  const lineColMatch = useMemo(() => {
    if (mode !== 'gotoline') return null
    const match = query.trimStart().slice(1).trim().match(/^(\d+)(?::(\d+))?$/)
    if (!match) return null
    return {
      line: parseInt(match[1], 10),
      col: match[2] ? parseInt(match[2], 10) : 1,
    }
  }, [mode, query])

  // Filter items based on mode and query
  const filteredItems: PaletteItem[] = useMemo(() => {
    // 1. Commands Mode (>)
    if (mode === 'command') {
      const searchTerm = query.trimStart().substring(1).trim().toLowerCase()
      if (!searchTerm) {
        return commands.map((cmd) => ({ type: 'command', item: cmd }))
      }
      return commands
        .filter(
          (cmd) =>
            cmd.title.toLowerCase().includes(searchTerm) ||
            cmd.category.toLowerCase().includes(searchTerm) ||
            (cmd.shortcut && cmd.shortcut.toLowerCase().includes(searchTerm)) ||
            (cmd.description && cmd.description.toLowerCase().includes(searchTerm))
        )
        .map((cmd) => ({ type: 'command', item: cmd }))
    }

    // 2. Symbols / Outline Mode (@)
    if (mode === 'symbol') {
      const searchTerm = query.trimStart().substring(1).trim().toLowerCase()
      if (!searchTerm) {
        return symbols.map((sym) => ({ type: 'symbol', item: sym }))
      }
      return symbols
        .filter(
          (sym) =>
            sym.name.toLowerCase().includes(searchTerm) ||
            sym.kind.toLowerCase().includes(searchTerm) ||
            (sym.detail && sym.detail.toLowerCase().includes(searchTerm))
        )
        .map((sym) => ({ type: 'symbol', item: sym }))
    }

    // 3. Workspace Symbols & Feature Mode (#)
    if (mode === 'workspace-symbol') {
      const searchTerm = query.trimStart().substring(1).trim().toLowerCase()
      const symbolMatches = symbols
        .filter((sym) => !searchTerm || sym.name.toLowerCase().includes(searchTerm))
        .map((sym) => ({ type: 'symbol' as const, item: sym }))

      const featureMatches = commands
        .filter(
          (cmd) =>
            !searchTerm ||
            cmd.title.toLowerCase().includes(searchTerm) ||
            cmd.category.toLowerCase().includes(searchTerm)
        )
        .map((cmd) => ({ type: 'command' as const, item: cmd }))

      return [...symbolMatches, ...featureMatches]
    }

    // 4. Go to Line Mode (:)
    if (mode === 'gotoline') {
      if (lineColMatch) {
        return [{ type: 'gotoline', line: lineColMatch.line, col: lineColMatch.col }]
      }
      return []
    }

    // 5. Help / Modes Picker (?)
    if (mode === 'help') {
      const helpModes: PaletteItem[] = [
        { type: 'help', prefix: '>', title: 'Commands & Actions', desc: 'Search and execute all editor commands' },
        { type: 'help', prefix: '@', title: 'Go to Symbol in File', desc: 'Jump to functions, classes, and outline symbols' },
        { type: 'help', prefix: '#', title: 'Workspace Symbols', desc: 'Search symbols and features across project' },
        { type: 'help', prefix: ':', title: 'Go to Line', desc: 'Type :42 or :42:10 to jump to line and column' },
        { type: 'help', prefix: '?', title: 'Help & Mode Picker', desc: 'Display available search modes and syntax' },
      ]
      return helpModes
    }

    // 6. Unified Smart Search (Files, Tabs, Commands, Symbols)
    const searchTerm = query.trim().toLowerCase()
    const tabPaths = new Set(tabs.map((t) => t.id))
    const filesList: { path: string; name: string; isTab?: boolean }[] = [
      ...tabs.map((t) => ({ path: t.id, name: t.name, isTab: true })),
      ...workspaceFiles
        .filter((f) => !f.isDirectory && !tabPaths.has(f.path))
        .map((f) => ({ path: f.path, name: f.name, isTab: false })),
    ]

    let matchedFiles = filesList
    let matchedCommands = commands
    let matchedSymbols = symbols

    if (searchTerm) {
      matchedFiles = filesList.filter(
        (f) => f.name.toLowerCase().includes(searchTerm) || f.path.toLowerCase().includes(searchTerm)
      )
      matchedCommands = commands.filter(
        (cmd) =>
          cmd.title.toLowerCase().includes(searchTerm) ||
          cmd.category.toLowerCase().includes(searchTerm) ||
          (cmd.shortcut && cmd.shortcut.toLowerCase().includes(searchTerm))
      )
      matchedSymbols = symbols.filter(
        (s) => s.name.toLowerCase().includes(searchTerm) || s.kind.toLowerCase().includes(searchTerm)
      )
    }

    // Apply Filter Tab
    if (activeTab === 'Files') {
      return matchedFiles.map((f) => ({ type: 'file', item: f }))
    }
    if (activeTab === 'Commands') {
      return matchedCommands.map((c) => ({ type: 'command', item: c }))
    }
    if (activeTab === 'Symbols') {
      return matchedSymbols.map((s) => ({ type: 'symbol', item: s }))
    }
    if (activeTab === 'Themes') {
      return matchedCommands
        .filter((c) => c.category === 'Themes')
        .map((c) => ({ type: 'command', item: c }))
    }
    if (activeTab === 'Edit') {
      return matchedCommands
        .filter((c) => c.category === 'Editor' || c.category === 'File')
        .map((c) => ({ type: 'command', item: c }))
    }

    // Default 'All': Combine Top Files, Top Commands, and Top Symbols
    const items: PaletteItem[] = [
      ...matchedFiles.slice(0, 8).map((f) => ({ type: 'file' as const, item: f })),
      ...matchedCommands.slice(0, 8).map((c) => ({ type: 'command' as const, item: c })),
      ...matchedSymbols.slice(0, 4).map((s) => ({ type: 'symbol' as const, item: s })),
    ]

    return items
  }, [mode, query, commands, symbols, lineColMatch, workspaceFiles, tabs, activeTab])

  // Clamp selection index on query or list changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, mode, activeTab])

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
    } else if (e.key === 'Tab') {
      const selected = filteredItems[selectedIndex]
      if (selected && selected.type === 'help') {
        e.preventDefault()
        setQuery(selected.prefix + ' ')
      }
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
    } else if (selected.type === 'symbol') {
      onClose()
      onGoToLine?.(selected.item.line, 1)
    } else if (selected.type === 'gotoline') {
      onClose()
      onGoToLine?.(selected.line, selected.col)
    } else if (selected.type === 'help') {
      setQuery(selected.prefix)
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
      case 'AI':
        return <Bot size={14} className="cat-icon ai" />
      case 'Editor':
        return <Code2 size={14} className="cat-icon editor" />
      case 'Toolchain':
        return <Wrench size={14} className="cat-icon toolchain" />
      case 'Help':
        return <BookOpen size={14} className="cat-icon help" />
      default:
        return <Terminal size={14} className="cat-icon default" />
    }
  }

  const getSymbolKindIcon = (kind: string) => {
    switch (kind) {
      case 'class':
      case 'interface':
      case 'type':
        return <Layers size={13} className="symbol-icon class" />
      case 'function':
      case 'method':
        return <Code2 size={13} className="symbol-icon function" />
      case 'heading':
        return <Hash size={13} className="symbol-icon heading" />
      default:
        return <Compass size={13} className="symbol-icon default" />
    }
  }

  const getPlaceholder = () => {
    switch (mode) {
      case 'command':
        return 'Type a command, feature, or action...'
      case 'symbol':
        return `Search symbols in ${activeTabName || 'active file'} (@)...`
      case 'workspace-symbol':
        return 'Search symbols and features across project (#)...'
      case 'gotoline':
        return 'Type line number to navigate (:line or :line:col)...'
      case 'help':
        return 'Type prefix to change mode (?, >, @, #, :)...'
      default:
        return 'Search files, commands, symbols (type > for commands, @ for outline)...'
    }
  }

  const getModeBadge = () => {
    switch (mode) {
      case 'command':
        return { label: 'Commands', icon: <Terminal size={12} /> }
      case 'symbol':
        return { label: 'Outline Symbols', icon: <Code2 size={12} /> }
      case 'workspace-symbol':
        return { label: 'Workspace Symbols', icon: <Hash size={12} /> }
      case 'gotoline':
        return { label: 'Go to Line', icon: <Compass size={12} /> }
      case 'help':
        return { label: 'Modes Help', icon: <HelpCircle size={12} /> }
      default:
        return { label: 'Universal', icon: <Search size={12} /> }
    }
  }

  const badge = getModeBadge()

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
              {mode === 'command' ? (
                <Terminal size={16} className="palette-mode-icon command" />
              ) : mode === 'symbol' ? (
                <Code2 size={16} className="palette-mode-icon symbol" />
              ) : mode === 'gotoline' ? (
                <Compass size={16} className="palette-mode-icon goto" />
              ) : (
                <Search size={16} className="palette-mode-icon search" />
              )}
              <input
                ref={inputRef}
                type="text"
                className="palette-input"
                placeholder={getPlaceholder()}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div className="palette-hint-pill">
                {badge.icon}
                <span>{badge.label}</span>
              </div>
            </div>

            {/* Quick-filter Category Tabs (shown in Unified mode) */}
            {mode === 'unified' && (
              <div className="palette-tabs-row">
                {(['All', 'Files', 'Commands', 'Symbols', 'Themes', 'Edit'] as FilterTab[]).map((tab) => (
                  <button
                    key={tab}
                    className={`palette-filter-chip glass-interactive ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    <span>{tab}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Results List */}
            <div className="palette-list custom-scrollbar" ref={listRef}>
              {filteredItems.length === 0 ? (
                <div className="palette-empty">
                  {mode === 'gotoline' ? (
                    <>
                      <Compass size={22} className="empty-icon" />
                      <span>Type a valid line number like <code>:42</code> or <code>:42:10</code></span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} className="empty-icon" />
                      <span>No matching items found</span>
                    </>
                  )}
                </div>
              ) : (
                filteredItems.map((item, idx) => {
                  const isSelected = idx === selectedIndex
                  return (
                    <div
                      key={
                        item.type === 'command'
                          ? `cmd-${item.item.id}`
                          : item.type === 'file'
                          ? `file-${item.item.path}`
                          : item.type === 'symbol'
                          ? `sym-${item.item.name}-${item.item.line}`
                          : item.type === 'gotoline'
                          ? `goto-${item.line}-${item.col}`
                          : `help-${item.prefix}`
                      }
                      className={`palette-row glass-interactive ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedIndex(idx)
                        if (item.type === 'command') {
                          onClose()
                          item.item.handler()
                        } else if (item.type === 'file') {
                          onClose()
                          onOpenFile(item.item)
                        } else if (item.type === 'symbol') {
                          onClose()
                          onGoToLine?.(item.item.line, 1)
                        } else if (item.type === 'gotoline') {
                          onClose()
                          onGoToLine?.(item.line, item.col)
                        } else if (item.type === 'help') {
                          setQuery(item.prefix)
                        }
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      {item.type === 'command' && (
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
                      )}

                      {item.type === 'file' && (
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

                      {item.type === 'symbol' && (
                        <>
                          <div className="row-left">
                            {getSymbolKindIcon(item.item.kind)}
                            <div className="row-text">
                              <span className="row-title">{item.item.name}</span>
                              <span className="row-subtitle">
                                {item.item.detail || item.item.kind} · Line {item.item.line}
                              </span>
                            </div>
                          </div>
                          <span className="symbol-pill">{item.item.kind}</span>
                        </>
                      )}

                      {item.type === 'gotoline' && (
                        <>
                          <div className="row-left">
                            <Compass size={14} className="cat-icon goto" />
                            <div className="row-text">
                              <span className="row-title">Jump to Line {item.line}{item.col > 1 ? `, Column ${item.col}` : ''}</span>
                              <span className="row-subtitle">Press Enter to navigate in {activeTabName || 'active editor'}</span>
                            </div>
                          </div>
                          <span className="row-shortcut">Line {item.line}</span>
                        </>
                      )}

                      {item.type === 'help' && (
                        <>
                          <div className="row-left">
                            <kbd className="prefix-kbd">{item.prefix}</kbd>
                            <div className="row-text">
                              <span className="row-title">{item.title}</span>
                              <span className="row-subtitle">{item.desc}</span>
                            </div>
                          </div>
                          <span className="tab-pill">Tab to switch</span>
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer shortcuts hint */}
            <div className="palette-footer">
              <div className="footer-left">
                <span className="footer-tip">
                  <kbd>↑</kbd><kbd>↓</kbd> navigate
                </span>
                <span className="footer-tip">
                  <kbd>Enter</kbd> execute
                </span>
                <span className="footer-tip">
                  <kbd>Esc</kbd> dismiss
                </span>
              </div>
              <div className="footer-right">
                <span className="footer-tip mode-hints">
                  <kbd>&gt;</kbd> cmd · <kbd>@</kbd> sym · <kbd>:</kbd> line · <kbd>?</kbd> help
                </span>
              </div>
            </div>
          </motion.div>

          <style>{`
            .palette-backdrop {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.48);
              backdrop-filter: blur(10px);
              -webkit-backdrop-filter: blur(10px);
              z-index: 1040;
              display: flex;
              justify-content: center;
              padding-top: 54px;
            }

            .palette-modal {
              width: 620px;
              max-width: 92vw;
              max-height: 480px;
              display: flex;
              flex-direction: column;
              background: rgba(14, 18, 32, 0.88);
              backdrop-filter: blur(38px) saturate(200%) brightness(1.15);
              -webkit-backdrop-filter: blur(38px) saturate(200%) brightness(1.15);
              border: 1px solid rgba(255, 255, 255, 0.16);
              border-radius: var(--radius-lg, 12px);
              box-shadow: 0 28px 70px -10px rgba(0, 0, 0, 0.78), 0 0 35px rgba(10, 132, 255, 0.22);
              overflow: hidden;
            }

            .palette-input-bar {
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 13px 18px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            }

            .palette-mode-icon {
              color: rgba(235, 235, 245, 0.5);
            }
            .palette-mode-icon.command { color: var(--accent-primary, #0A84FF); }
            .palette-mode-icon.symbol { color: #BF5AF2; }
            .palette-mode-icon.goto { color: #30D158; }

            .palette-input {
              flex: 1;
              background: transparent;
              border: none;
              outline: none;
              color: rgba(255, 255, 255, 0.95);
              font-size: 0.92rem;
            }

            .palette-input::placeholder {
              color: rgba(235, 235, 245, 0.35);
              font-size: 0.86rem;
            }

            .palette-hint-pill {
              display: flex;
              align-items: center;
              gap: 5px;
              padding: 3px 8px;
              background: rgba(255, 255, 255, 0.07);
              border: 1px solid rgba(255, 255, 255, 0.12);
              border-radius: 6px;
              font-size: 0.7rem;
              font-weight: 500;
              color: rgba(235, 235, 245, 0.75);
            }

            .palette-tabs-row {
              display: flex;
              gap: 6px;
              padding: 6px 16px;
              background: rgba(0, 0, 0, 0.12);
              border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }

            .palette-filter-chip {
              padding: 3px 10px;
              border-radius: 6px;
              background: transparent;
              border: 1px solid transparent;
              color: rgba(235, 235, 245, 0.55);
              font-size: 0.74rem;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.15s ease;
            }

            .palette-filter-chip:hover {
              background: rgba(255, 255, 255, 0.05);
              color: rgba(255, 255, 255, 0.85);
            }

            .palette-filter-chip.active {
              background: rgba(10, 132, 255, 0.2);
              border-color: rgba(10, 132, 255, 0.4);
              color: #5AC8FA;
            }

            .palette-list {
              flex: 1;
              overflow-y: auto;
              padding: 6px;
              display: flex;
              flex-direction: column;
              gap: 2px;
            }

            .palette-empty {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 32px 16px;
              gap: 8px;
              color: rgba(235, 235, 245, 0.45);
              font-size: 0.82rem;
            }

            .palette-empty code {
              padding: 2px 6px;
              background: rgba(255, 255, 255, 0.08);
              border-radius: 4px;
              color: #5AC8FA;
            }

            .palette-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 8px 12px;
              border-radius: 8px;
              border: 1px solid transparent;
              cursor: pointer;
              transition: all 0.12s ease;
            }

            .palette-row:hover {
              background: rgba(255, 255, 255, 0.04);
            }

            .palette-row.selected {
              background: linear-gradient(90deg, rgba(10, 132, 255, 0.22) 0%, rgba(10, 132, 255, 0.08) 100%);
              border-color: rgba(10, 132, 255, 0.35);
            }

            .row-left {
              display: flex;
              align-items: center;
              gap: 10px;
              min-width: 0;
            }

            .cat-icon {
              color: rgba(235, 235, 245, 0.6);
              flex-shrink: 0;
            }
            .cat-icon.file { color: #5AC8FA; }
            .cat-icon.git { color: #FF9F0A; }
            .cat-icon.theme { color: #BF5AF2; }
            .cat-icon.settings { color: #FFD60A; }
            .cat-icon.ai { color: #FF2D55; }
            .cat-icon.editor { color: #30D158; }
            .cat-icon.goto { color: #30D158; }

            .symbol-icon {
              flex-shrink: 0;
            }
            .symbol-icon.class { color: #FFD60A; }
            .symbol-icon.function { color: #5AC8FA; }
            .symbol-icon.heading { color: #BF5AF2; }

            .row-text {
              display: flex;
              flex-direction: column;
              min-width: 0;
            }

            .row-category {
              font-size: 0.72rem;
              color: rgba(235, 235, 245, 0.45);
              font-weight: 500;
              margin-right: 4px;
            }

            .row-title {
              font-size: 0.84rem;
              color: rgba(255, 255, 255, 0.92);
              font-weight: 500;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .row-subtitle {
              font-size: 0.72rem;
              color: rgba(235, 235, 245, 0.4);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .row-shortcut {
              font-size: 0.72rem;
              font-family: var(--font-code, 'SF Mono', Consolas, monospace);
              color: rgba(235, 235, 245, 0.6);
              padding: 2px 6px;
              background: rgba(255, 255, 255, 0.05);
              border-radius: 4px;
              border: 1px solid rgba(255, 255, 255, 0.08);
            }

            .tab-pill {
              font-size: 0.68rem;
              font-weight: 600;
              padding: 2px 6px;
              border-radius: 4px;
              background: rgba(48, 209, 88, 0.15);
              border: 1px solid rgba(48, 209, 88, 0.3);
              color: #30D158;
            }

            .symbol-pill {
              font-size: 0.68rem;
              font-weight: 600;
              padding: 2px 6px;
              border-radius: 4px;
              background: rgba(191, 90, 242, 0.15);
              border: 1px solid rgba(191, 90, 242, 0.3);
              color: #BF5AF2;
              text-transform: uppercase;
            }

            .prefix-kbd {
              padding: 2px 6px;
              background: rgba(10, 132, 255, 0.2);
              border: 1px solid rgba(10, 132, 255, 0.4);
              border-radius: 4px;
              font-family: var(--font-code, 'SF Mono', Consolas, monospace);
              font-size: 0.78rem;
              color: #5AC8FA;
            }

            .palette-footer {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 8px 16px;
              border-top: 1px solid rgba(255, 255, 255, 0.08);
              background: rgba(0, 0, 0, 0.2);
              font-size: 0.72rem;
              color: rgba(235, 235, 245, 0.45);
            }

            .footer-left {
              display: flex;
              gap: 12px;
            }

            .footer-tip kbd {
              padding: 1px 4px;
              background: rgba(255, 255, 255, 0.08);
              border: 1px solid rgba(255, 255, 255, 0.14);
              border-radius: 3px;
              font-size: 0.66rem;
              margin-right: 3px;
            }

            .mode-hints kbd {
              color: #5AC8FA;
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  )
}

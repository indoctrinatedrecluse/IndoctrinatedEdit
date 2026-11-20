import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
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
  X,
  Check,
  Blocks,
  SunMoon,
  Trash2,
  Zap,
} from 'lucide-react'
import { commandRegistry, CommandItem } from '@/services/commandRegistry'
import { extensionRegistry } from '@/extensions/extensionRegistry'
import { registeredThemes } from '@/themes/themeRegistry'
import { WorkspaceFileItem } from '../Sidebar/Sidebar'
import { TabItem } from '../TabBar/TabBar'
import { DocumentSymbol } from '../Editor/EditorHost'
import { fuzzyMatch, highlightMatches } from './fuzzySearch'
import {
  getPaletteHistory,
  recordPaletteExecution,
  removePaletteHistoryItem,
  clearPaletteHistory,
  PaletteHistoryEntry,
} from './paletteHistory'

export interface CommandPaletteProps {
  isOpen: boolean
  initialQuery?: string
  onClose: () => void
  workspaceFiles: WorkspaceFileItem[]
  tabs: TabItem[]
  onOpenFile: (file: { path: string; name: string }) => void
  onCloseTab?: (tabId: string) => void
  symbols?: DocumentSymbol[]
  onGoToLine?: (lineNumber: number, column?: number) => void
  activeTabName?: string
  totalLines?: number
  onPreviewTheme?: (themeId: string) => void
  onSelectTheme?: (themeId: string) => void
  currentThemeId?: string
}

export type PaletteItemType =
  | 'command'
  | 'file'
  | 'tab'
  | 'symbol'
  | 'gotoline'
  | 'extension'
  | 'theme'
  | 'help'

export interface PaletteItem {
  id: string
  type: PaletteItemType
  section: string
  title: string
  subtitle?: string
  shortcut?: string
  category?: string
  badge?: string
  score?: number
  titleMatches?: number[]
  subtitleMatches?: number[]
  data?: any
}

type PaletteMode =
  | 'command'
  | 'symbol'
  | 'workspace-symbol'
  | 'gotoline'
  | 'editors'
  | 'extensions'
  | 'themes'
  | 'help'
  | 'unified'

type FilterTab = 'All' | 'Commands' | 'Files' | 'Tabs' | 'Symbols' | 'Extensions' | 'Themes'

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  initialQuery = '>',
  onClose,
  workspaceFiles,
  tabs,
  onOpenFile,
  onCloseTab,
  symbols = [],
  onGoToLine,
  activeTabName,
  totalLines,
  onPreviewTheme,
  onSelectTheme,
  currentThemeId,
}) => {
  const [query, setQuery] = useState<string>(initialQuery)
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [activeTab, setActiveTab] = useState<FilterTab>('All')
  const [commands, setCommands] = useState<CommandItem[]>([])
  const [recentHistory, setRecentHistory] = useState<PaletteHistoryEntry[]>([])
  const [extensionsTick, setExtensionsTick] = useState<number>(0)
  const [initialThemeSnapshot, setInitialThemeSnapshot] = useState<string | undefined>(currentThemeId)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Sync commands from registry
  useEffect(() => {
    setCommands(commandRegistry.getAll())
    return commandRegistry.subscribe(() => {
      setCommands(commandRegistry.getAll())
    })
  }, [])

  // Sync extensions from registry
  useEffect(() => {
    return extensionRegistry.subscribe(() => {
      setExtensionsTick((v) => v + 1)
    })
  }, [])

  // On open, refresh history and record initial theme snapshot for live rollback
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery)
      setSelectedIndex(0)
      setActiveTab('All')
      setRecentHistory(getPaletteHistory())
      setInitialThemeSnapshot(currentThemeId)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, initialQuery, currentThemeId])

  // Determine active palette mode based on prefix
  const { mode, effectiveSearchTerm } = useMemo(() => {
    const trimmed = query.trimStart()
    if (trimmed.startsWith('>')) {
      return { mode: 'command' as PaletteMode, effectiveSearchTerm: trimmed.slice(1).trim() }
    }
    if (trimmed.startsWith('@')) {
      return { mode: 'symbol' as PaletteMode, effectiveSearchTerm: trimmed.slice(1).trim() }
    }
    if (trimmed.startsWith('#')) {
      return { mode: 'workspace-symbol' as PaletteMode, effectiveSearchTerm: trimmed.slice(1).trim() }
    }
    if (trimmed.startsWith(':')) {
      return { mode: 'gotoline' as PaletteMode, effectiveSearchTerm: trimmed.slice(1).trim() }
    }
    if (trimmed.toLowerCase().startsWith('edt ') || trimmed.toLowerCase() === 'edt') {
      return { mode: 'editors' as PaletteMode, effectiveSearchTerm: trimmed.slice(3).trim() }
    }
    if (trimmed.toLowerCase().startsWith('ext ') || trimmed.toLowerCase() === 'ext') {
      return { mode: 'extensions' as PaletteMode, effectiveSearchTerm: trimmed.slice(3).trim() }
    }
    if (trimmed.toLowerCase().startsWith('theme ') || trimmed.toLowerCase() === 'theme') {
      return { mode: 'themes' as PaletteMode, effectiveSearchTerm: trimmed.slice(5).trim() }
    }
    if (trimmed.startsWith('?') || trimmed.toLowerCase() === 'help') {
      return { mode: 'help' as PaletteMode, effectiveSearchTerm: trimmed.startsWith('?') ? trimmed.slice(1).trim() : '' }
    }
    return { mode: 'unified' as PaletteMode, effectiveSearchTerm: trimmed }
  }, [query])

  // Parse Go to Line (:line or :line:col)
  const lineColMatch = useMemo(() => {
    if (mode !== 'gotoline') return null
    const match = effectiveSearchTerm.match(/^(\d+)(?::(\d+))?$/)
    if (!match) return null
    return {
      line: parseInt(match[1], 10),
      col: match[2] ? parseInt(match[2], 10) : 1,
    }
  }, [mode, effectiveSearchTerm])

  // Build the complete list of filtered, fuzzy-scored items
  const filteredItems = useMemo<PaletteItem[]>(() => {
    const search = effectiveSearchTerm

    // 1. Help & Mode Picker (?)
    if (mode === 'help') {
      const helpModes: PaletteItem[] = [
        {
          id: 'help-cmd',
          type: 'help',
          section: 'Modes',
          title: 'Commands & Actions',
          subtitle: 'Execute all editor commands, features, and settings',
          shortcut: '>',
          badge: 'Mode',
          data: { prefix: '> ' },
        },
        {
          id: 'help-files',
          type: 'help',
          section: 'Modes',
          title: 'Open Files & Buffers',
          subtitle: 'Search project files and active workspace tabs',
          shortcut: 'Ctrl+P',
          badge: 'Mode',
          data: { prefix: '' },
        },
        {
          id: 'help-sym',
          type: 'help',
          section: 'Modes',
          title: 'Go to Symbol in File',
          subtitle: 'Jump to functions, classes, interfaces, and methods in active buffer',
          shortcut: '@',
          badge: 'Mode',
          data: { prefix: '@' },
        },
        {
          id: 'help-ws-sym',
          type: 'help',
          section: 'Modes',
          title: 'Workspace Symbols',
          subtitle: 'Search symbols and capabilities across the whole project',
          shortcut: '#',
          badge: 'Mode',
          data: { prefix: '#' },
        },
        {
          id: 'help-goto',
          type: 'help',
          section: 'Modes',
          title: 'Go to Line & Column',
          subtitle: 'Jump directly to line numbers (e.g. :42 or :42:10)',
          shortcut: ':',
          badge: 'Mode',
          data: { prefix: ':' },
        },
        {
          id: 'help-edt',
          type: 'help',
          section: 'Modes',
          title: 'Open Editors & Tabs',
          subtitle: 'Filter and manage currently open tabs with 1-click close',
          shortcut: 'edt',
          badge: 'Mode',
          data: { prefix: 'edt ' },
        },
        {
          id: 'help-ext',
          type: 'help',
          section: 'Modes',
          title: 'Manage Extensions',
          subtitle: 'Search and toggle enable/disable for all 60 extensions',
          shortcut: 'ext',
          badge: 'Mode',
          data: { prefix: 'ext ' },
        },
        {
          id: 'help-themes',
          type: 'help',
          section: 'Modes',
          title: 'Color Themes & Live Preview',
          subtitle: 'Browse and preview themes live with arrow keys',
          shortcut: 'theme',
          badge: 'Mode',
          data: { prefix: 'theme ' },
        },
      ]

      if (!search) return helpModes
      return helpModes.filter(
        (h) =>
          h.title.toLowerCase().includes(search.toLowerCase()) ||
          (h.subtitle && h.subtitle.toLowerCase().includes(search.toLowerCase())) ||
          (h.shortcut && h.shortcut.toLowerCase().includes(search.toLowerCase()))
      )
    }

    // 2. Go to Line Mode (:)
    if (mode === 'gotoline') {
      if (lineColMatch) {
        return [
          {
            id: `goto-${lineColMatch.line}-${lineColMatch.col}`,
            type: 'gotoline',
            section: 'Navigation',
            title: `Jump to Line ${lineColMatch.line}${lineColMatch.col > 1 ? `, Column ${lineColMatch.col}` : ''}`,
            subtitle: `Target: ${activeTabName || 'active buffer'}${totalLines ? ` (Total lines: ${totalLines})` : ''}`,
            shortcut: 'Enter',
            badge: 'Line',
            data: lineColMatch,
          },
        ]
      }
      return []
    }

    // 3. Open Editors / Tabs Mode (edt )
    if (mode === 'editors' || activeTab === 'Tabs') {
      const rawTabs = tabs.map((t, idx) => ({
        id: `tab-${t.id}`,
        type: 'tab' as const,
        section: 'Open Editors',
        title: t.name,
        subtitle: t.id,
        shortcut: idx < 9 ? `Alt+${idx + 1}` : undefined,
        badge: t.isDirty ? 'Modified' : 'Open Tab',
        data: { tabId: t.id, name: t.name },
      }))

      if (!search) return rawTabs

      const scored = rawTabs
        .map((item) => {
          const matchTitle = fuzzyMatch(search, item.title)
          const matchSub = fuzzyMatch(search, item.subtitle || '')
          if (!matchTitle && !matchSub) return null
          const score = Math.max(matchTitle?.score || 0, (matchSub?.score || 0) * 0.8)
          return {
            ...item,
            score,
            titleMatches: matchTitle?.indices,
            subtitleMatches: matchSub?.indices,
          }
        })
        .filter(Boolean) as PaletteItem[]

      return scored.sort((a, b) => (b.score || 0) - (a.score || 0))
    }

    // 4. Extensions Mode (ext )
    if (mode === 'extensions' || activeTab === 'Extensions') {
      const allExts = extensionRegistry.getAll()
      const rawExts = allExts.map((ext) => {
        const isEnabled = extensionRegistry.isEnabled(ext.id)
        return {
          id: `ext-${ext.id}`,
          type: 'extension' as const,
          section: 'Extensions',
          title: ext.name,
          subtitle: `${ext.description || ext.category} · v${ext.version}`,
          shortcut: isEnabled ? 'Active' : 'Disabled',
          badge: ext.category,
          data: { ext, isEnabled },
        }
      })

      if (!search) return rawExts

      const scored = rawExts
        .map((item) => {
          const matchTitle = fuzzyMatch(search, item.title)
          const matchSub = fuzzyMatch(search, item.subtitle || '')
          const matchCat = fuzzyMatch(search, item.badge || '')
          if (!matchTitle && !matchSub && !matchCat) return null
          const score = Math.max(
            matchTitle?.score || 0,
            (matchSub?.score || 0) * 0.75,
            (matchCat?.score || 0) * 0.8
          )
          return {
            ...item,
            score,
            titleMatches: matchTitle?.indices,
            subtitleMatches: matchSub?.indices,
          }
        })
        .filter(Boolean) as PaletteItem[]

      return scored.sort((a, b) => (b.score || 0) - (a.score || 0))
    }

    // 5. Themes Mode (theme )
    if (mode === 'themes' || activeTab === 'Themes') {
      const rawThemes = registeredThemes.map((th) => ({
        id: `theme-${th.id}`,
        type: 'theme' as const,
        section: 'Color Themes',
        title: th.name,
        subtitle: th.description || `${th.type} Theme by ${th.author}`,
        shortcut: th.id === currentThemeId ? 'Current' : undefined,
        badge: th.type,
        data: th,
      }))

      if (!search) return rawThemes

      const scored = rawThemes
        .map((item) => {
          const matchTitle = fuzzyMatch(search, item.title)
          const matchSub = fuzzyMatch(search, item.subtitle || '')
          if (!matchTitle && !matchSub) return null
          const score = Math.max(matchTitle?.score || 0, (matchSub?.score || 0) * 0.8)
          return {
            ...item,
            score,
            titleMatches: matchTitle?.indices,
            subtitleMatches: matchSub?.indices,
          }
        })
        .filter(Boolean) as PaletteItem[]

      return scored.sort((a, b) => (b.score || 0) - (a.score || 0))
    }

    // 6. Symbols Mode (@)
    if (mode === 'symbol' || activeTab === 'Symbols') {
      const rawSymbols = symbols.map((sym, idx) => ({
        id: `sym-${sym.name}-${sym.line}-${idx}`,
        type: 'symbol' as const,
        section: 'Outline Symbols',
        title: sym.name,
        subtitle: `${sym.detail || sym.kind} · Line ${sym.line}`,
        badge: sym.kind,
        shortcut: `L${sym.line}`,
        data: sym,
      }))

      if (!search) return rawSymbols

      const scored = rawSymbols
        .map((item) => {
          const matchTitle = fuzzyMatch(search, item.title)
          const matchSub = fuzzyMatch(search, item.subtitle || '')
          if (!matchTitle && !matchSub) return null
          const score = Math.max(matchTitle?.score || 0, (matchSub?.score || 0) * 0.8)
          return {
            ...item,
            score,
            titleMatches: matchTitle?.indices,
            subtitleMatches: matchSub?.indices,
          }
        })
        .filter(Boolean) as PaletteItem[]

      return scored.sort((a, b) => (b.score || 0) - (a.score || 0))
    }

    // 7. Workspace Symbols & Capabilities Mode (#)
    if (mode === 'workspace-symbol') {
      const rawWsSyms: PaletteItem[] = symbols.map((sym, idx) => ({
        id: `ws-sym-${sym.name}-${idx}`,
        type: 'symbol',
        section: 'Document Symbols',
        title: sym.name,
        subtitle: `${sym.detail || sym.kind} · Line ${sym.line}`,
        badge: sym.kind,
        data: sym,
      }))

      const rawCmds: PaletteItem[] = commands.map((cmd) => ({
        id: `ws-cmd-${cmd.id}`,
        type: 'command',
        section: 'Capabilities',
        title: cmd.title,
        subtitle: cmd.description || cmd.category,
        shortcut: cmd.shortcut,
        badge: cmd.category,
        data: cmd,
      }))

      const combined = [...rawWsSyms, ...rawCmds]
      if (!search) return combined

      const scored = combined
        .map((item) => {
          const matchTitle = fuzzyMatch(search, item.title)
          const matchSub = fuzzyMatch(search, item.subtitle || '')
          if (!matchTitle && !matchSub) return null
          const score = Math.max(matchTitle?.score || 0, (matchSub?.score || 0) * 0.8)
          return {
            ...item,
            score,
            titleMatches: matchTitle?.indices,
            subtitleMatches: matchSub?.indices,
          }
        })
        .filter(Boolean) as PaletteItem[]

      return scored.sort((a, b) => (b.score || 0) - (a.score || 0))
    }

    // 8. Commands Mode (>)
    if (mode === 'command' || activeTab === 'Commands') {
      const rawCmds = commands.map((cmd) => ({
        id: `cmd-${cmd.id}`,
        type: 'command' as const,
        section: 'Commands',
        title: cmd.title,
        subtitle: cmd.description || cmd.category,
        shortcut: cmd.shortcut,
        badge: cmd.category,
        data: cmd,
      }))

      if (!search) {
        // If empty query in command mode, surface Recently Used commands at the top
        if (recentHistory.length > 0) {
          const recentCmdIds = new Set(recentHistory.filter((h) => h.type === 'command').map((h) => h.id))
          const recentItems: PaletteItem[] = []
          const otherItems: PaletteItem[] = []

          for (const cmdItem of rawCmds) {
            const rawId = cmdItem.data.id
            if (recentCmdIds.has(rawId)) {
              recentItems.push({
                ...cmdItem,
                section: 'Recently Used',
              })
            } else {
              otherItems.push(cmdItem)
            }
          }
          return [...recentItems, ...otherItems]
        }
        return rawCmds
      }

      const scored = rawCmds
        .map((item) => {
          const matchTitle = fuzzyMatch(search, item.title)
          const matchSub = fuzzyMatch(search, item.subtitle || '')
          const matchCat = fuzzyMatch(search, item.badge || '')
          if (!matchTitle && !matchSub && !matchCat) return null
          const score = Math.max(
            matchTitle?.score || 0,
            (matchSub?.score || 0) * 0.7,
            (matchCat?.score || 0) * 0.85
          )
          return {
            ...item,
            score,
            titleMatches: matchTitle?.indices,
            subtitleMatches: matchSub?.indices,
          }
        })
        .filter(Boolean) as PaletteItem[]

      return scored.sort((a, b) => (b.score || 0) - (a.score || 0))
    }

    // 9. Files Filter Tab
    if (activeTab === 'Files') {
      const tabPaths = new Set(tabs.map((t) => t.id))
      const allFiles = [
        ...tabs.map((t) => ({ path: t.id, name: t.name, isTab: true })),
        ...workspaceFiles
          .filter((f) => !f.isDirectory && !tabPaths.has(f.path))
          .map((f) => ({ path: f.path, name: f.name, isTab: false })),
      ]

      const rawFiles = allFiles.map((f) => ({
        id: `file-${f.path}`,
        type: 'file' as const,
        section: f.isTab ? 'Open Editors' : 'Workspace Files',
        title: f.name,
        subtitle: f.path,
        badge: f.isTab ? 'Open' : undefined,
        data: f,
      }))

      if (!search) return rawFiles

      const scored = rawFiles
        .map((item) => {
          const matchTitle = fuzzyMatch(search, item.title)
          const matchSub = fuzzyMatch(search, item.subtitle || '')
          if (!matchTitle && !matchSub) return null
          const score = Math.max(matchTitle?.score || 0, (matchSub?.score || 0) * 0.8)
          return {
            ...item,
            score,
            titleMatches: matchTitle?.indices,
            subtitleMatches: matchSub?.indices,
          }
        })
        .filter(Boolean) as PaletteItem[]

      return scored.sort((a, b) => (b.score || 0) - (a.score || 0))
    }

    // 10. Default Unified Smart Search (Files, Open Tabs, Top Commands, Symbols, Extensions, History)
    const tabPaths = new Set(tabs.map((t) => t.id))
    const filesList: { path: string; name: string; isTab: boolean }[] = [
      ...tabs.map((t) => ({ path: t.id, name: t.name, isTab: true })),
      ...workspaceFiles
        .filter((f) => !f.isDirectory && !tabPaths.has(f.path))
        .map((f) => ({ path: f.path, name: f.name, isTab: false })),
    ]

    const allFileItems: PaletteItem[] = filesList.map((f) => ({
      id: `file-${f.path}`,
      type: 'file',
      section: f.isTab ? 'Open Editors' : 'Files',
      title: f.name,
      subtitle: f.path,
      badge: f.isTab ? 'Open Tab' : undefined,
      data: f,
    }))

    const allCmdItems: PaletteItem[] = commands.map((c) => ({
      id: `cmd-${c.id}`,
      type: 'command',
      section: 'Commands',
      title: c.title,
      subtitle: c.description || c.category,
      shortcut: c.shortcut,
      badge: c.category,
      data: c,
    }))

    const allSymItems: PaletteItem[] = symbols.map((s, idx) => ({
      id: `sym-${s.name}-${s.line}-${idx}`,
      type: 'symbol',
      section: 'Symbols',
      title: s.name,
      subtitle: `${s.detail || s.kind} · Line ${s.line}`,
      badge: s.kind,
      data: s,
    }))

    if (!search) {
      // Empty search in unified mode: Show Recently Used, Open Tabs, and Quick Actions
      const result: PaletteItem[] = []

      if (recentHistory.length > 0) {
        for (const h of recentHistory.slice(0, 5)) {
          if (h.type === 'command') {
            const matchedCmd = commands.find((c) => c.id === h.id)
            if (matchedCmd) {
              result.push({
                id: `recent-cmd-${h.id}`,
                type: 'command',
                section: 'Recently Used',
                title: matchedCmd.title,
                subtitle: matchedCmd.description || matchedCmd.category,
                shortcut: matchedCmd.shortcut,
                badge: 'Recent',
                data: matchedCmd,
              })
            }
          } else if (h.type === 'file') {
            result.push({
              id: `recent-file-${h.id}`,
              type: 'file',
              section: 'Recently Used',
              title: h.title,
              subtitle: h.subtitle || h.id,
              badge: 'Recent',
              data: { path: h.id, name: h.title },
            })
          }
        }
      }

      // Add Open Tabs
      const openTabs = allFileItems.filter((f) => f.data.isTab).slice(0, 8)
      result.push(...openTabs)

      // Add Top Commands
      const topCmds = allCmdItems.slice(0, 8)
      result.push(...topCmds)

      return result
    }

    // Fuzzy search across files, commands, and symbols
    const scoredFiles: PaletteItem[] = allFileItems
      .map((item) => {
        const matchTitle = fuzzyMatch(search, item.title)
        const matchSub = fuzzyMatch(search, item.subtitle || '')
        if (!matchTitle && !matchSub) return null
        const score = Math.max(matchTitle?.score || 0, (matchSub?.score || 0) * 0.8)
        return { ...item, score, titleMatches: matchTitle?.indices, subtitleMatches: matchSub?.indices }
      })
      .filter(Boolean) as PaletteItem[]

    const scoredCmds: PaletteItem[] = allCmdItems
      .map((item) => {
        const matchTitle = fuzzyMatch(search, item.title)
        const matchSub = fuzzyMatch(search, item.subtitle || '')
        const matchCat = fuzzyMatch(search, item.badge || '')
        if (!matchTitle && !matchSub && !matchCat) return null
        const score = Math.max(
          matchTitle?.score || 0,
          (matchSub?.score || 0) * 0.75,
          (matchCat?.score || 0) * 0.85
        )
        return { ...item, score, titleMatches: matchTitle?.indices, subtitleMatches: matchSub?.indices }
      })
      .filter(Boolean) as PaletteItem[]

    const scoredSyms: PaletteItem[] = allSymItems
      .map((item) => {
        const matchTitle = fuzzyMatch(search, item.title)
        const matchSub = fuzzyMatch(search, item.subtitle || '')
        if (!matchTitle && !matchSub) return null
        const score = Math.max(matchTitle?.score || 0, (matchSub?.score || 0) * 0.8)
        return { ...item, score, titleMatches: matchTitle?.indices, subtitleMatches: matchSub?.indices }
      })
      .filter(Boolean) as PaletteItem[]

    scoredFiles.sort((a, b) => (b.score || 0) - (a.score || 0))
    scoredCmds.sort((a, b) => (b.score || 0) - (a.score || 0))
    scoredSyms.sort((a, b) => (b.score || 0) - (a.score || 0))

    return [...scoredFiles.slice(0, 10), ...scoredCmds.slice(0, 10), ...scoredSyms.slice(0, 5)]
  }, [
    effectiveSearchTerm,
    mode,
    activeTab,
    commands,
    symbols,
    workspaceFiles,
    tabs,
    recentHistory,
    lineColMatch,
    activeTabName,
    totalLines,
    currentThemeId,
    extensionsTick,
  ])

  // Reset selected index when query, mode, or tab changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, mode, activeTab])

  // Live Theme Preview on hover or arrow navigation
  useEffect(() => {
    const selected = filteredItems[selectedIndex]
    if (selected && selected.type === 'theme' && onPreviewTheme) {
      const themeId = selected.data?.id
      if (themeId) {
        onPreviewTheme(themeId)
      }
    }
  }, [selectedIndex, filteredItems, onPreviewTheme])

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  // Handle palette closing and theme rollback
  const handleDismiss = useCallback(() => {
    if (initialThemeSnapshot && onPreviewTheme && initialThemeSnapshot !== currentThemeId) {
      onPreviewTheme(initialThemeSnapshot)
    }
    onClose()
  }, [initialThemeSnapshot, onPreviewTheme, currentThemeId, onClose])

  // Execution dispatcher
  const executeItem = useCallback(
    (item: PaletteItem) => {
      if (!item) return

      if (item.type === 'command') {
        recordPaletteExecution({
          id: item.data.id,
          type: 'command',
          title: item.title,
          subtitle: item.subtitle,
          shortcut: item.shortcut,
          category: item.category || item.badge,
        })
        onClose()
        item.data.handler()
      } else if (item.type === 'file' || item.type === 'tab') {
        recordPaletteExecution({
          id: item.data.path || item.data.tabId,
          type: 'file',
          title: item.title,
          subtitle: item.subtitle,
        })
        onClose()
        onOpenFile({ path: item.data.path || item.data.tabId, name: item.title })
      } else if (item.type === 'symbol') {
        onClose()
        onGoToLine?.(item.data.line, 1)
      } else if (item.type === 'gotoline') {
        onClose()
        onGoToLine?.(item.data.line, item.data.col)
      } else if (item.type === 'extension') {
        const ext = item.data.ext
        extensionRegistry.toggle(ext.id)
        setExtensionsTick((v) => v + 1)
      } else if (item.type === 'theme') {
        recordPaletteExecution({
          id: item.data.id,
          type: 'theme',
          title: item.title,
          subtitle: item.subtitle,
        })
        if (onSelectTheme) {
          onSelectTheme(item.data.id)
        } else if (onPreviewTheme) {
          onPreviewTheme(item.data.id)
        }
        onClose()
      } else if (item.type === 'help') {
        setQuery(item.data.prefix)
        inputRef.current?.focus()
      }
    },
    [onClose, onOpenFile, onGoToLine, onSelectTheme, onPreviewTheme]
  )

  // Direct tab closing action from palette
  const handleRemoveTabItem = useCallback(
    (tabId: string, e?: React.MouseEvent) => {
      e?.stopPropagation()
      if (onCloseTab) {
        onCloseTab(tabId)
      }
    },
    [onCloseTab]
  )

  // Remove single item from recent history
  const handleRemoveHistoryItem = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const updated = removePaletteHistoryItem(id)
    setRecentHistory(updated)
  }, [])

  // Clear all recent history
  const handleClearAllHistory = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    clearPaletteHistory()
    setRecentHistory([])
  }, [])

  // Keyboard navigation & Shortcuts handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const total = filteredItems.length

    if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'j')) {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, total))
    } else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'k')) {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + total) % Math.max(1, total))
    } else if (e.key === 'PageDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(total - 1, prev + 6))
    } else if (e.key === 'PageUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(0, prev - 6))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setSelectedIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setSelectedIndex(Math.max(0, total - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredItems[selectedIndex]) {
        executeItem(filteredItems[selectedIndex])
      }
    } else if (e.key === 'Tab') {
      const selected = filteredItems[selectedIndex]
      if (selected && selected.type === 'help') {
        e.preventDefault()
        setQuery(selected.data.prefix)
      }
    } else if (e.key === 'Delete' || (e.ctrlKey && e.key === 'w')) {
      const selected = filteredItems[selectedIndex]
      if (selected && (selected.type === 'tab' || (selected.type === 'file' && selected.data?.isTab))) {
        e.preventDefault()
        handleRemoveTabItem(selected.data.path || selected.data.tabId)
      } else if (selected && selected.section === 'Recently Used') {
        e.preventDefault()
        handleRemoveHistoryItem(selected.data?.id || selected.id)
      }
    } else if (e.key === 'Backspace' && query === '') {
      // If user presses backspace in empty query, reset mode to unified
      setActiveTab('All')
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleDismiss()
    }
  }

  // Visual icons by category
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
      case 'Run':
      case 'Debug':
        return <Zap size={14} className="cat-icon debug" />
      case 'Terminal':
        return <Terminal size={14} className="cat-icon terminal" />
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
        return 'Type a command, tool, or action name...'
      case 'symbol':
        return `Search symbols in ${activeTabName || 'active file'} (@)...`
      case 'workspace-symbol':
        return 'Search symbols and features across project (#)...'
      case 'gotoline':
        return totalLines
          ? `Type line 1-${totalLines} to navigate (:line or :line:col)...`
          : 'Type line number to navigate (:line or :line:col)...'
      case 'editors':
        return 'Search and switch open tabs (edt)...'
      case 'extensions':
        return 'Search and toggle extensions (ext)...'
      case 'themes':
        return 'Search and preview color themes (theme)...'
      case 'help':
        return 'Type prefix to change mode (?, >, @, #, :, edt, ext, theme)...'
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
      case 'editors':
        return { label: 'Open Tabs', icon: <Layers size={12} /> }
      case 'extensions':
        return { label: 'Extensions', icon: <Blocks size={12} /> }
      case 'themes':
        return { label: 'Themes', icon: <Palette size={12} /> }
      case 'help':
        return { label: 'Help & Modes', icon: <HelpCircle size={12} /> }
      default:
        return { label: 'Universal', icon: <Search size={12} /> }
    }
  }

  const badge = getModeBadge()
  const activeItem = filteredItems[selectedIndex]

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="palette-backdrop" onClick={handleDismiss}>
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
                <Terminal size={17} className="palette-mode-icon command" />
              ) : mode === 'symbol' ? (
                <Code2 size={17} className="palette-mode-icon symbol" />
              ) : mode === 'gotoline' ? (
                <Compass size={17} className="palette-mode-icon goto" />
              ) : mode === 'extensions' ? (
                <Blocks size={17} className="palette-mode-icon extensions" />
              ) : mode === 'themes' ? (
                <Palette size={17} className="palette-mode-icon theme" />
              ) : mode === 'editors' ? (
                <Layers size={17} className="palette-mode-icon editors" />
              ) : (
                <Search size={17} className="palette-mode-icon search" />
              )}
              <input
                ref={inputRef}
                type="text"
                className="palette-input"
                placeholder={getPlaceholder()}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />

              {query && (
                <button
                  className="palette-clear-btn glass-interactive"
                  onClick={() => {
                    setQuery('')
                    inputRef.current?.focus()
                  }}
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}

              <div className="palette-hint-pill">
                {badge.icon}
                <span>{badge.label}</span>
              </div>
            </div>

            {/* Quick-filter Category Tabs (shown in Unified mode) */}
            {mode === 'unified' && (
              <div className="palette-tabs-row">
                {(['All', 'Commands', 'Files', 'Tabs', 'Symbols', 'Extensions', 'Themes'] as FilterTab[]).map(
                  (tab) => (
                    <button
                      key={tab}
                      className={`palette-filter-chip glass-interactive ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      <span>{tab}</span>
                    </button>
                  )
                )}
              </div>
            )}

            {/* Main Content Pane (Split with Results List + Detail Sidecar) */}
            <div className="palette-body-container">
              {/* Results List */}
              <div className="palette-list custom-scrollbar" ref={listRef}>
                {filteredItems.length === 0 ? (
                  <div className="palette-empty">
                    {mode === 'gotoline' ? (
                      <>
                        <Compass size={24} className="empty-icon goto" />
                        <span>
                          Type a valid line number like <code>:42</code> or <code>:42:10</code>
                        </span>
                        {totalLines && <span className="empty-sub">Active buffer has {totalLines} lines</span>}
                      </>
                    ) : (
                      <>
                        <Sparkles size={22} className="empty-icon" />
                        <span>No matching items found</span>
                        <span className="empty-sub">Try typing <code>?</code> for available search modes</span>
                      </>
                    )}
                  </div>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isSelected = idx === selectedIndex
                    const isFirstInSection =
                      idx === 0 || filteredItems[idx - 1].section !== item.section

                    return (
                      <React.Fragment key={item.id}>
                        {isFirstInSection && (
                          <div className="palette-section-header">
                            <span className="section-label">{item.section}</span>
                            {item.section === 'Recently Used' && (
                              <button
                                className="section-clear-btn"
                                onClick={handleClearAllHistory}
                                title="Clear recent history"
                              >
                                <Trash2 size={11} /> Clear
                              </button>
                            )}
                          </div>
                        )}

                        <div
                          className={`palette-row glass-interactive ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedIndex(idx)
                            executeItem(item)
                          }}
                          onMouseEnter={() => setSelectedIndex(idx)}
                        >
                          {/* Row Left: Icon + Titles */}
                          <div className="row-left">
                            {item.type === 'command' && getCategoryIcon(item.category || item.badge || 'Editor')}
                            {item.type === 'file' && <FileCode size={14} className="cat-icon file" />}
                            {item.type === 'tab' && <Layers size={14} className="cat-icon tab" />}
                            {item.type === 'symbol' && getSymbolKindIcon(item.badge || 'default')}
                            {item.type === 'gotoline' && <Compass size={14} className="cat-icon goto" />}
                            {item.type === 'extension' && <Blocks size={14} className="cat-icon extensions" />}
                            {item.type === 'theme' && <Palette size={14} className="cat-icon theme" />}
                            {item.type === 'help' && (
                              <kbd className="prefix-kbd">{item.shortcut || '>'}</kbd>
                            )}

                            <div className="row-text">
                              <span className="row-title">
                                {highlightMatches(item.title, item.titleMatches || [])}
                              </span>
                              {item.subtitle && (
                                <span className="row-subtitle">
                                  {highlightMatches(item.subtitle, item.subtitleMatches || [])}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Row Right: Badges, Shortcuts & Quick Actions */}
                          <div className="row-right">
                            {item.badge && item.type !== 'help' && (
                              <span className={`row-badge ${item.badge.toLowerCase()}`}>
                                {item.badge}
                              </span>
                            )}

                            {item.shortcut && item.type !== 'help' && (
                              <span className="row-shortcut">{item.shortcut}</span>
                            )}

                            {/* Direct close button for open tabs */}
                            {(item.type === 'tab' || (item.type === 'file' && item.data?.isTab)) && (
                              <button
                                className="row-action-btn tab-close"
                                onClick={(e) =>
                                  handleRemoveTabItem(item.data.path || item.data.tabId, e)
                                }
                                title="Close Tab (Del)"
                              >
                                <X size={12} />
                              </button>
                            )}

                            {/* Remove button for recent history */}
                            {item.section === 'Recently Used' && (
                              <button
                                className="row-action-btn history-remove"
                                onClick={(e) => handleRemoveHistoryItem(item.data?.id || item.id, e)}
                                title="Remove from recent history"
                              >
                                <X size={12} />
                              </button>
                            )}

                            {/* Direct toggle for extensions */}
                            {item.type === 'extension' && (
                              <span
                                className={`ext-status-pill ${item.data?.isEnabled ? 'enabled' : 'disabled'}`}
                              >
                                {item.data?.isEnabled ? <Check size={11} /> : <X size={11} />}
                                <span>{item.data?.isEnabled ? 'Active' : 'Disabled'}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    )
                  })
                )}
              </div>

              {/* Detail Inspector Sidecard (Desktop Preview) */}
              {activeItem && (
                <div className="palette-inspector-pane">
                  <div className="inspector-header">
                    <span className="inspector-eyebrow">
                      {activeItem.section} · {activeItem.badge || activeItem.type.toUpperCase()}
                    </span>
                    <h4 className="inspector-title">{activeItem.title}</h4>
                  </div>

                  <div className="inspector-body custom-scrollbar">
                    {activeItem.type === 'command' && (
                      <div className="inspector-group">
                        <span className="group-label">Description</span>
                        <p className="group-text">
                          {activeItem.data?.description || 'Built-in editor action.'}
                        </p>

                        <span className="group-label">Category</span>
                        <span className="meta-pill">{activeItem.data?.category || 'Editor'}</span>

                        {activeItem.data?.shortcut && (
                          <>
                            <span className="group-label">Keyboard Shortcut</span>
                            <div className="keycap-group">
                              {activeItem.data.shortcut.split('+').map((k: string) => (
                                <kbd key={k} className="inspector-kbd">
                                  {k}
                                </kbd>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {(activeItem.type === 'file' || activeItem.type === 'tab') && (
                      <div className="inspector-group">
                        <span className="group-label">File Path</span>
                        <code className="path-code">{activeItem.data?.path || activeItem.data?.tabId}</code>

                        <span className="group-label">Buffer Status</span>
                        <span className="meta-pill">
                          {activeItem.data?.isTab ? 'Currently Open in Tab' : 'Workspace File'}
                        </span>
                      </div>
                    )}

                    {activeItem.type === 'symbol' && (
                      <div className="inspector-group">
                        <span className="group-label">Symbol Kind</span>
                        <span className="meta-pill">{activeItem.data?.kind}</span>

                        <span className="group-label">Navigation Target</span>
                        <p className="group-text">
                          Line {activeItem.data?.line} in {activeTabName || 'active file'}
                        </p>
                      </div>
                    )}

                    {activeItem.type === 'extension' && (
                      <div className="inspector-group">
                        <span className="group-label">Extension Manifest</span>
                        <p className="group-text">{activeItem.data?.ext?.description}</p>

                        <div className="ext-meta-grid">
                          <div>
                            <span className="group-label">Version</span>
                            <span className="meta-pill">v{activeItem.data?.ext?.version}</span>
                          </div>
                          <div>
                            <span className="group-label">Author</span>
                            <span className="meta-pill">{activeItem.data?.ext?.author}</span>
                          </div>
                        </div>

                        <span className="group-label">State</span>
                        <span
                          className={`ext-status-pill ${activeItem.data?.isEnabled ? 'enabled' : 'disabled'}`}
                        >
                          {activeItem.data?.isEnabled ? 'Enabled & Loaded' : 'Disabled'}
                        </span>
                      </div>
                    )}

                    {activeItem.type === 'theme' && (
                      <div className="inspector-group">
                        <span className="group-label">Theme Type</span>
                        <span className="meta-pill">{activeItem.data?.type}</span>

                        <span className="group-label">Author</span>
                        <span className="meta-pill">{activeItem.data?.author || 'Indoctrinated'}</span>

                        <p className="group-text">{activeItem.data?.description}</p>
                        <div className="theme-preview-pill">
                          <SunMoon size={13} />
                          <span>Live arrow preview active</span>
                        </div>
                      </div>
                    )}

                    {activeItem.type === 'help' && (
                      <div className="inspector-group">
                        <span className="group-label">Command Prefix</span>
                        <kbd className="prefix-kbd large">{activeItem.shortcut}</kbd>
                        <p className="group-text">{activeItem.subtitle}</p>
                        <span className="meta-pill">Press Enter or Tab to switch mode</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer shortcuts hint */}
            <div className="palette-footer">
              <div className="footer-left">
                <span className="footer-tip">
                  <kbd>↑</kbd><kbd>↓</kbd> or <kbd>Ctrl+J/K</kbd> navigate
                </span>
                <span className="footer-tip">
                  <kbd>Enter</kbd> execute
                </span>
                <span className="footer-tip">
                  <kbd>Tab</kbd> complete
                </span>
                <span className="footer-tip">
                  <kbd>Del</kbd> close tab
                </span>
                <span className="footer-tip">
                  <kbd>Esc</kbd> dismiss
                </span>
              </div>
              <div className="footer-right">
                <span className="footer-tip item-count">
                  {filteredItems.length > 0
                    ? `${selectedIndex + 1} of ${filteredItems.length}`
                    : '0 items'}
                </span>
              </div>
            </div>
          </motion.div>

          <style>{`
            .palette-backdrop {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.52);
              backdrop-filter: blur(14px);
              -webkit-backdrop-filter: blur(14px);
              z-index: 1040;
              display: flex;
              justify-content: center;
              padding-top: 50px;
            }

            .palette-modal {
              width: 760px;
              max-width: 94vw;
              height: 520px;
              max-height: 84vh;
              display: flex;
              flex-direction: column;
              background: rgba(14, 18, 32, 0.90);
              backdrop-filter: blur(40px) saturate(210%) brightness(1.15);
              -webkit-backdrop-filter: blur(40px) saturate(210%) brightness(1.15);
              border: 1px solid rgba(255, 255, 255, 0.18);
              border-radius: var(--radius-lg, 16px);
              box-shadow: 0 32px 80px -10px rgba(0, 0, 0, 0.85), 0 0 38px rgba(10, 132, 255, 0.28);
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
              flex-shrink: 0;
            }
            .palette-mode-icon.command { color: var(--accent-primary, #0A84FF); }
            .palette-mode-icon.symbol { color: #BF5AF2; }
            .palette-mode-icon.goto { color: #30D158; }
            .palette-mode-icon.extensions { color: #FF9F0A; }
            .palette-mode-icon.theme { color: #FF2D55; }
            .palette-mode-icon.editors { color: #5AC8FA; }

            .palette-input {
              flex: 1;
              background: transparent;
              border: none;
              outline: none;
              color: rgba(255, 255, 255, 0.96);
              font-size: 0.94rem;
              letter-spacing: -0.01em;
            }

            .palette-input::placeholder {
              color: rgba(235, 235, 245, 0.38);
              font-size: 0.88rem;
            }

            .palette-clear-btn {
              padding: 4px;
              background: rgba(255, 255, 255, 0.06);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 5px;
              color: rgba(235, 235, 245, 0.6);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .palette-clear-btn:hover {
              background: rgba(255, 255, 255, 0.12);
              color: #fff;
            }

            .palette-hint-pill {
              display: flex;
              align-items: center;
              gap: 5px;
              padding: 4px 9px;
              background: rgba(255, 255, 255, 0.07);
              border: 1px solid rgba(255, 255, 255, 0.14);
              border-radius: 6px;
              font-size: 0.72rem;
              font-weight: 500;
              color: rgba(235, 235, 245, 0.82);
            }

            .palette-tabs-row {
              display: flex;
              gap: 6px;
              padding: 6px 16px;
              background: rgba(0, 0, 0, 0.18);
              border-bottom: 1px solid rgba(255, 255, 255, 0.06);
              overflow-x: auto;
            }

            .palette-filter-chip {
              padding: 3px 10px;
              border-radius: 6px;
              background: transparent;
              border: 1px solid transparent;
              color: rgba(235, 235, 245, 0.58);
              font-size: 0.74rem;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.15s ease;
            }

            .palette-filter-chip:hover {
              background: rgba(255, 255, 255, 0.06);
              color: rgba(255, 255, 255, 0.88);
            }

            .palette-filter-chip.active {
              background: rgba(10, 132, 255, 0.22);
              border-color: rgba(10, 132, 255, 0.45);
              color: #5AC8FA;
            }

            .palette-body-container {
              flex: 1;
              display: flex;
              overflow: hidden;
              position: relative;
            }

            .palette-list {
              flex: 1;
              overflow-y: auto;
              padding: 6px 8px;
              display: flex;
              flex-direction: column;
              gap: 2px;
            }

            .palette-section-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 6px 10px 3px 10px;
              font-size: 0.68rem;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: rgba(235, 235, 245, 0.42);
            }

            .section-clear-btn {
              background: transparent;
              border: none;
              color: rgba(235, 235, 245, 0.4);
              font-size: 0.66rem;
              display: flex;
              align-items: center;
              gap: 3px;
              cursor: pointer;
              padding: 2px 4px;
              border-radius: 4px;
            }
            .section-clear-btn:hover {
              color: #FF453A;
              background: rgba(255, 69, 58, 0.12);
            }

            .palette-empty {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 48px 16px;
              gap: 8px;
              color: rgba(235, 235, 245, 0.5);
              font-size: 0.86rem;
            }

            .palette-empty code {
              padding: 2px 6px;
              background: rgba(255, 255, 255, 0.08);
              border-radius: 4px;
              color: #5AC8FA;
            }

            .empty-sub {
              font-size: 0.74rem;
              color: rgba(235, 235, 245, 0.35);
            }

            .palette-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 7px 12px;
              border-radius: 8px;
              border: 1px solid transparent;
              cursor: pointer;
              transition: all 0.12s ease;
            }

            .palette-row:hover {
              background: rgba(255, 255, 255, 0.04);
            }

            .palette-row.selected {
              background: linear-gradient(90deg, rgba(10, 132, 255, 0.24) 0%, rgba(10, 132, 255, 0.08) 100%);
              border-color: rgba(10, 132, 255, 0.4);
            }

            .row-left {
              display: flex;
              align-items: center;
              gap: 11px;
              min-width: 0;
              flex: 1;
            }

            .cat-icon {
              color: rgba(235, 235, 245, 0.6);
              flex-shrink: 0;
            }
            .cat-icon.file { color: #5AC8FA; }
            .cat-icon.tab { color: #30D158; }
            .cat-icon.git { color: #FF9F0A; }
            .cat-icon.theme { color: #BF5AF2; }
            .cat-icon.settings { color: #FFD60A; }
            .cat-icon.ai { color: #FF2D55; }
            .cat-icon.editor { color: #30D158; }
            .cat-icon.goto { color: #30D158; }
            .cat-icon.extensions { color: #FF9F0A; }
            .cat-icon.debug { color: #FF453A; }
            .cat-icon.terminal { color: #64D2FF; }

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
              flex: 1;
            }

            .row-title {
              font-size: 0.86rem;
              color: rgba(255, 255, 255, 0.94);
              font-weight: 500;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .row-subtitle {
              font-size: 0.72rem;
              color: rgba(235, 235, 245, 0.45);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .palette-highlight {
              background: transparent;
              color: #5AC8FA;
              font-weight: 700;
              text-decoration: underline;
              text-decoration-color: rgba(90, 200, 250, 0.6);
            }

            .row-right {
              display: flex;
              align-items: center;
              gap: 8px;
              flex-shrink: 0;
            }

            .row-badge {
              font-size: 0.66rem;
              font-weight: 600;
              padding: 2px 6px;
              border-radius: 4px;
              background: rgba(255, 255, 255, 0.08);
              border: 1px solid rgba(255, 255, 255, 0.12);
              color: rgba(235, 235, 245, 0.7);
              text-transform: uppercase;
            }

            .row-shortcut {
              font-size: 0.72rem;
              font-family: var(--font-code, 'SF Mono', Consolas, monospace);
              color: rgba(235, 235, 245, 0.65);
              padding: 2px 6px;
              background: rgba(255, 255, 255, 0.06);
              border-radius: 4px;
              border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .row-action-btn {
              padding: 3px;
              background: transparent;
              border: none;
              color: rgba(235, 235, 245, 0.4);
              border-radius: 4px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.15s ease;
            }
            .row-action-btn:hover {
              background: rgba(255, 69, 58, 0.2);
              color: #FF453A;
            }

            .ext-status-pill {
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 0.68rem;
              font-weight: 600;
              padding: 2px 7px;
              border-radius: 4px;
            }
            .ext-status-pill.enabled {
              background: rgba(48, 209, 88, 0.15);
              border: 1px solid rgba(48, 209, 88, 0.35);
              color: #30D158;
            }
            .ext-status-pill.disabled {
              background: rgba(255, 69, 58, 0.15);
              border: 1px solid rgba(255, 69, 58, 0.35);
              color: #FF453A;
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
            .prefix-kbd.large {
              font-size: 0.95rem;
              padding: 4px 8px;
            }

            /* Inspector / Detail Sidecar Pane */
            .palette-inspector-pane {
              width: 250px;
              border-left: 1px solid rgba(255, 255, 255, 0.08);
              background: rgba(0, 0, 0, 0.15);
              display: flex;
              flex-direction: column;
              padding: 14px;
            }

            .inspector-header {
              padding-bottom: 12px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.06);
              margin-bottom: 12px;
            }

            .inspector-eyebrow {
              font-size: 0.66rem;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              color: rgba(235, 235, 245, 0.4);
            }

            .inspector-title {
              font-size: 0.94rem;
              color: #fff;
              font-weight: 600;
              margin: 4px 0 0 0;
              line-height: 1.25;
              word-break: break-word;
            }

            .inspector-body {
              flex: 1;
              overflow-y: auto;
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            .inspector-group {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }

            .group-label {
              font-size: 0.68rem;
              font-weight: 600;
              text-transform: uppercase;
              color: rgba(235, 235, 245, 0.4);
            }

            .group-text {
              font-size: 0.78rem;
              color: rgba(235, 235, 245, 0.75);
              line-height: 1.4;
              margin: 0;
            }

            .meta-pill {
              align-self: flex-start;
              font-size: 0.72rem;
              padding: 2px 7px;
              background: rgba(255, 255, 255, 0.08);
              border: 1px solid rgba(255, 255, 255, 0.12);
              border-radius: 4px;
              color: rgba(235, 235, 245, 0.85);
            }

            .path-code {
              font-size: 0.72rem;
              font-family: var(--font-code, 'SF Mono', Consolas, monospace);
              color: #5AC8FA;
              word-break: break-all;
              padding: 4px 6px;
              background: rgba(0, 0, 0, 0.25);
              border-radius: 4px;
            }

            .keycap-group {
              display: flex;
              gap: 4px;
              margin-top: 2px;
            }

            .inspector-kbd {
              padding: 2px 6px;
              background: rgba(255, 255, 255, 0.09);
              border: 1px solid rgba(255, 255, 255, 0.18);
              border-radius: 4px;
              font-size: 0.72rem;
              color: #fff;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            }

            .ext-meta-grid {
              display: flex;
              gap: 12px;
              margin-top: 4px;
            }

            .theme-preview-pill {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 0.72rem;
              color: #30D158;
              margin-top: 6px;
              padding: 4px 8px;
              background: rgba(48, 209, 88, 0.12);
              border-radius: 5px;
            }

            .palette-footer {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 8px 16px;
              border-top: 1px solid rgba(255, 255, 255, 0.08);
              background: rgba(0, 0, 0, 0.25);
              font-size: 0.72rem;
              color: rgba(235, 235, 245, 0.48);
            }

            .footer-left {
              display: flex;
              gap: 12px;
              flex-wrap: wrap;
            }

            .footer-tip kbd {
              padding: 1px 4px;
              background: rgba(255, 255, 255, 0.08);
              border: 1px solid rgba(255, 255, 255, 0.14);
              border-radius: 3px;
              font-size: 0.66rem;
              margin-right: 3px;
              color: #fff;
            }

            .item-count {
              font-weight: 500;
              color: rgba(235, 235, 245, 0.6);
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  )
}

import { useEffect, useRef } from 'react'

interface ShortcutHandlers {
  onOpenFile?: () => void
  onOpenFolder?: () => void
  onSaveFile?: () => void
  onSaveFileAs?: () => void
  onNewFile?: () => void
  onCloseTab?: () => void
  onToggleSidebar?: () => void
  onOpenSettings?: () => void
  onCommandPalette?: () => void
  onQuickOpen?: () => void
  onGitGraph?: () => void
  onShowExplorer?: () => void
  onShowSearch?: () => void
  onShowDebug?: () => void
  onToggleAi?: () => void
  onToggleDatabase?: () => void
  onToggleRestClient?: () => void
  onToggleNotifications?: () => void
  onOpenShortcuts?: () => void
  onGoToLine?: () => void
  onSymbols?: () => void
  onToggleTerminal?: () => void
  onOpenProblems?: () => void
  onStartDebugging?: () => void
  onPauseDebugging?: () => void
  onStopDebugging?: () => void
  onRestartDebugging?: () => void
  onStepOver?: () => void
  onStepInto?: () => void
  onStepOut?: () => void
  onToggleBreakpoint?: () => void
  onFind?: () => void
  onReplace?: () => void
  onFindAll?: () => void
  onReplaceAll?: () => void
  onAddSelectionToNextMatch?: () => void
  onSelectAllOccurrences?: () => void
  onCursorAbove?: () => void
  onCursorBelow?: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const chordRef = useRef<{ key: string; time: number } | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey
      const key = e.key.toLowerCase()
      const now = Date.now()

      // Handle chord sequences (e.g. Ctrl+K followed by Ctrl+O or Ctrl+S)
      if (chordRef.current && now - chordRef.current.time < 2000) {
        if (chordRef.current.key === 'k') {
          if (key === 'o') {
            e.preventDefault()
            chordRef.current = null
            handlers.onOpenFolder?.()
            return
          }
          if (key === 's') {
            e.preventDefault()
            chordRef.current = null
            handlers.onOpenShortcuts?.()
            return
          }
        }
        chordRef.current = null
      }

      // F1 -> Command Palette
      if (e.key === 'F1') {
        e.preventDefault()
        handlers.onCommandPalette?.()
        return
      }

      // F5 -> Start / Continue Debugging
      if (e.key === 'F5' && !e.shiftKey && !ctrlOrCmd) {
        e.preventDefault()
        handlers.onStartDebugging?.()
        return
      }

      // Shift+F5 -> Stop Debugging
      if (e.key === 'F5' && e.shiftKey && !ctrlOrCmd) {
        e.preventDefault()
        handlers.onStopDebugging?.()
        return
      }

      // Ctrl+Shift+F5 -> Restart Debugging
      if (e.key === 'F5' && e.shiftKey && ctrlOrCmd) {
        e.preventDefault()
        handlers.onRestartDebugging?.()
        return
      }

      // F6 -> Pause Debugging
      if (e.key === 'F6' && !e.shiftKey && !ctrlOrCmd) {
        e.preventDefault()
        handlers.onPauseDebugging?.()
        return
      }

      // F9 -> Toggle Breakpoint
      if (e.key === 'F9' && !e.shiftKey && !ctrlOrCmd) {
        e.preventDefault()
        handlers.onToggleBreakpoint?.()
        return
      }

      // F10 -> Step Over
      if (e.key === 'F10' && !e.shiftKey && !ctrlOrCmd) {
        e.preventDefault()
        handlers.onStepOver?.()
        return
      }

      // F11 -> Step Into
      if (e.key === 'F11' && !e.shiftKey && !ctrlOrCmd) {
        e.preventDefault()
        handlers.onStepInto?.()
        return
      }

      // Shift+F11 -> Step Out
      if (e.key === 'F11' && e.shiftKey && !ctrlOrCmd) {
        e.preventDefault()
        handlers.onStepOut?.()
        return
      }

      // Alt+Enter -> Select All Occurrences / Find All
      if (e.key === 'Enter' && e.altKey && !ctrlOrCmd && !e.shiftKey) {
        e.preventDefault()
        handlers.onFindAll?.()
        return
      }

      if (!ctrlOrCmd) return

      // Ctrl+Alt+Enter -> Replace All
      if (e.key === 'Enter' && e.altKey) {
        e.preventDefault()
        handlers.onReplaceAll?.()
        return
      }

      // Ctrl+Alt+Up / ArrowUp -> Insert Cursor Above
      if ((e.key === 'ArrowUp' || e.key === 'Up') && e.altKey) {
        e.preventDefault()
        handlers.onCursorAbove?.()
        return
      }

      // Ctrl+Alt+Down / ArrowDown -> Insert Cursor Below
      if ((e.key === 'ArrowDown' || e.key === 'Down') && e.altKey) {
        e.preventDefault()
        handlers.onCursorBelow?.()
        return
      }

      // Ctrl+F -> Find in Document
      if (key === 'f' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        handlers.onFind?.()
        return
      }

      // Ctrl+H -> Replace in Document
      if (key === 'h' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        handlers.onReplace?.()
        return
      }

      // Ctrl+D -> Add Next Find Match to Selection (Multi-Cursor)
      if (key === 'd' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        handlers.onAddSelectionToNextMatch?.()
        return
      }

      // Ctrl+Shift+L -> Select All Occurrences (Multi-Cursor)
      if (key === 'l' && e.shiftKey && !e.altKey) {
        e.preventDefault()
        handlers.onSelectAllOccurrences?.()
        return
      }

      // Chord Initiator: Ctrl+K
      if (key === 'k' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        chordRef.current = { key: 'k', time: now }
        return
      }

      // Ctrl+G -> Go to Line (Palette with :)
      if (key === 'g' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        handlers.onGoToLine?.()
        return
      }

      // Ctrl+Shift+O -> Go to Symbol (Palette with @)
      if (e.shiftKey && key === 'o') {
        e.preventDefault()
        handlers.onSymbols?.()
        return
      }

      // Ctrl+Shift+P -> Command Palette
      if (e.shiftKey && key === 'p') {
        e.preventDefault()
        handlers.onCommandPalette?.()
        return
      }

      // Ctrl+Shift+M -> Problems Panel
      if (e.shiftKey && key === 'm') {
        e.preventDefault()
        handlers.onOpenProblems?.()
        return
      }

      // Ctrl+Shift+N -> Notifications & Alerts
      if (e.shiftKey && key === 'n') {
        e.preventDefault()
        handlers.onToggleNotifications?.()
        return
      }

      // Ctrl+Shift+G -> Git Graph / Source Control
      if (e.shiftKey && key === 'g') {
        e.preventDefault()
        handlers.onGitGraph?.()
        return
      }

      // Ctrl+Shift+E -> Explorer
      if (e.shiftKey && key === 'e') {
        e.preventDefault()
        handlers.onShowExplorer?.()
        return
      }

      // Ctrl+Shift+F -> Search
      if (e.shiftKey && key === 'f') {
        e.preventDefault()
        handlers.onShowSearch?.()
        return
      }

      // Ctrl+Shift+D -> Run & Debug
      if (e.shiftKey && key === 'd') {
        e.preventDefault()
        handlers.onShowDebug?.()
        return
      }

      // Ctrl+Alt+A or Ctrl+Shift+A -> Toggle AI Assistant Panel
      if ((e.altKey && key === 'a') || (e.shiftKey && key === 'a')) {
        e.preventDefault()
        handlers.onToggleAi?.()
        return
      }

      // Ctrl+Alt+D -> Toggle Database Studio
      if (e.altKey && key === 'd') {
        e.preventDefault()
        handlers.onToggleDatabase?.()
        return
      }

      // Ctrl+Alt+R -> Toggle REST & GraphQL API Client
      if (e.altKey && key === 'r') {
        e.preventDefault()
        handlers.onToggleRestClient?.()
        return
      }

      // Ctrl+Shift+S -> Save As
      if (e.shiftKey && key === 's') {
        e.preventDefault()
        handlers.onSaveFileAs?.()
        return
      }

      // Ctrl+O -> Open File
      if (key === 'o' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        handlers.onOpenFile?.()
        return
      }

      // Ctrl+S -> Save
      if (key === 's' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        handlers.onSaveFile?.()
        return
      }

      // Ctrl+N -> New File
      if (key === 'n' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        handlers.onNewFile?.()
        return
      }

      // Ctrl+W -> Close Tab
      if (key === 'w' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        handlers.onCloseTab?.()
        return
      }

      // Ctrl+B -> Toggle Sidebar
      if (key === 'b' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        handlers.onToggleSidebar?.()
        return
      }

      // Ctrl+P -> Quick Open
      if (key === 'p' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        handlers.onQuickOpen?.()
        return
      }

      // Ctrl+` or Ctrl+~ -> Toggle Integrated Terminal
      if ((key === '`' || key === '~') && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        handlers.onToggleTerminal?.()
        return
      }

      // Ctrl+, -> Open Settings
      if (key === ',' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        handlers.onOpenSettings?.()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers])
}

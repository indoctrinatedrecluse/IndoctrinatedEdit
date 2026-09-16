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
  onToggleAi?: () => void
  onToggleNotifications?: () => void
  onOpenShortcuts?: () => void
  onGoToLine?: () => void
  onSymbols?: () => void
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

      if (!ctrlOrCmd) return

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

      // Ctrl+Alt+A or Ctrl+Shift+A -> Toggle AI Assistant Panel
      if ((e.altKey && key === 'a') || (e.shiftKey && key === 'a')) {
        e.preventDefault()
        handlers.onToggleAi?.()
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

import { useEffect } from 'react'

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
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey

      // F1 -> Command Palette
      if (e.key === 'F1') {
        e.preventDefault()
        handlers.onCommandPalette?.()
        return
      }

      if (!ctrlOrCmd) return

      const key = e.key.toLowerCase()

      // Ctrl+Shift+P -> Command Palette
      if (e.shiftKey && key === 'p') {
        e.preventDefault()
        handlers.onCommandPalette?.()
        return
      }

      // Ctrl+Shift+G -> Git Graph / Source Control
      if (e.shiftKey && key === 'g') {
        e.preventDefault()
        handlers.onGitGraph?.()
        return
      }

      // Ctrl+Shift+O -> Open Workspace Folder
      if (e.shiftKey && key === 'o') {
        e.preventDefault()
        handlers.onOpenFolder?.()
        return
      }

      // Ctrl+Shift+S -> Save As
      if (e.shiftKey && key === 's') {
        e.preventDefault()
        handlers.onSaveFileAs?.()
        return
      }

      // Ctrl+O -> Open File
      if (key === 'o' && !e.shiftKey) {
        e.preventDefault()
        handlers.onOpenFile?.()
        return
      }

      // Ctrl+S -> Save
      if (key === 's' && !e.shiftKey) {
        e.preventDefault()
        handlers.onSaveFile?.()
        return
      }

      // Ctrl+N -> New File
      if (key === 'n' && !e.shiftKey) {
        e.preventDefault()
        handlers.onNewFile?.()
        return
      }

      // Ctrl+W -> Close Tab
      if (key === 'w' && !e.shiftKey) {
        e.preventDefault()
        handlers.onCloseTab?.()
        return
      }

      // Ctrl+B -> Toggle Sidebar
      if (key === 'b' && !e.shiftKey) {
        e.preventDefault()
        handlers.onToggleSidebar?.()
        return
      }

      // Ctrl+P -> Quick Open
      if (key === 'p' && !e.shiftKey) {
        e.preventDefault()
        handlers.onQuickOpen?.()
        return
      }

      // Ctrl+, -> Open Settings
      if (key === ',' && !e.shiftKey) {
        e.preventDefault()
        handlers.onOpenSettings?.()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers])
}

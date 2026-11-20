export interface PaletteHistoryEntry {
  id: string
  type: 'command' | 'file' | 'symbol' | 'extension' | 'theme'
  title: string
  subtitle?: string
  shortcut?: string
  category?: string
  timestamp: number
  count: number
}

const STORAGE_KEY = 'indoctrinated.palette.history.v1'
const MAX_HISTORY_ENTRIES = 20

export function getPaletteHistory(): PaletteHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_HISTORY_ENTRIES)
    }
    return []
  } catch {
    return []
  }
}

export function recordPaletteExecution(entry: {
  id: string
  type: 'command' | 'file' | 'symbol' | 'extension' | 'theme'
  title: string
  subtitle?: string
  shortcut?: string
  category?: string
}): void {
  try {
    const history = getPaletteHistory()
    const existingIndex = history.findIndex((h) => h.id === entry.id && h.type === entry.type)

    if (existingIndex >= 0) {
      const existing = history[existingIndex]
      history.splice(existingIndex, 1)
      history.unshift({
        ...existing,
        title: entry.title,
        subtitle: entry.subtitle,
        shortcut: entry.shortcut,
        category: entry.category,
        timestamp: Date.now(),
        count: (existing.count || 1) + 1,
      })
    } else {
      history.unshift({
        id: entry.id,
        type: entry.type,
        title: entry.title,
        subtitle: entry.subtitle,
        shortcut: entry.shortcut,
        category: entry.category,
        timestamp: Date.now(),
        count: 1,
      })
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_ENTRIES)))
  } catch {
    // Ignore storage quota or disabled localStorage
  }
}

export function removePaletteHistoryItem(id: string): PaletteHistoryEntry[] {
  try {
    const history = getPaletteHistory().filter((h) => h.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    return history
  } catch {
    return []
  }
}

export function clearPaletteHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore
  }
}

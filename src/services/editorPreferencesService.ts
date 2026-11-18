/**
 * IndoctrinatedEdit — Persisted Editor & Visual Preferences Service
 *
 * Backs the Editor Preferences checkboxes in Sidebar Settings so toggling
 * Hardware Glass Blur, Specular Border Sheen, Smooth Caret Animation, and
 * Minimap Code Preview immediately takes effect across CSS & Monaco editors.
 */

export interface EditorPreferences {
  hardwareGlassBlur: boolean
  specularBorderSheen: boolean
  smoothCaretAnimation: boolean
  minimapEnabled: boolean
}

const STORAGE_KEY = 'indoctrinated:editor:preferences_v1'

const DEFAULT_PREFERENCES: EditorPreferences = {
  hardwareGlassBlur: true,
  specularBorderSheen: true,
  smoothCaretAnimation: true,
  minimapEnabled: true,
}

class EditorPreferencesService {
  private prefs: EditorPreferences
  private listeners = new Set<(prefs: EditorPreferences) => void>()

  constructor() {
    this.prefs = this.load()
    this.applyDocumentAttributes()
  }

  private load(): EditorPreferences {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
      if (raw) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) }
      }
    } catch {
      // Ignore storage errors
    }
    return { ...DEFAULT_PREFERENCES }
  }

  private save(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.prefs))
      }
    } catch {
      // Ignore storage errors
    }
  }

  private applyDocumentAttributes(): void {
    if (typeof document === 'undefined' || !document.documentElement) return
    const root = document.documentElement
    root.dataset.glassBlur = this.prefs.hardwareGlassBlur ? 'on' : 'off'
    root.dataset.specularSheen = this.prefs.specularBorderSheen ? 'on' : 'off'
    root.style.setProperty('--glass-blur-strength', this.prefs.hardwareGlassBlur ? '24px' : '0px')
    root.style.setProperty('--specular-border-opacity', this.prefs.specularBorderSheen ? '1' : '0')
  }

  public getPreferences(): EditorPreferences {
    return { ...this.prefs }
  }

  public updatePreferences(patch: Partial<EditorPreferences>): EditorPreferences {
    this.prefs = { ...this.prefs, ...patch }
    this.save()
    this.applyDocumentAttributes()
    const snapshot = this.getPreferences()
    for (const fn of this.listeners) {
      try {
        fn(snapshot)
      } catch {
        // Ignore subscriber errors
      }
    }
    return snapshot
  }

  public subscribe(listener: (prefs: EditorPreferences) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

export const editorPreferencesService = new EditorPreferencesService()

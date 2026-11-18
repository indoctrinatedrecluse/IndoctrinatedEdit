import { ToolchainDefinition, DetectedToolchain, IToolchainRegistry } from '@sdk/types'
import { DEFAULT_TOOLCHAINS } from '@sdk/toolchains'

const CACHE_KEY = 'indoctrinated:toolchain:cache'
const CACHE_TTL_MS = 1000 * 60 * 15 // 15 minutes

interface CachedToolchainData {
  timestamp: number
  results: DetectedToolchain[]
}

export class ToolchainService implements IToolchainRegistry {
  private static instance: ToolchainService | null = null
  private definitions: Map<string, ToolchainDefinition> = new Map()
  private detectedResults: Map<string, DetectedToolchain> = new Map()
  private listeners: Set<(results: DetectedToolchain[]) => void> = new Set()
  private isDetecting: boolean = false
  private hasInitialized: boolean = false

  public static getInstance(): ToolchainService {
    if (!ToolchainService.instance) {
      ToolchainService.instance = new ToolchainService()
    }
    return ToolchainService.instance
  }

  constructor() {
    this.loadCache()
    this.registerBuiltinDefinitions()
  }

  /**
   * Register default toolchains supported out-of-the-box from the shared canonical list.
   */
  private registerBuiltinDefinitions() {
    for (const def of DEFAULT_TOOLCHAINS) {
      this.definitions.set(def.id, def)
    }
  }

  /**
   * Register a new toolchain definition. Called by language extensions.
   */
  public registerToolchain(definition: ToolchainDefinition): void {
    this.definitions.set(definition.id, definition)
    // Non-blocking single check in the background for this newly added toolchain
    if (this.hasInitialized) {
      setTimeout(() => {
        this.detectOne(definition.id)
      }, 100)
    }
  }

  /**
   * Unregister a toolchain definition.
   */
  public unregisterToolchain(id: string): void {
    this.definitions.delete(id)
    this.detectedResults.delete(id)
    this.notifyListeners()
  }

  /**
   * Get all registered definitions.
   */
  public getDefinitions(): ToolchainDefinition[] {
    return Array.from(this.definitions.values())
  }

  /**
   * Get all currently detected results.
   */
  public getDetectedToolchains(): DetectedToolchain[] {
    return Array.from(this.detectedResults.values())
  }

  /**
   * Get detected toolchain for a specific language.
   */
  public getToolchainForLanguage(languageId: string): DetectedToolchain | undefined {
    return Array.from(this.detectedResults.values()).find(
      (tc) => tc.language === languageId && tc.found
    )
  }

  /**
   * Subscribe to detection result updates.
   */
  public onDidDetect(listener: (results: DetectedToolchain[]) => void): () => void {
    this.listeners.add(listener)
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => {
        if (this.listeners.has(listener)) {
          try {
            listener(this.getDetectedToolchains())
          } catch (err) {
            console.error('Toolchain listener error:', err)
          }
        }
      })
    } else {
      setTimeout(() => {
        if (this.listeners.has(listener)) {
          try {
            listener(this.getDetectedToolchains())
          } catch (err) {
            console.error('Toolchain listener error:', err)
          }
        }
      }, 0)
    }
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners(): void {
    const list = this.getDetectedToolchains()
    for (const listener of this.listeners) {
      try {
        listener(list)
      } catch (err) {
        console.error('Toolchain listener error:', err)
      }
    }
  }

  /**
   * Schedule non-blocking detection during browser idle time or after startup.
   */
  public scheduleBackgroundDetection(delayMs: number = 1500): void {
    if (this.hasInitialized) return
    this.hasInitialized = true

    const runDetection = () => {
      // If cache is fresh, skip heavy detection
      if (this.isCacheFresh()) {
        return
      }

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          this.detectAll().catch((err) => console.warn('Background toolchain detection error:', err))
        }, { timeout: 3000 })
      } else {
        setTimeout(() => {
          this.detectAll().catch((err) => console.warn('Background toolchain detection error:', err))
        }, 100)
      }
    }

    setTimeout(runDetection, delayMs)
  }

  /**
   * Detect a single toolchain by ID.
   */
  public async detectOne(id: string): Promise<DetectedToolchain | null> {
    const def = this.definitions.get(id)
    if (!def) return null

    if (typeof window !== 'undefined' && window.electronAPI?.toolchain) {
      try {
        const result = await window.electronAPI.toolchain.detectOne(def)
        this.detectedResults.set(result.id, result)
        this.notifyListeners()
        this.saveCache()
        return result
      } catch (err) {
        console.warn(`Failed to detect toolchain ${id}:`, err)
      }
    }

    // Mock fallback when not running in Electron
    const fallback: DetectedToolchain = {
      id: def.id,
      name: def.name,
      language: def.language,
      found: false,
      lastChecked: Date.now(),
    }
    this.detectedResults.set(fallback.id, fallback)
    this.notifyListeners()
    return fallback
  }

  /**
   * Run detection for all registered toolchains.
   */
  public async detectAll(force: boolean = false): Promise<DetectedToolchain[]> {
    if (this.isDetecting) {
      return this.getDetectedToolchains()
    }

    if (!force && this.isCacheFresh()) {
      return this.getDetectedToolchains()
    }

    this.isDetecting = true

    try {
      const defs = this.getDefinitions()
      if (typeof window !== 'undefined' && window.electronAPI?.toolchain) {
        const results = await window.electronAPI.toolchain.detectAll(defs)
        for (const res of results) {
          this.detectedResults.set(res.id, res)
        }
      } else {
        // Fallback for non-electron environments
        for (const def of defs) {
          if (!this.detectedResults.has(def.id)) {
            this.detectedResults.set(def.id, {
              id: def.id,
              name: def.name,
              language: def.language,
              found: false,
              lastChecked: Date.now(),
            })
          }
        }
      }

      this.saveCache()
      this.notifyListeners()
    } finally {
      this.isDetecting = false
    }

    return this.getDetectedToolchains()
  }

  private isCacheFresh(): boolean {
    if (this.detectedResults.size === 0) return false
    const oldestTimestamp = Math.min(
      ...Array.from(this.detectedResults.values()).map((r) => r.lastChecked)
    )
    return Date.now() - oldestTimestamp < CACHE_TTL_MS
  }

  private loadCache(): void {
    try {
      if (typeof localStorage === 'undefined') return
      const data = localStorage.getItem(CACHE_KEY)
      if (data) {
        const parsed: CachedToolchainData = JSON.parse(data)
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.results)) {
          for (const item of parsed.results) {
            this.detectedResults.set(item.id, item)
          }
        }
      }
    } catch {
      // Ignore cache reading errors
    }
  }

  private saveCache(): void {
    try {
      if (typeof localStorage === 'undefined') return
      const data: CachedToolchainData = {
        timestamp: Date.now(),
        results: Array.from(this.detectedResults.values()),
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    } catch {
      // Ignore cache writing errors
    }
  }
}

export const toolchainService = ToolchainService.getInstance()

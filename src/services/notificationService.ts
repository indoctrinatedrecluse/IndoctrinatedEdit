export type NotificationType = 'info' | 'warning' | 'error' | 'success'
export type NotificationCategory = 'system' | 'git' | 'ai' | 'compiler' | 'extension'
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical'

export interface NotificationAction {
  label: string
  onClick: () => void
  primary?: boolean
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: NotificationType
  timestamp: number
  source?: string
  category?: NotificationCategory
  priority?: NotificationPriority
  read: boolean
  showToast?: boolean
  details?: string
  autoDismissMs?: number
  actions?: NotificationAction[]
}

const STORAGE_KEY_NOTIFS = 'indoctrinated.notifications.v2'
const STORAGE_KEY_SOUND = 'indoctrinated.notifications.sound_enabled'
const STORAGE_KEY_DND = 'indoctrinated.notifications.dnd_enabled'

export class NotificationService {
  private static instance: NotificationService | null = null
  private notifications: NotificationItem[] = []
  private listeners: Set<(notifications: NotificationItem[]) => void> = new Set()
  private toastListeners: Set<(item: NotificationItem) => void> = new Set()
  private soundEnabled = true
  private dndEnabled = false
  private audioCtx: any = null

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  constructor() {
    this.addNotification = this.addNotification.bind(this)
    this.notifyWarning = this.notifyWarning.bind(this)
    this.notifyInfo = this.notifyInfo.bind(this)
    this.notifyError = this.notifyError.bind(this)
    this.notifySuccess = this.notifySuccess.bind(this)
    this.notifyMissingToolchain = this.notifyMissingToolchain.bind(this)
    this.notifyGitHubCliMissing = this.notifyGitHubCliMissing.bind(this)

    this.loadSettings()
    this.loadPersistedNotifications()

    // If completely empty, insert standard initial welcome notification
    if (this.notifications.length === 0) {
      this.addNotification({
        title: 'IndoctrinatedEdit Initialized',
        message: 'Liquid Glass runtime and microservice sandbox are ready. Extensions loaded.',
        type: 'info',
        source: 'System',
        category: 'system',
        priority: 'low',
        showToast: false,
      })
    }
  }

  private loadSettings(): void {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      const soundVal = localStorage.getItem(STORAGE_KEY_SOUND)
      if (soundVal !== null) this.soundEnabled = soundVal === 'true'
      const dndVal = localStorage.getItem(STORAGE_KEY_DND)
      if (dndVal !== null) this.dndEnabled = dndVal === 'true'
    } catch {
      // Ignore storage errors
    }
  }

  private loadPersistedNotifications(): void {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY_NOTIFS)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          this.notifications = parsed.slice(0, 60).map((n) => ({
            ...n,
            actions: undefined, // Actions with functions cannot survive JSON serialization
          }))
        }
      }
    } catch {
      // Ignore corrupted cache
    }
  }

  private persistNotifications(): void {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      const toSave = this.notifications.slice(0, 60).map(({ actions, ...rest }) => rest)
      localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(toSave))
    } catch {
      // Ignore quota errors
    }
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY_SOUND, String(enabled))
      } catch {}
    }
  }

  public isDndEnabled(): boolean {
    return this.dndEnabled
  }

  public setDndEnabled(enabled: boolean): void {
    this.dndEnabled = enabled
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY_DND, String(enabled))
      } catch {}
    }
  }

  public getNotifications(): NotificationItem[] {
    return [...this.notifications]
  }

  public getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length
  }

  public onToast(listener: (item: NotificationItem) => void): () => void {
    this.toastListeners.add(listener)
    return () => {
      this.toastListeners.delete(listener)
    }
  }

  public playGlassChime(type: NotificationType): void {
    if (!this.soundEnabled || this.dndEnabled || typeof window === 'undefined') return
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass()
      }
      if (this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume()
      }

      const now = this.audioCtx.currentTime
      const baseFreq =
        type === 'error'
          ? 220
          : type === 'warning'
          ? 440
          : type === 'success'
          ? 880
          : 659.25 // E5

      const osc = this.audioCtx.createOscillator()
      const gain = this.audioCtx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(baseFreq, now)
      if (type === 'success') {
        osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.12) // E6 sparkle
      } else if (type === 'error') {
        osc.frequency.exponentialRampToValueAtTime(164.8, now + 0.18)
      }

      gain.gain.setValueAtTime(0.04, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (type === 'error' ? 0.28 : 0.22))

      osc.connect(gain)
      gain.connect(this.audioCtx.destination)

      osc.start(now)
      osc.stop(now + 0.3)
    } catch {
      // Audio autoplay or sandbox block
    }
  }

  public addNotification(
    item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'> & { id?: string }
  ): string {
    const id = item.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    // Determine category and priority defaults
    const category: NotificationCategory =
      item.category ||
      (item.source?.toLowerCase().includes('git')
        ? 'git'
        : item.source?.toLowerCase().includes('ai')
        ? 'ai'
        : item.source?.toLowerCase().includes('toolchain') || item.source?.toLowerCase().includes('compiler')
        ? 'compiler'
        : 'system')

    const priority: NotificationPriority =
      item.priority ||
      (item.type === 'error'
        ? 'high'
        : item.type === 'warning'
        ? 'normal'
        : 'low')

    const showToast = item.showToast !== undefined ? item.showToast : item.type !== 'info' || priority === 'high' || priority === 'critical'

    const newNotif: NotificationItem = {
      ...item,
      id,
      category,
      priority,
      showToast,
      timestamp: Date.now(),
      read: false,
    }

    // Deduplicate existing identical ID
    const existingIndex = this.notifications.findIndex((n) => n.id === id)
    if (existingIndex >= 0) {
      this.notifications[existingIndex] = newNotif
    } else {
      this.notifications.unshift(newNotif)
      if (this.notifications.length > 80) {
        this.notifications = this.notifications.slice(0, 80)
      }
    }

    this.persistNotifications()
    this.notifyListeners()

    // Trigger toast and glass chime if not in DND mode
    if (showToast && !this.dndEnabled) {
      this.toastListeners.forEach((listener) => {
        try {
          listener(newNotif)
        } catch (err) {
          console.error('Toast listener error:', err)
        }
      })
      this.playGlassChime(item.type)
    }

    return id
  }

  public removeNotification(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id)
    this.persistNotifications()
    this.notifyListeners()
  }

  public markAsRead(id: string): void {
    const item = this.notifications.find((n) => n.id === id)
    if (item && !item.read) {
      item.read = true
      this.persistNotifications()
      this.notifyListeners()
    }
  }

  public markAllAsRead(): void {
    let changed = false
    this.notifications.forEach((n) => {
      if (!n.read) {
        n.read = true
        changed = true
      }
    })
    if (changed) {
      this.persistNotifications()
      this.notifyListeners()
    }
  }

  public dismissAll(): void {
    this.notifications = []
    this.persistNotifications()
    this.notifyListeners()
  }

  public clearAll(): void {
    this.dismissAll()
  }

  public subscribe(listener: (notifications: NotificationItem[]) => void): () => void {
    this.listeners.add(listener)
    listener(this.getNotifications())
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners(): void {
    const snapshot = this.getNotifications()
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot)
      } catch (err) {
        console.error('Notification listener error:', err)
      }
    })
  }

  /**
   * Helper to format and display human-readable warning notifications.
   */
  public notifyWarning(
    title: string,
    message: string,
    source: string = 'Runtime Engine',
    actions?: NotificationAction[]
  ): string {
    return this.addNotification({
      title,
      message,
      type: 'warning',
      source,
      actions,
    })
  }

  /**
   * Helper to format and display informational notifications.
   */
  public notifyInfo(
    title: string,
    message: string,
    source: string = 'Runtime Engine',
    actions?: NotificationAction[]
  ): string {
    return this.addNotification({
      title,
      message,
      type: 'info',
      source,
      actions,
    })
  }

  /**
   * Helper to format and display success notifications.
   */
  public notifySuccess(
    title: string,
    message: string,
    source: string = 'Runtime Engine',
    actions?: NotificationAction[]
  ): string {
    return this.addNotification({
      title,
      message,
      type: 'success',
      source,
      actions,
    })
  }

  /**
   * Helper to format and display human-readable major errors.
   */
  public notifyError(
    title: string,
    error: unknown,
    source: string = 'Runtime Engine',
    actions?: NotificationAction[],
    details?: string
  ): string {
    const message =
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'An unexpected error occurred.'
    const technicalDetails =
      details || (error instanceof Error ? error.stack : undefined)

    return this.addNotification({
      title,
      message,
      type: 'error',
      source,
      priority: 'high',
      details: technicalDetails,
      actions,
    })
  }

  /**
   * Helper for toolchain auto-detect notifications when an extension is loaded but compiler is missing.
   */
  public notifyMissingToolchain(
    extensionName: string,
    compilerName: string,
    downloadUrl: string
  ): string {
    return this.addNotification({
      id: `missing-toolchain-${compilerName}`,
      title: `${extensionName}: Compiler Missing`,
      message: `The ${extensionName} is active, but '${compilerName}' was not found in your system PATH. Install ${compilerName} to enable compilation, linting, and language features.`,
      type: 'warning',
      source: 'Toolchain Auto-Detect',
      category: 'compiler',
      priority: 'normal',
      actions: [
        {
          label: `Download ${compilerName}`,
          primary: true,
          onClick: () => {
            window.open(downloadUrl, '_blank')
          },
        },
      ],
    })
  }

  /**
   * Prominent helper when GitHub CLI (`gh`) is missing from system PATH.
   */
  public notifyGitHubCliMissing(_repoUrl?: string): string {
    return this.addNotification({
      id: 'missing-toolchain-gh',
      title: 'GitHub CLI (`gh`) Not Detected',
      message:
        'GitHub CLI was not found in your system PATH. Install GitHub CLI to watch and stream GitHub Actions runs live, manage Pull Requests, and inspect Releases directly from IndoctrinatedEdit.',
      type: 'warning',
      source: 'GitHub Workflow Engine',
      category: 'git',
      priority: 'high',
      showToast: true,
      actions: [
        {
          label: 'Install GitHub CLI (gh)',
          primary: true,
          onClick: () => {
            window.open('https://cli.github.com', '_blank')
          },
        },
        {
          label: 'GitHub Documentation',
          primary: false,
          onClick: () => {
            window.open('https://docs.github.com/en/github-cli', '_blank')
          },
        },
      ],
    })
  }
}

export const notificationService = NotificationService.getInstance()

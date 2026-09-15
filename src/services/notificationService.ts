export type NotificationType = 'info' | 'warning' | 'error' | 'success'

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
  read: boolean
  actions?: NotificationAction[]
}

export class NotificationService {
  private static instance: NotificationService | null = null
  private notifications: NotificationItem[] = []
  private listeners: Set<(notifications: NotificationItem[]) => void> = new Set()

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  constructor() {
    // Initial welcome notification
    this.addNotification({
      title: 'IndoctrinatedEdit Initialized',
      message: 'Liquid Glass runtime and microservice sandbox are ready. Extensions loaded.',
      type: 'info',
      source: 'System',
    })
  }

  public getNotifications(): NotificationItem[] {
    return [...this.notifications]
  }

  public getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length
  }

  public addNotification(
    item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'> & { id?: string }
  ): string {
    const id = item.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    
    // Avoid duplicate notifications with same id
    const existingIndex = this.notifications.findIndex((n) => n.id === id)
    if (existingIndex >= 0) {
      this.notifications[existingIndex] = {
        ...this.notifications[existingIndex],
        ...item,
        timestamp: Date.now(),
        read: false,
      }
      this.notifyListeners()
      return id
    }

    const newNotif: NotificationItem = {
      ...item,
      id,
      timestamp: Date.now(),
      read: false,
    }

    this.notifications.unshift(newNotif)
    this.notifyListeners()
    return id
  }

  public removeNotification(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id)
    this.notifyListeners()
  }

  public markAsRead(id: string): void {
    const item = this.notifications.find((n) => n.id === id)
    if (item && !item.read) {
      item.read = true
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
      this.notifyListeners()
    }
  }

  public dismissAll(): void {
    this.notifications = []
    this.notifyListeners()
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
   * Helper to format and display human-readable major errors (e.g. AI Agent crashes, network failures).
   */
  public notifyError(
    title: string,
    error: unknown,
    source: string = 'Runtime Engine',
    actions?: NotificationAction[]
  ): string {
    const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An unexpected error occurred.'
    return this.addNotification({
      title,
      message,
      type: 'error',
      source,
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
      message: `The ${extensionName} is active, but the '${compilerName}' binary was not found in your system PATH. Install ${compilerName} to enable compilation, linting, and language features.`,
      type: 'warning',
      source: 'Toolchain Auto-Detect',
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
}

export const notificationService = NotificationService.getInstance()

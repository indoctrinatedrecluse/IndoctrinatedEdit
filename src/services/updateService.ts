/**
 * Renderer Update Subsystem
 * Coordinates update polling schedules, SemVer evaluations, download progression,
 * and UI notification triggers.
 */

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'upToDate'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'error'

export type UpdateChannel = 'stable' | 'beta' | 'nightly'
export type AutoCheckInterval = 'startup' | 'daily' | 'weekly' | 'manual'

export interface UpdateInfo {
  updateAvailable: boolean
  currentVersion: string
  latestVersion: string
  releaseName: string
  releaseNotes: string
  publishedAt: string
  releaseUrl: string
  matchedAsset: {
    asset: {
      name: string
      browser_download_url: string
      size: number
      content_type: string
    }
    platform: 'win32' | 'linux' | 'darwin'
    arch: 'x64' | 'arm64' | 'universal'
    packageType: 'exe' | 'appimage' | 'deb' | 'dmg' | 'zip' | 'tar.gz'
    displayName: string
  } | null
  allAssets: Array<{ name: string; browser_download_url: string; size: number }>
  channel: UpdateChannel
  error?: string
}

export interface DownloadProgress {
  percentage: number
  downloadedBytes: number
  totalBytes: number
  speedBytesPerSec: number
  formattedDownloaded: string
  formattedTotal: string
  formattedSpeed: string
  etaSeconds: number
}

export interface ClientUpdateConfig {
  channel: UpdateChannel
  interval: AutoCheckInterval
  autoDownload: boolean
  lastCheckedTimestamp: number
  lastDismissedVersion?: string
}

const STORAGE_KEY = 'indoctrinated_update_config'

export class RendererUpdateService {
  private status: UpdateStatus = 'idle'
  private updateInfo: UpdateInfo | null = null
  private downloadProgress: DownloadProgress | null = null
  private config: ClientUpdateConfig = {
    channel: 'stable',
    interval: 'weekly',
    autoDownload: false,
    lastCheckedTimestamp: 0,
  }
  private listeners: Set<() => void> = new Set()
  private timer: NodeJS.Timeout | null = null
  private unbindProgress: (() => void) | null = null

  constructor() {
    this.loadConfig()
  }

  public init() {
    this.setupListeners()
    this.scheduleAutoCheck()
  }

  private loadConfig() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) }
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  public saveConfig(updates: Partial<ClientUpdateConfig>) {
    this.config = { ...this.config, ...updates }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config))
    } catch {
      // Ignore
    }

    // Also sync to Electron Main if available
    if (typeof window !== 'undefined' && window.electronAPI?.updater?.saveConfig) {
      window.electronAPI.updater.saveConfig(this.config).catch(() => {})
    }

    this.scheduleAutoCheck()
    this.notify()
  }

  public getConfig(): ClientUpdateConfig {
    return { ...this.config }
  }

  public getStatus(): UpdateStatus {
    return this.status
  }

  public getUpdateInfo(): UpdateInfo | null {
    return this.updateInfo
  }

  public getDownloadProgress(): DownloadProgress | null {
    return this.downloadProgress
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb()
      } catch (err) {
        console.error('[UpdateService] Listener error:', err)
      }
    })
  }

  private setupListeners() {
    if (typeof window !== 'undefined' && window.electronAPI?.updater?.onDownloadProgress) {
      this.unbindProgress = window.electronAPI.updater.onDownloadProgress((progress) => {
        this.downloadProgress = progress
        this.status = 'downloading'
        this.notify()
      })
    }
  }

  public scheduleAutoCheck() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    if (this.config.interval === 'manual') return

    // 5 seconds graceful delay for initial launch check
    const initialDelay = 5000

    this.timer = setTimeout(() => {
      const now = Date.now()
      const elapsed = now - this.config.lastCheckedTimestamp

      let intervalMs = 7 * 24 * 60 * 60 * 1000 // default weekly
      if (this.config.interval === 'daily') intervalMs = 24 * 60 * 60 * 1000
      else if (this.config.interval === 'startup') intervalMs = 0

      if (elapsed >= intervalMs) {
        this.checkForUpdates(false)
      }
    }, initialDelay)
  }

  /**
   * Compares two SemVer strings (e.g. "4.4.0" vs "4.5.0", or "4.4.0-beta.1")
   */
  public static compareSemVer(vA: string, vB: string): number {
    const cleanA = vA.replace(/^v/i, '').trim()
    const cleanB = vB.replace(/^v/i, '').trim()

    const [mainA, preA] = cleanA.split('-')
    const [mainB, preB] = cleanB.split('-')

    const partsA = mainA.split('.').map((n) => parseInt(n, 10) || 0)
    const partsB = mainB.split('.').map((n) => parseInt(n, 10) || 0)

    for (let i = 0; i < 3; i++) {
      const a = partsA[i] || 0
      const b = partsB[i] || 0
      if (a > b) return 1
      if (a < b) return -1
    }

    if (preA && !preB) return -1
    if (!preA && preB) return 1
    if (preA && preB) {
      return preA.localeCompare(preB, undefined, { numeric: true })
    }

    return 0
  }

  /**
   * Check for updates
   * @param isManual - if triggered by user clicking "Check for Updates"
   */
  public async checkForUpdates(isManual: boolean = true): Promise<UpdateInfo> {
    this.status = 'checking'
    this.notify()

    try {
      let info: UpdateInfo

      if (typeof window !== 'undefined' && window.electronAPI?.updater?.checkForUpdates) {
        info = await window.electronAPI.updater.checkForUpdates(this.config.channel)
      } else {
        // Fallback for Web / Browser Preview mode (simulate check against GitHub or static)
        info = await this.fallbackWebCheck(this.config.channel)
      }

      this.updateInfo = info
      this.saveConfig({ lastCheckedTimestamp: Date.now() })

      if (info.updateAvailable) {
        if (!isManual && this.config.lastDismissedVersion === info.latestVersion) {
          // User already dismissed this background notification
          this.status = 'idle'
        } else {
          this.status = 'available'
          if (this.config.autoDownload && info.matchedAsset) {
            this.downloadUpdate()
          }
        }
      } else {
        this.status = 'upToDate'
      }

      this.notify()
      return info
    } catch (err: any) {
      console.warn('[UpdateService] Check error:', err)
      this.status = 'error'
      const errInfo: UpdateInfo = {
        updateAvailable: false,
        currentVersion: '4.8.0',
        latestVersion: '4.8.0',
        releaseName: 'IndoctrinatedEdit 4.8.0',
        releaseNotes: 'Could not connect to update servers. Check your internet connection.',
        publishedAt: new Date().toISOString(),
        releaseUrl: 'https://github.com/indoctrinatedrecluse/IndoctrinatedEdit/releases',
        matchedAsset: null,
        allAssets: [],
        channel: this.config.channel,
        error: err.message || 'Unknown network error',
      }
      this.updateInfo = errInfo
      this.notify()
      return errInfo
    }
  }

  /**
   * Starts downloading the matched update
   */
  public async downloadUpdate(): Promise<boolean> {
    if (!this.updateInfo || !this.updateInfo.matchedAsset) {
      // If no matched asset, open download URL in browser
      if (typeof window !== 'undefined' && this.updateInfo?.releaseUrl && window.open) {
        window.open(this.updateInfo.releaseUrl, '_blank')
      }
      return false
    }

    this.status = 'downloading'
    this.downloadProgress = {
      percentage: 0,
      downloadedBytes: 0,
      totalBytes: this.updateInfo.matchedAsset.asset.size || 80000000,
      speedBytesPerSec: 0,
      formattedDownloaded: '0 MB',
      formattedTotal: `${((this.updateInfo.matchedAsset.asset.size || 80000000) / (1024 * 1024)).toFixed(1)} MB`,
      formattedSpeed: '0 KB/s',
      etaSeconds: 0,
    }
    this.notify()

    try {
      if (typeof window !== 'undefined' && window.electronAPI?.updater?.downloadUpdate) {
        const downloadUrl = this.updateInfo.matchedAsset.asset.browser_download_url
        await window.electronAPI.updater.downloadUpdate(
          downloadUrl,
          this.updateInfo.latestVersion
        )
        this.status = 'downloaded'
      } else {
        // Simulated progress for Web preview
        await this.simulateWebDownload()
        this.status = 'downloaded'
      }

      this.notify()
      return true
    } catch (err: any) {
      console.error('[UpdateService] Download error:', err)
      this.status = 'error'
      this.notify()
      return false
    }
  }

  /**
   * Installs downloaded update
   */
  public async installUpdate(): Promise<boolean> {
    this.status = 'installing'
    this.notify()

    try {
      if (typeof window !== 'undefined' && window.electronAPI?.updater?.installUpdate) {
        return await window.electronAPI.updater.installUpdate()
      } else {
        // Web fallback: navigate to release URL
        if (typeof window !== 'undefined' && this.updateInfo?.releaseUrl && window.open) {
          window.open(this.updateInfo.releaseUrl, '_blank')
        }
        return true
      }
    } catch (err: any) {
      console.error('[UpdateService] Install error:', err)
      this.status = 'error'
      this.notify()
      return false
    }
  }

  public dismissCurrentUpdate() {
    if (this.updateInfo?.latestVersion) {
      this.saveConfig({ lastDismissedVersion: this.updateInfo.latestVersion })
    }
    this.status = 'idle'
    this.notify()
  }

  public cancelDownload() {
    if (typeof window !== 'undefined' && window.electronAPI?.updater?.cancelDownload) {
      window.electronAPI.updater.cancelDownload()
    }
    this.status = 'available'
    this.downloadProgress = null
    this.notify()
  }

  public resetStatus() {
    this.status = 'idle'
    this.notify()
  }

  public cleanup() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.unbindProgress) {
      this.unbindProgress()
      this.unbindProgress = null
    }
    this.listeners.clear()
  }

  private async fallbackWebCheck(channel: UpdateChannel): Promise<UpdateInfo> {
    try {
      const res = await fetch('https://api.github.com/repos/indoctrinatedrecluse/IndoctrinatedEdit/releases/latest', {
        headers: { Accept: 'application/vnd.github.v3+json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const release = await res.json()
      const currentVersion = '4.8.0'
      const latestVersion = (release.tag_name || 'v4.8.0').replace(/^v/i, '')
      const isNewer = RendererUpdateService.compareSemVer(latestVersion, currentVersion) > 0

      return {
        updateAvailable: isNewer,
        currentVersion,
        latestVersion,
        releaseName: release.name || `IndoctrinatedEdit ${release.tag_name}`,
        releaseNotes: release.body || 'New enhancements and bug fixes available.',
        publishedAt: release.published_at || new Date().toISOString(),
        releaseUrl: release.html_url || 'https://github.com/indoctrinatedrecluse/IndoctrinatedEdit/releases',
        matchedAsset: null,
        allAssets: release.assets || [],
        channel,
      }
    } catch {
      return {
        updateAvailable: false,
        currentVersion: '4.8.0',
        latestVersion: '4.8.0',
        releaseName: 'IndoctrinatedEdit 4.8.0',
        releaseNotes: 'You are on the latest release.',
        publishedAt: new Date().toISOString(),
        releaseUrl: 'https://github.com/indoctrinatedrecluse/IndoctrinatedEdit/releases',
        matchedAsset: null,
        allAssets: [],
        channel,
      }
    }
  }

  private simulateWebDownload(): Promise<void> {
    return new Promise((resolve) => {
      let percent = 0
      const total = 78 * 1024 * 1024
      const interval = setInterval(() => {
        percent += 10
        const downloaded = Math.round((percent / 100) * total)
        this.downloadProgress = {
          percentage: percent,
          downloadedBytes: downloaded,
          totalBytes: total,
          speedBytesPerSec: 5.2 * 1024 * 1024,
          formattedDownloaded: `${(downloaded / (1024 * 1024)).toFixed(1)} MB`,
          formattedTotal: `${(total / (1024 * 1024)).toFixed(1)} MB`,
          formattedSpeed: '5.2 MB/s',
          etaSeconds: Math.max(0, Math.round((total - downloaded) / (5.2 * 1024 * 1024))),
        }
        this.notify()

        if (percent >= 100) {
          clearInterval(interval)
          resolve()
        }
      }, 250)
    })
  }
}

export const rendererUpdateService = new RendererUpdateService()

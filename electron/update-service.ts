import { app, BrowserWindow, IpcMain, shell } from 'electron'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import https from 'node:https'
import http from 'node:http'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'

export type UpdateChannel = 'stable' | 'beta' | 'nightly'
export type AutoCheckInterval = 'startup' | 'daily' | 'weekly' | 'manual'

export interface UpdateConfig {
  channel: UpdateChannel
  interval: AutoCheckInterval
  autoDownload: boolean
  lastCheckedTimestamp: number
  lastDismissedVersion?: string
}

export interface ReleaseAsset {
  name: string
  browser_download_url: string
  size: number
  content_type: string
}

export interface GitHubRelease {
  id: number
  tag_name: string
  name: string
  body: string
  draft: boolean
  prerelease: boolean
  published_at: string
  html_url: string
  assets: ReleaseAsset[]
}

export interface MatchedAsset {
  asset: ReleaseAsset
  platform: 'win32' | 'linux' | 'darwin'
  arch: 'x64' | 'arm64' | 'universal'
  packageType: 'exe' | 'appimage' | 'deb' | 'dmg' | 'zip' | 'tar.gz'
  displayName: string
}

export interface UpdateCheckResult {
  updateAvailable: boolean
  currentVersion: string
  latestVersion: string
  releaseName: string
  releaseNotes: string
  publishedAt: string
  releaseUrl: string
  matchedAsset: MatchedAsset | null
  allAssets: ReleaseAsset[]
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

const DEFAULT_CONFIG: UpdateConfig = {
  channel: 'stable',
  interval: 'weekly',
  autoDownload: false,
  lastCheckedTimestamp: 0,
}

export class UpdateService {
  private config: UpdateConfig = { ...DEFAULT_CONFIG }
  private configPath: string = ''
  private downloadAbortController: AbortController | null = null
  private downloadedFilePath: string | null = null
  private downloadedVersion: string | null = null

  constructor() {
    try {
      this.configPath = path.join(app.getPath('userData'), 'update-config.json')
      this.loadConfig()
    } catch {
      // In test or non-electron environments
      this.configPath = ''
    }
  }

  private loadConfig() {
    try {
      if (this.configPath && fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8')
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
      }
    } catch (err) {
      console.warn('[UpdateService] Failed to load config:', err)
      this.config = { ...DEFAULT_CONFIG }
    }
  }

  public saveConfig(newConfig: Partial<UpdateConfig>): UpdateConfig {
    this.config = { ...this.config, ...newConfig }
    try {
      if (this.configPath) {
        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8')
      }
    } catch (err) {
      console.warn('[UpdateService] Failed to save config:', err)
    }
    return this.config
  }

  public getConfig(): UpdateConfig {
    return { ...this.config }
  }

  public getDownloadedFilePath(): string | null {
    return this.downloadedFilePath
  }

  public getDownloadedVersion(): string | null {
    return this.downloadedVersion
  }

  /**
   * Helper to parse and compare SemVer strings
   * Returns: 1 if vA > vB, -1 if vA < vB, 0 if vA === vB
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

    // Pre-release versions have lower precedence than normal version
    if (preA && !preB) return -1
    if (!preA && preB) return 1
    if (preA && preB) {
      return preA.localeCompare(preB, undefined, { numeric: true })
    }

    return 0
  }

  /**
   * Match GitHub release assets based on target platform and arch
   */
  public static matchPlatformAsset(
    assets: ReleaseAsset[],
    platform: string = process.platform,
    arch: string = process.arch
  ): MatchedAsset | null {
    if (!assets || assets.length === 0) return null

    const plat = (platform as 'win32' | 'linux' | 'darwin') || 'win32'
    const architecture = (arch as 'x64' | 'arm64') || 'x64'

    let matched: ReleaseAsset | null = null
    let packageType: MatchedAsset['packageType'] = 'zip'
    let displayName = ''

    if (plat === 'win32') {
      // Prioritize NSIS / Setup.exe, then portable .exe, then .zip
      const exeInstaller = assets.find(
        (a) =>
          a.name.toLowerCase().endsWith('.exe') &&
          (a.name.toLowerCase().includes('setup') || a.name.toLowerCase().includes('installer'))
      )
      const portableExe = assets.find((a) => a.name.toLowerCase().endsWith('.exe'))
      const winZip = assets.find(
        (a) =>
          a.name.toLowerCase().endsWith('.zip') &&
          (a.name.toLowerCase().includes('win') || a.name.toLowerCase().includes('windows'))
      )

      matched = exeInstaller || portableExe || winZip || assets[0]
      packageType = matched.name.toLowerCase().endsWith('.exe') ? 'exe' : 'zip'
      displayName = `Windows x64 ${packageType === 'exe' ? 'Installer (.exe)' : 'Archive (.zip)'}`
    } else if (plat === 'linux') {
      // Prioritize AppImage, then deb, then tar.gz
      const appImage = assets.find((a) => a.name.toLowerCase().endsWith('.appimage'))
      const deb = assets.find((a) => a.name.toLowerCase().endsWith('.deb'))
      const tar = assets.find(
        (a) => a.name.toLowerCase().endsWith('.tar.gz') || a.name.toLowerCase().endsWith('.tgz')
      )

      matched = appImage || deb || tar || assets[0]
      if (matched.name.toLowerCase().endsWith('.appimage')) packageType = 'appimage'
      else if (matched.name.toLowerCase().endsWith('.deb')) packageType = 'deb'
      else packageType = 'tar.gz'
      displayName = `Linux (${packageType.toUpperCase()})`
    } else if (plat === 'darwin') {
      // macOS DMG or Zip
      const dmg = assets.find((a) => a.name.toLowerCase().endsWith('.dmg'))
      const macZip = assets.find(
        (a) =>
          a.name.toLowerCase().endsWith('.zip') &&
          (a.name.toLowerCase().includes('mac') || a.name.toLowerCase().includes('darwin'))
      )

      matched = dmg || macZip || assets[0]
      packageType = matched.name.toLowerCase().endsWith('.dmg') ? 'dmg' : 'zip'
      displayName = `macOS ${architecture === 'arm64' ? 'Apple Silicon' : 'Intel'} (${packageType.toUpperCase()})`
    }

    if (!matched) return null

    return {
      asset: matched,
      platform: plat,
      arch: architecture,
      packageType,
      displayName,
    }
  }

  /**
   * Checks GitHub for the latest release
   */
  public async checkForUpdates(channel?: UpdateChannel): Promise<UpdateCheckResult> {
    const activeChannel = channel || this.config.channel || 'stable'
    const currentVersion = app.getVersion ? app.getVersion() : '4.6.0'

    this.saveConfig({ lastCheckedTimestamp: Date.now() })

    try {
      const url =
        activeChannel === 'stable'
          ? 'https://api.github.com/repos/indoctrinatedrecluse/IndoctrinatedEdit/releases/latest'
          : 'https://api.github.com/repos/indoctrinatedrecluse/IndoctrinatedEdit/releases'

      const releaseData = await this.fetchJson<any>(url)

      let release: GitHubRelease
      if (Array.isArray(releaseData)) {
        // Multi-release response (for beta / nightly channel filtering)
        const candidates = releaseData.filter((r: GitHubRelease) => {
          if (activeChannel === 'stable') return !r.prerelease && !r.draft
          if (activeChannel === 'beta') return r.tag_name.includes('beta') || !r.draft
          return !r.draft
        })
        release = candidates[0] || releaseData[0]
      } else {
        release = releaseData
      }

      if (!release || !release.tag_name) {
        throw new Error('No valid release data returned from update server.')
      }

      const latestVersion = release.tag_name.replace(/^v/i, '')
      const isNewer = UpdateService.compareSemVer(latestVersion, currentVersion) > 0
      const matchedAsset = UpdateService.matchPlatformAsset(release.assets || [])

      return {
        updateAvailable: isNewer,
        currentVersion,
        latestVersion,
        releaseName: release.name || `IndoctrinatedEdit ${release.tag_name}`,
        releaseNotes: release.body || 'No release notes provided for this version.',
        publishedAt: release.published_at || new Date().toISOString(),
        releaseUrl: release.html_url || 'https://github.com/indoctrinatedrecluse/IndoctrinatedEdit/releases',
        matchedAsset,
        allAssets: release.assets || [],
        channel: activeChannel,
      }
    } catch (err: any) {
      console.warn('[UpdateService] Update check failed, providing mock fallback info:', err.message)
      // Return safe graceful response if offline or GitHub API rate-limited
      return {
        updateAvailable: false,
        currentVersion,
        latestVersion: currentVersion,
        releaseName: `IndoctrinatedEdit ${currentVersion}`,
        releaseNotes: 'You are using the latest version of IndoctrinatedEdit.',
        publishedAt: new Date().toISOString(),
        releaseUrl: 'https://github.com/indoctrinatedrecluse/IndoctrinatedEdit/releases',
        matchedAsset: null,
        allAssets: [],
        channel: activeChannel,
        error: err.message,
      }
    }
  }

  /**
   * Downloads the matched update asset binary to temp directory with chunked progress
   */
  public async downloadUpdate(
    downloadUrl: string,
    version: string,
    expectedSha256?: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<{ filePath: string; verified: boolean }> {
    if (this.downloadAbortController) {
      this.downloadAbortController.abort()
    }
    this.downloadAbortController = new AbortController()

    const tempDir = app.getPath('temp')
    const fileName = path.basename(new URL(downloadUrl).pathname) || `indoctrinated-edit-update-${version}.bin`
    const targetPath = path.join(tempDir, fileName)

    return new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(targetPath)
      const hash = crypto.createHash('sha256')

      let downloadedBytes = 0
      let totalBytes = 0
      let lastTime = Date.now()
      let bytesSinceLastTime = 0
      let speedBytesPerSec = 0

      const requestHandler = (currentUrl: string) => {
        const client = currentUrl.startsWith('https') ? https : http
        const req = client.get(
          currentUrl,
          {
            headers: {
              'User-Agent': 'IndoctrinatedEdit-AutoUpdater/4.6.0',
            },
          },
          (res) => {
            // Handle HTTP Redirects (e.g. GitHub Releases AWS S3 redirects)
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              return requestHandler(res.headers.location)
            }

            if (res.statusCode && res.statusCode >= 400) {
              fileStream.close()
              fs.unlink(targetPath, () => {})
              return reject(new Error(`Failed to download update: HTTP ${res.statusCode} ${res.statusMessage}`))
            }

            totalBytes = parseInt(res.headers['content-length'] || '0', 10)

            res.on('data', (chunk: Buffer) => {
              downloadedBytes += chunk.length
              bytesSinceLastTime += chunk.length
              hash.update(chunk)
              fileStream.write(chunk)

              const now = Date.now()
              const elapsed = now - lastTime
              if (elapsed >= 300 || downloadedBytes === totalBytes) {
                speedBytesPerSec = Math.round((bytesSinceLastTime / (elapsed / 1000))) || 0
                lastTime = now
                bytesSinceLastTime = 0

                const percentage = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0
                const remainingBytes = Math.max(0, totalBytes - downloadedBytes)
                const etaSeconds = speedBytesPerSec > 0 ? Math.round(remainingBytes / speedBytesPerSec) : 0

                if (onProgress) {
                  onProgress({
                    percentage,
                    downloadedBytes,
                    totalBytes,
                    speedBytesPerSec,
                    formattedDownloaded: this.formatBytes(downloadedBytes),
                    formattedTotal: this.formatBytes(totalBytes),
                    formattedSpeed: `${this.formatBytes(speedBytesPerSec)}/s`,
                    etaSeconds,
                  })
                }
              }
            })

            res.on('end', () => {
              fileStream.end()
              const calculatedSha256 = hash.digest('hex')
              const verified = expectedSha256
                ? calculatedSha256.toLowerCase() === expectedSha256.toLowerCase()
                : true

              this.downloadedFilePath = targetPath
              this.downloadedVersion = version
              resolve({ filePath: targetPath, verified })
            })

            res.on('error', (err) => {
              fileStream.close()
              fs.unlink(targetPath, () => {})
              reject(err)
            })
          }
        )

        req.on('error', (err) => {
          fileStream.close()
          fs.unlink(targetPath, () => {})
          reject(err)
        })

        if (this.downloadAbortController) {
          this.downloadAbortController.signal.addEventListener('abort', () => {
            req.destroy()
            fileStream.close()
            fs.unlink(targetPath, () => {})
            reject(new Error('Update download was cancelled by the user.'))
          })
        }
      }

      requestHandler(downloadUrl)
    })
  }

  /**
   * Executes the downloaded installer or binary cleanly
   */
  public async installUpdate(installerPath?: string): Promise<boolean> {
    const targetFile = installerPath || this.downloadedFilePath
    if (!targetFile || !fs.existsSync(targetFile)) {
      throw new Error('Downloaded update file not found on disk.')
    }

    const platform = process.platform

    if (platform === 'win32') {
      if (targetFile.endsWith('.exe')) {
        // Spawn NSIS or Windows installer detached and quit current app
        const child = spawn(targetFile, [], {
          detached: true,
          stdio: 'ignore',
        })
        child.unref()
        app.quit()
        return true
      } else {
        // Open folder if zip/archive
        shell.showItemInFolder(targetFile)
        return true
      }
    } else if (platform === 'linux') {
      if (targetFile.endsWith('.AppImage')) {
        // Ensure executable permissions
        await fsPromises.chmod(targetFile, 0o755)
        const child = spawn(targetFile, [], {
          detached: true,
          stdio: 'ignore',
        })
        child.unref()
        app.quit()
        return true
      } else {
        shell.showItemInFolder(targetFile)
        return true
      }
    } else if (platform === 'darwin') {
      if (targetFile.endsWith('.dmg')) {
        shell.openPath(targetFile)
        return true
      } else {
        shell.showItemInFolder(targetFile)
        return true
      }
    }

    shell.showItemInFolder(targetFile)
    return true
  }

  public cancelDownload() {
    if (this.downloadAbortController) {
      this.downloadAbortController.abort()
      this.downloadAbortController = null
    }
  }

  public setupIPC(ipcMain: IpcMain, getWin: () => BrowserWindow | null) {
    ipcMain.handle('updater:checkForUpdates', async (_, channel?: UpdateChannel) => {
      return await this.checkForUpdates(channel)
    })

    ipcMain.handle(
      'updater:downloadUpdate',
      async (_, downloadUrl: string, version: string, expectedSha256?: string) => {
        return await this.downloadUpdate(downloadUrl, version, expectedSha256, (progress) => {
          const win = getWin()
          if (win && !win.isDestroyed()) {
            win.webContents.send('updater:downloadProgress', progress)
          }
        })
      }
    )

    ipcMain.handle('updater:cancelDownload', () => {
      this.cancelDownload()
      return true
    })

    ipcMain.handle('updater:installUpdate', async (_, installerPath?: string) => {
      return await this.installUpdate(installerPath)
    })

    ipcMain.handle('updater:getConfig', () => {
      return this.getConfig()
    })

    ipcMain.handle('updater:saveConfig', (_, config: Partial<UpdateConfig>) => {
      return this.saveConfig(config)
    })
  }

  private fetchJson<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http
      client
        .get(
          url,
          {
            headers: {
              'User-Agent': 'IndoctrinatedEdit-AutoUpdater/4.6.0',
              Accept: 'application/vnd.github.v3+json',
            },
          },
          (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              return resolve(this.fetchJson(res.headers.location))
            }

            if (res.statusCode && res.statusCode >= 400) {
              return reject(new Error(`GitHub API Error: HTTP ${res.statusCode} ${res.statusMessage}`))
            }

            let data = ''
            res.on('data', (chunk) => {
              data += chunk
            })
            res.on('end', () => {
              try {
                resolve(JSON.parse(data))
              } catch (err) {
                reject(err)
              }
            })
          }
        )
        .on('error', reject)
    })
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }
}

export const updateService = new UpdateService()

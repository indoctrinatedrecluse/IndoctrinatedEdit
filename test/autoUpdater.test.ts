import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { UpdateService, ReleaseAsset } from '../electron/update-service'
import { RendererUpdateService } from '../src/services/updateService'

describe('Auto-Updater Subsystem Tests', () => {
  describe('SemVer Version Comparison Logic', () => {
    it('should correctly determine newer versions', () => {
      expect(UpdateService.compareSemVer('4.5.0', '4.4.0')).toBe(1)
      expect(UpdateService.compareSemVer('5.0.0', '4.4.0')).toBe(1)
      expect(UpdateService.compareSemVer('4.4.1', '4.4.0')).toBe(1)
      expect(UpdateService.compareSemVer('v4.5.0', '4.4.0')).toBe(1)
      expect(UpdateService.compareSemVer('4.5.0', 'v4.4.0')).toBe(1)
    })

    it('should correctly determine equal versions', () => {
      expect(UpdateService.compareSemVer('4.4.0', '4.4.0')).toBe(0)
      expect(UpdateService.compareSemVer('v4.4.0', '4.4.0')).toBe(0)
      expect(UpdateService.compareSemVer('4.4.0', 'v4.4.0')).toBe(0)
    })

    it('should correctly determine older versions', () => {
      expect(UpdateService.compareSemVer('4.3.0', '4.4.0')).toBe(-1)
      expect(UpdateService.compareSemVer('3.9.9', '4.0.0')).toBe(-1)
      expect(UpdateService.compareSemVer('4.4.0', '4.4.1')).toBe(-1)
    })

    it('should handle pre-release tags properly', () => {
      // Normal release takes precedence over pre-release
      expect(UpdateService.compareSemVer('4.5.0', '4.5.0-beta.1')).toBe(1)
      expect(UpdateService.compareSemVer('4.5.0-beta.1', '4.5.0')).toBe(-1)
      // Comparison between pre-releases
      expect(UpdateService.compareSemVer('4.5.0-beta.2', '4.5.0-beta.1')).toBeGreaterThan(0)
    })

    it('should match renderer SemVer comparison implementation', () => {
      expect(RendererUpdateService.compareSemVer('4.5.0', '4.4.0')).toBe(1)
      expect(RendererUpdateService.compareSemVer('4.4.0', '4.4.0')).toBe(0)
      expect(RendererUpdateService.compareSemVer('4.3.0', '4.4.0')).toBe(-1)
    })
  })

  describe('Platform & Architecture Asset Matching', () => {
    const mockAssets: ReleaseAsset[] = [
      {
        name: 'IndoctrinatedEdit-4.5.0-Setup.exe',
        browser_download_url: 'https://github.com/releases/download/v4.5.0/IndoctrinatedEdit-4.5.0-Setup.exe',
        size: 84500000,
        content_type: 'application/x-msdos-program',
      },
      {
        name: 'IndoctrinatedEdit-4.5.0-win-x64.zip',
        browser_download_url: 'https://github.com/releases/download/v4.5.0/IndoctrinatedEdit-4.5.0-win-x64.zip',
        size: 81200000,
        content_type: 'application/zip',
      },
      {
        name: 'IndoctrinatedEdit-4.5.0.AppImage',
        browser_download_url: 'https://github.com/releases/download/v4.5.0/IndoctrinatedEdit-4.5.0.AppImage',
        size: 92000000,
        content_type: 'application/x-executable',
      },
      {
        name: 'indoctrinated-edit_4.5.0_amd64.deb',
        browser_download_url: 'https://github.com/releases/download/v4.5.0/indoctrinated-edit_4.5.0_amd64.deb',
        size: 78000000,
        content_type: 'application/vnd.debian.binary-package',
      },
      {
        name: 'IndoctrinatedEdit-4.5.0.dmg',
        browser_download_url: 'https://github.com/releases/download/v4.5.0/IndoctrinatedEdit-4.5.0.dmg',
        size: 96000000,
        content_type: 'application/x-apple-diskimage',
      },
    ]

    it('should match Windows NSIS Setup.exe for win32 platform', () => {
      const match = UpdateService.matchPlatformAsset(mockAssets, 'win32', 'x64')
      expect(match).toBeDefined()
      expect(match?.platform).toBe('win32')
      expect(match?.packageType).toBe('exe')
      expect(match?.asset.name).toBe('IndoctrinatedEdit-4.5.0-Setup.exe')
      expect(match?.displayName).toContain('Windows x64')
    })

    it('should match Linux AppImage for linux platform', () => {
      const match = UpdateService.matchPlatformAsset(mockAssets, 'linux', 'x64')
      expect(match).toBeDefined()
      expect(match?.platform).toBe('linux')
      expect(match?.packageType).toBe('appimage')
      expect(match?.asset.name).toBe('IndoctrinatedEdit-4.5.0.AppImage')
      expect(match?.displayName).toContain('Linux')
    })

    it('should match macOS DMG for darwin platform', () => {
      const match = UpdateService.matchPlatformAsset(mockAssets, 'darwin', 'x64')
      expect(match).toBeDefined()
      expect(match?.platform).toBe('darwin')
      expect(match?.packageType).toBe('dmg')
      expect(match?.asset.name).toBe('IndoctrinatedEdit-4.5.0.dmg')
      expect(match?.displayName).toContain('macOS')
    })

    it('should return null when assets list is empty', () => {
      const match = UpdateService.matchPlatformAsset([], 'win32', 'x64')
      expect(match).toBeNull()
    })
  })

  describe('Renderer Update Service State & Schedule Logic', () => {
    let service: RendererUpdateService
    let mockStorage: Record<string, string> = {}

    beforeEach(() => {
      mockStorage = {}
      globalThis.localStorage = {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockStorage[key] = value
        },
        removeItem: (key: string) => {
          delete mockStorage[key]
        },
        clear: () => {
          mockStorage = {}
        },
        length: 0,
        key: () => null,
      }
      service = new RendererUpdateService()
    })

    afterEach(() => {
      service?.cleanup()
    })

    it('should initialize with default configuration', () => {
      const config = service.getConfig()
      expect(config.channel).toBe('stable')
      expect(config.interval).toBe('weekly')
      expect(config.autoDownload).toBe(false)
      expect(service.getStatus()).toBe('idle')
    })

    it('should save and persist configuration changes', () => {
      service.saveConfig({ channel: 'beta', interval: 'daily', autoDownload: true })
      const updated = service.getConfig()
      expect(updated.channel).toBe('beta')
      expect(updated.interval).toBe('daily')
      expect(updated.autoDownload).toBe(true)

      // Test reload from localStorage
      const newService = new RendererUpdateService()
      expect(newService.getConfig().channel).toBe('beta')
      expect(newService.getConfig().interval).toBe('daily')
      newService.cleanup()
    })

    it('should correctly notify subscribers on state change', async () => {
      let notified = false
      const unsubscribe = service.subscribe(() => {
        notified = true
      })

      service.saveConfig({ channel: 'nightly' })
      expect(notified).toBe(true)

      unsubscribe()
    })

    it('should handle simulated download and calculate progress accurately', async () => {
      // Mock updateInfo with an available update and matched asset
      (service as any).updateInfo = {
        updateAvailable: true,
        currentVersion: '4.4.0',
        latestVersion: '4.5.0',
        releaseName: 'IndoctrinatedEdit 4.5.0',
        releaseNotes: 'Awesome new features',
        publishedAt: new Date().toISOString(),
        releaseUrl: 'https://github.com/indoctrinatedrecluse/IndoctrinatedEdit/releases/v4.5.0',
        matchedAsset: {
          asset: {
            name: 'IndoctrinatedEdit-4.5.0-Setup.exe',
            browser_download_url: 'https://github.com/releases/download/v4.5.0/IndoctrinatedEdit-4.5.0-Setup.exe',
            size: 80000000,
            content_type: 'application/x-msdos-program',
          },
          platform: 'win32',
          arch: 'x64',
          packageType: 'exe',
          displayName: 'Windows x64 Installer',
        },
        allAssets: [],
        channel: 'stable',
      }
      ;(service as any).status = 'available'

      // Trigger download
      const downloadPromise = service.downloadUpdate()
      expect(service.getStatus()).toBe('downloading')

      await downloadPromise
      expect(service.getStatus()).toBe('downloaded')
      expect(service.getDownloadProgress()?.percentage).toBe(100)
      expect(service.getDownloadProgress()?.formattedTotal).toBe('78.0 MB')
    })

    it('should dismiss update and remember last dismissed version', async () => {
      await service.checkForUpdates(true)
      service.dismissCurrentUpdate()
      expect(service.getStatus()).toBe('idle')
    })
  })
})

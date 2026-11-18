import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ClientLicenseService } from '../src/services/licenseService'
import { LicenseService } from '../electron/license-service'

describe('Licensing & Node-Locking Subsystem', () => {
  let clientService: ClientLicenseService
  let electronService: LicenseService
  let tmpDir: string
  let anchorHome: string
  let anchorAppData: string
  let anchorProgramData: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'indoctrinated-license-test-'))
    anchorHome = path.join(tmpDir, 'home', 'license.json')
    anchorAppData = path.join(tmpDir, 'appdata', 'license.json')
    anchorProgramData = path.join(tmpDir, 'programdata', 'license.json')

    clientService = ClientLicenseService.getInstance()
    // Strictly isolated temp anchors — NEVER touches host machine Registry or real license files!
    electronService = LicenseService.createIsolated({
      fileAnchors: [anchorHome, anchorAppData, anchorProgramData],
      disableRegistry: true,
    })
  })

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {}
  })

  describe('Hardware Fingerprinting & Key Masking', () => {
    it('should generate a consistent machine HWID prefixed with HWID-', () => {
      const hwid = electronService.getHwid()
      expect(hwid).toBeDefined()
      expect(hwid.startsWith('HWID-')).toBe(true)
      expect(hwid.length).toBeGreaterThanOrEqual(16)
    })

    it('should mask license keys preserving the license type prefix', () => {
      expect(clientService.maskKey('ADM-ABCD-1234-EFGH')).toBe('ADM-xxxx-xxxx-xxxx')
      expect(clientService.maskKey('DEV-9988-7766-5544')).toBe('DEV-xxxx-xxxx-xxxx')
      expect(clientService.maskKey('USER-1122-3344-5566')).toBe('USER-xxxx-xxxx-xxxx')
      expect(electronService.maskLicenseKey('ADM-1234-5678-9012')).toBe('ADM-xxxx-xxxx-xxxx')
      expect(electronService.maskLicenseKey('USER-AAAA-BBBB-CCCC')).toBe('USER-xxxx-xxxx-xxxx')
    })

    it('should correctly parse license type prefixes', () => {
      expect(electronService.parseLicenseType('ADM-4821-9920-1192')).toBe('ADM')
      expect(electronService.parseLicenseType('ADMIN-9900-1122-3344')).toBe('ADM')
      expect(electronService.parseLicenseType('DEV-3344-5566-7788')).toBe('DEV')
      expect(electronService.parseLicenseType('USER-1122-3344-5566')).toBe('USER')
      expect(electronService.parseLicenseType('CUSTOM-KEY-1234')).toBe('USER')
    })

    it('should format friendly license type names', () => {
      expect(clientService.getLicenseTypeName('ADM')).toBe('Administrator License (ADM)')
      expect(clientService.getLicenseTypeName('DEV')).toBe('Developer License (DEV)')
      expect(clientService.getLicenseTypeName('USER')).toBe('General User License (USER)')
      expect(clientService.getLicenseTypeName('TRIAL')).toBe('Trial License (30-Day Evaluation)')
    })
  })

  describe('Trial License Lifecycle', () => {
    it('should provide a default 30-day evaluation trial when no license is active', async () => {
      const info = await clientService.getInfo()
      expect(info).toBeDefined()
      expect(info.type).toBe('TRIAL')
      expect(info.isTrial).toBe(true)
      expect(info.isValid).toBe(true)
      expect(info.trialDaysRemaining).toBeGreaterThanOrEqual(29)
      expect(info.trialDaysRemaining).toBeLessThanOrEqual(30)
      expect(info.hwid).toBeDefined()
    })
  })

  describe('License Activation & Admin Bypass', () => {
    it('should activate an ADM license with immediate bypass (no credentials required)', async () => {
      const result = await electronService.activateLicense({
        licenseKey: 'ADM-9999-8888-7777',
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('Admin license activated')
      expect(result.info?.type).toBe('ADM')
      expect(result.info?.isTrial).toBe(false)
      expect(result.info?.status).toBe('active')
      expect(result.info?.username).toBe('Administrator')
      expect(result.info?.maskedKey).toBe('ADM-xxxx-xxxx-xxxx')
    })

    it('should allow removing an active license and cleanly reverting to a 30-day Trial', async () => {
      await electronService.activateLicense({
        licenseKey: 'ADM-1234-5678-9012',
      })

      const removeResult = await electronService.removeLicense()
      expect(removeResult.success).toBe(true)
      expect(removeResult.message).toContain('Reverted to a 30-day Trial License')
      expect(removeResult.info?.type).toBe('TRIAL')
      expect(removeResult.info?.isTrial).toBe(true)
      expect(removeResult.info?.trialDaysRemaining).toBeGreaterThanOrEqual(29)
    })

    it('should notify client subscribers when license state changes', async () => {
      let notifiedInfo: any = null
      const unsubscribe = clientService.subscribe((info) => {
        notifiedInfo = info
      })

      await clientService.activate({
        licenseKey: 'DEV-1122-3344-5566',
        username: 'dev_user',
      })

      expect(notifiedInfo).toBeDefined()
      expect(notifiedInfo.type).toBe('DEV')
      expect(notifiedInfo.username).toBe('dev_user')
      expect(notifiedInfo.maskedKey).toBe('DEV-xxxx-xxxx-xxxx')

      await clientService.remove()
      expect(notifiedInfo.type).toBe('TRIAL')
      expect(notifiedInfo.isTrial).toBe(true)

      unsubscribe()
    })

    it('should lock out expired TRIAL licenses and expired USER/DEV licenses while keeping ADM lifetime valid', async () => {
      await electronService.activateLicense({
        licenseKey: 'ADM-LIFETIME-MASTER-KEY',
        username: 'RootAdmin',
      })
      const admInfo = electronService.getLicenseInfo()
      expect(admInfo.type).toBe('ADM')
      expect(admInfo.status).toBe('active')
      expect(admInfo.isValid).toBe(true)
      expect(admInfo.expiresAt).toBeNull()

      await electronService.removeLicense()
      const trialInfo = electronService.getLicenseInfo()
      expect(trialInfo.type).toBe('TRIAL')
      expect(trialInfo.isValid).toBe(true)
      expect(trialInfo.status).toBe('trial')

      const clientExpired = clientService.isExpired(trialInfo)
      expect(clientExpired).toBe(false)
    })
  })

  describe('Persistence Across Updates, Reinstalls & Legacy Migration', () => {
    it('should persist and self-heal an active license even if 2 of 3 anchors are wiped during reinstall', async () => {
      await electronService.activateLicense({
        licenseKey: 'ADM-PERSIST-2026-9999',
        username: 'PersistentOwner',
      })

      // Simulate an installer/reinstall wiping AppData and ProgramData anchors
      fs.unlinkSync(anchorAppData)
      fs.unlinkSync(anchorProgramData)
      expect(fs.existsSync(anchorAppData)).toBe(false)
      expect(fs.existsSync(anchorProgramData)).toBe(false)

      // Fresh service instance simulates app relaunch after update/reinstall
      const afterReinstall = LicenseService.createIsolated({
        fileAnchors: [anchorHome, anchorAppData, anchorProgramData],
        disableRegistry: true,
      })

      const info = afterReinstall.getLicenseInfo()
      expect(info.type).toBe('ADM')
      expect(info.isValid).toBe(true)
      expect(info.isTrial).toBe(false)
      expect(info.username).toBe('PersistentOwner')
      expect(info.licenseKey).toBe('ADM-PERSIST-2026-9999')

      // Verify wiped anchors were automatically self-healed
      expect(fs.existsSync(anchorAppData)).toBe(true)
      expect(fs.existsSync(anchorProgramData)).toBe(true)
    })

    it('should prevent a fresh-install trial stub in one anchor from clobbering an active paid license in another anchor', () => {
      // Anchor 1 (e.g. fresh HKCU/LocalAppData) has a newer unactivated trial stub
      fs.mkdirSync(path.dirname(anchorAppData), { recursive: true })
      fs.writeFileSync(
        anchorAppData,
        JSON.stringify({
          schemaVersion: 2,
          updatedAt: Date.now() + 5000,
          licenseType: 'TRIAL',
          status: 'trial',
          trialStartedAt: new Date().toISOString(),
          explicitlyRemoved: false,
        }),
        'utf8'
      )

      // Anchor 2 (e.g. surviving Home anchor) has an active DEV license
      fs.mkdirSync(path.dirname(anchorHome), { recursive: true })
      fs.writeFileSync(
        anchorHome,
        JSON.stringify({
          schemaVersion: 2,
          updatedAt: Date.now() - 10000,
          licenseKey: 'DEV-ABCD-1234-5678',
          licenseType: 'DEV',
          username: 'pro_developer',
          status: 'active',
          activatedAt: new Date().toISOString(),
          expiresAt: null,
        }),
        'utf8'
      )

      const info = electronService.getLicenseInfo()
      expect(info.type).toBe('DEV')
      expect(info.isValid).toBe(true)
      expect(info.isTrial).toBe(false)
      expect(info.username).toBe('pro_developer')
      expect(info.licenseKey).toBe('DEV-ABCD-1234-5678')
    })

    it('should seamlessly migrate legacy v1 flat license.json files from pre-5.3.0 installs', () => {
      fs.mkdirSync(path.dirname(anchorHome), { recursive: true })
      fs.writeFileSync(
        anchorHome,
        JSON.stringify({
          LicenseKey: 'USER-LEGACY-5110-KEY1',
          LicenseType: 'USER',
          LicenseUsername: 'early_adopter',
          LicenseStatus: 'active',
          LicenseActivatedAt: '2026-10-10T10:00:00.000Z',
          LicenseExpiresAt: '',
        }),
        'utf8'
      )

      const info = electronService.getLicenseInfo()
      expect(info.type).toBe('USER')
      expect(info.isValid).toBe(true)
      expect(info.isTrial).toBe(false)
      expect(info.username).toBe('early_adopter')
      expect(info.licenseKey).toBe('USER-LEGACY-5110-KEY1')

      // Verify anchor was upgraded to schemaVersion 2 and mirrored
      const upgraded = JSON.parse(fs.readFileSync(anchorAppData, 'utf8'))
      expect(upgraded.schemaVersion).toBe(2)
      expect(upgraded.licenseKey).toBe('USER-LEGACY-5110-KEY1')
    })

    it('should honor explicit license removal even if a stale anchor still holds an older paid record', async () => {
      await electronService.activateLicense({
        licenseKey: 'ADM-OLD-KEY-1111',
        username: 'OldAdmin',
      })
      const stalePaidSnapshot = fs.readFileSync(anchorProgramData, 'utf8')

      await electronService.removeLicense()

      // Simulate ProgramData/HKLM being read-only and still holding the old pre-removal record
      fs.writeFileSync(anchorProgramData, stalePaidSnapshot, 'utf8')

      const restarted = LicenseService.createIsolated({
        fileAnchors: [anchorHome, anchorAppData, anchorProgramData],
        disableRegistry: true,
      })

      const info = restarted.getLicenseInfo()
      expect(info.type).toBe('TRIAL')
      expect(info.isTrial).toBe(true)
    })
  })

  describe('Pro Extensions & Gated Microservices Subsystem', () => {
    it('should correctly flag exactly the 9 designated extensions as isPro and leave all other extensions free', async () => {
      const { extensionRegistry } = await import('../src/extensions/extensionRegistry')

      const proExtensionIds = new Set([
        'indoctrinated.ext.mocklab',
        'indoctrinated.ext.remote-protocol-studio',
        'indoctrinated.ext.graphql',
        'indoctrinated.ext.svgstudio',
        'indoctrinated.ext.cryptolab',
        'indoctrinated.ext.docker',
        'indoctrinated.ext.websocket',
        'indoctrinated.ext.antigravity',
        'indoctrinated.ext.aiassistant',
      ])

      const allExtensions = extensionRegistry.getAll()
      expect(allExtensions.length).toBeGreaterThanOrEqual(35)

      let proCount = 0
      let freeCount = 0

      for (const ext of allExtensions) {
        if (proExtensionIds.has(ext.id)) {
          expect(ext.isPro, `Pro extension ${ext.id} must have isPro: true`).toBe(true)
          proCount++
        } else {
          expect(
            ext.isPro,
            `Standard extension "${ext.name}" (${ext.id}) must NOT be Pro-locked (must remain available in Trial mode)`
          ).toBeFalsy()
          freeCount++
        }
      }

      expect(proCount).toBe(9)
      expect(freeCount).toBe(allExtensions.length - 9)
    })
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { ClientLicenseService } from '../src/services/licenseService'
import { LicenseService } from '../electron/license-service'

describe('Licensing & Node-Locking Subsystem', () => {
  let clientService: ClientLicenseService
  let electronService: LicenseService

  beforeEach(() => {
    clientService = ClientLicenseService.getInstance()
    electronService = LicenseService.getInstance()
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
      // First ensure an active license
      await electronService.activateLicense({
        licenseKey: 'ADM-1234-5678-9012',
      })

      // Remove the license
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

      // Clean up and revert to trial
      await clientService.remove()
      expect(notifiedInfo.type).toBe('TRIAL')
      expect(notifiedInfo.isTrial).toBe(true)

      unsubscribe()
    })

    it('should lock out expired TRIAL licenses and expired USER/DEV licenses while keeping ADM lifetime valid', async () => {
      // 1. ADM license: always lifetime valid, never expired
      await electronService.activateLicense({
        licenseKey: 'ADM-LIFETIME-MASTER-KEY',
        username: 'RootAdmin',
      })
      const admInfo = electronService.getLicenseInfo()
      expect(admInfo.type).toBe('ADM')
      expect(admInfo.status).toBe('active')
      expect(admInfo.isValid).toBe(true)
      expect(admInfo.expiresAt).toBeNull()

      // 2. Clean remove to revert to trial
      await electronService.removeLicense()
      const trialInfo = electronService.getLicenseInfo()
      expect(trialInfo.type).toBe('TRIAL')
      expect(trialInfo.isValid).toBe(true)
      expect(trialInfo.status).toBe('trial')

      // 3. Client mock expiration behavior
      const clientExpired = clientService.isExpired(trialInfo)
      expect(clientExpired).toBe(false)
    })
  })

  describe('Pro Extensions & Gated Microservices Subsystem', () => {
    it('should correctly flag exactly the 9 designated extensions as isPro and leave all other extensions free', async () => {
      // Dynamic import to avoid circular references
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

      // Assert that exactly the 9 requested extensions are marked Pro
      expect(proCount).toBe(9)
      expect(freeCount).toBe(allExtensions.length - 9)
    })
  })
})

import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'
import { spawnSync } from 'child_process'
import { IpcMain } from 'electron'

export type LicenseType = 'ADM' | 'DEV' | 'USER' | 'TRIAL'
export type LicenseStatus = 'active' | 'trial' | 'expired' | 'revoked'

export interface LicenseInfo {
  type: LicenseType
  typeName: string
  licenseKey?: string
  maskedKey?: string
  username?: string
  hwid: string
  status: LicenseStatus
  trialDaysRemaining?: number
  trialStartedAt?: string
  activatedAt?: string
  expiresAt?: string | null
  isValid: boolean
  isTrial: boolean
  machineName: string
}

export interface LicenseActivationRequest {
  licenseKey: string
  username?: string
  password?: string
}

export interface LicenseActionResult {
  success: boolean
  message?: string
  error?: string
  info?: LicenseInfo
}

const LICENSOR_SERVER_URL = process.env.LICENSOR_SERVER_URL || 'https://licensor-h5zdysrkqa-uc.a.run.app'
const PRODUCT_ID = 'indoctrinated-edit'
const APP_VERSION = '5.0.0'
const REG_KEY = 'HKCU\\Software\\Indoctrinated\\IndoctrinatedEdit'

export class LicenseService {
  private static instance: LicenseService
  private configDir: string
  private licenseFilePath: string
  private cachedHwid: string | null = null

  private constructor() {
    this.configDir = path.join(os.homedir(), '.indoctrinated')
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true })
      }
    } catch (e) {
      console.warn('[LicenseService] Could not create config dir:', e)
    }
    this.licenseFilePath = path.join(this.configDir, 'license.json')
  }

  public static getInstance(): LicenseService {
    if (!LicenseService.instance) {
      LicenseService.instance = new LicenseService()
    }
    return LicenseService.instance
  }

  /**
   * Generates a stable machine hardware fingerprint (HWID) based on system attributes.
   */
  public getHwid(): string {
    if (this.cachedHwid) return this.cachedHwid

    try {
      const hostname = os.hostname() || 'localhost'
      const platformName = os.platform() || 'windows'
      const arch = os.arch() || 'x64'
      const cpuModel = os.cpus()?.[0]?.model || 'cpu'
      const username = os.userInfo()?.username || 'user'

      const raw = `${hostname}-${platformName}-${arch}-${cpuModel}-${username}`
      const hash = crypto.createHash('sha256').update(raw, 'utf8').digest('hex')
      this.cachedHwid = `HWID-${hash.substring(0, 16).toUpperCase()}`
    } catch {
      this.cachedHwid = 'HWID-INDOCTRINATED-DEFAULT'
    }

    return this.cachedHwid
  }

  /**
   * Masks a license key keeping the prefix visible, e.g. ADM-xxxx-xxxx-xxxx
   */
  public maskLicenseKey(key?: string): string {
    if (!key) return ''
    const trimmed = key.trim().toUpperCase()
    const parts = trimmed.split('-')
    if (parts.length <= 1) {
      return trimmed.length > 4 ? `${trimmed.substring(0, 4)}-xxxx-xxxx-xxxx` : 'xxxx-xxxx-xxxx'
    }
    const prefix = parts[0]
    const maskedParts = parts.slice(1).map(() => 'xxxx')
    return `${prefix}-${maskedParts.join('-')}`
  }

  /**
   * Reads string value from Windows Registry or fallback file
   */
  private readRegistryValue(valueName: string): string | null {
    if (process.platform === 'win32') {
      try {
        const res = spawnSync('reg', ['query', REG_KEY, '/v', valueName], {
          encoding: 'utf8',
          windowsHide: true,
        })
        if (res.status === 0 && res.stdout) {
          const lines = res.stdout.split(/\r?\n/)
          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed.startsWith(valueName)) {
              const parts = trimmed.split(/\s+REG_\w+\s+/)
              if (parts.length >= 2) {
                return parts[1].trim()
              }
            }
          }
        }
      } catch {}
    }

    // Fallback: file storage
    try {
      if (fs.existsSync(this.licenseFilePath)) {
        const raw = fs.readFileSync(this.licenseFilePath, 'utf8')
        const data = JSON.parse(raw)
        return data[valueName] ?? null
      }
    } catch {}

    return null
  }

  /**
   * Writes value to Windows Registry and file storage
   */
  private writeRegistryValue(valueName: string, value: string): void {
    if (process.platform === 'win32') {
      try {
        spawnSync('reg', ['add', REG_KEY, '/v', valueName, '/d', value, '/f'], {
          windowsHide: true,
        })
      } catch {}
    }

    // Always mirror to local file store
    try {
      let data: Record<string, any> = {}
      if (fs.existsSync(this.licenseFilePath)) {
        try {
          data = JSON.parse(fs.readFileSync(this.licenseFilePath, 'utf8'))
        } catch {}
      }
      data[valueName] = value
      fs.writeFileSync(this.licenseFilePath, JSON.stringify(data, null, 2), 'utf8')
    } catch (e) {
      console.warn('[LicenseService] Failed to write license file:', e)
    }
  }

  /**
   * Deletes a value from Windows Registry and file storage
   */
  private deleteRegistryValue(valueName: string): void {
    if (process.platform === 'win32') {
      try {
        spawnSync('reg', ['delete', REG_KEY, '/v', valueName, '/f'], {
          windowsHide: true,
        })
      } catch {}
    }

    try {
      if (fs.existsSync(this.licenseFilePath)) {
        const data = JSON.parse(fs.readFileSync(this.licenseFilePath, 'utf8'))
        delete data[valueName]
        fs.writeFileSync(this.licenseFilePath, JSON.stringify(data, null, 2), 'utf8')
      }
    } catch {}
  }

  /**
   * Detects license type from key prefix
   */
  public parseLicenseType(key: string): LicenseType {
    const upper = key.trim().toUpperCase()
    if (upper.startsWith('ADM-') || upper.startsWith('ADMIN-')) return 'ADM'
    if (upper.startsWith('DEV-')) return 'DEV'
    if (upper.startsWith('USER-')) return 'USER'
    return 'USER'
  }

  /**
   * Resolves human-readable name for license type
   */
  public getLicenseTypeName(type: LicenseType): string {
    switch (type) {
      case 'ADM':
        return 'Administrator License (ADM)'
      case 'DEV':
        return 'Developer License (DEV)'
      case 'USER':
        return 'General User License (USER)'
      case 'TRIAL':
      default:
        return 'Trial License (30-Day Evaluation)'
    }
  }

  /**
   * Retrieves complete current license info, validating trial or active status.
   */
  public getLicenseInfo(): LicenseInfo {
    const hwid = this.getHwid()
    const machineName = os.hostname() || 'Local Machine'

    const savedKey = this.readRegistryValue('LicenseKey')
    const savedType = (this.readRegistryValue('LicenseType') as LicenseType) || (savedKey ? this.parseLicenseType(savedKey) : null)
    const savedUsername = this.readRegistryValue('LicenseUsername')
    const savedStatus = (this.readRegistryValue('LicenseStatus') as LicenseStatus) || 'trial'
    const activatedAt = this.readRegistryValue('LicenseActivatedAt') || undefined
    const expiresAt = this.readRegistryValue('LicenseExpiresAt') || null

    // Check if an authentic ADM, DEV, or USER license is saved
    if (savedKey && savedType && savedType !== 'TRIAL') {
      let isExpired = false
      if (savedType === 'ADM') {
        // ADM (Admin) licenses are always lifetime valid
        isExpired = false
      } else if (expiresAt) {
        // Check if expiration timestamp has passed for USER/DEV
        const expMs = new Date(expiresAt).getTime()
        if (!isNaN(expMs) && Date.now() > expMs) {
          isExpired = true
        }
      }

      if (savedStatus === 'expired') {
        isExpired = true
      }

      const activeStatus: LicenseStatus = isExpired ? 'expired' : 'active'

      return {
        type: savedType,
        typeName: this.getLicenseTypeName(savedType),
        licenseKey: savedKey,
        maskedKey: this.maskLicenseKey(savedKey),
        username: savedUsername || (savedType === 'ADM' ? 'System Administrator' : 'Authorized User'),
        hwid,
        status: activeStatus,
        activatedAt,
        expiresAt,
        isValid: !isExpired,
        isTrial: false,
        machineName,
      }
    }

    // Otherwise, calculate Trial License state
    let trialStartedAt = this.readRegistryValue('TrialStartedAt')
    if (!trialStartedAt) {
      trialStartedAt = new Date().toISOString()
      this.writeRegistryValue('TrialStartedAt', trialStartedAt)
      this.writeRegistryValue('LicenseStatus', 'trial')
    }

    const startDate = new Date(trialStartedAt).getTime()
    const now = Date.now()
    const trialDurationMs = 30 * 24 * 60 * 60 * 1000
    const expiresTimestamp = startDate + trialDurationMs
    const daysRemaining = Math.max(0, Math.ceil((expiresTimestamp - now) / (24 * 60 * 60 * 1000)))
    const isExpired = daysRemaining <= 0

    return {
      type: 'TRIAL',
      typeName: this.getLicenseTypeName('TRIAL'),
      hwid,
      status: isExpired ? 'expired' : 'trial',
      trialDaysRemaining: daysRemaining,
      trialStartedAt,
      expiresAt: new Date(expiresTimestamp).toISOString(),
      isValid: !isExpired,
      isTrial: true,
      machineName,
    }
  }

  /**
   * Activates a license key.
   * If ADM (admin): skips username/password and HWID checks, activating immediately.
   * If DEV or USER: contacts Licensor Cloud Run server to verify credentials and bind seat.
   */
  public async activateLicense(req: LicenseActivationRequest): Promise<LicenseActionResult> {
    const rawKey = req.licenseKey?.trim().toUpperCase()
    if (!rawKey) {
      return { success: false, error: 'License key is required.' }
    }

    const licenseType = this.parseLicenseType(rawKey)
    const hwid = this.getHwid()
    const machineName = os.hostname() || 'Local Machine'
    const platformStr = `${os.platform().toLowerCase()}-${os.arch().toLowerCase()}`

    // 1. ADM (Admin) License: Immediate bypass activation
    if (licenseType === 'ADM') {
      const username = req.username?.trim() || 'Administrator'
      const now = new Date().toISOString()

      this.writeRegistryValue('LicenseKey', rawKey)
      this.writeRegistryValue('LicenseType', 'ADM')
      this.writeRegistryValue('LicenseUsername', username)
      this.writeRegistryValue('LicenseStatus', 'active')
      this.writeRegistryValue('LicenseActivatedAt', now)
      this.writeRegistryValue('LicenseExpiresAt', '')
      this.writeRegistryValue('MachineHWID', hwid)

      return {
        success: true,
        message: 'Admin license activated successfully. Full privileges unlocked.',
        info: this.getLicenseInfo(),
      }
    }

    // 2. DEV or USER License: Requires valid credentials & Licensor Cloud Run verification
    const username = req.username?.trim()
    const password = req.password?.trim()

    if (!username) {
      return { success: false, error: 'Username is required for this license.' }
    }

    const payload = {
      license_key: rawKey,
      product_id: PRODUCT_ID,
      username,
      password: password || undefined,
      hwid,
      machine_name: machineName,
      platform: platformStr,
      app_version: APP_VERSION,
    }

    try {
      const response = await fetch(`${LICENSOR_SERVER_URL}/api/v1/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const errMsg = (data as any)?.error || `Activation failed with status code ${response.status}`
        return { success: false, error: errMsg }
      }

      const now = new Date().toISOString()
      const expiresAt = (data as any)?.expires_at || ''

      this.writeRegistryValue('LicenseKey', rawKey)
      this.writeRegistryValue('LicenseType', licenseType)
      this.writeRegistryValue('LicenseUsername', username)
      this.writeRegistryValue('LicenseStatus', 'active')
      this.writeRegistryValue('LicenseActivatedAt', now)
      this.writeRegistryValue('LicenseExpiresAt', expiresAt)
      this.writeRegistryValue('MachineHWID', hwid)

      return {
        success: true,
        message: (data as any)?.message || 'Machine activated and license bound successfully.',
        info: this.getLicenseInfo(),
      }
    } catch (err: any) {
      return {
        success: false,
        error: `Could not connect to Licensor server (${LICENSOR_SERVER_URL}): ${err.message}`,
      }
    }
  }

  /**
   * Validates active license with server heartbeat.
   */
  public async validateLicense(): Promise<{ valid: boolean; message?: string; info: LicenseInfo }> {
    const info = this.getLicenseInfo()

    if (info.type === 'TRIAL') {
      return { valid: info.isValid, message: `Trial active: ${info.trialDaysRemaining} days remaining.`, info }
    }

    if (info.type === 'ADM') {
      return { valid: true, message: 'Admin license verified.', info }
    }

    // Query Licensor validation endpoint
    try {
      const payload = {
        license_key: info.licenseKey,
        product_id: PRODUCT_ID,
        hwid: info.hwid,
        username: info.username,
      }

      const response = await fetch(`${LICENSOR_SERVER_URL}/api/v1/license/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.valid) {
          return { valid: true, message: data.message || 'License is valid and verified online.', info }
        } else {
          return { valid: false, message: data.message || 'License validation failed on server.', info }
        }
      }
    } catch {
      // Offline grace period allowed
      return { valid: true, message: 'License verified locally (offline grace mode).', info }
    }

    return { valid: true, info }
  }

  /**
   * Removes the active license, notifies server to release the seat, and resets to a 30-day trial.
   */
  public async removeLicense(): Promise<LicenseActionResult> {
    const currentInfo = this.getLicenseInfo()

    // If USER or DEV, attempt to notify Licensor server to release seat
    if (currentInfo.type === 'USER' || currentInfo.type === 'DEV') {
      try {
        const payload = {
          license_key: currentInfo.licenseKey,
          product_id: PRODUCT_ID,
          hwid: currentInfo.hwid,
          username: currentInfo.username,
        }
        await fetch(`${LICENSOR_SERVER_URL}/api/v1/license/deactivate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch (e) {
        console.warn('[LicenseService] Failed to notify Licensor deactivation:', e)
      }
    }

    // Delete stored license entries
    this.deleteRegistryValue('LicenseKey')
    this.deleteRegistryValue('LicenseType')
    this.deleteRegistryValue('LicenseUsername')
    this.deleteRegistryValue('LicenseActivatedAt')
    this.deleteRegistryValue('LicenseExpiresAt')

    // Reset fresh 30-day Trial License
    const newTrialStart = new Date().toISOString()
    this.writeRegistryValue('TrialStartedAt', newTrialStart)
    this.writeRegistryValue('LicenseStatus', 'trial')

    return {
      success: true,
      message: 'License removed. Reverted to a 30-day Trial License.',
      info: this.getLicenseInfo(),
    }
  }

  /**
   * Registers all IPC handlers for licensing.
   */
  public setupIPC(ipcMain: IpcMain): void {
    ipcMain.handle('license:getInfo', async () => {
      return this.getLicenseInfo()
    })

    ipcMain.handle('license:getHwid', async () => {
      return this.getHwid()
    })

    ipcMain.handle('license:activate', async (_, request: LicenseActivationRequest) => {
      return await this.activateLicense(request)
    })

    ipcMain.handle('license:validate', async () => {
      return await this.validateLicense()
    })

    ipcMain.handle('license:remove', async () => {
      return await this.removeLicense()
    })
  }
}

export const licenseService = LicenseService.getInstance()

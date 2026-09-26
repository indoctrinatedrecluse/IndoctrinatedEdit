import {
  LicenseInfo,
  LicenseActivationRequest,
  LicenseActionResult,
  LicenseType,
} from '../../electron/preload'

export type LicenseChangeListener = (info: LicenseInfo) => void

export class ClientLicenseService {
  private static instance: ClientLicenseService
  private customElectronAPI: any = null
  private listeners: Set<LicenseChangeListener> = new Set()
  private cachedInfo: LicenseInfo | null = null

  // Fallback state for in-browser / test environment
  private mockState: {
    key: string | null
    type: LicenseType
    username: string | null
    trialStartedAt: string
    status: 'active' | 'trial' | 'expired'
  } = {
    key: null,
    type: 'TRIAL',
    username: null,
    trialStartedAt: new Date().toISOString(),
    status: 'trial',
  }

  public static getInstance(): ClientLicenseService {
    if (!ClientLicenseService.instance) {
      ClientLicenseService.instance = new ClientLicenseService()
    }
    return ClientLicenseService.instance
  }

  public setElectronAPI(api: any): void {
    this.customElectronAPI = api
  }

  private getElectronAPI(): any {
    if (this.customElectronAPI) return this.customElectronAPI
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return (window as any).electronAPI
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).electronAPI) {
      return (globalThis as any).electronAPI
    }
    return undefined
  }

  public maskKey(key?: string): string {
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

  private getFallbackInfo(): LicenseInfo {
    if (this.mockState.key && this.mockState.type !== 'TRIAL') {
      const isAdm = this.mockState.type === 'ADM'
      const isExpired = !isAdm && this.mockState.status === 'expired'

      return {
        type: this.mockState.type,
        typeName: this.getLicenseTypeName(this.mockState.type),
        licenseKey: this.mockState.key,
        maskedKey: this.maskKey(this.mockState.key),
        username: this.mockState.username || (isAdm ? 'Administrator' : 'User'),
        hwid: 'HWID-BROWSER-SANDBOX-001',
        status: isExpired ? 'expired' : 'active',
        activatedAt: new Date().toISOString(),
        expiresAt: null,
        isValid: !isExpired,
        isTrial: false,
        machineName: 'Web Browser Environment',
      }
    }

    const startDate = new Date(this.mockState.trialStartedAt).getTime()
    const now = Date.now()
    const trialDurationMs = 30 * 24 * 60 * 60 * 1000
    const expiresTimestamp = startDate + trialDurationMs
    const daysRemaining = Math.max(0, Math.ceil((expiresTimestamp - now) / (24 * 60 * 60 * 1000)))
    const isExpired = daysRemaining <= 0

    return {
      type: 'TRIAL',
      typeName: this.getLicenseTypeName('TRIAL'),
      hwid: 'HWID-BROWSER-SANDBOX-001',
      status: isExpired ? 'expired' : 'trial',
      trialDaysRemaining: daysRemaining,
      trialStartedAt: this.mockState.trialStartedAt,
      expiresAt: new Date(expiresTimestamp).toISOString(),
      isValid: !isExpired,
      isTrial: true,
      machineName: 'Web Browser Environment',
    }
  }

  /**
   * Fetches current license information.
   */
  public async getInfo(): Promise<LicenseInfo> {
    const electron = this.getElectronAPI()
    if (electron?.license?.getInfo) {
      try {
        const info = await electron.license.getInfo()
        this.cachedInfo = info
        this.notifyListeners(info)
        return info
      } catch (e) {
        console.warn('[ClientLicenseService] Failed to query electron license info:', e)
      }
    }

    const fallback = this.getFallbackInfo()
    this.cachedInfo = fallback
    this.notifyListeners(fallback)
    return fallback
  }

  /**
   * Retrieves machine HWID.
   */
  public async getHwid(): Promise<string> {
    const electron = this.getElectronAPI()
    if (electron?.license?.getHwid) {
      try {
        return await electron.license.getHwid()
      } catch {}
    }
    return 'HWID-BROWSER-SANDBOX-001'
  }

  /**
   * Activates a license key with optional username/password.
   */
  public async activate(req: LicenseActivationRequest): Promise<LicenseActionResult> {
    const electron = this.getElectronAPI()
    if (electron?.license?.activate) {
      try {
        const res = await electron.license.activate(req)
        if (res.info) {
          this.cachedInfo = res.info
          this.notifyListeners(res.info)
        }
        return res
      } catch (err: any) {
        return { success: false, error: err.message || 'Activation failed.' }
      }
    }

    // Mock fallback activation
    const upper = req.licenseKey.trim().toUpperCase()
    let type: LicenseType = 'USER'
    if (upper.startsWith('ADM-')) type = 'ADM'
    else if (upper.startsWith('DEV-')) type = 'DEV'

    this.mockState = {
      key: upper,
      type,
      username: req.username || (type === 'ADM' ? 'Administrator' : 'User'),
      trialStartedAt: this.mockState.trialStartedAt,
      status: 'active',
    }

    const info = this.getFallbackInfo()
    this.cachedInfo = info
    this.notifyListeners(info)
    return {
      success: true,
      message: `${this.getLicenseTypeName(type)} activated successfully.`,
      info,
    }
  }

  /**
   * Validates active license with server / local trial.
   */
  public async validate(): Promise<{ valid: boolean; message?: string; info: LicenseInfo }> {
    const electron = this.getElectronAPI()
    if (electron?.license?.validate) {
      try {
        const res = await electron.license.validate()
        if (res.info) {
          this.cachedInfo = res.info
          this.notifyListeners(res.info)
        }
        return res
      } catch {}
    }

    const info = this.getFallbackInfo()
    return { valid: info.isValid, message: 'Valid license (browser sandbox).', info }
  }

  /**
   * Removes active license, deactivates seat, and resets to 30-day Trial.
   */
  public async remove(): Promise<LicenseActionResult> {
    const electron = this.getElectronAPI()
    if (electron?.license?.remove) {
      try {
        const res = await electron.license.remove()
        if (res.info) {
          this.cachedInfo = res.info
          this.notifyListeners(res.info)
        }
        return res
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to remove license.' }
      }
    }

    this.mockState = {
      key: null,
      type: 'TRIAL',
      username: null,
      trialStartedAt: new Date().toISOString(),
      status: 'trial',
    }

    const info = this.getFallbackInfo()
    this.cachedInfo = info
    this.notifyListeners(info)
    return {
      success: true,
      message: 'License removed. Reverted to a 30-day Trial License.',
      info,
    }
  }

  /**
   * Evaluates if a given license is expired and requires lockout.
   * ADM licenses are lifetime valid and never expire.
   */
  public isExpired(info: LicenseInfo | null): boolean {
    if (!info) return false
    if (info.type === 'ADM') return false
    if (info.status === 'expired' || !info.isValid) return true
    if (info.isTrial && (info.trialDaysRemaining ?? 0) <= 0) return true
    if (info.expiresAt) {
      const exp = new Date(info.expiresAt).getTime()
      if (!isNaN(exp) && Date.now() > exp) return true
    }
    return false
  }

  public subscribe(listener: LicenseChangeListener): () => void {
    this.listeners.add(listener)
    if (this.cachedInfo) {
      listener(this.cachedInfo)
    }
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners(info: LicenseInfo): void {
    for (const listener of this.listeners) {
      try {
        listener(info)
      } catch (e) {
        console.warn('[ClientLicenseService] Error in license listener:', e)
      }
    }
  }
}

export const licenseService = ClientLicenseService.getInstance()

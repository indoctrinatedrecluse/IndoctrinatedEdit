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

/**
 * Atomic, versioned license record stored identically across all persistent anchors
 * (Windows Registry HKCU/HKLM + Home + Roaming AppData + LocalAppData + ProgramData)
 * so updates, reinstalls, or partial anchor wipes can never cause split-brain state loss.
 */
export interface PersistedLicenseRecord {
  schemaVersion: 2
  updatedAt: number
  licenseKey?: string
  licenseType?: LicenseType
  username?: string
  status: LicenseStatus
  activatedAt?: string
  expiresAt?: string | null
  trialStartedAt?: string
  hwid?: string
  explicitlyRemoved?: boolean
}

export interface LicenseServiceOptions {
  /** Override file anchor paths (used for isolated testing without touching host machine anchors) */
  fileAnchors?: string[]
  /** Disable Windows Registry reads/writes (used for isolated testing) */
  disableRegistry?: boolean
}

const LICENSOR_SERVER_URL = process.env.LICENSOR_SERVER_URL || 'https://licensor-h5zdysrkqa-uc.a.run.app'
const PRODUCT_ID = 'indoctrinated-edit'
const APP_VERSION = '6.1.1'
const REG_KEY_USER = 'HKCU\\Software\\Indoctrinated\\IndoctrinatedEdit'
const REG_KEY_MACHINE = 'HKLM\\Software\\Indoctrinated\\IndoctrinatedEdit'
const REG_PAYLOAD_VALUE = 'LicensePayload'

const LEGACY_REG_KEYS = [
  'LicenseKey',
  'LicenseType',
  'LicenseUsername',
  'LicenseStatus',
  'LicenseActivatedAt',
  'LicenseExpiresAt',
  'TrialStartedAt',
  'MachineHWID',
] as const

export class LicenseService {
  private static instance: LicenseService
  private fileAnchors: string[]
  private disableRegistry: boolean
  private cachedHwid: string | null = null
  private cachedRecord: PersistedLicenseRecord | null = null

  private constructor(options?: LicenseServiceOptions) {
    this.disableRegistry = Boolean(options?.disableRegistry)

    if (options?.fileAnchors && options.fileAnchors.length > 0) {
      this.fileAnchors = options.fileAnchors
    } else {
      this.fileAnchors = this.buildDefaultFileAnchors()
    }
  }

  private buildDefaultFileAnchors(): string[] {
    const anchors: string[] = []
    const home = os.homedir()

    // 1. User home directory (~/.indoctrinated/license.json) — untouched by all OS installers
    if (home) {
      anchors.push(path.join(home, '.indoctrinated', 'license.json'))
    }

    if (process.platform === 'win32') {
      // 2. Roaming AppData vendor folder (outside Electron's app-specific userData folder)
      const appData = process.env.APPDATA || (home ? path.join(home, 'AppData', 'Roaming') : '')
      if (appData) {
        anchors.push(path.join(appData, 'Indoctrinated', 'license.json'))
      }

      // 3. Local AppData vendor folder
      const localAppData = process.env.LOCALAPPDATA || (home ? path.join(home, 'AppData', 'Local') : '')
      if (localAppData) {
        anchors.push(path.join(localAppData, 'Indoctrinated', 'license.json'))
      }

      // 4. Machine-wide ProgramData vendor folder (survives per-user reinstalls & updates)
      const programData = process.env.ProgramData || process.env.ALLUSERSPROFILE || 'C:\\ProgramData'
      if (programData) {
        anchors.push(path.join(programData, 'Indoctrinated', 'license.json'))
      }
    } else if (process.platform === 'darwin') {
      if (home) {
        anchors.push(path.join(home, 'Library', 'Application Support', 'Indoctrinated', 'license.json'))
      }
    } else {
      const xdgConfig = process.env.XDG_CONFIG_HOME || (home ? path.join(home, '.config') : '')
      if (xdgConfig) {
        anchors.push(path.join(xdgConfig, 'Indoctrinated', 'license.json'))
      }
    }

    // Deduplicate normalized paths
    return Array.from(new Set(anchors.map((p) => path.resolve(p))))
  }

  public static getInstance(): LicenseService {
    if (!LicenseService.instance) {
      LicenseService.instance = new LicenseService()
    }
    return LicenseService.instance
  }

  /**
   * Creates an isolated LicenseService instance bound strictly to custom file anchors
   * with Registry access disabled (ideal for automated tests without touching host state).
   */
  public static createIsolated(options: LicenseServiceOptions): LicenseService {
    return new LicenseService({
      ...options,
      disableRegistry: options.disableRegistry ?? true,
    })
  }

  /**
   * Clears in-memory cached record so the next read re-inspects all persistent anchors.
   */
  public invalidateCache(): void {
    this.cachedRecord = null
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

  /* =========================================================================
   * Atomic Multi-Anchor Persistence Engine (v2 + Legacy v1 Auto-Migration)
   * ========================================================================= */

  private parseAnyRawRecord(rawObj: Record<string, any> | null | undefined, fallbackMtimeMs = 0): PersistedLicenseRecord | null {
    if (!rawObj || typeof rawObj !== 'object') return null

    // Schema v2 atomic record
    if (rawObj.schemaVersion === 2 && typeof rawObj.updatedAt === 'number') {
      const key = typeof rawObj.licenseKey === 'string' && rawObj.licenseKey.trim() ? rawObj.licenseKey.trim() : undefined
      const parsedType: LicenseType | undefined =
        rawObj.licenseType || (key ? this.parseLicenseType(key) : undefined)
      return {
        schemaVersion: 2,
        updatedAt: rawObj.updatedAt,
        licenseKey: key,
        licenseType: parsedType,
        username: typeof rawObj.username === 'string' ? rawObj.username : undefined,
        status: (rawObj.status as LicenseStatus) || (key ? 'active' : 'trial'),
        activatedAt: typeof rawObj.activatedAt === 'string' ? rawObj.activatedAt : undefined,
        expiresAt: typeof rawObj.expiresAt === 'string' && rawObj.expiresAt ? rawObj.expiresAt : null,
        trialStartedAt: typeof rawObj.trialStartedAt === 'string' ? rawObj.trialStartedAt : undefined,
        hwid: typeof rawObj.hwid === 'string' ? rawObj.hwid : undefined,
        explicitlyRemoved: Boolean(rawObj.explicitlyRemoved),
      }
    }

    // Legacy v1 flat keys migration (`LicenseKey`, `LicenseType`, `TrialStartedAt`, etc.)
    const legacyKey = typeof rawObj.LicenseKey === 'string' && rawObj.LicenseKey.trim()
      ? rawObj.LicenseKey.trim()
      : undefined
    const legacyTrial = typeof rawObj.TrialStartedAt === 'string' && rawObj.TrialStartedAt.trim()
      ? rawObj.TrialStartedAt.trim()
      : undefined
    const legacyStatus = typeof rawObj.LicenseStatus === 'string' ? (rawObj.LicenseStatus as LicenseStatus) : undefined

    if (!legacyKey && !legacyTrial && !legacyStatus) {
      return null
    }

    const activatedMs = rawObj.LicenseActivatedAt ? new Date(rawObj.LicenseActivatedAt).getTime() : 0
    const trialMs = legacyTrial ? new Date(legacyTrial).getTime() : 0
    const inferredUpdatedAt =
      (!isNaN(activatedMs) && activatedMs > 0 ? activatedMs : 0) ||
      (!isNaN(trialMs) && trialMs > 0 ? trialMs : 0) ||
      fallbackMtimeMs ||
      1

    return {
      schemaVersion: 2,
      updatedAt: inferredUpdatedAt,
      licenseKey: legacyKey,
      licenseType:
        (rawObj.LicenseType as LicenseType) ||
        (legacyKey ? this.parseLicenseType(legacyKey) : 'TRIAL'),
      username: typeof rawObj.LicenseUsername === 'string' ? rawObj.LicenseUsername : undefined,
      status: legacyStatus || (legacyKey ? 'active' : 'trial'),
      activatedAt: typeof rawObj.LicenseActivatedAt === 'string' ? rawObj.LicenseActivatedAt : undefined,
      expiresAt: typeof rawObj.LicenseExpiresAt === 'string' && rawObj.LicenseExpiresAt ? rawObj.LicenseExpiresAt : null,
      trialStartedAt: legacyTrial,
      hwid: typeof rawObj.MachineHWID === 'string' ? rawObj.MachineHWID : undefined,
      explicitlyRemoved: false,
    }
  }

  private readFileAnchor(filePath: string): PersistedLicenseRecord | null {
    try {
      if (!fs.existsSync(filePath)) return null
      const stat = fs.statSync(filePath)
      const raw = fs.readFileSync(filePath, 'utf8')
      if (!raw.trim()) return null
      const parsed = JSON.parse(raw)
      return this.parseAnyRawRecord(parsed, stat.mtimeMs)
    } catch {
      return null
    }
  }

  private writeFileAnchorAtomic(filePath: string, record: PersistedLicenseRecord): boolean {
    try {
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      // Write schema v2 + mirror legacy keys so older/external readers stay compatible
      const payload = {
        ...record,
        ...(record.licenseKey ? { LicenseKey: record.licenseKey } : {}),
        ...(record.licenseType ? { LicenseType: record.licenseType } : {}),
        ...(record.username ? { LicenseUsername: record.username } : {}),
        LicenseStatus: record.status,
        ...(record.activatedAt ? { LicenseActivatedAt: record.activatedAt } : {}),
        ...(record.expiresAt ? { LicenseExpiresAt: record.expiresAt } : {}),
        ...(record.trialStartedAt ? { TrialStartedAt: record.trialStartedAt } : {}),
        ...(record.hwid ? { MachineHWID: record.hwid } : {}),
      }
      const jsonText = JSON.stringify(payload, null, 2)
      const tmpPath = `${filePath}.tmp.${process.pid}`
      try {
        fs.writeFileSync(tmpPath, jsonText, 'utf8')
        fs.renameSync(tmpPath, filePath)
      } catch {
        // Fallback direct write if rename hits Windows AV/lock contention
        try {
          if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
        } catch {}
        fs.writeFileSync(filePath, jsonText, 'utf8')
      }
      return true
    } catch {
      return false
    }
  }

  private readWindowsRegistryHive(regKey: string): PersistedLicenseRecord | null {
    if (this.disableRegistry || process.platform !== 'win32') return null
    try {
      // Single `reg query` call reads ALL values in the key at once (10x faster than per-field queries)
      const res = spawnSync('reg', ['query', regKey], {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 3000,
      })
      if (res.status !== 0 || !res.stdout) return null

      const kv: Record<string, string> = {}
      for (const line of res.stdout.split(/\r?\n/)) {
        const match = line.match(/^\s+([^\s]+)\s+REG_\w+\s+(.*)$/)
        if (match) {
          kv[match[1].trim()] = match[2].trim()
        }
      }

      // Prefer atomic Base64 v2 payload when present
      if (kv[REG_PAYLOAD_VALUE]) {
        try {
          const decoded = Buffer.from(kv[REG_PAYLOAD_VALUE], 'base64').toString('utf8')
          const parsed = JSON.parse(decoded)
          const rec = this.parseAnyRawRecord(parsed)
          if (rec) return rec
        } catch {
          // Fall through to legacy flat keys if corrupted
        }
      }

      // Migrate legacy flat Registry values from pre-5.3.1 installs
      const legacyObj: Record<string, string> = {}
      let hasLegacy = false
      for (const k of LEGACY_REG_KEYS) {
        if (kv[k]) {
          legacyObj[k] = kv[k]
          hasLegacy = true
        }
      }
      return hasLegacy ? this.parseAnyRawRecord(legacyObj) : null
    } catch {
      return null
    }
  }

  private writeWindowsRegistryRecord(record: PersistedLicenseRecord): void {
    if (this.disableRegistry || process.platform !== 'win32') return
    const encoded = Buffer.from(JSON.stringify(record), 'utf8').toString('base64')

    // Write single atomic Base64 REG_SZ payload to HKCU (always writable for current user)
    // and best-effort to HKLM (succeeds when elevated; ignored cleanly otherwise).
    for (const regKey of [REG_KEY_USER, REG_KEY_MACHINE]) {
      try {
        spawnSync('reg', ['add', regKey, '/v', REG_PAYLOAD_VALUE, '/t', 'REG_SZ', '/d', encoded, '/f'], {
          windowsHide: true,
          timeout: 3000,
        })
      } catch {}
    }
  }

  /**
   * Resolves the single authoritative license record across all anchors, preventing split-brain
   * state and ensuring a fresh-install trial stub never clobbers an active paid license.
   */
  private resolveAuthoritativeRecord(candidates: PersistedLicenseRecord[]): PersistedLicenseRecord | null {
    if (candidates.length === 0) return null
    if (candidates.length === 1) return candidates[0]

    const isPaid = (r: PersistedLicenseRecord) =>
      Boolean(r.licenseKey && r.licenseType && r.licenseType !== 'TRIAL')

    const paidRecords = candidates.filter(isPaid).sort((a, b) => b.updatedAt - a.updatedAt)
    const explicitRemovals = candidates
      .filter((r) => !isPaid(r) && r.explicitlyRemoved)
      .sort((a, b) => b.updatedAt - a.updatedAt)

    const newestPaid = paidRecords[0]
    const newestRemoval = explicitRemovals[0]

    // If an explicit user removal happened AFTER the newest paid activation, honor the removal
    if (newestRemoval && (!newestPaid || newestRemoval.updatedAt > newestPaid.updatedAt)) {
      return newestRemoval
    }

    // Active paid license always beats an accidental fresh-install trial stub
    if (newestPaid) {
      return newestPaid
    }

    // All candidates are trials: preserve the earliest valid trial start date so reinstalls stay consistent
    const trialsWithStart = candidates
      .filter((r) => r.trialStartedAt && !isNaN(new Date(r.trialStartedAt).getTime()))
      .sort((a, b) => new Date(a.trialStartedAt!).getTime() - new Date(b.trialStartedAt!).getTime())

    if (trialsWithStart.length > 0) {
      const earliest = trialsWithStart[0]
      const newest = [...candidates].sort((a, b) => b.updatedAt - a.updatedAt)[0]
      return {
        ...newest,
        trialStartedAt: earliest.trialStartedAt,
      }
    }

    return [...candidates].sort((a, b) => b.updatedAt - a.updatedAt)[0]
  }

  /**
   * Loads the authoritative record from all anchors and self-heals any missing or stale anchors.
   */
  private loadAuthoritativeRecord(): PersistedLicenseRecord | null {
    if (this.cachedRecord) {
      return this.cachedRecord
    }

    const candidates: Array<{ source: string; record: PersistedLicenseRecord }> = []
    let missingAnchorCount = 0

    // 1. Windows Registry hives
    if (!this.disableRegistry && process.platform === 'win32') {
      const hkcu = this.readWindowsRegistryHive(REG_KEY_USER)
      if (hkcu) candidates.push({ source: 'hkcu', record: hkcu })
      else missingAnchorCount++

      const hklm = this.readWindowsRegistryHive(REG_KEY_MACHINE)
      if (hklm) candidates.push({ source: 'hklm', record: hklm })
    }

    // 2. Persistent cross-platform file anchors
    for (const anchorPath of this.fileAnchors) {
      const rec = this.readFileAnchor(anchorPath)
      if (rec) {
        candidates.push({ source: anchorPath, record: rec })
      } else {
        missingAnchorCount++
      }
    }

    const authoritative = this.resolveAuthoritativeRecord(candidates.map((c) => c.record))
    if (!authoritative) {
      return null
    }

    // Self-heal: if any writable anchor was missing or out-of-date (e.g. after reinstall/update),
    // replicate the authoritative record back across all anchors in one pass.
    const needsHeal =
      missingAnchorCount > 0 ||
      candidates.some(
        (c) =>
          c.record.updatedAt !== authoritative.updatedAt ||
          c.record.licenseKey !== authoritative.licenseKey
      )

    if (needsHeal) {
      this.persistRecord(authoritative)
    } else {
      this.cachedRecord = authoritative
    }

    return authoritative
  }

  private persistRecord(record: PersistedLicenseRecord): void {
    this.cachedRecord = record
    this.writeWindowsRegistryRecord(record)
    for (const anchorPath of this.fileAnchors) {
      this.writeFileAnchorAtomic(anchorPath, record)
    }
  }

  /* =========================================================================
   * Public License Lifecycle API
   * ========================================================================= */

  /**
   * Retrieves complete current license info, validating trial or active status.
   */
  public getLicenseInfo(): LicenseInfo {
    const hwid = this.getHwid()
    const machineName = os.hostname() || 'Local Machine'

    let record = this.loadAuthoritativeRecord()

    // Active paid license (ADM / DEV / USER)
    if (record && record.licenseKey && record.licenseType && record.licenseType !== 'TRIAL') {
      const savedType = record.licenseType
      const expiresAt = record.expiresAt || null
      let isExpired = false

      if (savedType === 'ADM') {
        // ADM (Admin) licenses are always lifetime valid
        isExpired = false
      } else if (expiresAt) {
        const expMs = new Date(expiresAt).getTime()
        if (!isNaN(expMs) && Date.now() > expMs) {
          isExpired = true
        }
      }

      if (record.status === 'expired' || record.status === 'revoked') {
        isExpired = true
      }

      const activeStatus: LicenseStatus = isExpired
        ? record.status === 'revoked'
          ? 'revoked'
          : 'expired'
        : 'active'

      return {
        type: savedType,
        typeName: this.getLicenseTypeName(savedType),
        licenseKey: record.licenseKey,
        maskedKey: this.maskLicenseKey(record.licenseKey),
        username: record.username || (savedType === 'ADM' ? 'System Administrator' : 'Authorized User'),
        hwid,
        status: activeStatus,
        activatedAt: record.activatedAt,
        expiresAt,
        isValid: !isExpired,
        isTrial: false,
        machineName,
      }
    }

    // Otherwise, initialize or evaluate 30-day Trial License state
    if (!record || !record.trialStartedAt) {
      const trialStartedAt = new Date().toISOString()
      record = {
        schemaVersion: 2,
        updatedAt: Date.now(),
        licenseType: 'TRIAL',
        status: 'trial',
        trialStartedAt,
        hwid,
        explicitlyRemoved: false,
      }
      this.persistRecord(record)
    }

    const startDate = new Date(record.trialStartedAt!).getTime()
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
      trialStartedAt: record.trialStartedAt,
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
    const existingRecord = this.loadAuthoritativeRecord()

    // 1. ADM (Admin) License: Immediate bypass activation
    if (licenseType === 'ADM') {
      const username = req.username?.trim() || 'Administrator'
      const now = new Date().toISOString()

      this.persistRecord({
        schemaVersion: 2,
        updatedAt: Date.now(),
        licenseKey: rawKey,
        licenseType: 'ADM',
        username,
        status: 'active',
        activatedAt: now,
        expiresAt: null,
        trialStartedAt: existingRecord?.trialStartedAt,
        hwid,
        explicitlyRemoved: false,
      })

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
      const expiresAt = (data as any)?.expires_at || null

      this.persistRecord({
        schemaVersion: 2,
        updatedAt: Date.now(),
        licenseKey: rawKey,
        licenseType,
        username,
        status: 'active',
        activatedAt: now,
        expiresAt,
        trialStartedAt: existingRecord?.trialStartedAt,
        hwid,
        explicitlyRemoved: false,
      })

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

      if (response.status === 401 || response.status === 403) {
        let serverMsg = 'License has been revoked or rejected by server.'
        try {
          const errData = await response.json()
          if (errData?.message) serverMsg = errData.message
        } catch {}
        return {
          valid: false,
          message: serverMsg,
          info: { ...info, status: 'revoked', isValid: false },
        }
      }

      return { valid: true, message: `Server returned HTTP ${response.status}; using local grace cache.`, info }
    } catch {
      return { valid: true, message: 'License verified locally (offline grace mode).', info }
    }
  }

  /**
   * Removes the active license, notifies server to release the seat, and resets to a 30-day trial.
   */
  public async removeLicense(): Promise<LicenseActionResult> {
    const currentInfo = this.getLicenseInfo()

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

    // Stamp `explicitlyRemoved: true` with a newer `updatedAt` so even a read-only
    // system anchor (e.g. elevated HKLM / ProgramData) cannot resurrect the removed key.
    const newTrialStart = new Date().toISOString()
    this.persistRecord({
      schemaVersion: 2,
      updatedAt: Date.now() + 1,
      licenseType: 'TRIAL',
      status: 'trial',
      trialStartedAt: newTrialStart,
      hwid: this.getHwid(),
      explicitlyRemoved: true,
    })

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

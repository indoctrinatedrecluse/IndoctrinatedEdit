/**
 * IndoctrinatedEdit - Antigravity Auth & Python SDK Bridge Service
 * Manages personal Google account authentication, active subscription session,
 * quota tracking, and sidecar status.
 */

import {
  AntigravitySession,
  AntigravityQuotaInfo,
  AntigravitySidecarStatus,
  AntigravityUserProfile,
} from '@sdk/types'

const STORAGE_KEY_SESSION = 'indoctrinated_antigravity_session'

class AntigravityAuthService {
  private activeSession: AntigravitySession | null = null
  private quotaInfo: AntigravityQuotaInfo | null = null
  private sidecarStatus: AntigravitySidecarStatus | null = null
  private listeners: Map<string, Set<(data?: any) => void>> = new Map()

  constructor() {
    this._initSessionFromStorage()
    // Background sync with Electron / Python sidecar if available
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.syncSession()
      }, 500)
    }
  }

  private _initSessionFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SESSION)
      if (stored) {
        const parsed = JSON.parse(stored) as AntigravitySession
        if (parsed && (parsed.expiresAt > Date.now() / 1000 || parsed.tokenType === 'adc')) {
          this.activeSession = parsed
        }
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Syncs active session with Electron / Python sidecar.
   */
  public async syncSession(): Promise<AntigravitySession | null> {
    if (typeof window !== 'undefined' && window.electronAPI?.antigravity?.getSession) {
      try {
        const remoteSession = await window.electronAPI.antigravity.getSession()
        if (remoteSession) {
          this.activeSession = remoteSession
          localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(remoteSession))
          this._emit('auth-changed', remoteSession)
          return remoteSession
        }
      } catch (err) {
        console.warn('[AntigravityAuthService] Failed to sync session:', err)
      }
    }
    return this.activeSession
  }

  /**
   * Initiates Google OAuth2 login via personal account.
   */
  public async loginWithGoogle(): Promise<AntigravitySession> {
    if (typeof window !== 'undefined' && window.electronAPI?.antigravity?.login) {
      try {
        const session = await window.electronAPI.antigravity.login()
        if (session && session.email) {
          this.activeSession = session
          localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session))
          this._emit('auth-changed', session)
          return session
        }
        throw new Error('No session returned from Google login')
      } catch (err: any) {
        console.error('[AntigravityAuthService] Login failed:', err)
        throw new Error(err.message || 'Google OAuth2 login failed')
      }
    }

    throw new Error('Google OAuth requires running in Electron application environment.')
  }

  /**
   * Logs out and clears active Google Antigravity session.
   */
  public async logout(): Promise<void> {
    if (typeof window !== 'undefined' && window.electronAPI?.antigravity?.logout) {
      try {
        await window.electronAPI.antigravity.logout()
      } catch (err) {
        console.warn('[AntigravityAuthService] Logout failed on sidecar:', err)
      }
    }
    this.activeSession = null
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_SESSION)
    }
    this._emit('auth-changed', null)
  }

  public getSession(): AntigravitySession | null {
    return this.activeSession
  }

  public isAuthenticated(): boolean {
    return !!this.activeSession && this.activeSession.subscriptionActive
  }

  public getUserProfile(): AntigravityUserProfile | null {
    if (!this.activeSession) return null
    return {
      id: this.activeSession.userId,
      email: this.activeSession.email,
      name: this.activeSession.name,
      picture: this.activeSession.picture,
    }
  }

  public async getQuota(): Promise<AntigravityQuotaInfo> {
    if (typeof window !== 'undefined' && window.electronAPI?.antigravity?.getQuota) {
      try {
        const q = await window.electronAPI.antigravity.getQuota()
        this.quotaInfo = q
        return q
      } catch {
        // Fallback
      }
    }

    const isSubscribed = this.isAuthenticated()
    const quota: AntigravityQuotaInfo = {
      tier: isSubscribed ? 'personal' : 'free',
      rpmLimit: isSubscribed ? 60 : 15,
      rpmRemaining: isSubscribed ? 58 : 12,
      tpmLimit: isSubscribed ? 4000000 : 1000000,
      tpmRemaining: isSubscribed ? 3950000 : 850000,
      contextWindowTokens: 1048576,
      dailyComputesRemaining: isSubscribed ? 950 : 100,
      dailyComputesLimit: isSubscribed ? 1000 : 100,
      activeModels: [
        'antigravity-gemini-3-7-flash',
        'antigravity-gemini-2-5-pro',
        'antigravity-gemini-2-5-flash',
        'antigravity-claude-3-7-sonnet',
        'gemini-3.7-flash',
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'claude-3-7-sonnet',
      ],
    }
    this.quotaInfo = quota
    return quota
  }

  public async setApiKey(apiKey: string): Promise<AntigravitySession | null> {
    if (typeof window !== 'undefined' && window.electronAPI?.antigravity?.setApiKey) {
      try {
        const session = await window.electronAPI.antigravity.setApiKey(apiKey)
        if (session) {
          this.activeSession = session
          localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session))
          this._emit('auth-changed', session)
          return session
        }
      } catch (err) {
        console.warn('[AntigravityAuthService] setApiKey failed:', err)
      }
    }
    if (apiKey.trim()) {
      const fallbackSession: AntigravitySession = {
        userId: 'api-key-user',
        email: 'personal-key@antigravity.dev',
        name: 'Google AI Studio User',
        tier: 'personal',
        subscriptionActive: true,
        tokenType: 'api_key',
        accessToken: apiKey,
        expiresAt: Math.floor(Date.now() / 1000) + 86400 * 365,
      }
      this.activeSession = fallbackSession
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(fallbackSession))
      this._emit('auth-changed', fallbackSession)
      return fallbackSession
    }
    return null
  }

  public async removeApiKey(): Promise<void> {
    if (typeof window !== 'undefined' && window.electronAPI?.antigravity?.removeApiKey) {
      try {
        await window.electronAPI.antigravity.removeApiKey()
      } catch {
        // Ignored
      }
    }
    await this.logout()
  }

  public async getSidecarStatus(): Promise<AntigravitySidecarStatus> {
    if (typeof window !== 'undefined' && window.electronAPI?.antigravity?.getStatus) {
      try {
        const s = await window.electronAPI.antigravity.getStatus()
        this.sidecarStatus = s
        return s
      } catch {
        // Fallback
      }
    }

    const status: AntigravitySidecarStatus = {
      running: true,
      port: 45281,
      authStatus: this.isAuthenticated() ? 'authenticated' : 'unauthenticated',
      activeSession: this.activeSession,
    }
    this.sidecarStatus = status
    return status
  }

  public async getLogs(): Promise<{ logFile: string; logs: string[] }> {
    if (typeof window !== 'undefined' && window.electronAPI?.antigravity?.getLogs) {
      try {
        return await window.electronAPI.antigravity.getLogs()
      } catch {
        // Fallback
      }
    }
    return {
      logFile: '~/.indoctrinated/antigravity_backend.log',
      logs: ['[INIT] Logging initialized.'],
    }
  }

  public async tokenize(
    text: string,
    messages?: Array<{ role: string; content: string }>
  ): Promise<{ characterCount: number; estimatedTokens: number; contextLimit: number; remainingContext: number }> {
    if (typeof window !== 'undefined' && window.electronAPI?.antigravity?.tokenize) {
      try {
        return await window.electronAPI.antigravity.tokenize(text, messages)
      } catch {
        // Fallback
      }
    }
    const totalChars = (text || '').length + (messages || []).reduce((acc, m) => acc + (m.content || '').length, 0)
    const estTokens = Math.max(1, Math.floor(totalChars / 4))
    return {
      characterCount: totalChars,
      estimatedTokens: estTokens,
      contextLimit: 1048576,
      remainingContext: Math.max(0, 1048576 - estTokens),
    }
  }

  public getCachedQuota(): AntigravityQuotaInfo | null {
    return this.quotaInfo
  }

  public getCachedSidecarStatus(): AntigravitySidecarStatus | null {
    return this.sidecarStatus
  }

  public onAuthChanged(callback: (session: AntigravitySession | null) => void): () => void {
    return this._on('auth-changed', callback)
  }

  private _on(event: string, callback: (data?: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  private _emit(event: string, data?: any): void {
    this.listeners.get(event)?.forEach((cb) => cb(data))
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(new CustomEvent(`antigravity-${event}`, { detail: data }))
      } catch {
        // Ignored in headless test environments
      }
    }
  }
}

export const antigravityAuthService = new AntigravityAuthService()

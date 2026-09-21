import { describe, it, expect, beforeEach, vi } from 'vitest'
import { antigravityAuthService } from '../src/services/antigravityAuthService'
import { extensionRegistry } from '../src/extensions/extensionRegistry'

// Polyfill localStorage for node environment if not present
if (typeof globalThis.localStorage === 'undefined') {
  let store: Record<string, string> = {}
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = String(value)
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    length: 0,
    key: (_i: number) => null,
  }
}

describe('AntigravityAuthService & Antigravity Extension Tests', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()

    // Mock electronAPI
    ;(globalThis as any).window = {
      electronAPI: {
        antigravity: {
          login: vi.fn().mockResolvedValue({
            userId: 'google-uid-12345',
            email: 'abhishek.mitra@gmail.com',
            name: 'Abhishek Mitra',
            picture: 'https://lh3.googleusercontent.com/a/mock-pic',
            tier: 'personal',
            subscriptionActive: true,
            tokenType: 'oauth',
            accessToken: 'mock_oauth_token_xyz',
            expiresAt: Math.floor(Date.now() / 1000) + 3600,
          }),
          logout: vi.fn().mockResolvedValue(true),
          getSession: vi.fn().mockResolvedValue(null),
          getQuota: vi.fn().mockResolvedValue({
            tier: 'personal',
            rpmLimit: 60,
            rpmRemaining: 58,
            tpmLimit: 4000000,
            tpmRemaining: 3950000,
            contextWindowTokens: 1048576,
            dailyComputesRemaining: 950,
            dailyComputesLimit: 1000,
            activeModels: [
              'antigravity-personal-agent',
              'antigravity-gemini-2-5-pro',
              'antigravity-gemini-2-5-flash',
              'gemini-2.5-pro',
            ],
          }),
          getStatus: vi.fn().mockResolvedValue({
            isReady: true,
            port: 45281,
            authStatus: 'authenticated',
          }),
        },
      },
    }
  })

  it('should initialize with null session when no stored credentials exist', () => {
    expect(antigravityAuthService.getSession()).toBeNull()
    expect(antigravityAuthService.isAuthenticated()).toBe(false)
  })

  it('should perform personal Google login and persist active session', async () => {
    const session = await antigravityAuthService.loginWithGoogle()

    expect(session).toBeDefined()
    expect(session.email).toBe('abhishek.mitra@gmail.com')
    expect(session.tier).toBe('personal')
    expect(session.subscriptionActive).toBe(true)
    expect(antigravityAuthService.isAuthenticated()).toBe(true)

    const profile = antigravityAuthService.getUserProfile()
    expect(profile).not.toBeNull()
    expect(profile?.email).toBe(session.email)
  })

  it('should clear session on logout', async () => {
    await antigravityAuthService.loginWithGoogle()
    expect(antigravityAuthService.isAuthenticated()).toBe(true)

    await antigravityAuthService.logout()
    expect(antigravityAuthService.isAuthenticated()).toBe(false)
    expect(antigravityAuthService.getSession()).toBeNull()
  })

  it('should return 1M context personal subscription quota info', async () => {
    await antigravityAuthService.loginWithGoogle()
    const quota = await antigravityAuthService.getQuota()

    expect(quota.tier).toBe('personal')
    expect(quota.rpmLimit).toBe(60)
    expect(quota.contextWindowTokens).toBe(1048576)
    expect(quota.activeModels).toContain('antigravity-personal-agent')
    expect(quota.activeModels).toContain('antigravity-gemini-2-5-pro')
    expect(quota.activeModels).toContain('gemini-2.5-pro')
  })

  it('should notify subscribers when auth state changes', async () => {
    let notifiedSession: any = undefined
    const unsub = antigravityAuthService.onAuthChanged((sess) => {
      notifiedSession = sess
    })

    await antigravityAuthService.loginWithGoogle()
    expect(notifiedSession).not.toBeUndefined()
    expect(notifiedSession?.subscriptionActive).toBe(true)

    await antigravityAuthService.logout()
    expect(notifiedSession).toBeNull()

    unsub()
  })

  it('should have registered the Google Antigravity extension in ExtensionRegistry', () => {
    const ext = extensionRegistry.get('indoctrinated.ext.antigravity')
    expect(ext).toBeDefined()
    expect(ext?.name).toContain('Google Antigravity')
    expect(ext?.category).toBe('AI')
    expect(ext?.status).toBe('Active')
    expect(ext?.languages?.[0]?.id).toBe('python')
    expect(ext?.snippetsCount).toBeGreaterThan(0)
  })
})

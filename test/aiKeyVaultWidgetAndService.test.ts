import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  aiVaultService,
  AI_PROVIDERS_META,
  AiSettingsMap,
} from '../src/services/aiVaultService'

// Polyfill in-memory localStorage for Node test runner
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {}
  globalThis.localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => {
      store[k] = v
    },
    removeItem: (k: string) => {
      delete store[k]
    },
    clear: () => {
      for (const k in store) delete store[k]
    },
    length: 0,
    key: () => null,
  }
}

describe('Unified AI Key & Endpoint Vault Subsystem', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset internal state
    aiVaultService.saveSettings({
      deepseek: { apiKey: '', endpoint: 'https://api.deepseek.com' },
      gemini: { apiKey: '', endpoint: 'https://generativelanguage.googleapis.com' },
      claude: { apiKey: '', endpoint: 'https://api.anthropic.com' },
      openai: { apiKey: '', endpoint: 'https://api.openai.com/v1' },
      openrouter: { apiKey: '', endpoint: 'https://openrouter.ai/api/v1' },
      custom: { apiKey: '', endpoint: 'http://localhost:1234/v1' },
      ollama: { apiKey: '', endpoint: 'http://localhost:11434' },
      antigravity: { apiKey: '', endpoint: '' },
    })
  })

  describe('Key Storage & V2 Obfuscated Envelope', () => {
    it('initializes with default provider settings', () => {
      const s = aiVaultService.getSettings()
      expect(s.gemini.endpoint).toBe('https://generativelanguage.googleapis.com')
      expect(s.deepseek.endpoint).toBe('https://api.deepseek.com')
      expect(s.ollama.endpoint).toBe('http://localhost:11434')
      expect(s.openai.apiKey).toBe('')
    })

    it('saves keys into both V2 obfuscated envelope and legacy key', () => {
      aiVaultService.setProviderKey('openai', 'sk-proj-abc1234567890defghijklmnop')
      const s = aiVaultService.getSettings()
      expect(s.openai.apiKey).toBe('sk-proj-abc1234567890defghijklmnop')

      const rawV2 = localStorage.getItem('indoctrinated_ai_vault_v2')
      expect(rawV2).toBeTruthy()
      const envelope = JSON.parse(rawV2!)
      expect(envelope.version).toBe(2)
      expect(envelope.obfuscated).toBe(true)
      expect(typeof envelope.data).toBe('string')

      const legacyRaw = localStorage.getItem('indoctrinated_ai_settings')
      expect(legacyRaw).toBeTruthy()
      const legacy = JSON.parse(legacyRaw!)
      expect(legacy.openai.apiKey).toBe('sk-proj-abc1234567890defghijklmnop')
    })

    it('can reset endpoint back to default provider URL', () => {
      aiVaultService.setProviderEndpoint('gemini', 'https://proxy.example.com')
      expect(aiVaultService.getProviderSetting('gemini').endpoint).toBe('https://proxy.example.com')

      aiVaultService.resetProviderToDefault('gemini')
      expect(aiVaultService.getProviderSetting('gemini').endpoint).toBe('https://generativelanguage.googleapis.com')
    })

    it('can clear an API key cleanly', () => {
      aiVaultService.setProviderKey('claude', 'sk-ant-test1234567890123456')
      expect(aiVaultService.getProviderSetting('claude').apiKey).toBe('sk-ant-test1234567890123456')

      aiVaultService.clearProviderKey('claude')
      expect(aiVaultService.getProviderSetting('claude').apiKey).toBe('')
    })
  })

  describe('Key Masking, Shannon Entropy & Format Validation', () => {
    it('masks keys preserving specific provider prefixes and 4-character suffixes', () => {
      expect(aiVaultService.maskKey('')).toBe('')
      expect(aiVaultService.maskKey('short')).toBe('••••••••')

      const maskedOpenAi = aiVaultService.maskKey('sk-proj-1234567890abcdef1234')
      expect(maskedOpenAi.startsWith('sk-proj-••••••••')).toBe(true)
      expect(maskedOpenAi.endsWith('1234')).toBe(true)

      const maskedClaude = aiVaultService.maskKey('sk-ant-api03-abcdefghijklmnop-9999')
      expect(maskedClaude.startsWith('sk-ant-••••••••')).toBe(true)
      expect(maskedClaude.endsWith('9999')).toBe(true)

      const maskedGemini = aiVaultService.maskKey('AIzaSyAbcd1234567890efgh-8888')
      expect(maskedGemini.startsWith('AIza••••••••')).toBe(true)
      expect(maskedGemini.endsWith('8888')).toBe(true)
    })

    it('calculates Shannon entropy correctly', () => {
      expect(aiVaultService.calculateEntropy('')).toBe(0)
      const repetitive = aiVaultService.calculateEntropy('aaaaaaaaaaaaaaaaaaaa')
      expect(repetitive).toBe(0)

      const hexRandom = aiVaultService.calculateEntropy('4a8b1c9d2e7f3056a1b2c3d4e5f60718')
      expect(hexRandom).toBeGreaterThan(3.5)

      const base64Random = aiVaultService.calculateEntropy('AIzaSyD0123456789abcdefghijklmnopqrstuvw')
      expect(base64Random).toBeGreaterThan(4.0)
    })

    it('validates Gemini API key format patterns', () => {
      const empty = aiVaultService.validateKeyFormat('gemini', '')
      expect(empty.isSet).toBe(false)
      expect(empty.isValidFormat).toBe(false)

      const validGemini = 'AIzaSy' + 'A'.repeat(33) // 39 characters starting with AIza
      const validRes = aiVaultService.validateKeyFormat('gemini', validGemini)
      expect(validRes.isSet).toBe(true)
      expect(validRes.isValidFormat).toBe(true)
      expect(validRes.formatHint).toContain('Valid Google Gemini format')

      const invalidPrefix = 'sk-proj-123456789012345678901234567890'
      const prefixRes = aiVaultService.validateKeyFormat('gemini', invalidPrefix)
      expect(prefixRes.isValidFormat).toBe(false)
      expect(prefixRes.formatHint).toContain('Expected prefix "AIza"')
    })

    it('validates OpenAI, Claude and DeepSeek key formats', () => {
      const openAiValid = aiVaultService.validateKeyFormat('openai', 'sk-proj-1234567890123456789012')
      expect(openAiValid.isValidFormat).toBe(true)

      const claudeValid = aiVaultService.validateKeyFormat('claude', 'sk-ant-api03-12345678901234567890')
      expect(claudeValid.isValidFormat).toBe(true)

      const claudeInvalid = aiVaultService.validateKeyFormat('claude', 'wrong-key-format')
      expect(claudeInvalid.isValidFormat).toBe(false)
      expect(claudeInvalid.formatHint).toContain('Expected prefix "sk-ant-"')

      const deepseekValid = aiVaultService.validateKeyFormat('deepseek', 'sk-1234567890123456789012')
      expect(deepseekValid.isValidFormat).toBe(true)
    })
  })

  describe('MCP Runtime Environment Synchronization', () => {
    it('extracts set credentials into MCP standard environment variables', () => {
      aiVaultService.setProviderKey('gemini', 'AIzaSyMockKeyForGeminiApi12345678901')
      aiVaultService.setProviderKey('openai', 'sk-proj-mockopenaikey123456789')
      aiVaultService.setProviderEndpoint('openai', 'https://custom-openai.proxy/v1')
      aiVaultService.setProviderKey('claude', 'sk-ant-mockclaudekey123456789')
      aiVaultService.setProviderKey('deepseek', 'sk-mockdeepseekkey123456789')
      aiVaultService.setProviderKey('openrouter', 'sk-or-v1-mockopenrouterkey12')
      aiVaultService.setProviderEndpoint('ollama', 'http://192.168.1.50:11434')

      const env = aiVaultService.getMcpEnvironmentMap()
      expect(env['GEMINI_API_KEY']).toBe('AIzaSyMockKeyForGeminiApi12345678901')
      expect(env['GOOGLE_API_KEY']).toBe('AIzaSyMockKeyForGeminiApi12345678901')
      expect(env['OPENAI_API_KEY']).toBe('sk-proj-mockopenaikey123456789')
      expect(env['OPENAI_BASE_URL']).toBe('https://custom-openai.proxy/v1')
      expect(env['ANTHROPIC_API_KEY']).toBe('sk-ant-mockclaudekey123456789')
      expect(env['DEEPSEEK_API_KEY']).toBe('sk-mockdeepseekkey123456789')
      expect(env['OPENROUTER_API_KEY']).toBe('sk-or-v1-mockopenrouterkey12')
      expect(env['OLLAMA_HOST']).toBe('http://192.168.1.50:11434')
    })
  })

  describe('AES-256-GCM Encrypted Backup & Restore', () => {
    it('rejects empty passphrases', async () => {
      await expect(aiVaultService.exportEncryptedProfile('')).rejects.toThrow('passphrase')
      await expect(aiVaultService.importEncryptedProfile('payload', '')).rejects.toThrow('passphrase')
    })

    it('encrypts settings and successfully restores them with the correct master passphrase', async () => {
      aiVaultService.setProviderKey('deepseek', 'sk-my-secret-deepseek-key-9999')
      aiVaultService.setProviderKey('openrouter', 'sk-or-v1-supersecret123456789')
      aiVaultService.setProviderEndpoint('ollama', 'http://localhost:11434')

      const passphrase = 'IndoctrinatedMasterPassword!2026'
      const encryptedBundle = await aiVaultService.exportEncryptedProfile(passphrase)
      expect(typeof encryptedBundle).toBe('string')
      expect(encryptedBundle.length).toBeGreaterThan(100)

      // Wipe current vault
      aiVaultService.saveSettings({
        deepseek: { apiKey: '', endpoint: '' },
        gemini: { apiKey: '', endpoint: '' },
        claude: { apiKey: '', endpoint: '' },
        openai: { apiKey: '', endpoint: '' },
        openrouter: { apiKey: '', endpoint: '' },
        custom: { apiKey: '', endpoint: '' },
        ollama: { apiKey: '', endpoint: '' },
        antigravity: { apiKey: '', endpoint: '' },
      })
      expect(aiVaultService.getProviderSetting('deepseek').apiKey).toBe('')

      // Restore from encrypted bundle
      const result = await aiVaultService.importEncryptedProfile(encryptedBundle, passphrase)
      expect(result.importedCount).toBeGreaterThanOrEqual(2)
      expect(result.providers).toContain('deepseek')
      expect(result.providers).toContain('openrouter')

      const restored = aiVaultService.getSettings()
      expect(restored.deepseek.apiKey).toBe('sk-my-secret-deepseek-key-9999')
      expect(restored.openrouter.apiKey).toBe('sk-or-v1-supersecret123456789')
    })

    it('fails to decrypt when given an incorrect master passphrase', async () => {
      aiVaultService.setProviderKey('gemini', 'AIzaSyValidGeminiKeyForTest123456789')
      const encryptedBundle = await aiVaultService.exportEncryptedProfile('CorrectPassword123')

      await expect(
        aiVaultService.importEncryptedProfile(encryptedBundle, 'WrongPassword456')
      ).rejects.toThrow()
    })
  })

  describe('Live Connectivity Probes', () => {
    it('handles probe for Gemini successfully when fetch returns ok', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ models: [{ name: 'models/gemini-2.0-flash' }, { name: 'models/gemini-2.5-pro' }] }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const result = await aiVaultService.testConnection('gemini', 'AIzaSyTestKey12345')
      expect(result.success).toBe(true)
      expect(result.modelCount).toBe(2)
      expect(result.message).toContain('Gemini API connected (2 models available)')

      vi.unstubAllGlobals()
    })

    it('handles probe error response from OpenAI endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Incorrect API key provided' } }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const result = await aiVaultService.testConnection('openai', 'sk-invalid-key')
      expect(result.success).toBe(false)
      expect(result.httpStatus).toBe(401)
      expect(result.message).toBe('Incorrect API key provided')

      vi.unstubAllGlobals()
    })

    it('handles network failure gracefully', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'))
      vi.stubGlobal('fetch', mockFetch)

      const result = await aiVaultService.testConnection('deepseek', 'sk-test')
      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to fetch')

      vi.unstubAllGlobals()
    })
  })

  describe('Reactive Pub/Sub Subscriptions', () => {
    it('notifies subscribers immediately and upon changes', () => {
      const listener = vi.fn()
      const unsub = aiVaultService.subscribe(listener)

      expect(listener).toHaveBeenCalledTimes(1)

      aiVaultService.setProviderKey('openai', 'sk-new-key')
      expect(listener).toHaveBeenCalledTimes(2)

      unsub()
      aiVaultService.setProviderKey('openai', 'sk-another-key')
      expect(listener).toHaveBeenCalledTimes(2)
    })
  })
})

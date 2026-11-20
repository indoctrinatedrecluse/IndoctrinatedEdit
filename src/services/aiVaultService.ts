/**
 * IndoctrinatedEdit - Unified AI Key, Endpoint & Security Vault Service
 * Secure obfuscation/encryption, format validation, live connectivity probing,
 * MCP stack synchronization, and encrypted profile backup/restore.
 */

import { AiProvider } from '@sdk/types'
import { utf8ToBase64, base64ToUtf8 } from '../utils/security'

export interface ProviderSetting {
  apiKey: string
  endpoint?: string
}

export type AiSettingsMap = Record<AiProvider, ProviderSetting>

export interface AiProviderMeta {
  id: AiProvider
  name: string
  category: 'cloud' | 'local' | 'gateway' | 'custom' | 'agent'
  defaultUrl: string
  keyPlaceholder: string
  dashboardUrl?: string
  helper: string
  brandColor: string
  keyPrefix?: string
  keyPattern?: RegExp
  keyFormatHint: string
}

export interface KeyValidationResult {
  isValidFormat: boolean
  isSet: boolean
  entropy: number
  formatHint: string
}

export interface ConnectionTestResult {
  success: boolean
  latencyMs: number
  message: string
  httpStatus?: number
  modelCount?: number
}

const VAULT_STORAGE_KEY_V2 = 'indoctrinated_ai_vault_v2'
const LEGACY_SETTINGS_STORAGE_KEY = 'indoctrinated_ai_settings'

export const AI_PROVIDERS_META: AiProviderMeta[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    category: 'cloud',
    defaultUrl: 'https://generativelanguage.googleapis.com',
    keyPlaceholder: 'AIzaSy...',
    dashboardUrl: 'https://aistudio.google.com/app/apikey',
    helper: 'Direct Google AI Studio API: 1M context window, native multimodal understanding & CoT reasoning.',
    brandColor: '#1A73E8',
    keyPrefix: 'AIza',
    keyPattern: /^AIza[0-9A-Za-z-_]{35}$/,
    keyFormatHint: 'Begins with "AIza" (39 characters)',
  },
  {
    id: 'openai',
    name: 'OpenAI API',
    category: 'cloud',
    defaultUrl: 'https://api.openai.com/v1',
    keyPlaceholder: 'sk-proj-... or sk-...',
    dashboardUrl: 'https://platform.openai.com/api-keys',
    helper: 'Direct OpenAI API: GPT-4o, o3-mini, and GPT-4o-mini with structured outputs.',
    brandColor: '#10A37F',
    keyPrefix: 'sk-',
    keyPattern: /^sk-(?:proj-)?[a-zA-Z0-9_-]{20,}$/,
    keyFormatHint: 'Begins with "sk-" or "sk-proj-"',
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    category: 'cloud',
    defaultUrl: 'https://api.anthropic.com',
    keyPlaceholder: 'sk-ant-api03-...',
    dashboardUrl: 'https://console.anthropic.com/settings/keys',
    helper: 'Direct Anthropic API: Claude 3.7 Sonnet, 3.5 Sonnet, and Opus frontier reasoning models.',
    brandColor: '#D97706',
    keyPrefix: 'sk-ant-',
    keyPattern: /^sk-ant-[a-zA-Z0-9_-]{20,}$/,
    keyFormatHint: 'Begins with "sk-ant-"',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek API',
    category: 'cloud',
    defaultUrl: 'https://api.deepseek.com',
    keyPlaceholder: 'sk-...',
    dashboardUrl: 'https://platform.deepseek.com/api_keys',
    helper: 'Direct DeepSeek API: V3 Chat & R1 Deep Reasoning with exceptional cost efficiency.',
    brandColor: '#0066FF',
    keyPrefix: 'sk-',
    keyPattern: /^sk-[a-zA-Z0-9]{20,}$/,
    keyFormatHint: 'Begins with "sk-"',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter Gateway',
    category: 'gateway',
    defaultUrl: 'https://openrouter.ai/api/v1',
    keyPlaceholder: 'sk-or-v1-...',
    dashboardUrl: 'https://openrouter.ai/keys',
    helper: 'Unified BYOK gateway for Claude 3.7, DeepSeek R1, GPT-4o, Gemini 2.0, Qwen & 300+ models.',
    brandColor: '#6366F1',
    keyPrefix: 'sk-or-',
    keyPattern: /^sk-or-(?:v1-)?[a-zA-Z0-9_-]{20,}$/,
    keyFormatHint: 'Begins with "sk-or-" or "sk-or-v1-"',
  },
  {
    id: 'custom',
    name: 'Custom OpenAI-Compatible',
    category: 'custom',
    defaultUrl: 'http://localhost:1234/v1',
    keyPlaceholder: 'Optional for local endpoints',
    helper: 'Connect to LM Studio, vLLM, Groq, Together AI, Cerebras, or self-hosted proxies.',
    brandColor: '#8B5CF6',
    keyFormatHint: 'Custom endpoint or API token',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local Models)',
    category: 'local',
    defaultUrl: 'http://localhost:11434',
    keyPlaceholder: 'No API Key Needed',
    helper: 'Local offline models running on your hardware via Ollama (Llama 3.3, Qwen 2.5, DeepSeek R1).',
    brandColor: '#64748B',
    keyFormatHint: 'Local daemon running on localhost',
  },
]

export const DEFAULT_VAULT_SETTINGS: AiSettingsMap = {
  deepseek: { apiKey: '', endpoint: 'https://api.deepseek.com' },
  gemini: { apiKey: '', endpoint: 'https://generativelanguage.googleapis.com' },
  claude: { apiKey: '', endpoint: 'https://api.anthropic.com' },
  openai: { apiKey: '', endpoint: 'https://api.openai.com/v1' },
  openrouter: { apiKey: '', endpoint: 'https://openrouter.ai/api/v1' },
  custom: { apiKey: '', endpoint: 'http://localhost:1234/v1' },
  ollama: { apiKey: '', endpoint: 'http://localhost:11434' },
  antigravity: { apiKey: '', endpoint: '' },
}

class AiVaultService {
  private cache: AiSettingsMap | null = null
  private listeners: Set<(settings: AiSettingsMap) => void> = new Set()
  private xorSalt = 'IndoctrinatedEdit::AiVault::Salt::9941'

  constructor() {
    this.initVault()
  }

  private xorTransform(input: string): string {
    const salt = this.xorSalt
    let output = ''
    for (let i = 0; i < input.length; i++) {
      output += String.fromCharCode(input.charCodeAt(i) ^ salt.charCodeAt(i % salt.length))
    }
    return output
  }

  private initVault(): void {
    if (typeof localStorage === 'undefined') {
      this.cache = { ...DEFAULT_VAULT_SETTINGS }
      return
    }

    try {
      // 1. Try modern V2 obfuscated vault
      const v2Raw = localStorage.getItem(VAULT_STORAGE_KEY_V2)
      if (v2Raw) {
        const envelope = JSON.parse(v2Raw)
        if (envelope && envelope.obfuscated && envelope.data) {
          const decryptedJson = this.xorTransform(base64ToUtf8(envelope.data))
          this.cache = { ...DEFAULT_VAULT_SETTINGS, ...JSON.parse(decryptedJson) }
          return
        }
      }

      // 2. Fall back to legacy plaintext settings and migrate
      const legacyRaw = localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY)
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw)
        const combined = { ...DEFAULT_VAULT_SETTINGS, ...legacy }
        this.cache = combined
        this.saveSettings(combined)
        return
      }

      this.cache = { ...DEFAULT_VAULT_SETTINGS }
    } catch {
      this.cache = { ...DEFAULT_VAULT_SETTINGS }
    }
  }

  /**
   * Retrieves current AI provider configurations.
   */
  public getSettings(): AiSettingsMap {
    if (!this.cache) {
      this.initVault()
    }
    return { ...this.cache! }
  }

  /**
   * Updates and securely persists AI provider configurations.
   */
  public saveSettings(newSettings: AiSettingsMap): void {
    this.cache = { ...DEFAULT_VAULT_SETTINGS, ...newSettings }

    if (typeof localStorage !== 'undefined') {
      try {
        // Store V2 obfuscated envelope
        const plainJson = JSON.stringify(this.cache)
        const obfuscated = utf8ToBase64(this.xorTransform(plainJson))
        const envelope = {
          version: 2,
          obfuscated: true,
          data: obfuscated,
          updatedAt: new Date().toISOString(),
        }
        localStorage.setItem(VAULT_STORAGE_KEY_V2, JSON.stringify(envelope))

        // Backward compatibility sync for legacy consumers
        localStorage.setItem(LEGACY_SETTINGS_STORAGE_KEY, plainJson)
      } catch (err) {
        console.error('[AiVaultService] Failed to persist AI vault to storage', err)
      }
    }

    this.notifyListeners()
  }

  public getProviderSetting(provider: AiProvider): ProviderSetting {
    const settings = this.getSettings()
    return settings[provider] || { apiKey: '', endpoint: '' }
  }

  public setProviderKey(provider: AiProvider, apiKey: string): void {
    const settings = this.getSettings()
    settings[provider] = {
      ...settings[provider],
      apiKey: apiKey.trim(),
    }
    this.saveSettings(settings)
  }

  public setProviderEndpoint(provider: AiProvider, endpoint: string): void {
    const settings = this.getSettings()
    settings[provider] = {
      ...settings[provider],
      endpoint: endpoint.trim(),
    }
    this.saveSettings(settings)
  }

  public resetProviderToDefault(provider: AiProvider): void {
    const meta = AI_PROVIDERS_META.find((p) => p.id === provider)
    if (!meta) return
    const settings = this.getSettings()
    settings[provider] = {
      ...settings[provider],
      endpoint: meta.defaultUrl,
    }
    this.saveSettings(settings)
  }

  public clearProviderKey(provider: AiProvider): void {
    const settings = this.getSettings()
    settings[provider] = {
      ...settings[provider],
      apiKey: '',
    }
    this.saveSettings(settings)
  }

  /**
   * Generates a masked visual preview of an API key preserving prefix and suffix.
   * e.g. "sk-proj-•••••••••••••4012" or "AIzaSy•••••••••••8419"
   */
  public maskKey(key: string): string {
    if (!key || !key.trim()) return ''
    const clean = key.trim()
    if (clean.length <= 8) return '••••••••'

    const prefix = clean.startsWith('sk-proj-')
      ? 'sk-proj-'
      : clean.startsWith('sk-ant-')
      ? 'sk-ant-'
      : clean.startsWith('sk-or-')
      ? 'sk-or-'
      : clean.slice(0, 4)

    const suffix = clean.slice(-4)
    const maskLen = Math.max(8, clean.length - prefix.length - suffix.length)
    return `${prefix}${'•'.repeat(Math.min(maskLen, 16))}${suffix}`
  }

  /**
   * Computes Shannon entropy of an API key to detect realistic token entropy vs placeholders.
   */
  public calculateEntropy(key: string): number {
    if (!key || key.length === 0) return 0
    const freqs: Record<string, number> = {}
    for (let i = 0; i < key.length; i++) {
      const ch = key[i]
      freqs[ch] = (freqs[ch] || 0) + 1
    }
    let entropy = 0
    for (const count of Object.values(freqs)) {
      const p = count / key.length
      entropy -= p * Math.log2(p)
    }
    return Math.round(entropy * 100) / 100
  }

  /**
   * Validates key format and characteristics against known provider standards.
   */
  public validateKeyFormat(provider: AiProvider, key: string): KeyValidationResult {
    const clean = key.trim()
    if (!clean) {
      return {
        isValidFormat: false,
        isSet: false,
        entropy: 0,
        formatHint: 'No key entered',
      }
    }

    const meta = AI_PROVIDERS_META.find((p) => p.id === provider)
    const entropy = this.calculateEntropy(clean)

    if (!meta || !meta.keyPattern) {
      return {
        isValidFormat: clean.length >= 8,
        isSet: true,
        entropy,
        formatHint: clean.length >= 8 ? 'Format accepted' : 'Key appears too short',
      }
    }

    const matches = meta.keyPattern.test(clean)
    let hint = meta.keyFormatHint
    if (matches) {
      hint = `Valid ${meta.name} format (${entropy} bits entropy)`
    } else if (meta.keyPrefix && !clean.startsWith(meta.keyPrefix)) {
      hint = `Expected prefix "${meta.keyPrefix}"`
    }

    return {
      isValidFormat: matches,
      isSet: true,
      entropy,
      formatHint: hint,
    }
  }

  /**
   * Performs an active live connectivity probe to verify whether the key and endpoint are valid.
   */
  public async testConnection(
    provider: AiProvider,
    customKey?: string,
    customEndpoint?: string
  ): Promise<ConnectionTestResult> {
    const setting = this.getProviderSetting(provider)
    const apiKey = (customKey !== undefined ? customKey : setting.apiKey).trim()
    const meta = AI_PROVIDERS_META.find((p) => p.id === provider)
    const defaultUrl = meta?.defaultUrl || ''
    const endpoint = (customEndpoint !== undefined ? customEndpoint : setting.endpoint || defaultUrl).trim().replace(/\/+$/, '')

    const start = performance.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    try {
      if (provider === 'gemini') {
        if (!apiKey) return { success: false, latencyMs: 0, message: 'API key is required' }
        const res = await fetch(`${endpoint}/v1beta/models?key=${apiKey}`, {
          method: 'GET',
          signal: controller.signal,
        })
        const duration = Math.round(performance.now() - start)
        if (res.ok) {
          const data = await res.json().catch(() => null)
          const count = Array.isArray(data?.models) ? data.models.length : 0
          return {
            success: true,
            latencyMs: duration,
            message: `Gemini API connected (${count} models available)`,
            httpStatus: res.status,
            modelCount: count,
          }
        }
        const errJson = await res.json().catch(() => null)
        const errMsg = errJson?.error?.message || `HTTP ${res.status} (${res.statusText})`
        return { success: false, latencyMs: duration, message: errMsg, httpStatus: res.status }
      }

      if (provider === 'openai' || provider === 'deepseek' || provider === 'openrouter' || provider === 'custom') {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`
        }
        const targetUrl = endpoint.endsWith('/v1') ? `${endpoint}/models` : `${endpoint}/v1/models`
        const res = await fetch(targetUrl, {
          method: 'GET',
          headers,
          signal: controller.signal,
        })
        const duration = Math.round(performance.now() - start)
        if (res.ok) {
          const data = await res.json().catch(() => null)
          const count = Array.isArray(data?.data) ? data.data.length : 0
          return {
            success: true,
            latencyMs: duration,
            message: `${meta?.name || 'API'} connected (${count} models detected)`,
            httpStatus: res.status,
            modelCount: count,
          }
        }
        const errJson = await res.json().catch(() => null)
        const errMsg = errJson?.error?.message || `HTTP ${res.status} (${res.statusText})`
        return { success: false, latencyMs: duration, message: errMsg, httpStatus: res.status }
      }

      if (provider === 'claude') {
        if (!apiKey) return { success: false, latencyMs: 0, message: 'Anthropic API key is required' }
        const res = await fetch(`${endpoint}/v1/models`, {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          signal: controller.signal,
        })
        const duration = Math.round(performance.now() - start)
        if (res.ok) {
          const data = await res.json().catch(() => null)
          const count = Array.isArray(data?.data) ? data.data.length : 0
          return {
            success: true,
            latencyMs: duration,
            message: `Anthropic API connected (${count} models detected)`,
            httpStatus: res.status,
            modelCount: count,
          }
        }
        const errJson = await res.json().catch(() => null)
        const errMsg = errJson?.error?.message || `HTTP ${res.status} (${res.statusText})`
        return { success: false, latencyMs: duration, message: errMsg, httpStatus: res.status }
      }

      if (provider === 'ollama') {
        const res = await fetch(`${endpoint}/api/tags`, {
          method: 'GET',
          signal: controller.signal,
        })
        const duration = Math.round(performance.now() - start)
        if (res.ok) {
          const data = await res.json().catch(() => null)
          const count = Array.isArray(data?.models) ? data.models.length : 0
          return {
            success: true,
            latencyMs: duration,
            message: `Ollama daemon online (${count} local models detected)`,
            httpStatus: res.status,
            modelCount: count,
          }
        }
        return {
          success: false,
          latencyMs: duration,
          message: `Ollama service unreachable on ${endpoint}`,
          httpStatus: res.status,
        }
      }

      return {
        success: true,
        latencyMs: 1,
        message: 'Built-in local provider ready',
      }
    } catch (err: any) {
      const duration = Math.round(performance.now() - start)
      const isAbort = err?.name === 'AbortError'
      return {
        success: false,
        latencyMs: duration,
        message: isAbort ? 'Connection timed out (>6s)' : err?.message || 'Network unreachable',
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Builds an environment mapping for child processes and MCP server runtimes.
   */
  public getMcpEnvironmentMap(): Record<string, string> {
    const s = this.getSettings()
    const env: Record<string, string> = {}

    if (s.gemini?.apiKey) {
      env['GEMINI_API_KEY'] = s.gemini.apiKey
      env['GOOGLE_API_KEY'] = s.gemini.apiKey
    }
    if (s.openai?.apiKey) {
      env['OPENAI_API_KEY'] = s.openai.apiKey
    }
    if (s.openai?.endpoint) {
      env['OPENAI_BASE_URL'] = s.openai.endpoint
    }
    if (s.claude?.apiKey) {
      env['ANTHROPIC_API_KEY'] = s.claude.apiKey
    }
    if (s.deepseek?.apiKey) {
      env['DEEPSEEK_API_KEY'] = s.deepseek.apiKey
    }
    if (s.openrouter?.apiKey) {
      env['OPENROUTER_API_KEY'] = s.openrouter.apiKey
    }
    if (s.ollama?.endpoint) {
      env['OLLAMA_HOST'] = s.ollama.endpoint
    }

    return env
  }

  /**
   * Exports entire AI settings vault as an AES-256-GCM encrypted profile bundle.
   */
  public async exportEncryptedProfile(passphrase: string): Promise<string> {
    if (!passphrase || !passphrase.trim()) {
      throw new Error('A non-empty master passphrase is required to export encrypted AI profile.')
    }
    const subtle = globalThis.crypto?.subtle
    if (!subtle) {
      throw new Error('Web Crypto API is unavailable in this environment.')
    }

    const enc = new TextEncoder()
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16))
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))

    const keyMaterial = await subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
    const aesKey = await subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    )

    const plainBytes = enc.encode(JSON.stringify(this.getSettings()))
    const cipherBuf = await subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, plainBytes)

    const toB64 = (bytes: Uint8Array) => {
      let bin = ''
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
      return btoa(bin)
    }

    const envelope = {
      type: 'indoctrinated_ai_vault_export',
      version: 1,
      salt: toB64(salt),
      iv: toB64(iv),
      ct: toB64(new Uint8Array(cipherBuf)),
      exportedAt: new Date().toISOString(),
    }

    return utf8ToBase64(JSON.stringify(envelope))
  }

  /**
   * Imports and restores an AES-256-GCM encrypted AI profile bundle.
   */
  public async importEncryptedProfile(
    bundleBase64: string,
    passphrase: string
  ): Promise<{ importedCount: number; providers: string[] }> {
    if (!passphrase || !passphrase.trim()) {
      throw new Error('A master passphrase is required to decrypt the vault bundle.')
    }
    const subtle = globalThis.crypto?.subtle
    if (!subtle) {
      throw new Error('Web Crypto API is unavailable in this environment.')
    }

    const parsedEnvelope = JSON.parse(base64ToUtf8(bundleBase64.trim()))
    if (parsedEnvelope?.type !== 'indoctrinated_ai_vault_export') {
      throw new Error('Invalid or unrecognized AI vault export envelope.')
    }

    const fromB64 = (s: string) => {
      const bin = atob(s)
      const out = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
      return out
    }

    const enc = new TextEncoder()
    const salt = fromB64(parsedEnvelope.salt)
    const iv = fromB64(parsedEnvelope.iv)
    const ct = fromB64(parsedEnvelope.ct)

    const keyMaterial = await subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
    const aesKey = await subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )

    const plainBuf = await subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ct)
    const restoredSettings: AiSettingsMap = JSON.parse(new TextDecoder().decode(plainBuf))

    const current = this.getSettings()
    let importedCount = 0
    const importedProviders: string[] = []

    for (const [prov, setting] of Object.entries(restoredSettings)) {
      if (setting?.apiKey || setting?.endpoint) {
        current[prov as AiProvider] = {
          apiKey: setting.apiKey || current[prov as AiProvider]?.apiKey || '',
          endpoint: setting.endpoint || current[prov as AiProvider]?.endpoint || '',
        }
        importedCount++
        importedProviders.push(prov)
      }
    }

    this.saveSettings(current)
    return { importedCount, providers: importedProviders }
  }

  public subscribe(callback: (settings: AiSettingsMap) => void): () => void {
    this.listeners.add(callback)
    callback(this.getSettings())
    return () => {
      this.listeners.delete(callback)
    }
  }

  private notifyListeners(): void {
    const s = this.getSettings()
    this.listeners.forEach((cb) => {
      try {
        cb(s)
      } catch (err) {
        console.error('[AiVaultService] Error notifying listener', err)
      }
    })
  }
}

export const aiVaultService = new AiVaultService()

/**
 * Dev API Key Pre-loader
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads VITE_DEV_*_API_KEY from .env.local (gitignored, never committed) and
 * pre-fills the AI settings in localStorage so the settings panel opens ready.
 *
 * Only runs if the key isn't already set (so manual UI edits are never clobbered).
 * Has zero effect in production builds where VITE_DEV_* vars are not injected.
 */

const SETTINGS_STORAGE_KEY = 'indoctrinated_ai_settings'

interface ProviderSetting {
  apiKey: string
  endpoint?: string
}

type AiSettingsMap = Record<string, ProviderSetting>

const DEFAULT_SETTINGS: AiSettingsMap = {
  deepseek: { apiKey: '', endpoint: 'https://api.deepseek.com' },
  gemini: { apiKey: '', endpoint: 'https://generativelanguage.googleapis.com' },
  claude: { apiKey: '', endpoint: 'https://api.anthropic.com' },
  openai: { apiKey: '', endpoint: 'https://api.openai.com/v1' },
  ollama: { apiKey: '', endpoint: 'http://localhost:11434' },
  antigravity: { apiKey: '', endpoint: '' },
}

export function loadDevApiKeys(): void {
  try {
    // Read current settings from localStorage
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    const current: AiSettingsMap = raw
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
      : { ...DEFAULT_SETTINGS }

    let changed = false

    // Gemini key
    const geminiKey = (import.meta.env.VITE_DEV_GEMINI_API_KEY || '').trim()
    if (geminiKey && !current.gemini?.apiKey) {
      current.gemini = { ...current.gemini, apiKey: geminiKey }
      changed = true
    }

    // DeepSeek key
    const deepseekKey = (import.meta.env.VITE_DEV_DEEPSEEK_API_KEY || '').trim()
    if (deepseekKey && !current.deepseek?.apiKey) {
      current.deepseek = { ...current.deepseek, apiKey: deepseekKey }
      changed = true
    }

    // Claude key
    const claudeKey = (import.meta.env.VITE_DEV_CLAUDE_API_KEY || '').trim()
    if (claudeKey && !current.claude?.apiKey) {
      current.claude = { ...current.claude, apiKey: claudeKey }
      changed = true
    }

    // OpenAI key
    const openaiKey = (import.meta.env.VITE_DEV_OPENAI_API_KEY || '').trim()
    if (openaiKey && !current.openai?.apiKey) {
      current.openai = { ...current.openai, apiKey: openaiKey }
      changed = true
    }

    if (changed) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(current))
      console.info('[DevEnvLoader] Pre-filled AI API keys from .env.local')
    }
  } catch (err) {
    console.warn('[DevEnvLoader] Failed to load dev API keys:', err)
  }
}

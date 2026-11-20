/**
 * Dev API Key Pre-loader
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads VITE_DEV_*_API_KEY from .env.local (gitignored, never committed) and
 * pre-fills the AI settings in localStorage so the settings panel opens ready.
 *
 * Only runs if the key isn't already set (so manual UI edits are never clobbered).
 * Has zero effect in production builds where VITE_DEV_* vars are not injected.
 */

import { aiVaultService } from './aiVaultService'

export function loadDevApiKeys(): void {
  try {
    const current = aiVaultService.getSettings()
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
      aiVaultService.saveSettings(current)
      console.info('[DevEnvLoader] Pre-filled AI API keys into vault from .env.local')
    }
  } catch (err) {
    console.warn('[DevEnvLoader] Failed to load dev API keys:', err)
  }
}

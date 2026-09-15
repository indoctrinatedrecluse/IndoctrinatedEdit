import { AiModelOption, AiProvider, AiStreamChunk, AiChatMessage } from '@sdk/types'

export interface ProviderSetting {
  apiKey: string
  endpoint?: string
}

export type AiSettingsMap = Record<AiProvider, ProviderSetting>

const DEFAULT_SETTINGS: AiSettingsMap = {
  deepseek: { apiKey: '', endpoint: 'https://api.deepseek.com' },
  openai: { apiKey: '', endpoint: 'https://api.openai.com/v1' },
  gemini: { apiKey: '', endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  claude: { apiKey: '', endpoint: 'https://api.anthropic.com' },
  ollama: { apiKey: '', endpoint: 'http://localhost:11434' },
  antigravity: { apiKey: '', endpoint: 'http://localhost:8080/v1' },
}

export const PRESET_MODELS: AiModelOption[] = [
  // DeepSeek
  {
    id: 'deepseek-chat',
    name: 'DeepSeek-V3',
    provider: 'deepseek',
    description: '671B MoE model with exceptional coding and architectural reasoning',
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek-R1 (Reasoning)',
    provider: 'deepseek',
    description: 'Reinforcement learning CoT model displaying step-by-step thinking process',
    supportsReasoning: true,
  },
  // OpenAI
  {
    id: 'gpt-4o',
    name: 'OpenAI GPT-4o',
    provider: 'openai',
    description: 'Omni flagship model for complex coding, synthesis and refactoring',
  },
  {
    id: 'o3-mini',
    name: 'OpenAI o3-mini',
    provider: 'openai',
    description: 'Fast, high-reasoning STEM and coding model',
    supportsReasoning: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'OpenAI GPT-4o Mini',
    provider: 'openai',
    description: 'Ultra-fast and cost-efficient coding assistant',
  },
  // Gemini
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    description: 'High-speed multimodal coding model with massive 1M context window',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'gemini',
    description: 'Top-tier code generation and complex multi-file reasoning',
  },
  // Claude
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'claude',
    description: 'Hybrid reasoning and leading coding benchmarks',
    supportsReasoning: true,
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'claude',
    description: 'State-of-the-art coding and nuanced code reviews',
  },
  // Antigravity / Custom Proxy
  {
    id: 'antigravity-hybrid',
    name: 'Antigravity ADC / Session',
    provider: 'antigravity',
    description: 'Cloud subscription or local multi-agent proxy endpoint',
  },
]

const SETTINGS_STORAGE_KEY = 'indoctrinated_ai_settings'
const ACTIVE_MODEL_STORAGE_KEY = 'indoctrinated_ai_active_model'

export class AiService {
  private static settings: AiSettingsMap | null = null

  static getSettings(): AiSettingsMap {
    if (!this.settings) {
      try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
        if (raw) {
          this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
        } else {
          this.settings = { ...DEFAULT_SETTINGS }
        }
      } catch {
        this.settings = { ...DEFAULT_SETTINGS }
      }
    }
    return this.settings!
  }

  static saveSettings(newSettings: AiSettingsMap): void {
    this.settings = newSettings
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings))
    } catch (err) {
      console.error('Failed to persist AI settings to localStorage', err)
    }
  }

  static getActiveModelId(): string {
    return localStorage.getItem(ACTIVE_MODEL_STORAGE_KEY) || 'deepseek-chat'
  }

  static setActiveModelId(modelId: string): void {
    localStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, modelId)
  }

  static async fetchOllamaModels(host = 'http://localhost:11434'): Promise<AiModelOption[]> {
    try {
      if (window.electronAPI?.ai?.listOllamaModels) {
        const modelNames = await window.electronAPI.ai.listOllamaModels(host)
        return modelNames.map((name) => ({
          id: name,
          name: `Ollama: ${name}`,
          provider: 'ollama' as const,
          description: `Local model hosted at ${host}`,
        }))
      }

      // Browser fallback
      const url = host.replace(/\/+$/, '') + '/api/tags'
      const res = await fetch(url, { signal: AbortSignal.timeout(2500) })
      if (!res.ok) return []
      const data = (await res.json()) as { models?: Array<{ name: string }> }
      return (
        data.models?.map((m) => ({
          id: m.name,
          name: `Ollama: ${m.name}`,
          provider: 'ollama' as const,
          description: `Local model hosted at ${host}`,
        })) || []
      )
    } catch {
      return []
    }
  }

  /**
   * Stream a prompt request with full support for Electron IPC or browser fetch fallback
   */
  static streamChat(
    model: AiModelOption,
    messages: AiChatMessage[],
    onChunk: (chunk: AiStreamChunk) => void
  ): () => void {
    const requestId = `ai-req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const settings = this.getSettings()
    const providerSettings = settings[model.provider] || { apiKey: '', endpoint: '' }

    // Format chat messages including attachments if present
    const formattedMessages = messages.map((m) => {
      let content = m.content
      if (m.attachment) {
        const header = `\n\n\`\`\`${m.attachment.fileName.split('.').pop() || 'text'}\n// File: ${m.attachment.fileName}${
          m.attachment.startLine ? ` (Lines ${m.attachment.startLine}-${m.attachment.endLine})` : ''
        }\n${m.attachment.code}\n\`\`\`\n`
        content = `${content}${header}`
      }
      return {
        role: m.role,
        content,
      }
    })

    // If Electron IPC is available, use it (zero CORS restrictions)
    if (window.electronAPI?.ai?.startStream) {
      return window.electronAPI.ai.startStream(
        requestId,
        {
          provider: model.provider,
          model: model.id,
          messages: formattedMessages,
          apiKey: providerSettings.apiKey,
          endpoint: providerSettings.endpoint,
        },
        onChunk
      )
    }

    // Fallback: Browser direct fetch (for Vite dev or preview)
    const controller = new AbortController()

    const runBrowserFetch = async () => {
      try {
        const baseUrl = providerSettings.endpoint || 'https://api.openai.com/v1'
        const url = baseUrl.replace(/\/+$/, '') + (baseUrl.endsWith('/chat/completions') ? '' : '/chat/completions')

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(providerSettings.apiKey ? { Authorization: `Bearer ${providerSettings.apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: model.id,
            messages: formattedMessages,
            stream: true,
          }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const errText = await res.text()
          throw new Error(`API error (${res.status}): ${errText}`)
        }

        if (!res.body) throw new Error('Response body empty')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith(':')) continue
            if (trimmed === 'data: [DONE]') {
              onChunk({ done: true })
              return
            }
            if (trimmed.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmed.slice(6))
                const delta = json.choices?.[0]?.delta
                if (delta?.content) onChunk({ text: delta.content })
                if (delta?.reasoning_content) onChunk({ reasoning: delta.reasoning_content })
              } catch {
                // partial line
              }
            }
          }
        }
        onChunk({ done: true })
      } catch (err: unknown) {
        if (!controller.signal.aborted) {
          const message = err instanceof Error ? err.message : String(err)
          onChunk({ error: message, done: true })
        }
      }
    }

    runBrowserFetch()

    return () => {
      controller.abort()
    }
  }
}

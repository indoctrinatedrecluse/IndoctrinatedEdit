import {
  AiModelOption,
  AiProvider,
  AiStreamChunk,
  AiChatMessage,
  AiAutoApproveSettings,
  AutoApprovePreset,
} from '@sdk/types'

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

export const DEFAULT_AUTO_APPROVE_SETTINGS: AiAutoApproveSettings = {
  autoApproveRead: true,
  autoApproveWrite: false,
  autoApproveRun: false,
  autoApproveBrowser: true,
  autoApproveGit: false,
  maxAutoIterations: 10,
}

export const AUTO_APPROVE_PRESETS: Record<AutoApprovePreset, AiAutoApproveSettings> = {
  paranoid: {
    autoApproveRead: false,
    autoApproveWrite: false,
    autoApproveRun: false,
    autoApproveBrowser: false,
    autoApproveGit: false,
    maxAutoIterations: 5,
  },
  balanced: {
    autoApproveRead: true,
    autoApproveWrite: false,
    autoApproveRun: false,
    autoApproveBrowser: true,
    autoApproveGit: false,
    maxAutoIterations: 10,
  },
  autonomous: {
    autoApproveRead: true,
    autoApproveWrite: true,
    autoApproveRun: true,
    autoApproveBrowser: true,
    autoApproveGit: true,
    maxAutoIterations: 25,
  },
}

export const PRESET_MODELS: AiModelOption[] = [
  // Antigravity (Personal Subscription)
  {
    id: 'antigravity-personal-agent',
    name: 'Antigravity 2.0 Agent (Personal)',
    provider: 'antigravity',
    description: 'Autonomous multi-turn agent with full workspace grounding, terminal execution, and deep reasoning',
    supportsReasoning: true,
  },
  {
    id: 'antigravity-gemini-2-5-pro',
    name: 'Gemini 2.5 Pro (Antigravity Tier)',
    provider: 'antigravity',
    description: 'Deep architectural coding and 1M context analysis via Antigravity Personal Subscription',
    supportsReasoning: true,
  },
  {
    id: 'antigravity-claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet (Antigravity Tier)',
    provider: 'antigravity',
    description: 'Hybrid reasoning and benchmark-leading code intelligence via Antigravity Personal Tier',
    supportsReasoning: true,
  },

  // ChatGPT & OpenAI Codex (Subscription / BYOK)
  {
    id: 'gpt-4o-codex',
    name: 'ChatGPT Codex (OpenAI Subscription)',
    provider: 'openai',
    description: 'Specialized Codex engine for autonomous code completion, synthesis and refactoring',
  },
  {
    id: 'chatgpt-4o-latest',
    name: 'ChatGPT Plus / Pro (chatgpt-4o-latest)',
    provider: 'openai',
    description: 'Direct ChatGPT subscription model with latest dynamic instruction tuning',
  },
  {
    id: 'o3-mini',
    name: 'OpenAI o3-mini (Reasoning)',
    provider: 'openai',
    description: 'High-speed STEM, algorithmic logic, and coding CoT reasoning model',
    supportsReasoning: true,
  },
  {
    id: 'gpt-4o',
    name: 'OpenAI GPT-4o',
    provider: 'openai',
    description: 'Omni flagship model for complex coding, synthesis and refactoring',
  },
  {
    id: 'gpt-4o-mini',
    name: 'OpenAI GPT-4o Mini',
    provider: 'openai',
    description: 'Ultra-fast and cost-efficient coding assistant',
  },

  // DeepSeek (BYOK)
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

  // Gemini (BYOK)
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

  // Claude (BYOK)
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
]

const SETTINGS_STORAGE_KEY = 'indoctrinated_ai_settings'
const ACTIVE_MODEL_STORAGE_KEY = 'indoctrinated_ai_active_model'
const AUTO_APPROVE_STORAGE_KEY = 'indoctrinated_ai_auto_approve'

export class AiService {
  private static settings: AiSettingsMap | null = null
  private static autoApproveSettings: AiAutoApproveSettings | null = null
  private static autoApproveListeners: Set<(settings: AiAutoApproveSettings) => void> = new Set()

  static getSettings(): AiSettingsMap {
    if (!this.settings) {
      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
          if (raw) {
            this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
          } else {
            this.settings = { ...DEFAULT_SETTINGS }
          }
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
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings))
      }
    } catch (err) {
      console.error('Failed to persist AI settings to localStorage', err)
    }
  }

  static getAutoApproveSettings(): AiAutoApproveSettings {
    if (!this.autoApproveSettings) {
      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(AUTO_APPROVE_STORAGE_KEY)
          if (raw) {
            this.autoApproveSettings = { ...DEFAULT_AUTO_APPROVE_SETTINGS, ...JSON.parse(raw) }
          } else {
            this.autoApproveSettings = { ...DEFAULT_AUTO_APPROVE_SETTINGS }
          }
        } else {
          this.autoApproveSettings = { ...DEFAULT_AUTO_APPROVE_SETTINGS }
        }
      } catch {
        this.autoApproveSettings = { ...DEFAULT_AUTO_APPROVE_SETTINGS }
      }
    }
    return this.autoApproveSettings!
  }

  static saveAutoApproveSettings(newSettings: AiAutoApproveSettings): void {
    this.autoApproveSettings = newSettings
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(AUTO_APPROVE_STORAGE_KEY, JSON.stringify(newSettings))
      }
    } catch (err) {
      console.error('Failed to persist auto-approve settings to localStorage', err)
    }
    this.autoApproveListeners.forEach((listener) => {
      try {
        listener(newSettings)
      } catch (err) {
        console.error('Error executing auto-approve change listener', err)
      }
    })
  }

  static applyAutoApprovePreset(preset: AutoApprovePreset): AiAutoApproveSettings {
    const target = AUTO_APPROVE_PRESETS[preset] || DEFAULT_AUTO_APPROVE_SETTINGS
    this.saveAutoApproveSettings({ ...target })
    return { ...target }
  }

  static onAutoApproveChanged(listener: (settings: AiAutoApproveSettings) => void): () => void {
    this.autoApproveListeners.add(listener)
    return () => {
      this.autoApproveListeners.delete(listener)
    }
  }

  static canAutoApprove(action: 'read' | 'write' | 'run' | 'browser' | 'git'): boolean {
    const current = this.getAutoApproveSettings()
    switch (action) {
      case 'read':
        return !!current.autoApproveRead
      case 'write':
        return !!current.autoApproveWrite
      case 'run':
        return !!current.autoApproveRun
      case 'browser':
        return !!current.autoApproveBrowser
      case 'git':
        return !!current.autoApproveGit
      default:
        return false
    }
  }

  static getActiveModelId(): string {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(ACTIVE_MODEL_STORAGE_KEY) || 'deepseek-chat'
    }
    return 'deepseek-chat'
  }

  static setActiveModelId(modelId: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, modelId)
    }
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

    // Format chat messages including attachments and tool call results
    const formattedMessages = messages.map((m) => {
      let content = m.content

      if (m.attachment) {
        if (m.attachment.type === 'selection' || m.attachment.type === 'file') {
          const lang = m.attachment.fileName?.split('.').pop() || 'text'
          const header = `\n\n\`\`\`${lang}\n// File: ${m.attachment.fileName || 'active_file'}${
            m.attachment.startLine ? ` (Lines ${m.attachment.startLine}-${m.attachment.endLine})` : ''
          }\n${m.attachment.code || ''}\n\`\`\`\n`
          content = `${content}${header}`
        } else if (m.attachment.type === 'problems') {
          content = `${content}\n\n\`\`\`diagnostics\n// Active LSP / Compiler Problems:\n${m.attachment.code || 'No active problems.'}\n\`\`\`\n`
        } else if (m.attachment.type === 'terminal') {
          content = `${content}\n\n\`\`\`terminal-buffer\n// Recent Terminal Output:\n${m.attachment.code || ''}\n\`\`\`\n`
        } else if (m.attachment.type === 'git') {
          content = `${content}\n\n\`\`\`git-status\n// Git Repository Status & Diffs:\n${m.attachment.code || ''}\n\`\`\`\n`
        } else if (m.attachment.type === 'workspace') {
          content = `${content}\n\n\`\`\`workspace-tree\n// Workspace Directory Summary:\n${m.attachment.code || ''}\n\`\`\`\n`
        }
      }

      if (m.toolResults && m.toolResults.length > 0) {
        const resultsText = m.toolResults
          .map((tr) => `\n\`\`\`tool_result\nTool: ${tr.toolName}\nSuccess: ${tr.success}\nOutput:\n${tr.output}${tr.error ? `\nError: ${tr.error}` : ''}\n\`\`\``)
          .join('\n')
        content = `${content}\n${resultsText}`
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

import {
  AiModelOption,
  AiProvider,
  AiChatMode,
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
  gemini: { apiKey: '', endpoint: 'https://generativelanguage.googleapis.com' },
  claude: { apiKey: '', endpoint: 'https://api.anthropic.com' },
  openai: { apiKey: '', endpoint: 'https://api.openai.com/v1' },
  ollama: { apiKey: '', endpoint: 'http://localhost:11434' },
  antigravity: { apiKey: '', endpoint: '' },
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
  // DeepSeek (Direct API)
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek-V4 Flash',
    provider: 'deepseek',
    description: 'Ultra-fast low-latency coding and reasoning model for high-throughput tasks',
    supportsReasoning: true,
  },
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek-V4 Pro',
    provider: 'deepseek',
    description: 'High-capability flagship model for deep coding, system design, and multi-file refactoring',
    supportsReasoning: true,
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek-V3 (Chat & Code)',
    provider: 'deepseek',
    description: 'Flagship 671B MoE model with exceptional coding, architecture, and multi-turn refactoring',
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek-R1 (Reasoning)',
    provider: 'deepseek',
    description: 'Reinforcement learning CoT model displaying step-by-step thinking process',
    supportsReasoning: true,
  },

  // Google Gemini (Direct API)
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro (Deep Reasoning)',
    provider: 'gemini',
    description: 'Top-tier code generation, complex architectural reasoning, and massive context',
    supportsReasoning: true,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash (Ultra-Fast)',
    provider: 'gemini',
    description: 'High-speed multimodal coding model engineered for rapid streaming',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    description: 'Next-generation low-latency model with real-time tool execution',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro (2M Context)',
    provider: 'gemini',
    description: 'Deep architectural coding, multi-file repo synthesis, and 2M token context reasoning',
    supportsReasoning: true,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    description: 'Lightweight, fast coding assistant with 1M context window',
  },

  // Anthropic Claude (Direct API)
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet (Hybrid Reasoning)',
    provider: 'claude',
    description: 'Anthropic hybrid reasoning model with benchmark-leading coding capability',
    supportsReasoning: true,
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'claude',
    description: 'State-of-the-art coding, debugging, and nuanced code reviews',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'claude',
    description: 'Ultra-fast and cost-efficient code completion and analysis',
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'claude',
    description: 'Anthropic flagship model for deep synthesis, complex refactorings, and system design',
    supportsReasoning: true,
  },

  // OpenAI (Direct API)
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
  {
    id: 'o3-mini',
    name: 'OpenAI o3-mini (Reasoning)',
    provider: 'openai',
    description: 'High-speed STEM, algorithmic logic, and coding CoT reasoning model',
    supportsReasoning: true,
  },
  {
    id: 'o1',
    name: 'OpenAI o1 (Deep Reasoning)',
    provider: 'openai',
    description: 'Deep reasoning for complex algorithms, architecture, and mathematics',
    supportsReasoning: true,
  },
]

const SETTINGS_STORAGE_KEY = 'indoctrinated_ai_settings'
const ACTIVE_MODEL_STORAGE_KEY = 'indoctrinated_ai_active_model'
const PLAN_MODEL_STORAGE_KEY = 'indoctrinated_ai_plan_model'
const ACT_MODEL_STORAGE_KEY = 'indoctrinated_ai_act_model'
const ACTIVE_MODE_STORAGE_KEY = 'indoctrinated_ai_active_mode'
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

  private static modeListeners: Set<(state: AiModeState) => void> = new Set()
  private static inMemoryPlanModelId: string = 'deepseek-v4-pro'
  private static inMemoryActModelId: string = 'deepseek-v4-flash'
  private static inMemoryActiveMode: AiChatMode = 'plan'

  static getPlanModelId(): string {
    if (typeof localStorage !== 'undefined') {
      try {
        const item = localStorage.getItem(PLAN_MODEL_STORAGE_KEY)
        if (item) return item
      } catch {}
    }
    return this.inMemoryPlanModelId
  }

  static setPlanModelId(modelId: string): void {
    this.inMemoryPlanModelId = modelId
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(PLAN_MODEL_STORAGE_KEY, modelId)
      } catch {}
    }
    this.notifyModeListeners()
  }

  static getActModelId(): string {
    if (typeof localStorage !== 'undefined') {
      try {
        const item = localStorage.getItem(ACT_MODEL_STORAGE_KEY)
        if (item) return item
      } catch {}
    }
    return this.inMemoryActModelId
  }

  static setActModelId(modelId: string): void {
    this.inMemoryActModelId = modelId
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(ACT_MODEL_STORAGE_KEY, modelId)
      } catch {}
    }
    this.notifyModeListeners()
  }

  static getActiveMode(): AiChatMode {
    if (typeof localStorage !== 'undefined') {
      try {
        const item = localStorage.getItem(ACTIVE_MODE_STORAGE_KEY)
        if (item) return item as AiChatMode
      } catch {}
    }
    return this.inMemoryActiveMode
  }

  static setActiveMode(mode: AiChatMode): void {
    this.inMemoryActiveMode = mode
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(ACTIVE_MODE_STORAGE_KEY, mode)
      } catch {}
    }
    this.notifyModeListeners()
  }

  static getMode(): ChatMode {
    return this.getActiveMode() as ChatMode
  }

  static setMode(mode: ChatMode): void {
    this.setActiveMode(mode as AiChatMode)
  }

  static getActiveModelIdForCurrentMode(): string {
    return this.getMode() === 'plan' ? this.getPlanModelId() : this.getActModelId()
  }

  static getSystemPromptForMode(mode: ChatMode): string {
    return this.getModeSystemPrompt(mode as AiChatMode)
  }

  static subscribeMode(listener: (state: AiModeState) => void): () => void {
    this.modeListeners.add(listener)
    listener({
      mode: this.getMode(),
      planModelId: this.getPlanModelId(),
      actModelId: this.getActModelId(),
    })
    return () => {
      this.modeListeners.delete(listener)
    }
  }

  private static notifyModeListeners(): void {
    const state: AiModeState = {
      mode: this.getMode(),
      planModelId: this.getPlanModelId(),
      actModelId: this.getActModelId(),
    }
    this.modeListeners.forEach((fn) => fn(state))
  }

  static getModelForMode(mode: AiChatMode, availableModels: AiModelOption[]): AiModelOption {
    const targetId = mode === 'plan' ? this.getPlanModelId() : this.getActModelId()
    return availableModels.find((m) => m.id === targetId) || availableModels.find((m) => m.id === this.getActiveModelId()) || availableModels[0]
  }

  static getModeSystemPrompt(mode: AiChatMode): string {
    if (mode === 'plan') {
      return `You are in **Plan Mode** in IndoctrinatedEdit.
Your objective is to investigate the codebase, analyze architecture, answer questions, provide summaries, diagnose bugs, and formulate actionable implementation plans when code changes or new features are requested.

### Plan Mode Operational Guidelines:
1. **Direct Answers & Summaries**: When the user asks general questions, requests a project or file summary, asks for architecture explanations, or inquires about code logic, answer directly and clearly with the requested information. There is no need to create an implementation plan or suggest switching modes for informational queries.
2. **Read-Only / No Code Writing**: In Plan Mode, you can freely read files (\`read_file\`), search keywords (\`search_code\`), check diagnostics (\`get_workspace_diagnostics\`), inspect directory trees (\`list_workspace_files\`), and query MCP tools. You must NOT write or overwrite code files directly. Do NOT attempt to use \`propose_file_edit\`.
3. **Structured Implementation Plan (Only When Code Changes Are Requested)**: If and only if the user is asking to implement a feature, refactor code, or fix a bug, formulate a structured implementation plan with:
   - **Problem Analysis & Root Cause**: Clear explanation of what needs to be solved.
   - **Proposed Changes**: Step-by-step list of files to modify or create.
   - **Verification Strategy**: How the changes will be tested (unit tests, build checks, manual flows).`
    }

    return `You are in **Act Mode** in IndoctrinatedEdit.
Your objective is to autonomously execute implementation plans, write high-quality code, apply diffs, run tests, and verify solutions.

### Act Mode Operational Rules:
1. **Execution**: You can read files, write code (\`propose_file_edit\`), run terminal commands (\`execute_terminal_command\`), and trigger test runs.
2. **Quality & Precision**: Write clean, modern code matching the existing repository style. Avoid placeholders. Always check compiler errors and diagnostics after edits.
3. **Safety**: Destructive commands and path traversal are guarded.`
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
        let baseUrl = providerSettings.endpoint || (model.provider === 'deepseek' ? 'https://api.deepseek.com' : 'https://api.openai.com/v1')
        let cleanBase = baseUrl.trim().replace(/\/+$/, '')
        let url = cleanBase
        if (!url.endsWith('/chat/completions')) {
          url = `${url}/chat/completions`
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        if (providerSettings.apiKey) {
          const cleanKey = providerSettings.apiKey.trim()
          headers['Authorization'] = cleanKey.startsWith('Bearer ') ? cleanKey : `Bearer ${cleanKey}`
        }

        const res = await fetch(url, {
          method: 'POST',
          headers,
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

export type ChatMode = 'plan' | 'act'

export interface AiModeState {
  mode: ChatMode
  planModelId: string
  actModelId: string
}

/**
 * Determines if an AI response actually contains a structured, actionable implementation plan.
 * Used to avoid showing the 'Switch to Act Mode' handoff banner on general answers, summaries, or greetings.
 */
export function hasActionablePlan(content: string): boolean {
  if (!content || content.length < 50) return false
  const lower = content.toLowerCase()

  // Ignore default welcome and short conversational answers
  if (lower.includes("hello! i'm your **indoctrinatededit** ai assistant")) return false

  const planKeywords = [
    '### implementation plan',
    '## implementation plan',
    '# implementation plan',
    '### proposed changes',
    '## proposed changes',
    '### action plan',
    '## action plan',
    '### plan of action',
    '### steps to implement',
    '## steps to implement',
    '#### step 1',
    '### step 1',
    '**step 1:',
    '**step 1**',
    '1. **step 1',
    '**implementation steps:**',
    '**proposed changes:**',
    '**action plan:**',
  ]

  return planKeywords.some((keyword) => lower.includes(keyword))
}


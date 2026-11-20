import {
  AiModelOption,
  AiProvider,
  AiChatMode,
  AiStreamChunk,
  AiChatMessage,
  AiAutoApproveSettings,
  AutoApprovePreset,
} from '@sdk/types'
import { streamAiResponse, cancelAiStream } from '@sdk/aiCore'
import { McpService } from './mcpService'
import { AiTokenizer } from './aiTokenizer'
import { aiVaultService } from './aiVaultService'

export interface ProviderSetting {
  apiKey: string
  endpoint?: string
}

export type AiSettingsMap = Record<AiProvider, ProviderSetting>

export const DEFAULT_SETTINGS: AiSettingsMap = {
  deepseek: { apiKey: '', endpoint: 'https://api.deepseek.com' },
  gemini: { apiKey: '', endpoint: 'https://generativelanguage.googleapis.com' },
  claude: { apiKey: '', endpoint: 'https://api.anthropic.com' },
  openai: { apiKey: '', endpoint: 'https://api.openai.com/v1' },
  openrouter: { apiKey: '', endpoint: 'https://openrouter.ai/api/v1' },
  custom: { apiKey: '', endpoint: 'http://localhost:1234/v1' },
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
  // Google Gemini (Direct Google AI Studio API)
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    provider: 'gemini',
    description: 'Fast flagship model with 1M context window',
    supportsReasoning: false,
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    provider: 'gemini',
    description: 'Fast flagship model with 1M context window',
    supportsReasoning: false,
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    provider: 'gemini',
    description: 'Ultra-fast low-latency model for real-time suggestions and quick edits',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro Preview',
    provider: 'gemini',
    description: 'Preview model with deep architectural reasoning and multi-file synthesis',
    supportsReasoning: false,
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    provider: 'gemini',
    description: 'Gemini 3.5 Flash',
    supportsReasoning: false,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'gemini',
    description: 'Google’s most powerful reasoning model — 1M context, native CoT thinking, best for complex tasks',
    supportsReasoning: true,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    description: 'Fast flagship model with hybrid CoT thinking and 1M context window',
    supportsReasoning: true,
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    description: 'Ultra-fast low-latency model for real-time suggestions and quick edits',
  },

  // DeepSeek (via OpenRouter / Direct API)
  {
    id: 'deepseek/deepseek-v4.1-flash',
    name: 'DeepSeek V4.1 Flash',
    provider: 'deepseek',
    description: 'DeepSeek V4.1 Flash',
  },
  {
    id: 'deepseek/deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    provider: 'deepseek',
    description: 'DeepSeek V4 Pro',
  },
  {
    id: 'deepseek/deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    provider: 'deepseek',
    description: 'DeepSeek V4 Flash',
  },
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    description: 'DeepSeek R1: deep chain-of-thought reasoning, matches o1-level on coding benchmarks',
    supportsReasoning: true,
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3 (Chat)',
    provider: 'deepseek',
    description: 'DeepSeek-V3: state-of-the-art open-source coding and reasoning, 64k context',
  },

  // Anthropic Claude (Direct API)
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    provider: 'claude',
    description: 'State-of-the-art coding, debugging, architecture, and hybrid CoT reasoning',
    supportsReasoning: true,
  },
  {
    id: 'claude-opus-4-5',
    name: 'Claude Opus 4.5',
    provider: 'claude',
    description: 'Top-tier frontier intelligence for complex systems engineering and deep refactoring',
    supportsReasoning: true,
  },

  // OpenAI (Direct API)
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Omni flagship model for complex coding, synthesis and refactoring',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Ultra-fast and cost-efficient coding assistant',
  },
  {
    id: 'o3-mini',
    name: 'OpenAI o3-mini',
    provider: 'openai',
    description: 'Compact reasoning model optimised for coding with extended thinking',
    supportsReasoning: true,
  },

  // OpenRouter (Unified BYOK Gateway - 300+ models)
  {
    id: 'openrouter/anthropic/claude-3.7-sonnet',
    name: 'Claude 3.7 Sonnet (OpenRouter)',
    provider: 'openrouter',
    description: 'Hybrid reasoning and state-of-the-art coding via OpenRouter',
    supportsReasoning: true,
  },
  {
    id: 'openrouter/anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet (OpenRouter)',
    provider: 'openrouter',
    description: 'Industry benchmark leader for architecture, coding, and debugging',
    supportsReasoning: false,
  },
  {
    id: 'openrouter/deepseek/deepseek-r1',
    name: 'DeepSeek R1 (OpenRouter)',
    provider: 'openrouter',
    description: 'Extended chain-of-thought reasoning matching OpenAI o1-level coding',
    supportsReasoning: true,
  },
  {
    id: 'openrouter/deepseek/deepseek-chat',
    name: 'DeepSeek V3 (OpenRouter)',
    provider: 'openrouter',
    description: 'Fast, highly cost-efficient flagship open model for coding',
  },
  {
    id: 'openrouter/openai/gpt-4o',
    name: 'GPT-4o (OpenRouter)',
    provider: 'openrouter',
    description: 'OpenAI flagship model with multimodal understanding via OpenRouter',
  },
  {
    id: 'openrouter/google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash (OpenRouter)',
    provider: 'openrouter',
    description: 'Ultra-low latency with massive context via OpenRouter',
  },
  {
    id: 'openrouter/qwen/qwen-2.5-coder-32b-instruct',
    name: 'Qwen 2.5 Coder 32B (OpenRouter)',
    provider: 'openrouter',
    description: 'Leading specialized open-source coding model',
  },

  // Ollama Local Models (Zero Cost, Offline, Private)
  {
    id: 'llama3.3:latest',
    name: 'Llama 3.3 70B (Ollama)',
    provider: 'ollama',
    description: 'Meta Llama 3.3 flagship open model running locally via Ollama',
  },
  {
    id: 'qwen2.5-coder:32b',
    name: 'Qwen 2.5 Coder 32B (Ollama)',
    provider: 'ollama',
    description: 'Premier local code generation, refactoring, and reasoning model',
  },
  {
    id: 'qwen2.5-coder:7b',
    name: 'Qwen 2.5 Coder 7B (Ollama)',
    provider: 'ollama',
    description: 'Lightweight, ultra-fast local code completion and editing',
  },
  {
    id: 'deepseek-r1:14b',
    name: 'DeepSeek R1 Distill 14B (Ollama)',
    provider: 'ollama',
    description: 'Local chain-of-thought reasoning distilled from DeepSeek R1',
    supportsReasoning: true,
  },
  {
    id: 'deepseek-r1:8b',
    name: 'DeepSeek R1 Distill 8B (Ollama)',
    provider: 'ollama',
    description: 'Compact 8B reasoning model with native thinking process',
    supportsReasoning: true,
  },
  {
    id: 'mistral:latest',
    name: 'Mistral 7B (Ollama)',
    provider: 'ollama',
    description: 'High performance general instruction and code companion',
  },

  // Custom OpenAI-Compatible Endpoints (LM Studio, vLLM, Groq, Mistral, etc.)
  {
    id: 'custom-model',
    name: 'Custom / Local Model',
    provider: 'custom',
    description: 'Connect to LM Studio, vLLM, Groq, Together AI, or custom server',
  },
]

const ACTIVE_MODEL_STORAGE_KEY = 'indoctrinated_ai_active_model'
const PLAN_MODEL_STORAGE_KEY = 'indoctrinated_ai_plan_model'
const ACT_MODEL_STORAGE_KEY = 'indoctrinated_ai_act_model'
const ACTIVE_MODE_STORAGE_KEY = 'indoctrinated_ai_active_mode'
const AUTO_APPROVE_STORAGE_KEY = 'indoctrinated_ai_auto_approve'

export class AiService {
  private static autoApproveSettings: AiAutoApproveSettings | null = null
  private static autoApproveListeners: Set<(settings: AiAutoApproveSettings) => void> = new Set()

  private static encodeStorageKeyPart(str: string): string {
    try {
      const bytes = new TextEncoder().encode(str)
      let bin = ''
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
      return btoa(bin).replace(/[+/=]/g, (c) => (c === '+' ? '-' : c === '/' ? '_' : ''))
    } catch {
      return encodeURIComponent(str)
    }
  }

  static getChatHistory(workspaceRoot: string, modelId: string): AiChatMessage[] | null {
    if (typeof localStorage === 'undefined' || !workspaceRoot) return null
    try {
      const encoded = this.encodeStorageKeyPart(workspaceRoot)
      const key = `indoctrinated_ai_history_${encoded}_${modelId}`
      let raw = localStorage.getItem(key)
      // Backward compatibility fallback for existing ASCII btoa keys
      if (!raw) {
        try {
          raw = localStorage.getItem(`indoctrinated_ai_history_${btoa(workspaceRoot)}_${modelId}`)
        } catch {
          // ignore non-Latin1 legacy fallback
        }
      }
      if (raw) {
        return JSON.parse(raw) as AiChatMessage[]
      }
    } catch (err) {
      console.warn('Failed to load chat history', err)
    }
    return null
  }

  static saveChatHistory(workspaceRoot: string, modelId: string, messages: AiChatMessage[]): void {
    if (typeof localStorage === 'undefined' || !workspaceRoot) return
    try {
      // Hard truncate history to avoid localStorage quota issues
      let historyToSave = messages
      // Keep a sliding window of up to 40 messages (welcome + 39 most recent) to prevent localStorage bloat
      // while preserving full multi-turn conversational continuity.
      if (historyToSave.length > 40) {
        const welcome = historyToSave[0]
        const recent = historyToSave.slice(-39)
        historyToSave = [welcome, ...recent]
      }

      const key = `indoctrinated_ai_history_${this.encodeStorageKeyPart(workspaceRoot)}_${modelId}`
      localStorage.setItem(key, JSON.stringify(historyToSave))
    } catch (err) {
      console.warn('Failed to save chat history', err)
    }
  }

  static clearChatHistory(workspaceRoot: string, modelId: string): void {
    if (typeof localStorage === 'undefined' || !workspaceRoot) return
    try {
      const key = `indoctrinated_ai_history_${this.encodeStorageKeyPart(workspaceRoot)}_${modelId}`
      localStorage.removeItem(key)
      try {
        localStorage.removeItem(`indoctrinated_ai_history_${btoa(workspaceRoot)}_${modelId}`)
      } catch {
        // ignore non-Latin1 legacy key
      }
    } catch (err) {
      console.warn('Failed to clear chat history', err)
    }
  }

  static getSettings(): AiSettingsMap {
    return aiVaultService.getSettings()
  }

  static saveSettings(newSettings: AiSettingsMap): void {
    aiVaultService.saveSettings(newSettings)
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
      const stored = localStorage.getItem(ACTIVE_MODEL_STORAGE_KEY)
      if (stored && PRESET_MODELS.some((m) => m.id === stored)) return stored
    }
    return 'gemini-2.5-flash'
  }

  static setActiveModelId(modelId: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, modelId)
    }
  }

  private static modeListeners: Set<(state: AiModeState) => void> = new Set()
  private static inMemoryPlanModelId: string = 'gemini-2.5-pro'
  private static inMemoryActModelId: string = 'gemini-2.5-flash'
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

  /**
   * Resolves the active `AiModelOption` for any consumer (AI Chat, Inline Copilot, etc.),
   * supporting preset BYOK models, local Ollama models, and custom OpenAI-compatible IDs.
   */
  static resolveActiveModelOption(preferredId?: string): AiModelOption {
    const targetId = preferredId || this.getActiveModelIdForCurrentMode() || this.getActiveModelId() || 'gemini-2.5-flash'
    const preset = PRESET_MODELS.find((m) => m.id === targetId)
    if (preset) return preset

    // Dynamically construct model descriptor for custom / pulled Ollama / OpenRouter slugs
    if (targetId.includes(':')) {
      return {
        id: targetId,
        name: targetId,
        provider: 'ollama',
        description: 'Local Ollama Model',
      }
    }
    if (targetId.includes('/')) {
      return {
        id: targetId,
        name: targetId,
        provider: 'openrouter',
        description: 'OpenRouter Model',
      }
    }
    return PRESET_MODELS.find((m) => m.id === 'gemini-2.5-flash') || PRESET_MODELS[0]
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

  static getModeSystemPrompt(mode: AiChatMode): string {
    if (mode === 'plan') {
      return `You are in **Plan Mode** in IndoctrinatedEdit.
Your objective is to investigate the codebase, analyze architecture, answer questions, provide summaries, diagnose bugs, and formulate actionable implementation plans when code changes or new features are requested.

### Plan Mode Operational Guidelines:
1. **Direct Answers & Summaries**: When the user asks general questions, requests a project or file summary, asks for architecture explanations, or inquires about code logic, answer directly and clearly with the requested information. There is no need to create an implementation plan or suggest switching modes for informational queries.
2. **Read-Only / No Code Writing**: In Plan Mode, you can freely read files (\`read_file\`), search keywords (\`search_code\`), check diagnostics (\`get_editor_diagnostics\`), inspect directory trees (\`list_workspace_files\`), and query MCP tools. You must NOT write or overwrite code files directly. Do NOT attempt to use \`propose_file_edit\`.
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

  /**
   * Automatically discovers and loads project-specific instructions from workspace root:
   * .indoctrinatedrules, .cursorrules, .clinerules, AGENTS.md, or INSTRUCTIONS.md
   */
  static async loadWorkspaceRules(workspaceRoot: string): Promise<{ fileName: string; content: string } | null> {
    if (!workspaceRoot) return null

    const candidates = [
      '.indoctrinatedrules',
      '.cursorrules',
      '.clinerules',
      'AGENTS.md',
      'INSTRUCTIONS.md',
    ]

    for (const fileName of candidates) {
      try {
        const separator = workspaceRoot.includes('\\') ? '\\' : '/'
        const cleanRoot = workspaceRoot.replace(/[/\\]+$/, '')
        const fullPath = `${cleanRoot}${separator}${fileName}`

        if (typeof window !== 'undefined' && window.electronAPI?.readFile) {
          const content = await window.electronAPI.readFile(fullPath)
          if (content && typeof content === 'string' && content.trim().length > 0) {
            return { fileName, content: content.trim() }
          }
        }
      } catch {
        // Continue searching next candidate if file doesn't exist
      }
    }
    return null
  }

  static async fetchOllamaModels(host = 'http://localhost:11434'): Promise<AiModelOption[]> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.ai?.listOllamaModels) {
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
   * Intelligently compacts conversation history when approaching context limits.
   * Multi-stage compaction:
   * 1. In-place tool output and log compaction on older turns (preserving conversational structure).
   * 2. Semantic sliding window preserving:
   *    - Pinned welcome / system preamble
   *    - The original user task goal (first user message)
   *    - The recent N conversational turns intact
   *    - Atomicity: Tool calls and their corresponding tool results are kept or pruned together.
   */
  static trimConversationHistory(
    messages: AiChatMessage[],
    systemPrompt: string,
    modelId: string
  ): AiChatMessage[] {
    const limit = AiTokenizer.getModelContextLimit(modelId)
    const est = (s: string) => AiTokenizer.estimateTokens(s || '')
    const sysTokens = est(systemPrompt)
    const budget = Math.floor(limit * 0.80) - sysTokens // use 80% max, leave headroom

    const getMsgTokens = (m: AiChatMessage) => {
      let total = est(m.content) + est(m.reasoning || '')
      if (m.toolCalls) {
        for (const call of m.toolCalls) {
          total += est(JSON.stringify(call.arguments))
        }
      }
      if (m.toolResults) {
        for (const res of m.toolResults) {
          total += est(res.output) + est(res.error || '')
        }
      }
      return total
    }

    // Step 0: Check if already under budget
    const totalNow = messages.reduce((acc, m) => acc + getMsgTokens(m), 0)
    if (totalNow <= budget) return messages

    // Step 1: In-Place Tool Output Compaction on older turns
    // For messages older than the last 4 turns, compact verbose tool outputs and result logs
    const keepTail = 4
    const headThreshold = Math.max(0, messages.length - keepTail)
    const stage1Messages: AiChatMessage[] = messages.map((msg, index) => {
      if (index >= headThreshold) return msg // keep recent turns intact

      let modified = false
      let newContent = msg.content
      let newToolResults = msg.toolResults

      // Compact tool results
      if (msg.toolResults && msg.toolResults.length > 0) {
        newToolResults = msg.toolResults.map((r) => {
          if (r.output && r.output.length > 250) {
            modified = true
            const compact = AiTokenizer.compactToolOutput(r.output, { maxLines: 12, maxChars: 600 })
            return { ...r, output: compact.content }
          }
          return r
        })
      }

      // Compact tool result blocks formatted inside message content
      if (newContent && newContent.includes('```') && (newContent.includes('Tool `') || newContent.includes('result:'))) {
        const compact = AiTokenizer.compactToolOutput(newContent, { maxLines: 18, maxChars: 1200 })
        if (compact.truncated) {
          modified = true
          newContent = compact.content
        }
      }

      if (modified) {
        return {
          ...msg,
          content: newContent,
          toolResults: newToolResults,
        }
      }
      return msg
    })

    const stage1Tokens = stage1Messages.reduce((acc, m) => acc + getMsgTokens(m), 0)
    if (stage1Tokens <= budget) return stage1Messages

    // Step 2: Semantic Sliding Window with Goal Retention & Call/Result Atomicity
    // Always preserve:
    // 1. messages[0] (Welcome/Intro)
    // 2. The original user task goal (first message with role === 'user')
    // 3. The last `keepRecent` messages
    if (stage1Messages.length <= 4) return stage1Messages

    const welcome = stage1Messages[0]
    // Find first user task message
    const firstUserIndex = stage1Messages.findIndex((m, i) => i > 0 && m.role === 'user')
    const firstUserTask = firstUserIndex > 0 ? stage1Messages[firstUserIndex] : null

    // Determine the tail boundary
    let tailStart = Math.max(
      firstUserIndex > 0 ? firstUserIndex + 1 : 1,
      stage1Messages.length - keepTail
    )

    // Atomicity check: Never start the tail on an orphaned tool result
    if (tailStart < stage1Messages.length && stage1Messages[tailStart].role === 'user' && stage1Messages[tailStart].content?.startsWith('Tool `')) {
      // Step back one to include the paired assistant tool call if available
      if (tailStart > 1 && stage1Messages[tailStart - 1].role === 'assistant') {
        tailStart--
      }
    }

    const tailMessages = stage1Messages.slice(tailStart)
    const middlePruned = stage1Messages.slice(
      firstUserIndex > 0 ? firstUserIndex + 1 : 1,
      tailStart
    )

    const compactedNotice: AiChatMessage = {
      id: `compact-summary-${Date.now()}`,
      role: 'user',
      content: `[System Compaction Notice: ${middlePruned.length} intermediate conversational turns compacted to optimize context window while preserving user goal and active workspace state.]`,
      timestamp: Date.now(),
    }

    const result: AiChatMessage[] = [welcome]
    if (firstUserTask && firstUserTask !== welcome) {
      result.push(firstUserTask)
    }
    if (middlePruned.length > 0) {
      result.push(compactedNotice)
    }
    result.push(...tailMessages)

    return result
  }

  /**
   * Stream a prompt request via Vercel AI SDK (Electron IPC when available for zero CORS,
   * or direct isomorphic Vercel AI SDK fallback in browser/Vite preview mode).
   */
  static streamChat(
    model: AiModelOption,
    messages: AiChatMessage[],
    onChunk: (chunk: AiStreamChunk) => void,
    modeOrOptions?: AiChatMode | {
      mode?: AiChatMode
      disableTools?: boolean
      temperature?: number
      maxOutputTokens?: number
    }
  ): () => void {
    const requestId = `ai-req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const settings = this.getSettings()
    const providerSettings = settings[model.provider] || { apiKey: '', endpoint: '' }
    const streamOpts = typeof modeOrOptions === 'string' ? { mode: modeOrOptions } : (modeOrOptions || {})
    const effectiveMode = streamOpts.mode ?? this.getActiveMode()
    const disableTools = Boolean(streamOpts.disableTools)

    // Format chat messages including attachments and tool call results (deduplicating
    // tool results that are already carried by an immediately following internal tool-result message)
    const formattedMessages = messages.map((m, idx) => {
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
        const nextMsg = messages[idx + 1]
        const nextIsToolResult = Boolean(
          nextMsg && (nextMsg.isInternalToolResult || nextMsg.id?.startsWith('tool-result-'))
        )
        const nonDuplicatedResults = nextIsToolResult
          ? m.toolResults.filter((tr) => {
              const snippet = (tr.output || tr.error || '').slice(0, 80).trim()
              const hasName = nextMsg.content.includes(`Tool \`${tr.toolName}\` result:`)
              return !(hasName && (!snippet || nextMsg.content.includes(snippet)))
            })
          : m.toolResults

        if (nonDuplicatedResults.length > 0) {
          const resultsText = nonDuplicatedResults
            .map((tr) => `\n<tool_result name="${tr.toolName}" success="${tr.success}">\n${tr.error ? `<error>${tr.error}</error>` : ''}\n<output>\n${tr.output}\n</output>\n</tool_result>`)
            .join('\n')
          content = `${content}\n${resultsText}`
        }
      }

      return {
        role: m.role,
        content,
      }
    })

    // Collect enabled dynamic MCP tools via McpService's canonical Vercel AI SDK bridge
    let extraTools: Array<{ name: string; description?: string; parameters?: Record<string, any>; requiredParams?: string[] }> | undefined
    if (!disableTools) {
      try {
        const mcpExtra = McpService.toAiSdkExtraTools()
        if (mcpExtra.length > 0) {
          extraTools = mcpExtra
        }
      } catch {
        // Fallback if McpService not ready
      }
    }

    const requestOptions = {
      provider: model.provider,
      model: model.id,
      messages: formattedMessages,
      apiKey: providerSettings.apiKey,
      endpoint: providerSettings.endpoint,
      mode: effectiveMode,
      disableTools,
      temperature: streamOpts.temperature,
      maxOutputTokens: streamOpts.maxOutputTokens,
      extraTools,
    }

    // If Electron IPC is available, route through main process (zero CORS restrictions)
    if (typeof window !== 'undefined' && window.electronAPI?.ai?.startStream) {
      return window.electronAPI.ai.startStream(requestId, requestOptions, onChunk)
    }

    // Browser / Vite preview fallback: use the exact same Vercel AI SDK v7 engine
    // instead of hand-rolled fetch/SSE parsers (full native tools, reasoning extraction,
    // prompt caching, activeTools enforcement, tool call repair, and usage telemetry).
    void streamAiResponse(
      requestId,
      {
        ...requestOptions,
        isBrowserFallback: true,
      },
      onChunk
    )

    return () => {
      cancelAiStream(requestId)
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


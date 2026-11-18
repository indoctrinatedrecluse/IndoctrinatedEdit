import {
  streamText,
  tool,
  dynamicTool,
  smoothStream,
  jsonSchema,
  pruneMessages,
  wrapLanguageModel,
  extractReasoningMiddleware,
  parsePartialJson,
  APICallError,
  RetryError,
  LoadAPIKeyError,
  NoSuchToolError,
  InvalidToolInputError,
} from 'ai'
import { z } from 'zod'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { AiProvider, AiStreamChunk, AiToolCall, AiToolCategory, AiChatMode } from './types'

export interface AiRequestOptions {
  provider: AiProvider
  model: string
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  apiKey?: string
  endpoint?: string
  mode?: AiChatMode
  /** When true, omits all workspace & MCP tools (used for pure inline code transforms like InlineCopilotWidget) */
  disableTools?: boolean
  temperature?: number
  maxOutputTokens?: number
  maxRetries?: number
  /** Set true when invoked directly from a browser renderer (enables browser-safe CORS headers where supported) */
  isBrowserFallback?: boolean
  extraTools?: Array<{
    name: string
    description?: string
    parameters?: Record<string, any>
    requiredParams?: string[]
  }>
}

/**
 * Read-only workspace tools permitted when operating in Plan Mode.
 * Enforced at the LLM schema level via Vercel AI SDK `activeTools`.
 */
export const PLAN_MODE_READ_ONLY_TOOLS = [
  'read_file',
  'list_workspace_files',
  'search_code',
  'get_editor_diagnostics',
  'get_git_status',
  'get_git_diff',
  'open_editor_file',
] as const

const WRITE_OR_EXEC_TOOLS = new Set([
  'write_file',
  'propose_file_edit',
  'execute_terminal_command',
  'trigger_project_run',
])

/**
 * Common hallucinated tool-name aliases emitted by smaller / local models (e.g. Ollama, Qwen, Llama).
 * Used by Vercel AI SDK `experimental_repairToolCall` to transparently recover without an extra turn.
 */
const TOOL_NAME_ALIASES: Record<string, string> = {
  readfile: 'read_file',
  get_file: 'read_file',
  view_file: 'read_file',
  cat_file: 'read_file',
  writefile: 'write_file',
  create_file: 'write_file',
  save_file: 'write_file',
  edit_file: 'propose_file_edit',
  proposeedit: 'propose_file_edit',
  replace_in_file: 'propose_file_edit',
  patch_file: 'propose_file_edit',
  list_files: 'list_workspace_files',
  list_dir: 'list_workspace_files',
  ls: 'list_workspace_files',
  search: 'search_code',
  grep: 'search_code',
  grep_search: 'search_code',
  find_in_files: 'search_code',
  get_diagnostics: 'get_editor_diagnostics',
  get_workspace_diagnostics: 'get_editor_diagnostics',
  diagnostics: 'get_editor_diagnostics',
  git_status: 'get_git_status',
  git_diff: 'get_git_diff',
  run_command: 'execute_terminal_command',
  run_shell_command: 'execute_terminal_command',
  bash: 'execute_terminal_command',
  shell: 'execute_terminal_command',
  terminal: 'execute_terminal_command',
  run_project: 'trigger_project_run',
  open_file: 'open_editor_file',
}

/**
 * Computes the SDK `activeTools` allowlist based on active chat mode.
 * In Plan Mode, mutating write/shell tools are stripped at the API schema layer.
 */
export function getActiveToolsForMode(
  mode: AiChatMode | undefined,
  allToolNames: string[]
): string[] | undefined {
  if (mode !== 'plan') return undefined
  return allToolNames.filter((name) => !WRITE_OR_EXEC_TOOLS.has(name))
}

/**
 * Normalizes messages for strict multi-provider compliance (Anthropic, Gemini, OpenAI, DeepSeek):
 * 1. Strips empty messages that cause 400 Bad Request errors on Anthropic/Gemini.
 * 2. Merges consecutive same-role messages so user/assistant turns strictly alternate.
 * 3. Runs Vercel AI SDK's `pruneMessages` to remove stale reasoning & empty artifacts.
 */
export function normalizeMessagesForProvider(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const merged: Array<{ role: 'user' | 'assistant'; content: string }> = []

  for (const m of messages) {
    if (m.role === 'system') continue
    const text = (m.content || '').trim()
    if (!text) continue

    const role = m.role as 'user' | 'assistant'
    const last = merged[merged.length - 1]
    if (last && last.role === role) {
      last.content = `${last.content}\n\n${text}`
    } else {
      merged.push({ role, content: text })
    }
  }

  return pruneMessages({
    messages: merged,
    reasoning: 'before-last-message',
    emptyMessages: 'remove',
  }) as Array<{ role: 'user' | 'assistant'; content: string }>
}

/**
 * Deterministic tool call repair for Vercel AI SDK `experimental_repairToolCall`:
 * - Maps common model tool-name aliases / camelCase hallucinations back to registered tool names.
 * - Uses Vercel AI SDK's `parsePartialJson` to rescue malformed / markdown-fenced JSON inputs.
 */
export async function repairWorkspaceToolCall(params: {
  toolCall: { type: 'tool-call'; toolCallId: string; toolName: string; input: string }
  tools: Record<string, any>
  error: NoSuchToolError | InvalidToolInputError
}): Promise<{ type: 'tool-call'; toolCallId: string; toolName: string; input: string } | null> {
  const { toolCall, tools, error } = params
  let repairedName = toolCall.toolName
  let repairedInput = toolCall.input

  // 1. Repair hallucinated or case-mismatched tool names
  if (NoSuchToolError.isInstance(error) || !tools[repairedName]) {
    const normalized = repairedName.trim().toLowerCase().replace(/[\s-]+/g, '_')
    const compact = normalized.replace(/_/g, '')
    const candidate =
      (tools[normalized] ? normalized : undefined) ||
      TOOL_NAME_ALIASES[normalized] ||
      TOOL_NAME_ALIASES[compact]

    if (candidate && tools[candidate]) {
      repairedName = candidate
    } else {
      return null
    }
  }

  // 2. Repair malformed JSON tool arguments using Vercel AI SDK's `parsePartialJson`
  if (InvalidToolInputError.isInstance(error) || typeof repairedInput === 'string') {
    const stripped = repairedInput
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    if (stripped !== repairedInput || InvalidToolInputError.isInstance(error)) {
      const parsed = await parsePartialJson(stripped)
      if (parsed.value && typeof parsed.value === 'object' && !Array.isArray(parsed.value)) {
        repairedInput = JSON.stringify(parsed.value)
      } else if (InvalidToolInputError.isInstance(error)) {
        return null
      }
    }
  }

  if (repairedName === toolCall.toolName && repairedInput === toolCall.input) {
    return null
  }

  return {
    type: 'tool-call',
    toolCallId: toolCall.toolCallId,
    toolName: repairedName,
    input: repairedInput,
  }
}

/**
 * Formats Vercel AI SDK typed errors into concise, actionable BYOK diagnostics.
 */
export function formatAiSdkError(err: unknown): string {
  if (RetryError.isInstance(err)) {
    const last = err.lastError
    const inner = last ? formatAiSdkError(last) : err.message
    return `${inner} (after retries)`
  }

  if (LoadAPIKeyError.isInstance(err)) {
    return 'API key is missing. Add your provider API key in AI Settings.'
  }

  if (APICallError.isInstance(err)) {
    const status = err.statusCode
    if (status === 401) {
      return `Authentication failed (401): Invalid or expired API key. Verify your credentials in AI Settings.`
    }
    if (status === 402) {
      return `Insufficient balance (402): Your provider account (e.g., OpenRouter/DeepSeek) has run out of credits.`
    }
    if (status === 403) {
      return `Access denied (403): Your API key does not have permission for this model or endpoint.`
    }
    if (status === 404) {
      return `Model or endpoint not found (404): Verify the model ID and base URL in AI Settings.`
    }
    if (status === 429) {
      return `Rate limit exceeded (429): Too many requests or quota reached. Wait a moment or switch models.`
    }
    if (status && status >= 500) {
      return `Provider service error (${status}): The upstream model API is temporarily unavailable.`
    }
    const msg = err.message || String(err)
    if (/ECONNREFUSED|Failed to fetch|fetch failed/i.test(msg)) {
      return `Cannot connect to endpoint (${err.url || 'local host'}). Verify the server (e.g. Ollama/LM Studio) is running.`
    }
    return msg
  }

  return err instanceof Error ? err.message : String(err)
}

// Active abort controllers for stream cancellation
const activeStreams = new Map<string, AbortController>()

export function cancelAiStream(requestId: string): void {
  const controller = activeStreams.get(requestId)
  if (controller) {
    controller.abort()
    activeStreams.delete(requestId)
  }
}

export async function listOllamaModels(host = 'http://localhost:11434'): Promise<string[]> {
  try {
    const url = host.replace(/\/+$/, '') + '/api/tags'
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return []
    const data = (await res.json()) as { models?: Array<{ name: string }> }
    return data.models?.map((m) => m.name) || []
  } catch {
    return []
  }
}

function getToolCategory(toolName: string): AiToolCategory {
  if (['write_file', 'propose_file_edit'].includes(toolName)) return 'write'
  if (['execute_terminal_command', 'trigger_project_run'].includes(toolName)) return 'run'
  if (['get_git_status', 'get_git_diff'].includes(toolName)) return 'git'
  if (toolName.startsWith('mcp_') || ['fetch_markdown', 'search_gemini_docs', 'get_gemini_doc'].includes(toolName)) {
    return 'browser'
  }
  return 'read'
}

export const workspaceTools = {
  read_file: tool({
    description: 'Reads the content of a file in the workspace, with optional line range slices.',
    inputSchema: z.object({
      filePath: z.string().describe('Relative or absolute path to the file to read'),
      startLine: z.number().optional().describe('Optional 1-indexed starting line number'),
      endLine: z.number().optional().describe('Optional 1-indexed ending line number'),
    }),
  }),
  write_file: tool({
    description: 'Creates a new file or completely overwrites an existing file in the workspace with new content.',
    inputSchema: z.object({
      filePath: z.string().describe('Relative or absolute path to the file to create or overwrite'),
      content: z.string().describe('The complete file contents to write'),
    }),
  }),
  propose_file_edit: tool({
    description: 'Proposes an edit or replacement to a file in the workspace with unified diff preview.',
    inputSchema: z.object({
      filePath: z.string().describe('Target file path to modify'),
      originalSnippet: z.string().optional().describe('Exact code snippet to replace (if partial edit)'),
      newSnippet: z.string().optional().describe('New replacement code snippet'),
      fullContent: z.string().optional().describe('Complete file content if replacing entire file'),
      description: z.string().optional().describe('Human-readable explanation of why this change is made'),
    }),
  }),
  list_workspace_files: tool({
    description: 'Lists files and folders in the workspace or a given subfolder.',
    inputSchema: z.object({
      folderPath: z.string().optional().describe('Optional subfolder path to list'),
      maxDepth: z.number().optional().describe('Maximum directory recursion depth (default 2)'),
    }),
  }),
  search_code: tool({
    description: 'Searches for text or regex patterns across workspace files.',
    inputSchema: z.object({
      query: z.string().describe('Text or regular expression to search for'),
      isRegex: z.boolean().optional().describe('Whether the query is a regular expression'),
      filePattern: z.string().optional().describe('Optional glob filter (e.g. *.ts, src/*)'),
    }),
  }),
  get_editor_diagnostics: tool({
    description: 'Retrieves current compiler, linter, and editor errors and warnings across open files.',
    inputSchema: z.object({
      severity: z.enum(['error', 'warning', 'info', 'all']).optional().describe('Filter by severity'),
      filePath: z.string().optional().describe('Optional specific file path filter'),
    }),
  }),
  get_git_status: tool({
    description: 'Retrieves current Git repository status including branch, ahead/behind counts, and staged/unstaged changes.',
    inputSchema: z.object({}),
  }),
  get_git_diff: tool({
    description: 'Retrieves current working tree or staged Git diffs.',
    inputSchema: z.object({
      stagedOnly: z.boolean().optional().describe('If true, only returns staged changes'),
    }),
  }),
  execute_terminal_command: tool({
    description: 'Executes a command in the integrated terminal with timeout protection.',
    inputSchema: z.object({
      command: z.string().describe('Shell command line to execute (e.g. npm test, cargo check)'),
      cwd: z.string().optional().describe('Optional working directory'),
      timeoutMs: z.number().optional().describe('Execution timeout in milliseconds (default 15000)'),
    }),
  }),
  trigger_project_run: tool({
    description: 'Triggers the configured Run Profile for the active project or file.',
    inputSchema: z.object({
      targetLanguageOrId: z.string().optional().describe('Optional run profile ID or language name'),
    }),
  }),
  open_editor_file: tool({
    description: 'Instructs the editor to open a file and navigate to a specific line and column.',
    inputSchema: z.object({
      filePath: z.string().describe('File path to open in editor'),
      line: z.number().optional().describe('1-indexed line number to navigate to'),
      column: z.number().optional().describe('1-indexed column number'),
    }),
  }),
}

/**
 * Resolves the appropriate Vercel AI SDK LanguageModel for any BYOK provider and wraps it
 * with `extractReasoningMiddleware` so inline `<think>...</think>` streams (e.g. Ollama DeepSeek-R1,
 * Qwen QwQ, OpenRouter/vLLM models) natively flow into the Reasoning CoT accordion.
 */
export function resolveLanguageModel(options: AiRequestOptions) {
  const { provider, model, apiKey = '', endpoint, isBrowserFallback } = options
  const cleanKey = (apiKey || '').trim()

  let baseModel: any

  if (provider === 'gemini') {
    const cleanModel = model.replace(/^models\//, '')
    const google = createGoogleGenerativeAI({
      apiKey: cleanKey,
      baseURL: endpoint && !endpoint.includes('generativelanguage.googleapis.com') ? endpoint : undefined,
    })
    baseModel = google(cleanModel)
  } else if (provider === 'claude') {
    const anthropic = createAnthropic({
      apiKey: cleanKey,
      baseURL: endpoint || undefined,
      headers: isBrowserFallback
        ? { 'anthropic-dangerous-direct-browser-access': 'true' }
        : undefined,
    })
    baseModel = anthropic(model)
  } else if (provider === 'openrouter') {
    const openrouterClient = createOpenAI({
      apiKey: cleanKey,
      baseURL: endpoint || 'https://openrouter.ai/api/v1',
      headers: {
        'HTTP-Referer': 'https://indoctrinated.dev',
        'X-Title': 'IndoctrinatedEdit',
      },
    })
    const targetModel = model.replace(/^openrouter\//, '')
    baseModel = openrouterClient.chat(targetModel)
  } else if (provider === 'deepseek') {
    const isOpenRouterKey = cleanKey.startsWith('sk-or-v1-')
    let targetEndpoint = endpoint || (isOpenRouterKey ? 'https://openrouter.ai/api/v1' : 'https://api.deepseek.com')
    if (isOpenRouterKey && targetEndpoint === 'https://api.deepseek.com') {
      targetEndpoint = 'https://openrouter.ai/api/v1'
    }
    let targetModel = model
    if (targetEndpoint.includes('openrouter.ai') && !targetModel.includes('/')) {
      targetModel = targetModel === 'deepseek-reasoner' ? 'deepseek/deepseek-r1' : `deepseek/${targetModel}`
    }
    const deepseekClient = createOpenAI({
      apiKey: cleanKey,
      baseURL: targetEndpoint,
      headers: isOpenRouterKey
        ? {
            'HTTP-Referer': 'https://indoctrinated.dev',
            'X-Title': 'IndoctrinatedEdit',
          }
        : undefined,
    })
    baseModel = deepseekClient.chat(targetModel)
  } else if (provider === 'ollama') {
    const ollamaEndpoint = (endpoint || 'http://localhost:11434').replace(/\/+$/, '')
    const ollamaClient = createOpenAI({
      baseURL: ollamaEndpoint.endsWith('/v1') ? ollamaEndpoint : `${ollamaEndpoint}/v1`,
      apiKey: 'ollama',
    })
    baseModel = ollamaClient.chat(model)
  } else if (provider === 'custom') {
    const customClient = createOpenAI({
      apiKey: cleanKey || 'custom-key',
      baseURL: endpoint || 'http://localhost:1234/v1',
    })
    baseModel = customClient.chat(model)
  } else {
    const openaiClient = createOpenAI({
      apiKey: cleanKey,
      baseURL: endpoint || undefined,
    })
    baseModel = openaiClient.chat(model)
  }

  return wrapLanguageModel({
    model: baseModel,
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  })
}

export async function streamAiResponse(
  requestId: string,
  options: AiRequestOptions,
  onChunk: (chunk: AiStreamChunk) => void
): Promise<void> {
  const controller = new AbortController()
  activeStreams.set(requestId, controller)

  try {
    const { provider, model, messages, endpoint, mode, disableTools } = options
    const aiModel = resolveLanguageModel(options)

    const systemMsg = messages.find((m) => m.role === 'system')?.content
    const chatMessages = normalizeMessagesForProvider(messages)

    // Bridge dynamic MCP tools via Vercel AI SDK's purpose-built `dynamicTool` + `jsonSchema`
    // Skipped entirely when `disableTools: true` (e.g. Inline Copilot pure code transformations)
    let combinedTools: Record<string, any> | undefined
    let activeTools: string[] | undefined

    if (!disableTools) {
      combinedTools = { ...workspaceTools }
      if (options.extraTools && Array.isArray(options.extraTools)) {
        for (const t of options.extraTools) {
          if (!combinedTools[t.name]) {
            const hasTypedParams = t.parameters && Object.keys(t.parameters).length > 0
            combinedTools[t.name] = dynamicTool({
              description: t.description || `Dynamic MCP Tool: ${t.name}`,
              inputSchema: hasTypedParams
                ? jsonSchema({
                    type: 'object',
                    properties: t.parameters as Record<string, any>,
                    required: t.requiredParams || [],
                    additionalProperties: true,
                  })
                : z.record(z.string(), z.any()),
            })
          }
        }
      }

      // Enforce Plan Mode read-only tool boundaries natively via Vercel AI SDK `activeTools`
      activeTools = getActiveToolsForMode(mode, Object.keys(combinedTools))
    }

    // Strict reasoning models (o1, o3, DeepSeek R1/Reasoner) reject custom temperature values
    const isStrictReasoningModel = /(^|\/)(o1|o3|deepseek-r1|deepseek-reasoner)/i.test(model)
    const isLocalEndpoint = provider === 'ollama' || /localhost|127\.0\.0\.1/i.test(endpoint || '')
    const effectiveRetries = options.maxRetries ?? (isLocalEndpoint ? 0 : 2)

    // Leverage Vercel AI SDK providerOptions for Prompt Caching (Claude) & Native Thoughts (Gemini)
    const providerOptions: Record<string, any> = {}
    if (provider === 'claude') {
      providerOptions.anthropic = {
        cacheControl: { type: 'ephemeral' },
      }
    } else if (provider === 'gemini' && /gemini-2\.5|gemini-3\./i.test(model)) {
      providerOptions.google = {
        thinkingConfig: { includeThoughts: true },
      }
    }

    // Build messages array (injecting cached system message for Anthropic when present)
    const finalMessages: any[] =
      provider === 'claude' && systemMsg
        ? [
            {
              role: 'system',
              content: systemMsg,
              providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
            },
            ...chatMessages,
          ]
        : chatMessages

    const streamResult = streamText({
      model: aiModel,
      system: provider === 'claude' ? undefined : systemMsg,
      messages: finalMessages,
      ...(combinedTools ? { tools: combinedTools } : {}),
      ...(activeTools ? { activeTools } : {}),
      maxOutputTokens: options.maxOutputTokens ?? 8192,
      ...(isStrictReasoningModel ? {} : { temperature: options.temperature ?? 0.2 }),
      ...(Object.keys(providerOptions).length > 0 ? { providerOptions } : {}),
      experimental_transform: smoothStream({ delayInMs: 10, chunking: 'word' }),
      ...(combinedTools
        ? {
            experimental_repairToolCall: async ({ toolCall, tools, error }) =>
              repairWorkspaceToolCall({ toolCall, tools, error }),
          }
        : {}),
      abortSignal: controller.signal,
      maxRetries: effectiveRetries,
    })

    let hasError = false
    for await (const part of streamResult.fullStream) {
      if (controller.signal.aborted) break

      if (part.type === 'text-delta') {
        onChunk({ text: part.text })
      } else if (part.type === 'reasoning-delta') {
        onChunk({ reasoning: part.text })
      } else if (part.type === 'tool-input-start') {
        onChunk({ preparingTool: (part as any).toolName })
      } else if (part.type === 'tool-call') {
        const call: AiToolCall = {
          id: part.toolCallId,
          toolName: part.toolName,
          arguments: (part as any).input || (part as any).args || {},
          category: getToolCategory(part.toolName),
          status: 'pending_approval',
          requestedAt: Date.now(),
        }
        onChunk({ toolCalls: [call] })
      } else if (part.type === 'error') {
        hasError = true
        onChunk({ error: formatAiSdkError((part as any).error), done: true })
        return
      }
    }

    if (!hasError) {
      let finalUsage: { promptTokens: number; completionTokens: number; totalTokens: number; cachedInputTokens?: number } | undefined
      try {
        const usage = await streamResult.usage
        if (usage) {
          const rawUsage = usage as any
          const prompt = rawUsage.inputTokens ?? rawUsage.promptTokens ?? 0
          const completion = rawUsage.outputTokens ?? rawUsage.completionTokens ?? 0
          const total = rawUsage.totalTokens ?? (prompt + completion)
          const cached = rawUsage.cachedInputTokens ?? 0
          finalUsage = {
            promptTokens: prompt,
            completionTokens: completion,
            totalTokens: total,
            cachedInputTokens: cached > 0 ? cached : undefined,
          }
        }
      } catch {
        // Usage might fail if stream was cancelled early
      }
      onChunk({ done: true, usage: finalUsage })
    }
  } catch (err: unknown) {
    if (controller.signal.aborted) {
      onChunk({ done: true })
    } else {
      onChunk({ error: formatAiSdkError(err), done: true })
    }
  } finally {
    activeStreams.delete(requestId)
  }
}

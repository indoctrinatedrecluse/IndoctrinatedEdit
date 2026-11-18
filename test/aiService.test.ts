import { describe, it, expect } from 'vitest'
import { APICallError, LoadAPIKeyError, NoSuchToolError, InvalidToolInputError, RetryError } from 'ai'
import {
  cancelAiStream,
  formatAiSdkError,
  getActiveToolsForMode,
  listOllamaModels,
  normalizeMessagesForProvider,
  repairWorkspaceToolCall,
  resolveLanguageModel,
  streamAiResponse,
  workspaceTools,
} from '../electron/ai-service'
import { AiStreamChunk, AiChatMessage } from '../packages/sdk/types'
import { AiService, PRESET_MODELS } from '../src/services/aiService'
import { AiTokenizer } from '../src/services/aiTokenizer'

describe('AI Multi-Model Service', () => {
  it('should export all 11 workspace tools with descriptions and input schemas for Vercel AI SDK', () => {
    const toolNames = Object.keys(workspaceTools)
    expect(toolNames).toContain('read_file')
    expect(toolNames).toContain('write_file')
    expect(toolNames).toContain('propose_file_edit')
    expect(toolNames).toContain('list_workspace_files')
    expect(toolNames).toContain('search_code')
    expect(toolNames).toContain('get_editor_diagnostics')
    expect(toolNames).toContain('get_git_status')
    expect(toolNames).toContain('get_git_diff')
    expect(toolNames).toContain('execute_terminal_command')
    expect(toolNames).toContain('trigger_project_run')
    expect(toolNames).toContain('open_editor_file')
    expect(toolNames.length).toBe(11)

    for (const name of toolNames) {
      const toolDef = (workspaceTools as any)[name]
      expect(toolDef).toBeDefined()
      expect(toolDef.description).toBeTruthy()
      expect(toolDef.inputSchema).toBeDefined()
    }
  })

  it('should handle unreachable Ollama host gracefully and return empty array', async () => {
    const models = await listOllamaModels('http://127.0.0.1:59999')
    expect(Array.isArray(models)).toBe(true)
    expect(models.length).toBe(0)
  })

  it('should handle stream cancellation without throwing', () => {
    expect(() => {
      cancelAiStream('non-existent-request-id')
    }).not.toThrow()
  })

  it('should dispatch error chunk gracefully when attempting to stream with missing/invalid credentials', async () => {
    const chunks: AiStreamChunk[] = []
    const requestId = 'test-stream-error-' + Date.now()

    await streamAiResponse(
      requestId,
      {
        provider: 'deepseek',
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'hello' }],
        apiKey: 'invalid-key-for-testing',
        endpoint: 'http://127.0.0.1:59999', // dummy unreachable endpoint
      },
      (chunk) => {
        chunks.push(chunk)
      }
    )

    expect(chunks.length).toBeGreaterThanOrEqual(1)
    const lastChunk = chunks[chunks.length - 1]
    expect(lastChunk.done).toBe(true)
    expect(lastChunk.error).toBeDefined()
  })

  it('should route OpenRouter provider requests and handle network/auth failures gracefully', async () => {
    const chunks: AiStreamChunk[] = []
    const requestId = 'test-openrouter-' + Date.now()

    await streamAiResponse(
      requestId,
      {
        provider: 'openrouter',
        model: 'anthropic/claude-3.7-sonnet',
        messages: [{ role: 'user', content: 'test openrouter' }],
        apiKey: 'sk-or-invalid-test-key',
        endpoint: 'http://127.0.0.1:59999/v1',
      },
      (chunk) => {
        chunks.push(chunk)
      }
    )

    expect(chunks.length).toBeGreaterThanOrEqual(1)
    const lastChunk = chunks[chunks.length - 1]
    expect(lastChunk.done).toBe(true)
    expect(lastChunk.error).toBeDefined()
  })

  it('should route Custom OpenAI-compatible provider requests with custom model and endpoint', async () => {
    const chunks: AiStreamChunk[] = []
    const requestId = 'test-custom-prov-' + Date.now()

    await streamAiResponse(
      requestId,
      {
        provider: 'custom',
        model: 'local-custom-model',
        messages: [{ role: 'user', content: 'test custom provider' }],
        apiKey: 'custom-key',
        endpoint: 'http://127.0.0.1:59999/v1',
      },
      (chunk) => {
        chunks.push(chunk)
      }
    )

    expect(chunks.length).toBeGreaterThanOrEqual(1)
    const lastChunk = chunks[chunks.length - 1]
    expect(lastChunk.done).toBe(true)
    expect(lastChunk.error).toBeDefined()
  })

  it('should accept extra dynamic MCP tools and include them in stream dispatch', async () => {
    const chunks: AiStreamChunk[] = []
    const requestId = 'test-mcp-extra-' + Date.now()

    await streamAiResponse(
      requestId,
      {
        provider: 'custom',
        model: 'mcp-test-model',
        messages: [{ role: 'user', content: 'fetch docs via mcp' }],
        apiKey: 'custom-key',
        endpoint: 'http://127.0.0.1:59999/v1',
        extraTools: [
          {
            name: 'fetch_markdown',
            description: 'Fetches web page content converted to markdown',
            parameters: { url: { type: 'string' } },
            requiredParams: ['url'],
          },
          {
            name: 'search_gemini_docs',
            description: 'Searches official Gemini developer documentation',
          },
        ],
      },
      (chunk) => {
        chunks.push(chunk)
      }
    )

    expect(chunks.length).toBeGreaterThanOrEqual(1)
    const lastChunk = chunks[chunks.length - 1]
    expect(lastChunk.done).toBe(true)
  })

  it('should include popular local Ollama presets in PRESET_MODELS with 0 cost economics', () => {
    const ollamaModels = PRESET_MODELS.filter((m) => m.provider === 'ollama')
    expect(ollamaModels.length).toBeGreaterThanOrEqual(4)

    const ids = ollamaModels.map((m) => m.id)
    expect(ids).toContain('llama3.3:latest')
    expect(ids).toContain('qwen2.5-coder:32b')
    expect(ids).toContain('deepseek-r1:14b')
    expect(ids).toContain('mistral:latest')

    // Cost estimation should be exactly $0.00 for local Ollama usage
    const cost = AiTokenizer.estimateCost('llama3.3:latest', 50000, 20000)
    expect(cost).toBe(0)
  })

  describe('AiService.trimConversationHistory (Smart Semantic Compaction)', () => {
    it('should return conversation history unchanged when well within token budget', () => {
      const messages: AiChatMessage[] = [
        { id: '1', role: 'assistant', content: 'Welcome to IndoctrinatedEdit AI.', timestamp: 1 },
        { id: '2', role: 'user', content: 'Can you inspect my code?', timestamp: 2 },
        { id: '3', role: 'assistant', content: 'Certainly, what would you like me to look at?', timestamp: 3 },
      ]

      const trimmed = AiService.trimConversationHistory(messages, 'System instructions', 'gpt-4o')
      expect(trimmed.length).toBe(3)
      expect(trimmed[0].id).toBe('1')
      expect(trimmed[1].id).toBe('2')
      expect(trimmed[2].id).toBe('3')
    })

    it('should perform in-place compaction on verbose older tool results to preserve conversational context', () => {
      const longOutput = 'Line of build output error log details...\n'.repeat(50)
      const messages: AiChatMessage[] = [
        { id: '1', role: 'assistant', content: 'Welcome.', timestamp: 1 },
        { id: '2', role: 'user', content: 'Fix the build please.', timestamp: 2 },
        {
          id: '3',
          role: 'assistant',
          content: 'Running build diagnostics.',
          toolCalls: [{ id: 'tc-1', toolName: 'execute_terminal_command', arguments: { command: 'npm run build' } }],
          toolResults: [{ toolCallId: 'tc-1', toolName: 'execute_terminal_command', success: true, output: longOutput }],
          timestamp: 3,
        },
        { id: '4', role: 'user', content: 'Tool `execute_terminal_command` result:\n```\n' + longOutput + '\n```', timestamp: 4 },
        { id: '5', role: 'assistant', content: 'Found the syntax issue.', timestamp: 5 },
        { id: '6', role: 'user', content: 'Great, go ahead and patch it.', timestamp: 6 },
        { id: '7', role: 'assistant', content: 'Patching now.', timestamp: 7 },
      ]

      // Give a tight budget model
      const trimmed = AiService.trimConversationHistory(messages, 'System instructions', 'deepseek-chat')
      // Original user task should be preserved
      expect(trimmed.some((m) => m.content === 'Fix the build please.')).toBe(true)
      // The recent turns (id 6 and 7) should remain intact
      expect(trimmed.some((m) => m.content === 'Patching now.')).toBe(true)
    })

    it('should preserve the original user goal and include a compaction notice when sliding window drops intermediate turns', () => {
      const bigTurn = (i: number): AiChatMessage => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'assistant' : 'user',
        content: `Intermediate turn step ${i}: ${'verbose context '.repeat(3500)}`,
        timestamp: i,
      })

      const messages: AiChatMessage[] = [
        { id: 'welcome', role: 'assistant', content: 'Welcome to AI.', timestamp: 1 },
        { id: 'goal', role: 'user', content: 'Build a full stack React chat widget.', timestamp: 2 },
        bigTurn(3),
        bigTurn(4),
        bigTurn(5),
        bigTurn(6),
        bigTurn(7),
        bigTurn(8),
        { id: 'recent-user', role: 'user', content: 'Now test the widget in browser.', timestamp: 9 },
        { id: 'recent-assistant', role: 'assistant', content: 'Testing now.', timestamp: 10 },
      ]

      // Use a model with 64k limit with massive intermediate turns
      const trimmed = AiService.trimConversationHistory(messages, 'System prompt', 'deepseek-chat')
      // Pinned welcome is retained
      expect(trimmed[0].id).toBe('welcome')
      // Original user task goal is anchored and retained
      expect(trimmed[1].id).toBe('goal')
      // Recent messages are retained
      expect(trimmed[trimmed.length - 1].id).toBe('recent-assistant')
      // Notice is present
      const notice = trimmed.find((m) => m.content?.includes('System Compaction Notice'))
      expect(notice).toBeDefined()
    })
  })

  describe('normalizeMessagesForProvider (Vercel AI SDK v7 pruneMessages & Role Alternation)', () => {
    it('should strip system and empty messages and merge consecutive same-role turns', () => {
      const normalized = normalizeMessagesForProvider([
        { role: 'system', content: 'You are a coding assistant.' },
        { role: 'user', content: '   ' },
        { role: 'user', content: 'First question' },
        { role: 'user', content: 'Follow-up detail' },
        { role: 'assistant', content: '' },
        { role: 'assistant', content: 'Thinking answer part 1' },
        { role: 'assistant', content: 'Thinking answer part 2' },
        { role: 'user', content: 'Thanks!' },
      ])

      expect(normalized.length).toBe(3)
      expect(normalized[0]).toEqual({ role: 'user', content: 'First question\n\nFollow-up detail' })
      expect(normalized[1]).toEqual({ role: 'assistant', content: 'Thinking answer part 1\n\nThinking answer part 2' })
      expect(normalized[2]).toEqual({ role: 'user', content: 'Thanks!' })
    })

    it('should return an empty array cleanly when all messages are empty or system-only', () => {
      const normalized = normalizeMessagesForProvider([
        { role: 'system', content: 'System only' },
        { role: 'assistant', content: '' },
        { role: 'user', content: '   \n\t ' },
      ])
      expect(normalized).toEqual([])
    })
  })

  describe('AiService.saveChatHistory (Sliding Window Persistence)', () => {
    it('should retain a 40-message sliding window (welcome + 39 most recent) when history exceeds 40 messages', () => {
      const store = new Map<string, string>()
      const originalStorage = (globalThis as any).localStorage
      ;(globalThis as any).localStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
      }

      try {
        const msgs: AiChatMessage[] = Array.from({ length: 50 }, (_, i) => ({
          id: i === 0 ? 'welcome' : `msg-${i}`,
          role: i % 2 === 0 ? 'assistant' : 'user',
          content: `Message ${i}`,
          timestamp: i,
        }))

        AiService.saveChatHistory('/test/workspace', 'gemini-2.5-flash', msgs)
        const loaded = AiService.getChatHistory('/test/workspace', 'gemini-2.5-flash') || []
        expect(loaded.length).toBe(40)
        expect(loaded[0].id).toBe('welcome')
        expect(loaded[1].id).toBe('msg-11')
        expect(loaded[loaded.length - 1].id).toBe('msg-49')
      } finally {
        ;(globalThis as any).localStorage = originalStorage
      }
    })
  })

  describe('Vercel AI SDK v7 Native Primitives (activeTools, repairToolCall, extractReasoningMiddleware, typed errors)', () => {
    it('should restrict Plan Mode activeTools to read-only & MCP tools at the schema layer', () => {
      const allTools = [...Object.keys(workspaceTools), 'fetch_markdown']
      const planActive = getActiveToolsForMode('plan', allTools)
      expect(planActive).toBeDefined()
      expect(planActive).toContain('read_file')
      expect(planActive).toContain('search_code')
      expect(planActive).toContain('get_git_status')
      expect(planActive).toContain('fetch_markdown')
      expect(planActive).not.toContain('write_file')
      expect(planActive).not.toContain('propose_file_edit')
      expect(planActive).not.toContain('execute_terminal_command')
      expect(planActive).not.toContain('trigger_project_run')

      expect(getActiveToolsForMode('act', allTools)).toBeUndefined()
    })

    it('should repair hallucinated tool names and fenced JSON inputs via repairWorkspaceToolCall', async () => {
      const noSuchErr = new NoSuchToolError({ toolName: 'readFile', availableTools: Object.keys(workspaceTools) })
      const repairedName = await repairWorkspaceToolCall({
        toolCall: {
          type: 'tool-call',
          toolCallId: 'tc-repair-1',
          toolName: 'readFile',
          input: '{"filePath":"src/App.tsx"}',
        },
        tools: workspaceTools,
        error: noSuchErr,
      })
      expect(repairedName).toEqual({
        type: 'tool-call',
        toolCallId: 'tc-repair-1',
        toolName: 'read_file',
        input: '{"filePath":"src/App.tsx"}',
      })

      const invalidInputErr = new InvalidToolInputError({
        toolName: 'execute_terminal_command',
        toolInput: '```json\n{"command": "npm test"}\n```',
        cause: new Error('Invalid JSON'),
      })
      const repairedInput = await repairWorkspaceToolCall({
        toolCall: {
          type: 'tool-call',
          toolCallId: 'tc-repair-2',
          toolName: 'execute_terminal_command',
          input: '```json\n{"command": "npm test"}\n```',
        },
        tools: workspaceTools,
        error: invalidInputErr,
      })
      expect(repairedInput).toEqual({
        type: 'tool-call',
        toolCallId: 'tc-repair-2',
        toolName: 'execute_terminal_command',
        input: '{"command":"npm test"}',
      })

      const unrepairable = await repairWorkspaceToolCall({
        toolCall: {
          type: 'tool-call',
          toolCallId: 'tc-repair-3',
          toolName: 'totally_unknown_magic_tool',
          input: '{}',
        },
        tools: workspaceTools,
        error: new NoSuchToolError({ toolName: 'totally_unknown_magic_tool', availableTools: Object.keys(workspaceTools) }),
      })
      expect(unrepairable).toBeNull()
    })

    it('should format Vercel AI SDK typed errors into actionable BYOK messages', () => {
      const err401 = new APICallError({
        message: 'Unauthorized',
        url: 'https://api.openai.com/v1/chat/completions',
        requestBodyValues: {},
        statusCode: 401,
      })
      expect(formatAiSdkError(err401)).toContain('Authentication failed (401)')

      const err402 = new APICallError({
        message: 'Payment Required',
        url: 'https://openrouter.ai/api/v1/chat/completions',
        requestBodyValues: {},
        statusCode: 402,
      })
      expect(formatAiSdkError(err402)).toContain('Insufficient balance (402)')

      const err429 = new APICallError({
        message: 'Too many requests',
        url: 'https://api.deepseek.com/chat/completions',
        requestBodyValues: {},
        statusCode: 429,
      })
      const retryErr = new RetryError({
        message: 'Failed after 2 attempts',
        reason: 'maxRetriesExceeded',
        errors: [err429],
      })
      expect(formatAiSdkError(retryErr)).toContain('Rate limit exceeded (429)')
      expect(formatAiSdkError(retryErr)).toContain('(after retries)')

      const keyErr = new LoadAPIKeyError({ message: 'Missing key' })
      expect(formatAiSdkError(keyErr)).toContain('API key is missing')
    })

    it('should wrap resolved provider models with extractReasoningMiddleware', () => {
      const wrapped = resolveLanguageModel({
        provider: 'ollama',
        model: 'deepseek-r1:14b',
        messages: [],
        endpoint: 'http://localhost:11434',
      })
      expect(wrapped).toBeDefined()
      expect(typeof wrapped.doStream).toBe('function')
      expect(wrapped.modelId).toBe('deepseek-r1:14b')
    })

    it('should resolve preset, Ollama, and OpenRouter models via AiService.resolveActiveModelOption', () => {
      const preset = AiService.resolveActiveModelOption('gemini-2.5-flash')
      expect(preset.provider).toBe('gemini')
      expect(preset.id).toBe('gemini-2.5-flash')

      const ollama = AiService.resolveActiveModelOption('codellama:13b')
      expect(ollama.provider).toBe('ollama')
      expect(ollama.id).toBe('codellama:13b')

      const openrouter = AiService.resolveActiveModelOption('anthropic/claude-3.7-sonnet')
      expect(openrouter.provider).toBe('openrouter')
      expect(openrouter.id).toBe('anthropic/claude-3.7-sonnet')
    })

    it('should support disableTools: true for pure inline code transforms (InlineCopilotWidget)', async () => {
      const chunks: AiStreamChunk[] = []
      await streamAiResponse(
        'test-inline-disable-tools-' + Date.now(),
        {
          provider: 'custom',
          model: 'inline-test-model',
          messages: [
            { role: 'system', content: 'Return only raw TypeScript code.' },
            { role: 'user', content: 'Convert to async/await' },
          ],
          apiKey: 'custom-key',
          endpoint: 'http://127.0.0.1:59999/v1',
          disableTools: true,
          temperature: 0.15,
          maxOutputTokens: 4096,
        },
        (chunk) => chunks.push(chunk)
      )
      expect(chunks.length).toBeGreaterThanOrEqual(1)
      expect(chunks[chunks.length - 1].done).toBe(true)
    })
  })
})

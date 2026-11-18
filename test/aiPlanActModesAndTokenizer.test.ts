import { describe, it, expect, beforeEach } from 'vitest'
import { AiService, ChatMode } from '../src/services/aiService'
import { AiTokenizer } from '../src/services/aiTokenizer'
import { AiToolExecutor, ToolExecutionContext } from '../src/services/aiToolsService'
import { AiToolCall } from '../src/services/aiService'

describe('AI Plan Mode vs Act Mode & Tokenizer Subsystem', () => {
  beforeEach(() => {
    AiService.setMode('plan')
    AiService.setPlanModelId('antigravity-claude-3-7-sonnet-thought')
    AiService.setActModelId('antigravity-claude-3-7-sonnet')
  })

  describe('AiService Mode State & System Prompts', () => {
    it('initializes default mode to plan and remembers mode specific models', () => {
      expect(AiService.getMode()).toBe('plan')
      expect(AiService.getPlanModelId()).toBe('antigravity-claude-3-7-sonnet-thought')
      expect(AiService.getActModelId()).toBe('antigravity-claude-3-7-sonnet')
      expect(AiService.getActiveModelIdForCurrentMode()).toBe('antigravity-claude-3-7-sonnet-thought')

      AiService.setMode('act')
      expect(AiService.getMode()).toBe('act')
      expect(AiService.getActiveModelIdForCurrentMode()).toBe('antigravity-claude-3-7-sonnet')
    })

    it('generates distinct system prompt constraints for Plan Mode vs Act Mode', () => {
      const planPrompt = AiService.getSystemPromptForMode('plan')
      expect(planPrompt).toContain('Plan Mode')
      expect(planPrompt).toContain('Read-Only / No Code Writing')

      const actPrompt = AiService.getSystemPromptForMode('act')
      expect(actPrompt).toContain('Act Mode')
      expect(actPrompt).toContain('propose_file_edit')
    })

    it('subscribes and notifies listeners on mode or model changes', () => {
      let notifiedMode: ChatMode = 'plan'
      const unsubscribe = AiService.subscribeMode((state) => {
        notifiedMode = state.mode
      })

      AiService.setMode('act')
      expect(notifiedMode).toBe('act')

      unsubscribe()
      AiService.setMode('plan')
      expect(notifiedMode).toBe('act') // no longer updated after unsubscribe
    })
  })

  describe('AiToolExecutor Plan-Mode Enforcement', () => {
    const mockContext: ToolExecutionContext = {
      mode: 'plan',
      workspaceRoot: 'D:/Projects/TestApp',
      activeFileName: 'src/index.ts',
      activeFileContent: 'console.log("hello");',
      openFiles: ['src/index.ts'],
      onOpenFile: () => {},
      onApplyFileEdit: async () => true,
    }

    it('blocks file_edit or write actions when in Plan Mode and advises switching to Act Mode', async () => {
      const toolCall: AiToolCall = {
        id: 'call-1',
        toolName: 'propose_file_edit',
        arguments: {
          filePath: 'src/index.ts',
          newSnippet: 'console.log("updated");',
        },
      }

      const result = await AiToolExecutor.execute(toolCall, { ...mockContext, mode: 'plan' })
      expect(result.success).toBe(false)
      expect(result.error).toContain('Plan Mode Policy')
      expect(result.error).toContain('Switch to Act Mode')
    })

    it('allows read tools in Plan Mode without restriction', async () => {
      const toolCall: AiToolCall = {
        id: 'call-2',
        toolName: 'read_file',
        arguments: {
          filePath: 'src/index.ts',
        },
      }

      const result = await AiToolExecutor.execute(toolCall, { ...mockContext, mode: 'plan' })
      expect(result.success).toBe(true)
      expect(result.output).toContain('console.log("hello");')
    })
  })

  describe('AiTokenizer & Context Budgeting', () => {
    it('estimates token counts with character heuristics accurately', () => {
      const shortText = 'const a = 10;'
      const tokens = AiTokenizer.estimateTokens(shortText)
      expect(tokens).toBeGreaterThan(0)
      expect(tokens).toBeLessThan(10)
    })

    it('calculates token breakdown across system, history, attachments and input', () => {
      const breakdown = AiTokenizer.calculateBreakdown({
        systemPrompt: 'You are an AI assistant in Plan Mode.',
        messages: [
          {
            id: 'm1',
            role: 'user',
            content: 'Hello, what is this repo?',
            timestamp: 1,
          },
          {
            id: 'm2',
            role: 'assistant',
            content: 'This repo is IndoctrinatedEdit.',
            timestamp: 2,
          },
        ],
        attachedContext: {
          type: 'file',
          fileName: 'index.ts',
          code: 'function main() { return 42; }',
        },
        currentInput: 'Can you optimize main()?',
        contextLimit: 128000,
      })

      expect(breakdown.systemTokens).toBeGreaterThan(0)
      expect(breakdown.historyTokens).toBeGreaterThan(0)
      expect(breakdown.attachmentTokens).toBeGreaterThan(0)
      expect(breakdown.inputTokens).toBeGreaterThan(0)
      expect(breakdown.totalTokens).toBe(
        breakdown.systemTokens +
          breakdown.historyTokens +
          breakdown.attachmentTokens +
          breakdown.inputTokens
      )
      expect(breakdown.percentUsed).toBeGreaterThanOrEqual(0)
      expect(breakdown.percentUsed).toBeLessThanOrEqual(100)
    })

    it('optimizes large context snippets via smart truncation and header preservation', () => {
      const longSnippet = Array.from({ length: 500 }, (_, i) => `line_${i + 1} = someFunction(${i});`).join('\n')
      const optimized = AiTokenizer.optimizeContextSnippet(longSnippet, 100)

      expect(optimized.truncated).toBe(true)
      expect(optimized.content).toContain('Context Optimizer')
      expect(optimized.content).toContain('pruned for token efficiency')
      expect(optimized.tokenCount).toBeLessThan(longSnippet.length)
    })

    it('accurately estimates dollar costs for Gemini, Claude, DeepSeek, and OpenRouter models', () => {
      // DeepSeek V3: $0.14 / M in, $0.28 / M out
      const deepseekCost = AiTokenizer.estimateCost('deepseek-chat', 1_000_000, 1_000_000)
      expect(deepseekCost).toBeCloseTo(0.42, 2)

      // Gemini 2.5 Flash: $0.15 / M in, $0.60 / M out
      const geminiFlashCost = AiTokenizer.estimateCost('gemini-2.5-flash', 1_000_000, 1_000_000)
      expect(geminiFlashCost).toBeCloseTo(0.75, 2)

      // Claude 3.7 Sonnet: $3.00 / M in, $15.00 / M out
      const claudeCost = AiTokenizer.estimateCost('claude-3-7-sonnet-20250219', 1_000_000, 1_000_000)
      expect(claudeCost).toBeCloseTo(18.00, 2)

      // OpenRouter Claude: matches Claude pricing
      const openRouterCost = AiTokenizer.estimateCost('openrouter/anthropic/claude-3.7-sonnet', 1_000_000, 1_000_000)
      expect(openRouterCost).toBeCloseTo(18.00, 2)

      // Ollama / Local / Custom defaults to 0
      const localCost = AiTokenizer.estimateCost('ollama-llama3', 1_000_000, 1_000_000)
      expect(localCost).toBe(0)
    })
  })

  describe('Workspace Rules Detection & Ingestion', () => {
    it('discovers .indoctrinatedrules with highest priority', async () => {
      const g = globalThis as any
      const originalWindow = g.window
      try {
        g.window = {
          electronAPI: {
            readFile: async (path: string) => {
              if (path.endsWith('.indoctrinatedrules')) {
                return '# Indoctrinated Rules\nFollow Liquid Glass styling.'
              }
              if (path.endsWith('.cursorrules')) {
                return '# Cursor Rules\nLower priority.'
              }
              throw new Error('File not found')
            },
          },
        }

        const rules = await AiService.loadWorkspaceRules('d:/Projects/MyProject')
        expect(rules).not.toBeNull()
        expect(rules?.fileName).toBe('.indoctrinatedrules')
        expect(rules?.content).toContain('Follow Liquid Glass styling.')
      } finally {
        g.window = originalWindow
      }
    })

    it('falls back to .cursorrules or .clinerules if .indoctrinatedrules is not found', async () => {
      const g = globalThis as any
      const originalWindow = g.window
      try {
        g.window = {
          electronAPI: {
            readFile: async (path: string) => {
              if (path.endsWith('.cursorrules')) {
                return '# Cursor Rules Content'
              }
              throw new Error('File not found')
            },
          },
        }

        const rules = await AiService.loadWorkspaceRules('d:/Projects/MyProject')
        expect(rules).not.toBeNull()
        expect(rules?.fileName).toBe('.cursorrules')
        expect(rules?.content).toBe('# Cursor Rules Content')
      } finally {
        g.window = originalWindow
      }
    })

    it('returns null if workspaceRoot is empty or no rule files exist', async () => {
      expect(await AiService.loadWorkspaceRules('')).toBeNull()

      const g = globalThis as any
      const originalWindow = g.window
      try {
        g.window = {
          electronAPI: {
            readFile: async () => {
              throw new Error('File not found')
            },
          },
        }
        const rules = await AiService.loadWorkspaceRules('d:/Projects/Empty')
        expect(rules).toBeNull()
      } finally {
        g.window = originalWindow
      }
    })
  })

  describe('AiTokenizer Smart Tool Output Compactor (Phase 2)', () => {
    it('leaves short outputs uncompacted when within budget', () => {
      const shortOutput = 'Compiled successfully in 420ms\n0 errors, 0 warnings.'
      const result = AiTokenizer.compactToolOutput(shortOutput, { maxLines: 50, maxChars: 5000 })
      expect(result.truncated).toBe(false)
      expect(result.content).toBe(shortOutput)
      expect(result.omittedLines).toBe(0)
      expect(result.omittedChars).toBe(0)
    })

    it('compacts large terminal/tool outputs preserving head and tail context', () => {
      const lines = Array.from({ length: 200 }, (_, i) => `Log line ${i + 1}: processing module ${i}...`)
      const longOutput = lines.join('\n')

      const result = AiTokenizer.compactToolOutput(longOutput, {
        maxLines: 50,
        maxChars: 5000,
        headLines: 15,
        tailLines: 20,
      })

      expect(result.truncated).toBe(true)
      expect(result.omittedLines).toBe(200 - 15 - 20) // 165 omitted lines
      expect(result.omittedChars).toBeGreaterThan(0)
      expect(result.content).toContain('Log line 1:')
      expect(result.content).toContain('Log line 15:')
      expect(result.content).toContain('[✂️ Output truncated: 165 lines omitted for token efficiency]')
      expect(result.content).toContain('Log line 181:')
      expect(result.content).toContain('Log line 200:')
      // Does not contain middle lines
      expect(result.content).not.toContain('Log line 100:')
    })

    it('handles empty or blank output gracefully', () => {
      const result = AiTokenizer.compactToolOutput('')
      expect(result.truncated).toBe(false)
      expect(result.content).toBe('')
    })
  })
})

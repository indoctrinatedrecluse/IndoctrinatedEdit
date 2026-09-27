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
  })
})

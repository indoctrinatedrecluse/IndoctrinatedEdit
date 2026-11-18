import React, { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  X,
  RotateCcw,
  Square,
  Code2,
  Check,
  CornerDownLeft,
  FileCode2,
  Cpu,
} from 'lucide-react'
import { AiService } from '../../services/aiService'
import { AiTokenizer } from '../../services/aiTokenizer'
import { AiStreamChunk, AiTokenUsage } from '@sdk/types'
import './InlineCopilotWidget.css'

interface InlineCopilotWidgetProps {
  isOpen: boolean
  selectedText: string
  language: string
  onClose: () => void
  onAccept: (transformedCode: string) => void
}

const INLINE_PRESETS = [
  { label: 'Refactor Cleanly', prompt: 'Refactor and modernize code with clean types' },
  { label: 'Add JSDoc / Comments', prompt: 'Add detailed documentation and docstrings' },
  { label: 'Convert to Async/Await', prompt: 'Convert promises and callbacks to async/await' },
  { label: 'Write Unit Tests', prompt: 'Generate comprehensive unit tests' },
  { label: 'Optimize Performance', prompt: 'Optimize algorithm and minimize allocations' },
]

export const InlineCopilotWidget: React.FC<InlineCopilotWidgetProps> = ({
  isOpen,
  selectedText,
  language,
  onClose,
  onAccept,
}) => {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [proposedCode, setProposedCode] = useState<string | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [isOfflineFallback, setIsOfflineFallback] = useState(false)
  const [usage, setUsage] = useState<AiTokenUsage | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<(() => void) | null>(null)

  const activeModel = AiService.resolveActiveModelOption()

  const cancelActiveStream = () => {
    if (abortRef.current) {
      abortRef.current()
      abortRef.current = null
    }
    setIsGenerating(false)
  }

  const handleClose = () => {
    cancelActiveStream()
    onClose()
  }

  useEffect(() => {
    if (isOpen) {
      setPrompt('')
      setProposedCode(null)
      setIsGenerating(false)
      setStreamError(null)
      setIsOfflineFallback(false)
      setUsage(null)
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 60)
      return () => clearTimeout(timer)
    } else {
      cancelActiveStream()
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      abortRef.current?.()
    }
  }, [])

  if (!isOpen) return null

  const applyLocalFallbackTransform = (activePrompt: string) => {
    let result = selectedText || `// Generated code for: ${activePrompt}`
    const lowerPrompt = activePrompt.toLowerCase()

    if (lowerPrompt.includes('doc') || lowerPrompt.includes('comment')) {
      result = `/**\n * ${activePrompt}\n */\n` + (selectedText || '// Implementation details')
    } else if (lowerPrompt.includes('async') || lowerPrompt.includes('await')) {
      result = selectedText.replace(/function\s+([A-Za-z0-9_]+)/g, 'async function $1')
      if (!result.includes('async')) {
        result = `async function executeAsync() {\n  ${selectedText || 'return true'}\n}`
      }
    } else if (lowerPrompt.includes('test')) {
      result = `describe('${activePrompt}', () => {\n  it('should execute successfully', () => {\n    ${selectedText || 'expect(true).toBe(true)'}\n  });\n});`
    } else if (lowerPrompt.includes('optimize') || lowerPrompt.includes('clean')) {
      result = selectedText.split('\n').map((l) => l.trimEnd()).join('\n') || `// Optimized (${language})`
    } else {
      result = `// Offline local preview (${activePrompt})\n` + (selectedText || `export const result = '${activePrompt}'`)
    }

    setProposedCode(result)
    setIsOfflineFallback(true)
    setIsGenerating(false)
  }

  const handleGenerate = (customPrompt?: string) => {
    const activePrompt = customPrompt || prompt
    if (!activePrompt.trim() || isGenerating) return

    cancelActiveStream()
    setIsGenerating(true)
    setStreamError(null)
    setIsOfflineFallback(false)
    setUsage(null)

    const modelOption = AiService.resolveActiveModelOption()
    const settings = AiService.getSettings()
    const providerCfg = settings[modelOption.provider]
    const needsKey = modelOption.provider !== 'ollama' && modelOption.provider !== 'custom'

    // If no cloud API key is configured, show clear offline fallback immediately instead of failing 401
    if (needsKey && !providerCfg?.apiKey?.trim()) {
      setStreamError(`No API key configured for ${modelOption.provider}. Showing offline transform — configure a BYOK key in AI Chat Settings.`)
      applyLocalFallbackTransform(activePrompt)
      return
    }

    const systemPrompt = `You are IndoctrinatedEdit Inline Copilot.
Transform or generate code precisely based on user instructions.
Language: ${language || 'text'}
RULES:
1. Return ONLY the raw code snippet — no prose, no explanations, no markdown code fences.
2. Preserve indentation, types, and idiomatic style for ${language || 'text'}.`

    const userMessageContent = selectedText
      ? `Original Code:\n\`\`\`${language || 'text'}\n${selectedText}\n\`\`\`\n\nTask: ${activePrompt}`
      : `Generate code for: ${activePrompt}`

    let accumulatedText = ''
    let hadError = false

    try {
      const abortFn = AiService.streamChat(
        modelOption,
        [
          { id: 'inline-sys', role: 'system', content: systemPrompt, timestamp: Date.now() },
          { id: 'inline-msg', role: 'user', content: userMessageContent, timestamp: Date.now() },
        ],
        (chunk: AiStreamChunk) => {
          if (chunk.usage) {
            setUsage(chunk.usage)
          }
          if (chunk.error) {
            hadError = true
            setStreamError(chunk.error)
          }
          if (chunk.text) {
            accumulatedText += chunk.text
            const cleaned = accumulatedText
              .replace(/^```[a-zA-Z0-9_-]*\r?\n/, '')
              .replace(/\r?\n```\s*$/, '')
            setProposedCode(cleaned)
          }
          if (chunk.done) {
            abortRef.current = null
            setIsGenerating(false)
            if (!accumulatedText.trim() && !hadError) {
              setStreamError('Model returned an empty response. Try refining your prompt or switching models.')
            }
          }
        },
        {
          mode: 'act',
          disableTools: true,
          temperature: 0.15,
          maxOutputTokens: 4096,
        }
      )
      abortRef.current = abortFn
    } catch (err) {
      setStreamError(err instanceof Error ? err.message : String(err))
      setIsGenerating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      if (proposedCode) {
        onAccept(proposedCode)
        handleClose()
      } else {
        handleGenerate()
      }
    } else if (e.key === 'Enter' && !proposedCode) {
      handleGenerate()
    }
  }

  return (
    <div
      className="inline-copilot-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose()
        }
      }}
    >
      <div className="inline-copilot-card">
        {/* Header Bar */}
        <div className="copilot-header">
          <div className="copilot-header-left">
            <div className="copilot-icon-box">
              <Sparkles size={14} className="copilot-sparkle-icon" />
            </div>
            <span className="copilot-title">Inline AI Copilot</span>
            <span className="copilot-model-tag" title={`Active BYOK model (${activeModel.provider})`}>
              {activeModel.name}
            </span>
            <span className="copilot-lang-tag">{language || 'text'}</span>
            {selectedText && (
              <span className="copilot-selection-tag">
                <FileCode2 size={11} />
                {selectedText.split('\n').length} lines selected
              </span>
            )}
          </div>
          <div className="copilot-header-right">
            <span className="copilot-shortcut-hint">Esc to dismiss</span>
            <button
              className="copilot-close-btn"
              onClick={handleClose}
              title="Close (Esc)"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <div className="copilot-input-container">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder={
              selectedText
                ? "Instruct AI to transform selection (e.g. 'Convert to TypeScript', 'Add error handling')..."
                : "Instruct AI to generate code snippet..."
            }
            className="copilot-input-field"
          />
          {isGenerating ? (
            <button
              onClick={cancelActiveStream}
              className="copilot-stop-btn"
              title="Stop Generation (Esc)"
            >
              <Square size={11} />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={() => handleGenerate()}
              disabled={!prompt.trim()}
              className="copilot-generate-btn"
              title="Generate (Enter)"
            >
              <span>Generate</span>
              <CornerDownLeft size={12} />
            </button>
          )}
        </div>

        {/* Quick Presets */}
        {!proposedCode && !isGenerating && (
          <div className="copilot-presets-row">
            <span className="presets-caption">Quick Presets:</span>
            {INLINE_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPrompt(preset.prompt)
                  handleGenerate(preset.prompt)
                }}
                className="copilot-preset-chip"
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        {/* Error notification */}
        {streamError && (
          <div className="copilot-error-banner">
            <span>{streamError}</span>
          </div>
        )}

        {/* Proposed Code Preview */}
        {proposedCode && (
          <div className="copilot-preview-section">
            <div className="preview-header">
              <div className="preview-header-left">
                <Code2 size={13} className="text-sapphire" />
                <span>
                  {isOfflineFallback ? 'Offline Fallback Preview' : 'Proposed Code Transformation'}
                </span>
                <span className="preview-line-count">
                  {proposedCode.split('\n').length} lines
                </span>
              </div>
              <div className="preview-header-right">
                {usage && (
                  <span className="copilot-usage-pill">
                    <Cpu size={10} />
                    <span>{usage.promptTokens + usage.completionTokens} tok</span>
                    {usage.cachedInputTokens && usage.cachedInputTokens > 0 && (
                      <span className="copilot-cached-pill">⚡ {usage.cachedInputTokens}</span>
                    )}
                    <span className="copilot-cost-pill">
                      ${AiTokenizer.estimateCost(activeModel.id, usage.promptTokens, usage.completionTokens).toFixed(4)}
                    </span>
                  </span>
                )}
                <span className="accept-hint">Ctrl+Enter to Accept</span>
              </div>
            </div>

            <pre className="copilot-code-block custom-scrollbar">
              <code>{proposedCode}</code>
            </pre>

            <div className="preview-actions">
              <button
                onClick={() => handleGenerate()}
                disabled={isGenerating}
                className="copilot-secondary-btn"
              >
                <RotateCcw size={12} />
                <span>Regenerate</span>
              </button>
              <button
                onClick={handleClose}
                className="copilot-secondary-btn"
              >
                <X size={12} />
                <span>Discard</span>
              </button>
              <button
                onClick={() => {
                  onAccept(proposedCode)
                  handleClose()
                }}
                className="copilot-accept-btn"
              >
                <Check size={13} />
                <span>Accept & Insert (Ctrl+Enter)</span>
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

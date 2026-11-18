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

      <style>{`
        .inline-copilot-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 60px;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(12px) saturate(160%);
          animation: copilotFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes copilotFadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .inline-copilot-card {
          width: 100%;
          max-width: 680px;
          border-radius: 12px;
          background: rgba(13, 17, 26, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(10, 132, 255, 0.15);
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          color: #FFFFFF;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        .copilot-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .copilot-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .copilot-icon-box {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: linear-gradient(135deg, rgba(10, 132, 255, 0.3), rgba(94, 92, 230, 0.2));
          border: 1px solid rgba(10, 132, 255, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #5AC8FA;
        }

        .copilot-title {
          font-size: 12.5px;
          font-weight: 600;
          color: #FFFFFF;
          letter-spacing: -0.01em;
        }

        .copilot-model-tag {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 4px;
          background: rgba(191, 90, 242, 0.14);
          border: 1px solid rgba(191, 90, 242, 0.3);
          color: #D8B4FE;
          max-width: 170px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .copilot-lang-tag {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(235, 235, 245, 0.8);
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }

        .copilot-selection-tag {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(10, 132, 255, 0.12);
          border: 1px solid rgba(10, 132, 255, 0.25);
          color: #5AC8FA;
        }

        .copilot-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .copilot-shortcut-hint {
          font-size: 10.5px;
          color: rgba(235, 235, 245, 0.45);
        }

        .copilot-close-btn {
          width: 22px;
          height: 22px;
          border-radius: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: rgba(235, 235, 245, 0.5);
          cursor: pointer;
          transition: all 0.15s;
        }

        .copilot-close-btn:hover {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.08);
        }

        .copilot-input-container {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 4px 6px 4px 12px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .copilot-input-container:focus-within {
          border-color: rgba(10, 132, 255, 0.6);
          box-shadow: 0 0 12px rgba(10, 132, 255, 0.25);
        }

        .copilot-input-field {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-size: 12.5px;
          color: #FFFFFF;
        }

        .copilot-input-field::placeholder {
          color: rgba(235, 235, 245, 0.4);
        }

        .copilot-generate-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 6px;
          background: linear-gradient(135deg, #0A84FF 0%, #0070E0 100%);
          color: #FFFFFF;
          border: none;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 2px 8px rgba(10, 132, 255, 0.35);
        }

        .copilot-generate-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(10, 132, 255, 0.5);
        }

        .copilot-generate-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .copilot-stop-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 6px;
          background: rgba(255, 69, 58, 0.18);
          border: 1px solid rgba(255, 69, 58, 0.45);
          color: #FF6961;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .copilot-stop-btn:hover {
          background: rgba(255, 69, 58, 0.28);
          color: #FFFFFF;
        }

        .preview-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .copilot-usage-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 9.5px;
          color: rgba(235, 235, 245, 0.65);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .copilot-cached-pill {
          color: #5AC8FA;
          font-weight: 600;
        }

        .copilot-cost-pill {
          color: #30D158;
          font-weight: 600;
        }

        .copilot-presets-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }

        .presets-caption {
          font-size: 10.5px;
          color: rgba(235, 235, 245, 0.45);
          margin-right: 2px;
        }

        .copilot-preset-chip {
          font-size: 10.5px;
          padding: 3px 8px;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(235, 235, 245, 0.75);
          cursor: pointer;
          transition: all 0.15s;
        }

        .copilot-preset-chip:hover {
          background: rgba(10, 132, 255, 0.15);
          border-color: rgba(10, 132, 255, 0.35);
          color: #5AC8FA;
        }

        .copilot-error-banner {
          font-size: 11px;
          color: #FF453A;
          background: rgba(255, 69, 58, 0.12);
          border: 1px solid rgba(255, 69, 58, 0.3);
          border-radius: 6px;
          padding: 6px 10px;
        }

        .copilot-preview-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 10px;
        }

        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          color: rgba(235, 235, 245, 0.8);
        }

        .preview-header-left {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
        }

        .preview-line-count {
          font-size: 10px;
          color: rgba(235, 235, 245, 0.5);
          font-weight: 400;
        }

        .accept-hint {
          font-size: 10px;
          color: #30D158;
          font-weight: 600;
        }

        .copilot-code-block {
          background: rgba(0, 0, 0, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 6px;
          padding: 10px 12px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 11.5px;
          line-height: 1.5;
          color: #68D391;
          max-height: 240px;
          overflow-y: auto;
          margin: 0;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .preview-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          padding-top: 4px;
        }

        .copilot-secondary-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(235, 235, 245, 0.8);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .copilot-secondary-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.12);
          color: #FFFFFF;
        }

        .copilot-accept-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 14px;
          border-radius: 6px;
          background: linear-gradient(135deg, #30D158 0%, #248A3D 100%);
          color: #000000;
          border: none;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 2px 8px rgba(48, 209, 88, 0.35);
        }

        .copilot-accept-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(48, 209, 88, 0.5);
        }
      `}</style>
    </div>
  )
}

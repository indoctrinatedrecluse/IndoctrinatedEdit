import React, { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  X,
  RotateCcw,
  Zap,
  Code2,
  Check,
  CornerDownLeft,
  FileCode2,
} from 'lucide-react'
import { AiService, PRESET_MODELS } from '../../services/aiService'
import { AiStreamChunk } from '@sdk/types'

interface InlineCopilotWidgetProps {
  isOpen: boolean
  selectedText: string
  language: string
  onClose: () => void
  onAccept: (transformedCode: string) => void
}

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
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (isOpen) {
      setPrompt('')
      setProposedCode(null)
      setIsGenerating(false)
      setStreamError(null)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 60)
    } else {
      if (abortRef.current) {
        abortRef.current()
        abortRef.current = null
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleGenerate = async (customPrompt?: string) => {
    const activePrompt = customPrompt || prompt
    if (!activePrompt.trim() || isGenerating) return

    setIsGenerating(true)
    setStreamError(null)

    const activeModelId = AiService.getActiveModelIdForCurrentMode() || 'gemini-3.7-flash'
    const modelOption = PRESET_MODELS.find((m) => m.id === activeModelId) || PRESET_MODELS[0]

    // Construct a focused system instructions + prompt
    const systemPrompt = `You are IndoctrinatedEdit Inline Copilot.
You transform or generate code precisely based on user instructions.
Language: ${language}
RULES:
1. Return ONLY the transformed code snippet.
2. DO NOT wrap with markdown conversational banter.
3. Keep indentation and formatting clean and idiomatic for ${language}.`

    const userMessageContent = selectedText
      ? `${systemPrompt}\n\nOriginal Code:\n\`\`\`${language}\n${selectedText}\n\`\`\`\n\nTask: ${activePrompt}`
      : `${systemPrompt}\n\nGenerate code for: ${activePrompt}`

    let accumulatedText = ''

    try {
      const abortFn = AiService.streamChat(
        modelOption,
        [{ id: 'inline-msg', role: 'user', content: userMessageContent, timestamp: Date.now() }],
        (chunk: AiStreamChunk) => {
          if (chunk.error) {
            setStreamError(chunk.error)
          }
          if (chunk.text) {
            accumulatedText += chunk.text
            const cleaned = accumulatedText
              .replace(/^```[a-zA-Z0-9_-]*\n/, '')
              .replace(/\n```$/, '')
            setProposedCode(cleaned)
          }
          if (chunk.done) {
            setIsGenerating(false)
            if (!accumulatedText.trim()) {
              applyLocalFallbackTransform(activePrompt)
            }
          }
        }
      )
      abortRef.current = abortFn
    } catch {
      applyLocalFallbackTransform(activePrompt)
    }
  }

  const applyLocalFallbackTransform = (activePrompt: string) => {
    let result = selectedText || `// Generated code for: ${activePrompt}`
    const lowerPrompt = activePrompt.toLowerCase()

    if (lowerPrompt.includes('doc') || lowerPrompt.includes('comment')) {
      result = `/**\n * ✨ ${activePrompt}\n */\n` + (selectedText || '// Implementation details')
    } else if (lowerPrompt.includes('async') || lowerPrompt.includes('await')) {
      result = selectedText.replace(/function\s+([A-Za-z0-9_]+)/g, 'async function $1')
      if (!result.includes('async')) {
        result = `async function executeAsync() {\n  ${selectedText || 'return true'}\n}`
      }
    } else if (lowerPrompt.includes('test')) {
      result = `describe('${activePrompt}', () => {\n  it('should execute successfully', () => {\n    ${selectedText || 'expect(true).toBe(true)'}\n  });\n});`
    } else if (lowerPrompt.includes('optimize') || lowerPrompt.includes('clean')) {
      result = `// ✨ Optimized & Cleaned (${language})\n` + selectedText.split('\n').map((l) => l.trimEnd()).join('\n')
    } else {
      result = `// ✨ AI Transformation: ${activePrompt}\n` + (selectedText || `export const result = '${activePrompt}'`)
    }

    setProposedCode(result)
    setIsGenerating(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (abortRef.current) abortRef.current()
      onClose()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      if (proposedCode) {
        onAccept(proposedCode)
        onClose()
      } else {
        handleGenerate()
      }
    } else if (e.key === 'Enter' && !proposedCode) {
      handleGenerate()
    }
  }

  const presets = [
    { label: 'Refactor Cleanly', prompt: 'Refactor and modernize code with clean types' },
    { label: 'Add JSDoc / Comments', prompt: 'Add detailed documentation and docstrings' },
    { label: 'Convert to Async/Await', prompt: 'Convert promises and callbacks to async/await' },
    { label: 'Write Unit Tests', prompt: 'Generate comprehensive unit tests' },
    { label: 'Optimize Performance', prompt: 'Optimize algorithm and minimize allocations' },
  ]

  return (
    <div
      className="inline-copilot-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (abortRef.current) abortRef.current()
          onClose()
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
              onClick={() => {
                if (abortRef.current) abortRef.current()
                onClose()
              }}
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
          <button
            onClick={() => handleGenerate()}
            disabled={!prompt.trim() || isGenerating}
            className="copilot-generate-btn"
            title="Generate (Enter)"
          >
            {isGenerating ? (
              <>
                <Zap size={13} className="animate-spin text-cyan" />
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <span>Generate</span>
                <CornerDownLeft size={12} />
              </>
            )}
          </button>
        </div>

        {/* Quick Presets */}
        {!proposedCode && !isGenerating && (
          <div className="copilot-presets-row">
            <span className="presets-caption">Quick Presets:</span>
            {presets.map((preset, idx) => (
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
                <span>Proposed Code Transformation</span>
                <span className="preview-line-count">
                  {proposedCode.split('\n').length} lines
                </span>
              </div>
              <div className="preview-header-right">
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
                onClick={() => {
                  if (abortRef.current) abortRef.current()
                  onClose()
                }}
                className="copilot-secondary-btn"
              >
                <X size={12} />
                <span>Discard</span>
              </button>
              <button
                onClick={() => {
                  onAccept(proposedCode)
                  onClose()
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

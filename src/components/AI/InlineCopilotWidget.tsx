import React, { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  ArrowRight,
  X,
  RotateCcw,
  Zap,
  Code2,
  CheckCheck,
} from 'lucide-react'

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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setPrompt('')
      setProposedCode(null)
      setIsGenerating(false)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleGenerate = async (customPrompt?: string) => {
    const activePrompt = customPrompt || prompt
    if (!activePrompt.trim()) return

    setIsGenerating(true)

    // Simulate intelligent AI transformation based on the prompt
    await new Promise((r) => setTimeout(r, 400))

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
    { label: 'Refactor Cleanly', prompt: 'Refactor and modernize code' },
    { label: 'Add Docstrings', prompt: 'Add detailed JSDoc / documentation comments' },
    { label: 'Convert to Async/Await', prompt: 'Convert promises to async/await syntax' },
    { label: 'Write Unit Tests', prompt: 'Generate unit tests for this code' },
    { label: 'Optimize Performance', prompt: 'Optimize algorithm and data structures' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-2xl rounded-2xl border border-purple-500/40 bg-[#0d0915]/95 shadow-2xl backdrop-blur-2xl text-white p-5 space-y-4"
        style={{
          boxShadow: '0 20px 60px 0 rgba(112, 0, 255, 0.45)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2 text-purple-300 font-semibold">
            <div className="p-1.5 rounded-lg bg-purple-600/30 text-purple-300 border border-purple-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <span>In-Editor AI Copilot (Ctrl+K)</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
              {language}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Bar */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder="Instruct AI (e.g. 'Refactor to async/await', 'Add error handling', 'Write tests')..."
            className="w-full pl-4 pr-24 py-3 bg-black/50 border border-purple-500/40 rounded-xl text-sm font-medium text-white placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/40 transition-all"
          />
          <button
            onClick={() => handleGenerate()}
            disabled={!prompt.trim() || isGenerating}
            className="absolute right-2 top-2 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-all cursor-pointer"
          >
            {isGenerating ? (
              <Zap className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowRight className="w-3.5 h-3.5" />
            )}
            <span>Generate</span>
          </button>
        </div>

        {/* Quick Presets */}
        {!proposedCode && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPrompt(preset.prompt)
                  handleGenerate(preset.prompt)
                }}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-purple-600/30 text-white/70 hover:text-white border border-white/[0.06] hover:border-purple-500/30 text-[11px] font-medium transition-all"
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        {/* Proposed Code Preview */}
        {proposedCode && (
          <div className="space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span className="font-semibold text-purple-300 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" /> Proposed Changes
              </span>
              <span className="text-[11px] opacity-60">Press Ctrl+Enter to Accept</span>
            </div>

            <pre className="p-3.5 rounded-xl bg-black/60 border border-purple-500/30 text-xs font-mono text-emerald-300 max-h-56 overflow-auto leading-relaxed select-text">
              {proposedCode}
            </pre>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => handleGenerate()}
                disabled={isGenerating}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs text-white/80 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white transition-colors"
              >
                Discard (Esc)
              </button>
              <button
                onClick={() => {
                  onAccept(proposedCode)
                  onClose()
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Accept Transformation (Ctrl+Enter)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

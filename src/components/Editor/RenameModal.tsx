import React, { useState, useEffect, useRef } from 'react'
import { Edit3, Check, X } from 'lucide-react'
import { lspService, LspRenameResult } from '../../services/lspService'

interface RenameModalProps {
  isOpen: boolean
  initialSymbolName: string
  currentFilePath?: string
  onClose: () => void
  onApplyRename: (result: LspRenameResult) => void
}

export const RenameModal: React.FC<RenameModalProps> = ({
  isOpen,
  initialSymbolName,
  currentFilePath: _currentFilePath,
  onClose,
  onApplyRename,
}) => {
  const [newName, setNewName] = useState(initialSymbolName)
  const [previewResult, setPreviewResult] = useState<LspRenameResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setNewName(initialSymbolName)
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
    }
  }, [isOpen, initialSymbolName])

  useEffect(() => {
    if (isOpen && newName.trim() && newName !== initialSymbolName) {
      const preview = lspService.prepareRename(initialSymbolName, newName)
      setPreviewResult(preview)
    } else {
      setPreviewResult(null)
    }
  }, [isOpen, newName, initialSymbolName])

  if (!isOpen) return null

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newName.trim() || newName === initialSymbolName) {
      onClose()
      return
    }
    const result = lspService.prepareRename(initialSymbolName, newName)
    onApplyRename(result)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-md rounded-xl border border-purple-500/30 bg-[#0d0915]/95 p-5 shadow-2xl backdrop-blur-2xl text-white"
        style={{
          boxShadow: '0 16px 48px 0 rgba(112, 0, 255, 0.35)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2 text-purple-300 font-semibold">
            <Edit3 className="w-4 h-4 text-purple-400" />
            <span>Rename Symbol (F2)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs text-white/60 mb-1 block">
              Renaming <span className="font-mono text-purple-300">"{initialSymbolName}"</span> to:
            </label>
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 bg-black/40 border border-purple-500/40 rounded-lg text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 transition-all"
              placeholder="Enter new identifier name..."
            />
          </div>

          {/* Preview Details */}
          {previewResult && (
            <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-500/20 text-xs text-white/80 space-y-1.5 animate-fadeIn">
              <div className="flex items-center justify-between font-medium text-purple-300">
                <span>Workspace Impact</span>
                <span>
                  {previewResult.totalOccurrences} occurrences in {previewResult.affectedFiles} file(s)
                </span>
              </div>
              <div className="text-[11px] text-white/60">
                Will atomically refactor references across all loaded workspace files.
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newName.trim() || newName === initialSymbolName}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 rounded-lg shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Apply Refactor
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

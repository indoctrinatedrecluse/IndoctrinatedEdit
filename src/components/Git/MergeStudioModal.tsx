import React, { useState, useEffect } from 'react'
import {
  GitMerge,
  Check,
  X,
  ShieldCheck,
} from 'lucide-react'
import { gitAdvancedService, ConflictBlock } from '../../services/gitAdvancedService'

interface MergeStudioModalProps {
  isOpen: boolean
  filePath: string
  fileContent: string
  onClose: () => void
  onSaveResolvedContent: (resolvedContent: string) => void
}

export const MergeStudioModal: React.FC<MergeStudioModalProps> = ({
  isOpen,
  filePath,
  fileContent,
  onClose,
  onSaveResolvedContent,
}) => {
  const [conflicts, setConflicts] = useState<ConflictBlock[]>([])
  const [workingContent, setWorkingContent] = useState<string>(fileContent)
  const [selectedConflictIndex, setSelectedConflictIndex] = useState<number>(0)

  useEffect(() => {
    if (isOpen) {
      const parsed = gitAdvancedService.parseConflicts(filePath, fileContent)
      setConflicts(parsed)
      setWorkingContent(fileContent)
      setSelectedConflictIndex(0)
    }
  }, [isOpen, filePath, fileContent])

  if (!isOpen) return null

  const activeConflict = conflicts[selectedConflictIndex]

  const handleResolveActive = (choice: 'current' | 'incoming' | 'both') => {
    if (!activeConflict) return
    const updated = gitAdvancedService.resolveConflictInContent(
      workingContent,
      activeConflict,
      choice
    )
    setWorkingContent(updated)
    const newConflicts = gitAdvancedService.parseConflicts(filePath, updated)
    setConflicts(newConflicts)
    if (selectedConflictIndex >= newConflicts.length) {
      setSelectedConflictIndex(Math.max(0, newConflicts.length - 1))
    }
  }

  const handleResolveAll = (choice: 'current' | 'incoming' | 'both') => {
    const updated = gitAdvancedService.resolveAllConflicts(filePath, workingContent, choice)
    setWorkingContent(updated)
    setConflicts([])
  }

  const handleComplete = () => {
    onSaveResolvedContent(workingContent)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg animate-fadeIn">
      <div
        className="w-[92vw] max-w-5xl h-[85vh] flex flex-col rounded-2xl border border-purple-500/30 bg-[#0d0915]/95 shadow-2xl backdrop-blur-2xl text-white overflow-hidden"
        style={{
          boxShadow: '0 24px 64px 0 rgba(112, 0, 255, 0.4)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base text-white">3-Way Merge Conflict Studio</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                  {conflicts.length} {conflicts.length === 1 ? 'conflict remaining' : 'conflicts remaining'}
                </span>
              </div>
              <div className="text-xs text-white/50 font-mono mt-0.5">{filePath}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {conflicts.length > 0 && (
              <>
                <button
                  onClick={() => handleResolveAll('current')}
                  className="px-3 py-1.5 text-xs rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/30 transition-all"
                  title="Accept all current changes (HEAD)"
                >
                  Accept All Current
                </button>
                <button
                  onClick={() => handleResolveAll('incoming')}
                  className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/30 transition-all"
                  title="Accept all incoming changes"
                >
                  Accept All Incoming
                </button>
              </>
            )}

            <button
              onClick={handleComplete}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-lg shadow-purple-600/30 transition-all cursor-pointer ml-2"
            >
              <Check className="w-4 h-4" />
              Complete Merge
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {conflicts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="p-4 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-4 animate-bounce">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">All Conflicts Resolved!</h3>
            <p className="text-xs text-white/60 max-w-sm mb-6">
              The file is completely clean and ready to be saved back to your working tree.
            </p>
            <button
              onClick={handleComplete}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-sm shadow-xl shadow-purple-600/40 transition-all cursor-pointer"
            >
              Save & Finalize Resolved File
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Conflict Selector Tabs */}
            {conflicts.length > 1 && (
              <div className="flex items-center gap-1.5 px-6 py-2 border-b border-white/[0.06] bg-black/20 overflow-x-auto text-xs">
                {conflicts.map((c, idx) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConflictIndex(idx)}
                    className={`px-3 py-1 rounded-md transition-all font-mono ${
                      selectedConflictIndex === idx
                        ? 'bg-purple-600/40 text-white border border-purple-500/40 font-semibold'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    Conflict #{idx + 1} (Line {c.startLine}-{c.endLine})
                  </button>
                ))}
              </div>
            )}

            {/* Split Conflict Studio View */}
            {activeConflict && (
              <div className="flex-1 grid grid-cols-2 gap-4 p-6 overflow-y-auto">
                {/* Current Change Pane */}
                <div className="flex flex-col rounded-xl border border-blue-500/30 bg-blue-950/20 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-blue-900/30 border-b border-blue-500/20">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      <span>{activeConflict.currentBranch}</span>
                    </div>
                    <button
                      onClick={() => handleResolveActive('current')}
                      className="px-2.5 py-1 rounded bg-blue-500 hover:bg-blue-400 text-white font-semibold text-[11px] shadow-sm transition-all"
                    >
                      Accept Current
                    </button>
                  </div>
                  <pre className="flex-1 p-4 text-xs font-mono text-blue-100 overflow-auto whitespace-pre leading-relaxed select-text">
                    {activeConflict.currentText || '(empty)'}
                  </pre>
                </div>

                {/* Incoming Change Pane */}
                <div className="flex flex-col rounded-xl border border-emerald-500/30 bg-emerald-950/20 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-900/30 border-b border-emerald-500/20">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{activeConflict.incomingBranch}</span>
                    </div>
                    <button
                      onClick={() => handleResolveActive('incoming')}
                      className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-[11px] shadow-sm transition-all"
                    >
                      Accept Incoming
                    </button>
                  </div>
                  <pre className="flex-1 p-4 text-xs font-mono text-emerald-100 overflow-auto whitespace-pre leading-relaxed select-text">
                    {activeConflict.incomingText || '(empty)'}
                  </pre>
                </div>
              </div>
            )}

            {/* Quick Action Footer Bar */}
            {activeConflict && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.08] bg-black/40 text-xs">
                <div className="text-white/60">
                  Resolving conflict at lines {activeConflict.startLine}–{activeConflict.endLine}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResolveActive('both')}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-white transition-colors"
                  >
                    Accept Both Changes
                  </button>
                  <button
                    onClick={() => handleResolveActive('current')}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-600/30 transition-all"
                  >
                    Accept Current
                  </button>
                  <button
                    onClick={() => handleResolveActive('incoming')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-600/30 transition-all"
                  >
                    Accept Incoming
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

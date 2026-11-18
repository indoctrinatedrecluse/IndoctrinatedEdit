import React, { useState, useEffect } from 'react'
import {
  GitMerge,
  Check,
  X,
  ShieldCheck,
  Edit3,
} from 'lucide-react'
import { gitAdvancedService, ConflictBlock } from '../../services/gitAdvancedService'

interface MergeStudioModalProps {
  isOpen: boolean
  filePath: string
  fileContent: string
  workspacePath?: string
  onClose: () => void
  onSaveResolvedContent: (resolvedContent: string) => void
}

export const MergeStudioModal: React.FC<MergeStudioModalProps> = ({
  isOpen,
  filePath,
  fileContent,
  workspacePath,
  onClose,
  onSaveResolvedContent,
}) => {
  const [conflicts, setConflicts] = useState<ConflictBlock[]>([])
  const [workingContent, setWorkingContent] = useState<string>(fileContent)
  const [selectedConflictIndex, setSelectedConflictIndex] = useState<number>(0)
  const [showCustomEditor, setShowCustomEditor] = useState<boolean>(false)
  const [customDraft, setCustomDraft] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      const parsed = gitAdvancedService.parseConflicts(filePath, fileContent)
      setConflicts(parsed)
      setWorkingContent(fileContent)
      setSelectedConflictIndex(0)
      setShowCustomEditor(false)
      setCustomDraft(parsed[0]?.currentText || '')
    }
  }, [isOpen, filePath, fileContent])

  useEffect(() => {
    const active = conflicts[selectedConflictIndex]
    if (active) {
      setCustomDraft([active.currentText, active.incomingText].filter(Boolean).join('\n'))
    }
  }, [selectedConflictIndex, conflicts])

  if (!isOpen) return null

  const activeConflict = conflicts[selectedConflictIndex]
  const hasBase = activeConflict?.baseText !== undefined

  const handleResolveActive = (choice: 'current' | 'incoming' | 'both' | 'custom') => {
    if (!activeConflict) return
    const updated = gitAdvancedService.resolveConflictInContent(
      workingContent,
      activeConflict,
      choice,
      choice === 'custom' ? customDraft : undefined
    )
    setWorkingContent(updated)
    const newConflicts = gitAdvancedService.parseConflicts(filePath, updated)
    setConflicts(newConflicts)
    setShowCustomEditor(false)
    if (selectedConflictIndex >= newConflicts.length) {
      setSelectedConflictIndex(Math.max(0, newConflicts.length - 1))
    }
  }

  const handleResolveAll = (choice: 'current' | 'incoming' | 'both') => {
    const updated = gitAdvancedService.resolveAllConflicts(filePath, workingContent, choice)
    setWorkingContent(updated)
    setConflicts([])
  }

  const handleComplete = async (andStage = false) => {
    onSaveResolvedContent(workingContent)
    if (andStage && workspacePath && window.electronAPI?.git?.stageFile) {
      await window.electronAPI.git.stageFile(filePath, workspacePath).catch(() => {})
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg animate-fadeIn">
      <div
        className="w-[94vw] max-w-6xl h-[86vh] flex flex-col rounded-2xl border border-purple-500/30 bg-[#0d0915]/95 shadow-2xl backdrop-blur-2xl text-white overflow-hidden"
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
              onClick={() => void handleComplete(false)}
              disabled={conflicts.length > 0}
              title={conflicts.length > 0 ? `Resolve ${conflicts.length} remaining conflict(s) first` : 'Apply resolved merge'}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white rounded-lg shadow-lg transition-all ml-2 ${
                conflicts.length > 0
                  ? 'bg-purple-600/40 cursor-not-allowed opacity-60'
                  : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30 cursor-pointer'
              }`}
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => void handleComplete(false)}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-sm shadow-xl shadow-purple-600/40 transition-all cursor-pointer"
              >
                Save Resolved File
              </button>
              {workspacePath && (
                <button
                  onClick={() => void handleComplete(true)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm shadow-xl shadow-emerald-600/40 transition-all cursor-pointer"
                >
                  Save &amp; Stage (git add)
                </button>
              )}
            </div>
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

            {/* 2-Way or True 3-Way Split Conflict Studio View */}
            {activeConflict && (
              <div className={`flex-1 grid ${hasBase ? 'grid-cols-3' : 'grid-cols-2'} gap-4 p-6 overflow-y-auto`}>
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

                {/* Common Ancestor (Base) Pane for diff3 conflicts */}
                {hasBase && (
                  <div className="flex flex-col rounded-xl border border-amber-500/30 bg-amber-950/20 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-amber-900/30 border-b border-amber-500/20">
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span>Common Ancestor (Base)</span>
                      </div>
                      <button
                        onClick={() => {
                          setCustomDraft(activeConflict.baseText || '')
                          setShowCustomEditor(true)
                        }}
                        className="px-2.5 py-1 rounded bg-amber-600/80 hover:bg-amber-500 text-white font-semibold text-[11px] shadow-sm transition-all"
                      >
                        Edit From Base
                      </button>
                    </div>
                    <pre className="flex-1 p-4 text-xs font-mono text-amber-100 overflow-auto whitespace-pre leading-relaxed select-text">
                      {activeConflict.baseText || '(empty)'}
                    </pre>
                  </div>
                )}

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

            {/* Editable Custom Resolution Drawer */}
            {activeConflict && showCustomEditor && (
              <div className="px-6 pb-4">
                <div className="rounded-xl border border-purple-500/40 bg-black/50 p-3">
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <span className="font-semibold text-purple-300">Custom Hand-Edited Resolution</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResolveActive('custom')}
                        className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold"
                      >
                        Apply Custom Resolution
                      </button>
                      <button
                        onClick={() => setShowCustomEditor(false)}
                        className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/80"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={customDraft}
                    onChange={(e) => setCustomDraft(e.target.value)}
                    rows={5}
                    spellCheck={false}
                    className="w-full rounded-lg bg-black/60 border border-white/15 p-2.5 text-xs font-mono text-white outline-none focus:border-purple-400"
                  />
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
                    onClick={() => setShowCustomEditor((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{showCustomEditor ? 'Hide Custom Editor' : 'Custom Edit'}</span>
                  </button>
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

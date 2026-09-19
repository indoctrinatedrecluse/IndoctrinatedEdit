import React from 'react'
import { Search, X, FileCode, ArrowRight } from 'lucide-react'
import { LspLocation } from '../../services/lspService'

interface LspReferencesModalProps {
  isOpen: boolean
  title: string
  symbolName: string
  locations: LspLocation[]
  onClose: () => void
  onSelectLocation: (location: LspLocation) => void
}

export const LspReferencesModal: React.FC<LspReferencesModalProps> = ({
  isOpen,
  title,
  symbolName,
  locations,
  onClose,
  onSelectLocation,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-2xl max-h-[70vh] flex flex-col rounded-xl border border-purple-500/30 bg-[#0d0915]/95 shadow-2xl backdrop-blur-2xl text-white overflow-hidden"
        style={{
          boxShadow: '0 16px 48px 0 rgba(112, 0, 255, 0.35)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-black/30">
          <div className="flex items-center gap-2 text-purple-300 font-semibold">
            <Search className="w-4 h-4 text-purple-400" />
            <span>
              {title}: <span className="font-mono text-white">{symbolName}</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {locations.length} {locations.length === 1 ? 'match' : 'matches'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {locations.length === 0 ? (
            <div className="p-8 text-center text-white/40 text-sm">
              No matching locations found for "{symbolName}".
            </div>
          ) : (
            locations.map((loc, idx) => {
              const fileName = loc.filePath.split(/[/\\]/).pop() || loc.filePath
              return (
                <div
                  key={idx}
                  onClick={() => {
                    onSelectLocation(loc)
                    onClose()
                  }}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] hover:bg-purple-600/20 border border-transparent hover:border-purple-500/30 text-xs cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileCode className="w-4 h-4 text-purple-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white group-hover:text-purple-200">
                          {fileName}
                        </span>
                        <span className="text-[11px] text-white/40 font-mono">
                          {loc.filePath}:{loc.lineNumber}:{loc.column}
                        </span>
                      </div>
                      {loc.lineContent && (
                        <div className="text-[11px] text-white/60 font-mono truncate mt-0.5 max-w-lg">
                          {loc.lineContent}
                        </div>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-purple-300 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

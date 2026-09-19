import React, { useState } from 'react'
import {
  FileCode,
  ChevronRight,
  Code2,
  Box,
  Braces,
} from 'lucide-react'
import { lspService } from '../../services/lspService'

interface BreadcrumbsBarProps {
  filePath: string
  fileContent: string
  cursorLine: number
  onNavigateLine?: (line: number) => void
}

export const BreadcrumbsBar: React.FC<BreadcrumbsBarProps> = ({
  filePath,
  fileContent,
  cursorLine,
  onNavigateLine,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const breadcrumbs = lspService.getBreadcrumbs(filePath, fileContent, cursorLine)
  const allSymbols = lspService.extractDocumentSymbols(filePath, fileContent)

  const pathParts = filePath.split(/[/\\]/)
  const folder = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : ''

  return (
    <div
      className="breadcrumbs-bar flex items-center px-3 py-1 text-xs border-b border-white/[0.06] bg-black/20 backdrop-blur-md select-none gap-1 overflow-x-auto"
      style={{
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: 'var(--color-text-muted, #8b949e)',
        minHeight: '26px',
        maxHeight: '26px',
      }}
    >
      {folder && (
        <span className="opacity-60 hover:opacity-100 transition-opacity truncate max-w-[120px]">
          {folder}
        </span>
      )}

      {folder && (
        <ChevronRight className="w-3 h-3 text-white/30 shrink-0 mx-0.5" />
      )}

      {breadcrumbs.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && (
            <ChevronRight className="w-3 h-3 text-white/30 shrink-0 mx-0.5" />
          )}

          <div
            className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-white/[0.08] hover:text-white transition-all cursor-pointer group"
            onClick={() => {
              if (item.kind === 'file') {
                setIsDropdownOpen(!isDropdownOpen)
              } else if (onNavigateLine) {
                onNavigateLine(item.lineNumber)
              }
            }}
          >
            {item.kind === 'file' ? (
              <FileCode className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
            ) : item.kind === 'class' ? (
              <Box className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-300 transition-colors" />
            ) : (
              <Code2 className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300 transition-colors" />
            )}
            <span className="font-medium text-white/80 group-hover:text-white">
              {item.name}
            </span>
          </div>
        </React.Fragment>
      ))}

      {/* Symbol quick jumper dropdown */}
      {isDropdownOpen && allSymbols.length > 0 && (
        <div
          className="absolute top-7 left-3 z-50 min-w-[220px] max-h-[300px] overflow-y-auto rounded-lg border border-purple-500/30 bg-[#0d0915]/95 backdrop-blur-xl shadow-2xl p-1 text-xs"
          style={{
            boxShadow: '0 8px 32px 0 rgba(112, 0, 255, 0.25)',
          }}
        >
          <div className="px-2 py-1 text-[10px] font-semibold text-purple-300 uppercase tracking-wider border-b border-white/[0.06] flex items-center justify-between">
            <span>Document Outline</span>
            <span className="opacity-60">{allSymbols.length} symbols</span>
          </div>

          <div className="mt-1 space-y-0.5">
            {allSymbols.map((sym, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-purple-600/20 hover:text-white text-white/80 cursor-pointer transition-colors"
                onClick={() => {
                  setIsDropdownOpen(false)
                  if (onNavigateLine) onNavigateLine(sym.lineNumber)
                }}
              >
                <div className="flex items-center gap-2 truncate">
                  {sym.kind === 'class' ? (
                    <Box className="w-3 h-3 text-amber-400 shrink-0" />
                  ) : sym.kind === 'interface' ? (
                    <Braces className="w-3 h-3 text-cyan-400 shrink-0" />
                  ) : (
                    <Code2 className="w-3 h-3 text-purple-400 shrink-0" />
                  )}
                  <span className="truncate">{sym.name}</span>
                </div>
                <span className="text-[10px] opacity-40 ml-2 font-mono">
                  :{sym.lineNumber}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

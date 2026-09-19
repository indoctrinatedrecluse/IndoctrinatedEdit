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
      className="breadcrumbs-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        fontSize: '11px',
        lineHeight: '16px',
        height: '24px',
        minHeight: '24px',
        maxHeight: '24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        background: 'rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(8px)',
        userSelect: 'none',
        gap: '4px',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        boxSizing: 'border-box',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: 'var(--color-text-muted, #8b949e)',
      }}
    >
      {folder && (
        <span style={{ opacity: 0.6, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {folder}
        </span>
      )}

      {folder && (
        <ChevronRight size={11} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
      )}

      {breadcrumbs.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && (
            <ChevronRight size={11} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
          )}

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '1px 5px',
              borderRadius: '3px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            onClick={() => {
              if (item.kind === 'file') {
                setIsDropdownOpen(!isDropdownOpen)
              } else if (onNavigateLine) {
                onNavigateLine(item.lineNumber)
              }
            }}
          >
            {item.kind === 'file' ? (
              <FileCode size={12} color="#818cf8" style={{ flexShrink: 0 }} />
            ) : item.kind === 'class' ? (
              <Box size={12} color="#fbbf24" style={{ flexShrink: 0 }} />
            ) : (
              <Code2 size={12} color="#c084fc" style={{ flexShrink: 0 }} />
            )}
            <span style={{ fontWeight: 500, color: 'rgba(255, 255, 255, 0.85)' }}>
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

import React from 'react'
import { GitCommit, User, Clock } from 'lucide-react'
import { gitAdvancedService } from '../../services/gitAdvancedService'

interface InlineBlameLensProps {
  filePath: string
  fileContent: string
  cursorLine: number
}

export const InlineBlameLens: React.FC<InlineBlameLensProps> = ({
  filePath,
  fileContent,
  cursorLine,
}) => {
  const blameLines = gitAdvancedService.getBlameForFile(filePath, fileContent)
  const currentBlame = blameLines[cursorLine - 1]

  if (!currentBlame) return null

  return (
    <div
      className="inline-blame-lens flex items-center gap-2 px-2.5 py-0.5 text-[11px] select-none pointer-events-none opacity-40 hover:opacity-100 transition-opacity"
      style={{
        color: 'var(--color-text-muted, #8b949e)',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}
    >
      <div className="flex items-center gap-1">
        <User className="w-3 h-3 text-purple-400" />
        <span className="font-medium text-white/80">{currentBlame.author}</span>
      </div>

      <span className="opacity-40">•</span>

      <div className="flex items-center gap-1">
        <Clock className="w-3 h-3 text-blue-400" />
        <span>{currentBlame.relativeDate}</span>
      </div>

      <span className="opacity-40">•</span>

      <div className="flex items-center gap-1 truncate max-w-sm">
        <GitCommit className="w-3 h-3 text-emerald-400 shrink-0" />
        <span className="truncate italic text-white/70">{currentBlame.commitMessage}</span>
      </div>

      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.08] font-mono text-purple-300">
        {currentBlame.shortHash}
      </span>
    </div>
  )
}

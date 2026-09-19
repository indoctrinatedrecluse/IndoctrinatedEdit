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
      className="inline-blame-lens"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '2px 10px',
        fontSize: '11px',
        lineHeight: '16px',
        height: '20px',
        maxHeight: '20px',
        minHeight: '20px',
        boxSizing: 'border-box',
        userSelect: 'none',
        pointerEvents: 'none',
        opacity: 0.5,
        color: 'var(--color-text-muted, #8b949e)',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        flexShrink: 0,
        background: 'rgba(0, 0, 0, 0.1)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
        <User size={11} color="#c084fc" />
        <span style={{ fontWeight: 500, color: 'rgba(255, 255, 255, 0.85)' }}>{currentBlame.author}</span>
      </div>

      <span style={{ opacity: 0.35, flexShrink: 0 }}>•</span>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
        <Clock size={11} color="#60a5fa" />
        <span>{currentBlame.relativeDate}</span>
      </div>

      <span style={{ opacity: 0.35, flexShrink: 0 }}>•</span>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '360px' }}>
        <GitCommit size={11} color="#34d399" style={{ flexShrink: 0 }} />
        <span style={{ fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentBlame.commitMessage}
        </span>
      </div>

      <span
        style={{
          fontSize: '10px',
          padding: '1px 5px',
          borderRadius: '3px',
          background: 'rgba(255, 255, 255, 0.08)',
          fontFamily: 'monospace',
          color: '#d8b4fe',
          flexShrink: 0,
          marginLeft: 'auto',
        }}
      >
        {currentBlame.shortHash}
      </span>
    </div>
  )
}


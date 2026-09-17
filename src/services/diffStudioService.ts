/**
 * IndoctrinatedEdit - Visual Diff, Patch Generator & 3-Way Merge Studio Service
 */

export interface DiffLine {
  type: 'added' | 'deleted' | 'unchanged' | 'modified'
  leftLineNumber?: number
  rightLineNumber?: number
  leftContent?: string
  rightContent?: string
  charChanges?: {
    left?: Array<{ type: 'del' | 'same'; text: string }>
    right?: Array<{ type: 'add' | 'same'; text: string }>
  }
}

export interface DiffSummary {
  additions: number
  deletions: number
  modifications: number
  unchanged: number
  similarityPercentage: number
}

export interface MergeConflictBlock {
  id: string
  startLine: number
  endLine: number
  currentText: string
  currentLabel: string
  incomingText: string
  incomingLabel: string
  baseText?: string
  resolvedText?: string
  status: 'unresolved' | 'accepted-current' | 'accepted-incoming' | 'accepted-both' | 'custom'
}

class DiffStudioService {
  /**
   * Compute line-by-line diff between two text strings
   */
  public computeDiff(originalText: string, modifiedText: string): { lines: DiffLine[]; summary: DiffSummary } {
    const origLines = originalText.split(/\r?\n/)
    const modLines = modifiedText.split(/\r?\n/)

    const lines: DiffLine[] = []
    let origIdx = 0
    let modIdx = 0
    let additions = 0
    let deletions = 0
    let modifications = 0
    let unchanged = 0

    // Build standard line mapping
    while (origIdx < origLines.length || modIdx < modLines.length) {
      const origLine = origLines[origIdx]
      const modLine = modLines[modIdx]

      if (origIdx < origLines.length && modIdx < modLines.length) {
        if (origLine === modLine) {
          lines.push({
            type: 'unchanged',
            leftLineNumber: origIdx + 1,
            rightLineNumber: modIdx + 1,
            leftContent: origLine,
            rightContent: modLine,
          })
          unchanged++
          origIdx++
          modIdx++
        } else {
          // Lookahead for match
          const matchMod = modLines.indexOf(origLine, modIdx)
          const matchOrig = origLines.indexOf(modLine, origIdx)

          if (matchMod !== -1 && (matchOrig === -1 || matchMod - modIdx <= matchOrig - origIdx)) {
            // Lines added in modified
            while (modIdx < matchMod) {
              lines.push({
                type: 'added',
                rightLineNumber: modIdx + 1,
                rightContent: modLines[modIdx],
              })
              additions++
              modIdx++
            }
          } else if (matchOrig !== -1) {
            // Lines deleted from original
            while (origIdx < matchOrig) {
              lines.push({
                type: 'deleted',
                leftLineNumber: origIdx + 1,
                leftContent: origLines[origIdx],
              })
              deletions++
              origIdx++
            }
          } else {
            // Line was modified
            const charDiff = this.computeCharDiff(origLine, modLine)
            lines.push({
              type: 'modified',
              leftLineNumber: origIdx + 1,
              rightLineNumber: modIdx + 1,
              leftContent: origLine,
              rightContent: modLine,
              charChanges: charDiff,
            })
            modifications++
            origIdx++
            modIdx++
          }
        }
      } else if (origIdx < origLines.length) {
        lines.push({
          type: 'deleted',
          leftLineNumber: origIdx + 1,
          leftContent: origLines[origIdx],
        })
        deletions++
        origIdx++
      } else if (modIdx < modLines.length) {
        lines.push({
          type: 'added',
          rightLineNumber: modIdx + 1,
          rightContent: modLines[modIdx],
        })
        additions++
        modIdx++
      }
    }

    const totalLines = origLines.length + modLines.length
    const similarityPercentage = totalLines > 0
      ? Math.max(0, Math.min(100, Math.round((unchanged * 2 / totalLines) * 100)))
      : 100

    return {
      lines,
      summary: {
        additions,
        deletions,
        modifications,
        unchanged,
        similarityPercentage,
      },
    }
  }

  /**
   * Character-level diff between two lines
   */
  public computeCharDiff(left: string, right: string): {
    left: Array<{ type: 'del' | 'same'; text: string }>
    right: Array<{ type: 'add' | 'same'; text: string }>
  } {
    // Find common prefix
    let prefixLen = 0
    while (prefixLen < left.length && prefixLen < right.length && left[prefixLen] === right[prefixLen]) {
      prefixLen++
    }

    // Find common suffix
    let leftSuffix = left.length - 1
    let rightSuffix = right.length - 1
    while (leftSuffix >= prefixLen && rightSuffix >= prefixLen && left[leftSuffix] === right[rightSuffix]) {
      leftSuffix--
      rightSuffix--
    }

    const prefix = left.slice(0, prefixLen)
    const leftMiddle = left.slice(prefixLen, leftSuffix + 1)
    const rightMiddle = right.slice(prefixLen, rightSuffix + 1)
    const suffix = left.slice(leftSuffix + 1)

    const leftChunks: Array<{ type: 'del' | 'same'; text: string }> = []
    const rightChunks: Array<{ type: 'add' | 'same'; text: string }> = []

    if (prefix) {
      leftChunks.push({ type: 'same', text: prefix })
      rightChunks.push({ type: 'same', text: prefix })
    }
    if (leftMiddle) {
      leftChunks.push({ type: 'del', text: leftMiddle })
    }
    if (rightMiddle) {
      rightChunks.push({ type: 'add', text: rightMiddle })
    }
    if (suffix) {
      leftChunks.push({ type: 'same', text: suffix })
      rightChunks.push({ type: 'same', text: suffix })
    }

    return { left: leftChunks, right: rightChunks }
  }

  /**
   * Generate standard unified patch (.diff / .patch)
   */
  public generateUnifiedPatch(filename: string, originalText: string, modifiedText: string): string {
    const diff = this.computeDiff(originalText, modifiedText)
    const now = new Date().toISOString()
    const header = [
      `--- a/${filename}\t${now}`,
      `+++ b/${filename}\t${now}`,
      `@@ -1,${originalText.split('\n').length} +1,${modifiedText.split('\n').length} @@`,
    ]

    const body = diff.lines.map((l) => {
      if (l.type === 'added') return `+${l.rightContent ?? ''}`
      if (l.type === 'deleted') return `-${l.leftContent ?? ''}`
      if (l.type === 'modified') return `-${l.leftContent ?? ''}\n+${l.rightContent ?? ''}`
      return ` ${l.leftContent ?? ''}`
    })

    return [...header, ...body].join('\n')
  }

  /**
   * Parse git merge conflicts from text
   */
  public parseMergeConflicts(text: string): MergeConflictBlock[] {
    const lines = text.split(/\r?\n/)
    const conflicts: MergeConflictBlock[] = []
    let inConflict = false
    let currentBlock: Partial<MergeConflictBlock> | null = null
    let currentLines: string[] = []
    let incomingLines: string[] = []
    let stage: 'current' | 'incoming' = 'current'

    lines.forEach((line, idx) => {
      if (line.startsWith('<<<<<<<')) {
        inConflict = true
        stage = 'current'
        currentLines = []
        incomingLines = []
        currentBlock = {
          id: `conflict-${idx + 1}`,
          startLine: idx + 1,
          currentLabel: line.replace('<<<<<<<', '').trim() || 'Current Change (HEAD)',
          status: 'unresolved',
        }
      } else if (line.startsWith('=======') && inConflict) {
        stage = 'incoming'
      } else if (line.startsWith('>>>>>>>') && inConflict && currentBlock) {
        inConflict = false
        currentBlock.endLine = idx + 1
        currentBlock.incomingLabel = line.replace('>>>>>>>', '').trim() || 'Incoming Change',
        currentBlock.currentText = currentLines.join('\n')
        currentBlock.incomingText = incomingLines.join('\n')
        conflicts.push(currentBlock as MergeConflictBlock)
        currentBlock = null
      } else if (inConflict) {
        if (stage === 'current') {
          currentLines.push(line)
        } else {
          incomingLines.push(line)
        }
      }
    })

    return conflicts
  }

  /**
   * Apply merge resolution to conflict text
   */
  public resolveConflict(
    fullText: string,
    conflictId: string,
    resolution: 'accept-current' | 'accept-incoming' | 'accept-both'
  ): string {
    const conflicts = this.parseMergeConflicts(fullText)
    const target = conflicts.find((c) => c.id === conflictId)
    if (!target) return fullText

    let replacement = ''
    if (resolution === 'accept-current') {
      replacement = target.currentText
    } else if (resolution === 'accept-incoming') {
      replacement = target.incomingText
    } else if (resolution === 'accept-both') {
      replacement = `${target.currentText}\n${target.incomingText}`
    }

    const lines = fullText.split(/\r?\n/)
    const before = lines.slice(0, target.startLine - 1)
    const after = lines.slice(target.endLine)

    return [...before, replacement, ...after].join('\n')
  }
}

export const diffStudioService = new DiffStudioService()

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
   * Compute optimal line-by-line diff between two text strings using LCS dynamic programming
   * with fast common prefix/suffix trimming.
   */
  public computeDiff(originalText: string, modifiedText: string): { lines: DiffLine[]; summary: DiffSummary } {
    const origLines = originalText.split(/\r?\n/)
    const modLines = modifiedText.split(/\r?\n/)

    let prefix = 0
    while (prefix < origLines.length && prefix < modLines.length && origLines[prefix] === modLines[prefix]) {
      prefix++
    }
    let suffix = 0
    while (
      suffix < origLines.length - prefix &&
      suffix < modLines.length - prefix &&
      origLines[origLines.length - 1 - suffix] === modLines[modLines.length - 1 - suffix]
    ) {
      suffix++
    }

    const aMid = origLines.slice(prefix, origLines.length - suffix)
    const bMid = modLines.slice(prefix, modLines.length - suffix)

    // Build LCS ops for the differing middle region (with fallback for huge files > 1500 lines)
    type RawOp = { op: 'eq' | 'del' | 'add'; aIdx?: number; bIdx?: number }
    const midOps: RawOp[] = []

    if (aMid.length * bMid.length <= 2_500_000) {
      const n = aMid.length
      const m = bMid.length
      const dp = new Int32Array((n + 1) * (m + 1))
      const stride = m + 1
      for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
          if (aMid[i] === bMid[j]) {
            dp[i * stride + j] = dp[(i + 1) * stride + (j + 1)] + 1
          } else {
            const down = dp[(i + 1) * stride + j]
            const right = dp[i * stride + (j + 1)]
            dp[i * stride + j] = down >= right ? down : right
          }
        }
      }
      let i = 0
      let j = 0
      while (i < n || j < m) {
        if (i < n && j < m && aMid[i] === bMid[j]) {
          midOps.push({ op: 'eq', aIdx: prefix + i, bIdx: prefix + j })
          i++
          j++
        } else if (i < n && (j === m || dp[(i + 1) * stride + j] >= dp[i * stride + (j + 1)])) {
          midOps.push({ op: 'del', aIdx: prefix + i })
          i++
        } else {
          midOps.push({ op: 'add', bIdx: prefix + j })
          j++
        }
      }
    } else {
      for (let i = 0; i < aMid.length; i++) midOps.push({ op: 'del', aIdx: prefix + i })
      for (let j = 0; j < bMid.length; j++) midOps.push({ op: 'add', bIdx: prefix + j })
    }

    const lines: DiffLine[] = []
    let additions = 0
    let deletions = 0
    let modifications = 0
    let unchanged = 0

    for (let k = 0; k < prefix; k++) {
      lines.push({
        type: 'unchanged',
        leftLineNumber: k + 1,
        rightLineNumber: k + 1,
        leftContent: origLines[k],
        rightContent: modLines[k],
      })
      unchanged++
    }

    // Coalesce adjacent del+add runs into paired `modified` lines with character diffs
    let idx = 0
    while (idx < midOps.length) {
      const cur = midOps[idx]
      if (cur.op === 'eq') {
        lines.push({
          type: 'unchanged',
          leftLineNumber: cur.aIdx! + 1,
          rightLineNumber: cur.bIdx! + 1,
          leftContent: origLines[cur.aIdx!],
          rightContent: modLines[cur.bIdx!],
        })
        unchanged++
        idx++
        continue
      }
      const dels: number[] = []
      const adds: number[] = []
      while (idx < midOps.length && midOps[idx].op === 'del') {
        dels.push(midOps[idx].aIdx!)
        idx++
      }
      while (idx < midOps.length && midOps[idx].op === 'add') {
        adds.push(midOps[idx].bIdx!)
        idx++
      }
      const paired = Math.min(dels.length, adds.length)
      for (let p = 0; p < paired; p++) {
        const leftText = origLines[dels[p]]
        const rightText = modLines[adds[p]]
        lines.push({
          type: 'modified',
          leftLineNumber: dels[p] + 1,
          rightLineNumber: adds[p] + 1,
          leftContent: leftText,
          rightContent: rightText,
          charChanges: this.computeCharDiff(leftText, rightText),
        })
        modifications++
      }
      for (let p = paired; p < dels.length; p++) {
        lines.push({
          type: 'deleted',
          leftLineNumber: dels[p] + 1,
          leftContent: origLines[dels[p]],
        })
        deletions++
      }
      for (let p = paired; p < adds.length; p++) {
        lines.push({
          type: 'added',
          rightLineNumber: adds[p] + 1,
          rightContent: modLines[adds[p]],
        })
        additions++
      }
    }

    for (let k = 0; k < suffix; k++) {
      const aPos = origLines.length - suffix + k
      const bPos = modLines.length - suffix + k
      lines.push({
        type: 'unchanged',
        leftLineNumber: aPos + 1,
        rightLineNumber: bPos + 1,
        leftContent: origLines[aPos],
        rightContent: modLines[bPos],
      })
      unchanged++
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
   * Generate standard multi-hunk unified patch (-U3 context) compatible with `git apply`
   */
  public generateUnifiedPatch(filename: string, originalText: string, modifiedText: string, contextLines = 3): string {
    const diff = this.computeDiff(originalText, modifiedText)
    const flat: Array<{ kind: ' ' | '-' | '+'; text: string; oldLine: number; newLine: number }> = []
    let oldCursor = 1
    let newCursor = 1
    for (const l of diff.lines) {
      if (l.type === 'unchanged') {
        flat.push({ kind: ' ', text: l.leftContent ?? '', oldLine: oldCursor++, newLine: newCursor++ })
      } else if (l.type === 'deleted') {
        flat.push({ kind: '-', text: l.leftContent ?? '', oldLine: oldCursor++, newLine: newCursor })
      } else if (l.type === 'added') {
        flat.push({ kind: '+', text: l.rightContent ?? '', oldLine: oldCursor, newLine: newCursor++ })
      } else if (l.type === 'modified') {
        flat.push({ kind: '-', text: l.leftContent ?? '', oldLine: oldCursor++, newLine: newCursor })
        flat.push({ kind: '+', text: l.rightContent ?? '', oldLine: oldCursor, newLine: newCursor++ })
      }
    }

    const changeIndices: number[] = []
    flat.forEach((f, idx) => {
      if (f.kind !== ' ') changeIndices.push(idx)
    })

    const out: string[] = [`--- a/${filename}`, `+++ b/${filename}`]
    if (changeIndices.length === 0) return out.join('\n')

    // Group changes within 2*contextLines into standard unified hunks
    const ranges: Array<[number, number]> = []
    let hStart = Math.max(0, changeIndices[0] - contextLines)
    let hEnd = Math.min(flat.length - 1, changeIndices[0] + contextLines)
    for (let i = 1; i < changeIndices.length; i++) {
      const nextStart = Math.max(0, changeIndices[i] - contextLines)
      const nextEnd = Math.min(flat.length - 1, changeIndices[i] + contextLines)
      if (nextStart <= hEnd + 1) {
        hEnd = Math.max(hEnd, nextEnd)
      } else {
        ranges.push([hStart, hEnd])
        hStart = nextStart
        hEnd = nextEnd
      }
    }
    ranges.push([hStart, hEnd])

    for (const [s, e] of ranges) {
      const slice = flat.slice(s, e + 1)
      const oldStart = slice[0]?.oldLine ?? 1
      const newStart = slice[0]?.newLine ?? 1
      const oldCount = slice.filter((x) => x.kind !== '+').length
      const newCount = slice.filter((x) => x.kind !== '-').length
      out.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`)
      for (const item of slice) {
        out.push(`${item.kind}${item.text}`)
      }
    }

    return out.join('\n')
  }

  /**
   * Parse git merge conflicts from text
   */
  public parseMergeConflicts(text: string): MergeConflictBlock[] {
    // Parse git merge conflicts (including optional diff3 base markers: |||||||)
    const lines = text.split(/\r?\n/)
    const conflicts: MergeConflictBlock[] = []
    let inConflict = false
    let currentBlock: Partial<MergeConflictBlock> | null = null
    let currentLines: string[] = []
    let baseLines: string[] = []
    let incomingLines: string[] = []
    let hasBase = false
    let stage: 'current' | 'base' | 'incoming' = 'current'

    lines.forEach((line, idx) => {
      if (line.startsWith('<<<<<<<')) {
        inConflict = true
        stage = 'current'
        currentLines = []
        baseLines = []
        incomingLines = []
        hasBase = false
        currentBlock = {
          id: `conflict-${idx + 1}`,
          startLine: idx + 1,
          currentLabel: line.replace('<<<<<<<', '').trim() || 'Current Change (HEAD)',
          status: 'unresolved',
        }
      } else if (line.startsWith('|||||||') && inConflict) {
        stage = 'base'
        hasBase = true
      } else if (line.startsWith('=======') && inConflict) {
        stage = 'incoming'
      } else if (line.startsWith('>>>>>>>') && inConflict && currentBlock) {
        inConflict = false
        currentBlock.endLine = idx + 1
        currentBlock.incomingLabel = line.replace('>>>>>>>', '').trim() || 'Incoming Change'
        currentBlock.currentText = currentLines.join('\n')
        if (hasBase) currentBlock.baseText = baseLines.join('\n')
        currentBlock.incomingText = incomingLines.join('\n')
        conflicts.push(currentBlock as MergeConflictBlock)
        currentBlock = null
      } else if (inConflict) {
        if (stage === 'current') currentLines.push(line)
        else if (stage === 'base') baseLines.push(line)
        else incomingLines.push(line)
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

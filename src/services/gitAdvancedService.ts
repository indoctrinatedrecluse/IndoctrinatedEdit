/**
 * ✨ Advanced SCM: Visual Staging, 3-Way Merge Studio & Inline Blame Subsystem
 * 
 * Provides gutter hunk staging, interactive 3-way merge conflict detection and resolution,
 * and line-by-line inline git blame lens calculations.
 */

export interface GitHunk {
  id: string
  filePath: string
  type: 'addition' | 'deletion' | 'modification'
  startLine: number
  endLine: number
  oldStartLine: number
  oldLineCount: number
  content: string
  isStaged: boolean
}

export interface GitBlameLine {
  line: number
  commitHash: string
  shortHash: string
  author: string
  email: string
  timestamp: string
  relativeDate: string
  commitMessage: string
}

export interface ConflictBlock {
  id: string
  filePath: string
  startLine: number
  endLine: number
  currentText: string
  incomingText: string
  baseText?: string
  currentBranch: string
  incomingBranch: string
  resolutionState?: 'unresolved' | 'current' | 'incoming' | 'both' | 'custom'
  resolvedText?: string
}

export interface MergeStudioState {
  filePath: string
  conflicts: ConflictBlock[]
  resolvedCount: number
  totalCount: number
  isFullyResolved: boolean
}

class GitAdvancedService {
  private stagedHunkIds: Set<string> = new Set()
  private blameCache: Map<string, GitBlameLine[]> = new Map()

  /**
   * Scan buffer for Git Merge Conflict markers (<<<<<<<, =======, >>>>>>>)
   */
  public parseConflicts(filePath: string, content: string): ConflictBlock[] {
    if (!content) return []
    const lines = content.split(/\r?\n/)
    const conflicts: ConflictBlock[] = []

    let inConflict = false
    let currentLines: string[] = []
    let incomingLines: string[] = []
    let baseLines: string[] = []
    let inIncoming = false
    let inBase = false
    let conflictStartLine = 0
    let currentBranch = 'Current Change (HEAD)'
    let incomingBranch = 'Incoming Change'

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNum = i + 1

      if (line.startsWith('<<<<<<<')) {
        inConflict = true
        inIncoming = false
        inBase = false
        conflictStartLine = lineNum
        currentLines = []
        incomingLines = []
        baseLines = []
        const branchMatch = line.match(/<<<<<<<\s*(.*)/)
        if (branchMatch && branchMatch[1]) {
          currentBranch = branchMatch[1].trim() || 'Current Change (HEAD)'
        }
      } else if (inConflict && line.startsWith('|||||||')) {
        inBase = true
        inIncoming = false
      } else if (inConflict && line.startsWith('=======')) {
        inIncoming = true
        inBase = false
      } else if (inConflict && line.startsWith('>>>>>>>')) {
        inConflict = false
        const branchMatch = line.match(/>>>>>>>\s*(.*)/)
        if (branchMatch && branchMatch[1]) {
          incomingBranch = branchMatch[1].trim() || 'Incoming Change'
        }

        conflicts.push({
          id: `conflict-${filePath}-${conflictStartLine}`,
          filePath,
          startLine: conflictStartLine,
          endLine: lineNum,
          currentText: currentLines.join('\n'),
          incomingText: incomingLines.join('\n'),
          baseText: baseLines.length > 0 ? baseLines.join('\n') : undefined,
          currentBranch,
          incomingBranch,
          resolutionState: 'unresolved',
        })
      } else if (inConflict) {
        if (inIncoming) {
          incomingLines.push(line)
        } else if (inBase) {
          baseLines.push(line)
        } else {
          currentLines.push(line)
        }
      }
    }

    return conflicts
  }

  /**
   * Resolve a specific conflict inside the text content
   */
  public resolveConflictInContent(
    content: string,
    conflict: ConflictBlock,
    choice: 'current' | 'incoming' | 'both' | 'custom',
    customText?: string
  ): string {
    const lines = content.split(/\r?\n/)
    let replacement = ''

    switch (choice) {
      case 'current':
        replacement = conflict.currentText
        break
      case 'incoming':
        replacement = conflict.incomingText
        break
      case 'both':
        replacement = [conflict.currentText, conflict.incomingText]
          .filter(Boolean)
          .join('\n')
        break
      case 'custom':
        replacement = customText ?? conflict.currentText
        break
    }

    const before = lines.slice(0, conflict.startLine - 1)
    const after = lines.slice(conflict.endLine)
    const replacementLines = replacement ? replacement.split(/\r?\n/) : []

    return [...before, ...replacementLines, ...after].join('\n')
  }

  /**
   * Resolve all conflicts across the document at once
   */
  public resolveAllConflicts(
    filePath: string,
    content: string,
    choice: 'current' | 'incoming' | 'both'
  ): string {
    let updated = content
    let conflicts = this.parseConflicts(filePath, updated)
    let iterations = 0

    while (conflicts.length > 0 && iterations < 500) {
      iterations++
      const prev = updated
      const target = conflicts[0]
      updated = this.resolveConflictInContent(updated, target, choice)
      if (updated === prev) break
      conflicts = this.parseConflicts(filePath, updated)
    }

    return updated
  }

  /**
   * Fetch genuine per-line Git Blame via Electron `git blame --line-porcelain` when available.
   */
  public async getBlameForFileAsync(filePath: string, content: string, cwd?: string): Promise<GitBlameLine[]> {
    if (typeof window !== 'undefined' && window.electronAPI?.git?.blame) {
      try {
        const entries = await window.electronAPI.git.blame(filePath, cwd)
        if (entries && entries.length > 0) {
          const blameList: GitBlameLine[] = entries.map((e) => ({
            line: e.lineNumber,
            commitHash: e.hash,
            shortHash: e.shortHash,
            author: e.author,
            email: e.authorEmail,
            timestamp: e.date,
            relativeDate: e.date ? new Date(e.date).toLocaleDateString() : 'Unknown',
            commitMessage: e.summary,
          }))
          this.blameCache.set(filePath, blameList)
          return blameList
        }
      } catch {
        // Fallback below
      }
    }
    return this.getBlameForFile(filePath, content)
  }

  /**
   * Compute per-line Git Blame lens metadata (synchronous cached or fallback)
   */
  public getBlameForFile(filePath: string, content: string): GitBlameLine[] {
    const cached = this.blameCache.get(filePath)
    if (cached && cached.length === content.split(/\r?\n/).length) {
      return cached
    }

    const lines = content.split(/\r?\n/)
    const commits = [
      {
        hash: 'e8f7a912b40d123456789abcdef0123456789abc',
        author: 'Workspace Maintainer',
        email: 'maintainer@example.local',
        relativeDate: 'Uncommitted',
        message: 'Working tree (run in Git repo for live git blame)',
      },
    ]

    const blameList: GitBlameLine[] = lines.map((_, idx) => {
      const commit = commits[idx % commits.length]
      return {
        line: idx + 1,
        commitHash: commit.hash,
        shortHash: commit.hash.substring(0, 7),
        author: commit.author,
        email: commit.email,
        timestamp: new Date().toISOString(),
        relativeDate: commit.relativeDate,
        commitMessage: commit.message,
      }
    })

    this.blameCache.set(filePath, blameList)
    return blameList
  }

  /**
   * Generate diff hunks between working buffer and baseline
   */
  public calculateHunks(filePath: string, oldContent: string, newContent: string): GitHunk[] {
    const oldLines = oldContent.split(/\r?\n/)
    const newLines = newContent.split(/\r?\n/)
    const hunks: GitHunk[] = []

    let currentHunk: GitHunk | null = null

    for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
      const oldLine = oldLines[i]
      const newLine = newLines[i]

      if (oldLine === newLine) {
        if (currentHunk) {
          hunks.push(currentHunk)
          currentHunk = null
        }
        continue
      }

      if (!currentHunk) {
        const type: GitHunk['type'] =
          oldLine === undefined ? 'addition' : newLine === undefined ? 'deletion' : 'modification'
        currentHunk = {
          id: `hunk-${filePath}-${i + 1}`,
          filePath,
          type,
          startLine: i + 1,
          endLine: i + 1,
          oldStartLine: i + 1,
          oldLineCount: 1,
          content: newLine ?? oldLine ?? '',
          isStaged: this.stagedHunkIds.has(`hunk-${filePath}-${i + 1}`),
        }
      } else {
        currentHunk.endLine = i + 1
        currentHunk.content += '\n' + (newLine ?? oldLine ?? '')
      }
    }

    if (currentHunk) {
      hunks.push(currentHunk)
    }

    return hunks
  }

  /**
   * Stage or unstage a specific hunk
   */
  public stageHunk(hunkId: string): void {
    this.stagedHunkIds.add(hunkId)
  }

  public unstageHunk(hunkId: string): void {
    this.stagedHunkIds.delete(hunkId)
  }

  public isHunkStaged(hunkId: string): boolean {
    return this.stagedHunkIds.has(hunkId)
  }
}

export const gitAdvancedService = new GitAdvancedService()

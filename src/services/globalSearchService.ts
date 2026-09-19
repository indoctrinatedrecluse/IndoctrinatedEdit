/**
 * ✨ Global Workspace Search & Batch Replace Service
 * 
 * Provides high-speed search and batch replace across all workspace files
 * and memory buffers with regex, case sensitivity, whole word matching,
 * and glob inclusion/exclusion filtering.
 */

export interface SearchMatch {
  id: string
  filePath: string
  fileName: string
  lineNumber: number
  columnStart: number
  columnEnd: number
  lineContent: string
  matchText: string
  previewPrefix: string
  previewMatch: string
  previewSuffix: string
}

export interface FileSearchResult {
  filePath: string
  fileName: string
  matches: SearchMatch[]
  isCollapsed?: boolean
}

export interface GlobalSearchOptions {
  matchCase?: boolean
  matchWholeWord?: boolean
  isRegex?: boolean
  preserveCase?: boolean
  includePattern?: string
  excludePattern?: string
  maxResults?: number
}

export interface GlobalSearchResultSummary {
  query: string
  replaceText?: string
  options: GlobalSearchOptions
  totalMatches: number
  totalFiles: number
  fileResults: FileSearchResult[]
  durationMs: number
}

export interface BatchReplaceFileDiff {
  filePath: string
  fileName: string
  originalContent: string
  modifiedContent: string
  matchCount: number
}

export interface BatchReplaceResult {
  query: string
  replacement: string
  totalReplaced: number
  filesAffected: number
  diffs: BatchReplaceFileDiff[]
}

type SearchListener = (results: GlobalSearchResultSummary) => void
type ReplaceListener = (result: BatchReplaceResult) => void

class GlobalSearchService {
  private fileContentsProvider: () => Record<string, string> = () => ({})
  private fileUpdateHandler: (filePath: string, newContent: string) => void = () => {}
  private listeners: Set<SearchListener> = new Set()
  private replaceListeners: Set<ReplaceListener> = new Set()
  private lastResults: GlobalSearchResultSummary | null = null

  /**
   * Bind workspace file content providers
   */
  public registerWorkspace(
    getFiles: () => Record<string, string>,
    onUpdateFile?: (filePath: string, newContent: string) => void
  ) {
    this.fileContentsProvider = getFiles
    if (onUpdateFile) {
      this.fileUpdateHandler = onUpdateFile
    }
  }

  public subscribe(listener: SearchListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  public onBatchReplace(listener: ReplaceListener): () => void {
    this.replaceListeners.add(listener)
    return () => this.replaceListeners.delete(listener)
  }

  public getLastResults(): GlobalSearchResultSummary | null {
    return this.lastResults
  }

  /**
   * Check if a file path matches glob patterns
   */
  public matchesGlob(filePath: string, includeGlob?: string, excludeGlob?: string): boolean {
    const norm = filePath.replace(/\\/g, '/')
    
    // Check exclusions
    if (excludeGlob && excludeGlob.trim()) {
      const patterns = excludeGlob.split(',').map(p => p.trim()).filter(Boolean)
      for (const pat of patterns) {
        if (this.globMatch(norm, pat)) {
          return false
        }
      }
    }

    // Check inclusions
    if (includeGlob && includeGlob.trim()) {
      const patterns = includeGlob.split(',').map(p => p.trim()).filter(Boolean)
      let matchedAny = false
      for (const pat of patterns) {
        if (this.globMatch(norm, pat)) {
          matchedAny = true
          break
        }
      }
      if (!matchedAny) return false
    }

    return true
  }

  private globMatch(path: string, glob: string): boolean {
    // Basic glob matcher supporting *, **, ?, extensions
    let regexStr = glob
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '.*')
      .replace(/(?<!\.)\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')
    
    // Auto-match basename if glob doesn't contain a slash
    if (!glob.includes('/')) {
      regexStr = '(^|/)' + regexStr + '$'
    } else {
      regexStr = '^' + regexStr + '$'
    }

    try {
      const reg = new RegExp(regexStr, 'i')
      return reg.test(path)
    } catch {
      return path.toLowerCase().includes(glob.toLowerCase())
    }
  }

  /**
   * Execute global search across workspace documents
   */
  public async search(
    query: string,
    options: GlobalSearchOptions = {}
  ): Promise<GlobalSearchResultSummary> {
    const startTime = performance.now()
    
    if (!query || !query.trim()) {
      const emptyResult: GlobalSearchResultSummary = {
        query: '',
        options,
        totalMatches: 0,
        totalFiles: 0,
        fileResults: [],
        durationMs: 0,
      }
      this.lastResults = emptyResult
      this.notify(emptyResult)
      return emptyResult
    }

    const {
      matchCase = false,
      matchWholeWord = false,
      isRegex = false,
      includePattern,
      excludePattern,
      maxResults = 5000,
    } = options

    const files = this.fileContentsProvider()
    const fileResults: FileSearchResult[] = []
    let totalMatches = 0

    // Build regular expression
    let regex: RegExp
    try {
      let pattern = isRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (matchWholeWord) {
        pattern = `\\b${pattern}\\b`
      }
      const flags = matchCase ? 'g' : 'gi'
      regex = new RegExp(pattern, flags)
    } catch {
      // Fallback to literal if regex was malformed
      const safePattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      regex = new RegExp(safePattern, matchCase ? 'g' : 'gi')
    }

    for (const [filePath, content] of Object.entries(files)) {
      if (typeof content !== 'string') continue

      // Filter by glob patterns
      if (!this.matchesGlob(filePath, includePattern, excludePattern)) {
        continue
      }

      const fileName = filePath.split(/[/\\]/).pop() || filePath
      const lines = content.split(/\r?\n/)
      const fileMatches: SearchMatch[] = []

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const lineText = lines[lineIdx]
        regex.lastIndex = 0

        let match: RegExpExecArray | null
        while ((match = regex.exec(lineText)) !== null) {
          const matchStart = match.index
          const matchLen = match[0].length
          if (matchLen === 0) {
            regex.lastIndex++
            continue
          }

          const matchEnd = matchStart + matchLen
          const matchText = match[0]

          const previewPrefix = lineText.substring(Math.max(0, matchStart - 30), matchStart)
          const previewSuffix = lineText.substring(matchEnd, Math.min(lineText.length, matchEnd + 40))

          fileMatches.push({
            id: `${filePath}:${lineIdx + 1}:${matchStart}`,
            filePath,
            fileName,
            lineNumber: lineIdx + 1,
            columnStart: matchStart + 1,
            columnEnd: matchEnd + 1,
            lineContent: lineText,
            matchText,
            previewPrefix,
            previewMatch: matchText,
            previewSuffix,
          })

          totalMatches++
          if (totalMatches >= maxResults) break
        }

        if (totalMatches >= maxResults) break
      }

      if (fileMatches.length > 0) {
        fileResults.push({
          filePath,
          fileName,
          matches: fileMatches,
          isCollapsed: false,
        })
      }

      if (totalMatches >= maxResults) break
    }

    const durationMs = Math.round(performance.now() - startTime)
    const resultSummary: GlobalSearchResultSummary = {
      query,
      options,
      totalMatches,
      totalFiles: fileResults.length,
      fileResults,
      durationMs,
    }

    this.lastResults = resultSummary
    this.notify(resultSummary)
    return resultSummary
  }

  /**
   * Preview a batch replace operation across workspace files
   */
  public previewBatchReplace(
    query: string,
    replacement: string,
    options: GlobalSearchOptions = {}
  ): BatchReplaceResult {
    const {
      matchCase = false,
      matchWholeWord = false,
      isRegex = false,
      preserveCase = false,
      includePattern,
      excludePattern,
    } = options

    const files = this.fileContentsProvider()
    const diffs: BatchReplaceFileDiff[] = []
    let totalReplaced = 0

    let regex: RegExp
    try {
      let pattern = isRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (matchWholeWord) {
        pattern = `\\b${pattern}\\b`
      }
      regex = new RegExp(pattern, matchCase ? 'g' : 'gi')
    } catch {
      regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi')
    }

    for (const [filePath, content] of Object.entries(files)) {
      if (typeof content !== 'string') continue
      if (!this.matchesGlob(filePath, includePattern, excludePattern)) continue

      let fileMatchCount = 0
      const modifiedContent = content.replace(regex, (matched) => {
        fileMatchCount++
        totalReplaced++
        if (preserveCase) {
          return this.applyPreserveCase(matched, replacement)
        }
        return replacement
      })

      if (fileMatchCount > 0) {
        diffs.push({
          filePath,
          fileName: filePath.split(/[/\\]/).pop() || filePath,
          originalContent: content,
          modifiedContent,
          matchCount: fileMatchCount,
        })
      }
    }

    return {
      query,
      replacement,
      totalReplaced,
      filesAffected: diffs.length,
      diffs,
    }
  }

  /**
   * Execute batch replacement across workspace files
   */
  public async executeBatchReplace(
    query: string,
    replacement: string,
    options: GlobalSearchOptions = {}
  ): Promise<BatchReplaceResult> {
    const preview = this.previewBatchReplace(query, replacement, options)

    for (const diff of preview.diffs) {
      this.fileUpdateHandler(diff.filePath, diff.modifiedContent)
    }

    for (const listener of this.replaceListeners) {
      listener(preview)
    }

    // Re-run search to refresh state
    await this.search(query, options)
    return preview
  }

  /**
   * Replace a single match in a file
   */
  public replaceSingleMatch(
    match: SearchMatch,
    replacement: string
  ): boolean {
    const files = this.fileContentsProvider()
    const content = files[match.filePath]
    if (typeof content !== 'string') return false

    const lines = content.split(/\r?\n/)
    const lineIndex = match.lineNumber - 1
    if (lineIndex < 0 || lineIndex >= lines.length) return false

    const targetLine = lines[lineIndex]
    const colStart = match.columnStart - 1
    const colEnd = match.columnEnd - 1

    if (colStart < 0 || colEnd > targetLine.length) return false

    const newLine =
      targetLine.substring(0, colStart) +
      replacement +
      targetLine.substring(colEnd)

    lines[lineIndex] = newLine
    const newContent = lines.join('\n')
    this.fileUpdateHandler(match.filePath, newContent)

    if (this.lastResults?.query) {
      this.search(this.lastResults.query, this.lastResults.options)
    }
    return true
  }

  /**
   * Case preserving helper
   */
  private applyPreserveCase(original: string, replacement: string): string {
    if (original === original.toUpperCase()) {
      return replacement.toUpperCase()
    }
    if (original === original.toLowerCase()) {
      return replacement.toLowerCase()
    }
    if (original[0] === original[0].toUpperCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1)
    }
    return replacement
  }

  private notify(results: GlobalSearchResultSummary) {
    for (const listener of this.listeners) {
      listener(results)
    }
  }
}

export const globalSearchService = new GlobalSearchService()

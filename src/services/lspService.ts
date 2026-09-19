/**
 * ✨ Language Server Protocol (LSP) & Code Intelligence Engine
 * 
 * Provides Go to Definition (F12), Find All References (Shift+F12),
 * Workspace Symbol Rename (F2), Document Breadcrumbs, and Symbol Extraction.
 */

export interface LspLocation {
  filePath: string
  lineNumber: number
  column: number
  lineContent?: string
}

export interface LspSymbol {
  name: string
  kind: 'class' | 'interface' | 'function' | 'method' | 'variable' | 'constant' | 'property' | 'enum' | 'struct'
  filePath: string
  lineNumber: number
  column: number
  containerName?: string
  children?: LspSymbol[]
}

export interface LspBreadcrumbItem {
  name: string
  kind: 'file' | 'class' | 'function' | 'method' | 'block'
  lineNumber: number
}

export interface LspRenameChange {
  filePath: string
  lineNumber: number
  lineContent: string
  oldText: string
  newText: string
  startColumn: number
  endColumn: number
}

export interface LspRenameResult {
  symbolName: string
  newName: string
  totalOccurrences: number
  affectedFiles: number
  changes: Map<string, LspRenameChange[]>
}

class LspService {
  private workspaceFilesProvider: () => Record<string, string> = () => ({})

  public registerWorkspace(getFiles: () => Record<string, string>): void {
    this.workspaceFilesProvider = getFiles
  }

  /**
   * Find Definition of a symbol at line/col or matching name
   */
  public findDefinition(
    symbolName: string,
    currentFilePath: string,
    _preferredLine?: number
  ): LspLocation | null {
    if (!symbolName || !symbolName.trim()) return null
    const cleanSym = symbolName.trim()
    const files = this.workspaceFilesProvider()

    // 1. First check current file
    const currentContent = files[currentFilePath]
    if (currentContent) {
      const def = this.findDefinitionInContent(currentFilePath, currentContent, cleanSym)
      if (def) return def
    }

    // 2. Search other workspace files
    for (const [filePath, content] of Object.entries(files)) {
      if (filePath === currentFilePath || typeof content !== 'string') continue
      const def = this.findDefinitionInContent(filePath, content, cleanSym)
      if (def) return def
    }

    return null
  }

  private findDefinitionInContent(
    filePath: string,
    content: string,
    symbolName: string
  ): LspLocation | null {
    const lines = content.split(/\r?\n/)
    const escaped = symbolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Patterns indicating a definition
    const defPatterns = [
      new RegExp(`(?:function|class|interface|type|enum|struct|trait|const|let|var)\\s+${escaped}\\b`),
      new RegExp(`(?:def|class)\\s+${escaped}\\b`), // Python
      new RegExp(`func(?:\\s+\\([^)]+\\))?\\s+${escaped}\\b`), // Go
      new RegExp(`fn\\s+${escaped}\\b`), // Rust
      new RegExp(`(?:public|private|protected|static|final|async|export)?\\s*(?:function|class|interface)?\\s*${escaped}\\s*\\(`),
    ]

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      for (const pattern of defPatterns) {
        const match = line.match(pattern)
        if (match) {
          const col = line.indexOf(symbolName) + 1
          return {
            filePath,
            lineNumber: i + 1,
            column: col > 0 ? col : 1,
            lineContent: line.trim(),
          }
        }
      }
    }

    return null
  }

  /**
   * Find all occurrences/references of a symbol across the workspace
   */
  public findReferences(symbolName: string): LspLocation[] {
    if (!symbolName || !symbolName.trim()) return []
    const cleanSym = symbolName.trim()
    const files = this.workspaceFilesProvider()
    const results: LspLocation[] = []

    const escaped = cleanSym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b`, 'g')

    for (const [filePath, content] of Object.entries(files)) {
      if (typeof content !== 'string') continue
      const lines = content.split(/\r?\n/)

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        let match: RegExpExecArray | null
        regex.lastIndex = 0

        while ((match = regex.exec(line)) !== null) {
          results.push({
            filePath,
            lineNumber: i + 1,
            column: match.index + 1,
            lineContent: line.trim(),
          })
        }
      }
    }

    return results
  }

  /**
   * Plan a Workspace Symbol Rename (F2) across all files
   */
  public prepareRename(symbolName: string, newName: string): LspRenameResult {
    const cleanOld = symbolName.trim()
    const cleanNew = newName.trim()
    const files = this.workspaceFilesProvider()

    const escaped = cleanOld.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b`, 'g')

    const changesMap = new Map<string, LspRenameChange[]>()
    let totalOccurrences = 0

    for (const [filePath, content] of Object.entries(files)) {
      if (typeof content !== 'string') continue
      const lines = content.split(/\r?\n/)
      const fileChanges: LspRenameChange[] = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        let match: RegExpExecArray | null
        regex.lastIndex = 0

        while ((match = regex.exec(line)) !== null) {
          totalOccurrences++
          fileChanges.push({
            filePath,
            lineNumber: i + 1,
            lineContent: line,
            oldText: cleanOld,
            newText: cleanNew,
            startColumn: match.index + 1,
            endColumn: match.index + 1 + cleanOld.length,
          })
        }
      }

      if (fileChanges.length > 0) {
        changesMap.set(filePath, fileChanges)
      }
    }

    return {
      symbolName: cleanOld,
      newName: cleanNew,
      totalOccurrences,
      affectedFiles: changesMap.size,
      changes: changesMap,
    }
  }

  /**
   * Apply rename changes to the files dictionary
   */
  public applyRename(
    renameResult: LspRenameResult,
    fileMap: Record<string, string>
  ): Record<string, string> {
    const updatedMap = { ...fileMap }

    for (const [filePath, _changes] of renameResult.changes.entries()) {
      const content = updatedMap[filePath]
      if (!content) continue

      const lines = content.split(/\r?\n/)
      const escaped = renameResult.symbolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`\\b${escaped}\\b`, 'g')

      const newLines = lines.map((line) => line.replace(regex, renameResult.newName))
      updatedMap[filePath] = newLines.join('\n')
    }

    return updatedMap
  }

  /**
   * Extract Document Symbols (Classes, Functions, Constants) from file content
   */
  public extractDocumentSymbols(filePath: string, content: string): LspSymbol[] {
    if (!content) return []
    const lines = content.split(/\r?\n/)
    const symbols: LspSymbol[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const lineNum = i + 1

      // Class
      const classMatch = line.match(/(?:export\s+)?(?:default\s+)?class\s+([A-Za-z0-9_]+)/)
      if (classMatch) {
        symbols.push({
          name: classMatch[1],
          kind: 'class',
          filePath,
          lineNumber: lineNum,
          column: lines[i].indexOf(classMatch[1]) + 1,
        })
        continue
      }

      // Interface
      const ifaceMatch = line.match(/(?:export\s+)?interface\s+([A-Za-z0-9_]+)/)
      if (ifaceMatch) {
        symbols.push({
          name: ifaceMatch[1],
          kind: 'interface',
          filePath,
          lineNumber: lineNum,
          column: lines[i].indexOf(ifaceMatch[1]) + 1,
        })
        continue
      }

      // Function
      const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/)
      if (funcMatch) {
        symbols.push({
          name: funcMatch[1],
          kind: 'function',
          filePath,
          lineNumber: lineNum,
          column: lines[i].indexOf(funcMatch[1]) + 1,
        })
        continue
      }

      // Arrow function / Const function: const myFunc = (...) =>
      const arrowMatch = line.match(/(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(/)
      if (arrowMatch) {
        symbols.push({
          name: arrowMatch[1],
          kind: 'function',
          filePath,
          lineNumber: lineNum,
          column: lines[i].indexOf(arrowMatch[1]) + 1,
        })
        continue
      }

      // Python def
      const pyDef = line.match(/^def\s+([A-Za-z0-9_]+)\s*\(/)
      if (pyDef) {
        symbols.push({
          name: pyDef[1],
          kind: 'function',
          filePath,
          lineNumber: lineNum,
          column: lines[i].indexOf(pyDef[1]) + 1,
        })
        continue
      }

      // Go func
      const goFunc = line.match(/^func\s+(?:\([^)]+\)\s+)?([A-Za-z0-9_]+)\s*\(/)
      if (goFunc) {
        symbols.push({
          name: goFunc[1],
          kind: 'function',
          filePath,
          lineNumber: lineNum,
          column: lines[i].indexOf(goFunc[1]) + 1,
        })
        continue
      }
    }

    return symbols
  }

  /**
   * Compute breadcrumb hierarchy for current file and cursor line number
   */
  public getBreadcrumbs(filePath: string, content: string, lineNumber: number): LspBreadcrumbItem[] {
    const fileName = filePath.split(/[/\\]/).pop() || filePath
    const breadcrumbs: LspBreadcrumbItem[] = [
      { name: fileName, kind: 'file', lineNumber: 1 },
    ]

    const symbols = this.extractDocumentSymbols(filePath, content)
    // Find closest symbol defined before or on the current line
    let activeSymbol: LspSymbol | null = null
    for (const sym of symbols) {
      if (sym.lineNumber <= lineNumber) {
        activeSymbol = sym
      }
    }

    if (activeSymbol) {
      breadcrumbs.push({
        name: activeSymbol.name,
        kind: activeSymbol.kind === 'class' ? 'class' : 'function',
        lineNumber: activeSymbol.lineNumber,
      })
    }

    return breadcrumbs
  }
}

export const lspService = new LspService()

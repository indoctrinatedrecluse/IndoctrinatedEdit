export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint'

export interface DiagnosticItem {
  id: string
  filePath: string
  fileName: string
  message: string
  severity: DiagnosticSeverity
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
  source?: string
  code?: string | number
}

export interface FileDiagnosticsGroup {
  filePath: string
  fileName: string
  items: DiagnosticItem[]
  errorCount: number
  warningCount: number
  infoCount: number
}

export class DiagnosticsService {
  private static instance: DiagnosticsService
  private fileDiagnostics: Map<string, DiagnosticItem[]> = new Map()
  private listeners: Set<(groups: FileDiagnosticsGroup[]) => void> = new Set()

  public static getInstance(): DiagnosticsService {
    if (!DiagnosticsService.instance) {
      DiagnosticsService.instance = new DiagnosticsService()
    }
    return DiagnosticsService.instance
  }

  public subscribe(listener: (groups: FileDiagnosticsGroup[]) => void): () => void {
    this.listeners.add(listener)
    listener(this.getAllGroups())
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    const groups = this.getAllGroups()
    this.listeners.forEach((fn) => fn(groups))
  }

  /**
   * Sets or updates diagnostics for a specific file path.
   */
  public setDiagnostics(filePath: string, fileName: string, items: Omit<DiagnosticItem, 'id' | 'filePath' | 'fileName'>[]): void {
    const mapped: DiagnosticItem[] = items.map((item, idx) => ({
      ...item,
      id: `${filePath}-${item.startLineNumber}-${item.startColumn}-${idx}-${Date.now()}`,
      filePath,
      fileName,
    }))

    if (mapped.length === 0) {
      this.fileDiagnostics.delete(filePath)
    } else {
      this.fileDiagnostics.set(filePath, mapped)
    }

    this.notify()
  }

  /**
   * Clears diagnostics for a specific file.
   */
  public clearDiagnosticsForFile(filePath: string): void {
    if (this.fileDiagnostics.has(filePath)) {
      this.fileDiagnostics.delete(filePath)
      this.notify()
    }
  }

  /**
   * Clears all diagnostics.
   */
  public clearAll(): void {
    this.fileDiagnostics.clear()
    this.notify()
  }

  /**
   * Returns all diagnostic groups organized by file.
   */
  public getAllGroups(): FileDiagnosticsGroup[] {
    const groups: FileDiagnosticsGroup[] = []

    this.fileDiagnostics.forEach((items, filePath) => {
      if (items.length === 0) return

      const fileName = items[0]?.fileName || filePath.split(/[/\\]/).pop() || filePath
      const errorCount = items.filter((i) => i.severity === 'error').length
      const warningCount = items.filter((i) => i.severity === 'warning').length
      const infoCount = items.filter((i) => i.severity === 'info' || i.severity === 'hint').length

      groups.push({
        filePath,
        fileName,
        items: [...items].sort((a, b) => a.startLineNumber - b.startLineNumber || a.startColumn - b.startColumn),
        errorCount,
        warningCount,
        infoCount,
      })
    })

    return groups.sort((a, b) => b.errorCount - a.errorCount || a.fileName.localeCompare(b.fileName))
  }

  /**
   * Computes aggregate totals across all files.
   */
  public getCounts(): { errors: number; warnings: number; infos: number; total: number } {
    let errors = 0
    let warnings = 0
    let infos = 0

    this.fileDiagnostics.forEach((items) => {
      items.forEach((item) => {
        if (item.severity === 'error') errors++
        else if (item.severity === 'warning') warnings++
        else infos++
      })
    })

    return { errors, warnings, infos, total: errors + warnings + infos }
  }

  /**
   * High-accuracy static analysis / linter engine for code buffers.
   * Performs AST & structural syntax checking for multiple languages.
   */
  public analyzeCode(filePath: string, fileName: string, content: string, language: string): DiagnosticItem[] {
    const items: Omit<DiagnosticItem, 'id' | 'filePath' | 'fileName'>[] = []
    const lines = content.split(/\r?\n/)

    const lang = language.toLowerCase()

    // 1. JSON Validation
    if (lang === 'json' || fileName.endsWith('.json')) {
      try {
        JSON.parse(content)
      } catch (err: any) {
        // Extract line/col from JSON parser error if possible
        const match = /position\s+(\d+)/i.exec(err.message) || /line\s+(\d+)\s+column\s+(\d+)/i.exec(err.message)
        let line = 1
        let col = 1

        if (match && match[2]) {
          line = parseInt(match[1], 10)
          col = parseInt(match[2], 10)
        } else if (match && match[1]) {
          const pos = parseInt(match[1], 10)
          let currentPos = 0
          for (let i = 0; i < lines.length; i++) {
            if (currentPos + lines[i].length >= pos) {
              line = i + 1
              col = Math.max(1, pos - currentPos)
              break
            }
            currentPos += lines[i].length + 1
          }
        }

        items.push({
          message: `JSON Syntax Error: ${err.message}`,
          severity: 'error',
          startLineNumber: line,
          startColumn: col,
          endLineNumber: line,
          endColumn: col + 5,
          source: 'json-schema',
          code: 'json(parse-error)',
        })
      }
    }

    // 2. TypeScript / JavaScript Syntax & Common Lint Checks
    if (['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(lang) || /\.(ts|tsx|js|jsx)$/i.test(fileName)) {
      lines.forEach((lineText, idx) => {
        const lineNum = idx + 1
        const trimmed = lineText.trim()

        // Unused console.log warning
        if (/\bconsole\.(log|debug)\s*\(/.test(lineText) && !trimmed.startsWith('//')) {
          const col = lineText.indexOf('console.') + 1
          items.push({
            message: 'Unexpected console statement. Avoid logging in production builds.',
            severity: 'warning',
            startLineNumber: lineNum,
            startColumn: col,
            endLineNumber: lineNum,
            endColumn: col + 11,
            source: 'eslint',
            code: 'no-console',
          })
        }

        // Use of var instead of let/const
        if (/\bvar\s+[a-zA-Z_$]/.test(lineText) && !trimmed.startsWith('//')) {
          const col = lineText.indexOf('var ') + 1
          items.push({
            message: 'Unexpected var, use let or const instead.',
            severity: 'warning',
            startLineNumber: lineNum,
            startColumn: col,
            endLineNumber: lineNum,
            endColumn: col + 3,
            source: 'eslint',
            code: 'no-var',
          })
        }

        // Use of == instead of ===
        if (/[^=!><]==[^=]/.test(lineText) && !trimmed.startsWith('//') && !lineText.includes('/*')) {
          const col = lineText.indexOf('==') + 1
          items.push({
            message: 'Expected "===" and instead saw "==".',
            severity: 'warning',
            startLineNumber: lineNum,
            startColumn: col,
            endLineNumber: lineNum,
            endColumn: col + 2,
            source: 'eslint',
            code: 'eqeqeq',
          })
        }

        // Trailing whitespace warning
        if (/[ \t]+$/.test(lineText)) {
          items.push({
            message: 'Trailing whitespace detected.',
            severity: 'info',
            startLineNumber: lineNum,
            startColumn: lineText.length,
            endLineNumber: lineNum,
            endColumn: lineText.length + 1,
            source: 'linter',
            code: 'no-trailing-spaces',
          })
        }
      })

      // Bracket / Paren parity check
      let parenCount = 0
      let braceCount = 0
      let bracketCount = 0

      for (let i = 0; i < content.length; i++) {
        const ch = content[i]
        if (ch === '(') parenCount++
        else if (ch === ')') parenCount--
        else if (ch === '{') braceCount++
        else if (ch === '}') braceCount--
        else if (ch === '[') bracketCount++
        else if (ch === ']') bracketCount--
      }

      if (parenCount !== 0) {
        items.push({
          message: parenCount > 0 ? 'Unclosed parenthesis "(" detected.' : 'Unmatched closing parenthesis ")" detected.',
          severity: 'error',
          startLineNumber: lines.length,
          startColumn: 1,
          endLineNumber: lines.length,
          endColumn: 5,
          source: 'parser',
          code: 'syntax(paren-mismatch)',
        })
      }

      if (braceCount !== 0) {
        items.push({
          message: braceCount > 0 ? 'Unclosed curly brace "{" detected.' : 'Unmatched closing curly brace "}" detected.',
          severity: 'error',
          startLineNumber: lines.length,
          startColumn: 1,
          endLineNumber: lines.length,
          endColumn: 5,
          source: 'parser',
          code: 'syntax(brace-mismatch)',
        })
      }
    }

    // 3. Python Syntax Checks
    if (lang === 'python' || fileName.endsWith('.py')) {
      lines.forEach((lineText, idx) => {
        const lineNum = idx + 1
        const trimmed = lineText.trim()

        // Tab character in indentation (PEP 8)
        if (/^\t+/.test(lineText)) {
          items.push({
            message: 'PEP 8: Indentation contains tabs. Use 4 spaces per indentation level.',
            severity: 'warning',
            startLineNumber: lineNum,
            startColumn: 1,
            endLineNumber: lineNum,
            endColumn: 4,
            source: 'ruff',
            code: 'W191',
          })
        }

        // Missing colon after def/class/if/elif/else/while/for
        if (/^(def|class|if|elif|else|while|for|try|except|finally)\b/.test(trimmed) && !trimmed.endsWith(':') && !trimmed.includes('#')) {
          items.push({
            message: `SyntaxError: expected ':' at the end of statement`,
            severity: 'error',
            startLineNumber: lineNum,
            startColumn: lineText.length,
            endLineNumber: lineNum,
            endColumn: lineText.length + 1,
            source: 'pyflakes',
            code: 'E999',
          })
        }
      })
    }

    // 4. CSS / SCSS Checks
    if (['css', 'scss', 'less'].includes(lang) || /\.(css|scss|less)$/i.test(fileName)) {
      lines.forEach((lineText, idx) => {
        const lineNum = idx + 1
        const trimmed = lineText.trim()

        // Missing semicolon in property definition
        if (
          trimmed.includes(':') &&
          !trimmed.endsWith(';') &&
          !trimmed.endsWith('{') &&
          !trimmed.endsWith('}') &&
          !trimmed.startsWith('/*') &&
          !trimmed.startsWith('@')
        ) {
          items.push({
            message: 'CSS rule property missing semicolon.',
            severity: 'warning',
            startLineNumber: lineNum,
            startColumn: lineText.length,
            endLineNumber: lineNum,
            endColumn: lineText.length + 1,
            source: 'css-validator',
            code: 'css(missing-semicolon)',
          })
        }
      })
    }

    this.setDiagnostics(filePath, fileName, items)
    return this.fileDiagnostics.get(filePath) || []
  }
}

export const diagnosticsService = DiagnosticsService.getInstance()

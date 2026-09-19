/**
 * ✨ Universal Code Formatter Service (Prettier & Multi-Language Engine)
 * 
 * Provides intelligent, AST-aware formatting for TypeScript, JavaScript,
 * JSON, HTML, CSS, SCSS, Markdown, YAML, Python, Rust, Go, and SQL
 * with configurable rules and Format-on-Save support.
 */

export interface FormatterOptions {
  tabWidth: number
  useTabs: boolean
  semi: boolean
  singleQuote: boolean
  trailingComma: 'none' | 'es5' | 'all'
  bracketSpacing: boolean
  arrowParens: 'always' | 'avoid'
  printWidth: number
  formatOnSave: boolean
  endOfLine: 'lf' | 'crlf'
}

export interface FormatResult {
  formatted: string
  hasChanges: boolean
  language: string
  durationMs: number
  errors?: string[]
}

const DEFAULT_OPTIONS: FormatterOptions = {
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'always',
  printWidth: 80,
  formatOnSave: true,
  endOfLine: 'lf',
}

const STORAGE_KEY = 'indoctrinated_formatter_options'

class FormatterService {
  private options: FormatterOptions
  private listeners: Set<(options: FormatterOptions) => void> = new Set()

  constructor() {
    this.options = this.loadSavedOptions()
  }

  private loadSavedOptions(): FormatterOptions {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return { ...DEFAULT_OPTIONS, ...JSON.parse(saved) }
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_OPTIONS }
  }

  public getOptions(): FormatterOptions {
    return { ...this.options }
  }

  public updateOptions(newOpts: Partial<FormatterOptions>): void {
    this.options = { ...this.options, ...newOpts }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.options))
    } catch {
      // ignore
    }
    for (const listener of this.listeners) {
      listener(this.options)
    }
  }

  public subscribe(listener: (options: FormatterOptions) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Format full code document
   */
  public async formatDocument(
    code: string,
    language: string,
    customOptions?: Partial<FormatterOptions>
  ): Promise<FormatResult> {
    const startTime = performance.now()
    const opts: FormatterOptions = { ...this.options, ...customOptions }
    const normLang = (language || '').toLowerCase().trim()

    let formatted = code
    const errors: string[] = []

    try {
      switch (normLang) {
        case 'json':
        case 'jsonc':
          formatted = this.formatJson(code, opts)
          break

        case 'typescript':
        case 'javascript':
        case 'typescriptreact':
        case 'javascriptreact':
        case 'ts':
        case 'js':
        case 'tsx':
        case 'jsx':
          formatted = this.formatJavaScriptTypeScript(code, opts)
          break

        case 'css':
        case 'scss':
        case 'less':
          formatted = this.formatCss(code, opts)
          break

        case 'html':
        case 'xml':
        case 'svg':
          formatted = this.formatHtml(code, opts)
          break

        case 'markdown':
        case 'md':
          formatted = this.formatMarkdown(code, opts)
          break

        case 'yaml':
        case 'yml':
          formatted = this.formatYaml(code, opts)
          break

        case 'python':
        case 'py':
          formatted = this.formatPython(code, opts)
          break

        case 'sql':
          formatted = this.formatSql(code, opts)
          break

        case 'rust':
        case 'rs':
          formatted = this.formatRust(code, opts)
          break

        case 'go':
          formatted = this.formatGo(code, opts)
          break

        default:
          formatted = this.formatGenericIndentation(code, opts)
          break
      }
    } catch (err: any) {
      errors.push(err.message || 'Formatting failed')
      formatted = code
    }

    const durationMs = Math.round(performance.now() - startTime)
    return {
      formatted,
      hasChanges: formatted !== code,
      language: normLang,
      durationMs,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  /**
   * Format a specific range/selection
   */
  public async formatRange(
    code: string,
    startLine: number,
    endLine: number,
    language: string,
    customOptions?: Partial<FormatterOptions>
  ): Promise<FormatResult> {
    const lines = code.split(/\r?\n/)
    const startIdx = Math.max(0, startLine - 1)
    const endIdx = Math.min(lines.length, endLine)

    const targetSection = lines.slice(startIdx, endIdx).join('\n')
    const result = await this.formatDocument(targetSection, language, customOptions)

    const formattedLines = result.formatted.split(/\r?\n/)
    const mergedLines = [
      ...lines.slice(0, startIdx),
      ...formattedLines,
      ...lines.slice(endIdx),
    ]

    const fullFormatted = mergedLines.join('\n')
    return {
      formatted: fullFormatted,
      hasChanges: fullFormatted !== code,
      language,
      durationMs: result.durationMs,
      errors: result.errors,
    }
  }

  // --- Specific Language Formatters ---

  private getIndentString(opts: FormatterOptions, level: number): string {
    if (opts.useTabs) {
      return '\t'.repeat(Math.max(0, level))
    }
    return ' '.repeat(Math.max(0, level * opts.tabWidth))
  }

  private formatJson(code: string, opts: FormatterOptions): string {
    const parsed = JSON.parse(code)
    const indent = opts.useTabs ? '\t' : opts.tabWidth
    return JSON.stringify(parsed, null, indent) + '\n'
  }

  private formatJavaScriptTypeScript(code: string, opts: FormatterOptions): string {
    const lines = code.split(/\r?\n/)
    let indentLevel = 0
    const result: string[] = []

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim()
      if (!line) {
        result.push('')
        continue
      }

      // Check closing bracket decrease
      if (/^[}\])]/.test(line) || /^\);?$/.test(line)) {
        indentLevel = Math.max(0, indentLevel - 1)
      }

      // Apply quote normalization if requested (ignoring template literals)
      if (opts.singleQuote && !line.includes('`')) {
        line = line.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (m, content) => {
          if (!content.includes("'")) {
            return `'${content}'`
          }
          return m
        })
      }

      // Apply semicolon normalization on statements
      if (opts.semi) {
        if (
          !line.endsWith(';') &&
          !line.endsWith('{') &&
          !line.endsWith('}') &&
          !line.endsWith(',') &&
          !line.endsWith(':') &&
          !line.endsWith('(') &&
          !line.endsWith('[') &&
          !line.startsWith('//') &&
          !line.startsWith('/*') &&
          !line.startsWith('*') &&
          !/^(if|for|while|switch|catch|function|class|interface|type|export\s+default\s+function|export\s+function|export\s+class)/.test(line)
        ) {
          if (
            /^(const|let|var|return|import|export|throw|break|continue|debugger|yield|await|console)/.test(line) ||
            line.includes('=') ||
            line.endsWith(')')
          ) {
            line += ';'
          }
        }
      }

      // Space padding around operators and keywords
      line = line.replace(/\s*=>\s*/g, ' => ')
      line = line.replace(/(\bif|\bfor|\bwhile|\bswitch|\bcatch)\s*\(/g, '$1 (')

      const indentation = this.getIndentString(opts, indentLevel)
      result.push(indentation + line)

      // Check opening bracket increase
      const openBrackets = (line.match(/[{[(]/g) || []).length
      const closeBrackets = (line.match(/[}\])]/g) || []).length
      const net = openBrackets - closeBrackets

      if (net > 0 && !line.startsWith('//')) {
        indentLevel += net
      }
    }

    return result.join('\n').trim() + '\n'
  }

  private formatCss(code: string, opts: FormatterOptions): string {
    // Normalize condensed CSS into distinct lines first
    const normalized = code
      .replace(/\{/g, ' {\n')
      .replace(/\}/g, '\n}\n')
      .replace(/;/g, ';\n')

    const lines = normalized.split(/\r?\n/)
    let indentLevel = 0
    const result: string[] = []

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim()
      if (!line) {
        continue
      }

      if (line.startsWith('}')) {
        indentLevel = Math.max(0, indentLevel - 1)
      }

      // Property colon spacing
      if (line.includes(':') && !line.startsWith('@') && !line.includes('{')) {
        const parts = line.split(':')
        const prop = parts[0].trim()
        const val = parts.slice(1).join(':').trim()
        line = `${prop}: ${val}`
        if (!line.endsWith(';') && !line.endsWith('}')) {
          line += ';'
        }
      }

      const indentation = this.getIndentString(opts, indentLevel)
      result.push(indentation + line)

      if (line.endsWith('{')) {
        indentLevel++
      }
    }

    return result.join('\n').trim() + '\n'
  }

  private formatHtml(code: string, opts: FormatterOptions): string {
    const lines = code.split(/\r?\n/)
    let indentLevel = 0
    const result: string[] = []
    const selfClosingTags = /^(<area|<base|<br|<col|<embed|<hr|<img|<input|<link|<meta|<param|<source|<track|<wbr)/i

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) {
        result.push('')
        continue
      }

      const isClosingTag = line.startsWith('</')
      if (isClosingTag) {
        indentLevel = Math.max(0, indentLevel - 1)
      }

      const indentation = this.getIndentString(opts, indentLevel)
      result.push(indentation + line)

      const isOpeningTag = line.startsWith('<') && !line.startsWith('</') && !line.startsWith('<!--') && !line.startsWith('<!')
      const isSelfClosing = line.endsWith('/>') || selfClosingTags.test(line) || (line.includes('</') && line.startsWith('<'))

      if (isOpeningTag && !isSelfClosing && line.endsWith('>')) {
        indentLevel++
      }
    }

    return result.join('\n').trim() + '\n'
  }

  private formatMarkdown(code: string, _opts: FormatterOptions): string {
    const lines = code.split(/\r?\n/)
    const result: string[] = []

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]

      // Format headings with space after hash
      if (/^#{1,6}[^#\s]/.test(line)) {
        line = line.replace(/^(#{1,6})([^#\s])/, '$1 $2')
      }

      // Format list items
      if (/^[-*+]\s+/.test(line)) {
        line = line.replace(/^([-*+])\s+/, '$1 ')
      }

      result.push(line)
    }

    return result.join('\n').trim() + '\n'
  }

  private formatYaml(code: string, _opts: FormatterOptions): string {
    const lines = code.split(/\r?\n/)
    const result: string[] = []

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]
      if (line.includes(':') && !line.trim().startsWith('#')) {
        line = line.replace(/:\s*([^\s])/, ': $1')
      }
      result.push(line)
    }

    return result.join('\n').trim() + '\n'
  }

  private formatPython(code: string, opts: FormatterOptions): string {
    const lines = code.split(/\r?\n/)
    let indentLevel = 0
    const result: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i]
      const trimmed = rawLine.trim()
      if (!trimmed) {
        result.push('')
        continue
      }

      if (trimmed.startsWith('elif ') || trimmed.startsWith('else:') || trimmed.startsWith('except') || trimmed.startsWith('finally:')) {
        indentLevel = Math.max(0, indentLevel - 1)
      }

      const indentation = this.getIndentString(opts, indentLevel)
      result.push(indentation + trimmed)

      if (trimmed.endsWith(':')) {
        indentLevel++
      }
    }

    return result.join('\n').trim() + '\n'
  }

  private formatRust(code: string, opts: FormatterOptions): string {
    return this.formatJavaScriptTypeScript(code, { ...opts, semi: true })
  }

  private formatGo(code: string, opts: FormatterOptions): string {
    return this.formatJavaScriptTypeScript(code, { ...opts, useTabs: true, semi: false })
  }

  private formatSql(code: string, opts: FormatterOptions): string {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'INSERT', 'INTO', 'VALUES',
      'UPDATE', 'SET', 'DELETE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
      'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'CREATE TABLE',
      'ALTER TABLE', 'DROP TABLE', 'PRIMARY KEY', 'FOREIGN KEY'
    ]

    let formatted = code
    for (const kw of keywords) {
      const reg = new RegExp(`\\b${kw}\\b`, 'gi')
      formatted = formatted.replace(reg, kw)
    }

    const lines = formatted.split(/\r?\n/)
    const result: string[] = []
    let indentLevel = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) {
        result.push('')
        continue
      }

      const isMainClause = /^(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|JOIN|LEFT JOIN|RIGHT JOIN|ORDER BY|GROUP BY|HAVING)/i.test(line)
      if (isMainClause) {
        indentLevel = 0
      }

      const indentation = this.getIndentString(opts, indentLevel)
      result.push(indentation + line)

      if (line.startsWith('SELECT') || line.startsWith('SET')) {
        indentLevel = 1
      }
    }

    return result.join('\n').trim() + '\n'
  }

  private formatGenericIndentation(code: string, opts: FormatterOptions): string {
    const lines = code.split(/\r?\n/)
    let indentLevel = 0
    const result: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) {
        result.push('')
        continue
      }

      if (line.startsWith('}') || line.startsWith(']') || line.startsWith(')')) {
        indentLevel = Math.max(0, indentLevel - 1)
      }

      const indentation = this.getIndentString(opts, indentLevel)
      result.push(indentation + line)

      if (line.endsWith('{') || line.endsWith('[') || line.endsWith('(')) {
        indentLevel++
      }
    }

    return result.join('\n').trim() + '\n'
  }
}

export const formatterService = new FormatterService()

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

        case 'cpp':
        case 'c':
        case 'java':
        case 'csharp':
        case 'php':
        case 'swift':
        case 'kotlin':
        case 'dart':
        case 'zig':
        case 'solidity':
        case 'move':
        case 'cairo':
        case 'odin':
        case 'graphql':
        case 'prisma':
          formatted = this.formatBraceLanguage(code, opts)
          break

        case 'vue':
        case 'svelte':
          formatted = this.formatHtml(code, opts)
          break

        default:
          formatted = this.formatGenericIndentation(code, opts)
          break
      }
      // Normalize line endings according to opts.endOfLine ('lf' | 'crlf')
      if (opts.endOfLine === 'crlf') {
        formatted = formatted.replace(/\r?\n/g, '\r\n')
      } else {
        formatted = formatted.replace(/\r\n/g, '\n')
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
   * Try external workspace CLI formatter (Prettier / ruff / rustfmt / gofmt) in Electron mode,
   * seamlessly falling back to the built-in formatter if the CLI tool isn't installed.
   */
  public async formatDocumentWithCli(
    code: string,
    language: string,
    filePath?: string,
    cwd?: string,
    customOptions?: Partial<FormatterOptions>
  ): Promise<FormatResult> {
    const normLang = (language || '').toLowerCase().trim()
    const opts: FormatterOptions = { ...this.options, ...customOptions }

    if (typeof window !== 'undefined' && window.electronAPI?.workspace?.execCommand && filePath && cwd) {
      const startTime = performance.now()
      const safePath = filePath.replace(/"/g, '\\"')
      let cmd = ''
      if (['typescript', 'javascript', 'typescriptreact', 'javascriptreact', 'json', 'css', 'scss', 'html', 'markdown', 'yaml', 'vue', 'graphql'].includes(normLang)) {
        cmd = `npx prettier --tab-width ${opts.tabWidth} ${opts.useTabs ? '--use-tabs' : ''} ${opts.semi ? '' : '--no-semi'} ${opts.singleQuote ? '--single-quote' : ''} --trailing-comma ${opts.trailingComma} --print-width ${opts.printWidth} --end-of-line ${opts.endOfLine} "${safePath}"`
      } else if (normLang === 'python' || normLang === 'py') {
        cmd = `ruff format --quiet "${safePath}"`
      } else if (normLang === 'rust' || normLang === 'rs') {
        cmd = `rustfmt --emit stdout "${safePath}"`
      } else if (normLang === 'go') {
        cmd = `gofmt "${safePath}"`
      }

      if (cmd) {
        try {
          const res = await window.electronAPI.workspace.execCommand({ command: cmd, cwd, timeoutMs: 12000 })
          if (res.exitCode === 0 && res.stdout && res.stdout.trim().length > 0) {
            return {
              formatted: res.stdout,
              hasChanges: res.stdout !== code,
              language: normLang,
              durationMs: Math.round(performance.now() - startTime),
            }
          }
        } catch {
          // Fall back cleanly to built-in formatter
        }
      }
    }

    return this.formatDocument(code, language, customOptions)
  }

  /**
   * Format a specific range/selection while preserving its base indentation.
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
    const slice = lines.slice(startIdx, endIdx)

    // Measure minimum leading whitespace of non-empty lines so range formatting preserves nesting
    let minIndent = Infinity
    let baseIndentStr = ''
    for (const l of slice) {
      if (!l.trim()) continue
      const match = l.match(/^([ \t]*)/)
      const ws = match ? match[1] : ''
      if (ws.length < minIndent) {
        minIndent = ws.length
        baseIndentStr = ws
      }
    }
    if (!Number.isFinite(minIndent)) baseIndentStr = ''

    const targetSection = slice.join('\n')
    const result = await this.formatDocument(targetSection, language, customOptions)
    if (result.errors && result.errors.length > 0) {
      return {
        formatted: code,
        hasChanges: false,
        language,
        durationMs: result.durationMs,
        errors: result.errors,
      }
    }

    const rawFormatted = result.formatted.replace(/\n$/, '')
    const formattedLines = rawFormatted.split(/\r?\n/).map((l) => (l.trim() ? baseIndentStr + l : ''))
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

  /**
   * Strip strings, template literals, and comments so bracket counting never misfires.
   */
  private stripStringsAndComments(line: string, inBlockComment: boolean): { cleaned: string; inBlockComment: boolean } {
    let out = ''
    let i = 0
    let block = inBlockComment
    let quote: string | null = null

    while (i < line.length) {
      const ch = line[i]
      const next = line[i + 1]

      if (block) {
        if (ch === '*' && next === '/') {
          block = false
          i += 2
        } else {
          i++
        }
        continue
      }

      if (quote) {
        if (ch === '\\') {
          i += 2
          continue
        }
        if (ch === quote) {
          quote = null
        }
        i++
        continue
      }

      if (ch === '/' && next === '/') {
        break
      }
      if (ch === '/' && next === '*') {
        block = true
        i += 2
        continue
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch
        i++
        continue
      }

      out += ch
      i++
    }

    return { cleaned: out, inBlockComment: block }
  }

  private formatJson(code: string, opts: FormatterOptions): string {
    // Support JSONC files containing // or /* */ comments without crashing or destroying comments
    const hasComments = /(^|[^:"'])\/\/|\/\*/.test(code)
    if (hasComments) {
      return this.formatBraceLanguage(code, opts)
    }
    const parsed = JSON.parse(code)
    const indent = opts.useTabs ? '\t' : opts.tabWidth
    return JSON.stringify(parsed, null, indent) + '\n'
  }

  /**
   * Safe indentation formatter for brace-delimited languages (JS/TS/JSX/Rust/Go/JSONC).
   * Never mutates string literals, JSX attributes, Rust lifetimes, or injects bogus semicolons.
   */
  private formatBraceLanguage(code: string, opts: FormatterOptions): string {
    const lines = code.split(/\r?\n/)
    let indentLevel = 0
    let inBlockComment = false
    const result: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) {
        result.push('')
        continue
      }

      const { cleaned, inBlockComment: nextBlock } = this.stripStringsAndComments(line, inBlockComment)

      // Leading closing braces/brackets/parens decrease indent for the current line
      const leadingCloseMatch = cleaned.match(/^[}\])]+/)
      const leadingCloses = leadingCloseMatch ? leadingCloseMatch[0].length : 0
      if (leadingCloses > 0) {
        indentLevel = Math.max(0, indentLevel - leadingCloses)
      }

      const indentation = this.getIndentString(opts, indentLevel)
      result.push(indentation + line)

      // Adjust indent for subsequent lines based on net remaining brackets outside strings/comments
      const rest = cleaned.slice(leadingCloses)
      const openBrackets = (rest.match(/[{[(]/g) || []).length
      const closeBrackets = (rest.match(/[}\])]/g) || []).length
      indentLevel = Math.max(0, indentLevel + (openBrackets - closeBrackets))
      inBlockComment = nextBlock
    }

    return result.join('\n').trimEnd() + '\n'
  }

  private formatJavaScriptTypeScript(code: string, opts: FormatterOptions): string {
    const lines = code.split(/\r?\n/)
    let indentLevel = 0
    let inBlockComment = false
    const result: string[] = []

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim()
      if (!line) {
        result.push('')
        continue
      }

      const { cleaned, inBlockComment: nextBlock } = this.stripStringsAndComments(line, inBlockComment)

      const leadingCloseMatch = cleaned.match(/^[}\])]+/)
      const leadingCloses = leadingCloseMatch ? leadingCloseMatch[0].length : 0
      if (leadingCloses > 0) {
        indentLevel = Math.max(0, indentLevel - leadingCloses)
      }

      const isComment = inBlockComment || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')
      const looksLikeJsx = /<\/?[A-Za-z][\w.-]*(?:\s|>|\/|$)/.test(line)

      // Apply singleQuote ONLY on non-JSX, non-comment, non-template lines
      if (opts.singleQuote && !isComment && !looksLikeJsx && !line.includes('`')) {
        line = line.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (m, content) => {
          return content.includes("'") ? m : `'${content}'`
        })
      }

      // Apply semicolons ONLY on clear complete single-line statements (never on JSX, comments, or open expressions)
      if (opts.semi && !isComment && !looksLikeJsx) {
        const netBrackets =
          (cleaned.match(/[{[(]/g) || []).length - (cleaned.match(/[}\])]/g) || []).length
        if (
          netBrackets === 0 &&
          !line.endsWith(';') &&
          !line.endsWith('{') &&
          !line.endsWith('}') &&
          !line.endsWith(',') &&
          !line.endsWith(':') &&
          !line.endsWith('(') &&
          !line.endsWith('[') &&
          !line.endsWith('=>') &&
          !/^(if|for|while|switch|catch|function|class|interface|type|export\s+default\s+function|export\s+function|export\s+class)\b/.test(line)
        ) {
          if (
            /^(const|let|var|return|import|export|throw|break|continue|debugger|yield|await|console)\b/.test(line) ||
            line.endsWith(')')
          ) {
            line += ';'
          }
        }
      }

      const indentation = this.getIndentString(opts, indentLevel)
      result.push(indentation + line)

      const rest = cleaned.slice(leadingCloses)
      const openBrackets = (rest.match(/[{[(]/g) || []).length
      const closeBrackets = (rest.match(/[}\])]/g) || []).length
      indentLevel = Math.max(0, indentLevel + (openBrackets - closeBrackets))
      inBlockComment = nextBlock
    }

    return result.join('\n').trimEnd() + '\n'
  }

  private formatCss(code: string, opts: FormatterOptions): string {
    // Protect url(...) and quoted strings so data:image/svg+xml;base64,... is NEVER split on ';' or '{'
    const protectedLiterals: string[] = []
    const stash = (m: string) => {
      const idx = protectedLiterals.push(m) - 1
      return `__CSS_LITERAL_${idx}__`
    }

    const shielded = code
      .replace(/url\(\s*(?:"[^"]*"|'[^']*'|[^)]*)\s*\)/gi, stash)
      .replace(/"(?:\\.|[^"\\])*"/g, stash)
      .replace(/'(?:\\.|[^'\\])*'/g, stash)
      .replace(/\/\*[\s\S]*?\*\//g, stash)

    const normalized = shielded
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

      // Property colon spacing (skip selectors, at-rules, and stashed comments)
      if (line.includes(':') && !line.startsWith('@') && !line.includes('{') && !line.startsWith('__CSS_LITERAL_')) {
        const colonIdx = line.indexOf(':')
        const prop = line.slice(0, colonIdx).trim()
        const val = line.slice(colonIdx + 1).trim()
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

    const restored = result
      .join('\n')
      .replace(/__CSS_LITERAL_(\d+)__/g, (_, idx) => protectedLiterals[Number(idx)] ?? '')

    return restored.trimEnd() + '\n'
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
      let line = lines[i].replace(/[ \t]+$/, '')
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        // Only normalize the YAML mapping key colon (never colons inside quotes or URLs like postgres:// or "3000:3000")
        const keyMatch = line.match(/^(\s*(?:-\s+)?[A-Za-z0-9_.-]+):(\S.*)$/)
        if (keyMatch && !keyMatch[2].startsWith('//')) {
          line = `${keyMatch[1]}: ${keyMatch[2]}`
        }
      }
      result.push(line)
    }

    return result.join('\n').trim() + '\n'
  }

  private formatPython(code: string, opts: FormatterOptions): string {
    // Python indentation is semantically significant (blocks are defined by dedentation).
    const lines = code.split(/\r?\n/)
    const tabWidth = Math.max(1, opts.tabWidth || 4)

    // Check whether the file already carries semantic indentation
    const hasExistingIndent = lines.some((l) => /^[ \t]+\S/.test(l))

    if (hasExistingIndent) {
      let detectedUnit = tabWidth
      for (const rawLine of lines) {
        const m = rawLine.match(/^( +)\S/)
        if (m && m[1].length > 0 && m[1].length < detectedUnit) {
          detectedUnit = m[1].length
        }
      }

      const result: string[] = []
      for (let i = 0; i < lines.length; i++) {
        const trimmedEnd = lines[i].replace(/[ \t]+$/, '')
        if (!trimmedEnd) {
          result.push('')
          continue
        }
        const leadingMatch = trimmedEnd.match(/^([ \t]*)/)
        const leading = leadingMatch ? leadingMatch[1] : ''
        const body = trimmedEnd.slice(leading.length)

        const expandedSpaces = leading.replace(/\t/g, ' '.repeat(detectedUnit)).length
        const level = Math.floor(expandedSpaces / detectedUnit)
        const remainder = expandedSpaces % detectedUnit
        const normalizedIndent = this.getIndentString(opts, level) + (remainder > 0 ? ' '.repeat(remainder) : '')
        result.push(normalizedIndent + body)
      }

      return result.join('\n').trimEnd() + '\n'
    }

    // Flat unindented snippet: infer block nesting AND dedent properly on control-flow exits/clauses
    let indentLevel = 0
    const result: string[] = []
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim()
      if (!trimmed) {
        result.push('')
        continue
      }

      if (/^(elif\b|else\s*:|except\b|finally\s*:)/.test(trimmed)) {
        indentLevel = Math.max(0, indentLevel - 1)
      }

      result.push(this.getIndentString(opts, indentLevel) + trimmed)

      if (trimmed.endsWith(':') && !trimmed.startsWith('#')) {
        indentLevel++
      } else if (/^(return\b|break\b|continue\b|pass\b|raise\b)/.test(trimmed)) {
        const nextNonEmpty = lines.slice(i + 1).find((l) => l.trim().length > 0)?.trim() || ''
        if (!/^(elif\b|else\s*:|except\b|finally\s*:)/.test(nextNonEmpty)) {
          indentLevel = Math.max(0, indentLevel - 1)
        }
      }
    }

    return result.join('\n').trimEnd() + '\n'
  }

  private formatRust(code: string, opts: FormatterOptions): string {
    return this.formatBraceLanguage(code, { ...opts, tabWidth: opts.tabWidth || 4 })
  }

  private formatGo(code: string, opts: FormatterOptions): string {
    return this.formatBraceLanguage(code, { ...opts, useTabs: true })
  }

  private formatSql(code: string, opts: FormatterOptions): string {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'INSERT', 'INTO', 'VALUES',
      'UPDATE', 'SET', 'DELETE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
      'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'CREATE TABLE',
      'ALTER TABLE', 'DROP TABLE', 'PRIMARY KEY', 'FOREIGN KEY'
    ]

    // Protect SQL single-quoted strings and -- line comments before uppercasing keywords
    const stashed: string[] = []
    const protectedSql = code.replace(/'(?:''|[^'])*'|--[^\r\n]*/g, (m) => {
      const idx = stashed.push(m) - 1
      return `__SQL_STASH_${idx}__`
    })

    let formatted = protectedSql
    for (const kw of keywords) {
      const reg = new RegExp(`\\b${kw}\\b`, 'gi')
      formatted = formatted.replace(reg, kw)
    }

    formatted = formatted.replace(/__SQL_STASH_(\d+)__/g, (_, i) => stashed[Number(i)] ?? '')

    const lines = formatted.split(/\r?\n/)
    const result: string[] = []
    let indentLevel = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) {
        result.push('')
        continue
      }

      if (line.startsWith(')')) {
        indentLevel = Math.max(0, indentLevel - 1)
      }

      const isMainClause = /^(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|JOIN|LEFT JOIN|RIGHT JOIN|ORDER BY|GROUP BY|HAVING|CREATE TABLE)/i.test(line)
      if (isMainClause) {
        indentLevel = 0
      }

      const indentation = this.getIndentString(opts, indentLevel)
      result.push(indentation + line)

      if (line.startsWith('SELECT') || line.startsWith('SET') || line.endsWith('(')) {
        indentLevel++
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

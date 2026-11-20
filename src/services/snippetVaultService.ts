/**
 * IndoctrinatedEdit - Snippet Vault & Scratchpad Service
 */

export interface CodeSnippet {
  id: string
  title: string
  language: string
  description: string
  tags: string[]
  code: string
  isCustom?: boolean
  createdAt?: string
}

class SnippetVaultService {
  private defaultSnippets: CodeSnippet[] = [
    {
      id: 'ts-debounce',
      title: 'Type-Safe Generic Debounce',
      language: 'typescript',
      description: 'Zero-dependency TypeScript debounce function with argument forwarding.',
      tags: ['utils', 'async', 'typescript'],
      code: `export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout | number | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer as any);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}`,
    },
    {
      id: 'ts-glass-theme',
      title: 'Liquid Glass Theme Definition',
      language: 'typescript',
      description: 'Antigravity Liquid Glass custom theme token structure.',
      tags: ['ui', 'theme', 'liquid-glass'],
      code: `export const NeonGlassTheme = {
  id: 'custom-neon-glass',
  name: 'Neon Glass Dark',
  colors: {
    glassBackground: 'rgba(15, 20, 35, 0.78)',
    glassBlurRadius: '32px',
    glassSaturation: '200%',
    specularBorder: 'rgba(255, 255, 255, 0.16)',
    accentGlow: 'rgba(10, 132, 255, 0.45)',
    textPrimary: '#FFFFFF',
    textMuted: 'rgba(235, 235, 245, 0.55)',
  }
};`,
    },
    {
      id: 'py-async-pool',
      title: 'Asyncio Worker Queue Pool',
      language: 'python',
      description: 'High-throughput async worker pool in Python 3.11+.',
      tags: ['python', 'asyncio', 'concurrency'],
      code: `import asyncio

async def worker(queue: asyncio.Queue, worker_id: int):
    while True:
        task = await queue.get()
        try:
            print(f"[Worker {worker_id}] Processing {task}")
            await asyncio.sleep(0.05)
        finally:
            queue.task_done()

async def main():
    queue = asyncio.Queue()
    workers = [asyncio.create_task(worker(queue, i)) for i in range(4)]
    for item in range(20):
        await queue.put(f"Job-{item}")
    await queue.join()
    for w in workers:
        w.cancel()`,
    },
    {
      id: 'rust-error-handling',
      title: 'Rust thiserror Custom Error Enum',
      language: 'rust',
      description: 'Idiomatic production error hierarchy in Rust with thiserror.',
      tags: ['rust', 'error-handling'],
      code: `use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Network I/O failed: {0}")]
    Io(#[from] std::io::Error),
    #[error("Failed to parse JSON configuration: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Unauthorized request: {message}")]
    Unauthorized { message: String },
    #[error("Unknown error occurred")]
    Unknown,
}`,
    },
    {
      id: 'sql-window-func',
      title: 'SQL Ranking & Running Totals',
      language: 'sql',
      description: 'DENSE_RANK and running SUM over partitions.',
      tags: ['sql', 'analytics'],
      code: `SELECT
  department_id,
  employee_id,
  salary,
  DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS salary_rank,
  SUM(salary) OVER (PARTITION BY department_id ORDER BY employee_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM employees;`,
    },
    {
      id: 'sh-safe-flags',
      title: 'POSIX Safe Bash Header',
      language: 'shell',
      description: 'Robust error-catching bash script preamble with cleanup trap.',
      tags: ['shell', 'bash', 'devops'],
      code: `#!/usr/bin/env bash
set -euo pipefail
IFS=$'\\n\\t'

cleanup() {
  echo "[INFO] Cleaning up temporary resources..."
}
trap cleanup EXIT ERR

echo "Executing safe script..."`,
    },
  ]

  private customSnippets: CodeSnippet[] = []
  private scratchpadText: string = ''

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('indoctrinated_custom_snippets')
      if (stored) {
        this.customSnippets = JSON.parse(stored)
      }
      const scratch = localStorage.getItem('indoctrinated_scratchpad')
      if (scratch) {
        this.scratchpadText = scratch
      }
    } catch {
      // ignore
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('indoctrinated_custom_snippets', JSON.stringify(this.customSnippets))
      localStorage.setItem('indoctrinated_scratchpad', this.scratchpadText)
    } catch {
      // ignore
    }
  }

  public getAllSnippets(): CodeSnippet[] {
    return [...this.customSnippets, ...this.defaultSnippets]
  }

  public getSnippetsByLanguage(lang: string): CodeSnippet[] {
    if (!lang || lang === 'all') return this.getAllSnippets()
    return this.getAllSnippets().filter((s) => s.language.toLowerCase() === lang.toLowerCase())
  }

  public addCustomSnippet(snippet: Omit<CodeSnippet, 'id' | 'isCustom' | 'createdAt'>): CodeSnippet {
    const newSnippet: CodeSnippet = {
      ...snippet,
      tags: Array.from(new Set((snippet.tags || []).map((t) => t.trim()).filter(Boolean))),
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      isCustom: true,
      createdAt: new Date().toLocaleDateString(),
    }
    this.customSnippets.unshift(newSnippet)
    this.saveToStorage()
    return newSnippet
  }

  public updateCustomSnippet(
    id: string,
    updates: Partial<Omit<CodeSnippet, 'id' | 'isCustom' | 'createdAt'>>
  ): CodeSnippet | null {
    const idx = this.customSnippets.findIndex((s) => s.id === id)
    if (idx === -1) return null
    const cleanedUpdates = {
      ...updates,
      ...(updates.tags ? { tags: Array.from(new Set(updates.tags.map((t) => t.trim()).filter(Boolean))) } : {}),
    }
    this.customSnippets[idx] = { ...this.customSnippets[idx], ...cleanedUpdates }
    this.saveToStorage()
    return this.customSnippets[idx]
  }

  public deleteCustomSnippet(id: string): boolean {
    const prevLen = this.customSnippets.length
    this.customSnippets = this.customSnippets.filter((s) => s.id !== id)
    if (this.customSnippets.length !== prevLen) {
      this.saveToStorage()
      return true
    }
    return false
  }

  /**
   * Exports all snippets in standard VS Code `.code-snippets` JSON format.
   */
  public exportVsCodeSnippets(onlyCustom = false): string {
    const list = onlyCustom ? this.customSnippets : this.getAllSnippets()
    const out: Record<string, { scope: string; prefix: string; body: string[]; description: string }> = {}
    for (const s of list) {
      out[s.title] = {
        scope: s.language,
        prefix: s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        body: s.code.split(/\r?\n/),
        description: s.description,
      }
    }
    return JSON.stringify(out, null, 2)
  }

  /**
   * Imports standard VS Code `.code-snippets` JSON into custom snippets.
   */
  public importVsCodeSnippets(jsonText: string): { importedCount: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonText)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { importedCount: 0, error: 'Expected a JSON object mapping snippet names to definitions.' }
      }
      let importedCount = 0
      for (const [title, def] of Object.entries(parsed)) {
        if (!def || typeof def !== 'object') continue
        const d = def as any
        const bodyLines = Array.isArray(d.body) ? d.body.join('\n') : typeof d.body === 'string' ? d.body : ''
        if (!bodyLines.trim()) continue
        const scopeRaw = String(d.scope || 'typescript').split(',')[0].trim() || 'typescript'
        const prefixTags = Array.isArray(d.prefix)
          ? d.prefix.map(String)
          : typeof d.prefix === 'string' && d.prefix.trim()
          ? [d.prefix.trim()]
          : ['imported']
        this.addCustomSnippet({
          title,
          language: scopeRaw,
          description: String(d.description || 'Imported VS Code snippet'),
          tags: prefixTags,
          code: bodyLines,
        })
        importedCount++
      }
      return { importedCount }
    } catch (err: any) {
      return { importedCount: 0, error: err?.message || 'Invalid JSON' }
    }
  }

  public getScratchpad(): string {
    return this.scratchpadText
  }

  public saveScratchpad(text: string) {
    this.scratchpadText = text
    this.saveToStorage()
  }

  /**
   * Expands template variable tokens ($CURRENT_YEAR, $CURRENT_DATE, $CURRENT_TIME, $FILE_NAME, $FILE_EXT, $AUTHOR, $UUID, $RANDOM_HEX)
   * into their evaluated runtime values.
   */
  public expandSnippetVariables(
    template: string,
    context?: { fileName?: string; author?: string }
  ): string {
    const now = new Date()
    const yyyy = String(now.getFullYear())
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const min = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')

    const dateStr = `${yyyy}-${mm}-${dd}`
    const timeStr = `${hh}:${min}:${ss}`
    const fileName = context?.fileName || 'untitled'
    const extMatch = fileName.match(/\.([^.]+)$/)
    const fileExt = extMatch ? extMatch[1] : ''
    const author = context?.author || 'indoctrinatedrecluse'

    return template
      .replace(/\$CURRENT_YEAR/g, yyyy)
      .replace(/\$CURRENT_DATE/g, dateStr)
      .replace(/\$CURRENT_TIME/g, timeStr)
      .replace(/\$FILE_NAME/g, fileName)
      .replace(/\$FILE_EXT/g, fileExt)
      .replace(/\$AUTHOR/g, author)
      .replace(/\$UUID/g, () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          return crypto.randomUUID()
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0
          const v = c === 'x' ? r : (r & 0x3) | 0x8
          return v.toString(16)
        })
      })
      .replace(/\$RANDOM_HEX/g, () => Math.random().toString(16).substring(2, 10))
  }

  /**
   * Filters snippet collection across type (all / custom / builtin), language, and search query.
   */
  public filterSnippets(options: {
    type?: 'all' | 'custom' | 'builtin'
    language?: string
    query?: string
  }): CodeSnippet[] {
    let list = this.getAllSnippets()
    if (options.type === 'custom') {
      list = list.filter((s) => s.isCustom)
    } else if (options.type === 'builtin') {
      list = list.filter((s) => !s.isCustom)
    }

    if (options.language && options.language !== 'all') {
      const l = options.language.toLowerCase()
      list = list.filter((s) => s.language.toLowerCase() === l)
    }

    if (options.query && options.query.trim()) {
      const q = options.query.toLowerCase().trim()
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.language.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      )
    }

    return list
  }
}

export const snippetVaultService = new SnippetVaultService()

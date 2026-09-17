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
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      isCustom: true,
      createdAt: new Date().toLocaleDateString(),
    }
    this.customSnippets.unshift(newSnippet)
    this.saveToStorage()
    return newSnippet
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

  public getScratchpad(): string {
    return this.scratchpadText
  }

  public saveScratchpad(text: string) {
    this.scratchpadText = text
    this.saveToStorage()
  }
}

export const snippetVaultService = new SnippetVaultService()

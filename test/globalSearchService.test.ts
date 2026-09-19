import { describe, it, expect, beforeEach, vi } from 'vitest'
import { globalSearchService, GlobalSearchOptions } from '../src/services/globalSearchService'

describe('GlobalSearchService', () => {
  const mockFiles: Record<string, string> = {
    'src/index.ts': `import { app } from './app';\nconsole.log('Starting app...');\napp.start();`,
    'src/app.ts': `export const app = {\n  start: () => console.log('App started!'),\n  stop: () => console.log('App stopped!'),\n};`,
    'src/utils/math.ts': `export function add(a: number, b: number): number {\n  return a + b;\n}`,
    'README.md': `# IndoctrinatedEdit\n\nHigh-performance editor for TypeScript and JavaScript developers.`,
    'dist/bundle.js': `function bundle(){console.log('compiled bundle');}`,
  }

  let updatedFiles: Record<string, string> = {}

  beforeEach(() => {
    updatedFiles = { ...mockFiles }
    globalSearchService.registerWorkspace(
      () => updatedFiles,
      (filePath, newContent) => {
        updatedFiles[filePath] = newContent
      }
    )
  })

  it('should find occurrences across multiple files with case insensitivity', async () => {
    const results = await globalSearchService.search('app', { matchCase: false })
    expect(results.totalMatches).toBeGreaterThanOrEqual(5)
    expect(results.totalFiles).toBeGreaterThanOrEqual(2) // index.ts and app.ts
    expect(results.fileResults.some((f) => f.filePath === 'src/index.ts')).toBe(true)
    expect(results.fileResults.some((f) => f.filePath === 'src/app.ts')).toBe(true)
  })

  it('should respect matchCase option', async () => {
    const caseSensitive = await globalSearchService.search('App', { matchCase: true })
    const caseInsensitive = await globalSearchService.search('App', { matchCase: false })

    expect(caseSensitive.totalMatches).toBeLessThan(caseInsensitive.totalMatches)
  })

  it('should respect matchWholeWord option', async () => {
    const wholeWord = await globalSearchService.search('app', { matchWholeWord: true, matchCase: false })
    const partial = await globalSearchService.search('app', { matchWholeWord: false, matchCase: false })

    expect(wholeWord.totalMatches).toBeLessThanOrEqual(partial.totalMatches)
  })

  it('should support regular expression searches', async () => {
    const regexResults = await globalSearchService.search('console\\.log\\(.*\\)', { isRegex: true })
    expect(regexResults.totalMatches).toBeGreaterThanOrEqual(3)
  })

  it('should filter files with includePattern and excludePattern globs', async () => {
    const excluded = await globalSearchService.search('bundle', {
      excludePattern: 'dist/**',
    })
    expect(excluded.fileResults.some((f) => f.filePath.includes('dist/'))).toBe(false)

    const includedOnly = await globalSearchService.search('export', {
      includePattern: '*.ts',
    })
    expect(includedOnly.fileResults.every((f) => f.filePath.endsWith('.ts'))).toBe(true)
  })

  it('should preview and execute batch replacements across workspace', async () => {
    const preview = globalSearchService.previewBatchReplace('console.log', 'logger.info', {
      matchCase: true,
    })

    expect(preview.totalReplaced).toBeGreaterThanOrEqual(3)
    expect(preview.filesAffected).toBeGreaterThanOrEqual(2)

    const result = await globalSearchService.executeBatchReplace('console.log', 'logger.info', {
      matchCase: true,
    })

    expect(result.totalReplaced).toBe(preview.totalReplaced)
    expect(updatedFiles['src/index.ts']).toContain("logger.info('Starting app...')")
    expect(updatedFiles['src/app.ts']).toContain("logger.info('App started!')")
  })

  it('should replace a single match cleanly', () => {
    const match = {
      id: 'src/index.ts:2:0',
      filePath: 'src/index.ts',
      fileName: 'index.ts',
      lineNumber: 2,
      columnStart: 1,
      columnEnd: 12,
      lineContent: "console.log('Starting app...');",
      matchText: 'console.log',
      previewPrefix: '',
      previewMatch: 'console.log',
      previewSuffix: "('Starting app...');",
    }

    const success = globalSearchService.replaceSingleMatch(match, 'customLog')
    expect(success).toBe(true)
    expect(updatedFiles['src/index.ts']).toContain("customLog('Starting app...')")
  })
})

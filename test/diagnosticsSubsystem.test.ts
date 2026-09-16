import { describe, it, expect, beforeEach } from 'vitest'
import { diagnosticsService } from '../src/services/diagnosticsService'

describe('Diagnostics & Problems Subsystem Suite (Phase 2)', () => {
  beforeEach(() => {
    diagnosticsService.clearAll()
  })

  describe('1. Basic Diagnostics Management & Subscriptions', () => {
    it('should set, update, and clear file diagnostics', () => {
      diagnosticsService.setDiagnostics('src/app.ts', 'app.ts', [
        {
          message: 'Cannot find name "x"',
          severity: 'error',
          startLineNumber: 10,
          startColumn: 5,
          endLineNumber: 10,
          endColumn: 6,
          source: 'typescript',
          code: 2304,
        },
        {
          message: 'Unused variable "y"',
          severity: 'warning',
          startLineNumber: 12,
          startColumn: 7,
          endLineNumber: 12,
          endColumn: 8,
          source: 'eslint',
          code: 'no-unused-vars',
        },
      ])

      const groups = diagnosticsService.getAllGroups()
      expect(groups.length).toBe(1)
      expect(groups[0].fileName).toBe('app.ts')
      expect(groups[0].errorCount).toBe(1)
      expect(groups[0].warningCount).toBe(1)

      const counts = diagnosticsService.getCounts()
      expect(counts.errors).toBe(1)
      expect(counts.warnings).toBe(1)
      expect(counts.total).toBe(2)

      // Clear for file
      diagnosticsService.clearDiagnosticsForFile('src/app.ts')
      expect(diagnosticsService.getAllGroups().length).toBe(0)
    })
  })

  describe('2. Multi-Language Linter & Static Analysis', () => {
    it('should detect JSON syntax errors with exact line and column', () => {
      const invalidJson = '{\n  "key": "value",\n  "broken": \n}'
      const items = diagnosticsService.analyzeCode('config.json', 'config.json', invalidJson, 'json')

      expect(items.length).toBeGreaterThan(0)
      expect(items.some((i) => i.severity === 'error' && i.source === 'json-schema')).toBe(true)
    })

    it('should detect TypeScript/JavaScript common code smells and syntax mismatches', () => {
      const code = `
var oldStyle = 1;
if (oldStyle == 1) {
  console.log("hello");
` // Unclosed brace
      const items = diagnosticsService.analyzeCode('index.ts', 'index.ts', code, 'typescript')

      expect(items.some((i) => i.code === 'no-var')).toBe(true)
      expect(items.some((i) => i.code === 'eqeqeq')).toBe(true)
      expect(items.some((i) => i.code === 'no-console')).toBe(true)
      expect(items.some((i) => i.severity === 'error' && i.code === 'syntax(brace-mismatch)')).toBe(true)
    })

    it('should detect Python PEP 8 tab indentation and missing colons', () => {
      const pyCode = `
def calculate(a, b)
\treturn a + b
`
      const items = diagnosticsService.analyzeCode('script.py', 'script.py', pyCode, 'python')

      expect(items.some((i) => i.code === 'E999')).toBe(true) // Missing colon
      expect(items.some((i) => i.code === 'W191')).toBe(true) // Tab indentation
    })

    it('should detect CSS missing semicolons', () => {
      const cssCode = `
.container {
  display: flex
  color: #fff;
}
`
      const items = diagnosticsService.analyzeCode('styles.css', 'styles.css', cssCode, 'css')

      expect(items.some((i) => i.code === 'css(missing-semicolon)')).toBe(true)
    })
  })
})

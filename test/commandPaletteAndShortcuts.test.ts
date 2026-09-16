import { describe, it, expect, vi, beforeEach } from 'vitest'
import { commandRegistry, CommandItem } from '../src/services/commandRegistry'
import { DocumentSymbol } from '../src/components/Editor/EditorHost'

describe('Command Palette & Shortcuts Modal Integration Suite', () => {
  beforeEach(() => {
    // Register standard test commands
    commandRegistry.registerMany([
      {
        id: 'edit.format',
        title: 'Format Document',
        category: 'Editor',
        shortcut: 'Shift+Alt+F',
        description: 'Auto-format active code buffer',
        handler: vi.fn(),
      },
      {
        id: 'edit.gotoLine',
        title: 'Go to Line / Column...',
        category: 'Editor',
        shortcut: 'Ctrl+G',
        description: 'Navigate directly to line number',
        handler: vi.fn(),
      },
      {
        id: 'help.shortcuts',
        title: 'Help: Keyboard Shortcuts Reference',
        category: 'Help',
        shortcut: 'Ctrl+K Ctrl+S',
        description: 'Show all keyboard shortcuts',
        handler: vi.fn(),
      },
      {
        id: 'theme.synthwave-84',
        title: 'Theme: Synthwave \'84 Sunset Neon',
        category: 'Themes',
        description: 'Switch editor theme to Synthwave \'84 Sunset Neon',
        handler: vi.fn(),
      },
    ])
  })

  describe('1. Centralized Command Registry Capabilities', () => {
    it('should register and retrieve commands accurately', () => {
      const formatCmd = commandRegistry.get('edit.format')
      expect(formatCmd).toBeDefined()
      expect(formatCmd?.title).toBe('Format Document')
      expect(formatCmd?.shortcut).toBe('Shift+Alt+F')
      expect(formatCmd?.category).toBe('Editor')

      const all = commandRegistry.getAll()
      expect(all.length).toBeGreaterThanOrEqual(4)
    })

    it('should execute registered command handlers correctly', () => {
      const mockHandler = vi.fn()
      const unregister = commandRegistry.register({
        id: 'test.customAction',
        title: 'Test Action',
        category: 'View',
        handler: mockHandler,
      })

      commandRegistry.execute('test.customAction')
      expect(mockHandler).toHaveBeenCalledTimes(1)

      unregister()
      expect(commandRegistry.get('test.customAction')).toBeUndefined()
    })
  })

  describe('2. Command Palette Mode Prefixes & Parsers', () => {
    it('should identify command mode with > prefix', () => {
      const query = '>format'
      const isCommandMode = query.startsWith('>')
      const searchTerm = query.substring(1).trim().toLowerCase()
      expect(isCommandMode).toBe(true)
      expect(searchTerm).toBe('format')

      const matches = commandRegistry
        .getAll()
        .filter((c) => c.title.toLowerCase().includes(searchTerm))
      expect(matches.some((m) => m.id === 'edit.format')).toBe(true)
    })

    it('should parse Go to Line (:line and :line:col) correctly', () => {
      const parseLineCol = (q: string) => {
        if (!q.startsWith(':')) return null
        const match = q.slice(1).trim().match(/^(\d+)(?::(\d+))?$/)
        if (!match) return null
        return {
          line: parseInt(match[1], 10),
          col: match[2] ? parseInt(match[2], 10) : 1,
        }
      }

      const res1 = parseLineCol(':42')
      expect(res1).toEqual({ line: 42, col: 1 })

      const res2 = parseLineCol(':128:15')
      expect(res2).toEqual({ line: 128, col: 15 })

      const res3 = parseLineCol(':invalid')
      expect(res3).toBeNull()
    })
  })

  describe('3. Outline Symbol Extraction Simulation', () => {
    it('should extract functions, classes, interfaces, and markdown headings from source', () => {
      const codeLines = [
        '# IndoctrinatedEdit Architecture',
        'export interface UserConfig { id: string }',
        'export class ThemeManager {',
        '  public async applyTheme(themeId: string) {',
        '    return true;',
        '  }',
        '}',
        'function calculateGlow(blur: number) {',
        '  return blur * 2;',
        '}',
      ]

      const symbols: DocumentSymbol[] = []
      codeLines.forEach((line, idx) => {
        const lineNum = idx + 1
        const trimmed = line.trim()

        const mdHeadingMatch = trimmed.match(/^(#{1,6})\s+(.+)/)
        if (mdHeadingMatch) {
          symbols.push({ name: mdHeadingMatch[2], kind: 'heading', line: lineNum })
          return
        }

        const classMatch = trimmed.match(/(?:export\s+)?(?:abstract\s+)?(?:class|interface)\s+([A-Za-z0-9_$]+)/)
        if (classMatch) {
          symbols.push({ name: classMatch[1], kind: trimmed.includes('interface') ? 'interface' : 'class', line: lineNum })
          return
        }

        const fnMatch = trimmed.match(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)/) ||
          trimmed.match(/(?:public|private|protected)?\s*(?:async\s*)?([A-Za-z0-9_$]+)\s*\([^)]*\)\s*[{:]/)
        if (fnMatch && fnMatch[1] && !['if', 'for', 'while'].includes(fnMatch[1])) {
          symbols.push({ name: fnMatch[1], kind: 'function', line: lineNum })
        }
      })

      expect(symbols.length).toBe(5)
      expect(symbols[0]).toEqual({ name: 'IndoctrinatedEdit Architecture', kind: 'heading', line: 1 })
      expect(symbols[1]).toEqual({ name: 'UserConfig', kind: 'interface', line: 2 })
      expect(symbols[2]).toEqual({ name: 'ThemeManager', kind: 'class', line: 3 })
      expect(symbols[3]).toEqual({ name: 'applyTheme', kind: 'function', line: 4 })
      expect(symbols[4]).toEqual({ name: 'calculateGlow', kind: 'function', line: 8 })
    })
  })
})

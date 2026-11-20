import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fuzzyMatch, highlightMatches } from '../src/components/CommandPalette/fuzzySearch'
import {
  getPaletteHistory,
  recordPaletteExecution,
  removePaletteHistoryItem,
  clearPaletteHistory,
} from '../src/components/CommandPalette/paletteHistory'
import React from 'react'

// Polyfill in-memory localStorage for Node test runner
if (typeof globalThis.localStorage === 'undefined') {
  let store: Record<string, string> = {}
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value) },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length },
  } as any
}

describe('Enhanced Command Palette - Subsystems & Algorithms', () => {
  describe('Fuzzy Search & Ranking Engine', () => {
    it('returns null when characters do not match in sequence', () => {
      expect(fuzzyMatch('xyz', 'Format Document')).toBeNull()
      expect(fuzzyMatch('abc', 'def')).toBeNull()
      expect(fuzzyMatch('hello', '')).toBeNull()
    })

    it('returns score 0 and empty indices for empty pattern', () => {
      const res = fuzzyMatch('', 'Any File Name.ts')
      expect(res).not.toBeNull()
      expect(res?.score).toBe(0)
      expect(res?.indices).toEqual([])
    })

    it('scores exact match with maximum score', () => {
      const exact = fuzzyMatch('Format Document', 'Format Document')
      const partial = fuzzyMatch('Format', 'Format Document')
      expect(exact).not.toBeNull()
      expect(partial).not.toBeNull()
      expect(exact!.score).toBeGreaterThan(partial!.score)
    })

    it('awards prefix matches higher score than mid-string matches', () => {
      const prefix = fuzzyMatch('git', 'Git: Graph View')
      const mid = fuzzyMatch('git', 'Settings: Toggle Git')
      expect(prefix).not.toBeNull()
      expect(mid).not.toBeNull()
      expect(prefix!.score).toBeGreaterThan(mid!.score)
    })

    it('detects word boundary and acronym matches', () => {
      // "fd" matching "Format Document"
      const res = fuzzyMatch('fd', 'Format Document')
      expect(res).not.toBeNull()
      expect(res!.indices).toContain(0) // 'F'
      expect(res!.indices).toContain(7) // 'D'
    })

    it('detects CamelCase boundary matches', () => {
      // "gTL" matching "goToLine"
      const res = fuzzyMatch('gtl', 'goToLine')
      expect(res).not.toBeNull()
      expect(res!.indices.length).toBe(3)
    })

    it('awards consecutive character streak bonuses', () => {
      const streak = fuzzyMatch('format', 'Format Document')
      const scattered = fuzzyMatch('fmtdoc', 'Format Document')
      expect(streak).not.toBeNull()
      expect(scattered).not.toBeNull()
      expect(streak!.score).toBeGreaterThan(scattered!.score)
    })
  })

  describe('Highlight Matches Generator', () => {
    it('returns plain text if indices array is empty or undefined', () => {
      const text = 'Editor: Format Document'
      expect(highlightMatches(text, [])).toBe(text)
    })

    it('wraps matched indices inside React elements', () => {
      const text = 'Format'
      const node = highlightMatches(text, [0, 1]) // "Fo"
      expect(React.isValidElement(node)).toBe(true)
    })
  })

  describe('MRU Palette History Persistence', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('starts with empty history', () => {
      expect(getPaletteHistory()).toEqual([])
    })

    it('records command execution and places newest item at top', () => {
      recordPaletteExecution({
        id: 'editor.format',
        type: 'command',
        title: 'Format Document',
        shortcut: 'Shift+Alt+F',
        category: 'Editor',
      })

      const history = getPaletteHistory()
      expect(history.length).toBe(1)
      expect(history[0].id).toBe('editor.format')
      expect(history[0].title).toBe('Format Document')
      expect(history[0].count).toBe(1)
    })

    it('deduplicates existing entries and increments execution count', () => {
      recordPaletteExecution({
        id: 'file.save',
        type: 'command',
        title: 'Save File',
      })
      recordPaletteExecution({
        id: 'file.new',
        type: 'command',
        title: 'New Untitled File',
      })
      recordPaletteExecution({
        id: 'file.save',
        type: 'command',
        title: 'Save File',
      })

      const history = getPaletteHistory()
      expect(history.length).toBe(2)
      expect(history[0].id).toBe('file.save') // Placed at top
      expect(history[0].count).toBe(2)
      expect(history[1].id).toBe('file.new')
    })

    it('removes a specific item from history', () => {
      recordPaletteExecution({ id: 'cmd-1', type: 'command', title: 'Command 1' })
      recordPaletteExecution({ id: 'cmd-2', type: 'command', title: 'Command 2' })

      const remaining = removePaletteHistoryItem('cmd-1')
      expect(remaining.length).toBe(1)
      expect(remaining[0].id).toBe('cmd-2')
      expect(getPaletteHistory().length).toBe(1)
    })

    it('clears all history', () => {
      recordPaletteExecution({ id: 'cmd-1', type: 'command', title: 'Command 1' })
      clearPaletteHistory()
      expect(getPaletteHistory()).toEqual([])
    })
  })

  describe('Prefix & Mode Parsing Logic', () => {
    const parseMode = (q: string) => {
      const trimmed = q.trimStart()
      if (trimmed.startsWith('>')) return 'command'
      if (trimmed.startsWith('@')) return 'symbol'
      if (trimmed.startsWith('#')) return 'workspace-symbol'
      if (trimmed.startsWith(':')) return 'gotoline'
      if (trimmed.toLowerCase().startsWith('edt ') || trimmed.toLowerCase() === 'edt') return 'editors'
      if (trimmed.toLowerCase().startsWith('ext ') || trimmed.toLowerCase() === 'ext') return 'extensions'
      if (trimmed.toLowerCase().startsWith('theme ') || trimmed.toLowerCase() === 'theme') return 'themes'
      if (trimmed.startsWith('?') || trimmed.toLowerCase() === 'help') return 'help'
      return 'unified'
    }

    it('correctly maps prefix to mode', () => {
      expect(parseMode('> git')).toBe('command')
      expect(parseMode('@render')).toBe('symbol')
      expect(parseMode('#App')).toBe('workspace-symbol')
      expect(parseMode(':120')).toBe('gotoline')
      expect(parseMode(':120:5')).toBe('gotoline')
      expect(parseMode('edt')).toBe('editors')
      expect(parseMode('edt main')).toBe('editors')
      expect(parseMode('ext')).toBe('extensions')
      expect(parseMode('ext python')).toBe('extensions')
      expect(parseMode('theme')).toBe('themes')
      expect(parseMode('theme obsidian')).toBe('themes')
      expect(parseMode('?')).toBe('help')
      expect(parseMode('help')).toBe('help')
      expect(parseMode('App.tsx')).toBe('unified')
    })

    it('correctly extracts line and column from go-to-line queries', () => {
      const parseLineCol = (q: string) => {
        const match = q.trimStart().replace(/^:/, '').trim().match(/^(\d+)(?::(\d+))?$/)
        if (!match) return null
        return {
          line: parseInt(match[1], 10),
          col: match[2] ? parseInt(match[2], 10) : 1,
        }
      }

      expect(parseLineCol(':42')).toEqual({ line: 42, col: 1 })
      expect(parseLineCol(':105:14')).toEqual({ line: 105, col: 14 })
      expect(parseLineCol(':abc')).toBeNull()
      expect(parseLineCol(':')).toBeNull()
    })
  })
})

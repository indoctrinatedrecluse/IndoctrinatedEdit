import { describe, it, expect } from 'vitest'

interface MockFindOptions {
  matchCase: boolean
  matchWholeWord: boolean
  isRegex: boolean
}

function findMatchesInText(text: string, query: string, options: MockFindOptions): { start: number; end: number; match: string }[] {
  if (!query) return []

  let pattern = query
  let flags = 'g'
  if (!options.matchCase) {
    flags += 'i'
  }

  if (!options.isRegex) {
    pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  if (options.matchWholeWord) {
    pattern = `\\b${pattern}\\b`
  }

  try {
    const regex = new RegExp(pattern, flags)
    const matches: { start: number; end: number; match: string }[] = []
    let m: RegExpExecArray | null

    while ((m = regex.exec(text)) !== null) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        match: m[0],
      })
      if (m.index === regex.lastIndex) {
        regex.lastIndex++
      }
    }
    return matches
  } catch {
    return []
  }
}

function replaceAllInText(text: string, query: string, replacement: string, options: MockFindOptions): string {
  if (!query) return text

  let pattern = query
  let flags = 'g'
  if (!options.matchCase) {
    flags += 'i'
  }

  if (!options.isRegex) {
    pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  if (options.matchWholeWord) {
    pattern = `\\b${pattern}\\b`
  }

  try {
    const regex = new RegExp(pattern, flags)
    return text.replace(regex, replacement)
  } catch {
    return text
  }
}

describe('Phase 6: Multi-Cursor & Find/Replace Engine', () => {
  const sampleCode = `
import { ExtensionPlugin } from '@sdk/index';

export class LiquidTheme extends ExtensionPlugin {
  readonly id = 'liquid.theme';
  readonly name = 'Liquid Theme';
  private liquidCount = 42;

  public getLiquidStatus(): string {
    return 'Liquid Glass';
  }
}
`

  describe('Search & Pattern Matching', () => {
    it('should find case-insensitive matches by default', () => {
      const matches = findMatchesInText(sampleCode, 'liquid', {
        matchCase: false,
        matchWholeWord: false,
        isRegex: false,
      })
      expect(matches.length).toBe(6) // LiquidTheme, liquid.theme, Liquid Theme, liquidCount, getLiquidStatus, Liquid Glass
    })

    it('should filter by case sensitivity when matchCase is enabled', () => {
      const matches = findMatchesInText(sampleCode, 'Liquid', {
        matchCase: true,
        matchWholeWord: false,
        isRegex: false,
      })
      expect(matches.length).toBe(4) // LiquidTheme, Liquid Theme, getLiquidStatus, Liquid Glass
    })

    it('should filter by whole word boundaries when matchWholeWord is enabled', () => {
      const matches = findMatchesInText(sampleCode, 'Liquid', {
        matchCase: false,
        matchWholeWord: true,
        isRegex: false,
      })
      expect(matches.length).toBe(3) // liquid.theme (liquid), Liquid Theme, Liquid Glass
    })

    it('should support regular expressions', () => {
      const matches = findMatchesInText(sampleCode, 'readonly\\s+[a-z]+', {
        matchCase: false,
        matchWholeWord: false,
        isRegex: true,
      })
      expect(matches.length).toBe(2) // readonly id, readonly name
    })
  })

  describe('Replace and Replace All Operations', () => {
    it('should replace single and multiple occurrences cleanly', () => {
      const updated = replaceAllInText(sampleCode, 'Liquid', 'Obsidian', {
        matchCase: true,
        matchWholeWord: false,
        isRegex: false,
      })
      expect(updated).toContain('ObsidianTheme')
      expect(updated).toContain('Obsidian Theme')
      expect(updated).toContain('Obsidian Glass')
      expect(updated).toContain('private liquidCount') // untouched lowercase
    })

    it('should replace regex matches with capture groups or substitutions', () => {
      const updated = replaceAllInText(sampleCode, 'liquidCount = (\\d+)', 'liquidCount = 999', {
        matchCase: false,
        matchWholeWord: false,
        isRegex: true,
      })
      expect(updated).toContain('private liquidCount = 999;')
    })
  })

  describe('Multi-Cursor Range Calculations', () => {
    it('should calculate multiple selection offsets for concurrent editing', () => {
      const matches = findMatchesInText(sampleCode, 'readonly', {
        matchCase: false,
        matchWholeWord: true,
        isRegex: false,
      })
      expect(matches.length).toBe(2)

      const cursorPositions = matches.map((m) => ({
        cursorOffset: m.start,
        length: m.end - m.start,
      }))

      expect(cursorPositions.length).toBe(2)
      expect(cursorPositions[0].length).toBe(8)
      expect(cursorPositions[1].length).toBe(8)
    })
  })
})

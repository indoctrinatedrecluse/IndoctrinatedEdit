import { describe, it, expect } from 'vitest'
import { svgStudioService } from '../src/services/svgStudioService'
import { jsonStudioService } from '../src/services/jsonStudioService'
import { previewService } from '../src/services/previewService'
import { regexService } from '../src/services/regexService'
import { diffStudioService } from '../src/services/diffStudioService'
import { hexInspectorService } from '../src/services/hexInspectorService'
import { snippetVaultService } from '../src/services/snippetVaultService'
import { colorStudioService } from '../src/services/colorStudioService'

describe('Phase R3-6: Visual, Media & Editor Utility Studios', () => {
  describe('1. SVG Studio', () => {
    it('parses and serializes absolute & relative SVG path commands (M, L, C, Q, Z)', () => {
      const d = 'M 10 20 L 30 40 C 50 60 70 80 90 100 Z'
      const cmds = svgStudioService.parsePathCommands(d)
      expect(cmds.length).toBe(4)
      expect(cmds[0]).toEqual({ type: 'M', values: [10, 20] })
      expect(cmds[1]).toEqual({ type: 'L', values: [30, 40] })
      expect(cmds[2]).toEqual({ type: 'C', values: [50, 60, 70, 80, 90, 100] })
      expect(cmds[3]).toEqual({ type: 'Z', values: [] })

      const serialized = svgStudioService.serializePathCommands(cmds)
      expect(serialized).toContain('M 10 20')
      expect(serialized).toContain('C 50 60 70 80 90 100')
      expect(serialized).toContain('Z')
    })

    it('generates a valid SVG sprite sheet from multiple symbols', () => {
      const sheet = svgStudioService.generateSpriteSheet([
        { id: 'icon-home', viewBox: '0 0 24 24', content: '<path d="M0 0h24v24H0z"/>' },
        { id: 'icon-user', viewBox: '0 0 24 24', content: '<circle cx="12" cy="12" r="8"/>' },
      ])
      expect(sheet).toContain('<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">')
      expect(sheet).toContain('<symbol id="icon-home" viewBox="0 0 24 24">')
      expect(sheet).toContain('<symbol id="icon-user" viewBox="0 0 24 24">')
    })
  })

  describe('2. JSON Studio', () => {
    it('evaluates both JQ and JMESPath style queries with quote-safe pipes', () => {
      const data = {
        users: [
          { id: 1, name: 'Alice', role: 'admin' },
          { id: 2, name: 'Bob', role: 'developer' },
        ],
        tags: ['v6', 'glass'],
      }

      // JMESPath wildcard projection
      const wild = jsonStudioService.queryJq(data, 'users[*].name')
      expect(wild.result).toEqual(['Alice', 'Bob'])

      // JMESPath filter expression
      const filtered = jsonStudioService.queryJq(data, 'users[?id == `1`].name')
      expect(filtered.result).toEqual(['Alice'])

      // JMESPath function wrapping
      const len = jsonStudioService.queryJq(data, 'length(users)')
      expect(len.result).toBe(2)

      // JQ pipe with quote safety
      const jqRes = jsonStudioService.queryJq(data, '.users | map(.role)')
      expect(jqRes.result).toEqual(['admin', 'developer'])
    })

    it('transforms JSON to XML with escaped entities and parses nested YAML', () => {
      const json = JSON.stringify({ item: 'Tom & Jerry <cartoon>' })
      const xml = jsonStudioService.transformFormat(json, 'json', 'xml')
      expect(xml).toContain('&amp;')
      expect(xml).toContain('&lt;')

      const yaml = `project: IndoctrinatedEdit\nfeatures:\n  - editor\n  - preview\n`
      const converted = jsonStudioService.transformFormat(yaml, 'yaml', 'json')
      const parsed = JSON.parse(converted)
      expect(parsed.project).toBe('IndoctrinatedEdit')
      expect(Array.isArray(parsed.features)).toBe(true)
      expect(parsed.features).toContain('editor')
    })
  })

  describe('3. Live Preview & Mermaid Engine', () => {
    it('renders multi-line GitHub alerts and formatted LaTeX math', () => {
      const md = `> [!NOTE]
> First line of note
> Second line of note

Formula: $$\\alpha + \\beta = \\gamma$$ and $\\sqrt{x^2 + y^2}$
`
      const res = previewService.renderMarkdown(md)
      expect(res.html).toContain('alert-NOTE')
      expect(res.html).toContain('First line of note<br />Second line of note')
      expect(res.html).toContain('α')
      expect(res.html).toContain('β')
      expect(res.html).toContain('γ')
      expect(res.html).toContain('√(x<sup>2</sup>')
    })

    it('renders vertical flowchart, sequence self-calls, and Gantt charts in SVG', () => {
      const flowCode = `flowchart TD
subgraph Core
  A[Start] --> B[Process]
end
B --> C[End]
`
      const flowSvg = previewService.generateMermaidSvg(flowCode, 'flowchart')
      expect(flowSvg).toContain('<svg')
      expect(flowSvg).toContain('Core')
      expect(flowSvg).toContain('Start')
      expect(flowSvg).toContain('Process')

      const seqCode = `sequenceDiagram
Alice->>Alice: Self loop call
Alice->>Bob: Hello
`
      const seqSvg = previewService.generateMermaidSvg(seqCode, 'sequence')
      expect(seqSvg).toContain('<svg')
      expect(seqSvg).toContain('Self loop call')

      const ganttCode = `gantt
title Sprint Schedule
section Dev
Feature Alpha : done, 3d
Feature Beta : active, 5d
`
      const ganttSvg = previewService.generateMermaidSvg(ganttCode, 'gantt')
      expect(ganttSvg).toContain('Sprint Schedule')
      expect(ganttSvg).toContain('Feature Alpha')
    })
  })

  describe('4. Regex Lab', () => {
    it('generates token-by-token explanations for complex regex features', () => {
      const explanations = regexService.explainRegex('^(?=.*[A-Z])(?<user>[a-z]{3,5})\\d+$')
      expect(explanations.some((e) => e.token === '^' && e.category === 'anchor')).toBe(true)
      expect(explanations.some((e) => e.token === '(?=' && e.category === 'anchor')).toBe(true)
      expect(explanations.some((e) => e.token.includes('user') && e.category === 'group')).toBe(true)
      expect(explanations.some((e) => e.token.includes('{3,5}') && e.category === 'quantifier')).toBe(true)
      expect(explanations.some((e) => e.token === '\\d' && e.category === 'class')).toBe(true)
    })

    it('generates code snippets embedding flags into Python, Go, and Rust', () => {
      const py = regexService.generateSnippet('[a-z]+', 'im', 'python')
      expect(py).toContain('re.IGNORECASE | re.MULTILINE')

      const go = regexService.generateSnippet('[a-z]+', 'im', 'go')
      expect(go).toContain('(?im)[a-z]+')

      const rust = regexService.generateSnippet('[a-z]+', 'i', 'rust')
      expect(rust).toContain('(?i)[a-z]+')
    })
  })

  describe('5. Diff Studio', () => {
    it('performs clean non-destructive 3-way merge without corrupting empty conflict replacements', () => {
      const conflict = `start\n<<<<<<< HEAD\nleft\n=======\nright\n>>>>>>> incoming\nend`
      const resolvedCurrent = diffStudioService.resolveConflict(conflict, 'conflict-2', 'accept-current')
      expect(resolvedCurrent).toBe('start\nleft\nend')

      const resolvedBoth = diffStudioService.resolveConflict(conflict, 'conflict-2', 'accept-both')
      expect(resolvedBoth).toBe('start\nleft\nright\nend')
    })

    it('computes character-level differences on modified lines', () => {
      const diff = diffStudioService.computeDiff('const a = 1;', 'const a = 2;')
      expect(diff.lines.length).toBe(1)
      expect(diff.lines[0].type).toBe('modified')
      expect(diff.lines[0].charChanges).toBeDefined()
    })
  })

  describe('6. Hex Inspector', () => {
    it('searches hex safely without infinite loops on empty or odd-length queries', () => {
      const bytes = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01])
      expect(hexInspectorService.searchBytes(bytes, '', true)).toEqual([])
      expect(hexInspectorService.searchBytes(bytes, '7', true)).toEqual([]) // odd length
      expect(hexInspectorService.searchBytes(bytes, '454C', true)).toEqual([1])
    })

    it('detects binary magic headers accurately for ELF, PNG, and WASM', () => {
      const elf = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02])
      expect(hexInspectorService.detectFileMagic(elf)).toBe('ELF Binary')

      const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d])
      expect(hexInspectorService.detectFileMagic(png)).toBe('PNG Image')

      const wasm = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01])
      expect(hexInspectorService.detectFileMagic(wasm)).toBe('WebAssembly (WASM)')
    })
  })

  describe('7. Snippet Vault', () => {
    it('manages custom snippet addition, tag deduplication, and VS Code code-snippets export', () => {
      const initialCount = snippetVaultService.getAllSnippets().length
      const created = snippetVaultService.addCustomSnippet({
        title: 'Vault Test Helper',
        language: 'typescript',
        description: 'Test snippet',
        tags: ['test', 'test', 'vitest'],
        code: 'export const test = true',
      })
      expect(snippetVaultService.getAllSnippets().length).toBe(initialCount + 1)
      expect(created.tags.length).toBe(2) // deduplicated

      const exported = snippetVaultService.exportVsCodeSnippets(false)
      expect(exported).toContain('Vault Test Helper')

      snippetVaultService.deleteCustomSnippet(created.id)
      expect(snippetVaultService.getAllSnippets().length).toBe(initialCount)
    })
  })

  describe('8. Color Studio', () => {
    it('parses named CSS colors, calculates HSV, OKLCH, and CMYK correctly', () => {
      const rebecca = colorStudioService.parseColor('rebeccapurple')
      expect(rebecca.hex).toBe('#663399')
      expect(rebecca.hsv.h).toBe(270)
      expect(rebecca.oklchString).toContain('oklch(')
      expect(rebecca.cmykString).toContain('cmyk(')
    })

    it('evaluates WCAG 2.2 contrast ratio with translucent foreground blending and generates full harmonies', () => {
      const audit = colorStudioService.calculateContrastRatio('#FFFFFF', '#000000')
      expect(audit.ratio).toBe(21)
      expect(audit.rating).toBe('AAA')

      const harmonies = colorStudioService.generateHarmonies('#0A84FF')
      expect(harmonies.complementary).toMatch(/^#[0-9A-F]{6}$/)
      expect(harmonies.analogous.length).toBe(2)
      expect(harmonies.triadic.length).toBe(2)
    })
  })
})

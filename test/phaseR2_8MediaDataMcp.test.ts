import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { hexInspectorService } from '../src/services/hexInspectorService'
import { diffStudioService } from '../src/services/diffStudioService'
import { svgStudioService } from '../src/services/svgStudioService'
import { jsonStudioService } from '../src/services/jsonStudioService'
import { diagramStudioService } from '../src/services/diagramStudioService'
import { previewService } from '../src/services/previewService'
import { regexService } from '../src/services/regexService'
import { snippetVaultService } from '../src/services/snippetVaultService'
import { McpStdioSession } from '../electron/mcp-client-service'
import { McpService } from '../src/services/mcpService'

describe('Phase R2-8 — Hex, Diff, SVG, JSON, Diagram, Preview, Regex, Snippets & Live MCP', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    if (typeof window !== 'undefined') {
      delete (window as any).electronAPI
    }
  })

  it('HexInspector detects file magic headers and decodes 64-bit little-endian integers', () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])
    const elfBytes = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01])
    const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00])

    expect(hexInspectorService.detectFileMagic(pngBytes)).toContain('PNG')
    expect(hexInspectorService.detectFileMagic(pdfBytes)).toContain('PDF')
    expect(hexInspectorService.detectFileMagic(elfBytes)).toContain('ELF')
    expect(hexInspectorService.detectFileMagic(zipBytes)).toContain('ZIP')

    // 0x0000000100000005 = 4294967301n in LE
    const buf64 = new Uint8Array([0x05, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00])
    const decoded = hexInspectorService.inspectByteAtOffset(buf64, 0)
    expect(decoded.uint64LE).toBe('4294967301')
    expect(decoded.int64LE).toBe('4294967301')
  })

  it('DiffStudio uses LCS DP so inserting a line does not cascade false modifications and emits multi-hunk -U3 patches', () => {
    const original = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n')
    const modLines = original.split('\n')
    modLines.splice(1, 0, 'inserted near top')
    modLines[18] = 'modified near bottom'
    const modified = modLines.join('\n')

    const diff = diffStudioService.computeDiff(original, modified)
    expect(diff.summary.additions).toBe(1)
    expect(diff.summary.modifications).toBe(1)
    expect(diff.summary.deletions).toBe(0)
    expect(diff.summary.unchanged).toBe(19)

    const patch = diffStudioService.generateUnifiedPatch('sample.ts', original, modified)
    const hunkHeaders = patch.match(/^@@ -\d+,\d+ \+\d+,\d+ @@$/gm) || []
    expect(hunkHeaders.length).toBe(2)
    expect(patch).toContain('+inserted near top')
    expect(patch).toContain('+modified near bottom')
  })

  it('SvgStudio converts multi-hyphen attributes, inline CSS style strings, and deduplicates width/height in React TSX', () => {
    const rawSvg = `<svg width="24" height="24" viewBox="0 0 24 24" stroke-dasharray="4 2" fill-opacity="0.8"><path style="fill: #0A84FF; stroke-width: 2px;" stroke-linecap="round" d="M0 0h24v24H0z"/></svg>`
    const tsx = svgStudioService.generateReactComponent(rawSvg, 'SparkIcon')

    expect(tsx).toContain('export const SparkIcon')
    expect(tsx).toContain('strokeDasharray="4 2"')
    expect(tsx).toContain('fillOpacity="0.8"')
    expect(tsx).toContain('strokeLinecap="round"')
    expect(tsx).toContain("style={{ fill: '#0A84FF', strokeWidth: '2px' }}")
    // width and height should be deduplicated and not preserve raw width="24"
    expect(tsx).not.toContain('width="24"')
    expect(tsx).toContain('width={size ?? props.width}')
    expect(tsx).toContain('height={size ?? props.height}')
  })

  it('JsonStudio supports JQ map/select/sort_by/to_entries/values/flatten and extended JSON Schema validation', () => {
    const data = {
      users: [
        { id: 2, name: 'Bob', role: 'dev' },
        { id: 1, name: 'Alice', role: 'admin' },
      ],
      nested: [[1, 2], [3]],
    }

    expect(jsonStudioService.queryJq(data, '.users | map(.name)').result).toEqual(['Bob', 'Alice'])
    expect(jsonStudioService.queryJq(data, '.users | select(.role == "admin")').result).toEqual([
      { id: 1, name: 'Alice', role: 'admin' },
    ])
    expect(jsonStudioService.queryJq(data, '.users | sort_by(.id) | map(.name)').result).toEqual(['Alice', 'Bob'])
    expect(jsonStudioService.queryJq(data, '.nested | flatten').result).toEqual([1, 2, 3])
    expect(jsonStudioService.queryJq({ a: 10, b: 20 }, 'to_entries').result).toEqual([
      { key: 'a', value: 10 },
      { key: 'b', value: 20 },
    ])

    const schema = {
      type: 'object',
      additionalProperties: false,
      required: ['username', 'tags'],
      properties: {
        username: { type: 'string', minLength: 3, maxLength: 10, pattern: '^[a-z]+$' },
        tags: { type: 'array', minItems: 1, maxItems: 2, items: { type: 'string' } },
      },
    }

    const bad = jsonStudioService.validateJsonSchema(
      { username: 'A1', tags: ['ok', 42, 'extra'], unknownKey: true },
      schema
    )
    expect(bad.isValid).toBe(false)
    expect(bad.errors.some((e) => e.message.includes('minLength'))).toBe(true)
    expect(bad.errors.some((e) => e.message.includes('pattern'))).toBe(true)
    expect(bad.errors.some((e) => e.message.includes('maximum is 2'))).toBe(true)
    expect(bad.errors.some((e) => e.message.toLowerCase().includes('additional property'))).toBe(true)

    const good = jsonStudioService.validateJsonSchema({ username: 'alice', tags: ['core'] }, schema)
    expect(good.isValid).toBe(true)
  })

  it('DiagramStudio extracts real TypeScript classes, methods, inheritance, and Python classes instead of hardcoded stubs', () => {
    const tsSource = `
      export interface Serializable { serialize(): string }
      export class AuthController extends BaseController implements Serializable {
        public async login(user: string): Promise<void> {}
        private revokeToken(id: string): boolean { return true }
      }
    `
    const mermaid = diagramStudioService.generateDiagramFromCode('AuthController.ts', tsSource)
    expect(mermaid).toContain('class AuthController')
    expect(mermaid).toContain('BaseController <|-- AuthController')
    expect(mermaid).toContain('Serializable <|.. AuthController')
    expect(mermaid).toContain('login()')
    expect(mermaid).toContain('revokeToken()')
    expect(mermaid).not.toContain('+execute()')
  })

  it('PreviewService renders dynamic SVGs for classDiagram, erDiagram, stateDiagram-v2, and gitGraph', () => {
    const classSvg = previewService.generateMermaidSvg(
      `classDiagram\n  class Order {\n    +int id\n    +place()\n  }\n  Order --> Customer`,
      'class'
    )
    expect(classSvg).toContain('<svg')
    expect(classSvg).toContain('Order')
    expect(classSvg).toContain('place()')
    expect(classSvg).toContain('Customer')

    const erSvg = previewService.generateMermaidSvg(
      `erDiagram\n  USER ||--o{ ORDER : places\n  USER {\n    int id PK\n  }`,
      'er'
    )
    expect(erSvg).toContain('USER')
    expect(erSvg).toContain('ORDER')
    expect(erSvg).toContain('places')

    const stateSvg = previewService.generateMermaidSvg(
      `stateDiagram-v2\n  [*] --> Idle\n  Idle --> Running : start`,
      'state'
    )
    expect(stateSvg).toContain('Idle')
    expect(stateSvg).toContain('Running')

    const gitSvg = previewService.generateMermaidSvg(
      `gitGraph\n  commit id: "init"\n  branch feature\n  commit id: "feat-1"\n  merge feature`,
      'git'
    )
    expect(gitSvg).toContain('init')
    expect(gitSvg).toContain('feat-1')
  })

  it('RegexService respects absence of g flag (returns single match when g is omitted)', () => {
    const withG = regexService.testRegex('\\d+', 'g', '10 20 30')
    expect(withG.matchesCount).toBe(3)

    const withoutG = regexService.testRegex('\\d+', '', '10 20 30')
    expect(withoutG.matchesCount).toBe(1)
    expect(withoutG.matches[0].fullMatch).toBe('10')
  })

  it('SnippetVault supports updating custom snippets and VS Code .code-snippets import/export', () => {
    const created = snippetVaultService.addCustomSnippet({
      title: 'Test Snippet',
      language: 'typescript',
      description: 'Original desc',
      tags: ['test'],
      code: 'const x = 1;',
    })
    const updated = snippetVaultService.updateCustomSnippet(created.id, { description: 'Updated desc' })
    expect(updated?.description).toBe('Updated desc')

    const exported = snippetVaultService.exportVsCodeSnippets(true)
    expect(exported).toContain('"Test Snippet"')
    expect(exported).toContain('const x = 1;')

    const importRes = snippetVaultService.importVsCodeSnippets(
      JSON.stringify({
        'Imported Helper': {
          scope: 'python',
          prefix: 'imphelp',
          body: ['def hello():', '    return "hi"'],
          description: 'VS Code imported snippet',
        },
      })
    )
    expect(importRes.importedCount).toBe(1)
    expect(snippetVaultService.getAllSnippets().some((s) => s.title === 'Imported Helper')).toBe(true)

    snippetVaultService.deleteCustomSnippet(created.id)
  })

  it('McpStdioSession supports real resources/list, resources/read, prompts/list, and prompts/get over JSON-RPC 2.0', async () => {
    const inlineServer = `
      const rl = require('readline').createInterface({ input: process.stdin });
      rl.on('line', (line) => {
        if (!line.trim()) return;
        const req = JSON.parse(line);
        if (req.method === 'initialize') {
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { protocolVersion: '2024-11-05', capabilities: { resources: {}, prompts: {} } } }) + '\\n');
        } else if (req.method === 'resources/list') {
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { resources: [{ uri: 'memo://alpha', name: 'Alpha Memo', mimeType: 'text/plain' }] } }) + '\\n');
        } else if (req.method === 'resources/read') {
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { contents: [{ uri: req.params.uri, mimeType: 'text/plain', text: 'LIVE_RESOURCE_BODY' }] } }) + '\\n');
        } else if (req.method === 'prompts/list') {
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { prompts: [{ name: 'review_pr', description: 'Review PR', arguments: [{ name: 'diff', required: true }] }] } }) + '\\n');
        } else if (req.method === 'prompts/get') {
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { messages: [{ role: 'user', content: { type: 'text', text: 'PROMPT_OK:' + (req.params.arguments?.diff || '') } }] } }) + '\\n');
        }
      });
    `
    const session = new McpStdioSession({
      id: 'phase-r2-8-mcp',
      command: process.execPath,
      args: ['-e', inlineServer],
      timeoutMs: 8000,
    })
    try {
      const resources = await session.listResources()
      expect(resources).toHaveLength(1)
      expect(resources[0].uri).toBe('memo://alpha')

      const readRes = await session.readResource('memo://alpha')
      expect(readRes?.contents?.[0]?.text).toBe('LIVE_RESOURCE_BODY')

      const prompts = await session.listPrompts()
      expect(prompts).toHaveLength(1)
      expect(prompts[0].name).toBe('review_pr')

      const promptRes = await session.getPrompt('review_pr', { diff: '+1' })
      expect(promptRes?.messages?.[0]?.content?.text).toBe('PROMPT_OK:+1')
    } finally {
      session.dispose()
    }
  })

  it('McpService discovers live stdio capabilities and fails honestly on unconnected SQLite/unknown tools', async () => {
    McpService.resetToDefaults()

    // Register a custom stdio server and mock Electron MCP IPC for discovery
    McpService.saveServer({
      id: 'custom-live-stdio',
      name: 'Live Custom MCP',
      transport: 'stdio',
      command: 'node',
      args: ['server.js'],
      enabled: true,
    })

    ;(globalThis as any).window = (globalThis as any).window || {}
    ;(window as any).electronAPI = {
      mcp: {
        listTools: vi.fn().mockResolvedValue({
          success: true,
          tools: [{ name: 'run_audit', description: 'Runs security audit', inputSchema: { type: 'object', properties: {} } }],
        }),
        listResources: vi.fn().mockResolvedValue({
          success: true,
          resources: [{ uri: 'audit://latest', name: 'Latest Audit', mimeType: 'application/json' }],
        }),
        listPrompts: vi.fn().mockResolvedValue({
          success: true,
          prompts: [{ name: 'audit_summary', description: 'Summarize audit' }],
        }),
        disconnect: vi.fn().mockResolvedValue(true),
      },
    }

    const disc = await McpService.discoverServerCapabilitiesAsync('custom-live-stdio')
    expect(disc.success).toBe(true)
    expect(McpService.listTools('custom-live-stdio').map((t) => t.name)).toContain('run_audit')
    expect(McpService.listResources('custom-live-stdio').map((r) => r.uri)).toContain('audit://latest')
    expect(McpService.listPrompts('custom-live-stdio').map((p) => p.name)).toContain('audit_summary')

    // Enable SQLite preset without electron sqlite runtime or stdio callTool -> must fail honestly (no fake rows: 42)
    McpService.toggleServer('mcp-sqlite', true)
    delete (window as any).electronAPI
    const sqliteRes = await McpService.callTool('mcp-sqlite', 'sqlite_query', { query: 'SELECT 1' })
    expect(sqliteRes.success).toBe(false)
    expect(sqliteRes.output).not.toContain('projects')
    expect(sqliteRes.output).not.toContain('42')
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { extensionRegistry } from '../src/extensions/extensionRegistry'
import { AiService } from '../src/services/aiService'
import { McpService } from '../src/services/mcpService'

const ROOT = path.resolve(__dirname, '..')

describe('Phase R3-1 — Shell, Extension Registry, Shortcuts & Core/AI Wiring', () => {
  beforeEach(() => {
    McpService.resetToDefaults()
  })

  it('every TAB_EXTENSION_MAP entry in RightAuxiliaryPane resolves to a real registered extension ID', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/components/RightDock/RightAuxiliaryPane.tsx'), 'utf8')
    const mapBlockMatch = src.match(/const TAB_EXTENSION_MAP[\s\S]*?\{([\s\S]*?)\}/)
    expect(mapBlockMatch).toBeTruthy()
    const entries = Array.from(mapBlockMatch![1].matchAll(/(\w+):\s*'([^']+)'/g))
    expect(entries.length).toBeGreaterThanOrEqual(26)

    const missing: string[] = []
    for (const [, tab, extId] of entries) {
      if (!extensionRegistry.get(extId)) {
        missing.push(`${tab} -> ${extId}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('extensionRegistry tracks and disposes setLanguageConfiguration and setMonarchTokensProvider handles', () => {
    let configDisposed = false
    let monarchDisposed = false
    const fakeMonaco: any = {
      languages: {
        register: () => ({ dispose: () => {} }),
        setLanguageConfiguration: () => ({ dispose: () => { configDisposed = true } }),
        setMonarchTokensProvider: () => ({ dispose: () => { monarchDisposed = true } }),
        registerCompletionItemProvider: () => ({ dispose: () => {} }),
      },
    }

    const testId = 'indoctrinated.ext.r3-test-disposal'
    extensionRegistry.register({
      id: testId,
      name: 'R3 Test Disposal',
      version: '1.0.0',
      description: 'Test',
      author: 'test',
      category: 'Languages',
      iconName: 'Code2',
      status: 'Active',
      type: 'Built-in',
    })
    ;(extensionRegistry as any).invokeRegistrar(
      testId,
      'R3 Test Disposal',
      (m: any) => {
        m.languages.setLanguageConfiguration('testlang', {})
        m.languages.setMonarchTokensProvider('testlang', { tokenizer: { root: [] } })
      },
      fakeMonaco
    )

    extensionRegistry.disable(testId)
    expect(configDisposed).toBe(true)
    expect(monarchDisposed).toBe(true)
  })

  it('src/index.css wires data-glass-blur, data-specular-sheen, and data-liquid-glass-ext toggles to real CSS tokens', () => {
    const css = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf8')
    expect(css).toContain('html[data-glass-blur="off"]')
    expect(css).toContain('html[data-specular-sheen="off"]')
    expect(css).toContain('html[data-liquid-glass-ext="off"]')
    expect(css).toContain('--glass-blur: none;')
  })

  it('AiService chat history persistence handles non-Latin1 Unicode workspace paths without throwing', () => {
    const store = new Map<string, string>()
    const origLS = (globalThis as any).localStorage
    ;(globalThis as any).localStorage = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => { store.set(k, String(v)) },
      removeItem: (k: string) => { store.delete(k) },
    }
    try {
      const unicodePath = 'D:\\Projects\\日本語ワークスペース\\🚀app'
      const msgs = [{ id: 'm1', role: 'user' as const, content: 'Hello', timestamp: Date.now() }]
      AiService.saveChatHistory(unicodePath, 'gemini-2.5-flash', msgs)
      const loaded = AiService.getChatHistory(unicodePath, 'gemini-2.5-flash')
      expect(loaded).toBeTruthy()
      expect(loaded?.[0]?.content).toBe('Hello')
      AiService.clearChatHistory(unicodePath, 'gemini-2.5-flash')
      expect(AiService.getChatHistory(unicodePath, 'gemini-2.5-flash')).toBeNull()
    } finally {
      if (origLS === undefined) delete (globalThis as any).localStorage
      else (globalThis as any).localStorage = origLS
    }
  })

  it('McpService preserves builtin transport on export/import round-trip and marks new stdio servers disconnected by default', () => {
    const exported = McpService.exportConfigFile()
    const res = McpService.importConfigFile(exported)
    expect(res.importedCount).toBeGreaterThanOrEqual(5)
    expect(McpService.getServer('mcp-filesystem')?.transport).toBe('builtin')
    expect(McpService.getServer('mcp-git')?.transport).toBe('builtin')

    McpService.saveServer({
      id: 'new-unconnected-stdio',
      name: 'New Stdio',
      transport: 'stdio',
      command: 'node',
      args: ['index.js'],
      enabled: true,
    })
    expect(McpService.getServer('new-unconnected-stdio')?.status).toBe('disconnected')
  })

  it('EditorHost wires inline setModelMarkers, TypeScript JSX/decorator compiler options, and selectHighlights fallback', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/components/Editor/EditorHost.tsx'), 'utf8')
    expect(src).toContain('m.editor.setModelMarkers')
    expect(src).toContain('experimentalDecorators: true')
    expect(src).toContain('editor.action.selectHighlights')
    expect(src).toContain("extensionRegistry.isEnabled('indoctrinated.ext.aiassistant')")
  })

  it('useKeyboardShortcuts wires all missing studio, navigation, zoom, split, and conditional F11 bindings', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/hooks/useKeyboardShortcuts.ts'), 'utf8')
    expect(src).toContain('handlers.isDebuggingActive?.()')
    expect(src).toContain('handlers.onToggleAntigravity?.()')
    expect(src).toContain('handlers.onToggleDiff?.()')
    expect(src).toContain('handlers.onToggleHex?.()')
    expect(src).toContain('handlers.onToggleSnippets?.()')
    expect(src).toContain('handlers.onToggleColors?.()')
    expect(src).toContain('handlers.onToggleJson?.()')
    expect(src).toContain('handlers.onWorkspaceSymbols?.()')
    expect(src).toContain('handlers.onSplitVertical?.()')
    expect(src).toContain('handlers.onSplitHorizontal?.()')
    expect(src).toContain('handlers.onFocusPane?.(')
  })
})

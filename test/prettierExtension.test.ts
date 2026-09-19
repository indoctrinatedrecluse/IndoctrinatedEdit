import { describe, it, expect, vi } from 'vitest'
import {
  prettierExtensionManifest,
  registerPrettierExtension,
} from '../src/extensions/formatterSupport/prettierExtension'
import { extensionRegistry } from '../src/extensions/extensionRegistry'

describe('Prettier Extension & Monaco Provider Registration', () => {
  it('should have valid manifest metadata', () => {
    expect(prettierExtensionManifest.id).toBe('indoctrinated.ext.prettier-formatter')
    expect(prettierExtensionManifest.name).toContain('Prettier')
    expect(prettierExtensionManifest.languages?.length).toBeGreaterThan(5)
  })

  it('should register with Monaco instance without errors', () => {
    const mockMonaco: any = {
      languages: {
        registerDocumentFormattingEditProvider: vi.fn(),
        registerDocumentRangeFormattingEditProvider: vi.fn(),
        registerCompletionItemProvider: vi.fn(),
        CompletionItemKind: { Snippet: 15 },
        CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
      },
    }

    registerPrettierExtension(mockMonaco)

    expect(mockMonaco.languages.registerDocumentFormattingEditProvider).toHaveBeenCalled()
    expect(mockMonaco.languages.registerDocumentRangeFormattingEditProvider).toHaveBeenCalled()
  })

  it('should be discovered and indexed by extensionRegistry', () => {
    const ext = extensionRegistry.get('indoctrinated.ext.prettier-formatter')
    expect(ext).toBeDefined()
    expect(ext?.name).toContain('Prettier')
  })
})

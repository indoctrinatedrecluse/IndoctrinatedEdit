import { describe, it, expect } from 'vitest'
import { snippetVaultService } from '../src/services/snippetVaultService'

describe('snippetVaultService', () => {
  it('retrieves default production snippets', () => {
    const snippets = snippetVaultService.getAllSnippets()
    expect(snippets.length).toBeGreaterThan(3)
    expect(snippets.some((s) => s.language === 'typescript')).toBe(true)
  })

  it('filters snippets by language', () => {
    const tsSnippets = snippetVaultService.getSnippetsByLanguage('typescript')
    expect(tsSnippets.every((s) => s.language === 'typescript')).toBe(true)
  })

  it('adds and deletes custom snippets', () => {
    const custom = snippetVaultService.addCustomSnippet({
      title: 'Test Snippet',
      language: 'rust',
      description: 'A test rust snippet',
      tags: ['test', 'rust'],
      code: 'fn main() { println!("test"); }',
    })

    expect(custom.id).toBeDefined()
    expect(custom.isCustom).toBe(true)

    const all = snippetVaultService.getAllSnippets()
    expect(all.some((s) => s.id === custom.id)).toBe(true)

    const deleted = snippetVaultService.deleteCustomSnippet(custom.id)
    expect(deleted).toBe(true)
  })

  it('manages persistent scratchpad text', () => {
    snippetVaultService.saveScratchpad('Hello Scratchpad')
    expect(snippetVaultService.getScratchpad()).toBe('Hello Scratchpad')
  })
})

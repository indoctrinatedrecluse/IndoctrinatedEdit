import { describe, it, expect } from 'vitest'
import { extensionRegistry } from '../src/extensions/extensionRegistry'
import { textSupportManifest } from '../src/extensions/textSupport/textSupportExtension'
import { textileMonarchLanguage, textileLanguageConfiguration } from '../src/extensions/textSupport/textileGrammar'
import { rstMonarchLanguage, adocMonarchLanguage, logMonarchLanguage } from '../src/extensions/textSupport/rstAndAdocGrammar'
import { textileSnippets, markdownSnippets, plaintextSnippets } from '../src/extensions/textSupport/textSnippets'

describe('Universal Text & Prose Language Extension', () => {
  it('registers text support extension in extensionRegistry', () => {
    const ext = extensionRegistry.get('indoctrinated.ext.text-pack')
    expect(ext).toBeDefined()
    expect(ext?.name).toBe('Universal Text & Prose Language Pack')
    expect(ext?.category).toBe('Languages')
    expect(ext?.status).toBe('Active')
    expect(ext?.type).toBe('Built-in')
    expect(ext?.iconName).toBe('FileText')
  })

  it('includes language contributions for textile, markdown, plaintext, rst, adoc, and log', () => {
    const languageIds = textSupportManifest.languages?.map((l) => l.id)
    expect(languageIds).toContain('textile')
    expect(languageIds).toContain('markdown')
    expect(languageIds).toContain('plaintext')
    expect(languageIds).toContain('rst')
    expect(languageIds).toContain('adoc')
    expect(languageIds).toContain('log')
  })

  it('provides comprehensive Monarch rules and auto-closing configuration for Redmine Textile', () => {
    expect(textileMonarchLanguage.tokenizer).toBeDefined()
    expect(textileMonarchLanguage.tokenizer.root).toBeDefined()
    expect(textileMonarchLanguage.tokenizer.macro).toBeDefined()
    expect(textileMonarchLanguage.tokenizer.table).toBeDefined()

    expect(textileLanguageConfiguration.brackets).toBeDefined()
    expect(textileLanguageConfiguration.autoClosingPairs).toEqual(
      expect.arrayContaining([
        { open: '*', close: '*' },
        { open: '_', close: '_' },
        { open: '@', close: '@' },
      ])
    )
  })

  it('provides grammars for reStructuredText, AsciiDoc, and Logs', () => {
    expect(rstMonarchLanguage.tokenizer.root).toBeDefined()
    expect(adocMonarchLanguage.tokenizer.root).toBeDefined()
    expect(logMonarchLanguage.tokenizer.root).toBeDefined()
  })

  it('exports snippet suites with expected labels and snippet syntax', () => {
    const textileLabels = textileSnippets.map((s) => s.label)
    expect(textileLabels).toContain('h1')
    expect(textileLabels).toContain('table')
    expect(textileLabels).toContain('bc')
    expect(textileLabels).toContain('toc')
    expect(textileLabels).toContain('collapse')
    expect(textileLabels).toContain('issue')

    const mdLabels = markdownSnippets.map((s) => s.label)
    expect(mdLabels).toContain('table')
    expect(mdLabels).toContain('alert-note')
    expect(mdLabels).toContain('frontmatter')

    const plainLabels = plaintextSnippets.map((s) => s.label)
    expect(plainLabels).toContain('todo')
    expect(plainLabels).toContain('header')
  })
})

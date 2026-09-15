import { describe, it, expect } from 'vitest'
import { extensionRegistry } from '../src/extensions/extensionRegistry'
import { goExtensionManifest } from '../src/extensions/goSupport/goExtension'
import { rustExtensionManifest } from '../src/extensions/rustSupport/rustExtension'
import { goSnippets } from '../src/extensions/goSupport/goSnippets'
import { rustSnippets } from '../src/extensions/rustSupport/rustSnippets'

describe('Go and Rust Language & Ecosystem Extensions', () => {
  it('registers Go extension in extensionRegistry with correct metadata', () => {
    const goExt = extensionRegistry.get('indoctrinated.ext.go-pack')
    expect(goExt).toBeDefined()
    expect(goExt?.name).toBe('Go Universal Suite & Toolchain')
    expect(goExt?.iconName).toBe('Zap')
    expect(goExt?.category).toBe('Languages')
    expect(goExt?.status).toBe('Active')
  })

  it('registers Rust extension in extensionRegistry with correct metadata', () => {
    const rustExt = extensionRegistry.get('indoctrinated.ext.rust-pack')
    expect(rustExt).toBeDefined()
    expect(rustExt?.name).toBe('Rust & Cargo Ecosystem Extension')
    expect(rustExt?.iconName).toBe('Cpu')
    expect(rustExt?.category).toBe('Languages')
    expect(rustExt?.status).toBe('Active')
  })

  it('provides Go snippets for standard library, Gin, Fiber, GORM, and Cobra', () => {
    const labels = goSnippets.map((s) => s.label)
    expect(labels).toContain('main')
    expect(labels).toContain('fn')
    expect(labels).toContain('errcheck')
    expect(labels).toContain('goroutine')
    expect(labels).toContain('channel')
    expect(labels).toContain('table-test')
    expect(labels).toContain('gin-server')
    expect(labels).toContain('fiber-app')
    expect(labels).toContain('gorm-model')
    expect(labels).toContain('cobra-cmd')
  })

  it('provides Rust snippets for core language, Tokio, Axum, Actix-Web, and Clap', () => {
    const labels = rustSnippets.map((s) => s.label)
    expect(labels).toContain('fn')
    expect(labels).toContain('afn')
    expect(labels).toContain('struct')
    expect(labels).toContain('enum')
    expect(labels).toContain('impl')
    expect(labels).toContain('trait')
    expect(labels).toContain('tokio-main')
    expect(labels).toContain('axum-server')
    expect(labels).toContain('actix-main')
    expect(labels).toContain('clap-cli')
  })

  it('contains language definitions with expected file extensions', () => {
    expect(goExtensionManifest.languages?.[0].extensions).toContain('.go')
    expect(rustExtensionManifest.languages?.[0].extensions).toContain('.rs')
  })
})

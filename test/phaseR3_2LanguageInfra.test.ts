import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  ensureCustomLanguagesRegistered,
  registerHoverDocsProvider,
  CUSTOM_MONACO_LANGUAGES,
} from '../src/extensions/extensionHelpers'
import { textSupportManifest, registerTextSupportExtension } from '../src/extensions/textSupport/textSupportExtension'
import { conflictResolutionService } from '../src/services/conflictResolutionService'
import { formatterService } from '../src/services/formatterService'
import { diagnosticsService } from '../src/services/diagnosticsService'
import { runService } from '../src/services/runService'
import { DEFAULT_TOOLCHAINS } from '../packages/sdk/toolchains'

describe('Phase R3-2 — Language Infrastructure (Helpers, CSV, Formatter, Diagnostics, Run, Toolchains)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    if (typeof window !== 'undefined') {
      delete (window as any).electronAPI
    }
  })

  it('ensureCustomLanguagesRegistered sets LanguageConfiguration for all custom languages and orders block comments before line comments', () => {
    const configs = new Map<string, any>()
    const tokenizers = new Map<string, any>()
    const fakeMonaco: any = {
      languages: {
        getLanguages: () => [],
        register: () => {},
        setLanguageConfiguration: (id: string, cfg: any) => configs.set(id, cfg),
        setMonarchTokensProvider: (id: string, tok: any) => tokenizers.set(id, tok),
      },
    }

    ensureCustomLanguagesRegistered(fakeMonaco)
    expect(configs.size).toBe(CUSTOM_MONACO_LANGUAGES.length)
    expect(configs.get('zig')?.comments?.lineComment).toBe('//')
    expect(configs.get('gdscript')?.comments?.lineComment).toBe('#')
    expect(configs.get('gradle-kotlin')?.comments?.blockComment).toEqual(['/*', '*/'])

    // Block comment rule MUST come before line comment rule in matlab and nim
    const matlabRoot = tokenizers.get('matlab')?.tokenizer?.root || []
    expect(matlabRoot[0][2]).toBe('@blockComment')
    const nimRoot = tokenizers.get('nim')?.tokenizer?.root || []
    expect(nimRoot[0][2]).toBe('@blockComment')
  })

  it('registerHoverDocsProvider returns markdown hover content for documented keywords', () => {
    let registeredProvider: any = null
    const fakeMonaco: any = {
      languages: {
        registerHoverProvider: (_lang: string, provider: any) => {
          registeredProvider = provider
          return { dispose: () => {} }
        },
      },
    }
    const d = registerHoverDocsProvider(fakeMonaco, 'zig', { comptime: 'Compile-time evaluation keyword in Zig.' })
    expect(d).toBeTruthy()
    const hover = registeredProvider.provideHover(
      { getWordAtPosition: () => ({ word: 'comptime', startColumn: 1, endColumn: 9 }) },
      { lineNumber: 1, column: 3 }
    )
    expect(hover?.contents?.[1]?.value).toContain('Compile-time evaluation')
  })

  it('textSupportExtension registers CSV language and returns IDisposable[]', () => {
    expect(textSupportManifest.languages?.some((l) => l.id === 'csv')).toBe(true)
    const fakeMonaco: any = {
      languages: {
        getLanguages: () => [],
        register: () => {},
        setLanguageConfiguration: () => ({ dispose: () => {} }),
        setMonarchTokensProvider: () => ({ dispose: () => {} }),
        registerCompletionItemProvider: () => ({ dispose: () => {} }),
        CompletionItemKind: { Snippet: 1 },
        CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
      },
    }
    const disposables = registerTextSupportExtension(fakeMonaco)
    expect(disposables.length).toBeGreaterThan(5)
  })

  it('conflictResolutionService resolves Dockerfile.*, CMakeLists.txt, and .csv accurately', () => {
    expect(conflictResolutionService.resolveLanguageForFilename('Dockerfile.prod').languageId).toBe('dockerfile')
    expect(conflictResolutionService.resolveLanguageForFilename('app.dockerfile').languageId).toBe('dockerfile')
    expect(conflictResolutionService.resolveLanguageForFilename('CMakeLists.txt').languageId).toBe('cmake')
    expect(conflictResolutionService.resolveLanguageForFilename('metrics.csv').languageId).toBe('csv')
  })

  it('formatterService preserves YAML ports/URLs, preserves SQL string literals, and executes CLI formatter when available', async () => {
    const yamlIn = `services:\n  api:\n    ports:\n      - "3000:3000"\n    url: postgres://user:pass@localhost:5432/db\n    name:demo`
    const yamlOut = (await formatterService.formatDocument(yamlIn, 'yaml')).formatted
    expect(yamlOut).toContain('"3000:3000"')
    expect(yamlOut).toContain('postgres://user:pass@localhost:5432/db')
    expect(yamlOut).toContain('name: demo')

    const sqlIn = `select 'select from where' as msg -- from comment\nfrom users`
    const sqlOut = (await formatterService.formatDocument(sqlIn, 'sql')).formatted
    expect(sqlOut).toContain("'select from where'")
    expect(sqlOut).toContain('-- from comment')
    expect(sqlOut).toContain('SELECT ')
    expect(sqlOut).toContain('FROM users')

    ;(globalThis as any).window = (globalThis as any).window || {}
    ;(window as any).electronAPI = {
      workspace: {
        execCommand: vi.fn().mockResolvedValue({ exitCode: 0, stdout: 'package main\n', stderr: '' }),
      },
    }
    const cliRes = await formatterService.formatDocumentWithCli('package   main', 'go', '/repo/main.go', '/repo')
    expect(cliRes.formatted).toBe('package main\n')
    expect(cliRes.hasChanges).toBe(true)
  })

  it('diagnosticsService parses go vet output and ignores console.log/var/== inside strings and block comments', async () => {
    const cleanJs = `/*\nconsole.log('ignored')\nvar x = 1\nif (a == b) {}\n*/\nconst msg = "console.log(1) var y == z";\n`
    const items = diagnosticsService.analyzeCode('/repo/clean.ts', 'clean.ts', cleanJs, 'typescript')
    expect(items.filter((i) => ['no-console', 'no-var', 'eqeqeq'].includes(String(i.code)))).toHaveLength(0)

    ;(globalThis as any).window = (globalThis as any).window || {}
    ;(window as any).electronAPI = {
      workspace: {
        execCommand: vi.fn().mockResolvedValue({
          exitCode: 2,
          stdout: '',
          stderr: './main.go:14:2: fmt.Printf format %d has arg s of wrong type string\n',
        }),
      },
    }
    const count = await diagnosticsService.runWorkspaceDiagnostics('/repo', 'govet')
    expect(count).toBe(1)
  })

  it('runService provides profiles for Swift/Kotlin/GDScript/Bat/Haskell/Odin/Nim/Lean and overrides multi-word interpreters cleanly', () => {
    for (const lang of ['swift', 'kotlin', 'gdscript', 'bat', 'scala', 'haskell', 'odin', 'nim', 'wat', 'prolog', 'lisp', 'lean']) {
      const profile = runService.getProfileForLanguage(lang)
      expect(profile?.language).toBe(lang)
    }

    const tsProfile = runService.getProfileForLanguage('typescript')!
    const resolved = runService.resolveRunCommand(
      { ...tsProfile, interpreterPath: 'ts-node' },
      { filePath: '/repo/index.ts', workspaceFolder: '/repo' }
    )
    expect(resolved.command).toContain('ts-node')
    expect(resolved.command).not.toContain('tsx')
  })

  it('DEFAULT_TOOLCHAINS shell versionPattern parses both GNU bash and zsh outputs cleanly', () => {
    const sh = DEFAULT_TOOLCHAINS.find((t) => t.id === 'toolchain.shell')!
    const re = new RegExp(sh.versionPattern!, 'i')
    expect('GNU bash, version 5.2.21(1)-release'.match(re)?.[1]).toBe('5.2.21')
    expect('zsh 5.9 (darwin23.0)'.match(re)?.[1]).toBe('5.9')
  })
})

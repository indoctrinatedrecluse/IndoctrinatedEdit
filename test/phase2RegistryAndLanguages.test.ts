import { describe, it, expect, afterEach } from 'vitest'
import { CUSTOM_MONACO_LANGUAGES, ensureCustomLanguagesRegistered } from '../src/extensions/extensionHelpers'
import { extensionRegistry } from '../src/extensions/extensionRegistry'
import { conflictResolutionService } from '../src/services/conflictResolutionService'

describe('Phase 2 — Extension Registry, Language Packs & Conflict Resolution', () => {
  afterEach(() => {
    // Re-enable any extensions disabled during tests
    for (const ext of extensionRegistry.getAll()) {
      if (ext.status === 'Disabled') {
        extensionRegistry.enable(ext.id)
      }
    }
    conflictResolutionService.setWorkspaceContext({})
  })

  it('registers all 28 custom non-builtin Monaco languages with Monarch tokenizers', () => {
    const registeredIds: string[] = []
    const tokenizedIds: string[] = []

    const mockMonaco: any = {
      languages: {
        getLanguages: () => [{ id: 'typescript' }, { id: 'javascript' }],
        register: (lang: { id: string }) => registeredIds.push(lang.id),
        setMonarchTokensProvider: (id: string) => tokenizedIds.push(id),
      },
    }

    ensureCustomLanguagesRegistered(mockMonaco)
    expect(registeredIds.length).toBe(CUSTOM_MONACO_LANGUAGES.length)
    expect(tokenizedIds.length).toBe(CUSTOM_MONACO_LANGUAGES.length)
    expect(registeredIds).toContain('zig')
    expect(registeredIds).toContain('solidity')
    expect(registeredIds).toContain('prisma')
    expect(registeredIds).toContain('http')
    expect(registeredIds).toContain('sshconfig')
    expect(registeredIds).toContain('vue')
    expect(registeredIds).toContain('svelte')
  })

  it('fixes hijacked file-extension mappings (.xml, .svg, .scss, .less, .js, .jsx, .vb, .csproj, .kt)', () => {
    expect(conflictResolutionService.resolveLanguageForFilename('layout.xml').languageId).toBe('xml')
    expect(conflictResolutionService.resolveLanguageForFilename('icon.svg').languageId).toBe('xml')
    expect(conflictResolutionService.resolveLanguageForFilename('theme.scss').languageId).toBe('scss')
    expect(conflictResolutionService.resolveLanguageForFilename('vars.less').languageId).toBe('less')
    expect(conflictResolutionService.resolveLanguageForFilename('app.js').languageId).toBe('javascript')
    expect(conflictResolutionService.resolveLanguageForFilename('Button.jsx').languageId).toBe('javascript')
    expect(conflictResolutionService.resolveLanguageForFilename('App.csproj').languageId).toBe('xml')
    expect(conflictResolutionService.resolveLanguageForFilename('Module.vb').languageId).toBe('vb')
    expect(conflictResolutionService.resolveLanguageForFilename('Main.kt').languageId).toBe('kotlin')
  })

  it('resolves multi-dot extensions cleanly (.gradle.kts, .mcp.json)', () => {
    expect(conflictResolutionService.resolveLanguageForFilename('build.gradle.kts').languageId).toBe('gradle-kotlin')
    expect(conflictResolutionService.resolveLanguageForFilename('server.mcp.json').languageId).toBe('json')
  })

  it('resolves .tsx to valid Monaco languageId "typescript" (not unregistered "typescriptreact")', () => {
    const reactCode = `import React from 'react'\nexport const App = () => <div className="x">Hi</div>`
    const res = conflictResolutionService.resolveLanguageForFilename('App.tsx', reactCode)
    expect(res.languageId).toBe('typescript')
    expect(res.extensionId).toBe('indoctrinated.ext.react-pack')
  })

  it('does not misclassify Objective-C NSLog format strings (%@) as MATLAB', () => {
    const objc = `@implementation Foo\n- (void)log { NSLog(@"Value: %@ %d", name, count); }\n@end`
    const res = conflictResolutionService.resolveLanguageForFilename('Foo.m', objc)
    expect(res.languageId).toBe('objective-c')
  })

  it('registers all 9 previously unlisted Free RightDock studios in extensionRegistry', () => {
    const expectedIds = [
      'indoctrinated.ext.portsentinel',
      'indoctrinated.ext.redisstudio',
      'indoctrinated.ext.envvault',
      'indoctrinated.ext.diagramstudio',
      'indoctrinated.ext.bundleanalyzer',
      'indoctrinated.ext.diffstudio',
      'indoctrinated.ext.hexinspector',
      'indoctrinated.ext.snippetvault',
      'indoctrinated.ext.colorstudio',
    ]
    for (const id of expectedIds) {
      const ext = extensionRegistry.get(id)
      expect(ext, `Missing extension ${id}`).toBeDefined()
      expect(ext?.isPro).toBeFalsy()
    }
  })

  it('supports runtime enable/disable toggling and excludes disabled extensions from resolution', () => {
    let notified = 0
    const unsub = extensionRegistry.subscribe(() => {
      notified++
    })

    expect(extensionRegistry.isEnabled('indoctrinated.ext.zig')).toBe(true)
    extensionRegistry.disable('indoctrinated.ext.zig')
    expect(extensionRegistry.isEnabled('indoctrinated.ext.zig')).toBe(false)
    expect(extensionRegistry.get('indoctrinated.ext.zig')?.status).toBe('Disabled')

    const disabledRes = conflictResolutionService.resolveLanguageForFilename('main.zig')
    expect(disabledRes.extensionId).not.toBe('indoctrinated.ext.zig')

    extensionRegistry.enable('indoctrinated.ext.zig')
    expect(extensionRegistry.isEnabled('indoctrinated.ext.zig')).toBe(true)
    const enabledRes = conflictResolutionService.resolveLanguageForFilename('main.zig')
    expect(enabledRes.extensionId).toBe('indoctrinated.ext.zig')
    expect(notified).toBeGreaterThanOrEqual(2)
    unsub()
  })
})

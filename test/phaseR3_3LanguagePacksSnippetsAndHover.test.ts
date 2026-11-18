import { describe, it, expect, vi } from 'vitest'
import { phpSnippets } from '../src/extensions/phpSupport/phpSnippets'
import { shellScriptSnippets } from '../src/extensions/shellScriptSupport/shellScriptSnippets'
import { nodeSnippets } from '../src/extensions/nodeSupport/nodeSnippets'
import { flutterSnippets } from '../src/extensions/flutterSupport/flutterSnippets'
import { angularSnippets } from '../src/extensions/angularSupport/angularSnippets'
import { reactSnippets } from '../src/extensions/reactSupport/reactSnippets'
import { frontendSnippets } from '../src/extensions/frontendMegaPack/frontendSnippets'
import { frontendExtensionManifest } from '../src/extensions/frontendMegaPack/frontendExtension'
import { backendSnippets } from '../src/extensions/backendMegaPack/backendSnippets'
import { dataScienceSnippets } from '../src/extensions/dataScienceSupport/dataScienceSnippets'
import { systemsGamingSnippets, ASSEMBLY_SNIPPETS, WAT_SNIPPETS } from '../src/extensions/systemsGamingSupport/systemsGamingSnippets'
import { goSnippets } from '../src/extensions/goSupport/goSnippets'
import { rustSnippets } from '../src/extensions/rustSupport/rustSnippets'
import { cppSnippets } from '../src/extensions/cppSupport/cppSnippets'
import { javaSnippets } from '../src/extensions/javaSupport/javaSnippets'
import { dotnetSnippets } from '../src/extensions/dotnetSupport/dotnetSnippets'
import { rubySnippets } from '../src/extensions/rubySupport/rubySnippets'
import { kotlinSnippets } from '../src/extensions/kotlinSupport/kotlinSnippets'
import { luaSnippets } from '../src/extensions/luaSupport/luaSnippets'
import { gdscriptSnippets } from '../src/extensions/gdscriptSupport/gdscriptSnippets'
import { juliaSnippets } from '../src/extensions/juliaSupport/juliaSnippets'
import { devopsSnippets } from '../src/extensions/devopsSupport/devopsSnippets'
import { beamFunctionalSnippets } from '../src/extensions/beamFunctionalSupport/beamFunctionalSnippets'
import { databaseSchemaSnippets } from '../src/extensions/databaseSchemaSupport/databaseSchemaSnippets'
import { web3Snippets } from '../src/extensions/web3Support/web3Snippets'
import { logicFormalSnippets, LEAN_SNIPPETS, COQ_SNIPPETS, TLA_ALLOY_SNIPPETS } from '../src/extensions/logicFormalSupport/logicFormalSnippets'
import { pythonSnippets } from '../src/extensions/pythonSupport/pythonSnippets'
import { swiftSnippets } from '../src/extensions/swiftSupport/swiftSnippets'
import { zigSnippets } from '../src/extensions/zigSupport/zigSnippets'
import { nodeExtensionManifest } from '../src/extensions/nodeSupport/nodeExtension'
import { gdscriptExtensionManifest } from '../src/extensions/gdscriptSupport/gdscriptExtension'
import { databaseSchemaExtensionManifest } from '../src/extensions/databaseSchemaSupport/databaseSchemaExtension'
import { ensureCustomLanguagesRegistered, CUSTOM_MONACO_LANGUAGES } from '../src/extensions/extensionHelpers'
import type { SnippetDefinition } from '../src/extensions/extensionTypes'

/**
 * Finds any unescaped `$ident` or `${ident...}` in a Monaco snippet string
 * that is NOT a valid tabstop (`$0`, `$1`, `${1:...}`) and NOT a standard Monaco
 * snippet variable (TM_*, CURRENT_*, CLIPBOARD, BLOCK_COMMENT_*, LINE_COMMENT).
 */
function findUnescapedSnippetVariables(insertText: string): string[] {
  const allowedMonacoVars = new Set([
    'TM_SELECTED_TEXT', 'TM_CURRENT_LINE', 'TM_CURRENT_WORD', 'TM_LINE_INDEX', 'TM_LINE_NUMBER',
    'TM_FILENAME', 'TM_FILENAME_BASE', 'TM_DIRECTORY', 'TM_FILEPATH', 'CLIPBOARD',
    'CURRENT_YEAR', 'CURRENT_YEAR_SHORT', 'CURRENT_MONTH', 'CURRENT_MONTH_NAME',
    'CURRENT_MONTH_NAME_SHORT', 'CURRENT_DATE', 'CURRENT_DAY_NAME', 'CURRENT_DAY_NAME_SHORT',
    'CURRENT_HOUR', 'CURRENT_MINUTE', 'CURRENT_SECOND', 'CURRENT_SECONDS_UNIX',
    'BLOCK_COMMENT_START', 'BLOCK_COMMENT_END', 'LINE_COMMENT', 'RANDOM', 'RANDOM_HEX', 'UUID',
  ])

  const violations: string[] = []
  let i = 0
  while (i < insertText.length) {
    const ch = insertText[i]
    if (ch === '\\') {
      // Escaped next character (e.g. \$ or \\)
      i += 2
      continue
    }
    if (ch === '$') {
      const rest = insertText.slice(i + 1)
      // ${...}
      if (rest.startsWith('{')) {
        const numMatch = /^\{\d+(?::[^}]*|\|[^}]*\|)?\}/.exec(rest)
        if (numMatch) {
          i += 1 + numMatch[0].length
          continue
        }
        const varMatch = /^\{([A-Za-z_][A-Za-z0-9_.\-()[\]'" ]*)\}/.exec(rest)
        if (varMatch) {
          if (!allowedMonacoVars.has(varMatch[1])) {
            violations.push('$' + varMatch[0])
          }
          i += 1 + varMatch[0].length
          continue
        }
      } else {
        // $123 is a tabstop; $ident is a variable
        const identMatch = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(rest)
        if (identMatch) {
          if (!allowedMonacoVars.has(identMatch[1])) {
            violations.push('$' + identMatch[1])
          }
          i += 1 + identMatch[0].length
          continue
        }
      }
    }
    i++
  }
  return violations
}

const ALL_SNIPPET_PACKS: Array<{ pack: string; snippets: SnippetDefinition[] }> = [
  { pack: 'php', snippets: phpSnippets },
  { pack: 'shell', snippets: shellScriptSnippets },
  { pack: 'node', snippets: nodeSnippets },
  { pack: 'flutter', snippets: flutterSnippets },
  { pack: 'angular', snippets: angularSnippets },
  { pack: 'react', snippets: reactSnippets },
  { pack: 'frontend', snippets: frontendSnippets },
  { pack: 'backend', snippets: backendSnippets },
  { pack: 'dataScience', snippets: dataScienceSnippets },
  { pack: 'systemsGaming', snippets: systemsGamingSnippets },
  { pack: 'go', snippets: goSnippets },
  { pack: 'rust', snippets: rustSnippets },
  { pack: 'cpp', snippets: cppSnippets },
  { pack: 'java', snippets: javaSnippets },
  { pack: 'dotnet', snippets: dotnetSnippets },
  { pack: 'ruby', snippets: rubySnippets },
  { pack: 'kotlin', snippets: kotlinSnippets },
  { pack: 'lua', snippets: luaSnippets },
  { pack: 'gdscript', snippets: gdscriptSnippets },
  { pack: 'julia', snippets: juliaSnippets },
  { pack: 'devops', snippets: devopsSnippets },
  { pack: 'beamFunctional', snippets: beamFunctionalSnippets },
  { pack: 'databaseSchema', snippets: databaseSchemaSnippets },
  { pack: 'web3', snippets: web3Snippets },
  { pack: 'logicFormal', snippets: logicFormalSnippets },
  { pack: 'python', snippets: pythonSnippets },
  { pack: 'swift', snippets: swiftSnippets },
  { pack: 'zig', snippets: zigSnippets },
]

describe('Phase R3-3: Language Packs Snippets, Routing & Hover Docs', () => {
  it('has zero unescaped $ident / ${ident} snippet variables across all 28 language packs', () => {
    const failures: string[] = []
    for (const { pack, snippets } of ALL_SNIPPET_PACKS) {
      for (const snip of snippets) {
        const bad = findUnescapedSnippetVariables(snip.insertText)
        if (bad.length > 0) {
          failures.push(`${pack}/${snip.label}: ${bad.join(', ')}`)
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('includes every claimed snippet added in Phase R3-3', () => {
    const hasLabel = (list: SnippetDefinition[], label: string) => list.some((s) => s.label === label)
    expect(hasLabel(phpSnippets, 'phpunit-test')).toBe(true)
    expect(hasLabel(goSnippets, 'go-echo-server')).toBe(true)
    expect(hasLabel(rustSnippets, 'rust-serde-json')).toBe(true)
    expect(hasLabel(gdscriptSnippets, 'gd-character-body-3d')).toBe(true)
    expect(hasLabel(juliaSnippets, 'julia-makie-plot')).toBe(true)
    expect(hasLabel(backendSnippets, 'dotnet-minimal-api')).toBe(true)
    expect(hasLabel(devopsSnippets, 'helm-deployment-tpl')).toBe(true)
    expect(hasLabel(beamFunctionalSnippets, 'reasonml-component')).toBe(true)
    expect(hasLabel(ASSEMBLY_SNIPPETS, 'asm-arm64-entry')).toBe(true)
    expect(hasLabel(WAT_SNIPPETS, 'wat-module-export')).toBe(true)
    expect(hasLabel(databaseSchemaSnippets, 'sql-mysql-upsert')).toBe(true)
    expect(hasLabel(databaseSchemaSnippets, 'sql-sqlite-fts5')).toBe(true)
    expect(hasLabel(databaseSchemaSnippets, 'sql-tsql-merge')).toBe(true)
    expect(hasLabel(web3Snippets, 'hardhat-test')).toBe(true)
    expect(hasLabel(web3Snippets, 'aptos-move-coin')).toBe(true)
    expect(hasLabel(logicFormalSnippets, 'elisp-interactive-command')).toBe(true)
    expect(hasLabel(TLA_ALLOY_SNIPPETS, 'alloy-model-spec')).toBe(true)
    expect(LEAN_SNIPPETS.every((s) => s.label.startsWith('lean'))).toBe(true)
    expect(COQ_SNIPPETS.every((s) => s.label.startsWith('coq'))).toBe(true)
  })

  it('routes Vue, Svelte, Razor, .npmrc, Godot scenes, and MySQL without alias hijacking', () => {
    const htmlEntry = frontendExtensionManifest.languages?.find((l) => l.id === 'html')
    expect(htmlEntry?.aliases).not.toContain('Vue')
    expect(htmlEntry?.aliases).not.toContain('Svelte')
    expect(htmlEntry?.aliases).not.toContain('Razor')
    expect(frontendExtensionManifest.languages?.some((l) => l.id === 'vue' && l.extensions.includes('.vue'))).toBe(true)
    expect(frontendExtensionManifest.languages?.some((l) => l.id === 'svelte' && l.extensions.includes('.svelte'))).toBe(true)
    expect(frontendExtensionManifest.languages?.some((l) => l.id === 'razor' && l.extensions.includes('.razor'))).toBe(true)

    const nodeJson = nodeExtensionManifest.languages?.find((l) => l.id === 'json')
    const nodeIni = nodeExtensionManifest.languages?.find((l) => l.id === 'ini')
    expect(nodeJson?.extensions).not.toContain('.npmrc')
    expect(nodeIni?.extensions).toContain('.npmrc')

    const gdLang = gdscriptExtensionManifest.languages?.find((l) => l.id === 'gdscript')
    const gdIni = gdscriptExtensionManifest.languages?.find((l) => l.id === 'ini')
    expect(gdLang?.extensions).toEqual(['.gd'])
    expect(gdIni?.extensions).toEqual(expect.arrayContaining(['.tscn', '.tres', '.godot']))

    const sqlLang = databaseSchemaExtensionManifest.languages?.find((l) => l.id === 'sql')
    expect(sqlLang?.aliases).not.toContain('MySQL')
  })

  it('fixes Kotlin compose-screen lambda syntax and Cairo 2.8 Map storage', () => {
    const composeScreen = kotlinSnippets.find((s) => s.label === 'compose-screen')
    expect(composeScreen?.insertText).toContain('() -> Unit')
    expect(composeScreen?.insertText).not.toContain('() => Unit')

    const cairo = web3Snippets.find((s) => s.label === 'cairo-starknet-contract')
    expect(cairo?.insertText).toContain('Map<ContractAddress, u256>')
    expect(cairo?.insertText).not.toContain('LegacyMap')
  })

  it('registers hover documentation providers for all custom Monaco languages', () => {
    const hoverProviders = new Map<string, any>()
    const mockMonaco: any = {
      languages: {
        getLanguages: () => [],
        register: vi.fn(),
        setLanguageConfiguration: vi.fn(),
        setMonarchTokensProvider: vi.fn(),
        registerHoverProvider: vi.fn((langId: string, provider: any) => {
          hoverProviders.set(langId, provider)
          return { dispose: vi.fn() }
        }),
      },
    }

    ensureCustomLanguagesRegistered(mockMonaco)
    expect(hoverProviders.size).toBe(CUSTOM_MONACO_LANGUAGES.length)

    // Verify hover works for zig keyword 'comptime'
    const zigHover = hoverProviders.get('zig')
    const res = zigHover.provideHover(
      { getWordAtPosition: () => ({ word: 'comptime', startColumn: 1, endColumn: 9 }) },
      { lineNumber: 1, column: 3 }
    )
    expect(res).toBeTruthy()
    expect(res.contents[1].value).toContain('Zig')
  })
})

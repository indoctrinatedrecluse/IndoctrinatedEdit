import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import {
  ZIG_SNIPPETS,
  ODIN_SNIPPETS,
  NIM_SNIPPETS,
  LUA_SNIPPETS,
  GDSCRIPT_SNIPPETS,
  ASSEMBLY_SNIPPETS,
  systemsGamingSnippets,
} from './systemsGamingSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const systemsGamingExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.systems-gaming',
  name: 'Systems, Native Performance & Game Scripting Suite',
  version: '1.0.0',
  description:
    'Ultra-fast systems programming and game engine development suite for Zig, Odin, Nim, Lua (Love2D/Roblox), GDScript (Godot 4), Assembly (x86/ARM), and WebAssembly (WAT).',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'Cpu',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: systemsGamingSnippets.length,
  languages: [
    {
      id: 'zig',
      extensions: ['.zig'],
      aliases: ['Zig', 'zig'],
      snippets: ZIG_SNIPPETS,
    },
    {
      id: 'odin',
      extensions: ['.odin'],
      aliases: ['Odin', 'odin'],
      snippets: ODIN_SNIPPETS,
    },
    {
      id: 'nim',
      extensions: ['.nim', '.nims'],
      aliases: ['Nim', 'nim'],
      snippets: NIM_SNIPPETS,
    },
    {
      id: 'lua',
      extensions: ['.lua', '.luau'],
      aliases: ['Lua', 'lua', 'Luau'],
      snippets: LUA_SNIPPETS,
    },
    {
      id: 'gdscript',
      extensions: ['.gd'],
      aliases: ['GDScript', 'Godot'],
      snippets: GDSCRIPT_SNIPPETS,
    },
    {
      id: 'assembly',
      extensions: ['.asm', '.s', '.nasm'],
      aliases: ['Assembly', 'asm', 'NASM'],
      snippets: ASSEMBLY_SNIPPETS,
    },
    {
      id: 'wat',
      extensions: ['.wat', '.wast'],
      aliases: ['WebAssembly Text', 'WAT'],
      snippets: ASSEMBLY_SNIPPETS,
    },
  ],
}

let isRegistered = false

export function registerSystemsGamingExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  const registerForLang = (lang: string, snippetsList: typeof ZIG_SNIPPETS) => {
    try {
      monacoInstance.languages.registerCompletionItemProvider(lang, {
        provideCompletionItems: (model, position) => {
          try {
            const word = model.getWordUntilPosition(position)
            const range: monaco.IRange = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            }
            return {
              suggestions: snippetsList.map((s) => ({
                label: s.label,
                kind: monacoInstance.languages.CompletionItemKind.Snippet,
                detail: s.detail || 'Systems / Game Snippet',
                documentation: s.documentation,
                insertText: s.insertText,
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              })),
            }
          } catch (innerErr) {
            notificationService.notifyError(
              'Systems & Gaming Engine',
              `Completion provider failed for ${lang}: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`
            )
            return { suggestions: [] }
          }
        },
      })
    } catch (err) {
      notificationService.notifyError(
        'Systems & Gaming Engine',
        `Failed to register language provider for ${lang}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  registerForLang('zig', ZIG_SNIPPETS)
  registerForLang('odin', ODIN_SNIPPETS)
  registerForLang('nim', NIM_SNIPPETS)
  registerForLang('lua', LUA_SNIPPETS)
  registerForLang('gdscript', GDSCRIPT_SNIPPETS)
  registerForLang('assembly', ASSEMBLY_SNIPPETS)
  registerForLang('wat', ASSEMBLY_SNIPPETS)

  triggerSystemsToolchainCheck()
}

export function triggerSystemsToolchainCheck() {
  let unsubscribe: (() => void) | undefined
  unsubscribe = toolchainService.onDidDetect((results) => {
    const zigToolchain = results.find((tc) => tc.language === 'zig')
    if (zigToolchain) {
      if (!zigToolchain.found) {
        notificationService.notifyMissingToolchain(
          'Systems & Gaming Suite',
          'zig / odin / nim / lua',
          'https://ziglang.org/download/'
        )
      }
      unsubscribe?.()
    }
  })

  toolchainService.detectOne('toolchain.zig').catch(() => {})
}

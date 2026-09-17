import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import {
  ODIN_SNIPPETS,
  NIM_SNIPPETS,
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
    'Ultra-fast systems programming and game engine development suite for Odin, Nim, Assembly (x86/ARM), and WebAssembly (WAT).',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'Cpu',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: systemsGamingSnippets.length,
  languages: [
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
      id: 'assembly',
      extensions: ['.asm', '.s', '.nasm'],
      aliases: ['Assembly', 'asm', 'NASM', 'x86_64'],
      snippets: ASSEMBLY_SNIPPETS,
    },
    {
      id: 'wat',
      extensions: ['.wat', '.wast'],
      aliases: ['WebAssembly', 'wat', 'WAT'],
      snippets: ASSEMBLY_SNIPPETS,
    },
  ],
}

let isRegistered = false

export function registerSystemsGamingExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  const registerForLang = (lang: string, snippetsList: typeof ODIN_SNIPPETS) => {
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

            const suggestions: monaco.languages.CompletionItem[] = snippetsList.map((snip) => ({
              label: snip.label,
              kind: monacoInstance.languages.CompletionItemKind.Snippet,
              detail: `🎮 ${snip.detail}`,
              documentation: {
                value: `**${snip.detail}**\n\n${snip.documentation}`,
              },
              insertText: snip.insertText,
              insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            }))

            return { suggestions }
          } catch (err) {
            console.error(`Systems gaming snippet provider failed for ${lang}:`, err)
            return { suggestions: [] }
          }
        },
      })
    } catch (err) {
      console.error(`Could not register systems provider for ${lang}:`, err)
    }
  }

  registerForLang('odin', ODIN_SNIPPETS)
  registerForLang('nim', NIM_SNIPPETS)
  registerForLang('assembly', ASSEMBLY_SNIPPETS)
  registerForLang('wat', ASSEMBLY_SNIPPETS)

  // Register toolchain for Odin
  toolchainService.registerToolchain({
    id: 'toolchain.odin',
    name: 'Odin Programming Language',
    language: 'odin',
    binaryNames: ['odin'],
    versionFlag: 'version',
    versionPattern: 'odin\\s+version\\s+([a-zA-Z0-9._-]+)',
    downloadUrl: 'https://odin-lang.org',
    description: 'Fast, data-oriented programming language with built-in SOA and vendor libraries',
  })

  // Register toolchain for Nim
  toolchainService.registerToolchain({
    id: 'toolchain.nim',
    name: 'Nim Compiler',
    language: 'nim',
    binaryNames: ['nim', 'nimble'],
    versionFlag: '--version',
    versionPattern: 'Nim\\s+Compiler\\s+Version\\s+([0-9]+\\.[0-9]+\\.[0-9]+)',
    downloadUrl: 'https://nim-lang.org',
    description: 'Expressive, efficient, systems-oriented compiled language',
  })

  notificationService.notifyInfo('Extension System', '🎮 Systems & Game Engine Suite activated')
}

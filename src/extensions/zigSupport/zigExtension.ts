import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { zigSnippets } from './zigSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const zigExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.zig',
  name: 'Zig & Native Systems Toolchain Suite',
  version: '1.0.0',
  description:
    'Dedicated high-performance systems programming suite for Zig (0.13+), comptime generics, allocators, build.zig, @cImport interop, and SIMD.',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'Zap',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: zigSnippets.length,
  languages: [
    {
      id: 'zig',
      extensions: ['.zig', '.zon'],
      aliases: ['Zig', 'zig', 'ZON'],
      snippets: zigSnippets,
    },
  ],
}

let isRegistered = false

export function registerZigExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  try {
    monacoInstance.languages.registerCompletionItemProvider('zig', {
      provideCompletionItems: (model, position) => {
        try {
          const word = model.getWordUntilPosition(position)
          const range: monaco.IRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          }

          const suggestions: monaco.languages.CompletionItem[] = zigSnippets.map((snip) => ({
            label: snip.label,
            kind: monacoInstance.languages.CompletionItemKind.Snippet,
            detail: `⚡ ${snip.detail}`,
            documentation: {
              value: `**${snip.detail}**\n\n${snip.documentation}`,
            },
            insertText: snip.insertText,
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          }))

          return { suggestions }
        } catch (err) {
          console.error('Zig snippet provider failed:', err)
          return { suggestions: [] }
        }
      },
    })
  } catch (err) {
    console.error('Could not register Zig extension provider:', err)
  }

  // Register toolchain for Zig
  toolchainService.registerToolchain({
    id: 'toolchain.zig',
    name: 'Zig Compiler & Toolchain',
    language: 'zig',
    binaryNames: ['zig'],
    versionFlag: 'version',
    versionPattern: '([0-9]+\\.[0-9]+\\.[0-9]+)',
    downloadUrl: 'https://ziglang.org',
    description: 'Robust, optimal, and reusable systems programming compiler',
  })

  notificationService.notifyInfo('Extension System', '⚡ Zig Native Systems Suite activated')
}

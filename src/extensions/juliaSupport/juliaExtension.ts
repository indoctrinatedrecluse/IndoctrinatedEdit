import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { juliaSnippets } from './juliaSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const juliaExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.julia',
  name: 'Julia High-Performance Scientific Suite',
  version: '1.0.0',
  description:
    'Dedicated high-performance scientific computing and machine learning suite for Julia, Flux.jl, DifferentialEquations.jl, DataFrames, and Makie visualization.',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'Sparkles',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: juliaSnippets.length,
  languages: [
    {
      id: 'julia',
      extensions: ['.jl'],
      aliases: ['Julia', 'julia'],
      snippets: juliaSnippets,
    },
  ],
}

let isRegistered = false

export function registerJuliaExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  try {
    monacoInstance.languages.registerCompletionItemProvider('julia', {
      provideCompletionItems: (model, position) => {
        try {
          const word = model.getWordUntilPosition(position)
          const range: monaco.IRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          }

          const suggestions: monaco.languages.CompletionItem[] = juliaSnippets.map((snip) => ({
            label: snip.label,
            kind: monacoInstance.languages.CompletionItemKind.Snippet,
            detail: `🧬 ${snip.detail}`,
            documentation: {
              value: `**${snip.detail}**\n\n${snip.documentation}`,
            },
            insertText: snip.insertText,
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          }))

          return { suggestions }
        } catch (err) {
          console.error('Julia snippet provider failed:', err)
          return { suggestions: [] }
        }
      },
    })
  } catch (err) {
    console.error('Could not register Julia extension provider:', err)
  }

  // Register toolchain for Julia
  toolchainService.registerToolchain({
    id: 'toolchain.julia',
    name: 'Julia Scientific Computing Runtime',
    language: 'julia',
    binaryNames: ['julia'],
    versionFlag: '--version',
    versionPattern: 'julia\\s+version\\s+([0-9]+\\.[0-9]+\\.[0-9]+)',
    downloadUrl: 'https://julialang.org',
    description: 'High-level, high-performance dynamic programming language for numerical computing',
  })

  notificationService.notifyInfo('Extension System', '🧬 Julia Scientific Suite activated')
}

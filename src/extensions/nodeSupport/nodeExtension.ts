import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { nodeSnippets } from './nodeSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const nodeExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.node-pack',
  name: 'Node.js Core & Runtime Extension',
  version: '1.0.0',
  description: 'Native Node.js 20/22+ runtime suite with node:http, node:fs/promises, worker_threads, node:stream pipelines, node:test runner, and npm/bun toolchain detection.',
  author: 'indoctrinatedrecluse',
  category: 'Tools',
  iconName: 'Cpu',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: nodeSnippets.length,
  languages: [
    {
      id: 'javascript',
      extensions: ['.js', '.mjs', '.cjs'],
      aliases: ['JavaScript', 'Node.js'],
      snippets: nodeSnippets,
    },
    {
      id: 'typescript',
      extensions: ['.ts', '.mts', '.cts'],
      aliases: ['TypeScript', 'Node.js TS'],
      snippets: nodeSnippets,
    },
    {
      id: 'json',
      extensions: ['package.json', 'package-lock.json', '.npmrc'],
      aliases: ['JSON', 'package.json'],
      snippets: nodeSnippets.filter((s) => s.label === 'node-package-json'),
    },
  ],
}


export function registerNodeExtension(monacoInstance: typeof monaco): monaco.IDisposable[] {
  if (!monacoInstance) return []

  const disposables: monaco.IDisposable[] = []
  const makeProvider = (snippetsList: typeof nodeSnippets) => ({
    provideCompletionItems: (model: monaco.editor.ITextModel, position: monaco.Position) => {
      try {
        const word = model.getWordUntilPosition(position)
        const range: monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        const suggestions: monaco.languages.CompletionItem[] = snippetsList.map((snippet) => ({
          label: snippet.label,
          kind: monacoInstance.languages.CompletionItemKind.Snippet,
          detail: snippet.detail || 'Node.js Snippet',
          documentation: snippet.documentation,
          insertText: snippet.insertText,
          insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        }))

        return { suggestions }
      } catch (err) {
        notificationService.notifyError(
          'Node.js Extension Completion Error',
          String(err),
          'Node.js Language Service'
        )
        return { suggestions: [] }
      }
    },
  })

  const jsCodeSnippets = nodeSnippets.filter((s) => s.label !== 'node-package-json')
  const jsonSnippets = nodeSnippets.filter((s) => s.label === 'node-package-json')

  const d1 = monacoInstance.languages.registerCompletionItemProvider('javascript', makeProvider(jsCodeSnippets))
  const d2 = monacoInstance.languages.registerCompletionItemProvider('typescript', makeProvider(jsCodeSnippets))
  const d3 = monacoInstance.languages.registerCompletionItemProvider('json', makeProvider(jsonSnippets))
  if (d1) disposables.push(d1)
  if (d2) disposables.push(d2)
  if (d3) disposables.push(d3)

  triggerNodeToolchainCheck()
  return disposables
}

export function triggerNodeToolchainCheck() {
  let unsubscribe: (() => void) | undefined
  unsubscribe = toolchainService.onDidDetect((results) => {
    const nodeToolchain = results.find((tc) => tc.language === 'javascript')
    if (nodeToolchain) {
      if (!nodeToolchain.found) {
        notificationService.notifyMissingToolchain(
          'Node.js Core & Runtime Extension',
          'node (Node.js)',
          'https://nodejs.org'
        )
      }
      unsubscribe?.()
    }
  })

  toolchainService.detectOne('toolchain.node').catch(() => {})
}

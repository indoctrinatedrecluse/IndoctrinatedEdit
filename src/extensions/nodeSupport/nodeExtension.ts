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

let isRegistered = false

export function registerNodeExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  const provideSnippets = (model: monaco.editor.ITextModel, position: monaco.Position) => {
    try {
      const word = model.getWordUntilPosition(position)
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const suggestions: monaco.languages.CompletionItem[] = nodeSnippets.map((snippet) => ({
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
        err,
        'Node.js Language Service'
      )
      return { suggestions: [] }
    }
  }

  monacoInstance.languages.registerCompletionItemProvider('javascript', {
    provideCompletionItems: provideSnippets,
  })

  monacoInstance.languages.registerCompletionItemProvider('typescript', {
    provideCompletionItems: provideSnippets,
  })

  monacoInstance.languages.registerCompletionItemProvider('json', {
    provideCompletionItems: provideSnippets,
  })

  triggerNodeToolchainCheck()
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

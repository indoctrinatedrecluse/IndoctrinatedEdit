import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { reactSnippets } from './reactSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const reactExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.react-pack',
  name: 'React 19 & Next.js Modern Ecosystem',
  version: '1.0.0',
  description: 'First-class React 19 & Next.js suite with Server Components, useActionState, useOptimistic, Zustand, TanStack Query, Framer Motion, and TypeScript JSX/TSX support.',
  author: 'indoctrinatedrecluse',
  category: 'Frameworks',
  iconName: 'Sparkles',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: reactSnippets.length,
  languages: [
    {
      id: 'typescript',
      extensions: ['.tsx', '.jsx', '.ts', '.js'],
      aliases: ['React TypeScript', 'React JSX'],
      snippets: reactSnippets,
    },
    {
      id: 'javascript',
      extensions: ['.jsx', '.js'],
      aliases: ['React JavaScript'],
      snippets: reactSnippets,
    },
  ],
}

let isRegistered = false

export function registerReactExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  const provideSnippets = (model: monaco.editor.ITextModel, position: monaco.Position) => {
    const word = model.getWordUntilPosition(position)
    const range: monaco.IRange = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    }

    const suggestions: monaco.languages.CompletionItem[] = reactSnippets.map((snippet) => ({
      label: snippet.label,
      kind: monacoInstance.languages.CompletionItemKind.Snippet,
      detail: snippet.detail || 'React / Next.js Snippet',
      documentation: snippet.documentation,
      insertText: snippet.insertText,
      insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    }))

    return { suggestions }
  }

  monacoInstance.languages.registerCompletionItemProvider('typescript', {
    provideCompletionItems: provideSnippets,
  })

  monacoInstance.languages.registerCompletionItemProvider('javascript', {
    provideCompletionItems: provideSnippets,
  })

  triggerReactToolchainCheck()
}

export function triggerReactToolchainCheck() {
  const unsubscribe = toolchainService.onDidDetect((results) => {
    const nodeToolchain = results.find((tc) => tc.language === 'javascript')
    if (nodeToolchain) {
      if (!nodeToolchain.found) {
        notificationService.notifyMissingToolchain(
          'React 19 & Next.js Modern Ecosystem',
          'Node.js & npm / bun',
          'https://nodejs.org'
        )
      }
      unsubscribe()
    }
  })

  toolchainService.detectOne('toolchain.node').catch(() => {})
}

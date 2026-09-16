import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { goSnippets } from './goSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const goExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.go-pack',
  name: 'Go Universal Suite & Toolchain',
  version: '1.0.0',
  description: 'Complete Go language support with rich snippets for Gin, Fiber, Echo, GORM, Cobra, and auto-detecting compiler toolchains.',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'Zap',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: goSnippets.length,
  languages: [
    {
      id: 'go',
      extensions: ['.go'],
      aliases: ['Go', 'golang'],
      mimetypes: ['text/x-go'],
      snippets: goSnippets,
    },
  ],
}

let isRegistered = false

export function registerGoExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  // Register completion items for Go
  monacoInstance.languages.registerCompletionItemProvider('go', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const suggestions: monaco.languages.CompletionItem[] = goSnippets.map((snippet) => ({
        label: snippet.label,
        kind: monacoInstance.languages.CompletionItemKind.Snippet,
        detail: snippet.detail || 'Go Snippet',
        documentation: snippet.documentation,
        insertText: snippet.insertText,
        insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
      }))

      return { suggestions }
    },
  })

  // Trigger background compiler detection and notify if missing
  triggerGoToolchainCheck()
}

export function triggerGoToolchainCheck() {
  let unsubscribe: (() => void) | undefined
  unsubscribe = toolchainService.onDidDetect((results) => {
    const goToolchain = results.find((tc) => tc.language === 'go')
    if (goToolchain) {
      if (!goToolchain.found) {
        notificationService.notifyMissingToolchain(
          'Go Universal Suite',
          'go',
          'https://go.dev/dl/'
        )
      }
      unsubscribe?.()
    }
  })

  // Trigger single non-blocking check
  toolchainService.detectOne('toolchain.go').catch(() => {
    // If detection fails or running in web, listener will catch
  })
}

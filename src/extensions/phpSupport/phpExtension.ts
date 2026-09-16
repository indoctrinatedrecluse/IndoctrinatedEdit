import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { phpSnippets } from './phpSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const phpExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.php-laravel-pack',
  name: 'PHP & Laravel Ecosystem Suite',
  version: '1.0.0',
  description: 'Comprehensive PHP & Laravel 11/12 extension with Eloquent, API controllers, migrations, Pest/PHPUnit tests, and PHP/Composer runtime detection.',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'Code2',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: phpSnippets.length,
  languages: [
    {
      id: 'php',
      extensions: ['.php', '.phtml', '.blade.php'],
      aliases: ['PHP', 'php', 'laravel'],
      mimetypes: ['text/x-php', 'application/x-php'],
      snippets: phpSnippets,
    },
  ],
}

let isRegistered = false

export function registerPhpExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  monacoInstance.languages.registerCompletionItemProvider('php', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const suggestions: monaco.languages.CompletionItem[] = phpSnippets.map((snippet) => ({
        label: snippet.label,
        kind: monacoInstance.languages.CompletionItemKind.Snippet,
        detail: snippet.detail || 'PHP / Laravel Snippet',
        documentation: snippet.documentation,
        insertText: snippet.insertText,
        insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
      }))

      return { suggestions }
    },
  })

  triggerPhpToolchainCheck()
}

export function triggerPhpToolchainCheck() {
  const unsubscribe = toolchainService.onDidDetect((results) => {
    const phpToolchain = results.find((tc) => tc.language === 'php')
    if (phpToolchain) {
      if (!phpToolchain.found) {
        notificationService.notifyMissingToolchain(
          'PHP & Laravel Ecosystem Suite',
          'php / composer',
          'https://www.php.net/downloads'
        )
      }
      unsubscribe()
    }
  })

  toolchainService.detectOne('toolchain.php').catch(() => {})
}

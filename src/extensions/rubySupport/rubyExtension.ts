import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { rubySnippets } from './rubySnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const rubyExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.ruby-pack',
  name: 'Ruby & Ruby on Rails Suite',
  version: '1.0.0',
  description: 'Full Ruby & Rails 7/8 extension with ActiveRecord models, API controllers, migrations, ActiveJob, RSpec specs, and Ruby/Bundler runtime detection.',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'Gem',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: rubySnippets.length,
  languages: [
    {
      id: 'ruby',
      extensions: ['.rb', '.rake', '.gemspec', 'Gemfile', 'Rakefile'],
      aliases: ['Ruby', 'ruby', 'rails'],
      mimetypes: ['application/x-ruby', 'text/x-ruby'],
      snippets: rubySnippets,
    },
  ],
}

let isRegistered = false

export function registerRubyExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  monacoInstance.languages.registerCompletionItemProvider('ruby', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const suggestions: monaco.languages.CompletionItem[] = rubySnippets.map((snippet) => ({
        label: snippet.label,
        kind: monacoInstance.languages.CompletionItemKind.Snippet,
        detail: snippet.detail || 'Ruby / Rails Snippet',
        documentation: snippet.documentation,
        insertText: snippet.insertText,
        insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
      }))

      return { suggestions }
    },
  })

  triggerRubyToolchainCheck()
}

export function triggerRubyToolchainCheck() {
  let unsubscribe: (() => void) | undefined
  unsubscribe = toolchainService.onDidDetect((results) => {
    const rubyToolchain = results.find((tc) => tc.language === 'ruby')
    if (rubyToolchain) {
      if (!rubyToolchain.found) {
        notificationService.notifyMissingToolchain(
          'Ruby & Ruby on Rails Suite',
          'ruby / bundle / rails',
          'https://www.ruby-lang.org/en/documentation/installation/'
        )
      }
      unsubscribe?.()
    }
  })

  toolchainService.detectOne('toolchain.ruby').catch(() => {})
}

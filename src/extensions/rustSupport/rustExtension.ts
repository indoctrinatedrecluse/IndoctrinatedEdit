import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { rustSnippets } from './rustSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const rustExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.rust-pack',
  name: 'Rust & Cargo Ecosystem Extension',
  version: '1.0.0',
  description: 'Rich Rust development pack with snippets for Tokio, Axum, Actix-Web, Clap, Serde, and auto-detecting Cargo/rustc toolchains.',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'Cpu',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: rustSnippets.length,
  languages: [
    {
      id: 'rust',
      extensions: ['.rs'],
      aliases: ['Rust', 'rust', 'rs'],
      mimetypes: ['text/x-rust'],
      snippets: rustSnippets,
    },
  ],
}

let isRegistered = false

export function registerRustExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  // Register completion items for Rust
  monacoInstance.languages.registerCompletionItemProvider('rust', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const suggestions: monaco.languages.CompletionItem[] = rustSnippets.map((snippet) => ({
        label: snippet.label,
        kind: monacoInstance.languages.CompletionItemKind.Snippet,
        detail: snippet.detail || 'Rust Snippet',
        documentation: snippet.documentation,
        insertText: snippet.insertText,
        insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
      }))

      return { suggestions }
    },
  })

  // Trigger background compiler detection and notify if missing
  triggerRustToolchainCheck()
}

export function triggerRustToolchainCheck() {
  let unsubscribe: (() => void) | undefined
  unsubscribe = toolchainService.onDidDetect((results) => {
    const rustToolchain = results.find((tc) => tc.language === 'rust')
    if (rustToolchain) {
      if (!rustToolchain.found) {
        notificationService.notifyMissingToolchain(
          'Rust Ecosystem Extension',
          'rustc / cargo',
          'https://rustup.rs'
        )
      }
      unsubscribe?.()
    }
  })

  // Trigger single non-blocking check
  toolchainService.detectOne('toolchain.rust').catch(() => {
    // If detection fails or running in web, listener will catch
  })
}

import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { flutterSnippets } from './flutterSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const flutterExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.flutter-dart-pack',
  name: 'Flutter & Dart Mobile/Desktop Suite',
  version: '1.0.0',
  description: 'Complete Flutter & Dart 3 development pack with sealed classes, pattern matching, widgets, Riverpod, GoRouter, glassmorphic UI, and Flutter SDK detection.',
  author: 'indoctrinatedrecluse',
  category: 'Frameworks',
  iconName: 'Smartphone',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: flutterSnippets.length,
  languages: [
    {
      id: 'dart',
      extensions: ['.dart'],
      aliases: ['Dart', 'dart', 'flutter'],
      mimetypes: ['application/vnd.dart', 'text/x-dart'],
      snippets: flutterSnippets,
    },
  ],
}

let isRegistered = false

export function registerFlutterExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  monacoInstance.languages.registerCompletionItemProvider('dart', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const suggestions: monaco.languages.CompletionItem[] = flutterSnippets.map((snippet) => ({
        label: snippet.label,
        kind: monacoInstance.languages.CompletionItemKind.Snippet,
        detail: snippet.detail || 'Flutter / Dart Snippet',
        documentation: snippet.documentation,
        insertText: snippet.insertText,
        insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
      }))

      return { suggestions }
    },
  })

  triggerFlutterToolchainCheck()
}

export function triggerFlutterToolchainCheck() {
  const unsubscribe = toolchainService.onDidDetect((results) => {
    const flutterToolchain = results.find((tc) => tc.language === 'dart')
    if (flutterToolchain) {
      if (!flutterToolchain.found) {
        notificationService.notifyMissingToolchain(
          'Flutter & Dart Mobile/Desktop Suite',
          'Flutter SDK / Dart',
          'https://flutter.dev/docs/get-started/install'
        )
      }
      unsubscribe()
    }
  })

  toolchainService.detectOne('toolchain.flutter').catch(() => {})
}

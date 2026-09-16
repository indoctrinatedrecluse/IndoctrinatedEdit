import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { SWIFT_SNIPPETS, OBJC_SNIPPETS, swiftSnippets } from './swiftSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const swiftExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.swift-apple',
  name: 'Native Apple & Swift Ecosystem Suite',
  version: '1.0.0',
  description:
    'Comprehensive Apple native suite for Swift 6, SwiftUI, SwiftData, Vapor Server, and Objective-C/C++ with swiftc/xcodebuild toolchain detection.',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'Apple',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: swiftSnippets.length,
  languages: [
    {
      id: 'swift',
      extensions: ['.swift'],
      aliases: ['Swift', 'swift', 'SwiftUI'],
      snippets: SWIFT_SNIPPETS,
    },
    {
      id: 'objective-c',
      extensions: ['.m', '.mm', '.h'],
      aliases: ['Objective-C', 'objc', 'Objective-C++'],
      snippets: OBJC_SNIPPETS,
    },
  ],
}

let isRegistered = false

export function registerSwiftExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  const registerForLang = (lang: string, snippetsList: typeof SWIFT_SNIPPETS) => {
    try {
      monacoInstance.languages.registerCompletionItemProvider(lang, {
        provideCompletionItems: (model, position) => {
          try {
            const word = model.getWordUntilPosition(position)
            const range: monaco.IRange = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            }
            return {
              suggestions: snippetsList.map((s) => ({
                label: s.label,
                kind: monacoInstance.languages.CompletionItemKind.Snippet,
                detail: s.detail || 'Swift / Apple Snippet',
                documentation: s.documentation,
                insertText: s.insertText,
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              })),
            }
          } catch (innerErr) {
            notificationService.notifyError(
              'Swift & Apple Engine',
              `Completion failed for language ${lang}: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`
            )
            return { suggestions: [] }
          }
        },
      })
    } catch (err) {
      notificationService.notifyError(
        'Swift & Apple Engine',
        `Failed to register language provider for ${lang}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  registerForLang('swift', SWIFT_SNIPPETS)
  registerForLang('objective-c', OBJC_SNIPPETS)

  triggerSwiftToolchainCheck()
}

export function triggerSwiftToolchainCheck() {
  let unsubscribe: (() => void) | undefined
  unsubscribe = toolchainService.onDidDetect((results) => {
    const swiftToolchain = results.find((tc) => tc.language === 'swift')
    if (swiftToolchain) {
      if (!swiftToolchain.found) {
        notificationService.notifyMissingToolchain(
          'Native Apple & Swift Suite',
          'swiftc / swift / Xcode',
          'https://www.swift.org/install/'
        )
      }
      unsubscribe?.()
    }
  })

  toolchainService.detectOne('toolchain.swift').catch(() => {})
}

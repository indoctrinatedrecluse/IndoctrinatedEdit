import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { KOTLIN_SNIPPETS, COMPOSE_SNIPPETS, GRADLE_KTS_SNIPPETS, kotlinSnippets } from './kotlinSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const kotlinExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.kotlin-android',
  name: 'Kotlin & Android Multiplatform Suite',
  version: '1.0.0',
  description:
    'Complete Kotlin 2.0+ & Android suite for Jetpack Compose, Kotlin Multiplatform (KMP), Coroutines/Flows, and Gradle Kotlin DSL with kotlinc/gradle detection.',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'Smartphone',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: kotlinSnippets.length,
  languages: [
    {
      id: 'kotlin',
      extensions: ['.kt', '.kts'],
      aliases: ['Kotlin', 'kotlin', 'KMP', 'Compose'],
      snippets: [...KOTLIN_SNIPPETS, ...COMPOSE_SNIPPETS],
    },
    {
      id: 'gradle-kotlin',
      extensions: ['.gradle.kts'],
      aliases: ['Gradle Kotlin DSL', 'gradle-kts'],
      snippets: GRADLE_KTS_SNIPPETS,
    },
  ],
}

let isRegistered = false

export function registerKotlinExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  const registerForLang = (lang: string, snippetsList: typeof KOTLIN_SNIPPETS) => {
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
                detail: s.detail || 'Kotlin / Android Snippet',
                documentation: s.documentation,
                insertText: s.insertText,
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              })),
            }
          } catch (innerErr) {
            notificationService.notifyError(
              'Kotlin & Android Engine',
              `Completion provider failed for ${lang}: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`
            )
            return { suggestions: [] }
          }
        },
      })
    } catch (err) {
      notificationService.notifyError(
        'Kotlin & Android Engine',
        `Failed to register language provider for ${lang}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  registerForLang('kotlin', [...KOTLIN_SNIPPETS, ...COMPOSE_SNIPPETS])
  registerForLang('gradle-kotlin', GRADLE_KTS_SNIPPETS)

  triggerKotlinToolchainCheck()
}

export function triggerKotlinToolchainCheck() {
  let unsubscribe: (() => void) | undefined
  unsubscribe = toolchainService.onDidDetect((results) => {
    const kotlinToolchain = results.find((tc) => tc.language === 'kotlin')
    if (kotlinToolchain) {
      if (!kotlinToolchain.found) {
        notificationService.notifyMissingToolchain(
          'Kotlin & Android Multiplatform Suite',
          'kotlinc / gradle',
          'https://kotlinlang.org/docs/command-line.html'
        )
      }
      unsubscribe?.()
    }
  })

  toolchainService.detectOne('toolchain.kotlin').catch(() => {})
}

import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { javaSnippets } from './javaSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const javaExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.java-pack',
  name: 'Java & JVM Universal Suite',
  version: '1.0.0',
  description: 'Enterprise Java language suite with modern Java 17/21 features, Spring Boot 3, Quarkus, Jakarta JPA, JUnit 5, Maven, Gradle, and JDK toolchain detection.',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'Cpu',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: javaSnippets.length,
  languages: [
    {
      id: 'java',
      extensions: ['.java', '.jav', '.class', '.jar', '.gradle', '.pom'],
      aliases: ['Java', 'java', 'JVM'],
      mimetypes: ['text/x-java-source', 'text/x-java'],
      snippets: javaSnippets,
    },
  ],
}

let isRegistered = false

export function registerJavaExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  // Register completion items for Java
  monacoInstance.languages.registerCompletionItemProvider('java', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const suggestions: monaco.languages.CompletionItem[] = javaSnippets.map((snippet) => ({
        label: snippet.label,
        kind: monacoInstance.languages.CompletionItemKind.Snippet,
        detail: snippet.detail || 'Java Snippet',
        documentation: snippet.documentation,
        insertText: snippet.insertText,
        insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
      }))

      return { suggestions }
    },
  })

  // Trigger background compiler detection and notify if missing
  triggerJavaToolchainCheck()
}

export function triggerJavaToolchainCheck() {
  let unsubscribe: (() => void) | undefined
  unsubscribe = toolchainService.onDidDetect((results) => {
    const javaToolchain = results.find((tc) => tc.language === 'java')
    if (javaToolchain) {
      if (!javaToolchain.found) {
        notificationService.notifyMissingToolchain(
          'Java & JVM Universal Suite',
          'javac / java (JDK)',
          'https://www.oracle.com/java/technologies/downloads/'
        )
      }
      unsubscribe?.()
    }
  })

  // Trigger single non-blocking check
  toolchainService.detectOne('toolchain.java').catch(() => {
    // If detection fails or running in web, listener will catch
  })
}

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
      extensions: ['.java', '.jav', '.gradle'],
      aliases: ['Java', 'java', 'JVM'],
      mimetypes: ['text/x-java-source', 'text/x-java'],
      snippets: javaSnippets,
    },
  ],
}


export function registerJavaExtension(monacoInstance: typeof monaco): monaco.IDisposable[] {
  if (!monacoInstance) return []

  const disposables: monaco.IDisposable[] = []
  const javaCodeSnippets = javaSnippets.filter((s) => s.label !== 'maven-pom' && s.label !== 'gradle-build')
  const mavenSnippets = javaSnippets.filter((s) => s.label === 'maven-pom')
  const gradleSnippets = javaSnippets.filter((s) => s.label === 'gradle-build')

  const makeProvider = (list: typeof javaSnippets) => ({
    provideCompletionItems: (model: monaco.editor.ITextModel, position: monaco.Position) => {
      const word = model.getWordUntilPosition(position)
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const suggestions: monaco.languages.CompletionItem[] = list.map((snippet) => ({
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

  const d1 = monacoInstance.languages.registerCompletionItemProvider('java', makeProvider(javaCodeSnippets))
  if (d1) disposables.push(d1)
  if (mavenSnippets.length > 0) {
    const d2 = monacoInstance.languages.registerCompletionItemProvider('xml', makeProvider(mavenSnippets))
    if (d2) disposables.push(d2)
  }
  if (gradleSnippets.length > 0) {
    const d3 = monacoInstance.languages.registerCompletionItemProvider('gradle-kotlin', makeProvider(gradleSnippets))
    if (d3) disposables.push(d3)
  }

  // Trigger background compiler detection and notify if missing
  triggerJavaToolchainCheck()
  return disposables
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

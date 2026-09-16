import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { angularSnippets } from './angularSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const angularExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.angular-pack',
  name: 'Angular & TypeScript Enterprise Suite',
  version: '1.0.0',
  description: 'Enterprise Angular 17/18+ suite with Standalone Components, Signals, new Control Flow (@if/@for), Reactive Forms, inject(), and TypeScript service integrations.',
  author: 'indoctrinatedrecluse',
  category: 'Frameworks',
  iconName: 'Layers',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: angularSnippets.length,
  languages: [
    {
      id: 'typescript',
      extensions: ['.component.ts', '.service.ts', '.directive.ts', '.pipe.ts', '.guard.ts'],
      aliases: ['Angular TypeScript', 'ng-ts'],
      snippets: angularSnippets,
    },
    {
      id: 'html',
      extensions: ['.component.html'],
      aliases: ['Angular Template', 'ng-html'],
      snippets: angularSnippets,
    },
  ],
}

let isRegistered = false

export function registerAngularExtension(monacoInstance: typeof monaco) {
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

    const suggestions: monaco.languages.CompletionItem[] = angularSnippets.map((snippet) => ({
      label: snippet.label,
      kind: monacoInstance.languages.CompletionItemKind.Snippet,
      detail: snippet.detail || 'Angular Snippet',
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

  monacoInstance.languages.registerCompletionItemProvider('html', {
    provideCompletionItems: provideSnippets,
  })

  triggerAngularToolchainCheck()
}

export function triggerAngularToolchainCheck() {
  let unsubscribe: (() => void) | undefined
  unsubscribe = toolchainService.onDidDetect((results) => {
    const nodeToolchain = results.find((tc) => tc.language === 'javascript')
    if (nodeToolchain) {
      if (!nodeToolchain.found) {
        notificationService.notifyMissingToolchain(
          'Angular & TypeScript Enterprise Suite',
          'Node.js & npm / ng CLI',
          'https://nodejs.org'
        )
      }
      unsubscribe?.()
    }
  })

  toolchainService.detectOne('toolchain.node').catch(() => {})
}

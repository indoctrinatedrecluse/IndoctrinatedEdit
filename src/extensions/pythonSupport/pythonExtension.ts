import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { pythonSnippets } from './pythonSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const pythonExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.python-pack',
  name: 'Python & AI Ecosystem Extension',
  version: '1.0.0',
  description: 'Full Python language suite with rich snippets for FastAPI, Flask, Django, Pandas, NumPy, PyTorch, Scikit-Learn, Pytest, Click, and toolchain detection.',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'Code2',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: pythonSnippets.length,
  languages: [
    {
      id: 'python',
      extensions: ['.py', '.pyi', '.pyw', '.ipynb', '.pyx', '.pyd'],
      aliases: ['Python', 'python', 'py'],
      mimetypes: ['text/x-python', 'application/x-python-code'],
      snippets: pythonSnippets,
    },
  ],
}

let isRegistered = false

export function registerPythonExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  // Register completion items for Python
  monacoInstance.languages.registerCompletionItemProvider('python', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const suggestions: monaco.languages.CompletionItem[] = pythonSnippets.map((snippet) => ({
        label: snippet.label,
        kind: monacoInstance.languages.CompletionItemKind.Snippet,
        detail: snippet.detail || 'Python Snippet',
        documentation: snippet.documentation,
        insertText: snippet.insertText,
        insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
      }))

      return { suggestions }
    },
  })

  // Trigger background compiler detection and notify if missing
  triggerPythonToolchainCheck()
}

export function triggerPythonToolchainCheck() {
  let unsubscribe: (() => void) | undefined
  unsubscribe = toolchainService.onDidDetect((results) => {
    const pythonToolchain = results.find((tc) => tc.language === 'python')
    if (pythonToolchain) {
      if (!pythonToolchain.found) {
        notificationService.notifyMissingToolchain(
          'Python & AI Ecosystem',
          'python / python3',
          'https://www.python.org/downloads/'
        )
      }
      unsubscribe?.()
    }
  })

  // Trigger single non-blocking check
  toolchainService.detectOne('toolchain.python').catch(() => {
    // If detection fails or running in web, listener will catch
  })
}

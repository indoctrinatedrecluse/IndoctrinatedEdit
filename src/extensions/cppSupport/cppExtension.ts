import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { cppSnippets } from './cppSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const cppExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.cpp-pack',
  name: 'C/C++ Universal Engine & Toolchain',
  version: '1.0.0',
  description: 'Comprehensive C/C++ language services with modern C++20/C++23 features, POSIX, AVX2 SIMD, Raylib, Crow, ImGui, and CMake snippets.',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'Terminal',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: cppSnippets.length,
  languages: [
    {
      id: 'cpp',
      extensions: ['.cpp', '.cxx', '.cc', '.c++', '.hpp', '.hxx', '.hh', '.h++', '.ixx', '.cppm'],
      aliases: ['C++', 'cpp', 'cplusplus'],
      mimetypes: ['text/x-c++src', 'text/x-c++hdr'],
      snippets: cppSnippets,
    },
    {
      id: 'c',
      extensions: ['.c', '.h'],
      aliases: ['C', 'c'],
      mimetypes: ['text/x-csrc', 'text/x-chdr'],
      snippets: cppSnippets,
    },
  ],
}

let isRegistered = false

export function registerCppExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  // Register completion items for C++
  const provideSnippets = (model: monaco.editor.ITextModel, position: monaco.Position) => {
    const word = model.getWordUntilPosition(position)
    const range: monaco.IRange = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    }

    const suggestions: monaco.languages.CompletionItem[] = cppSnippets.map((snippet) => ({
      label: snippet.label,
      kind: monacoInstance.languages.CompletionItemKind.Snippet,
      detail: snippet.detail || 'C/C++ Snippet',
      documentation: snippet.documentation,
      insertText: snippet.insertText,
      insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    }))

    return { suggestions }
  }

  monacoInstance.languages.registerCompletionItemProvider('cpp', {
    provideCompletionItems: provideSnippets,
  })

  monacoInstance.languages.registerCompletionItemProvider('c', {
    provideCompletionItems: provideSnippets,
  })

  // Trigger background compiler detection and notify if missing
  triggerCppToolchainCheck()
}

export function triggerCppToolchainCheck() {
  let unsubscribe: (() => void) | undefined
  unsubscribe = toolchainService.onDidDetect((results) => {
    const cppToolchain = results.find((tc) => tc.language === 'cpp')
    if (cppToolchain) {
      if (!cppToolchain.found) {
        notificationService.notifyMissingToolchain(
          'C/C++ Universal Engine',
          'g++ / clang++ / cl',
          'https://visualstudio.microsoft.com/visual-cpp-build-tools/'
        )
      }
      unsubscribe?.()
    }
  })

  // Trigger single non-blocking check
  toolchainService.detectOne('toolchain.cpp').catch(() => {
    // If detection fails or running in web, listener will catch
  })
}

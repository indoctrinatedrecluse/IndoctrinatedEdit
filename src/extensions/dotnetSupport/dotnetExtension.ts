import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { dotnetSnippets } from './dotnetSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const dotnetExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.dotnet-pack',
  name: '.NET & C# Enterprise Suite',
  version: '1.0.0',
  description: 'Full C# / .NET ecosystem extension with modern C# 12/13, ASP.NET Core Minimal APIs, EF Core, MassTransit, MVVM, xUnit, and .NET SDK toolchain detection.',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'Cpu',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: dotnetSnippets.length,
  languages: [
    {
      id: 'csharp',
      extensions: ['.cs', '.csx', '.csproj', '.sln', '.fsproj', '.vb'],
      aliases: ['C#', 'csharp', 'dotnet'],
      mimetypes: ['text/x-csharp', 'text/x-csharp-source'],
      snippets: dotnetSnippets,
    },
  ],
}

let isRegistered = false

export function registerDotnetExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  // Register completion items for C#
  monacoInstance.languages.registerCompletionItemProvider('csharp', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const suggestions: monaco.languages.CompletionItem[] = dotnetSnippets.map((snippet) => ({
        label: snippet.label,
        kind: monacoInstance.languages.CompletionItemKind.Snippet,
        detail: snippet.detail || 'C# / .NET Snippet',
        documentation: snippet.documentation,
        insertText: snippet.insertText,
        insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
      }))

      return { suggestions }
    },
  })

  // Trigger background compiler detection and notify if missing
  triggerDotnetToolchainCheck()
}

export function triggerDotnetToolchainCheck() {
  const unsubscribe = toolchainService.onDidDetect((results) => {
    const dotnetToolchain = results.find((tc) => tc.language === 'csharp')
    if (dotnetToolchain) {
      if (!dotnetToolchain.found) {
        notificationService.notifyMissingToolchain(
          '.NET & C# Enterprise Suite',
          'dotnet (.NET SDK)',
          'https://dotnet.microsoft.com/download'
        )
      }
      unsubscribe()
    }
  })

  // Trigger single non-blocking check
  toolchainService.detectOne('toolchain.dotnet').catch(() => {
    // If detection fails or running in web, listener will catch
  })
}

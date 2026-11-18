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
      extensions: ['.cs', '.csx', '.sln'],
      aliases: ['C#', 'csharp', 'dotnet'],
      mimetypes: ['text/x-csharp', 'text/x-csharp-source'],
      snippets: dotnetSnippets,
    },
    {
      id: 'xml',
      extensions: ['.csproj', '.fsproj', '.vbproj'],
      aliases: ['MSBuild Project XML'],
    },
    {
      id: 'vb',
      extensions: ['.vb'],
      aliases: ['Visual Basic .NET'],
    },
  ],
}


export function registerDotnetExtension(monacoInstance: typeof monaco): monaco.IDisposable[] {
  if (!monacoInstance) return []

  const disposables: monaco.IDisposable[] = []
  const csharpCodeSnippets = dotnetSnippets.filter((s) => s.label !== 'csproj-modern')
  const csprojSnippets = dotnetSnippets.filter((s) => s.label === 'csproj-modern')

  const makeProvider = (list: typeof dotnetSnippets) => ({
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
        detail: snippet.detail || 'C# / .NET Snippet',
        documentation: snippet.documentation,
        insertText: snippet.insertText,
        insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
      }))

      return { suggestions }
    },
  })

  const d1 = monacoInstance.languages.registerCompletionItemProvider('csharp', makeProvider(csharpCodeSnippets))
  if (d1) disposables.push(d1)
  if (csprojSnippets.length > 0) {
    const d2 = monacoInstance.languages.registerCompletionItemProvider('xml', makeProvider(csprojSnippets))
    if (d2) disposables.push(d2)
  }

  // Trigger background compiler detection and notify if missing
  triggerDotnetToolchainCheck()
  return disposables
}

export function triggerDotnetToolchainCheck() {
  let unsubscribe: (() => void) | undefined
  unsubscribe = toolchainService.onDidDetect((results) => {
    const dotnetToolchain = results.find((tc) => tc.language === 'csharp')
    if (dotnetToolchain) {
      if (!dotnetToolchain.found) {
        notificationService.notifyMissingToolchain(
          '.NET & C# Enterprise Suite',
          'dotnet (.NET SDK)',
          'https://dotnet.microsoft.com/download'
        )
      }
      unsubscribe?.()
    }
  })

  // Trigger single non-blocking check
  toolchainService.detectOne('toolchain.dotnet').catch(() => {
    // If detection fails or running in web, listener will catch
  })
}

import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import {
  BASH_SNIPPETS,
  POWERSHELL_SNIPPETS,
  BATCH_SNIPPETS,
  shellScriptSnippets,
} from './shellScriptSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const shellScriptExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.shell-powershell',
  name: 'Shell, PowerShell & Automation Suite',
  version: '1.0.0',
  description:
    'Universal shell and systems scripting suite for Bash, Zsh, POSIX sh, PowerShell 7 (pwsh), and Windows Batch scripts with strict execution patterns.',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'Terminal',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: shellScriptSnippets.length,
  languages: [
    {
      id: 'shell',
      extensions: ['.sh', '.bash', '.zsh', '.ksh', '.fish'],
      aliases: ['Shell Script', 'Bash', 'Zsh', 'POSIX sh', 'Fish'],
      snippets: BASH_SNIPPETS,
    },
    {
      id: 'powershell',
      extensions: ['.ps1', '.psm1', '.psd1'],
      aliases: ['PowerShell', 'pwsh'],
      snippets: POWERSHELL_SNIPPETS,
    },
    {
      id: 'bat',
      extensions: ['.bat', '.cmd'],
      aliases: ['Batch', 'cmd'],
      snippets: BATCH_SNIPPETS,
    },
  ],
}

let isRegistered = false

export function registerShellScriptExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  const registerForLang = (lang: string, snippetsList: typeof BASH_SNIPPETS, prefix: string) => {
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

            const suggestions: monaco.languages.CompletionItem[] = snippetsList.map((snip) => ({
              label: snip.label,
              kind: monacoInstance.languages.CompletionItemKind.Snippet,
              detail: `${prefix} ${snip.detail}`,
              documentation: {
                value: `**${snip.detail}**\n\n${snip.documentation}`,
              },
              insertText: snip.insertText,
              insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            }))

            return { suggestions }
          } catch (err) {
            console.error(`Shell snippet provider failed for ${lang}:`, err)
            return { suggestions: [] }
          }
        },
      })
    } catch (err) {
      console.error(`Could not register completion provider for ${lang}:`, err)
    }
  }

  registerForLang('shell', BASH_SNIPPETS, '📜')
  registerForLang('powershell', POWERSHELL_SNIPPETS, '⚡')
  registerForLang('bat', BATCH_SNIPPETS, '💻')

  // Register toolchains for Bash and PowerShell
  toolchainService.registerToolchain({
    id: 'toolchain.shell',
    name: 'Bash / Zsh Shell',
    language: 'shell',
    binaryNames: ['bash', 'zsh', 'sh'],
    versionFlag: '--version',
    versionPattern: '(?:bash|zsh)\\s+.*([0-9]+\\.[0-9]+(?:\\.[0-9]+)?)',
    downloadUrl: 'https://www.gnu.org/software/bash/',
    description: 'Unix shell and command language interpreter',
  })

  toolchainService.registerToolchain({
    id: 'toolchain.powershell',
    name: 'PowerShell Core',
    language: 'powershell',
    binaryNames: ['pwsh', 'powershell'],
    versionFlag: '--version',
    versionPattern: 'PowerShell\\s+([0-9]+\\.[0-9]+\\.[0-9]+)',
    downloadUrl: 'https://github.com/PowerShell/PowerShell',
    description: 'Cross-platform task automation and configuration management framework',
  })

  notificationService.notifyInfo('Extension System', '📜 Universal Shell & PowerShell Suite activated')
}

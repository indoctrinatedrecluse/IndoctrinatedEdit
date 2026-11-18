import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import {
  SOLIDITY_SNIPPETS,
  HARDHAT_SNIPPETS,
  MOVE_SNIPPETS,
  CAIRO_SNIPPETS,
  VYPER_SNIPPETS,
  web3Snippets,
} from './web3Snippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const web3ExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.web3-smart-contracts',
  name: 'Web3, Smart Contracts & Zero-Knowledge Suite',
  version: '1.0.0',
  description:
    'Next-generation smart contract and zero-knowledge suite covering Solidity (Foundry, Hardhat), Move (Sui, Aptos), Cairo (Starknet ZK), and Vyper.',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'ShieldCheck',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: web3Snippets.length,
  languages: [
    {
      id: 'solidity',
      extensions: ['.sol'],
      aliases: ['Solidity', 'sol', 'Ethereum'],
      snippets: SOLIDITY_SNIPPETS,
    },
    {
      id: 'move',
      extensions: ['.move'],
      aliases: ['Move', 'move', 'Sui', 'Aptos'],
      snippets: MOVE_SNIPPETS,
    },
    {
      id: 'cairo',
      extensions: ['.cairo'],
      aliases: ['Cairo', 'cairo', 'Starknet'],
      snippets: CAIRO_SNIPPETS,
    },
    {
      id: 'vyper',
      extensions: ['.vy'],
      aliases: ['Vyper', 'vyper'],
      snippets: VYPER_SNIPPETS,
    },
  ],
}


export function registerWeb3Extension(monacoInstance: typeof monaco): monaco.IDisposable[] {
  if (!monacoInstance) return []

  const disposables: monaco.IDisposable[] = []
  const registerForLang = (lang: string, snippetsList: typeof SOLIDITY_SNIPPETS) => {
    try {
      const d = monacoInstance.languages.registerCompletionItemProvider(lang, {
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
                detail: s.detail || 'Web3 / Smart Contract Snippet',
                documentation: s.documentation,
                insertText: s.insertText,
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              })),
            }
          } catch (innerErr) {
            notificationService.notifyError(
              'Web3 & Smart Contract Engine',
              `Completion provider failed for ${lang}: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`
            )
            return { suggestions: [] }
          }
        },
      })
      if (d) disposables.push(d)
    } catch (err) {
      notificationService.notifyError(
        'Web3 & Smart Contract Engine',
        `Failed to register language provider for ${lang}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  registerForLang('solidity', SOLIDITY_SNIPPETS)
  registerForLang('typescript', HARDHAT_SNIPPETS)
  registerForLang('javascript', HARDHAT_SNIPPETS)
  registerForLang('move', MOVE_SNIPPETS)
  registerForLang('cairo', CAIRO_SNIPPETS)
  registerForLang('vyper', VYPER_SNIPPETS)

  triggerWeb3ToolchainCheck()
  return disposables
}

export function triggerWeb3ToolchainCheck() {
  let unsubscribe: (() => void) | undefined
  unsubscribe = toolchainService.onDidDetect((results) => {
    const solToolchain = results.find((tc) => tc.language === 'solidity')
    if (solToolchain) {
      if (!solToolchain.found) {
        notificationService.notifyMissingToolchain(
          'Web3 & Smart Contracts Suite',
          'solc / forge / foundry',
          'https://book.getfoundry.sh/getting-started/installation'
        )
      }
      unsubscribe?.()
    }
  })

  toolchainService.detectOne('toolchain.solidity').catch(() => {})
}

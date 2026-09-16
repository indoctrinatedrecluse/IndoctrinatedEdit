import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import {
  ELIXIR_SNIPPETS,
  ERLANG_SNIPPETS,
  HASKELL_SNIPPETS,
  CLOJURE_SNIPPETS,
  OCAML_SNIPPETS,
  JANET_SNIPPETS,
  beamFunctionalSnippets,
} from './beamFunctionalSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const beamFunctionalExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.beam-functional',
  name: 'BEAM & Functional Programming Suite',
  version: '1.0.0',
  description:
    'Massive concurrency and functional programming suite for Elixir (Phoenix/LiveView), Erlang OTP, Haskell (GHC), Clojure, OCaml, and Janet lisp.',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'Zap',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: beamFunctionalSnippets.length,
  languages: [
    {
      id: 'elixir',
      extensions: ['.ex', '.exs', '.heex'],
      aliases: ['Elixir', 'elixir', 'Phoenix'],
      snippets: ELIXIR_SNIPPETS,
    },
    {
      id: 'erlang',
      extensions: ['.erl', '.hrl'],
      aliases: ['Erlang', 'erlang', 'OTP'],
      snippets: ERLANG_SNIPPETS,
    },
    {
      id: 'haskell',
      extensions: ['.hs', '.lhs'],
      aliases: ['Haskell', 'haskell'],
      snippets: HASKELL_SNIPPETS,
    },
    {
      id: 'clojure',
      extensions: ['.clj', '.cljs', '.cljc', '.edn'],
      aliases: ['Clojure', 'clojure'],
      snippets: CLOJURE_SNIPPETS,
    },
    {
      id: 'ocaml',
      extensions: ['.ml', '.mli', '.re'],
      aliases: ['OCaml', 'ocaml', 'ReasonML'],
      snippets: OCAML_SNIPPETS,
    },
    {
      id: 'janet',
      extensions: ['.janet', '.jdn'],
      aliases: ['Janet', 'janet'],
      snippets: JANET_SNIPPETS,
    },
  ],
}

let isRegistered = false

export function registerBeamFunctionalExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  const registerForLang = (lang: string, snippetsList: typeof ELIXIR_SNIPPETS) => {
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
                detail: s.detail || 'Functional / BEAM Snippet',
                documentation: s.documentation,
                insertText: s.insertText,
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              })),
            }
          } catch (innerErr) {
            notificationService.notifyError(
              'BEAM & Functional Engine',
              `Completion provider failed for ${lang}: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`
            )
            return { suggestions: [] }
          }
        },
      })
    } catch (err) {
      notificationService.notifyError(
        'BEAM & Functional Engine',
        `Failed to register language provider for ${lang}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  registerForLang('elixir', ELIXIR_SNIPPETS)
  registerForLang('erlang', ERLANG_SNIPPETS)
  registerForLang('haskell', HASKELL_SNIPPETS)
  registerForLang('clojure', CLOJURE_SNIPPETS)
  registerForLang('ocaml', OCAML_SNIPPETS)
  registerForLang('janet', JANET_SNIPPETS)

  triggerBeamToolchainCheck()
}

export function triggerBeamToolchainCheck() {
  let unsubscribe: (() => void) | undefined
  unsubscribe = toolchainService.onDidDetect((results) => {
    const elixirToolchain = results.find((tc) => tc.language === 'elixir')
    if (elixirToolchain) {
      if (!elixirToolchain.found) {
        notificationService.notifyMissingToolchain(
          'BEAM & Functional Suite',
          'elixir / erlang / ghc',
          'https://elixir-lang.org/install.html'
        )
      }
      unsubscribe?.()
    }
  })

  toolchainService.detectOne('toolchain.elixir').catch(() => {})
}

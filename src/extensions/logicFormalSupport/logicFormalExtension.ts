import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import {
  PROLOG_FOPL_SNIPPETS,
  COMMON_LISP_SNIPPETS,
  SCHEME_RACKET_SNIPPETS,
  LAMBDA_CALCULUS_SNIPPETS,
  FORMAL_METHODS_SNIPPETS,
  logicFormalSnippets,
} from './logicFormalSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const logicFormalExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.logic-formal-methods',
  name: 'Logic Programming, Lambda Calculus & Formal Methods Suite',
  version: '1.0.0',
  description:
    'Comprehensive mathematical foundations suite for First-Order Predicate Logic (Prolog, Datalog, ASP), Classic LISP (Common Lisp, Scheme, Racket), Pure Lambda Calculus & Combinators (SKI, Church Encodings, Y-Combinator), and Formal Proof Assistants (Lean 4, Coq, TLA+).',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'Sparkles',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: logicFormalSnippets.length,
  languages: [
    {
      id: 'prolog',
      extensions: ['.pl', '.pro', '.prolog', '.yap', '.p', '.dl'],
      aliases: ['Prolog', 'SWI-Prolog', 'Datalog', 'ASP'],
      snippets: PROLOG_FOPL_SNIPPETS,
    },
    {
      id: 'lisp',
      extensions: ['.lisp', '.lsp', '.cl', '.el', '.fasl'],
      aliases: ['Common Lisp', 'LISP', 'Emacs Lisp'],
      snippets: COMMON_LISP_SNIPPETS,
    },
    {
      id: 'scheme',
      extensions: ['.scm', '.ss', '.rkt', '.rktl'],
      aliases: ['Scheme', 'Racket', 'Guile'],
      snippets: SCHEME_RACKET_SNIPPETS,
    },
    {
      id: 'lambda-calculus',
      extensions: ['.lc', '.lam', '.lambda'],
      aliases: ['Lambda Calculus', 'Pure Lambda', 'SKI'],
      snippets: LAMBDA_CALCULUS_SNIPPETS,
    },
    {
      id: 'lean',
      extensions: ['.lean'],
      aliases: ['Lean 4', 'Lean', 'Theorem Prover'],
      snippets: FORMAL_METHODS_SNIPPETS,
    },
    {
      id: 'coq',
      extensions: ['.v'],
      aliases: ['Coq', 'Rocq', 'Gallina'],
      snippets: FORMAL_METHODS_SNIPPETS,
    },
    {
      id: 'tla',
      extensions: ['.tla', '.als'],
      aliases: ['TLA+', 'Alloy'],
      snippets: FORMAL_METHODS_SNIPPETS,
    },
  ],
}

let isRegistered = false

export function registerLogicFormalExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  const registerForLang = (lang: string, snippetsList: typeof PROLOG_FOPL_SNIPPETS) => {
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
                detail: s.detail || 'Logic & Formal Methods Snippet',
                documentation: s.documentation,
                insertText: s.insertText,
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              })),
            }
          } catch (innerErr) {
            notificationService.notifyError(
              'Logic & Formal Methods Engine',
              `Completion provider failed for ${lang}: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`
            )
            return { suggestions: [] }
          }
        },
      })
    } catch (err) {
      notificationService.notifyError(
        'Logic & Formal Methods Engine',
        `Failed to register language provider for ${lang}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  registerForLang('prolog', PROLOG_FOPL_SNIPPETS)
  registerForLang('lisp', COMMON_LISP_SNIPPETS)
  registerForLang('scheme', SCHEME_RACKET_SNIPPETS)
  registerForLang('lambda-calculus', LAMBDA_CALCULUS_SNIPPETS)
  registerForLang('lean', FORMAL_METHODS_SNIPPETS)
  registerForLang('coq', FORMAL_METHODS_SNIPPETS)
  registerForLang('tla', FORMAL_METHODS_SNIPPETS)

  triggerLogicFormalToolchainCheck()
}

export function triggerLogicFormalToolchainCheck() {
  let unsubscribe: (() => void) | undefined
  unsubscribe = toolchainService.onDidDetect((results) => {
    const prologTc = results.find((tc) => tc.language === 'prolog')
    if (prologTc) {
      if (!prologTc.found) {
        notificationService.notifyMissingToolchain(
          'Logic Programming & Formal Methods Suite',
          'swipl / sbcl / racket / lean',
          'https://www.swi-prolog.org/Download.html'
        )
      }
      unsubscribe?.()
    }
  })

  toolchainService.detectOne('toolchain.prolog').catch(() => {})
}

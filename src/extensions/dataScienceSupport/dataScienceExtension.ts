import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import {
  R_SNIPPETS,
  JULIA_SNIPPETS,
  SCALA_SNIPPETS,
  MATLAB_SNIPPETS,
  dataScienceSnippets,
} from './dataScienceSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const dataScienceExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.datascience-scientific',
  name: 'Data Science, AI & Scientific Computing Suite',
  version: '1.0.0',
  description:
    'Comprehensive scientific computing and data science suite covering R (Shiny, Tidyverse), Julia (Flux, DiffEq), Scala 3 (Spark), and MATLAB/Octave.',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'Sparkles',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: dataScienceSnippets.length,
  languages: [
    {
      id: 'r',
      extensions: ['.r', '.R', '.Rmd'],
      aliases: ['R', 'r', 'Shiny', 'RMarkdown'],
      snippets: R_SNIPPETS,
    },
    {
      id: 'julia',
      extensions: ['.jl'],
      aliases: ['Julia', 'julia'],
      snippets: JULIA_SNIPPETS,
    },
    {
      id: 'scala',
      extensions: ['.scala', '.sc', '.sbt'],
      aliases: ['Scala', 'scala', 'Spark'],
      snippets: SCALA_SNIPPETS,
    },
    {
      id: 'matlab',
      extensions: ['.m', '.mat'],
      aliases: ['MATLAB', 'Octave'],
      snippets: MATLAB_SNIPPETS,
    },
  ],
}

let isRegistered = false

export function registerDataScienceExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  const registerForLang = (lang: string, snippetsList: typeof R_SNIPPETS) => {
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
                detail: s.detail || 'Data Science Snippet',
                documentation: s.documentation,
                insertText: s.insertText,
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              })),
            }
          } catch (innerErr) {
            notificationService.notifyError(
              'Data Science Engine',
              `Completion provider failed for ${lang}: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`
            )
            return { suggestions: [] }
          }
        },
      })
    } catch (err) {
      notificationService.notifyError(
        'Data Science Engine',
        `Failed to register language provider for ${lang}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  registerForLang('r', R_SNIPPETS)
  registerForLang('julia', JULIA_SNIPPETS)
  registerForLang('scala', SCALA_SNIPPETS)
  registerForLang('matlab', MATLAB_SNIPPETS)

  triggerDataScienceToolchainCheck()
}

export function triggerDataScienceToolchainCheck() {
  let unsubscribe: (() => void) | undefined
  unsubscribe = toolchainService.onDidDetect((results) => {
    const rToolchain = results.find((tc) => tc.language === 'r')
    if (rToolchain) {
      if (!rToolchain.found) {
        notificationService.notifyMissingToolchain(
          'Data Science Suite',
          'R / julia / scala',
          'https://cloud.r-project.org/'
        )
      }
      unsubscribe?.()
    }
  })

  toolchainService.detectOne('toolchain.r').catch(() => {})
}

import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import {
  R_SNIPPETS,
  SCALA_SNIPPETS,
  MATLAB_SNIPPETS,
  dataScienceSnippets,
} from './dataScienceSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const dataScienceExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.datascience-scientific',
  name: 'Data Science, R & Numerical Computing Suite',
  version: '1.0.0',
  description:
    'Comprehensive scientific computing and data analytics suite covering R (Shiny, Tidyverse), Scala 3 (Apache Spark), and MATLAB/Octave.',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'LineChart',
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

            const suggestions: monaco.languages.CompletionItem[] = snippetsList.map((snip) => ({
              label: snip.label,
              kind: monacoInstance.languages.CompletionItemKind.Snippet,
              detail: `📊 ${snip.detail}`,
              documentation: {
                value: `**${snip.detail}**\n\n${snip.documentation}`,
              },
              insertText: snip.insertText,
              insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            }))

            return { suggestions }
          } catch (err) {
            console.error(`Data science snippet provider failed for ${lang}:`, err)
            return { suggestions: [] }
          }
        },
      })
    } catch (err) {
      console.error(`Could not register data science provider for ${lang}:`, err)
    }
  }

  registerForLang('r', R_SNIPPETS)
  registerForLang('scala', SCALA_SNIPPETS)
  registerForLang('matlab', MATLAB_SNIPPETS)

  // Register toolchain for R
  toolchainService.registerToolchain({
    id: 'toolchain.r',
    name: 'R Language Environment',
    language: 'r',
    binaryNames: ['R', 'Rscript'],
    versionFlag: '--version',
    versionPattern: 'R\\s+version\\s+([0-9]+\\.[0-9]+\\.[0-9]+)',
    downloadUrl: 'https://www.r-project.org',
    description: 'Statistical computing and graphics environment',
  })

  // Register toolchain for Scala
  toolchainService.registerToolchain({
    id: 'toolchain.scala',
    name: 'Scala Compiler & Runner',
    language: 'scala',
    binaryNames: ['scala', 'scalac', 'sbt'],
    versionFlag: '-version',
    versionPattern: 'Scala\\s+code\\s+runner\\s+version\\s+([0-9]+\\.[0-9]+\\.[0-9]+)',
    downloadUrl: 'https://www.scala-lang.org',
    description: 'Object-oriented and functional language running on the JVM',
  })

  notificationService.notifyInfo('Extension System', '📊 Data Science & R Analytics Suite activated')
}

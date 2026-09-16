import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import {
  SQL_SNIPPETS,
  GRAPHQL_SNIPPETS,
  PRISMA_SNIPPETS,
  databaseSchemaSnippets,
} from './databaseSchemaSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const databaseSchemaExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.database-schema',
  name: 'Database, SQL Dialects & API Schema Pack',
  version: '1.0.0',
  description:
    'Complete relational database and API contract suite covering PostgreSQL, MySQL, SQLite, T-SQL, GraphQL SDL, and Prisma Schema.',
  author: 'indoctrinatedrecluse',
  category: 'Tools',
  iconName: 'Server',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: databaseSchemaSnippets.length,
  languages: [
    {
      id: 'sql',
      extensions: ['.sql', '.psql', '.dsql'],
      aliases: ['SQL', 'PostgreSQL', 'MySQL', 'SQLite'],
      snippets: SQL_SNIPPETS,
    },
    {
      id: 'graphql',
      extensions: ['.graphql', '.gql'],
      aliases: ['GraphQL', 'graphql', 'SDL'],
      snippets: GRAPHQL_SNIPPETS,
    },
    {
      id: 'prisma',
      extensions: ['.prisma'],
      aliases: ['Prisma Schema', 'prisma'],
      snippets: PRISMA_SNIPPETS,
    },
  ],
}

let isRegistered = false

export function registerDatabaseSchemaExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  const registerForLang = (lang: string, snippetsList: typeof SQL_SNIPPETS) => {
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
                detail: s.detail || 'Database / Schema Snippet',
                documentation: s.documentation,
                insertText: s.insertText,
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              })),
            }
          } catch (innerErr) {
            notificationService.notifyError(
              'Database & Schema Engine',
              `Completion provider failed for ${lang}: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`
            )
            return { suggestions: [] }
          }
        },
      })
    } catch (err) {
      notificationService.notifyError(
        'Database & Schema Engine',
        `Failed to register language provider for ${lang}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  registerForLang('sql', SQL_SNIPPETS)
  registerForLang('graphql', GRAPHQL_SNIPPETS)
  registerForLang('prisma', PRISMA_SNIPPETS)

  triggerDatabaseToolchainCheck()
}

export function triggerDatabaseToolchainCheck() {
  let unsubscribe: (() => void) | undefined
  unsubscribe = toolchainService.onDidDetect((results) => {
    const sqlToolchain = results.find((tc) => tc.language === 'sql')
    if (sqlToolchain) {
      if (!sqlToolchain.found) {
        notificationService.notifyMissingToolchain(
          'Database & Schema Suite',
          'psql / mysql / sqlite3',
          'https://www.postgresql.org/download/'
        )
      }
      unsubscribe?.()
    }
  })

  toolchainService.detectOne('toolchain.sql').catch(() => {})
}

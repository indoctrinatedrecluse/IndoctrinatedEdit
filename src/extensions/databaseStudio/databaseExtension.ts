import type * as monaco from 'monaco-editor'
import { ExtensionManifest, SnippetDefinition } from '../extensionTypes'
import { notificationService } from '../../services/notificationService'

export const sqlSnippets: SnippetDefinition[] = [
  {
    label: 'sql-select-all',
    documentation: 'Select all columns from table with limit',
    insertText: 'SELECT * FROM ${1:table_name} LIMIT ${2:50};$0',
  },
  {
    label: 'sql-select-where',
    documentation: 'Select columns with filtering condition',
    insertText: 'SELECT ${1:id}, ${2:name} FROM ${3:table_name} WHERE ${4:condition} = ${5:\'value\'};$0',
  },
  {
    label: 'sql-join-inner',
    documentation: 'Inner Join two tables on primary/foreign key',
    insertText: 'SELECT ${1:a.*}, ${2:b.*}\nFROM ${3:table_a} a\nINNER JOIN ${4:table_b} b ON a.${5:id} = b.${6:a_id}\nWHERE ${7:a.status} = ${8:\'active\'};$0',
  },
  {
    label: 'sql-join-left',
    documentation: 'Left Outer Join with null handling',
    insertText: 'SELECT ${1:a.*}, ${2:b.*}\nFROM ${3:table_a} a\nLEFT JOIN ${4:table_b} b ON a.${5:id} = b.${6:a_id};$0',
  },
  {
    label: 'sql-group-by-count',
    documentation: 'Group by with aggregate COUNT and ORDER BY',
    insertText: 'SELECT ${1:category_id}, COUNT(*) AS ${2:total_count}\nFROM ${3:products}\nGROUP BY ${1:category_id}\nORDER BY ${2:total_count} DESC;$0',
  },
  {
    label: 'sql-insert-row',
    documentation: 'Insert single record into table',
    insertText: 'INSERT INTO ${1:table_name} (${2:col1}, ${3:col2})\nVALUES (${4:\'val1\'}, ${5:\'val2\'});$0',
  },
  {
    label: 'sql-update-where',
    documentation: 'Update table columns with safety WHERE condition',
    insertText: 'UPDATE ${1:table_name}\nSET ${2:status} = ${3:\'completed\'}\nWHERE ${4:id} = ${5:1};$0',
  },
  {
    label: 'sql-create-table',
    documentation: 'Create structured SQL table with primary key and timestamps',
    insertText: 'CREATE TABLE IF NOT EXISTS ${1:table_name} (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  ${2:title} VARCHAR(120) NOT NULL,\n  ${3:status} VARCHAR(32) DEFAULT \'active\',\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);$0',
  },
]

export const databaseExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.database-studio',
  name: 'Database Studio & SQL Query Runner',
  version: '1.0.0',
  description: 'Visual database schema explorer, table introspection, and interactive SQL query runner with tabular results grid and right-dock integration.',
  author: 'indoctrinatedrecluse',
  category: 'Tools',
  iconName: 'Database',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: sqlSnippets.length,
  languages: [
    {
      id: 'sql',
      extensions: ['.sql', '.psql', '.dbschema'],
      aliases: ['SQL', 'Postgres', 'SQLite', 'MySQL'],
      snippets: sqlSnippets,
    },
  ],
}

let isRegistered = false

export function registerDatabaseExtension(monacoInstance?: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  try {
    monacoInstance.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        const suggestions: monaco.languages.CompletionItem[] = sqlSnippets.map((s) => ({
          label: s.label,
          kind: monacoInstance.languages.CompletionItemKind.Snippet,
          documentation: s.documentation,
          insertText: s.insertText,
          insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        }))

        return { suggestions }
      },
    })
  } catch (err) {
    console.warn('Could not register Database Studio extension:', err)
    notificationService.addNotification({
      type: 'warning',
      title: 'Database Extension Warning',
      message: 'Database Studio Monaco language provider fallback.',
    })
  }
}

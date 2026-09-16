import type * as monaco from 'monaco-editor'
import { ExtensionManifest, SnippetDefinition } from '../extensionTypes'
import { notificationService } from '../../services/notificationService'

export const httpSnippets: SnippetDefinition[] = [
  {
    label: 'http-get',
    documentation: 'Standard HTTP GET Request',
    insertText: 'GET ${1:https://api.example.com/v1/resource}\nAccept: application/json\nAuthorization: Bearer ${2:{{token}}}\n$0',
  },
  {
    label: 'http-post-json',
    documentation: 'HTTP POST Request with JSON Body payload',
    insertText: 'POST ${1:https://api.example.com/v1/resource}\nContent-Type: application/json\nAuthorization: Bearer ${2:{{token}}}\n\n{\n  "${3:key}": "${4:value}"\n}\n$0',
  },
  {
    label: 'http-graphql',
    documentation: 'GraphQL Query Request template',
    insertText: 'POST ${1:https://api.example.com/graphql}\nContent-Type: application/json\n\n{\n  "query": "query ${2:GetData} { ${3:users} { id name email } }"\n}\n$0',
  },
  {
    label: 'http-put-json',
    documentation: 'HTTP PUT Resource update request',
    insertText: 'PUT ${1:https://api.example.com/v1/resource}/${2:id}\nContent-Type: application/json\nAuthorization: Bearer ${3:{{token}}}\n\n{\n  "${4:field}": "${5:updatedValue}"\n}\n$0',
  },
  {
    label: 'http-delete',
    documentation: 'HTTP DELETE Resource request',
    insertText: 'DELETE ${1:https://api.example.com/v1/resource}/${2:id}\nAuthorization: Bearer ${3:{{token}}}\n$0',
  },
]

export const restClientExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.rest-client',
  name: 'REST & GraphQL API Client',
  version: '1.0.0',
  description: 'In-editor HTTP/REST and GraphQL API runner with dynamic environment variables, JSON inspector, latency telemetry, and auxiliary dock integration.',
  author: 'indoctrinatedrecluse',
  category: 'Tools',
  iconName: 'Globe',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: httpSnippets.length,
  languages: [
    {
      id: 'http',
      extensions: ['.http', '.rest'],
      aliases: ['HTTP', 'REST', 'REST Client'],
      snippets: httpSnippets,
    },
  ],
}

let isRegistered = false

export function registerRestClientExtension(monacoInstance?: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  try {
    monacoInstance.languages.registerCompletionItemProvider('http', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        const suggestions: monaco.languages.CompletionItem[] = httpSnippets.map((s) => ({
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
    console.warn('Could not register REST Client extension:', err)
    notificationService.addNotification({
      type: 'warning',
      title: 'REST Client Extension Warning',
      message: 'REST Client Monaco language provider fallback.',
    })
  }
}

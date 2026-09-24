import type * as monaco from 'monaco-editor'
import { ExtensionManifest, SnippetDefinition } from '../extensionTypes'

export const antigravitySnippets: SnippetDefinition[] = [
  {
    label: 'antigravity-agent-init',
    documentation: 'Initialize a Google Antigravity Agent using Personal Google Subscription',
    insertText: [
      'from google.antigravity import Agent, LocalAgentConfig',
      '',
      'agent = Agent(',
      '    model="${1:gemini-2.5-pro}",',
      '    config=LocalAgentConfig(',
      '        system_instruction="${2:You are a high-speed coding assistant with 1M context.}",',
      '        agent_behavior="autonomous"',
      '    )',
      ')',
      '',
      'async def run():',
      '    async for chunk in agent.run_stream("${3:Analyze workspace architecture}"):',
      '        print(chunk.text, end="")',
      '$0',
    ].join('\n'),
  },
  {
    label: 'antigravity-mcp-tool',
    documentation: 'Register a tool with the Google Antigravity Agent',
    insertText: [
      '@agent.tool',
      'def ${1:execute_tool}(${2:param}: str) -> str:',
      '    """${3:Tool description for the agent reasoning engine.}"""',
      '    return f"Processed: {${2:param}}"',
      '$0',
    ].join('\n'),
  },
]

export const antigravityExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.antigravity',
  name: 'Google Antigravity Suite & Agent Subsystem',
  version: '4.9.0',
  description:
    'Official Antigravity extension connecting personal Google accounts to Antigravity subscriptions with zero API keys, Python SDK backend sidecar, and multi-model agent intelligence.',
  author: 'indoctrinatedrecluse',
  category: 'AI',
  iconName: 'Sparkles',
  status: 'Active',
  type: 'Built-in',
  languages: [
    {
      id: 'python',
      extensions: ['.py', '.pyw'],
      snippets: antigravitySnippets,
    },
  ],
  snippetsCount: antigravitySnippets.length,
}

let isRegistered = false

export function registerAntigravityExtension(monacoInstance?: typeof monaco): void {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  // Monaco completion items for Python Antigravity SDK and AGY Agents
  try {
    monacoInstance.languages.registerCompletionItemProvider('python', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        const suggestions: monaco.languages.CompletionItem[] = antigravitySnippets.map((s) => ({
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
    console.warn('[AntigravityExtension] Monaco completion registration warning:', err)
  }
}

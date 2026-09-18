import type * as monaco from 'monaco-editor'
import { ExtensionManifest, SnippetDefinition } from '../extensionTypes'

export const mcpSnippets: SnippetDefinition[] = [
  {
    label: 'mcp-config-stdio',
    documentation: 'Standard stdio MCP server entry in mcp_config.json',
    insertText: '"${1:server_name}": {\n  "command": "${2:npx}",\n  "args": ["-y", "${3:@modelcontextprotocol/server-filesystem}", "${4:.}"]\n}$0',
  },
  {
    label: 'mcp-config-sse',
    documentation: 'Remote SSE / HTTP endpoint MCP server configuration',
    insertText: '"${1:remote_mcp}": {\n  "url": "${2:http://localhost:8000/sse}",\n  "headers": {\n    "Authorization": "Bearer ${3:YOUR_TOKEN}"\n  }\n}$0',
  },
  {
    label: 'mcp-config-full',
    documentation: 'Complete multi-server mcp_config.json configuration file',
    insertText: '{\n  "mcpServers": {\n    "${1:filesystem}": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]\n    },\n    "${2:git}": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-git"]\n    },\n    "${3:memory}": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-memory"]\n    }\n  }\n}$0',
  },
  {
    label: 'mcp-server-ts',
    documentation: 'TypeScript MCP stdio server boilerplate with tools and resources',
    insertText: 'import { Server } from "@modelcontextprotocol/sdk/server/index.js";\nimport { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";\nimport {\n  CallToolRequestSchema,\n  ListToolsRequestSchema,\n} from "@modelcontextprotocol/sdk/types.js";\n\nconst server = new Server(\n  {\n    name: "${1:custom-mcp-server}",\n    version: "1.0.0",\n  },\n  {\n    capabilities: {\n      tools: {},\n      resources: {},\n    },\n  }\n);\n\nserver.setRequestHandler(ListToolsRequestSchema, async () => ({\n  tools: [\n    {\n      name: "${2:analyze_code}",\n      description: "${3:Performs deep static code analysis and lint checking}",\n      inputSchema: {\n        type: "object",\n        properties: {\n          code: { type: "string", description: "Source code to analyze" },\n        },\n        required: ["code"],\n      },\n    },\n  ],\n}));\n\nserver.setRequestHandler(CallToolRequestSchema, async (request) => {\n  if (request.params.name === "${2:analyze_code}") {\n    const code = String(request.params.arguments?.code || "");\n    return {\n      content: [{ type: "text", text: `Analyzed ${code.length} characters cleanly.` }],\n    };\n  }\n  throw new Error(`Unknown tool: ${request.params.name}`);\n});\n\nasync function main() {\n  const transport = new StdioServerTransport();\n  await server.connect(transport);\n}\n\nmain().catch(console.error);\n$0',
  },
  {
    label: 'mcp-server-python',
    documentation: 'Python FastMCP server boilerplate with decorated tools',
    insertText: 'from mcp.server.fastmcp import FastMCP\n\nmcp = FastMCP("${1:Demo-MCP-Server}")\n\n@mcp.tool()\ndef ${2:calculate_metrics}(data: str) -> str:\n    """${3:Calculates performance metrics for given input data.}"""\n    return f"Calculated metrics for: {data}"\n\nif __name__ == "__main__":\n    mcp.run()$0',
  },
]

export const mcpExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.mcp-studio',
  name: 'Model Context Protocol (MCP) & AI Agent Studio',
  version: '1.0.0',
  description: 'Comprehensive MCP server management, stdio/SSE/builtin client studio, live tool tester, schema inspector, and autonomous AI agent tool execution bridge.',
  author: 'indoctrinatedrecluse',
  category: 'Tools',
  iconName: 'Server',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: mcpSnippets.length,
  languages: [
    {
      id: 'json',
      extensions: ['.json', '.mcp.json'],
      aliases: ['JSON', 'MCP Config'],
      snippets: mcpSnippets,
    },
    {
      id: 'typescript',
      extensions: ['.ts', '.tsx'],
      aliases: ['TypeScript'],
      snippets: mcpSnippets.filter((s) => s.label.startsWith('mcp-server-ts')),
    },
    {
      id: 'python',
      extensions: ['.py'],
      aliases: ['Python'],
      snippets: mcpSnippets.filter((s) => s.label.startsWith('mcp-server-py')),
    },
  ],
}

let isRegistered = false

export function registerMcpExtension(monacoInstance?: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  try {
    monacoInstance.languages.registerCompletionItemProvider('json', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        const suggestions: monaco.languages.CompletionItem[] = mcpSnippets.map((s) => ({
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
    console.warn('Could not register MCP Extension completion items:', err)
  }
}

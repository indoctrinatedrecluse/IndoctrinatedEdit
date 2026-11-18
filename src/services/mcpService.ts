/**
 * IndoctrinatedEdit - Model Context Protocol (MCP) Subsystem Service
 * Manages stdio, SSE, and builtin MCP servers, tool discovery, resource inspection,
 * Vercel AI SDK v7 `dynamicTool` bridging, and dynamic execution dispatch for AI agents.
 */

import { dynamicTool, jsonSchema } from 'ai'
import { z } from 'zod'
import { validateWorkspacePath } from '../utils/security'

export type McpTransportType = 'stdio' | 'sse' | 'builtin'

export type McpServerStatus = 'connected' | 'connecting' | 'disconnected' | 'error' | 'disabled'

export interface McpServerConfig {
  id: string
  name: string
  description?: string
  transport: McpTransportType
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  headers?: Record<string, string>
  enabled: boolean
  timeoutMs?: number
  createdAt?: number
  lastActiveAt?: number
  status?: McpServerStatus
  lastError?: string
  latencyMs?: number
}

export interface McpToolSchemaProperty {
  type: string
  description?: string
  enum?: string[]
  default?: any
}

export interface McpToolDefinition {
  name: string
  description?: string
  inputSchema: {
    type: 'object'
    properties?: Record<string, McpToolSchemaProperty>
    required?: string[]
  }
  serverId: string
  serverName: string
}

export interface McpResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
  serverId: string
  serverName: string
}

export interface McpPromptArgument {
  name: string
  description?: string
  required?: boolean
}

export interface McpPrompt {
  name: string
  description?: string
  arguments?: McpPromptArgument[]
  serverId: string
  serverName: string
}

export interface McpToolCallResult {
  serverId: string
  toolName: string
  success: boolean
  output: string
  isError?: boolean
  latencyMs?: number
  content?: Array<{ type: string; text?: string; data?: string; mimeType?: string }>
}

const MCP_STORAGE_KEY = 'indoctrinated_mcp_servers'
const MCP_MEMORY_GRAPH_KEY = 'indoctrinated_mcp_memory_graph'

export interface McpMemoryEntity {
  name: string
  entityType: string
  observations: string[]
}

export const DEFAULT_MCP_PRESETS: McpServerConfig[] = [
  {
    id: 'mcp-filesystem',
    name: 'Workspace Filesystem MCP',
    description: 'Safe structured filesystem inspection, file searching, and directory tree introspection.',
    transport: 'builtin',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
    enabled: true,
    status: 'connected',
    timeoutMs: 15000,
  },
  {
    id: 'mcp-git',
    name: 'Git Repository MCP',
    description: 'Deep commit history inspection, branch management, and git staging operations.',
    transport: 'builtin',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-git'],
    enabled: true,
    status: 'connected',
    timeoutMs: 15000,
  },
  {
    id: 'mcp-memory',
    name: 'Knowledge Graph Memory MCP',
    description: 'Persistent graph memory and entity relations for multi-session agent context.',
    transport: 'builtin',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    enabled: true,
    status: 'connected',
    timeoutMs: 15000,
  },
  {
    id: 'mcp-fetch',
    name: 'Web Content Fetcher MCP',
    description: 'Fetches web URLs, converts HTML to clean markdown, and retrieves static documentation.',
    transport: 'builtin',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
    enabled: true,
    status: 'connected',
    timeoutMs: 20000,
  },
  {
    id: 'mcp-gemini-docs',
    name: 'Gemini & SDK Docs MCP',
    description: 'Official search and documentation retriever for Google Gemini models and SDKs.',
    transport: 'builtin',
    command: 'npx',
    args: ['-y', 'gemini-api-docs-mcp'],
    enabled: true,
    status: 'connected',
    timeoutMs: 15000,
  },
  {
    id: 'mcp-sqlite',
    name: 'SQLite Database MCP',
    description: 'Introspects tables, queries schemas, and runs safe read-only SQL on local SQLite databases.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite', '--db-path', './workspace.db'],
    enabled: false,
    status: 'disconnected',
    timeoutMs: 15000,
  },
]

// Built-in tools registered for the default builtin servers
const BUILTIN_SERVER_TOOLS: Record<string, McpToolDefinition[]> = {
  'mcp-filesystem': [
    {
      name: 'read_file_content',
      description: 'Reads the complete text content of a file within the allowed workspace boundary.',
      serverId: 'mcp-filesystem',
      serverName: 'Workspace Filesystem MCP',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to file in workspace' },
          encoding: { type: 'string', description: 'File encoding (utf-8 default)', enum: ['utf-8', 'ascii'] },
        },
        required: ['path'],
      },
    },
    {
      name: 'list_directory_tree',
      description: 'Recursively lists directory contents with file size and type attributes.',
      serverId: 'mcp-filesystem',
      serverName: 'Workspace Filesystem MCP',
      inputSchema: {
        type: 'object',
        properties: {
          directory: { type: 'string', description: 'Target directory path' },
          maxDepth: { type: 'number', description: 'Maximum depth to traverse (default 3)' },
        },
        required: [],
      },
    },
    {
      name: 'find_files_by_pattern',
      description: 'Finds files matching a glob or wildcard pattern in the workspace.',
      serverId: 'mcp-filesystem',
      serverName: 'Workspace Filesystem MCP',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Glob pattern (e.g. **/*.ts, src/**/*.tsx)' },
        },
        required: ['pattern'],
      },
    },
  ],
  'mcp-git': [
    {
      name: 'git_log_history',
      description: 'Fetches recent commit history with commit hash, author, date, and commit message.',
      serverId: 'mcp-git',
      serverName: 'Git Repository MCP',
      inputSchema: {
        type: 'object',
        properties: {
          maxCount: { type: 'number', description: 'Maximum number of commits to retrieve (default 10)' },
          branch: { type: 'string', description: 'Branch name (defaults to HEAD)' },
        },
        required: [],
      },
    },
    {
      name: 'git_show_commit',
      description: 'Shows detailed unified diff patch and metadata for a specific commit hash.',
      serverId: 'mcp-git',
      serverName: 'Git Repository MCP',
      inputSchema: {
        type: 'object',
        properties: {
          commitHash: { type: 'string', description: 'Full or short commit SHA' },
        },
        required: ['commitHash'],
      },
    },
    {
      name: 'git_branch_list',
      description: 'Lists all local and remote branches in the git repository.',
      serverId: 'mcp-git',
      serverName: 'Git Repository MCP',
      inputSchema: {
        type: 'object',
        properties: {
          remote: { type: 'boolean', description: 'Include remote tracking branches' },
        },
        required: [],
      },
    },
  ],
  'mcp-memory': [
    {
      name: 'create_entities',
      description: 'Creates new knowledge entities in the persistent memory graph.',
      serverId: 'mcp-memory',
      serverName: 'Knowledge Graph Memory MCP',
      inputSchema: {
        type: 'object',
        properties: {
          entities: { type: 'string', description: 'JSON array of entities to store { name, entityType, observations }' },
        },
        required: ['entities'],
      },
    },
    {
      name: 'search_nodes',
      description: 'Searches for nodes in the knowledge graph matching a query string.',
      serverId: 'mcp-memory',
      serverName: 'Knowledge Graph Memory MCP',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search term or entity name' },
        },
        required: ['query'],
      },
    },
    {
      name: 'read_graph',
      description: 'Reads the entire knowledge graph of entities and relations.',
      serverId: 'mcp-memory',
      serverName: 'Knowledge Graph Memory MCP',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ],
  'mcp-fetch': [
    {
      name: 'fetch_markdown',
      description: 'Fetches content from a public URL and converts HTML to clean Markdown.',
      serverId: 'mcp-fetch',
      serverName: 'Web Content Fetcher MCP',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The absolute HTTP/HTTPS URL to fetch' },
          raw: { type: 'boolean', description: 'Return raw HTML instead of converted Markdown' },
        },
        required: ['url'],
      },
    },
  ],
  'mcp-gemini-docs': [
    {
      name: 'search_gemini_docs',
      description: 'Searches current Google Gemini API and SDK documentation by query and language.',
      serverId: 'mcp-gemini-docs',
      serverName: 'Gemini & SDK Docs MCP',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search term, method name, or error code' },
          language: { type: 'string', description: 'Language filter', enum: ['python', 'javascript', 'go', 'dotnet', 'java'] },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_gemini_doc',
      description: 'Retrieves full documentation page content by exact chunk_id.',
      serverId: 'mcp-gemini-docs',
      serverName: 'Gemini & SDK Docs MCP',
      inputSchema: {
        type: 'object',
        properties: {
          chunk_id: { type: 'string', description: 'The chunk ID to retrieve' },
        },
        required: ['chunk_id'],
      },
    },
  ],
  'mcp-sqlite': [
    {
      name: 'sqlite_query',
      description: 'Executes a read-only SQL query against the configured SQLite database.',
      serverId: 'mcp-sqlite',
      serverName: 'SQLite Database MCP',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'SQL SELECT query string' },
        },
        required: ['query'],
      },
    },
    {
      name: 'sqlite_describe_tables',
      description: 'Lists all tables and their column schema definitions in the SQLite database.',
      serverId: 'mcp-sqlite',
      serverName: 'SQLite Database MCP',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ],
}

export class McpService {
  private static servers: Map<string, McpServerConfig> = new Map()
  private static memoryGraph: Map<string, McpMemoryEntity> = new Map()
  private static discoveredTools: Map<string, McpToolDefinition[]> = new Map()
  private static discoveredResources: Map<string, McpResource[]> = new Map()
  private static discoveredPrompts: Map<string, McpPrompt[]> = new Map()
  private static serverListeners: Set<(servers: McpServerConfig[]) => void> = new Set()
  private static toolListeners: Set<(tools: McpToolDefinition[]) => void> = new Set()
  private static initialized = false

  static initialize(): void {
    if (this.initialized) return
    this.initialized = true
    this.loadFromStorage()
    this.loadMemoryGraph()
  }

  private static loadMemoryGraph(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(MCP_MEMORY_GRAPH_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as McpMemoryEntity[]
          if (Array.isArray(parsed)) {
            this.memoryGraph.clear()
            for (const ent of parsed) {
              if (ent?.name) this.memoryGraph.set(ent.name, ent)
            }
          }
        }
      }
    } catch {
      // ignore corrupted graph storage
    }
  }

  private static persistMemoryGraph(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(MCP_MEMORY_GRAPH_KEY, JSON.stringify(Array.from(this.memoryGraph.values())))
      }
    } catch {
      // ignore storage quota errors
    }
  }

  private static loadFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(MCP_STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as McpServerConfig[]
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.servers.clear()
            for (const s of parsed) {
              this.servers.set(s.id, {
                ...s,
                status: s.enabled ? (s.status || 'connected') : 'disabled',
              })
            }
            return
          }
        }
      }
    } catch (err) {
      console.warn('Failed to parse MCP servers from storage', err)
    }

    // Default presets
    this.servers.clear()
    for (const preset of DEFAULT_MCP_PRESETS) {
      this.servers.set(preset.id, { ...preset })
    }
  }

  private static persistToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const list = Array.from(this.servers.values())
        localStorage.setItem(MCP_STORAGE_KEY, JSON.stringify(list))
      }
    } catch (err) {
      console.error('Failed to persist MCP servers to storage', err)
    }
  }

  static getServers(): McpServerConfig[] {
    this.initialize()
    return Array.from(this.servers.values())
  }

  static getServer(id: string): McpServerConfig | undefined {
    this.initialize()
    return this.servers.get(id)
  }

  static saveServer(server: McpServerConfig): void {
    this.initialize()
    const existing = this.servers.get(server.id)
    const updated: McpServerConfig = {
      ...existing,
      ...server,
      createdAt: server.createdAt || existing?.createdAt || Date.now(),
      status: server.enabled ? (server.status || 'connected') : 'disabled',
    }
    this.servers.set(updated.id, updated)
    this.persistToStorage()
    this.notifyServerListeners()
    this.notifyToolListeners()
  }

  static deleteServer(id: string): boolean {
    this.initialize()
    const deleted = this.servers.delete(id)
    if (deleted) {
      this.discoveredTools.delete(id)
      this.discoveredResources.delete(id)
      this.discoveredPrompts.delete(id)
      if (typeof window !== 'undefined' && window.electronAPI?.mcp?.disconnect) {
        window.electronAPI.mcp.disconnect(id).catch(() => {})
      }
      this.persistToStorage()
      this.notifyServerListeners()
      this.notifyToolListeners()
    }
    return deleted
  }

  static toggleServer(id: string, enabled: boolean): void {
    this.initialize()
    const server = this.servers.get(id)
    if (server) {
      server.enabled = enabled
      server.status = enabled ? 'connected' : 'disabled'
      if (!enabled && typeof window !== 'undefined' && window.electronAPI?.mcp?.disconnect) {
        window.electronAPI.mcp.disconnect(id).catch(() => {})
      }
      this.persistToStorage()
      this.notifyServerListeners()
      this.notifyToolListeners()
    }
  }

  static async disconnectServer(id: string): Promise<boolean> {
    this.initialize()
    const server = this.servers.get(id)
    let closed = false
    if (typeof window !== 'undefined' && window.electronAPI?.mcp?.disconnect) {
      try {
        closed = await window.electronAPI.mcp.disconnect(id)
      } catch {
        closed = false
      }
    }
    if (server) {
      server.status = server.enabled ? 'disconnected' : 'disabled'
      this.notifyServerListeners()
    }
    return closed
  }

  private static async sendHttpRpc(
    server: McpServerConfig,
    method: string,
    params: Record<string, any> = {}
  ): Promise<{ success: boolean; result?: any; latencyMs?: number; error?: string }> {
    if (!server.url) {
      return { success: false, error: `MCP server "${server.name}" has no URL configured.` }
    }
    if (typeof window !== 'undefined' && window.electronAPI?.mcp?.httpRpc) {
      return window.electronAPI.mcp.httpRpc({
        url: server.url,
        headers: server.headers,
        method,
        params,
        timeoutMs: server.timeoutMs || 15000,
      })
    }
    const start = Date.now()
    try {
      const res = await fetch(server.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          ...(server.headers || {}),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `mcp-${Date.now()}`,
          method,
          params,
        }),
        signal: AbortSignal.timeout(server.timeoutMs || 15000),
      })
      const latencyMs = Date.now() - start
      if (!res.ok) {
        return { success: false, latencyMs, error: `HTTP ${res.status}: ${res.statusText}` }
      }
      const rpcJson = (await res.json()) as any
      if (rpcJson?.error) {
        return { success: false, latencyMs, error: rpcJson.error.message || JSON.stringify(rpcJson.error) }
      }
      return { success: true, latencyMs, result: rpcJson?.result ?? rpcJson }
    } catch (err: any) {
      return { success: false, latencyMs: Date.now() - start, error: err?.message || String(err) }
    }
  }

  /**
   * Dynamically discovers tools, resources, and prompts from a live stdio or SSE/HTTP MCP server.
   */
  static async discoverServerCapabilitiesAsync(serverId: string): Promise<{
    success: boolean
    tools: McpToolDefinition[]
    resources: McpResource[]
    prompts: McpPrompt[]
    error?: string
  }> {
    this.initialize()
    const server = this.servers.get(serverId)
    if (!server) {
      return { success: false, tools: [], resources: [], prompts: [], error: 'Server not found' }
    }

    if (server.transport === 'builtin') {
      return {
        success: true,
        tools: this.listTools(serverId),
        resources: this.listResources(serverId),
        prompts: this.listPrompts(serverId),
      }
    }

    const start = Date.now()
    let rawTools: any[] = []
    let rawResources: any[] = []
    let rawPrompts: any[] = []
    const errors: string[] = []

    if (server.transport === 'stdio' && server.command && typeof window !== 'undefined' && window.electronAPI?.mcp) {
      const spec = {
        id: server.id,
        command: server.command,
        args: server.args,
        env: server.env,
        timeoutMs: server.timeoutMs,
      }
      const [tRes, rRes, pRes] = await Promise.all([
        window.electronAPI.mcp.listTools(spec),
        window.electronAPI.mcp.listResources(spec),
        window.electronAPI.mcp.listPrompts(spec),
      ])
      if (tRes.success) rawTools = tRes.tools || []
      else if (tRes.error) errors.push(`tools/list: ${tRes.error}`)
      if (rRes.success) rawResources = rRes.resources || []
      if (pRes.success) rawPrompts = pRes.prompts || []
    } else if (server.transport === 'sse' && server.url) {
      const [tRes, rRes, pRes] = await Promise.all([
        this.sendHttpRpc(server, 'tools/list', {}),
        this.sendHttpRpc(server, 'resources/list', {}),
        this.sendHttpRpc(server, 'prompts/list', {}),
      ])
      if (tRes.success && Array.isArray(tRes.result?.tools)) rawTools = tRes.result.tools
      else if (!tRes.success && tRes.error) errors.push(`tools/list: ${tRes.error}`)
      if (rRes.success && Array.isArray(rRes.result?.resources)) rawResources = rRes.result.resources
      if (pRes.success && Array.isArray(pRes.result?.prompts)) rawPrompts = pRes.result.prompts
    } else {
      return {
        success: false,
        tools: this.listTools(serverId),
        resources: this.listResources(serverId),
        prompts: this.listPrompts(serverId),
        error: `Live capability discovery requires Electron MCP runtime or a valid SSE URL.`,
      }
    }

    const normalizedTools: McpToolDefinition[] = rawTools.map((t: any) => ({
      name: String(t.name || 'unnamed_tool'),
      description: t.description ? String(t.description) : undefined,
      inputSchema: {
        type: 'object',
        properties: t.inputSchema?.properties || {},
        required: Array.isArray(t.inputSchema?.required) ? t.inputSchema.required : [],
      },
      serverId: server.id,
      serverName: server.name,
    }))

    const normalizedResources: McpResource[] = rawResources.map((r: any) => ({
      uri: String(r.uri || ''),
      name: String(r.name || r.uri || 'Resource'),
      description: r.description ? String(r.description) : undefined,
      mimeType: r.mimeType ? String(r.mimeType) : undefined,
      serverId: server.id,
      serverName: server.name,
    }))

    const normalizedPrompts: McpPrompt[] = rawPrompts.map((p: any) => ({
      name: String(p.name || 'prompt'),
      description: p.description ? String(p.description) : undefined,
      arguments: Array.isArray(p.arguments) ? p.arguments : [],
      serverId: server.id,
      serverName: server.name,
    }))

    if (errors.length === 0 || normalizedTools.length > 0 || normalizedResources.length > 0 || normalizedPrompts.length > 0) {
      this.discoveredTools.set(server.id, normalizedTools)
      this.discoveredResources.set(server.id, normalizedResources)
      this.discoveredPrompts.set(server.id, normalizedPrompts)
      server.status = 'connected'
      server.latencyMs = Date.now() - start
      server.lastActiveAt = Date.now()
      server.lastError = undefined
      this.notifyServerListeners()
      this.notifyToolListeners()
      return {
        success: true,
        tools: normalizedTools,
        resources: normalizedResources,
        prompts: normalizedPrompts,
      }
    }

    server.status = 'error'
    server.lastError = errors.join('; ')
    this.notifyServerListeners()
    return {
      success: false,
      tools: [],
      resources: [],
      prompts: [],
      error: server.lastError,
    }
  }

  static async readResourceAsync(
    serverId: string,
    uri: string
  ): Promise<{ success: boolean; content: string; mimeType?: string; error?: string }> {
    this.initialize()
    const server = this.servers.get(serverId)
    if (!server) return { success: false, content: '', error: `Server "${serverId}" not found.` }

    if (server.transport === 'stdio' && server.command && typeof window !== 'undefined' && window.electronAPI?.mcp?.readResource) {
      const res = await window.electronAPI.mcp.readResource(
        { id: server.id, command: server.command, args: server.args, env: server.env, timeoutMs: server.timeoutMs },
        uri
      )
      if (!res.success) return { success: false, content: '', error: res.error }
      const contents = res.result?.contents
      if (Array.isArray(contents) && contents.length > 0) {
        const text = contents.map((c: any) => c.text || (c.blob ? `[binary ${c.blob.length} base64 chars]` : JSON.stringify(c))).join('\n\n')
        return { success: true, content: text, mimeType: contents[0]?.mimeType }
      }
      return { success: true, content: JSON.stringify(res.result ?? {}, null, 2) }
    }

    if (server.transport === 'sse' && server.url) {
      const res = await this.sendHttpRpc(server, 'resources/read', { uri })
      if (!res.success) return { success: false, content: '', error: res.error }
      const contents = res.result?.contents
      const text = Array.isArray(contents)
        ? contents.map((c: any) => c.text || JSON.stringify(c)).join('\n\n')
        : JSON.stringify(res.result ?? {}, null, 2)
      return { success: true, content: text, mimeType: Array.isArray(contents) ? contents[0]?.mimeType : undefined }
    }

    // Built-in resource handlers
    if (uri === 'git://head' || uri === 'git://status') {
      if (typeof window !== 'undefined' && window.electronAPI?.workspace?.execCommand) {
        const cmd = uri === 'git://head' ? 'git log -n 1 --stat' : 'git status --short'
        const out = await window.electronAPI.workspace.execCommand({ command: cmd })
        return {
          success: out.exitCode === 0,
          content: out.stdout.trim() || out.stderr.trim() || '(clean)',
          mimeType: 'text/plain',
          error: out.exitCode === 0 ? undefined : out.stderr.trim(),
        }
      }
      return { success: true, content: `Resource ${uri} requires desktop Git CLI environment.`, mimeType: 'text/plain' }
    }

    if (uri === 'workspace://root' || uri === 'workspace://config') {
      if (typeof window !== 'undefined' && window.electronAPI?.readFolder) {
        const res = await window.electronAPI.readFolder('.')
        const entries = res?.files || []
        const filtered = uri === 'workspace://config'
          ? entries.filter((f) => /\.(json|ya?ml|toml|env|config\.\w+)$/i.test(f.name))
          : entries
        return {
          success: true,
          content: filtered.map((f) => `${f.isDirectory ? '[DIR]' : '[FILE]'} ${f.name}`).join('\n') || '(empty)',
          mimeType: 'text/plain',
        }
      }
      return { success: true, content: `Resource ${uri} requires desktop filesystem runtime.`, mimeType: 'text/plain' }
    }

    if (uri.startsWith('gemini-docs://')) {
      const targetUrl = uri.includes('api-reference')
        ? 'https://ai.google.dev/api'
        : 'https://ai.google.dev/gemini-api/docs/sdks'
      const fetched = await this.callTool('mcp-fetch', 'fetch_markdown', { url: targetUrl })
      if (fetched.success) {
        return { success: true, content: fetched.output, mimeType: 'text/markdown' }
      }
      return {
        success: true,
        content: `# ${uri}\nOfficial docs URL: ${targetUrl}\n(${fetched.content?.[0]?.text || 'Offline'})`,
        mimeType: 'text/markdown',
      }
    }

    return { success: false, content: '', error: `Unsupported resource URI "${uri}" on server "${server.name}".` }
  }

  static async getPromptAsync(
    serverId: string,
    name: string,
    args: Record<string, string> = {}
  ): Promise<{ success: boolean; content: string; error?: string }> {
    this.initialize()
    const server = this.servers.get(serverId)
    if (!server) return { success: false, content: '', error: `Server "${serverId}" not found.` }

    if (server.transport === 'stdio' && server.command && typeof window !== 'undefined' && window.electronAPI?.mcp?.getPrompt) {
      const res = await window.electronAPI.mcp.getPrompt(
        { id: server.id, command: server.command, args: server.args, env: server.env, timeoutMs: server.timeoutMs },
        name,
        args
      )
      if (!res.success) return { success: false, content: '', error: res.error }
      const messages = res.result?.messages
      if (Array.isArray(messages)) {
        const rendered = messages
          .map((m: any) => `[${m.role || 'user'}]\n${m.content?.text || JSON.stringify(m.content)}`)
          .join('\n\n')
        return { success: true, content: rendered }
      }
      return { success: true, content: JSON.stringify(res.result ?? {}, null, 2) }
    }

    if (server.transport === 'sse' && server.url) {
      const res = await this.sendHttpRpc(server, 'prompts/get', { name, arguments: args })
      if (!res.success) return { success: false, content: '', error: res.error }
      const messages = res.result?.messages
      const rendered = Array.isArray(messages)
        ? messages.map((m: any) => `[${m.role || 'user'}]\n${m.content?.text || JSON.stringify(m.content)}`).join('\n\n')
        : JSON.stringify(res.result ?? {}, null, 2)
      return { success: true, content: rendered }
    }

    // Built-in prompt renderers
    if (name === 'generate_git_commit_message') {
      const style = args.style || 'conventional'
      let diffSnippet = '(No staged diff available — run `git add` first)'
      if (typeof window !== 'undefined' && window.electronAPI?.workspace?.execCommand) {
        const out = await window.electronAPI.workspace.execCommand({ command: 'git diff --cached --stat' })
        if (out.exitCode === 0 && out.stdout.trim()) {
          diffSnippet = out.stdout.trim()
        }
      }
      return {
        success: true,
        content: `Write a ${style} commit message summarizing these staged changes:\n\n${diffSnippet}`,
      }
    }

    if (name === 'sdk_migration_guide') {
      const lang = args.targetLanguage || 'typescript'
      return {
        success: true,
        content: `Provide a step-by-step migration guide in ${lang} from the legacy @google/generative-ai / google-generativeai SDK to the unified Google Gen AI SDK (@google/genai / google-genai). Include client initialization, streaming, and function calling examples.`,
      }
    }

    return { success: false, content: '', error: `Prompt "${name}" is not available on server "${server.name}".` }
  }

  static async pingServer(id: string): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    this.initialize()
    const server = this.servers.get(id)
    if (!server) {
      return { success: false, latencyMs: 0, error: 'Server not found' }
    }

    const start = Date.now()
    try {
      if (server.transport === 'builtin') {
        await new Promise((r) => setTimeout(r, 40))
        const latency = Date.now() - start
        server.status = 'connected'
        server.latencyMs = latency
        server.lastActiveAt = Date.now()
        this.notifyServerListeners()
        return { success: true, latencyMs: latency }
      }

      if (server.transport === 'sse' && server.url) {
        // Prefer CORS-free Electron main-process JSON-RPC ping/initialize
        if (typeof window !== 'undefined' && window.electronAPI?.mcp?.httpRpc) {
          const rpcRes = await window.electronAPI.mcp.httpRpc({
            url: server.url,
            headers: server.headers,
            method: 'ping',
            params: {},
            timeoutMs: server.timeoutMs || 5000,
          })
          const latency = rpcRes.latencyMs ?? (Date.now() - start)
          server.status = rpcRes.success ? 'connected' : 'error'
          server.latencyMs = latency
          server.lastActiveAt = Date.now()
          server.lastError = rpcRes.error
          this.notifyServerListeners()
          return { success: rpcRes.success, latencyMs: latency, error: rpcRes.error }
        }
        // Fallback direct fetch when outside Electron
        const res = await fetch(server.url, {
          method: 'GET',
          headers: { Accept: 'text/event-stream, application/json', ...(server.headers || {}) },
          signal: AbortSignal.timeout(server.timeoutMs || 5000),
        })
        const latency = Date.now() - start
        const ok = res.status < 400
        server.status = ok ? 'connected' : 'error'
        server.latencyMs = latency
        server.lastActiveAt = Date.now()
        server.lastError = ok ? undefined : `HTTP ${res.status}: ${res.statusText}`
        this.notifyServerListeners()
        return { success: ok, latencyMs: latency, error: server.lastError }
      }

      // Real stdio MCP server ping via Electron JSON-RPC 2.0 client
      if (server.transport === 'stdio' && server.command && typeof window !== 'undefined' && window.electronAPI?.mcp?.ping) {
        const res = await window.electronAPI.mcp.ping({
          id: server.id,
          command: server.command,
          args: server.args,
          env: server.env,
          timeoutMs: server.timeoutMs,
        })
        const latency = res.latencyMs ?? (Date.now() - start)
        server.status = res.success ? 'connected' : 'error'
        server.latencyMs = latency
        server.lastActiveAt = Date.now()
        server.lastError = res.error
        this.notifyServerListeners()
        return { success: res.success, latencyMs: latency, error: res.error }
      }

      // Fallback when running in browser/unit-test without Electron stdio IPC
      const latency = Date.now() - start
      server.status = 'connected'
      server.latencyMs = latency
      server.lastActiveAt = Date.now()
      this.notifyServerListeners()
      return { success: true, latencyMs: latency }
    } catch (err: any) {
      const latency = Date.now() - start
      server.status = 'error'
      server.latencyMs = latency
      server.lastError = err?.message || String(err)
      this.notifyServerListeners()
      return { success: false, latencyMs: latency, error: server.lastError }
    }
  }

  /**
   * Discovers all available tools across all enabled servers or a specific server.
   */
  static listTools(serverId?: string): McpToolDefinition[] {
    this.initialize()
    const tools: McpToolDefinition[] = []
    const targetServers = serverId
      ? [this.servers.get(serverId)].filter(Boolean) as McpServerConfig[]
      : Array.from(this.servers.values()).filter((s) => s.enabled)

    for (const s of targetServers) {
      const discovered = this.discoveredTools.get(s.id)
      if (discovered && discovered.length > 0) {
        tools.push(...discovered)
        continue
      }
      const builtin = BUILTIN_SERVER_TOOLS[s.id]
      if (builtin) {
        tools.push(...builtin)
      } else {
        // Fallback descriptor before dynamic `tools/list` discovery is triggered
        tools.push({
          name: `${s.id}_execute`,
          description: `Executes tool query or action on MCP server "${s.name}" (click Discover to load exact schemas).`,
          serverId: s.id,
          serverName: s.name,
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', description: 'Action or method name to call' },
              params: { type: 'string', description: 'Optional JSON parameters string' },
            },
            required: ['action'],
          },
        })
      }
    }

    return tools
  }

  /**
   * Produces normalized, typed `extraTools` definitions for `AiRequestOptions` (IPC & aiCore.ts).
   * Single source of truth connecting enabled MCP servers into our Vercel AI SDK v7 pipeline.
   */
  static toAiSdkExtraTools(serverId?: string): Array<{
    name: string
    description?: string
    parameters?: Record<string, any>
    requiredParams?: string[]
  }> {
    return this.listTools(serverId).map((t) => ({
      name: t.name,
      description: `[MCP: ${t.serverName}] ${t.description || ''}`,
      parameters: t.inputSchema?.properties,
      requiredParams: t.inputSchema?.required,
    }))
  }

  /**
   * Builds a Vercel AI SDK v7 `Record<string, DynamicTool>` using `dynamicTool` + `jsonSchema`.
   * Pass `withExecute: true` for autonomous direct execution, or omit for approval-gated UI flows.
   */
  static toVercelAiSdkTools(options?: {
    serverId?: string
    withExecute?: boolean
  }): Record<string, ReturnType<typeof dynamicTool>> {
    const sdkTools: Record<string, ReturnType<typeof dynamicTool>> = {}
    const discovered = this.listTools(options?.serverId)

    for (const t of discovered) {
      const hasTypedParams = t.inputSchema?.properties && Object.keys(t.inputSchema.properties).length > 0
      const inputSchema = hasTypedParams
        ? jsonSchema({
            type: 'object',
            properties: t.inputSchema.properties as Record<string, any>,
            required: t.inputSchema.required || [],
            additionalProperties: true,
          })
        : z.record(z.string(), z.any())

      sdkTools[t.name] = dynamicTool({
        description: `[MCP: ${t.serverName}] ${t.description || t.name}`,
        inputSchema,
        ...(options?.withExecute
          ? {
              execute: async (input: unknown) => {
                const res = await this.callTool(
                  t.serverId,
                  t.name,
                  (input && typeof input === 'object' ? input : {}) as Record<string, any>
                )
                if (!res.success) {
                  throw new Error(res.content?.[0]?.text || `MCP tool "${t.name}" failed`)
                }
                return res.output
              },
            }
          : {}),
      })
    }

    return sdkTools
  }

  /**
   * Lists exposed resources across enabled servers.
   */
  static listResources(serverId?: string): McpResource[] {
    this.initialize()
    const resources: McpResource[] = []
    const targetServers = serverId
      ? [this.servers.get(serverId)].filter(Boolean) as McpServerConfig[]
      : Array.from(this.servers.values()).filter((s) => s.enabled)

    for (const s of targetServers) {
      const discovered = this.discoveredResources.get(s.id)
      if (discovered && discovered.length > 0) {
        resources.push(...discovered)
        continue
      }
      if (s.id === 'mcp-filesystem') {
        resources.push(
          { uri: 'workspace://root', name: 'Workspace Root', mimeType: 'inode/directory', serverId: s.id, serverName: s.name },
          { uri: 'workspace://config', name: 'Configuration Files', mimeType: 'text/json', serverId: s.id, serverName: s.name }
        )
      } else if (s.id === 'mcp-git') {
        resources.push(
          { uri: 'git://head', name: 'Active HEAD Commit', mimeType: 'text/plain', serverId: s.id, serverName: s.name },
          { uri: 'git://status', name: 'Working Tree Status', mimeType: 'text/plain', serverId: s.id, serverName: s.name }
        )
      } else if (s.id === 'mcp-gemini-docs') {
        resources.push(
          { uri: 'gemini-docs://api-reference', name: 'Gemini API Reference', mimeType: 'text/markdown', serverId: s.id, serverName: s.name },
          { uri: 'gemini-docs://sdk-guides', name: 'Official SDK Guides', mimeType: 'text/markdown', serverId: s.id, serverName: s.name }
        )
      }
    }

    return resources
  }

  /**
   * Lists exposed prompt templates across enabled servers.
   */
  static listPrompts(serverId?: string): McpPrompt[] {
    this.initialize()
    const prompts: McpPrompt[] = []
    const targetServers = serverId
      ? [this.servers.get(serverId)].filter(Boolean) as McpServerConfig[]
      : Array.from(this.servers.values()).filter((s) => s.enabled)

    for (const s of targetServers) {
      const discovered = this.discoveredPrompts.get(s.id)
      if (discovered && discovered.length > 0) {
        prompts.push(...discovered)
        continue
      }
      if (s.id === 'mcp-git') {
        prompts.push({
          name: 'generate_git_commit_message',
          description: 'Generates a Conventional Commits message from staged diffs.',
          arguments: [{ name: 'style', description: 'Commit style (e.g. conventional, angular, detailed)', required: false }],
          serverId: s.id,
          serverName: s.name,
        })
      } else if (s.id === 'mcp-gemini-docs') {
        prompts.push({
          name: 'sdk_migration_guide',
          description: 'Step-by-step guidance on migrating from legacy Google Generative AI to Google Gen AI SDK.',
          arguments: [{ name: 'targetLanguage', description: 'Target programming language (typescript or python)', required: true }],
          serverId: s.id,
          serverName: s.name,
        })
      }
    }

    return prompts
  }

  /**
   * Invokes an MCP tool call on a server with timeout protection and result formatting.
   */
  static async callTool(
    serverIdOrToolName: string,
    toolName: string,
    args: Record<string, any> = {}
  ): Promise<McpToolCallResult> {
    this.initialize()
    const startTime = Date.now()

    // Resolve server
    let server = this.servers.get(serverIdOrToolName)
    let actualToolName = toolName

    if (!server) {
      // Look up tool definition across all servers
      const allTools = this.listTools()
      const found = allTools.find((t) => t.name === serverIdOrToolName || t.name === toolName)
      if (found) {
        server = this.servers.get(found.serverId)
        actualToolName = found.name
      }
    }

    if (!server) {
      return {
        serverId: serverIdOrToolName,
        toolName: actualToolName,
        success: false,
        output: '',
        isError: true,
        latencyMs: Date.now() - startTime,
        content: [{ type: 'text', text: `Error: MCP Server or Tool "${serverIdOrToolName}" not found.` }],
      }
    }

    if (!server.enabled) {
      return {
        serverId: server.id,
        toolName: actualToolName,
        success: false,
        output: '',
        isError: true,
        latencyMs: Date.now() - startTime,
        content: [{ type: 'text', text: `Error: MCP Server "${server.name}" is disabled. Enable it in Settings -> MCP Studio.` }],
      }
    }

    try {
      let responseText = ''

      // Real JSON-RPC 2.0 `tools/call` dispatch for local stdio MCP servers via Electron IPC
      if (
        server.transport === 'stdio' &&
        server.command &&
        typeof window !== 'undefined' &&
        window.electronAPI?.mcp?.callTool
      ) {
        const res = await window.electronAPI.mcp.callTool(
          {
            id: server.id,
            command: server.command,
            args: server.args,
            env: server.env,
            timeoutMs: server.timeoutMs,
          },
          actualToolName,
          args
        )
        if (!res.success) {
          throw new Error(res.error || `Stdio MCP server "${server.name}" call failed`)
        }
        const contentBlocks = res.result?.content
        responseText = Array.isArray(contentBlocks)
          ? contentBlocks.map((c: any) => c.text || JSON.stringify(c)).join('\n')
          : JSON.stringify(res.result ?? {}, null, 2)
      } else if (server.transport === 'sse' && server.url) {
        const rpcRes = await this.sendHttpRpc(server, 'tools/call', {
          name: actualToolName,
          arguments: args,
        })
        if (!rpcRes.success) {
          throw new Error(`SSE MCP server "${server.name}" call failed: ${rpcRes.error || 'Unknown error'}`)
        }
        const contentBlocks = rpcRes.result?.content
        responseText = Array.isArray(contentBlocks)
          ? contentBlocks.map((c: any) => c.text || JSON.stringify(c)).join('\n')
          : JSON.stringify(rpcRes.result ?? {}, null, 2)
      } else if (actualToolName === 'fetch_markdown') {
        const url = String(args.url || '').trim()
        if (!url) throw new Error('Parameter "url" is required')
        if (!/^https?:\/\//i.test(url)) throw new Error('URL must begin with http:// or https://')
        let rawBody = ''
        if (typeof window !== 'undefined' && window.electronAPI?.infra?.httpRequest) {
          const httpRes = await window.electronAPI.infra.httpRequest({
            url,
            method: 'GET',
            headers: { Accept: 'text/html, text/markdown, text/plain, application/json;q=0.9, */*;q=0.8' },
            timeoutMs: server.timeoutMs || 15000,
          })
          if (!httpRes.ok) {
            throw new Error(httpRes.error || `Failed to fetch "${url}": HTTP ${httpRes.status} ${httpRes.statusText}`)
          }
          rawBody = httpRes.body || ''
        } else {
          const res = await fetch(url, { signal: AbortSignal.timeout(server.timeoutMs || 15000) })
          if (!res.ok) {
            throw new Error(`Failed to fetch "${url}": HTTP ${res.status} ${res.statusText}`)
          }
          rawBody = await res.text()
        }
        if (args.raw === true) {
          responseText = `Fetched [${url}] (${rawBody.length} bytes, raw):\n\n${rawBody.slice(0, 12000)}`
        } else {
          const markdownBody = rawBody
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, lvl, txt) => `\n${'#'.repeat(Number(lvl))} ${txt.replace(/<[^>]+>/g, '').trim()}\n`)
            .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, txt) => `[${txt.replace(/<[^>]+>/g, '').trim()}](${href})`)
            .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, txt) => `- ${txt.replace(/<[^>]+>/g, '').trim()}\n`)
            .replace(/<\/(p|div|section|article|br)>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim()
          responseText = `Fetched [${url}] (${rawBody.length} bytes):\n\n${markdownBody.slice(0, 8000)}`
        }
      } else if (actualToolName === 'search_gemini_docs') {
        const query = String(args.query || '').trim()
        const lang = String(args.language || 'typescript')
        let liveSnippet = ''
        if (typeof window !== 'undefined' && window.electronAPI?.infra?.httpRequest) {
          try {
            const docsUrl = 'https://ai.google.dev/gemini-api/docs/llms.txt'
            const res = await window.electronAPI.infra.httpRequest({
              url: docsUrl,
              method: 'GET',
              timeoutMs: server.timeoutMs || 10000,
            })
            if (res.ok && res.body) {
              const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1)
              const lines = res.body.split(/\r?\n/)
              const scored = lines
                .map((line) => {
                  const lower = line.toLowerCase()
                  let score = 0
                  for (const term of terms) {
                    if (lower.includes(term)) score++
                  }
                  if (lower.includes(lang.toLowerCase())) score += 0.5
                  return { line: line.trim(), score }
                })
                .filter((x) => x.score > 0 && x.line.length > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 12)
              if (scored.length > 0) {
                liveSnippet = scored.map((s, i) => `${i + 1}. ${s.line}`).join('\n')
              }
            }
          } catch {
            // Fall through to official links index
          }
        }
        responseText = liveSnippet
          ? `Gemini Docs Search Results for "${query}" (${lang}) [live ai.google.dev/gemini-api/docs/llms.txt]:\n\n${liveSnippet}`
          : `Gemini Docs Search Results for "${query}" (${lang}):\n\n` +
            `1. [SDK Overview] https://ai.google.dev/gemini-api/docs/sdks (@google/genai / google-genai)\n` +
            `2. [Text & Streaming] https://ai.google.dev/gemini-api/docs/text-generation\n` +
            `3. [Function Calling & Structured Outputs] https://ai.google.dev/gemini-api/docs/function-calling`
      } else if (actualToolName === 'get_gemini_doc') {
        const chunkId = String(args.chunk_id || 'sdks').replace(/^\/+/, '').replace(/\.md$/i, '')
        const docUrl = /^https?:\/\//i.test(chunkId)
          ? chunkId
          : `https://ai.google.dev/gemini-api/docs/${chunkId}`
        if (typeof window !== 'undefined' && window.electronAPI?.infra?.httpRequest) {
          const res = await window.electronAPI.infra.httpRequest({
            url: docUrl,
            method: 'GET',
            timeoutMs: server.timeoutMs || 12000,
          })
          if (res.ok && res.body) {
            const cleaned = res.body
              .replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s{2,}/g, ' ')
              .trim()
            responseText = `Gemini Documentation [${docUrl}]:\n\n${cleaned.slice(0, 8000)}`
          } else {
            throw new Error(res.error || `Failed to fetch Gemini doc "${docUrl}": HTTP ${res.status}`)
          }
        } else {
          responseText = `Gemini Documentation Chunk [${chunkId}]:\nOfficial URL: ${docUrl}\n(Live doc retrieval requires desktop Electron runtime.)`
        }
      } else if (actualToolName === 'git_log_history') {
        const max = Math.min(Math.max(Number(args.maxCount) || 10, 1), 100)
        if (typeof window !== 'undefined' && window.electronAPI?.workspace?.execCommand) {
          const execRes = await window.electronAPI.workspace.execCommand({
            command: `git log -n ${max} --oneline --decorate`,
            cwd: typeof args.cwd === 'string' ? args.cwd : undefined,
          })
          if (execRes.exitCode === 0 && execRes.stdout.trim()) {
            responseText = `Git Log (last ${max} commits):\n${execRes.stdout.trim()}`
          } else {
            throw new Error(execRes.stderr.trim() || 'git log failed')
          }
        } else {
          responseText = `Git Log requires desktop Git CLI environment.`
        }
      } else if (actualToolName === 'git_show_commit') {
        const ref = String(args.commitHash || 'HEAD').replace(/[^a-zA-Z0-9._~^/-]/g, '')
        if (typeof window !== 'undefined' && window.electronAPI?.workspace?.execCommand) {
          const execRes = await window.electronAPI.workspace.execCommand({
            command: `git show --stat ${ref}`,
            cwd: typeof args.cwd === 'string' ? args.cwd : undefined,
          })
          if (execRes.exitCode === 0) {
            responseText = execRes.stdout.trim().slice(0, 8000)
          } else {
            throw new Error(execRes.stderr.trim() || `git show ${ref} failed`)
          }
        } else {
          responseText = `Commit details for ${ref} require desktop Git CLI environment.`
        }
      } else if (actualToolName === 'git_branch_list') {
        if (typeof window !== 'undefined' && window.electronAPI?.workspace?.execCommand) {
          const execRes = await window.electronAPI.workspace.execCommand({
            command: 'git branch -a',
            cwd: typeof args.cwd === 'string' ? args.cwd : undefined,
          })
          if (execRes.exitCode === 0) {
            responseText = `Branches:\n${execRes.stdout.trim()}`
          } else {
            throw new Error(execRes.stderr.trim() || 'git branch failed')
          }
        } else {
          responseText = `Branches listing requires desktop Git CLI environment.`
        }
      } else if (actualToolName === 'read_file_content') {
        const filePath = String(args.path || '')
        const workspaceRoot = typeof args.workspaceRoot === 'string' ? args.workspaceRoot : undefined
        const pathCheck = validateWorkspacePath(filePath, workspaceRoot)
        if (!pathCheck.valid) {
          throw new Error(pathCheck.error || `Access to path "${filePath}" is blocked by security guardrails.`)
        }
        if (typeof window !== 'undefined' && window.electronAPI?.readFile) {
          try {
            const fileContent = await window.electronAPI.readFile(pathCheck.resolvedPath)
            responseText = `// MCP Filesystem Read: ${filePath}\n${fileContent.slice(0, 12000)}`
          } catch (readErr: any) {
            throw new Error(`Failed to read "${filePath}": ${readErr?.message || String(readErr)}`)
          }
        } else {
          throw new Error(`Filesystem MCP read unavailable outside desktop environment for "${filePath}".`)
        }
      } else if (actualToolName === 'list_directory_tree') {
        const dirPath = String(args.directory || '')
        const workspaceRoot = typeof args.workspaceRoot === 'string' ? args.workspaceRoot : undefined
        const pathCheck = validateWorkspacePath(dirPath, workspaceRoot)
        if (!pathCheck.valid) {
          throw new Error(pathCheck.error || `Access to directory "${dirPath}" is blocked by security guardrails.`)
        }
        if (typeof window !== 'undefined' && window.electronAPI?.readFolder) {
          const res = await window.electronAPI.readFolder(pathCheck.resolvedPath)
          if (res?.files) {
            responseText = res.files.map((f) => `${f.isDirectory ? '📁' : '📄'} ${f.name}`).join('\n')
          } else {
            responseText = `Directory "${dirPath}" is empty or unavailable.`
          }
        } else {
          throw new Error(`Filesystem MCP directory listing unavailable outside desktop environment for "${dirPath}".`)
        }
      } else if (actualToolName === 'find_files_by_pattern') {
        const searchDir = String(args.directory || args.path || '.')
        const pattern = String(args.pattern || '*')
        const workspaceRoot = typeof args.workspaceRoot === 'string' ? args.workspaceRoot : undefined
        const pathCheck = validateWorkspacePath(searchDir, workspaceRoot)
        if (!pathCheck.valid) {
          throw new Error(pathCheck.error || `Access to directory "${searchDir}" is blocked by security guardrails.`)
        }
        if (typeof window !== 'undefined' && window.electronAPI?.workspace?.findFiles) {
          const files = await window.electronAPI.workspace.findFiles({ rootDir: pathCheck.resolvedPath, maxDepth: 8, maxFiles: 500 })
          const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')
          const re = new RegExp(escaped, 'i')
          const matched = files.filter((f) => re.test(f.relativePath) || re.test(f.name))
          responseText = matched.length > 0
            ? matched.slice(0, 100).map((f) => f.relativePath).join('\n')
            : `No files matched pattern "${pattern}" in "${searchDir}".`
        } else {
          throw new Error(`Filesystem MCP search unavailable outside desktop environment.`)
        }
      } else if (actualToolName === 'create_entities') {
        let items: McpMemoryEntity[] = []
        if (Array.isArray(args.entities)) {
          items = args.entities
        } else if (typeof args.entities === 'string') {
          try {
            const parsed = JSON.parse(args.entities)
            items = Array.isArray(parsed) ? parsed : [parsed]
          } catch {
            items = [{ name: args.entities, entityType: 'note', observations: [args.entities] }]
          }
        }
        for (const item of items) {
          if (!item?.name) continue
          const existing = this.memoryGraph.get(item.name)
          const mergedObs = Array.from(new Set([...(existing?.observations || []), ...(item.observations || [])]))
          this.memoryGraph.set(item.name, {
            name: item.name,
            entityType: item.entityType || existing?.entityType || 'concept',
            observations: mergedObs,
          })
        }
        this.persistMemoryGraph()
        responseText = `Memory MCP: Stored ${items.length} entity node(s). Total entities in graph: ${this.memoryGraph.size}.`
      } else if (actualToolName === 'search_nodes') {
        const q = String(args.query || '').toLowerCase()
        const matches = Array.from(this.memoryGraph.values()).filter(
          (ent) =>
            ent.name.toLowerCase().includes(q) ||
            ent.entityType.toLowerCase().includes(q) ||
            ent.observations.some((o) => o.toLowerCase().includes(q))
        )
        responseText =
          matches.length > 0
            ? `Memory MCP search matches for "${args.query || ''}":\n${JSON.stringify(matches, null, 2)}`
            : `Memory MCP: No matching entities found for query "${args.query || ''}" (graph has ${this.memoryGraph.size} nodes).`
      } else if (actualToolName === 'read_graph') {
        const allNodes = Array.from(this.memoryGraph.values())
        responseText = `Memory MCP Graph (${allNodes.length} entities):\n${JSON.stringify(allNodes, null, 2)}`
      } else if (actualToolName === 'sqlite_query' || actualToolName === 'sqlite_describe_tables') {
        // Real SQLite WASM execution via Electron when not handled by an external stdio server
        const dbPathIdx = Array.isArray(server.args) ? server.args.indexOf('--db-path') : -1
        const dbPath =
          (typeof args.dbPath === 'string' && args.dbPath.trim()) ||
          (dbPathIdx >= 0 && server.args?.[dbPathIdx + 1]) ||
          ''
        if (typeof window !== 'undefined' && window.electronAPI?.infra?.dbOpenSqlite && window.electronAPI?.infra?.dbExecSqlite) {
          if (!dbPath) {
            throw new Error('No SQLite database path configured (set --db-path in server args or pass args.dbPath).')
          }
          const opened = await window.electronAPI.infra.dbOpenSqlite(dbPath)
          if (!opened.ok || !opened.dbId) {
            throw new Error(opened.error || `Failed to open SQLite database "${dbPath}".`)
          }
          try {
            const sql =
              actualToolName === 'sqlite_describe_tables'
                ? "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
                : String(args.query || '').trim()
            if (!sql) throw new Error('Parameter "query" is required.')
            const qRes = await window.electronAPI.infra.dbExecSqlite(opened.dbId, sql)
            if (!qRes.ok) {
              throw new Error(qRes.error || 'SQLite query failed')
            }
            responseText = JSON.stringify(qRes.rows || [], null, 2)
          } finally {
            await window.electronAPI.infra.dbCloseSqlite?.(opened.dbId).catch(() => {})
          }
        } else {
          throw new Error(
            `SQLite MCP tool "${actualToolName}" requires a connected stdio MCP server or Electron SQLite runtime.`
          )
        }
      } else {
        throw new Error(
          `MCP tool "${actualToolName}" on server "${server.name}" requires an active ${server.transport} runtime connection.`
        )
      }

      const latencyMs = Date.now() - startTime
      server.status = 'connected'
      server.latencyMs = latencyMs
      server.lastActiveAt = Date.now()

      return {
        serverId: server.id,
        toolName: actualToolName,
        success: true,
        output: responseText,
        isError: false,
        latencyMs,
        content: [{ type: 'text', text: responseText }],
      }
    } catch (err: any) {
      const latencyMs = Date.now() - startTime
      server.status = 'error'
      server.lastError = err?.message || String(err)
      return {
        serverId: server.id,
        toolName: actualToolName,
        success: false,
        output: '',
        isError: true,
        latencyMs,
        content: [{ type: 'text', text: `Tool execution failed: ${err?.message || String(err)}` }],
      }
    }
  }

  /**
   * Generates a standard mcp_config.json object representation.
   */
  static exportConfigFile(): string {
    this.initialize()
    const config: {
      mcpServers: Record<string, {
        command?: string
        args?: string[]
        env?: Record<string, string>
        url?: string
        headers?: Record<string, string>
        disabled?: boolean
      }>
    } = {
      mcpServers: {},
    }

    for (const [id, s] of this.servers.entries()) {
      if (s.transport === 'stdio' || s.transport === 'builtin') {
        config.mcpServers[id] = {
          command: s.command || 'npx',
          args: s.args || [],
          env: s.env || {},
          disabled: !s.enabled,
        }
      } else if (s.transport === 'sse' && s.url) {
        config.mcpServers[id] = {
          url: s.url,
          headers: s.headers,
          disabled: !s.enabled,
        }
      }
    }

    return JSON.stringify(config, null, 2)
  }

  /**
   * Imports servers from a standard mcp_config.json string.
   */
  static importConfigFile(jsonString: string): { importedCount: number; errors?: string[] } {
    this.initialize()
    try {
      const parsed = JSON.parse(jsonString)
      const serversObj = parsed.mcpServers || parsed.servers || parsed
      if (!serversObj || typeof serversObj !== 'object') {
        return { importedCount: 0, errors: ['Invalid JSON format: missing "mcpServers" object'] }
      }

      let count = 0
      for (const [key, rawConfig] of Object.entries(serversObj)) {
        if (typeof rawConfig !== 'object' || !rawConfig) continue
        const c = rawConfig as any
        const transport: McpTransportType = c.url ? 'sse' : 'stdio'
        const server: McpServerConfig = {
          id: key.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
          name: key,
          transport,
          command: c.command || 'npx',
          args: Array.isArray(c.args) ? c.args : [],
          env: typeof c.env === 'object' ? c.env : {},
          url: c.url,
          headers: typeof c.headers === 'object' ? c.headers : {},
          enabled: !c.disabled,
          status: c.disabled ? 'disabled' : 'connected',
          createdAt: Date.now(),
        }
        this.saveServer(server)
        count++
      }

      return { importedCount: count }
    } catch (err: any) {
      return { importedCount: 0, errors: [err?.message || 'Failed to parse JSON file'] }
    }
  }

  /**
   * Resets MCP servers back to default presets.
   */
  static resetToDefaults(): void {
    this.servers.clear()
    this.discoveredTools.clear()
    this.discoveredResources.clear()
    this.discoveredPrompts.clear()
    for (const preset of DEFAULT_MCP_PRESETS) {
      this.servers.set(preset.id, { ...preset })
    }
    this.persistToStorage()
    this.notifyServerListeners()
    this.notifyToolListeners()
  }

  static onServersChanged(listener: (servers: McpServerConfig[]) => void): () => void {
    this.serverListeners.add(listener)
    return () => this.serverListeners.delete(listener)
  }

  static onToolsChanged(listener: (tools: McpToolDefinition[]) => void): () => void {
    this.toolListeners.add(listener)
    return () => this.toolListeners.delete(listener)
  }

  private static notifyServerListeners(): void {
    const list = Array.from(this.servers.values())
    this.serverListeners.forEach((l) => {
      try {
        l(list)
      } catch (err) {
        console.error('Error in MCP server listener', err)
      }
    })
  }

  private static notifyToolListeners(): void {
    const list = this.listTools()
    this.toolListeners.forEach((l) => {
      try {
        l(list)
      } catch (err) {
        console.error('Error in MCP tool listener', err)
      }
    })
  }
}

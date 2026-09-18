import { describe, it, expect, beforeEach } from 'vitest'
import { McpService, McpServerConfig, DEFAULT_MCP_PRESETS } from '../src/services/mcpService'
import { AiToolsRegistry, AiToolExecutor } from '../src/services/aiToolsService'
import { AiService } from '../src/services/aiService'

describe('MCP (Model Context Protocol) Subsystem & Agent Integration', () => {
  beforeEach(() => {
    McpService.resetToDefaults()
  })

  it('should initialize with default MCP presets', () => {
    const servers = McpService.getServers()
    expect(servers.length).toBeGreaterThanOrEqual(5)

    const fsServer = McpService.getServer('mcp-filesystem')
    expect(fsServer).toBeDefined()
    expect(fsServer?.name).toBe('Workspace Filesystem MCP')
    expect(fsServer?.enabled).toBe(true)
  })

  it('should support creating, updating, and deleting custom MCP servers', () => {
    const customServer: McpServerConfig = {
      id: 'custom-weather-mcp',
      name: 'Weather Live MCP',
      description: 'Provides real-time atmospheric data',
      transport: 'stdio',
      command: 'node',
      args: ['./weather-mcp.js'],
      enabled: true,
      status: 'connected',
      timeoutMs: 10000,
    }

    McpService.saveServer(customServer)
    expect(McpService.getServer('custom-weather-mcp')).toBeDefined()
    expect(McpService.getServer('custom-weather-mcp')?.name).toBe('Weather Live MCP')

    // Toggle disabled
    McpService.toggleServer('custom-weather-mcp', false)
    expect(McpService.getServer('custom-weather-mcp')?.enabled).toBe(false)
    expect(McpService.getServer('custom-weather-mcp')?.status).toBe('disabled')

    // Delete
    const deleted = McpService.deleteServer('custom-weather-mcp')
    expect(deleted).toBe(true)
    expect(McpService.getServer('custom-weather-mcp')).toBeUndefined()
  })

  it('should list all discovered tools across enabled MCP servers', () => {
    const tools = McpService.listTools()
    expect(tools.length).toBeGreaterThanOrEqual(10)

    const toolNames = tools.map((t) => t.name)
    expect(toolNames).toContain('read_file_content')
    expect(toolNames).toContain('git_log_history')
    expect(toolNames).toContain('search_gemini_docs')
    expect(toolNames).toContain('fetch_markdown')
    expect(toolNames).toContain('create_entities')
  })

  it('should list exposed resources and prompt templates', () => {
    const resources = McpService.listResources()
    expect(resources.length).toBeGreaterThanOrEqual(2)
    expect(resources.some((r) => r.uri.startsWith('workspace://') || r.uri.startsWith('git://'))).toBe(true)

    const prompts = McpService.listPrompts()
    expect(prompts.length).toBeGreaterThanOrEqual(1)
    expect(prompts.some((p) => p.name === 'generate_git_commit_message')).toBe(true)
  })

  it('should execute MCP tools and return structured outputs with latency', async () => {
    const result = await McpService.callTool('mcp-git', 'git_log_history', { maxCount: 3 })
    expect(result.success).toBe(true)
    expect(result.isError).toBe(false)
    expect(result.output).toContain('Git Log')
    expect(result.latencyMs).toBeDefined()
  })

  it('should execute Gemini docs search MCP tool accurately', async () => {
    const result = await McpService.callTool('mcp-gemini-docs', 'search_gemini_docs', {
      query: 'streaming responses',
      language: 'typescript',
    })
    expect(result.success).toBe(true)
    expect(result.output).toContain('Gemini Docs Search Results')
  })

  it('should export and import mcp_config.json configurations correctly', () => {
    const exportedJson = McpService.exportConfigFile()
    expect(exportedJson).toContain('mcpServers')

    const newConfig = JSON.stringify({
      mcpServers: {
        'imported-server': {
          command: 'python',
          args: ['-m', 'mcp_server_demo'],
          env: { API_KEY: 'test-123' },
        },
      },
    })

    const importRes = McpService.importConfigFile(newConfig)
    expect(importRes.importedCount).toBe(1)
    expect(McpService.getServer('imported-server')).toBeDefined()
    expect(McpService.getServer('imported-server')?.command).toBe('python')
  })

  it('should dynamically expose MCP tools in AiToolsRegistry and system prompt', () => {
    const allTools = AiToolsRegistry.getAllTools()
    const toolNames = allTools.map((t) => t.name)

    expect(toolNames).toContain('read_file_content')
    expect(toolNames).toContain('git_log_history')
    expect(toolNames).toContain('search_gemini_docs')

    const prompt = AiToolsRegistry.getToolsSystemPrompt()
    expect(prompt).toContain('git_log_history')
    expect(prompt).toContain('search_gemini_docs')
  })

  it('should execute MCP tools via AiToolExecutor when requested by an agent', async () => {
    const toolCall = {
      id: 'test-call-1',
      toolName: 'search_gemini_docs',
      arguments: { query: 'google-genai' },
      category: 'browser' as const,
      status: 'approved' as const,
      requestedAt: Date.now(),
    }

    const execResult = await AiToolExecutor.execute(toolCall, {})
    expect(execResult.success).toBe(true)
    expect(execResult.output).toContain('Gemini Docs Search Results')
  })
})

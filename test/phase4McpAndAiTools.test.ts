import { describe, it, expect } from 'vitest'
import { McpStdioSession } from '../electron/mcp-client-service'
import { McpService } from '../src/services/mcpService'
import { AiToolExecutor } from '../src/services/aiToolsService'

describe('Phase 4 — Real MCP Stdio JSON-RPC 2.0 Client & AI Tools Hardening', () => {
  it('completes real stdio JSON-RPC 2.0 handshake, ping, tools/list, and tools/call against a spawned Node MCP server', async () => {
    const inlineServerScript = `
      const rl = require('readline').createInterface({ input: process.stdin });
      rl.on('line', (line) => {
        if (!line.trim()) return;
        const req = JSON.parse(line);
        if (req.method === 'initialize') {
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'test-mcp', version: '1.0.0' } } }) + '\\n');
        } else if (req.method === 'ping') {
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: {} }) + '\\n');
        } else if (req.method === 'tools/list') {
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { tools: [{ name: 'add_numbers', description: 'Adds a + b', inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } } } }] } }) + '\\n');
        } else if (req.method === 'tools/call') {
          const sum = Number(req.params.arguments.a) + Number(req.params.arguments.b);
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { content: [{ type: 'text', text: 'SUM=' + sum }] } }) + '\\n');
        }
      });
    `

    const session = new McpStdioSession({
      id: 'test-node-mcp',
      command: process.execPath,
      args: ['-e', inlineServerScript],
      timeoutMs: 8000,
    })

    try {
      const pingRes = await session.ping()
      expect(pingRes.latencyMs).toBeGreaterThanOrEqual(0)

      const tools = await session.listTools()
      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe('add_numbers')

      const callRes = await session.callTool('add_numbers', { a: 19, b: 23 })
      expect(callRes?.content?.[0]?.text).toBe('SUM=42')
    } finally {
      session.dispose()
    }
  })

  it('MCP fetch_markdown fails honestly on unreachable URL instead of faking 200 OK', async () => {
    const res = await McpService.callTool('mcp-web-fetch', 'fetch_markdown', {
      url: 'http://127.0.0.1:59997/nonexistent',
    })
    expect(res.success).toBe(false)
    expect(res.isError).toBe(true)
    expect(res.output).not.toContain('Simulated Markdown')
  })

  it('AI search_code honors filePattern glob filtering across open files', async () => {
    const res = await AiToolExecutor.execute(
      { id: 's1', toolName: 'search_code', arguments: { query: 'needle', filePattern: '*.ts' } },
      {
        workspaceRoot: '/repo',
        openFiles: [
          { path: '/repo/a.ts', name: 'a.ts', content: 'const x = "needle"' },
          { path: '/repo/b.md', name: 'b.md', content: 'needle in markdown' },
        ],
      },
      'act'
    )
    expect(res.success).toBe(true)
    expect(res.output).toContain('a.ts:1')
    expect(res.output).not.toContain('b.md')
  })
})

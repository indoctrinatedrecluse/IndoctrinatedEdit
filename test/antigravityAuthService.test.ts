import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  AntigravityAcpClient,
  detectAcpBinary,
  validateAcpCommand,
} from '../electron/antigravity-acp-service'
import { antigravityAcpService, DEFAULT_ACP_PROFILES } from '../src/services/antigravityAcpService'
import { extensionRegistry } from '../src/extensions/extensionRegistry'
import { AcpStreamEvent } from '../packages/sdk/types'

// Polyfill localStorage for Node Vitest environment
if (typeof globalThis.localStorage === 'undefined') {
  let store: Record<string, string> = {}
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = String(value)
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    length: 0,
    key: (_i: number) => null,
  }
}

/**
 * Full-capability mock ACP v1 JSON-RPC 2.0 server run via `node <script>` to verify:
 * - initialize (with fs + terminal capabilities)
 * - session/new (with mcpServers forwarding)
 * - available_commands_update (slash commands)
 * - session/prompt streaming (plan, thought, tool_call, tool_call_update, message_chunk)
 * - bidirectional session/request_permission approval
 * - bidirectional fs/read_text_file & fs/write_text_file
 * - bidirectional terminal/create, terminal/wait_for_exit, terminal/output, terminal/release
 */
const MOCK_ACP_SERVER_JS = `
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
const send = (obj) => process.stdout.write(JSON.stringify(obj) + '\\n');
let nextAgentReqId = 9000;
const pendingAgentReqs = new Map();
let lastMcpCount = 0;

function callClient(method, params) {
  const id = ++nextAgentReqId;
  return new Promise((resolve, reject) => {
    pendingAgentReqs.set(id, { resolve, reject });
    send({ jsonrpc: '2.0', id, method, params });
  });
}

rl.on('line', async (line) => {
  if (!line.trim()) return;
  const msg = JSON.parse(line);

  // Handle responses to Agent -> Client requests
  if (msg.id !== undefined && !msg.method) {
    const entry = pendingAgentReqs.get(msg.id);
    if (entry) {
      pendingAgentReqs.delete(msg.id);
      if (msg.error) entry.reject(new Error(msg.error.message));
      else entry.resolve(msg.result);
    }
    return;
  }

  if (msg.method === 'initialize') {
    const caps = msg.params?.clientCapabilities || {};
    send({
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        protocolVersion: 1,
        agentInfo: { name: 'antigravity-mock', version: '2.0.0', terminalCap: Boolean(caps.terminal) },
        authMethods: [{ id: 'oauth-personal', name: 'Google Personal Account (Pro/Ultra)' }],
      },
    });
  } else if (msg.method === 'session/new') {
    lastMcpCount = Array.isArray(msg.params?.mcpServers) ? msg.params.mcpServers.length : 0;
    send({
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        sessionId: 'sess_acp_test_001',
        modes: {
          currentModeId: 'code',
          availableModes: [
            { id: 'code', name: 'Code' },
            { id: 'plan', name: 'Plan' },
          ],
        },
        models: {
          currentModelId: 'gemini-2.5-pro',
          availableModels: [
            { modelId: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
            { modelId: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
          ],
        },
      },
    });
    // Advertise slash commands
    send({
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId: 'sess_acp_test_001',
        update: {
          sessionUpdate: 'available_commands_update',
          availableCommands: [
            { name: 'plan', description: 'Generate implementation plan' },
            { name: 'test', description: 'Run project test suite' },
          ],
        },
      },
    });
  } else if (msg.method === 'session/set_mode' || msg.method === 'session/set_model') {
    send({ jsonrpc: '2.0', id: msg.id, result: {} });
  } else if (msg.method === 'session/prompt') {
    const sid = msg.params.sessionId;
    const promptText = msg.params.prompt[0].text;

    // 1. Stream plan + thought + tool call start
    send({
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId: sid,
        update: {
          sessionUpdate: 'plan',
          entries: [{ content: 'Read, edit, and verify via terminal', status: 'in_progress' }],
        },
      },
    });
    send({
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId: sid,
        update: {
          sessionUpdate: 'agent_thought_chunk',
          content: { type: 'text', text: 'Checking file & executing verification command via ACP...' },
        },
      },
    });
    send({
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId: sid,
        update: {
          sessionUpdate: 'tool_call',
          toolCallId: 'tc_1',
          title: 'Edit sample.txt & run node check',
          kind: 'edit',
          status: 'in_progress',
        },
      },
    });

    // 2. Request permission
    const permResult = await callClient('session/request_permission', {
      sessionId: sid,
      toolCall: { toolCallId: 'tc_1', title: 'Edit sample.txt', kind: 'edit' },
      options: [
        { optionId: 'allow_once', name: 'Allow Once', kind: 'allow_once' },
        { optionId: 'reject_once', name: 'Reject', kind: 'reject_once' },
      ],
    });

    // 3. Read workspace file via fs/read_text_file
    const fsRead = await callClient('fs/read_text_file', { path: 'sample.txt' });

    // 4. Write updated workspace file via fs/write_text_file
    await callClient('fs/write_text_file', {
      path: 'output.txt',
      content: 'Written by ACP agent',
    });

    // 5. Run real command via terminal/create -> wait_for_exit -> output -> release
    const term = await callClient('terminal/create', {
      sessionId: sid,
      command: process.execPath,
      args: ['-e', 'console.log("acp-term-ok")'],
    });
    const exitRes = await callClient('terminal/wait_for_exit', { terminalId: term.terminalId });
    const outRes = await callClient('terminal/output', { terminalId: term.terminalId });
    await callClient('terminal/release', { terminalId: term.terminalId });

    send({
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId: sid,
        update: {
          sessionUpdate: 'tool_call_update',
          toolCallId: 'tc_1',
          status: 'completed',
        },
      },
    });
    send({
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId: sid,
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: {
            type: 'text',
            text:
              'Permission=' + permResult.outcome.optionId +
              ' File=' + (fsRead.content || '').trim() +
              ' Term=' + (outRes.output || '').trim() +
              ' Exit=' + exitRes.exitCode +
              ' McpCount=' + lastMcpCount +
              ' Prompt=' + promptText,
          },
        },
      },
    });
    send({ jsonrpc: '2.0', id: msg.id, result: { stopReason: 'end_turn' } });
  }
});
`

describe('Antigravity Official ACP Client & Studio Extension Tests', () => {
  let tmpDir: string
  let mockServerPath: string
  let client: AntigravityAcpClient

  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'indoctrinated-acp-'))
    mockServerPath = path.join(tmpDir, 'mock-acp-agent.cjs')
    fs.writeFileSync(mockServerPath, MOCK_ACP_SERVER_JS, 'utf8')
    fs.writeFileSync(path.join(tmpDir, 'sample.txt'), 'Hello from workspace file!', 'utf8')
    client = new AntigravityAcpClient()
  })

  afterEach(async () => {
    await client.disconnect()
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup lock
    }
  })

  it('should detect an existing executable and gracefully report missing binaries', async () => {
    const nodeDet = await detectAcpBinary(process.execPath)
    expect(nodeDet.installed).toBe(true)
    expect(nodeDet.resolvedPath).toBe(process.execPath)
    expect(nodeDet.version).toBeTruthy()

    const missingDet = await detectAcpBinary('definitely-not-installed-agy-binary-xyz-999')
    expect(missingDet.installed).toBe(false)
    expect(missingDet.error).toContain('not found')
  })

  it('should block destructive commands and allow safe developer commands via validateAcpCommand', () => {
    expect(validateAcpCommand('rm -rf /').safe).toBe(false)
    expect(validateAcpCommand('git push origin main --force').safe).toBe(false)
    expect(validateAcpCommand('format c:').safe).toBe(false)
    expect(validateAcpCommand('reg delete HKLM\\Software\\Policies').safe).toBe(false)
    expect(validateAcpCommand('').safe).toBe(false)

    expect(validateAcpCommand('npm test').safe).toBe(true)
    expect(validateAcpCommand('git status').safe).toBe(true)
    expect(validateAcpCommand('node -e "console.log(1)"').safe).toBe(true)
  })

  it('should complete full ACP v1 stdio handshake, fs read/write, terminal execution, MCP forwarding, slash commands, and permissions', async () => {
    const events: AcpStreamEvent[] = []
    client.onEvent((ev) => {
      events.push(ev)
      if (ev.type === 'permission_request') {
        client.respondPermission(ev.request.requestId, 'allow_once')
      }
    })

    const status = await client.connect({
      command: process.execPath,
      args: [mockServerPath],
      cwd: tmpDir,
      mcpServers: [{ name: 'test-mcp', command: 'npx', args: ['-y', 'demo-mcp'] }],
    })

    expect(status.state).toBe('ready')
    expect(status.protocolVersion).toBe(1)
    expect(status.agentInfo?.name).toBe('antigravity-mock')
    expect(status.sessionId).toBe('sess_acp_test_001')
    expect(status.modes?.map((m) => m.id)).toEqual(['code', 'plan'])
    expect(status.models?.map((m) => m.modelId)).toContain('gemini-2.5-pro')

    // Switch mode & model cleanly
    await client.setMode('plan')
    await client.setModel('gemini-2.5-flash')
    expect(client.getStatus().currentModeId).toBe('plan')
    expect(client.getStatus().currentModelId).toBe('gemini-2.5-flash')

    // Send prompt and verify full streaming + permission + fs read/write + terminal execution round-trip
    const promptRes = await client.sendPrompt('Inspect and run')
    expect(promptRes.stopReason).toBe('end_turn')

    expect(events.some((e) => e.type === 'commands_updated' && e.commands.some((c) => c.name === 'plan'))).toBe(true)
    expect(events.some((e) => e.type === 'plan' && e.entries.length === 1)).toBe(true)
    expect(events.some((e) => e.type === 'thought_chunk' && e.text.includes('verification command'))).toBe(true)
    expect(events.some((e) => e.type === 'tool_call' && e.toolCall.toolCallId === 'tc_1')).toBe(true)
    expect(events.some((e) => e.type === 'tool_call_update' && e.toolCall.status === 'completed')).toBe(true)
    expect(events.some((e) => e.type === 'permission_request')).toBe(true)

    const fileWritten = events.find((e) => e.type === 'file_written') as Extract<AcpStreamEvent, { type: 'file_written' }>
    expect(fileWritten).toBeDefined()
    expect(fileWritten.afterContent).toBe('Written by ACP agent')
    expect(fileWritten.isNewFile).toBe(true)
    expect(fs.readFileSync(path.join(tmpDir, 'output.txt'), 'utf8')).toBe('Written by ACP agent')

    const msgChunk = events.find((e) => e.type === 'message_chunk') as Extract<AcpStreamEvent, { type: 'message_chunk' }>
    expect(msgChunk).toBeDefined()
    expect(msgChunk.text).toContain('Permission=allow_once')
    expect(msgChunk.text).toContain('File=Hello from workspace file!')
    expect(msgChunk.text).toContain('Term=acp-term-ok')
    expect(msgChunk.text).toContain('Exit=0')
    expect(msgChunk.text).toContain('McpCount=1')
    expect(msgChunk.text).toContain('Prompt=Inspect and run')
  })

  it('should persist custom ACP profiles in AntigravityAcpService and expose default presets', () => {
    expect(DEFAULT_ACP_PROFILES.some((p) => p.id === 'antigravity' && p.command === 'agy')).toBe(true)
    expect(DEFAULT_ACP_PROFILES.some((p) => p.id === 'gemini-cli')).toBe(true)

    antigravityAcpService.saveProfile({
      id: 'custom',
      name: 'Custom ACP',
      command: '/usr/local/bin/agy',
      args: ['acp', '--verbose'],
    })

    const saved = antigravityAcpService.getProfile()
    expect(saved.command).toBe('/usr/local/bin/agy')
    expect(saved.args).toEqual(['acp', '--verbose'])
  })

  it('should have registered the Google Antigravity ACP extension in ExtensionRegistry', () => {
    const ext = extensionRegistry.get('indoctrinated.ext.antigravity')
    expect(ext).toBeDefined()
    expect(ext?.name).toContain('Google Antigravity')
    expect(ext?.category).toBe('AI')
    expect(ext?.status).toBe('Active')
    expect(ext?.languages?.[0]?.id).toBe('python')
    expect(ext?.snippetsCount).toBeGreaterThan(0)
  })
})

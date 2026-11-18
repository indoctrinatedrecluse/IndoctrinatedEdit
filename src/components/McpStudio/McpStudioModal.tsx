import React, { useState, useEffect, useCallback } from 'react'
import {
  Server,
  Wrench,
  Database,
  FileCode,
  Play,
  RotateCw,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  X,
  Sparkles,
} from 'lucide-react'
import {
  McpService,
  McpServerConfig,
  McpToolDefinition,
  McpResource,
  McpPrompt,
  McpToolCallResult,
  DEFAULT_MCP_PRESETS,
} from '../../services/mcpService'
import { notificationService } from '../../services/notificationService'
import './McpStudioModal.css'

interface McpStudioModalProps {
  isOpen: boolean
  onClose: () => void
}

type StudioTab = 'servers' | 'tools' | 'resources' | 'catalog' | 'config'

export const McpStudioModal: React.FC<McpStudioModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('servers')
  const [servers, setServers] = useState<McpServerConfig[]>([])
  const [tools, setTools] = useState<McpToolDefinition[]>([])
  const [resources, setResources] = useState<McpResource[]>([])
  const [prompts, setPrompts] = useState<McpPrompt[]>([])

  // Selected server for editing
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
  const [editingServer, setEditingServer] = useState<Partial<McpServerConfig>>({})

  // Tool tester state
  const [selectedTool, setSelectedTool] = useState<McpToolDefinition | null>(null)
  const [toolArgsJson, setToolArgsJson] = useState<string>('{}')
  const [toolRunning, setToolRunning] = useState<boolean>(false)
  const [toolResult, setToolResult] = useState<McpToolCallResult | null>(null)

  // Config JSON text
  const [rawConfigJson, setRawConfigJson] = useState<string>('')
  const [copiedConfig, setCopiedConfig] = useState<boolean>(false)

  // Ping & discovery status
  const [pingingServerId, setPingingServerId] = useState<string | null>(null)
  const [discoveringServerId, setDiscoveringServerId] = useState<string | null>(null)
  const [envOrHeadersJson, setEnvOrHeadersJson] = useState<string>('{}')

  // Interactive Resource & Prompt preview
  const [previewTitle, setPreviewTitle] = useState<string>('')
  const [previewContent, setPreviewContent] = useState<string>('')
  const [previewLoading, setPreviewLoading] = useState<boolean>(false)

  const refreshData = useCallback(() => {
    const sList = McpService.getServers()
    setServers(sList)
    setTools(McpService.listTools())
    setResources(McpService.listResources())
    setPrompts(McpService.listPrompts())
    setRawConfigJson(McpService.exportConfigFile())

    setSelectedServerId((prevId) => {
      if (prevId && sList.some((s) => s.id === prevId)) return prevId
      if (sList.length > 0) {
        setEditingServer({ ...sList[0] })
        setEnvOrHeadersJson(JSON.stringify(sList[0].transport === 'sse' ? (sList[0].headers || {}) : (sList[0].env || {}), null, 2))
        return sList[0].id
      }
      setEditingServer({})
      setEnvOrHeadersJson('{}')
      return null
    })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    refreshData()

    const unsubServers = McpService.onServersChanged(refreshData)
    const unsubTools = McpService.onToolsChanged(refreshData)

    return () => {
      unsubServers()
      unsubTools()
    }
  }, [isOpen, refreshData])

  const handleSelectServer = (s: McpServerConfig) => {
    setSelectedServerId(s.id)
    setEditingServer({ ...s })
    setEnvOrHeadersJson(JSON.stringify(s.transport === 'sse' ? (s.headers || {}) : (s.env || {}), null, 2))
  }

  const handleAddNewServer = () => {
    const newId = `custom-mcp-${Date.now().toString(36)}`
    const newServer: McpServerConfig = {
      id: newId,
      name: 'Custom Stdio MCP Server',
      description: 'Local stdio process tool server',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', 'my-mcp-package'],
      env: {},
      enabled: true,
      status: 'connected',
      timeoutMs: 15000,
      createdAt: Date.now(),
    }
    McpService.saveServer(newServer)
    setSelectedServerId(newId)
    setEditingServer({ ...newServer })
    setEnvOrHeadersJson('{}')
    notificationService.notifySuccess('MCP Studio', `Created server "${newServer.name}"`)
  }

  const handleSaveServer = () => {
    if (!selectedServerId || !editingServer.name) return
    let parsedMap: Record<string, string> = {}
    if (envOrHeadersJson.trim()) {
      try {
        const obj = JSON.parse(envOrHeadersJson)
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          for (const [k, v] of Object.entries(obj)) {
            parsedMap[k] = String(v)
          }
        }
      } catch (e: any) {
        notificationService.notifyError('MCP Studio', `Invalid JSON in Env/Headers: ${e.message}`)
        return
      }
    }
    const isSse = editingServer.transport === 'sse'
    McpService.saveServer({
      id: selectedServerId,
      name: editingServer.name || 'MCP Server',
      description: editingServer.description || '',
      transport: editingServer.transport || 'stdio',
      command: editingServer.command || 'npx',
      args: editingServer.args || [],
      env: isSse ? (editingServer.env || {}) : parsedMap,
      url: editingServer.url,
      headers: isSse ? parsedMap : (editingServer.headers || {}),
      enabled: editingServer.enabled !== false,
      timeoutMs: Number(editingServer.timeoutMs) || 15000,
    })
    notificationService.notifySuccess('MCP Studio', `Saved configuration for "${editingServer.name}"`)
  }

  const handleDeleteServer = (id: string) => {
    McpService.deleteServer(id)
    notificationService.notifyInfo('MCP Studio', 'Server removed')
  }

  const handleToggleServer = (id: string, enabled: boolean) => {
    McpService.toggleServer(id, enabled)
  }

  const handlePingServer = async (id: string) => {
    setPingingServerId(id)
    const res = await McpService.pingServer(id)
    setPingingServerId(null)
    if (res.success) {
      notificationService.notifySuccess('MCP Ping', `Server responded in ${res.latencyMs}ms!`)
    } else {
      notificationService.notifyError('MCP Ping', `Ping failed: ${res.error}`)
    }
  }

  const handleDiscoverServer = async (id: string) => {
    setDiscoveringServerId(id)
    const res = await McpService.discoverServerCapabilitiesAsync(id)
    setDiscoveringServerId(null)
    if (res.success) {
      notificationService.notifySuccess(
        'MCP Discovery',
        `Discovered ${res.tools.length} tool(s), ${res.resources.length} resource(s), ${res.prompts.length} prompt(s).`
      )
    } else {
      notificationService.notifyError('MCP Discovery', res.error || 'Discovery failed')
    }
  }

  const handleDisconnectServer = async (id: string) => {
    await McpService.disconnectServer(id)
    notificationService.notifyInfo('MCP Studio', `Disconnected server "${id}".`)
  }

  const handleReadResource = async (r: McpResource) => {
    setPreviewTitle(`Resource: ${r.uri}`)
    setPreviewLoading(true)
    setPreviewContent('')
    const res = await McpService.readResourceAsync(r.serverId, r.uri)
    setPreviewLoading(false)
    setPreviewContent(res.success ? res.content : `Error: ${res.error || 'Failed to read resource'}`)
  }

  const handleGetPrompt = async (p: McpPrompt) => {
    setPreviewTitle(`Prompt: ${p.name}`)
    setPreviewLoading(true)
    setPreviewContent('')
    const defaultArgs: Record<string, string> = {}
    for (const arg of p.arguments || []) {
      defaultArgs[arg.name] = arg.name === 'targetLanguage' ? 'typescript' : 'conventional'
    }
    const res = await McpService.getPromptAsync(p.serverId, p.name, defaultArgs)
    setPreviewLoading(false)
    setPreviewContent(res.success ? res.content : `Error: ${res.error || 'Failed to render prompt'}`)
  }

  const handleSelectToolForTesting = (tool: McpToolDefinition) => {
    setSelectedTool(tool)
    setToolResult(null)
    // Generate sample arguments from properties
    const sampleArgs: Record<string, any> = {}
    if (tool.inputSchema?.properties) {
      for (const [k, prop] of Object.entries(tool.inputSchema.properties)) {
        if (prop.default !== undefined) {
          sampleArgs[k] = prop.default
        } else if (prop.type === 'number') {
          sampleArgs[k] = 10
        } else if (prop.type === 'boolean') {
          sampleArgs[k] = true
        } else if (prop.enum && prop.enum.length > 0) {
          sampleArgs[k] = prop.enum[0]
        } else {
          sampleArgs[k] = k === 'url' ? 'https://example.com' : `sample_${k}`
        }
      }
    }
    setToolArgsJson(JSON.stringify(sampleArgs, null, 2))
  }

  const handleRunToolTest = async () => {
    if (!selectedTool) return
    setToolRunning(true)
    setToolResult(null)

    let parsedArgs: Record<string, any> = {}
    try {
      parsedArgs = JSON.parse(toolArgsJson)
    } catch (e: any) {
      notificationService.notifyError('Tool Runner', `Invalid JSON arguments: ${e.message}`)
      setToolRunning(false)
      return
    }

    try {
      const result = await McpService.callTool(selectedTool.serverId, selectedTool.name, parsedArgs)
      setToolResult(result)
      if (result.success) {
        notificationService.notifySuccess('Tool Runner', `Tool "${selectedTool.name}" completed in ${result.latencyMs}ms`)
      } else {
        notificationService.notifyError('Tool Runner', `Tool failed: ${result.output || 'Execution error'}`)
      }
    } catch (err: any) {
      setToolResult({
        serverId: selectedTool.serverId,
        toolName: selectedTool.name,
        success: false,
        output: '',
        isError: true,
        content: [{ type: 'text', text: String(err?.message || err) }],
      })
    } finally {
      setToolRunning(false)
    }
  }

  const handleInstallPreset = (preset: McpServerConfig) => {
    const alreadyExists = Boolean(McpService.getServer(preset.id))
    McpService.saveServer({ ...preset, enabled: true, status: 'connected' })
    notificationService.notifySuccess(
      'MCP Catalog',
      alreadyExists ? `Re-enabled "${preset.name}"` : `Installed and connected "${preset.name}"`
    )
    setActiveTab('servers')
    setSelectedServerId(preset.id)
    setEditingServer({ ...preset, enabled: true, status: 'connected' })
  }

  const handleApplyRawConfig = () => {
    const res = McpService.importConfigFile(rawConfigJson)
    if (res.importedCount > 0) {
      notificationService.notifySuccess('MCP Config', `Successfully imported ${res.importedCount} MCP servers`)
    } else {
      notificationService.notifyError('MCP Config', `Import error: ${res.errors?.join(', ') || 'Invalid JSON'}`)
    }
  }

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(rawConfigJson)
    setCopiedConfig(true)
    setTimeout(() => setCopiedConfig(false), 2000)
    notificationService.notifyInfo('MCP Config', 'Configuration copied to clipboard')
  }

  const handleResetDefaults = () => {
    McpService.resetToDefaults()
    notificationService.notifySuccess('MCP Studio', 'Reset all MCP servers to factory defaults')
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay mcp-studio-overlay" onClick={onClose}>
      <div className="mcp-modal glass-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-badge">
              <Server className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="modal-title-line">
                <div className="modal-title">Model Context Protocol (MCP) Studio</div>
                <span className="sdk-bridge-pill" title="Enabled MCP tools are bridged to Vercel AI SDK v7 via dynamicTool + jsonSchema">
                  Vercel AI SDK · {tools.length} dynamicTools
                </span>
              </div>
              <div className="modal-subtitle">
                Configure stdio & SSE servers, inspect typed JSON schemas, run live tests, and bridge tools to AI Chat.
              </div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} title="Close MCP Studio">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mcp-tab-nav">
          <button
            className={`mcp-tab-btn ${activeTab === 'servers' ? 'active' : ''}`}
            onClick={() => setActiveTab('servers')}
          >
            <Server className="w-4 h-4" />
            <span>Servers ({servers.length})</span>
          </button>
          <button
            className={`mcp-tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
            onClick={() => setActiveTab('tools')}
          >
            <Wrench className="w-4 h-4" />
            <span>Live Tool Tester ({tools.length})</span>
          </button>
          <button
            className={`mcp-tab-btn ${activeTab === 'resources' ? 'active' : ''}`}
            onClick={() => setActiveTab('resources')}
          >
            <Database className="w-4 h-4" />
            <span>Resources & Prompts ({resources.length + prompts.length})</span>
          </button>
          <button
            className={`mcp-tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalog')}
          >
            <Sparkles className="w-4 h-4" />
            <span>Preset Catalog</span>
          </button>
          <button
            className={`mcp-tab-btn ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            <FileCode className="w-4 h-4" />
            <span>mcp_config.json</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="mcp-modal-body">
          {/* TAB 1: SERVERS */}
          {activeTab === 'servers' && (
            <div className="mcp-split-view">
              {/* Left Server List */}
              <div className="mcp-left-pane">
                <div className="pane-header">
                  <span>ACTIVE SERVERS</span>
                  <button className="primary-action-btn-sm" onClick={handleAddNewServer}>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Server</span>
                  </button>
                </div>
                <div className="server-list">
                  {servers.map((s) => (
                    <div
                      key={s.id}
                      className={`server-item ${selectedServerId === s.id ? 'selected' : ''}`}
                      onClick={() => handleSelectServer(s)}
                    >
                      <div className="server-item-header">
                        <div className="server-name-col">
                          <span className={`status-dot ${s.status || 'disconnected'}`} />
                          <span className="server-title">{s.name}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={s.enabled}
                          onChange={(e) => {
                            e.stopPropagation()
                            handleToggleServer(s.id, e.target.checked)
                          }}
                          className="glass-checkbox"
                          title={s.enabled ? 'Disable server' : 'Enable server'}
                        />
                      </div>
                      <div className="server-item-meta">
                        <span className="transport-badge">{s.transport.toUpperCase()}</span>
                        {s.latencyMs !== undefined && (
                          <span className="latency-badge">{s.latencyMs}ms</span>
                        )}
                        <span className="tools-count-badge">
                          {tools.filter((t) => t.serverId === s.id).length} tools
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Server Details / Config Editor */}
              <div className="mcp-right-pane">
                {selectedServerId && editingServer ? (
                  <div className="server-config-form">
                    <div className="form-header-row">
                      <div className="form-title">Server Configuration: {editingServer.name}</div>
                      <div className="form-actions">
                        <button
                          className="secondary-btn-sm"
                          onClick={() => handleDiscoverServer(selectedServerId)}
                          disabled={discoveringServerId === selectedServerId}
                          title="Query tools/list, resources/list, and prompts/list from live server"
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${discoveringServerId === selectedServerId ? 'animate-spin' : ''}`} />
                          <span>{discoveringServerId === selectedServerId ? 'Discovering...' : 'Discover'}</span>
                        </button>
                        <button
                          className="secondary-btn-sm"
                          onClick={() => handlePingServer(selectedServerId)}
                          disabled={pingingServerId === selectedServerId}
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${pingingServerId === selectedServerId ? 'animate-spin' : ''}`} />
                          <span>{pingingServerId === selectedServerId ? 'Pinging...' : 'Ping'}</span>
                        </button>
                        <button
                          className="secondary-btn-sm"
                          onClick={() => handleDisconnectServer(selectedServerId)}
                          title="Terminate active stdio session"
                        >
                          <span>Disconnect</span>
                        </button>
                        <button
                          className="danger-btn-sm"
                          onClick={() => handleDeleteServer(selectedServerId)}
                          title="Delete server"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="form-grid">
                      <label className="form-field">
                        <span>Server Identifier</span>
                        <input
                          type="text"
                          value={selectedServerId}
                          disabled
                          className="glass-input disabled"
                        />
                      </label>

                      <label className="form-field">
                        <span>Display Name</span>
                        <input
                          type="text"
                          value={editingServer.name || ''}
                          onChange={(e) => setEditingServer({ ...editingServer, name: e.target.value })}
                          className="glass-input"
                        />
                      </label>

                      <label className="form-field full-width">
                        <span>Description</span>
                        <input
                          type="text"
                          value={editingServer.description || ''}
                          onChange={(e) => setEditingServer({ ...editingServer, description: e.target.value })}
                          className="glass-input"
                        />
                      </label>

                      <label className="form-field">
                        <span>Transport Protocol</span>
                        <select
                          value={editingServer.transport || 'stdio'}
                          onChange={(e) => setEditingServer({ ...editingServer, transport: e.target.value as any })}
                          className="glass-select"
                        >
                          <option value="stdio">stdio (Local Subprocess / CLI)</option>
                          <option value="sse">sse (Server-Sent Events / HTTP)</option>
                          <option value="builtin">builtin (Integrated Node Runner)</option>
                        </select>
                      </label>

                      <label className="form-field">
                        <span>Timeout (ms)</span>
                        <input
                          type="number"
                          value={editingServer.timeoutMs || 15000}
                          onChange={(e) => setEditingServer({ ...editingServer, timeoutMs: Number(e.target.value) })}
                          className="glass-input"
                        />
                      </label>

                      {editingServer.transport !== 'sse' ? (
                        <>
                          <label className="form-field">
                            <span>Executable Command</span>
                            <input
                              type="text"
                              value={editingServer.command || 'npx'}
                              onChange={(e) => setEditingServer({ ...editingServer, command: e.target.value })}
                              placeholder="e.g. npx, node, python"
                              className="glass-input"
                            />
                          </label>

                          <label className="form-field full-width">
                            <span>Arguments (comma separated or space separated)</span>
                            <input
                              type="text"
                              value={Array.isArray(editingServer.args) ? editingServer.args.join(' ') : ''}
                              onChange={(e) =>
                                setEditingServer({
                                  ...editingServer,
                                  args: e.target.value.split(/\s+/).filter(Boolean),
                                })
                              }
                              placeholder="e.g. -y @modelcontextprotocol/server-filesystem ."
                              className="glass-input font-mono"
                            />
                          </label>
                        </>
                      ) : (
                        <label className="form-field full-width">
                          <span>SSE Endpoint URL</span>
                          <input
                            type="text"
                            value={editingServer.url || ''}
                            onChange={(e) => setEditingServer({ ...editingServer, url: e.target.value })}
                            placeholder="e.g. http://localhost:8000/sse"
                            className="glass-input font-mono"
                          />
                        </label>
                      )}

                      <label className="form-field full-width">
                        <span>{editingServer.transport === 'sse' ? 'HTTP Headers (JSON)' : 'Environment Variables (JSON)'}</span>
                        <textarea
                          value={envOrHeadersJson}
                          onChange={(e) => setEnvOrHeadersJson(e.target.value)}
                          placeholder={editingServer.transport === 'sse' ? '{"Authorization": "Bearer ..."}' : '{"API_KEY": "..."}'}
                          className="glass-textarea font-mono"
                          rows={3}
                        />
                      </label>
                    </div>

                    <div className="form-footer">
                      <button className="primary-action-btn" onClick={handleSaveServer}>
                        <Check className="w-4 h-4" />
                        <span>Save Configuration</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <Server className="w-12 h-12 text-zinc-600 mb-2" />
                    <span>Select a server from the list or add a new one.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LIVE TOOL TESTER */}
          {activeTab === 'tools' && (
            <div className="mcp-split-view">
              {/* Left Tools List */}
              <div className="mcp-left-pane">
                <div className="pane-header">
                  <span>DISCOVERED TOOLS ({tools.length})</span>
                </div>
                <div className="tool-list">
                  {tools.map((t) => (
                    <div
                      key={`${t.serverId}-${t.name}`}
                      className={`tool-item ${selectedTool?.name === t.name ? 'selected' : ''}`}
                      onClick={() => handleSelectToolForTesting(t)}
                    >
                      <div className="tool-item-name">
                        <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{t.name}</span>
                      </div>
                      <div className="tool-item-server">{t.serverName}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Tool Inspector & Execution Sandbox */}
              <div className="mcp-right-pane">
                {selectedTool ? (
                  <div className="tool-tester-panel">
                    <div className="tool-header">
                      <div>
                        <div className="tool-title-large">{selectedTool.name}</div>
                        <div className="tool-desc">{selectedTool.description}</div>
                        <div className="tool-meta-badge">Server: {selectedTool.serverName}</div>
                      </div>
                      <button
                        className="run-tool-btn"
                        onClick={handleRunToolTest}
                        disabled={toolRunning}
                      >
                        <Play className={`w-4 h-4 ${toolRunning ? 'animate-spin' : ''}`} />
                        <span>{toolRunning ? 'Executing...' : 'Run Tool ▶'}</span>
                      </button>
                    </div>

                    {/* Parameters Schema */}
                    <div className="schema-section">
                      <div className="section-title">INPUT SCHEMA PARAMETERS</div>
                      <div className="schema-table">
                        <div className="schema-row header">
                          <span>Param</span>
                          <span>Type</span>
                          <span>Required</span>
                          <span>Description</span>
                        </div>
                        {selectedTool.inputSchema?.properties &&
                        Object.keys(selectedTool.inputSchema.properties).length > 0 ? (
                          Object.entries(selectedTool.inputSchema.properties).map(([k, p]) => (
                            <div key={k} className="schema-row">
                              <span className="font-mono text-cyan-300">{k}</span>
                              <span className="type-badge">{p.type}</span>
                              <span>{selectedTool.inputSchema?.required?.includes(k) ? 'Yes' : 'No'}</span>
                              <span className="text-zinc-400">{p.description || '-'}</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-zinc-500 text-xs">No required parameters.</div>
                        )}
                      </div>
                    </div>

                    {/* Arguments JSON Editor */}
                    <div className="args-section">
                      <div className="section-title">ARGUMENTS (JSON)</div>
                      <textarea
                        value={toolArgsJson}
                        onChange={(e) => setToolArgsJson(e.target.value)}
                        className="glass-textarea font-mono"
                        rows={5}
                      />
                    </div>

                    {/* Output Viewer */}
                    {toolResult && (
                      <div className="output-section">
                        <div className="section-title-row">
                          <span>EXECUTION OUTPUT</span>
                          <span className={`status-pill ${toolResult.success ? 'success' : 'error'}`}>
                            {toolResult.success ? `Success (${toolResult.latencyMs}ms)` : 'Failed'}
                          </span>
                        </div>
                        <pre className="output-box font-mono">{toolResult.output || JSON.stringify(toolResult.content, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Wrench className="w-12 h-12 text-zinc-600 mb-2" />
                    <span>Select a tool to view its schema and execute live queries.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: RESOURCES & PROMPTS */}
          {activeTab === 'resources' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
              <div className="mcp-resources-view" style={{ flex: 1, minHeight: 0 }}>
                <div className="resources-column">
                  <div className="section-title">CONTEXT RESOURCES ({resources.length})</div>
                  <div className="resource-list">
                    {resources.map((r) => (
                      <div key={`${r.serverId}-${r.uri}`} className="resource-card">
                        <div className="resource-uri font-mono">{r.uri}</div>
                        <div className="resource-name">{r.name}</div>
                        <div className="resource-meta" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <span className="mime-badge">{r.mimeType || 'text/plain'}</span>
                            <span className="server-badge">{r.serverName}</span>
                          </div>
                          <button className="secondary-btn-sm" onClick={() => handleReadResource(r)}>
                            <Play className="w-3 h-3" />
                            <span>Read</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    {resources.length === 0 && (
                      <div className="empty-text">No resources exposed by active servers.</div>
                    )}
                  </div>
                </div>

                <div className="resources-column">
                  <div className="section-title">PROMPT TEMPLATES ({prompts.length})</div>
                  <div className="resource-list">
                    {prompts.map((p) => (
                      <div key={`${p.serverId}-${p.name}`} className="resource-card">
                        <div className="prompt-name">{p.name}</div>
                        <div className="prompt-desc">{p.description}</div>
                        <div className="resource-meta" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                          <div className="prompt-args">
                            {p.arguments?.map((a) => (
                              <span key={a.name} className="arg-tag">
                                {a.name} {a.required ? '*' : ''}
                              </span>
                            ))}
                          </div>
                          <button className="secondary-btn-sm" onClick={() => handleGetPrompt(p)}>
                            <Play className="w-3 h-3" />
                            <span>Render</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    {prompts.length === 0 && (
                      <div className="empty-text">No prompt templates exposed.</div>
                    )}
                  </div>
                </div>
              </div>

              {(previewTitle || previewLoading) && (
                <div className="output-section" style={{ flexShrink: 0, maxHeight: '190px', overflow: 'auto' }}>
                  <div className="section-title-row">
                    <span>{previewTitle || 'LOADING...'}</span>
                    <button className="secondary-btn-sm" onClick={() => { setPreviewTitle(''); setPreviewContent('') }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <pre className="output-box font-mono" style={{ maxHeight: '130px', overflow: 'auto' }}>
                    {previewLoading ? 'Fetching from MCP server...' : previewContent}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PRESET CATALOG */}
          {activeTab === 'catalog' && (
            <div className="mcp-catalog-grid">
              {DEFAULT_MCP_PRESETS.map((preset) => {
                const isInstalled = servers.some((s) => s.id === preset.id)
                return (
                  <div key={preset.id} className="catalog-card">
                    <div className="catalog-header">
                      <div className="catalog-title">{preset.name}</div>
                      <span className="catalog-badge">{preset.transport.toUpperCase()}</span>
                    </div>
                    <div className="catalog-desc">{preset.description}</div>
                    <div className="catalog-cmd font-mono">
                      {preset.command} {preset.args?.join(' ')}
                    </div>
                    <div className="catalog-footer">
                      <button
                        className={isInstalled ? 'secondary-btn-sm' : 'primary-action-btn-sm'}
                        onClick={() => handleInstallPreset(preset)}
                      >
                        {isInstalled ? <RotateCw className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        <span>{isInstalled ? 'Reinstall Preset' : 'Install Server'}</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* TAB 5: CONFIG JSON */}
          {activeTab === 'config' && (
            <div className="mcp-config-tab">
              <div className="config-header">
                <div>
                  <div className="font-semibold">mcp_config.json Compatibility Mode</div>
                  <div className="text-xs text-zinc-400">
                    Standard Claude / Gemini / Antigravity MCP configuration schema.
                  </div>
                </div>
                <div className="config-actions">
                  <button className="secondary-btn-sm" onClick={handleCopyConfig}>
                    {copiedConfig ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedConfig ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                  <button className="secondary-btn-sm" onClick={handleResetDefaults}>
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Factory Reset</span>
                  </button>
                  <button className="primary-action-btn-sm" onClick={handleApplyRawConfig}>
                    <Download className="w-3.5 h-3.5" />
                    <span>Apply & Save Config</span>
                  </button>
                </div>
              </div>
              <textarea
                value={rawConfigJson}
                onChange={(e) => setRawConfigJson(e.target.value)}
                className="config-raw-textarea font-mono"
                rows={16}
              />
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

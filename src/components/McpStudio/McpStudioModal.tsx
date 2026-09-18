import React, { useState, useEffect } from 'react'
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

  // Ping status
  const [pingingServerId, setPingingServerId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    refreshData()

    const unsubServers = McpService.onServersChanged(() => refreshData())
    const unsubTools = McpService.onToolsChanged(() => refreshData())

    return () => {
      unsubServers()
      unsubTools()
    }
  }, [isOpen])

  const refreshData = () => {
    const sList = McpService.getServers()
    setServers(sList)
    setTools(McpService.listTools())
    setResources(McpService.listResources())
    setPrompts(McpService.listPrompts())
    setRawConfigJson(McpService.exportConfigFile())

    if (sList.length > 0 && !selectedServerId) {
      setSelectedServerId(sList[0].id)
      setEditingServer({ ...sList[0] })
    }
  }

  const handleSelectServer = (s: McpServerConfig) => {
    setSelectedServerId(s.id)
    setEditingServer({ ...s })
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
    notificationService.notifySuccess('MCP Studio', `Created server "${newServer.name}"`)
  }

  const handleSaveServer = () => {
    if (!selectedServerId || !editingServer.name) return
    McpService.saveServer({
      id: selectedServerId,
      name: editingServer.name || 'MCP Server',
      description: editingServer.description || '',
      transport: editingServer.transport || 'stdio',
      command: editingServer.command || 'npx',
      args: editingServer.args || [],
      env: editingServer.env || {},
      url: editingServer.url,
      headers: editingServer.headers,
      enabled: editingServer.enabled !== false,
      timeoutMs: Number(editingServer.timeoutMs) || 15000,
    })
    notificationService.notifySuccess('MCP Studio', `Saved configuration for "${editingServer.name}"`)
    refreshData()
  }

  const handleDeleteServer = (id: string) => {
    McpService.deleteServer(id)
    notificationService.notifyInfo('MCP Studio', 'Server removed')
    const remaining = McpService.getServers()
    if (remaining.length > 0) {
      setSelectedServerId(remaining[0].id)
      setEditingServer({ ...remaining[0] })
    } else {
      setSelectedServerId(null)
      setEditingServer({})
    }
    refreshData()
  }

  const handleToggleServer = (id: string, enabled: boolean) => {
    McpService.toggleServer(id, enabled)
    refreshData()
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
    refreshData()
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
    const existing = McpService.getServer(preset.id)
    if (existing) {
      McpService.saveServer({ ...preset, enabled: true, status: 'connected' })
      notificationService.notifySuccess('MCP Catalog', `Re-enabled "${preset.name}"`)
    } else {
      McpService.saveServer({ ...preset, enabled: true, status: 'connected' })
      notificationService.notifySuccess('MCP Catalog', `Installed and connected "${preset.name}"`)
    }
    refreshData()
    setActiveTab('servers')
    setSelectedServerId(preset.id)
    setEditingServer({ ...preset })
  }

  const handleApplyRawConfig = () => {
    const res = McpService.importConfigFile(rawConfigJson)
    if (res.importedCount > 0) {
      notificationService.notifySuccess('MCP Config', `Successfully imported ${res.importedCount} MCP servers`)
      refreshData()
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
    refreshData()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="mcp-modal glass-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-badge">
              <Server className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="modal-title">Model Context Protocol (MCP) Studio</div>
              <div className="modal-subtitle">
                Configure stdio & SSE servers, inspect dynamic tool schemas, run live tests, and empower AI agents.
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
                          onClick={() => handlePingServer(selectedServerId)}
                          disabled={pingingServerId === selectedServerId}
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${pingingServerId === selectedServerId ? 'animate-spin' : ''}`} />
                          <span>{pingingServerId === selectedServerId ? 'Pinging...' : 'Ping Server'}</span>
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
            <div className="mcp-resources-view">
              <div className="resources-column">
                <div className="section-title">CONTEXT RESOURCES ({resources.length})</div>
                <div className="resource-list">
                  {resources.map((r) => (
                    <div key={r.uri} className="resource-card">
                      <div className="resource-uri font-mono">{r.uri}</div>
                      <div className="resource-name">{r.name}</div>
                      <div className="resource-meta">
                        <span className="mime-badge">{r.mimeType || 'text/plain'}</span>
                        <span className="server-badge">{r.serverName}</span>
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
                    <div key={p.name} className="resource-card">
                      <div className="prompt-name">{p.name}</div>
                      <div className="prompt-desc">{p.description}</div>
                      <div className="prompt-args">
                        {p.arguments?.map((a) => (
                          <span key={a.name} className="arg-tag">
                            {a.name} {a.required ? '*' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {prompts.length === 0 && (
                    <div className="empty-text">No prompt templates exposed.</div>
                  )}
                </div>
              </div>
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

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .mcp-modal {
          width: 960px;
          max-width: 95vw;
          height: 680px;
          max-height: 92vh;
          background: rgba(18, 14, 28, 0.94);
          border: 1px solid rgba(139, 92, 246, 0.25);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(139, 92, 246, 0.15);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: #e2e8f0;
        }

        .modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
        }

        .modal-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-icon-badge {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-title {
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.3px;
        }

        .modal-subtitle {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 2px;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
        }

        .mcp-tab-nav {
          display: flex;
          gap: 4px;
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.25);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .mcp-tab-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 12px;
          background: transparent;
          border: 1px solid transparent;
          color: rgba(255, 255, 255, 0.65);
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .mcp-tab-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
        }

        .mcp-tab-btn.active {
          color: #fff;
          background: rgba(139, 92, 246, 0.18);
          border-color: rgba(139, 92, 246, 0.35);
          font-weight: 500;
        }

        .mcp-modal-body {
          flex: 1;
          overflow: hidden;
          display: flex;
        }

        .mcp-split-view {
          display: flex;
          width: 100%;
          height: 100%;
        }

        .mcp-left-pane {
          width: 300px;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
        }

        .pane-header {
          padding: 10px 14px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.6px;
          color: rgba(255, 255, 255, 0.5);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .server-list, .tool-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .server-item, .tool-item {
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.05);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .server-item:hover, .tool-item:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(139, 92, 246, 0.25);
        }

        .server-item.selected, .tool-item.selected {
          background: rgba(139, 92, 246, 0.15);
          border-color: rgba(139, 92, 246, 0.45);
        }

        .server-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .server-name-col {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .server-title {
          font-size: 12.5px;
          font-weight: 500;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .status-dot.connected {
          background: #10b981;
          box-shadow: 0 0 6px #10b981;
        }

        .status-dot.disabled {
          background: #64748b;
        }

        .status-dot.error {
          background: #ef4444;
          box-shadow: 0 0 6px #ef4444;
        }

        .server-item-meta {
          display: flex;
          gap: 6px;
          margin-top: 6px;
        }

        .transport-badge, .latency-badge, .tools-count-badge, .type-badge, .mime-badge, .server-badge {
          font-size: 9.5px;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.65);
        }

        .mcp-right-pane {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background: rgba(0, 0, 0, 0.05);
        }

        .server-config-form, .tool-tester-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-header-row, .tool-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 12px;
        }

        .form-title {
          font-size: 14px;
          font-weight: 600;
        }

        .form-actions {
          display: flex;
          gap: 8px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 11.5px;
          color: rgba(255, 255, 255, 0.7);
        }

        .form-field.full-width {
          grid-column: span 2;
        }

        .glass-input, .glass-select, .glass-textarea, .config-raw-textarea {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 8px 10px;
          color: #fff;
          font-size: 12px;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .glass-input:focus, .glass-select:focus, .glass-textarea:focus, .config-raw-textarea:focus {
          border-color: rgba(139, 92, 246, 0.6);
        }

        .glass-input.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .primary-action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #7c3aed, #6366f1);
          border: none;
          border-radius: 6px;
          color: #fff;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }

        .primary-action-btn:hover {
          opacity: 0.9;
        }

        .primary-action-btn-sm {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 9px;
          background: rgba(139, 92, 246, 0.25);
          border: 1px solid rgba(139, 92, 246, 0.4);
          border-radius: 5px;
          color: #fff;
          font-size: 11px;
          cursor: pointer;
        }

        .secondary-btn-sm {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 5px;
          color: #e2e8f0;
          font-size: 11px;
          cursor: pointer;
        }

        .danger-btn-sm {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px 8px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 5px;
          color: #f87171;
          cursor: pointer;
        }

        .run-tool-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: linear-gradient(135deg, #059669, #10b981);
          border: none;
          border-radius: 6px;
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .tool-title-large {
          font-size: 15px;
          font-weight: 600;
          color: #38bdf8;
        }

        .tool-desc {
          font-size: 11.5px;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 2px;
        }

        .tool-meta-badge {
          display: inline-block;
          font-size: 10px;
          padding: 2px 6px;
          background: rgba(255, 255, 255, 0.07);
          border-radius: 4px;
          margin-top: 6px;
        }

        .schema-table {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          overflow: hidden;
          font-size: 11px;
        }

        .schema-row {
          display: grid;
          grid-template-columns: 140px 80px 80px 1fr;
          padding: 7px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          align-items: center;
        }

        .schema-row.header {
          background: rgba(255, 255, 255, 0.04);
          font-weight: 600;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.5);
        }

        .output-box {
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 12px;
          font-size: 11.5px;
          max-height: 180px;
          overflow-y: auto;
          white-space: pre-wrap;
          color: #e2e8f0;
        }

        .status-pill.success {
          font-size: 10px;
          color: #34d399;
          background: rgba(16, 185, 129, 0.15);
          padding: 2px 7px;
          border-radius: 4px;
        }

        .status-pill.error {
          font-size: 10px;
          color: #f87171;
          background: rgba(239, 68, 68, 0.15);
          padding: 2px 7px;
          border-radius: 4px;
        }

        .mcp-resources-view {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          padding: 20px;
          width: 100%;
          overflow-y: auto;
        }

        .resource-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 10px;
        }

        .resource-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 6px;
          padding: 10px 12px;
        }

        .resource-uri {
          font-size: 11.5px;
          color: #a78bfa;
        }

        .resource-name {
          font-size: 12px;
          font-weight: 500;
          margin-top: 3px;
        }

        .resource-meta {
          display: flex;
          gap: 6px;
          margin-top: 6px;
        }

        .mcp-catalog-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
          padding: 20px;
          width: 100%;
          overflow-y: auto;
        }

        .catalog-card {
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 8px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .catalog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .catalog-title {
          font-size: 13px;
          font-weight: 600;
        }

        .catalog-badge {
          font-size: 9px;
          padding: 2px 6px;
          background: rgba(139, 92, 246, 0.2);
          border-radius: 4px;
          color: #c4b5fd;
        }

        .catalog-desc {
          font-size: 11.5px;
          color: rgba(255, 255, 255, 0.6);
          flex: 1;
        }

        .catalog-cmd {
          font-size: 10.5px;
          background: rgba(0, 0, 0, 0.35);
          padding: 6px 8px;
          border-radius: 4px;
          color: #38bdf8;
          word-break: break-all;
        }

        .mcp-config-tab {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 20px;
          width: 100%;
          height: 100%;
        }

        .config-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .config-actions {
          display: flex;
          gap: 8px;
        }

        .config-raw-textarea {
          flex: 1;
          resize: none;
          font-size: 12px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: rgba(255, 255, 255, 0.4);
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}

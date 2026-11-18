import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ArrowUp,
  Square,
  Plus,
  Copy,
  Check,
  Code2,
  Sliders,
  RefreshCw,
  Power,
  Sparkles,
  ChevronDown,
  ChevronRight,
  FileCode,
  Paperclip,
  X,
  AlertTriangle,
  Terminal,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  XCircle,
  ListTodo,
  Wrench,
  ArrowDownToLine,
  Replace,
  KeyRound,
  Download,
  History,
  RotateCcw,
  FileText,
} from 'lucide-react'
import { AntigravityIcon } from '../Brand/AntigravityIcon'
import { antigravityAcpService, DEFAULT_ACP_PROFILES } from '../../services/antigravityAcpService'
import { AiService } from '../../services/aiService'
import { AiTokenizer } from '../../services/aiTokenizer'
import { AiCheckpointService, AiCheckpoint } from '../../services/aiCheckpointService'
import {
  AcpAgentPresetId,
  AcpAgentProfile,
  AcpPermissionRequest,
  AcpPlanEntry,
  AcpSlashCommand,
  AcpStatusInfo,
  AcpStreamEvent,
  AcpToolCallUpdate,
} from '@sdk/types'
import { SelectionInfo } from '../Editor/EditorHost'
import './AntigravityStudioView.css'

export interface AntigravityStudioViewProps {
  workspaceRoot?: string
  activeFileName?: string
  activeFileContent?: string
  currentSelection?: SelectionInfo | null
  onInsertAtCursor?: (code: string) => void
  onReplaceSelection?: (code: string) => void
  onOpenFile?: (filePath: string, line?: number, column?: number) => void
  onApplyFileEdit?: (filePath: string, newContent: string) => Promise<boolean>
  onClose?: () => void
}

interface StudioMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thought?: string
  toolCalls?: AcpToolCallUpdate[]
  attachedContextLabel?: string
  timestamp: number
  isStreaming?: boolean
  stopReason?: string
}

const getBaseName = (p?: string): string => {
  if (!p) return ''
  return p.split(/[/\\]/).pop() || p
}

export const AntigravityStudioView: React.FC<AntigravityStudioViewProps> = ({
  workspaceRoot,
  activeFileName,
  activeFileContent,
  currentSelection,
  onInsertAtCursor,
  onReplaceSelection,
  onOpenFile,
  onApplyFileEdit,
  onClose,
}) => {
  const [status, setStatus] = useState<AcpStatusInfo>(() => antigravityAcpService.getStatus())
  const [profile, setProfile] = useState<AcpAgentProfile>(() => antigravityAcpService.getProfile())
  const [customCmd, setCustomCmd] = useState<string>(() => antigravityAcpService.getProfile().command)
  const [customArgs, setCustomArgs] = useState<string>(() => antigravityAcpService.getProfile().args.join(' '))

  // Auto-install & Workspace Context State
  const [isInstalling, setIsInstalling] = useState(false)
  const [installLogs, setInstallLogs] = useState<string[]>([])
  const [workspaceRules, setWorkspaceRules] = useState<{ fileName: string; content: string } | null>(null)
  const rulesInjectedRef = useRef(false)

  // Chat & Agent State
  const [messages, setMessages] = useState<StudioMessage[]>([])
  const [inputPrompt, setInputPrompt] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [attachMode, setAttachMode] = useState<'none' | 'file' | 'selection'>('none')
  const [planEntries, setPlanEntries] = useState<AcpPlanEntry[]>([])
  const [planExpanded, setPlanExpanded] = useState(true)
  const [slashCommands, setSlashCommands] = useState<AcpSlashCommand[]>([])
  const [pendingPermissions, setPendingPermissions] = useState<AcpPermissionRequest[]>([])

  // Checkpoints / Rollback State
  const [checkpoints, setCheckpoints] = useState<AiCheckpoint[]>([])
  const [showCheckpointsDrawer, setShowCheckpointsDrawer] = useState(false)

  // UI Drawers & Expandables
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false)
  const [showLogsDrawer, setShowLogsDrawer] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({})
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({})
  const [expandedToolDetails, setExpandedToolDetails] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const activeAssistantIdRef = useRef<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const onApplyFileEditRef = useRef(onApplyFileEdit)
  onApplyFileEditRef.current = onApplyFileEdit

  const isConnected = status.state === 'ready' && Boolean(status.sessionId)
  const isBusyConnecting = status.state === 'connecting' || status.state === 'detecting'

  // Discover workspace rules (.indoctrinatedrules, AGENTS.md, etc.)
  useEffect(() => {
    if (!workspaceRoot) {
      setWorkspaceRules(null)
      return
    }
    let mounted = true
    AiService.loadWorkspaceRules(workspaceRoot).then((rules) => {
      if (mounted) setWorkspaceRules(rules)
    })
    return () => {
      mounted = false
    }
  }, [workspaceRoot])

  // Subscribe to shadow checkpoints for 1-click rollback
  useEffect(() => {
    return AiCheckpointService.subscribe((cps) => setCheckpoints(cps))
  }, [])

  // Sync status, detect CLI, and auto-connect out-of-the-box if `agy` is available
  useEffect(() => {
    let mounted = true
    const unsubStatus = antigravityAcpService.onStatusChanged((next) => {
      if (!mounted) return
      setStatus(next)
      if (next.commands) setSlashCommands(next.commands)
    })

    const unsubEvent = antigravityAcpService.onEvent((event: AcpStreamEvent) => {
      if (!mounted) return

      if (event.type === 'log') {
        setLogs((prev) => [...prev.slice(-249), event.line])
        return
      }

      if (event.type === 'install_log') {
        setInstallLogs((prev) => [...prev.slice(-80), event.line])
        return
      }

      if (event.type === 'permission_request') {
        setPendingPermissions((prev) => [...prev, event.request])
        return
      }

      if (event.type === 'plan') {
        setPlanEntries(event.entries)
        return
      }

      if (event.type === 'commands_updated') {
        setSlashCommands(event.commands)
        return
      }

      if (event.type === 'file_written') {
        // Record a shadow checkpoint for 1-click rollback & sync editor buffer
        void AiCheckpointService.recordSnapshot({
          toolCallId: `acp-write-${Date.now()}`,
          filePath: event.path,
          newContent: event.afterContent,
          description: `ACP ${event.isNewFile ? 'Created' : 'Edited'} ${getBaseName(event.path)}`,
          currentContentResolver: async () => (event.isNewFile ? null : event.beforeContent),
        })
        if (onApplyFileEditRef.current) {
          void onApplyFileEditRef.current(event.path, event.afterContent)
        }
        return
      }

      if (event.type === 'error') {
        setActionError(event.message)
        return
      }

      if (event.type === 'prompt_done') {
        const targetId = activeAssistantIdRef.current
        if (targetId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === targetId ? { ...m, isStreaming: false, stopReason: event.stopReason } : m
            )
          )
        }
        activeAssistantIdRef.current = null
        setIsStreaming(false)
        return
      }

      const targetId = activeAssistantIdRef.current
      if (!targetId) return

      if (event.type === 'message_chunk') {
        setMessages((prev) =>
          prev.map((m) => (m.id === targetId ? { ...m, content: m.content + event.text } : m))
        )
      } else if (event.type === 'thought_chunk') {
        setMessages((prev) =>
          prev.map((m) => (m.id === targetId ? { ...m, thought: (m.thought || '') + event.text } : m))
        )
      } else if (event.type === 'tool_call') {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== targetId) return m
            const existing = m.toolCalls || []
            const idx = existing.findIndex((t) => t.toolCallId === event.toolCall.toolCallId)
            const nextCalls =
              idx >= 0
                ? existing.map((t, i) => (i === idx ? { ...t, ...event.toolCall } : t))
                : [...existing, event.toolCall]
            return { ...m, toolCalls: nextCalls }
          })
        )
      } else if (event.type === 'tool_call_update') {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== targetId) return m
            const existing = m.toolCalls || []
            const idx = existing.findIndex((t) => t.toolCallId === event.toolCall.toolCallId)
            if (idx >= 0) {
              const nextCalls = existing.map((t, i) =>
                i === idx ? { ...t, ...event.toolCall } : t
              )
              return { ...m, toolCalls: nextCalls }
            }
            return {
              ...m,
              toolCalls: [
                ...existing,
                {
                  title: event.toolCall.title || 'Agent Action',
                  status: event.toolCall.status || 'in_progress',
                  ...event.toolCall,
                },
              ],
            }
          })
        )
      }
    })

    antigravityAcpService.syncStatus().then(async (current) => {
      if (!mounted) return
      const existingLogs = await antigravityAcpService.getLogs()
      if (mounted) setLogs(existingLogs)

      if (current.state === 'disconnected') {
        const det = await antigravityAcpService.detectCli()
        // Auto-connect out-of-the-box if the official binary is already installed
        if (mounted && det.installed && antigravityAcpService.isElectronAvailable()) {
          await antigravityAcpService.connect(workspaceRoot)
        }
      }
    })

    return () => {
      mounted = false
      unsubStatus()
      unsubEvent()
    }
  }, [workspaceRoot])

  // Auto-scroll messages container
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages, pendingPermissions, isStreaming])

  const handleInstallCli = useCallback(async () => {
    setActionError(null)
    setInstallLogs([])
    setIsInstalling(true)
    try {
      const res = await antigravityAcpService.installCli()
      if (res.success && res.binary?.installed) {
        await antigravityAcpService.connect(workspaceRoot)
      } else if (res.error) {
        setActionError(res.error)
      }
    } catch (err: any) {
      setActionError(err?.message || 'Automatic installation failed.')
    } finally {
      setIsInstalling(false)
    }
  }, [workspaceRoot])

  const handleConnect = useCallback(async () => {
    setActionError(null)
    const next = await antigravityAcpService.connect(workspaceRoot)
    if (next.state === 'error' && next.lastError) {
      setActionError(next.lastError)
    }
  }, [workspaceRoot])

  const handleDisconnect = useCallback(async () => {
    setActionError(null)
    setPendingPermissions([])
    setIsStreaming(false)
    activeAssistantIdRef.current = null
    rulesInjectedRef.current = false
    await antigravityAcpService.disconnect()
  }, [])

  const handleAuthenticate = useCallback(async (methodId: string) => {
    setActionError(null)
    try {
      await antigravityAcpService.authenticate(methodId)
    } catch (err: any) {
      setActionError(err?.message || 'Authentication failed. Click "Sign In in Terminal" to complete Google login.')
    }
  }, [])

  const handleNewSession = useCallback(async () => {
    setActionError(null)
    setPlanEntries([])
    setPendingPermissions([])
    setMessages([])
    activeAssistantIdRef.current = null
    rulesInjectedRef.current = false
    setIsStreaming(false)
    if (isConnected) {
      try {
        await antigravityAcpService.newSession(workspaceRoot)
      } catch (err: any) {
        setActionError(err?.message || 'Failed to start a new ACP session.')
      }
    }
  }, [isConnected, workspaceRoot])

  const handleRollbackCheckpoint = async (checkpointId: string) => {
    await AiCheckpointService.rollbackCheckpoint(checkpointId, async (filePath, content) => {
      if (onApplyFileEdit) return await onApplyFileEdit(filePath, content)
      if (typeof window !== 'undefined' && window.electronAPI?.saveFile) {
        return await window.electronAPI.saveFile(filePath, content)
      }
      return false
    })
  }

  const handleSelectPreset = (presetId: AcpAgentPresetId) => {
    const found = DEFAULT_ACP_PROFILES.find((p) => p.id === presetId) || DEFAULT_ACP_PROFILES[0]
    setProfile(found)
    setCustomCmd(found.command)
    setCustomArgs(found.args.join(' '))
    antigravityAcpService.saveProfile(found)
    void antigravityAcpService.detectCli(found.command)
  }

  const handleSaveCustomProfile = async () => {
    const updated: AcpAgentProfile = {
      ...profile,
      command: customCmd.trim() || 'agy',
      args: customArgs.trim().split(/\s+/).filter(Boolean),
    }
    setProfile(updated)
    antigravityAcpService.saveProfile(updated)
    await antigravityAcpService.detectCli(updated.command)
    setShowSettingsDrawer(false)
  }

  const handleResolvePermission = async (requestId: string | number, optionId: string | null) => {
    setPendingPermissions((prev) => prev.filter((p) => p.requestId !== requestId))
    await antigravityAcpService.respondPermission(requestId, optionId)
  }

  const handleSendPrompt = async () => {
    const trimmed = inputPrompt.trim()
    if (!trimmed || isStreaming || !isConnected) return

    setActionError(null)
    let fullPrompt = trimmed
    let attachedContextLabel: string | undefined

    // Prepend workspace rules once per ACP session for consistent project behavior
    if (workspaceRules && !rulesInjectedRef.current) {
      rulesInjectedRef.current = true
      fullPrompt = `[Project Guidelines from ${workspaceRules.fileName}]:\n${workspaceRules.content.slice(0, 4000)}\n\n${fullPrompt}`
    }

    if (attachMode === 'selection' && currentSelection?.text) {
      attachedContextLabel = `${getBaseName(activeFileName)} (L${currentSelection.startLine}-${currentSelection.endLine})`
      fullPrompt = `${fullPrompt}\n\nSelected code from \`${activeFileName || 'active file'}\` (lines ${currentSelection.startLine}-${currentSelection.endLine}):\n\`\`\`\n${currentSelection.text}\n\`\`\``
    } else if (attachMode === 'file' && activeFileContent) {
      attachedContextLabel = getBaseName(activeFileName) || 'Active File'
      const optimized =
        activeFileContent.length > 24000
          ? AiTokenizer.optimizeContextSnippet(activeFileContent, 12000).content
          : activeFileContent
      fullPrompt = `${fullPrompt}\n\nActive file \`${activeFileName || 'untitled'}\`:\n\`\`\`\n${optimized}\n\`\`\``
    }

    const userMsg: StudioMessage = {
      id: `acp-user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      attachedContextLabel,
      timestamp: Date.now(),
    }

    const assistantId = `acp-assistant-${Date.now() + 1}`
    const assistantMsg: StudioMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      thought: '',
      toolCalls: [],
      timestamp: Date.now() + 1,
      isStreaming: true,
    }

    activeAssistantIdRef.current = assistantId
    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInputPrompt('')
    setAttachMode('none')
    setIsStreaming(true)

    try {
      const res = await antigravityAcpService.sendPrompt(fullPrompt)
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false, stopReason: res?.stopReason } : m))
      )
    } catch (err: any) {
      const errText = err?.message || String(err)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                isStreaming: false,
                content: m.content
                  ? `${m.content}\n\n*(ACP Error: ${errText})*`
                  : `⚠️ **ACP Error**: ${errText}`,
              }
            : m
        )
      )
    } finally {
      activeAssistantIdRef.current = null
      setIsStreaming(false)
    }
  }

  const handleStopPrompt = async () => {
    await antigravityAcpService.cancelPrompt()
    setPendingPermissions([])
    setIsStreaming(false)
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const toggleDrawer = (which: 'settings' | 'logs' | 'checkpoints') => {
    setShowSettingsDrawer((v) => (which === 'settings' ? !v : false))
    setShowLogsDrawer((v) => (which === 'logs' ? !v : false))
    setShowCheckpointsDrawer((v) => (which === 'checkpoints' ? !v : false))
  }

  const matchingSlashCommands =
    inputPrompt.startsWith('/') && slashCommands.length > 0
      ? slashCommands.filter((c) => `/${c.name}`.toLowerCase().startsWith(inputPrompt.toLowerCase())).slice(0, 6)
      : []

  const renderToolContentDetails = (tc: AcpToolCallUpdate) => {
    const blocks = tc.content || []
    const outputText =
      typeof tc.rawOutput === 'string'
        ? tc.rawOutput
        : tc.rawOutput && typeof tc.rawOutput === 'object'
        ? JSON.stringify(tc.rawOutput, null, 2)
        : ''

    if (blocks.length === 0 && !outputText) return null

    return (
      <div className="ag-tool-details">
        {blocks.map((block, bIdx) => {
          if (block.type === 'diff' && (block.oldText !== undefined || block.newText !== undefined)) {
            const oldLines = (block.oldText || '').split('\n').slice(0, 30)
            const newLines = (block.newText || '').split('\n').slice(0, 30)
            return (
              <div key={bIdx} className="ag-inline-diff custom-scrollbar">
                {block.path && <div className="ag-diff-path">{getBaseName(block.path)}</div>}
                {block.oldText &&
                  oldLines.map((l, i) => (
                    <div key={`o-${i}`} className="ag-diff-line removed">
                      - {l}
                    </div>
                  ))}
                {block.newText &&
                  newLines.map((l, i) => (
                    <div key={`n-${i}`} className="ag-diff-line added">
                      + {l}
                    </div>
                  ))}
              </div>
            )
          }
          const txt = block.text || block.content?.text
          if (txt) {
            return (
              <pre key={bIdx} className="ag-tool-output-pre custom-scrollbar">
                {txt.slice(0, 3000)}
              </pre>
            )
          }
          return null
        })}
        {blocks.length === 0 && outputText && (
          <pre className="ag-tool-output-pre custom-scrollbar">{outputText.slice(0, 3000)}</pre>
        )}
      </div>
    )
  }

  const renderMarkdownContent = (msg: StudioMessage) => {
    if (!msg.content) {
      if (msg.isStreaming && (!msg.toolCalls || msg.toolCalls.length === 0)) {
        return (
          <div className="ag-streaming-placeholder">
            <Loader2 size={12} className="ag-spin" />
            <span>Antigravity agent is working…</span>
          </div>
        )
      }
      return null
    }

    const segments = msg.content.split(/(```[\s\S]*?```)/g)
    return (
      <div className="ag-msg-body">
        {segments.map((seg, idx) => {
          if (seg.startsWith('```') && seg.endsWith('```')) {
            const firstNewline = seg.indexOf('\n')
            const lang = firstNewline > 3 ? seg.slice(3, firstNewline).trim() : 'code'
            const code = firstNewline > -1 ? seg.slice(firstNewline + 1, -3) : seg.slice(3, -3)
            const blockId = `${msg.id}-code-${idx}`

            return (
              <div key={blockId} className="ag-code-card">
                <div className="ag-code-header">
                  <span className="ag-code-lang">
                    <Code2 size={11} />
                    {lang || 'code'}
                  </span>
                  <div className="ag-code-actions">
                    <button
                      className="ag-code-btn glass-interactive"
                      onClick={() => handleCopy(code, blockId)}
                      title="Copy code"
                    >
                      {copiedId === blockId ? <Check size={11} /> : <Copy size={11} />}
                      <span>{copiedId === blockId ? 'Copied' : 'Copy'}</span>
                    </button>
                    {onInsertAtCursor && (
                      <button
                        className="ag-code-btn glass-interactive"
                        onClick={() => onInsertAtCursor(code)}
                        title="Insert at cursor"
                      >
                        <ArrowDownToLine size={11} />
                        <span>Insert</span>
                      </button>
                    )}
                    {onReplaceSelection && currentSelection?.text && (
                      <button
                        className="ag-code-btn glass-interactive"
                        onClick={() => onReplaceSelection(code)}
                        title="Replace active selection"
                      >
                        <Replace size={11} />
                        <span>Replace</span>
                      </button>
                    )}
                  </div>
                </div>
                <pre className="ag-code-pre custom-scrollbar">
                  <code>{code}</code>
                </pre>
              </div>
            )
          }

          return (
            <div key={idx} className="ag-text-segment">
              {seg.split('\n').map((line, lIdx) => (
                <React.Fragment key={lIdx}>
                  {line}
                  {lIdx < seg.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  const statusBadge = (() => {
    if (isConnected) {
      return {
        cls: 'ready',
        label: status.agentInfo?.name
          ? `${status.agentInfo.name}${status.agentInfo.version ? ` v${status.agentInfo.version}` : ''}`
          : status.binary.version || 'Connected (ACP)',
      }
    }
    if (isInstalling) return { cls: 'connecting', label: 'Installing agy…' }
    if (isBusyConnecting) return { cls: 'connecting', label: 'Connecting…' }
    if (status.state === 'authenticating') return { cls: 'auth', label: 'Sign-In Required' }
    if (!status.binary.installed) return { cls: 'offline', label: `${profile.command} not installed` }
    return { cls: 'offline', label: 'Disconnected' }
  })()

  return (
    <div className="ag-studio-root">
      {/* Liquid Glass Header — Consistent with AI Chat Panel */}
      <div className="ag-header">
        <div className="ag-header-left">
          <div className="ag-brand-badge">
            <AntigravityIcon size={15} />
          </div>
          <div className="ag-title-stack">
            <div className="ag-title-row">
              <span className="ag-title">Antigravity</span>
              <span className="ag-acp-tag">ACP</span>
              {workspaceRules && (
                <span className="ag-rules-tag" title={`Loaded workspace rules: ${workspaceRules.fileName}`}>
                  <FileText size={9} />
                  {workspaceRules.fileName}
                </span>
              )}
            </div>
            <div className={`ag-status-pill ${statusBadge.cls}`}>
              <span className="ag-status-dot" />
              <span className="ag-status-text">{statusBadge.label}</span>
            </div>
          </div>
        </div>

        <div className="ag-header-actions">
          {isConnected && (
            <button
              className="ag-icon-btn glass-interactive"
              onClick={handleNewSession}
              title="New ACP Session"
            >
              <Plus size={14} />
            </button>
          )}
          {checkpoints.length > 0 && (
            <button
              className={`ag-icon-btn glass-interactive ${showCheckpointsDrawer ? 'active' : ''}`}
              onClick={() => toggleDrawer('checkpoints')}
              title={`File Checkpoints & 1-Click Rollback (${checkpoints.length})`}
            >
              <History size={13} />
            </button>
          )}
          <button
            className={`ag-icon-btn glass-interactive ${showSettingsDrawer ? 'active' : ''}`}
            onClick={() => toggleDrawer('settings')}
            title="ACP Agent & Binary Configuration"
          >
            <Sliders size={13} />
          </button>
          <button
            className={`ag-icon-btn glass-interactive ${showLogsDrawer ? 'active' : ''}`}
            onClick={() => toggleDrawer('logs')}
            title="ACP Protocol & Stderr Logs"
          >
            <Terminal size={13} />
          </button>
          {isConnected && (
            <button
              className="ag-icon-btn danger glass-interactive"
              onClick={handleDisconnect}
              title="Disconnect ACP Agent"
            >
              <Power size={13} />
            </button>
          )}
          {onClose && (
            <button className="ag-icon-btn glass-interactive" onClick={onClose} title="Close Panel">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Mode / Model Sub-Bar when agent advertises modes or models */}
      {isConnected && ((status.modes && status.modes.length > 0) || (status.models && status.models.length > 0)) && (
        <div className="ag-controls-bar">
          {status.modes && status.modes.length > 0 && (
            <label className="ag-select-wrap">
              <span>Mode</span>
              <select
                value={status.currentModeId || status.modes[0].id}
                onChange={(e) => void antigravityAcpService.setMode(e.target.value)}
              >
                {status.modes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {status.models && status.models.length > 0 && (
            <label className="ag-select-wrap">
              <span>Model</span>
              <select
                value={status.currentModelId || status.models[0].modelId}
                onChange={(e) => void antigravityAcpService.setModel(e.target.value)}
              >
                {status.models.map((m) => (
                  <option key={m.modelId} value={m.modelId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {/* Slide-Down Checkpoints / Rollback Drawer */}
      {showCheckpointsDrawer && (
        <div className="ag-drawer glass-card">
          <div className="ag-drawer-header">
            <span className="ag-drawer-title">Shadow File Checkpoints ({checkpoints.length})</span>
            <button className="ag-code-btn glass-interactive" onClick={() => setShowCheckpointsDrawer(false)}>
              <X size={11} />
            </button>
          </div>
          <div className="ag-checkpoints-list custom-scrollbar">
            {checkpoints.slice(0, 12).map((cp) => (
              <div key={cp.id} className="ag-checkpoint-row">
                <div className="ag-checkpoint-info">
                  <span className="ag-checkpoint-desc">{cp.description}</span>
                  <span className="ag-checkpoint-time">
                    {new Date(cp.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <button
                  className="ag-code-btn glass-interactive"
                  disabled={cp.restored}
                  onClick={() => void handleRollbackCheckpoint(cp.id)}
                >
                  <RotateCcw size={10} />
                  <span>{cp.restored ? 'Restored' : 'Rollback'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slide-Down Settings Drawer */}
      {showSettingsDrawer && (
        <div className="ag-drawer glass-card">
          <div className="ag-drawer-title">ACP Agent Binary Configuration</div>
          <div className="ag-preset-chips">
            {DEFAULT_ACP_PROFILES.map((p) => (
              <button
                key={p.id}
                className={`ag-preset-chip glass-interactive ${profile.id === p.id ? 'active' : ''}`}
                onClick={() => handleSelectPreset(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="ag-form-grid">
            <label className="ag-field">
              <span>CLI Executable</span>
              <input
                type="text"
                value={customCmd}
                onChange={(e) => setCustomCmd(e.target.value)}
                placeholder="agy"
              />
            </label>
            <label className="ag-field">
              <span>ACP Arguments</span>
              <input
                type="text"
                value={customArgs}
                onChange={(e) => setCustomArgs(e.target.value)}
                placeholder="acp"
              />
            </label>
          </div>
          <div className="ag-drawer-footer">
            <span className="ag-resolved-path" title={status.binary.resolvedPath || ''}>
              {status.binary.resolvedPath ? `Path: ${status.binary.resolvedPath}` : 'Not detected on PATH'}
            </span>
            <button className="ag-btn-primary sm glass-interactive" onClick={handleSaveCustomProfile}>
              Save &amp; Re-scan
            </button>
          </div>
        </div>
      )}

      {/* Slide-Down Live ACP Diagnostics Logs */}
      {showLogsDrawer && (
        <div className="ag-drawer glass-card">
          <div className="ag-drawer-header">
            <span className="ag-drawer-title">ACP Stdio &amp; Diagnostic Logs ({logs.length})</span>
            <button
              className="ag-code-btn glass-interactive"
              onClick={() => handleCopy(logs.join('\n'), 'acp-logs')}
            >
              {copiedId === 'acp-logs' ? <Check size={11} /> : <Copy size={11} />}
              <span>{copiedId === 'acp-logs' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="ag-logs-box custom-scrollbar">
            {logs.length > 0 ? logs.join('\n') : 'No ACP logs recorded yet.'}
          </pre>
        </div>
      )}

      {/* Error Banner */}
      {(actionError || (status.state === 'error' && status.lastError)) && (
        <div className="ag-error-banner">
          <AlertTriangle size={13} />
          <span>{actionError || status.lastError}</span>
          <button onClick={() => setActionError(null)}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* Main Canvas: Onboarding / Auto-Install / Auth OR Live ACP Agent Chat */}
      {!isConnected ? (
        <div className="ag-onboarding custom-scrollbar">
          <div className="ag-hero-card glass-card">
            <div className="ag-hero-icon">
              <AntigravityIcon size={28} />
            </div>
            <h3>Google Antigravity ACP Studio</h3>
            <p>
              Connect directly to your personal <strong>Google Pro / Ultra</strong> or{' '}
              <strong>Business</strong> Antigravity subscription via the official{' '}
              <code>agy acp</code> protocol — full file read/write, terminal commands, MCP tools, and zero API keys.
            </p>

            {/* Authentication Required State */}
            {status.state === 'authenticating' ? (
              <div className="ag-auth-box">
                <div className="ag-auth-title">
                  <KeyRound size={13} />
                  <span>Authenticate with Google Antigravity</span>
                </div>
                <p className="ag-auth-desc">
                  Sign in with your Google Pro/Ultra or Business account using the official <code>{profile.command}</code> CLI:
                </p>
                <div className="ag-auth-buttons">
                  {status.authMethods?.map((m) => (
                    <button
                      key={m.id}
                      className="ag-btn-primary glass-interactive"
                      onClick={() => handleAuthenticate(m.id)}
                    >
                      <Sparkles size={13} />
                      <span>{m.name || m.id}</span>
                    </button>
                  ))}
                  <button
                    className="ag-btn-secondary glass-interactive"
                    onClick={() => void antigravityAcpService.launchCliLogin(profile.command)}
                  >
                    <Terminal size={13} />
                    <span>Sign In in Terminal</span>
                  </button>
                </div>
              </div>
            ) : status.binary.installed ? (
              <div className="ag-ready-connect">
                <div className="ag-detected-pill">
                  <CheckCircle2 size={13} />
                  <span>
                    Found <code>{profile.command}</code>
                    {status.binary.version ? ` (${status.binary.version})` : ''}
                  </span>
                </div>
                <div className="ag-install-actions">
                  <button
                    className="ag-btn-primary full glass-interactive"
                    onClick={handleConnect}
                    disabled={isBusyConnecting}
                  >
                    {isBusyConnecting ? (
                      <>
                        <Loader2 size={14} className="ag-spin" />
                        <span>Starting {profile.command} {profile.args.join(' ')}…</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Connect ({profile.command} {profile.args.join(' ')})</span>
                      </>
                    )}
                  </button>
                  <button
                    className="ag-btn-secondary full glass-interactive"
                    onClick={() => void antigravityAcpService.launchCliLogin(profile.command)}
                  >
                    <KeyRound size={13} />
                    <span>Sign In / Switch Google Account in Terminal</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="ag-install-box">
                <div className="ag-missing-pill">
                  <ShieldAlert size={13} />
                  <span>Official <code>{profile.command}</code> CLI not detected yet</span>
                </div>
                <ol className="ag-steps-list">
                  <li>
                    Click <strong>Install Antigravity CLI</strong> below to install Google&apos;s official <code>agy</code> binary automatically.
                  </li>
                  <li>
                    Sign in once with your Google Pro/Ultra or Business account.
                  </li>
                  <li>
                    IndoctrinatedEdit will connect over <code>agy acp</code> automatically.
                  </li>
                </ol>
                <div className="ag-install-actions">
                  {profile.command === 'agy' && (
                    <button
                      className="ag-btn-primary full glass-interactive"
                      onClick={() => void handleInstallCli()}
                      disabled={isInstalling}
                    >
                      {isInstalling ? (
                        <>
                          <Loader2 size={14} className="ag-spin" />
                          <span>Installing Official agy CLI…</span>
                        </>
                      ) : (
                        <>
                          <Download size={14} />
                          <span>Install Antigravity CLI (1-Click)</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    className="ag-btn-secondary glass-interactive"
                    onClick={() => void antigravityAcpService.detectCli(profile.command)}
                    disabled={isBusyConnecting || isInstalling}
                  >
                    <RefreshCw size={13} className={isBusyConnecting ? 'ag-spin' : ''} />
                    <span>Re-scan PATH</span>
                  </button>
                  <button
                    className="ag-btn-secondary glass-interactive"
                    onClick={() => void antigravityAcpService.openExternalUrl(status.binary.installUrl)}
                  >
                    <ExternalLink size={13} />
                    <span>CLI Docs</span>
                  </button>
                </div>
                {installLogs.length > 0 && (
                  <pre className="ag-logs-box custom-scrollbar" style={{ width: '100%', textAlign: 'left' }}>
                    {installLogs.join('\n')}
                  </pre>
                )}
                <button
                  className="ag-link-btn"
                  onClick={() => toggleDrawer('settings')}
                >
                  Configure custom executable path or Gemini CLI ACP →
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Live Agent Plan Checklist */}
          {planEntries.length > 0 && (
            <div className="ag-plan-bar glass-card">
              <button
                className="ag-plan-header"
                onClick={() => setPlanExpanded((v) => !v)}
              >
                <div className="ag-plan-title">
                  <ListTodo size={12} />
                  <span>
                    Agent Plan ({planEntries.filter((e) => e.status === 'completed').length}/{planEntries.length})
                  </span>
                </div>
                {planExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              {planExpanded && (
                <div className="ag-plan-items">
                  {planEntries.map((entry, i) => (
                    <div key={i} className={`ag-plan-item ${entry.status}`}>
                      {entry.status === 'completed' ? (
                        <CheckCircle2 size={11} className="text-emerald" />
                      ) : entry.status === 'in_progress' ? (
                        <Loader2 size={11} className="ag-spin text-cyan" />
                      ) : (
                        <span className="ag-plan-bullet" />
                      )}
                      <span>{entry.content}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages Feed */}
          <div className="ag-messages custom-scrollbar" ref={messagesContainerRef}>
            {messages.length === 0 && (
              <div className="ag-empty-chat">
                <AntigravityIcon size={24} />
                <div className="ag-empty-title">Connected via Official ACP</div>
                <div className="ag-empty-sub">
                  Workspace: <code>{status.cwd || workspaceRoot || 'Active Workspace'}</code>
                </div>
                <div className="ag-empty-sub">
                  Full read/write files, guarded terminal commands, and MCP Studio tools are active for this session.
                </div>
              </div>
            )}

            {messages.map((msg) => {
              const isUser = msg.role === 'user'
              const isThoughtOpen = Boolean(expandedThoughts[msg.id])
              const isToolsOpen = expandedTools[msg.id] !== false && (msg.toolCalls?.length || 0) > 0

              return (
                <div key={msg.id} className={`ag-msg-row ${isUser ? 'user' : 'assistant'}`}>
                  <div className={`ag-msg-bubble ${isUser ? 'user' : 'assistant'}`}>
                    {msg.attachedContextLabel && (
                      <div className="ag-context-chip">
                        <Paperclip size={10} />
                        <span>{msg.attachedContextLabel}</span>
                      </div>
                    )}

                    {/* Collapsible Agent Thought / Reasoning */}
                    {msg.thought && (
                      <div className="ag-thought-card">
                        <button
                          className="ag-thought-header"
                          onClick={() =>
                            setExpandedThoughts((prev) => ({ ...prev, [msg.id]: !isThoughtOpen }))
                          }
                        >
                          <Sparkles size={11} />
                          <span>Agent Reasoning</span>
                          {isThoughtOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        </button>
                        {isThoughtOpen && <div className="ag-thought-body">{msg.thought}</div>}
                      </div>
                    )}

                    {/* Cline/Kilo-Style ACP Tool Activity Dropdown with Diff & Output Preview */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="ag-tools-dropdown">
                        <button
                          className="ag-tools-header"
                          onClick={() =>
                            setExpandedTools((prev) => ({ ...prev, [msg.id]: !isToolsOpen }))
                          }
                        >
                          <div className="ag-tools-header-left">
                            <Wrench size={11} />
                            <span>
                              {msg.toolCalls.length === 1
                                ? msg.toolCalls[0].title
                                : `${msg.toolCalls.length} agent actions`}
                            </span>
                          </div>
                          {isToolsOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        </button>
                        {isToolsOpen && (
                          <div className="ag-tools-list">
                            {msg.toolCalls.map((tc) => {
                              const hasDetails = Boolean(
                                (tc.content && tc.content.length > 0) || tc.rawOutput
                              )
                              const isDetailOpen = Boolean(expandedToolDetails[tc.toolCallId])
                              return (
                                <div key={tc.toolCallId} className={`ag-tool-row ${tc.status}`}>
                                  <div className="ag-tool-row-top">
                                    <span className="ag-tool-status-icon">
                                      {tc.status === 'completed' ? (
                                        <CheckCircle2 size={11} className="text-emerald" />
                                      ) : tc.status === 'failed' ? (
                                        <XCircle size={11} className="text-red" />
                                      ) : (
                                        <Loader2 size={11} className="ag-spin text-cyan" />
                                      )}
                                    </span>
                                    <span className="ag-tool-title">{tc.title}</span>
                                    {tc.kind && <span className="ag-tool-kind">{tc.kind}</span>}
                                    {hasDetails && (
                                      <button
                                        className="ag-peek-btn glass-interactive"
                                        onClick={() =>
                                          setExpandedToolDetails((prev) => ({
                                            ...prev,
                                            [tc.toolCallId]: !isDetailOpen,
                                          }))
                                        }
                                      >
                                        {isDetailOpen ? 'Hide' : 'Details'}
                                      </button>
                                    )}
                                  </div>
                                  {tc.locations && tc.locations.length > 0 && (
                                    <div className="ag-tool-locations">
                                      {tc.locations.map((loc, locIdx) => (
                                        <button
                                          key={locIdx}
                                          className="ag-loc-chip glass-interactive"
                                          onClick={() => onOpenFile?.(loc.path, loc.line)}
                                          title={`Open ${loc.path}`}
                                        >
                                          <FileCode size={10} />
                                          <span>
                                            {getBaseName(loc.path)}
                                            {loc.line ? `:${loc.line}` : ''}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {isDetailOpen && renderToolContentDetails(tc)}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {renderMarkdownContent(msg)}
                  </div>
                </div>
              )
            })}

            {/* Interactive ACP Permission Requests (`session/request_permission`) */}
            {pendingPermissions.map((req) => (
              <div key={String(req.requestId)} className="ag-permission-card glass-card">
                <div className="ag-permission-header">
                  <ShieldCheck size={14} className="text-amber" />
                  <div className="ag-permission-info">
                    <div className="ag-permission-title">{req.toolCall.title}</div>
                    {req.toolCall.kind && (
                      <div className="ag-permission-sub">Action kind: {req.toolCall.kind}</div>
                    )}
                  </div>
                </div>
                <div className="ag-permission-actions">
                  {req.options.map((opt) => {
                    const isReject = opt.kind.startsWith('reject')
                    const isAlways = opt.kind === 'allow_always'
                    return (
                      <button
                        key={opt.optionId}
                        className={`ag-perm-btn glass-interactive ${isReject ? 'reject' : isAlways ? 'always' : 'allow'}`}
                        onClick={() => void handleResolvePermission(req.requestId, opt.optionId)}
                      >
                        {opt.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Liquid Glass Prompt Composer */}
          <div className="ag-composer-wrap">
            {/* ACP Slash Command Autocomplete Popover */}
            {matchingSlashCommands.length > 0 && (
              <div className="ag-slash-popup glass-card">
                {matchingSlashCommands.map((cmd) => (
                  <button
                    key={cmd.name}
                    className="ag-slash-item glass-interactive"
                    onClick={() => {
                      setInputPrompt(`/${cmd.name} `)
                      textareaRef.current?.focus()
                    }}
                  >
                    <span className="ag-slash-name">/{cmd.name}</span>
                    {cmd.description && <span className="ag-slash-desc">{cmd.description}</span>}
                  </button>
                ))}
              </div>
            )}

            <div className="ag-attach-bar">
              {activeFileName && (
                <button
                  className={`ag-attach-pill glass-interactive ${attachMode === 'file' ? 'active' : ''}`}
                  onClick={() => setAttachMode((m) => (m === 'file' ? 'none' : 'file'))}
                  title="Include active file content (auto-optimized for token efficiency)"
                >
                  <FileCode size={11} />
                  <span>{getBaseName(activeFileName)}</span>
                </button>
              )}
              {currentSelection?.text && (
                <button
                  className={`ag-attach-pill glass-interactive ${attachMode === 'selection' ? 'active' : ''}`}
                  onClick={() => setAttachMode((m) => (m === 'selection' ? 'none' : 'selection'))}
                  title="Include current editor selection"
                >
                  <Paperclip size={11} />
                  <span>
                    Selection (L{currentSelection.startLine}-{currentSelection.endLine})
                  </span>
                </button>
              )}
            </div>

            <div className="ag-composer-box">
              <textarea
                ref={textareaRef}
                className="ag-composer-input"
                rows={2}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void handleSendPrompt()
                  }
                }}
                placeholder="Ask Google Antigravity via ACP… (Enter to send, / for commands)"
                disabled={isStreaming}
              />
              {isStreaming ? (
                <button
                  className="ag-send-btn stop glass-interactive"
                  onClick={() => void handleStopPrompt()}
                  title="Cancel turn (session/cancel)"
                >
                  <Square size={12} />
                </button>
              ) : (
                <button
                  className="ag-send-btn glass-interactive"
                  onClick={() => void handleSendPrompt()}
                  disabled={!inputPrompt.trim()}
                  title="Send prompt (Enter)"
                >
                  <ArrowUp size={14} />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

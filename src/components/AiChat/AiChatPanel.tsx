import React, { useState, useEffect, useRef } from 'react'
import {
  Bot,
  Sparkles,
  Key,
  Trash2,
  X,
  Paperclip,
  ArrowUp,
  Square,
  Check,
  Copy,
  Code2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff,
  Layers,
  ArrowDownToLine,
  Replace,
  Play,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Zap,
  TestTube2,
  FileText,
  Terminal,
  FileCode,
  FolderSearch,
  Globe,
  GitBranch,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCheck,
  Cpu,
  CornerDownLeft,
  Server,
  Compass,
} from 'lucide-react'
import { McpService } from '../../services/mcpService'
import {
  AiChatMessage,
  AiModelOption,
  AiProvider,
  AiChatMode,
  AiAutoApproveSettings,
  AutoApprovePreset,
  AiToolCall,
  AiToolResult,
} from '@sdk/types'
import {
  AiService,
  PRESET_MODELS,
  AiSettingsMap,
  AUTO_APPROVE_PRESETS,
  hasActionablePlan,
} from '../../services/aiService'
import { AiTokenizer, TokenBreakdown } from '../../services/aiTokenizer'
import { SelectionInfo } from '../Editor/EditorHost'
import { terminalService } from '../../services/terminalService'
import {
  AiToolExecutor,
  AiToolParser,
  AiToolsRegistry,
} from '../../services/aiToolsService'
import { DiagnosticsService } from '../../services/diagnosticsService'

interface AiChatPanelProps {
  isOpen: boolean
  onClose: () => void
  activeFileName?: string
  activeFileContent?: string
  currentSelection: SelectionInfo | null
  workspaceRoot?: string
  openFiles?: Array<{ path: string; name: string; content?: string }>
  onInsertAtCursor?: (code: string) => void
  onReplaceSelection?: (code: string) => void
  onOpenFile?: (filePath: string, line?: number, column?: number) => void
}

export const AiChatPanel: React.FC<AiChatPanelProps> = ({
  isOpen,
  onClose,
  activeFileName = 'untitled.ts',
  activeFileContent = '',
  currentSelection,
  workspaceRoot,
  openFiles,
  onInsertAtCursor,
  onReplaceSelection,
  onOpenFile,
}) => {
  // Mode State (Plan Mode vs Act Mode)
  const [chatMode, setChatMode] = useState<AiChatMode>(AiService.getActiveMode())
  const [planModelId, setPlanModelId] = useState<string>(AiService.getPlanModelId())
  const [actModelId, setActModelId] = useState<string>(AiService.getActModelId())

  // Settings & Models
  const [settings, setSettings] = useState<AiSettingsMap>(AiService.getSettings())
  const [autoApprove, setAutoApprove] = useState<AiAutoApproveSettings>(AiService.getAutoApproveSettings())
  const [models, setModels] = useState<AiModelOption[]>(PRESET_MODELS)
  const [selectedModelId, setSelectedModelId] = useState<string>(
    chatMode === 'plan' ? AiService.getPlanModelId() : AiService.getActModelId()
  )
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'keys' | 'permissions' | 'modes'>('keys')
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})

  // Chat State
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Hello! I'm your **IndoctrinatedEdit** AI Assistant.\n\nChoose **Plan Mode** for architecture, research & design without code modifications, or **Act Mode** to write code, edit files, and execute commands. Type **\`@\`** to inject editor context, or **\`/\`** for instant slash commands!`,
      timestamp: Date.now(),
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [cancelFn, setCancelFn] = useState<(() => void) | null>(null)
  const [attachedContext, setAttachedContext] = useState<{
    type: 'selection' | 'file' | 'problems' | 'terminal' | 'git' | 'workspace'
    fileName?: string
    code?: string
    startLine?: number
    endLine?: number
    meta?: Record<string, any>
  } | null>(null)

  // Mentions & Slash Command Autocomplete State
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  const [menuIndex, setMenuIndex] = useState(0)

  // Interactive Tools & Diff States
  const [executingToolId, setExecutingToolId] = useState<string | null>(null)
  const [appliedDiffs, setAppliedDiffs] = useState<Record<string, boolean>>({})

  // Expand reasoning cards
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({})
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null)

  const modelSelectorRef = useRef<HTMLDivElement | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Close model selector dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modelSelectorRef.current &&
        !modelSelectorRef.current.contains(e.target as Node)
      ) {
        setIsModelDropdownOpen(false)
      }
    }

    if (isModelDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isModelDropdownOpen])

  // Auto-scroll inside messages container
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages, isStreaming])

  // Subscribe to auto-approve setting updates across views
  useEffect(() => {
    const unsub = AiService.onAutoApproveChanged((newAutoApprove) => {
      setAutoApprove(newAutoApprove)
    })
    return () => unsub()
  }, [])

  // Discover local Ollama models on mount
  useEffect(() => {
    let isMounted = true
    AiService.fetchOllamaModels(settings.ollama.endpoint).then((ollamaModels) => {
      if (isMounted && ollamaModels.length > 0) {
        setModels((prev) => {
          const nonOllama = prev.filter((m) => m.provider !== 'ollama')
          return [...nonOllama, ...ollamaModels]
        })
      }
    })
    return () => {
      isMounted = false
    }
  }, [settings.ollama.endpoint])

  // Switch between Plan Mode and Act Mode
  const handleSwitchMode = (newMode: AiChatMode) => {
    setChatMode(newMode)
    AiService.setActiveMode(newMode)
    const targetModelId = newMode === 'plan' ? planModelId : actModelId
    setSelectedModelId(targetModelId)
    AiService.setActiveModelId(targetModelId)
  }

  const handleSelectModel = (modelId: string) => {
    setSelectedModelId(modelId)
    AiService.setActiveModelId(modelId)
    if (chatMode === 'plan') {
      setPlanModelId(modelId)
      AiService.setPlanModelId(modelId)
    } else {
      setActModelId(modelId)
      AiService.setActModelId(modelId)
    }
  }

  const selectedModel =
    models.find((m) => m.id === selectedModelId) ||
    models.find((m) => m.id === (chatMode === 'plan' ? planModelId : actModelId)) ||
    models[0]

  // Live Token Breakdown
  const systemPromptForMode = `${AiService.getModeSystemPrompt(chatMode)}\n\n${AiToolsRegistry.getToolsSystemPrompt()}`
  const tokenBreakdown: TokenBreakdown = AiTokenizer.estimateConversation(
    systemPromptForMode,
    messages,
    inputText,
    attachedContext,
    selectedModel.id
  )

  const handleToggleAutoApprove = (key: keyof AiAutoApproveSettings, val: boolean | number) => {
    const updated: AiAutoApproveSettings = {
      ...autoApprove,
      [key]: val,
    }
    setAutoApprove(updated)
    AiService.saveAutoApproveSettings(updated)
  }

  const handleApplyPreset = (preset: AutoApprovePreset) => {
    const target = AUTO_APPROVE_PRESETS[preset]
    if (target) {
      const updated = { ...target }
      setAutoApprove(updated)
      AiService.saveAutoApproveSettings(updated)
    }
  }

  /* =========================================================================
   * 🎯 Context Mentions Resolvers
   * ========================================================================= */

  const handleAttachSelection = () => {
    if (!currentSelection || !currentSelection.text) return
    setAttachedContext({
      type: 'selection',
      fileName: activeFileName,
      code: currentSelection.text,
      startLine: currentSelection.startLine,
      endLine: currentSelection.endLine,
    })
  }

  const handleAttachActiveFile = () => {
    if (!activeFileContent) return
    setAttachedContext({
      type: 'file',
      fileName: activeFileName,
      code: activeFileContent,
    })
  }

  const handleAttachProblems = () => {
    const groups = DiagnosticsService.getInstance().getAllGroups()
    const errorCount = groups.reduce((acc, g) => acc + g.errorCount, 0)
    const warnCount = groups.reduce((acc, g) => acc + g.warningCount, 0)

    const list: string[] = []
    groups.forEach((g) => {
      g.items.forEach((item) => {
        const sev = item.severity === 'error' ? '🔴 Error' : item.severity === 'warning' ? '🟡 Warning' : 'ℹ️ Info'
        list.push(`[${sev}] ${g.fileName}:${item.startLineNumber}:${item.startColumn} - ${item.message}`)
      })
    })

    setAttachedContext({
      type: 'problems',
      fileName: `Diagnostics (${errorCount} errors, ${warnCount} warnings)`,
      code: list.join('\n') || 'No active diagnostics found in workspace.',
    })
  }

  const handleAttachTerminal = () => {
    const active = terminalService.getActiveTab()
    const buffer = active ? active.buffer.slice(-60).join('\n') : 'No active terminal session.'
    setAttachedContext({
      type: 'terminal',
      fileName: active ? `Terminal (${active.title})` : 'Terminal Buffer',
      code: buffer,
    })
  }

  const handleAttachGit = async () => {
    let summary = 'Git repository not loaded.'
    if (typeof window !== 'undefined' && window.electronAPI?.git?.getRepoStatus) {
      const status = await window.electronAPI.git.getRepoStatus(workspaceRoot)
      if (status && status.isRepo) {
        const staged = status.staged.map((s) => `  [Staged] ${s.path}`).join('\n')
        const working = status.working.map((w) => `  [Modified] ${w.path}`).join('\n')
        summary = `Branch: ${status.branch} (Ahead: ${status.ahead}, Behind: ${status.behind})\n\nStaged Changes:\n${staged || '  (None)'}\n\nWorking Changes:\n${working || '  (None)'}`
      }
    }
    setAttachedContext({
      type: 'git',
      fileName: 'Git Status & Diffs',
      code: summary,
    })
  }

  const handleAttachWorkspace = async () => {
    let summary = 'Workspace summary'
    if (typeof window !== 'undefined' && window.electronAPI?.readFolder && workspaceRoot) {
      const folder = await window.electronAPI.readFolder(workspaceRoot)
      if (folder && folder.files) {
        summary = `Workspace: ${folder.folderName} (${folder.folderPath})\nFiles:\n` +
          folder.files.map((f) => `  ${f.isDirectory ? '📁' : '📄'} ${f.name}`).join('\n')
      }
    } else if (openFiles && openFiles.length > 0) {
      summary = `Open Files (${openFiles.length}):\n` + openFiles.map((f) => `  📄 ${f.name}`).join('\n')
    }
    setAttachedContext({
      type: 'workspace',
      fileName: 'Workspace Structure',
      code: summary,
    })
  }

  const handleRemoveAttachment = () => {
    setAttachedContext(null)
  }

  /* =========================================================================
   * ⚡ Quick Actions & Slash Commands
   * ========================================================================= */

  const handleQuickAction = (action: 'explain' | 'bugs' | 'refactor' | 'tests' | 'docs' | 'arch' | 'fix' | 'commit' | 'run') => {
    let prompt = ''
    if (action === 'explain') {
      prompt = 'Explain the attached code in detail. Break down the architecture, logic, and key data structures.'
    } else if (action === 'bugs') {
      prompt = 'Review the attached code for potential bugs, security vulnerabilities, edge cases, and unexpected side effects.'
    } else if (action === 'refactor') {
      prompt = 'Propose a clean, modern, and high-performance refactored version of this code. Explain your improvements.'
    } else if (action === 'tests') {
      prompt = 'Write a comprehensive suite of unit tests for this code with high coverage and edge case assertions.'
    } else if (action === 'docs') {
      prompt = 'Generate comprehensive, clear docstrings and API documentation for all classes, functions, and interfaces.'
    } else if (action === 'arch') {
      prompt = 'Perform an architectural review of this module. Evaluate cohesion, coupling, state management, and design patterns.'
    } else if (action === 'fix') {
      handleAttachProblems()
      prompt = 'Analyze the active compiler and linter problems in the editor and propose a precise fix.'
    } else if (action === 'commit') {
      handleAttachGit()
      prompt = 'Analyze the git status and diffs and write a concise, conventional git commit message.'
    } else if (action === 'run') {
      prompt = 'Trigger the configured project run profile and inspect the execution output.'
    }

    if (!attachedContext && action !== 'fix' && action !== 'commit') {
      if (currentSelection?.text) {
        handleAttachSelection()
      } else if (activeFileContent) {
        handleAttachActiveFile()
      }
    }

    setInputText(prompt)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  /* =========================================================================
   * 🛠️ Tool Execution & Multi-Turn Autonomous Loop
   * ========================================================================= */

  const executeToolCall = async (msgId: string, toolCall: AiToolCall, currentHistory: AiChatMessage[], iteration: number = 0) => {
    setExecutingToolId(toolCall.id)

    // Mark tool call as executing in state
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.toolCalls) {
          return {
            ...m,
            toolCalls: m.toolCalls.map((tc) => (tc.id === toolCall.id ? { ...tc, status: 'executing' as const } : tc)),
          }
        }
        return m
      })
    )

    const context = {
      mode: chatMode,
      workspaceRoot,
      activeFileName,
      activeFileContent,
      openFiles,
      onOpenFile,
      onApplyFileEdit: async (filePath: string, newContent: string) => {
        if (onReplaceSelection && currentSelection?.text) {
          onReplaceSelection(newContent)
          return true
        }
        if (typeof window !== 'undefined' && window.electronAPI?.saveFile) {
          return await window.electronAPI.saveFile(filePath, newContent)
        }
        return false
      },
    }

    const result: AiToolResult = await AiToolExecutor.execute(toolCall, context)

    // Update message state with execution result
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          const updatedCalls = (m.toolCalls || []).map((tc) =>
            tc.id === toolCall.id
              ? {
                  ...tc,
                  status: result.success ? ('completed' as const) : ('failed' as const),
                  executedAt: Date.now(),
                  guardrailNote: result.error?.includes('Guardrail') ? result.error : undefined,
                }
              : tc
          )
          const updatedResults = [...(m.toolResults || []), result]
          return {
            ...m,
            toolCalls: updatedCalls,
            toolResults: updatedResults,
          }
        }
        return m
      })
    )

    setExecutingToolId(null)

    // If autoApprove is enabled for write and tool was propose_file_edit, auto-apply diff if preset allows
    if (toolCall.toolName === 'propose_file_edit' && autoApprove.autoApproveWrite && result.diff?.fullContent) {
      handleApplyDiff(result.diff)
    }

    // Multi-turn autonomous follow-up if within max iterations
    const maxIters = autoApprove.maxAutoIterations || 10
    if (iteration < maxIters && result.success && autoApprove.autoApproveRead) {
      // Check if there are other pending calls in this message
      // If not, trigger next turn with tool response
      setTimeout(() => {
        triggerAutonomousFollowup(result, currentHistory, iteration + 1)
      }, 400)
    }
  }

  const triggerAutonomousFollowup = (_result: AiToolResult, history: AiChatMessage[], _iteration: number) => {
    const assistantMsgId = `assistant-agent-${Date.now()}`
    const assistantMsg: AiChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      reasoning: '',
      isAgentTurn: true,
      timestamp: Date.now(),
    }

    const updatedHistory: AiChatMessage[] = [...history, assistantMsg]
    setMessages(updatedHistory)
    setIsStreaming(true)

    const cancel = AiService.streamChat(selectedModel, history, (chunk) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === assistantMsgId) {
            return {
              ...msg,
              content: chunk.text ? msg.content + chunk.text : msg.content,
              reasoning: chunk.reasoning ? (msg.reasoning || '') + chunk.reasoning : msg.reasoning,
            }
          }
          return msg
        })
      )

      if (chunk.done || chunk.error) {
        setIsStreaming(false)
        setCancelFn(null)
      }
    })

    setCancelFn(() => cancel)
  }

  const handleApproveTool = (msgId: string, toolCall: AiToolCall) => {
    executeToolCall(msgId, toolCall, messages, 0)
  }

  const handleRejectTool = (msgId: string, toolCall: AiToolCall) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.toolCalls) {
          return {
            ...m,
            toolCalls: m.toolCalls.map((tc) =>
              tc.id === toolCall.id ? { ...tc, status: 'rejected' as const } : tc
            ),
          }
        }
        return m
      })
    )
  }

  const handleApplyDiff = async (diff: NonNullable<AiToolResult['diff']>) => {
    if (!diff.fullContent && !diff.newSnippet) return

    let success = false
    if (diff.fullContent) {
      if (typeof window !== 'undefined' && window.electronAPI?.saveFile) {
        success = await window.electronAPI.saveFile(diff.filePath, diff.fullContent)
      } else if (onReplaceSelection && currentSelection?.text) {
        onReplaceSelection(diff.fullContent)
        success = true
      }
    } else if (diff.newSnippet && onReplaceSelection) {
      onReplaceSelection(diff.newSnippet)
      success = true
    }

    if (success) {
      setAppliedDiffs((prev) => ({ ...prev, [diff.filePath]: true }))
    }
  }

  /* =========================================================================
   * 💬 Send Message & Stream Processing
   * ========================================================================= */

  const handleSendMessage = () => {
    if ((!inputText.trim() && !attachedContext) || isStreaming) return

    // Smart context optimization for attached files/buffers
    let optimizedAttachment = attachedContext ? { ...attachedContext } : undefined
    if (optimizedAttachment?.code && optimizedAttachment.code.length > 30000) {
      const optimized = AiTokenizer.optimizeContextSnippet(optimizedAttachment.code, 12000)
      optimizedAttachment.code = optimized.content
    }

    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputText.trim() || (optimizedAttachment ? `Please inspect the attached ${optimizedAttachment.type}.` : ''),
      attachment: optimizedAttachment,
      timestamp: Date.now(),
    }

    const assistantMsgId = `assistant-${Date.now()}`
    const assistantMsg: AiChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      reasoning: '',
      timestamp: Date.now(),
    }

    const newHistory = [...messages, userMsg]
    setMessages([...newHistory, assistantMsg])
    setInputText('')
    setAttachedContext(null)
    setMentionOpen(false)
    setSlashOpen(false)
    setIsStreaming(true)

    setExpandedReasoning((prev) => ({ ...prev, [assistantMsgId]: true }))

    let accumulatedText = ''

    // Prepend system prompt for current mode
    const systemMsg: AiChatMessage = {
      id: `sys-${Date.now()}`,
      role: 'system',
      content: systemPromptForMode,
      timestamp: Date.now(),
    }

    const streamHistory = [systemMsg, ...newHistory]

    const cancel = AiService.streamChat(selectedModel, streamHistory, async (chunk) => {
      if (chunk.text) {
        accumulatedText += chunk.text
      }

      setMessages((prevMessages) => {
        return prevMessages.map((msg) => {
          if (msg.id === assistantMsgId) {
            return {
              ...msg,
              content: chunk.text ? msg.content + chunk.text : msg.content,
              reasoning: chunk.reasoning ? (msg.reasoning || '') + chunk.reasoning : msg.reasoning,
            }
          }
          return msg
        })
      })

      if (chunk.done || chunk.error) {
        setIsStreaming(false)
        setCancelFn(null)

        if (chunk.error) {
          setMessages((prevMessages) => {
            return prevMessages.map((msg) => {
              if (msg.id === assistantMsgId) {
                return {
                  ...msg,
                  content: msg.content
                    ? `${msg.content}\n\n*(Error during generation: ${chunk.error})*`
                    : `⚠️ **Error**: ${chunk.error}\n\nPlease verify your API key or endpoint in AI Settings.`,
                }
              }
              return msg
            })
          })
        } else {
          // Parse any tool calls emitted by the model
          const parsedCalls = AiToolParser.parseToolCalls(accumulatedText)
          if (parsedCalls.length > 0) {
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id === assistantMsgId) {
                  return { ...msg, toolCalls: parsedCalls }
                }
                return msg
              })
            )

            // Execute any auto-approved calls
            for (const call of parsedCalls) {
              if (call.status === 'approved' || call.autoApproved) {
                await executeToolCall(assistantMsgId, call, [...newHistory, assistantMsg], 0)
              }
            }
          }
        }
      }
    })

    setCancelFn(() => cancel)
  }

  const handleStopStream = () => {
    cancelFn?.()
    setIsStreaming(false)
    setCancelFn(null)
  }

  const handleClearHistory = () => {
    setMessages([])
    setAttachedContext(null)
  }

  const handleSaveSettings = (provider: AiProvider, field: 'apiKey' | 'endpoint', value: string) => {
    const cleanVal = field === 'apiKey' ? value.trim() : value
    const updated = {
      ...settings,
      [provider]: {
        ...settings[provider],
        [field]: cleanVal,
      },
    }
    setSettings(updated)
    AiService.saveSettings(updated)
  }

  const handleRefreshOllama = async () => {
    const ollamaModels = await AiService.fetchOllamaModels(settings.ollama.endpoint)
    if (ollamaModels.length > 0) {
      setModels((prev) => {
        const nonOllama = prev.filter((m) => m.provider !== 'ollama')
        return [...nonOllama, ...ollamaModels]
      })
    }
  }

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCodeId(id)
    setTimeout(() => setCopiedCodeId(null), 2000)
  }

  const handleRunCodeInTerminal = async (code: string) => {
    let active = terminalService.getActiveTab()
    if (!active) {
      active = await terminalService.createTab()
    }
    terminalService.write(active.id, code.trim() + '\n')
  }

  const getProviderColor = (provider: AiProvider) => {
    switch (provider) {
      case 'deepseek':
        return '#BF5AF2'
      case 'openai':
        return '#30D158'
      case 'gemini':
        return '#0A84FF'
      case 'claude':
        return '#FF9F0A'
      case 'ollama':
        return '#FFD60A'
      default:
        return '#00F0FF'
    }
  }

  // Handle Input typing and Mention / Slash triggers
  const handleInputChange = (val: string) => {
    setInputText(val)

    // Check for @ mention trigger
    const lastAt = val.lastIndexOf('@')
    if (lastAt !== -1 && (lastAt === 0 || /\s/.test(val[lastAt - 1]))) {
      const q = val.slice(lastAt + 1)
      if (!q.includes(' ')) {
        setMentionOpen(true)
        setMentionFilter(q.toLowerCase())
        setSlashOpen(false)
        setMenuIndex(0)
        return
      }
    }
    setMentionOpen(false)

    // Check for / slash command trigger
    if (val.startsWith('/')) {
      const q = val.slice(1)
      if (!q.includes(' ')) {
        setSlashOpen(true)
        setSlashFilter(q.toLowerCase())
        setMentionOpen(false)
        setMenuIndex(0)
        return
      }
    }
    setSlashOpen(false)
  }

  const MENTION_OPTIONS = [
    { id: 'selection', label: '@selection', desc: 'Current editor selection', icon: FileCode, action: handleAttachSelection },
    { id: 'file', label: '@file', desc: `Active file: ${activeFileName}`, icon: Layers, action: handleAttachActiveFile },
    { id: 'problems', label: '@problems', desc: 'Active compiler/linter diagnostics', icon: AlertTriangle, action: handleAttachProblems },
    { id: 'terminal', label: '@terminal', desc: 'Recent terminal output buffer', icon: Terminal, action: handleAttachTerminal },
    { id: 'git', label: '@git', desc: 'Git status & staged/working diffs', icon: GitBranch, action: handleAttachGit },
    { id: 'workspace', label: '@workspace', desc: 'Workspace directory tree', icon: FolderSearch, action: handleAttachWorkspace },
  ]

  const filteredMentions = MENTION_OPTIONS.filter((m) =>
    m.label.toLowerCase().includes(mentionFilter) || m.desc.toLowerCase().includes(mentionFilter)
  )

  const SLASH_OPTIONS = [
    { id: 'fix', label: '/fix', desc: 'Diagnose & fix active editor problems', icon: ShieldCheck, action: () => handleQuickAction('fix') },
    { id: 'test', label: '/test', desc: 'Generate high-coverage unit tests', icon: TestTube2, action: () => handleQuickAction('tests') },
    { id: 'commit', label: '/commit', desc: 'Generate conventional git commit message', icon: GitBranch, action: () => handleQuickAction('commit') },
    { id: 'refactor', label: '/refactor', desc: 'Propose clean, high-performance refactoring', icon: Zap, action: () => handleQuickAction('refactor') },
    { id: 'explain', label: '/explain', desc: 'Explain code logic and architecture', icon: Sparkles, action: () => handleQuickAction('explain') },
    { id: 'run', label: '/run', desc: 'Trigger run profile & inspect output', icon: Play, action: () => handleQuickAction('run') },
    { id: 'docs', label: '/docs', desc: 'Generate comprehensive docstrings', icon: FileText, action: () => handleQuickAction('docs') },
  ]

  const filteredSlash = SLASH_OPTIONS.filter((s) =>
    s.label.toLowerCase().includes(slashFilter) || s.desc.toLowerCase().includes(slashFilter)
  )

  // Parse markdown code blocks
  const renderMessageContent = (msg: AiChatMessage) => {
    const parts = msg.content.split(/(```[\w-]*\n[\s\S]*?\n```)/g)

    return (
      <div className="message-content-wrapper">
        {parts.map((part, idx) => {
          if (part.startsWith('```')) {
            const match = part.match(/^```([\w-]*)\n([\s\S]*?)\n```$/)
            const lang = match ? match[1] || 'text' : 'text'
            const code = match ? match[2] : part.slice(3, -3)
            const codeBlockId = `${msg.id}-code-${idx}`

            return (
              <div key={idx} className="ai-code-block glass-card">
                <div className="ai-code-header">
                  <div className="code-lang-pill">
                    <Code2 size={11} className="lang-icon" />
                    <span>{lang}</span>
                  </div>
                  <div className="code-actions">
                    <button
                      className="code-action-btn glass-interactive"
                      onClick={() => handleCopyCode(code, codeBlockId)}
                      title="Copy Code"
                    >
                      {copiedCodeId === codeBlockId ? (
                        <>
                          <Check size={11} className="text-success" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {onInsertAtCursor && (
                      <button
                        className={`code-action-btn glass-interactive ${
                          autoApprove.autoApproveWrite ? 'auto-write-btn' : ''
                        }`}
                        onClick={() => onInsertAtCursor(code)}
                        title={
                          autoApprove.autoApproveWrite
                            ? 'Auto-Approved: Insert at cursor'
                            : 'Insert at Cursor in Editor'
                        }
                      >
                        <ArrowDownToLine size={11} />
                        <span>{autoApprove.autoApproveWrite ? 'Auto Insert' : 'Insert'}</span>
                      </button>
                    )}

                    {onReplaceSelection && currentSelection?.text && (
                      <button
                        className={`code-action-btn glass-interactive ${
                          autoApprove.autoApproveWrite ? 'auto-write-btn' : ''
                        }`}
                        onClick={() => onReplaceSelection(code)}
                        title={
                          autoApprove.autoApproveWrite
                            ? 'Auto-Approved: Replace selection'
                            : 'Replace current selection'
                        }
                      >
                        <Replace size={11} />
                        <span>{autoApprove.autoApproveWrite ? 'Auto Replace' : 'Replace'}</span>
                      </button>
                    )}

                    <button
                      className={`code-action-btn run glass-interactive ${
                        autoApprove.autoApproveRun ? 'auto-run-btn' : ''
                      }`}
                      onClick={() => handleRunCodeInTerminal(code)}
                      title={
                        autoApprove.autoApproveRun
                          ? 'Auto-Approved: Direct Execution in Terminal'
                          : 'Approve & Run in Terminal'
                      }
                    >
                      <Play size={10} fill="currentColor" />
                      <span>{autoApprove.autoApproveRun ? 'Auto Run ▶' : 'Run'}</span>
                    </button>
                  </div>
                </div>
                <pre className="ai-code-body custom-scrollbar">
                  <code>{code}</code>
                </pre>
              </div>
            )
          }

          return (
            <div key={idx} className="ai-text-block">
              {part.split('\n').map((line, lIdx) => (
                <p key={lIdx} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />
              ))}
            </div>
          )
        })}

        {/* Plan Mode Handoff Banner - Only shown when the model generates an actionable implementation plan */}
        {msg.role === 'assistant' && chatMode === 'plan' && !isStreaming && hasActionablePlan(msg.content) && (
          <div className="plan-handoff-banner glass-subcard">
            <div className="plan-handoff-left">
              <Compass size={14} className="text-sapphire" />
              <div className="plan-handoff-text">
                <span className="plan-handoff-title">Implementation Plan Ready</span>
                <span className="plan-handoff-subtitle">
                  Switch to Act Mode to autonomously write code, apply diffs, and run commands.
                </span>
              </div>
            </div>
            <button
              className="switch-to-act-btn glass-interactive"
              onClick={() => {
                handleSwitchMode('act')
                setInputText('Proceed with executing the plan step-by-step.')
                if (textareaRef.current) textareaRef.current.focus()
              }}
              title="Switch to Act Mode with configured Act model to execute plan"
            >
              <Zap size={11} />
              <span>⚡ Switch to Act Mode & Execute</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <aside className="ai-chat-panel">
      {/* Background Ambient Glow Orbs */}
      <div className="ai-ambient-orb orb-1" />
      <div className="ai-ambient-orb orb-2" />

      {/* Header Bar */}
      <header className="ai-panel-header">
        <div className="ai-header-left">
          <div className="ai-brand-pill">
            <Sparkles size={14} className="sparkle-icon" />
            <span className="panel-title">AI Assistant</span>
          </div>

          {/* Model Selector Dropdown */}
          <div className="model-selector-container" ref={modelSelectorRef}>
            <button
              className="model-pill glass-interactive"
              onClick={() => {
                setIsModelDropdownOpen(!isModelDropdownOpen)
                setIsSettingsOpen(false)
              }}
              title={`Select AI Model for ${chatMode === 'plan' ? 'Plan' : 'Act'} Mode`}
            >
              <span
                className="provider-dot"
                style={{ backgroundColor: getProviderColor(selectedModel.provider) }}
              />
              <span className="model-name">{selectedModel.name}</span>
              <ChevronDown size={11} />
            </button>

            {isModelDropdownOpen && (
              <div
                className="model-dropdown-menu glass-panel custom-scrollbar"
                onWheel={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="dropdown-header">
                  Available AI Models ({chatMode === 'plan' ? 'Plan Mode' : 'Act Mode'})
                </div>
                <div className="dropdown-list">
                  {models.map((model) => {
                    return (
                      <button
                        key={model.id}
                        className={`model-option ${model.id === selectedModel.id ? 'active' : ''}`}
                        onClick={() => {
                          handleSelectModel(model.id)
                          setIsModelDropdownOpen(false)
                        }}
                      >
                        <div className="model-option-info">
                          <div className="model-option-name">
                            <span
                              className="provider-dot"
                              style={{ backgroundColor: getProviderColor(model.provider) }}
                            />
                            <span>{model.name}</span>
                            {model.supportsReasoning && <span className="cot-badge">CoT Thinking</span>}
                          </div>
                          <div className="model-option-desc">{model.description}</div>
                        </div>
                        {model.id === selectedModel.id && <Check size={13} className="check-active" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Auto-Approve Status Pill */}
          <button
            className={`auto-approve-pill glass-interactive ${
              autoApprove.autoApproveRun && autoApprove.autoApproveWrite
                ? 'status-full'
                : autoApprove.autoApproveRead
                ? 'status-semi'
                : 'status-strict'
            }`}
            onClick={() => {
              setSettingsTab('permissions')
              setIsSettingsOpen(true)
              setIsModelDropdownOpen(false)
            }}
            title="Configure Autonomous Permissions & Auto-Approve (Read, Write, Run)"
          >
            <Shield size={11} className="shield-icon" />
            <span className="auto-pill-label">
              {autoApprove.autoApproveRun && autoApprove.autoApproveWrite
                ? 'Full Auto'
                : autoApprove.autoApproveRun
                ? 'Auto Run'
                : autoApprove.autoApproveWrite
                ? 'Auto Write'
                : autoApprove.autoApproveRead
                ? 'Auto Read'
                : 'Prompt All'}
            </span>
          </button>
        </div>

        <div className="ai-header-right">
          <button
            className="icon-btn glass-interactive"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-mcp-studio'))
            }}
            title={`MCP Host Studio: ${McpService.getServers().filter((s) => s.enabled).length} active servers, ${McpService.listTools().length} tools`}
          >
            <Server size={13} />
          </button>
          <button
            className={`icon-btn glass-interactive ${isSettingsOpen && settingsTab === 'permissions' ? 'active' : ''}`}
            onClick={() => {
              if (isSettingsOpen && settingsTab === 'permissions') {
                setIsSettingsOpen(false)
              } else {
                setSettingsTab('permissions')
                setIsSettingsOpen(true)
                setIsModelDropdownOpen(false)
              }
            }}
            title="Auto-Approve & Permissions (Read, Write, Run)"
          >
            <ShieldCheck size={13} />
          </button>
          <button
            className={`icon-btn glass-interactive ${isSettingsOpen && settingsTab === 'keys' ? 'active' : ''}`}
            onClick={() => {
              if (isSettingsOpen && settingsTab === 'keys') {
                setIsSettingsOpen(false)
              } else {
                setSettingsTab('keys')
                setIsSettingsOpen(true)
                setIsModelDropdownOpen(false)
              }
            }}
            title="Configure API Keys & Endpoints (BYOK / Subscriptions)"
          >
            <Key size={13} />
          </button>
          <button
            className="icon-btn glass-interactive"
            onClick={handleClearHistory}
            title="Clear Chat History"
          >
            <Trash2 size={13} />
          </button>
          <button
            className="icon-btn close-btn glass-interactive"
            onClick={onClose}
            title="Close AI Panel (Ctrl+Alt+A)"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {/* Mode Selector Bar (Plan Mode vs Act Mode) */}
      <div className="ai-mode-toggle-bar">
        <div className="ai-mode-tabs">
          <button
            className={`mode-tab-btn plan ${chatMode === 'plan' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('plan')}
            title="Plan Mode: Research, inspect files, formulate plans (Read-Only)"
          >
            <Compass size={12} className="mode-tab-icon" />
            <span className="mode-tab-title">Plan Mode</span>
            <span className="mode-tab-badge">Design</span>
          </button>
          <button
            className={`mode-tab-btn act ${chatMode === 'act' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('act')}
            title="Act Mode: Write code, propose edits, apply diffs & run commands (Autonomous)"
          >
            <Zap size={12} className="mode-tab-icon" />
            <span className="mode-tab-title">Act Mode</span>
            <span className="mode-tab-badge">Execute</span>
          </button>
        </div>

        <div className="mode-quick-info">
          <span className="mode-active-pill">
            {chatMode === 'plan' ? '📘 Plan Mode Active' : '⚡ Act Mode Active'}
          </span>
        </div>
      </div>

      {/* Settings / API Key / Permissions Drawer */}
      {isSettingsOpen && (
        <div className="ai-settings-drawer glass-panel custom-scrollbar">
          <div className="settings-header">
            <div className="settings-tab-bar">
              <button
                className={`settings-tab-btn ${settingsTab === 'modes' ? 'active' : ''}`}
                onClick={() => setSettingsTab('modes')}
              >
                <Compass size={12} />
                <span>Mode Models</span>
              </button>
              <button
                className={`settings-tab-btn ${settingsTab === 'permissions' ? 'active' : ''}`}
                onClick={() => setSettingsTab('permissions')}
              >
                <ShieldCheck size={12} />
                <span>Permissions</span>
              </button>
              <button
                className={`settings-tab-btn ${settingsTab === 'keys' ? 'active' : ''}`}
                onClick={() => setSettingsTab('keys')}
              >
                <Key size={12} />
                <span>API Keys</span>
              </button>
            </div>
            <button className="settings-close" onClick={() => setIsSettingsOpen(false)}>
              <X size={12} />
            </button>
          </div>

          {settingsTab === 'modes' && (
            <div className="modes-drawer-body">
              <div className="mode-setting-card glass-subcard">
                <div className="mode-setting-header">
                  <div className="mode-setting-title">
                    <Compass size={14} className="text-sapphire" />
                    <span>Default Plan Mode Model</span>
                  </div>
                  <span className="mode-role-badge plan">Architecture & Planning</span>
                </div>
                <p className="mode-setting-desc">
                  Model utilized when in Plan Mode to research code, inspect workspace diagnostics, and formulate structured implementation plans without code edits.
                </p>
                <select
                  className="mode-select-input glass-interactive"
                  value={planModelId}
                  onChange={(e) => {
                    setPlanModelId(e.target.value)
                    AiService.setPlanModelId(e.target.value)
                    if (chatMode === 'plan') {
                      setSelectedModelId(e.target.value)
                      AiService.setActiveModelId(e.target.value)
                    }
                  }}
                >
                  {models.map((m) => (
                    <option key={`plan-${m.id}`} value={m.id}>
                      {m.name} ({m.provider.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mode-setting-card glass-subcard">
                <div className="mode-setting-header">
                  <div className="mode-setting-title">
                    <Zap size={14} className="text-emerald" />
                    <span>Default Act Mode Model</span>
                  </div>
                  <span className="mode-role-badge act">Code & Execution</span>
                </div>
                <p className="mode-setting-desc">
                  Model utilized when in Act Mode to autonomously write code, propose file diffs, apply edits, and execute test runs.
                </p>
                <select
                  className="mode-select-input glass-interactive"
                  value={actModelId}
                  onChange={(e) => {
                    setActModelId(e.target.value)
                    AiService.setActModelId(e.target.value)
                    if (chatMode === 'act') {
                      setSelectedModelId(e.target.value)
                      AiService.setActiveModelId(e.target.value)
                    }
                  }}
                >
                  {models.map((m) => (
                    <option key={`act-${m.id}`} value={m.id}>
                      {m.name} ({m.provider.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {settingsTab === 'permissions' && (
            <div className="permissions-drawer-body">
              {/* Presets Bar */}
              <div className="permissions-presets-bar">
                <span className="presets-label">Security Presets:</span>
                <div
                  className="presets-buttons custom-scrollbar"
                  onWheel={(e) => {
                    if (e.deltaY !== 0) {
                      e.currentTarget.scrollLeft += e.deltaY
                    }
                  }}
                >
                  <button
                    className="preset-btn glass-interactive"
                    onClick={() => handleApplyPreset('paranoid')}
                    title="Prompt for every action (No auto-approvals)"
                  >
                    <ShieldAlert size={10} className="text-warning" />
                    <span>Strict (Ask All)</span>
                  </button>
                  <button
                    className="preset-btn glass-interactive"
                    onClick={() => handleApplyPreset('balanced')}
                    title="Auto-approve read operations; prompt for write & run"
                  >
                    <Shield size={10} className="text-info" />
                    <span>Balanced (Safe)</span>
                  </button>
                  <button
                    className="preset-btn glass-interactive highlight"
                    onClick={() => handleApplyPreset('autonomous')}
                    title="Auto-approve read, write, run, web & git for maximum velocity"
                  >
                    <Zap size={10} className="text-success" />
                    <span>Full Autonomous</span>
                  </button>
                </div>
              </div>

              {/* Granular Toggles List */}
              <div className="permissions-grid">
                {/* Auto Approve Read */}
                <label className="perm-toggle-card glass-subcard">
                  <div className="perm-toggle-info">
                    <div className="perm-title-row">
                      <FolderSearch size={13} className="perm-icon text-cyan" />
                      <span className="perm-name">Auto-Approve Read</span>
                    </div>
                    <p className="perm-desc">
                      Allows inspecting source files, searching symbols, and reading workspace directory hierarchies.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="glass-checkbox"
                    checked={autoApprove.autoApproveRead}
                    onChange={(e) => handleToggleAutoApprove('autoApproveRead', e.target.checked)}
                  />
                </label>

                {/* Auto Approve Write */}
                <label className="perm-toggle-card glass-subcard">
                  <div className="perm-toggle-info">
                    <div className="perm-title-row">
                      <FileCode size={13} className="perm-icon text-amber" />
                      <span className="perm-name">Auto-Approve Write & Patches</span>
                    </div>
                    <p className="perm-desc">
                      Allows directly creating, modifying, patching, and saving files without manual confirmation prompts.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="glass-checkbox"
                    checked={autoApprove.autoApproveWrite}
                    onChange={(e) => handleToggleAutoApprove('autoApproveWrite', e.target.checked)}
                  />
                </label>

                {/* Auto Approve Run Commands */}
                <label className="perm-toggle-card glass-subcard">
                  <div className="perm-toggle-info">
                    <div className="perm-title-row">
                      <Terminal size={13} className="perm-icon text-emerald" />
                      <span className="perm-name">Auto-Approve Run Commands</span>
                    </div>
                    <p className="perm-desc">
                      Allows executing terminal scripts, test suites, builds, and CLI commands in the integrated terminal.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="glass-checkbox"
                    checked={autoApprove.autoApproveRun}
                    onChange={(e) => handleToggleAutoApprove('autoApproveRun', e.target.checked)}
                  />
                </label>

                {/* Auto Approve Web / MCP Tools */}
                <label className="perm-toggle-card glass-subcard">
                  <div className="perm-toggle-info">
                    <div className="perm-title-row">
                      <Globe size={13} className="perm-icon text-blue" />
                      <span className="perm-name">Auto-Approve Web & MCP Tools</span>
                    </div>
                    <p className="perm-desc">
                      Allows executing external MCP server tools, documentation lookups, and API queries.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="glass-checkbox"
                    checked={autoApprove.autoApproveBrowser}
                    onChange={(e) => handleToggleAutoApprove('autoApproveBrowser', e.target.checked)}
                  />
                </label>

                {/* Auto Approve Git */}
                <label className="perm-toggle-card glass-subcard">
                  <div className="perm-toggle-info">
                    <div className="perm-title-row">
                      <GitBranch size={13} className="perm-icon text-purple" />
                      <span className="perm-name">Auto-Approve Git Actions</span>
                    </div>
                    <p className="perm-desc">
                      Allows staging files, creating commit messages, and managing branches automatically.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="glass-checkbox"
                    checked={autoApprove.autoApproveGit}
                    onChange={(e) => handleToggleAutoApprove('autoApproveGit', e.target.checked)}
                  />
                </label>

                {/* Max Autonomous Iterations */}
                <div className="perm-toggle-card glass-subcard iterations-card">
                  <div className="perm-toggle-info">
                    <div className="perm-title-row">
                      <Sliders size={13} className="perm-icon text-violet" />
                      <span className="perm-name">Max Autonomous Steps</span>
                    </div>
                    <p className="perm-desc">
                      Safety loop guardrail: maximum consecutive autonomous actions before pausing for user input.
                    </p>
                  </div>
                  <div className="iterations-control">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      className="iterations-input"
                      value={autoApprove.maxAutoIterations || 10}
                      onChange={(e) =>
                        handleToggleAutoApprove(
                          'maxAutoIterations',
                          Math.max(1, Math.min(100, parseInt(e.target.value) || 10))
                        )
                      }
                    />
                    <span className="iterations-unit">steps</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {settingsTab === 'keys' && (
            <div className="settings-scroll-list">
              {([
                { id: 'deepseek', name: 'DeepSeek API', defaultUrl: 'https://api.deepseek.com', keyPlaceholder: 'sk-...' },
                { id: 'gemini', name: 'Google Gemini API', defaultUrl: 'https://generativelanguage.googleapis.com', keyPlaceholder: 'AIza...' },
                { id: 'claude', name: 'Anthropic Claude API', defaultUrl: 'https://api.anthropic.com', keyPlaceholder: 'sk-ant-...' },
                { id: 'openai', name: 'OpenAI API', defaultUrl: 'https://api.openai.com/v1', keyPlaceholder: 'sk-...' },
                { id: 'ollama', name: 'Ollama (Local Models)', defaultUrl: 'http://localhost:11434', keyPlaceholder: '' },
              ] as const).map((provInfo) => {
                const prov = provInfo.id as AiProvider
                const cfg = settings[prov] || { apiKey: '', endpoint: '' }
                const isOllama = prov === 'ollama'
                const isRevealed = showKey[prov]

                return (
                  <div key={prov} className="provider-card glass-subcard">
                    <div className="prov-card-header">
                      <div className="prov-title-left">
                        <span
                          className="provider-dot"
                          style={{ backgroundColor: getProviderColor(prov) }}
                        />
                        <span className="prov-name">{provInfo.name.toUpperCase()}</span>
                      </div>
                      {isOllama && (
                        <button
                          className="refresh-btn glass-interactive"
                          onClick={handleRefreshOllama}
                          title="Scan for local Ollama models"
                        >
                          <RefreshCw size={11} />
                          <span>Detect Models</span>
                        </button>
                      )}
                    </div>

                    {!isOllama && (
                      <div className="prov-input-row">
                        <label>API Key</label>
                        <div className="input-with-icon">
                          <input
                            type={isRevealed ? 'text' : 'password'}
                            placeholder={provInfo.keyPlaceholder ? `Enter ${provInfo.name} Key (${provInfo.keyPlaceholder})` : `Enter API Key...`}
                            value={cfg.apiKey || ''}
                            onChange={(e) => handleSaveSettings(prov, 'apiKey', e.target.value)}
                          />
                          <button
                            className="toggle-vis-btn"
                            onClick={() => setShowKey((prev) => ({ ...prev, [prov]: !prev[prov] }))}
                          >
                            {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="prov-input-row">
                      <label>{isOllama ? 'Host URL' : 'Endpoint / Proxy (Optional)'}</label>
                      <input
                        type="text"
                        placeholder={provInfo.defaultUrl}
                        value={cfg.endpoint || ''}
                        onChange={(e) => handleSaveSettings(prov, 'endpoint', e.target.value)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="ai-messages-container custom-scrollbar" ref={messagesContainerRef}>
        {messages.map((msg) => {
          const isUser = msg.role === 'user'

          return (
            <div key={msg.id} className={`ai-message-row ${isUser ? 'user' : 'assistant'}`}>
              <div className="message-avatar">
                {isUser ? (
                  <div className="user-avatar-badge">You</div>
                ) : (
                  <div className="bot-avatar-badge">
                    <Bot size={13} />
                  </div>
                )}
              </div>

              <div className="message-bubble-wrapper">
                {/* Attached context chip */}
                {msg.attachment && (
                  <div className="attached-context-chip glass-card">
                    <Paperclip size={11} className="chip-icon" />
                    <span className="chip-type">{msg.attachment.type.toUpperCase()}:</span>
                    <span className="chip-file">{msg.attachment.fileName || msg.attachment.type}</span>
                    {msg.attachment.startLine && (
                      <span className="chip-lines">
                        (lines {msg.attachment.startLine}-{msg.attachment.endLine})
                      </span>
                    )}
                  </div>
                )}

                {/* Reasoning / CoT collapsible accordion for thinking models */}
                {msg.reasoning && (
                  <div className="reasoning-card glass-card">
                    <button
                      className="reasoning-header"
                      onClick={() =>
                        setExpandedReasoning((prev) => ({
                          ...prev,
                          [msg.id]: !prev[msg.id],
                        }))
                      }
                    >
                      <div className="reasoning-title">
                        <Sparkles size={11} className="thought-icon" />
                        <span>Thinking Process</span>
                      </div>
                      {expandedReasoning[msg.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                    {expandedReasoning[msg.id] && (
                      <div className="reasoning-body custom-scrollbar">
                        <p>{msg.reasoning}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tool Calls Execution Cards */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="tool-calls-container">
                    {msg.toolCalls.map((call) => {
                      const isPending = call.status === 'pending_approval'
                      const isExecuting = call.status === 'executing' || executingToolId === call.id
                      const isCompleted = call.status === 'completed'
                      const isBlocked = call.status === 'blocked_by_guardrail'
                      const isRejected = call.status === 'rejected'
                      const isFailed = call.status === 'failed'

                      const result = (msg.toolResults || []).find((tr) => tr.toolCallId === call.id)

                      return (
                        <div
                          key={call.id}
                          className={`tool-call-card glass-card ${
                            isPending ? 'pending' : isExecuting ? 'executing' : isCompleted ? 'completed' : isBlocked ? 'blocked' : 'failed'
                          }`}
                        >
                          <div className="tool-card-header">
                            <div className="tool-card-title">
                              <Cpu size={12} className="tool-icon" />
                              <span className="tool-name">{call.toolName}</span>
                              <span className={`tool-category-badge cat-${call.category}`}>
                                {call.category.toUpperCase()}
                              </span>
                            </div>

                            <div className="tool-card-status">
                              {isPending && <span className="status-badge pending">⚠️ Needs Approval</span>}
                              {isExecuting && <span className="status-badge executing">⚡ Executing...</span>}
                              {isCompleted && <span className="status-badge completed">✅ Done</span>}
                              {isBlocked && <span className="status-badge blocked">🛡️ Guardrail Blocked</span>}
                              {isRejected && <span className="status-badge rejected">❌ Rejected</span>}
                              {isFailed && <span className="status-badge failed">⚠️ Failed</span>}
                            </div>
                          </div>

                          {/* Arguments Summary */}
                          <div className="tool-args-preview">
                            {Object.entries(call.arguments).map(([k, v]) => (
                              <div key={k} className="tool-arg-item">
                                <span className="arg-key">{k}:</span>
                                <span className="arg-val">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                              </div>
                            ))}
                          </div>

                          {/* Guardrail Note */}
                          {call.guardrailNote && (
                            <div className="tool-guardrail-banner">
                              <AlertTriangle size={11} className="text-warning" />
                              <span>{call.guardrailNote}</span>
                            </div>
                          )}

                          {/* Actions for Pending Tools */}
                          {isPending && (
                            <div className="tool-card-actions">
                              <button
                                className="tool-action-btn approve glass-interactive"
                                onClick={() => handleApproveTool(msg.id, call)}
                                title="Approve and execute this local action"
                              >
                                <CheckCircle2 size={12} />
                                <span>Approve & Execute</span>
                              </button>
                              <button
                                className="tool-action-btn reject glass-interactive"
                                onClick={() => handleRejectTool(msg.id, call)}
                                title="Reject this tool call"
                              >
                                <XCircle size={12} />
                                <span>Reject</span>
                              </button>
                            </div>
                          )}

                          {/* Output or Diff View */}
                          {result && (
                            <div className="tool-result-box">
                              {/* Diff Viewer if proposed edit */}
                              {result.diff && (result.diff.fullContent || result.diff.newSnippet) && (
                                <div className="tool-diff-card glass-subcard">
                                  <div className="tool-diff-header">
                                    <div className="diff-header-left">
                                      <FileCheck size={12} className="text-cyan" />
                                      <span className="diff-file-name">{result.diff.filePath}</span>
                                    </div>
                                    <div className="diff-header-right">
                                      {appliedDiffs[result.diff.filePath] ? (
                                        <span className="diff-applied-badge">
                                          <Check size={11} /> Applied to Editor
                                        </span>
                                      ) : (
                                        <button
                                          className="apply-diff-btn glass-interactive"
                                          onClick={() => handleApplyDiff(result.diff!)}
                                        >
                                          <CheckCircle2 size={11} />
                                          <span>Accept Diff</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {result.diff.originalSnippet && result.diff.newSnippet && (
                                    <div className="snippet-diff-body">
                                      <div className="diff-chunk removal">
                                        <span className="diff-prefix">-</span>
                                        <pre>{result.diff.originalSnippet}</pre>
                                      </div>
                                      <div className="diff-chunk addition">
                                        <span className="diff-prefix">+</span>
                                        <pre>{result.diff.newSnippet}</pre>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* General Output */}
                              <div className="tool-output-content custom-scrollbar">
                                <pre>{result.output || result.error || '(No output returned)'}</pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Message text / code blocks */}
                <div className={`message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
                  {renderMessageContent(msg)}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Context Attachment Bar & Quick Actions */}
      <div className="ai-footer-container">
        {/* Mention Autocomplete Dropdown */}
        {mentionOpen && filteredMentions.length > 0 && (
          <div className="autocomplete-popup glass-panel custom-scrollbar">
            <div className="autocomplete-header">
              <Paperclip size={11} className="text-cyan" />
              <span>Attach Context (@)</span>
            </div>
            {filteredMentions.map((opt, idx) => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.id}
                  className={`autocomplete-item glass-interactive ${idx === menuIndex ? 'selected' : ''}`}
                  onClick={() => {
                    opt.action()
                    setMentionOpen(false)
                    setInputText((prev) => prev.replace(/@[a-zA-Z0-9_-]*$/, '').trim())
                  }}
                >
                  <Icon size={12} className="item-icon text-cyan" />
                  <div className="item-details">
                    <span className="item-label">{opt.label}</span>
                    <span className="item-desc">{opt.desc}</span>
                  </div>
                  <CornerDownLeft size={10} className="item-enter-hint" />
                </button>
              )
            })}
          </div>
        )}

        {/* Slash Command Autocomplete Dropdown */}
        {slashOpen && filteredSlash.length > 0 && (
          <div className="autocomplete-popup glass-panel custom-scrollbar">
            <div className="autocomplete-header">
              <Sparkles size={11} className="text-violet" />
              <span>Slash Commands (/)</span>
            </div>
            {filteredSlash.map((opt, idx) => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.id}
                  className={`autocomplete-item glass-interactive ${idx === menuIndex ? 'selected' : ''}`}
                  onClick={() => {
                    opt.action()
                    setSlashOpen(false)
                    setInputText('')
                  }}
                >
                  <Icon size={12} className="item-icon text-violet" />
                  <div className="item-details">
                    <span className="item-label">{opt.label}</span>
                    <span className="item-desc">{opt.desc}</span>
                  </div>
                  <CornerDownLeft size={10} className="item-enter-hint" />
                </button>
              )
            })}
          </div>
        )}

        {/* Active attachment pill if selected */}
        {attachedContext && (
          <div className="attachment-active-bar glass-pill">
            <div className="attachment-details">
              <Paperclip size={12} className="attach-icon" />
              <span className="attach-type">{attachedContext.type.toUpperCase()}:</span>
              <span className="attach-name">{attachedContext.fileName || attachedContext.type}</span>
              {attachedContext.startLine && (
                <span className="attach-meta">
                  (Lines {attachedContext.startLine}-{attachedContext.endLine})
                </span>
              )}
            </div>
            <button className="remove-attach-btn" onClick={handleRemoveAttachment}>
              <X size={12} />
            </button>
          </div>
        )}

        {/* Quick action chips */}
        <div
          className="quick-actions-row custom-scrollbar"
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY
            }
          }}
        >
          <button
            className={`quick-chip ${currentSelection?.text ? 'highlight' : ''}`}
            onClick={handleAttachSelection}
            title={
              currentSelection?.text
                ? `Attach selection (${currentSelection.endLine - currentSelection.startLine + 1} lines)`
                : 'Highlight code in editor to attach'
            }
          >
            <Paperclip size={11} />
            <span>{currentSelection?.text ? 'Attach Selection' : 'Attach Selection'}</span>
          </button>

          <button
            className="quick-chip"
            onClick={handleAttachActiveFile}
            title={`Attach full ${activeFileName}`}
          >
            <Layers size={11} />
            <span>Attach File</span>
          </button>

          <button className="quick-chip" onClick={() => handleQuickAction('fix')} title="Diagnose and repair problems">
            <ShieldCheck size={11} className="chip-icon success" />
            <span>/fix Problems</span>
          </button>
          <button className="quick-chip" onClick={() => handleQuickAction('tests')} title="Generate unit tests">
            <TestTube2 size={11} className="chip-icon success" />
            <span>/test Suite</span>
          </button>
          <button className="quick-chip" onClick={() => handleQuickAction('commit')} title="Generate git commit message">
            <GitBranch size={11} className="chip-icon text-cyan" />
            <span>/commit Message</span>
          </button>
          <button className="quick-chip" onClick={() => handleQuickAction('explain')}>
            <Sparkles size={11} className="chip-icon" />
            <span>Explain</span>
          </button>
          <button className="quick-chip" onClick={() => handleQuickAction('bugs')}>
            <ShieldAlert size={11} className="chip-icon danger" />
            <span>Bugs & Security</span>
          </button>
          <button className="quick-chip" onClick={() => handleQuickAction('refactor')}>
            <Zap size={11} className="chip-icon warning" />
            <span>Refactor</span>
          </button>
          <button className="quick-chip" onClick={() => handleQuickAction('docs')}>
            <FileText size={11} className="chip-icon" />
            <span>Docs</span>
          </button>
        </div>

        {/* Live Tokenizer Meter Bar */}
        <div
          className="ai-token-meter-bar"
          title={`Token Breakdown:\n• System Prompt: ${tokenBreakdown.systemTokens.toLocaleString()} tokens\n• Chat History: ${tokenBreakdown.historyTokens.toLocaleString()} tokens\n• Attached Context: ${tokenBreakdown.attachmentTokens.toLocaleString()} tokens\n• Current Input: ${tokenBreakdown.inputTokens.toLocaleString()} tokens\n• Total: ${tokenBreakdown.totalTokens.toLocaleString()} / ${tokenBreakdown.contextLimit.toLocaleString()} tokens (${tokenBreakdown.percentUsed}%)`}
        >
          <div className="token-meter-left">
            <Cpu size={10} className="meter-icon" />
            <span className="token-count-label">
              {tokenBreakdown.totalTokens.toLocaleString()} / {(tokenBreakdown.contextLimit / 1000).toFixed(0)}k tokens ({tokenBreakdown.percentUsed}%)
            </span>
          </div>
          <div className="token-meter-bar-track">
            <div
              className={`token-meter-bar-fill ${tokenBreakdown.percentUsed > 80 ? 'danger' : tokenBreakdown.percentUsed > 50 ? 'warning' : 'safe'}`}
              style={{ width: `${Math.max(2, Math.min(100, tokenBreakdown.percentUsed))}%` }}
            />
          </div>
          <div className="token-meter-right">
            <span className={`active-mode-tag ${chatMode}`}>
              {chatMode === 'plan' ? '📘 Plan Mode' : '⚡ Act Mode'}
            </span>
          </div>
        </div>

        {/* Prompt Input Box */}
        <div className="input-box-container glass-card">
          <textarea
            ref={textareaRef}
            className="ai-textarea"
            placeholder={
              attachedContext
                ? `Ask anything about ${attachedContext.fileName}... (Type @ to attach more, / for commands)`
                : 'Ask AI agent... Type @ for editor context, / for commands (Enter to send)'
            }
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (mentionOpen && filteredMentions.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setMenuIndex((prev) => (prev + 1) % filteredMentions.length)
                  return
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setMenuIndex((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length)
                  return
                }
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault()
                  const selected = filteredMentions[menuIndex] || filteredMentions[0]
                  if (selected) {
                    selected.action()
                    setMentionOpen(false)
                    setInputText((prev) => prev.replace(/@[a-zA-Z0-9_-]*$/, '').trim())
                  }
                  return
                }
                if (e.key === 'Escape') {
                  setMentionOpen(false)
                  return
                }
              }

              if (slashOpen && filteredSlash.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setMenuIndex((prev) => (prev + 1) % filteredSlash.length)
                  return
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setMenuIndex((prev) => (prev - 1 + filteredSlash.length) % filteredSlash.length)
                  return
                }
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault()
                  const selected = filteredSlash[menuIndex] || filteredSlash[0]
                  if (selected) {
                    selected.action()
                    setSlashOpen(false)
                    setInputText('')
                  }
                  return
                }
                if (e.key === 'Escape') {
                  setSlashOpen(false)
                  return
                }
              }

              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            rows={2}
          />

          <div className="input-box-actions">
            {isStreaming ? (
              <button className="action-send-btn stop" onClick={handleStopStream} title="Stop Generating">
                <Square size={13} fill="currentColor" />
              </button>
            ) : (
              <button
                className="action-send-btn send"
                onClick={handleSendMessage}
                disabled={!inputText.trim() && !attachedContext}
                title="Send Prompt (Enter)"
              >
                <ArrowUp size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .ai-chat-panel {
          width: 100%;
          min-width: 0;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: rgba(10, 14, 26, 0.78);
          backdrop-filter: blur(32px) saturate(220%);
          -webkit-backdrop-filter: blur(32px) saturate(220%);
          border-left: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: -10px 0 40px rgba(0, 0, 0, 0.45);
          position: relative;
          z-index: 40;
          overflow: hidden;
        }

        .ai-ambient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(70px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.15;
        }

        .orb-1 {
          width: 260px;
          height: 260px;
          background: #0A84FF;
          top: -40px;
          right: -40px;
        }

        .orb-2 {
          width: 280px;
          height: 280px;
          background: #BF5AF2;
          bottom: 40px;
          left: -40px;
        }

        .ai-panel-header {
          position: relative;
          height: 42px;
          min-height: 42px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
          flex-shrink: 0;
          z-index: 100;
          overflow: visible;
        }

        .ai-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          flex: 1;
          overflow: visible;
        }

        .ai-brand-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          font-size: 12px;
          color: #FFFFFF;
          flex-shrink: 0;
        }

        .sparkle-icon {
          color: #0A84FF;
        }

        .provider-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .model-selector-container {
          position: relative;
          min-width: 0;
          flex-shrink: 1;
          z-index: 101;
          overflow: visible;
        }

        .model-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11px;
          color: rgba(235, 235, 245, 0.85);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          max-width: 170px;
        }

        .model-name {
          max-width: 110px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .model-dropdown-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          width: 290px;
          max-height: 380px;
          overflow-y: auto;
          background: rgba(14, 18, 32, 0.98);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75);
          z-index: 9999;
          padding: 6px;
          pointer-events: auto;
          touch-action: pan-y;
        }

        .dropdown-header {
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(235, 235, 245, 0.45);
          padding: 4px 8px;
          margin-bottom: 2px;
        }

        .ag-sub-badge {
          font-size: 8.5px;
          font-weight: 700;
          padding: 1px 5px;
          background: rgba(10, 132, 255, 0.25);
          border: 1px solid rgba(10, 132, 255, 0.45);
          color: #5AC8FA;
          border-radius: 4px;
        }

        .model-option {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 8px;
          border-radius: 6px;
          background: transparent;
          border: none;
          color: #FFFFFF;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
        }

        .model-option:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .model-option.active {
          background: rgba(10, 132, 255, 0.18);
          border: 1px solid rgba(10, 132, 255, 0.35);
        }

        .model-option-name {
          font-size: 11.5px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cot-badge {
          font-size: 8.5px;
          font-weight: 700;
          padding: 1px 4px;
          background: rgba(191, 90, 242, 0.25);
          border: 1px solid rgba(191, 90, 242, 0.45);
          color: #BF5AF2;
          border-radius: 4px;
        }

        .model-option-desc {
          font-size: 10px;
          color: rgba(235, 235, 245, 0.5);
          margin-top: 2px;
          line-height: 1.3;
        }

        .check-active {
          color: #0A84FF;
        }

        .ai-header-right {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .icon-btn {
          width: 26px;
          height: 26px;
          border-radius: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid transparent;
          color: rgba(235, 235, 245, 0.7);
          cursor: pointer;
        }

        .icon-btn:hover {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.08);
        }

        .icon-btn.active {
          background: rgba(10, 132, 255, 0.2);
          border-color: rgba(10, 132, 255, 0.4);
          color: #5AC8FA;
        }

        /* Quick Auto-Approve Status Pill in Header */
        .auto-approve-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 10.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }

        .auto-approve-pill.status-full {
          background: rgba(48, 209, 88, 0.15);
          border-color: rgba(48, 209, 88, 0.4);
          color: #30D158;
          box-shadow: 0 0 10px rgba(48, 209, 88, 0.2);
        }

        .auto-approve-pill.status-semi {
          background: rgba(10, 132, 255, 0.15);
          border-color: rgba(10, 132, 255, 0.35);
          color: #5AC8FA;
        }

        .auto-approve-pill.status-strict {
          background: rgba(255, 159, 10, 0.12);
          border-color: rgba(255, 159, 10, 0.3);
          color: #FF9F0A;
        }

        .auto-pill-label {
          white-space: nowrap;
        }

        /* Mode Toggle Bar (Plan Mode vs Act Mode) */
        .ai-mode-toggle-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          background: rgba(14, 18, 32, 0.7);
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          gap: 8px;
        }

        .ai-mode-tabs {
          display: flex;
          gap: 6px;
          background: rgba(0, 0, 0, 0.25);
          padding: 2px;
          border-radius: 7px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .mode-tab-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 5px;
          background: transparent;
          border: none;
          color: rgba(235, 235, 245, 0.6);
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mode-tab-btn:hover {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.05);
        }

        .mode-tab-btn.active.plan {
          background: rgba(10, 132, 255, 0.2);
          color: #5AC8FA;
          border: 1px solid rgba(10, 132, 255, 0.4);
          box-shadow: 0 0 10px rgba(10, 132, 255, 0.2);
        }

        .mode-tab-btn.active.act {
          background: rgba(48, 209, 88, 0.18);
          color: #30D158;
          border: 1px solid rgba(48, 209, 88, 0.4);
          box-shadow: 0 0 10px rgba(48, 209, 88, 0.2);
        }

        .mode-tab-badge {
          font-size: 9px;
          padding: 1px 4px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.08);
          color: inherit;
        }

        .mode-quick-info {
          display: flex;
          align-items: center;
        }

        .mode-active-pill {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.04);
          color: rgba(235, 235, 245, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        /* Modes Drawer Body */
        .modes-drawer-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-top: 8px;
        }

        .mode-setting-card {
          padding: 10px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .mode-setting-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .mode-setting-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #FFFFFF;
        }

        .mode-role-badge {
          font-size: 9.5px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }

        .mode-role-badge.plan {
          background: rgba(10, 132, 255, 0.15);
          color: #5AC8FA;
          border: 1px solid rgba(10, 132, 255, 0.3);
        }

        .mode-role-badge.act {
          background: rgba(48, 209, 88, 0.15);
          color: #30D158;
          border: 1px solid rgba(48, 209, 88, 0.3);
        }

        .mode-setting-desc {
          font-size: 11px;
          color: rgba(235, 235, 245, 0.6);
          margin: 0;
          line-height: 1.4;
        }

        .mode-select-input {
          padding: 5px 8px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #FFFFFF;
          font-size: 11.5px;
          outline: none;
          cursor: pointer;
        }

        /* Plan Handoff Banner */
        .plan-handoff-banner {
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          background: linear-gradient(135deg, rgba(10, 132, 255, 0.12) 0%, rgba(94, 92, 230, 0.08) 100%);
          border: 1px solid rgba(10, 132, 255, 0.28);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .plan-handoff-left {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        .plan-handoff-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .plan-handoff-title {
          font-size: 11.5px;
          font-weight: 600;
          color: #5AC8FA;
        }

        .plan-handoff-subtitle {
          font-size: 10.5px;
          color: rgba(235, 235, 245, 0.65);
          line-height: 1.3;
        }

        .switch-to-act-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 6px;
          background: linear-gradient(135deg, #30D158 0%, #248A3D 100%);
          color: #000000;
          font-size: 11px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(48, 209, 88, 0.3);
        }

        .switch-to-act-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(48, 209, 88, 0.45);
        }

        /* Live Tokenizer Meter Bar */
        .ai-token-meter-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 10px;
          background: rgba(0, 0, 0, 0.35);
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 6px;
          font-size: 10px;
          color: rgba(235, 235, 245, 0.6);
        }

        .token-meter-left {
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }

        .meter-icon {
          color: #5AC8FA;
        }

        .token-meter-bar-track {
          flex: 1;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }

        .token-meter-bar-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .token-meter-bar-fill.safe {
          background: linear-gradient(90deg, #30D158, #34C759);
        }

        .token-meter-bar-fill.warning {
          background: linear-gradient(90deg, #FF9F0A, #FFD60A);
        }

        .token-meter-bar-fill.danger {
          background: linear-gradient(90deg, #FF453A, #FF375F);
        }

        .active-mode-tag {
          font-size: 9.5px;
          font-weight: 600;
          padding: 1px 5px;
          border-radius: 3px;
        }

        .active-mode-tag.plan {
          background: rgba(10, 132, 255, 0.15);
          color: #5AC8FA;
        }

        .active-mode-tag.act {
          background: rgba(48, 209, 88, 0.15);
          color: #30D158;
        }

        /* Settings Drawer & Tab Bar */
        .ai-settings-drawer {
          background: rgba(12, 16, 28, 0.96);
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          padding: 10px 12px;
          max-height: 380px;
          overflow-y: auto;
          z-index: 20;
        }

        .settings-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 700;
          color: #FFFFFF;
          margin-bottom: 10px;
        }

        .settings-tab-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.35);
          padding: 3px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .settings-tab-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 4px;
          border: none;
          background: transparent;
          color: rgba(235, 235, 245, 0.6);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .settings-tab-btn:hover {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.05);
        }

        .settings-tab-btn.active {
          background: rgba(10, 132, 255, 0.22);
          border: 1px solid rgba(10, 132, 255, 0.35);
          color: #FFFFFF;
          box-shadow: 0 0 10px rgba(10, 132, 255, 0.25);
        }

        .settings-close {
          background: transparent;
          border: none;
          color: rgba(235, 235, 245, 0.5);
          cursor: pointer;
        }

        .settings-close:hover { color: #FFF; }

        /* Permissions Drawer Styles */
        .permissions-drawer-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .permissions-presets-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          padding: 6px 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 6px;
        }

        .presets-label {
          font-size: 10.5px;
          font-weight: 600;
          color: rgba(235, 235, 245, 0.6);
        }

        .presets-buttons {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .preset-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 5px;
          font-size: 10px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(235, 235, 245, 0.85);
          cursor: pointer;
          transition: all 0.15s;
        }

        .preset-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #FFFFFF;
        }

        .preset-btn.highlight {
          background: rgba(48, 209, 88, 0.16);
          border-color: rgba(48, 209, 88, 0.35);
          color: #30D158;
        }

        .preset-btn.highlight:hover {
          background: rgba(48, 209, 88, 0.25);
        }

        .permissions-grid {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .perm-toggle-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 10px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }

        .perm-toggle-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.14);
        }

        .perm-toggle-info {
          flex: 1;
          min-width: 0;
        }

        .perm-title-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 2px;
        }

        .perm-icon.text-cyan { color: #00F0FF; }
        .perm-icon.text-amber { color: #FF9F0A; }
        .perm-icon.text-emerald { color: #30D158; }
        .perm-icon.text-blue { color: #0A84FF; }
        .perm-icon.text-purple { color: #BF5AF2; }
        .perm-icon.text-violet { color: #AF52DE; }

        .perm-name {
          font-size: 11px;
          font-weight: 600;
          color: #FFFFFF;
        }

        .perm-desc {
          font-size: 9.5px;
          color: rgba(235, 235, 245, 0.5);
          margin: 0;
          line-height: 1.3;
        }

        .iterations-card {
          cursor: default;
        }

        .iterations-control {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .iterations-input {
          width: 50px;
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 4px;
          padding: 3px 6px;
          font-size: 11px;
          color: #FFFFFF;
          text-align: center;
          outline: none;
        }

        .iterations-unit {
          font-size: 10px;
          color: rgba(235, 235, 245, 0.5);
        }

        /* Checkbox styling */
        .glass-checkbox {
          width: 16px;
          height: 16px;
          accent-color: #0A84FF;
          cursor: pointer;
          flex-shrink: 0;
        }

        .auto-write-btn {
          color: #FF9F0A !important;
          border-color: rgba(255, 159, 10, 0.35) !important;
          background: rgba(255, 159, 10, 0.1) !important;
        }

        .auto-run-btn {
          color: #30D158 !important;
          border-color: rgba(48, 209, 88, 0.4) !important;
          background: rgba(48, 209, 88, 0.15) !important;
          box-shadow: 0 0 8px rgba(48, 209, 88, 0.25);
        }

        /* Provider Cards in Keys Tab */
        .provider-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          padding: 8px;
          margin-bottom: 8px;
        }

        .prov-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .prov-title-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .prov-name {
          font-size: 10.5px;
          font-weight: 700;
          color: #FFFFFF;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(235, 235, 245, 0.7);
          padding: 2px 6px;
          border-radius: 4px;
          cursor: pointer;
        }

        .prov-input-row {
          margin-top: 4px;
        }

        .prov-input-row label {
          display: block;
          font-size: 9.5px;
          color: rgba(235, 235, 245, 0.45);
          margin-bottom: 2px;
        }

        .prov-input-row input {
          width: 100%;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 10.5px;
          color: #FFFFFF;
          outline: none;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .toggle-vis-btn {
          position: absolute;
          right: 6px;
          background: transparent;
          border: none;
          color: rgba(235, 235, 245, 0.5);
          cursor: pointer;
        }

        /* Google Antigravity Account Panel */
        .google-account-panel {
          padding: 4px 0;
        }

        .google-session-active {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .google-user-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .google-user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.2);
          object-fit: cover;
        }

        .google-user-avatar.placeholder {
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #5AC8FA;
        }

        .google-user-details {
          flex: 1;
          min-width: 0;
        }

        .google-user-name {
          font-size: 11px;
          font-weight: 600;
          color: #FFFFFF;
        }

        .google-user-email {
          font-size: 10px;
          color: rgba(235, 235, 245, 0.6);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ag-active-pill {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 6px;
          border-radius: 999px;
          background: rgba(48, 209, 88, 0.18);
          border: 1px solid rgba(48, 209, 88, 0.35);
          color: #30D158;
          font-size: 9.5px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .ag-quota-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(0, 0, 0, 0.3);
          padding: 6px 8px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 10px;
        }

        .ag-quota-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .quota-label { color: rgba(235, 235, 245, 0.5); }
        .quota-val { color: #5AC8FA; font-weight: 600; }

        .google-session-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .google-action-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: #FFFFFF;
        }

        .google-action-btn.logout {
          color: #FF453A;
          border-color: rgba(255, 69, 58, 0.3);
          background: rgba(255, 69, 58, 0.1);
        }

        .google-signin-prompt {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 4px 0;
        }

        .google-signin-desc {
          font-size: 10.5px;
          color: rgba(235, 235, 245, 0.65);
          line-height: 1.4;
          margin: 0;
        }

        .google-signin-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 7px 12px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .google-signin-btn:hover {
          background: rgba(255, 255, 255, 0.14);
          border-color: rgba(255, 255, 255, 0.3);
          box-shadow: 0 0 12px rgba(66, 133, 244, 0.3);
        }

        /* Messages Scroll Container */
        .ai-messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          z-index: 5;
        }

        .ai-message-row {
          display: flex;
          gap: 8px;
        }

        .ai-message-row.user {
          flex-direction: row-reverse;
        }

        .message-avatar {
          flex-shrink: 0;
        }

        .user-avatar-badge {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0A84FF 0%, #0066CC 100%);
          color: #FFFFFF;
          font-size: 9px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 10px rgba(10, 132, 255, 0.5);
        }

        .bot-avatar-badge {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #5AC8FA;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .message-bubble-wrapper {
          max-width: 86%;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .message-bubble {
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 12.5px;
          line-height: 1.55;
          word-break: break-word;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .user-bubble {
          background: linear-gradient(135deg, rgba(10, 132, 255, 0.26) 0%, rgba(94, 92, 230, 0.18) 100%);
          border: 1px solid rgba(10, 132, 255, 0.42);
          color: #FFFFFF;
          border-bottom-right-radius: 3px;
          box-shadow: 0 4px 18px rgba(10, 132, 255, 0.15), 0 1px 3px rgba(0, 0, 0, 0.4);
        }

        .assistant-bubble {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.95);
          border-bottom-left-radius: 3px;
        }

        .attached-context-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: linear-gradient(135deg, rgba(0, 240, 255, 0.12) 0%, rgba(10, 132, 255, 0.08) 100%);
          border: 1px solid rgba(0, 240, 255, 0.32);
          border-radius: 7px;
          font-size: 10.5px;
          color: #5AC8FA;
          box-shadow: 0 2px 8px rgba(0, 240, 255, 0.12);
        }

        .reasoning-card {
          background: rgba(191, 90, 242, 0.08);
          border: 1px solid rgba(191, 90, 242, 0.25);
          border-radius: 6px;
          overflow: hidden;
        }

        .reasoning-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 8px;
          background: transparent;
          border: none;
          color: #BF5AF2;
          cursor: pointer;
          font-size: 10.5px;
        }

        .reasoning-title {
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 600;
        }

        .thought-icon {
          animation: spin 3s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .reasoning-body {
          padding: 6px 8px;
          font-size: 11px;
          color: rgba(235, 235, 245, 0.75);
          line-height: 1.4;
          border-top: 1px solid rgba(191, 90, 242, 0.15);
          font-style: italic;
          max-height: 120px;
          overflow-y: auto;
        }

        .ai-code-block {
          background: rgba(0, 0, 0, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          overflow: hidden;
          margin: 6px 0;
        }

        .ai-code-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.04);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 10.5px;
          color: rgba(235, 235, 245, 0.7);
        }

        .code-lang-pill {
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-mono, monospace);
          text-transform: uppercase;
          font-weight: 600;
          color: #5AC8FA;
        }

        .code-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .code-action-btn {
          display: flex;
          align-items: center;
          gap: 3px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(235, 235, 245, 0.75);
          font-size: 9.5px;
          padding: 2px 6px;
          border-radius: 4px;
          cursor: pointer;
        }

        .code-action-btn:hover {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.12);
        }

        .code-action-btn.run {
          color: #30D158;
          border-color: rgba(48, 209, 88, 0.3);
        }

        .code-action-btn.run:hover {
          background: rgba(48, 209, 88, 0.15);
        }

        .ai-code-body {
          padding: 8px;
          margin: 0;
          font-family: var(--font-mono, monospace);
          font-size: 11.5px;
          line-height: 1.5;
          color: #F8FAFC;
          overflow-x: auto;
        }

        .ai-text-block p {
          margin: 4px 0;
        }

        /* Footer & Prompt Area */
        .ai-footer-container {
          padding: 8px 12px 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(10, 14, 26, 0.88);
          display: flex;
          flex-direction: column;
          gap: 6px;
          z-index: 10;
        }

        .attachment-active-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 8px;
          background: rgba(10, 132, 255, 0.12);
          border: 1px solid rgba(10, 132, 255, 0.3);
          border-radius: 6px;
          font-size: 11px;
          color: #FFFFFF;
        }

        .attachment-details {
          display: flex;
          align-items: center;
          gap: 5px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .attach-name {
          font-weight: 600;
          color: #5AC8FA;
        }

        .attach-meta {
          color: rgba(235, 235, 245, 0.5);
          font-size: 10px;
        }

        .remove-attach-btn {
          background: transparent;
          border: none;
          color: rgba(235, 235, 245, 0.5);
          cursor: pointer;
        }

        .remove-attach-btn:hover { color: #FF453A; }

        .quick-actions-row {
          display: flex;
          align-items: center;
          gap: 5px;
          overflow-x: auto;
          padding-bottom: 2px;
        }

        .quick-chip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 500;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(235, 235, 245, 0.75);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }

        .quick-chip:hover {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .quick-chip.highlight {
          background: rgba(10, 132, 255, 0.18);
          border-color: rgba(10, 132, 255, 0.4);
          color: #5AC8FA;
        }

        .chip-icon.danger { color: #FF453A; }
        .chip-icon.warning { color: #FF9F0A; }
        .chip-icon.success { color: #30D158; }

        .input-box-container {
          position: relative;
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 6px 36px 6px 8px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .input-box-container:focus-within {
          border-color: #0A84FF;
          box-shadow: 0 0 16px rgba(10, 132, 255, 0.25);
        }

        .ai-textarea {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: #FFFFFF;
          font-size: 12px;
          line-height: 1.4;
          resize: none;
          font-family: inherit;
        }

        .input-box-actions {
          position: absolute;
          right: 6px;
          bottom: 6px;
        }

        .action-send-btn {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          transition: transform 0.15s;
        }

        .action-send-btn.send {
          background: linear-gradient(135deg, #0A84FF 0%, #0066CC 100%);
          color: #FFFFFF;
          box-shadow: 0 0 10px rgba(10, 132, 255, 0.4);
        }

        .action-send-btn.send:disabled {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.25);
          box-shadow: none;
          cursor: not-allowed;
        }

        .action-send-btn.stop {
          background: #FF453A;
          color: #FFFFFF;
          box-shadow: 0 0 8px rgba(255, 69, 58, 0.6);
        }

        .action-send-btn:hover:not(:disabled) {
          transform: scale(1.08);
        }

        /* Tool Calls Container & Cards */
        .tool-calls-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 10px;
        }

        .tool-call-card {
          border-radius: 8px;
          padding: 10px 12px;
          background: rgba(20, 26, 46, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 11px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .tool-call-card.pending {
          border-color: rgba(255, 159, 10, 0.4);
          background: rgba(255, 159, 10, 0.08);
        }

        .tool-call-card.executing {
          border-color: rgba(10, 132, 255, 0.5);
          background: rgba(10, 132, 255, 0.09);
        }

        .tool-call-card.completed {
          border-color: rgba(48, 209, 88, 0.35);
          background: rgba(48, 209, 88, 0.06);
        }

        .tool-call-card.blocked {
          border-color: rgba(255, 69, 58, 0.45);
          background: rgba(255, 69, 58, 0.08);
        }

        .tool-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .tool-card-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          color: #FFFFFF;
        }

        .tool-icon {
          color: #5AC8FA;
        }

        .tool-category-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 4px;
        }

        .tool-category-badge.cat-read { background: rgba(10, 132, 255, 0.2); color: #5AC8FA; }
        .tool-category-badge.cat-write { background: rgba(255, 159, 10, 0.2); color: #FF9F0A; }
        .tool-category-badge.cat-run { background: rgba(48, 209, 88, 0.2); color: #30D158; }
        .tool-category-badge.cat-git { background: rgba(191, 90, 242, 0.2); color: #BF5AF2; }

        .status-badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 999px;
          font-weight: 500;
        }

        .status-badge.pending { background: rgba(255, 159, 10, 0.2); color: #FF9F0A; }
        .status-badge.executing { background: rgba(10, 132, 255, 0.2); color: #0A84FF; animation: pulse 1.5s infinite; }
        .status-badge.completed { background: rgba(48, 209, 88, 0.2); color: #30D158; }
        .status-badge.blocked { background: rgba(255, 69, 58, 0.2); color: #FF453A; }
        .status-badge.rejected { background: rgba(255, 255, 255, 0.1); color: rgba(235, 235, 245, 0.5); }

        .tool-args-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: rgba(235, 235, 245, 0.85);
          background: rgba(0, 0, 0, 0.25);
          padding: 4px 8px;
          border-radius: 4px;
        }

        .arg-key { color: #5AC8FA; font-weight: 600; }
        .arg-val { color: #EBEBF5; word-break: break-all; }

        .tool-guardrail-banner {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          background: rgba(255, 69, 58, 0.15);
          border: 1px solid rgba(255, 69, 58, 0.3);
          border-radius: 4px;
          color: #FF453A;
          font-size: 10px;
        }

        .tool-card-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
        }

        .tool-action-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
        }

        .tool-action-btn.approve {
          background: rgba(48, 209, 88, 0.2);
          border-color: rgba(48, 209, 88, 0.4);
          color: #30D158;
        }

        .tool-action-btn.approve:hover {
          background: rgba(48, 209, 88, 0.3);
          box-shadow: 0 0 10px rgba(48, 209, 88, 0.3);
        }

        .tool-action-btn.reject {
          background: rgba(255, 69, 58, 0.15);
          border-color: rgba(255, 69, 58, 0.3);
          color: #FF453A;
        }

        .tool-result-box {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 4px;
        }

        .tool-output-content {
          max-height: 140px;
          overflow-y: auto;
          background: rgba(0, 0, 0, 0.4);
          padding: 6px 8px;
          border-radius: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: rgba(235, 235, 245, 0.85);
          white-space: pre-wrap;
          word-break: break-all;
        }

        /* Diff Viewer Card */
        .tool-diff-card {
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          overflow: hidden;
        }

        .tool-diff-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 5px 8px;
          background: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .diff-header-left {
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 600;
          color: #FFFFFF;
        }

        .apply-diff-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          background: rgba(10, 132, 255, 0.25);
          border: 1px solid rgba(10, 132, 255, 0.4);
          color: #5AC8FA;
          cursor: pointer;
        }

        .diff-applied-badge {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          color: #30D158;
          font-weight: 600;
        }

        .snippet-diff-body {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          display: flex;
          flex-direction: column;
        }

        .diff-chunk {
          display: flex;
          padding: 3px 8px;
          white-space: pre-wrap;
        }

        .diff-chunk.removal {
          background: rgba(255, 69, 58, 0.15);
          color: #FF453A;
        }

        .diff-chunk.addition {
          background: rgba(48, 209, 88, 0.15);
          color: #30D158;
        }

        .diff-prefix {
          width: 14px;
          font-weight: 700;
          user-select: none;
        }

        /* Autocomplete Popup */
        .autocomplete-popup {
          position: absolute;
          bottom: 100%;
          left: 10px;
          right: 10px;
          margin-bottom: 6px;
          max-height: 220px;
          background: rgba(13, 18, 35, 0.95);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.6);
          overflow-y: auto;
          z-index: 50;
          display: flex;
          flex-direction: column;
          padding: 4px;
        }

        .autocomplete-header {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          font-size: 10px;
          font-weight: 700;
          color: rgba(235, 235, 245, 0.6);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 2px;
        }

        .autocomplete-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-radius: 5px;
          border: none;
          background: transparent;
          color: #FFFFFF;
          cursor: pointer;
          text-align: left;
          width: 100%;
          transition: background 0.1s;
        }

        .autocomplete-item:hover, .autocomplete-item.selected {
          background: rgba(255, 255, 255, 0.1);
        }

        .item-details {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .item-label {
          font-weight: 600;
          font-size: 11px;
          color: #FFFFFF;
        }

        .item-desc {
          font-size: 10px;
          color: rgba(235, 235, 245, 0.5);
        }

        .item-enter-hint {
          color: rgba(235, 235, 245, 0.3);
        }
      `}</style>
    </aside>
  )
}

function formatInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
}

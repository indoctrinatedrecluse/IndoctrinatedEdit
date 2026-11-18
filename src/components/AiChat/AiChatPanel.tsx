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
  Loader2,
  MessageSquare,
  Maximize2,
  ExternalLink,
  Scissors,
  RotateCcw,
  History,
} from 'lucide-react'
import { McpService } from '../../services/mcpService'
import { AiCheckpointService, AiCheckpoint } from '../../services/aiCheckpointService'
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
  AiGuardrailService,
  AiToolExecutor,
  AiToolParser,
  AiToolsRegistry,
  stripToolCallBlocks,
} from '../../services/aiToolsService'
import { DiagnosticsService } from '../../services/diagnosticsService'
import './AiChatPanel.css'

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
  onApplyFileEdit?: (filePath: string, newContent: string) => Promise<boolean>
}

const getBaseName = (pathStr?: string): string => {
  if (!pathStr) return ''
  return pathStr.split(/[/\\]/).pop() || pathStr
}

interface ToolDisplayMeta {
  headline: string
  subtext?: string
  isBackground: boolean
  isCompact: boolean
  isCommand: boolean
  filePath?: string
}

const getToolDisplayMeta = (call: AiToolCall): ToolDisplayMeta => {
  const args = call.arguments || {}
  switch (call.toolName) {
    case 'propose_file_edit': {
      const fp = String(args.filePath || '')
      return {
        headline: `Edit ${getBaseName(fp) || fp || 'file'}`,
        subtext: fp !== getBaseName(fp) ? fp : (args.explanation ? String(args.explanation) : undefined),
        isBackground: false,
        isCompact: false,
        isCommand: false,
        filePath: fp,
      }
    }
    case 'write_file': {
      const fp = String(args.filePath || '')
      return {
        headline: `Write ${getBaseName(fp) || fp || 'file'}`,
        subtext: fp !== getBaseName(fp) ? fp : (args.explanation ? String(args.explanation) : undefined),
        isBackground: false,
        isCompact: false,
        isCommand: false,
        filePath: fp,
      }
    }
    case 'execute_terminal_command': {
      const cmd = String(args.command || '').trim()
      return {
        headline: `$ ${cmd}`,
        subtext: args.cwd ? `in ${args.cwd}` : undefined,
        isBackground: false,
        isCompact: false,
        isCommand: true,
      }
    }
    case 'trigger_project_run':
      return {
        headline: `Run project${args.targetLanguageOrId ? ` (${args.targetLanguageOrId})` : ''}`,
        isBackground: false,
        isCompact: false,
        isCommand: true,
      }
    case 'get_git_status':
      return {
        headline: '$ git status',
        isBackground: false,
        isCompact: true,
        isCommand: true,
      }
    case 'get_git_diff':
      return {
        headline: args.stagedOnly ? '$ git diff --staged' : '$ git diff',
        isBackground: false,
        isCompact: false,
        isCommand: true,
      }
    case 'read_file': {
      const fp = String(args.filePath || '')
      const range = args.startLine ? `:${args.startLine}${args.endLine ? `-${args.endLine}` : ''}` : ''
      return {
        headline: `Read ${getBaseName(fp) || fp || 'file'}${range}`,
        subtext: fp !== getBaseName(fp) ? fp : undefined,
        isBackground: false,
        isCompact: true,
        isCommand: false,
        filePath: fp,
      }
    }
    case 'search_code':
      return {
        headline: `Search "${String(args.query || '')}"${args.filePattern ? ` in ${args.filePattern}` : ''}`,
        isBackground: false,
        isCompact: true,
        isCommand: false,
      }
    case 'list_workspace_files':
      return {
        headline: `List files${args.directory ? ` in ${args.directory}` : ''}`,
        isBackground: true,
        isCompact: true,
        isCommand: false,
      }
    case 'get_editor_diagnostics':
      return {
        headline: `Check diagnostics${args.filePath ? ` (${getBaseName(String(args.filePath))})` : ''}`,
        isBackground: true,
        isCompact: true,
        isCommand: false,
      }
    case 'open_editor_file': {
      const fp = String(args.filePath || '')
      return {
        headline: `Open ${getBaseName(fp) || 'file'}${args.line ? `:${args.line}` : ''}`,
        isBackground: true,
        isCompact: true,
        isCommand: false,
        filePath: fp,
      }
    }
    default:
      return {
        headline: call.toolName.replace(/_/g, ' '),
        subtext: Object.keys(args).length > 0
          ? Object.entries(args)
              .map(([k, v]) => `${k}: ${typeof v === 'string' ? v.slice(0, 40) : JSON.stringify(v)}`)
              .join(' · ')
          : undefined,
        isBackground: false,
        isCompact: false,
        isCommand: false,
      }
  }
}

const buildDropdownSummary = (calls: AiToolCall[]): string => {
  const edits = calls.filter((c) => c.toolName === 'propose_file_edit' || c.toolName === 'write_file')
  const cmds = calls.filter((c) => c.toolName === 'execute_terminal_command' || c.toolName === 'trigger_project_run')
  const gits = calls.filter((c) => c.category === 'git')
  const reads = calls.filter((c) => c.toolName === 'read_file')
  const searches = calls.filter((c) => c.toolName === 'search_code')

  const parts: string[] = []
  if (edits.length === 1) {
    parts.push(`Edited ${getBaseName(String(edits[0].arguments?.filePath || '')) || 'file'}`)
  } else if (edits.length > 1) {
    parts.push(`Edited ${edits.length} files`)
  }

  if (cmds.length === 1 && cmds[0].arguments?.command) {
    const cmdStr = String(cmds[0].arguments.command).trim()
    parts.push(`Ran ${cmdStr.length > 26 ? cmdStr.slice(0, 25) + '…' : cmdStr}`)
  } else if (cmds.length > 0) {
    parts.push(`Ran ${cmds.length} command${cmds.length === 1 ? '' : 's'}`)
  }

  if (gits.length > 0) {
    parts.push(gits.length === 1 && gits[0].toolName === 'get_git_status' ? 'Git status' : 'Git diff')
  }

  if (reads.length === 1) {
    parts.push(`Read ${getBaseName(String(reads[0].arguments?.filePath || '')) || 'file'}`)
  } else if (reads.length > 1) {
    parts.push(`Read ${reads.length} files`)
  }

  if (searches.length > 0 && parts.length < 3) {
    parts.push(`Searched ${searches.length}x`)
  }

  if (parts.length === 0) {
    return `Inspected workspace (${calls.length} step${calls.length === 1 ? '' : 's'})`
  }

  return parts.join(' · ')
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
  onApplyFileEdit,
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

  const DEFAULT_WELCOME_MSG: AiChatMessage = {
    id: 'welcome-msg',
    role: 'assistant',
    content: `Hello! I'm your **IndoctrinatedEdit** AI Assistant.\n\nChoose **Plan Mode** for architecture, research & design without code modifications, or **Act Mode** to write code, edit files, and execute commands. Type **\`@\`** to inject editor context, or **\`/\`** for instant slash commands!`,
    timestamp: Date.now(),
  }

  // Chat State
  const [messages, setMessages] = useState<AiChatMessage[]>([DEFAULT_WELCOME_MSG])
  const [messagesModelId, setMessagesModelId] = useState<string>(actModelId)
  const [messagesWorkspace, setMessagesWorkspace] = useState<string>(workspaceRoot || '')
  const [inputText, setInputText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [cancelFn, setCancelFn] = useState<(() => void) | null>(null)
  const [sessionCost, setSessionCost] = useState<number>(0)
  const [workspaceRules, setWorkspaceRules] = useState<{ fileName: string; content: string } | null>(null)
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

  // Load project-specific rules (.indoctrinatedrules, .cursorrules, .clinerules, AGENTS.md)
  useEffect(() => {
    let active = true
    if (workspaceRoot) {
      AiService.loadWorkspaceRules(workspaceRoot).then((rules) => {
        if (active) setWorkspaceRules(rules)
      })
    } else {
      setWorkspaceRules(null)
    }
    return () => {
      active = false
    }
  }, [workspaceRoot])

  // Load chat history when project or model changes
  useEffect(() => {
    if (workspaceRoot && selectedModelId) {
      const history = AiService.getChatHistory(workspaceRoot, selectedModelId)
      if (history && history.length > 0) {
        setMessages(history)
      } else {
        setMessages([DEFAULT_WELCOME_MSG])
      }
      setMessagesModelId(selectedModelId)
      setMessagesWorkspace(workspaceRoot)
    }
  }, [workspaceRoot, selectedModelId])

  // Save chat history whenever messages change
  useEffect(() => {
    if (messagesWorkspace && messagesModelId && messages.length > 0) {
      AiService.saveChatHistory(messagesWorkspace, messagesModelId, messages)
    }
  }, [messages, messagesWorkspace, messagesModelId])

  const handleClearChat = () => {
    AiGuardrailService.resetLoopTracker()
    cancelFn?.()
    setIsStreaming(false)
    setPreparingToolName(null)
    setCancelFn(null)
    setSessionCost(0)
    if (workspaceRoot && selectedModelId) {
      AiService.clearChatHistory(workspaceRoot, selectedModelId)
      setMessages([DEFAULT_WELCOME_MSG])
      setMessagesModelId(selectedModelId)
      setMessagesWorkspace(workspaceRoot)
      setAttachedContext(null)
    } else {
      setMessages([DEFAULT_WELCOME_MSG])
      setAttachedContext(null)
    }
  }
  const [menuIndex, setMenuIndex] = useState(0)

  // Interactive Tools & Diff States
  const [executingToolId, setExecutingToolId] = useState<string | null>(null)
  const [preparingToolName, setPreparingToolName] = useState<string | null>(null)
  const [appliedDiffs, setAppliedDiffs] = useState<Record<string, boolean>>({})
  const [steeringToolId, setSteeringToolId] = useState<string | null>(null)
  const [steeringFeedback, setSteeringFeedback] = useState<string>('')
  const [diffViewModes, setDiffViewModes] = useState<Record<string, 'unified' | 'split'>>({})
  const [expandedDiff, setExpandedDiff] = useState<NonNullable<AiToolResult['diff']> | null>(null)
  const [checkpoints, setCheckpoints] = useState<AiCheckpoint[]>([])
  const [isCheckpointsOpen, setIsCheckpointsOpen] = useState(false)

  // Always keep a live ref to messages so async autonomous follow-ups never overwrite state with stale closures
  const messagesRef = useRef<AiChatMessage[]>(messages)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Subscribe to shadow checkpoint history
  useEffect(() => {
    const unsub = AiCheckpointService.subscribe((cps) => {
      setCheckpoints(cps)
    })
    return () => unsub()
  }, [])

  // Expand reasoning cards & tool dropdowns
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({})
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({})
  const [showBackgroundTools, setShowBackgroundTools] = useState<Record<string, boolean>>({})
  const [expandedCompactTools, setExpandedCompactTools] = useState<Record<string, boolean>>({})
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
  const systemPromptForMode = `${AiService.getModeSystemPrompt(chatMode)}\n\n${AiToolsRegistry.getToolsSystemPrompt()}${
    workspaceRules ? `\n\n### Project-Specific Instructions & Guidelines (${workspaceRules.fileName}):\n${workspaceRules.content}` : ''
  }`
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

  const handleApplyDiff = async (diff: NonNullable<AiToolResult['diff']>): Promise<boolean> => {
    const contentToWrite = diff.fullContent ?? diff.newSnippet
    if (!contentToWrite) return false

    // Ensure path is resolved against workspaceRoot if relative
    let targetPath = diff.filePath
    const isAbsolute = /^[a-zA-Z]:[/\\]/.test(targetPath) || targetPath.startsWith('/') || targetPath.startsWith('\\\\')
    if (workspaceRoot && !isAbsolute) {
      targetPath = `${workspaceRoot.replace(/[/\\]+$/, '')}/${targetPath.replace(/^[/\\]+/, '')}`
    }

    // Capture shadow checkpoint before writing file to disk
    try {
      await AiCheckpointService.recordSnapshot({
        toolCallId: diff.filePath,
        filePath: targetPath,
        newContent: contentToWrite,
        description: `Edit ${targetPath.split(/[/\\]/).pop()}`,
        currentContentResolver: async (path) => {
          if (typeof window !== 'undefined' && window.electronAPI?.readFile) {
            return await window.electronAPI.readFile(path)
          }
          return null
        },
      })
    } catch (err) {
      console.warn('Failed to record AI checkpoint snapshot', err)
    }

    let success = false
    if (onApplyFileEdit) {
      success = await onApplyFileEdit(targetPath, contentToWrite)
    } else if (typeof window !== 'undefined' && window.electronAPI?.saveFile) {
      try {
        success = await window.electronAPI.saveFile(targetPath, contentToWrite)
      } catch (err) {
        console.error('Failed to save file diff:', err)
      }
    }

    if (success) {
      setAppliedDiffs((prev) => ({ ...prev, [diff.filePath]: true, [targetPath]: true }))
      // Update result in message state so applied shows true
      setMessages((prev) =>
        prev.map((m) => {
          if (!m.toolResults) return m
          return {
            ...m,
            toolResults: m.toolResults.map((tr) => {
              if (tr.diff && (tr.diff.filePath === diff.filePath || tr.diff.filePath === targetPath)) {
                return { ...tr, diff: { ...tr.diff, applied: true } }
              }
              return tr
            }),
          }
        })
      )
    }
    return success
  }

  const handleRollbackCheckpoint = async (checkpointId: string) => {
    const success = await AiCheckpointService.rollbackCheckpoint(checkpointId, async (path, content) => {
      if (onApplyFileEdit) {
        return await onApplyFileEdit(path, content)
      }
      if (typeof window !== 'undefined' && window.electronAPI?.saveFile) {
        return await window.electronAPI.saveFile(path, content)
      }
      return false
    })

    if (success) {
      const cp = AiCheckpointService.getCheckpoints().find((c) => c.id === checkpointId)
      if (cp) {
        setAppliedDiffs((prev) => {
          const next = { ...prev }
          for (const f of cp.files) {
            delete next[f.filePath]
          }
          return next
        })
      }
    }
  }

  const executeToolCall = async (
    msgId: string,
    toolCall: AiToolCall,
    currentHistory: AiChatMessage[],
    iteration: number = 0,
    shouldFollowup: boolean = true
  ) => {
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
        if (onApplyFileEdit) {
          return await onApplyFileEdit(filePath, newContent)
        }
        if (typeof window !== 'undefined' && window.electronAPI?.saveFile) {
          return await window.electronAPI.saveFile(filePath, newContent)
        }
        return false
      },
    }

    // Loop Detection Guardrail: Prevent infinite autonomous token burn
    const loopCheck = AiGuardrailService.checkLoop(toolCall.toolName, toolCall.arguments)
    let loopBlocked = false
    if (loopCheck.isLoop) {
      loopBlocked = true
      shouldFollowup = false
    }

    const result: AiToolResult = loopBlocked
      ? {
          toolCallId: toolCall.id,
          toolName: toolCall.toolName,
          success: false,
          output: '',
          error: `Security Guardrail: Repetitive tool loop detected (${toolCall.toolName} invoked ${loopCheck.count} times consecutively with identical arguments). Autonomous execution paused to protect token budget. Please steer the agent or reject this action.`,
        }
      : await AiToolExecutor.execute(toolCall, context)

    // Write Tool Auto-Apply or Approved Apply:
    const isWriteTool = toolCall.toolName === 'propose_file_edit' || toolCall.toolName === 'write_file'
    if (isWriteTool && result.diff && (result.diff.fullContent || result.diff.newSnippet)) {
      const shouldApply = autoApprove.autoApproveWrite || toolCall.status === 'approved'
      if (shouldApply) {
        const applied = await handleApplyDiff(result.diff)
        if (applied) {
          result.diff.applied = true
        }
      }
    }

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

    // Feed result back to the AI model if follow-up is enabled and we haven't reached max iterations
    const maxIters = autoApprove.maxAutoIterations || 10
    if (shouldFollowup && iteration < maxIters) {
      setTimeout(() => {
        triggerAutonomousFollowup(result, currentHistory, iteration + 1)
      }, 400)
    }
  }

  /**
   * Shared streaming lifecycle used by both initial user prompts and autonomous tool follow-ups.
   */
  const startAssistantStream = (
    assistantMsg: AiChatMessage,
    historyForApi: AiChatMessage[],
    iteration: number
  ) => {
    const assistantMsgId = assistantMsg.id
    setIsStreaming(true)
    setPreparingToolName(null)
    setExpandedReasoning((prev) => ({ ...prev, [assistantMsgId]: true }))

    let systemPrompt = `${AiService.getModeSystemPrompt(chatMode)}\n\n${AiToolsRegistry.getToolsSystemPrompt()}`
    if (workspaceRules) {
      systemPrompt += `\n\n### Project-Specific Instructions & Guidelines (${workspaceRules.fileName}):\n${workspaceRules.content}`
    }
    const trimmedHistory = AiService.trimConversationHistory(historyForApi, systemPrompt, selectedModel.id)
    const systemMsg: AiChatMessage = {
      id: `sys-${Date.now()}`,
      role: 'system',
      content: systemPrompt,
      timestamp: Date.now(),
    }

    let accumulatedText = ''
    const accumulatedNativeTools: AiToolCall[] = []

    const cancel = AiService.streamChat(selectedModel, [systemMsg, ...trimmedHistory], async (chunk) => {
      // Capture live tool-input-start progress (e.g., streaming large write_file / propose_file_edit JSON)
      if (chunk.preparingTool) {
        setPreparingToolName(chunk.preparingTool)
      }

      // Capture live token usage & calculate turn cost
      if (chunk.usage) {
        const turnCost = AiTokenizer.estimateCost(selectedModel.id, chunk.usage.promptTokens, chunk.usage.completionTokens)
        setSessionCost((prev) => Number((prev + turnCost).toFixed(5)))
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, usage: chunk.usage } : msg
          )
        )
      }

      // Capture native tool calls streamed from Vercel AI SDK
      if (chunk.toolCalls && chunk.toolCalls.length > 0) {
        setPreparingToolName(null)
        for (const tc of chunk.toolCalls) {
          const toolDef = AiToolsRegistry.getTool(tc.toolName)
          const category = toolDef?.category || tc.category || 'read'
          const autoApproved = AiService.canAutoApprove(category)
          const preparedCall: AiToolCall = {
            ...tc,
            category,
            autoApproved,
            status: autoApproved ? 'approved' : 'pending_approval',
          }
          const existingIdx = accumulatedNativeTools.findIndex((c) => c.id === tc.id)
          if (existingIdx >= 0) {
            accumulatedNativeTools[existingIdx] = preparedCall
          } else {
            accumulatedNativeTools.push(preparedCall)
          }
        }
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, toolCalls: [...accumulatedNativeTools] } : msg
          )
        )
      }

      if (chunk.text) {
        setPreparingToolName(null)
        accumulatedText += chunk.text
        const displayText = stripToolCallBlocks(accumulatedText)
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: displayText,
                  reasoning: chunk.reasoning ? (msg.reasoning || '') + chunk.reasoning : msg.reasoning,
                }
              : msg
          )
        )
      } else if (chunk.reasoning) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, reasoning: (msg.reasoning || '') + chunk.reasoning }
              : msg
          )
        )
      }

      if (chunk.done || chunk.error) {
        setIsStreaming(false)
        setPreparingToolName(null)
        setCancelFn(null)

        if (chunk.error) {
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    content: msg.content
                      ? `${msg.content}\n\n*(Error during generation: ${chunk.error})*`
                      : `⚠️ **Error**: ${chunk.error}\n\nPlease verify your API key or endpoint in AI Settings.`,
                  }
                : msg
            )
          )
        } else {
          // Prioritize native tool calls streamed from Vercel AI SDK, falling back to markdown/XML parser
          const finalCalls = accumulatedNativeTools.length > 0
            ? accumulatedNativeTools
            : AiToolParser.parseToolCalls(accumulatedText)

          if (finalCalls.length > 0) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId ? { ...msg, toolCalls: finalCalls } : msg
              )
            )

            // Sequentially execute any auto-approved calls
            const autoCalls = finalCalls.filter((c) => c.status === 'approved' || c.autoApproved)
            for (let i = 0; i < autoCalls.length; i++) {
              const call = autoCalls[i]
              const isLast = i === autoCalls.length - 1
              await executeToolCall(assistantMsgId, call, [...historyForApi, assistantMsg], iteration, isLast)
            }
          }
        }
      }
    }, chatMode)

    setCancelFn(() => cancel)
  }

  const triggerAutonomousFollowup = (result: AiToolResult, history: AiChatMessage[], iteration: number) => {
    const assistantMsg: AiChatMessage = {
      id: `assistant-agent-${Date.now()}`,
      role: 'assistant',
      content: '',
      reasoning: '',
      isAgentTurn: true,
      timestamp: Date.now(),
    }

    // Build updated history that includes the tool result so the model can see it
    // Marked isInternalToolResult so it is not rendered as a duplicate fake "You" bubble
    const toolResultMsg: AiChatMessage = {
      id: `tool-result-${Date.now()}`,
      role: 'user',
      content: `Tool \`${result.toolName}\` result:\n\`\`\`\n${result.output || result.error || 'No output'}\n\`\`\``,
      isInternalToolResult: true,
      timestamp: Date.now(),
    }

    // Use live messagesRef.current (never stale closure snapshots) so prior streamed text,
    // reasoning, toolCalls, toolResults, and usage badges remain intact across autonomous loops.
    const liveHistory = messagesRef.current.length > 0 ? messagesRef.current : history
    setMessages((prev) => [...prev, toolResultMsg, assistantMsg])
    startAssistantStream(assistantMsg, [...liveHistory, toolResultMsg], iteration)
  }

  const handleApproveTool = (msgId: string, toolCall: AiToolCall) => {
    const msgIndex = messages.findIndex((m) => m.id === msgId)
    const currentHistory = msgIndex >= 0 ? messages.slice(0, msgIndex + 1) : messages
    const approvedCall: AiToolCall = { ...toolCall, status: 'approved' }
    executeToolCall(msgId, approvedCall, currentHistory, 0)
  }

  const handleRejectTool = (msgId: string, toolCall: AiToolCall, feedback?: string) => {
    const feedbackTrimmed = feedback?.trim()
    const msgIndex = messages.findIndex((m) => m.id === msgId)
    const currentHistory = msgIndex >= 0 ? messages.slice(0, msgIndex + 1) : messages

    const rejectResult: AiToolResult = {
      toolCallId: toolCall.id,
      toolName: toolCall.toolName,
      success: false,
      output: '',
      error: feedbackTrimmed
        ? `Action was rejected by user with steering guidance: "${feedbackTrimmed}". Please adjust your plan according to these instructions.`
        : 'Action was rejected by user. Please propose an alternative approach or pause for user instructions.',
    }

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.toolCalls) {
          const updatedCalls = m.toolCalls.map((tc) =>
            tc.id === toolCall.id
              ? {
                  ...tc,
                  status: 'rejected' as const,
                  guardrailNote: feedbackTrimmed ? `Rejection Guidance: ${feedbackTrimmed}` : undefined,
                  executedAt: Date.now(),
                }
              : tc
          )
          const updatedResults = [...(m.toolResults || []), rejectResult]
          return {
            ...m,
            toolCalls: updatedCalls,
            toolResults: updatedResults,
          }
        }
        return m
      })
    )

    setSteeringToolId(null)
    setSteeringFeedback('')

    // Automatically trigger autonomous follow-up with steering result
    setTimeout(() => {
      triggerAutonomousFollowup(rejectResult, currentHistory, 1)
    }, 350)
  }

  /* =========================================================================
   * 💬 Send Message & Stream Processing
   * ========================================================================= */

  const handleSendMessage = () => {
    if ((!inputText.trim() && !attachedContext) || isStreaming) return
    AiGuardrailService.resetLoopTracker()

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

    const assistantMsg: AiChatMessage = {
      id: `assistant-${Date.now()}`,
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

    startAssistantStream(assistantMsg, newHistory, 0)
  }

  const handleStopStream = () => {
    cancelFn?.()
    setIsStreaming(false)
    setPreparingToolName(null)
    setCancelFn(null)
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
      case 'openrouter':
        return '#64D2FF'
      case 'custom':
        return '#FF375F'
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

  // Parse markdown code blocks — strips tool_call fences first since those render as UI cards
  const renderMessageContent = (msg: AiChatMessage) => {
    const cleanContent = stripToolCallBlocks(msg.content)
    const parts = cleanContent.split(/(```[\w-]*\n[\s\S]*?\n```)/g)

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
            onClick={handleClearChat}
            title="Clear Chat History"
          >
            <Trash2 size={13} />
          </button>
          <button
            className="icon-btn glass-interactive"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-mcp-studio'))
            }}            title={`MCP Host Studio: ${McpService.getServers().filter((s) => s.enabled).length} active servers, ${McpService.listTools().length} tools`}
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
                {
                  id: 'openrouter',
                  name: 'OpenRouter (300+ Models Gateway)',
                  defaultUrl: 'https://openrouter.ai/api/v1',
                  keyPlaceholder: 'sk-or-v1-...',
                  helper: 'Unified BYOK gateway for Claude 3.7, DeepSeek R1, GPT-4o, Gemini 2.0 & Qwen.',
                  dashboardUrl: 'https://openrouter.ai/keys',
                },
                {
                  id: 'gemini',
                  name: 'Google Gemini (Google AI Studio)',
                  defaultUrl: 'https://generativelanguage.googleapis.com',
                  keyPlaceholder: 'AIza...',
                  helper: 'Direct AI Studio API: 1M context window & native CoT thinking.',
                  dashboardUrl: 'https://aistudio.google.com/app/apikey',
                },
                {
                  id: 'deepseek',
                  name: 'DeepSeek API',
                  defaultUrl: 'https://api.deepseek.com',
                  keyPlaceholder: 'sk-...',
                  helper: 'Direct DeepSeek API: V3 Chat & R1 Deep Reasoning at state-of-the-art cost efficiency.',
                  dashboardUrl: 'https://platform.deepseek.com/api_keys',
                },
                {
                  id: 'claude',
                  name: 'Anthropic Claude API',
                  defaultUrl: 'https://api.anthropic.com',
                  keyPlaceholder: 'sk-ant-...',
                  helper: 'Direct Anthropic API: Claude 3.7 Sonnet, 3.5 Sonnet, and Opus frontier models.',
                  dashboardUrl: 'https://console.anthropic.com/settings/keys',
                },
                {
                  id: 'openai',
                  name: 'OpenAI API',
                  defaultUrl: 'https://api.openai.com/v1',
                  keyPlaceholder: 'sk-...',
                  helper: 'Direct OpenAI API: GPT-4o, o3-mini, and GPT-4o-mini.',
                  dashboardUrl: 'https://platform.openai.com/api-keys',
                },
                {
                  id: 'custom',
                  name: 'Custom OpenAI-Compatible',
                  defaultUrl: 'http://localhost:1234/v1',
                  keyPlaceholder: 'Optional for local',
                  helper: 'Connect to LM Studio, vLLM, Groq, Together AI, Cerebras, or self-hosted proxy.',
                },
                {
                  id: 'ollama',
                  name: 'Ollama (Local Models)',
                  defaultUrl: 'http://localhost:11434',
                  keyPlaceholder: '',
                  helper: 'Local offline models running on your machine via Ollama.',
                },
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
                      <div className="prov-header-actions">
                        {(provInfo as any).dashboardUrl && (
                          <a
                            href={(provInfo as any).dashboardUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="prov-link"
                            title={`Get API Key from ${provInfo.name}`}
                          >
                            Get Key ↗
                          </a>
                        )}
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
                    </div>

                    <div className="prov-helper-text">{provInfo.helper}</div>

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
        {messages.map((msg, msgIdx) => {
          // Hide internal tool result payload messages from chat feed (already shown inside the Cline/Kilo tool dropdown)
          if (msg.isInternalToolResult || msg.id.startsWith('tool-result-')) {
            return null
          }

          const isUser = msg.role === 'user'
          const isLatestAssistant = !isUser && msgIdx === messages.length - 1

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

                {/* Tool Calls Execution Dropdown & Cards (Cline / Kilo style) */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (() => {
                  const anyPending = msg.toolCalls.some((c) => c.status === 'pending_approval')
                  const anyExecuting = msg.toolCalls.some((c) => c.status === 'executing' || executingToolId === c.id)
                  const anyFailed = msg.toolCalls.some((c) => c.status === 'failed' || c.status === 'blocked_by_guardrail')

                  // Separate high-signal user actions from silent completed background inspections
                  const primaryCalls = msg.toolCalls.filter((c) => {
                    const meta = getToolDisplayMeta(c)
                    return !meta.isBackground || c.status !== 'completed'
                  })
                  const backgroundCalls = msg.toolCalls.filter((c) => {
                    const meta = getToolDisplayMeta(c)
                    return meta.isBackground && c.status === 'completed'
                  })

                  const hasImportantActions = primaryCalls.some(
                    (c) =>
                      c.toolName === 'propose_file_edit' ||
                      c.toolName === 'write_file' ||
                      c.toolName === 'execute_terminal_command' ||
                      c.toolName === 'trigger_project_run' ||
                      c.toolName === 'get_git_diff' ||
                      c.status !== 'completed'
                  )

                  // Default open if there are edits, commands, pending approvals, or active runs;
                  // default collapsed if only quiet background/read checks completed
                  const isExpanded =
                    expandedTools[msg.id] !== undefined
                      ? expandedTools[msg.id]
                      : (anyPending || anyExecuting || anyFailed || hasImportantActions)

                  const writes = msg.toolCalls.filter((c) => c.toolName === 'propose_file_edit' || c.toolName === 'write_file').length
                  const runs = msg.toolCalls.filter((c) => c.toolName === 'execute_terminal_command' || c.toolName === 'trigger_project_run').length
                  const reads = msg.toolCalls.filter((c) => c.toolName === 'read_file').length
                  const gits = msg.toolCalls.filter((c) => c.category === 'git').length

                  const isBgShown = !!showBackgroundTools[msg.id]
                  const callsToRender = isBgShown || primaryCalls.length === 0 ? msg.toolCalls : primaryCalls

                  return (
                    <div className="tool-dropdown-container">
                      <button
                        className={`tool-dropdown-header glass-card ${
                          anyPending ? 'pending' : anyExecuting ? 'executing' : anyFailed ? 'failed' : 'completed'
                        }`}
                        onClick={() =>
                          setExpandedTools((prev) => ({
                            ...prev,
                            [msg.id]: !isExpanded,
                          }))
                        }
                        title="Toggle action log details"
                      >
                        <div className="tool-dropdown-header-left">
                          {anyExecuting ? (
                            <Loader2 size={12} className="spin-icon text-cyan" />
                          ) : anyPending ? (
                            <AlertTriangle size={12} className="text-warning" />
                          ) : anyFailed ? (
                            <AlertTriangle size={12} className="text-danger" />
                          ) : (
                            <CheckCircle2 size={12} className="text-success" />
                          )}
                          <span className="tool-dropdown-title">
                            {buildDropdownSummary(msg.toolCalls)}
                          </span>
                          <div className="tool-category-chips">
                            {writes > 0 && <span className="cat-chip write">{writes} edit{writes === 1 ? '' : 's'}</span>}
                            {runs > 0 && <span className="cat-chip run">{runs} cmd</span>}
                            {gits > 0 && <span className="cat-chip git">{gits} git</span>}
                            {reads > 0 && <span className="cat-chip read">{reads} read</span>}
                          </div>
                        </div>

                        <div className="tool-dropdown-header-right">
                          {anyPending && <span className="dropdown-status-badge pending">Approval Required</span>}
                          {anyExecuting && <span className="dropdown-status-badge executing">Running...</span>}
                          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="tool-calls-container">
                          {callsToRender.map((call) => {
                      const isPending = call.status === 'pending_approval'
                      const isExecuting = call.status === 'executing' || executingToolId === call.id
                      const isCompleted = call.status === 'completed'
                      const isBlocked = call.status === 'blocked_by_guardrail'
                      const isRejected = call.status === 'rejected'
                      const isFailed = call.status === 'failed'

                      const result = (msg.toolResults || []).find((tr) => tr.toolCallId === call.id)
                      const meta = getToolDisplayMeta(call)

                      const renderCategoryIcon = () => {
                        switch (call.category) {
                          case 'read': return <FileText size={11} className="tool-cat-icon" />
                          case 'write': return <FileCode size={11} className="tool-cat-icon" />
                          case 'run': return <Terminal size={11} className="tool-cat-icon" />
                          case 'git': return <GitBranch size={11} className="tool-cat-icon" />
                          case 'browser': return <Globe size={11} className="tool-cat-icon" />
                          default: return <Cpu size={11} className="tool-cat-icon" />
                        }
                      }

                      // Ultra-clean 1-line Cline/Kilo compact row for completed reads, searches, git status, and background steps
                      if (meta.isCompact && isCompleted && !result?.diff && !call.guardrailNote) {
                        const isPeekOpen = !!expandedCompactTools[call.id]
                        const outputLines = result?.output ? result.output.split('\n').length : 0

                        return (
                          <div key={call.id} className={`tool-compact-wrapper ${meta.isBackground ? 'is-background' : ''}`}>
                            <div className="tool-compact-row glass-subcard">
                              <div className="compact-row-left">
                                <span className={`compact-icon cat-${call.category}`}>{renderCategoryIcon()}</span>
                                <span className={`compact-headline ${meta.isCommand ? 'mono-command' : ''}`}>
                                  {meta.headline}
                                </span>
                                {meta.subtext && (
                                  <span className="compact-subtext" title={meta.subtext}>
                                    {meta.subtext}
                                  </span>
                                )}
                                {outputLines > 0 && call.toolName === 'read_file' && (
                                  <span className="compact-metric">{outputLines} lines</span>
                                )}
                              </div>
                              <div className="compact-row-right">
                                {meta.filePath && onOpenFile && (
                                  <button
                                    className="compact-action-icon"
                                    onClick={() => onOpenFile(meta.filePath!)}
                                    title={`Open ${meta.filePath} in editor`}
                                  >
                                    <ExternalLink size={11} />
                                  </button>
                                )}
                                {result?.output && (
                                  <button
                                    className="compact-action-icon"
                                    onClick={() =>
                                      setExpandedCompactTools((prev) => ({
                                        ...prev,
                                        [call.id]: !prev[call.id],
                                      }))
                                    }
                                    title="Peek output"
                                  >
                                    {isPeekOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                  </button>
                                )}
                                <CheckCircle2 size={11} className="text-success" />
                              </div>
                            </div>
                            {isPeekOpen && result?.output && (
                              <div className="tool-output-content compact-peek custom-scrollbar">
                                <pre>{result.output}</pre>
                              </div>
                            )}
                          </div>
                        )
                      }

                      const isBuiltInFormatted = [
                        'propose_file_edit',
                        'write_file',
                        'execute_terminal_command',
                        'trigger_project_run',
                        'get_git_status',
                        'get_git_diff',
                        'read_file',
                        'search_code',
                        'list_workspace_files',
                        'get_editor_diagnostics',
                        'open_editor_file',
                      ].includes(call.toolName)

                      return (
                        <div
                          key={call.id}
                          className={`tool-call-card glass-card ${
                            isPending ? 'pending' : isExecuting ? 'executing' : isCompleted ? 'completed' : isBlocked ? 'blocked' : isRejected ? 'rejected' : 'failed'
                          }`}
                        >
                          <div className="tool-card-header">
                            <div className="tool-card-title">
                              <span className={`tool-category-badge cat-${call.category}`}>
                                {renderCategoryIcon()}
                                <span className="cat-label">
                                  {call.toolName === 'execute_terminal_command'
                                    ? 'SHELL'
                                    : call.toolName === 'propose_file_edit' || call.toolName === 'write_file'
                                      ? 'EDIT'
                                      : call.category.toUpperCase()}
                                </span>
                              </span>
                              <div className="tool-header-text">
                                <span className={`tool-headline ${meta.isCommand ? 'mono-command' : ''}`}>
                                  {meta.headline}
                                </span>
                                {meta.subtext && (
                                  <span className="tool-subtext" title={meta.subtext}>
                                    {meta.subtext}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="tool-card-status">
                              {isPending && (
                                <span className="status-badge pending">
                                  <span className="pulse-indicator" />
                                  <span>Approval Required</span>
                                </span>
                              )}
                              {isExecuting && (
                                <span className="status-badge executing">
                                  <Loader2 size={11} className="spin-icon" />
                                  <span>Executing...</span>
                                </span>
                              )}
                              {isCompleted && (
                                <span className="status-badge completed">
                                  <CheckCircle2 size={11} />
                                  <span>Completed</span>
                                </span>
                              )}
                              {isBlocked && (
                                <span className="status-badge blocked">
                                  <ShieldAlert size={11} />
                                  <span>Blocked by Guardrail</span>
                                </span>
                              )}
                              {isRejected && (
                                <span className="status-badge rejected">
                                  <XCircle size={11} />
                                  <span>Rejected</span>
                                </span>
                              )}
                              {isFailed && (
                                <span className="status-badge failed">
                                  <AlertTriangle size={11} />
                                  <span>Failed</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Raw Arguments Summary — only shown for custom / MCP tools where headline doesn't cover params */}
                          {!isBuiltInFormatted && Object.keys(call.arguments).length > 0 && (
                            <div className="tool-args-preview">
                              {Object.entries(call.arguments).map(([k, v]) => {
                                let displayVal = ''
                                if (typeof v === 'string') {
                                  if (v.length > 120 || v.includes('\n')) {
                                    const lineCount = v.split('\n').length
                                    displayVal = `(${lineCount} line${lineCount === 1 ? '' : 's'}, ${v.length} chars)`
                                  } else {
                                    displayVal = v
                                  }
                                } else {
                                  displayVal = typeof v === 'object' ? JSON.stringify(v) : String(v)
                                }

                                return (
                                  <div key={k} className="tool-arg-item">
                                    <span className="arg-key">{k}:</span>
                                    <span className="arg-val" title={typeof v === 'string' ? v.slice(0, 300) : undefined}>
                                      {displayVal}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Guardrail Note */}
                          {call.guardrailNote && (
                            <div className="tool-guardrail-banner">
                              <ShieldAlert size={12} className="text-warning" />
                              <span>{call.guardrailNote}</span>
                            </div>
                          )}

                          {/* Overhauled Liquid Glass Action Buttons for Pending Tools */}
                          {isPending && (
                            <div className="tool-card-actions-wrapper">
                              <div className="tool-card-actions">
                                <button
                                  className="tool-action-btn approve glass-interactive"
                                  onClick={() => handleApproveTool(msg.id, call)}
                                  title="Approve and execute this local action"
                                >
                                  <CheckCircle2 size={13} className="btn-icon" />
                                  <span>Approve &amp; Execute</span>
                                </button>
                                <button
                                  className={`tool-action-btn steer glass-interactive ${steeringToolId === call.id ? 'active' : ''}`}
                                  onClick={() => {
                                    if (steeringToolId === call.id) {
                                      setSteeringToolId(null)
                                    } else {
                                      setSteeringToolId(call.id)
                                      setSteeringFeedback('')
                                    }
                                  }}
                                  title="Reject with custom steering guidance to redirect the agent"
                                >
                                  <MessageSquare size={13} className="btn-icon" />
                                  <span>Steer</span>
                                </button>
                                <button
                                  className="tool-action-btn reject glass-interactive"
                                  onClick={() => handleRejectTool(msg.id, call)}
                                  title="Reject this tool call immediately"
                                >
                                  <XCircle size={13} className="btn-icon" />
                                  <span>Reject</span>
                                </button>
                              </div>

                              {steeringToolId === call.id && (
                                <div className="steering-drawer glass-subcard">
                                  <div className="steering-drawer-title">
                                    <MessageSquare size={11} className="text-cyan" />
                                    <span>Steer Agent: Provide instructions for alternative action</span>
                                  </div>
                                  <input
                                    type="text"
                                    className="steering-input"
                                    placeholder="e.g., Don't edit this file, modify src/config.ts instead..."
                                    value={steeringFeedback}
                                    onChange={(e) => setSteeringFeedback(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && steeringFeedback.trim()) {
                                        handleRejectTool(msg.id, call, steeringFeedback)
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <div className="steering-actions">
                                    <button
                                      className="steering-btn cancel"
                                      onClick={() => setSteeringToolId(null)}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      className="steering-btn submit"
                                      disabled={!steeringFeedback.trim()}
                                      onClick={() => handleRejectTool(msg.id, call, steeringFeedback)}
                                    >
                                      Reject with Guidance
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Output or Diff View */}
                          {result && (
                            <div className="tool-result-box">
                              {/* Diff Viewer for file write / edit */}
                              {result.diff && (result.diff.fullContent || result.diff.newSnippet) && (
                                <div className="tool-diff-card glass-subcard">
                                  <div className="tool-diff-header">
                                    <div className="diff-header-left">
                                      <FileCheck size={12} className="text-cyan" />
                                      <span className="diff-file-name">{result.diff.filePath}</span>
                                      {result.diff.originalSnippet && result.diff.newSnippet ? (
                                        <span className="diff-stats-pill">
                                          <span className="diff-stat-sub">-{result.diff.originalSnippet.split('\n').length}</span>
                                          <span className="diff-stat-add">+{result.diff.newSnippet.split('\n').length}</span>
                                        </span>
                                      ) : result.diff.fullContent ? (
                                        <span className="diff-stats-pill">
                                          <span className="diff-stat-add">+{result.diff.fullContent.split('\n').length} lines</span>
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="diff-header-right">
                                      {result.diff.originalSnippet && result.diff.newSnippet && (
                                        <div className="diff-view-toggle">
                                          <button
                                            className={`diff-toggle-btn ${(diffViewModes[result.diff.filePath] || 'unified') === 'unified' ? 'active' : ''}`}
                                            onClick={() => setDiffViewModes(prev => ({ ...prev, [result.diff!.filePath]: 'unified' }))}
                                            title="Unified Diff View"
                                          >
                                            Unified
                                          </button>
                                          <button
                                            className={`diff-toggle-btn ${(diffViewModes[result.diff.filePath] || 'unified') === 'split' ? 'active' : ''}`}
                                            onClick={() => setDiffViewModes(prev => ({ ...prev, [result.diff!.filePath]: 'split' }))}
                                            title="Side-by-Side Split Diff View"
                                          >
                                            Split
                                          </button>
                                        </div>
                                      )}
                                      <button
                                        className="diff-expand-btn glass-interactive"
                                        onClick={() => setExpandedDiff(result.diff!)}
                                        title="Expand Full Screen Diff Modal"
                                      >
                                        <Maximize2 size={11} />
                                      </button>
                                      {appliedDiffs[result.diff.filePath] || result.diff.applied ? (
                                        <div className="diff-applied-group">
                                          <span className="diff-applied-badge">
                                            <Check size={11} /> Applied
                                          </span>
                                          {(() => {
                                            const cp = checkpoints.find((c) =>
                                              c.files.some((f) => f.filePath === result.diff!.filePath || result.diff!.filePath.endsWith(f.fileName))
                                            )
                                            if (cp && !cp.restored) {
                                              return (
                                                <button
                                                  className="diff-rollback-btn glass-interactive"
                                                  onClick={() => handleRollbackCheckpoint(cp.id)}
                                                  title="Rollback this file edit to pre-edit state"
                                                >
                                                  <RotateCcw size={10} />
                                                  <span>Rollback</span>
                                                </button>
                                              )
                                            }
                                            if (cp && cp.restored) {
                                              return (
                                                <span className="diff-restored-badge" title="File edit was rolled back">
                                                  <RotateCcw size={10} /> Restored
                                                </span>
                                              )
                                            }
                                            return null
                                          })()}
                                        </div>
                                      ) : (
                                        <button
                                          className="apply-diff-btn glass-interactive"
                                          onClick={() => handleApplyDiff(result.diff!)}
                                          title="Apply this file modification to the editor"
                                        >
                                          <CheckCircle2 size={11} />
                                          <span>Accept Diff</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Split View */}
                                  {(diffViewModes[result.diff.filePath] === 'split' && result.diff.originalSnippet && result.diff.newSnippet) ? (
                                    <div className="snippet-diff-split custom-scrollbar">
                                      <div className="split-diff-col original">
                                        <div className="split-col-header">Original (Current)</div>
                                        <div className="split-col-content">
                                          {result.diff.originalSnippet.split('\n').map((line, idx) => (
                                            <div key={idx} className="split-line removal">
                                              <span className="line-num">{idx + 1}</span>
                                              <span className="line-prefix">-</span>
                                              <span className="line-text">{line}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="split-diff-col modified">
                                        <div className="split-col-header">Proposed Edit</div>
                                        <div className="split-col-content">
                                          {result.diff.newSnippet.split('\n').map((line, idx) => (
                                            <div key={idx} className="split-line addition">
                                              <span className="line-num">{idx + 1}</span>
                                              <span className="line-prefix">+</span>
                                              <span className="line-text">{line}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    /* Unified View */
                                    <>
                                      {result.diff.originalSnippet && result.diff.newSnippet && (
                                        <div className="snippet-diff-body custom-scrollbar">
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
                                      {!result.diff.originalSnippet && result.diff.fullContent && (
                                        <div className="snippet-diff-body custom-scrollbar">
                                          <div className="diff-chunk addition full-write">
                                            <span className="diff-prefix">+</span>
                                            <pre>{result.diff.fullContent}</pre>
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}

                              {/* General Output / Terminal Logs */}
                              {(result.output || result.error) && !result.diff?.fullContent && (
                                <div className="tool-output-content custom-scrollbar">
                                  {result.output?.includes('[✂️ Output truncated') && (
                                    <div className="output-compacted-banner">
                                      <Scissors size={11} className="text-cyan" />
                                      <span>Token Compactor: Large output pruned to preserve context space</span>
                                    </div>
                                  )}
                                  <pre>{result.output || result.error}</pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {backgroundCalls.length > 0 && primaryCalls.length > 0 && (
                      <button
                        className="toggle-bg-tools-btn glass-interactive"
                        onClick={() =>
                          setShowBackgroundTools((prev) => ({
                            ...prev,
                            [msg.id]: !isBgShown,
                          }))
                        }
                      >
                        {isBgShown ? (
                          <>
                            <ChevronDown size={11} />
                            <span>Hide {backgroundCalls.length} background check{backgroundCalls.length === 1 ? '' : 's'}</span>
                          </>
                        ) : (
                          <>
                            <ChevronRight size={11} />
                            <span>+{backgroundCalls.length} background check{backgroundCalls.length === 1 ? '' : 's'} (diagnostics / file listing)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
                    </div>
                  )
                })()}

                {/* Live tool-input-start progress pill while large tool arguments stream */}
                {isLatestAssistant && isStreaming && preparingToolName && (
                  <div className="preparing-tool-pill glass-card">
                    <Loader2 size={11} className="spin-icon text-cyan" />
                    <span>
                      Preparing <strong>{preparingToolName.replace(/_/g, ' ')}</strong>…
                    </span>
                  </div>
                )}

                {/* Message text / code blocks */}
                {(isUser || stripToolCallBlocks(msg.content).trim().length > 0) && (
                  <div className={`message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
                    {renderMessageContent(msg)}
                    {!isUser && msg.usage && (
                      <div className="message-usage-footer">
                        <Cpu size={9} className="usage-icon" />
                        <span className="usage-item">
                          {msg.usage.promptTokens.toLocaleString()} in / {msg.usage.completionTokens.toLocaleString()} out ({msg.usage.totalTokens.toLocaleString()} tokens)
                        </span>
                        {msg.usage.cachedInputTokens && msg.usage.cachedInputTokens > 0 && (
                          <span className="usage-item cached" title="Prompt cache hit tokens">
                            ⚡ {msg.usage.cachedInputTokens.toLocaleString()} cached
                          </span>
                        )}
                        <span className="usage-item cost">
                          ${AiTokenizer.estimateCost(selectedModel.id, msg.usage.promptTokens, msg.usage.completionTokens).toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
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
          title={`Token Breakdown:\n• System Prompt: ${tokenBreakdown.systemTokens.toLocaleString()} tokens\n• Chat History: ${tokenBreakdown.historyTokens.toLocaleString()} tokens\n• Attached Context: ${tokenBreakdown.attachmentTokens.toLocaleString()} tokens\n• Current Input: ${tokenBreakdown.inputTokens.toLocaleString()} tokens\n• Total: ${tokenBreakdown.totalTokens.toLocaleString()} / ${tokenBreakdown.contextLimit.toLocaleString()} tokens (${tokenBreakdown.percentUsed}%)\n• Est. Session Spend: $${sessionCost.toFixed(4)}`}
        >
          <div className="token-meter-left">
            <Cpu size={10} className="meter-icon" />
            <span className="token-count-label">
              {tokenBreakdown.totalTokens.toLocaleString()} / {(tokenBreakdown.contextLimit / 1000).toFixed(0)}k tokens ({tokenBreakdown.percentUsed}%)
            </span>
            <span className="token-cost-badge" title="Estimated session spend calculated from active model pricing">
              ${sessionCost.toFixed(3)}
            </span>
          </div>
          <div className="token-meter-bar-track">
            <div
              className={`token-meter-bar-fill ${tokenBreakdown.percentUsed > 80 ? 'danger' : tokenBreakdown.percentUsed > 50 ? 'warning' : 'safe'}`}
              style={{ width: `${Math.max(2, Math.min(100, tokenBreakdown.percentUsed))}%` }}
            />
          </div>
          <div className="token-meter-right">
            {checkpoints.length > 0 && (
              <span
                className="checkpoints-active-pill"
                onClick={() => setIsCheckpointsOpen(!isCheckpointsOpen)}
                title="View active file snapshots & rollbacks"
              >
                <History size={9} />
                <span>{checkpoints.length} Snapshots</span>
              </span>
            )}
            {workspaceRules && (
              <span className="rules-active-pill" title={`Active workspace rules loaded from ${workspaceRules.fileName}`}>
                <FileText size={9} />
                <span>{workspaceRules.fileName}</span>
              </span>
            )}
            <span className={`active-mode-tag ${chatMode}`}>
              {chatMode === 'plan' ? '📘 Plan Mode' : '⚡ Act Mode'}
            </span>
          </div>
        </div>

        {/* Checkpoints & Shadow Snapshots Popover */}
        {isCheckpointsOpen && checkpoints.length > 0 && (
          <div className="checkpoints-popover glass-subcard">
            <div className="checkpoints-popover-header">
              <div className="checkpoints-title">
                <History size={12} className="text-cyan" />
                <span>Session File Checkpoints ({checkpoints.length})</span>
              </div>
              <button
                className="checkpoints-close-btn"
                onClick={() => setIsCheckpointsOpen(false)}
                title="Close"
              >
                <X size={11} />
              </button>
            </div>
            <div className="checkpoints-list custom-scrollbar">
              {checkpoints.map((cp) => (
                <div key={cp.id} className={`checkpoint-item ${cp.restored ? 'restored' : ''}`}>
                  <div className="cp-item-details">
                    <span className="cp-desc">{cp.description}</span>
                    <span className="cp-meta">
                      {new Date(cp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · {cp.files.length} file(s)
                    </span>
                  </div>
                  {cp.restored ? (
                    <span className="cp-restored-tag">Rolled back</span>
                  ) : (
                    <button
                      className="cp-rollback-btn glass-interactive"
                      onClick={() => handleRollbackCheckpoint(cp.id)}
                      title="Rollback this checkpoint to pre-edit state"
                    >
                      <RotateCcw size={10} />
                      <span>Rollback</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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

      {/* Full-Screen / Modal Diff Preview */}
      {expandedDiff && (
        <div className="expanded-diff-overlay" onClick={() => setExpandedDiff(null)}>
          <div className="expanded-diff-modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="expanded-diff-header">
              <div className="expanded-diff-title">
                <FileCheck size={14} className="text-cyan" />
                <span className="expanded-diff-path">{expandedDiff.filePath}</span>
                {expandedDiff.originalSnippet && expandedDiff.newSnippet && (
                  <span className="diff-stats-pill">
                    <span className="diff-stat-sub">-{expandedDiff.originalSnippet.split('\n').length}</span>
                    <span className="diff-stat-add">+{expandedDiff.newSnippet.split('\n').length}</span>
                  </span>
                )}
              </div>
              <div className="expanded-diff-actions">
                {onOpenFile && (
                  <button
                    className="modal-action-btn secondary"
                    onClick={() => {
                      onOpenFile(expandedDiff.filePath)
                      setExpandedDiff(null)
                    }}
                    title="Open in Monaco Editor"
                  >
                    <ExternalLink size={12} />
                    <span>Open in Editor</span>
                  </button>
                )}
                {appliedDiffs[expandedDiff.filePath] || expandedDiff.applied ? (
                  <span className="diff-applied-badge">
                    <Check size={12} /> Applied
                  </span>
                ) : (
                  <button
                    className="modal-action-btn primary"
                    onClick={async () => {
                      await handleApplyDiff(expandedDiff)
                      setExpandedDiff(null)
                    }}
                  >
                    <CheckCircle2 size={12} />
                    <span>Accept &amp; Apply Diff</span>
                  </button>
                )}
                <button
                  className="modal-close-btn"
                  onClick={() => setExpandedDiff(null)}
                  title="Close Diff Preview"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="expanded-diff-content custom-scrollbar">
              {expandedDiff.originalSnippet && expandedDiff.newSnippet ? (
                <div className="expanded-split-container">
                  <div className="expanded-split-pane left">
                    <div className="expanded-pane-header">Original (Current)</div>
                    <div className="expanded-pane-lines">
                      {expandedDiff.originalSnippet.split('\n').map((line, idx) => (
                        <div key={idx} className="expanded-line removal">
                          <span className="expanded-line-no">{idx + 1}</span>
                          <span className="expanded-line-marker">-</span>
                          <span className="expanded-line-code">{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="expanded-split-pane right">
                    <div className="expanded-pane-header">Proposed Edit (AI Assistant)</div>
                    <div className="expanded-pane-lines">
                      {expandedDiff.newSnippet.split('\n').map((line, idx) => (
                        <div key={idx} className="expanded-line addition">
                          <span className="expanded-line-no">{idx + 1}</span>
                          <span className="expanded-line-marker">+</span>
                          <span className="expanded-line-code">{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="expanded-full-view">
                  <pre>{expandedDiff.fullContent || expandedDiff.newSnippet}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </aside>
  )
}

function formatInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
}

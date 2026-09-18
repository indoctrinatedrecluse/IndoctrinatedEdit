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
  Boxes,
  Terminal,
  FileCode,
  FolderSearch,
  Globe,
  GitBranch,
  Sliders,
} from 'lucide-react'
import {
  AiChatMessage,
  AiModelOption,
  AiProvider,
  AiAutoApproveSettings,
  AutoApprovePreset,
} from '@sdk/types'
import {
  AiService,
  PRESET_MODELS,
  AiSettingsMap,
  AUTO_APPROVE_PRESETS,
} from '../../services/aiService'
import { SelectionInfo } from '../Editor/EditorHost'
import { terminalService } from '../../services/terminalService'

interface AiChatPanelProps {
  isOpen: boolean
  onClose: () => void
  activeFileName?: string
  activeFileContent?: string
  currentSelection: SelectionInfo | null
  onInsertAtCursor?: (code: string) => void
  onReplaceSelection?: (code: string) => void
}

export const AiChatPanel: React.FC<AiChatPanelProps> = ({
  isOpen,
  onClose,
  activeFileName = 'untitled.ts',
  activeFileContent = '',
  currentSelection,
  onInsertAtCursor,
  onReplaceSelection,
}) => {
  // Settings & Models
  const [settings, setSettings] = useState<AiSettingsMap>(AiService.getSettings())
  const [autoApprove, setAutoApprove] = useState<AiAutoApproveSettings>(AiService.getAutoApproveSettings())
  const [models, setModels] = useState<AiModelOption[]>(PRESET_MODELS)
  const [selectedModelId, setSelectedModelId] = useState<string>(AiService.getActiveModelId())
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'keys' | 'permissions'>('keys')
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})

  // Chat State
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Hello! I'm your **IndoctrinatedEdit** AI Assistant.\n\nI can analyze your active files, explain algorithms, audit security flaws, refactor functions, or generate high-coverage test suites. Highlight any code in the editor and click **"Attach Selection"**, or use the quick actions below!`,
      timestamp: Date.now(),
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [cancelFn, setCancelFn] = useState<(() => void) | null>(null)
  const [attachedContext, setAttachedContext] = useState<{
    type: 'selection' | 'file'
    fileName: string
    code: string
    startLine?: number
    endLine?: number
  } | null>(null)

  // Expand reasoning cards
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({})
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null)

  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

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

  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0]

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

  const handleRemoveAttachment = () => {
    setAttachedContext(null)
  }

  // Quick Action Prompts
  const handleQuickAction = (action: 'explain' | 'bugs' | 'refactor' | 'tests' | 'docs' | 'arch') => {
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
    }

    if (!attachedContext) {
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

  // Send Message
  const handleSendMessage = () => {
    if ((!inputText.trim() && !attachedContext) || isStreaming) return

    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputText.trim() || (attachedContext ? 'Please analyze this attached code.' : ''),
      attachment: attachedContext || undefined,
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
    setIsStreaming(true)

    setExpandedReasoning((prev) => ({ ...prev, [assistantMsgId]: true }))

    const cancel = AiService.streamChat(selectedModel, newHistory, (chunk) => {
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
    const updated = {
      ...settings,
      [provider]: {
        ...settings[provider],
        [field]: value,
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
          <div className="model-selector-container">
            <button
              className="model-pill glass-interactive"
              onClick={() => {
                setIsModelDropdownOpen(!isModelDropdownOpen)
                setIsSettingsOpen(false)
              }}
              title="Select AI Model"
            >
              <span
                className="provider-dot"
                style={{ backgroundColor: getProviderColor(selectedModel.provider) }}
              />
              <span className="model-name">{selectedModel.name}</span>
              <ChevronDown size={11} />
            </button>

            {isModelDropdownOpen && (
              <div className="model-dropdown-menu glass-panel custom-scrollbar">
                <div className="dropdown-header">Available AI Models</div>
                <div className="dropdown-list">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      className={`model-option ${model.id === selectedModelId ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedModelId(model.id)
                        AiService.setActiveModelId(model.id)
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
                      {model.id === selectedModelId && <Check size={13} className="check-active" />}
                    </button>
                  ))}
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

      {/* Settings / API Key / Permissions Drawer */}
      {isSettingsOpen && (
        <div className="ai-settings-drawer glass-panel custom-scrollbar">
          <div className="settings-header">
            <div className="settings-tab-bar">
              <button
                className={`settings-tab-btn ${settingsTab === 'permissions' ? 'active' : ''}`}
                onClick={() => setSettingsTab('permissions')}
              >
                <ShieldCheck size={12} />
                <span>Auto-Approve & Permissions</span>
              </button>
              <button
                className={`settings-tab-btn ${settingsTab === 'keys' ? 'active' : ''}`}
                onClick={() => setSettingsTab('keys')}
              >
                <Key size={12} />
                <span>API Keys & Subscriptions</span>
              </button>
            </div>
            <button className="settings-close" onClick={() => setIsSettingsOpen(false)}>
              <X size={12} />
            </button>
          </div>

          {settingsTab === 'permissions' ? (
            <div className="permissions-drawer-body">
              {/* Presets Bar */}
              <div className="permissions-presets-bar">
                <span className="presets-label">Security Presets:</span>
                <div className="presets-buttons">
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
          ) : (
            <div className="settings-scroll-list">
              {(['antigravity', 'openai', 'deepseek', 'gemini', 'claude', 'ollama'] as AiProvider[]).map((prov) => {
                const cfg = settings[prov]
                const isOllama = prov === 'ollama'
                const isAntigravity = prov === 'antigravity'
                const isOpenAI = prov === 'openai'
                const isRevealed = showKey[prov]

                return (
                  <div key={prov} className="provider-card glass-subcard">
                    <div className="prov-card-header">
                      <div className="prov-title-left">
                        <span
                          className="provider-dot"
                          style={{ backgroundColor: getProviderColor(prov) }}
                        />
                        <span className="prov-name">
                          {isAntigravity
                            ? 'ANTIGRAVITY (PERSONAL SUBSCRIPTION)'
                            : isOpenAI
                            ? 'OPENAI / CHATGPT CODEX'
                            : prov.toUpperCase()}
                        </span>
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
                        <label>
                          {isAntigravity
                            ? 'Subscription Token / Session Key'
                            : isOpenAI
                            ? 'API Key or Session Token'
                            : 'API Key'}
                        </label>
                        <div className="input-with-icon">
                          <input
                            type={isRevealed ? 'text' : 'password'}
                            placeholder={
                              isAntigravity
                                ? 'Personal subscription token or API key...'
                                : `Enter ${prov} API Key...`
                            }
                            value={cfg.apiKey}
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
                        placeholder={
                          isOllama
                            ? 'http://localhost:11434'
                            : isAntigravity
                            ? 'http://localhost:8080/v1 (or proxy endpoint)'
                            : 'Default API endpoint'
                        }
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
                    <span className="chip-file">{msg.attachment.fileName}</span>
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
        {/* Active attachment pill if selected */}
        {attachedContext && (
          <div className="attachment-active-bar glass-pill">
            <div className="attachment-details">
              <Paperclip size={12} className="attach-icon" />
              <span className="attach-name">{attachedContext.fileName}</span>
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
        <div className="quick-actions-row custom-scrollbar">
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
          <button className="quick-chip" onClick={() => handleQuickAction('tests')}>
            <TestTube2 size={11} className="chip-icon success" />
            <span>Tests</span>
          </button>
          <button className="quick-chip" onClick={() => handleQuickAction('docs')}>
            <FileText size={11} className="chip-icon" />
            <span>Docs</span>
          </button>
          <button className="quick-chip" onClick={() => handleQuickAction('arch')}>
            <Boxes size={11} className="chip-icon" />
            <span>Architecture</span>
          </button>
        </div>

        {/* Prompt Input Box */}
        <div className="input-box-container glass-card">
          <textarea
            ref={textareaRef}
            className="ai-textarea"
            placeholder={
              attachedContext
                ? `Ask anything about ${attachedContext.fileName}... (Enter to send)`
                : 'Ask AI assistant or attach code... (Enter to send, Shift+Enter for newline)'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
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
          height: 42px;
          min-height: 42px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
          flex-shrink: 0;
          z-index: 10;
        }

        .ai-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          flex: 1;
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
          width: 270px;
          max-height: 320px;
          overflow-y: auto;
          background: rgba(14, 18, 32, 0.96);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
          z-index: 100;
          padding: 6px;
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

        /* Messages Scroll Container */
        .ai-messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          z-index: 10;
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
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          line-height: 1.5;
          word-break: break-word;
        }

        .user-bubble {
          background: rgba(10, 132, 255, 0.22);
          border: 1px solid rgba(10, 132, 255, 0.35);
          color: #FFFFFF;
          border-bottom-right-radius: 2px;
        }

        .assistant-bubble {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #FFFFFF;
          border-bottom-left-radius: 2px;
        }

        .attached-context-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          background: rgba(0, 240, 255, 0.08);
          border: 1px solid rgba(0, 240, 255, 0.25);
          border-radius: 6px;
          font-size: 10px;
          color: #5AC8FA;
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

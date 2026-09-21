import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Send,
  Square,
  Trash2,
  Copy,
  Check,
  Code2,
  Sliders,
  RefreshCw,
  LogOut,
  Sparkles,
  Zap,
  User,
  ChevronDown,
  ChevronRight,
  FileCode,
  Paperclip,
  X,
  AlertCircle,
  Terminal,
  Activity,
} from 'lucide-react'
import { AntigravityIcon } from '../Brand/AntigravityIcon'
import { antigravityAuthService } from '../../services/antigravityAuthService'
import { AiService } from '../../services/aiService'
import {
  AntigravitySession,
  AntigravityQuotaInfo,
  AntigravitySidecarStatus,
  AiModelOption,
  AiChatMessage,
} from '@sdk/types'
import { SelectionInfo } from '../Editor/EditorHost'
import './AntigravityStudioView.css'

export interface AntigravityStudioViewProps {
  activeFileName?: string
  activeFileContent?: string
  currentSelection?: SelectionInfo | null
  onInsertAtCursor?: (code: string) => void
  onReplaceSelection?: (code: string) => void
  onClose?: () => void
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoning?: string
  timestamp: number
  model?: string
  isStreaming?: boolean
}

export const AntigravityStudioView: React.FC<AntigravityStudioViewProps> = ({
  activeFileName = 'untitled.ts',
  activeFileContent = '',
  currentSelection,
  onInsertAtCursor,
  onReplaceSelection,
  onClose,
}) => {
  // Session & Sidecar State
  const [session, setSession] = useState<AntigravitySession | null>(antigravityAuthService.getSession())
  const [quota, setQuota] = useState<AntigravityQuotaInfo | null>(antigravityAuthService.getCachedQuota())
  const [sidecarStatus, setSidecarStatus] = useState<AntigravitySidecarStatus | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Welcome to **Google Antigravity Studio**!\n\nPowered by the Python Antigravity SDK with your personal Google account. Enjoy 1M-token context windows, real-time reasoning streaming, and zero manual API key configuration.`,
      timestamp: Date.now(),
      model: 'antigravity-gemini-2-5-pro',
    },
  ])
  const [inputPrompt, setInputPrompt] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [selectedModel, setSelectedModel] = useState('antigravity-gemini-2-5-pro')
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false)
  const [includeFileContext, setIncludeFileContext] = useState(false)
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null)
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({})

  // Live Backend Logs & Tokenization State
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [logsData, setLogsData] = useState<{ logFile: string; logs: string[] }>({
    logFile: '~/.indoctrinated/antigravity_backend.log',
    logs: [],
  })
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(false)
  const [copiedLogs, setCopiedLogs] = useState(false)
  const [tokenEstimation, setTokenEstimation] = useState<{ estimatedTokens: number; remainingContext: number }>({
    estimatedTokens: 0,
    remainingContext: 1048576,
  })

  // Generation Settings
  const [temperature, setTemperature] = useState(0.7)
  const [systemInstruction, setSystemInstruction] = useState(
    'You are an expert Google Antigravity pair programmer and software architect. Provide clean, modular, production-grade code with TypeScript types and concise explanations.'
  )

  const activeStreamCancelRef = useRef<(() => void) | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)

  // Available Models
  const availableModels = useMemo(
    () => [
      {
        id: 'antigravity-gemini-2-5-pro',
        name: 'Antigravity Gemini 2.5 Pro',
        badge: 'Recommended',
        context: '1M Context',
        desc: 'Advanced reasoning, deep architectural analysis & complex code synthesis.',
      },
      {
        id: 'antigravity-gemini-2-5-flash',
        name: 'Antigravity Gemini 2.5 Flash',
        badge: 'Ultra Fast',
        context: '1M Context',
        desc: 'Sub-second real-time streaming for rapid edits, refactors & explanations.',
      },
      {
        id: 'antigravity-claude-3-7-sonnet',
        name: 'Antigravity Claude 3.7 Sonnet',
        badge: 'Hybrid CoT',
        context: '200k Context',
        desc: 'Personal subscription proxy with deep chain-of-thought code generation.',
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro (Direct)',
        badge: 'Google SDK',
        context: '1M Context',
        desc: 'Native Google GenAI model execution with personal OAuth credentials.',
      },
      {
        id: 'deepseek-r1',
        name: 'DeepSeek R1 (Antigravity Agent)',
        badge: 'Open Reasoning',
        context: '128k Context',
        desc: 'High-math and strict formal verification model via Antigravity harness.',
      },
    ],
    []
  )

  // Auto-scroll inside messages container strictly without moving window/viewport
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages, isStreaming])

  // Sync auth & quota
  useEffect(() => {
    const unsub = antigravityAuthService.onAuthChanged((newSession) => {
      setSession(newSession)
      antigravityAuthService.getQuota().then(setQuota).catch(() => {})
    })

    antigravityAuthService.syncSession().then((sess) => {
      setSession(sess)
      antigravityAuthService.getQuota().then(setQuota).catch(() => {})
      antigravityAuthService.getSidecarStatus().then(setSidecarStatus).catch(() => {})
    })

    return () => unsub()
  }, [])

  // Outside click listener for model dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-resize input textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputPrompt(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`
    }
  }

  // Handle OAuth Google Login
  const handleGoogleLogin = async () => {
    setIsAuthenticating(true)
    setAuthError(null)
    try {
      const newSession = await antigravityAuthService.loginWithGoogle()
      setSession(newSession)
      const q = await antigravityAuthService.getQuota()
      setQuota(q)
      const st = await antigravityAuthService.getSidecarStatus()
      setSidecarStatus(st)
    } catch (err: any) {
      setAuthError(err.message || 'Failed to authenticate with Google')
    } finally {
      setIsAuthenticating(false)
    }
  }

  // Live Token Estimation Debounce
  useEffect(() => {
    let active = true
    const updateTokenCount = async () => {
      const fullText = (includeFileContext && activeFileContent ? `Context File: ${activeFileName}\n${activeFileContent}\n\n` : '') + inputPrompt
      const res = await antigravityAuthService.tokenize(
        fullText,
        messages.map((m) => ({ role: m.role, content: m.content }))
      )
      if (active) {
        setTokenEstimation({
          estimatedTokens: res.estimatedTokens,
          remainingContext: res.remainingContext,
        })
      }
    }
    const timer = setTimeout(updateTokenCount, 250)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [inputPrompt, includeFileContext, activeFileName, activeFileContent, messages])

  // Fetch Backend Daemon Logs
  const handleFetchLogs = async () => {
    setIsLoadingLogs(true)
    try {
      const data = await antigravityAuthService.getLogs()
      setLogsData(data)
    } catch {
      // Ignored
    } finally {
      setIsLoadingLogs(false)
    }
  }

  // Copy Logs to Clipboard
  const handleCopyLogs = () => {
    const raw = logsData.logs.join('\n')
    navigator.clipboard.writeText(raw)
    setCopiedLogs(true)
    setTimeout(() => setCopiedLogs(false), 2000)
  }

  // Auto-refresh Logs Effect
  useEffect(() => {
    if (!showLogsModal) return
    handleFetchLogs()
    if (autoRefreshLogs) {
      const interval = setInterval(handleFetchLogs, 2500)
      return () => clearInterval(interval)
    }
  }, [showLogsModal, autoRefreshLogs])

  // Handle Logout
  const handleGoogleLogout = async () => {
    await antigravityAuthService.logout()
    setSession(null)
  }

  // Copy Snippet
  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedSnippetId(id)
    setTimeout(() => setCopiedSnippetId(null), 2000)
  }

  // Insert code into active buffer
  const handleInsertCode = (code: string) => {
    if (onReplaceSelection && currentSelection && currentSelection.text) {
      onReplaceSelection(code)
    } else if (onInsertAtCursor) {
      onInsertAtCursor(code)
    }
  }

  // Send Prompt to Python Antigravity SDK
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || inputPrompt).trim()
    if (!promptToSend || isStreaming) return

    // Construct Context Attachment if enabled
    let finalPrompt = promptToSend
    if (includeFileContext && activeFileName && activeFileContent) {
      const selectedSnippet = currentSelection?.text ? `\n\nActive Selection:\n\`\`\`\n${currentSelection.text}\n\`\`\`` : ''
      finalPrompt = `${promptToSend}\n\n[Active File Context: ${activeFileName}]\n\`\`\`\n${activeFileContent.slice(0, 12000)}\n\`\`\`${selectedSnippet}`
    }

    const userMessageId = `user-${Date.now()}`
    const assistantMessageId = `asst-${Date.now()}`

    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMessageId,
        role: 'user',
        content: promptToSend,
        timestamp: Date.now(),
      },
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        reasoning: '',
        timestamp: Date.now(),
        model: selectedModel,
        isStreaming: true,
      },
    ]

    setMessages(newMessages)
    setInputPrompt('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setIsStreaming(true)

    const modelOption: AiModelOption = {
      id: selectedModel,
      name: currentModelObj.name,
      provider: 'antigravity',
      description: currentModelObj.desc,
      supportsReasoning: true,
    }

    const historyForApi: AiChatMessage[] = newMessages
      .filter((m) => m.id !== assistantMessageId)
      .map((m) => ({
        id: m.id,
        role: m.role,
        content: m.id === userMessageId ? finalPrompt : m.content,
        timestamp: m.timestamp,
      }))

    try {
      const cancel = AiService.streamChat(modelOption, historyForApi, (chunk) => {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === assistantMessageId) {
              return {
                ...msg,
                content: chunk.text ? msg.content + chunk.text : msg.content,
                reasoning: chunk.reasoning ? (msg.reasoning || '') + chunk.reasoning : msg.reasoning,
                isStreaming: !chunk.done && !chunk.error,
              }
            }
            return msg
          })
        )

        if (chunk.done || chunk.error) {
          setIsStreaming(false)
          activeStreamCancelRef.current = null
        }
      })

      activeStreamCancelRef.current = cancel
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: msg.content + `\n\n> ⚠️ **Error**: ${err.message || 'Stream connection failed'}. Please verify Google Login in Antigravity settings.`,
                isStreaming: false,
              }
            : msg
        )
      )
      setIsStreaming(false)
      activeStreamCancelRef.current = null
    }
  }

  // Stop Generation
  const handleStopGeneration = () => {
    if (activeStreamCancelRef.current) {
      activeStreamCancelRef.current()
      activeStreamCancelRef.current = null
    }
    setIsStreaming(false)
    setMessages((prev) =>
      prev.map((msg) => (msg.isStreaming ? { ...msg, isStreaming: false } : msg))
    )
  }

  // Clear Chat
  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Conversation reset. Ready for new Antigravity instructions!`,
        timestamp: Date.now(),
        model: selectedModel,
      },
    ])
  }

  // Render markdown with code block parsing
  const renderMessageContent = (content: string, msgId: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g)

    return (
      <div className="markdown-rendered-body">
        {parts.map((part, index) => {
          if (part.startsWith('```')) {
            const lines = part.slice(3, -3).trim().split('\n')
            const lang = lines[0].trim() || 'text'
            const code = lines.slice(1).join('\n') || lines[0]
            const snippetId = `${msgId}-code-${index}`

            return (
              <div key={snippetId} className="antigravity-code-block glass-panel">
                <div className="code-block-header">
                  <span className="code-lang-tag">
                    <Code2 size={12} />
                    {lang}
                  </span>
                  <div className="code-block-actions">
                    <button
                      className="code-action-btn glass-interactive"
                      onClick={() => handleCopyCode(code, snippetId)}
                      title="Copy Code to Clipboard"
                    >
                      {copiedSnippetId === snippetId ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      <span>{copiedSnippetId === snippetId ? 'Copied' : 'Copy'}</span>
                    </button>
                    {(onInsertAtCursor || onReplaceSelection) && (
                      <button
                        className="code-action-btn glass-interactive insert-btn"
                        onClick={() => handleInsertCode(code)}
                        title="Insert into Active Editor Buffer"
                      >
                        <FileCode size={12} />
                        <span>Insert</span>
                      </button>
                    )}
                  </div>
                </div>
                <pre className="code-pre-wrapper">
                  <code>{code}</code>
                </pre>
              </div>
            )
          }

          // Plain text / basic markdown bold / lists
          return (
            <div
              key={index}
              className="text-chunk"
              dangerouslySetInnerHTML={{
                __html: part
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
                  .replace(/\n\n/g, '<br/><br/>')
                  .replace(/\n/g, '<br/>'),
              }}
            />
          )
        })}
      </div>
    )
  }

  const currentModelObj = availableModels.find((m) => m.id === selectedModel) || availableModels[0]

  return (
    <div className="antigravity-studio-container">
      {/* Studio Header */}
      <header className="studio-header">
        <div className="header-left">
          <AntigravityIcon size={20} className="antigravity-logo-glow" />
          <div className="title-group">
            <span className="brand-title">Google Antigravity</span>
            <span className="brand-badge">Python SDK</span>
          </div>
        </div>

        <div className="header-right">
          {/* Model Selector Trigger */}
          <div className="model-dropdown-anchor" ref={modelDropdownRef}>
            <button
              className="model-pill-trigger glass-interactive"
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              title="Select Antigravity Model"
            >
              <Zap size={13} className="model-pill-icon" />
              <span className="model-pill-label">{currentModelObj.name}</span>
              <ChevronDown size={12} />
            </button>

            {isModelDropdownOpen && (
              <div className="model-dropdown-menu glass-panel">
                <div className="dropdown-header">
                  <span>Antigravity Models (1M Context)</span>
                </div>
                {availableModels.map((m) => (
                  <button
                    key={m.id}
                    className={`model-option-item ${selectedModel === m.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedModel(m.id)
                      setIsModelDropdownOpen(false)
                    }}
                  >
                    <div className="model-opt-top">
                      <span className="model-opt-name">{m.name}</span>
                      <span className="model-opt-badge">{m.badge}</span>
                    </div>
                    <p className="model-opt-desc">{m.desc}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live Backend Logs */}
          <button
            className={`header-tool-btn glass-interactive ${showLogsModal ? 'active' : ''}`}
            onClick={() => setShowLogsModal(true)}
            title="View Live Antigravity Python Daemon Logs"
          >
            <Terminal size={14} />
          </button>

          {/* Settings & Quota Drawer Toggle */}
          <button
            className={`header-tool-btn glass-interactive ${showSettingsDrawer ? 'active' : ''}`}
            onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
            title="Antigravity Settings & Google Account"
          >
            <Sliders size={14} />
          </button>

          {/* Clear Chat */}
          <button
            className="header-tool-btn glass-interactive"
            onClick={handleClearChat}
            title="Reset Conversation"
          >
            <Trash2 size={14} />
          </button>

          {onClose && (
            <button className="header-tool-btn glass-interactive close-btn" onClick={onClose} title="Close Pane">
              <X size={14} />
            </button>
          )}
        </div>
      </header>

      {/* Main Studio Body (Split / Settings Drawer) */}
      <div className="studio-body">
        {/* Chat Feed */}
        <div className="chat-viewport">
          {/* Unauthenticated Alert Banner if not logged in */}
          {!session && (
            <div className="auth-alert-banner glass-panel">
              <div className="auth-alert-content">
                <AlertCircle size={18} className="text-amber-400" />
                <div className="auth-alert-text">
                  <strong>Personal Google Account Required</strong>
                  <p>Sign in with your Google account to enable 1M-token context Antigravity generation.</p>
                </div>
              </div>
              <button
                className="google-signin-btn glass-interactive"
                onClick={handleGoogleLogin}
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <RefreshCw size={13} className="spin-anim" />
                ) : (
                  <AntigravityIcon size={14} />
                )}
                <span>{isAuthenticating ? 'Connecting...' : 'Sign In with Google'}</span>
              </button>
            </div>
          )}

          {authError && (
            <div className="auth-error-banner">
              <AlertCircle size={14} />
              <span>{authError}</span>
            </div>
          )}

          {/* Messages List */}
          <div className="messages-stream" ref={messagesContainerRef}>
            {messages.map((msg) => {
              const isUser = msg.role === 'user'
              const isReasoningOpen = expandedReasoning[msg.id] !== false

              return (
                <div key={msg.id} className={`message-row ${isUser ? 'user-row' : 'assistant-row'}`}>
                  <div className="avatar-col">
                    {isUser ? (
                      <div className="user-avatar-bubble">
                        {session?.picture ? (
                          <img src={session.picture} alt="User" className="user-avatar-img" />
                        ) : (
                          <User size={14} />
                        )}
                      </div>
                    ) : (
                      <div className="assistant-avatar-bubble">
                        <AntigravityIcon size={16} />
                      </div>
                    )}
                  </div>

                  <div className="message-content-col">
                    {/* Reasoning Accordion if assistant message has CoT thoughts */}
                    {!isUser && msg.reasoning && (
                      <div className="reasoning-accordion glass-panel">
                        <button
                          className="reasoning-toggle-btn"
                          onClick={() =>
                            setExpandedReasoning((prev) => ({
                              ...prev,
                              [msg.id]: !isReasoningOpen,
                            }))
                          }
                        >
                          {isReasoningOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          <Sparkles size={12} className="reasoning-icon" />
                          <span>Antigravity Reasoning & Context Inspection</span>
                        </button>
                        {isReasoningOpen && (
                          <div className="reasoning-body">
                            <pre>{msg.reasoning}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div className={`message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
                      {renderMessageContent(msg.content, msg.id)}
                      {msg.isStreaming && (
                        <span className="streaming-cursor-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Action Prompt Chips */}
          <div className="quick-prompt-chips">
            <button
              className="quick-chip glass-interactive"
              onClick={() => handleSendMessage('Explain how to optimize this function and improve its runtime complexity.')}
            >
              ⚡ Optimize Complexity
            </button>
            <button
              className="quick-chip glass-interactive"
              onClick={() => handleSendMessage('Refactor the active code with strict TypeScript interfaces and error handling.')}
            >
              🛠️ Strict TS Refactor
            </button>
            <button
              className="quick-chip glass-interactive"
              onClick={() => handleSendMessage('Write comprehensive Vitest unit tests covering edge cases and error handling.')}
            >
              🧪 Generate Unit Tests
            </button>
            <button
              className="quick-chip glass-interactive"
              onClick={() => handleSendMessage('Analyze potential security vulnerabilities and ReDoS risks in this codebase.')}
            >
              🔒 Security & ReDoS Audit
            </button>
          </div>

          {/* Chat Input Console */}
          <div className="chat-input-area glass-panel">
            <div className="input-toolbar-top">
              <button
                className={`context-toggle-chip ${includeFileContext ? 'active' : ''}`}
                onClick={() => setIncludeFileContext(!includeFileContext)}
                title="Include active editor file buffer & selection in prompt"
              >
                <Paperclip size={12} />
                <span>Attach File ({activeFileName})</span>
              </button>

              <span className="token-counter-pill" title="Estimated prompt + context tokens / 1M limit">
                <Zap size={11} className="token-pill-icon" />
                <span>{tokenEstimation.estimatedTokens.toLocaleString()} / 1,048,576 tokens</span>
              </span>

              {session && (
                <span className="account-pill-tag">
                  <span className="status-dot green" />
                  {session.email}
                </span>
              )}
            </div>

            <div className="textarea-row">
              <textarea
                ref={textareaRef}
                className="chat-textarea"
                placeholder={
                  session
                    ? `Ask ${currentModelObj.name} with 1M context... (Shift+Enter for newline)`
                    : 'Sign in with Google above to ask Antigravity...'
                }
                value={inputPrompt}
                onChange={handleTextareaChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                rows={1}
              />

              <div className="input-actions-col">
                {isStreaming ? (
                  <button
                    className="send-btn stop-btn glass-interactive"
                    onClick={handleStopGeneration}
                    title="Stop Generating"
                  >
                    <Square size={14} />
                  </button>
                ) : (
                  <button
                    className="send-btn submit-btn glass-interactive"
                    onClick={() => handleSendMessage()}
                    disabled={!inputPrompt.trim()}
                    title="Send to Antigravity (Enter)"
                  >
                    <Send size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Settings & Account Drawer */}
        {showSettingsDrawer && (
          <aside className="settings-drawer glass-panel">
            <div className="drawer-header">
              <div className="drawer-title">
                <Sliders size={14} />
                <span>Antigravity Settings & Account</span>
              </div>
              <button className="drawer-close-btn" onClick={() => setShowSettingsDrawer(false)}>
                <X size={14} />
              </button>
            </div>

            <div className="drawer-content">
              {/* Account Section */}
              <div className="drawer-section">
                <span className="section-label">Google Account & Subscription</span>
                {session ? (
                  <div className="account-card glass-panel">
                    <div className="account-card-header">
                      {session.picture ? (
                        <img src={session.picture} alt="Avatar" className="drawer-avatar-img" />
                      ) : (
                        <div className="drawer-avatar-placeholder">
                          <User size={18} />
                        </div>
                      )}
                      <div className="account-info">
                        <span className="acc-name">{session.name}</span>
                        <span className="acc-email">{session.email}</span>
                      </div>
                    </div>
                    <div className="subscription-badge">
                      <span className="sub-tag">● Personal Tier Active</span>
                      <span className="sub-type">{session.tokenType.toUpperCase()} Auth</span>
                    </div>
                    <button className="logout-btn glass-interactive" onClick={handleGoogleLogout}>
                      <LogOut size={13} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="unauth-box">
                    <p>No active Google account connected.</p>
                    <button
                      className="google-signin-btn glass-interactive full-width"
                      onClick={handleGoogleLogin}
                      disabled={isAuthenticating}
                    >
                      <AntigravityIcon size={14} />
                      <span>{isAuthenticating ? 'Authorizing in Browser...' : 'Connect Google Account'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Quota Telemetry */}
              {quota && (
                <div className="drawer-section">
                  <span className="section-label">Antigravity Quota Telemetry</span>
                  <div className="quota-grid">
                    <div className="quota-card">
                      <span className="q-label">Context Window</span>
                      <span className="q-val">1,048,576</span>
                      <span className="q-sub">Tokens (1M Context)</span>
                    </div>
                    <div className="quota-card">
                      <span className="q-label">Rate Limit</span>
                      <span className="q-val">{quota.rpmRemaining} / {quota.rpmLimit}</span>
                      <span className="q-sub">RPM Remaining</span>
                    </div>
                    <div className="quota-card">
                      <span className="q-label">Daily Computes</span>
                      <span className="q-val">{quota.dailyComputesRemaining}</span>
                      <span className="q-sub">of {quota.dailyComputesLimit} available</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Generation Controls */}
              <div className="drawer-section">
                <span className="section-label">Generation Parameters</span>
                <div className="param-item">
                  <div className="param-header">
                    <span>Temperature</span>
                    <span className="param-val">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="slider-input"
                  />
                </div>

                <div className="param-item">
                  <div className="param-header">
                    <span>System Prompt</span>
                  </div>
                  <textarea
                    className="sys-prompt-input"
                    rows={3}
                    value={systemInstruction}
                    onChange={(e) => setSystemInstruction(e.target.value)}
                  />
                </div>
              </div>

              {/* Python Sidecar Diagnostics */}
              <div className="drawer-section">
                <span className="section-label">Python Sidecar Diagnostics & Logs</span>
                <div className="diag-list">
                  <div className="diag-row">
                    <span>Daemon Status</span>
                    <span className="status-badge green">Active (Lazy Loaded)</span>
                  </div>
                  <div className="diag-row">
                    <span>Sidecar Port</span>
                    <code>{sidecarStatus?.port || 45281}</code>
                  </div>
                  <div className="diag-row">
                    <span>GenAI SDK Bridge</span>
                    <span>Ready</span>
                  </div>
                  <div className="diag-row logs-drawer-btn-row">
                    <button
                      className="view-logs-drawer-btn glass-interactive full-width"
                      onClick={() => setShowLogsModal(true)}
                    >
                      <Terminal size={13} />
                      <span>View Live Backend Logs</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Live Daemon Logs Modal */}
      {showLogsModal && (
        <div className="logs-modal-overlay" onClick={() => setShowLogsModal(false)}>
          <div className="logs-modal-dialog glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="logs-modal-header">
              <div className="logs-modal-title">
                <Terminal size={16} className="logs-title-icon" />
                <span className="logs-title-text">Antigravity Backend Daemon Logs</span>
                <span className="logs-file-pill" title={logsData.logFile}>
                  {logsData.logFile.replace(/\\/g, '/').split('/').slice(-2).join('/')}
                </span>
              </div>
              <div className="logs-modal-actions">
                <label className="auto-refresh-toggle">
                  <input
                    type="checkbox"
                    checked={autoRefreshLogs}
                    onChange={(e) => setAutoRefreshLogs(e.target.checked)}
                  />
                  <span>Auto-refresh (2.5s)</span>
                </label>
                <button
                  className="logs-action-btn glass-interactive"
                  onClick={handleFetchLogs}
                  disabled={isLoadingLogs}
                  title="Refresh Logs"
                >
                  <RefreshCw size={13} className={isLoadingLogs ? 'spin-anim' : ''} />
                  <span>Refresh</span>
                </button>
                <button
                  className="logs-action-btn glass-interactive"
                  onClick={handleCopyLogs}
                  title="Copy All Logs to Clipboard"
                >
                  {copiedLogs ? <Check size={13} color="#30D158" /> : <Copy size={13} />}
                  <span>{copiedLogs ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  className="logs-close-btn glass-interactive"
                  onClick={() => setShowLogsModal(false)}
                  title="Close Logs"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="logs-modal-content">
              {logsData.logs && logsData.logs.length > 0 ? (
                <div className="logs-terminal-viewport">
                  {logsData.logs.map((line, idx) => {
                    let levelClass = 'log-info'
                    if (line.includes('[ERROR]') || line.includes('Error:') || line.includes('Exception:')) {
                      levelClass = 'log-error'
                    } else if (line.includes('[DEBUG]')) {
                      levelClass = 'log-debug'
                    } else if (line.includes('[SSE]') || line.includes('[STREAM]')) {
                      levelClass = 'log-stream'
                    } else if (line.includes('[AUTH]') || line.includes('[OAUTH]')) {
                      levelClass = 'log-auth'
                    }
                    return (
                      <div key={idx} className={`log-line-item ${levelClass}`}>
                        <span className="log-line-number">{idx + 1}</span>
                        <span className="log-line-text">{line}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="logs-empty-state">
                  <Activity size={24} className="spin-anim" />
                  <span>Waiting for logs or backend initialization...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

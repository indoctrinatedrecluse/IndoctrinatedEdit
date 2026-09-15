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
  Cpu,
  Layers,
  ArrowDownToLine,
  Replace,
} from 'lucide-react'
import {
  AiChatMessage,
  AiModelOption,
  AiProvider,
} from '@sdk/types'
import {
  AiService,
  PRESET_MODELS,
  AiSettingsMap,
} from '../../services/aiService'
import { SelectionInfo } from '../Editor/EditorHost'

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
  const [models, setModels] = useState<AiModelOption[]>(PRESET_MODELS)
  const [selectedModelId, setSelectedModelId] = useState<string>(AiService.getActiveModelId())
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})

  // Chat State
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Hello! I'm your **IndoctrinatedEdit** AI assistant.\n\nI can analyze your code, explain complex algorithms, find security issues, refactor functions, or generate full test suites. Select any code in the editor and click **"Attach Selection"**, or pick from the quick actions below!`,
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

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Auto-scroll when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

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

  // Attach selection automatically if user clicks attach or shortcut
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
  const handleQuickAction = (action: 'explain' | 'bugs' | 'refactor' | 'tests') => {
    let prompt = ''
    if (action === 'explain') {
      prompt = 'Explain the attached code in detail. Break down the architecture, logic, and key data structures.'
    } else if (action === 'bugs') {
      prompt = 'Review the attached code for potential bugs, security vulnerabilities, edge cases, and unexpected side effects.'
    } else if (action === 'refactor') {
      prompt = 'Propose a clean, modern, and high-performance refactored version of this code. Explain your improvements.'
    } else if (action === 'tests') {
      prompt = 'Write a comprehensive suite of unit tests for this code with high coverage and edge case assertions.'
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

    // Automatically expand reasoning while streaming
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
                  <div className="code-lang">
                    <Code2 size={12} />
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
                        className="code-action-btn glass-interactive"
                        onClick={() => onInsertAtCursor(code)}
                        title="Insert at Cursor in Monaco Editor"
                      >
                        <ArrowDownToLine size={11} />
                        <span>Insert</span>
                      </button>
                    )}

                    {onReplaceSelection && currentSelection?.text && (
                      <button
                        className="code-action-btn glass-interactive"
                        onClick={() => onReplaceSelection(code)}
                        title="Replace current selection in Monaco Editor"
                      >
                        <Replace size={11} />
                        <span>Replace</span>
                      </button>
                    )}
                  </div>
                </div>
                <pre className="ai-code-body">
                  <code>{code}</code>
                </pre>
              </div>
            )
          }

          // Format basic markdown bold, italic, inline code, and linebreaks
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
              <Cpu size={12} className="model-icon" />
              <span className="model-name">{selectedModel.name}</span>
              <ChevronDown size={12} />
            </button>

            {isModelDropdownOpen && (
              <div className="model-dropdown-menu glass-panel">
                <div className="dropdown-header">Available Models</div>
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
                          {model.name}
                          {model.supportsReasoning && <span className="cot-badge">CoT</span>}
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
        </div>

        <div className="ai-header-right">
          <button
            className={`icon-btn glass-interactive ${isSettingsOpen ? 'active' : ''}`}
            onClick={() => {
              setIsSettingsOpen(!isSettingsOpen)
              setIsModelDropdownOpen(false)
            }}
            title="Configure API Keys & Endpoints (BYOK / Ollama)"
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

      {/* Settings / API Key Drawer */}
      {isSettingsOpen && (
        <div className="ai-settings-drawer glass-panel">
          <div className="settings-header">
            <div className="settings-title">
              <Key size={13} />
              <span>Model Providers & API Keys</span>
            </div>
            <button className="settings-close" onClick={() => setIsSettingsOpen(false)}>
              <X size={12} />
            </button>
          </div>

          <div className="settings-scroll-list">
            {(['deepseek', 'openai', 'gemini', 'claude', 'ollama', 'antigravity'] as AiProvider[]).map((prov) => {
              const cfg = settings[prov]
              const isOllama = prov === 'ollama'
              const isRevealed = showKey[prov]

              return (
                <div key={prov} className="provider-card glass-subcard">
                  <div className="prov-card-header">
                    <span className="prov-name">{prov.toUpperCase()}</span>
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
                          placeholder={`Enter ${prov} API Key...`}
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
                    <label>{isOllama ? 'Host URL' : 'Endpoint (Optional)'}</label>
                    <input
                      type="text"
                      placeholder={isOllama ? 'http://localhost:11434' : 'Default endpoint'}
                      value={cfg.endpoint || ''}
                      onChange={(e) => handleSaveSettings(prov, 'endpoint', e.target.value)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="ai-messages-container">
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
                {/* Attached code context chip */}
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
                      <div className="reasoning-body">
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
        <div className="quick-actions-row">
          <button
            className={`quick-chip ${currentSelection?.text ? 'highlight' : ''}`}
            onClick={handleAttachSelection}
            title={
              currentSelection?.text
                ? `Attach ${currentSelection.endLine - currentSelection.startLine + 1} lines`
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
            Explain
          </button>
          <button className="quick-chip" onClick={() => handleQuickAction('bugs')}>
            Bugs & Security
          </button>
          <button className="quick-chip" onClick={() => handleQuickAction('refactor')}>
            Refactor
          </button>
          <button className="quick-chip" onClick={() => handleQuickAction('tests')}>
            Tests
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
          width: 380px;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: rgba(10, 14, 26, 0.72);
          backdrop-filter: blur(28px) saturate(200%);
          -webkit-backdrop-filter: blur(28px) saturate(200%);
          border-left: var(--specular-border);
          box-shadow: -8px 0 32px rgba(0, 0, 0, 0.35);
          position: relative;
          z-index: 40;
          overflow: hidden;
        }

        .ai-panel-header {
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          border-bottom: var(--specular-border-subtle);
          background: rgba(255, 255, 255, 0.02);
        }

        .ai-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ai-brand-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          font-size: 12px;
          color: var(--text-primary);
        }

        .sparkle-icon {
          color: var(--accent-primary);
        }

        .model-selector-container {
          position: relative;
        }

        .model-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
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
          width: 260px;
          max-height: 320px;
          overflow-y: auto;
          background: rgba(14, 18, 32, 0.95);
          border: var(--specular-border);
          border-radius: var(--radius-md);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
          z-index: 100;
          padding: 6px;
        }

        .dropdown-header {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          padding: 4px 8px;
          margin-bottom: 4px;
        }

        .model-option {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 8px;
          border-radius: var(--radius-sm);
          background: transparent;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
        }

        .model-option:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .model-option.active {
          background: rgba(0, 240, 255, 0.12);
          border: 1px solid rgba(0, 240, 255, 0.25);
        }

        .model-option-name {
          font-size: 11.5px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cot-badge {
          font-size: 9px;
          padding: 1px 4px;
          background: rgba(139, 92, 246, 0.3);
          border: 1px solid rgba(139, 92, 246, 0.45);
          color: #D8B4FE;
          border-radius: 4px;
        }

        .model-option-desc {
          font-size: 10px;
          color: var(--text-secondary);
          margin-top: 2px;
          line-height: 1.2;
        }

        .check-active {
          color: var(--accent-primary);
        }

        .ai-header-right {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .icon-btn {
          width: 26px;
          height: 26px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .icon-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.08);
        }

        .icon-btn.active {
          background: rgba(0, 240, 255, 0.15);
          color: var(--accent-primary);
        }

        /* Settings Drawer */
        .ai-settings-drawer {
          background: rgba(12, 16, 28, 0.94);
          border-bottom: var(--specular-border);
          padding: 10px 12px;
          max-height: 280px;
          overflow-y: auto;
        }

        .settings-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .settings-title {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .settings-close {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .provider-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: var(--radius-sm);
          padding: 8px;
          margin-bottom: 8px;
        }

        .prov-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .prov-name {
          font-size: 10.5px;
          font-weight: 600;
          color: var(--accent-primary);
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
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
          color: var(--text-muted);
          margin-bottom: 2px;
        }

        .prov-input-row input {
          width: 100%;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 10.5px;
          color: var(--text-primary);
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
          color: var(--text-secondary);
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
          background: var(--accent-primary);
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 10px var(--accent-glow);
        }

        .bot-avatar-badge {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: var(--accent-primary);
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
          border-radius: var(--radius-md);
          font-size: 12px;
          line-height: 1.5;
          word-break: break-word;
        }

        .user-bubble {
          background: rgba(0, 132, 255, 0.22);
          border: 1px solid rgba(0, 132, 255, 0.35);
          color: var(--text-primary);
          border-bottom-right-radius: 2px;
        }

        .assistant-bubble {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
          border-bottom-left-radius: 2px;
        }

        .attached-context-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          background: rgba(0, 240, 255, 0.08);
          border: 1px solid rgba(0, 240, 255, 0.2);
          border-radius: 6px;
          font-size: 10px;
          color: var(--accent-primary);
        }

        .reasoning-card {
          background: rgba(139, 92, 246, 0.08);
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: var(--radius-sm);
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
          color: #D8B4FE;
          cursor: pointer;
          font-size: 10.5px;
        }

        .reasoning-title {
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 500;
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
          color: rgba(235, 235, 245, 0.7);
          line-height: 1.4;
          border-top: 1px solid rgba(139, 92, 246, 0.15);
          font-style: italic;
        }

        .ai-code-block {
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-sm);
          overflow: hidden;
          margin: 6px 0;
        }

        .ai-code-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 10.5px;
          color: var(--text-secondary);
        }

        .code-lang {
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-mono);
          text-transform: uppercase;
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
          color: var(--text-secondary);
          font-size: 9.5px;
          padding: 2px 6px;
          border-radius: 4px;
          cursor: pointer;
        }

        .code-action-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.12);
        }

        .ai-code-body {
          padding: 8px;
          margin: 0;
          font-family: var(--font-mono);
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
          border-top: var(--specular-border-subtle);
          background: rgba(10, 14, 26, 0.85);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .attachment-active-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 8px;
          background: rgba(0, 240, 255, 0.1);
          border: 1px solid rgba(0, 240, 255, 0.28);
          border-radius: var(--radius-sm);
          font-size: 11px;
          color: var(--text-primary);
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
          font-weight: 500;
          color: var(--accent-primary);
        }

        .attach-meta {
          color: var(--text-secondary);
          font-size: 10px;
        }

        .remove-attach-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
        }

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
          padding: 3px 7px;
          border-radius: 999px;
          font-size: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }

        .quick-chip:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.1);
        }

        .quick-chip.highlight {
          background: rgba(0, 240, 255, 0.15);
          border-color: rgba(0, 240, 255, 0.4);
          color: #64D2FF;
          font-weight: 500;
        }

        .input-box-container {
          position: relative;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: var(--radius-md);
          padding: 6px 36px 6px 8px;
        }

        .ai-textarea {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-primary);
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
          background: var(--accent-primary);
          color: #fff;
          box-shadow: 0 0 10px var(--accent-glow);
        }

        .action-send-btn.send:disabled {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.2);
          box-shadow: none;
          cursor: not-allowed;
        }

        .action-send-btn.stop {
          background: #FF453A;
          color: #fff;
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

import React, { useState, useEffect, useRef } from 'react'
import {
  Terminal as TerminalIcon,
  Plus,
  Trash2,
  Columns2,
  X,
  ChevronDown,
  Settings,
  CornerDownLeft,
  Gamepad2,
} from 'lucide-react'
import { terminalService, TerminalTab, AnsiToken } from '../../services/terminalService'
import { ShellProfile } from '../../../electron/preload'

interface TerminalViewProps {
  onOpenConfig?: () => void
  workspacePath?: string
}

export const TerminalView: React.FC<TerminalViewProps> = ({ onOpenConfig, workspacePath }) => {
  const [tabs, setTabs] = useState<TerminalTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<ShellProfile[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [splitTabId, setSplitTabId] = useState<string | null>(null)
  const [isTuiMode, setIsTuiMode] = useState<boolean>(false)

  const viewportRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const scrollToBottom = (tabId: string) => {
    const viewport = viewportRefs.current[tabId]
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight
    }
  }

  // Initialize terminal subsystem on mount
  useEffect(() => {
    let isMounted = true

    const init = async () => {
      const detected = await terminalService.initialize()
      if (!isMounted) return
      setProfiles(detected)

      const existingTabs = terminalService.getTabs()
      if (existingTabs.length === 0) {
        const initialTab = await terminalService.createTab({ cwd: workspacePath })
        if (!isMounted) return
        setTabs(terminalService.getTabs())
        setActiveTabId(initialTab.id)
      } else {
        setTabs(existingTabs)
        setActiveTabId(terminalService.getActiveTab()?.id || existingTabs[0].id)
      }
    }

    init()

    return () => {
      isMounted = false
    }
  }, [workspacePath])

  // Subscribe to live terminal output streaming
  useEffect(() => {
    const activeTab = terminalService.getActiveTab()
    if (!activeTab) return

    const unsubscribe = terminalService.onData(activeTab.id, () => {
      setTabs([...terminalService.getTabs()])
      // Auto-scroll directly within viewport without touching window scroll
      requestAnimationFrame(() => {
        scrollToBottom(activeTab.id)
      })
    })

    return () => {
      unsubscribe()
    }
  }, [activeTabId])

  const handleCreateNewTab = async (shellId?: string) => {
    setIsDropdownOpen(false)
    const newTab = await terminalService.createTab({ shellId, cwd: workspacePath })
    setTabs(terminalService.getTabs())
    setActiveTabId(newTab.id)
    setTimeout(() => {
      inputRefs.current[newTab.id]?.focus({ preventScroll: true })
      scrollToBottom(newTab.id)
    }, 50)
  }

  const handleCloseTab = async (tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (splitTabId === tabId) {
      setSplitTabId(null)
    }
    await terminalService.closeTab(tabId)
    const remaining = terminalService.getTabs()
    setTabs(remaining)
    setActiveTabId(terminalService.getActiveTab()?.id || (remaining[0]?.id ?? null))
  }

  const handleClear = (tabId: string) => {
    terminalService.clearBuffer(tabId)
    setTabs([...terminalService.getTabs()])
  }

  const handleToggleSplit = async () => {
    if (splitTabId) {
      setSplitTabId(null)
    } else {
      const activeTab = terminalService.getActiveTab()
      if (!activeTab) return
      const newSplitTab = await terminalService.createTab({
        shellId: activeTab.shellId,
        cwd: workspacePath,
        splitWith: activeTab.id,
      })
      setTabs(terminalService.getTabs())
      setSplitTabId(newSplitTab.id)
    }
  }

  const handleCommandSubmit = async (tabId: string) => {
    const raw = inputValues[tabId] || ''
    if (!raw.trim()) return

    // Save to command history
    setHistory((prev) => [...prev, raw])
    setHistoryIndex(-1)

    // Clear input
    setInputValues((prev) => ({ ...prev, [tabId]: '' }))

    // Execute through service
    await terminalService.write(tabId, `${raw}\r\n`)
    setTabs([...terminalService.getTabs()])

    // Auto-scroll inside container
    requestAnimationFrame(() => {
      scrollToBottom(tabId)
    })
  }

  // Sync TUI mode when active tab has active TUI process
  useEffect(() => {
    const active = tabs.find((t) => t.id === activeTabId) || terminalService.getActiveTab()
    if (active?.isTuiActive) {
      setIsTuiMode(true)
    }
  }, [tabs, activeTabId])

  const handleSendTuiAction = async (tabId: string, action: string) => {
    await terminalService.sendTuiKey(tabId, action)
    setTabs([...terminalService.getTabs()])
    requestAnimationFrame(() => {
      scrollToBottom(tabId)
    })
  }

  const handleViewportKeyDown = (tabId: string, e: React.KeyboardEvent<HTMLDivElement>) => {
    const tuiActive = isTuiMode || terminalService.isTuiActive(tabId)
    if (tuiActive) {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'up')
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'down')
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'left')
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'right')
      } else if (e.key === 'PageUp') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'pageup')
      } else if (e.key === 'PageDown') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'pagedown')
      } else if (e.key === 'Home') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'home')
      } else if (e.key === 'End') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'end')
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'enter')
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'escape')
      } else if (e.key === 'Tab') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'tab')
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'backspace')
      } else if (e.key === 'Delete') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'delete')
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'space')
      } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'ctrl-c')
      } else if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'ctrl-d')
      } else if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'ctrl-z')
      } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'ctrl-l')
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        handleSendTuiAction(tabId, e.key)
      }
    }
  }

  const handleKeyDown = (tabId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    const tuiActive = isTuiMode || terminalService.isTuiActive(tabId)
    if (tuiActive) {
      // In TUI mode, single-key commands, arrows, Esc, Enter immediately forward to TUI
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape', 'Tab', 'PageUp', 'PageDown', 'Home', 'End', 'Backspace', 'Delete'].includes(e.key)) {
        e.preventDefault()
        const map: Record<string, string> = {
          ArrowUp: 'up',
          ArrowDown: 'down',
          ArrowLeft: 'left',
          ArrowRight: 'right',
          Escape: 'escape',
          Tab: 'tab',
          PageUp: 'pageup',
          PageDown: 'pagedown',
          Home: 'home',
          End: 'end',
          Backspace: 'backspace',
          Delete: 'delete',
        }
        handleSendTuiAction(tabId, map[e.key] || e.key)
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        if (!inputValues[tabId]) {
          handleSendTuiAction(tabId, 'enter')
        } else {
          handleCommandSubmit(tabId)
        }
        return
      }

      if (e.key === ' ' || e.code === 'Space') {
        if (!inputValues[tabId]) {
          e.preventDefault()
          handleSendTuiAction(tabId, 'space')
          return
        }
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'ctrl-c')
        setInputValues((prev) => ({ ...prev, [tabId]: '' }))
        return
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'ctrl-d')
        return
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        handleSendTuiAction(tabId, 'ctrl-z')
        return
      }

      // Forward single-letter keys (w, a, s, d, q, r, c, m, n, p, k, etc.) immediately if input has no multichar command
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (!inputValues[tabId] || inputValues[tabId].length === 0) {
          e.preventDefault()
          handleSendTuiAction(tabId, e.key)
          setInputValues((prev) => ({ ...prev, [tabId]: '' }))
          return
        }
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      handleCommandSubmit(tabId)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0) {
        const nextIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1)
        setHistoryIndex(nextIndex)
        setInputValues((prev) => ({ ...prev, [tabId]: history[nextIndex] }))
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex >= 0) {
        const nextIndex = historyIndex + 1
        if (nextIndex < history.length) {
          setHistoryIndex(nextIndex)
          setInputValues((prev) => ({ ...prev, [tabId]: history[nextIndex] }))
        } else {
          setHistoryIndex(-1)
          setInputValues((prev) => ({ ...prev, [tabId]: '' }))
        }
      }
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault()
      handleClear(tabId)
    } else if (e.ctrlKey && e.key === 'c') {
      terminalService.write(tabId, '\x03') // Send SIGINT
      setInputValues((prev) => ({ ...prev, [tabId]: '' }))
    }
  }

  const getShellIcon = (iconType: string) => {
    switch (iconType) {
      case 'powershell':
        return <span className="shell-tag ps">PS</span>
      case 'git':
        return <span className="shell-tag git">GIT</span>
      case 'cygwin':
        return <span className="shell-tag cyg">CYG</span>
      case 'wsl':
        return <span className="shell-tag wsl">WSL</span>
      case 'cmd':
        return <span className="shell-tag cmd">CMD</span>
      default:
        return <TerminalIcon size={12} className="shell-tag default" />
    }
  }

  const renderTerminalPane = (tab: TerminalTab) => {
    const tuiActive = isTuiMode || terminalService.isTuiActive(tab.id)
    return (
      <div key={tab.id} className="terminal-pane">
        {/* Terminal Output Area */}
        <div
          ref={(el) => {
            viewportRefs.current[tab.id] = el
          }}
          tabIndex={0}
          className={`terminal-output-viewport ${tuiActive ? 'tui-active-viewport' : ''}`}
          onKeyDown={(e) => handleViewportKeyDown(tab.id, e)}
          onClick={() => {
            if (tuiActive) {
              viewportRefs.current[tab.id]?.focus({ preventScroll: true })
            } else {
              inputRefs.current[tab.id]?.focus({ preventScroll: true })
            }
          }}
        >
          {tab.buffer.map((line, idx) => {
            const tokens: AnsiToken[] = terminalService.parseAnsi(line)
            return (
              <div key={idx} className="terminal-output-line">
                {tokens.map((token, tIdx) => (
                  <span
                    key={tIdx}
                    style={{
                      color: token.color,
                      backgroundColor: token.bg,
                      fontWeight: token.bold ? 700 : undefined,
                      fontStyle: token.italic ? 'italic' : undefined,
                      textDecoration: token.underline ? 'underline' : undefined,
                    }}
                  >
                    {token.text}
                  </span>
                ))}
              </div>
            )
          })}
        </div>

        {/* TUI Interactive On-Screen Quick Control Pad (shown strictly when TUI mode is ON or alternate screen buffer is active) */}
        {tuiActive && (
          <div className="tui-keypad-toolbar">
            {/* D-Pad Arrows */}
            <div className="keypad-group d-pad">
              <button
                type="button"
                className="tui-key-btn"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'up') }}
                title="Send Up Arrow (↑)"
              >▲</button>
              <button
                type="button"
                className="tui-key-btn"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'down') }}
                title="Send Down Arrow (↓)"
              >▼</button>
              <button
                type="button"
                className="tui-key-btn"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'left') }}
                title="Send Left Arrow (←)"
              >◄</button>
              <button
                type="button"
                className="tui-key-btn"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'right') }}
                title="Send Right Arrow (→)"
              >►</button>
            </div>

            {/* Navigation keys */}
            <div className="keypad-group nav-group">
              <button
                type="button"
                className="tui-key-btn nav-key"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'pgup') }}
                title="Send Page Up"
              >PgUp</button>
              <button
                type="button"
                className="tui-key-btn nav-key"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'pgdn') }}
                title="Send Page Down"
              >PgDn</button>
              <button
                type="button"
                className="tui-key-btn nav-key"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'home') }}
                title="Send Home"
              >Home</button>
              <button
                type="button"
                className="tui-key-btn nav-key"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'end') }}
                title="Send End"
              >End</button>
            </div>

            {/* WASD Gaming/Vim-style nav */}
            <div className="keypad-group wasd-group">
              <button
                type="button"
                className="tui-key-btn letter-key"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'w') }}
                title="Send 'W'"
              >W</button>
              <button
                type="button"
                className="tui-key-btn letter-key"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'a') }}
                title="Send 'A'"
              >A</button>
              <button
                type="button"
                className="tui-key-btn letter-key"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 's') }}
                title="Send 'S'"
              >S</button>
              <button
                type="button"
                className="tui-key-btn letter-key"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'd') }}
                title="Send 'D'"
              >D</button>
            </div>

            {/* Common TUI App Controls (pmon / nettop / dual / fm) */}
            <div className="keypad-group tui-app-controls">
              <button
                type="button"
                className="tui-key-btn"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'c') }}
                title="Send 'C' (Sort CPU)"
              >C (CPU)</button>
              <button
                type="button"
                className="tui-key-btn"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'm') }}
                title="Send 'M' (Sort Mem)"
              >M (Mem)</button>
              <button
                type="button"
                className="tui-key-btn"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'n') }}
                title="Send 'N' (Sort Name)"
              >N (Name)</button>
              <button
                type="button"
                className="tui-key-btn"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'p') }}
                title="Send 'P' (Sort PID)"
              >P (PID)</button>
              <button
                type="button"
                className="tui-key-btn"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'k') }}
                title="Send 'K' (Kill Process)"
              >K (Kill)</button>
              <button
                type="button"
                className="tui-key-btn"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'y') }}
                title="Send 'Y' (Confirm / Yes)"
              >Y</button>
            </div>

            {/* Action / Selector / Control Keys */}
            <div className="keypad-group actions-group">
              <button
                type="button"
                className="tui-key-btn action-key primary"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'enter') }}
                title="Send Enter (↵)"
              >Enter ↵</button>
              <button
                type="button"
                className="tui-key-btn action-key space-key"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'space') }}
                title="Send Space (␣)"
              >Space ␣</button>
              <button
                type="button"
                className="tui-key-btn action-key"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'escape') }}
                title="Send Escape (ESC)"
              >Esc</button>
              <button
                type="button"
                className="tui-key-btn action-key"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'tab') }}
                title="Send Tab (⇥)"
              >Tab ⇥</button>
              <button
                type="button"
                className="tui-key-btn action-key"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'backspace') }}
                title="Send Backspace (⌫)"
              >Bksp ⌫</button>
              <button
                type="button"
                className="tui-key-btn action-key"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'r') }}
                title="Send 'R' (Refresh / Redraw)"
              >R</button>
              <button
                type="button"
                className="tui-key-btn action-key quit-key"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'q') }}
                title="Send 'q' to Quit TUI"
              >Q (Quit)</button>
              <button
                type="button"
                className="tui-key-btn action-key ctrl-c-key"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(tab.id, 'ctrl-c') }}
                title="Send SIGINT (Ctrl+C)"
              >Ctrl+C 🛑</button>
            </div>
          </div>
        )}

        {/* Input Prompt Row */}
        <div className="terminal-prompt-bar">
          <span className="prompt-arrow">{tuiActive ? '🎮' : '❯'}</span>
          <input
            ref={(el) => {
              inputRefs.current[tab.id] = el
            }}
            type="text"
            className="terminal-input"
            value={inputValues[tab.id] || ''}
            onChange={(e) => setInputValues({ ...inputValues, [tab.id]: e.target.value })}
            onKeyDown={(e) => handleKeyDown(tab.id, e)}
            placeholder={tuiActive ? "TUI Live Raw Key Mode (Type / Click keys to navigate)..." : `Execute command in ${tab.title} (e.g. ir help, ir pmon)...`}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
          />
          <button
            className="prompt-exec-btn glass-interactive"
            onClick={() => handleCommandSubmit(tab.id)}
            title="Execute Command (Enter)"
          >
            <CornerDownLeft size={12} />
          </button>
        </div>
      </div>
    )
  }

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0]
  const splitTab = splitTabId ? tabs.find((t) => t.id === splitTabId) : null

  return (
    <div className="terminal-subsystem-root">
      {/* Top Controls & Tab Header */}
      <div className="terminal-header-bar">
        {/* Tab List */}
        <div className="terminal-tabs-strip">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId || tab.id === splitTabId
            return (
              <div
                key={tab.id}
                className={`terminal-tab-chip glass-interactive ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveTabId(tab.id)
                  terminalService.setActiveTab(tab.id)
                }}
              >
                {getShellIcon(tab.icon)}
                <span className="tab-title">{tab.title}</span>
                {tabs.length > 1 && (
                  <button
                    className="tab-close-btn"
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    title="Close Terminal"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Action Controls */}
        <div className="terminal-action-controls">
          {/* Quick-Launch Dropdown */}
          <div className="launch-dropdown-wrapper">
            <button
              className="term-icon-btn plus-btn glass-interactive"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              title="New Terminal Profile"
            >
              <Plus size={13} />
              <ChevronDown size={10} />
            </button>

            {isDropdownOpen && (
              <div className="shell-picker-menu glass-panel">
                <div className="picker-header">SELECT SHELL ENVIRONMENT</div>
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    className="picker-item glass-interactive"
                    onClick={() => handleCreateNewTab(p.id)}
                  >
                    {getShellIcon(p.icon)}
                    <div className="picker-info">
                      <span className="picker-name">{p.name}</span>
                      <span className="picker-path">{p.path}</span>
                    </div>
                    {p.isDefault && <span className="picker-badge">Default</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TUI / CLI Graphical Mode Toggle */}
          <button
            className={`term-icon-btn tui-toggle-btn glass-interactive ${isTuiMode ? 'active-tui' : ''}`}
            onClick={() => setIsTuiMode((prev) => !prev)}
            title={isTuiMode ? "TUI Live Raw Key Mode Enabled (Arrows, WASD, single keys forward directly)" : "Enable TUI / CLI GUI Raw Key Navigation"}
          >
            <Gamepad2 size={13} />
            <span className="tui-btn-label">TUI</span>
          </button>

          {/* Split View Toggle */}
          <button
            className={`term-icon-btn glass-interactive ${splitTabId ? 'active-split' : ''}`}
            onClick={handleToggleSplit}
            title="Split Terminal Panes (Ctrl+Shift+5)"
          >
            <Columns2 size={13} />
          </button>

          {/* Clear Buffer */}
          {activeTab && (
            <button
              className="term-icon-btn glass-interactive"
              onClick={() => handleClear(activeTab.id)}
              title="Clear Terminal Output (Ctrl+L)"
            >
              <Trash2 size={13} />
            </button>
          )}

          {/* Configuration Settings */}
          {onOpenConfig && (
            <button
              className="term-icon-btn glass-interactive"
              onClick={onOpenConfig}
              title="Configure Terminal (JSON)"
            >
              <Settings size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Viewport / Split Area */}
      <div className={`terminal-viewport-container ${splitTab ? 'split-active' : ''}`}>
        {activeTab ? renderTerminalPane(activeTab) : (
          <div className="terminal-empty-state">
            <TerminalIcon size={32} className="empty-icon" />
            <span>No active terminal sessions</span>
            <button className="create-first-btn glass-interactive" onClick={() => handleCreateNewTab()}>
              <Plus size={13} /> Launch Default Terminal
            </button>
          </div>
        )}
        {splitTab && renderTerminalPane(splitTab)}
      </div>

      <style>{`
        .terminal-subsystem-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(10, 14, 24, 0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          overflow: hidden;
          font-family: var(--font-mono);
          position: relative;
        }

        .terminal-header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
          gap: 12px;
          flex-shrink: 0;
        }

        .terminal-tabs-strip {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .terminal-tabs-strip::-webkit-scrollbar {
          display: none;
        }

        .terminal-tab-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 3px 8px;
          border-radius: var(--radius-sm);
          font-size: 11.5px;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.07);
          cursor: pointer;
          white-space: nowrap;
          transition: all var(--transition-fast);
        }

        .terminal-tab-chip:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
        }

        .terminal-tab-chip.active {
          background: rgba(0, 122, 255, 0.18);
          border-color: rgba(0, 122, 255, 0.35);
          color: #FFF;
          box-shadow: 0 0 10px rgba(0, 122, 255, 0.25);
        }

        .tab-close-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 1px;
          display: flex;
          align-items: center;
          border-radius: 3px;
        }

        .tab-close-btn:hover {
          background: rgba(255, 69, 58, 0.25);
          color: #FF453A;
        }

        .shell-tag {
          font-size: 8.5px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 3px;
          letter-spacing: 0.3px;
        }

        .shell-tag.ps {
          background: rgba(10, 132, 255, 0.2);
          color: #64D2FF;
          border: 1px solid rgba(10, 132, 255, 0.35);
        }

        .shell-tag.git {
          background: rgba(240, 80, 50, 0.2);
          color: #FF6B4A;
          border: 1px solid rgba(240, 80, 50, 0.35);
        }

        .shell-tag.cyg {
          background: rgba(48, 209, 88, 0.2);
          color: #30D158;
          border: 1px solid rgba(48, 209, 88, 0.35);
        }

        .shell-tag.wsl {
          background: rgba(191, 90, 242, 0.2);
          color: #BF5AF2;
          border: 1px solid rgba(191, 90, 242, 0.35);
        }

        .shell-tag.cmd {
          background: rgba(255, 214, 10, 0.2);
          color: #FFD60A;
          border: 1px solid rgba(255, 214, 10, 0.35);
        }

        .terminal-action-controls {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .term-icon-btn {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .term-icon-btn.plus-btn {
          width: 36px;
          gap: 2px;
        }

        .term-icon-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: var(--text-primary);
        }

        .term-icon-btn.active-split {
          background: rgba(0, 122, 255, 0.25);
          border-color: rgba(0, 122, 255, 0.45);
          color: #64D2FF;
        }

        .term-icon-btn.tui-toggle-btn {
          width: 52px;
          gap: 4px;
          padding: 0 6px;
        }

        .term-icon-btn.tui-toggle-btn .tui-btn-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .term-icon-btn.tui-toggle-btn.active-tui {
          background: rgba(48, 209, 88, 0.22);
          border-color: rgba(48, 209, 88, 0.5);
          color: #30D158;
          box-shadow: 0 0 10px rgba(48, 209, 88, 0.35);
        }

        .launch-dropdown-wrapper {
          position: relative;
        }

        .shell-picker-menu {
          position: absolute;
          top: 32px;
          right: 0;
          width: 280px;
          background: rgba(14, 18, 30, 0.95);
          border-radius: var(--radius-md);
          border: var(--specular-border);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7);
          padding: 6px;
          z-index: 100;
          backdrop-filter: blur(24px);
        }

        .picker-header {
          font-size: 9.5px;
          font-weight: 700;
          color: var(--text-muted);
          padding: 6px 8px;
          letter-spacing: 0.5px;
        }

        .picker-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .picker-item:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .picker-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
        }

        .picker-name {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .picker-path {
          font-size: 9.5px;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .picker-badge {
          font-size: 9px;
          padding: 1px 4px;
          border-radius: 3px;
          background: rgba(48, 209, 88, 0.15);
          color: #30D158;
          border: 1px solid rgba(48, 209, 88, 0.3);
        }

        .terminal-viewport-container {
          display: flex;
          flex: 1;
          height: 100%;
          overflow: hidden;
        }

        .terminal-viewport-container.split-active .terminal-pane {
          flex: 1;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
        }

        .terminal-viewport-container.split-active .terminal-pane:last-child {
          border-right: none;
        }

        .terminal-pane {
          display: flex;
          flex-direction: column;
          flex: 1;
          height: 100%;
          overflow: hidden;
        }

        .terminal-output-viewport {
          flex: 1;
          padding: 10px 14px;
          overflow-y: auto;
          font-size: 12.5px;
          line-height: 1.45;
          color: #E6EDF3;
          user-select: text;
          scrollbar-width: thin;
          outline: none;
        }

        .terminal-output-viewport.tui-active-viewport:focus {
          box-shadow: inset 0 0 0 1px rgba(48, 209, 88, 0.4);
        }

        .tui-keypad-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 4px 12px;
          background: rgba(0, 0, 0, 0.4);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
        }

        .keypad-group {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .tui-key-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-primary);
          padding: 2px 7px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.12s ease;
          user-select: none;
          white-space: nowrap;
        }

        .tui-key-btn:hover {
          background: rgba(255, 255, 255, 0.14);
          border-color: rgba(255, 255, 255, 0.25);
          transform: translateY(-1px);
        }

        .tui-key-btn:active {
          transform: translateY(1px);
          background: rgba(48, 209, 88, 0.25);
        }

        .tui-key-btn.action-key.primary {
          background: rgba(48, 209, 88, 0.18);
          border-color: rgba(48, 209, 88, 0.4);
          color: #30D158;
        }

        .tui-key-btn.action-key.quit-key {
          background: rgba(255, 214, 10, 0.15);
          border-color: rgba(255, 214, 10, 0.35);
          color: #FFD60A;
        }

        .tui-key-btn.action-key.ctrl-c-key {
          background: rgba(255, 69, 58, 0.15);
          border-color: rgba(255, 69, 58, 0.35);
          color: #FF453A;
        }

        .terminal-output-line {
          white-space: pre-wrap;
          word-break: break-all;
        }

        .terminal-prompt-bar {
          display: flex;
          align-items: center;
          padding: 6px 12px;
          background: rgba(0, 0, 0, 0.25);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          gap: 8px;
        }

        .prompt-arrow {
          color: #30D158;
          font-weight: 800;
          font-size: 13px;
        }

        .terminal-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #FFF;
          font-family: inherit;
          font-size: 12.5px;
        }

        .prompt-exec-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          width: 22px;
          height: 22px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .prompt-exec-btn:hover {
          background: rgba(0, 122, 255, 0.3);
          color: #FFF;
        }

        .terminal-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          gap: 12px;
          color: var(--text-muted);
          font-size: 12.5px;
        }

        .create-first-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          background: rgba(0, 122, 255, 0.2);
          border: 1px solid rgba(0, 122, 255, 0.35);
          color: #FFF;
          cursor: pointer;
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}

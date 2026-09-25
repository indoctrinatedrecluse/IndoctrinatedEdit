import React, { useState, useEffect, useRef } from 'react'
import {
  Terminal as TerminalIcon,
  Plus,
  Trash2,
  Columns2,
  X,
  ChevronDown,
  Settings,
  Gamepad2,
  Power,
  ExternalLink,
} from 'lucide-react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { terminalService, TerminalTab } from '../../services/terminalService'
import { ShellProfile } from '../../../electron/preload'

interface TerminalViewProps {
  onOpenConfig?: () => void
  workspacePath?: string
}

interface XTermPaneProps {
  tab: TerminalTab
  isActive: boolean
  fontSize?: number
  fontFamily?: string
  onTermReady?: (tabId: string, term: Terminal) => void
}

const XTermPane: React.FC<XTermPaneProps> = ({ tab, isActive, fontSize = 13, fontFamily, onTermReady }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize,
      fontFamily:
        fontFamily || "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
      theme: {
        background: 'rgba(10, 14, 24, 0.4)',
        foreground: '#F5F5F7',
        cursor: '#0A84FF',
        cursorAccent: '#000000',
        selectionBackground: 'rgba(10, 132, 255, 0.35)',
        black: '#1e222d',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#64d2ff',
        magenta: '#bf5af2',
        cyan: '#8be9fd',
        white: '#f5f5f7',
        brightBlack: '#6272a4',
        brightRed: '#ff6e6e',
        brightGreen: '#69ff94',
        brightYellow: '#ffffa5',
        brightBlue: '#7bd5ff',
        brightMagenta: '#d6acff',
        brightCyan: '#a4ffff',
        brightWhite: '#ffffff',
      },
      allowTransparency: true,
      scrollback: 5000,
      convertEol: true,
      windowsPty: {
        backend: 'conpty',
        buildNumber: 22000,
      },
    })

    // Prevent browser focus trap on Tab while allowing xterm to handle Tab and all terminal keys natively
    term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault()
        return true
      }
      return true
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    term.open(containerRef.current)
    fitAddon.fit()

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    if (onTermReady) {
      onTermReady(tab.id, term)
    }

    // Write any stream buffer received before component mount
    const initialBuffer = terminalService.getRawBuffer(tab.id)
    if (initialBuffer) {
      term.write(initialBuffer)
    }

    // Initial resize sync
    terminalService.resize(tab.id, term.cols, term.rows)

    // Forward user keypresses to backend
    const dataDisposable = term.onData((data) => {
      terminalService.write(tab.id, data)
    })

    // Subscribe to incoming stream from backend
    const unsubscribeBackend = terminalService.onData(tab.id, (chunk) => {
      term.write(chunk)
    })

    // Auto-fit on viewport resize
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit()
        terminalService.resize(tab.id, term.cols, term.rows)
      } catch {}
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      dataDisposable.dispose()
      unsubscribeBackend()
      term.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
    }
  }, [tab.id, fontSize, fontFamily])

  useEffect(() => {
    if (isActive && xtermRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit()
          if (xtermRef.current) {
            terminalService.resize(tab.id, xtermRef.current.cols, xtermRef.current.rows)
            xtermRef.current.focus()
          }
        } catch {}
      }, 50)
    }
  }, [isActive, tab.id])

  return (
    <div
      ref={containerRef}
      className="xterm-viewport-wrapper"
      onClick={() => xtermRef.current?.focus()}
    />
  )
}

export const TerminalView: React.FC<TerminalViewProps> = ({ onOpenConfig, workspacePath }) => {
  const [tabs, setTabs] = useState<TerminalTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<ShellProfile[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [splitTabId, setSplitTabId] = useState<string | null>(null)
  const [isTuiMode, setIsTuiMode] = useState<boolean>(false)

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

  const handleCreateNewTab = async (shellId?: string) => {
    setIsDropdownOpen(false)
    const newTab = await terminalService.createTab({ shellId, cwd: workspacePath })
    setTabs(terminalService.getTabs())
    setActiveTabId(newTab.id)
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
    // Send clear sequence to terminal
    terminalService.write(tabId, '\x0c')
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

  const terminalInstancesRef = useRef<Map<string, Terminal>>(new Map())

  const handleTermReady = (tabId: string, term: Terminal) => {
    terminalInstancesRef.current.set(tabId, term)
  }

  const handleSendTuiAction = async (tabId: string, action: string) => {
    await terminalService.sendTuiKey(tabId, action)
    const term = terminalInstancesRef.current.get(tabId)
    term?.focus()
  }

  const handleOpenExternal = async (shellId?: string) => {
    await terminalService.openExternal(shellId, workspacePath)
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
            title={
              isTuiMode
                ? 'TUI Live Control Pad Enabled (Click on-screen controls to navigate TUIs)'
                : 'Enable TUI On-Screen Navigation Controls'
            }
          >
            <Gamepad2 size={13} />
            <span className="tui-btn-label">TUI</span>
          </button>

          {/* Open in System Terminal (Native OS Window) */}
          <button
            className="term-icon-btn glass-interactive"
            onClick={() => handleOpenExternal(activeTab?.shellId)}
            title="Open in System Terminal (Native OS Window with Full ConPTY)"
          >
            <ExternalLink size={13} />
          </button>

          {/* Split View Toggle */}
          <button
            className={`term-icon-btn glass-interactive ${splitTabId ? 'active-split' : ''}`}
            onClick={handleToggleSplit}
            title="Split Terminal Panes"
          >
            <Columns2 size={13} />
          </button>

          {/* Clear Output */}
          {activeTab && (
            <button
              className="term-icon-btn glass-interactive"
              onClick={() => handleClear(activeTab.id)}
              title="Clear Terminal Output (Ctrl+L)"
            >
              <Trash2 size={13} />
            </button>
          )}

          {/* Kill Active Terminal Session */}
          {activeTab && (
            <button
              className="term-icon-btn kill-btn glass-interactive"
              onClick={(e) => handleCloseTab(activeTab.id, e)}
              title="Kill Terminal Process"
            >
              <Power size={13} />
            </button>
          )}

          {/* Configuration Settings */}
          {onOpenConfig && (
            <button
              className="term-icon-btn glass-interactive"
              onClick={onOpenConfig}
              title="Configure Terminal"
            >
              <Settings size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Viewport / Split Area */}
      <div className={`terminal-viewport-container ${splitTab ? 'split-active' : ''}`}>
        {activeTab ? (
          <div className="terminal-pane">
            <XTermPane tab={activeTab} isActive={true} onTermReady={handleTermReady} />
            {/* TUI Interactive On-Screen Quick Control Pad */}
            {isTuiMode && (
              <div className="tui-keypad-toolbar">
                {/* D-Pad Arrows */}
                <div className="keypad-group d-pad">
                  <button
                    type="button"
                    className="tui-key-btn"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'up') }}
                    title="Send Up Arrow (↑)"
                  >▲</button>
                  <button
                    type="button"
                    className="tui-key-btn"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'down') }}
                    title="Send Down Arrow (↓)"
                  >▼</button>
                  <button
                    type="button"
                    className="tui-key-btn"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'left') }}
                    title="Send Left Arrow (←)"
                  >◄</button>
                  <button
                    type="button"
                    className="tui-key-btn"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'right') }}
                    title="Send Right Arrow (→)"
                  >►</button>
                </div>

                {/* Navigation keys */}
                <div className="keypad-group nav-group">
                  <button
                    type="button"
                    className="tui-key-btn nav-key"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'pgup') }}
                    title="Send Page Up"
                  >PgUp</button>
                  <button
                    type="button"
                    className="tui-key-btn nav-key"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'pgdn') }}
                    title="Send Page Down"
                  >PgDn</button>
                  <button
                    type="button"
                    className="tui-key-btn nav-key"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'home') }}
                    title="Send Home"
                  >Home</button>
                  <button
                    type="button"
                    className="tui-key-btn nav-key"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'end') }}
                    title="Send End"
                  >End</button>
                </div>

                {/* WASD Gaming/Vim-style nav */}
                <div className="keypad-group wasd-group">
                  <button
                    type="button"
                    className="tui-key-btn letter-key"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'w') }}
                    title="Send 'W'"
                  >W</button>
                  <button
                    type="button"
                    className="tui-key-btn letter-key"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'a') }}
                    title="Send 'A'"
                  >A</button>
                  <button
                    type="button"
                    className="tui-key-btn letter-key"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 's') }}
                    title="Send 'S'"
                  >S</button>
                  <button
                    type="button"
                    className="tui-key-btn letter-key"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'd') }}
                    title="Send 'D'"
                  >D</button>
                </div>

                {/* Common TUI App Controls */}
                <div className="keypad-group tui-app-controls">
                  <button
                    type="button"
                    className="tui-key-btn"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'c') }}
                    title="Send 'C' (Sort CPU)"
                  >C (CPU)</button>
                  <button
                    type="button"
                    className="tui-key-btn"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'm') }}
                    title="Send 'M' (Sort Mem)"
                  >M (Mem)</button>
                  <button
                    type="button"
                    className="tui-key-btn"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'n') }}
                    title="Send 'N' (Sort Name)"
                  >N (Name)</button>
                  <button
                    type="button"
                    className="tui-key-btn"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'p') }}
                    title="Send 'P' (Sort PID)"
                  >P (PID)</button>
                  <button
                    type="button"
                    className="tui-key-btn"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'k') }}
                    title="Send 'K' (Kill Process)"
                  >K (Kill)</button>
                  <button
                    type="button"
                    className="tui-key-btn"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'y') }}
                    title="Send 'Y' (Confirm / Yes)"
                  >Y</button>
                </div>

                {/* Action / Selector / Control Keys */}
                <div className="keypad-group actions-group">
                  <button
                    type="button"
                    className="tui-key-btn action-key primary"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'enter') }}
                    title="Send Enter (↵)"
                  >Enter ↵</button>
                  <button
                    type="button"
                    className="tui-key-btn action-key space-key"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'space') }}
                    title="Send Space (␣)"
                  >Space ␣</button>
                  <button
                    type="button"
                    className="tui-key-btn action-key"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'escape') }}
                    title="Send Escape (ESC)"
                  >Esc</button>
                  <button
                    type="button"
                    className="tui-key-btn action-key"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'tab') }}
                    title="Send Tab (⇥)"
                  >Tab ⇥</button>
                  <button
                    type="button"
                    className="tui-key-btn action-key"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'backspace') }}
                    title="Send Backspace (⌫)"
                  >Bksp ⌫</button>
                  <button
                    type="button"
                    className="tui-key-btn action-key"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'r') }}
                    title="Send 'R' (Refresh / Redraw)"
                  >R</button>
                  <button
                    type="button"
                    className="tui-key-btn action-key quit-key"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'q') }}
                    title="Send 'q' to Quit TUI"
                  >Q (Quit)</button>
                  <button
                    type="button"
                    className="tui-key-btn action-key ctrl-c-key"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendTuiAction(activeTab.id, 'ctrl-c') }}
                    title="Send SIGINT (Ctrl+C)"
                  >Ctrl+C 🛑</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="terminal-empty-state">
            <TerminalIcon size={32} className="empty-icon" />
            <span>No active terminal sessions</span>
            <button className="create-first-btn glass-interactive" onClick={() => handleCreateNewTab()}>
              <Plus size={13} /> Launch Default Terminal
            </button>
          </div>
        )}

        {splitTab && (
          <div className="terminal-pane">
            <XTermPane tab={splitTab} isActive={false} onTermReady={handleTermReady} />
          </div>
        )}
      </div>

      <style>{`
        .terminal-subsystem-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(10, 14, 24, 0.85);
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
          color: #ff453a;
          background: rgba(255, 69, 58, 0.15);
        }

        .shell-tag {
          font-size: 9px;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 3px;
          letter-spacing: 0.5px;
        }
        .shell-tag.ps { background: rgba(1, 36, 86, 0.6); color: #64d2ff; border: 1px solid rgba(100, 210, 255, 0.3); }
        .shell-tag.git { background: rgba(240, 80, 50, 0.2); color: #ff6e40; border: 1px solid rgba(240, 80, 50, 0.3); }
        .shell-tag.cyg { background: rgba(0, 150, 136, 0.2); color: #4db6ac; border: 1px solid rgba(0, 150, 136, 0.3); }
        .shell-tag.wsl { background: rgba(255, 179, 0, 0.2); color: #ffd54f; border: 1px solid rgba(255, 179, 0, 0.3); }
        .shell-tag.cmd { background: rgba(255, 255, 255, 0.1); color: #cfd8dc; border: 1px solid rgba(255, 255, 255, 0.2); }
        .shell-tag.default { color: var(--text-muted); }

        .terminal-action-controls {
          display: flex;
          align-items: center;
          gap: 4px;
          position: relative;
        }

        .term-icon-btn {
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-secondary);
          padding: 4px 6px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 3px;
          transition: all var(--transition-fast);
        }

        .term-icon-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .term-icon-btn.active-split {
          color: #64d2ff;
          background: rgba(100, 210, 255, 0.15);
          border-color: rgba(100, 210, 255, 0.3);
        }

        .term-icon-btn.kill-btn {
          color: #ff453a;
        }
        .term-icon-btn.kill-btn:hover {
          background: rgba(255, 69, 58, 0.2);
          border-color: rgba(255, 69, 58, 0.4);
          color: #ff6e6e;
          box-shadow: 0 0 8px rgba(255, 69, 58, 0.3);
        }

        .tui-toggle-btn {
          font-weight: 600;
          font-size: 11px;
          color: #bf5af2;
        }
        .tui-toggle-btn.active-tui {
          background: rgba(191, 90, 242, 0.22);
          color: #d6acff;
          border: 1px solid rgba(191, 90, 242, 0.4);
          box-shadow: 0 0 10px rgba(191, 90, 242, 0.3);
        }
        .tui-btn-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .shell-picker-menu {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          width: 250px;
          background: rgba(18, 24, 38, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: var(--radius-md);
          padding: 6px;
          z-index: 100;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
        }

        .picker-header {
          font-size: 9px;
          font-weight: 700;
          color: var(--text-muted);
          padding: 4px 8px;
          letter-spacing: 0.8px;
        }

        .picker-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background var(--transition-fast);
        }

        .picker-item:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .picker-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }

        .picker-name {
          font-size: 12px;
          color: var(--text-primary);
        }

        .picker-path {
          font-size: 9px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .picker-badge {
          font-size: 8px;
          background: rgba(0, 122, 255, 0.2);
          color: #64d2ff;
          padding: 1px 4px;
          border-radius: 2px;
        }

        .terminal-viewport-container {
          flex: 1;
          display: flex;
          min-height: 0;
          position: relative;
          background: rgba(5, 8, 15, 0.4);
        }

        .terminal-viewport-container.split-active {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          background: rgba(255, 255, 255, 0.08);
        }

        .terminal-pane {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          min-width: 0;
          background: rgba(10, 14, 24, 0.4);
          position: relative;
        }

        .xterm-viewport-wrapper {
          flex: 1;
          width: 100%;
          height: 100%;
          padding: 6px 8px;
          box-sizing: border-box;
          overflow: hidden;
        }

        .xterm-viewport-wrapper .xterm {
          height: 100%;
          padding: 2px;
        }

        .xterm-viewport-wrapper .xterm-viewport {
          background-color: transparent !important;
        }

        .tui-keypad-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: rgba(18, 22, 34, 0.95);
          border-top: 1px solid rgba(191, 90, 242, 0.25);
          backdrop-filter: blur(12px);
          z-index: 10;
          box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.3);
        }

        .keypad-group {
          display: flex;
          align-items: center;
          gap: 3px;
          background: rgba(255, 255, 255, 0.03);
          padding: 2px 4px;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .tui-key-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #F5F5F7;
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: var(--radius-xs);
          cursor: pointer;
          user-select: none;
          transition: all 0.12s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tui-key-btn:hover {
          background: rgba(255, 255, 255, 0.14);
          border-color: rgba(255, 255, 255, 0.25);
          transform: translateY(-1px);
        }

        .tui-key-btn:active {
          transform: translateY(1px);
          background: rgba(10, 132, 255, 0.3);
        }

        .tui-key-btn.action-key.primary {
          background: rgba(10, 132, 255, 0.25);
          border-color: rgba(10, 132, 255, 0.5);
          color: #64d2ff;
        }
        .tui-key-btn.action-key.primary:hover {
          background: rgba(10, 132, 255, 0.4);
        }

        .tui-key-btn.action-key.quit-key {
          background: rgba(255, 69, 58, 0.2);
          border-color: rgba(255, 69, 58, 0.4);
          color: #ff6e6e;
        }
        .tui-key-btn.action-key.quit-key:hover {
          background: rgba(255, 69, 58, 0.35);
        }

        .tui-key-btn.action-key.ctrl-c-key {
          background: rgba(255, 179, 0, 0.18);
          border-color: rgba(255, 179, 0, 0.35);
          color: #ffd54f;
        }

        .terminal-empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: var(--text-muted);
          font-size: 13px;
        }

        .create-first-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: var(--radius-sm);
          background: rgba(0, 122, 255, 0.2);
          border: 1px solid rgba(0, 122, 255, 0.4);
          color: #FFF;
          font-size: 12px;
          cursor: pointer;
        }

        .create-first-btn:hover {
          background: rgba(0, 122, 255, 0.35);
        }
      `}</style>
    </div>
  )
}

import React, { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react'
import {
  Columns2,
  Rows2,
  X,
  FileCode,
} from 'lucide-react'
import { EditorHost, EditorHostHandle, SelectionInfo } from './EditorHost'
import { NotebookEditor } from '../Notebook/NotebookEditor'
import { TabItem } from '../TabBar/TabBar'
import { ThemeDefinition } from '@sdk/index'
import { LspRenameResult } from '../../services/lspService'

export type SplitLayoutMode = 'single' | 'split-vertical' | 'split-horizontal' | 'grid-2x2'

export interface EditorPaneState {
  id: string
  activeTabId: string
  tabIds: string[]
}

export interface EditorGridHandle {
  getActiveEditorHandle: () => EditorHostHandle | null
  getEditorHandle: (paneId: string) => EditorHostHandle | null
  splitVertical: () => void
  splitHorizontal: () => void
  splitGrid2x2: () => void
  setSingleLayout: () => void
  focusPane: (paneId: string) => void
  getActivePaneId: () => string
  getLayoutMode: () => SplitLayoutMode
}

interface EditorGridProps {
  tabs: TabItem[]
  fileContents: Record<string, string>
  currentTheme: ThemeDefinition
  activeTabId: string
  onSelectTab: (tabId: string) => void
  onCloseTab: (tabId: string, e?: React.MouseEvent) => void
  onNewTab: () => void
  onEditorChange: (tabId: string, value: string | undefined) => void
  onCursorChange?: (line: number, col: number) => void
  onSelectionChange?: (selection: SelectionInfo | null) => void
  onEditorReady?: () => void
  getLanguageForFilename: (filename: string, content?: string) => string
  onNavigateFile?: (filePath: string, line: number, column?: number) => void
  onApplyWorkspaceRename?: (result: LspRenameResult) => void
  onOpenMarkdownPreviewSide?: () => void
}

export const EditorGrid = forwardRef<EditorGridHandle, EditorGridProps>(({
  tabs,
  fileContents,
  currentTheme,
  activeTabId,
  onSelectTab,
  onCloseTab: _onCloseTab,
  onNewTab: _onNewTab,
  onEditorChange,
  onCursorChange,
  onSelectionChange,
  onEditorReady,
  getLanguageForFilename,
  onNavigateFile,
  onApplyWorkspaceRename,
  onOpenMarkdownPreviewSide,
}, ref) => {
  const [layoutMode, setLayoutMode] = useState<SplitLayoutMode>('single')
  const [activePaneId, setActivePaneId] = useState<string>('pane-1')
  
  // Split ratios (percentage for pane 1, default 50%)
  const [splitRatioV, setSplitRatioV] = useState<number>(50)
  const [splitRatioH, setSplitRatioH] = useState<number>(50)

  // Pane configurations
  const [panes, setPanes] = useState<EditorPaneState[]>([
    {
      id: 'pane-1',
      activeTabId: activeTabId || (tabs[0]?.id ?? 'welcome.ts'),
      tabIds: tabs.map((t) => t.id),
    },
  ])

  const editorHandlesRef = useRef<Record<string, EditorHostHandle | null>>({})
  const isDraggingSplitV = useRef(false)
  const isDraggingSplitH = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync pane-1 with activeTabId and tabs when in single mode
  useEffect(() => {
    if (layoutMode === 'single') {
      setPanes([
        {
          id: 'pane-1',
          activeTabId: activeTabId || (tabs[0]?.id ?? ''),
          tabIds: tabs.map((t) => t.id),
        },
      ])
    }
  }, [tabs, activeTabId, layoutMode])

  // Split Vertical (Left / Right)
  const handleSplitVertical = useCallback(() => {
    setLayoutMode('split-vertical')
    const currentActiveTab = activeTabId || tabs[0]?.id || ''
    setPanes([
      { id: 'pane-1', activeTabId: currentActiveTab, tabIds: tabs.map((t) => t.id) },
      { id: 'pane-2', activeTabId: currentActiveTab, tabIds: tabs.map((t) => t.id) },
    ])
    setActivePaneId('pane-2')
  }, [activeTabId, tabs])

  // Split Horizontal (Top / Bottom)
  const handleSplitHorizontal = useCallback(() => {
    setLayoutMode('split-horizontal')
    const currentActiveTab = activeTabId || tabs[0]?.id || ''
    setPanes([
      { id: 'pane-1', activeTabId: currentActiveTab, tabIds: tabs.map((t) => t.id) },
      { id: 'pane-2', activeTabId: currentActiveTab, tabIds: tabs.map((t) => t.id) },
    ])
    setActivePaneId('pane-2')
  }, [activeTabId, tabs])

  // 2x2 Grid
  const handleSplitGrid2x2 = useCallback(() => {
    setLayoutMode('grid-2x2')
    const currentActiveTab = activeTabId || tabs[0]?.id || ''
    setPanes([
      { id: 'pane-1', activeTabId: currentActiveTab, tabIds: tabs.map((t) => t.id) },
      { id: 'pane-2', activeTabId: currentActiveTab, tabIds: tabs.map((t) => t.id) },
      { id: 'pane-3', activeTabId: currentActiveTab, tabIds: tabs.map((t) => t.id) },
      { id: 'pane-4', activeTabId: currentActiveTab, tabIds: tabs.map((t) => t.id) },
    ])
    setActivePaneId('pane-1')
  }, [activeTabId, tabs])

  // Close Pane
  const handleClosePane = useCallback((paneIdToClose: string) => {
    if (layoutMode === 'single') return

    const remaining = panes.filter((p) => p.id !== paneIdToClose)
    if (remaining.length <= 1) {
      setLayoutMode('single')
      setPanes([
        {
          id: 'pane-1',
          activeTabId: remaining[0]?.activeTabId || activeTabId || tabs[0]?.id || '',
          tabIds: tabs.map((t) => t.id),
        },
      ])
      setActivePaneId('pane-1')
    } else {
      setPanes(remaining)
      if (activePaneId === paneIdToClose) {
        setActivePaneId(remaining[0].id)
      }
    }
  }, [layoutMode, panes, activeTabId, tabs, activePaneId])

  // Pane Tab Selection
  const handlePaneSelectTab = useCallback((paneId: string, tabId: string) => {
    setActivePaneId(paneId)
    setPanes((prev) =>
      prev.map((p) => (p.id === paneId ? { ...p, activeTabId: tabId } : p))
    )
    onSelectTab(tabId)
  }, [onSelectTab])

  // Expose Imperative Handle for Shortcuts & Command Palette
  useImperativeHandle(ref, () => ({
    getActiveEditorHandle: () => editorHandlesRef.current[activePaneId] || null,
    getEditorHandle: (paneId: string) => editorHandlesRef.current[paneId] || null,
    splitVertical: handleSplitVertical,
    splitHorizontal: handleSplitHorizontal,
    splitGrid2x2: handleSplitGrid2x2,
    setSingleLayout: () => {
      setLayoutMode('single')
      setActivePaneId('pane-1')
    },
    focusPane: (paneId: string) => {
      if (panes.some((p) => p.id === paneId)) {
        setActivePaneId(paneId)
      }
    },
    getActivePaneId: () => activePaneId,
    getLayoutMode: () => layoutMode,
  }), [activePaneId, handleSplitVertical, handleSplitHorizontal, handleSplitGrid2x2, layoutMode, panes])

  // Drag-to-Resize Sashes
  const handleSashMouseDownV = (e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingSplitV.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingSplitV.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = Math.max(15, Math.min(85, ((ev.clientX - rect.left) / rect.width) * 100))
      setSplitRatioV(pct)
    }

    const handleMouseUp = () => {
      isDraggingSplitV.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleSashMouseDownH = (e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingSplitH.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingSplitH.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = Math.max(15, Math.min(85, ((ev.clientY - rect.top) / rect.height) * 100))
      setSplitRatioH(pct)
    }

    const handleMouseUp = () => {
      isDraggingSplitH.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Render individual editor pane
  const renderPane = (pane: EditorPaneState, index: number) => {
    const isFocused = activePaneId === pane.id
    const currentTabId = pane.activeTabId || activeTabId || tabs[0]?.id || ''
    const activeTab = tabs.find((t) => t.id === currentTabId)
    const content = fileContents[currentTabId] ?? ''
    const lang = activeTab
      ? activeTab.language
      : getLanguageForFilename(currentTabId, content)
    const fileName = activeTab?.name || currentTabId
    const isNotebook = Boolean(
      (fileName && (fileName.endsWith('.ipynb') || fileName.endsWith('.jupyter'))) ||
      lang === 'ipynb'
    )

    return (
      <div
        key={pane.id}
        className={`editor-pane-wrapper ${isFocused ? 'focused-pane' : ''}`}
        onClick={() => setActivePaneId(pane.id)}
      >
        {/* Pane Mini Header when split */}
        {layoutMode !== 'single' && (
          <div className="pane-header glass-panel">
            <div className="pane-tabs-scroll custom-scrollbar">
              {tabs.map((tab) => {
                const isTabActive = tab.id === currentTabId
                return (
                  <button
                    key={tab.id}
                    className={`pane-tab-chip glass-interactive ${isTabActive ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePaneSelectTab(pane.id, tab.id)
                    }}
                  >
                    <FileCode size={11} className="chip-icon" />
                    <span className="chip-name">{tab.name}</span>
                    {tab.isDirty && <span className="chip-dirty" />}
                  </button>
                )
              })}
            </div>

            {/* Split Pane Control Actions */}
            <div className="pane-controls">
              <button
                className="pane-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  handleSplitVertical()
                }}
                title="Split Editor Right (Ctrl+\)"
              >
                <Columns2 size={12} />
              </button>
              <button
                className="pane-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  handleSplitHorizontal()
                }}
                title="Split Editor Down (Ctrl+K Ctrl+\)"
              >
                <Rows2 size={12} />
              </button>
              <button
                className="pane-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClosePane(pane.id)
                }}
                title="Close Split Pane"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Editor Instance inside Container Query Safe Zone */}
        <div className="pane-editor-viewport">
          {isNotebook ? (
            <NotebookEditor
              content={content}
              filePath={currentTabId}
              onChange={(val) => onEditorChange(currentTabId, val)}
            />
          ) : activeTab || currentTabId ? (
            <EditorHost
              ref={(instance) => {
                editorHandlesRef.current[pane.id] = instance
              }}
              activeFilePath={currentTabId}
              content={content}
              language={lang}
              theme={currentTheme}
              onChange={(val) => onEditorChange(currentTabId, val)}
              onCursorChange={(l, c) => {
                if (isFocused) {
                  onCursorChange?.(l, c)
                }
              }}
              onSelectionChange={(sel) => {
                if (isFocused) {
                  onSelectionChange?.(sel)
                }
              }}
              onEditorReady={index === 0 ? onEditorReady : undefined}
              onNavigateFile={onNavigateFile}
              onApplyWorkspaceRename={onApplyWorkspaceRename}
              onOpenMarkdownPreviewSide={onOpenMarkdownPreviewSide}
            />
          ) : (
            <div className="empty-pane-state">
              <p>Empty Split Pane. Select a tab above.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="editor-grid-container" ref={containerRef}>
      {/* 1. SINGLE PANE */}
      {layoutMode === 'single' && panes[0] && renderPane(panes[0], 0)}

      {/* 2. SPLIT VERTICAL (Left / Right) */}
      {layoutMode === 'split-vertical' && panes.length >= 2 && (
        <div className="split-layout-vertical">
          <div style={{ width: `${splitRatioV}%`, height: '100%' }}>
            {renderPane(panes[0], 0)}
          </div>
          <div
            className="pane-resizer-sash split-sash-vertical"
            onMouseDown={handleSashMouseDownV}
            title="Drag to resize split panes"
          />
          <div style={{ width: `${100 - splitRatioV}%`, height: '100%' }}>
            {renderPane(panes[1], 1)}
          </div>
        </div>
      )}

      {/* 3. SPLIT HORIZONTAL (Top / Bottom) */}
      {layoutMode === 'split-horizontal' && panes.length >= 2 && (
        <div className="split-layout-horizontal">
          <div style={{ height: `${splitRatioH}%`, width: '100%' }}>
            {renderPane(panes[0], 0)}
          </div>
          <div
            className="pane-resizer-sash split-sash-horizontal"
            onMouseDown={handleSashMouseDownH}
            title="Drag to resize split panes"
          />
          <div style={{ height: `${100 - splitRatioH}%`, width: '100%' }}>
            {renderPane(panes[1], 1)}
          </div>
        </div>
      )}

      {/* 4. 2x2 QUADRANT GRID */}
      {layoutMode === 'grid-2x2' && panes.length >= 4 && (
        <div className="split-layout-grid-2x2">
          <div className="grid-row">
            <div className="grid-cell">{renderPane(panes[0], 0)}</div>
            <div className="grid-cell">{renderPane(panes[1], 1)}</div>
          </div>
          <div className="grid-row">
            <div className="grid-cell">{renderPane(panes[2], 2)}</div>
            <div className="grid-cell">{renderPane(panes[3], 3)}</div>
          </div>
        </div>
      )}

      <style>{`
        .editor-grid-container {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          container-type: size;
        }

        .split-layout-vertical {
          display: flex;
          flex-direction: row;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .split-layout-horizontal {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .split-layout-grid-2x2 {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          gap: 2px;
          background: rgba(255, 255, 255, 0.05);
        }

        .grid-row {
          display: flex;
          flex-direction: row;
          flex: 1 1 0;
          min-height: 0;
          min-width: 0;
          gap: 2px;
          height: 50%;
          width: 100%;
        }

        .grid-cell {
          flex: 1 1 0;
          min-height: 0;
          min-width: 0;
          height: 100%;
          width: 50%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .editor-pane-wrapper {
          display: flex;
          flex-direction: column;
          flex: 1 1 0;
          min-height: 0;
          min-width: 0;
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
          background: transparent;
          transition: box-shadow 0.2s;
        }

        .editor-pane-wrapper.focused-pane {
          box-shadow: inset 0 0 0 1px rgba(191, 90, 242, 0.35);
        }

        .pane-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 28px;
          background: rgba(14, 18, 30, 0.65);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0 8px;
          user-select: none;
          flex-shrink: 0;
        }

        .pane-tabs-scroll {
          display: flex;
          align-items: center;
          gap: 4px;
          overflow-x: auto;
          flex: 1;
          height: 100%;
        }

        .pane-tab-chip {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 4px;
          padding: 2px 7px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .pane-tab-chip:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
        }

        .pane-tab-chip.active {
          color: #fff;
          background: rgba(191, 90, 242, 0.2);
          border-color: rgba(191, 90, 242, 0.5);
          font-weight: 500;
        }

        .chip-icon {
          color: #bf5af2;
        }

        .chip-dirty {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #bf5af2;
        }

        .pane-controls {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-left: 8px;
        }

        .pane-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.45);
          cursor: pointer;
          padding: 3px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .pane-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
        }

        .pane-editor-viewport {
          display: flex;
          flex-direction: column;
          flex: 1 1 0;
          min-height: 0;
          min-width: 0;
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
        }

        .split-sash-vertical {
          width: 4px;
          height: 100%;
          cursor: col-resize;
          background: rgba(255, 255, 255, 0.04);
          transition: background 0.2s, box-shadow 0.2s;
          z-index: 10;
        }

        .split-sash-vertical:hover, .split-sash-vertical:active {
          background: rgba(191, 90, 242, 0.6);
          box-shadow: 0 0 10px rgba(191, 90, 242, 0.4);
        }

        .split-sash-horizontal {
          height: 4px;
          width: 100%;
          cursor: row-resize;
          background: rgba(255, 255, 255, 0.04);
          transition: background 0.2s, box-shadow 0.2s;
          z-index: 10;
        }

        .split-sash-horizontal:hover, .split-sash-horizontal:active {
          background: rgba(191, 90, 242, 0.6);
          box-shadow: 0 0 10px rgba(191, 90, 242, 0.4);
        }

        .empty-pane-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: rgba(255, 255, 255, 0.4);
          font-size: 12px;
        }
      `}</style>
    </div>
  )
})

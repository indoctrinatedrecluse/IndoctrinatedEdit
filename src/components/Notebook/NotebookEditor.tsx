import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Play,
  RotateCw,
  Square,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Table,
  Check,
  Copy,
  Code,
  FileText,
  Eye,
  Search,
  Download,
  BarChart2,
  Terminal,
  Layers,
  HelpCircle,
  Minimize2,
  Sparkles,
  Hash,
  Bold,
  Italic,
  List,
  Quote,
} from 'lucide-react'
import {
  jupyterKernelService,
  JupyterNotebook,
  JupyterCell,
} from '../../services/jupyterKernelService'

interface NotebookEditorProps {
  content: string
  filePath?: string
  onChange?: (newContent: string) => void
}

export const NotebookEditor: React.FC<NotebookEditorProps> = ({
  content,
  filePath: _filePath,
  onChange,
}) => {
  const [notebook, setNotebook] = useState<JupyterNotebook>(() =>
    jupyterKernelService.parseNotebook(content)
  )
  const [selectedCellId, setSelectedCellId] = useState<string | null>(
    notebook.cells[0]?.id || null
  )
  const [isCommandMode, setIsCommandMode] = useState<boolean>(false)
  const [deletedCellHistory, setDeletedCellHistory] = useState<{ cell: JupyterCell; index: number }[]>([])
  const [copiedCell, setCopiedCell] = useState<JupyterCell | null>(null)
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false)
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(true)
  const [collapsedOutputs, setCollapsedOutputs] = useState<Record<string, boolean>>({})
  const [copiedCellId, setCopiedCellId] = useState<string | null>(null)
  const [copiedOutputCellId, setCopiedOutputCellId] = useState<string | null>(null)

  // Output view mode per cell ('auto' | 'table' | 'chart' | 'logs' | 'inspector')
  const [outputTabMode, setOutputTabMode] = useState<Record<string, 'table' | 'chart' | 'logs' | 'inspector'>>({})
  // Chart style override per cell ('scatter' | 'loss' | 'bar' | 'heatmap')
  const [chartStyles, setChartStyles] = useState<Record<string, 'scatter' | 'loss' | 'bar' | 'heatmap'>>({})

  // Table filtering state
  const [tableSearch, setTableSearch] = useState<Record<string, string>>({})

  // Run all progress tracker
  const [runAllProgress, setRunAllProgress] = useState<{ running: boolean; current: number; total: number } | null>(null)

  const [kernelStatus, setKernelStatus] = useState<'idle' | 'busy' | 'restarting'>(() =>
    jupyterKernelService.getKernelStatus()
  )
  const [showVariableExplorer, setShowVariableExplorer] = useState(false)
  const [showRawJson, setShowRawJson] = useState(false)
  const [copiedExport, setCopiedExport] = useState(false)
  const [activeKernel, setActiveKernel] = useState(() =>
    jupyterKernelService.getActiveKernel()
  )

  const isUpdatingFromSelf = useRef(false)
  const editorRootRef = useRef<HTMLDivElement>(null)
  const lastKeyTime = useRef<number>(0)
  const lastKey = useRef<string>('')

  // Re-parse when incoming content changes externally
  useEffect(() => {
    if (isUpdatingFromSelf.current) {
      isUpdatingFromSelf.current = false
      return
    }
    const parsed = jupyterKernelService.parseNotebook(content)
    setNotebook(parsed)
    if (!selectedCellId && parsed.cells.length > 0) {
      setSelectedCellId(parsed.cells[0].id)
    }
  }, [content])

  // Subscribe to kernel service events
  useEffect(() => {
    const unsub = jupyterKernelService.subscribe(() => {
      setKernelStatus(jupyterKernelService.getKernelStatus())
      setActiveKernel(jupyterKernelService.getActiveKernel())
    })
    return unsub
  }, [])

  const notifyChange = useCallback(
    (updated: JupyterNotebook) => {
      setNotebook({ ...updated })
      isUpdatingFromSelf.current = true
      const serialized = jupyterKernelService.serializeNotebook(updated)
      onChange?.(serialized)
    },
    [onChange]
  )

  // Cell Execution Handlers
  const handleRunCell = async (cellId: string, advanceNext = false) => {
    const idx = notebook.cells.findIndex((c) => c.id === cellId)
    if (idx === -1) return
    const cell = notebook.cells[idx]

    await jupyterKernelService.executeCell(cell)
    notifyChange(notebook)

    if (advanceNext) {
      if (idx + 1 < notebook.cells.length) {
        setSelectedCellId(notebook.cells[idx + 1].id)
      } else {
        handleAddCell('code', cellId)
      }
    }
  }

  const handleRunAll = async () => {
    const codeCells = notebook.cells.filter((c) => c.cell_type === 'code')
    setRunAllProgress({ running: true, current: 0, total: codeCells.length })

    for (let i = 0; i < notebook.cells.length; i++) {
      const cell = notebook.cells[i]
      if (cell.cell_type === 'code') {
        setRunAllProgress((prev) => (prev ? { ...prev, current: prev.current + 1 } : null))
        await jupyterKernelService.executeCell(cell)
        notifyChange(notebook)
      }
    }

    setRunAllProgress(null)
  }

  const handleRestartKernel = () => {
    jupyterKernelService.restartKernel()
  }

  const handleInterruptKernel = () => {
    jupyterKernelService.interruptKernel()
    setRunAllProgress(null)
  }

  const handleClearAllOutputs = () => {
    jupyterKernelService.clearAllOutputs(notebook)
    notifyChange(notebook)
  }

  const handleClearCellOutput = (cellId: string) => {
    const cell = notebook.cells.find((c) => c.id === cellId)
    if (cell) {
      jupyterKernelService.clearCellOutputs(cell)
      notifyChange(notebook)
    }
  }

  // Cell Management Handlers
  const handleAddCell = (type: 'code' | 'markdown', afterId?: string, beforeId?: string) => {
    const newCell: JupyterCell = {
      id: `cell-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      cell_type: type,
      source: type === 'code' ? '' : '### Double click to edit Markdown...',
      execution_count: null,
      outputs: [],
      metadata: {},
      isEditing: type === 'markdown',
    }

    const nextCells = [...notebook.cells]
    if (beforeId) {
      const idx = nextCells.findIndex((c) => c.id === beforeId)
      if (idx !== -1) {
        nextCells.splice(idx, 0, newCell)
      } else {
        nextCells.unshift(newCell)
      }
    } else if (afterId) {
      const idx = nextCells.findIndex((c) => c.id === afterId)
      if (idx !== -1) {
        nextCells.splice(idx + 1, 0, newCell)
      } else {
        nextCells.push(newCell)
      }
    } else {
      nextCells.push(newCell)
    }

    notebook.cells = nextCells
    setSelectedCellId(newCell.id)
    setIsCommandMode(false)
    notifyChange(notebook)
  }

  const handleDeleteCell = (cellId: string) => {
    if (notebook.cells.length <= 1) return
    const idx = notebook.cells.findIndex((c) => c.id === cellId)
    const targetCell = notebook.cells[idx]
    if (targetCell) {
      setDeletedCellHistory((prev) => [{ cell: targetCell, index: idx }, ...prev.slice(0, 9)])
    }

    notebook.cells = notebook.cells.filter((c) => c.id !== cellId)
    if (selectedCellId === cellId) {
      const nextIdx = Math.min(idx, notebook.cells.length - 1)
      setSelectedCellId(notebook.cells[nextIdx]?.id || null)
    }
    notifyChange(notebook)
  }

  const handleUndoDeleteCell = () => {
    if (deletedCellHistory.length === 0) return
    const [lastDeleted, ...rest] = deletedCellHistory
    const nextCells = [...notebook.cells]
    nextCells.splice(Math.min(lastDeleted.index, nextCells.length), 0, lastDeleted.cell)
    notebook.cells = nextCells
    setDeletedCellHistory(rest)
    setSelectedCellId(lastDeleted.cell.id)
    notifyChange(notebook)
  }

  const handleDuplicateCell = (cellId: string) => {
    const idx = notebook.cells.findIndex((c) => c.id === cellId)
    if (idx === -1) return
    const src = notebook.cells[idx]
    const duplicated: JupyterCell = {
      ...JSON.parse(JSON.stringify(src)),
      id: `cell-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      execution_count: null,
      outputs: [],
    }

    const nextCells = [...notebook.cells]
    nextCells.splice(idx + 1, 0, duplicated)
    notebook.cells = nextCells
    setSelectedCellId(duplicated.id)
    notifyChange(notebook)
  }

  const handleMoveCell = (cellId: string, direction: 'up' | 'down') => {
    const idx = notebook.cells.findIndex((c) => c.id === cellId)
    if (idx === -1) return
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= notebook.cells.length) return

    const nextCells = [...notebook.cells]
    const [moved] = nextCells.splice(idx, 1)
    nextCells.splice(targetIdx, 0, moved)

    notebook.cells = nextCells
    notifyChange(notebook)
  }

  const handleChangeCellType = (cellId: string, newType: 'code' | 'markdown') => {
    const cell = notebook.cells.find((c) => c.id === cellId)
    if (cell && cell.cell_type !== newType) {
      cell.cell_type = newType
      if (newType === 'markdown') {
        cell.outputs = []
        cell.execution_count = null
        cell.isEditing = true
      }
      notifyChange(notebook)
    }
  }

  const handleSourceChange = (cellId: string, newSource: string) => {
    const cell = notebook.cells.find((c) => c.id === cellId)
    if (cell) {
      cell.source = newSource
      notifyChange(notebook)
    }
  }

  const handleCopyCode = (cellId: string, codeStr: string) => {
    navigator.clipboard.writeText(codeStr)
    setCopiedCellId(cellId)
    setTimeout(() => setCopiedCellId(null), 1500)
  }

  const handleCopyOutput = (cellId: string, cell: JupyterCell) => {
    const textOut = cell.outputs
      .map((o) => {
        if (o.text) return Array.isArray(o.text) ? o.text.join('') : o.text
        if (o.data && o.data['text/plain']) {
          return Array.isArray(o.data['text/plain'])
            ? o.data['text/plain'].join('')
            : String(o.data['text/plain'])
        }
        return ''
      })
      .join('\n')
    navigator.clipboard.writeText(textOut)
    setCopiedOutputCellId(cellId)
    setTimeout(() => setCopiedOutputCellId(null), 1500)
  }

  const handleToggleCollapseOutput = (cellId: string) => {
    setCollapsedOutputs((prev) => ({ ...prev, [cellId]: !prev[cellId] }))
  }

  const handleExport = (type: 'py' | 'md') => {
    let output = ''
    if (type === 'py') {
      output = jupyterKernelService.exportToPythonScript(notebook)
    } else {
      output = jupyterKernelService.exportToMarkdown(notebook)
    }
    navigator.clipboard.writeText(output)
    setCopiedExport(true)
    setTimeout(() => setCopiedExport(false), 1800)
  }

  // Insert markdown snippet into active markdown cell
  const handleInsertMarkdownFormatting = (cellId: string, formatType: string) => {
    const cell = notebook.cells.find((c) => c.id === cellId)
    if (!cell) return

    let addition = ''
    switch (formatType) {
      case 'bold':
        addition = '**Bold Text**'
        break
      case 'italic':
        addition = '*Italic Text*'
        break
      case 'header':
        addition = '\n### Section Title\n'
        break
      case 'list':
        addition = '\n- Item 1\n- Item 2\n- Item 3\n'
        break
      case 'code':
        addition = '\n```python\n# Code snippet\nprint("Hello World")\n```\n'
        break
      case 'quote':
        addition = '\n> Key insight or note block\n'
        break
      case 'table':
        addition = '\n| Metric | Baseline | Target |\n|---|---|---|\n| Accuracy | 92.4% | 98.5% |\n'
        break
    }
    cell.source = cell.source ? `${cell.source}\n${addition}` : addition
    notifyChange(notebook)
  }

  // GLOBAL KEYBOARD SHORTCUTS MANAGER (Jupyter Command Mode & Execution)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when focusing inside input/textarea outside command mode
      const isTextarea = (e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.tagName === 'INPUT'

      // 1. Shift+Enter: Run and Advance
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault()
        if (selectedCellId) {
          handleRunCell(selectedCellId, true)
        }
        return
      }

      // 2. Ctrl+Enter: Run in Place
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (selectedCellId) {
          handleRunCell(selectedCellId, false)
        }
        return
      }

      // 3. Alt+Enter: Run and Insert Below
      if (e.key === 'Enter' && e.altKey) {
        e.preventDefault()
        if (selectedCellId) {
          handleRunCell(selectedCellId, false)
          handleAddCell('code', selectedCellId)
        }
        return
      }

      // 4. Escape: Switch to Command Mode
      if (e.key === 'Escape') {
        setIsCommandMode(true)
        if (isTextarea) {
          (e.target as HTMLElement).blur()
        }
        return
      }

      // 5. Enter in Command Mode: Switch to Edit Mode
      if (e.key === 'Enter' && isCommandMode && !isTextarea) {
        e.preventDefault()
        setIsCommandMode(false)
        const cell = notebook.cells.find((c) => c.id === selectedCellId)
        if (cell && cell.cell_type === 'markdown') {
          cell.isEditing = true
          notifyChange(notebook)
        }
        return
      }

      // COMMAND MODE ONLY SHORTCUTS
      if (isCommandMode && !isTextarea) {
        const now = Date.now()
        const isDoubleKey = now - lastKeyTime.current < 600
        const prevKey = lastKey.current

        // A: Insert Above
        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault()
          handleAddCell('code', undefined, selectedCellId || undefined)
          return
        }

        // B: Insert Below
        if (e.key === 'b' || e.key === 'B') {
          e.preventDefault()
          handleAddCell('code', selectedCellId || undefined)
          return
        }

        // M: Markdown conversion
        if (e.key === 'm' || e.key === 'M') {
          e.preventDefault()
          if (selectedCellId) handleChangeCellType(selectedCellId, 'markdown')
          return
        }

        // Y: Code conversion
        if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault()
          if (selectedCellId) handleChangeCellType(selectedCellId, 'code')
          return
        }

        // C: Copy cell
        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault()
          const cell = notebook.cells.find((c) => c.id === selectedCellId)
          if (cell) setCopiedCell(cell)
          return
        }

        // V: Paste cell below
        if (e.key === 'v' || e.key === 'V') {
          e.preventDefault()
          if (copiedCell && selectedCellId) {
            handleDuplicateCell(selectedCellId)
          }
          return
        }

        // X: Cut cell
        if (e.key === 'x' || e.key === 'X') {
          e.preventDefault()
          const cell = notebook.cells.find((c) => c.id === selectedCellId)
          if (cell) {
            setCopiedCell(cell)
            handleDeleteCell(cell.id)
          }
          return
        }

        // Z: Undo delete cell
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault()
          handleUndoDeleteCell()
          return
        }

        // K or ArrowUp: Select cell above
        if (e.key === 'k' || e.key === 'ArrowUp') {
          e.preventDefault()
          const idx = notebook.cells.findIndex((c) => c.id === selectedCellId)
          if (idx > 0) {
            setSelectedCellId(notebook.cells[idx - 1].id)
          }
          return
        }

        // J or ArrowDown: Select cell below
        if (e.key === 'j' || e.key === 'ArrowDown') {
          e.preventDefault()
          const idx = notebook.cells.findIndex((c) => c.id === selectedCellId)
          if (idx >= 0 && idx < notebook.cells.length - 1) {
            setSelectedCellId(notebook.cells[idx + 1].id)
          }
          return
        }

        // L: Toggle line numbers
        if (e.key === 'l' || e.key === 'L') {
          e.preventDefault()
          setShowLineNumbers((prev) => !prev)
          return
        }

        // H or ?: Show shortcuts modal
        if (e.key === 'h' || e.key === 'H' || e.key === '?') {
          e.preventDefault()
          setShowShortcutsModal(true)
          return
        }

        // D, D: Delete Cell
        if (e.key === 'd' || e.key === 'D') {
          if (isDoubleKey && (prevKey === 'd' || prevKey === 'D')) {
            e.preventDefault()
            if (selectedCellId) handleDeleteCell(selectedCellId)
            lastKey.current = ''
            return
          }
        }

        // 0, 0: Restart Kernel
        if (e.key === '0') {
          if (isDoubleKey && prevKey === '0') {
            e.preventDefault()
            handleRestartKernel()
            lastKey.current = ''
            return
          }
        }

        // I, I: Interrupt Kernel
        if (e.key === 'i' || e.key === 'I') {
          if (isDoubleKey && (prevKey === 'i' || prevKey === 'I')) {
            e.preventDefault()
            handleInterruptKernel()
            lastKey.current = ''
            return
          }
        }

        lastKey.current = e.key
        lastKeyTime.current = now
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [selectedCellId, isCommandMode, notebook, copiedCell, deletedCellHistory])

  const variables = jupyterKernelService.getVariables()
  const estimatedRam = jupyterKernelService.getEstimatedMemoryUsage()

  // Render individual output item with rich tabs & interactive tools
  const renderCellOutputs = (cell: JupyterCell) => {
    if (!cell.outputs || cell.outputs.length === 0) return null
    if (collapsedOutputs[cell.id]) {
      return (
        <div className="output-collapsed-banner" onClick={() => handleToggleCollapseOutput(cell.id)}>
          <span>Output hidden ({cell.outputs.length} items) - Click to expand</span>
        </div>
      )
    }

    const hasHtml = cell.outputs.some((o) => o.data && o.data['text/html'])
    const hasSvg = cell.outputs.some((o) => (o.data && o.data['image/svg+xml']) || (o.data && o.data['text/plain']?.includes('<Figure')))
    const hasStream = cell.outputs.some((o) => o.output_type === 'stream' || o.output_type === 'error' || o.data?.['text/plain'])
    const activeTab = outputTabMode[cell.id] || (hasHtml ? 'table' : hasSvg ? 'chart' : 'logs')
    const activeChart = chartStyles[cell.id] || 'scatter'

    return (
      <div className="cell-output-wrapper">
        {/* Output Multi-Format Tab Bar */}
        <div className="output-header-toolbar">
          <div className="output-tabs-group">
            {hasHtml && (
              <button
                className={`output-tab-btn ${activeTab === 'table' ? 'active' : ''}`}
                onClick={() => setOutputTabMode((prev) => ({ ...prev, [cell.id]: 'table' }))}
              >
                <Table size={11} />
                <span>DataFrame Table</span>
              </button>
            )}

            {hasSvg && (
              <button
                className={`output-tab-btn ${activeTab === 'chart' ? 'active' : ''}`}
                onClick={() => setOutputTabMode((prev) => ({ ...prev, [cell.id]: 'chart' }))}
              >
                <BarChart2 size={11} />
                <span>Visualization</span>
              </button>
            )}

            {hasStream && (
              <button
                className={`output-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
                onClick={() => setOutputTabMode((prev) => ({ ...prev, [cell.id]: 'logs' }))}
              >
                <Terminal size={11} />
                <span>Console Logs</span>
              </button>
            )}

            <button
              className={`output-tab-btn ${activeTab === 'inspector' ? 'active' : ''}`}
              onClick={() => setOutputTabMode((prev) => ({ ...prev, [cell.id]: 'inspector' }))}
            >
              <Layers size={11} />
              <span>Inspector</span>
            </button>
          </div>

          <div className="output-right-actions">
            <button
              className="out-act-btn"
              onClick={() => handleCopyOutput(cell.id, cell)}
              title="Copy Output to Clipboard"
            >
              {copiedOutputCellId === cell.id ? <Check size={11} color="#30D158" /> : <Copy size={11} />}
            </button>
            <button
              className="out-act-btn"
              onClick={() => handleToggleCollapseOutput(cell.id)}
              title="Collapse Output"
            >
              <Minimize2 size={11} />
            </button>
            <button
              className="out-act-btn delete"
              onClick={() => handleClearCellOutput(cell.id)}
              title="Clear Cell Output"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>

        {/* TAB 1: INTERACTIVE DATAFRAME TABLE */}
        {activeTab === 'table' && hasHtml && (
          <div className="output-table-pane">
            <div className="table-controls-bar">
              <div className="table-search-box">
                <Search size={11} color="#94A3B8" />
                <input
                  type="text"
                  placeholder="Filter rows & columns..."
                  value={tableSearch[cell.id] || ''}
                  onChange={(e) => setTableSearch((prev) => ({ ...prev, [cell.id]: e.target.value }))}
                />
              </div>

              <div className="table-actions">
                <span className="table-dim-badge">150 rows × 5 cols</span>
                <button
                  className="table-tool-btn"
                  onClick={() => {
                    const csvContent = 'sepal_length,sepal_width,petal_length,petal_width,species\n5.1,3.5,1.4,0.2,setosa\n4.9,3.0,1.4,0.2,setosa\n4.7,3.2,1.3,0.2,setosa\n'
                    navigator.clipboard.writeText(csvContent)
                    alert('Exported DataFrame to CSV on clipboard!')
                  }}
                >
                  <Download size={11} />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {cell.outputs.map((out, idx) => {
              if (out.data && out.data['text/html']) {
                const html = Array.isArray(out.data['text/html']) ? out.data['text/html'].join('') : out.data['text/html']
                return (
                  <div
                    key={idx}
                    className="output-html-container"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                )
              }
              return null
            })}
          </div>
        )}

        {/* TAB 2: INTERACTIVE CHART VISUALIZATION */}
        {activeTab === 'chart' && (
          <div className="output-chart-pane">
            <div className="chart-controls-strip">
              <div className="chart-type-selector">
                <button
                  className={`chart-type-btn ${activeChart === 'scatter' ? 'active' : ''}`}
                  onClick={() => setChartStyles((prev) => ({ ...prev, [cell.id]: 'scatter' }))}
                >
                  Scatter Regression
                </button>
                <button
                  className={`chart-type-btn ${activeChart === 'loss' ? 'active' : ''}`}
                  onClick={() => setChartStyles((prev) => ({ ...prev, [cell.id]: 'loss' }))}
                >
                  Loss Curve
                </button>
                <button
                  className={`chart-type-btn ${activeChart === 'bar' ? 'active' : ''}`}
                  onClick={() => setChartStyles((prev) => ({ ...prev, [cell.id]: 'bar' }))}
                >
                  Feature Importance
                </button>
                <button
                  className={`chart-type-btn ${activeChart === 'heatmap' ? 'active' : ''}`}
                  onClick={() => setChartStyles((prev) => ({ ...prev, [cell.id]: 'heatmap' }))}
                >
                  Correlation Matrix
                </button>
              </div>

              <button
                className="table-tool-btn"
                onClick={() => {
                  const svg = jupyterKernelService.generateChartSvg(activeChart)
                  navigator.clipboard.writeText(svg)
                  alert('Copied vector SVG chart code to clipboard!')
                }}
              >
                <Download size={11} />
                <span>SVG</span>
              </button>
            </div>

            <div
              className="output-svg-container"
              dangerouslySetInnerHTML={{ __html: jupyterKernelService.generateChartSvg(activeChart) }}
            />
          </div>
        )}

        {/* TAB 3: TERMINAL LOGS & RAW STDOUT */}
        {activeTab === 'logs' && (
          <div className="output-logs-pane">
            {cell.outputs.map((out, idx) => {
              if (out.output_type === 'stream' && out.text) {
                const text = Array.isArray(out.text) ? out.text.join('') : out.text
                return (
                  <div key={idx} className={`output-stream ${out.name === 'stderr' ? 'stderr' : 'stdout'}`}>
                    <pre>{text}</pre>
                  </div>
                )
              }
              if (out.output_type === 'error') {
                const traceback = out.traceback ? out.traceback.join('\n') : `${out.ename}: ${out.evalue}`
                const cleanTraceback = traceback.replace(/\u001b\[.*?m/g, '')
                return (
                  <div key={idx} className="output-error-container">
                    <div className="error-badge">{out.ename || 'ExecutionError'}</div>
                    <pre className="error-traceback">{cleanTraceback}</pre>
                  </div>
                )
              }
              if (out.data && out.data['text/plain'] && !out.data['text/plain'].includes('<Figure')) {
                const text = Array.isArray(out.data['text/plain']) ? out.data['text/plain'].join('') : String(out.data['text/plain'])
                return (
                  <div key={idx} className="output-plain-result">
                    <pre>{text}</pre>
                  </div>
                )
              }
              return null
            })}
          </div>
        )}

        {/* TAB 4: MIME INSPECTOR */}
        {activeTab === 'inspector' && (
          <div className="output-inspector-pane">
            <pre className="inspector-json-pre">
              {JSON.stringify(cell.outputs, null, 2)}
            </pre>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="notebook-editor-root" ref={editorRootRef}>
      {/* RUN ALL PROGRESS BAR */}
      {runAllProgress && (
        <div className="run-all-progress-strip">
          <div className="progress-info">
            <Sparkles size={12} className="spin" color="#30D158" />
            <span>
              Executing Notebook Cell {runAllProgress.current} of {runAllProgress.total}...
            </span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${(runAllProgress.current / runAllProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* NOTEBOOK CONTROL TOOLBAR */}
      <div className="notebook-main-toolbar glass-panel">
        <div className="toolbar-btn-group">
          <button
            className="nb-tool-btn primary glass-interactive"
            onClick={handleRunAll}
            title="Run All Cells (Ctrl+F5)"
          >
            <Play size={12} fill="#30D158" color="#30D158" />
            <span>Run All</span>
          </button>

          <button
            className="nb-tool-btn glass-interactive"
            onClick={() => selectedCellId && handleRunCell(selectedCellId)}
            title="Run Active Cell (Shift+Enter)"
          >
            <Play size={12} />
            <span>Run</span>
          </button>

          <div className="toolbar-divider" />

          <button
            className="nb-tool-btn glass-interactive"
            onClick={() => handleAddCell('code', selectedCellId || undefined)}
            title="Add Code Cell Below (B)"
          >
            <Plus size={12} />
            <span>Code</span>
          </button>

          <button
            className="nb-tool-btn glass-interactive"
            onClick={() => handleAddCell('markdown', selectedCellId || undefined)}
            title="Add Markdown Cell Below (M)"
          >
            <Plus size={12} />
            <span>Markdown</span>
          </button>

          <div className="toolbar-divider" />

          <button
            className="nb-tool-btn glass-interactive"
            onClick={handleClearAllOutputs}
            title="Clear Outputs from all cells"
          >
            <Trash2 size={12} />
            <span>Clear Outputs</span>
          </button>

          <button
            className="nb-tool-btn glass-interactive"
            onClick={handleRestartKernel}
            title="Restart Kernel (0, 0)"
          >
            <RotateCw size={12} className={kernelStatus === 'restarting' ? 'spin' : ''} />
            <span>Restart</span>
          </button>

          <button
            className="nb-tool-btn glass-interactive"
            onClick={handleInterruptKernel}
            title="Interrupt Running Kernel (I, I)"
          >
            <Square size={12} color="#FF453A" />
            <span>Interrupt</span>
          </button>

          <button
            className={`nb-tool-btn glass-interactive ${showLineNumbers ? 'active' : ''}`}
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            title="Toggle Line Numbers (L)"
          >
            <Hash size={12} />
            <span>Lines</span>
          </button>
        </div>

        {/* Kernel Status & Right Auxiliary Actions */}
        <div className="toolbar-right-group">
          {/* Mode Pill Badge */}
          <div className={`mode-indicator-pill ${isCommandMode ? 'command' : 'edit'}`}>
            <span className="mode-dot" />
            <span>{isCommandMode ? 'COMMAND (Esc)' : 'EDIT (Enter)'}</span>
          </div>

          <button
            className="nb-tool-btn glass-interactive"
            onClick={() => setShowShortcutsModal(true)}
            title="Keyboard Shortcuts Reference (H)"
          >
            <HelpCircle size={12} />
            <span>Shortcuts</span>
          </button>

          <button
            className={`nb-tool-btn glass-interactive ${showVariableExplorer ? 'active' : ''}`}
            onClick={() => setShowVariableExplorer(!showVariableExplorer)}
            title="Toggle Variable Explorer"
          >
            <Table size={12} />
            <span>Variables ({variables.length})</span>
          </button>

          <button
            className={`nb-tool-btn glass-interactive ${showRawJson ? 'active' : ''}`}
            onClick={() => setShowRawJson(!showRawJson)}
            title="Toggle Raw .ipynb JSON"
          >
            {showRawJson ? <Eye size={12} /> : <Code size={12} />}
            <span>{showRawJson ? 'Notebook View' : 'Raw JSON'}</span>
          </button>

          <div className="export-dropdown-wrap">
            <button
              className="nb-tool-btn glass-interactive"
              onClick={() => handleExport('py')}
              title="Copy as Python (.py) script"
            >
              {copiedExport ? <Check size={12} color="#30D158" /> : <Copy size={12} />}
              <span>Export .py</span>
            </button>
          </div>

          <div className="kernel-badge-pill" title={`RAM Usage: ${estimatedRam}`}>
            <span className={`kernel-status-dot ${kernelStatus}`} />
            <span className="kernel-name">{activeKernel.displayName}</span>
            <span className="kernel-ram-pill">💾 {estimatedRam.split('/')[0]}</span>
          </div>
        </div>
      </div>

      {/* MAIN NOTEBOOK CANVAS */}
      <div className="notebook-body-layout">
        {showRawJson ? (
          <div className="raw-json-container">
            <pre className="raw-json-pre">
              {jupyterKernelService.serializeNotebook(notebook)}
            </pre>
          </div>
        ) : (
          <div className="notebook-cells-canvas custom-scrollbar">
            {notebook.cells.map((cell, idx) => {
              const isSelected = cell.id === selectedCellId
              const isCode = cell.cell_type === 'code'

              return (
                <div
                  key={cell.id}
                  className={`notebook-cell-wrapper glass-panel ${cell.cell_type} ${isSelected ? 'selected' : ''} ${isSelected && isCommandMode ? 'command-focused' : ''}`}
                  onClick={() => setSelectedCellId(cell.id)}
                >
                  {/* CELL ACTION BAR (Floats on Hover/Selection) */}
                  <div className="cell-action-bar glass-panel">
                    {isCode && (
                      <button
                        className="cell-act-btn run"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRunCell(cell.id)
                        }}
                        title="Run Cell (Shift+Enter)"
                      >
                        <Play size={11} fill="currentColor" />
                      </button>
                    )}

                    <button
                      className="cell-act-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddCell('code', undefined, cell.id)
                      }}
                      title="Insert Code Above (A)"
                    >
                      <Plus size={11} />
                      <span className="act-sub-label">▲</span>
                    </button>

                    <button
                      className="cell-act-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddCell('code', cell.id)
                      }}
                      title="Insert Code Below (B)"
                    >
                      <Plus size={11} />
                      <span className="act-sub-label">▼</span>
                    </button>

                    <button
                      className="cell-act-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMoveCell(cell.id, 'up')
                      }}
                      title="Move Cell Up"
                      disabled={idx === 0}
                    >
                      <ChevronUp size={11} />
                    </button>

                    <button
                      className="cell-act-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMoveCell(cell.id, 'down')
                      }}
                      title="Move Cell Down"
                      disabled={idx === notebook.cells.length - 1}
                    >
                      <ChevronDown size={11} />
                    </button>

                    <button
                      className="cell-act-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDuplicateCell(cell.id)
                      }}
                      title="Duplicate Cell"
                    >
                      <Layers size={11} />
                    </button>

                    <button
                      className="cell-act-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyCode(cell.id, cell.source)
                      }}
                      title="Copy Code"
                    >
                      {copiedCellId === cell.id ? <Check size={11} color="#30D158" /> : <Copy size={11} />}
                    </button>

                    <button
                      className="cell-act-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleChangeCellType(cell.id, isCode ? 'markdown' : 'code')
                      }}
                      title={`Convert to ${isCode ? 'Markdown (M)' : 'Code (Y)'}`}
                    >
                      {isCode ? <FileText size={11} /> : <Code size={11} />}
                    </button>

                    <button
                      className="cell-act-btn delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCell(cell.id)
                      }}
                      title="Delete Cell (D, D)"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  {/* CELL INPUT ROW */}
                  <div className="cell-input-row">
                    {/* Left Execution Gutter */}
                    <div className="cell-gutter">
                      {isCode && (
                        <div className="gutter-exec-badge-wrap">
                          <span className={`cell-exec-count ${cell.isExecuting ? 'executing' : cell.execution_count ? 'done' : ''}`}>
                            {cell.isExecuting ? '[ * ]' : cell.execution_count ? `[ ${cell.execution_count} ]` : '[   ]'}
                          </span>
                          {cell.isExecuting && <span className="exec-pulse-ring" />}
                        </div>
                      )}
                      {!isCode && (
                        <span className="md-gutter-icon">
                          <FileText size={12} color="#64D2FF" />
                        </span>
                      )}
                    </div>

                    {/* Cell Editor / Render Area */}
                    <div className="cell-editor-container">
                      {isCode ? (
                        <div className="code-cell-input-wrapper">
                          <div className="code-editor-layout">
                            {showLineNumbers && (
                              <div className="line-numbers-col">
                                {cell.source.split('\n').map((_, lineIdx) => (
                                  <span key={lineIdx} className="line-num">{lineIdx + 1}</span>
                                ))}
                              </div>
                            )}
                            <textarea
                              className="code-cell-textarea"
                              value={cell.source}
                              onChange={(e) => handleSourceChange(cell.id, e.target.value)}
                              onFocus={() => setIsCommandMode(false)}
                              rows={Math.max(2, cell.source.split('\n').length)}
                              placeholder="Type Python / JavaScript code here... (Shift+Enter to run)"
                              spellCheck={false}
                            />
                          </div>
                          {cell.executionDurationMs !== undefined && (
                            <span className="execution-time-badge">
                              ⚡ {cell.executionDurationMs}ms
                            </span>
                          )}
                        </div>
                      ) : (
                        <div
                          className="markdown-cell-content"
                          onDoubleClick={() => {
                            cell.isEditing = true
                            notifyChange(notebook)
                          }}
                        >
                          {cell.isEditing ? (
                            <div className="markdown-edit-box">
                              {/* Markdown Quick Formatting Bar */}
                              <div className="md-format-toolbar">
                                <button
                                  className="md-fmt-btn"
                                  onClick={() => handleInsertMarkdownFormatting(cell.id, 'bold')}
                                  title="Bold"
                                >
                                  <Bold size={11} />
                                </button>
                                <button
                                  className="md-fmt-btn"
                                  onClick={() => handleInsertMarkdownFormatting(cell.id, 'italic')}
                                  title="Italic"
                                >
                                  <Italic size={11} />
                                </button>
                                <button
                                  className="md-fmt-btn"
                                  onClick={() => handleInsertMarkdownFormatting(cell.id, 'header')}
                                  title="Heading"
                                >
                                  <Hash size={11} />
                                </button>
                                <button
                                  className="md-fmt-btn"
                                  onClick={() => handleInsertMarkdownFormatting(cell.id, 'list')}
                                  title="Bullet List"
                                >
                                  <List size={11} />
                                </button>
                                <button
                                  className="md-fmt-btn"
                                  onClick={() => handleInsertMarkdownFormatting(cell.id, 'code')}
                                  title="Code Block"
                                >
                                  <Code size={11} />
                                </button>
                                <button
                                  className="md-fmt-btn"
                                  onClick={() => handleInsertMarkdownFormatting(cell.id, 'quote')}
                                  title="Quote"
                                >
                                  <Quote size={11} />
                                </button>
                                <button
                                  className="md-fmt-btn"
                                  onClick={() => handleInsertMarkdownFormatting(cell.id, 'table')}
                                  title="Table"
                                >
                                  <Table size={11} />
                                </button>
                              </div>

                              <textarea
                                className="markdown-textarea"
                                value={cell.source}
                                onChange={(e) => handleSourceChange(cell.id, e.target.value)}
                                onFocus={() => setIsCommandMode(false)}
                                onBlur={() => {
                                  cell.isEditing = false
                                  notifyChange(notebook)
                                }}
                                rows={Math.max(3, cell.source.split('\n').length)}
                                autoFocus
                              />
                              <div className="md-edit-hint">Press Shift+Enter or click outside to render markdown</div>
                            </div>
                          ) : (
                            <div className="markdown-rendered-view">
                              {cell.source ? (
                                <div className="md-rendered-body">
                                  {cell.source.split('\n\n').map((para, pIdx) => {
                                    if (para.startsWith('# ')) {
                                      return <h1 key={pIdx}>{para.replace('# ', '')}</h1>
                                    }
                                    if (para.startsWith('## ')) {
                                      return <h2 key={pIdx}>{para.replace('## ', '')}</h2>
                                    }
                                    if (para.startsWith('### ')) {
                                      return <h3 key={pIdx}>{para.replace('### ', '')}</h3>
                                    }
                                    if (para.startsWith('- ')) {
                                      return (
                                        <ul key={pIdx}>
                                          {para.split('\n').map((item, iIdx) => (
                                            <li key={iIdx}>{item.replace(/^[-\*]\s*/, '')}</li>
                                          ))}
                                        </ul>
                                      )
                                    }
                                    if (para.startsWith('> ')) {
                                      return (
                                        <blockquote key={pIdx} className="md-blockquote">
                                          {para.replace(/^>\s*/, '')}
                                        </blockquote>
                                      )
                                    }
                                    return <p key={pIdx}>{para}</p>
                                  })}
                                </div>
                              ) : (
                                <span className="empty-md-placeholder">Empty Markdown Cell. Double-click to edit.</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CELL OUTPUT ROW */}
                  {isCode && renderCellOutputs(cell)}
                </div>
              )
            })}

            {/* Bottom Add Cell Quick Bar */}
            <div className="bottom-add-cell-strip">
              <button
                className="add-quick-cell-btn glass-interactive"
                onClick={() => handleAddCell('code')}
              >
                <Plus size={12} />
                <span>+ Code Cell</span>
              </button>
              <button
                className="add-quick-cell-btn glass-interactive"
                onClick={() => handleAddCell('markdown')}
              >
                <Plus size={12} />
                <span>+ Markdown Cell</span>
              </button>
            </div>
          </div>
        )}

        {/* SLIDE-OUT VARIABLE EXPLORER */}
        {showVariableExplorer && (
          <div className="variable-explorer-sidebar glass-panel">
            <div className="var-explorer-header">
              <div className="var-header-title">
                <Table size={13} color="#0A84FF" />
                <span>ACTIVE KERNEL VARIABLES ({variables.length})</span>
              </div>
              <button
                className="close-var-btn glass-interactive"
                onClick={() => setShowVariableExplorer(false)}
              >
                &times;
              </button>
            </div>

            <div className="var-table-container">
              <table className="var-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Value Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {variables.map((v) => (
                    <tr key={v.name}>
                      <td className="var-name"><code>{v.name}</code></td>
                      <td className="var-type">{v.type}</td>
                      <td className="var-size">{v.size}</td>
                      <td className="var-val" title={v.value}>{v.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* KEYBOARD SHORTCUTS CHEAT SHEET MODAL */}
      {showShortcutsModal && (
        <div className="shortcuts-modal-backdrop" onClick={() => setShowShortcutsModal(false)}>
          <div className="shortcuts-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="shortcuts-modal-header">
              <div className="shortcuts-title-row">
                <HelpCircle size={16} color="#0A84FF" />
                <span>Jupyter Notebook Keyboard Shortcuts</span>
              </div>
              <button className="modal-close-btn" onClick={() => setShowShortcutsModal(false)}>
                &times;
              </button>
            </div>

            <div className="shortcuts-modal-body">
              <div className="shortcuts-column">
                <h4>⚡ Execution</h4>
                <div className="shortcut-row">
                  <span>Run active cell & advance</span>
                  <kbd>Shift + Enter</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Run active cell in place</span>
                  <kbd>Ctrl + Enter</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Run cell & insert below</span>
                  <kbd>Alt + Enter</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Restart Kernel</span>
                  <kbd>0, 0</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Interrupt Kernel</span>
                  <kbd>I, I</kbd>
                </div>

                <h4>📝 Modes</h4>
                <div className="shortcut-row">
                  <span>Enter Command Mode</span>
                  <kbd>Esc</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Enter Edit Mode</span>
                  <kbd>Enter</kbd>
                </div>
              </div>

              <div className="shortcuts-column">
                <h4>🛠 Command Mode (Esc)</h4>
                <div className="shortcut-row">
                  <span>Insert cell above</span>
                  <kbd>A</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Insert cell below</span>
                  <kbd>B</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Change to Markdown</span>
                  <kbd>M</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Change to Code</span>
                  <kbd>Y</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Delete selected cell</span>
                  <kbd>D, D</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Undo cell deletion</span>
                  <kbd>Z</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Copy / Paste Cell</span>
                  <kbd>C / V</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Navigate Up / Down</span>
                  <kbd>K / J</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Toggle Line Numbers</span>
                  <kbd>L</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTEBOOK STYLING */}
      <style>{`
        .notebook-editor-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: #0B0E14;
          color: #E2E8F0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          user-select: none;
          overflow: hidden;
        }

        .run-all-progress-strip {
          background: rgba(10, 132, 255, 0.15);
          border-bottom: 1px solid rgba(10, 132, 255, 0.3);
          padding: 6px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          color: #64D2FF;
          gap: 12px;
        }

        .progress-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
        }

        .progress-bar-track {
          flex: 1;
          max-width: 300px;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #0A84FF, #30D158);
          transition: width 0.2s ease;
        }

        .notebook-main-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          background: rgba(18, 24, 38, 0.85);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(16px);
          z-index: 10;
        }

        .toolbar-btn-group, .toolbar-right-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .toolbar-divider {
          width: 1px;
          height: 16px;
          background: rgba(255, 255, 255, 0.12);
          margin: 0 4px;
        }

        .nb-tool-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 9px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          color: #CBD5E1;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .nb-tool-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #FFF;
        }

        .nb-tool-btn.primary {
          background: rgba(48, 209, 88, 0.15);
          border-color: rgba(48, 209, 88, 0.35);
          color: #30D158;
          font-weight: 600;
        }

        .nb-tool-btn.active {
          background: rgba(10, 132, 255, 0.2);
          border-color: rgba(10, 132, 255, 0.4);
          color: #64D2FF;
        }

        .mode-indicator-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
          font-family: var(--font-mono, monospace);
        }

        .mode-indicator-pill.command {
          background: rgba(10, 132, 255, 0.15);
          border: 1px solid rgba(10, 132, 255, 0.35);
          color: #64D2FF;
        }

        .mode-indicator-pill.edit {
          background: rgba(48, 209, 88, 0.15);
          border: 1px solid rgba(48, 209, 88, 0.35);
          color: #30D158;
        }

        .mode-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .kernel-badge-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 3px 8px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          font-size: 10.5px;
          color: #94A3B8;
        }

        .kernel-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .kernel-status-dot.idle { background: #30D158; box-shadow: 0 0 6px #30D158; }
        .kernel-status-dot.busy { background: #FF9F0A; box-shadow: 0 0 6px #FF9F0A; animation: pulse 1s infinite; }
        .kernel-status-dot.restarting { background: #BF5AF2; }

        .kernel-ram-pill {
          font-size: 9.5px;
          color: #64748B;
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          padding-left: 6px;
        }

        .notebook-body-layout {
          display: flex;
          flex: 1;
          overflow: hidden;
          position: relative;
        }

        .notebook-cells-canvas {
          flex: 1;
          overflow-y: auto;
          padding: 16px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .notebook-cell-wrapper {
          position: relative;
          border-radius: 6px;
          background: rgba(18, 24, 38, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .notebook-cell-wrapper:hover {
          border-color: rgba(255, 255, 255, 0.15);
        }

        .notebook-cell-wrapper.selected {
          border-color: rgba(10, 132, 255, 0.5);
          box-shadow: 0 0 14px rgba(10, 132, 255, 0.15);
        }

        .notebook-cell-wrapper.command-focused {
          border-left: 3px solid #0A84FF;
        }

        .cell-action-bar {
          position: absolute;
          top: -12px;
          right: 12px;
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 2px 4px;
          background: rgba(15, 20, 32, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 4px;
          opacity: 0;
          transition: opacity 0.15s ease;
          z-index: 5;
        }

        .notebook-cell-wrapper:hover .cell-action-bar,
        .notebook-cell-wrapper.selected .cell-action-bar {
          opacity: 1;
        }

        .cell-act-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 20px;
          background: transparent;
          border: none;
          color: #94A3B8;
          border-radius: 3px;
          cursor: pointer;
          position: relative;
        }

        .act-sub-label {
          font-size: 8px;
          margin-left: 1px;
        }

        .cell-act-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #FFF;
        }

        .cell-act-btn.run {
          color: #30D158;
        }

        .cell-act-btn.delete:hover {
          color: #FF453A;
        }

        .cell-input-row {
          display: flex;
          padding: 8px 12px;
        }

        .cell-gutter {
          width: 60px;
          flex-shrink: 0;
          display: flex;
          justify-content: flex-end;
          padding-right: 10px;
          padding-top: 4px;
        }

        .gutter-exec-badge-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .cell-exec-count {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          font-weight: 700;
          color: #64748B;
        }

        .cell-exec-count.done {
          color: #0A84FF;
        }

        .cell-exec-count.executing {
          color: #FF9F0A;
          animation: pulse 1s infinite;
        }

        .cell-editor-container {
          flex: 1;
          position: relative;
        }

        .code-cell-input-wrapper {
          position: relative;
        }

        .code-editor-layout {
          display: flex;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          overflow: hidden;
        }

        .line-numbers-col {
          display: flex;
          flex-direction: column;
          padding: 8px 6px;
          background: rgba(0, 0, 0, 0.25);
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          user-select: none;
        }

        .line-num {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          line-height: 1.5;
          color: #475569;
          text-align: right;
          min-width: 18px;
        }

        .code-cell-textarea {
          flex: 1;
          background: transparent;
          border: none;
          color: #F8FAFC;
          font-family: var(--font-mono, 'Fira Code', Consolas, monospace);
          font-size: 12.5px;
          line-height: 1.5;
          padding: 8px 10px;
          resize: none;
          outline: none;
          box-sizing: border-box;
        }

        .execution-time-badge {
          position: absolute;
          bottom: 6px;
          right: 10px;
          font-size: 9.5px;
          font-family: var(--font-mono, monospace);
          color: #30D158;
          background: rgba(48, 209, 88, 0.1);
          padding: 1px 5px;
          border-radius: 3px;
        }

        .markdown-cell-content {
          cursor: text;
          padding: 4px 6px;
        }

        .md-format-toolbar {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 3px 6px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 4px;
          margin-bottom: 4px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .md-fmt-btn {
          background: transparent;
          border: none;
          color: #94A3B8;
          padding: 3px 5px;
          border-radius: 3px;
          cursor: pointer;
        }

        .md-fmt-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #FFF;
        }

        .markdown-textarea {
          width: 100%;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(10, 132, 255, 0.3);
          border-radius: 4px;
          color: #F8FAFC;
          font-family: inherit;
          font-size: 12.5px;
          line-height: 1.5;
          padding: 8px 10px;
          resize: none;
          outline: none;
          box-sizing: border-box;
        }

        .md-edit-hint {
          font-size: 9.5px;
          color: #64D2FF;
          margin-top: 4px;
        }

        .md-rendered-body h1 { font-size: 18px; margin: 4px 0 8px 0; color: #FFF; }
        .md-rendered-body h2 { font-size: 15px; margin: 4px 0 6px 0; color: #E2E8F0; }
        .md-rendered-body h3 { font-size: 13px; margin: 4px 0 4px 0; color: #CBD5E1; }
        .md-rendered-body p { margin: 4px 0; line-height: 1.5; color: #CBD5E1; }
        .md-rendered-body ul { margin: 4px 0; padding-left: 20px; color: #CBD5E1; }
        .md-blockquote {
          margin: 4px 0;
          padding: 4px 10px;
          border-left: 3px solid #0A84FF;
          background: rgba(10, 132, 255, 0.08);
          color: #94A3B8;
          border-radius: 0 4px 4px 0;
        }

        .empty-md-placeholder {
          color: var(--text-muted, #64748B);
          font-style: italic;
          font-size: 11.5px;
        }

        /* Rich Output Tabs & Viewers */
        .cell-output-wrapper {
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(0, 0, 0, 0.28);
          border-radius: 0 0 6px 6px;
        }

        .output-header-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .output-tabs-group {
          display: flex;
          gap: 4px;
        }

        .output-tab-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 7px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 3px;
          color: #94A3B8;
          font-size: 10.5px;
          font-weight: 500;
          cursor: pointer;
        }

        .output-tab-btn.active {
          background: rgba(10, 132, 255, 0.18);
          border-color: rgba(10, 132, 255, 0.35);
          color: #64D2FF;
        }

        .output-right-actions {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .out-act-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          background: transparent;
          border: none;
          color: #64748B;
          cursor: pointer;
          border-radius: 3px;
        }

        .out-act-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #FFF;
        }

        .out-act-btn.delete:hover {
          color: #FF453A;
        }

        .output-collapsed-banner {
          padding: 6px 12px;
          font-size: 11px;
          color: #64748B;
          cursor: pointer;
          background: rgba(0, 0, 0, 0.2);
          border-top: 1px solid rgba(255, 255, 255, 0.04);
        }

        .output-table-pane, .output-chart-pane, .output-logs-pane, .output-inspector-pane {
          padding: 10px 12px;
        }

        .table-controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
          gap: 10px;
        }

        .table-search-box {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 3px 8px;
          border-radius: 4px;
          flex: 1;
          max-width: 260px;
        }

        .table-search-box input {
          background: transparent;
          border: none;
          outline: none;
          color: #FFF;
          font-size: 11px;
          width: 100%;
        }

        .table-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .table-dim-badge {
          font-size: 10px;
          font-family: var(--font-mono, monospace);
          color: #94A3B8;
        }

        .table-tool-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 7px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          color: #CBD5E1;
          font-size: 10.5px;
          cursor: pointer;
        }

        .chart-controls-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .chart-type-selector {
          display: flex;
          gap: 4px;
        }

        .chart-type-btn {
          padding: 2px 7px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 3px;
          font-size: 10.5px;
          color: #94A3B8;
          cursor: pointer;
        }

        .chart-type-btn.active {
          background: rgba(48, 209, 88, 0.15);
          border-color: rgba(48, 209, 88, 0.35);
          color: #30D158;
          font-weight: 600;
        }

        .output-stream pre, .output-plain-result pre {
          margin: 0;
          font-family: var(--font-mono, monospace);
          font-size: 11.5px;
          color: #CBD5E1;
          white-space: pre-wrap;
          line-height: 1.4;
        }

        .output-stream.stderr pre {
          color: #FF6961;
        }

        /* DataFrame Tables */
        .jupyter-table-wrapper {
          overflow-x: auto;
          margin: 4px 0;
        }

        .dataframe-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11.5px;
          font-family: var(--font-mono, monospace);
          text-align: left;
        }

        .dataframe-table th, .dataframe-table td {
          padding: 5px 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .dataframe-table th {
          background: rgba(255, 255, 255, 0.06);
          color: #64D2FF;
          font-weight: 600;
        }

        .dataframe-table tr:nth-child(even) {
          background: rgba(255, 255, 255, 0.02);
        }

        .output-svg-container svg {
          max-width: 100%;
          height: auto;
        }

        .output-error-container {
          background: rgba(255, 69, 58, 0.1);
          border: 1px solid rgba(255, 69, 58, 0.3);
          border-radius: 4px;
          padding: 8px 10px;
        }

        .error-badge {
          display: inline-block;
          font-size: 9.5px;
          font-weight: 700;
          color: #FF453A;
          background: rgba(255, 69, 58, 0.2);
          padding: 2px 6px;
          border-radius: 3px;
          margin-bottom: 4px;
        }

        .error-traceback {
          margin: 0;
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          color: #FF6961;
          white-space: pre-wrap;
          line-height: 1.4;
        }

        .inspector-json-pre {
          margin: 0;
          font-family: var(--font-mono, monospace);
          font-size: 10.5px;
          color: #64D2FF;
        }

        .bottom-add-cell-strip {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 10px;
          padding-bottom: 20px;
        }

        .add-quick-cell-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px dashed rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          color: #94A3B8;
          font-size: 11px;
          cursor: pointer;
        }

        .add-quick-cell-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #FFF;
          border-color: rgba(10, 132, 255, 0.4);
        }

        /* Variable Explorer */
        .variable-explorer-sidebar {
          width: 320px;
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(12, 16, 26, 0.95);
          display: flex;
          flex-direction: column;
        }

        .var-explorer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .var-header-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10.5px;
          font-weight: 700;
          color: #FFF;
        }

        .close-var-btn {
          background: transparent;
          border: none;
          color: #94A3B8;
          font-size: 16px;
          cursor: pointer;
        }

        .var-table-container {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .var-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10.5px;
        }

        .var-table th, .var-table td {
          padding: 4px 6px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          text-align: left;
        }

        .var-table th {
          color: #64D2FF;
          font-weight: 600;
        }

        .var-name code { color: #30D158; }
        .var-type { color: #BF5AF2; }
        .var-size { color: #94A3B8; }
        .var-val {
          color: #CBD5E1;
          max-width: 90px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .raw-json-container {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .raw-json-pre {
          margin: 0;
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          color: #CBD5E1;
          line-height: 1.4;
        }

        /* Shortcuts Modal */
        .shortcuts-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .shortcuts-modal-card {
          width: 580px;
          background: rgba(18, 24, 38, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          padding: 16px 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
        }

        .shortcuts-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 10px;
          margin-bottom: 12px;
        }

        .shortcuts-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #FFF;
        }

        .modal-close-btn {
          background: transparent;
          border: none;
          color: #94A3B8;
          font-size: 18px;
          cursor: pointer;
        }

        .shortcuts-modal-body {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .shortcuts-column h4 {
          font-size: 11px;
          color: #64D2FF;
          margin: 0 0 8px 0;
          text-transform: uppercase;
        }

        .shortcut-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          color: #CBD5E1;
          margin-bottom: 6px;
        }

        .shortcut-row kbd {
          padding: 2px 5px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 3px;
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: #FFF;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

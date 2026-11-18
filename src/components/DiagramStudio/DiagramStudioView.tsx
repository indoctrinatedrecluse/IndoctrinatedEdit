import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  Share2,
  Copy,
  Check,
  Sparkles,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Code2,
  GitFork,
  AlertOctagon,
  FileQuestion,
  Filter,
} from 'lucide-react'
import { previewService } from '../../services/previewService'
import {
  diagramStudioService,
  DiagramTemplate,
} from '../../services/diagramStudioService'
import {
  architectureGraphService,
  ArchitectureGraph,
  DependencyNode,
} from '../../services/architectureGraphService'
import { sanitizeSvg } from '../../utils/security'
import './DiagramStudioView.css'

interface DiagramStudioViewProps {
  activeFileName?: string
  activeFileContent?: string
  workspaceRoot?: string
  onOpenFile?: (filePath: string) => void
}

type StudioMode = 'mermaid' | 'depgraph'

export const DiagramStudioView: React.FC<DiagramStudioViewProps> = ({
  activeFileName = 'App.tsx',
  activeFileContent = '',
  workspaceRoot,
  onOpenFile,
}) => {
  const [studioMode, setStudioMode] = useState<StudioMode>('depgraph')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('arch_microservices')
  const [mermaidCode, setMermaidCode] = useState<string>(() => {
    return diagramStudioService.getTemplate('arch_microservices')?.mermaidCode || ''
  })
  const [diagramSvg, setDiagramSvg] = useState<string>('')
  const [zoomLevel, setZoomLevel] = useState<number>(1.0)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual')

  // Dependency Graph State (live workspace scan when workspaceRoot is available)
  const [graphData, setGraphData] = useState<ArchitectureGraph>(() =>
    architectureGraphService.generateSampleGraph()
  )
  const [isLiveWorkspaceGraph, setIsLiveWorkspaceGraph] = useState<boolean>(false)
  const [isScanningGraph, setIsScanningGraph] = useState<boolean>(false)
  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(null)
  const [filterQuery, setFilterQuery] = useState<string>('')
  const [highlightCircular, setHighlightCircular] = useState<boolean>(true)
  const [nodeFullPaths, setNodeFullPaths] = useState<Record<string, string>>({})

  const containerRef = useRef<HTMLDivElement>(null)

  const handleScanWorkspaceGraph = async () => {
    if (!workspaceRoot || !window.electronAPI?.workspace?.findFiles || !window.electronAPI?.readFile) {
      return
    }
    setIsScanningGraph(true)
    try {
      const files = await window.electronAPI.workspace.findFiles({
        rootDir: workspaceRoot,
        maxDepth: 6,
        maxFiles: 120,
        includeExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py'],
      })
      const fileContents: Record<string, string> = {}
      const fullPathMap: Record<string, string> = {}
      for (const f of files.slice(0, 90)) {
        try {
          const content = await window.electronAPI.readFile(f.path)
          const key = f.relativePath.replace(/\\/g, '/')
          fileContents[key] = content
          fullPathMap[key] = f.path
        } catch {
          // skip unreadable files
        }
      }
      if (Object.keys(fileContents).length > 0) {
        const built = architectureGraphService.buildDependencyGraph(fileContents)
        setGraphData(built)
        setNodeFullPaths(fullPathMap)
        setIsLiveWorkspaceGraph(true)
        setSelectedNode(null)
      }
    } finally {
      setIsScanningGraph(false)
    }
  }

  useEffect(() => {
    if (workspaceRoot && window.electronAPI?.workspace?.findFiles) {
      handleScanWorkspaceGraph()
    }
  }, [workspaceRoot])

  const templates = useMemo(() => {
    return diagramStudioService.getTemplates()
  }, [])

  // Render diagram on code change
  useEffect(() => {
    if (!mermaidCode.trim()) {
      setDiagramSvg('')
      return
    }

    const firstLine = mermaidCode.split('\n')[0].trim().toLowerCase()
    let type: 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'gantt' | 'git' | 'generic' = 'generic'
    if (firstLine.startsWith('graph') || firstLine.startsWith('flowchart')) type = 'flowchart'
    else if (firstLine.startsWith('sequence')) type = 'sequence'
    else if (firstLine.startsWith('class')) type = 'class'
    else if (firstLine.startsWith('er')) type = 'er'
    else if (firstLine.startsWith('state')) type = 'state'
    else if (firstLine.startsWith('git')) type = 'git'

    const svg = previewService.generateMermaidSvg(mermaidCode, type)
    setDiagramSvg(svg)
  }, [mermaidCode])

  const handleSelectTemplate = (template: DiagramTemplate) => {
    setSelectedTemplateId(template.id)
    setMermaidCode(template.mermaidCode)
    setZoomLevel(1.0)
  }

  const handleGenerateFromActiveFile = () => {
    const generated = diagramStudioService.generateDiagramFromCode(activeFileName, activeFileContent)
    setMermaidCode(generated)
    setSelectedTemplateId('custom_generated')
  }

  const handleDownloadSvg = () => {
    if (studioMode === 'mermaid') {
      if (!diagramSvg) return
      const blob = new Blob([diagramSvg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `architecture_diagram_${Date.now()}.svg`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const svgEl = containerRef.current?.querySelector('svg')
      if (!svgEl) return
      const serializer = new XMLSerializer()
      const svgStr = serializer.serializeToString(svgEl)
      const blob = new Blob([svgStr], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dependency_graph_${Date.now()}.svg`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1800)
  }

  const filteredNodes = useMemo(() => {
    if (!filterQuery.trim()) return graphData.nodes
    const q = filterQuery.toLowerCase()
    return graphData.nodes.filter((n) => n.label.toLowerCase().includes(q) || n.path.toLowerCase().includes(q))
  }, [graphData.nodes, filterQuery])

  return (
    <div className="diagram-studio-root">
      {/* Top Studio Switcher Strip */}
      <div className="diagram-mode-strip">
        <button
          className={`mode-tab-btn glass-interactive ${studioMode === 'depgraph' ? 'active' : ''}`}
          onClick={() => setStudioMode('depgraph')}
        >
          <GitFork size={12} />
          <span>Module Flow & Dependency Radar</span>
          {graphData.circularLoops.length > 0 && (
            <span className="cycle-badge">{graphData.circularLoops.length} Loops</span>
          )}
        </button>

        <button
          className={`mode-tab-btn glass-interactive ${studioMode === 'mermaid' ? 'active' : ''}`}
          onClick={() => setStudioMode('mermaid')}
        >
          <Share2 size={12} />
          <span>Mermaid Architecture Studio</span>
        </button>
      </div>

      {studioMode === 'mermaid' ? (
        <>
          {/* Template Strip */}
          <div
            className="diagram-template-strip"
            onWheel={(e) => {
              e.currentTarget.scrollLeft += e.deltaY
            }}
          >
            {templates.map((t) => (
              <button
                key={t.id}
                className={`template-chip glass-interactive ${selectedTemplateId === t.id ? 'active' : ''}`}
                onClick={() => handleSelectTemplate(t)}
                title={t.description}
              >
                <Share2 size={11} />
                <span>{t.name}</span>
              </button>
            ))}

            <button
              className="auto-gen-chip glass-interactive"
              onClick={handleGenerateFromActiveFile}
              title="Auto-generate diagram from active code editor file"
            >
              <Sparkles size={11} />
              <span>From Active File</span>
            </button>
          </div>

          {/* Canvas Controls Bar */}
          <div className="canvas-controls-bar">
            <div className="controls-left">
              <button
                className={`view-toggle-btn glass-interactive ${activeTab === 'visual' ? 'active' : ''}`}
                onClick={() => setActiveTab('visual')}
              >
                Visual Canvas
              </button>
              <button
                className={`view-toggle-btn glass-interactive ${activeTab === 'code' ? 'active' : ''}`}
                onClick={() => setActiveTab('code')}
              >
                <Code2 size={11} />
                <span>DSL Code</span>
              </button>
            </div>

            <div className="controls-right">
              <button
                className="ctrl-icon-btn glass-interactive"
                onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 2.5))}
                title="Zoom In"
              >
                <ZoomIn size={12} />
              </button>
              <button
                className="ctrl-icon-btn glass-interactive"
                onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.4))}
                title="Zoom Out"
              >
                <ZoomOut size={12} />
              </button>
              <button
                className="ctrl-icon-btn glass-interactive"
                onClick={() => setZoomLevel(1.0)}
                title="Reset Zoom"
              >
                <RotateCcw size={12} />
              </button>
              <button
                className="ctrl-icon-btn glass-interactive"
                onClick={handleDownloadSvg}
                title="Export SVG"
              >
                <Download size={12} />
              </button>
              <button
                className="ctrl-icon-btn glass-interactive"
                onClick={() => copyToClipboard(mermaidCode, 'mermaid_copy')}
                title="Copy Mermaid Code"
              >
                {copiedKey === 'mermaid_copy' ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          {/* Main Display Area */}
          <div className="diagram-main-display">
            {activeTab === 'visual' ? (
              <div className="visual-canvas-wrap" ref={containerRef}>
                {diagramSvg ? (
                  <div
                    className="rendered-svg-stage"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                    dangerouslySetInnerHTML={{ __html: sanitizeSvg(diagramSvg) }}
                  />
                ) : (
                  <div className="empty-state">Loading visual architecture diagram...</div>
                )}
              </div>
            ) : (
              <div className="dsl-editor-wrap">
                <textarea
                  value={mermaidCode}
                  onChange={(e) => setMermaidCode(e.target.value)}
                  className="dsl-code-textarea"
                  placeholder="Enter Mermaid.js diagram definition (graph TD, sequenceDiagram, erDiagram)..."
                />
              </div>
            )}
          </div>
        </>
      ) : (
        /* DEPENDENCY FLOW GRAPH VIEW */
        <div className="depgraph-main-container">
          {/* Metrics Summary Strip */}
          <div className="depgraph-metrics-strip glass-panel">
            <div className="dep-metric">
              <span className="metric-label">Modules:</span>
              <span className="metric-val">{graphData.metrics.totalFiles}</span>
            </div>
            <div className="dep-metric">
              <span className="metric-label">Imports:</span>
              <span className="metric-val">{graphData.metrics.totalDependencies}</span>
            </div>
            <div className="dep-metric">
              <span className="metric-label">Max Depth:</span>
              <span className="metric-val">{graphData.metrics.maxDepth}</span>
            </div>
            <div className="dep-metric">
              <span className="metric-label">Coupling:</span>
              <span className="metric-val">{graphData.metrics.cyclomaticCoupling}</span>
            </div>
            {graphData.orphans.length > 0 && (
              <div className="dep-metric orphan-pill" title="Unimported dead files">
                <FileQuestion size={11} />
                <span>{graphData.orphans.length} Orphans</span>
              </div>
            )}
          </div>

          {/* Filter & Controls Bar */}
          <div className="depgraph-controls-bar">
            <div className="dep-search-wrap">
              <Filter size={11} />
              <input
                type="text"
                className="dep-filter-input"
                placeholder="Filter module nodes..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
            </div>

            <div className="dep-toggles">
              {workspaceRoot && (
                <button
                  className="cycle-toggle-btn active"
                  onClick={handleScanWorkspaceGraph}
                  disabled={isScanningGraph}
                  title="Scan real workspace module imports"
                >
                  <Sparkles size={11} />
                  <span>{isScanningGraph ? 'Scanning...' : isLiveWorkspaceGraph ? 'LIVE · Rescan' : 'Scan Workspace'}</span>
                </button>
              )}
              <button
                className={`cycle-toggle-btn ${highlightCircular ? 'active' : ''}`}
                onClick={() => setHighlightCircular(!highlightCircular)}
              >
                <AlertOctagon size={11} />
                <span>Cycles</span>
              </button>
              <button
                className="ctrl-icon-btn glass-interactive"
                onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 2.5))}
              >
                <ZoomIn size={12} />
              </button>
              <button
                className="ctrl-icon-btn glass-interactive"
                onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.4))}
              >
                <ZoomOut size={12} />
              </button>
              <button
                className="ctrl-icon-btn glass-interactive"
                onClick={handleDownloadSvg}
                title="Export Graph SVG"
              >
                <Download size={12} />
              </button>
            </div>
          </div>

          {/* Interactive Graph Canvas */}
          <div className="depgraph-canvas-area" ref={containerRef}>
            <svg
              className="depgraph-svg"
              width="700"
              height="550"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
            >
              <defs>
                <marker
                  id="arrow-default"
                  viewBox="0 0 10 10"
                  refX="16"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(100, 210, 255, 0.6)" />
                </marker>
                <marker
                  id="arrow-circular"
                  viewBox="0 0 10 10"
                  refX="16"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#FF453A" />
                </marker>
              </defs>

              {/* Edges (filtered so removed nodes never leave floating dangling edges) */}
              {(() => {
                const visibleIds = new Set(filteredNodes.map((n) => n.id))
                return graphData.edges
                  .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
                  .map((e) => {
                    const src = filteredNodes.find((n) => n.id === e.source)
                    const tgt = filteredNodes.find((n) => n.id === e.target)
                    if (!src || !tgt) return null
                    const isCycleEdge = highlightCircular && src.isCircular && tgt.isCircular

                    return (
                      <line
                        key={e.id}
                        x1={src.x}
                        y1={src.y}
                        x2={tgt.x}
                        y2={tgt.y}
                        stroke={isCycleEdge ? '#FF453A' : 'rgba(100, 210, 255, 0.35)'}
                        strokeWidth={isCycleEdge ? 2 : 1.2}
                        strokeDasharray={e.importType === 'type-only' ? '4,4' : undefined}
                        markerEnd={isCycleEdge ? 'url(#arrow-circular)' : 'url(#arrow-default)'}
                      />
                    )
                  })
              })()}

              {/* Nodes */}
              {filteredNodes.map((n) => {
                const isSelected = selectedNode?.id === n.id
                const isCircular = highlightCircular && n.isCircular

                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x}, ${n.y})`}
                    onClick={() => setSelectedNode(n)}
                    className="dep-node-group"
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      r={n.type === 'component' ? 18 : 14}
                      fill={
                        isCircular
                          ? 'rgba(255, 69, 58, 0.3)'
                          : n.isOrphan
                          ? 'rgba(255, 159, 10, 0.25)'
                          : 'rgba(10, 132, 255, 0.25)'
                      }
                      stroke={
                        isSelected
                          ? '#FFF'
                          : isCircular
                          ? '#FF453A'
                          : n.isOrphan
                          ? '#FF9F0A'
                          : '#0A84FF'
                      }
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                    <text
                      dy="28"
                      textAnchor="middle"
                      fill="#E2E8F0"
                      fontSize="9.5"
                      fontFamily="var(--font-mono)"
                    >
                      {n.label}
                    </text>
                  </g>
                )
              })}
            </svg>

            {/* Selected Node Inspector Drawer */}
            {selectedNode && (
              <div className="node-inspector-card glass-panel">
                <div className="inspector-header">
                  <span className="node-title">{selectedNode.label}</span>
                  <button className="close-inspect" onClick={() => setSelectedNode(null)}>
                    ✕
                  </button>
                </div>
                <div className="inspect-row">
                  <span className="i-label">Path:</span>
                  <span className="i-val">{selectedNode.path}</span>
                </div>
                <div className="inspect-row">
                  <span className="i-label">Type:</span>
                  <span className="i-val">{selectedNode.type.toUpperCase()}</span>
                </div>
                <div className="inspect-row">
                  <span className="i-label">Imports / Exports:</span>
                  <span className="i-val">
                    {selectedNode.outDegree} out / {selectedNode.inDegree} in
                  </span>
                </div>
                {selectedNode.isCircular && (
                  <div className="cycle-alert-row">
                    <AlertOctagon size={11} color="#FF453A" />
                    <span>Involved in Circular Dependency loop!</span>
                  </div>
                )}
                {selectedNode.isOrphan && (
                  <div className="orphan-alert-row">
                    <FileQuestion size={11} color="#FF9F0A" />
                    <span>Unreferenced / Orphan File (0 callers)</span>
                  </div>
                )}
                {onOpenFile && nodeFullPaths[selectedNode.path] && (
                  <button
                    className="cycle-toggle-btn active"
                    style={{ marginTop: '6px', width: '100%', justifyContent: 'center' }}
                    onClick={() => onOpenFile(nodeFullPaths[selectedNode.path])}
                  >
                    <Code2 size={11} />
                    <span>Open File in Editor</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

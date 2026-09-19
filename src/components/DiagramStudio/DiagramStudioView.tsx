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

interface DiagramStudioViewProps {
  activeFileName?: string
  activeFileContent?: string
}

type StudioMode = 'mermaid' | 'depgraph'

export const DiagramStudioView: React.FC<DiagramStudioViewProps> = ({
  activeFileName = 'App.tsx',
  activeFileContent = '',
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

  // Dependency Graph State
  const [graphData, _setGraphData] = useState<ArchitectureGraph>(() =>
    architectureGraphService.generateSampleGraph()
  )
  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(null)
  const [filterQuery, setFilterQuery] = useState<string>('')
  const [highlightCircular, setHighlightCircular] = useState<boolean>(true)

  const containerRef = useRef<HTMLDivElement>(null)

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
                    dangerouslySetInnerHTML={{ __html: diagramSvg }}
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

              {/* Edges */}
              {graphData.edges.map((e) => {
                const src = graphData.nodes.find((n) => n.id === e.source)
                const tgt = graphData.nodes.find((n) => n.id === e.target)
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
              })}

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
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .diagram-studio-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(10, 14, 24, 0.95);
          color: #E2E8F0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 0.78rem;
          overflow: hidden;
        }

        .diagram-mode-strip {
          display: flex;
          gap: 6px;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          overflow-x: auto;
          scrollbar-width: none;
        }

        .mode-tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          cursor: pointer;
        }

        .mode-tab-btn.active {
          color: #FFF;
          background: rgba(10, 132, 255, 0.25);
          border-color: rgba(10, 132, 255, 0.45);
          box-shadow: 0 0 8px rgba(10, 132, 255, 0.2);
        }

        .cycle-badge {
          background: rgba(255, 69, 58, 0.25);
          color: #FF453A;
          font-size: 9px;
          font-weight: 800;
          padding: 1px 5px;
          border-radius: 3px;
        }

        .diagram-template-strip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.25);
          overflow-x: auto;
          white-space: nowrap;
        }

        .template-chip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(235, 235, 245, 0.65);
          font-size: 0.68rem;
          cursor: pointer;
        }

        .template-chip.active {
          background: rgba(10, 132, 255, 0.2);
          border-color: rgba(10, 132, 255, 0.4);
          color: #64D2FF;
          font-weight: 600;
        }

        .auto-gen-chip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 4px;
          background: rgba(191, 90, 242, 0.15);
          border: 1px solid rgba(191, 90, 242, 0.35);
          color: #BF5AF2;
          font-size: 0.68rem;
          font-weight: 600;
          cursor: pointer;
        }

        .canvas-controls-bar, .depgraph-controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(0, 0, 0, 0.15);
        }

        .controls-left, .controls-right, .dep-toggles {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .view-toggle-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 6px;
          border-radius: 4px;
          background: transparent;
          border: 1px solid transparent;
          color: rgba(235, 235, 245, 0.6);
          font-size: 0.68rem;
          cursor: pointer;
        }

        .view-toggle-btn.active {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.14);
          color: #FFFFFF;
          font-weight: 600;
        }

        .ctrl-icon-btn {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(235, 235, 245, 0.7);
          border-radius: 4px;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .diagram-main-display {
          flex: 1;
          display: flex;
          overflow: hidden;
          position: relative;
        }

        .visual-canvas-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: auto;
          padding: 20px;
          background: #090C16;
          background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 0);
          background-size: 16px 16px;
        }

        .rendered-svg-stage {
          transition: transform 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rendered-svg-stage svg {
          max-width: 100%;
          height: auto;
        }

        .dsl-editor-wrap {
          flex: 1;
          display: flex;
        }

        .dsl-code-textarea {
          width: 100%;
          height: 100%;
          background: #080B14;
          border: none;
          color: #64D2FF;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.74rem;
          padding: 12px;
          outline: none;
          resize: none;
        }

        .depgraph-main-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .depgraph-metrics-strip {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 12px;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 10.5px;
        }

        .dep-metric {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .metric-label { color: var(--text-muted); }
        .metric-val { font-weight: 700; color: #FFF; font-family: var(--font-mono); }

        .orphan-pill {
          background: rgba(255, 159, 10, 0.2);
          color: #FF9F0A;
          padding: 1px 6px;
          border-radius: 3px;
          font-weight: 700;
        }

        .dep-search-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          padding: 2px 6px;
          flex: 1;
          max-width: 200px;
        }

        .dep-filter-input {
          background: transparent;
          border: none;
          outline: none;
          color: #FFF;
          font-size: 10.5px;
          width: 100%;
        }

        .cycle-toggle-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          padding: 2px 7px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-muted);
          cursor: pointer;
        }

        .cycle-toggle-btn.active {
          background: rgba(255, 69, 58, 0.25);
          border-color: rgba(255, 69, 58, 0.45);
          color: #FF453A;
        }

        .depgraph-canvas-area {
          flex: 1;
          overflow: auto;
          position: relative;
          background: #080B14;
          background-image: radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 0);
          background-size: 20px 20px;
          padding: 20px;
        }

        .node-inspector-card {
          position: absolute;
          bottom: 16px;
          right: 16px;
          width: 260px;
          padding: 10px;
          border-radius: 6px;
          background: rgba(15, 20, 32, 0.95);
          border: 1px solid rgba(10, 132, 255, 0.35);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .inspector-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 700;
          font-size: 11px;
          color: #64D2FF;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 4px;
        }

        .close-inspect {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }

        .inspect-row {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
        }

        .i-label { color: var(--text-muted); }
        .i-val { font-family: var(--font-mono); color: #FFF; }

        .cycle-alert-row, .orphan-alert-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 9.5px;
          font-weight: 700;
          padding: 4px;
          border-radius: 3px;
        }

        .cycle-alert-row { background: rgba(255, 69, 58, 0.15); color: #FF453A; }
        .orphan-alert-row { background: rgba(255, 159, 10, 0.15); color: #FF9F0A; }

        .empty-state {
          color: rgba(235, 235, 245, 0.4);
          font-size: 0.74rem;
        }
      `}</style>
    </div>
  )
}

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
} from 'lucide-react'
import { previewService } from '../../services/previewService'
import {
  diagramStudioService,
  DiagramTemplate,
} from '../../services/diagramStudioService'

interface DiagramStudioViewProps {
  activeFileName?: string
  activeFileContent?: string
}

export const DiagramStudioView: React.FC<DiagramStudioViewProps> = ({
  activeFileName = 'App.tsx',
  activeFileContent = '',
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('arch_microservices')
  const [mermaidCode, setMermaidCode] = useState<string>(() => {
    return diagramStudioService.getTemplate('arch_microservices')?.mermaidCode || ''
  })
  const [diagramSvg, setDiagramSvg] = useState<string>('')
  const [zoomLevel, setZoomLevel] = useState<number>(1.0)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual')

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
    if (!diagramSvg) return
    const blob = new Blob([diagramSvg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `architecture_diagram_${Date.now()}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1800)
  }

  return (
    <div className="diagram-studio-root">
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

        .canvas-controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(0, 0, 0, 0.15);
        }

        .controls-left, .controls-right {
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

        .empty-state {
          color: rgba(235, 235, 245, 0.4);
          font-size: 0.74rem;
        }
      `}</style>
    </div>
  )
}

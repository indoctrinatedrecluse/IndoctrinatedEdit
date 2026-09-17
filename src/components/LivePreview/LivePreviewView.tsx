import React, { useState, useEffect, useRef } from 'react'
import {
  FileText,
  Code,
  Laptop,
  Tablet,
  Smartphone,
  Monitor,
  Copy,
  Check,
} from 'lucide-react'
import { previewService, PreviewMetadata } from '../../services/previewService'

interface LivePreviewViewProps {
  activeFileName?: string
  activeFileContent?: string
  onClose?: () => void
  isDocked?: boolean
}

type ViewportMode = 'full' | 'desktop' | 'tablet' | 'mobile'

export const LivePreviewView: React.FC<LivePreviewViewProps> = ({
  activeFileName = 'README.md',
  activeFileContent = '',
}) => {
  const [previewType, setPreviewType] = useState<'markdown' | 'html' | 'unsupported'>('markdown')
  const [renderedHtml, setRenderedHtml] = useState<string>('')
  const [metadata, setMetadata] = useState<PreviewMetadata | null>(null)
  const [viewportMode, setViewportMode] = useState<ViewportMode>('full')
  const [copied, setCopied] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  // Update preview on content change
  useEffect(() => {
    const type = previewService.getPreviewType(activeFileName)
    setPreviewType(type)

    if (type === 'markdown') {
      const content = activeFileContent || sampleMarkdown
      const res = previewService.renderMarkdown(content)
      setRenderedHtml(res.html)
      setMetadata(res.metadata)
    } else if (type === 'html') {
      const content = activeFileContent || sampleHtml
      setRenderedHtml(content)
      setMetadata({
        type: 'html',
        title: activeFileName,
        wordCount: content.split(/\s+/).length,
        characterCount: content.length,
        mermaidDiagramsCount: 0,
        headingsCount: 0,
      })
    } else {
      // Fallback: render as markdown preview anyway for general text
      const content = activeFileContent || sampleMarkdown
      const res = previewService.renderMarkdown(content)
      setRenderedHtml(res.html)
      setMetadata(res.metadata)
    }
  }, [activeFileName, activeFileContent])

  const copyRenderedHtml = () => {
    navigator.clipboard.writeText(renderedHtml)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const getViewportWidth = (): string => {
    switch (viewportMode) {
      case 'desktop':
        return '1024px'
      case 'tablet':
        return '768px'
      case 'mobile':
        return '375px'
      default:
        return '100%'
    }
  }

  return (
    <div className="live-preview-root">
      {/* Top Preview Controls Toolbar */}
      <div className="preview-top-toolbar">
        <div className="preview-toolbar-left">
          <span className="file-preview-badge">
            {previewType === 'html' ? <Code size={12} /> : <FileText size={12} />}
            <span>{activeFileName}</span>
          </span>

          {metadata && (
            <div className="preview-stats-pills">
              <span className="stat-pill">{metadata.wordCount} words</span>
              {metadata.mermaidDiagramsCount > 0 && (
                <span className="stat-pill mermaid-pill">
                  📊 {metadata.mermaidDiagramsCount} Diagrams
                </span>
              )}
            </div>
          )}
        </div>

        <div className="preview-toolbar-right">
          {/* Viewport Switcher */}
          {previewType === 'html' && (
            <div className="viewport-switcher">
              <button
                className={`vp-btn ${viewportMode === 'full' ? 'active' : ''}`}
                onClick={() => setViewportMode('full')}
                title="Full Responsive Viewport"
              >
                <Monitor size={12} />
              </button>
              <button
                className={`vp-btn ${viewportMode === 'desktop' ? 'active' : ''}`}
                onClick={() => setViewportMode('desktop')}
                title="Laptop (1024px)"
              >
                <Laptop size={12} />
              </button>
              <button
                className={`vp-btn ${viewportMode === 'tablet' ? 'active' : ''}`}
                onClick={() => setViewportMode('tablet')}
                title="Tablet (768px)"
              >
                <Tablet size={12} />
              </button>
              <button
                className={`vp-btn ${viewportMode === 'mobile' ? 'active' : ''}`}
                onClick={() => setViewportMode('mobile')}
                title="Mobile (375px)"
              >
                <Smartphone size={12} />
              </button>
            </div>
          )}

          <button className="preview-tool-btn glass-interactive" onClick={copyRenderedHtml} title="Copy Rendered HTML">
            {copied ? <Check size={12} color="#30D158" /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* Main Preview Stage */}
      <div className="preview-stage-container">
        <div className="preview-viewport-wrapper" style={{ width: getViewportWidth() }}>
          {previewType === 'html' ? (
            <iframe
              ref={iframeRef}
              title="HTML Sandbox Preview"
              className="preview-iframe glass-panel"
              srcDoc={previewService.generateHtmlSandboxSrc(renderedHtml)}
              sandbox="allow-scripts allow-modals allow-forms"
            />
          ) : (
            <div
              className="markdown-rendered-view glass-panel"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          )}
        </div>
      </div>

      <style>{`
        .live-preview-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(8, 12, 22, 0.96);
          color: var(--text-primary);
          overflow: hidden;
          font-family: var(--font-ui);
        }

        .preview-top-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          background: rgba(0, 0, 0, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          gap: 10px;
          flex-shrink: 0;
        }

        .preview-toolbar-left {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow: hidden;
        }

        .file-preview-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          color: #64D2FF;
          background: rgba(10, 132, 255, 0.15);
          border: 1px solid rgba(10, 132, 255, 0.3);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .preview-stats-pills {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .stat-pill {
          font-size: 9.5px;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 6px;
          border-radius: 3px;
        }

        .stat-pill.mermaid-pill {
          background: rgba(191, 90, 242, 0.15);
          color: #BF5AF2;
          border: 1px solid rgba(191, 90, 242, 0.3);
          font-weight: 700;
        }

        .preview-toolbar-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .viewport-switcher {
          display: flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 1px;
        }

        .vp-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 3px 6px;
          border-radius: 3px;
        }

        .vp-btn:hover {
          color: #FFF;
        }

        .vp-btn.active {
          background: rgba(10, 132, 255, 0.3);
          color: #64D2FF;
        }

        .preview-tool-btn {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 4px;
        }

        .preview-tool-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #FFF;
        }

        .preview-stage-container {
          flex: 1;
          overflow: auto;
          display: flex;
          justify-content: center;
          padding: 14px;
          background: rgba(0, 0, 0, 0.2);
        }

        .preview-viewport-wrapper {
          height: 100%;
          transition: width 0.25s ease;
          display: flex;
        }

        .preview-iframe {
          width: 100%;
          height: 100%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-sm);
          background: #0B0F19;
        }

        .markdown-rendered-view {
          width: 100%;
          padding: 20px 24px;
          background: rgba(14, 18, 30, 0.6);
          border-radius: var(--radius-sm);
          border: 1px solid rgba(255, 255, 255, 0.08);
          line-height: 1.65;
          font-size: 13px;
          overflow-y: auto;
        }

        .preview-h1 { font-size: 20px; font-weight: 800; color: #FFF; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px; margin: 12px 0 8px; }
        .preview-h2 { font-size: 16px; font-weight: 700; color: #64D2FF; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 4px; margin: 12px 0 6px; }
        .preview-h3 { font-size: 14px; font-weight: 700; color: #E2E8F0; margin: 10px 0 4px; }
        .preview-h4, .preview-h5, .preview-h6 { font-size: 13px; font-weight: 600; color: #CBD5E1; margin: 8px 0 4px; }

        .preview-hr { border: none; height: 1px; background: rgba(255, 255, 255, 0.1); margin: 16px 0; }
        .preview-blockquote { border-left: 3px solid #0A84FF; padding: 4px 12px; margin: 8px 0; background: rgba(10, 132, 255, 0.08); border-radius: 0 4px 4px 0; color: #CBD5E1; }

        .github-alert {
          border-left: 3px solid #0A84FF;
          padding: 8px 12px;
          margin: 10px 0;
          border-radius: 0 6px 6px 0;
        }
        .alert-NOTE { border-color: #0A84FF; background: rgba(10, 132, 255, 0.1); }
        .alert-TIP { border-color: #30D158; background: rgba(48, 209, 88, 0.1); }
        .alert-IMPORTANT { border-color: #BF5AF2; background: rgba(191, 90, 242, 0.1); }
        .alert-WARNING { border-color: #FFD60A; background: rgba(255, 214, 10, 0.1); }
        .alert-CAUTION { border-color: #FF453A; background: rgba(255, 69, 58, 0.1); }
        .alert-title { font-weight: 800; font-size: 10.5px; letter-spacing: 0.5px; margin-bottom: 2px; }

        .code-block-wrapper {
          position: relative;
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          padding: 12px;
          margin: 10px 0;
        }
        .code-lang-tag {
          position: absolute;
          top: 6px;
          right: 10px;
          font-size: 9px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .preview-pre { margin: 0; font-family: var(--font-mono); font-size: 11.5px; color: #E6EDF3; overflow-x: auto; }
        .preview-inline-code { font-family: var(--font-mono); font-size: 11px; padding: 2px 4px; background: rgba(255, 255, 255, 0.1); border-radius: 3px; color: #64D2FF; }

        .preview-task-item { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
        .preview-task-item.done span { text-decoration: line-through; color: var(--text-muted); }

        .preview-li-bullet { margin-left: 18px; list-style-type: disc; }
        .preview-li-num { margin-left: 18px; list-style-type: decimal; }

        .preview-link { color: #64D2FF; text-decoration: none; }
        .preview-link:hover { text-decoration: underline; }

        .mermaid-diagram-container {
          padding: 10px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin: 14px 0;
        }
        .mermaid-diagram-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .diagram-badge {
          font-size: 9.5px;
          font-weight: 800;
          color: #BF5AF2;
          background: rgba(191, 90, 242, 0.15);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .preview-table-container { overflow-x: auto; margin: 12px 0; }
        .preview-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .preview-table th, .preview-table td { border: 1px solid rgba(255, 255, 255, 0.1); padding: 6px 10px; text-align: left; }
        .preview-table th { background: rgba(255, 255, 255, 0.05); color: #64D2FF; font-weight: 700; }

        .preview-paragraph-spacing { height: 10px; }
      `}</style>
    </div>
  )
}

const sampleMarkdown = `# 🚀 IndoctrinatedEdit Architecture & Live Preview

IndoctrinatedEdit is a modern, high-performance developer editor featuring **Liquid Glass Specular Aesthetics**.

> [!NOTE]
> This preview updates automatically in real-time as you type in the editor!

### 📊 System Workflow (Mermaid Diagram)

\`\`\`mermaid
flowchart TD
  Client[💻 User Editor Host] --> Router[🌐 Gateway Router]
  Router --> Crypto[🛡️ Cryptography Lab]
  Router --> Preview[📝 Live Previewer]
  Router --> Docker[🐳 Docker Studio]
  Router --> Socket[🕸️ WebSocket Streams]
\`\`\`

### ⚡ Feature Checklist
- [x] Multi-Shell Terminal Multiplexer
- [x] Diagnostics & Problems Engine
- [x] Database Studio & SQL Runner
- [x] In-Editor REST & GraphQL Client
- [x] Breakpoints & Multi-Compiler Debugging
- [x] Multi-Cursor Find & Replace Suite
- [x] Cryptography & DevTools Swiss Army Knife
- [x] Live Markdown & Mermaid Studio

### 📦 Comparative Metrics

| Component | Status | Performance |
|---|---|---|
| Monaco Editor | Active | 60 FPS |
| Specular Engine | Online | 120 FPS |
| Microservices | Ready | < 2ms |
`

const sampleHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    .card {
      background: linear-gradient(135deg, rgba(10,132,255,0.2) 0%, rgba(191,90,242,0.2) 100%);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
    }
    h1 { color: #64D2FF; font-family: sans-serif; }
    p { color: #E2E8F0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Liquid Glass Sandbox</h1>
    <p>Live static HTML and CSS rendered securely with responsive viewport testing.</p>
    <button onclick="alert('IndoctrinatedEdit Interactive Sandbox!')">Click Demo</button>
  </div>
</body>
</html>`

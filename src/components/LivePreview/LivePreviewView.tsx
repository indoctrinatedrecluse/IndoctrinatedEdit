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
  ZoomIn,
  ZoomOut,
  RotateCw,
  Printer,
  Sun,
  Moon,
  Eye,
  Type,
} from 'lucide-react'
import { previewService, PreviewMetadata, DocumentPreviewType } from '../../services/previewService'
import { sanitizeHtml, sanitizeSvg, escapeHtml } from '../../utils/security'
import './LivePreviewView.css'

interface LivePreviewViewProps {
  activeFilePath?: string
  activeFileName?: string
  activeFileContent?: string
  onClose?: () => void
  isDocked?: boolean
}

type ViewportMode = 'full' | 'desktop' | 'tablet' | 'mobile'

export const LivePreviewView: React.FC<LivePreviewViewProps> = ({
  activeFilePath,
  activeFileName = 'README.md',
  activeFileContent = '',
}) => {
  const [previewType, setPreviewType] = useState<DocumentPreviewType>('markdown')
  const [renderedHtml, setRenderedHtml] = useState<string>('')
  const [metadata, setMetadata] = useState<PreviewMetadata | null>(null)
  const [viewportMode, setViewportMode] = useState<ViewportMode>('full')
  const [copied, setCopied] = useState(false)

  // PDF-specific state
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [pdfZoom, setPdfZoom] = useState<number>(100)
  const [pdfRotation, setPdfRotation] = useState<number>(0)
  const [pdfTextMode, setPdfTextMode] = useState<boolean>(false)
  const [pdfExtractedText, setPdfExtractedText] = useState<string>('')

  // Word (DOCX/DOC)-specific state
  const [docxPaperMode, setDocxPaperMode] = useState<'glass' | 'paper'>('glass')
  const [docxZoom, setDocxZoom] = useState<number>(100)
  const [docxFont, setDocxFont] = useState<'sans' | 'serif'>('sans')
  const [docxRawText, setDocxRawText] = useState<string>('')

  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const pdfIframeRef = useRef<HTMLIFrameElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  // Update preview on content or active file path change
  useEffect(() => {
    let isCancelled = false
    const type = previewService.getPreviewType(activeFileName)
    setPreviewType(type)

    // Revoke any previous PDF Blob URL to prevent memory leaks
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }

    if (type === 'pdf') {
      const loadPdf = async () => {
        let source: string | ArrayBuffer = activeFileContent || samplePdfDataUrl
        if (activeFilePath && window.electronAPI?.workspace?.readFileBinary) {
          try {
            const bytes = await window.electronAPI.workspace.readFileBinary(activeFilePath, 25 * 1024 * 1024)
            if (bytes && bytes.length > 0) {
              const copy = new Uint8Array(bytes.length)
              copy.set(bytes)
              source = copy.buffer
            }
          } catch {
            // Fall back to string content
          }
        }
        const res = previewService.renderPdf(source, activeFileName)
        if (isCancelled) {
          if (res.pdfUrl.startsWith('blob:')) URL.revokeObjectURL(res.pdfUrl)
          return
        }
        if (res.pdfUrl.startsWith('blob:')) {
          blobUrlRef.current = res.pdfUrl
        }
        setPdfUrl(res.pdfUrl)
        setMetadata(res.metadata)
        setPdfExtractedText(res.extractedText)
      }
      loadPdf()
    } else if (type === 'docx') {
      const loadDocx = async () => {
        let source: string | ArrayBuffer = activeFileContent || sampleDocxPlaceholder
        if (activeFilePath && window.electronAPI?.workspace?.readFileBinary) {
          try {
            const bytes = await window.electronAPI.workspace.readFileBinary(activeFilePath, 25 * 1024 * 1024)
            if (bytes && bytes.length > 0) {
              const copy = new Uint8Array(bytes.length)
              copy.set(bytes)
              source = copy.buffer
            }
          } catch {
            // Fall back to string content
          }
        }
        try {
          const res = await previewService.renderDocx(source, activeFileName)
          if (!isCancelled) {
            setRenderedHtml(res.html)
            setMetadata(res.metadata)
            setDocxRawText(res.textContent)
          }
        } catch (err) {
          if (!isCancelled) {
            setRenderedHtml(`<div class="docx-error glass-panel"><p>Error reading Word document: ${escapeHtml(String(err))}</p></div>`)
          }
        }
      }
      loadDocx()
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
    } else if (type === 'svg') {
      const content = activeFileContent || '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120"><rect width="240" height="120" rx="12" fill="#0f172a"/><text x="120" y="65" text-anchor="middle" fill="#94a3b8" font-size="13">Empty SVG Document</text></svg>'
      setRenderedHtml(sanitizeSvg(content))
      setMetadata({
        type: 'svg',
        title: activeFileName,
        wordCount: 1,
        characterCount: content.length,
        mermaidDiagramsCount: 0,
        headingsCount: 0,
      })
    } else {
      // Default: render as markdown preview
      const content = activeFileContent || sampleMarkdown
      const res = previewService.renderMarkdown(content)
      setRenderedHtml(res.html)
      setMetadata(res.metadata)
    }

    return () => {
      isCancelled = true
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [activeFilePath, activeFileName, activeFileContent])

  const copyRenderedContent = () => {
    const textToCopy =
      previewType === 'docx'
        ? docxRawText || renderedHtml.replace(/<[^>]+>/g, '')
        : previewType === 'pdf'
        ? pdfExtractedText || 'PDF Document'
        : renderedHtml

    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const handlePrint = () => {
    if (previewType === 'pdf' && pdfIframeRef.current?.contentWindow) {
      pdfIframeRef.current.contentWindow.print()
      return
    }
    if (previewType === 'html' && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print()
      return
    }
    // Print rendered DOCX / Markdown / SVG in an isolated hidden iframe so we don't print the entire IDE chrome
    const printFrame = document.createElement('iframe')
    printFrame.style.position = 'fixed'
    printFrame.style.right = '0'
    printFrame.style.bottom = '0'
    printFrame.style.width = '0'
    printFrame.style.height = '0'
    printFrame.style.border = '0'
    document.body.appendChild(printFrame)
    const doc = printFrame.contentDocument
    if (doc) {
      doc.open()
      doc.write(`<!DOCTYPE html><html><head><title>${escapeHtml(activeFileName)}</title><style>body{font-family:system-ui,-apple-system,sans-serif;padding:24px;color:#111;line-height:1.5;}pre{background:#f3f4f6;padding:12px;border-radius:6px;overflow:auto;}svg{max-width:100%;}</style></head><body>${previewType === 'svg' ? sanitizeSvg(renderedHtml) : sanitizeHtml(renderedHtml)}</body></html>`)
      doc.close()
      setTimeout(() => {
        printFrame.contentWindow?.focus()
        printFrame.contentWindow?.print()
        setTimeout(() => printFrame.remove(), 1000)
      }, 100)
    } else {
      printFrame.remove()
      window.print()
    }
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
      <div
        className="preview-top-toolbar"
        onWheel={(e) => {
          e.currentTarget.scrollLeft += e.deltaY
        }}
      >
        <div
          className="preview-toolbar-left"
          onWheel={(e) => {
            e.currentTarget.scrollLeft += e.deltaY
          }}
        >
          {/* Format Badge */}
          <span className={`file-preview-badge badge-${previewType}`}>
            {previewType === 'html' ? (
              <Code size={12} />
            ) : previewType === 'pdf' ? (
              <FileText size={12} color="#FF453A" />
            ) : previewType === 'docx' ? (
              <FileText size={12} color="#0A84FF" />
            ) : (
              <FileText size={12} />
            )}
            <span>{activeFileName}</span>
          </span>

          {/* Metadata Statistics Pills */}
          {metadata && (
            <div className="preview-stats-pills">
              {previewType === 'pdf' && (
                <>
                  <span className="stat-pill pdf-pill">📑 {metadata.pageCount || 1} Pages</span>
                  {metadata.fileSize && <span className="stat-pill">{metadata.fileSize}</span>}
                </>
              )}
              {previewType === 'docx' && (
                <>
                  <span className="stat-pill docx-pill">📝 {metadata.wordCount} words</span>
                  {metadata.pageCount && <span className="stat-pill">~{metadata.pageCount} pages</span>}
                  {metadata.headingsCount > 0 && <span className="stat-pill">{metadata.headingsCount} headings</span>}
                </>
              )}
              {previewType === 'markdown' && (
                <>
                  <span className="stat-pill">{metadata.wordCount} words</span>
                  {metadata.mermaidDiagramsCount > 0 && (
                    <span className="stat-pill mermaid-pill">
                      📊 {metadata.mermaidDiagramsCount} Diagrams
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="preview-toolbar-right">
          {/* PDF-Specific Controls */}
          {previewType === 'pdf' && (
            <div className="doc-tools-group">
              <button
                className="preview-tool-btn glass-interactive"
                onClick={() => setPdfZoom((z) => Math.max(50, z - 15))}
                title="Zoom Out"
              >
                <ZoomOut size={12} />
              </button>
              <button
                className="preview-tool-btn glass-interactive zoom-label-btn"
                onClick={() => setPdfZoom(100)}
                title="Reset Zoom (100%)"
              >
                <span>{pdfZoom}%</span>
              </button>
              <button
                className="preview-tool-btn glass-interactive"
                onClick={() => setPdfZoom((z) => Math.min(250, z + 15))}
                title="Zoom In"
              >
                <ZoomIn size={12} />
              </button>
              <button
                className="preview-tool-btn glass-interactive"
                onClick={() => setPdfRotation((r) => (r + 90) % 360)}
                title="Rotate 90° Clockwise"
              >
                <RotateCw size={12} />
              </button>
              <button
                className={`preview-tool-btn glass-interactive ${pdfTextMode ? 'active' : ''}`}
                onClick={() => setPdfTextMode((m) => !m)}
                title={pdfTextMode ? 'Switch to PDF Visual Canvas' : 'Switch to Extracted Text Layer'}
              >
                <Eye size={12} />
              </button>
              <button
                className="preview-tool-btn glass-interactive"
                onClick={handlePrint}
                title="Print Document"
              >
                <Printer size={12} />
              </button>
            </div>
          )}

          {/* Word (DOCX/DOC)-Specific Controls */}
          {previewType === 'docx' && (
            <div className="doc-tools-group">
              <button
                className="preview-tool-btn glass-interactive"
                onClick={() => setDocxPaperMode((m) => (m === 'glass' ? 'paper' : 'glass'))}
                title={docxPaperMode === 'glass' ? 'Switch to Clean White Paper Mode' : 'Switch to Liquid Glass Dark Mode'}
              >
                {docxPaperMode === 'glass' ? <Sun size={12} /> : <Moon size={12} />}
              </button>
              <button
                className="preview-tool-btn glass-interactive"
                onClick={() => setDocxFont((f) => (f === 'sans' ? 'serif' : 'sans'))}
                title={docxFont === 'sans' ? 'Switch to Editorial Serif Font' : 'Switch to Modern Sans Font'}
              >
                <Type size={12} />
              </button>
              <button
                className="preview-tool-btn glass-interactive"
                onClick={() => setDocxZoom((z) => Math.max(60, z - 10))}
                title="Zoom Out"
              >
                <ZoomOut size={12} />
              </button>
              <button
                className="preview-tool-btn glass-interactive zoom-label-btn"
                onClick={() => setDocxZoom(100)}
                title="Reset Zoom (100%)"
              >
                <span>{docxZoom}%</span>
              </button>
              <button
                className="preview-tool-btn glass-interactive"
                onClick={() => setDocxZoom((z) => Math.min(200, z + 10))}
                title="Zoom In"
              >
                <ZoomIn size={12} />
              </button>
              <button
                className="preview-tool-btn glass-interactive"
                onClick={handlePrint}
                title="Print Document"
              >
                <Printer size={12} />
              </button>
            </div>
          )}

          {/* Viewport Switcher for HTML */}
          {previewType === 'html' && (
            <div
              className="viewport-switcher"
              onWheel={(e) => {
                e.currentTarget.scrollLeft += e.deltaY
              }}
            >
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

          <button
            className="preview-tool-btn glass-interactive"
            onClick={copyRenderedContent}
            title={previewType === 'docx' ? 'Copy Extracted Text' : 'Copy Rendered Content'}
          >
            {copied ? <Check size={12} color="#30D158" /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* Main Preview Stage */}
      <div className="preview-stage-container custom-scrollbar">
        {/* 1. PDF VIEW */}
        {previewType === 'pdf' && (
          <div className="pdf-viewport-wrapper">
            {pdfTextMode ? (
              <div className="pdf-extracted-text-view glass-panel">
                <div className="pdf-text-header">
                  <span className="pdf-text-badge">Extracted Text Content</span>
                  <span className="pdf-text-filename">{activeFileName}</span>
                </div>
                <div className="pdf-text-body">
                  {pdfExtractedText ? (
                    <pre className="pdf-pre-text">{pdfExtractedText}</pre>
                  ) : (
                    <p className="empty-doc-notice">No textual characters extracted from stream blocks. Switch to visual viewer.</p>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="pdf-embed-canvas-wrapper"
                style={{
                  transform: `scale(${pdfZoom / 100}) rotate(${pdfRotation}deg)`,
                  transformOrigin: 'top center',
                }}
              >
                {pdfUrl ? (
                  <iframe
                    ref={pdfIframeRef}
                    title={`PDF Viewer - ${activeFileName}`}
                    src={`${pdfUrl}#toolbar=1&navpanes=1`}
                    className="pdf-embed-frame glass-panel"
                  />
                ) : (
                  <div className="pdf-placeholder-card glass-panel">
                    <FileText size={36} color="#FF453A" />
                    <h3>PDF Document Ready</h3>
                    <p>Load a local PDF file to inspect and render pages natively.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. DOCX & DOC WORD DOCUMENT VIEW */}
        {previewType === 'docx' && (
          <div
            className={`docx-viewport-wrapper ${docxPaperMode === 'paper' ? 'paper-mode' : 'glass-mode'} font-${docxFont}`}
            style={{
              transform: `scale(${docxZoom / 100})`,
              transformOrigin: 'top center',
            }}
          >
            <div
              className="docx-page-sheet"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderedHtml) }}
            />
          </div>
        )}

        {/* 3. HTML SANDBOX VIEW */}
        {previewType === 'html' && (
          <div className="preview-viewport-wrapper" style={{ width: getViewportWidth() }}>
            <iframe
              ref={iframeRef}
              title="HTML Sandbox Preview"
              className="preview-iframe glass-panel"
              srcDoc={previewService.generateHtmlSandboxSrc(renderedHtml)}
              sandbox="allow-scripts allow-modals allow-forms"
            />
          </div>
        )}

        {/* 4. MARKDOWN & GENERAL PROSE VIEW */}
        {previewType !== 'pdf' && previewType !== 'docx' && previewType !== 'html' && (
          <div className="preview-viewport-wrapper" style={{ width: '100%' }}>
            <div
              className="markdown-rendered-view glass-panel"
              dangerouslySetInnerHTML={{
                __html: previewType === 'svg' ? sanitizeSvg(renderedHtml) : sanitizeHtml(renderedHtml),
              }}
            />
          </div>
        )}
      </div>

    </div>
  )
}

const samplePdfDataUrl = ''

const sampleDocxPlaceholder = ''

const sampleMarkdown = `# 🚀 IndoctrinatedEdit Architecture & Live Document Preview

IndoctrinatedEdit is a modern developer editor with **Liquid Glass Aesthetics** and universal document previews for Markdown, PDF, Microsoft Word (DOCX/DOC), HTML, and SVG.

> [!NOTE]
> This live preview synchronizes in real time as you edit documents!

### 📊 System Workflow (Mermaid Diagram)

\`\`\`mermaid
flowchart TD
  Client[💻 User Document Host] --> Router[🌐 Gateway Router]
  Router --> Markdown[📝 Markdown & LaTeX]
  Router --> Pdf[📑 Native PDF Engine]
  Router --> Word[📄 Word DOCX & DOC Studio]
  Router --> Diagrams[📊 Mermaid Vector Engine]
\`\`\`

### ⚡ Feature Checklist
- [x] Live Markdown with LaTeX & Mermaid SVGs
- [x] Native PDF Document Viewer with Zoom & Print
- [x] Microsoft Word (DOCX & DOC) with Paper / Glass Modes
- [x] Responsive HTML Sandbox
- [x] Liquid Glass Frameless Workspace
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

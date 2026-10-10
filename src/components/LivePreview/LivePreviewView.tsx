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

  // Update preview on content change
  useEffect(() => {
    let isCancelled = false
    const type = previewService.getPreviewType(activeFileName)
    setPreviewType(type)

    if (type === 'pdf') {
      const res = previewService.renderPdf(activeFileContent || samplePdfDataUrl, activeFileName)
      if (!isCancelled) {
        setPdfUrl(res.pdfUrl)
        setMetadata(res.metadata)
        setPdfExtractedText(res.extractedText)
      }
    } else if (type === 'docx') {
      previewService
        .renderDocx(activeFileContent || sampleDocxPlaceholder, activeFileName)
        .then((res) => {
          if (!isCancelled) {
            setRenderedHtml(res.html)
            setMetadata(res.metadata)
            setDocxRawText(res.textContent)
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            setRenderedHtml(`<div class="docx-error glass-panel"><p>Error reading Word document: ${String(err)}</p></div>`)
          }
        })
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
      const content = activeFileContent || sampleHtml
      setRenderedHtml(content)
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
    }
  }, [activeFileName, activeFileContent])

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
    window.print()
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
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
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
          <div className="preview-viewport-wrapper" style={{ width: getViewportWidth() }}>
            <div
              className="markdown-rendered-view glass-panel"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        )}
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
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          gap: 10px;
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
        }

        .preview-toolbar-left {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
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
          white-space: nowrap;
          flex-shrink: 0;
        }

        .file-preview-badge.badge-pdf {
          color: #FF6961;
          background: rgba(255, 69, 58, 0.15);
          border-color: rgba(255, 69, 58, 0.35);
        }

        .file-preview-badge.badge-docx {
          color: #70B4FF;
          background: rgba(10, 132, 255, 0.18);
          border-color: rgba(10, 132, 255, 0.4);
        }

        .preview-stats-pills {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .stat-pill {
          font-size: 9.5px;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 6px;
          border-radius: 3px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .stat-pill.pdf-pill {
          background: rgba(255, 69, 58, 0.15);
          color: #FF6961;
          border: 1px solid rgba(255, 69, 58, 0.3);
          font-weight: 700;
        }

        .stat-pill.docx-pill {
          background: rgba(10, 132, 255, 0.15);
          color: #64D2FF;
          border: 1px solid rgba(10, 132, 255, 0.3);
          font-weight: 700;
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
          flex-shrink: 0;
        }

        .doc-tools-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .zoom-label-btn {
          font-size: 10px;
          font-weight: 600;
          min-width: 38px;
          text-align: center;
          padding: 3px 5px !important;
        }

        .viewport-switcher {
          display: flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 1px;
          flex-shrink: 0;
        }

        .vp-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 3px 6px;
          border-radius: 3px;
        }

        .vp-btn:hover { color: #FFF; }
        .vp-btn.active { background: rgba(10, 132, 255, 0.3); color: #64D2FF; }

        .preview-tool-btn {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .preview-tool-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #FFF;
        }

        .preview-tool-btn.active {
          background: rgba(10, 132, 255, 0.35);
          color: #64D2FF;
          border-color: rgba(10, 132, 255, 0.5);
        }

        .preview-stage-container {
          flex: 1;
          overflow: auto;
          display: flex;
          justify-content: center;
          padding: 14px;
          background: rgba(0, 0, 0, 0.25);
        }

        .preview-viewport-wrapper {
          height: 100%;
          width: 100%;
          max-width: 100%;
          transition: width 0.25s ease;
          display: flex;
        }

        /* PDF Stage Styles */
        .pdf-viewport-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          overflow: auto;
        }

        .pdf-embed-canvas-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          transition: transform 0.2s ease;
        }

        .pdf-embed-frame {
          width: 100%;
          height: 100%;
          min-height: 600px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: var(--radius-sm);
          background: #0B0F19;
        }

        .pdf-placeholder-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px;
          margin-top: 40px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(15, 20, 32, 0.7);
          text-align: center;
        }

        .pdf-extracted-text-view {
          width: 100%;
          max-width: 820px;
          margin: 0 auto;
          padding: 24px;
          background: rgba(14, 18, 30, 0.85);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .pdf-text-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 8px;
          margin-bottom: 16px;
        }

        .pdf-text-badge {
          font-size: 11px;
          font-weight: 700;
          color: #FF6961;
          text-transform: uppercase;
        }

        .pdf-text-filename {
          font-size: 11px;
          color: var(--text-muted);
        }

        .pdf-pre-text {
          white-space: pre-wrap;
          font-family: var(--font-mono);
          font-size: 12px;
          line-height: 1.6;
          color: #E2E8F0;
        }

        /* DOCX / Word Document Stage Styles */
        .docx-viewport-wrapper {
          display: flex;
          justify-content: center;
          width: 100%;
          transition: transform 0.2s ease;
        }

        .docx-viewport-wrapper.font-serif {
          font-family: 'Georgia', 'Cambria', 'Times New Roman', serif;
        }

        .docx-viewport-wrapper.font-sans {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        .docx-page-sheet {
          width: 100%;
          max-width: 840px;
          min-height: 1056px; /* Standard US Letter proportion */
          padding: 48px 56px;
          border-radius: 8px;
          margin: 0 auto;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
          line-height: 1.7;
          font-size: 13.5px;
        }

        /* Liquid Glass Dark Mode */
        .docx-viewport-wrapper.glass-mode .docx-page-sheet {
          background: rgba(18, 24, 38, 0.75);
          backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #F1F5F9;
        }

        .docx-viewport-wrapper.glass-mode .docx-page-sheet h1 { color: #FFFFFF; border-bottom: 1px solid rgba(255,255,255,0.12); }
        .docx-viewport-wrapper.glass-mode .docx-page-sheet h2 { color: #64D2FF; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .docx-viewport-wrapper.glass-mode .docx-page-sheet h3 { color: #BF5AF2; }
        .docx-viewport-wrapper.glass-mode .docx-page-sheet table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        .docx-viewport-wrapper.glass-mode .docx-page-sheet th,
        .docx-viewport-wrapper.glass-mode .docx-page-sheet td {
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 8px 12px;
        }
        .docx-viewport-wrapper.glass-mode .docx-page-sheet th {
          background: rgba(255, 255, 255, 0.06);
          color: #64D2FF;
        }

        /* Paper White Mode */
        .docx-viewport-wrapper.paper-mode .docx-page-sheet {
          background: #FFFFFF;
          color: #1A202C;
          border: 1px solid #CBD5E0;
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
        }

        .docx-viewport-wrapper.paper-mode .docx-page-sheet h1 { color: #1A365D; border-bottom: 1px solid #E2E8F0; }
        .docx-viewport-wrapper.paper-mode .docx-page-sheet h2 { color: #2B6CB0; border-bottom: 1px solid #EDF2F7; }
        .docx-viewport-wrapper.paper-mode .docx-page-sheet h3 { color: #2C5282; }
        .docx-viewport-wrapper.paper-mode .docx-page-sheet p { color: #2D3748; }
        .docx-viewport-wrapper.paper-mode .docx-page-sheet table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        .docx-viewport-wrapper.paper-mode .docx-page-sheet th,
        .docx-viewport-wrapper.paper-mode .docx-page-sheet td {
          border: 1px solid #CBD5E0;
          padding: 8px 12px;
        }
        .docx-viewport-wrapper.paper-mode .docx-page-sheet th {
          background: #EDF2F7;
          color: #2D3748;
        }

        .docx-legacy-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          margin-bottom: 20px;
          background: rgba(255, 159, 10, 0.15);
          border: 1px solid rgba(255, 159, 10, 0.35);
          border-radius: 6px;
          font-size: 11.5px;
          color: #FFD60A;
        }

        .legacy-badge {
          font-weight: 700;
          text-transform: uppercase;
          background: rgba(255, 159, 10, 0.25);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .empty-doc-notice {
          color: var(--text-muted);
          font-style: italic;
          text-align: center;
          padding: 40px 0;
        }

        /* HTML and Markdown Preview Styles */
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

        .latex-math-block {
          padding: 10px 14px;
          margin: 12px 0;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(191, 90, 242, 0.35);
          border-radius: 6px;
          display: flex;
          justify-content: center;
          font-family: 'Cambria Math', 'KaTeX_Math', 'Times New Roman', serif;
          font-size: 15px;
          color: #BF5AF2;
          box-shadow: 0 0 12px rgba(191, 90, 242, 0.15);
        }

        .latex-math-inline {
          font-family: 'Cambria Math', 'KaTeX_Math', 'Times New Roman', serif;
          color: #BF5AF2;
          background: rgba(191, 90, 242, 0.12);
          padding: 1px 5px;
          border-radius: 3px;
          font-size: 12.5px;
        }

        .preview-heading {
          cursor: pointer;
          transition: color 0.15s ease;
        }

        .preview-heading:hover {
          color: #64D2FF;
        }

        .preview-paragraph-spacing { height: 10px; }
      `}</style>
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

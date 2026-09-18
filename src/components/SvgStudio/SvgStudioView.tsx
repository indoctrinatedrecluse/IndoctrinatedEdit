import React, { useState, useMemo } from 'react'
import {
  Copy,
  Check,
  Zap,
  Code2,
  Download,
  Eye,
} from 'lucide-react'
import {
  svgStudioService,
  SvgOptimizationResult,
} from '../../services/svgStudioService'

export const SvgStudioView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'canvas' | 'optimize' | 'export'>('canvas')
  const [svgInput, setSvgInput] = useState<string>(() => svgStudioService.getDefaultSvg())
  const [primaryColor, setPrimaryColor] = useState<string>('#0A84FF')
  const [secondaryColor, setSecondaryColor] = useState<string>('#BF5AF2')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [exportFormat, setExportFormat] = useState<'react' | 'datauri' | 'css' | 'minified'>('react')

  // Live Recolor SVG
  const displaySvg = useMemo(() => {
    return svgStudioService.recolorSvg(svgInput, primaryColor, secondaryColor)
  }, [svgInput, primaryColor, secondaryColor])

  // Optimizer Result
  const optResult: SvgOptimizationResult = useMemo(() => {
    return svgStudioService.optimizeSvg(displaySvg)
  }, [displaySvg])

  // Exported Formats
  const exportedSnippet = useMemo(() => {
    switch (exportFormat) {
      case 'react':
        return svgStudioService.generateReactComponent(optResult.optimizedSvg, 'NeoShieldIcon')
      case 'datauri':
        return svgStudioService.toDataUri(optResult.optimizedSvg)
      case 'css':
        return svgStudioService.toCssBackground(optResult.optimizedSvg)
      case 'minified':
        return optResult.optimizedSvg
    }
  }, [exportFormat, optResult])

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1800)
  }

  const handleDownloadSvg = () => {
    const blob = new Blob([displaySvg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `optimized_asset_${Date.now()}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="svg-studio-root">
      {/* Sub-Nav Bar */}
      <div
        className="svg-nav-strip"
        onWheel={(e) => {
          e.currentTarget.scrollLeft += e.deltaY
        }}
      >
        <button
          className={`nav-tab-btn glass-interactive ${activeTab === 'canvas' ? 'active' : ''}`}
          onClick={() => setActiveTab('canvas')}
        >
          <Eye size={12} />
          <span>Canvas & Recolor</span>
        </button>

        <button
          className={`nav-tab-btn glass-interactive ${activeTab === 'optimize' ? 'active' : ''}`}
          onClick={() => setActiveTab('optimize')}
        >
          <Zap size={12} />
          <span>SVGO Minifier ({optResult.savingsPercentage}% saved)</span>
        </button>

        <button
          className={`nav-tab-btn glass-interactive ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          <Code2 size={12} />
          <span>Component Exporter</span>
        </button>
      </div>

      {/* Canvas & Recolor Tab */}
      {activeTab === 'canvas' && (
        <div className="canvas-tab-layout">
          {/* Top Checkerboard Preview Area */}
          <div className="svg-preview-stage">
            <div
              className="svg-mount-node"
              dangerouslySetInnerHTML={{ __html: displaySvg }}
            />
          </div>

          {/* Color & Transform Controls */}
          <div className="controls-box glass-panel">
            <div className="controls-row">
              <div className="color-pick-item">
                <span className="ctrl-label">Primary Color</span>
                <div className="color-input-wrap">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="color-wheel-picker"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="hex-text-input"
                  />
                </div>
              </div>

              <div className="color-pick-item">
                <span className="ctrl-label">Secondary Color</span>
                <div className="color-input-wrap">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="color-wheel-picker"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="hex-text-input"
                  />
                </div>
              </div>

              <button
                className="dl-svg-btn glass-interactive"
                onClick={handleDownloadSvg}
                title="Download SVG"
              >
                <Download size={12} />
                <span>Save SVG</span>
              </button>
            </div>
          </div>

          {/* Raw SVG Editor */}
          <div className="raw-editor-wrap">
            <div className="raw-header">
              <span>SVG Markup Editor</span>
            </div>
            <textarea
              value={svgInput}
              onChange={(e) => setSvgInput(e.target.value)}
              className="svg-markup-textarea"
              rows={6}
            />
          </div>
        </div>
      )}

      {/* SVGO Minifier Tab */}
      {activeTab === 'optimize' && (
        <div className="optimize-tab-layout">
          <div className="savings-banner glass-panel">
            <div className="savings-stats">
              <span className="savings-pct">{optResult.savingsPercentage}% Smaller</span>
              <span className="savings-bytes">
                {optResult.originalSize} B → {optResult.optimizedSize} B
              </span>
            </div>
            <button
              className="copy-opt-btn glass-interactive"
              onClick={() => copyToClipboard(optResult.optimizedSvg, 'opt_svg')}
            >
              {copiedKey === 'opt_svg' ? <Check size={11} /> : <Copy size={11} />}
              <span>Copy Optimized SVG</span>
            </button>
          </div>

          <div className="code-diff-wrap glass-panel">
            <div className="diff-header">
              <span>Cleaned & Minified SVG Output</span>
            </div>
            <pre className="opt-code-block">
              <code>{optResult.optimizedSvg}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Component Exporter Tab */}
      {activeTab === 'export' && (
        <div className="export-tab-layout">
          <div className="format-pills-bar">
            {(['react', 'datauri', 'css', 'minified'] as const).map((fmt) => (
              <button
                key={fmt}
                className={`format-pill glass-interactive ${exportFormat === fmt ? 'active' : ''}`}
                onClick={() => setExportFormat(fmt)}
              >
                {fmt === 'react' && 'React / TSX Component'}
                {fmt === 'datauri' && 'Base64 Data URI'}
                {fmt === 'css' && 'CSS Background Snippet'}
                {fmt === 'minified' && 'Minified XML'}
              </button>
            ))}
          </div>

          <div className="exported-output-card glass-panel">
            <div className="card-top-head">
              <span>{exportFormat.toUpperCase()} Code Snippet</span>
              <button
                className="copy-btn glass-interactive"
                onClick={() => copyToClipboard(exportedSnippet, 'export_snippet')}
              >
                {copiedKey === 'export_snippet' ? <Check size={11} /> : <Copy size={11} />}
                <span>Copy Code</span>
              </button>
            </div>
            <pre className="export-code-pre">
              <code>{exportedSnippet}</code>
            </pre>
          </div>
        </div>
      )}

      <style>{`
        .svg-studio-root {
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

        .svg-nav-strip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.25);
          overflow-x: auto;
          white-space: nowrap;
        }

        .nav-tab-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          border-radius: 5px;
          background: transparent;
          border: 1px solid transparent;
          color: rgba(235, 235, 245, 0.65);
          font-size: 0.72rem;
          cursor: pointer;
        }

        .nav-tab-btn.active {
          background: rgba(191, 90, 242, 0.15);
          border-color: rgba(191, 90, 242, 0.35);
          color: #BF5AF2;
          font-weight: 600;
        }

        .canvas-tab-layout {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
          padding: 10px;
          gap: 8px;
        }

        .svg-preview-stage {
          height: 140px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background-color: #0F1424;
          background-image: 
            linear-gradient(45deg, rgba(255, 255, 255, 0.03) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.03) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.03) 75%);
          background-size: 16px 16px;
          background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .svg-mount-node svg {
          max-width: 100px;
          max-height: 100px;
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
        }

        .controls-box {
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .controls-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .color-pick-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .ctrl-label {
          font-size: 0.65rem;
          color: rgba(235, 235, 245, 0.5);
        }

        .color-input-wrap {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .color-wheel-picker {
          width: 20px;
          height: 20px;
          border: none;
          background: transparent;
          cursor: pointer;
        }

        .hex-text-input {
          width: 65px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 2px 4px;
          color: #FFFFFF;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem;
        }

        .dl-svg-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(10, 132, 255, 0.2);
          border: 1px solid rgba(10, 132, 255, 0.4);
          color: #64D2FF;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 0.7rem;
          font-weight: 600;
          cursor: pointer;
        }

        .raw-editor-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }

        .raw-header {
          padding: 5px 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.5);
        }

        .svg-markup-textarea {
          flex: 1;
          background: transparent;
          border: none;
          padding: 8px;
          color: #64D2FF;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          outline: none;
          resize: none;
        }

        .optimize-tab-layout {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
          padding: 10px;
          gap: 8px;
        }

        .savings-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid rgba(48, 209, 88, 0.3);
          background: rgba(48, 209, 88, 0.1);
        }

        .savings-stats {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .savings-pct {
          font-size: 1rem;
          font-weight: 700;
          color: #30D158;
        }

        .savings-bytes {
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.6);
        }

        .copy-opt-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(48, 209, 88, 0.2);
          border: 1px solid rgba(48, 209, 88, 0.4);
          color: #30D158;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 0.68rem;
          font-weight: 600;
          cursor: pointer;
        }

        .code-diff-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.4);
          overflow: hidden;
        }

        .diff-header {
          padding: 6px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.5);
        }

        .opt-code-block {
          margin: 0;
          padding: 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          color: #FFD60A;
          overflow-y: auto;
          flex: 1;
        }

        .export-tab-layout {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
          padding: 10px;
          gap: 8px;
        }

        .format-pills-bar {
          display: flex;
          gap: 4px;
          overflow-x: auto;
        }

        .format-pill {
          padding: 3px 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(235, 235, 245, 0.6);
          font-size: 0.68rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .format-pill.active {
          background: rgba(191, 90, 242, 0.2);
          border-color: rgba(191, 90, 242, 0.4);
          color: #BF5AF2;
        }

        .exported-output-card {
          flex: 1;
          display: flex;
          flex-direction: column;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.4);
          overflow: hidden;
        }

        .card-top-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 0.68rem;
          color: rgba(235, 235, 245, 0.5);
        }

        .copy-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: transparent;
          border: none;
          color: #64D2FF;
          font-size: 0.68rem;
          cursor: pointer;
        }

        .export-code-pre {
          margin: 0;
          padding: 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          color: #FFD60A;
          overflow-y: auto;
          flex: 1;
        }
      `}</style>
    </div>
  )
}

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
import { sanitizeSvg } from '../../utils/security'
import './SvgStudioView.css'

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
              dangerouslySetInnerHTML={{ __html: sanitizeSvg(displaySvg) }}
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

    </div>
  )
}

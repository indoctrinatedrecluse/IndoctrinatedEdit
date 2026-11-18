import React, { useState, useMemo, useEffect } from 'react'
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

interface SvgStudioViewProps {
  activeFileName?: string
  activeFileContent?: string
}

export const SvgStudioView: React.FC<SvgStudioViewProps> = ({
  activeFileName,
  activeFileContent,
}) => {
  const [activeTab, setActiveTab] = useState<'canvas' | 'optimize' | 'export' | 'pathEditor'>('canvas')
  const [svgInput, setSvgInput] = useState<string>(() =>
    activeFileName?.toLowerCase().endsWith('.svg') && activeFileContent?.includes('<svg')
      ? activeFileContent
      : svgStudioService.getDefaultSvg()
  )
  const [recolorEnabled, setRecolorEnabled] = useState<boolean>(false)
  const [primaryColor, setPrimaryColor] = useState<string>('#0A84FF')
  const [secondaryColor, setSecondaryColor] = useState<string>('#BF5AF2')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [exportFormat, setExportFormat] = useState<'react' | 'datauri' | 'css' | 'minified' | 'spritesheet'>('react')
  const [exportScale, setExportScale] = useState<1 | 2 | 4>(1)
  const [componentName, setComponentName] = useState<string>('CustomVectorIcon')
  const [selectedPathIndex, setSelectedPathIndex] = useState<number>(0)
  const [parsedPathCmds, setParsedPathCmds] = useState<ReturnType<typeof svgStudioService.parsePathCommands>>([])

  useEffect(() => {
    if (activeFileName?.toLowerCase().endsWith('.svg') && activeFileContent?.includes('<svg')) {
      setSvgInput(activeFileContent)
      setRecolorEnabled(false)
      const base = activeFileName.replace(/\.svg$/i, '').replace(/[^a-zA-Z0-9]+/g, ' ').trim()
      const pascal = base
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join('')
      if (pascal) setComponentName(pascal.endsWith('Icon') ? pascal : `${pascal}Icon`)
    }
  }, [activeFileName, activeFileContent])

  // Extract all `d` attributes for the path editor
  const allPathDAttributes = useMemo(() => {
    const matches: string[] = []
    const dRe = /\bd\s*=\s*["']([^"']+)["']/gi
    let m: RegExpExecArray | null
    while ((m = dRe.exec(svgInput)) !== null) {
      matches.push(m[1])
    }
    return matches
  }, [svgInput])

  useEffect(() => {
    if (allPathDAttributes.length > 0 && selectedPathIndex < allPathDAttributes.length) {
      setParsedPathCmds(svgStudioService.parsePathCommands(allPathDAttributes[selectedPathIndex]))
    }
  }, [allPathDAttributes, selectedPathIndex])

  // Live Recolor SVG only when explicitly enabled
  const displaySvg = useMemo(() => {
    if (!recolorEnabled) return svgInput
    return svgStudioService.recolorSvg(svgInput, primaryColor, secondaryColor)
  }, [svgInput, recolorEnabled, primaryColor, secondaryColor])

  // Optimizer Result
  const optResult: SvgOptimizationResult = useMemo(() => {
    return svgStudioService.optimizeSvg(displaySvg)
  }, [displaySvg])

  // Exported Formats
  const exportedSnippet = useMemo(() => {
    switch (exportFormat) {
      case 'react':
        return svgStudioService.generateReactComponent(optResult.optimizedSvg, componentName || 'CustomIcon')
      case 'datauri':
        return svgStudioService.toDataUri(optResult.optimizedSvg)
      case 'css':
        return svgStudioService.toCssBackground(optResult.optimizedSvg)
      case 'minified':
        return optResult.optimizedSvg
      case 'spritesheet':
        return svgStudioService.generateSpriteSheet([
          { id: componentName ? componentName.toLowerCase() : 'icon', viewBox: '0 0 100 100', content: optResult.optimizedSvg },
        ])
    }
  }, [exportFormat, optResult, componentName])

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

  const handleExportRaster = (format: 'png' | 'webp' | 'jpeg') => {
    const svgBlob = new Blob([displaySvg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const img = new Image()
    img.onload = () => {
      const baseW = img.naturalWidth || 512
      const baseH = img.naturalHeight || 512
      const canvas = document.createElement('canvas')
      canvas.width = baseW * exportScale
      canvas.height = baseH * exportScale
      const ctx = canvas.getContext('2d')
      if (ctx) {
        if (format === 'jpeg') {
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
        ctx.scale(exportScale, exportScale)
        ctx.drawImage(img, 0, 0, baseW, baseH)
        const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg'
        const dataUrl = canvas.toDataURL(mime, 0.95)
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `${componentName || 'asset'}_${exportScale}x_${Date.now()}.${format}`
        a.click()
      }
      URL.revokeObjectURL(url)
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }

  const handleUpdatePathCoord = (cmdIndex: number, coordIndex: number, newVal: number) => {
    const updated = parsedPathCmds.map((cmd, ci) => {
      if (ci !== cmdIndex) return cmd
      const nextVals = [...cmd.values]
      nextVals[coordIndex] = newVal
      return { ...cmd, values: nextVals }
    })
    setParsedPathCmds(updated)
    const serialized = svgStudioService.serializePathCommands(updated)
    const oldD = allPathDAttributes[selectedPathIndex]
    if (oldD) {
      setSvgInput((prev) => prev.replace(oldD, serialized))
    }
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
          <span>Component & Raster Exporter</span>
        </button>

        <button
          className={`nav-tab-btn glass-interactive ${activeTab === 'pathEditor' ? 'active' : ''}`}
          onClick={() => setActiveTab('pathEditor')}
        >
          <Zap size={12} />
          <span>Interactive Path & Bezier Editor ({parsedPathCmds.length} nodes)</span>
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
            <div className="controls-row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <button
                className={`dl-svg-btn glass-interactive ${recolorEnabled ? 'active' : ''}`}
                onClick={() => setRecolorEnabled(!recolorEnabled)}
                title="Toggle dynamic fill/stroke recoloring"
              >
                <span>{recolorEnabled ? '✔ Recolor Active' : 'Enable Recolor'}</span>
              </button>

              {recolorEnabled && (
                <>
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
                </>
              )}

              <button
                className="dl-svg-btn glass-interactive"
                onClick={handleDownloadSvg}
                title="Download SVG"
              >
                <Download size={12} />
                <span>Save SVG</span>
              </button>
              <button
                className="dl-svg-btn glass-interactive"
                onClick={() => handleExportRaster('png')}
                title="Rasterize and download as PNG"
              >
                <Download size={12} />
                <span>PNG ({exportScale}x)</span>
              </button>
              <button
                className="dl-svg-btn glass-interactive"
                onClick={() => handleExportRaster('webp')}
                title="Rasterize and download as WebP"
              >
                <Download size={12} />
                <span>WebP</span>
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

      {/* Path & Bezier Editor Tab */}
      {activeTab === 'pathEditor' && (
        <div className="canvas-tab-layout">
          <div className="glass-panel" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 600 }}>Active Path:</span>
            {allPathDAttributes.map((_, pIdx) => (
              <button
                key={pIdx}
                className={`format-pill glass-interactive ${selectedPathIndex === pIdx ? 'active' : ''}`}
                onClick={() => setSelectedPathIndex(pIdx)}
              >
                Path #{pIdx + 1}
              </button>
            ))}
          </div>

          <div className="svg-preview-stage" style={{ minHeight: 220 }}>
            <div
              className="svg-mount-node"
              dangerouslySetInnerHTML={{ __html: sanitizeSvg(displaySvg) }}
            />
          </div>

          <div className="glass-panel" style={{ padding: 10, maxHeight: 240, overflowY: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, opacity: 0.8 }}>
              COORDINATE & CONTROL HANDLE INSPECTOR ({parsedPathCmds.length} COMMANDS)
            </div>
            {parsedPathCmds.map((cmd, ci) => (
              <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 11 }}>
                <span style={{ width: 24, fontWeight: 700, color: '#64D2FF' }}>{cmd.type}</span>
                {cmd.values.map((v, vi) => (
                  <div key={vi} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ opacity: 0.6, fontSize: 10 }}>{vi % 2 === 0 ? 'X' : 'Y'}:</span>
                    <input
                      type="number"
                      step="1"
                      className="hex-text-input"
                      style={{ width: 56, padding: '2px 4px', fontSize: 11 }}
                      value={v}
                      onChange={(e) => handleUpdatePathCoord(ci, vi, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'export' && (
        <div className="export-tab-layout">
          <div className="format-pills-bar">
            {(['react', 'datauri', 'css', 'minified', 'spritesheet'] as const).map((fmt) => (
              <button
                key={fmt}
                className={`format-pill glass-interactive ${exportFormat === fmt ? 'active' : ''}`}
                onClick={() => setExportFormat(fmt)}
              >
                {fmt === 'react' && 'React / TSX Component'}
                {fmt === 'datauri' && 'Base64 Data URI'}
                {fmt === 'css' && 'CSS Background Snippet'}
                {fmt === 'minified' && 'Minified XML'}
                {fmt === 'spritesheet' && 'SVG Sprite Sheet'}
              </button>
            ))}
          </div>

          <div className="glass-panel" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, opacity: 0.8 }}>Raster Exporter Scale:</span>
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                className={`format-pill glass-interactive ${exportScale === s ? 'active' : ''}`}
                onClick={() => setExportScale(s as 1 | 2 | 4)}
              >
                {s}x ({s * 512}px)
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button className="dl-svg-btn glass-interactive" onClick={() => handleExportRaster('png')}>
                PNG
              </button>
              <button className="dl-svg-btn glass-interactive" onClick={() => handleExportRaster('webp')}>
                WebP
              </button>
              <button className="dl-svg-btn glass-interactive" onClick={() => handleExportRaster('jpeg')}>
                JPEG
              </button>
            </div>
          </div>

          <div className="exported-output-card glass-panel">
            <div className="card-top-head">
              <span>{exportFormat.toUpperCase()} Code Snippet</span>
              {exportFormat === 'react' && (
                <input
                  type="text"
                  value={componentName}
                  onChange={(e) => setComponentName(e.target.value)}
                  className="hex-text-input"
                  style={{ width: '140px', marginLeft: 'auto', marginRight: '8px' }}
                  placeholder="ComponentName"
                  title="React TSX Component Name"
                />
              )}
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

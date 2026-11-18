import React, { useState, useMemo } from 'react'
import {
  Palette,
  Copy,
  Check,
  Sparkles,
  Layers,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'
import {
  colorStudioService,
  ColorDetails,
  GlassShaderParams,
} from '../../services/colorStudioService'
import './ColorStudioView.css'

type ColorTab = 'picker' | 'shader' | 'a11y' | 'harmonies'

export const ColorStudioView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ColorTab>('picker')
  const [hexInput, setHexInput] = useState<string>('#0A84FF')
  const [bgContrastHex, setBgContrastHex] = useState<string>('#0A0E18')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Shader Tuner Sliders
  const [shaderParams, setShaderParams] = useState<GlassShaderParams>({
    blurRadiusPx: 28,
    backgroundOpacity: 0.75,
    specularBorderOpacity: 0.18,
    accentGlowSpread: 16,
    tintHex: '#0A84FF',
    darkDepth: 0.2,
  })

  const colorDetails: ColorDetails = useMemo(() => {
    return colorStudioService.parseColor(hexInput)
  }, [hexInput])

  const bgDetails: ColorDetails = useMemo(() => {
    return colorStudioService.parseColor(bgContrastHex)
  }, [bgContrastHex])

  const contrastResult = useMemo(() => {
    return colorStudioService.calculateContrastRatio(hexInput, bgContrastHex)
  }, [hexInput, bgContrastHex])

  const harmonies = useMemo(() => {
    return colorStudioService.generateHarmonies(colorDetails.hex)
  }, [colorDetails.hex])

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1800)
  }

  return (
    <div className="color-studio-root">
      {/* Sub-Nav Strip */}
      <div
        className="color-subnav-strip"
        onWheel={(e) => {
          e.currentTarget.scrollLeft += e.deltaY
        }}
      >
        <button
          className={`color-nav-btn glass-interactive ${activeTab === 'picker' ? 'active' : ''}`}
          onClick={() => setActiveTab('picker')}
        >
          <Palette size={12} />
          <span>Color & Formats</span>
        </button>

        <button
          className={`color-nav-btn glass-interactive ${activeTab === 'shader' ? 'active' : ''}`}
          onClick={() => setActiveTab('shader')}
        >
          <SlidersHorizontal size={12} />
          <span>Liquid Glass Shader Lab</span>
        </button>

        <button
          className={`color-nav-btn glass-interactive ${activeTab === 'a11y' ? 'active' : ''}`}
          onClick={() => setActiveTab('a11y')}
        >
          <ShieldCheck size={12} />
          <span>WCAG 2.2 A11y Auditor</span>
          <span className={`a11y-mini-tag ${contrastResult.rating === 'Fail' ? 'fail' : 'pass'}`}>
            {contrastResult.rating}
          </span>
        </button>

        <button
          className={`color-nav-btn glass-interactive ${activeTab === 'harmonies' ? 'active' : ''}`}
          onClick={() => setActiveTab('harmonies')}
        >
          <Layers size={12} />
          <span>Harmonies</span>
        </button>
      </div>

      {/* Main Viewport */}
      <div className="color-body-viewport">
        {/* Top Quick Color Hero Bar */}
        <div className="color-picker-hero glass-panel">
          <div className="color-swatch-box" style={{ backgroundColor: colorDetails.hex }}>
            <input
              type="color"
              className="native-color-picker"
              value={colorDetails.hex.substring(0, 7)}
              onChange={(e) => {
                setHexInput(e.target.value)
                setShaderParams((p) => ({ ...p, tintHex: e.target.value }))
              }}
              title="Click to pick a color"
            />
          </div>

          <div className="color-quick-info">
            <input
              type="text"
              className="hex-direct-input"
              value={hexInput}
              onChange={(e) => {
                setHexInput(e.target.value)
                setShaderParams((p) => ({ ...p, tintHex: e.target.value }))
              }}
              placeholder="#0A84FF, rgb(...), oklch(...), cmyk(...), rebeccapurple"
            />
            <span className="contrast-badge">{colorDetails.isDark ? 'Dark Tone' : 'Light Tone'}</span>
          </div>
        </div>

        {/* TAB 1: FORMATS & CONVERTER */}
        {activeTab === 'picker' && (
          <div className="formats-section">
            <span className="section-label">UNIVERSAL COLOR CONVERSIONS</span>
            <div className="formats-list">
              {[
                { label: 'HEX', val: colorDetails.hex },
                { label: 'RGB', val: colorDetails.rgbString },
                { label: 'HSL', val: colorDetails.hslString },
                { label: 'HSV / HSB', val: colorDetails.hsvString },
                { label: 'OKLCH', val: colorDetails.oklchString },
                { label: 'CMYK', val: colorDetails.cmykString },
              ].map((f) => (
                <div key={f.label} className="format-row glass-panel">
                  <div className="f-left">
                    <span className="f-tag">{f.label}</span>
                    <code className="f-val">{f.val}</code>
                  </div>
                  <button
                    className="copy-chip-btn glass-interactive"
                    onClick={() => copyToClipboard(f.val, f.label)}
                  >
                    {copiedKey === f.label ? <Check size={11} color="#30D158" /> : <Copy size={11} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: LIQUID GLASS SHADER LAB */}
        {activeTab === 'shader' && (
          <div className="shader-lab-pane">
            <div className="shader-preview-box">
              <div
                className="interactive-glass-card"
                style={{
                  background: `rgba(${Math.round(14 * (1 - shaderParams.darkDepth))}, ${Math.round(18 * (1 - shaderParams.darkDepth))}, ${Math.round(30 * (1 - shaderParams.darkDepth))}, ${shaderParams.backgroundOpacity})`,
                  backdropFilter: `blur(${shaderParams.blurRadiusPx}px) saturate(190%)`,
                  WebkitBackdropFilter: `blur(${shaderParams.blurRadiusPx}px) saturate(190%)`,
                  border: `1px solid rgba(255, 255, 255, ${shaderParams.specularBorderOpacity})`,
                  boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37), 0 0 ${shaderParams.accentGlowSpread}px rgba(${colorDetails.rgb.r}, ${colorDetails.rgb.g}, ${colorDetails.rgb.b}, 0.35)`,
                }}
              >
                <div className="glass-card-content">
                  <Sparkles size={16} color={colorDetails.hex} />
                  <span className="glass-card-title">iOS Liquid Glass Sandbox</span>
                  <p className="glass-card-sub">Dynamic Frosted Refraction & Specular Sheen</p>
                </div>
              </div>
            </div>

            {/* Sliders Grid */}
            <div className="sliders-control-grid glass-panel">
              <div className="slider-item">
                <div className="slider-label-row">
                  <span>Backdrop Blur</span>
                  <code>{shaderParams.blurRadiusPx}px</code>
                </div>
                <input
                  type="range"
                  min="4"
                  max="64"
                  value={shaderParams.blurRadiusPx}
                  onChange={(e) =>
                    setShaderParams({ ...shaderParams, blurRadiusPx: Number(e.target.value) })
                  }
                />
              </div>

              <div className="slider-item">
                <div className="slider-label-row">
                  <span>Glass Opacity</span>
                  <code>{Math.round(shaderParams.backgroundOpacity * 100)}%</code>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.95"
                  step="0.05"
                  value={shaderParams.backgroundOpacity}
                  onChange={(e) =>
                    setShaderParams({ ...shaderParams, backgroundOpacity: Number(e.target.value) })
                  }
                />
              </div>

              <div className="slider-item">
                <div className="slider-label-row">
                  <span>Specular Border</span>
                  <code>{Math.round(shaderParams.specularBorderOpacity * 100)}%</code>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.6"
                  step="0.02"
                  value={shaderParams.specularBorderOpacity}
                  onChange={(e) =>
                    setShaderParams({
                      ...shaderParams,
                      specularBorderOpacity: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="slider-item">
                <div className="slider-label-row">
                  <span>Accent Glow Spread</span>
                  <code>{shaderParams.accentGlowSpread}px</code>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={shaderParams.accentGlowSpread}
                  onChange={(e) =>
                    setShaderParams({ ...shaderParams, accentGlowSpread: Number(e.target.value) })
                  }
                />
              </div>

              <div className="slider-item">
                <div className="slider-label-row">
                  <span>Dark Velvet Depth</span>
                  <code>{Math.round(shaderParams.darkDepth * 100)}%</code>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.9"
                  step="0.05"
                  value={shaderParams.darkDepth}
                  onChange={(e) =>
                    setShaderParams({ ...shaderParams, darkDepth: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="shader-export-box glass-panel">
              <div className="export-title-row">
                <span className="section-label">GENERATED CSS TOKEN</span>
                <button
                  className="copy-chip-btn glass-interactive"
                  onClick={() =>
                    copyToClipboard(
                      colorStudioService.exportGlassCss(shaderParams),
                      'shader_css_copy'
                    )
                  }
                >
                  {copiedKey === 'shader_css_copy' ? <Check size={11} color="#30D158" /> : <Copy size={11} />}
                  <span>Copy CSS</span>
                </button>
              </div>
              <pre className="shader-css-pre">
                {colorStudioService.exportGlassCss(shaderParams)}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: WCAG 2.2 A11Y CONTRAST AUDITOR */}
        {activeTab === 'a11y' && (
          <div className="a11y-auditor-pane">
            <div className="contrast-hero-card glass-panel">
              <div className="contrast-score-block">
                <span className="ratio-number">{contrastResult.ratioFormatted}</span>
                <span className={`compliance-tag ${contrastResult.rating === 'Fail' ? 'fail' : 'pass'}`}>
                  WCAG {contrastResult.rating}
                </span>
              </div>

              <div className="bg-picker-row">
                <span className="bg-label">Background Color:</span>
                <input
                  type="color"
                  value={bgDetails.hex}
                  onChange={(e) => setBgContrastHex(e.target.value)}
                  className="native-color-picker-mini"
                />
                <input
                  type="text"
                  value={bgContrastHex}
                  onChange={(e) => setBgContrastHex(e.target.value)}
                  className="hex-direct-input-mini"
                />
                <button
                  className="copy-chip-btn glass-interactive"
                  onClick={() => {
                    const prevFg = hexInput
                    setHexInput(bgContrastHex)
                    setBgContrastHex(prevFg)
                    setShaderParams((p) => ({ ...p, tintHex: bgContrastHex }))
                  }}
                  title="Swap Foreground & Background colors"
                >
                  ⇄ Swap
                </button>
              </div>

              {/* Live FG-on-BG Preview */}
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: bgDetails.hex,
                  color: colorDetails.hex,
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700 }}>Aa — Large Heading Sample (18pt+)</div>
                <div style={{ fontSize: 12, marginTop: 2 }}>
                  The quick brown fox jumps over the lazy dog ({colorDetails.hex} on {bgDetails.hex}).
                </div>
              </div>
            </div>

            {/* Checklist Matrix */}
            <div className="wcag-checklist glass-panel">
              <span className="section-label">WCAG 2.2 LEVEL COMPLIANCE AUDIT</span>
              <div className="check-item">
                <span className="check-label">Normal Text (&lt;18pt) - 4.5:1 (AA)</span>
                <span className={`status-pill ${contrastResult.wcagAaNormal ? 'pass' : 'fail'}`}>
                  {contrastResult.wcagAaNormal ? 'PASS' : 'FAIL'}
                </span>
              </div>
              <div className="check-item">
                <span className="check-label">Enhanced Contrast - 7.0:1 (AAA)</span>
                <span className={`status-pill ${contrastResult.wcagAaaNormal ? 'pass' : 'fail'}`}>
                  {contrastResult.wcagAaaNormal ? 'PASS' : 'FAIL'}
                </span>
              </div>
              <div className="check-item">
                <span className="check-label">Large Text (&ge;18pt / &ge;14pt Bold) - 3.0:1 (AA)</span>
                <span className={`status-pill ${contrastResult.wcagAaLarge ? 'pass' : 'fail'}`}>
                  {contrastResult.wcagAaLarge ? 'PASS' : 'FAIL'}
                </span>
              </div>
              <div className="check-item">
                <span className="check-label">UI Components & Icons - 3.0:1</span>
                <span className={`status-pill ${contrastResult.wcagUiComponents ? 'pass' : 'fail'}`}>
                  {contrastResult.wcagUiComponents ? 'PASS' : 'FAIL'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: HARMONIES */}
        {activeTab === 'harmonies' && (
          <div className="harmonies-section">
            <span className="section-label">HARMONIOUS PALETTES</span>

            <div className="harmony-block glass-panel">
              <span className="harmony-title">Complementary (180°)</span>
              <div className="palette-strip">
                <div
                  className="swatch-item"
                  style={{ backgroundColor: colorDetails.hex, cursor: 'pointer' }}
                  onClick={() => copyToClipboard(colorDetails.hex, 'comp_base')}
                  title="Click to copy HEX"
                >
                  <span>{copiedKey === 'comp_base' ? 'Copied!' : colorDetails.hex}</span>
                </div>
                <div
                  className="swatch-item"
                  style={{ backgroundColor: harmonies.complementary, cursor: 'pointer' }}
                  onClick={() => copyToClipboard(harmonies.complementary, 'comp_alt')}
                  title="Click to copy HEX"
                >
                  <span>{copiedKey === 'comp_alt' ? 'Copied!' : harmonies.complementary}</span>
                </div>
              </div>
            </div>

            <div className="harmony-block glass-panel">
              <span className="harmony-title">Analogous (±30° Spread)</span>
              <div className="palette-strip">
                <div
                  className="swatch-item"
                  style={{ backgroundColor: harmonies.analogous[1], cursor: 'pointer' }}
                  onClick={() => copyToClipboard(harmonies.analogous[1], 'ana_left')}
                  title="Click to copy HEX"
                >
                  <span>{copiedKey === 'ana_left' ? 'Copied!' : harmonies.analogous[1]}</span>
                </div>
                <div
                  className="swatch-item"
                  style={{ backgroundColor: colorDetails.hex, cursor: 'pointer' }}
                  onClick={() => copyToClipboard(colorDetails.hex, 'ana_base')}
                  title="Click to copy HEX"
                >
                  <span>{copiedKey === 'ana_base' ? 'Copied!' : colorDetails.hex}</span>
                </div>
                <div
                  className="swatch-item"
                  style={{ backgroundColor: harmonies.analogous[0], cursor: 'pointer' }}
                  onClick={() => copyToClipboard(harmonies.analogous[0], 'ana_right')}
                  title="Click to copy HEX"
                >
                  <span>{copiedKey === 'ana_right' ? 'Copied!' : harmonies.analogous[0]}</span>
                </div>
              </div>
            </div>

            <div className="harmony-block glass-panel">
              <span className="harmony-title">Triadic (120° Spread)</span>
              <div className="palette-strip">
                <div
                  className="swatch-item"
                  style={{ backgroundColor: colorDetails.hex, cursor: 'pointer' }}
                  onClick={() => copyToClipboard(colorDetails.hex, 'tri_base')}
                  title="Click to copy HEX"
                >
                  <span>{copiedKey === 'tri_base' ? 'Copied!' : colorDetails.hex}</span>
                </div>
                {harmonies.triadic.map((h, i) => (
                  <div
                    key={i}
                    className="swatch-item"
                    style={{ backgroundColor: h, cursor: 'pointer' }}
                    onClick={() => copyToClipboard(h, `tri_${i}`)}
                    title="Click to copy HEX"
                  >
                    <span>{copiedKey === `tri_${i}` ? 'Copied!' : h}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

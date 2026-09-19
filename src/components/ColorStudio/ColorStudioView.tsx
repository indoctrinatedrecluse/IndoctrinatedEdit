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
              placeholder="#0A84FF or rgb(...)"
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
                  background: `rgba(14, 18, 30, ${shaderParams.backgroundOpacity})`,
                  backdropFilter: `blur(${shaderParams.blurRadiusPx}px) saturate(190%)`,
                  WebkitBackdropFilter: `blur(${shaderParams.blurRadiusPx}px) saturate(190%)`,
                  border: `1px solid rgba(255, 255, 255, ${shaderParams.specularBorderOpacity})`,
                  boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 ${shaderParams.accentGlowSpread}px ${colorDetails.hex}66`,
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
                  value={bgContrastHex.substring(0, 7)}
                  onChange={(e) => setBgContrastHex(e.target.value)}
                  className="native-color-picker-mini"
                />
                <input
                  type="text"
                  value={bgContrastHex}
                  onChange={(e) => setBgContrastHex(e.target.value)}
                  className="hex-direct-input-mini"
                />
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
              <span className="harmony-title">Complementary</span>
              <div className="palette-strip">
                <div
                  className="swatch-item"
                  style={{ backgroundColor: colorDetails.hex }}
                  onClick={() => copyToClipboard(colorDetails.hex, 'comp_base')}
                >
                  <span>{colorDetails.hex}</span>
                </div>
                <div
                  className="swatch-item"
                  style={{ backgroundColor: harmonies.complementary }}
                  onClick={() => copyToClipboard(harmonies.complementary, 'comp_alt')}
                >
                  <span>{harmonies.complementary}</span>
                </div>
              </div>
            </div>

            <div className="harmony-block glass-panel">
              <span className="harmony-title">Triadic (120° Spread)</span>
              <div className="palette-strip">
                <div
                  className="swatch-item"
                  style={{ backgroundColor: colorDetails.hex }}
                >
                  <span>{colorDetails.hex}</span>
                </div>
                {harmonies.triadic.map((h, i) => (
                  <div key={i} className="swatch-item" style={{ backgroundColor: h }}>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .color-studio-root {
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

        .color-subnav-strip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.35);
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
        }

        .color-nav-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 10.5px;
          font-weight: 600;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid transparent;
          cursor: pointer;
          white-space: nowrap;
        }

        .color-nav-btn.active {
          color: #FFF;
          background: rgba(10, 132, 255, 0.22);
          border-color: rgba(10, 132, 255, 0.4);
          box-shadow: 0 0 8px rgba(10, 132, 255, 0.2);
        }

        .a11y-mini-tag {
          font-size: 8px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 2px;
        }

        .a11y-mini-tag.pass { background: rgba(48, 209, 88, 0.25); color: #30D158; }
        .a11y-mini-tag.fail { background: rgba(255, 69, 58, 0.25); color: #FF453A; }

        .color-body-viewport {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .color-picker-hero {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .color-swatch-box {
          width: 38px;
          height: 38px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          position: relative;
          overflow: hidden;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
          flex-shrink: 0;
        }

        .native-color-picker {
          position: absolute;
          top: -10px;
          left: -10px;
          width: 60px;
          height: 60px;
          opacity: 0;
          cursor: pointer;
        }

        .color-quick-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .hex-direct-input {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #FFF;
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 4px;
          outline: none;
          width: 140px;
        }

        .contrast-badge {
          font-size: 9.5px;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 6px;
          border-radius: 3px;
        }

        .section-label {
          font-size: 9.5px;
          font-weight: 800;
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .formats-list { display: flex; flex-direction: column; gap: 6px; }

        .format-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 10px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .f-left { display: flex; align-items: center; gap: 8px; }
        .f-tag { font-size: 9px; font-weight: 800; color: #64D2FF; width: 44px; }
        .f-val { font-family: var(--font-mono); font-size: 11px; color: #FFF; }

        .copy-chip-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
        }

        .copy-chip-btn:hover { color: #FFF; }

        .shader-preview-box {
          display: flex;
          justify-content: center;
          padding: 16px;
          background: #080B14;
          background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 0);
          background-size: 14px 14px;
          border-radius: 8px;
        }

        .interactive-glass-card {
          width: 100%;
          max-width: 320px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 6px;
        }

        .glass-card-title { font-weight: 700; color: #FFF; font-size: 12px; }
        .glass-card-sub { font-size: 10px; color: var(--text-muted); margin: 0; }

        .sliders-control-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 10px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .slider-item { display: flex; flex-direction: column; gap: 3px; }
        .slider-label-row { display: flex; justify-content: space-between; font-size: 10px; color: var(--text-secondary); }
        .slider-label-row code { font-family: var(--font-mono); color: #64D2FF; }

        .slider-item input[type='range'] {
          width: 100%;
          accent-color: #0A84FF;
        }

        .shader-export-box {
          padding: 8px 10px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .export-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }

        .shader-css-pre {
          margin: 0;
          padding: 8px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 10px;
          color: #64D2FF;
          overflow-x: auto;
        }

        .contrast-hero-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .contrast-score-block { display: flex; align-items: center; gap: 8px; }
        .ratio-number { font-size: 20px; font-weight: 800; color: #FFF; font-family: var(--font-mono); }
        .compliance-tag { font-size: 11px; font-weight: 800; padding: 2px 6px; border-radius: 3px; }
        .compliance-tag.pass { background: rgba(48, 209, 88, 0.25); color: #30D158; }
        .compliance-tag.fail { background: rgba(255, 69, 58, 0.25); color: #FF453A; }

        .bg-picker-row { display: flex; align-items: center; gap: 6px; }
        .bg-label { font-size: 10px; color: var(--text-muted); }
        .native-color-picker-mini { width: 22px; height: 22px; border: none; background: none; cursor: pointer; }
        .hex-direct-input-mini {
          width: 70px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #FFF;
          font-family: var(--font-mono);
          font-size: 10px;
          padding: 2px 4px;
          border-radius: 3px;
        }

        .wcag-checklist {
          padding: 10px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .check-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10.5px;
          padding: 3px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .status-pill { font-size: 9px; font-weight: 800; padding: 1px 6px; border-radius: 2px; }
        .status-pill.pass { background: rgba(48, 209, 88, 0.2); color: #30D158; }
        .status-pill.fail { background: rgba(255, 69, 58, 0.2); color: #FF453A; }

        .harmonies-section { display: flex; flex-direction: column; gap: 8px; }
        .harmony-block { padding: 8px; border-radius: 6px; background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.08); }
        .harmony-title { font-size: 10px; font-weight: 700; color: #FFF; margin-bottom: 6px; display: block; }
        .palette-strip { display: flex; gap: 6px; }
        .swatch-item {
          flex: 1;
          height: 36px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .swatch-item span { font-family: var(--font-mono); font-size: 9px; font-weight: 700; color: #FFF; text-shadow: 0 1px 3px rgba(0,0,0,0.8); }
      `}</style>
    </div>
  )
}

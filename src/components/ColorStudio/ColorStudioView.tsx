import React, { useState, useMemo } from 'react'
import {
  Palette,
  Copy,
  Check,
  Sparkles,
  Layers,
} from 'lucide-react'
import { colorStudioService, ColorDetails, GlassPalette } from '../../services/colorStudioService'

export const ColorStudioView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'picker' | 'glass' | 'harmonies'>('picker')
  const [hexInput, setHexInput] = useState<string>('#0A84FF')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const colorDetails: ColorDetails = useMemo(() => {
    return colorStudioService.parseColor(hexInput)
  }, [hexInput])

  const harmonies = useMemo(() => {
    return colorStudioService.generateHarmonies(colorDetails.hex)
  }, [colorDetails.hex])

  const glassTheme: GlassPalette = useMemo(() => {
    return colorStudioService.generateGlassTheme(colorDetails.hex, 'Liquid Glass Dynamic Theme')
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
          className={`color-nav-btn glass-interactive ${activeTab === 'glass' ? 'active' : ''}`}
          onClick={() => setActiveTab('glass')}
        >
          <Sparkles size={12} />
          <span>Liquid Glass Tokens</span>
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
        {/* Top Quick Color Bar */}
        <div className="color-picker-hero glass-panel">
          <div className="color-swatch-box" style={{ backgroundColor: colorDetails.hex }}>
            <input
              type="color"
              className="native-color-picker"
              value={colorDetails.hex}
              onChange={(e) => setHexInput(e.target.value)}
              title="Click to pick a color"
            />
          </div>

          <div className="color-quick-info">
            <input
              type="text"
              className="hex-direct-input"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
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
                { label: 'RGB / RGBA', val: colorDetails.rgbString },
                { label: 'HSL / HSLA', val: colorDetails.hslString },
                { label: 'OKLCH (Modern CSS)', val: colorDetails.oklchString },
                { label: 'CMYK (Print)', val: colorDetails.cmykString },
              ].map((fmt) => (
                <div key={fmt.label} className="format-card glass-panel">
                  <div className="format-meta">
                    <span className="fmt-label">{fmt.label}</span>
                    <button
                      className="copy-btn glass-interactive"
                      onClick={() => copyToClipboard(fmt.val, fmt.label)}
                    >
                      {copiedKey === fmt.label ? <Check size={11} color="#30D158" /> : <Copy size={11} />}
                    </button>
                  </div>
                  <code className="fmt-val">{fmt.val}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: LIQUID GLASS THEME TOKENS */}
        {activeTab === 'glass' && (
          <div className="glass-theme-section">
            {/* Live Glass Mockup Preview Card */}
            <div
              className="glass-mockup-card"
              style={{
                background: glassTheme.glassBackground,
                backdropFilter: `blur(${glassTheme.glassBlurRadius}) saturate(${glassTheme.glassSaturation})`,
                border: `1px solid ${glassTheme.specularBorder}`,
                boxShadow: `0 8px 32px ${glassTheme.accentGlow}`,
                color: glassTheme.textPrimary,
              }}
            >
              <div className="mockup-header">
                <span className="mockup-pill" style={{ background: glassTheme.accentGlow }}>
                  ✨ Liquid Glass Live Preview
                </span>
              </div>
              <p className="mockup-text" style={{ color: glassTheme.textMuted }}>
                Rendered with dynamic blur, specular reflection borders, and neon accent diffusion glow.
              </p>
            </div>

            {/* Generated Tokens Table */}
            <div className="tokens-list">
              <span className="section-label">LIQUID GLASS TOKENS</span>
              <div className="token-card glass-panel">
                <div className="token-row">
                  <span className="t-name">glassBackground:</span>
                  <code className="t-code">{glassTheme.glassBackground}</code>
                </div>
                <div className="token-row">
                  <span className="t-name">specularBorder:</span>
                  <code className="t-code">{glassTheme.specularBorder}</code>
                </div>
                <div className="token-row">
                  <span className="t-name">accentGlow:</span>
                  <code className="t-code">{glassTheme.accentGlow}</code>
                </div>
                <div className="token-row">
                  <span className="t-name">textPrimary:</span>
                  <code className="t-code">{glassTheme.textPrimary}</code>
                </div>
              </div>

              <button
                className="copy-all-tokens-btn glass-interactive"
                onClick={() =>
                  copyToClipboard(
                    JSON.stringify(glassTheme, null, 2),
                    'tokens-json'
                  )
                }
              >
                {copiedKey === 'tokens-json' ? <Check size={12} color="#30D158" /> : <Copy size={12} />}
                <span>{copiedKey === 'tokens-json' ? 'Copied Theme JSON!' : 'Copy Glass Theme JSON'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: COLOR HARMONIES */}
        {activeTab === 'harmonies' && (
          <div className="harmonies-section">
            <div className="harmony-group glass-panel">
              <span className="harmony-title">COMPLEMENTARY (180°)</span>
              <div className="swatches-row">
                <div className="swatch-item" style={{ backgroundColor: colorDetails.hex }} onClick={() => setHexInput(colorDetails.hex)}>
                  <span>{colorDetails.hex}</span>
                </div>
                <div className="swatch-item" style={{ backgroundColor: harmonies.complementary }} onClick={() => setHexInput(harmonies.complementary)}>
                  <span>{harmonies.complementary}</span>
                </div>
              </div>
            </div>

            <div className="harmony-group glass-panel">
              <span className="harmony-title">ANALOGOUS (±30°)</span>
              <div className="swatches-row">
                <div className="swatch-item" style={{ backgroundColor: harmonies.analogous[0] }} onClick={() => setHexInput(harmonies.analogous[0])}>
                  <span>{harmonies.analogous[0]}</span>
                </div>
                <div className="swatch-item" style={{ backgroundColor: colorDetails.hex }} onClick={() => setHexInput(colorDetails.hex)}>
                  <span>{colorDetails.hex}</span>
                </div>
                <div className="swatch-item" style={{ backgroundColor: harmonies.analogous[1] }} onClick={() => setHexInput(harmonies.analogous[1])}>
                  <span>{harmonies.analogous[1]}</span>
                </div>
              </div>
            </div>

            <div className="harmony-group glass-panel">
              <span className="harmony-title">TRIADIC (±120°)</span>
              <div className="swatches-row">
                <div className="swatch-item" style={{ backgroundColor: colorDetails.hex }} onClick={() => setHexInput(colorDetails.hex)}>
                  <span>{colorDetails.hex}</span>
                </div>
                <div className="swatch-item" style={{ backgroundColor: harmonies.triadic[0] }} onClick={() => setHexInput(harmonies.triadic[0])}>
                  <span>{harmonies.triadic[0]}</span>
                </div>
                <div className="swatch-item" style={{ backgroundColor: harmonies.triadic[1] }} onClick={() => setHexInput(harmonies.triadic[1])}>
                  <span>{harmonies.triadic[1]}</span>
                </div>
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
          color: var(--text-primary);
          overflow: hidden;
          font-family: var(--font-ui);
        }

        .color-subnav-strip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
        }

        .color-nav-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: var(--radius-sm);
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .color-nav-btn.active {
          background: rgba(10, 132, 255, 0.25);
          border-color: rgba(10, 132, 255, 0.45);
          color: #FFF;
        }

        .color-body-viewport {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .color-picker-hero {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
        }

        .color-swatch-box {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-sm);
          border: 2px solid rgba(255, 255, 255, 0.2);
          position: relative;
          cursor: pointer;
          overflow: hidden;
          flex-shrink: 0;
        }

        .native-color-picker {
          opacity: 0;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }

        .color-quick-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .hex-direct-input {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-xs);
          padding: 4px 8px;
          color: #FFF;
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 700;
          outline: none;
        }

        .contrast-badge {
          font-size: 9px;
          font-weight: 700;
          color: var(--text-muted);
        }

        .section-label {
          font-size: 10px;
          font-weight: 800;
          color: var(--text-muted);
        }

        .formats-section, .glass-theme-section, .harmonies-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .formats-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .format-card {
          padding: 8px 10px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .format-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .fmt-label { font-size: 9.5px; font-weight: 800; color: var(--text-muted); }

        .fmt-val {
          font-family: var(--font-mono);
          font-size: 11.5px;
          color: #64D2FF;
          font-weight: 600;
        }

        .copy-btn {
          font-size: 10px;
          color: #64D2FF;
          background: none;
          border: none;
          cursor: pointer;
        }

        /* Glass Preview Mockup */
        .glass-mockup-card {
          padding: 16px;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .mockup-header {
          display: flex;
          align-items: center;
        }

        .mockup-pill {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          color: #FFF;
        }

        .mockup-text {
          margin: 0;
          font-size: 11px;
        }

        .tokens-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .token-card {
          padding: 10px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .token-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10.5px;
        }

        .t-name { color: var(--text-muted); }
        .t-code { font-family: var(--font-mono); color: #E2E8F0; }

        .copy-all-tokens-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px;
          border-radius: var(--radius-xs);
          background: rgba(10, 132, 255, 0.2);
          border: 1px solid rgba(10, 132, 255, 0.4);
          color: #64D2FF;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        /* Harmonies */
        .harmony-group {
          padding: 10px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .harmony-title {
          font-size: 9.5px;
          font-weight: 800;
          color: var(--text-muted);
        }

        .swatches-row {
          display: flex;
          gap: 8px;
        }

        .swatch-item {
          flex: 1;
          height: 40px;
          border-radius: var(--radius-xs);
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: flex-end;
          padding: 4px;
          cursor: pointer;
        }

        .swatch-item span {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          background: rgba(0, 0, 0, 0.6);
          color: #FFF;
          padding: 1px 4px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  )
}

/**
 * IndoctrinatedEdit - Color Palette, Liquid Glass Shader & A11y Studio Service
 * Multi-format color parser, WCAG 2.2 accessibility contrast auditor,
 * Liquid Glass shader tuner, and gradient/token exporter.
 */

export interface ColorDetails {
  hex: string
  rgb: { r: number; g: number; b: number; a: number }
  hsl: { h: number; s: number; l: number; a: number }
  rgbString: string
  hslString: string
  oklchString: string
  cmykString: string
  isDark: boolean
}

export interface GlassPalette {
  name: string
  glassBackground: string
  glassBlurRadius: string
  glassSaturation: string
  specularBorder: string
  accentGlow: string
  textPrimary: string
  textMuted: string
}

export interface ContrastAuditResult {
  ratio: number
  ratioFormatted: string
  wcagAaNormal: boolean
  wcagAaaNormal: boolean
  wcagAaLarge: boolean
  wcagAaaLarge: boolean
  wcagUiComponents: boolean
  rating: 'AAA' | 'AA' | 'AA Large' | 'Fail'
}

export interface GlassShaderParams {
  blurRadiusPx: number
  backgroundOpacity: number
  specularBorderOpacity: number
  accentGlowSpread: number
  tintHex: string
  darkDepth: number
}

class ColorStudioService {
  /**
   * Parse hex, rgb, or hsl string into complete ColorDetails
   */
  public parseColor(input: string): ColorDetails {
    let r = 10, g = 132, b = 255, a = 1.0 // Default electric blue

    const clean = input.trim()

    if (clean.startsWith('#')) {
      const hex = clean.replace('#', '')
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16)
        g = parseInt(hex[1] + hex[1], 16)
        b = parseInt(hex[2] + hex[2], 16)
      } else if (hex.length >= 6) {
        r = parseInt(hex.substring(0, 2), 16)
        g = parseInt(hex.substring(2, 4), 16)
        b = parseInt(hex.substring(4, 6), 16)
        if (hex.length === 8) {
          a = Math.round((parseInt(hex.substring(6, 8), 16) / 255) * 100) / 100
        }
      }
    } else if (clean.startsWith('rgb')) {
      const parts = clean.match(/[\d.]+/g)
      if (parts && parts.length >= 3) {
        r = Math.min(255, Math.max(0, parseInt(parts[0], 10)))
        g = Math.min(255, Math.max(0, parseInt(parts[1], 10)))
        b = Math.min(255, Math.max(0, parseInt(parts[2], 10)))
        if (parts.length >= 4) {
          a = Math.min(1, Math.max(0, parseFloat(parts[3])))
        }
      }
    }

    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase()
    const hsl = this.rgbToHsl(r, g, b, a)
    const cmyk = this.rgbToCmyk(r, g, b)

    // Calculate luminance for contrast
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    const isDark = luminance < 0.5

    return {
      hex,
      rgb: { r, g, b, a },
      hsl,
      rgbString: a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`,
      hslString: a < 1 ? `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${a})` : `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
      oklchString: `oklch(${(luminance * 100).toFixed(1)}% ${(hsl.s / 500).toFixed(3)} ${hsl.h})`,
      cmykString: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`,
      isDark,
    }
  }

  private rgbToHsl(r: number, g: number, b: number, a = 1): { h: number; s: number; l: number; a: number } {
    const rNorm = r / 255
    const gNorm = g / 255
    const bNorm = b / 255

    const max = Math.max(rNorm, gNorm, bNorm)
    const min = Math.min(rNorm, gNorm, bNorm)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case rNorm:
          h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)
          break
        case gNorm:
          h = (bNorm - rNorm) / d + 2
          break
        case bNorm:
          h = (rNorm - gNorm) / d + 4
          break
      }
      h /= 6
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
      a,
    }
  }

  private rgbToCmyk(r: number, g: number, b: number): { c: number; m: number; y: number; k: number } {
    const rNorm = r / 255
    const gNorm = g / 255
    const bNorm = b / 255
    const k = 1 - Math.max(rNorm, gNorm, bNorm)
    if (k === 1) return { c: 0, m: 0, y: 0, k: 100 }
    const c = Math.round(((1 - rNorm - k) / (1 - k)) * 100)
    const m = Math.round(((1 - gNorm - k) / (1 - k)) * 100)
    const y = Math.round(((1 - bNorm - k) / (1 - k)) * 100)
    return { c, m, y, k: Math.round(k * 100) }
  }

  /**
   * WCAG 2.2 Relative Luminance and Contrast Ratio calculation
   */
  public calculateContrastRatio(fgHex: string, bgHex: string): ContrastAuditResult {
    const fg = this.parseColor(fgHex)
    const bg = this.parseColor(bgHex)

    const l1 = this.getRelativeLuminance(fg.rgb.r, fg.rgb.g, fg.rgb.b)
    const l2 = this.getRelativeLuminance(bg.rgb.r, bg.rgb.g, bg.rgb.b)

    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)

    const ratio = Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100
    const ratioFormatted = `${ratio}:1`

    const wcagAaNormal = ratio >= 4.5
    const wcagAaaNormal = ratio >= 7.0
    const wcagAaLarge = ratio >= 3.0
    const wcagAaaLarge = ratio >= 4.5
    const wcagUiComponents = ratio >= 3.0

    let rating: ContrastAuditResult['rating'] = 'Fail'
    if (wcagAaaNormal) rating = 'AAA'
    else if (wcagAaNormal) rating = 'AA'
    else if (wcagAaLarge) rating = 'AA Large'

    return {
      ratio,
      ratioFormatted,
      wcagAaNormal,
      wcagAaaNormal,
      wcagAaLarge,
      wcagAaaLarge,
      wcagUiComponents,
      rating,
    }
  }

  private getRelativeLuminance(r: number, g: number, b: number): number {
    const sRGB = [r, g, b].map((val) => {
      const v = val / 255
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
  }

  /**
   * Generate harmonious color scheme (Complementary, Triadic, Analogous)
   */
  public generateHarmonies(hex: string): { complementary: string; analogous: string[]; triadic: string[] } {
    const { hsl } = this.parseColor(hex)
    const compH = (hsl.h + 180) % 360
    const an1H = (hsl.h + 30) % 360
    const an2H = (hsl.h + 330) % 360
    const tri1H = (hsl.h + 120) % 360
    const tri2H = (hsl.h + 240) % 360

    return {
      complementary: this.hslToHex(compH, hsl.s, hsl.l),
      analogous: [this.hslToHex(an1H, hsl.s, hsl.l), this.hslToHex(an2H, hsl.s, hsl.l)],
      triadic: [this.hslToHex(tri1H, hsl.s, hsl.l), this.hslToHex(tri2H, hsl.s, hsl.l)],
    }
  }

  private hslToHex(h: number, s: number, l: number): string {
    const sNorm = s / 100
    const lNorm = l / 100
    const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = lNorm - c / 2
    let r = 0, g = 0, b = 0

    if (h >= 0 && h < 60) { r = c; g = x; b = 0 }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0 }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c }
    else { r = c; g = 0; b = x }

    const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0')
    const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0')
    const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0')

    return `#${rHex}${gHex}${bHex}`.toUpperCase()
  }

  /**
   * Generate Liquid Glass Theme tokens from base accent color
   */
  public generateGlassTheme(baseHex: string, name = 'Custom Glass Theme'): GlassPalette {
    const details = this.parseColor(baseHex)
    const { r, g, b } = details.rgb

    return {
      name,
      glassBackground: `rgba(14, 18, 30, 0.82)`,
      glassBlurRadius: '32px',
      glassSaturation: '200%',
      specularBorder: 'rgba(255, 255, 255, 0.16)',
      accentGlow: `rgba(${r}, ${g}, ${b}, 0.50)`,
      textPrimary: '#F8FAFC',
      textMuted: 'rgba(226, 232, 240, 0.60)',
    }
  }

  /**
   * Generates CSS code for tuned Liquid Glass parameters
   */
  public exportGlassCss(params: GlassShaderParams): string {
    const tint = this.parseColor(params.tintHex)
    const { r, g, b } = tint.rgb

    return `/* Indoctrinated iOS Liquid Glass Token Definition */
.liquid-glass-tuned {
  background: rgba(${Math.round(14 * (1 - params.darkDepth))}, ${Math.round(18 * (1 - params.darkDepth))}, ${Math.round(30 * (1 - params.darkDepth))}, ${params.backgroundOpacity});
  backdrop-filter: blur(${params.blurRadiusPx}px) saturate(190%);
  -webkit-backdrop-filter: blur(${params.blurRadiusPx}px) saturate(190%);
  border: 1px solid rgba(255, 255, 255, ${params.specularBorderOpacity});
  box-shadow: 
    0 8px 32px 0 rgba(0, 0, 0, 0.37),
    0 0 ${params.accentGlowSpread}px rgba(${r}, ${g}, ${b}, 0.35);
  border-radius: 12px;
}
`
  }
}

export const colorStudioService = new ColorStudioService()

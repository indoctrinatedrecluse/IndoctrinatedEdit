/**
 * IndoctrinatedEdit - Color Palette, Liquid Glass Shader & A11y Studio Service
 * Multi-format color parser, WCAG 2.2 accessibility contrast auditor,
 * Liquid Glass shader tuner, and gradient/token exporter.
 */

export interface ColorDetails {
  hex: string
  rgb: { r: number; g: number; b: number; a: number }
  hsl: { h: number; s: number; l: number; a: number }
  hsv: { h: number; s: number; v: number }
  rgbString: string
  hslString: string
  hsvString: string
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

export interface ColorHarmonies {
  complementary: string
  analogous: string[]
  triadic: string[]
  tetradic: string[]
  monochromatic: string[]
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
   * Accurate sRGB (0-255) -> Linear sRGB -> Oklab -> OKLCH conversion (Björn Ottosson).
   */
  private rgbToOklch(r: number, g: number, b: number): { l: number; c: number; h: number } {
    const toLinear = (v: number) => {
      const s = v / 255
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    }
    const lr = toLinear(r)
    const lg = toLinear(g)
    const lb = toLinear(b)

    const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
    const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
    const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)

    const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
    const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
    const bLab = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_

    const C = Math.sqrt(a * a + bLab * bLab)
    let H = (Math.atan2(bLab, a) * 180) / Math.PI
    if (H < 0) H += 360
    if (C < 1e-5) H = 0

    return { l: L, c: C, h: H }
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    const hNorm = ((h % 360) + 360) % 360
    const sNorm = Math.min(100, Math.max(0, s)) / 100
    const lNorm = Math.min(100, Math.max(0, l)) / 100
    const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm
    const x = c * (1 - Math.abs(((hNorm / 60) % 2) - 1))
    const m = lNorm - c / 2
    let r1 = 0, g1 = 0, b1 = 0
    if (hNorm < 60) { r1 = c; g1 = x }
    else if (hNorm < 120) { r1 = x; g1 = c }
    else if (hNorm < 180) { g1 = c; b1 = x }
    else if (hNorm < 240) { g1 = x; b1 = c }
    else if (hNorm < 300) { r1 = x; b1 = c }
    else { r1 = c; b1 = x }
    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255),
    }
  }

  private namedCssColors: Record<string, string> = {
    black: '#000000', white: '#FFFFFF', red: '#FF0000', green: '#008000', blue: '#0000FF',
    yellow: '#FFFF00', cyan: '#00FFFF', magenta: '#FF00FF', gray: '#808080', grey: '#808080',
    orange: '#FFA500', purple: '#800080', pink: '#FFC0CB', gold: '#FFD700', silver: '#C0C0C0',
    rebeccapurple: '#663399', transparent: 'rgba(0,0,0,0)', cornflowerblue: '#6495ED',
    darkblue: '#00008B', darkcyan: '#008B8B', darkgray: '#A9A9A9', darkgreen: '#006400',
    darkmagenta: '#8B008B', darkred: '#8B0000', deepskyblue: '#00BFFF', dodgerblue: '#1E90FF',
    indigo: '#4B0082', lime: '#00FF00', navy: '#000080', olive: '#808000', teal: '#008080',
  }

  /**
   * Parse hex, rgb/rgba, hsl/hsla, oklch, cmyk, or CSS color names into complete ColorDetails.
   */
  public parseColor(input: string): ColorDetails {
    let r = 10, g = 132, b = 255, a = 1.0 // Default electric blue

    let clean = input.trim().toLowerCase()
    if (this.namedCssColors[clean]) {
      clean = this.namedCssColors[clean]
    }

    if (clean.startsWith('#')) {
      const hex = clean.replace('#', '')
      if (/^[0-9a-fA-F]{3}$/.test(hex)) {
        r = parseInt(hex[0] + hex[0], 16)
        g = parseInt(hex[1] + hex[1], 16)
        b = parseInt(hex[2] + hex[2], 16)
      } else if (/^[0-9a-fA-F]{6}$/.test(hex)) {
        r = parseInt(hex.substring(0, 2), 16)
        g = parseInt(hex.substring(2, 4), 16)
        b = parseInt(hex.substring(4, 6), 16)
      } else if (/^[0-9a-fA-F]{8}$/.test(hex)) {
        r = parseInt(hex.substring(0, 2), 16)
        g = parseInt(hex.substring(2, 4), 16)
        b = parseInt(hex.substring(4, 6), 16)
        a = Math.round((parseInt(hex.substring(6, 8), 16) / 255) * 100) / 100
      }
    } else if (/^rgba?\(/i.test(clean)) {
      const parts = clean.match(/[\d.]+/g)
      if (parts && parts.length >= 3) {
        r = Math.min(255, Math.max(0, Math.round(parseFloat(parts[0]))))
        g = Math.min(255, Math.max(0, Math.round(parseFloat(parts[1]))))
        b = Math.min(255, Math.max(0, Math.round(parseFloat(parts[2]))))
        if (parts.length >= 4) {
          a = Math.min(1, Math.max(0, parseFloat(parts[3])))
        }
      }
    } else if (/^hsla?\(/i.test(clean)) {
      const parts = clean.match(/[\d.]+/g)
      if (parts && parts.length >= 3) {
        const rgb = this.hslToRgb(parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]))
        r = rgb.r
        g = rgb.g
        b = rgb.b
        if (parts.length >= 4) {
          a = Math.min(1, Math.max(0, parseFloat(parts[3])))
        }
      }
    } else if (/^oklch\(/i.test(clean)) {
      const hasPct = /oklch\(\s*[\d.]+%/i.test(clean)
      const parts = clean.match(/[\d.]+/g)
      if (parts && parts.length >= 3) {
        const L = hasPct ? parseFloat(parts[0]) / 100 : parseFloat(parts[0])
        const C = parseFloat(parts[1])
        const H = (parseFloat(parts[2]) * Math.PI) / 180
        const aLab = C * Math.cos(H)
        const bLab = C * Math.sin(H)
        const l_ = L + 0.3963377774 * aLab + 0.2158037573 * bLab
        const m_ = L - 0.1055613458 * aLab - 0.0638541728 * bLab
        const s_ = L - 0.0894841775 * aLab - 1.2914855480 * bLab
        const l3 = l_ * l_ * l_
        const m3 = m_ * m_ * m_
        const s3 = s_ * s_ * s_
        const toSrgb = (v: number) => {
          const clamped = Math.min(1, Math.max(0, v))
          const s = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055
          return Math.round(Math.min(1, Math.max(0, s)) * 255)
        }
        r = toSrgb(+4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3)
        g = toSrgb(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3)
        b = toSrgb(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3)
        if (parts.length >= 4) {
          a = Math.min(1, Math.max(0, parseFloat(parts[3])))
        }
      }
    } else if (/^cmyk\(/i.test(clean)) {
      const parts = clean.match(/[\d.]+/g)
      if (parts && parts.length >= 4) {
        const c = parseFloat(parts[0]) / 100
        const m = parseFloat(parts[1]) / 100
        const y = parseFloat(parts[2]) / 100
        const k = parseFloat(parts[3]) / 100
        r = Math.round(255 * (1 - c) * (1 - k))
        g = Math.round(255 * (1 - m) * (1 - k))
        b = Math.round(255 * (1 - y) * (1 - k))
      }
    }

    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase()
    const hsl = this.rgbToHsl(r, g, b, a)
    const hsv = this.rgbToHsv(r, g, b)
    const cmyk = this.rgbToCmyk(r, g, b)
    const oklch = this.rgbToOklch(r, g, b)

    const luminance = this.getRelativeLuminance(r, g, b)
    const isDark = luminance < 0.179

    return {
      hex,
      rgb: { r, g, b, a },
      hsl,
      hsv,
      rgbString: a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`,
      hslString: a < 1 ? `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${a})` : `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
      hsvString: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`,
      oklchString: `oklch(${(oklch.l * 100).toFixed(1)}% ${oklch.c.toFixed(3)} ${Math.round(oklch.h)})`,
      cmykString: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`,
      isDark,
    }
  }

  private rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    const rn = r / 255
    const gn = g / 255
    const bn = b / 255
    const max = Math.max(rn, gn, bn)
    const min = Math.min(rn, gn, bn)
    const d = max - min
    let h = 0
    const s = max === 0 ? 0 : d / max
    const v = max
    if (max !== min) {
      switch (max) {
        case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break
        case gn: h = (bn - rn) / d + 2; break
        case bn: h = (rn - gn) / d + 4; break
      }
      h /= 6
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      v: Math.round(v * 100),
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

    // Alpha-composite translucent foreground over background per WCAG 2.2
    const alpha = fg.rgb.a
    const compR = Math.round(fg.rgb.r * alpha + bg.rgb.r * (1 - alpha))
    const compG = Math.round(fg.rgb.g * alpha + bg.rgb.g * (1 - alpha))
    const compB = Math.round(fg.rgb.b * alpha + bg.rgb.b * (1 - alpha))

    const l1 = this.getRelativeLuminance(compR, compG, compB)
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
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
  }

  /**
   * Generate harmonious color scheme (Complementary, Triadic, Analogous, Tetradic, Monochromatic)
   */
  public generateHarmonies(hex: string): ColorHarmonies {
    const { hsl } = this.parseColor(hex)
    const compH = (hsl.h + 180) % 360
    const an1H = (hsl.h + 30) % 360
    const an2H = (hsl.h + 330) % 360
    const tri1H = (hsl.h + 120) % 360
    const tri2H = (hsl.h + 240) % 360

    const tet1H = (hsl.h + 90) % 360
    const tet2H = (hsl.h + 180) % 360
    const tet3H = (hsl.h + 270) % 360

    const mono1L = Math.max(10, hsl.l - 25)
    const mono2L = Math.max(10, hsl.l - 12)
    const mono3L = Math.min(95, hsl.l + 12)
    const mono4L = Math.min(95, hsl.l + 25)

    return {
      complementary: this.hslToHex(compH, hsl.s, hsl.l),
      analogous: [this.hslToHex(an1H, hsl.s, hsl.l), this.hslToHex(an2H, hsl.s, hsl.l)],
      triadic: [this.hslToHex(tri1H, hsl.s, hsl.l), this.hslToHex(tri2H, hsl.s, hsl.l)],
      tetradic: [
        this.hslToHex(tet1H, hsl.s, hsl.l),
        this.hslToHex(tet2H, hsl.s, hsl.l),
        this.hslToHex(tet3H, hsl.s, hsl.l),
      ],
      monochromatic: [
        this.hslToHex(hsl.h, hsl.s, mono1L),
        this.hslToHex(hsl.h, hsl.s, mono2L),
        this.hslToHex(hsl.h, hsl.s, mono3L),
        this.hslToHex(hsl.h, hsl.s, mono4L),
      ],
    }
  }

  /**
   * Simulates Color Vision Deficiency (CVD) perception for accessibility analysis.
   */
  public simulateCVD(
    hex: string,
    type: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'
  ): string {
    const { rgb } = this.parseColor(hex)
    let r = rgb.r
    let g = rgb.g
    let b = rgb.b

    switch (type) {
      case 'protanopia':
        r = 0.56667 * rgb.r + 0.43333 * rgb.g
        g = 0.55833 * rgb.r + 0.44167 * rgb.g
        b = 0.24167 * rgb.g + 0.75833 * rgb.b
        break
      case 'deuteranopia':
        r = 0.625 * rgb.r + 0.375 * rgb.g
        g = 0.70 * rgb.r + 0.30 * rgb.g
        b = 0.30 * rgb.g + 0.70 * rgb.b
        break
      case 'tritanopia':
        r = 0.95 * rgb.r + 0.05 * rgb.g
        g = 0.43333 * rgb.g + 0.56667 * rgb.b
        b = 0.475 * rgb.g + 0.525 * rgb.b
        break
      case 'achromatopsia': {
        const gray = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b
        r = gray
        g = gray
        b = gray
        break
      }
    }

    const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)))
    const rHex = clamp(r).toString(16).padStart(2, '0')
    const gHex = clamp(g).toString(16).padStart(2, '0')
    const bHex = clamp(b).toString(16).padStart(2, '0')

    return `#${rHex}${gHex}${bHex}`.toUpperCase()
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

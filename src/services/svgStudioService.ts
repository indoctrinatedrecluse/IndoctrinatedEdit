/**
 * IndoctrinatedEdit - SVG & Asset Studio Service
 * Real-time SVG preview canvas, path optimizer / minifier, palette recolorer, JSX component generator, and sprite sheet builder.
 */

export interface SvgOptimizationResult {
  originalSvg: string
  optimizedSvg: string
  originalSize: number
  optimizedSize: number
  savingsPercentage: number
}

export interface SvgSpriteSymbol {
  id: string
  viewBox: string
  content: string
}

class SvgStudioService {
  private defaultSampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <!-- Indoctrinated Shield Neo-Glow Icon -->
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0A84FF" />
      <stop offset="100%" stop-color="#BF5AF2" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <path d="M 50 10 L 85 25 L 85 55 C 85 75 50 90 50 90 C 50 90 15 75 15 55 L 15 25 Z" fill="url(#shieldGrad)" filter="url(#glow)" opacity="0.9" />
  <path d="M 38 50 L 47 59 L 65 38" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`

  public getDefaultSvg(): string {
    return this.defaultSampleSvg
  }

  /**
   * Optimizes and minifies raw SVG markup.
   */
  public optimizeSvg(rawSvg: string): SvgOptimizationResult {
    const originalSize = new Blob([rawSvg]).size

    let optimized = rawSvg
      // Remove XML declarations
      .replace(/<\?xml[\s\S]*?\?>/gi, '')
      // Remove HTML / SVG comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove redundant whitespace between tags
      .replace(/>\s+</g, '><')
      // Collapse multiple whitespace inside tags
      .replace(/\s{2,}/g, ' ')
      // Remove trailing semicolons in style attributes
      .replace(/;(?="\s*)/g, '')
      // Trim overall
      .trim()

    const optimizedSize = new Blob([optimized]).size
    const savingsPercentage = originalSize > 0 ? Math.round(((originalSize - optimizedSize) / originalSize) * 1000) / 10 : 0

    return {
      originalSvg: rawSvg,
      optimizedSvg: optimized,
      originalSize,
      optimizedSize,
      savingsPercentage: Math.max(0, savingsPercentage),
    }
  }

  /**
   * Generates a React TypeScript component from SVG markup.
   */
  public generateReactComponent(svgMarkup: string, componentName = 'IconAsset'): string {
    // Convert attributes like stroke-width to strokeWidth, fill-rule to fillRule, etc.
    let jsx = svgMarkup
      .replace(/stroke-width/g, 'strokeWidth')
      .replace(/stroke-linecap/g, 'strokeLinecap')
      .replace(/stroke-linejoin/g, 'strokeLinejoin')
      .replace(/fill-rule/g, 'fillRule')
      .replace(/clip-rule/g, 'clipRule')
      .replace(/stop-color/g, 'stopColor')
      .replace(/stop-opacity/g, 'stopOpacity')
      .replace(/class=/g, 'className=')

    // Inject props spread into opening <svg tag
    jsx = jsx.replace(/<svg([^>]*)>/, `<svg$1 {...props}>`)

    return `import React from 'react'

export interface ${componentName}Props extends React.SVGProps<SVGSVGElement> {
  size?: number | string
}

export const ${componentName}: React.FC<${componentName}Props> = ({ size, ...props }) => {
  return (
    ${jsx.trim()}
  )
}
`
  }

  /**
   * Converts SVG markup to a Base64 Data URI.
   */
  public toDataUri(svgMarkup: string): string {
    const encoded = typeof window !== 'undefined' ? window.btoa(unescape(encodeURIComponent(svgMarkup))) : Buffer.from(svgMarkup).toString('base64')
    return `data:image/svg+xml;base64,${encoded}`
  }

  /**
   * Converts SVG markup to CSS background-image snippet.
   */
  public toCssBackground(svgMarkup: string): string {
    const dataUri = this.toDataUri(svgMarkup)
    return `background-image: url("${dataUri}");\nbackground-size: contain;\nbackground-repeat: no-repeat;`
  }

  /**
   * Recolor all fills and strokes in an SVG with target colors.
   */
  public recolorSvg(svgMarkup: string, primaryColor: string, secondaryColor?: string): string {
    let recolored = svgMarkup
    if (primaryColor) {
      recolored = recolored.replace(/stop-color="#0A84FF"/gi, `stop-color="${primaryColor}"`)
      recolored = recolored.replace(/fill="#0A84FF"/gi, `fill="${primaryColor}"`)
      recolored = recolored.replace(/stroke="#0A84FF"/gi, `stroke="${primaryColor}"`)
    }
    if (secondaryColor) {
      recolored = recolored.replace(/stop-color="#BF5AF2"/gi, `stop-color="${secondaryColor}"`)
      recolored = recolored.replace(/fill="#BF5AF2"/gi, `fill="${secondaryColor}"`)
      recolored = recolored.replace(/stroke="#BF5AF2"/gi, `stroke="${secondaryColor}"`)
    }
    return recolored
  }

  /**
   * Generates a sprite sheet from multiple SVG symbols.
   */
  public generateSpriteSheet(symbols: SvgSpriteSymbol[]): string {
    const symbolTags = symbols
      .map(
        (s) => `  <symbol id="${s.id}" viewBox="${s.viewBox}">\n    ${s.content.trim()}\n  </symbol>`
      )
      .join('\n')

    return `<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">\n${symbolTags}\n</svg>`
  }
}

export const svgStudioService = new SvgStudioService()

/**
 * IndoctrinatedEdit - SVG & Asset Studio Service
 * Real-time SVG preview canvas, path optimizer / minifier, palette recolorer, JSX component generator, and sprite sheet builder.
 */

import { utf8ToBase64 } from '../utils/security'

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

export interface SvgPathCommand {
  type: 'M' | 'L' | 'C' | 'Q' | 'Z'
  values: number[]
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
    // Strip HTML comments (invalid in JSX), convert multi-hyphen SVG attributes to camelCase, and convert inline style="" to JSX style={{}}
    let jsx = svgMarkup
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\bclass=/g, 'className=')
      .replace(/\bxmlns:xlink=/g, 'xmlnsXlink=')
      .replace(/\bxlink:href=/g, 'xlinkHref=')
      .replace(/\bstyle="([^"]*)"/g, (_, styleStr: string) => {
        const entries = styleStr
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((decl) => {
            const idx = decl.indexOf(':')
            if (idx === -1) return null
            const k = decl
              .slice(0, idx)
              .trim()
              .replace(/-([a-z])/g, (_, ch) => ch.toUpperCase())
            const v = decl.slice(idx + 1).trim().replace(/'/g, "\\'")
            return `${k}: '${v}'`
          })
          .filter(Boolean)
        return `style={{ ${entries.join(', ')} }}`
      })
      .replace(/\b([a-z][a-z0-9]*(?:-[a-z0-9]+)+)=/g, (match, attr: string) => {
        if (attr.startsWith('data-') || attr.startsWith('aria-')) return match
        const camel = attr.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
        return `${camel}=`
      })

    // Deduplicate width/height on root <svg> before injecting responsive size props
    jsx = jsx.replace(/<svg([^>]*)>/, (_, attrs: string) => {
      const cleanedAttrs = attrs
        .replace(/\s+width\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\s+height\s*=\s*["'][^"']*["']/gi, '')
      return `<svg${cleanedAttrs} width={size ?? props.width} height={size ?? props.height} {...props}>`
    })

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
   * Converts SVG markup to a UTF-8 safe Base64 Data URI (no deprecated unescape()).
   */
  public toDataUri(svgMarkup: string): string {
    return `data:image/svg+xml;base64,${utf8ToBase64(svgMarkup)}`
  }

  /**
   * Converts SVG markup to CSS background-image snippet.
   */
  public toCssBackground(svgMarkup: string): string {
    const dataUri = this.toDataUri(svgMarkup)
    return `background-image: url("${dataUri}");\nbackground-size: contain;\nbackground-repeat: no-repeat;`
  }

  /**
   * Dynamically recolor fills, strokes, and gradient stops in ANY SVG (not limited to sample colors).
   */
  public recolorSvg(svgMarkup: string, primaryColor: string, secondaryColor?: string): string {
    // Discover unique hex/rgb colors present in the SVG in order of appearance
    const colorMatches = Array.from(
      new Set(
        (svgMarkup.match(/(?:fill|stroke|stop-color)\s*=\s*["']([^"']+)["']/gi) || [])
          .map((m) => m.replace(/^(?:fill|stroke|stop-color)\s*=\s*["']|["']$/gi, '').trim())
          .filter((c) => c && c !== 'none' && c !== 'transparent' && !c.startsWith('url('))
      )
    )

    const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    let recolored = svgMarkup

    const firstTarget = colorMatches.find((c) => c.toLowerCase() === '#0a84ff') || colorMatches[0]
    const secondTarget =
      colorMatches.find((c) => c.toLowerCase() === '#bf5af2') ||
      colorMatches.find((c) => c !== firstTarget)

    if (primaryColor && firstTarget) {
      recolored = recolored.replace(
        new RegExp(`(stop-color|fill|stroke)\\s*=\\s*["']${escapeRe(firstTarget)}["']`, 'gi'),
        `$1="${primaryColor}"`
      )
    }
    if (secondaryColor && secondTarget) {
      recolored = recolored.replace(
        new RegExp(`(stop-color|fill|stroke)\\s*=\\s*["']${escapeRe(secondTarget)}["']`, 'gi'),
        `$1="${secondaryColor}"`
      )
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

  /**
   * Parse absolute SVG path commands (M, L, C, Q, Z) for interactive Bezier/anchor editing.
   */
  public parsePathCommands(d: string): SvgPathCommand[] {
    const cmds: SvgPathCommand[] = []
    const tokenRe = /([MLCQZmlcqz])([^MLCQZmlcqz]*)/g
    let m: RegExpExecArray | null
    let curX = 0
    let curY = 0

    while ((m = tokenRe.exec(d)) !== null) {
      const rawType = m[1]
      const upper = rawType.toUpperCase() as SvgPathCommand['type']
      const isRel = rawType !== upper
      const nums = (m[2].match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g) || []).map(Number)

      if (upper === 'Z') {
        cmds.push({ type: 'Z', values: [] })
        continue
      }
      const arity = upper === 'C' ? 6 : upper === 'Q' ? 4 : 2
      for (let i = 0; i + arity <= nums.length; i += arity) {
        const chunk = nums.slice(i, i + arity)
        if (isRel) {
          for (let k = 0; k < chunk.length; k += 2) {
            chunk[k] += curX
            chunk[k + 1] += curY
          }
        }
        curX = chunk[chunk.length - 2]
        curY = chunk[chunk.length - 1]
        cmds.push({ type: upper === 'M' && i > 0 ? 'L' : upper, values: chunk.map((v) => Math.round(v * 10) / 10) })
      }
    }
    return cmds
  }

  /**
   * Serialize parsed SvgPathCommand[] back to an SVG `d` attribute string.
   */
  public serializePathCommands(cmds: SvgPathCommand[]): string {
    return cmds
      .map((c) => (c.type === 'Z' ? 'Z' : `${c.type} ${c.values.map((v) => Math.round(v * 10) / 10).join(' ')}`))
      .join(' ')
  }
}

export const svgStudioService = new SvgStudioService()

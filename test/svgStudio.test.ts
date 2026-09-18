import { describe, it, expect } from 'vitest'
import { svgStudioService } from '../src/services/svgStudioService'

describe('SvgStudioService', () => {
  it('provides default sample SVG and optimizes / minifies markup', () => {
    const raw = svgStudioService.getDefaultSvg()
    expect(raw).toContain('<svg')

    const opt = svgStudioService.optimizeSvg(raw)
    expect(opt.optimizedSize).toBeLessThanOrEqual(opt.originalSize)
    expect(opt.optimizedSvg).not.toContain('<!--')
    expect(opt.savingsPercentage).toBeGreaterThanOrEqual(0)
  })

  it('generates React TSX component from SVG markup', () => {
    const raw = `<svg viewBox="0 0 24 24" stroke-width="2"><path d="M0 0" /></svg>`
    const componentCode = svgStudioService.generateReactComponent(raw, 'CustomIcon')
    expect(componentCode).toContain('export const CustomIcon: React.FC<CustomIconProps>')
    expect(componentCode).toContain('strokeWidth="2"')
    expect(componentCode).toContain('{...props}')
  })

  it('converts SVG to Data URI and CSS background snippet', () => {
    const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" /></svg>`
    const dataUri = svgStudioService.toDataUri(raw)
    expect(dataUri).toContain('data:image/svg+xml;base64,')

    const cssBg = svgStudioService.toCssBackground(raw)
    expect(cssBg).toContain('background-image: url("data:image/svg+xml;base64,')
  })

  it('recolors SVG fills and strokes', () => {
    const raw = `<svg><path fill="#0A84FF" stroke="#0A84FF" /></svg>`
    const recolored = svgStudioService.recolorSvg(raw, '#30D158')
    expect(recolored).toContain('fill="#30D158"')
    expect(recolored).toContain('stroke="#30D158"')
  })

  it('generates SVG sprite sheets with symbol definitions', () => {
    const symbols = [
      { id: 'icon-home', viewBox: '0 0 24 24', content: '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>' },
      { id: 'icon-user', viewBox: '0 0 24 24', content: '<circle cx="12" cy="7" r="4"/>' },
    ]
    const sprite = svgStudioService.generateSpriteSheet(symbols)
    expect(sprite).toContain('<symbol id="icon-home" viewBox="0 0 24 24">')
    expect(sprite).toContain('<symbol id="icon-user" viewBox="0 0 24 24">')
  })
})

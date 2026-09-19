import { describe, it, expect } from 'vitest'
import { colorStudioService } from '../src/services/colorStudioService'

describe('ColorStudio & Glass Shader Subsystem', () => {
  it('should calculate accurate WCAG 2.2 contrast ratios', () => {
    // White text on dark navy background
    const audit = colorStudioService.calculateContrastRatio('#FFFFFF', '#0A0E18')
    expect(audit.ratio).toBeGreaterThan(10)
    expect(audit.wcagAaaNormal).toBe(true)
    expect(audit.wcagAaNormal).toBe(true)
    expect(audit.rating).toBe('AAA')

    // Low contrast fail test
    const failAudit = colorStudioService.calculateContrastRatio('#333333', '#222222')
    expect(failAudit.ratio).toBeLessThan(3.0)
    expect(failAudit.rating).toBe('Fail')
  })

  it('should export valid Liquid Glass CSS tokens', () => {
    const css = colorStudioService.exportGlassCss({
      blurRadiusPx: 32,
      backgroundOpacity: 0.8,
      specularBorderOpacity: 0.2,
      accentGlowSpread: 20,
      tintHex: '#0A84FF',
      darkDepth: 0.3,
    })

    expect(css).toContain('backdrop-filter: blur(32px)')
    expect(css).toContain('border: 1px solid rgba(255, 255, 255, 0.2)')
    expect(css).toContain('border-radius: 12px')
  })
})

import { describe, it, expect } from 'vitest'
import { colorStudioService } from '../src/services/colorStudioService'

describe('colorStudioService', () => {
  it('parses hex colors accurately into RGB, HSL, OKLCH, CMYK', () => {
    const details = colorStudioService.parseColor('#0A84FF')
    expect(details.hex).toBe('#0A84FF')
    expect(details.rgb.r).toBe(10)
    expect(details.rgb.g).toBe(132)
    expect(details.rgb.b).toBe(255)
    expect(details.hslString).toContain('hsl(')
    expect(details.oklchString).toContain('oklch(')
    expect(details.cmykString).toContain('cmyk(')
  })

  it('generates complementary, analogous, and triadic color harmonies', () => {
    const harmonies = colorStudioService.generateHarmonies('#0A84FF')
    expect(harmonies.complementary).toBeDefined()
    expect(harmonies.analogous.length).toBe(2)
    expect(harmonies.triadic.length).toBe(2)
  })

  it('generates Liquid Glass Theme tokens', () => {
    const theme = colorStudioService.generateGlassTheme('#BF5AF2', 'Neon Purple Glass')
    expect(theme.name).toBe('Neon Purple Glass')
    expect(theme.glassBackground).toContain('rgba(')
    expect(theme.accentGlow).toContain('rgba(')
    expect(theme.glassBlurRadius).toBe('32px')
  })
})

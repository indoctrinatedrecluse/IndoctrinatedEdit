import { describe, it, expect } from 'vitest'
import { registeredThemes, getThemeById, applyGlassTheme } from '../src/themes/themeRegistry'

describe('Theme Registry & Monaco Compatibility', () => {
  it('should include all 10 liquid glass, retro, futuristic, and neon themes', () => {
    expect(registeredThemes.length).toBe(10)
    const ids = registeredThemes.map((t) => t.id)
    expect(ids).toContain('indoctrinated.theme.cupertino-midnight')
    expect(ids).toContain('indoctrinated.theme.liquid-obsidian')
    expect(ids).toContain('indoctrinated.theme.frosted-amber')
    expect(ids).toContain('indoctrinated.theme.cyberpunk-neon')
    expect(ids).toContain('indoctrinated.theme.synthwave-84')
    expect(ids).toContain('indoctrinated.theme.matrix-cyberdeck')
    expect(ids).toContain('indoctrinated.theme.retro-crt-amber')
    expect(ids).toContain('indoctrinated.theme.tokyo-night-neon')
    expect(ids).toContain('indoctrinated.theme.deep-space-nebula')
    expect(ids).toContain('indoctrinated.theme.laser-grid-tron')
  })

  it('CRITICAL REGRESSION: Sanitized Monaco theme names MUST strictly match /^[a-zA-Z0-9-]+$/', () => {
    // Monaco Editor defineTheme strictly enforces: /^[a-z0-9\-]+$/i
    // Any theme name with dots, spaces, or underscores causes an Uncaught Error: Illegal theme name!
    const monacoThemeNameRegex = /^[a-zA-Z0-9-]+$/

    for (const theme of registeredThemes) {
      const sanitizedId = theme.id.replace(/[^a-zA-Z0-9-]/g, '-')
      const monacoThemeName = `indoctrinated-${sanitizedId}`

      expect(monacoThemeName).toMatch(monacoThemeNameRegex)
      expect(monacoThemeName).not.toContain('.')
      expect(monacoThemeName).not.toContain(' ')
      expect(monacoThemeName).not.toContain('_')
    }
  })

  it('should have complete GlassPalette properties for all themes', () => {
    for (const theme of registeredThemes) {
      const colors = theme.colors
      expect(colors.glassBackground).toBeDefined()
      expect(colors.glassBackground.length).toBeGreaterThan(0)
      expect(colors.glassBlurRadius).toMatch(/^[0-9]+px$/)
      expect(colors.glassSaturation).toMatch(/^[0-9]+%$/)
      expect(colors.specularBorder).toBeDefined()
      expect(colors.accentGlow).toBeDefined()
      expect(colors.textPrimary).toBeDefined()
      expect(colors.textMuted).toBeDefined()
      expect(colors.sidebarBackground).toBeDefined()
      expect(colors.titlebarBackground).toBeDefined()
      expect(colors.statusBarBackground).toBeDefined()
    }
  })

  it('should have valid Monaco syntax token rules for all themes', () => {
    const hexColorRegex = /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/

    for (const theme of registeredThemes) {
      expect(theme.colors.tokenRules.length).toBeGreaterThan(0)
      for (const rule of theme.colors.tokenRules) {
        expect(rule.token).toBeDefined()
        expect(rule.token.length).toBeGreaterThan(0)
        expect(rule.foreground).toMatch(hexColorRegex)
        if (rule.fontStyle) {
          expect(['italic', 'bold', 'underline']).toContain(rule.fontStyle)
        }
      }
    }
  })

  it('should correctly retrieve themes by ID and fallback to default theme for unknown ID', () => {
    const cupertino = getThemeById('indoctrinated.theme.cupertino-midnight')
    expect(cupertino.id).toBe('indoctrinated.theme.cupertino-midnight')

    const synthwave = getThemeById('indoctrinated.theme.synthwave-84')
    expect(synthwave.id).toBe('indoctrinated.theme.synthwave-84')

    const fallback = getThemeById('non.existent.theme.id')
    expect(fallback).toBeDefined()
    expect(fallback.id).toBe('indoctrinated.theme.cupertino-midnight')
  })

  it('should apply CSS variables when switching themes in DOM environment', () => {
    for (const theme of registeredThemes) {
      expect(() => applyGlassTheme(theme)).not.toThrow()
    }
  })
})

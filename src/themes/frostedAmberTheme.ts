import { ThemeDefinition, GlassPalette, ThemeType } from '@sdk/index'

export class FrostedAmberGlassTheme extends ThemeDefinition {
  override readonly id = 'indoctrinated.theme.frosted-amber'
  override readonly name = 'Frosted Amber Glow'
  override readonly type = ThemeType.Dark
  override readonly author = 'indoctrinatedrecluse'
  override readonly description = 'Warm titanium refraction with opulent amber and gold specular lighting'

  override readonly colors: GlassPalette = {
    glassBackground: 'rgba(22, 16, 12, 0.75)',
    glassBlurRadius: '30px',
    glassSaturation: '185%',
    specularBorder: 'rgba(255, 159, 10, 0.25)',
    accentGlow: 'rgba(255, 159, 10, 0.50)',
    textPrimary: '#FFFBEB',
    textMuted: 'rgba(254, 243, 199, 0.45)',
    sidebarBackground: 'rgba(18, 12, 8, 0.70)',
    titlebarBackground: 'rgba(22, 16, 12, 0.85)',
    statusBarBackground: 'rgba(16, 10, 6, 0.80)',
    tokenRules: [
      { token: 'keyword', foreground: 'FF9F0A', fontStyle: 'bold' },
      { token: 'string', foreground: 'FCD34D' },
      { token: 'number', foreground: 'F59E0B' },
      { token: 'comment', foreground: '78716C', fontStyle: 'italic' },
      { token: 'type', foreground: 'FDE68A' },
      { token: 'function', foreground: 'D97706', fontStyle: 'bold' },
      { token: 'variable', foreground: 'FFFBEB' },
      { token: 'operator', foreground: 'FBBF24' },
      { token: 'tag', foreground: 'FF9F0A' },
      { token: 'attribute.name', foreground: 'FCD34D' },
    ],
  }
}

export const frostedAmberTheme = new FrostedAmberGlassTheme()

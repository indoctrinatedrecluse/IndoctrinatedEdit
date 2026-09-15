import { ThemeDefinition, GlassPalette, ThemeType } from '@sdk/index'

export class CyberpunkNeonGlassTheme extends ThemeDefinition {
  override readonly id = 'indoctrinated.theme.cyberpunk-neon'
  override readonly name = 'Cyberpunk 2077 Neon'
  override readonly type = ThemeType.Dark
  override readonly author = 'indoctrinatedrecluse'
  override readonly description = 'High-voltage synthwave aesthetic with electric magenta, neon cyan, and night-city cyber yellow'

  override readonly colors: GlassPalette = {
    glassBackground: 'rgba(16, 8, 28, 0.82)',
    glassBlurRadius: '32px',
    glassSaturation: '230%',
    specularBorder: 'rgba(255, 0, 85, 0.38)',
    accentGlow: 'rgba(255, 0, 85, 0.65)',
    textPrimary: '#FFF0F5',
    textMuted: 'rgba(244, 114, 182, 0.55)',
    sidebarBackground: 'rgba(12, 6, 22, 0.82)',
    titlebarBackground: 'rgba(16, 8, 28, 0.90)',
    statusBarBackground: 'rgba(10, 4, 18, 0.88)',
    tokenRules: [
      { token: 'keyword', foreground: 'FF0055', fontStyle: 'bold' },
      { token: 'string', foreground: '00F0FF' },
      { token: 'number', foreground: 'FFD600' },
      { token: 'comment', foreground: '8B5CF6', fontStyle: 'italic' },
      { token: 'type', foreground: 'E879F9' },
      { token: 'function', foreground: 'FF007F', fontStyle: 'bold' },
      { token: 'variable', foreground: 'FFF0F5' },
      { token: 'operator', foreground: '00F0FF', fontStyle: 'bold' },
      { token: 'tag', foreground: 'FF0055', fontStyle: 'bold' },
      { token: 'attribute.name', foreground: 'FFD600' },
      { token: 'attribute.value', foreground: '00F0FF' },
    ],
  }
}

export const cyberpunkNeonTheme = new CyberpunkNeonGlassTheme()

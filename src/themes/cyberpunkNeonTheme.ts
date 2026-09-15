import { ThemeDefinition, GlassPalette, ThemeType } from '@sdk/index'

export class CyberpunkNeonGlassTheme extends ThemeDefinition {
  override readonly id = 'indoctrinated.theme.cyberpunk-neon'
  override readonly name = 'Cyberpunk 2077 Neon'
  override readonly type = ThemeType.Dark
  override readonly author = 'indoctrinatedrecluse'
  override readonly description = 'High-voltage electric magenta and night-city cyan with deep purple glass'

  override readonly colors: GlassPalette = {
    glassBackground: 'rgba(18, 10, 30, 0.78)',
    glassBlurRadius: '32px',
    glassSaturation: '220%',
    specularBorder: 'rgba(255, 0, 85, 0.30)',
    accentGlow: 'rgba(0, 240, 255, 0.55)',
    textPrimary: '#FCE7F3',
    textMuted: 'rgba(244, 114, 182, 0.50)',
    sidebarBackground: 'rgba(14, 6, 24, 0.75)',
    titlebarBackground: 'rgba(18, 10, 30, 0.88)',
    statusBarBackground: 'rgba(12, 4, 20, 0.85)',
    tokenRules: [
      { token: 'keyword', foreground: 'FF0055', fontStyle: 'bold' },
      { token: 'string', foreground: '00F0FF' },
      { token: 'number', foreground: 'FFE600' },
      { token: 'comment', foreground: '6B46C1', fontStyle: 'italic' },
      { token: 'type', foreground: 'A855F7' },
      { token: 'function', foreground: 'FF007F', fontStyle: 'bold' },
      { token: 'variable', foreground: 'FCE7F3' },
      { token: 'operator', foreground: '00F0FF' },
      { token: 'tag', foreground: 'FF0055' },
      { token: 'attribute.name', foreground: 'FFE600' },
    ],
  }
}

export const cyberpunkNeonTheme = new CyberpunkNeonGlassTheme()

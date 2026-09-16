import { ThemeDefinition, GlassPalette, ThemeType } from '@sdk/index'

export class Synthwave84GlassTheme extends ThemeDefinition {
  override readonly id = 'indoctrinated.theme.synthwave-84'
  override readonly name = 'Synthwave \'84 Sunset Neon'
  override readonly type = ThemeType.Dark
  override readonly author = 'indoctrinatedrecluse'
  override readonly description = '1980s retro-futuristic arcade neon with hot magenta, sunset gold, electric violet, and outrun wireframe sheen'

  override readonly colors: GlassPalette = {
    glassBackground: 'rgba(20, 10, 36, 0.82)',
    glassBlurRadius: '32px',
    glassSaturation: '240%',
    specularBorder: 'rgba(255, 42, 133, 0.42)',
    accentGlow: 'rgba(255, 42, 133, 0.65)',
    textPrimary: '#FFE4F0',
    textMuted: 'rgba(255, 128, 192, 0.55)',
    sidebarBackground: 'rgba(15, 6, 28, 0.85)',
    titlebarBackground: 'rgba(22, 10, 40, 0.90)',
    statusBarBackground: 'rgba(12, 4, 22, 0.88)',
    tokenRules: [
      { token: 'keyword', foreground: 'FF2A85', fontStyle: 'bold' },
      { token: 'string', foreground: 'FFE600' },
      { token: 'number', foreground: 'FF7B00' },
      { token: 'comment', foreground: '8A4FFF', fontStyle: 'italic' },
      { token: 'type', foreground: 'FF007F' },
      { token: 'function', foreground: '00F0FF', fontStyle: 'bold' },
      { token: 'variable', foreground: 'FFE4F0' },
      { token: 'operator', foreground: 'FFE600', fontStyle: 'bold' },
      { token: 'tag', foreground: 'FF2A85', fontStyle: 'bold' },
      { token: 'attribute.name', foreground: 'FF7B00' },
      { token: 'attribute.value', foreground: '00F0FF' },
    ],
  }
}

export const synthwave84Theme = new Synthwave84GlassTheme()

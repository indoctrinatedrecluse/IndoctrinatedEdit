import { ThemeDefinition, GlassPalette, ThemeType } from '@sdk/index'

export class TokyoNightNeonGlassTheme extends ThemeDefinition {
  override readonly id = 'indoctrinated.theme.tokyo-night-neon'
  override readonly name = 'Tokyo Night Neo-Akiba'
  override readonly type = ThemeType.Dark
  override readonly author = 'indoctrinatedrecluse'
  override readonly description = 'Midnight blue Shinjuku streetscape with electric neon violet, sakura blossom pink, iced cyan, and futuristic skyline luminescence'

  override readonly colors: GlassPalette = {
    glassBackground: 'rgba(15, 18, 34, 0.84)',
    glassBlurRadius: '32px',
    glassSaturation: '210%',
    specularBorder: 'rgba(187, 154, 247, 0.35)',
    accentGlow: 'rgba(122, 162, 247, 0.60)',
    textPrimary: '#C0CAF5',
    textMuted: 'rgba(115, 144, 217, 0.58)',
    sidebarBackground: 'rgba(11, 14, 26, 0.86)',
    titlebarBackground: 'rgba(16, 19, 36, 0.92)',
    statusBarBackground: 'rgba(9, 11, 20, 0.90)',
    tokenRules: [
      { token: 'keyword', foreground: 'BB9AF7', fontStyle: 'bold' },
      { token: 'string', foreground: '9ECE6A' },
      { token: 'number', foreground: 'FF9E64' },
      { token: 'comment', foreground: '565F89', fontStyle: 'italic' },
      { token: 'type', foreground: '2AC3DE' },
      { token: 'function', foreground: '7AA2F7', fontStyle: 'bold' },
      { token: 'variable', foreground: 'C0CAF5' },
      { token: 'operator', foreground: '89DDFF', fontStyle: 'bold' },
      { token: 'tag', foreground: 'F7768E', fontStyle: 'bold' },
      { token: 'attribute.name', foreground: 'FF9E64' },
      { token: 'attribute.value', foreground: '9ECE6A' },
    ],
  }
}

export const tokyoNightNeonTheme = new TokyoNightNeonGlassTheme()

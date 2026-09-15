import { ThemeDefinition, GlassPalette, ThemeType } from '@sdk/index'

export class LiquidObsidianGlassTheme extends ThemeDefinition {
  override readonly id = 'indoctrinated.theme.liquid-obsidian'
  override readonly name = 'Liquid Obsidian'
  override readonly type = ThemeType.Dark
  override readonly author = 'indoctrinatedrecluse'
  override readonly description = 'Deep obsidian black glass with electric emerald and cyan neon highlights'

  override readonly colors: GlassPalette = {
    glassBackground: 'rgba(8, 10, 16, 0.82)',
    glassBlurRadius: '32px',
    glassSaturation: '210%',
    specularBorder: 'rgba(48, 209, 88, 0.22)',
    accentGlow: 'rgba(48, 209, 88, 0.50)',
    textPrimary: '#F0FDF4',
    textMuted: 'rgba(167, 243, 208, 0.45)',
    sidebarBackground: 'rgba(6, 8, 12, 0.75)',
    titlebarBackground: 'rgba(8, 10, 16, 0.85)',
    statusBarBackground: 'rgba(6, 8, 12, 0.82)',
    tokenRules: [
      { token: 'keyword', foreground: '00F5D4', fontStyle: 'bold' },
      { token: 'string', foreground: '30D158' },
      { token: 'number', foreground: '7BF1A8' },
      { token: 'comment', foreground: '4B5563', fontStyle: 'italic' },
      { token: 'type', foreground: '2DD4BF' },
      { token: 'function', foreground: '10B981', fontStyle: 'bold' },
      { token: 'variable', foreground: 'F0FDF4' },
      { token: 'operator', foreground: '34D399' },
      { token: 'tag', foreground: '00F5D4' },
      { token: 'attribute.name', foreground: '6EE7B7' },
    ],
  }
}

export const liquidObsidianTheme = new LiquidObsidianGlassTheme()

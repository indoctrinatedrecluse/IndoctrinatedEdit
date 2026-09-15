import { ThemeDefinition, GlassPalette, ThemeType } from '@sdk/index'

export class CupertinoMidnightGlassTheme extends ThemeDefinition {
  override readonly id = 'indoctrinated.theme.cupertino-midnight'
  override readonly name = 'Cupertino Midnight Glass'
  override readonly type = ThemeType.Dark
  override readonly author = 'indoctrinatedrecluse'
  override readonly description = 'Signature iOS Liquid Glass dark theme with specular highlights and vibrant neon syntax'

  override readonly colors: GlassPalette = {
    glassBackground: 'rgba(14, 18, 30, 0.68)',
    glassBlurRadius: '28px',
    glassSaturation: '190%',
    specularBorder: 'rgba(255, 255, 255, 0.14)',
    accentGlow: 'rgba(10, 132, 255, 0.45)',
    textPrimary: '#F5F5F7',
    textMuted: 'rgba(235, 235, 245, 0.45)',
    sidebarBackground: 'rgba(10, 14, 24, 0.62)',
    titlebarBackground: 'rgba(14, 18, 30, 0.75)',
    statusBarBackground: 'rgba(10, 14, 24, 0.70)',
    tokenRules: [
      { token: 'keyword', foreground: 'FF375F', fontStyle: 'bold' },
      { token: 'string', foreground: '30D158' },
      { token: 'number', foreground: 'FF9F0A' },
      { token: 'comment', foreground: '8E8E93', fontStyle: 'italic' },
      { token: 'type', foreground: '64D2FF' },
      { token: 'function', foreground: '0A84FF', fontStyle: 'bold' },
      { token: 'variable', foreground: 'F2F2F7' },
      { token: 'operator', foreground: 'FFD60A' },
      { token: 'tag', foreground: 'FF375F' },
      { token: 'attribute.name', foreground: 'BF5AF2' },
      { token: 'attribute.value', foreground: '30D158' },
    ],
  }
}

export const defaultGlassTheme = new CupertinoMidnightGlassTheme()

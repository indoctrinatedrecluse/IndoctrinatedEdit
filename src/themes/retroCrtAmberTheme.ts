import { ThemeDefinition, GlassPalette, ThemeType } from '@sdk/index'

export class RetroCrtAmberGlassTheme extends ThemeDefinition {
  override readonly id = 'indoctrinated.theme.retro-crt-amber'
  override readonly name = 'Retro CRT Amber 1982'
  override readonly type = ThemeType.Dark
  override readonly author = 'indoctrinatedrecluse'
  override readonly description = 'Vintage monochrome cathode-ray terminal glass with warm 589nm phosphor amber glow, scanline specular sheen, and nostalgic mainframe contrast'

  override readonly colors: GlassPalette = {
    glassBackground: 'rgba(24, 14, 2, 0.84)',
    glassBlurRadius: '28px',
    glassSaturation: '220%',
    specularBorder: 'rgba(255, 176, 0, 0.40)',
    accentGlow: 'rgba(255, 176, 0, 0.65)',
    textPrimary: '#FFF2D6',
    textMuted: 'rgba(255, 184, 77, 0.55)',
    sidebarBackground: 'rgba(16, 9, 1, 0.85)',
    titlebarBackground: 'rgba(24, 13, 2, 0.92)',
    statusBarBackground: 'rgba(12, 6, 1, 0.88)',
    tokenRules: [
      { token: 'keyword', foreground: 'FFB000', fontStyle: 'bold' },
      { token: 'string', foreground: 'FFE580' },
      { token: 'number', foreground: 'FF8C00' },
      { token: 'comment', foreground: 'B36B00', fontStyle: 'italic' },
      { token: 'type', foreground: 'FFCC33' },
      { token: 'function', foreground: 'FFA200', fontStyle: 'bold' },
      { token: 'variable', foreground: 'FFF2D6' },
      { token: 'operator', foreground: 'FFB000', fontStyle: 'bold' },
      { token: 'tag', foreground: 'FFB000', fontStyle: 'bold' },
      { token: 'attribute.name', foreground: 'FF8C00' },
      { token: 'attribute.value', foreground: 'FFE580' },
    ],
  }
}

export const retroCrtAmberTheme = new RetroCrtAmberGlassTheme()

import { ThemeDefinition, GlassPalette, ThemeType } from '@sdk/index'

export class MatrixCyberdeckGlassTheme extends ThemeDefinition {
  override readonly id = 'indoctrinated.theme.matrix-cyberdeck'
  override readonly name = 'Matrix Cyberdeck Phosphor'
  override readonly type = ThemeType.Dark
  override readonly author = 'indoctrinatedrecluse'
  override readonly description = 'High-contrast cybernetic command deck with pure digital rain phosphor green, dark carbon glass, and terminal grid illumination'

  override readonly colors: GlassPalette = {
    glassBackground: 'rgba(4, 16, 8, 0.84)',
    glassBlurRadius: '30px',
    glassSaturation: '210%',
    specularBorder: 'rgba(0, 255, 102, 0.38)',
    accentGlow: 'rgba(0, 255, 102, 0.60)',
    textPrimary: '#E2FFE8',
    textMuted: 'rgba(72, 230, 120, 0.55)',
    sidebarBackground: 'rgba(2, 12, 6, 0.85)',
    titlebarBackground: 'rgba(4, 18, 9, 0.92)',
    statusBarBackground: 'rgba(1, 8, 4, 0.90)',
    tokenRules: [
      { token: 'keyword', foreground: '00FF66', fontStyle: 'bold' },
      { token: 'string', foreground: '7DFF9E' },
      { token: 'number', foreground: '00E5FF' },
      { token: 'comment', foreground: '2B7A44', fontStyle: 'italic' },
      { token: 'type', foreground: 'A3FFD6' },
      { token: 'function', foreground: '00FF99', fontStyle: 'bold' },
      { token: 'variable', foreground: 'E2FFE8' },
      { token: 'operator', foreground: '00FF66', fontStyle: 'bold' },
      { token: 'tag', foreground: '00FF66', fontStyle: 'bold' },
      { token: 'attribute.name', foreground: '00E5FF' },
      { token: 'attribute.value', foreground: '7DFF9E' },
    ],
  }
}

export const matrixCyberdeckTheme = new MatrixCyberdeckGlassTheme()

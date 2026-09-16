import { ThemeDefinition, GlassPalette, ThemeType } from '@sdk/index'

export class LaserGridTronGlassTheme extends ThemeDefinition {
  override readonly id = 'indoctrinated.theme.laser-grid-tron'
  override readonly name = 'TRON Laser Grid Hologram'
  override readonly type = ThemeType.Dark
  override readonly author = 'indoctrinatedrecluse'
  override readonly description = 'Pure photonic vector aesthetic with intense laser cyan, energized cobalt blue, and holographic wireframe specular edges'

  override readonly colors: GlassPalette = {
    glassBackground: 'rgba(6, 16, 30, 0.84)',
    glassBlurRadius: '30px',
    glassSaturation: '240%',
    specularBorder: 'rgba(0, 240, 255, 0.42)',
    accentGlow: 'rgba(0, 240, 255, 0.70)',
    textPrimary: '#E0F7FF',
    textMuted: 'rgba(78, 185, 230, 0.55)',
    sidebarBackground: 'rgba(4, 11, 22, 0.86)',
    titlebarBackground: 'rgba(7, 18, 34, 0.92)',
    statusBarBackground: 'rgba(3, 8, 16, 0.90)',
    tokenRules: [
      { token: 'keyword', foreground: '00F0FF', fontStyle: 'bold' },
      { token: 'string', foreground: '00FFA3' },
      { token: 'number', foreground: 'FF9900' },
      { token: 'comment', foreground: '266B8C', fontStyle: 'italic' },
      { token: 'type', foreground: '70E000' },
      { token: 'function', foreground: '38B6FF', fontStyle: 'bold' },
      { token: 'variable', foreground: 'E0F7FF' },
      { token: 'operator', foreground: '00F0FF', fontStyle: 'bold' },
      { token: 'tag', foreground: '00F0FF', fontStyle: 'bold' },
      { token: 'attribute.name', foreground: 'FF9900' },
      { token: 'attribute.value', foreground: '00FFA3' },
    ],
  }
}

export const laserGridTronTheme = new LaserGridTronGlassTheme()

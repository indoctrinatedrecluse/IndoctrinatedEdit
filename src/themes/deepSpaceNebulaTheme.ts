import { ThemeDefinition, GlassPalette, ThemeType } from '@sdk/index'

export class DeepSpaceNebulaGlassTheme extends ThemeDefinition {
  override readonly id = 'indoctrinated.theme.deep-space-nebula'
  override readonly name = 'Deep Space Nebula Quantum'
  override readonly type = ThemeType.Dark
  override readonly author = 'indoctrinatedrecluse'
  override readonly description = 'Interstellar dark matter canvas illuminated by cosmic ultraviolet, starlight hyper-cyan, and pulsar radiant magenta'

  override readonly colors: GlassPalette = {
    glassBackground: 'rgba(10, 8, 24, 0.84)',
    glassBlurRadius: '32px',
    glassSaturation: '230%',
    specularBorder: 'rgba(191, 90, 242, 0.38)',
    accentGlow: 'rgba(191, 90, 242, 0.65)',
    textPrimary: '#F5EDFF',
    textMuted: 'rgba(180, 140, 230, 0.55)',
    sidebarBackground: 'rgba(7, 5, 18, 0.86)',
    titlebarBackground: 'rgba(12, 10, 28, 0.92)',
    statusBarBackground: 'rgba(6, 4, 14, 0.90)',
    tokenRules: [
      { token: 'keyword', foreground: 'BF5AF2', fontStyle: 'bold' },
      { token: 'string', foreground: '64D2FF' },
      { token: 'number', foreground: 'FF375F' },
      { token: 'comment', foreground: '7D52A0', fontStyle: 'italic' },
      { token: 'type', foreground: 'DA8FFF' },
      { token: 'function', foreground: '5E5CE6', fontStyle: 'bold' },
      { token: 'variable', foreground: 'F5EDFF' },
      { token: 'operator', foreground: '64D2FF', fontStyle: 'bold' },
      { token: 'tag', foreground: 'BF5AF2', fontStyle: 'bold' },
      { token: 'attribute.name', foreground: 'FF375F' },
      { token: 'attribute.value', foreground: '64D2FF' },
    ],
  }
}

export const deepSpaceNebulaTheme = new DeepSpaceNebulaGlassTheme()

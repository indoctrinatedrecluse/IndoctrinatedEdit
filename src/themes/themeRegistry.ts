import { ThemeDefinition } from '@sdk/index'
import { defaultGlassTheme } from './defaultGlassTheme'
import { liquidObsidianTheme } from './liquidObsidianTheme'
import { frostedAmberTheme } from './frostedAmberTheme'
import { cyberpunkNeonTheme } from './cyberpunkNeonTheme'
import { synthwave84Theme } from './synthwave84Theme'
import { matrixCyberdeckTheme } from './matrixCyberdeckTheme'
import { retroCrtAmberTheme } from './retroCrtAmberTheme'
import { tokyoNightNeonTheme } from './tokyoNightNeonTheme'
import { deepSpaceNebulaTheme } from './deepSpaceNebulaTheme'
import { laserGridTronTheme } from './laserGridTronTheme'

export const registeredThemes: ThemeDefinition[] = [
  defaultGlassTheme,
  liquidObsidianTheme,
  frostedAmberTheme,
  cyberpunkNeonTheme,
  synthwave84Theme,
  matrixCyberdeckTheme,
  retroCrtAmberTheme,
  tokyoNightNeonTheme,
  deepSpaceNebulaTheme,
  laserGridTronTheme,
]

export function getThemeById(id: string): ThemeDefinition {
  return registeredThemes.find((t) => t.id === id) || defaultGlassTheme
}

/**
 * Dynamically injects CSS variables to re-theme the entire application shell in real-time.
 */
export function applyGlassTheme(theme: ThemeDefinition): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const { colors } = theme

  root.style.setProperty('--glass-bg', colors.glassBackground)
  root.style.setProperty('--glass-blur', `blur(${colors.glassBlurRadius}) saturate(${colors.glassSaturation}) brightness(1.12)`)
  root.style.setProperty('--specular-border', `1px solid ${colors.specularBorder}`)
  root.style.setProperty('--specular-border-subtle', `1px solid ${colors.specularBorder.replace(/[\d.]+\)$/, '0.08)')}`)
  root.style.setProperty('--text-primary', colors.textPrimary)
  root.style.setProperty('--text-secondary', colors.textMuted)
  root.style.setProperty('--accent-glow', `0 0 24px ${colors.accentGlow}`)

  // Set rich aesthetic accents tailored to each retro/neon/futuristic theme
  if (theme.id.includes('synthwave')) {
    root.style.setProperty('--accent-primary', '#FF2A85')
    root.style.setProperty('--accent-cyan', '#00F0FF')
  } else if (theme.id.includes('matrix')) {
    root.style.setProperty('--accent-primary', '#00FF66')
    root.style.setProperty('--accent-cyan', '#7DFF9E')
  } else if (theme.id.includes('retro-crt-amber')) {
    root.style.setProperty('--accent-primary', '#FFB000')
    root.style.setProperty('--accent-cyan', '#FFE580')
  } else if (theme.id.includes('tokyo-night')) {
    root.style.setProperty('--accent-primary', '#BB9AF7')
    root.style.setProperty('--accent-cyan', '#7AA2F7')
  } else if (theme.id.includes('deep-space-nebula')) {
    root.style.setProperty('--accent-primary', '#BF5AF2')
    root.style.setProperty('--accent-cyan', '#64D2FF')
  } else if (theme.id.includes('laser-grid') || theme.id.includes('tron')) {
    root.style.setProperty('--accent-primary', '#00F0FF')
    root.style.setProperty('--accent-cyan', '#00FFA3')
  } else if (theme.id.includes('obsidian')) {
    root.style.setProperty('--accent-primary', '#00F5D4')
    root.style.setProperty('--accent-cyan', '#30D158')
  } else if (theme.id.includes('amber')) {
    root.style.setProperty('--accent-primary', '#FF9F0A')
    root.style.setProperty('--accent-cyan', '#FFD60A')
  } else if (theme.id.includes('cyberpunk')) {
    root.style.setProperty('--accent-primary', '#FF0055')
    root.style.setProperty('--accent-cyan', '#00F0FF')
  } else {
    root.style.setProperty('--accent-primary', '#0A84FF')
    root.style.setProperty('--accent-cyan', '#64D2FF')
  }
}

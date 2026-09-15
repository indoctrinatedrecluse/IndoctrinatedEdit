import { ThemeDefinition } from '@sdk/index'
import { defaultGlassTheme } from './defaultGlassTheme'
import { liquidObsidianTheme } from './liquidObsidianTheme'
import { frostedAmberTheme } from './frostedAmberTheme'
import { cyberpunkNeonTheme } from './cyberpunkNeonTheme'

export const registeredThemes: ThemeDefinition[] = [
  defaultGlassTheme,
  liquidObsidianTheme,
  frostedAmberTheme,
  cyberpunkNeonTheme,
]

export function getThemeById(id: string): ThemeDefinition {
  return registeredThemes.find((t) => t.id === id) || defaultGlassTheme
}

/**
 * Dynamically injects CSS variables to re-theme the entire application shell in real-time.
 */
export function applyGlassTheme(theme: ThemeDefinition): void {
  const root = document.documentElement
  const { colors } = theme

  root.style.setProperty('--glass-bg', colors.glassBackground)
  root.style.setProperty('--glass-blur', `blur(${colors.glassBlurRadius}) saturate(${colors.glassSaturation}) brightness(1.12)`)
  root.style.setProperty('--specular-border', `1px solid ${colors.specularBorder}`)
  root.style.setProperty('--specular-border-subtle', `1px solid ${colors.specularBorder.replace(/[\d.]+\)$/, '0.08)')}`)
  root.style.setProperty('--text-primary', colors.textPrimary)
  root.style.setProperty('--text-secondary', colors.textMuted)
  root.style.setProperty('--accent-glow', `0 0 24px ${colors.accentGlow}`)

  // Set accent primary based on theme
  if (theme.id.includes('obsidian')) {
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

import { describe, it, expect } from 'vitest'
import {
  ExtensionPlugin,
  ThemeDefinition,
  ThemeType,
  GlassPalette,
  ExtensionContext,
  ToolchainDefinition,
  DetectedToolchain,
} from '@sdk/index'

describe('IndoctrinatedEdit SDK Contracts', () => {
  it('should allow extending ExtensionPlugin with lifecycle methods', async () => {
    let activated = false
    let deactivated = false

    class SampleExtension extends ExtensionPlugin {
      readonly id = 'com.test.sample-extension'
      readonly name = 'Sample Extension'
      readonly version = '1.0.0'

      override onActivate(context: ExtensionContext) {
        activated = true
        expect(context.extensionId).toBe('com.test.sample-extension')
      }

      override onDeactivate() {
        deactivated = true
      }
    }

    const ext = new SampleExtension()
    expect(ext.id).toBe('com.test.sample-extension')
    expect(ext.name).toBe('Sample Extension')
    expect(ext.version).toBe('1.0.0')

    const mockContext: ExtensionContext = {
      extensionId: ext.id,
      registry: {
        registerLanguage: () => {},
        registerStatusBarItem: () => {},
        registerInlineCompletion: () => {},
        registerToolchainCheck: () => {},
        registerToolchain: () => {},
        registerView: () => {},
        registerCommand: () => {},
      },
      git: {
        getStatus: async () => ({
          isRepo: false,
          branch: '',
          ahead: 0,
          behind: 0,
          staged: [],
          working: [],
          commits: [],
        }),
        stageFile: async () => true,
        unstageFile: async () => true,
        commit: async () => true,
      },
    }

    await ext.onActivate(mockContext)
    expect(activated).toBe(true)

    await ext.onDeactivate?.()
    expect(deactivated).toBe(true)
  })

  it('should enforce ThemeDefinition structure and GlassPalette contract', () => {
    class CustomTheme extends ThemeDefinition {
      readonly id = 'indoctrinated.theme.emerald-glass'
      readonly name = 'Emerald Glass'
      readonly type = ThemeType.Dark
      readonly colors: GlassPalette = {
        glassBackground: 'rgba(5, 30, 20, 0.72)',
        glassBlurRadius: '30px',
        glassSaturation: '190%',
        specularBorder: 'rgba(50, 255, 150, 0.25)',
        accentGlow: 'rgba(10, 240, 120, 0.40)',
        textPrimary: '#FFFFFF',
        textMuted: 'rgba(235, 245, 240, 0.60)',
        sidebarBackground: 'rgba(5, 25, 18, 0.65)',
        titlebarBackground: 'rgba(5, 25, 18, 0.75)',
        statusBarBackground: 'rgba(5, 25, 18, 0.85)',
        tokenRules: [
          { token: 'keyword', foreground: '#30F080', fontStyle: 'bold' },
          { token: 'string', foreground: '#70FFB0' },
        ],
      }
    }

    const theme = new CustomTheme()
    expect(theme.id).toBe('indoctrinated.theme.emerald-glass')
    expect(theme.type).toBe(ThemeType.Dark)
    expect(theme.colors.glassBackground).toContain('rgba')
    expect(theme.colors.tokenRules.length).toBe(2)
  })

  it('should validate ToolchainDefinition and DetectedToolchain types', () => {
    const def: ToolchainDefinition = {
      id: 'toolchain.zig',
      name: 'Zig Compiler',
      language: 'zig',
      binaryNames: ['zig'],
      versionFlag: 'version',
      versionPattern: '([0-9]+\\.[0-9]+\\.[0-9]+)',
      downloadUrl: 'https://ziglang.org',
    }

    expect(def.id).toBe('toolchain.zig')
    expect(def.binaryNames).toContain('zig')

    const detected: DetectedToolchain = {
      id: def.id,
      name: def.name,
      language: def.language,
      found: true,
      binaryName: 'zig',
      path: '/usr/bin/zig',
      version: '0.11.0',
      lastChecked: Date.now(),
    }

    expect(detected.found).toBe(true)
    expect(detected.version).toBe('0.11.0')
  })
})

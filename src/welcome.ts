/**
 * ✨ Welcome to IndoctrinatedEdit!
 * 
 * The flashy iOS "Liquid Glass" cross-platform text editor for Linux & Windows.
 * 
 * 🔗 Sister Project:
 * RecluseEdit: https://github.com/indoctrinatedrecluse/RecluseEdit
 * (Ultra-lightweight web-focused editor built with WPF & .NET 10 for Windows)
 */

import { ExtensionPlugin, ThemeDefinition, GlassPalette, ThemeType } from '@sdk/index';

// 1. Defining a Custom Liquid Glass Theme via the SDK
export class NeonNebulaTheme extends ThemeDefinition {
  override readonly id = 'indoctrinated.theme.neon-nebula';
  override readonly name = 'Neon Nebula Glass';
  override readonly type = ThemeType.Dark;
  override readonly author = 'indoctrinatedrecluse';

  override readonly colors: GlassPalette = {
    glassBackground: 'rgba(20, 15, 35, 0.70)',
    glassBlurRadius: '32px',
    glassSaturation: '200%',
    specularBorder: 'rgba(255, 255, 255, 0.18)',
    accentGlow: 'rgba(191, 90, 242, 0.50)',
    textPrimary: '#F5F5F7',
    textMuted: 'rgba(235, 235, 245, 0.45)',
    sidebarBackground: 'rgba(15, 10, 28, 0.65)',
    titlebarBackground: 'rgba(20, 15, 35, 0.75)',
    statusBarBackground: 'rgba(12, 8, 24, 0.75)',
    tokenRules: [
      { token: 'keyword', foreground: 'FF375F', fontStyle: 'bold' },
      { token: 'string', foreground: '30D158' },
      { token: 'function', foreground: 'BF5AF2', fontStyle: 'bold' },
      { token: 'comment', foreground: '8E8E93', fontStyle: 'italic' },
    ],
  };
}

// 2. Defining an Out-Of-Process Microservice Extension
export class AICompanionExtension extends ExtensionPlugin {
  override readonly id = 'indoctrinated.companion';
  override readonly name = 'AI Companion Microservice';
  override readonly version = '1.0.0';

  override async onActivate(context: any): Promise<void> {
    console.log(`[Microservice] ${this.name} initialized inside isolated worker sandbox.`);
    
    // Register custom status bar item
    context.registry.registerStatusBarItem({
      id: 'ai-status',
      text: '🤖 AI Companion: Ready',
      alignment: 'right',
      priority: 100,
    });
  }

  override onDeactivate(): void {
    console.log(`[Microservice] ${this.name} gracefully deactivated.`);
  }
}

console.log('🚀 IndoctrinatedEdit ready: Enjoy fluid editing with Apple-grade glassmorphism!');

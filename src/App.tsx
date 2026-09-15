import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WindowFrame } from './components/WindowFrame/WindowFrame'
import { ActivityBar, ActivityView } from './components/ActivityBar/ActivityBar'
import { Sidebar } from './components/Sidebar/Sidebar'
import { TabBar, TabItem } from './components/TabBar/TabBar'
import { EditorHost } from './components/Editor/EditorHost'
import { StatusBar } from './components/StatusBar/StatusBar'
import { defaultGlassTheme } from './themes/defaultGlassTheme'

// Pre-populate sample tabs
const initialTabs: TabItem[] = [
  { id: 'welcome.ts', name: 'welcome.ts', language: 'typescript' },
  { id: 'defaultGlassTheme.ts', name: 'defaultGlassTheme.ts', language: 'typescript' },
  { id: 'README.md', name: 'README.md', language: 'markdown' },
]

const initialFiles: Record<string, string> = {
  'welcome.ts': `/**
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
    console.log(\`[Microservice] \${this.name} initialized inside isolated worker sandbox.\`);
    
    // Register custom status bar item
    context.registry.registerStatusBarItem({
      id: 'ai-status',
      text: '🤖 AI Companion: Ready',
      alignment: 'right',
      priority: 100,
    });
  }

  override onDeactivate(): void {
    console.log(\`[Microservice] \${this.name} gracefully deactivated.\`);
  }
}

console.log('🚀 IndoctrinatedEdit ready: Enjoy fluid editing with Apple-grade glassmorphism!');
`,
  'defaultGlassTheme.ts': `import { ThemeDefinition, GlassPalette, ThemeType } from '@sdk/index'

export class CupertinoMidnightGlassTheme extends ThemeDefinition {
  override readonly id = 'indoctrinated.theme.cupertino-midnight'
  override readonly name = 'Cupertino Midnight Glass'
  override readonly type = ThemeType.Dark
  override readonly author = 'indoctrinatedrecluse'

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
    ],
  }
}
`,
  'README.md': `# ✨ IndoctrinatedEdit

> Crafted with passion by indoctrinatedrecluse ❤️✨

🔗 Sister Project: Check out RecluseEdit (https://github.com/indoctrinatedrecluse/RecluseEdit)
Ultra-lightweight web-focused text editor for Windows built with WPF & .NET 10.

IndoctrinatedEdit is the flashy, feature-packed general-purpose text editor for Linux & Windows,
featuring an authentic iOS Liquid Glass aesthetic, Monaco core, and microservices architecture!
`,
}

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ActivityView | null>('files')
  const [tabs, setTabs] = useState<TabItem[]>(initialTabs)
  const [activeTabId, setActiveTabId] = useState<string>('welcome.ts')
  const [fileContents, setFileContents] = useState<Record<string, string>>(initialFiles)
  const [currentTheme, setCurrentTheme] = useState(defaultGlassTheme)
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 })

  const handleSelectView = (view: ActivityView) => {
    setActiveView((prev) => (prev === view ? null : view))
  }

  const handleSelectTab = (id: string) => {
    setActiveTabId(id)
  }

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const nextTabs = tabs.filter((t) => t.id !== id)
    setTabs(nextTabs)
    if (activeTabId === id && nextTabs.length > 0) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id)
    }
  }

  const handleOpenFile = (filename: string) => {
    if (!tabs.some((t) => t.id === filename)) {
      const ext = filename.split('.').pop() || 'plaintext'
      const lang = ext === 'ts' ? 'typescript' : ext === 'md' ? 'markdown' : 'javascript'
      setTabs([...tabs, { id: filename, name: filename, language: lang }])
    }
    setActiveTabId(filename)
  }

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setFileContents((prev) => ({ ...prev, [activeTabId]: value }))
    }
  }

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const currentContent = activeTab ? fileContents[activeTab.id] ?? '' : ''
  const currentLanguage = activeTab?.language || 'typescript'

  return (
    <div className="app-shell glass-panel">
      {/* Specular Ambient Glow Orbs behind the glass */}
      <div className="ambient-glow orb-blue" />
      <div className="ambient-glow orb-purple" />
      <div className="ambient-glow orb-cyan" />

      {/* Top Frameless Title Bar */}
      <WindowFrame
        activeFileName={activeTab?.name}
        workspaceName="IndoctrinatedEdit"
        onCommandPaletteToggle={() => alert('Universal Command Palette: Coming up in Phase 2!')}
      />

      {/* Main Workspace Layout */}
      <div className="workspace-body">
        {/* Left Activity Bar */}
        <ActivityBar activeView={activeView} onSelectView={handleSelectView} />

        {/* Collapsible Frosted Sidebar with Spring Animation */}
        <AnimatePresence initial={false}>
          {activeView && (
            <motion.div
              key="sidebar-motion"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              style={{ overflow: 'hidden', height: '100%' }}
            >
              <Sidebar
                activeView={activeView}
                currentThemeId={currentTheme.id}
                onSelectTheme={() => setCurrentTheme(defaultGlassTheme)}
                onOpenFile={handleOpenFile}
                activeFile={activeTabId}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center Editor Stage */}
        <main className="editor-stage">
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={handleSelectTab}
            onCloseTab={handleCloseTab}
          />
          {activeTab ? (
            <EditorHost
              content={currentContent}
              language={currentLanguage}
              theme={currentTheme}
              onChange={handleEditorChange}
              onCursorChange={(line, col) => setCursorPos({ line, col })}
            />
          ) : (
            <div className="empty-workspace">
              <p>No open tabs. Select a file from the explorer.</p>
            </div>
          )}
        </main>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar
        line={cursorPos.line}
        column={cursorPos.col}
        language={currentLanguage.toUpperCase()}
        themeName={currentTheme.name}
        onThemeClick={() => setActiveView('themes')}
      />

      <style>{`
        .app-shell {
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          background: var(--glass-bg);
          border-radius: var(--radius-md);
        }

        /* Ambient Glow Specular Orbs for realistic Apple Liquid Glass refraction */
        .ambient-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.22;
        }

        .orb-blue {
          width: 450px;
          height: 450px;
          background: #0A84FF;
          top: -120px;
          right: 5%;
        }

        .orb-purple {
          width: 500px;
          height: 500px;
          background: #BF5AF2;
          bottom: -150px;
          left: 10%;
        }

        .orb-cyan {
          width: 320px;
          height: 320px;
          background: #64D2FF;
          top: 30%;
          left: 25%;
        }

        .workspace-body {
          flex: 1;
          display: flex;
          position: relative;
          overflow: hidden;
          z-index: 10;
        }

        .editor-stage {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
          background: rgba(14, 18, 30, 0.35);
          backdrop-filter: var(--glass-blur-sm);
        }

        .empty-workspace {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-size: 13px;
        }
      `}</style>
    </div>
  )
}

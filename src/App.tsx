import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WindowFrame } from './components/WindowFrame/WindowFrame'
import { ActivityBar, ActivityView } from './components/ActivityBar/ActivityBar'
import { Sidebar, WorkspaceFileItem } from './components/Sidebar/Sidebar'
import { TabBar, TabItem } from './components/TabBar/TabBar'
import { EditorHost } from './components/Editor/EditorHost'
import { StatusBar } from './components/StatusBar/StatusBar'
import { registeredThemes, getThemeById, applyGlassTheme } from './themes/themeRegistry'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

const demoFiles: WorkspaceFileItem[] = [
  { name: 'welcome.ts', path: 'welcome.ts', isDirectory: false, lang: 'TypeScript' },
  { name: 'defaultGlassTheme.ts', path: 'defaultGlassTheme.ts', isDirectory: false, lang: 'TypeScript' },
  { name: 'liquidObsidianTheme.ts', path: 'liquidObsidianTheme.ts', isDirectory: false, lang: 'TypeScript' },
  { name: 'README.md', path: 'README.md', isDirectory: false, lang: 'Markdown' },
]

const initialTabs: TabItem[] = [
  { id: 'welcome.ts', name: 'welcome.ts', language: 'typescript' },
  { id: 'defaultGlassTheme.ts', name: 'defaultGlassTheme.ts', language: 'typescript' },
  { id: 'README.md', name: 'README.md', language: 'markdown' },
]

const initialFileContents: Record<string, string> = {
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
    ],
  }
}
`,
  'liquidObsidianTheme.ts': `import { ThemeDefinition, GlassPalette, ThemeType } from '@sdk/index'

export class LiquidObsidianGlassTheme extends ThemeDefinition {
  override readonly id = 'indoctrinated.theme.liquid-obsidian'
  override readonly name = 'Liquid Obsidian'
  override readonly type = ThemeType.Dark
  override readonly author = 'indoctrinatedrecluse'

  override readonly colors: GlassPalette = {
    glassBackground: 'rgba(8, 10, 16, 0.82)',
    glassBlurRadius: '32px',
    glassSaturation: '210%',
    specularBorder: 'rgba(48, 209, 88, 0.22)',
    accentGlow: 'rgba(48, 209, 88, 0.50)',
    textPrimary: '#F0FDF4',
    textMuted: 'rgba(167, 243, 208, 0.45)',
    sidebarBackground: 'rgba(6, 8, 12, 0.75)',
    titlebarBackground: 'rgba(8, 10, 16, 0.85)',
    statusBarBackground: 'rgba(6, 8, 12, 0.82)',
    tokenRules: [
      { token: 'keyword', foreground: '00F5D4', fontStyle: 'bold' },
      { token: 'string', foreground: '30D158' },
      { token: 'function', foreground: '10B981', fontStyle: 'bold' },
      { token: 'comment', foreground: '4B5563', fontStyle: 'italic' },
    ],
  }
}
`,
  'README.md': `# ✨ IndoctrinatedEdit

> Crafted with passion by **indoctrinatedrecluse** ❤️✨

🔗 **Sister Project**: [RecluseEdit](https://github.com/indoctrinatedrecluse/RecluseEdit)  
Ultra-lightweight web-focused text editor for Windows built with WPF & .NET 10.

IndoctrinatedEdit is the flashy, feature-packed general-purpose text editor for Linux & Windows,
featuring an authentic iOS Liquid Glass aesthetic, Monaco core, and microservices architecture!
`,
}

function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript'
    case 'js':
    case 'jsx':
      return 'javascript'
    case 'json':
      return 'json'
    case 'html':
      return 'html'
    case 'css':
      return 'css'
    case 'md':
      return 'markdown'
    case 'py':
      return 'python'
    case 'rs':
      return 'rust'
    case 'go':
      return 'go'
    case 'cs':
      return 'csharp'
    case 'cpp':
    case 'c':
    case 'h':
      return 'cpp'
    default:
      return 'plaintext'
  }
}

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ActivityView | null>('files')
  const [workspaceName, setWorkspaceName] = useState<string>('IndoctrinatedEdit')
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFileItem[]>(demoFiles)
  const [tabs, setTabs] = useState<TabItem[]>(initialTabs)
  const [activeTabId, setActiveTabId] = useState<string>('welcome.ts')
  const [fileContents, setFileContents] = useState<Record<string, string>>(initialFileContents)
  const [currentTheme, setCurrentTheme] = useState(registeredThemes[0])
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 })
  const [untitledCount, setUntitledCount] = useState<number>(1)

  // Initialize and apply theme CSS tokens
  useEffect(() => {
    applyGlassTheme(currentTheme)
  }, [currentTheme])

  const handleSelectTheme = (themeId: string) => {
    const theme = getThemeById(themeId)
    setCurrentTheme(theme)
    applyGlassTheme(theme)
  }

  const handleSelectView = (view: ActivityView) => {
    setActiveView((prev) => (prev === view ? null : view))
  }

  const handleSelectTab = (id: string) => {
    setActiveTabId(id)
  }

  const handleCloseTab = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const nextTabs = tabs.filter((t) => t.id !== id)
    setTabs(nextTabs)
    if (activeTabId === id && nextTabs.length > 0) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id)
    }
  }

  const handleNewFile = () => {
    const name = `Untitled-${untitledCount}.ts`
    setUntitledCount((c) => c + 1)
    const newTab: TabItem = { id: name, name, language: 'typescript', isDirty: true }
    setTabs([...tabs, newTab])
    setFileContents((prev) => ({ ...prev, [name]: `// New file: ${name}\n\n` }))
    setActiveTabId(name)
  }

  const handleOpenFileItem = async (file: WorkspaceFileItem) => {
    if (file.isDirectory) return

    // If already in fileContents, open tab
    if (fileContents[file.path] !== undefined || fileContents[file.name] !== undefined) {
      const tabId = file.path || file.name
      if (!tabs.some((t) => t.id === tabId)) {
        setTabs([...tabs, { id: tabId, name: file.name, language: getLanguageFromFilename(file.name) }])
      }
      setActiveTabId(tabId)
      return
    }

    // Read via Electron IPC if running inside desktop app
    if (window.electronAPI?.readFile && file.path) {
      try {
        const content = await window.electronAPI.readFile(file.path)
        setFileContents((prev) => ({ ...prev, [file.path]: content }))
        if (!tabs.some((t) => t.id === file.path)) {
          setTabs([...tabs, { id: file.path, name: file.name, language: getLanguageFromFilename(file.name) }])
        }
        setActiveTabId(file.path)
      } catch (err) {
        console.error('Failed to read file:', err)
      }
    }
  }

  const handleOpenFileNative = async () => {
    if (!window.electronAPI?.openFileDialog) return
    const res = await window.electronAPI.openFileDialog()
    if (!res) return

    setFileContents((prev) => ({ ...prev, [res.path]: res.content }))
    if (!tabs.some((t) => t.id === res.path)) {
      setTabs([...tabs, { id: res.path, name: res.name, language: getLanguageFromFilename(res.name) }])
    }
    setActiveTabId(res.path)
  }

  const handleOpenFolderNative = async () => {
    if (!window.electronAPI?.openFolderDialog) return
    const res = await window.electronAPI.openFolderDialog()
    if (!res) return

    setWorkspaceName(res.folderName)
    const mapped: WorkspaceFileItem[] = res.files.map((f) => ({
      name: f.name,
      path: f.path,
      isDirectory: f.isDirectory,
      lang: f.isDirectory ? undefined : getLanguageFromFilename(f.name),
    }))
    setWorkspaceFiles(mapped)
    setActiveView('files')
  }

  const handleSaveFile = async () => {
    const activeTab = tabs.find((t) => t.id === activeTabId)
    if (!activeTab) return

    const content = fileContents[activeTabId] ?? ''

    // If file has an absolute path on disk
    if (activeTabId.includes('/') || activeTabId.includes('\\')) {
      if (window.electronAPI?.saveFile) {
        await window.electronAPI.saveFile(activeTabId, content)
        setTabs(tabs.map((t) => (t.id === activeTabId ? { ...t, isDirty: false } : t)))
      }
    } else {
      // Save As
      await handleSaveFileAs()
    }
  }

  const handleSaveFileAs = async () => {
    const activeTab = tabs.find((t) => t.id === activeTabId)
    if (!activeTab || !window.electronAPI?.saveFileAs) return

    const content = fileContents[activeTabId] ?? ''
    const res = await window.electronAPI.saveFileAs(activeTab.name, content)
    if (!res) return

    // Replace tab id with new saved path
    setFileContents((prev) => {
      const next = { ...prev }
      delete next[activeTabId]
      next[res.path] = content
      return next
    })

    setTabs(
      tabs.map((t) =>
        t.id === activeTabId ? { id: res.path, name: res.name, language: getLanguageFromFilename(res.name), isDirty: false } : t
      )
    )
    setActiveTabId(res.path)
  }

  const handleToggleSidebar = () => {
    setActiveView((prev) => (prev ? null : 'files'))
  }

  // Bind Standard VS Code Keyboard Shortcuts
  useKeyboardShortcuts({
    onOpenFile: handleOpenFileNative,
    onOpenFolder: handleOpenFolderNative,
    onSaveFile: handleSaveFile,
    onSaveFileAs: handleSaveFileAs,
    onNewFile: handleNewFile,
    onCloseTab: () => handleCloseTab(activeTabId),
    onToggleSidebar: handleToggleSidebar,
    onOpenSettings: () => setActiveView('settings'),
    onCommandPalette: () => alert('Universal Command Palette (<Ctrl+Shift+P>): Coming in the next iteration!'),
    onQuickOpen: () => setActiveView('files'),
  })

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setFileContents((prev) => ({ ...prev, [activeTabId]: value }))
      setTabs(tabs.map((t) => (t.id === activeTabId ? { ...t, isDirty: true } : t)))
    }
  }

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const currentContent = activeTab ? fileContents[activeTab.id] ?? '' : ''
  const currentLanguage = activeTab?.language || 'typescript'

  return (
    <div className="app-shell glass-panel">
      {/* Specular Ambient Glow Orbs behind the glass */}
      <div className="ambient-glow orb-primary" />
      <div className="ambient-glow orb-secondary" />
      <div className="ambient-glow orb-tertiary" />

      {/* Top Frameless Title Bar */}
      <WindowFrame
        activeFileName={activeTab?.name}
        workspaceName={workspaceName}
        onCommandPaletteToggle={() => alert('Universal Command Palette (<Ctrl+Shift+P>): Coming in the next iteration!')}
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
                onSelectTheme={handleSelectTheme}
                onOpenFile={handleOpenFileItem}
                activeFilePath={activeTabId}
                workspaceName={workspaceName}
                workspaceFiles={workspaceFiles}
                onOpenFolderClick={handleOpenFolderNative}
                onNewFileClick={handleNewFile}
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
              <p>No open tabs. Press <kbd>Ctrl+N</kbd> for a new file or <kbd>Ctrl+O</kbd> to open one.</p>
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
          transition: background 0.3s ease;
        }

        /* Ambient Glow Specular Orbs for realistic Apple Liquid Glass refraction */
        .ambient-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.22;
          transition: background 0.4s ease;
        }

        .orb-primary {
          width: 450px;
          height: 450px;
          background: var(--accent-primary);
          top: -120px;
          right: 5%;
        }

        .orb-secondary {
          width: 500px;
          height: 500px;
          background: var(--accent-cyan);
          bottom: -150px;
          left: 10%;
        }

        .orb-tertiary {
          width: 320px;
          height: 320px;
          background: var(--accent-primary);
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
          background: rgba(14, 18, 30, 0.25);
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

        .empty-workspace kbd {
          padding: 2px 6px;
          border-radius: var(--radius-xs);
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: var(--text-primary);
          margin: 0 4px;
        }
      `}</style>
    </div>
  )
}

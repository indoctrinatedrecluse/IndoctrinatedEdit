import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WindowFrame } from './components/WindowFrame/WindowFrame'
import { ActivityBar, ActivityView } from './components/ActivityBar/ActivityBar'
import { Sidebar, WorkspaceFileItem } from './components/Sidebar/Sidebar'
import { TabBar, TabItem } from './components/TabBar/TabBar'
import { EditorHost, EditorHostHandle, SelectionInfo } from './components/Editor/EditorHost'
import { StatusBar } from './components/StatusBar/StatusBar'
import { CommandPalette } from './components/CommandPalette/CommandPalette'
import { AiChatPanel } from './components/AiChat/AiChatPanel'
import { AboutModal } from './components/Modals/AboutModal'
import { LicenseModal } from './components/Modals/LicenseModal'
import { ShortcutsModal } from './components/Modals/ShortcutsModal'
import { TerminalConfigModal } from './components/Modals/TerminalConfigModal'
import { BottomPanel, BottomPanelTab } from './components/BottomPanel/BottomPanel'
import { NotificationCenter } from './components/NotificationCenter/NotificationCenter'
import { notificationService, NotificationItem } from './services/notificationService'
import { commandRegistry } from './services/commandRegistry'
import { registeredThemes, getThemeById, applyGlassTheme } from './themes/themeRegistry'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { toolchainService } from './services/toolchainService'
import { sessionService } from './services/sessionService'

const demoFiles: WorkspaceFileItem[] = [
  { name: 'welcome.ts', path: 'welcome.ts', isDirectory: false, lang: 'TypeScript' },
  { name: 'project-roadmap.textile', path: 'project-roadmap.textile', isDirectory: false, lang: 'Textile' },
  { name: 'defaultGlassTheme.ts', path: 'defaultGlassTheme.ts', isDirectory: false, lang: 'TypeScript' },
  { name: 'liquidObsidianTheme.ts', path: 'liquidObsidianTheme.ts', isDirectory: false, lang: 'TypeScript' },
  { name: 'README.md', path: 'README.md', isDirectory: false, lang: 'Markdown' },
]

const initialTabs: TabItem[] = [
  { id: 'welcome.ts', name: 'welcome.ts', language: 'typescript' },
  { id: 'project-roadmap.textile', name: 'project-roadmap.textile', language: 'textile' },
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
  'project-roadmap.textile': `h1. IndoctrinatedEdit — Project Roadmap

{{toc}}

h2. 🚀 Overview & Architecture

IndoctrinatedEdit is the flashy, next-generation code editor built with *Liquid Glass* UI design and heavyweight *Monaco Core*.
Sister project: "RecluseEdit":https://github.com/indoctrinatedrecluse/RecluseEdit (built with WPF & .NET 10).

h2. 📋 Milestone Checklist

* [x] Authentic iOS Liquid Glass Specular Shaders
* [x] Multi-Model AI Streaming Assistant (#1024)
* [x] Monaco Transparent Canvas & Translucent Minimap (#1028)
* [x] Universal Text & Prose Language Pack (Textile, MD, reST, AsciiDoc)
* [ ] Online Cloud License Activation Server (#2048)

h2. 🔗 Redmine Integration Reference

Related Issues: #1024, #1028, #2048
Changeset commit: commit:6728b09
Revision source: source:src/extensions/textSupport/textileGrammar.ts

h2. 📊 Technology & Specification Matrix

|_. Component |_. Technology |_. Status |
| Editor Core | Monaco Editor & React 19 | *Active* |
| Aesthetics | iOS Liquid Glass & Specular Glow | *Active* |
| Language Pack | Textile, Markdown, reST, AsciiDoc | *Active* |
| Microservices | Out-of-Process Sandbox Bus | *Running* |

bc. // Example configuration
export const APP_CONFIG = {
  theme: 'indoctrinated.theme.cupertino-midnight',
  license: 'INDC-PRO-PERPETUAL',
};

{{collapse(Click here to view extended architecture details...)
This section is rendered using Redmine Textile collapse macro.
All formatting like *bold*, _italic_, +underline+, -strikethrough-, and @inline code@ is fully tokenized!
}}
`,
  'README.md': `# ✨ IndoctrinatedEdit

> Crafted with passion by **indoctrinatedrecluse** ❤️✨

🔗 **Sister Project**: [RecluseEdit](https://github.com/indoctrinatedrecluse/RecluseEdit)  
Ultra-lightweight web-focused text editor for Windows built with WPF & .NET 10.

IndoctrinatedEdit is the flashy, feature-packed general-purpose text editor for Linux & Windows,
featuring an authentic iOS Liquid Glass aesthetic, Monaco core, and microservices architecture!
`,
}

import { extensionRegistry } from './extensions/extensionRegistry'

function getLanguageFromFilename(filename: string, content?: string): string {
  try {
    return extensionRegistry.resolveLanguageForFilename(filename, content)
  } catch (err) {
    console.warn('Failed to resolve language from filename:', err)
    return 'plaintext'
  }
}

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ActivityView | null>('files')
  const [workspaceName, setWorkspaceName] = useState<string>('IndoctrinatedEdit')
  const [workspacePath, setWorkspacePath] = useState<string | undefined>(undefined)
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFileItem[]>(demoFiles)
  const [gitBranch, setGitBranch] = useState<string>('master')
  const [gitChangesCount, setGitChangesCount] = useState<number>(0)
  const [tabs, setTabs] = useState<TabItem[]>(initialTabs)
  const [activeTabId, setActiveTabId] = useState<string>('welcome.ts')
  const [fileContents, setFileContents] = useState<Record<string, string>>(initialFileContents)
  const [currentTheme, setCurrentTheme] = useState(registeredThemes[0])
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 })
  const [untitledCount, setUntitledCount] = useState<number>(1)
  const [sidebarWidth, setSidebarWidth] = useState<number>(260)
  const [aiPanelWidth, setAiPanelWidth] = useState<number>(420)

  // Left Sidebar Drag-to-Resize
  const isResizingSidebar = useRef(false)
  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isResizingSidebar.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingSidebar.current) return
      const newWidth = Math.max(180, Math.min(500, moveEvent.clientX - 48))
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      isResizingSidebar.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Right AI Chat Dock Drag-to-Resize
  const isResizingAi = useRef(false)
  const handleAiMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isResizingAi.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingAi.current) return
      const newWidth = Math.max(320, Math.min(700, window.innerWidth - moveEvent.clientX))
      setAiPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      isResizingAi.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // AI Multi-Model Chat Panel & Editor Integration State
  const editorHostRef = useRef<EditorHostHandle>(null)
  const [isAiPanelOpen, setIsAiPanelOpen] = useState<boolean>(false)
  const [currentSelection, setCurrentSelection] = useState<SelectionInfo | null>(null)

  const handleToggleAi = useCallback(() => {
    setIsAiPanelOpen((prev) => !prev)
  }, [])

  const handleInsertAtCursor = useCallback((code: string) => {
    editorHostRef.current?.insertAtCursor(code)
  }, [])

  const handleReplaceSelection = useCallback((code: string) => {
    editorHostRef.current?.replaceSelection(code)
  }, [])

  // Initialize and apply theme CSS tokens
  useEffect(() => {
    applyGlassTheme(currentTheme)
  }, [currentTheme])

  const handleEditorReady = useCallback(() => {
    // Monaco editor canvas is fully mounted and painted; give brief grace period for full DOM painting
    setTimeout(() => {
      window.electronAPI?.notifyReady?.()
    }, 250)
  }, [])

  // Mount initialization & Session Auto-Restore
  useEffect(() => {
    // Non-blocking background toolchain detection (idle time)
    toolchainService.scheduleBackgroundDetection(1500)

    // Asynchronously restore previous workspace session (last opened project and files)
    sessionService.restoreSession(demoFiles, initialTabs, initialFileContents, getLanguageFromFilename)
      .then((restored) => {
        if (restored.workspacePath) {
          setWorkspacePath(restored.workspacePath)
        }
        setWorkspaceName(restored.workspaceName)
        setWorkspaceFiles(restored.workspaceFiles)
        setTabs(restored.tabs)
        setActiveTabId(restored.activeTabId)
        setFileContents(restored.fileContents)
      })
      .catch((err) => {
        console.warn('[App] Session restoration failed, fallback to defaults:', err)
      })

    // Safety fallback only in case no editor tab is opened within 8 seconds
    const fallbackTimer = setTimeout(() => {
      window.electronAPI?.notifyReady?.()
    }, 8000)
    return () => clearTimeout(fallbackTimer)
  }, [])

  // Auto-persist workspace session on state change
  useEffect(() => {
    sessionService.saveSession({
      workspacePath,
      workspaceName,
      tabs,
      activeTabId,
    })
  }, [workspacePath, workspaceName, tabs, activeTabId])

  // Refresh Git Status for status bar and activity bar badge
  const refreshGitStatus = useCallback(async () => {
    if (!window.electronAPI?.git?.getRepoStatus) return
    try {
      const status = await window.electronAPI.git.getRepoStatus(workspacePath)
      if (status.isRepo) {
        setGitBranch(status.branch || 'HEAD')
        setGitChangesCount(status.staged.length + status.working.length)
      } else {
        setGitBranch('No Git')
        setGitChangesCount(0)
      }
    } catch (err) {
      console.warn('Failed to refresh git status:', err)
    }
  }, [workspacePath])

  useEffect(() => {
    refreshGitStatus()
  }, [refreshGitStatus])

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
    setWorkspacePath(res.folderPath)
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

  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false)
  const [isLicenseOpen, setIsLicenseOpen] = useState<boolean>(false)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false)
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState<boolean>(false)
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState<boolean>(false)
  const [bottomPanelTab, setBottomPanelTab] = useState<BottomPanelTab>('terminal')
  const [isTerminalConfigOpen, setIsTerminalConfigOpen] = useState<boolean>(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => notificationService.getNotifications())

  useEffect(() => {
    return notificationService.subscribe((list) => {
      setNotifications(list)
    })
  }, [])

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length

  const handleToggleNotifications = useCallback(() => {
    setIsNotificationCenterOpen((prev) => !prev)
  }, [])

  const handleToggleSidebar = () => {
    setActiveView((prev) => (prev ? null : 'files'))
  }

  const handleToggleTerminal = useCallback(() => {
    setIsBottomPanelOpen((prev) => {
      if (!prev) {
        setBottomPanelTab('terminal')
        return true
      }
      if (bottomPanelTab !== 'terminal') {
        setBottomPanelTab('terminal')
        return true
      }
      return false
    })
  }, [bottomPanelTab])

  const handleOpenProblems = useCallback(() => {
    setIsBottomPanelOpen(true)
    setBottomPanelTab('problems')
  }, [])

  const handleOpenTerminalConfig = useCallback(() => {
    setIsTerminalConfigOpen(true)
  }, [])

  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(false)
  const [paletteInitialQuery, setPaletteInitialQuery] = useState<string>('>')

  const openPalette = useCallback((initial = '>') => {
    setPaletteInitialQuery(initial)
    setIsPaletteOpen(true)
  }, [])

  // Top Menu Handlers
  const menuHandlers = useMemo(
    () => ({
      onNewFile: handleNewFile,
      onOpenFile: handleOpenFileNative,
      onOpenFolder: handleOpenFolderNative,
      onSaveFile: handleSaveFile,
      onSaveFileAs: handleSaveFileAs,
      onCloseTab: () => handleCloseTab(activeTabId),
      onExit: () => window.electronAPI?.close?.(),
      onCommandPalette: () => openPalette('>'),
      onQuickOpen: () => openPalette(''),
      onShowExplorer: () => setActiveView('files'),
      onShowGitGraph: () => setActiveView('git'),
      onShowSearch: () => setActiveView('search'),
      onToggleAi: handleToggleAi,
      onToggleSidebar: handleToggleSidebar,
      onOpenSettings: () => setActiveView('settings'),
      onToggleNotifications: handleToggleNotifications,
      onOpenShortcuts: () => setIsShortcutsOpen(true),
      onToggleTerminal: handleToggleTerminal,
      onOpenTerminalConfig: handleOpenTerminalConfig,
      onOpenProblems: handleOpenProblems,
      onWelcomeGuide: () => {
        const welcomeTab = tabs.find((t) => t.id === 'welcome.ts')
        if (welcomeTab) {
          setActiveTabId(welcomeTab.id)
        } else {
          handleNewFile()
        }
      },
      onOpenLicense: () => setIsLicenseOpen(true),
      onOpenAbout: () => setIsAboutOpen(true),
    }),
    [
      handleNewFile,
      handleOpenFileNative,
      handleOpenFolderNative,
      handleSaveFile,
      handleSaveFileAs,
      handleCloseTab,
      activeTabId,
      openPalette,
      handleToggleAi,
      handleToggleSidebar,
      handleToggleNotifications,
      handleToggleTerminal,
      handleOpenTerminalConfig,
      handleOpenProblems,
      tabs,
    ]
  )

  // Register commands into the centralized CommandRegistry
  useEffect(() => {
    // Dynamic theme commands from registeredThemes
    const themeCommands = registeredThemes.map((t) => ({
      id: `theme.${t.id.replace(/[^a-zA-Z0-9-]/g, '-')}`,
      title: `Theme: ${t.name}`,
      category: 'Themes' as const,
      description: `Switch editor theme to ${t.name}`,
      handler: () => handleSelectTheme(t.id),
    }))

    return commandRegistry.registerMany([
      // File Operations
      { id: 'file.new', title: 'New Untitled File', category: 'File', shortcut: 'Ctrl+N', description: 'Create a new buffer', handler: handleNewFile },
      { id: 'file.open', title: 'Open File...', category: 'File', shortcut: 'Ctrl+O', description: 'Open local file from disk', handler: handleOpenFileNative },
      { id: 'file.openFolder', title: 'Open Workspace Folder...', category: 'File', shortcut: 'Ctrl+K Ctrl+O', description: 'Open folder tree in workspace', handler: handleOpenFolderNative },
      { id: 'file.save', title: 'Save File', category: 'File', shortcut: 'Ctrl+S', description: 'Save current active document', handler: handleSaveFile },
      { id: 'file.saveAs', title: 'Save File As...', category: 'File', shortcut: 'Ctrl+Shift+S', description: 'Save active document under a new name', handler: handleSaveFileAs },
      { id: 'file.close', title: 'Close Current Tab', category: 'File', shortcut: 'Ctrl+W', description: 'Close active editor buffer', handler: () => handleCloseTab(activeTabId) },
      
      // Navigation & Search
      { id: 'view.commandPalette', title: 'Command Palette: Show All Commands', category: 'View', shortcut: 'Ctrl+Shift+P', description: 'Open action launcher', handler: () => openPalette('>') },
      { id: 'view.quickOpen', title: 'Quick Open: Go to File...', category: 'View', shortcut: 'Ctrl+P', description: 'Quick open file by filename', handler: () => openPalette('') },
      { id: 'edit.gotoLine', title: 'Go to Line / Column...', category: 'Editor', shortcut: 'Ctrl+G', description: 'Navigate directly to line number', handler: () => openPalette(':') },
      { id: 'edit.symbols', title: 'Go to Symbol in Active Buffer...', category: 'Editor', shortcut: 'Ctrl+Shift+O', description: 'Outline symbols in file (@)', handler: () => openPalette('@') },
      { id: 'edit.workspaceSymbols', title: 'Go to Symbol in Workspace...', category: 'Editor', shortcut: 'Ctrl+T', description: 'Search symbols and features across project (#)', handler: () => openPalette('#') },

      // Editing Actions
      { id: 'edit.format', title: 'Format Document', category: 'Editor', shortcut: 'Shift+Alt+F', description: 'Auto-format active code buffer', handler: () => editorHostRef.current?.formatDocument() },
      { id: 'edit.find', title: 'Find in File', category: 'Editor', shortcut: 'Ctrl+F', description: 'Find text occurrences in active document', handler: () => editorHostRef.current?.triggerAction('actions.find') },
      { id: 'edit.replace', title: 'Replace in File', category: 'Editor', shortcut: 'Ctrl+H', description: 'Find and replace text in active document', handler: () => editorHostRef.current?.triggerAction('editor.action.startFindReplaceAction') },
      { id: 'edit.commentLine', title: 'Toggle Line Comment', category: 'Editor', shortcut: 'Ctrl+/', description: 'Add/remove line comments on active selection', handler: () => editorHostRef.current?.triggerAction('editor.action.commentLine') },
      { id: 'edit.duplicateLine', title: 'Duplicate Line Down', category: 'Editor', shortcut: 'Shift+Alt+Down', description: 'Duplicate cursor line downwards', handler: () => editorHostRef.current?.triggerAction('editor.action.copyLinesDownAction') },
      { id: 'edit.deleteLine', title: 'Delete Line', category: 'Editor', shortcut: 'Ctrl+Shift+K', description: 'Delete current line immediately', handler: () => editorHostRef.current?.triggerAction('editor.action.deleteLines') },
      { id: 'edit.uppercase', title: 'Transform: Convert to UPPERCASE', category: 'Editor', description: 'Capitalize selected text or entire buffer', handler: () => editorHostRef.current?.transformSelection('uppercase') },
      { id: 'edit.lowercase', title: 'Transform: Convert to lowercase', category: 'Editor', description: 'Lower-case selected text or entire buffer', handler: () => editorHostRef.current?.transformSelection('lowercase') },
      { id: 'edit.titlecase', title: 'Transform: Convert to Title Case', category: 'Editor', description: 'Capitalize each word in selection', handler: () => editorHostRef.current?.transformSelection('titlecase') },
      { id: 'edit.trim', title: 'Transform: Trim Trailing Whitespace', category: 'Editor', description: 'Clean up trailing spaces on all lines', handler: () => editorHostRef.current?.transformSelection('trim') },
      { id: 'edit.sort', title: 'Transform: Sort Lines Alphabetically', category: 'Editor', description: 'Sort lines in alphabetical order', handler: () => editorHostRef.current?.transformSelection('sort') },

      // View & Layout
      { id: 'view.toggleSidebar', title: 'Toggle Primary Sidebar', category: 'View', shortcut: 'Ctrl+B', description: 'Show/hide primary activity sidebar', handler: handleToggleSidebar },
      { id: 'view.explorer', title: 'Show Explorer', category: 'View', shortcut: 'Ctrl+Shift+E', description: 'Reveal workspace directory navigator', handler: () => setActiveView('files') },
      { id: 'view.git', title: 'Show Source Control & Git Graph', category: 'View', shortcut: 'Ctrl+Shift+G', description: 'Open Git visual commit tree', handler: () => setActiveView('git') },
      { id: 'view.search', title: 'Search in Workspace', category: 'View', shortcut: 'Ctrl+Shift+F', description: 'Global workspace pattern search', handler: () => setActiveView('search') },
      { id: 'view.notifications', title: 'Show Notifications & System Alerts', category: 'View', shortcut: 'Ctrl+Shift+N', description: 'Open notification drawer', handler: handleToggleNotifications },
      { id: 'view.wordWrap', title: 'Toggle Word Wrap', category: 'View', shortcut: 'Alt+Z', description: 'Wrap code lines to editor viewport', handler: () => editorHostRef.current?.triggerAction('editor.action.toggleWordWrap') },
      { id: 'view.foldAll', title: 'Fold All Code Blocks', category: 'View', description: 'Collapse all functions and classes', handler: () => editorHostRef.current?.triggerAction('editor.foldAll') },
      { id: 'view.unfoldAll', title: 'Unfold All Code Blocks', category: 'View', description: 'Expand all functions and classes', handler: () => editorHostRef.current?.triggerAction('editor.unfoldAll') },
      { id: 'view.themes', title: 'Open Liquid Glass Themes Drawer', category: 'View', description: 'Browse and switch themes', handler: () => setActiveView('themes') },
      { id: 'view.settings', title: 'Open Preferences / Settings', category: 'Preferences', shortcut: 'Ctrl+,', description: 'Configure editor options', handler: () => setActiveView('settings') },

      // Terminal & Diagnostics Subsystems
      { id: 'terminal.toggle', title: 'Terminal: Toggle Integrated Terminal', category: 'Terminal', shortcut: 'Ctrl+`', description: 'Open/close multi-shell terminal emulator', handler: handleToggleTerminal },
      { id: 'terminal.config', title: 'Preferences: Open Terminal Configuration (JSON)', category: 'Preferences', description: 'Edit shell profiles, fonts, and defaults in terminal.json', handler: handleOpenTerminalConfig },
      { id: 'view.problems', title: 'View: Toggle Problems Panel', category: 'View', description: 'Open diagnostic error and warning inspector', handler: handleOpenProblems },

      // All 10 Dynamic Themes
      ...themeCommands,

      // Git & Toolchain
      { id: 'git.refresh', title: 'Git: Refresh Repository Status', category: 'Git', description: 'Re-query git status for all files', handler: refreshGitStatus },
      
      // AI Multi-Model Assistant
      { id: 'ai.toggle', title: 'Toggle AI Multi-Model Assistant', category: 'AI', shortcut: 'Ctrl+Alt+A', description: 'Open AI chat and refactor dock', handler: handleToggleAi },
      { id: 'ai.explain', title: 'AI: Explain Code / Active Selection', category: 'AI', shortcut: 'Ctrl+Shift+I', description: 'Ask AI to analyze selected code', handler: () => setIsAiPanelOpen(true) },
      { id: 'ai.bugs', title: 'AI: Find Bugs & Security Flaws', category: 'AI', description: 'Scan active buffer for vulnerabilities', handler: () => setIsAiPanelOpen(true) },
      { id: 'ai.refactor', title: 'AI: Refactor & Modernize Code', category: 'AI', description: 'Clean architecture refactoring', handler: () => setIsAiPanelOpen(true) },
      { id: 'ai.tests', title: 'AI: Generate Unit Tests', category: 'AI', description: 'Generate comprehensive test cases', handler: () => setIsAiPanelOpen(true) },

      // Help & Shortcuts
      { id: 'help.shortcuts', title: 'Help: Keyboard Shortcuts Reference', category: 'Help', shortcut: 'Ctrl+K Ctrl+S', description: 'Show all keyboard shortcuts', handler: () => setIsShortcutsOpen(true) },
      { id: 'help.license', title: 'License & Subscription: View Pro Lifetime Status', category: 'Help', description: 'Inspect license and subscription', handler: () => setIsLicenseOpen(true) },
      { id: 'help.about', title: 'Help: About IndoctrinatedEdit', category: 'Help', description: 'Application info and version', handler: () => setIsAboutOpen(true) },
    ])
  }, [activeTabId, handleNewFile, handleOpenFileNative, handleOpenFolderNative, handleSaveFile, handleSaveFileAs, handleToggleSidebar, handleToggleNotifications, handleToggleTerminal, handleOpenTerminalConfig, handleOpenProblems, refreshGitStatus, handleToggleAi, handleSelectTheme, openPalette])

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
    onCommandPalette: () => openPalette('>'),
    onQuickOpen: () => openPalette(''),
    onGitGraph: () => setActiveView((prev) => (prev === 'git' ? null : 'git')),
    onShowExplorer: () => setActiveView((prev) => (prev === 'files' ? null : 'files')),
    onShowSearch: () => setActiveView((prev) => (prev === 'search' ? null : 'search')),
    onToggleAi: handleToggleAi,
    onToggleNotifications: handleToggleNotifications,
    onOpenShortcuts: () => setIsShortcutsOpen(true),
    onGoToLine: () => openPalette(':'),
    onSymbols: () => openPalette('@'),
    onToggleTerminal: handleToggleTerminal,
    onOpenProblems: handleOpenProblems,
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

      {/* Universal Command Palette */}
      <CommandPalette
        isOpen={isPaletteOpen}
        initialQuery={paletteInitialQuery}
        onClose={() => setIsPaletteOpen(false)}
        workspaceFiles={workspaceFiles}
        tabs={tabs}
        onOpenFile={(f) => handleOpenFileItem({ name: f.name, path: f.path, isDirectory: false })}
        symbols={editorHostRef.current?.getOutlineSymbols() || []}
        onGoToLine={(line, col) => editorHostRef.current?.goToLine(line, col)}
        activeTabName={activeTab?.name}
      />

      {/* About & License & Shortcuts Modals */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        version="2.0.0"
      />
      <LicenseModal
        isOpen={isLicenseOpen}
        onClose={() => setIsLicenseOpen(false)}
        version="2.0.0"
      />
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        onExecuteCommand={(id) => commandRegistry.execute(id)}
      />
      <TerminalConfigModal
        isOpen={isTerminalConfigOpen}
        onClose={() => setIsTerminalConfigOpen(false)}
      />

      {/* Notification Center Popover */}
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={notifications}
        onDismiss={(id) => notificationService.removeNotification(id)}
        onDismissAll={() => notificationService.dismissAll()}
        onMarkAllAsRead={() => notificationService.markAllAsRead()}
      />

      {/* Top Frameless Title Bar */}
      <WindowFrame
        activeFileName={activeTab?.name}
        workspaceName={workspaceName}
        onCommandPaletteToggle={() => openPalette('')}
        menuHandlers={menuHandlers}
        unreadNotificationsCount={unreadNotificationsCount}
        onNotificationToggle={handleToggleNotifications}
      />

      {/* Main Workspace Layout */}
      <div className="workspace-body">
        {/* Left Activity Bar */}
        <ActivityBar
          activeView={activeView}
          onSelectView={handleSelectView}
          gitChangesCount={gitChangesCount}
          isAiOpen={isAiPanelOpen}
          onToggleAi={handleToggleAi}
        />

        {/* Collapsible Frosted Sidebar with Spring Animation & Resizer */}
        <AnimatePresence initial={false}>
          {activeView && (
            <motion.div
              key="sidebar-motion"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: sidebarWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              style={{ overflow: 'hidden', height: '100%', flexShrink: 0 }}
            >
              <Sidebar
                activeView={activeView}
                currentThemeId={currentTheme.id}
                onSelectTheme={handleSelectTheme}
                onOpenFile={handleOpenFileItem}
                activeFilePath={activeTabId}
                workspaceName={workspaceName}
                workspacePath={workspacePath}
                workspaceFiles={workspaceFiles}
                onOpenFolderClick={handleOpenFolderNative}
                onNewFileClick={handleNewFile}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left Sidebar Resizer Divider Sash */}
        {activeView && (
          <div
            className="pane-resizer-sash sidebar-sash"
            onMouseDown={handleSidebarMouseDown}
            title="Drag to resize sidebar"
          />
        )}

        {/* Center Editor Stage */}
        <main className="editor-stage">
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={handleSelectTab}
            onCloseTab={handleCloseTab}
            onNewTab={handleNewFile}
          />
          {activeTab ? (
            <EditorHost
              ref={editorHostRef}
              content={currentContent}
              language={currentLanguage}
              theme={currentTheme}
              onChange={handleEditorChange}
              onCursorChange={(line, col) => setCursorPos({ line, col })}
              onSelectionChange={setCurrentSelection}
              onEditorReady={handleEditorReady}
            />
          ) : (
            <div className="empty-workspace">
              <p>No open tabs. Press <kbd>Ctrl+N</kbd> for a new file or <kbd>Ctrl+O</kbd> to open one.</p>
            </div>
          )}

          {/* Bottom Integrated Panel (Terminal / Problems / Output) */}
          <BottomPanel
            isOpen={isBottomPanelOpen}
            onClose={() => setIsBottomPanelOpen(false)}
            onOpenTerminalConfig={handleOpenTerminalConfig}
            workspacePath={workspacePath}
            defaultTab={bottomPanelTab}
          />
        </main>

        {/* Right AI Dock Resizer Divider Sash */}
        {isAiPanelOpen && (
          <div
            className="pane-resizer-sash ai-sash"
            onMouseDown={handleAiMouseDown}
            title="Drag to resize AI assistant"
          />
        )}

        {/* Right Multi-Model AI Assistant Dock */}
        <AnimatePresence initial={false}>
          {isAiPanelOpen && (
            <motion.div
              key="ai-dock-motion"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: aiPanelWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              style={{ overflow: 'hidden', height: '100%', display: 'flex', flexShrink: 0 }}
            >
              <AiChatPanel
                isOpen={isAiPanelOpen}
                onClose={() => setIsAiPanelOpen(false)}
                activeFileName={activeTab?.name || 'untitled.ts'}
                activeFileContent={currentContent}
                currentSelection={currentSelection}
                onInsertAtCursor={handleInsertAtCursor}
                onReplaceSelection={handleReplaceSelection}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar
        line={cursorPos.line}
        column={cursorPos.col}
        language={currentLanguage.toUpperCase()}
        themeName={currentTheme.name}
        gitBranch={gitBranch}
        onThemeClick={() => setActiveView('themes')}
        onGitClick={() => setActiveView((prev) => (prev === 'git' ? null : 'git'))}
        onTerminalClick={handleToggleTerminal}
        onProblemsClick={handleOpenProblems}
      />

      <style>{`
        .app-shell {
          width: 100vw;
          height: 100vh;
          max-height: 100vh;
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
          min-height: 0;
          display: flex;
          position: relative;
          overflow: hidden;
          z-index: 10;
        }

        .pane-resizer-sash {
          width: 5px;
          height: 100%;
          cursor: col-resize;
          position: relative;
          z-index: 25;
          margin: 0 -2.5px;
          flex-shrink: 0;
          background: transparent;
          transition: background-color 0.2s ease, box-shadow 0.2s ease;
        }

        .pane-resizer-sash:hover,
        .pane-resizer-sash:active {
          background: rgba(10, 132, 255, 0.45);
          box-shadow: 0 0 8px var(--accent-glow);
        }

        .editor-stage {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
          background: rgba(14, 18, 30, 0.25);
          backdrop-filter: var(--glass-blur-sm);
          overflow: hidden;
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

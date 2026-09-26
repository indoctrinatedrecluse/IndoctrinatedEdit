import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WindowFrame } from './components/WindowFrame/WindowFrame'
import { ActivityBar, ActivityView } from './components/ActivityBar/ActivityBar'
import { Sidebar, WorkspaceFileItem } from './components/Sidebar/Sidebar'
import { TabBar, TabItem } from './components/TabBar/TabBar'
import { EditorHostHandle, SelectionInfo } from './components/Editor/EditorHost'
import { EditorGrid, EditorGridHandle } from './components/Editor/EditorGrid'
import { StatusBar } from './components/StatusBar/StatusBar'
import { CommandPalette } from './components/CommandPalette/CommandPalette'
import { RightAuxiliaryPane, RightDockTab } from './components/RightDock/RightAuxiliaryPane'
import { AboutModal } from './components/Modals/AboutModal'
import { LicenseModal } from './components/Modals/LicenseModal'
import { ShortcutsModal } from './components/Modals/ShortcutsModal'
import { TerminalConfigModal } from './components/Modals/TerminalConfigModal'
import { RunConfigModal } from './components/Modals/RunConfigModal'
import { RunWithArgsModal } from './components/Modals/RunWithArgsModal'
import { UnsavedChangesModal } from './components/Modals/UnsavedChangesModal'
import { UpdateModal } from './components/Modals/UpdateModal'
import { McpStudioModal } from './components/McpStudio/McpStudioModal'
import { BottomPanel, BottomPanelTab } from './components/BottomPanel/BottomPanel'
import { DebugToolbar } from './components/Debug/DebugToolbar'
import { NotificationCenter } from './components/NotificationCenter/NotificationCenter'
import { notificationService, NotificationItem } from './services/notificationService'
import { rendererUpdateService } from './services/updateService'
import { commandRegistry } from './services/commandRegistry'
import { registeredThemes, getThemeById, applyGlassTheme } from './themes/themeRegistry'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { toolchainService } from './services/toolchainService'
import { sessionService } from './services/sessionService'
import { diagnosticsService } from './services/diagnosticsService'
import { databaseService } from './services/databaseService'
import { debugService } from './services/debugService'
import { runService, RunProfile } from './services/runService'
import { globalSearchService } from './services/globalSearchService'
import { formatterService } from './services/formatterService'
import { testExplorerService } from './services/testExplorerService'
import { lspService, LspRenameResult } from './services/lspService'
import { jupyterKernelService } from './services/jupyterKernelService'
import { licenseService } from './services/licenseService'

const demoFiles: WorkspaceFileItem[] = [
  { name: 'welcome.ts', path: 'welcome.ts', isDirectory: false, lang: 'TypeScript' },
  { name: 'DataScience_Pipeline.ipynb', path: 'DataScience_Pipeline.ipynb', isDirectory: false, lang: 'Jupyter' },
  { name: 'project-roadmap.textile', path: 'project-roadmap.textile', isDirectory: false, lang: 'Textile' },
  { name: 'defaultGlassTheme.ts', path: 'defaultGlassTheme.ts', isDirectory: false, lang: 'TypeScript' },
  { name: 'liquidObsidianTheme.ts', path: 'liquidObsidianTheme.ts', isDirectory: false, lang: 'TypeScript' },
  { name: 'README.md', path: 'README.md', isDirectory: false, lang: 'Markdown' },
]

const initialTabs: TabItem[] = [
  { id: 'welcome.ts', name: 'welcome.ts', language: 'typescript' },
  { id: 'DataScience_Pipeline.ipynb', name: 'DataScience_Pipeline.ipynb', language: 'ipynb' },
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
  'DataScience_Pipeline.ipynb': jupyterKernelService.serializeNotebook(
    jupyterKernelService.createSampleDataScienceNotebook()
  ),
}

import { extensionRegistry } from './extensions/extensionRegistry'
import { conflictResolutionService } from './services/conflictResolutionService'

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
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false)
  const [isMcpStudioOpen, setIsMcpStudioOpen] = useState<boolean>(false)
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false)
  const [latestUpdateVersion, setLatestUpdateVersion] = useState<string>('')

  // Dynamically synchronize workspace framework context with conflict resolution engine
  useEffect(() => {
    conflictResolutionService.setWorkspaceContext({
      workspacePath,
      files: workspaceFiles,
      packageJsonContent: fileContents['package.json'],
    })
  }, [workspacePath, workspaceFiles, fileContents])

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

  // Right Auxiliary Dock (AI Chat, Database Studio) Drag-to-Resize
  const [rightPaneWidth, setRightPaneWidth] = useState<number>(450)
  const [isRightPaneOpen, setIsRightPaneOpen] = useState<boolean>(false)
  const [rightPaneTab, setRightPaneTab] = useState<RightDockTab>('ai')
  const isResizingRightPane = useRef(false)

  const handleRightPaneMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isResizingRightPane.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRightPane.current) return
      const newWidth = Math.max(340, Math.min(800, window.innerWidth - moveEvent.clientX))
      setRightPaneWidth(newWidth)
    }

    const handleMouseUp = () => {
      isResizingRightPane.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Global event listener for MCP Studio modal launcher
  useEffect(() => {
    const handleOpenMcp = () => {
      setIsMcpStudioOpen(true)
    }
    window.addEventListener('open-mcp-studio', handleOpenMcp)
    return () => {
      window.removeEventListener('open-mcp-studio', handleOpenMcp)
    }
  }, [])

  // AI Multi-Model Chat Panel & Editor Integration State
  const editorHostRef = useRef<EditorHostHandle>(null)
  const editorGridRef = useRef<EditorGridHandle>(null)
  const getActiveEditor = useCallback((): EditorHostHandle | null => {
    return editorGridRef.current?.getActiveEditorHandle() || editorHostRef.current || null
  }, [])
  const [currentSelection, setCurrentSelection] = useState<SelectionInfo | null>(null)

  const handleToggleAntigravity = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('antigravity')
        return true
      }
      if (rightPaneTab !== 'antigravity') {
        setRightPaneTab('antigravity')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleToggleAi = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('ai')
        return true
      }
      if (rightPaneTab !== 'ai') {
        setRightPaneTab('ai')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleToggleDatabase = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('database')
        return true
      }
      if (rightPaneTab !== 'database') {
        setRightPaneTab('database')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleToggleRestClient = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('rest')
        return true
      }
      if (rightPaneTab !== 'rest') {
        setRightPaneTab('rest')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleToggleRemote = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('remote')
        return true
      }
      if (rightPaneTab !== 'remote') {
        setRightPaneTab('remote')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleToggleJupyter = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('jupyter')
        return true
      }
      if (rightPaneTab !== 'jupyter') {
        setRightPaneTab('jupyter')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleCreateNotebook = useCallback((title = 'Untitled.ipynb', templateType = 'blank') => {
    const nb =
      templateType === 'eda' || templateType === 'ml'
        ? jupyterKernelService.createSampleDataScienceNotebook()
        : jupyterKernelService.createEmptyNotebook()
    const content = jupyterKernelService.serializeNotebook(nb)
    const tabId = title
    setFileContents((prev) => ({ ...prev, [tabId]: content }))
    setTabs((prevTabs) => {
      if (prevTabs.some((t) => t.id === tabId)) return prevTabs
      return [...prevTabs, { id: tabId, name: title, language: 'ipynb' }]
    })
    setActiveTabId(tabId)
  }, [])

  const handleToggleCrypto = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('crypto')
        return true
      }
      if (rightPaneTab !== 'crypto') {
        setRightPaneTab('crypto')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleTogglePreview = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('preview')
        return true
      }
      if (rightPaneTab !== 'preview') {
        setRightPaneTab('preview')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleToggleDocker = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('docker')
        return true
      }
      if (rightPaneTab !== 'docker') {
        setRightPaneTab('docker')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleToggleSocket = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('socket')
        return true
      }
      if (rightPaneTab !== 'socket') {
        setRightPaneTab('socket')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleToggleRegex = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('regex')
        return true
      }
      if (rightPaneTab !== 'regex') {
        setRightPaneTab('regex')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleTogglePackages = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('packages')
        return true
      }
      if (rightPaneTab !== 'packages') {
        setRightPaneTab('packages')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleToggleTasks = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('tasks')
        return true
      }
      if (rightPaneTab !== 'tasks') {
        setRightPaneTab('tasks')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleToggleDiff = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('diff')
        return true
      }
      if (rightPaneTab !== 'diff') {
        setRightPaneTab('diff')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleToggleHex = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('hex')
        return true
      }
      if (rightPaneTab !== 'hex') {
        setRightPaneTab('hex')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleToggleSnippets = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('snippets')
        return true
      }
      if (rightPaneTab !== 'snippets') {
        setRightPaneTab('snippets')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleToggleColors = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('colors')
        return true
      }
      if (rightPaneTab !== 'colors') {
        setRightPaneTab('colors')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleTogglePorts = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('ports')
        return true
      }
      if (rightPaneTab !== 'ports') {
        setRightPaneTab('ports')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleToggleRedis = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('redis')
        return true
      }
      if (rightPaneTab !== 'redis') {
        setRightPaneTab('redis')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleToggleEnv = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('env')
        return true
      }
      if (rightPaneTab !== 'env') {
        setRightPaneTab('env')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleToggleMockLab = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('mocklab')
        return true
      }
      if (rightPaneTab !== 'mocklab') {
        setRightPaneTab('mocklab')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleToggleGraphQL = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('graphql')
        return true
      }
      if (rightPaneTab !== 'graphql') {
        setRightPaneTab('graphql')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleToggleDiagram = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('diagram')
        return true
      }
      if (rightPaneTab !== 'diagram') {
        setRightPaneTab('diagram')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleToggleBundle = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('bundle')
        return true
      }
      if (rightPaneTab !== 'bundle') {
        setRightPaneTab('bundle')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleToggleSvg = useCallback(() => {
    setIsRightPaneOpen((prev) => {
      if (!prev) {
        setRightPaneTab('svg')
        return true
      }
      if (rightPaneTab !== 'svg') {
        setRightPaneTab('svg')
        return true
      }
      return false
    })
  }, [rightPaneTab])

  const handleOpenMarkdownPreviewSide = useCallback(() => {
    setIsRightPaneOpen(true)
    setRightPaneTab('preview')
    setRightPaneWidth((prev) => Math.max(prev, 520))
  }, [])

  const handleInsertAtCursor = useCallback((code: string) => {
    getActiveEditor()?.insertAtCursor(code)
  }, [getActiveEditor])

  const handleReplaceSelection = useCallback((code: string) => {
    getActiveEditor()?.replaceSelection(code)
  }, [getActiveEditor])

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
    // Initialize Auto-Updater Subsystem & background schedule
    rendererUpdateService.init()
    const unsubscribeUpdater = rendererUpdateService.subscribe(() => {
      const status = rendererUpdateService.getStatus()
      const info = rendererUpdateService.getUpdateInfo()
      if (status === 'available' && info?.updateAvailable) {
        setIsUpdateAvailable(true)
        setLatestUpdateVersion(info.latestVersion)
      } else if (status === 'idle' || status === 'upToDate') {
        if (!info?.updateAvailable) {
          setIsUpdateAvailable(false)
        }
      }
    })

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
    return () => {
      clearTimeout(fallbackTimer)
      unsubscribeUpdater()
    }
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

  // Register active file contents with Global Search, Test Explorer, and LSP Intelligence engines
  useEffect(() => {
    globalSearchService.registerWorkspace(() => fileContents)
    testExplorerService.registerWorkspace(() => fileContents)
    lspService.registerWorkspace(() => fileContents)
  }, [fileContents])

  const handleApplyRename = useCallback((renameResult: LspRenameResult) => {
    setFileContents((prev) => {
      const updated = lspService.applyRename(renameResult, prev)
      return updated
    })
    setTabs((prevTabs) =>
      prevTabs.map((t) =>
        renameResult.changes.has(t.id) ? { ...t, isDirty: true } : t
      )
    )
    notificationService.notifyInfo(
      'Symbol Refactored',
      `Renamed "${renameResult.symbolName}" to "${renameResult.newName}" across ${renameResult.affectedFiles} file(s) (${renameResult.totalOccurrences} occurrences).`
    )
  }, [])

  const handleOpenFileWithPosition = useCallback((filePath: string, line: number, column = 1) => {
    if (!tabs.some((t) => t.id === filePath)) {
      const fileName = filePath.split(/[/\\]/).pop() || filePath
      const lang = getLanguageFromFilename(fileName)
      setTabs((prev) => [...prev, { id: filePath, name: fileName, language: lang }])
    }
    setActiveTabId(filePath)
    setTimeout(() => {
      getActiveEditor()?.goToLine(line, column)
    }, 50)
  }, [tabs, getActiveEditor])

  // Diagnostic & Linter Problem Tracking
  const [diagnosticCounts, setDiagnosticCounts] = useState<{ errors: number; warnings: number }>({ errors: 0, warnings: 0 })

  useEffect(() => {
    return diagnosticsService.subscribe(() => {
      const counts = diagnosticsService.getCounts()
      setDiagnosticCounts({ errors: counts.errors, warnings: counts.warnings })
    })
  }, [])

  // Analyze active buffer for errors & diagnostics
  useEffect(() => {
    const active = tabs.find((t) => t.id === activeTabId)
    if (active) {
      const content = fileContents[active.id] ?? ''
      diagnosticsService.analyzeCode(active.id, active.name, content, active.language)
    }
  }, [activeTabId, fileContents, tabs])

  const handleGoToProblemLocation = useCallback((filePath: string, line: number, col: number) => {
    if (tabs.some((t) => t.id === filePath)) {
      setActiveTabId(filePath)
    }
    setTimeout(() => {
      editorHostRef.current?.goToLine(line, col)
    }, 50)
  }, [tabs])

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

  // Jump and navigate to file and line from Global Search results
  const handleOpenFileAndNavigate = useCallback(
    async (filePath: string, lineNumber: number, column: number = 1) => {
      const fileName = filePath.split(/[/\\]/).pop() || filePath
      let targetTabId = filePath

      if (fileContents[filePath] !== undefined) {
        targetTabId = filePath
      } else if (fileContents[fileName] !== undefined) {
        targetTabId = fileName
      } else if (window.electronAPI?.readFile && filePath) {
        try {
          const content = await window.electronAPI.readFile(filePath)
          setFileContents((prev) => ({ ...prev, [filePath]: content }))
          targetTabId = filePath
        } catch (err) {
          console.error('Failed to read file for search navigation:', err)
        }
      }

      if (!tabs.some((t) => t.id === targetTabId)) {
        setTabs((prev) => [
          ...prev,
          { id: targetTabId, name: fileName, language: getLanguageFromFilename(fileName) },
        ])
      }
      setActiveTabId(targetTabId)

      // Reveal line and cursor position
      setTimeout(() => {
        getActiveEditor()?.goToLine(lineNumber, column)
      }, 60)
    },
    [fileContents, tabs, getActiveEditor]
  )

  // Synchronize workspace file contents with Global Search & Batch Replace service
  useEffect(() => {
    globalSearchService.registerWorkspace(
      () => fileContents,
      (filePath, newContent) => {
        setFileContents((prev) => ({ ...prev, [filePath]: newContent }))
        setTabs((prev) =>
          prev.map((t) => (t.id === filePath || t.name === filePath ? { ...t, isDirty: true } : t))
        )
      }
    )
    testExplorerService.registerWorkspace(() => fileContents)
  }, [fileContents])

  const [pendingNewFolder, setPendingNewFolder] = useState<{
    folderName: string
    folderPath: string
    files: WorkspaceFileItem[]
  } | null>(null)
  const [isUnsavedChangesModalOpen, setIsUnsavedChangesModalOpen] = useState<boolean>(false)

  const applyNewFolderAndClear = useCallback(
    (folderPayload: { folderName: string; folderPath: string; files: WorkspaceFileItem[] }) => {
      setWorkspaceName(folderPayload.folderName)
      setWorkspacePath(folderPayload.folderPath)
      setWorkspaceFiles(folderPayload.files)
      setTabs([])
      setActiveTabId('')
      setActiveView('files')
      setPendingNewFolder(null)
      setIsUnsavedChangesModalOpen(false)
      notificationService.notifyInfo(
        'Workspace Opened',
        `Opened workspace "${folderPayload.folderName}" with ${folderPayload.files.length} items.`
      )
    },
    []
  )

  const handleOpenFolderNative = async () => {
    if (!window.electronAPI?.openFolderDialog) return
    const res = await window.electronAPI.openFolderDialog()
    if (!res) return

    const mappedFiles: WorkspaceFileItem[] = res.files.map((f) => ({
      name: f.name,
      path: f.path,
      isDirectory: f.isDirectory,
      lang: f.isDirectory ? undefined : getLanguageFromFilename(f.name),
    }))

    const folderPayload = {
      folderName: res.folderName,
      folderPath: res.folderPath,
      files: mappedFiles,
    }

    // Check for unsaved / dirty tabs
    const dirty = tabs.filter((t) => t.isDirty)

    if (dirty.length > 0) {
      // Clear all non-dirty tabs immediately, leaving only the unsaved ones open
      setTabs(dirty)
      setActiveTabId(dirty[0].id)
      setPendingNewFolder(folderPayload)
      setIsUnsavedChangesModalOpen(true)
    } else {
      // No unsaved files: clear all previous tabs and open new folder
      applyNewFolderAndClear(folderPayload)
    }
  }

  const handleSaveAllDirtyAndProceed = useCallback(async () => {
    const dirty = tabs.filter((t) => t.isDirty)
    for (const tab of dirty) {
      const content = fileContents[tab.id] ?? ''
      if (tab.id.includes('/') || tab.id.includes('\\')) {
        if (window.electronAPI?.saveFile) {
          await window.electronAPI.saveFile(tab.id, content)
        }
      } else {
        if (window.electronAPI?.saveFileAs) {
          await window.electronAPI.saveFileAs(tab.name, content)
        }
      }
    }
    if (pendingNewFolder) {
      applyNewFolderAndClear(pendingNewFolder)
    }
  }, [tabs, fileContents, pendingNewFolder, applyNewFolderAndClear])

  const handleDiscardDirtyAndProceed = useCallback(() => {
    if (pendingNewFolder) {
      applyNewFolderAndClear(pendingNewFolder)
    }
  }, [pendingNewFolder, applyNewFolderAndClear])

  const handleSaveFile = async () => {
    const activeTab = tabs.find((t) => t.id === activeTabId)
    if (!activeTab) return

    let content = fileContents[activeTabId] ?? ''

    // Auto-format on save if configured
    if (formatterService.getOptions().formatOnSave) {
      try {
        const formatRes = await formatterService.formatDocument(content, activeTab.language)
        if (formatRes.hasChanges) {
          content = formatRes.formatted
          setFileContents((prev) => ({ ...prev, [activeTabId]: content }))
        }
      } catch (err) {
        console.warn('Format on save skipped due to error:', err)
      }
    }

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
  const [isLicenseLockout, setIsLicenseLockout] = useState<boolean>(false)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false)
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState<boolean>(false)
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState<boolean>(false)
  const [bottomPanelTab, setBottomPanelTab] = useState<BottomPanelTab>('terminal')
  const [isTerminalConfigOpen, setIsTerminalConfigOpen] = useState<boolean>(false)
  const [isRunConfigOpen, setIsRunConfigOpen] = useState<boolean>(false)
  const [isRunWithArgsOpen, setIsRunWithArgsOpen] = useState<boolean>(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => notificationService.getNotifications())

  // Enforce license validation & lockout on mount and on license state changes
  useEffect(() => {
    const evaluateLockout = (info: any) => {
      const isExpired = Boolean(
        info && info.type !== 'ADM' && (
          info.status === 'expired' ||
          !info.isValid ||
          (info.isTrial && (info.trialDaysRemaining ?? 0) <= 0)
        )
      )
      setIsLicenseLockout(isExpired)
      if (isExpired) {
        setIsLicenseOpen(true)
      }
    }

    licenseService.getInfo().then(evaluateLockout)
    return licenseService.subscribe(evaluateLockout)
  }, [])

  const handleRunActiveFile = useCallback(
    async (customArgs?: string, _customEnv?: Record<string, string>) => {
      const active = tabs.find((t) => t.id === activeTabId)
      if (!active) {
        notificationService.notifyWarning('Run Warning', 'No active file open to execute.')
        return
      }

      setIsBottomPanelOpen(true)
      setBottomPanelTab('terminal')

      const success = await runService.runActiveFile(
        active.id,
        active.language,
        customArgs,
        workspacePath,
        {
          onOpenTerminal: () => {
            setIsBottomPanelOpen(true)
            setBottomPanelTab('terminal')
          },
        }
      )

      if (success) {
        notificationService.notifyInfo('Run Started', `Executing ${active.name} in Terminal`)
      }
    },
    [tabs, activeTabId, workspacePath]
  )

  const handleRunWithArgs = useCallback(() => {
    setIsRunWithArgsOpen(true)
  }, [])

  const handleOpenRunConfig = useCallback(() => {
    setIsRunConfigOpen(true)
  }, [])

  const handleExecuteProfileWithArgs = useCallback(
    async (profile: RunProfile, customArgs: string, customEnv?: Record<string, string>) => {
      const active = tabs.find((t) => t.id === activeTabId)
      setIsBottomPanelOpen(true)
      setBottomPanelTab('terminal')

      await runService.execute(
        profile,
        {
          filePath: active?.id,
          workspacePath,
          customArgs,
          customEnv,
        },
        {
          onOpenTerminal: () => {
            setIsBottomPanelOpen(true)
            setBottomPanelTab('terminal')
          },
        }
      )
    },
    [tabs, activeTabId, workspacePath]
  )

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
      onToggleDatabase: handleToggleDatabase,
      onToggleRestClient: handleToggleRestClient,
      onTogglePorts: handleTogglePorts,
      onToggleRedis: handleToggleRedis,
      onToggleEnv: handleToggleEnv,
      onToggleMockLab: handleToggleMockLab,
      onToggleGraphQL: handleToggleGraphQL,
      onToggleDiagram: handleToggleDiagram,
      onToggleBundle: handleToggleBundle,
      onToggleSvg: handleToggleSvg,
      onToggleJupyter: handleToggleJupyter,
      onCreateNotebook: handleCreateNotebook,
      onToggleSidebar: handleToggleSidebar,
      onOpenSettings: () => setActiveView('settings'),
      onToggleNotifications: handleToggleNotifications,
      onOpenShortcuts: () => setIsShortcutsOpen(true),
      onToggleTerminal: handleToggleTerminal,
      onOpenTerminalConfig: handleOpenTerminalConfig,
      onOpenProblems: handleOpenProblems,
      // Run & Execution Handlers
      onRunActiveFile: () => handleRunActiveFile(),
      onRunWithArgs: handleRunWithArgs,
      onConfigureRun: handleOpenRunConfig,
      // Debug Handlers
      onShowDebug: () => setActiveView('debug'),
      onStartDebugging: () => {
        const active = tabs.find((t) => t.id === activeTabId)
        debugService.startDebugging(active?.id || 'main.ts')
      },
      onStopDebugging: () => debugService.stopDebugging(),
      onRestartDebugging: () => debugService.restart(),
      onStepOver: () => debugService.stepOver(),
      onStepInto: () => debugService.stepInto(),
      onStepOut: () => debugService.stepOut(),
      onToggleBreakpoint: () => {
        const active = tabs.find((t) => t.id === activeTabId)
        if (active) {
          debugService.toggleBreakpoint(active.id, cursorPos.line)
        }
      },
      onClearAllBreakpoints: () => debugService.clearAllBreakpoints(),
      onGoToDefinition: () => getActiveEditor()?.findDefinition(),
      onFindReferences: () => getActiveEditor()?.findReferences(),
      onRenameSymbol: () => getActiveEditor()?.openRename(),
      onWelcomeGuide: () => {
        const welcomeTab = tabs.find((t) => t.id === 'welcome.ts')
        if (welcomeTab) {
          setActiveTabId(welcomeTab.id)
        } else {
          handleNewFile()
        }
      },
      onCheckForUpdates: () => {
        setIsUpdateModalOpen(true)
        rendererUpdateService.checkForUpdates(true)
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
      cursorPos.line,
      openPalette,
      handleToggleAi,
      handleToggleDatabase,
      handleToggleRestClient,
      handleToggleSidebar,
      handleToggleNotifications,
      handleToggleTerminal,
      handleOpenTerminalConfig,
      handleOpenProblems,
      handleToggleJupyter,
      handleCreateNotebook,
      tabs,
      getActiveEditor,
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

      // LSP Code Intelligence & Refactoring
      { id: 'editor.goToDefinition', title: 'Go to Definition', category: 'Editor', shortcut: 'F12', description: 'Jump to symbol declaration', handler: () => getActiveEditor()?.findDefinition() },
      { id: 'editor.findReferences', title: 'Find All References', category: 'Editor', shortcut: 'Shift+F12', description: 'Find all symbol occurrences across workspace', handler: () => getActiveEditor()?.findReferences() },
      { id: 'editor.renameSymbol', title: 'Rename Symbol', category: 'Editor', shortcut: 'F2', description: 'Refactor identifier across all workspace files', handler: () => getActiveEditor()?.openRename() },
      { id: 'git.resolveConflicts', title: 'Git: Open 3-Way Merge Conflict Studio', category: 'Git', description: 'Resolve merge conflicts with visual comparison and one-click actions', handler: () => getActiveEditor()?.openMergeStudio() },
      { id: 'ai.inlineCopilot', title: 'AI: Inline Code Copilot', category: 'AI', shortcut: 'Ctrl+K', description: 'Generate, refactor, and transform selected code with inline AI prompt', handler: () => getActiveEditor()?.openCopilot() },

      // Editing & Multi-Cursor Actions
      { id: 'edit.format', title: 'Format Document', category: 'Editor', shortcut: 'Shift+Alt+F', description: 'Auto-format active code buffer', handler: () => getActiveEditor()?.formatDocument() },
      { id: 'edit.find', title: 'Find in Active Buffer', category: 'Editor', shortcut: 'Ctrl+F', description: 'Open in-editor Find overlay', handler: () => getActiveEditor()?.openFind() },
      { id: 'edit.replace', title: 'Replace in Active Buffer', category: 'Editor', shortcut: 'Ctrl+H', description: 'Open in-editor Find & Replace overlay', handler: () => getActiveEditor()?.openReplace() },
      { id: 'edit.findAll', title: 'Find All (Select All Occurrences)', category: 'Editor', shortcut: 'Alt+Enter', description: 'Spawn multi-cursors on all search matches', handler: () => getActiveEditor()?.selectAllOccurrences() },
      { id: 'edit.replaceAll', title: 'Replace All Matches in Buffer', category: 'Editor', shortcut: 'Ctrl+Alt+Enter', description: 'Batch replace all search occurrences', handler: () => getActiveEditor()?.openReplace() },
      { id: 'edit.nextMatch', title: 'Add Next Occurrence to Multi-Cursor', category: 'Editor', shortcut: 'Ctrl+D', description: 'Select next matching word occurrence', handler: () => getActiveEditor()?.addSelectionToNextFindMatch() },
      { id: 'edit.selectAllMatches', title: 'Select All Occurrences (Multi-Cursor)', category: 'Editor', shortcut: 'Ctrl+Shift+L', description: 'Multi-cursor selection across all matches', handler: () => getActiveEditor()?.selectAllOccurrences() },
      { id: 'edit.cursorAbove', title: 'Insert Cursor Above', category: 'Editor', shortcut: 'Ctrl+Alt+Up', description: 'Add editing cursor on previous line', handler: () => getActiveEditor()?.insertCursorAbove() },
      { id: 'edit.cursorBelow', title: 'Insert Cursor Below', category: 'Editor', shortcut: 'Ctrl+Alt+Down', description: 'Add editing cursor on next line', handler: () => getActiveEditor()?.insertCursorBelow() },
      { id: 'edit.commentLine', title: 'Toggle Line Comment', category: 'Editor', shortcut: 'Ctrl+/', description: 'Add/remove line comments on active selection', handler: () => getActiveEditor()?.triggerAction('editor.action.commentLine') },
      { id: 'edit.duplicateLine', title: 'Duplicate Line Down', category: 'Editor', shortcut: 'Shift+Alt+Down', description: 'Duplicate cursor line downwards', handler: () => getActiveEditor()?.triggerAction('editor.action.copyLinesDownAction') },
      { id: 'edit.deleteLine', title: 'Delete Line', category: 'Editor', shortcut: 'Ctrl+Shift+K', description: 'Delete current line immediately', handler: () => getActiveEditor()?.triggerAction('editor.action.deleteLines') },
      { id: 'edit.uppercase', title: 'Transform: Convert to UPPERCASE', category: 'Editor', description: 'Capitalize selected text or entire buffer', handler: () => getActiveEditor()?.transformSelection('uppercase') },
      { id: 'edit.lowercase', title: 'Transform: Convert to lowercase', category: 'Editor', description: 'Lower-case selected text or entire buffer', handler: () => getActiveEditor()?.transformSelection('lowercase') },
      { id: 'edit.titlecase', title: 'Transform: Convert to Title Case', category: 'Editor', description: 'Capitalize each word in selection', handler: () => getActiveEditor()?.transformSelection('titlecase') },
      { id: 'edit.trim', title: 'Transform: Trim Trailing Whitespace', category: 'Editor', description: 'Clean up trailing spaces on all lines', handler: () => getActiveEditor()?.transformSelection('trim') },
      { id: 'edit.sort', title: 'Transform: Sort Lines Alphabetically', category: 'Editor', description: 'Sort lines in alphabetical order', handler: () => getActiveEditor()?.transformSelection('sort') },

      // Split Editor Panes & Layouts
      { id: 'view.splitVertical', title: 'View: Split Editor Right (Side-by-Side)', category: 'View', shortcut: 'Ctrl+\\', description: 'Split current editor into dual vertical columns', handler: () => editorGridRef.current?.splitVertical() },
      { id: 'view.splitHorizontal', title: 'View: Split Editor Down (Top-to-Bottom)', category: 'View', shortcut: 'Ctrl+K Ctrl+\\', description: 'Split current editor into dual horizontal rows', handler: () => editorGridRef.current?.splitHorizontal() },
      { id: 'view.splitGrid2x2', title: 'View: Split Editor into 2x2 Grid', category: 'View', description: 'Split active editor into 4 quadrant panes', handler: () => editorGridRef.current?.splitGrid2x2() },
      { id: 'view.singleEditor', title: 'View: Single Editor Pane', category: 'View', description: 'Collapse split panes to standard single view', handler: () => editorGridRef.current?.setSingleLayout() },
      { id: 'view.focusPane1', title: 'View: Focus First Editor Group', category: 'View', shortcut: 'Ctrl+1', description: 'Switch active keyboard focus to Pane 1', handler: () => editorGridRef.current?.focusPane('pane-1') },
      { id: 'view.focusPane2', title: 'View: Focus Second Editor Group', category: 'View', shortcut: 'Ctrl+2', description: 'Switch active keyboard focus to Pane 2', handler: () => editorGridRef.current?.focusPane('pane-2') },
      { id: 'view.focusPane3', title: 'View: Focus Third Editor Group', category: 'View', shortcut: 'Ctrl+3', description: 'Switch active keyboard focus to Pane 3', handler: () => editorGridRef.current?.focusPane('pane-3') },
      { id: 'view.focusPane4', title: 'View: Focus Fourth Editor Group', category: 'View', shortcut: 'Ctrl+4', description: 'Switch active keyboard focus to Pane 4', handler: () => editorGridRef.current?.focusPane('pane-4') },

      // View & Layout
      { id: 'view.toggleSidebar', title: 'Toggle Primary Sidebar', category: 'View', shortcut: 'Ctrl+B', description: 'Show/hide primary activity sidebar', handler: handleToggleSidebar },
      { id: 'view.explorer', title: 'Show Explorer', category: 'View', shortcut: 'Ctrl+Shift+E', description: 'Reveal workspace directory navigator', handler: () => setActiveView('files') },
      { id: 'view.git', title: 'Show Source Control & Git Graph', category: 'View', shortcut: 'Ctrl+Shift+G', description: 'Open Git visual commit tree', handler: () => setActiveView('git') },
      { id: 'view.search', title: 'Search in Workspace', category: 'View', shortcut: 'Ctrl+Shift+F', description: 'Global workspace pattern search', handler: () => setActiveView('search') },
      { id: 'view.testing', title: 'Show Testing & Test Explorer', category: 'View', shortcut: 'Ctrl+Shift+T', description: 'Open test suite explorer and test runner', handler: () => setActiveView('testing') },
      { id: 'test.runAll', title: 'Testing: Run All Tests in Workspace', category: 'Run', description: 'Execute full test suite', handler: () => { setActiveView('testing'); testExplorerService.runAllTests(); } },
      { id: 'test.runFailed', title: 'Testing: Rerun Failed Tests', category: 'Run', description: 'Rerun only previously failing test cases', handler: () => { setActiveView('testing'); testExplorerService.runFailedTests(); } },
      { id: 'view.debug', title: 'Show Run & Debug Panel', category: 'View', shortcut: 'Ctrl+Shift+D', description: 'Open debug inspection dock', handler: () => setActiveView('debug') },
      { id: 'view.notifications', title: 'Show Notifications & System Alerts', category: 'View', shortcut: 'Ctrl+Shift+N', description: 'Open notification drawer', handler: handleToggleNotifications },
      { id: 'view.wordWrap', title: 'Toggle Word Wrap', category: 'View', shortcut: 'Alt+Z', description: 'Wrap code lines to editor viewport', handler: () => getActiveEditor()?.triggerAction('editor.action.toggleWordWrap') },
      { id: 'view.foldAll', title: 'Fold All Code Blocks', category: 'View', description: 'Collapse all functions and classes', handler: () => getActiveEditor()?.triggerAction('editor.foldAll') },
      { id: 'view.unfoldAll', title: 'Unfold All Code Blocks', category: 'View', description: 'Expand all functions and classes', handler: () => getActiveEditor()?.triggerAction('editor.unfoldAll') },
      { id: 'view.themes', title: 'Open Liquid Glass Themes Drawer', category: 'View', description: 'Browse and switch themes', handler: () => setActiveView('themes') },
      { id: 'view.settings', title: 'Open Preferences / Settings', category: 'Preferences', shortcut: 'Ctrl+,', description: 'Configure editor options', handler: () => setActiveView('settings') },

      // Terminal & Diagnostics Subsystems
      { id: 'terminal.toggle', title: 'Terminal: Toggle Integrated Terminal', category: 'Terminal', shortcut: 'Ctrl+`', description: 'Open/close multi-shell terminal emulator', handler: handleToggleTerminal },
      { id: 'terminal.config', title: 'Preferences: Open Terminal Configuration (JSON)', category: 'Preferences', description: 'Edit shell profiles, fonts, and defaults in terminal.json', handler: handleOpenTerminalConfig },
      { id: 'view.problems', title: 'View: Toggle Problems Panel', category: 'View', shortcut: 'Ctrl+Shift+M', description: 'Open diagnostic error and warning inspector', handler: handleOpenProblems },

      // Run & Execution Subsystem
      { id: 'run.activeFile', title: 'Run: Run Active File in Terminal', category: 'Run', shortcut: 'Ctrl+F5', description: 'Execute active buffer with default runner', handler: () => handleRunActiveFile() },
      { id: 'run.withArgs', title: 'Run: Run with Custom Arguments...', category: 'Run', shortcut: 'Ctrl+Shift+F5', description: 'Prompt for CLI arguments and environment flags', handler: handleRunWithArgs },
      { id: 'run.configure', title: 'Run: Configure Run Profiles & Compilers...', category: 'Run', shortcut: 'Ctrl+Alt+R', description: 'Open Run Configuration Studio', handler: handleOpenRunConfig },

      // Debug Subsystem
      { id: 'debug.start', title: 'Debug: Start / Continue Debugging', category: 'Run', shortcut: 'F5', description: 'Launch compiler debugger or continue execution', handler: () => { const active = tabs.find((t) => t.id === activeTabId); debugService.startDebugging(active?.id || 'main.ts') } },
      { id: 'debug.pause', title: 'Debug: Pause Execution', category: 'Run', shortcut: 'F6', description: 'Pause running target process', handler: () => debugService.pause() },
      { id: 'debug.stop', title: 'Debug: Stop Debugging', category: 'Run', shortcut: 'Shift+F5', description: 'Terminate active debug session', handler: () => debugService.stopDebugging() },
      { id: 'debug.restart', title: 'Debug: Restart Debugging', category: 'Run', shortcut: 'Ctrl+Shift+F5', description: 'Restart target debug session', handler: () => debugService.restart() },
      { id: 'debug.stepOver', title: 'Debug: Step Over', category: 'Run', shortcut: 'F10', description: 'Step over next instruction', handler: () => debugService.stepOver() },
      { id: 'debug.stepInto', title: 'Debug: Step Into', category: 'Run', shortcut: 'F11', description: 'Step into function call', handler: () => debugService.stepInto() },
      { id: 'debug.stepOut', title: 'Debug: Step Out', category: 'Run', shortcut: 'Shift+F11', description: 'Step out to calling frame', handler: () => debugService.stepOut() },
      { id: 'debug.toggleBreakpoint', title: 'Debug: Toggle Breakpoint', category: 'Run', shortcut: 'F9', description: 'Toggle breakpoint on active line', handler: () => { const active = tabs.find((t) => t.id === activeTabId); if (active) debugService.toggleBreakpoint(active.id, cursorPos.line) } },
      { id: 'debug.deleteAllBreakpoints', title: 'Debug: Delete All Breakpoints', category: 'Run', description: 'Clear all active breakpoints in workspace', handler: () => debugService.clearAllBreakpoints() },

      // All 10 Dynamic Themes
      ...themeCommands,

      // Git & Toolchain
      { id: 'git.refresh', title: 'Git: Refresh Repository Status', category: 'Git', description: 'Re-query git status for all files', handler: refreshGitStatus },

      // Google Antigravity Studio & Personal Account
      { id: 'antigravity.toggle', title: 'Google Antigravity: Toggle Studio & Personal Account', category: 'AI', shortcut: 'Ctrl+Alt+G', description: 'Open Google Antigravity Studio, manage personal account login, Python SDK sidecar & quota metrics', handler: handleToggleAntigravity },
      { id: 'antigravity.login', title: 'Google Antigravity: Sign in with Google Account', category: 'AI', description: 'Authenticate your personal Google account with Antigravity SDK', handler: () => { handleToggleAntigravity(); window.electronAPI?.antigravity?.login(); } },
      
      // Port & Process Sentinel
      { id: 'ports.toggle', title: 'Port Sentinel: Toggle Port & Process Sentinel', category: 'Tools', shortcut: 'Ctrl+Alt+1', description: 'Inspect active listening ports, detect conflicts, probe latency, and kill processes', handler: handleTogglePorts },

      // Redis & Key-Value Cache Studio
      { id: 'redis.toggle', title: 'Redis Studio: Toggle Redis & Key-Value Cache Studio', category: 'Tools', shortcut: 'Ctrl+Alt+2', description: 'In-memory Redis client with multi-type value editor, TTL manager, REPL CLI, and Pub/Sub', handler: handleToggleRedis },

      // Env & Secret Vault Studio
      { id: 'env.toggle', title: 'Env Vault: Toggle Env & Secret Vault Studio', category: 'Tools', shortcut: 'Ctrl+Alt+3', description: 'Multi-environment profile manager, secret masking, .env.example sync check, and code export', handler: handleToggleEnv },

      // MockLab API Mock Server
      { id: 'mocklab.toggle', title: 'MockLab: Toggle MockLab API Mock Server', category: 'Tools', shortcut: 'Ctrl+Alt+4', description: 'Zero-config local HTTP mock server, endpoint route builder, delay simulation, and traffic logs', handler: handleToggleMockLab },

      // GraphQL & gRPC Studio
      { id: 'graphql.toggle', title: 'GraphQL Studio: Toggle GraphQL & gRPC Studio', category: 'Tools', shortcut: 'Ctrl+Alt+5', description: 'Interactive GraphQL schema explorer, query/mutation runner, variables editor, and code export', handler: handleToggleGraphQL },

      // Architecture & Diagram Studio
      { id: 'diagram.toggle', title: 'Diagram Studio: Toggle Architecture & Diagram Studio', category: 'Tools', shortcut: 'Ctrl+Alt+6', description: 'Interactive Mermaid.js flowchart and architecture visualizer with auto-diagram code generation', handler: handleToggleDiagram },

      // Bundle & Dependency Analyzer
      { id: 'bundle.toggle', title: 'Bundle Analyzer: Toggle Bundle & Dependency Analyzer', category: 'Tools', shortcut: 'Ctrl+Alt+7', description: 'Visual TreeMap chunk breakdown, import cost estimator, and duplicate package detector', handler: handleToggleBundle },

      // SVG & Asset Studio
      { id: 'svg.toggle', title: 'SVG Studio: Toggle SVG & Asset Studio', category: 'Tools', shortcut: 'Ctrl+Alt+8', description: 'Live SVG canvas preview, SVGO path minifier, palette recolor, and React TSX component exporter', handler: handleToggleSvg },

      // Cryptography & DevTools Lab
      { id: 'crypto.toggle', title: 'Crypto Lab: Toggle Cryptography & DevTools Lab', category: 'Tools', shortcut: 'Ctrl+Alt+C', description: 'JWT Inspector, Hashes, HMAC, Encoders, UUID/ULID, and Epoch converter', handler: handleToggleCrypto },

      // Live Markdown & HTML Preview
      { id: 'preview.toggle', title: 'Live Preview: Toggle Markdown, HTML & Mermaid Studio', category: 'View', shortcut: 'Ctrl+Alt+V', description: 'Split-canvas live preview with interactive Mermaid.js diagrams', handler: handleTogglePreview },

      // Docker & Container Studio
      { id: 'docker.toggle', title: 'Docker: Toggle Docker & Container Studio', category: 'Tools', shortcut: 'Ctrl+Alt+K', description: 'Container dashboard, ANSI log streaming, images, and compose topology', handler: handleToggleDocker },

      // WebSocket & Streams Workbench
      { id: 'socket.toggle', title: 'WebSocket: Toggle WebSocket & Event Streams Workbench', category: 'Tools', shortcut: 'Ctrl+Alt+W', description: 'Bidirectional socket message feed, packet composer, and telemetry', handler: handleToggleSocket },

      // Visual Regex & Pattern Lab
      { id: 'regex.toggle', title: 'Regex Lab: Toggle Visual Regex & Pattern Lab', category: 'Tools', shortcut: 'Ctrl+Alt+X', description: 'Real-time multi-line match arena, capture groups, and code generator', handler: handleToggleRegex },

      // Package & Dependency Manager
      { id: 'packages.toggle', title: 'Packages: Toggle Package & Dependency Manager', category: 'Tools', shortcut: 'Ctrl+Alt+P', description: 'Scan dependencies, detect outdated versions, and audit CVE security advisories', handler: handleTogglePackages },

      // Visual Diff & 3-Way Merge Studio
      { id: 'diff.toggle', title: 'Diff Studio: Toggle Visual Diff & 3-Way Merge Studio', category: 'Tools', shortcut: 'Ctrl+Alt+M', description: 'Side-by-side diff, inline char highlighting, and git conflict resolution', handler: handleToggleDiff },

      // Hex & Binary Inspector
      { id: 'hex.toggle', title: 'Hex Inspector: Toggle Hex & Binary Inspector', category: 'Tools', shortcut: 'Ctrl+Alt+H', description: 'Interactive hex matrix, endianness decode, and data type inspection', handler: handleToggleHex },

      // Snippet Vault & Scratchpad
      { id: 'snippets.toggle', title: 'Snippets: Toggle Snippet Vault & Scratchpad', category: 'Tools', shortcut: 'Ctrl+Alt+S', description: 'Categorized snippet library, custom templates, and auto-saved scratchpad', handler: handleToggleSnippets },

      // Color Palette & Glass Studio
      { id: 'colors.toggle', title: 'Colors: Toggle Color Palette & Liquid Glass Studio', category: 'Tools', shortcut: 'Ctrl+Alt+O', description: 'HEX/RGB/HSL/OKLCH conversions, glass tokens, and color harmonies', handler: handleToggleColors },

      // Task Runner & Cron Studio
      { id: 'tasks.toggle', title: 'Tasks: Toggle Task Runner & Cron Expression Studio', category: 'Tools', shortcut: 'Ctrl+Alt+T', description: 'Discover scripts, execute project tasks, and calculate Cron schedules', handler: handleToggleTasks },

      // Jupyter Notebooks & Live Studio
      { id: 'jupyter.toggle', title: 'Jupyter: Toggle Jupyter Notebooks & Live Kernel Studio', category: 'Tools', shortcut: 'Ctrl+Alt+J', description: 'Interactive multi-kernel notebook studio, live execution, and variable explorer', handler: handleToggleJupyter },
      { id: 'jupyter.newNotebook', title: 'Jupyter: Create New Blank Notebook', category: 'File', description: 'Create an Untitled.ipynb interactive notebook', handler: () => handleCreateNotebook('Untitled.ipynb', 'blank') },
      { id: 'jupyter.newEdaNotebook', title: 'Jupyter: Create Exploratory Data Analysis (EDA) Pipeline Notebook', category: 'File', description: 'Create pre-populated Data Science EDA notebook with DataFrame charts and statistical summary', handler: () => handleCreateNotebook('EDA_Pipeline.ipynb', 'eda') },

      // Database Studio & SQL Runner
      { id: 'db.toggle', title: 'Database: Toggle Database Studio & SQL Runner', category: 'Tools', shortcut: 'Ctrl+Shift+D', description: 'Open database schema explorer and query runner', handler: handleToggleDatabase },
      { id: 'db.sampleEcommerce', title: 'Database: Switch to E-Commerce SQLite DB', category: 'Tools', description: 'Explore orders, customers, and product inventory schema', handler: () => { handleToggleDatabase(); databaseService.setActiveDatabase('ecommerce_db') } },
      { id: 'db.sampleTelemetry', title: 'Database: Switch to Cloud Telemetry Postgres DB', category: 'Tools', description: 'Explore clusters, nodes, and microservices schema', handler: () => { handleToggleDatabase(); databaseService.setActiveDatabase('telemetry_db') } },

      // REST & GraphQL API Client
      { id: 'rest.toggle', title: 'REST Client: Toggle REST & GraphQL Client', category: 'Tools', shortcut: 'Ctrl+Alt+R', description: 'Open REST and GraphQL API runner dock', handler: handleToggleRestClient },

      // Remote Protocol Studio (SSH, SFTP, FTP & SMTP)
      { id: 'remote.toggle', title: 'Remote Protocol Studio: Toggle SSH, SFTP, FTP & SMTP Suite', category: 'Tools', shortcut: 'Ctrl+Alt+S', description: 'Open MobaXTerm-style remote protocol studio with SSH terminal, SFTP explorer & SMTP mail lab', handler: handleToggleRemote },

      // AI Multi-Model Assistant
      { id: 'ai.toggle', title: 'Toggle AI Multi-Model Assistant', category: 'AI', shortcut: 'Ctrl+Alt+A', description: 'Open AI chat and refactor dock', handler: handleToggleAi },
      { id: 'ai.explain', title: 'AI: Explain Code / Active Selection', category: 'AI', shortcut: 'Ctrl+Shift+I', description: 'Ask AI to analyze selected code', handler: handleToggleAi },
      { id: 'ai.bugs', title: 'AI: Find Bugs & Security Flaws', category: 'AI', description: 'Scan active buffer for vulnerabilities', handler: handleToggleAi },
      { id: 'ai.refactor', title: 'AI: Refactor & Modernize Code', category: 'AI', description: 'Clean architecture refactoring', handler: handleToggleAi },
      { id: 'ai.tests', title: 'AI: Generate Unit Tests', category: 'AI', description: 'Generate comprehensive test cases', handler: handleToggleAi },

      // Model Context Protocol (MCP) Studio
      { id: 'mcp.studio', title: 'MCP Studio: Manage Model Context Protocol Servers & Tools', category: 'AI', shortcut: 'Ctrl+Shift+M', description: 'Open MCP Server and Tooling Studio to configure stdio & SSE servers', handler: () => setIsMcpStudioOpen(true) },

      // Help & Shortcuts
      { id: 'help.shortcuts', title: 'Help: Keyboard Shortcuts Reference', category: 'Help', shortcut: 'Ctrl+K Ctrl+S', description: 'Show all keyboard shortcuts', handler: () => setIsShortcutsOpen(true) },
      { id: 'help.checkForUpdates', title: 'Check for Software Updates...', category: 'Help', description: 'Check for latest IndoctrinatedEdit releases and packages', handler: () => { setIsUpdateModalOpen(true); rendererUpdateService.checkForUpdates(true); } },
      { id: 'help.license', title: 'License & Subscription: View Pro Lifetime Status', category: 'Help', description: 'Inspect license and subscription', handler: () => setIsLicenseOpen(true) },
      { id: 'help.about', title: 'Help: About IndoctrinatedEdit', category: 'Help', description: 'Application info and version', handler: () => setIsAboutOpen(true) },
    ])
  }, [activeTabId, cursorPos.line, handleNewFile, handleOpenFileNative, handleOpenFolderNative, handleSaveFile, handleSaveFileAs, handleToggleSidebar, handleToggleNotifications, handleToggleTerminal, handleOpenTerminalConfig, handleOpenProblems, refreshGitStatus, handleToggleAi, handleToggleDatabase, handleToggleRestClient, handleToggleRemote, handleToggleCrypto, handleTogglePreview, handleToggleDocker, handleToggleSocket, handleToggleRegex, handleTogglePackages, handleToggleTasks, handleToggleDiff, handleToggleHex, handleToggleSnippets, handleToggleColors, handleTogglePorts, handleToggleRedis, handleToggleEnv, handleToggleMockLab, handleToggleGraphQL, handleToggleDiagram, handleToggleBundle, handleToggleSvg, handleToggleJupyter, handleCreateNotebook, handleSelectTheme, openPalette, tabs, setIsMcpStudioOpen])

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
    onShowDebug: () => setActiveView((prev) => (prev === 'debug' ? null : 'debug')),
    onToggleAi: handleToggleAi,
    onToggleDatabase: handleToggleDatabase,
    onToggleRestClient: handleToggleRestClient,
    onToggleRemote: handleToggleRemote,
    onToggleCrypto: handleToggleCrypto,
    onTogglePreview: handleTogglePreview,
    onToggleDocker: handleToggleDocker,
    onToggleSocket: handleToggleSocket,
    onToggleRegex: handleToggleRegex,
    onTogglePackages: handleTogglePackages,
    onToggleTasks: handleToggleTasks,
    onTogglePorts: handleTogglePorts,
    onToggleRedis: handleToggleRedis,
    onToggleEnv: handleToggleEnv,
    onToggleMockLab: handleToggleMockLab,
    onToggleGraphQL: handleToggleGraphQL,
    onToggleDiagram: handleToggleDiagram,
    onToggleBundle: handleToggleBundle,
    onToggleSvg: handleToggleSvg,
    onToggleJupyter: handleToggleJupyter,
    onToggleNotifications: handleToggleNotifications,
    onOpenShortcuts: () => setIsShortcutsOpen(true),
    onGoToLine: () => openPalette(':'),
    onSymbols: () => openPalette('@'),
    onToggleTerminal: handleToggleTerminal,
    onOpenProblems: handleOpenProblems,
    onRunActiveFile: () => handleRunActiveFile(),
    onRunWithArgs: handleRunWithArgs,
    onConfigureRun: handleOpenRunConfig,
    onStartDebugging: () => {
      const active = tabs.find((t) => t.id === activeTabId)
      debugService.startDebugging(active?.id || 'main.ts')
    },
    onPauseDebugging: () => debugService.pause(),
    onStopDebugging: () => debugService.stopDebugging(),
    onRestartDebugging: () => debugService.restart(),
    onStepOver: () => debugService.stepOver(),
    onStepInto: () => debugService.stepInto(),
    onStepOut: () => debugService.stepOut(),
    onToggleBreakpoint: () => {
      const active = tabs.find((t) => t.id === activeTabId)
      if (active) {
        debugService.toggleBreakpoint(active.id, cursorPos.line)
      }
    },
    onFind: () => getActiveEditor()?.openFind(),
    onReplace: () => getActiveEditor()?.openReplace(),
    onFindAll: () => getActiveEditor()?.selectAllOccurrences(),
    onReplaceAll: () => getActiveEditor()?.openReplace(),
    onAddSelectionToNextMatch: () => getActiveEditor()?.addSelectionToNextFindMatch(),
    onSelectAllOccurrences: () => getActiveEditor()?.selectAllOccurrences(),
    onCursorAbove: () => getActiveEditor()?.insertCursorAbove(),
    onCursorBelow: () => getActiveEditor()?.insertCursorBelow(),
    onFormatDocument: () => getActiveEditor()?.formatDocument(),
  })

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
          isAntigravityOpen={isRightPaneOpen && rightPaneTab === 'antigravity'}
          onToggleAntigravity={handleToggleAntigravity}
          isAiOpen={isRightPaneOpen && rightPaneTab === 'ai'}
          onToggleAi={handleToggleAi}
          isDatabaseOpen={isRightPaneOpen && rightPaneTab === 'database'}
          onToggleDatabase={handleToggleDatabase}
          isRestClientOpen={isRightPaneOpen && rightPaneTab === 'rest'}
          onToggleRestClient={handleToggleRestClient}
          isRemoteOpen={isRightPaneOpen && rightPaneTab === 'remote'}
          onToggleRemote={handleToggleRemote}
          isPortsOpen={isRightPaneOpen && rightPaneTab === 'ports'}
          onTogglePorts={handleTogglePorts}
          isRedisOpen={isRightPaneOpen && rightPaneTab === 'redis'}
          onToggleRedis={handleToggleRedis}
          isEnvOpen={isRightPaneOpen && rightPaneTab === 'env'}
          onToggleEnv={handleToggleEnv}
          isMockLabOpen={isRightPaneOpen && rightPaneTab === 'mocklab'}
          onToggleMockLab={handleToggleMockLab}
          isGraphQLOpen={isRightPaneOpen && rightPaneTab === 'graphql'}
          onToggleGraphQL={handleToggleGraphQL}
          isDiagramOpen={isRightPaneOpen && rightPaneTab === 'diagram'}
          onToggleDiagram={handleToggleDiagram}
          isBundleOpen={isRightPaneOpen && rightPaneTab === 'bundle'}
          onToggleBundle={handleToggleBundle}
          isSvgOpen={isRightPaneOpen && rightPaneTab === 'svg'}
          onToggleSvg={handleToggleSvg}
          isCryptoOpen={isRightPaneOpen && rightPaneTab === 'crypto'}
          onToggleCrypto={handleToggleCrypto}
          isPreviewOpen={isRightPaneOpen && rightPaneTab === 'preview'}
          onTogglePreview={handleTogglePreview}
          isDockerOpen={isRightPaneOpen && rightPaneTab === 'docker'}
          onToggleDocker={handleToggleDocker}
          isSocketOpen={isRightPaneOpen && rightPaneTab === 'socket'}
          onToggleSocket={handleToggleSocket}
          isRegexOpen={isRightPaneOpen && rightPaneTab === 'regex'}
          onToggleRegex={handleToggleRegex}
          isPackagesOpen={isRightPaneOpen && rightPaneTab === 'packages'}
          onTogglePackages={handleTogglePackages}
          isTasksOpen={isRightPaneOpen && rightPaneTab === 'tasks'}
          onToggleTasks={handleToggleTasks}
          isJupyterOpen={isRightPaneOpen && rightPaneTab === 'jupyter'}
          onToggleJupyter={handleToggleJupyter}
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
                onOpenFileAndNavigate={handleOpenFileAndNavigate}
                activeFilePath={activeTabId}
                workspaceName={workspaceName}
                workspacePath={workspacePath}
                workspaceFiles={workspaceFiles}
                onOpenFolderClick={handleOpenFolderNative}
                onNewFileClick={handleNewFile}
                onCheckForUpdates={() => {
                  setIsUpdateModalOpen(true)
                  rendererUpdateService.checkForUpdates(true)
                }}
                onOpenMcpStudio={() => setIsMcpStudioOpen(true)}
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
            onRunActiveFile={() => handleRunActiveFile()}
            onRunWithArgs={handleRunWithArgs}
            onConfigureRun={handleOpenRunConfig}
            onStartDebugging={() => {
              const active = tabs.find((t) => t.id === activeTabId)
              debugService.startDebugging(active?.id || 'main.ts')
            }}
            onSplitVertical={() => editorGridRef.current?.splitVertical()}
            onSplitHorizontal={() => editorGridRef.current?.splitHorizontal()}
            onSplitGrid2x2={() => editorGridRef.current?.splitGrid2x2()}
            onOpenMarkdownPreviewSide={handleOpenMarkdownPreviewSide}
          />
          {/* Floating Liquid Glass Execution Control Toolbar */}
          <DebugToolbar
            onGoToActiveLocation={(filePath, line) => {
              if (tabs.some((t) => t.id === filePath)) {
                setActiveTabId(filePath)
              }
              setTimeout(() => {
                getActiveEditor()?.goToLine(line)
              }, 50)
            }}
          />

          {tabs.length > 0 ? (
            <EditorGrid
              ref={editorGridRef}
              tabs={tabs}
              fileContents={fileContents}
              currentTheme={currentTheme}
              activeTabId={activeTabId}
              onSelectTab={handleSelectTab}
              onCloseTab={handleCloseTab}
              onNewTab={handleNewFile}
              onEditorChange={(tabId, val) => {
                if (val !== undefined) {
                  setFileContents((prev) => ({ ...prev, [tabId]: val }))
                  setTabs((prevTabs) =>
                    prevTabs.map((t) => (t.id === tabId ? { ...t, isDirty: true } : t))
                  )
                }
              }}
              onCursorChange={(line, col) => setCursorPos({ line, col })}
              onSelectionChange={setCurrentSelection}
              onEditorReady={handleEditorReady}
              getLanguageForFilename={getLanguageFromFilename}
              onNavigateFile={handleOpenFileWithPosition}
              onApplyWorkspaceRename={handleApplyRename}
              onOpenMarkdownPreviewSide={handleOpenMarkdownPreviewSide}
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
            onGoToLocation={handleGoToProblemLocation}
            onRefreshDiagnostics={() => {
              const active = tabs.find((t) => t.id === activeTabId)
              if (active) {
                const content = fileContents[active.id] ?? ''
                diagnosticsService.analyzeCode(active.id, active.name, content, active.language)
              }
            }}
          />
        </main>

        {/* Right Auxiliary Dock Resizer Divider Sash */}
        {isRightPaneOpen && (
          <div
            className="pane-resizer-sash ai-sash"
            onMouseDown={handleRightPaneMouseDown}
            title="Drag to resize auxiliary dock"
          />
        )}

        {/* Right Multi-Extension Auxiliary Dock (AI Assistant, Database Studio) */}
        <AnimatePresence initial={false}>
          {isRightPaneOpen && (
            <motion.div
              key="right-dock-motion"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: rightPaneWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              style={{ overflow: 'hidden', height: '100%', display: 'flex', flexShrink: 0 }}
            >
              <RightAuxiliaryPane
                isOpen={isRightPaneOpen}
                activeTab={rightPaneTab}
                onSelectTab={(tab) => setRightPaneTab(tab)}
                onClose={() => setIsRightPaneOpen(false)}
                onOpenLicense={() => setIsLicenseOpen(true)}
                activeFileName={activeTab?.name || 'untitled.ts'}
                activeFileContent={currentContent}
                currentSelection={currentSelection}
                onInsertAtCursor={handleInsertAtCursor}
                onReplaceSelection={handleReplaceSelection}
                onCreateNotebook={handleCreateNotebook}
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
        errorCount={diagnosticCounts.errors}
        warningCount={diagnosticCounts.warnings}
        isUpdateAvailable={isUpdateAvailable}
        updateVersion={latestUpdateVersion}
        onUpdateClick={() => setIsUpdateModalOpen(true)}
        onAntigravityClick={handleToggleAntigravity}
        onThemeClick={() => setActiveView('themes')}
        onGitClick={() => setActiveView((prev) => (prev === 'git' ? null : 'git'))}
        onTerminalClick={handleToggleTerminal}
        onProblemsClick={handleOpenProblems}
      />

      {/* Command Palette Overlay */}
      <CommandPalette
        isOpen={isPaletteOpen}
        initialQuery={paletteInitialQuery}
        onClose={() => setIsPaletteOpen(false)}
        workspaceFiles={workspaceFiles}
        tabs={tabs}
        onOpenFile={(file) => handleOpenFileItem({ name: file.name, path: file.path, isDirectory: false })}
        activeTabName={activeTab?.name}
        onGoToLine={(line, col) => {
          editorHostRef.current?.goToLine(line, col)
          setIsPaletteOpen(false)
        }}
      />

      {/* Notification Center */}
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={notifications}
        onDismiss={(id) => notificationService.removeNotification(id)}
        onDismissAll={() => notificationService.dismissAll()}
        onMarkAllAsRead={() => notificationService.markAllAsRead()}
      />

      {/* Run & Build Configuration Studio Modal */}
      <RunConfigModal
        isOpen={isRunConfigOpen}
        onClose={() => setIsRunConfigOpen(false)}
        activeLanguage={activeTab?.language}
        onRunProfile={(profile) => {
          handleExecuteProfileWithArgs(profile, '')
        }}
      />

      {/* Run with Custom Arguments Prompt Modal */}
      <RunWithArgsModal
        isOpen={isRunWithArgsOpen}
        onClose={() => setIsRunWithArgsOpen(false)}
        activeFilePath={activeTabId}
        activeLanguage={activeTab?.language}
        workspacePath={workspacePath}
        onExecute={(profile, customArgs, customEnv) => {
          handleExecuteProfileWithArgs(profile, customArgs, customEnv)
        }}
        onOpenSettings={handleOpenRunConfig}
      />

      {/* Terminal Configuration Modal */}
      <TerminalConfigModal
        isOpen={isTerminalConfigOpen}
        onClose={() => setIsTerminalConfigOpen(false)}
      />

      {/* About Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* License & Subscription Modal with Lockout Enforcement */}
      <LicenseModal
        isOpen={isLicenseOpen || isLicenseLockout}
        onClose={() => {
          if (!isLicenseLockout) {
            setIsLicenseOpen(false)
          }
        }}
        version="5.0.0"
        isForceLockout={isLicenseLockout}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Unsaved Changes Prompt Modal on Folder Open */}
      <UnsavedChangesModal
        isOpen={isUnsavedChangesModalOpen}
        onClose={() => {
          setIsUnsavedChangesModalOpen(false)
          setPendingNewFolder(null)
        }}
        targetFolderName={pendingNewFolder?.folderName}
        dirtyTabs={tabs.filter((t) => t.isDirty)}
        onSaveAllAndProceed={handleSaveAllDirtyAndProceed}
        onDiscardAndProceed={handleDiscardDirtyAndProceed}
      />

      {/* Software Update Modal */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
      />

      {/* MCP Studio & Agent Tooling Modal */}
      <McpStudioModal
        isOpen={isMcpStudioOpen}
        onClose={() => setIsMcpStudioOpen(false)}
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

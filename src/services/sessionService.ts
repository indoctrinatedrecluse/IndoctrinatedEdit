import { WorkspaceFileItem } from '../components/Sidebar/Sidebar'
import { TabItem } from '../components/TabBar/TabBar'
import { notificationService } from './notificationService'

export interface SerializedTab {
  id: string
  name: string
  language: string
}

export interface WorkspaceSessionData {
  workspacePath: string | null
  workspaceName: string | null
  tabs: SerializedTab[]
  activeTabId: string | null
  timestamp: number
}

export interface RestoredSessionResult {
  workspacePath?: string
  workspaceName: string
  workspaceFiles: WorkspaceFileItem[]
  tabs: TabItem[]
  activeTabId: string
  fileContents: Record<string, string>
}

const SESSION_STORAGE_KEY = 'indoctrinated_workspace_session_v2'

export class SessionService {
  private static instance: SessionService
  private memoryStore: Map<string, string> = new Map()

  public static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService()
    }
    return SessionService.instance
  }

  private setStorageItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value)
      } else if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.setItem(key, value)
      } else {
        this.memoryStore.set(key, value)
      }
    } catch {
      this.memoryStore.set(key, value)
    }
  }

  private getStorageItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key)
      } else if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        return (globalThis as any).localStorage.getItem(key)
      } else {
        return this.memoryStore.get(key) || null
      }
    } catch {
      return this.memoryStore.get(key) || null
    }
  }

  private removeStorageItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key)
      } else if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.removeItem(key)
      } else {
        this.memoryStore.delete(key)
      }
    } catch {
      this.memoryStore.delete(key)
    }
  }

  private customElectronAPI: any = null

  public setElectronAPI(api: any): void {
    this.customElectronAPI = api
  }

  private getElectronAPI(): any {
    if (this.customElectronAPI) {
      return this.customElectronAPI
    }
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return (window as any).electronAPI
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).electronAPI) {
      return (globalThis as any).electronAPI
    }
    return undefined
  }

  /**
   * Persists active workspace state to local storage.
   */
  public saveSession(data: {
    workspacePath?: string
    workspaceName: string
    tabs: TabItem[]
    activeTabId: string
  }): void {
    try {
      const session: WorkspaceSessionData = {
        workspacePath: data.workspacePath || null,
        workspaceName: data.workspaceName || 'IndoctrinatedEdit',
        tabs: data.tabs.map((t) => ({ id: t.id, name: t.name, language: t.language })),
        activeTabId: data.activeTabId || null,
        timestamp: Date.now(),
      }

      this.setStorageItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    } catch (err) {
      console.warn('[SessionService] Failed to save session:', err)
    }
  }

  /**
   * Retrieves raw persisted session data from storage.
   */
  public loadSession(): WorkspaceSessionData | null {
    try {
      const raw = this.getStorageItem(SESSION_STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as WorkspaceSessionData
    } catch (err) {
      console.warn('[SessionService] Failed to parse session data:', err)
      return null
    }
  }

  /**
   * Clears saved session.
   */
  public clearSession(): void {
    this.removeStorageItem(SESSION_STORAGE_KEY)
    this.memoryStore.clear()
  }

  /**
   * Restores workspace session asynchronously, validating folder existence and file readability.
   * If files or projects are missing/corrupted, handles them gracefully with fallbacks.
   */
  public async restoreSession(
    defaultFiles: WorkspaceFileItem[],
    defaultTabs: TabItem[],
    defaultContents: Record<string, string>,
    resolveLanguage: (filename: string, content?: string) => string
  ): Promise<RestoredSessionResult> {
    const session = this.loadSession()
    const electron = this.getElectronAPI()

    // Default fallback state
    const fallbackResult: RestoredSessionResult = {
      workspacePath: undefined,
      workspaceName: 'IndoctrinatedEdit',
      workspaceFiles: defaultFiles,
      tabs: defaultTabs,
      activeTabId: defaultTabs[0]?.id || 'welcome.ts',
      fileContents: { ...defaultContents },
    }

    if (!session) {
      return fallbackResult
    }

    let restoredWorkspacePath: string | undefined = undefined
    let restoredWorkspaceName = 'IndoctrinatedEdit'
    let restoredWorkspaceFiles: WorkspaceFileItem[] = defaultFiles

    // 1. Validate and restore project workspace folder
    if (session.workspacePath && typeof session.workspacePath === 'string') {
      try {
        if (electron?.readFolder) {
          const folderResult = await electron.readFolder(session.workspacePath)
          if (folderResult && folderResult.files) {
            restoredWorkspacePath = folderResult.folderPath
            restoredWorkspaceName = folderResult.folderName
            restoredWorkspaceFiles = folderResult.files.map((f: any) => ({
              name: f.name,
              path: f.path,
              isDirectory: f.isDirectory,
              lang: f.isDirectory ? undefined : resolveLanguage(f.name),
            }))
          } else {
            // Folder missing or unable to open
            notificationService.notifyWarning(
              'Workspace Session Restore',
              `The last opened project at "${session.workspacePath}" is missing, corrupted, or cannot be opened. Safely restored default workspace context.`,
              'Session Manager'
            )
            this.saveSession({
              workspacePath: undefined,
              workspaceName: 'IndoctrinatedEdit',
              tabs: defaultTabs,
              activeTabId: defaultTabs[0]?.id || 'welcome.ts',
            })
          }
        }
      } catch (err) {
        notificationService.notifyWarning(
          'Workspace Session Restore',
          `Could not restore last opened project at "${session.workspacePath}". Error: ${err instanceof Error ? err.message : String(err)}. Falling back to default workspace.`,
          'Session Manager'
        )
      }
    }

    // 2. Validate and restore open tabs & contents
    const restoredTabs: TabItem[] = []
    const restoredContents: Record<string, string> = { ...defaultContents }

    if (session.tabs && Array.isArray(session.tabs)) {
      for (const tab of session.tabs) {
        // Built-in demo file
        if (defaultContents[tab.id] !== undefined) {
          restoredTabs.push({
            id: tab.id,
            name: tab.name,
            language: tab.language || resolveLanguage(tab.name),
          })
          continue
        }

        // External file on disk: check if readable
        if (tab.id.includes('/') || tab.id.includes('\\')) {
          if (electron?.readFile) {
            try {
              const content = await electron.readFile(tab.id)
              if (content !== undefined && content !== null) {
                restoredContents[tab.id] = content
                restoredTabs.push({
                  id: tab.id,
                  name: tab.name,
                  language: tab.language || resolveLanguage(tab.name, content),
                })
              }
            } catch {
              // File is missing, corrupted, or unreadable -> silently drop it from open tabs
              console.warn(`[SessionService] Silently dropped unreadable tab: ${tab.id}`)
            }
          }
        }
      }
    }

    // If all tabs were dropped or none existed, fallback to default tabs
    const finalTabs = restoredTabs.length > 0 ? restoredTabs : defaultTabs
    const finalActiveTabId =
      session.activeTabId && finalTabs.some((t) => t.id === session.activeTabId)
        ? session.activeTabId
        : finalTabs[0]?.id || 'welcome.ts'

    return {
      workspacePath: restoredWorkspacePath,
      workspaceName: restoredWorkspaceName,
      workspaceFiles: restoredWorkspaceFiles,
      tabs: finalTabs,
      activeTabId: finalActiveTabId,
      fileContents: restoredContents,
    }
  }
}

export const sessionService = SessionService.getInstance()

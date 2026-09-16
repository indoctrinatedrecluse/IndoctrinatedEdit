import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sessionService } from '../src/services/sessionService'
import { notificationService } from '../src/services/notificationService'
import { WorkspaceFileItem } from '../src/components/Sidebar/Sidebar'
import { TabItem } from '../src/components/TabBar/TabBar'

describe('SessionService - Workspace & Open File Persistence Suite', () => {
  const mockDefaultFiles: WorkspaceFileItem[] = [
    { name: 'welcome.ts', path: 'welcome.ts', isDirectory: false },
    { name: 'README.md', path: 'README.md', isDirectory: false },
  ]

  const mockDefaultTabs: TabItem[] = [
    { id: 'welcome.ts', name: 'welcome.ts', language: 'typescript' },
  ]

  const mockDefaultContents: Record<string, string> = {
    'welcome.ts': 'console.log("Welcome")',
    'README.md': '# Project Documentation',
  }

  const mockResolveLang = (name: string) => (name.endsWith('.ts') ? 'typescript' : 'plaintext')

  beforeEach(() => {
    sessionService.clearSession()
    sessionService.setElectronAPI(null)
    vi.restoreAllMocks()
  })

  describe('1. Basic Persistence (Save & Load)', () => {
    it('should save and load session correctly from storage', () => {
      sessionService.saveSession({
        workspacePath: 'D:/Projects/DemoApp',
        workspaceName: 'DemoApp',
        tabs: [
          { id: 'D:/Projects/DemoApp/index.ts', name: 'index.ts', language: 'typescript' },
          { id: 'welcome.ts', name: 'welcome.ts', language: 'typescript' },
        ],
        activeTabId: 'D:/Projects/DemoApp/index.ts',
      })

      const loaded = sessionService.loadSession()
      expect(loaded).toBeDefined()
      expect(loaded?.workspacePath).toBe('D:/Projects/DemoApp')
      expect(loaded?.workspaceName).toBe('DemoApp')
      expect(loaded?.tabs.length).toBe(2)
      expect(loaded?.activeTabId).toBe('D:/Projects/DemoApp/index.ts')
    })
  })

  describe('2. Fault-Tolerant Session Restoration', () => {
    it('should silently drop missing or corrupted files without throwing', async () => {
      sessionService.setElectronAPI({
        readFolder: vi.fn().mockResolvedValue({
          folderPath: 'D:/Projects/DemoApp',
          folderName: 'DemoApp',
          files: [{ name: 'valid.ts', path: 'D:/Projects/DemoApp/valid.ts', isDirectory: false }],
        }),
        readFile: vi.fn().mockImplementation((filePath: string) => {
          if (filePath.includes('valid.ts')) {
            return Promise.resolve('export const a = 1')
          }
          // Corrupted or missing file
          return Promise.reject(new Error('ENOENT: no such file or directory'))
        }),
      })

      sessionService.saveSession({
        workspacePath: 'D:/Projects/DemoApp',
        workspaceName: 'DemoApp',
        tabs: [
          { id: 'D:/Projects/DemoApp/valid.ts', name: 'valid.ts', language: 'typescript' },
          { id: 'D:/Projects/DemoApp/deleted.ts', name: 'deleted.ts', language: 'typescript' },
          { id: 'D:/Projects/DemoApp/corrupt.bin', name: 'corrupt.bin', language: 'plaintext' },
        ],
        activeTabId: 'D:/Projects/DemoApp/valid.ts',
      })

      const restored = await sessionService.restoreSession(
        mockDefaultFiles,
        mockDefaultTabs,
        mockDefaultContents,
        mockResolveLang
      )

      expect(restored.workspaceName).toBe('DemoApp')
      expect(restored.tabs.length).toBe(1)
      expect(restored.tabs[0].id).toBe('D:/Projects/DemoApp/valid.ts')
      expect(restored.fileContents['D:/Projects/DemoApp/valid.ts']).toBe('export const a = 1')
      expect(restored.activeTabId).toBe('D:/Projects/DemoApp/valid.ts')
    })

    it('should notify and fallback to default workspace when project folder is missing', async () => {
      const warnSpy = vi.spyOn(notificationService, 'notifyWarning')

      sessionService.setElectronAPI({
        readFolder: vi.fn().mockResolvedValue(null), // returns null when missing
        readFile: vi.fn().mockResolvedValue('content'),
      })

      sessionService.saveSession({
        workspacePath: 'D:/NonExistent/MissingFolder',
        workspaceName: 'MissingFolder',
        tabs: mockDefaultTabs,
        activeTabId: 'welcome.ts',
      })

      const restored = await sessionService.restoreSession(
        mockDefaultFiles,
        mockDefaultTabs,
        mockDefaultContents,
        mockResolveLang
      )

      expect(warnSpy).toHaveBeenCalled()
      expect(restored.workspacePath).toBeUndefined()
      expect(restored.workspaceName).toBe('IndoctrinatedEdit')
      expect(restored.tabs).toEqual(mockDefaultTabs)
    })

    it('should fallback to default tabs if all saved tabs are unreadable', async () => {
      sessionService.setElectronAPI({
        readFolder: vi.fn().mockResolvedValue(null),
        readFile: vi.fn().mockRejectedValue(new Error('Cannot read')),
      })

      sessionService.saveSession({
        workspacePath: undefined,
        workspaceName: 'IndoctrinatedEdit',
        tabs: [
          { id: 'D:/deleted/file1.ts', name: 'file1.ts', language: 'typescript' },
          { id: 'D:/deleted/file2.ts', name: 'file2.ts', language: 'typescript' },
        ],
        activeTabId: 'D:/deleted/file1.ts',
      })

      const restored = await sessionService.restoreSession(
        mockDefaultFiles,
        mockDefaultTabs,
        mockDefaultContents,
        mockResolveLang
      )

      expect(restored.tabs).toEqual(mockDefaultTabs)
      expect(restored.activeTabId).toBe('welcome.ts')
    })
  })
})

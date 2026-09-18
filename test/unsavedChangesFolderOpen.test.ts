import { describe, it, expect, vi } from 'vitest'
import { TabItem } from '../src/components/TabBar/TabBar'

describe('Workspace Folder Open - Unsaved Changes & Tab Management', () => {
  interface FolderPayload {
    folderName: string
    folderPath: string
    files: Array<{ name: string; path: string; isDirectory: boolean }>
  }

  // Helper simulating the folder opening logic in App.tsx
  const simulateOpenFolder = (
    currentTabs: TabItem[],
    fileContents: Record<string, string>,
    payload: FolderPayload,
    mockSaveFile: (path: string, content: string) => Promise<boolean>
  ) => {
    let tabs = [...currentTabs]
    let activeTabId = tabs[0]?.id || ''
    let isUnsavedChangesModalOpen = false
    let pendingFolder: FolderPayload | null = null
    let workspace = { name: 'Default', path: '', files: [] as any[] }

    const applyNewFolder = (p: FolderPayload) => {
      workspace = { name: p.folderName, path: p.folderPath, files: p.files }
      tabs = []
      activeTabId = ''
      pendingFolder = null
      isUnsavedChangesModalOpen = false
    }

    const dirtyTabs = tabs.filter((t) => t.isDirty)

    if (dirtyTabs.length > 0) {
      // Clear non-dirty tabs immediately, preserving only dirty tabs
      tabs = dirtyTabs
      activeTabId = dirtyTabs[0].id
      pendingFolder = payload
      isUnsavedChangesModalOpen = true
    } else {
      applyNewFolder(payload)
    }

    const saveAllAndProceed = async () => {
      for (const t of tabs) {
        await mockSaveFile(t.id, fileContents[t.id] || '')
      }
      if (pendingFolder) {
        applyNewFolder(pendingFolder)
      }
    }

    const discardAndProceed = () => {
      if (pendingFolder) {
        applyNewFolder(pendingFolder)
      }
    }

    const cancel = () => {
      isUnsavedChangesModalOpen = false
      pendingFolder = null
    }

    return {
      getTabs: () => tabs,
      getActiveTabId: () => activeTabId,
      isModalOpen: () => isUnsavedChangesModalOpen,
      getPendingFolder: () => pendingFolder,
      getWorkspace: () => workspace,
      saveAllAndProceed,
      discardAndProceed,
      cancel,
    }
  }

  const sampleFolder: FolderPayload = {
    folderName: 'NewProject',
    folderPath: 'D:/Projects/NewProject',
    files: [
      { name: 'main.py', path: 'D:/Projects/NewProject/main.py', isDirectory: false },
      { name: 'utils.py', path: 'D:/Projects/NewProject/utils.py', isDirectory: false },
    ],
  }

  it('should immediately clear all clean tabs and open new folder when no tabs are dirty', () => {
    const cleanTabs: TabItem[] = [
      { id: 'file1.ts', name: 'file1.ts', language: 'typescript', isDirty: false },
      { id: 'file2.ts', name: 'file2.ts', language: 'typescript', isDirty: false },
    ]

    const mockSave = vi.fn()
    const session = simulateOpenFolder(cleanTabs, {}, sampleFolder, mockSave)

    expect(session.isModalOpen()).toBe(false)
    expect(session.getTabs().length).toBe(0)
    expect(session.getWorkspace().name).toBe('NewProject')
    expect(session.getWorkspace().files.length).toBe(2)
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('should clear clean tabs, keep dirty tabs, and trigger unsaved changes prompt', () => {
    const mixedTabs: TabItem[] = [
      { id: 'clean1.ts', name: 'clean1.ts', language: 'typescript', isDirty: false },
      { id: 'dirty1.ts', name: 'dirty1.ts', language: 'typescript', isDirty: true },
      { id: 'clean2.ts', name: 'clean2.ts', language: 'typescript', isDirty: false },
      { id: 'dirty2.py', name: 'dirty2.py', language: 'python', isDirty: true },
    ]

    const mockSave = vi.fn()
    const session = simulateOpenFolder(mixedTabs, {}, sampleFolder, mockSave)

    // Modal should be opened
    expect(session.isModalOpen()).toBe(true)
    expect(session.getPendingFolder()?.folderName).toBe('NewProject')

    // Clean tabs must be cleared, only dirty tabs remain
    const remainingTabs = session.getTabs()
    expect(remainingTabs.length).toBe(2)
    expect(remainingTabs.map((t) => t.id)).toEqual(['dirty1.ts', 'dirty2.py'])
    expect(session.getActiveTabId()).toBe('dirty1.ts')

    // Workspace should NOT have changed yet
    expect(session.getWorkspace().name).toBe('Default')
  })

  it('should save all dirty files and open the new folder when user confirms "Save All & Open"', async () => {
    const dirtyTabs: TabItem[] = [
      { id: 'app.ts', name: 'app.ts', language: 'typescript', isDirty: true },
      { id: 'server.ts', name: 'server.ts', language: 'typescript', isDirty: true },
    ]
    const contents = {
      'app.ts': 'const a = 1;',
      'server.ts': 'const s = 2;',
    }

    const mockSave = vi.fn().mockResolvedValue(true)
    const session = simulateOpenFolder(dirtyTabs, contents, sampleFolder, mockSave)

    expect(session.isModalOpen()).toBe(true)

    // User chooses Save All & Open
    await session.saveAllAndProceed()

    expect(mockSave).toHaveBeenCalledTimes(2)
    expect(mockSave).toHaveBeenCalledWith('app.ts', 'const a = 1;')
    expect(mockSave).toHaveBeenCalledWith('server.ts', 'const s = 2;')

    // Workspace is now opened and tabs cleared
    expect(session.isModalOpen()).toBe(false)
    expect(session.getTabs().length).toBe(0)
    expect(session.getWorkspace().name).toBe('NewProject')
  })

  it('should discard dirty files and open the new folder without saving when user chooses "Don\'t Save"', () => {
    const dirtyTabs: TabItem[] = [
      { id: 'draft.txt', name: 'draft.txt', language: 'plaintext', isDirty: true },
    ]

    const mockSave = vi.fn()
    const session = simulateOpenFolder(dirtyTabs, { 'draft.txt': 'test' }, sampleFolder, mockSave)

    expect(session.isModalOpen()).toBe(true)

    // User chooses Don't Save & Open
    session.discardAndProceed()

    expect(mockSave).not.toHaveBeenCalled()
    expect(session.isModalOpen()).toBe(false)
    expect(session.getTabs().length).toBe(0)
    expect(session.getWorkspace().name).toBe('NewProject')
  })

  it('should retain dirty files and keep current workspace when user cancels', () => {
    const dirtyTabs: TabItem[] = [
      { id: 'critical.ts', name: 'critical.ts', language: 'typescript', isDirty: true },
    ]

    const mockSave = vi.fn()
    const session = simulateOpenFolder(dirtyTabs, {}, sampleFolder, mockSave)

    expect(session.isModalOpen()).toBe(true)

    // User cancels
    session.cancel()

    expect(session.isModalOpen()).toBe(false)
    expect(session.getPendingFolder()).toBeNull()
    expect(session.getTabs().length).toBe(1)
    expect(session.getTabs()[0].id).toBe('critical.ts')
    expect(session.getWorkspace().name).toBe('Default')
    expect(mockSave).not.toHaveBeenCalled()
  })
})

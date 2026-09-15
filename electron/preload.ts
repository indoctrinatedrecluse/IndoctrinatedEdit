import { contextBridge, ipcRenderer } from 'electron'

export interface FileOpenResult {
  path: string
  name: string
  content: string
}

export interface FolderOpenResult {
  folderPath: string
  folderName: string
  files: Array<{ name: string; path: string; isDirectory: boolean }>
}

export interface ElectronAPI {
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>
  onMaximizedChange: (callback: (isMax: boolean) => void) => () => void
  platform: string

  // Native file system operations
  openFileDialog: () => Promise<FileOpenResult | null>
  openFolderDialog: () => Promise<FolderOpenResult | null>
  readFile: (filePath: string) => Promise<string>
  saveFile: (filePath: string, content: string) => Promise<boolean>
  saveFileAs: (defaultName: string, content: string) => Promise<{ path: string; name: string } | null>
}

const api: ElectronAPI = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizedChange: (callback: (isMax: boolean) => void) => {
    const handler = (_: unknown, isMax: boolean) => callback(isMax)
    ipcRenderer.on('window-maximized-state', handler)
    return () => {
      ipcRenderer.removeListener('window-maximized-state', handler)
    }
  },
  platform: process.platform,

  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  saveFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:saveFile', filePath, content),
  saveFileAs: (defaultName: string, content: string) => ipcRenderer.invoke('dialog:saveFileAs', defaultName, content),
}

contextBridge.exposeInMainWorld('electronAPI', api)

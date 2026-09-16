import { contextBridge, ipcRenderer } from 'electron'
import {
  GitRepoStatus,
  AiProvider,
  AiStreamChunk,
  ToolchainDefinition,
  DetectedToolchain,
} from '../packages/sdk/types'

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

export interface ElectronGitAPI {
  getRepoStatus: (cwd?: string) => Promise<GitRepoStatus>
  stageFile: (filePath: string, cwd?: string) => Promise<boolean>
  unstageFile: (filePath: string, cwd?: string) => Promise<boolean>
  commit: (message: string, cwd?: string) => Promise<boolean>
  initRepo: (cwd?: string) => Promise<boolean>
}

export interface ElectronAiAPI {
  listOllamaModels: (host?: string) => Promise<string[]>
  cancelStream: (requestId: string) => Promise<void>
  startStream: (
    requestId: string,
    options: {
      provider: AiProvider
      model: string
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
      apiKey?: string
      endpoint?: string
    },
    onChunk: (chunk: AiStreamChunk) => void
  ) => () => void
}

export interface ElectronToolchainAPI {
  detectOne: (definition: ToolchainDefinition) => Promise<DetectedToolchain>
  detectAll: (definitions?: ToolchainDefinition[]) => Promise<DetectedToolchain[]>
  getDefaultDefinitions: () => Promise<ToolchainDefinition[]>
}

export interface ElectronAPI {
  minimize: () => Promise<void>
  maximize: () => Promise<boolean>
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>
  onMaximizedChange: (callback: (isMax: boolean) => void) => () => void
  platform: string

  // Native file system operations
  openFileDialog: () => Promise<FileOpenResult | null>
  openFolderDialog: () => Promise<FolderOpenResult | null>
  readFolder: (folderPath: string) => Promise<FolderOpenResult | null>
  checkExists: (targetPath: string) => Promise<boolean>
  readFile: (filePath: string) => Promise<string>
  saveFile: (filePath: string, content: string) => Promise<boolean>
  saveFileAs: (defaultName: string, content: string) => Promise<{ path: string; name: string } | null>

  // Git microservice operations
  git: ElectronGitAPI

  // AI Multi-Model service operations
  ai: ElectronAiAPI

  // Toolchain & SDK auto-detection operations
  toolchain: ElectronToolchainAPI

  // Lifecycle notification
  notifyReady: () => Promise<void>
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
  readFolder: (folderPath: string) => ipcRenderer.invoke('fs:readFolder', folderPath),
  checkExists: (targetPath: string) => ipcRenderer.invoke('fs:checkExists', targetPath),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  saveFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:saveFile', filePath, content),
  saveFileAs: (defaultName: string, content: string) => ipcRenderer.invoke('dialog:saveFileAs', defaultName, content),

  git: {
    getRepoStatus: (cwd?: string) => ipcRenderer.invoke('git:getRepoStatus', cwd),
    stageFile: (filePath: string, cwd?: string) => ipcRenderer.invoke('git:stageFile', filePath, cwd),
    unstageFile: (filePath: string, cwd?: string) => ipcRenderer.invoke('git:unstageFile', filePath, cwd),
    commit: (message: string, cwd?: string) => ipcRenderer.invoke('git:commit', message, cwd),
    initRepo: (cwd?: string) => ipcRenderer.invoke('git:init', cwd),
  },

  ai: {
    listOllamaModels: (host?: string) => ipcRenderer.invoke('ai:listOllamaModels', host),
    cancelStream: (requestId: string) => ipcRenderer.invoke('ai:cancelStream', requestId),
    startStream: (requestId, options, onChunk) => {
      const channel = `ai:chunk:${requestId}`
      const handler = (_: unknown, chunk: AiStreamChunk) => onChunk(chunk)
      ipcRenderer.on(channel, handler)
      ipcRenderer.invoke('ai:startStream', requestId, options)
      return () => {
        ipcRenderer.removeListener(channel, handler)
        ipcRenderer.invoke('ai:cancelStream', requestId)
      }
    },
  },

  toolchain: {
    detectOne: (definition) => ipcRenderer.invoke('toolchain:detectOne', definition),
    detectAll: (definitions) => ipcRenderer.invoke('toolchain:detectAll', definitions),
    getDefaultDefinitions: () => ipcRenderer.invoke('toolchain:getDefaultDefinitions'),
  },

  notifyReady: () => ipcRenderer.invoke('app:ready'),
}

contextBridge.exposeInMainWorld('electronAPI', api)

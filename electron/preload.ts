import { contextBridge, ipcRenderer } from 'electron'
import {
  GitRepoStatus,
  AiProvider,
  AiStreamChunk,
  ToolchainDefinition,
  DetectedToolchain,
  AcpBinaryDetection,
  AcpInstallResult,
  AcpMcpServerSpec,
  AcpStatusInfo,
  AcpStreamEvent,
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

export interface ElectronGitBlameEntry {
  lineNumber: number
  hash: string
  shortHash: string
  author: string
  authorEmail: string
  date: string
  summary: string
}

export interface ElectronGitAPI {
  getRepoStatus: (cwd?: string) => Promise<GitRepoStatus>
  stageFile: (filePath: string, cwd?: string) => Promise<boolean>
  unstageFile: (filePath: string, cwd?: string) => Promise<boolean>
  commit: (message: string, cwd?: string) => Promise<boolean>
  initRepo: (cwd?: string) => Promise<boolean>
  blame: (filePath: string, cwd?: string) => Promise<ElectronGitBlameEntry[]>
  diff: (options?: { staged?: boolean; filePath?: string; cwd?: string }) => Promise<string>
  applyPatch: (patch: string, options?: { cached?: boolean; reverse?: boolean; cwd?: string }) => Promise<{ success: boolean; error?: string }>
}

export interface ElectronWorkspaceToolsAPI {
  execCommand: (options: { command: string; cwd?: string; env?: Record<string, string>; timeoutMs?: number }) => Promise<{
    exitCode: number
    stdout: string
    stderr: string
    durationMs: number
    timedOut: boolean
  }>
  findFiles: (options: { rootDir: string; maxDepth?: number; maxFiles?: number; includeExtensions?: string[] }) => Promise<Array<{ name: string; path: string; relativePath: string; sizeBytes: number }>>
  searchText: (options: { rootDir: string; query: string; isRegex?: boolean; caseSensitive?: boolean; filePattern?: string; maxMatches?: number }) => Promise<Array<{ filePath: string; relativePath: string; lineNumber: number; lineText: string }>>
  scanBundle: (rootDir: string) => Promise<{
    buildDir: string | null
    totalRawBytes: number
    totalGzipBytes: number
    files: Array<{ name: string; relativePath: string; rawSizeBytes: number; gzipSizeBytes: number; extension: string }>
    duplicates: Array<{ name: string; versions: string[] }>
  }>
  readFileBinary: (filePath: string, maxBytes?: number) => Promise<Uint8Array>
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
      mode?: 'plan' | 'act'
      disableTools?: boolean
      temperature?: number
      maxOutputTokens?: number
      maxRetries?: number
      extraTools?: Array<{
        name: string
        description?: string
        parameters?: Record<string, any>
        requiredParams?: string[]
      }>
    },
    onChunk: (chunk: AiStreamChunk) => void
  ) => () => void
}

export interface ElectronAntigravityAPI {
  detectCli: (command?: string) => Promise<AcpBinaryDetection>
  installCli: () => Promise<AcpInstallResult>
  launchCliLogin: (command?: string) => Promise<boolean>
  connect: (options?: { command?: string; args?: string[]; cwd?: string; mcpServers?: AcpMcpServerSpec[] }) => Promise<AcpStatusInfo>
  disconnect: () => Promise<boolean>
  authenticate: (methodId: string) => Promise<AcpStatusInfo>
  newSession: (cwd?: string, mcpServers?: AcpMcpServerSpec[]) => Promise<string>
  sendPrompt: (text: string) => Promise<{ stopReason?: string }>
  cancelPrompt: () => Promise<boolean>
  setMode: (modeId: string) => Promise<boolean>
  setModel: (modelId: string) => Promise<boolean>
  respondPermission: (requestId: string | number, optionId: string | null) => Promise<boolean>
  getStatus: () => Promise<AcpStatusInfo>
  getLogs: () => Promise<string[]>
  openExternalUrl: (url: string) => Promise<boolean>
  onEvent: (callback: (event: AcpStreamEvent) => void) => () => void
}

export interface ElectronToolchainAPI {
  detectOne: (definition: ToolchainDefinition) => Promise<DetectedToolchain>
  detectAll: (definitions?: ToolchainDefinition[]) => Promise<DetectedToolchain[]>
  getDefaultDefinitions: () => Promise<ToolchainDefinition[]>
}

export interface ShellProfile {
  id: string
  name: string
  path: string
  args?: string[]
  icon: 'powershell' | 'git' | 'cygwin' | 'terminal' | 'cmd' | 'wsl'
  isDefault?: boolean
}

export interface TerminalConfig {
  defaultShellId?: string
  fontSize: number
  fontFamily: string
  cursorStyle: 'block' | 'underline' | 'line'
  cursorBlink: boolean
  scrollback: number
  profiles: ShellProfile[]
}

export interface TerminalSessionInfo {
  id: string
  shellId: string
  shellName: string
  pid?: number
  cwd: string
  /** True when the session is backed by a genuine pseudo-console (node-pty). */
  pty?: boolean
  /** Which pseudo-console implementation is driving the session. */
  backend?: 'conpty' | 'winpty' | 'openpty' | 'pipe'
  /** Windows build number, used by xterm.js ConPTY line-wrap workarounds. */
  osBuild?: number
}

export interface TerminalDiagnostics {
  ptyAvailable: boolean
  ptyLoadError: string | null
  backend: 'conpty' | 'winpty' | 'openpty' | 'pipe'
  osBuild: number
  platform: string
  activeSessions: number
}

/**
 * Why a terminal session ended.
 * - `exited` - the shell ended on its own (`exit`, Ctrl+D, crash). The tab is
 *   dropped and any leftover children are reaped.
 * - `killed` - the application terminated it (Kill button, tab close, window
 *   close, app quit).
 */
export type TerminalExitReason = 'exited' | 'killed'

export interface TerminalExitPayload {
  id: string
  code: number | null
  signal: string | null
  reason: TerminalExitReason
}

export interface ElectronTerminalAPI {
  detectShells: () => Promise<ShellProfile[]>
  getConfig: () => Promise<TerminalConfig>
  getDiagnostics: () => Promise<TerminalDiagnostics>
  saveConfig: (config: Partial<TerminalConfig>) => Promise<boolean>
  create: (options: { shellId?: string; cwd?: string; cols?: number; rows?: number }) => Promise<TerminalSessionInfo>
  write: (id: string, data: string) => Promise<boolean>
  resize: (id: string, cols: number, rows: number) => Promise<boolean>
  kill: (id: string) => Promise<boolean>
  openExternal: (shellId?: string, cwd?: string) => Promise<boolean>
  onData: (callback: (payload: { id: string; data: string }) => void) => () => void
  onExit: (callback: (payload: TerminalExitPayload) => void) => () => void
}

export interface ElectronUpdaterAPI {
  checkForUpdates: (channel?: 'stable' | 'beta' | 'nightly') => Promise<any>
  downloadUpdate: (downloadUrl: string, version: string, expectedSha256?: string) => Promise<{ filePath: string; verified: boolean }>
  cancelDownload: () => Promise<boolean>
  installUpdate: (installerPath?: string) => Promise<boolean>
  getConfig: () => Promise<any>
  saveConfig: (config: any) => Promise<any>
  onDownloadProgress: (callback: (progress: any) => void) => () => void
}

export type LicenseType = 'ADM' | 'DEV' | 'USER' | 'TRIAL'
export type LicenseStatus = 'active' | 'trial' | 'expired' | 'revoked'

export interface LicenseInfo {
  type: LicenseType
  typeName: string
  licenseKey?: string
  maskedKey?: string
  username?: string
  hwid: string
  status: LicenseStatus
  trialDaysRemaining?: number
  trialStartedAt?: string
  activatedAt?: string
  expiresAt?: string | null
  isValid: boolean
  isTrial: boolean
  machineName: string
}

export interface LicenseActivationRequest {
  licenseKey: string
  username?: string
  password?: string
}

export interface LicenseActionResult {
  success: boolean
  message?: string
  error?: string
  info?: LicenseInfo
}

export interface ElectronLicenseAPI {
  getInfo: () => Promise<LicenseInfo>
  getHwid: () => Promise<string>
  activate: (request: LicenseActivationRequest) => Promise<LicenseActionResult>
  validate: () => Promise<{ valid: boolean; message?: string; info: LicenseInfo }>
  remove: () => Promise<LicenseActionResult>
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
  listWorkspaceFiles: (rootPath: string, maxFiles?: number) => Promise<Array<{ name: string; relativePath: string; path: string; isDirectory: boolean }>>
  checkExists: (targetPath: string) => Promise<boolean>
  readFile: (filePath: string) => Promise<string>
  readFileBase64: (filePath: string) => Promise<string>
  saveFile: (filePath: string, content: string) => Promise<boolean>
  saveFileAs: (defaultName: string, content: string) => Promise<{ path: string; name: string } | null>

  // Git microservice operations
  git: ElectronGitAPI

  // AI Multi-Model service operations
  ai: ElectronAiAPI

  // Antigravity Python SDK & Personal Account Subsystem
  antigravity: ElectronAntigravityAPI

  // Toolchain & SDK auto-detection operations
  toolchain: ElectronToolchainAPI

  // Terminal subsystem operations
  terminal: ElectronTerminalAPI

  // Auto-updater operations
  updater: ElectronUpdaterAPI

  // Licensing & Activation subsystem
  license: ElectronLicenseAPI

  // Workspace CLI, search, bundle scan & binary read tools
  workspace: ElectronWorkspaceToolsAPI

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
  listWorkspaceFiles: (rootPath: string, maxFiles?: number) => ipcRenderer.invoke('fs:listWorkspaceFiles', rootPath, maxFiles),
  checkExists: (targetPath: string) => ipcRenderer.invoke('fs:checkExists', targetPath),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  readFileBase64: (filePath: string) => ipcRenderer.invoke('fs:readFileBase64', filePath),
  saveFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:saveFile', filePath, content),
  saveFileAs: (defaultName: string, content: string) => ipcRenderer.invoke('dialog:saveFileAs', defaultName, content),

  git: {
    getRepoStatus: (cwd?: string) => ipcRenderer.invoke('git:getRepoStatus', cwd),
    stageFile: (filePath: string, cwd?: string) => ipcRenderer.invoke('git:stageFile', filePath, cwd),
    unstageFile: (filePath: string, cwd?: string) => ipcRenderer.invoke('git:unstageFile', filePath, cwd),
    commit: (message: string, cwd?: string) => ipcRenderer.invoke('git:commit', message, cwd),
    initRepo: (cwd?: string) => ipcRenderer.invoke('git:init', cwd),
    blame: (filePath: string, cwd?: string) => ipcRenderer.invoke('git:blame', filePath, cwd),
    diff: (options?: { staged?: boolean; filePath?: string; cwd?: string }) => ipcRenderer.invoke('git:diff', options),
    applyPatch: (patch: string, options?: { cached?: boolean; reverse?: boolean; cwd?: string }) =>
      ipcRenderer.invoke('git:applyPatch', patch, options),
  },

  workspace: {
    execCommand: (options) => ipcRenderer.invoke('workspace:execCommand', options),
    findFiles: (options) => ipcRenderer.invoke('workspace:findFiles', options),
    searchText: (options) => ipcRenderer.invoke('workspace:searchText', options),
    scanBundle: (rootDir) => ipcRenderer.invoke('workspace:scanBundle', rootDir),
    readFileBinary: (filePath, maxBytes) => ipcRenderer.invoke('workspace:readFileBinary', filePath, maxBytes),
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

  antigravity: {
    detectCli: (command) => ipcRenderer.invoke('antigravity:detectCli', command),
    installCli: () => ipcRenderer.invoke('antigravity:installCli'),
    launchCliLogin: (command) => ipcRenderer.invoke('antigravity:launchCliLogin', command),
    connect: (options) => ipcRenderer.invoke('antigravity:connect', options),
    disconnect: () => ipcRenderer.invoke('antigravity:disconnect'),
    authenticate: (methodId) => ipcRenderer.invoke('antigravity:authenticate', methodId),
    newSession: (cwd, mcpServers) => ipcRenderer.invoke('antigravity:newSession', cwd, mcpServers),
    sendPrompt: (text) => ipcRenderer.invoke('antigravity:sendPrompt', text),
    cancelPrompt: () => ipcRenderer.invoke('antigravity:cancelPrompt'),
    setMode: (modeId) => ipcRenderer.invoke('antigravity:setMode', modeId),
    setModel: (modelId) => ipcRenderer.invoke('antigravity:setModel', modelId),
    respondPermission: (requestId, optionId) =>
      ipcRenderer.invoke('antigravity:respondPermission', requestId, optionId),
    getStatus: () => ipcRenderer.invoke('antigravity:getStatus'),
    getLogs: () => ipcRenderer.invoke('antigravity:getLogs'),
    openExternalUrl: (url) => ipcRenderer.invoke('antigravity:openExternalUrl', url),
    onEvent: (callback) => {
      const handler = (_: unknown, event: AcpStreamEvent) => callback(event)
      ipcRenderer.on('antigravity:acpEvent', handler)
      return () => {
        ipcRenderer.removeListener('antigravity:acpEvent', handler)
      }
    },
  },

  toolchain: {
    detectOne: (definition) => ipcRenderer.invoke('toolchain:detectOne', definition),
    detectAll: (definitions) => ipcRenderer.invoke('toolchain:detectAll', definitions),
    getDefaultDefinitions: () => ipcRenderer.invoke('toolchain:getDefaultDefinitions'),
  },

  terminal: {
    detectShells: () => ipcRenderer.invoke('terminal:detectShells'),
    getConfig: () => ipcRenderer.invoke('terminal:getConfig'),
    getDiagnostics: () => ipcRenderer.invoke('terminal:getDiagnostics'),
    saveConfig: (config) => ipcRenderer.invoke('terminal:saveConfig', config),
    create: (options) => ipcRenderer.invoke('terminal:create', options),
    write: (id, data) => ipcRenderer.invoke('terminal:write', { id, data }),
    resize: (id, cols, rows) => ipcRenderer.invoke('terminal:resize', { id, cols, rows }),
    kill: (id) => ipcRenderer.invoke('terminal:kill', id),
    openExternal: (shellId, cwd) => ipcRenderer.invoke('terminal:openExternal', { shellId, cwd }),
    onData: (callback) => {
      const handler = (_: unknown, payload: { id: string; data: string }) => callback(payload)
      ipcRenderer.on('terminal:data', handler)
      return () => {
        ipcRenderer.removeListener('terminal:data', handler)
      }
    },
    onExit: (callback) => {
      const handler = (_: unknown, payload: TerminalExitPayload) => callback(payload)
      ipcRenderer.on('terminal:exit', handler)
      return () => {
        ipcRenderer.removeListener('terminal:exit', handler)
      }
    },
  },

  updater: {
    checkForUpdates: (channel) => ipcRenderer.invoke('updater:checkForUpdates', channel),
    downloadUpdate: (downloadUrl, version, expectedSha256) =>
      ipcRenderer.invoke('updater:downloadUpdate', downloadUrl, version, expectedSha256),
    cancelDownload: () => ipcRenderer.invoke('updater:cancelDownload'),
    installUpdate: (installerPath) => ipcRenderer.invoke('updater:installUpdate', installerPath),
    getConfig: () => ipcRenderer.invoke('updater:getConfig'),
    saveConfig: (config) => ipcRenderer.invoke('updater:saveConfig', config),
    onDownloadProgress: (callback) => {
      const handler = (_: unknown, progress: any) => callback(progress)
      ipcRenderer.on('updater:downloadProgress', handler)
      return () => {
        ipcRenderer.removeListener('updater:downloadProgress', handler)
      }
    },
  },

  license: {
    getInfo: () => ipcRenderer.invoke('license:getInfo'),
    getHwid: () => ipcRenderer.invoke('license:getHwid'),
    activate: (request) => ipcRenderer.invoke('license:activate', request),
    validate: () => ipcRenderer.invoke('license:validate'),
    remove: () => ipcRenderer.invoke('license:remove'),
  },

  notifyReady: () => ipcRenderer.invoke('app:ready'),
}

contextBridge.exposeInMainWorld('electronAPI', api)

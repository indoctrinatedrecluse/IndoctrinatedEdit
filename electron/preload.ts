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

export interface ElectronMcpStdioSpec {
  id: string
  command: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  timeoutMs?: number
}

export interface ElectronMcpAPI {
  ping: (spec: ElectronMcpStdioSpec) => Promise<{ success: boolean; latencyMs?: number; error?: string }>
  listTools: (spec: ElectronMcpStdioSpec) => Promise<{ success: boolean; tools: any[]; error?: string }>
  listResources: (spec: ElectronMcpStdioSpec) => Promise<{ success: boolean; resources: any[]; error?: string }>
  listPrompts: (spec: ElectronMcpStdioSpec) => Promise<{ success: boolean; prompts: any[]; error?: string }>
  callTool: (spec: ElectronMcpStdioSpec, toolName: string, args?: Record<string, any>) => Promise<{ success: boolean; result?: any; error?: string }>
  disconnect: (serverId: string) => Promise<boolean>
}

export interface ElectronInfraAPI {
  httpRequest: (req: { url: string; method: string; headers?: Record<string, string>; body?: string; timeoutMs?: number }) => Promise<{
    ok: boolean
    status: number
    statusText: string
    headers: Record<string, string>
    body: string
    latencyMs: number
    sizeBytes: number
    error?: string
  }>
  mockStart: (port: number, routes: any[]) => Promise<{ running: boolean; port: number; error?: string }>
  mockStop: () => Promise<boolean>
  mockSync: (routes: any[]) => Promise<boolean>
  mockStatus: () => Promise<{ running: boolean; port: number }>
  onMockTraffic: (cb: (ev: any) => void) => () => void
  portsScan: () => Promise<Array<{ port: number; protocol: 'TCP' | 'UDP'; pid: number; processName: string; localAddress: string; state: string }>>
  portsPing: (port: number, host?: string) => Promise<{ isReachable: boolean; latencyMs: number; statusCode?: number; statusText?: string; serverHeader?: string; error?: string }>
  portsKill: (pid: number) => Promise<{ success: boolean; message: string }>
  redisExec: (options: { host: string; port: number; password?: string; db?: number; tls?: boolean; args: string[]; timeoutMs?: number }) => Promise<{ ok: boolean; value?: any; error?: string; latencyMs: number }>
  redisSubscribe: (options: { id: string; host: string; port: number; password?: string; tls?: boolean; channel: string }) => Promise<{ ok: boolean; error?: string }>
  redisUnsubscribe: (id: string) => Promise<boolean>
  onRedisPubSubEvent: (cb: (ev: any) => void) => () => void
  sshExec: (spec: { host: string; port?: number; username: string; keyPath?: string; command: string; timeoutMs?: number }) => Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number; latencyMs: number }>
  sftpList: (spec: { host: string; port?: number; username: string; keyPath?: string; remotePath: string }) => Promise<{ ok: boolean; entries: Array<{ name: string; type: 'file' | 'directory'; size: string; permissions: string; modified: string }>; error?: string }>
  sftpRead: (spec: { host: string; port?: number; username: string; keyPath?: string; remoteFile: string }) => Promise<{ ok: boolean; content?: string; error?: string }>
  sftpWrite: (spec: { host: string; port?: number; username: string; keyPath?: string; remoteFile: string; content: string }) => Promise<{ ok: boolean; error?: string }>
  sftpUpload: (spec: { host: string; port?: number; username: string; keyPath?: string; localPath: string; remotePath: string }) => Promise<{ ok: boolean; error?: string }>
  sftpDownload: (spec: { host: string; port?: number; username: string; keyPath?: string; localPath: string; remotePath: string }) => Promise<{ ok: boolean; error?: string }>
  sftpDelete: (spec: { host: string; port?: number; username: string; keyPath?: string; remoteFile: string }) => Promise<{ ok: boolean; error?: string }>
  dockerExec: (args: string[], timeoutOrOpts?: number | { timeoutMs?: number; cwd?: string; stdin?: string }) => Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number }>
  k8sExec: (args: string[], timeoutOrOpts?: number | { timeoutMs?: number; cwd?: string; stdin?: string }) => Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number }>
  dbOpenSqlite: (filePath?: string) => Promise<{ ok: boolean; canceled?: boolean; dbId?: string; name?: string; filePath?: string; tables?: Record<string, any>; error?: string }>
  dbCreateSqlite: (name?: string, seedSql?: string) => Promise<{ ok: boolean; dbId?: string; name?: string; tables?: Record<string, any>; error?: string }>
  dbExecSqlite: (dbId: string, sql: string) => Promise<{ ok: boolean; columns: string[]; rows: Record<string, any>[]; rowCount: number; affectedRows?: number; executionTimeMs: number; tables?: Record<string, any>; error?: string }>
  dbSaveSqlite: (dbId: string, targetPath?: string) => Promise<{ ok: boolean; canceled?: boolean; filePath?: string; error?: string }>
  dbCloseSqlite: (dbId: string) => Promise<boolean>
  dbExecCli: (options: { dialect: 'postgres' | 'mysql' | 'duckdb' | 'sqlite'; connectionString: string; sql: string; timeoutMs?: number }) => Promise<{ ok: boolean; stdout: string; stderr: string; executionTimeMs: number; error?: string }>
  grpcInspectProto: (protoPath: string) => Promise<{ ok: boolean; services: Array<{ name: string; methods: string[] }>; error?: string }>
  grpcInvoke: (options: { protoPath: string; address: string; serviceName: string; methodName: string; payload: Record<string, any>; metadata?: Record<string, string>; useTls?: boolean; timeoutMs?: number }) => Promise<{ ok: boolean; response?: any; latencyMs: number; error?: string }>
  smtpSend: (options: { host: string; port: number; security: 'starttls' | 'ssl' | 'none'; username?: string; password?: string; from: string; to: string; subject: string; body: string; timeoutMs?: number }) => Promise<{ ok: boolean; transcript: Array<{ type: 'info' | 'client' | 'server'; text: string }>; error?: string }>
  wsConnect: (options: { id: string; url: string; headers?: Record<string, string> }) => Promise<{ ok: boolean; error?: string }>
  wsSend: (id: string, payload: string) => Promise<boolean>
  wsPing: (id: string) => Promise<boolean>
  wsDisconnect: (id: string) => Promise<boolean>
  onWsEvent: (cb: (ev: any) => void) => () => void
  tcpConnect: (options: { id: string; host: string; port: number; useTls?: boolean }) => Promise<{ ok: boolean; error?: string }>
  tcpSend: (id: string, data: string) => Promise<boolean>
  tcpDisconnect: (id: string) => Promise<boolean>
  onTcpEvent: (cb: (ev: any) => void) => () => void
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
  setInstallOnExit: (enabled: boolean) => Promise<boolean>
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
  setZoom: (action: 'in' | 'out' | 'reset') => Promise<number>
  toggleFullscreen: () => Promise<boolean>
  getAppVersion: () => Promise<string>
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

  // Real MCP JSON-RPC 2.0 stdio client operations
  mcp: ElectronMcpAPI

  // Real Network & Infrastructure Studios IPC
  infra: ElectronInfraAPI

  // Lifecycle notification
  notifyReady: () => Promise<void>
}

const api: ElectronAPI = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  setZoom: (action) => ipcRenderer.invoke('window:setZoom', action),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
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

  mcp: {
    ping: (spec) => ipcRenderer.invoke('mcp:ping', spec),
    listTools: (spec) => ipcRenderer.invoke('mcp:listTools', spec),
    listResources: (spec) => ipcRenderer.invoke('mcp:listResources', spec),
    listPrompts: (spec) => ipcRenderer.invoke('mcp:listPrompts', spec),
    callTool: (spec, toolName, args) => ipcRenderer.invoke('mcp:callTool', spec, toolName, args),
    disconnect: (serverId) => ipcRenderer.invoke('mcp:disconnect', serverId),
  },

  infra: {
    httpRequest: (req) => ipcRenderer.invoke('infra:httpRequest', req),
    mockStart: (port, routes) => ipcRenderer.invoke('infra:mockStart', port, routes),
    mockStop: () => ipcRenderer.invoke('infra:mockStop'),
    mockSync: (routes) => ipcRenderer.invoke('infra:mockSync', routes),
    mockStatus: () => ipcRenderer.invoke('infra:mockStatus'),
    onMockTraffic: (cb) => {
      const handler = (_: unknown, ev: any) => cb(ev)
      ipcRenderer.on('infra:mockTraffic', handler)
      return () => ipcRenderer.removeListener('infra:mockTraffic', handler)
    },
    portsScan: () => ipcRenderer.invoke('infra:portsScan'),
    portsPing: (port, host) => ipcRenderer.invoke('infra:portsPing', port, host),
    portsKill: (pid) => ipcRenderer.invoke('infra:portsKill', pid),
    redisExec: (options) => ipcRenderer.invoke('infra:redisExec', options),
    redisSubscribe: (options) => ipcRenderer.invoke('infra:redisSubscribe', options),
    redisUnsubscribe: (id) => ipcRenderer.invoke('infra:redisUnsubscribe', id),
    onRedisPubSubEvent: (cb) => {
      const handler = (_: unknown, ev: any) => cb(ev)
      ipcRenderer.on('infra:redisPubSubEvent', handler)
      return () => ipcRenderer.removeListener('infra:redisPubSubEvent', handler)
    },
    sshExec: (spec) => ipcRenderer.invoke('infra:sshExec', spec),
    sftpList: (spec) => ipcRenderer.invoke('infra:sftpList', spec),
    sftpRead: (spec) => ipcRenderer.invoke('infra:sftpRead', spec),
    sftpWrite: (spec) => ipcRenderer.invoke('infra:sftpWrite', spec),
    sftpUpload: (spec) => ipcRenderer.invoke('infra:sftpUpload', spec),
    sftpDownload: (spec) => ipcRenderer.invoke('infra:sftpDownload', spec),
    sftpDelete: (spec) => ipcRenderer.invoke('infra:sftpDelete', spec),
    dockerExec: (args, timeoutOrOpts) => ipcRenderer.invoke('infra:dockerExec', args, timeoutOrOpts),
    k8sExec: (args, timeoutOrOpts) => ipcRenderer.invoke('infra:k8sExec', args, timeoutOrOpts),
    dbOpenSqlite: (filePath) => ipcRenderer.invoke('infra:dbOpenSqlite', filePath),
    dbCreateSqlite: (name, seedSql) => ipcRenderer.invoke('infra:dbCreateSqlite', name, seedSql),
    dbExecSqlite: (dbId, sql) => ipcRenderer.invoke('infra:dbExecSqlite', dbId, sql),
    dbSaveSqlite: (dbId, targetPath) => ipcRenderer.invoke('infra:dbSaveSqlite', dbId, targetPath),
    dbCloseSqlite: (dbId) => ipcRenderer.invoke('infra:dbCloseSqlite', dbId),
    dbExecCli: (options) => ipcRenderer.invoke('infra:dbExecCli', options),
    grpcInspectProto: (protoPath) => ipcRenderer.invoke('infra:grpcInspectProto', protoPath),
    grpcInvoke: (options) => ipcRenderer.invoke('infra:grpcInvoke', options),
    smtpSend: (options) => ipcRenderer.invoke('infra:smtpSend', options),
    wsConnect: (options) => ipcRenderer.invoke('infra:wsConnect', options),
    wsSend: (id, payload) => ipcRenderer.invoke('infra:wsSend', id, payload),
    wsPing: (id) => ipcRenderer.invoke('infra:wsPing', id),
    wsDisconnect: (id) => ipcRenderer.invoke('infra:wsDisconnect', id),
    onWsEvent: (cb) => {
      const handler = (_: unknown, ev: any) => cb(ev)
      ipcRenderer.on('infra:wsEvent', handler)
      return () => ipcRenderer.removeListener('infra:wsEvent', handler)
    },
    tcpConnect: (options) => ipcRenderer.invoke('infra:tcpConnect', options),
    tcpSend: (id, data) => ipcRenderer.invoke('infra:tcpSend', id, data),
    tcpDisconnect: (id) => ipcRenderer.invoke('infra:tcpDisconnect', id),
    onTcpEvent: (cb) => {
      const handler = (_: unknown, ev: any) => cb(ev)
      ipcRenderer.on('infra:tcpEvent', handler)
      return () => ipcRenderer.removeListener('infra:tcpEvent', handler)
    },
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
    setInstallOnExit: (enabled) => ipcRenderer.invoke('updater:setInstallOnExit', enabled),
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

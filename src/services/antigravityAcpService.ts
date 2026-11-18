/**
 * IndoctrinatedEdit - Antigravity Official ACP Client Service
 * Bridges the renderer UI to the Electron main-process ACP v1 JSON-RPC 2.0 stdio client,
 * spawning the user's locally installed, unmodified official `agy acp` binary (or any
 * ACP-compatible coding agent) so personal Pro/Ultra/Business Google subscriptions work
 * natively without extracting or proxying OAuth credentials.
 */

import {
  AcpAgentProfile,
  AcpBinaryDetection,
  AcpInstallResult,
  AcpMcpServerSpec,
  AcpStatusInfo,
  AcpStreamEvent,
} from '@sdk/types'
import { McpService } from './mcpService'

const STORAGE_KEY_PROFILE = 'indoctrinated_antigravity_acp_profile'
const ANTIGRAVITY_INSTALL_URL = 'https://antigravity.google/docs/cli/reference'

export const DEFAULT_ACP_PROFILES: AcpAgentProfile[] = [
  {
    id: 'antigravity',
    name: 'Google Antigravity (agy acp)',
    command: 'agy',
    args: ['acp'],
    description:
      'Official Google Antigravity CLI ACP server. Uses your authenticated Google personal (Free/Pro/Ultra) or business account directly.',
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI (ACP)',
    command: 'gemini',
    args: ['--experimental-acp'],
    description: 'Connects to a locally installed Gemini CLI running in ACP mode.',
  },
  {
    id: 'custom',
    name: 'Custom ACP Agent',
    command: 'agy',
    args: ['acp'],
    description: 'Point to any ACP v1-compatible CLI binary and arguments.',
  },
]

class AntigravityAcpService {
  private profile: AcpAgentProfile
  private status: AcpStatusInfo
  private eventListeners = new Set<(event: AcpStreamEvent) => void>()
  private statusListeners = new Set<(status: AcpStatusInfo) => void>()
  private ipcUnsubscribe: (() => void) | null = null

  constructor() {
    this.profile = this.loadProfile()
    this.status = {
      state: 'disconnected',
      binary: {
        installed: false,
        command: this.profile.command,
        installUrl: ANTIGRAVITY_INSTALL_URL,
      },
      sessionId: null,
    }
    this.attachIpcEvents()
  }

  private loadProfile(): AcpAgentProfile {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY_PROFILE)
        if (raw) {
          const parsed = JSON.parse(raw) as AcpAgentProfile
          if (parsed?.command && Array.isArray(parsed.args)) {
            return parsed
          }
        }
      }
    } catch {
      // ignore corrupted storage
    }
    return { ...DEFAULT_ACP_PROFILES[0] }
  }

  private attachIpcEvents(): void {
    if (this.ipcUnsubscribe) return
    if (typeof window !== 'undefined' && window.electronAPI?.antigravity?.onEvent) {
      this.ipcUnsubscribe = window.electronAPI.antigravity.onEvent((event) => {
        if (event.type === 'status') {
          this.status = event.status
          this.notifyStatus()
        }
        this.notifyEvent(event)
      })
    }
  }

  private notifyEvent(event: AcpStreamEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event)
      } catch (err) {
        console.error('[AntigravityAcpService] event listener error:', err)
      }
    }
  }

  private notifyStatus(): void {
    const snapshot = this.getStatus()
    for (const listener of this.statusListeners) {
      try {
        listener(snapshot)
      } catch (err) {
        console.error('[AntigravityAcpService] status listener error:', err)
      }
    }
  }

  public isElectronAvailable(): boolean {
    return typeof window !== 'undefined' && Boolean(window.electronAPI?.antigravity?.connect)
  }

  public getProfile(): AcpAgentProfile {
    return { ...this.profile, args: [...this.profile.args] }
  }

  public saveProfile(profile: AcpAgentProfile): void {
    this.profile = {
      ...profile,
      command: profile.command.trim() || 'agy',
      args: Array.isArray(profile.args) ? profile.args.filter(Boolean) : ['acp'],
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(this.profile))
      }
    } catch {
      // ignore storage quota errors
    }
  }

  public getStatus(): AcpStatusInfo {
    return { ...this.status }
  }

  public onEvent(listener: (event: AcpStreamEvent) => void): () => void {
    this.attachIpcEvents()
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  public onStatusChanged(listener: (status: AcpStatusInfo) => void): () => void {
    this.attachIpcEvents()
    this.statusListeners.add(listener)
    listener(this.getStatus())
    return () => this.statusListeners.delete(listener)
  }

  public async detectCli(command?: string): Promise<AcpBinaryDetection> {
    const target = command || this.profile.command
    if (!this.isElectronAvailable()) {
      const fallback: AcpBinaryDetection = {
        installed: false,
        command: target,
        installUrl: ANTIGRAVITY_INSTALL_URL,
        error: 'ACP stdio spawning requires running IndoctrinatedEdit as the Electron desktop app.',
      }
      this.status = { ...this.status, binary: fallback, lastError: fallback.error }
      this.notifyStatus()
      return fallback
    }

    this.attachIpcEvents()
    const binary = await window.electronAPI!.antigravity.detectCli(target)
    this.status = { ...this.status, binary }
    this.notifyStatus()
    return binary
  }

  public async syncStatus(): Promise<AcpStatusInfo> {
    if (!this.isElectronAvailable()) return this.getStatus()
    this.attachIpcEvents()
    const remote = await window.electronAPI!.antigravity.getStatus()
    this.status = remote
    this.notifyStatus()
    return remote
  }

  /**
   * Maps enabled external stdio/SSE MCP Studio servers into ACP v1 `mcpServers` format
   * so `agy acp` automatically inherits the user's configured MCP tools.
   */
  public collectAcpMcpServers(): AcpMcpServerSpec[] {
    try {
      return McpService.getServers()
        .filter((s) => s.enabled && (s.transport === 'stdio' || s.transport === 'sse'))
        .map((s) => {
          if (s.transport === 'sse' && s.url) {
            return {
              type: 'sse' as const,
              name: s.name,
              url: s.url,
              headers: s.headers
                ? Object.entries(s.headers).map(([name, value]) => ({ name, value }))
                : [],
            }
          }
          return {
            name: s.name,
            command: s.command || 'npx',
            args: s.args || [],
            env: s.env
              ? Object.entries(s.env).map(([name, value]) => ({ name, value }))
              : [],
          }
        })
    } catch {
      return []
    }
  }

  public async installCli(): Promise<AcpInstallResult> {
    if (!this.isElectronAvailable()) {
      return {
        success: false,
        error: 'Automatic CLI installation requires running IndoctrinatedEdit as the Electron desktop app.',
        logs: [],
      }
    }
    this.attachIpcEvents()
    const res = await window.electronAPI!.antigravity.installCli()
    if (res.binary) {
      this.status = { ...this.status, binary: res.binary }
      this.notifyStatus()
    }
    return res
  }

  public async launchCliLogin(command?: string): Promise<boolean> {
    if (!this.isElectronAvailable()) return false
    return await window.electronAPI!.antigravity.launchCliLogin(command || this.profile.command)
  }

  public async connect(cwd?: string): Promise<AcpStatusInfo> {
    if (!this.isElectronAvailable()) {
      this.status = {
        ...this.status,
        state: 'error',
        lastError: 'ACP stdio connections require the Electron desktop app.',
      }
      this.notifyStatus()
      return this.getStatus()
    }

    this.attachIpcEvents()
    const remote = await window.electronAPI!.antigravity.connect({
      command: this.profile.command,
      args: this.profile.args,
      cwd,
      mcpServers: this.collectAcpMcpServers(),
    })
    this.status = remote
    this.notifyStatus()
    return remote
  }

  public async disconnect(): Promise<void> {
    if (this.isElectronAvailable()) {
      await window.electronAPI!.antigravity.disconnect()
    }
    this.status = {
      ...this.status,
      state: 'disconnected',
      pid: undefined,
      sessionId: null,
    }
    this.notifyStatus()
  }

  public async authenticate(methodId: string): Promise<AcpStatusInfo> {
    if (!this.isElectronAvailable()) {
      throw new Error('ACP authentication requires the Electron desktop app.')
    }
    const remote = await window.electronAPI!.antigravity.authenticate(methodId)
    this.status = remote
    this.notifyStatus()
    return remote
  }

  public async newSession(cwd?: string): Promise<string> {
    if (!this.isElectronAvailable()) {
      throw new Error('ACP sessions require the Electron desktop app.')
    }
    return await window.electronAPI!.antigravity.newSession(cwd, this.collectAcpMcpServers())
  }

  public async sendPrompt(text: string): Promise<{ stopReason?: string }> {
    if (!this.isElectronAvailable()) {
      throw new Error('ACP prompt streaming requires the Electron desktop app.')
    }
    return await window.electronAPI!.antigravity.sendPrompt(text)
  }

  public async cancelPrompt(): Promise<void> {
    if (this.isElectronAvailable()) {
      await window.electronAPI!.antigravity.cancelPrompt()
    }
  }

  public async setMode(modeId: string): Promise<void> {
    if (this.isElectronAvailable()) {
      await window.electronAPI!.antigravity.setMode(modeId)
      this.status = { ...this.status, currentModeId: modeId }
      this.notifyStatus()
    }
  }

  public async setModel(modelId: string): Promise<void> {
    if (this.isElectronAvailable()) {
      await window.electronAPI!.antigravity.setModel(modelId)
      this.status = { ...this.status, currentModelId: modelId }
      this.notifyStatus()
    }
  }

  public async respondPermission(requestId: string | number, optionId: string | null): Promise<boolean> {
    if (!this.isElectronAvailable()) return false
    return await window.electronAPI!.antigravity.respondPermission(requestId, optionId)
  }

  public async getLogs(): Promise<string[]> {
    if (!this.isElectronAvailable()) return []
    return await window.electronAPI!.antigravity.getLogs()
  }

  public async openExternalUrl(url: string): Promise<void> {
    if (this.isElectronAvailable()) {
      await window.electronAPI!.antigravity.openExternalUrl(url)
    } else if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }
}

export const antigravityAcpService = new AntigravityAcpService()

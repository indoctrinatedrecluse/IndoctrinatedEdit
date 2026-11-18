/**
 * IndoctrinatedEdit — Real Remote Protocol Service (SSH, SFTP, Raw TCP/TLS, SMTP)
 *
 * Persists SSH host bookmarks in localStorage and bridges RemoteProtocolStudioView
 * directly to Electron's native OpenSSH (`ssh`/`scp`), raw TCP/TLS sockets, and
 * ESMTP/STARTTLS IPC handlers.
 */

export interface SshSessionBookmark {
  id: string
  name: string
  host: string
  port: number
  user: string
  authType: 'password' | 'key'
  keyPath?: string
  group: 'Production' | 'Staging' | 'Local' | 'Cloud'
  category?: string
  starred?: boolean
}

export interface RemoteFileItem {
  name: string
  type: 'file' | 'directory'
  size: string
  permissions: string
  modified: string
  content?: string
}

const BOOKMARKS_KEY = 'indoctrinated:remote:ssh_bookmarks_v1'

const DEFAULT_BOOKMARKS: SshSessionBookmark[] = [
  { id: 'bm-local', name: 'Local SSH Server', host: '127.0.0.1', port: 22, user: 'user', authType: 'key', group: 'Local', starred: true },
]

class RemoteProtocolService {
  private bookmarks: SshSessionBookmark[]

  constructor() {
    this.bookmarks = this.loadBookmarks()
  }

  private loadBookmarks(): SshSessionBookmark[] {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(BOOKMARKS_KEY) : null
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return [...DEFAULT_BOOKMARKS]
  }

  private saveBookmarks(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(this.bookmarks))
      }
    } catch {}
  }

  public getBookmarks(): SshSessionBookmark[] {
    return [...this.bookmarks]
  }

  public addBookmark(bm: Omit<SshSessionBookmark, 'id'>): SshSessionBookmark {
    const entry: SshSessionBookmark = { ...bm, id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }
    this.bookmarks = [entry, ...this.bookmarks]
    this.saveBookmarks()
    return entry
  }

  public deleteBookmark(id: string): void {
    this.bookmarks = this.bookmarks.filter((b) => b.id !== id)
    this.saveBookmarks()
  }

  public async sshExec(spec: {
    host: string
    port: number
    username: string
    keyPath?: string
    command: string
  }): Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number; latencyMs: number }> {
    const infra = typeof window !== 'undefined' ? (window as any).electronAPI?.infra : undefined
    if (!infra?.sshExec) {
      return {
        ok: false,
        stdout: '',
        stderr: 'Native OpenSSH execution requires the Electron desktop app.',
        exitCode: 1,
        latencyMs: 0,
      }
    }
    return await infra.sshExec(spec)
  }

  public async sftpList(spec: {
    host: string
    port: number
    username: string
    keyPath?: string
    remotePath: string
  }): Promise<{ ok: boolean; entries: RemoteFileItem[]; error?: string }> {
    const infra = typeof window !== 'undefined' ? (window as any).electronAPI?.infra : undefined
    if (!infra?.sftpList) {
      return { ok: false, entries: [], error: 'SFTP directory listing requires the Electron desktop app.' }
    }
    return await infra.sftpList(spec)
  }

  public async sftpRead(spec: {
    host: string
    port: number
    username: string
    keyPath?: string
    remoteFile: string
  }): Promise<{ ok: boolean; content?: string; error?: string }> {
    const infra = typeof window !== 'undefined' ? (window as any).electronAPI?.infra : undefined
    if (!infra?.sftpRead) {
      return { ok: false, error: 'SFTP file read requires the Electron desktop app.' }
    }
    return await infra.sftpRead(spec)
  }

  public async sftpWrite(spec: {
    host: string
    port: number
    username: string
    keyPath?: string
    remoteFile: string
    content: string
  }): Promise<{ ok: boolean; error?: string }> {
    const infra = typeof window !== 'undefined' ? (window as any).electronAPI?.infra : undefined
    if (!infra?.sftpWrite) {
      return { ok: false, error: 'SFTP file write requires the Electron desktop app.' }
    }
    return await infra.sftpWrite(spec)
  }

  public async sftpUpload(spec: {
    host: string
    port: number
    username: string
    keyPath?: string
    localPath: string
    remotePath: string
  }): Promise<{ ok: boolean; error?: string }> {
    const infra = typeof window !== 'undefined' ? (window as any).electronAPI?.infra : undefined
    if (!infra?.sftpUpload) {
      return { ok: false, error: 'SFTP upload requires the Electron desktop app.' }
    }
    return await infra.sftpUpload(spec)
  }

  public async sftpDelete(spec: {
    host: string
    port: number
    username: string
    keyPath?: string
    remoteFile: string
  }): Promise<{ ok: boolean; error?: string }> {
    const infra = typeof window !== 'undefined' ? (window as any).electronAPI?.infra : undefined
    if (!infra?.sftpDelete) {
      return { ok: false, error: 'SFTP delete requires the Electron desktop app.' }
    }
    return await infra.sftpDelete(spec)
  }

  public async sftpDownload(spec: {
    host: string
    port: number
    username: string
    keyPath?: string
    localPath: string
    remotePath: string
  }): Promise<{ ok: boolean; error?: string }> {
    const infra = typeof window !== 'undefined' ? (window as any).electronAPI?.infra : undefined
    if (!infra?.sftpDownload) {
      return { ok: false, error: 'SFTP download requires the Electron desktop app.' }
    }
    return await infra.sftpDownload(spec)
  }

  public async ftpList(spec: {
    host: string
    port?: number
    username: string
    password?: string
    remotePath: string
  }): Promise<{ ok: boolean; entries: RemoteFileItem[]; error?: string }> {
    const infra = typeof window !== 'undefined' ? (window as any).electronAPI?.infra : undefined
    if (!infra?.ftpList) {
      return { ok: false, entries: [], error: 'FTP directory listing requires the Electron desktop app.' }
    }
    return await infra.ftpList(spec)
  }

  public async ftpRead(spec: {
    host: string
    port?: number
    username: string
    password?: string
    remoteFile: string
  }): Promise<{ ok: boolean; content?: string; error?: string }> {
    const infra = typeof window !== 'undefined' ? (window as any).electronAPI?.infra : undefined
    if (!infra?.ftpRead) {
      return { ok: false, error: 'FTP file read requires the Electron desktop app.' }
    }
    return await infra.ftpRead(spec)
  }

  public async ftpWrite(spec: {
    host: string
    port?: number
    username: string
    password?: string
    remoteFile: string
    content: string
  }): Promise<{ ok: boolean; error?: string }> {
    const infra = typeof window !== 'undefined' ? (window as any).electronAPI?.infra : undefined
    if (!infra?.ftpWrite) {
      return { ok: false, error: 'FTP file write requires the Electron desktop app.' }
    }
    return await infra.ftpWrite(spec)
  }

  public async ftpDelete(spec: {
    host: string
    port?: number
    username: string
    password?: string
    remoteFile: string
  }): Promise<{ ok: boolean; error?: string }> {
    const infra = typeof window !== 'undefined' ? (window as any).electronAPI?.infra : undefined
    if (!infra?.ftpDelete) {
      return { ok: false, error: 'FTP file delete requires the Electron desktop app.' }
    }
    return await infra.ftpDelete(spec)
  }
}

export const remoteProtocolService = new RemoteProtocolService()

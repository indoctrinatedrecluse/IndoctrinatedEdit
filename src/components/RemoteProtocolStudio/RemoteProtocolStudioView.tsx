import React, { useState, useRef, useEffect } from 'react'
import {
  Server,
  Folder,
  FileCode,
  Mail,
  Wifi,
  Play,
  Square,
  RefreshCw,
  Upload,
  Download,
  Trash2,
  Edit3,
  CheckCircle2,
  Send,
  Terminal as TerminalIcon,
  Star,
  Lock,
  X,
} from 'lucide-react'
import {
  remoteProtocolService,
  SshSessionBookmark,
  RemoteFileItem,
} from '../../services/remoteProtocolService'
import './RemoteProtocolStudioView.css'

export type RemoteStudioTab = 'ssh' | 'sftp' | 'smtp' | 'telnet'

export const RemoteProtocolStudioView: React.FC<{ isDocked?: boolean; onClose?: () => void }> = ({
  isDocked = true,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<RemoteStudioTab>('ssh')

  // --- SSH State ---
  const [sshHost, setSshHost] = useState('127.0.0.1')
  const [sshPort, setSshPort] = useState(22)
  const [sshUser, setSshUser] = useState('root')
  const [sshAuthType, setSshAuthType] = useState<'password' | 'key'>('key')
  const [sshKeyPath, setSshKeyPath] = useState('')
  const [sshPassword, setSshPassword] = useState('')
  const [isSshConnected, setIsSshConnected] = useState(false)
  const [sshTerminalBuffer, setSshTerminalBuffer] = useState<string[]>([
    'IndoctrinatedEdit Remote Protocol Studio [Real OpenSSH / SFTP / FTP / SMTP / TCP-TLS]',
    'Configure host & key, then click Quick Connect to run real OpenSSH commands.',
  ])
  const [sshInput, setSshInput] = useState('')
  const [sshLatency, setSshLatency] = useState<number>(0)

  const [savedBookmarks, setSavedBookmarks] = useState<SshSessionBookmark[]>(() => remoteProtocolService.getBookmarks())

  // --- SFTP / FTP State ---
  const [fileProtocol, setFileProtocol] = useState<'sftp' | 'ftp'>('sftp')
  const [ftpPort, setFtpPort] = useState<number>(21)
  const [currentRemotePath, setCurrentRemotePath] = useState('/var/www')
  const [remoteFiles, setRemoteFiles] = useState<RemoteFileItem[]>([])
  const [selectedRemoteFile, setSelectedRemoteFile] = useState<RemoteFileItem | null>(null)
  const [editingFileContent, setEditingFileContent] = useState<string>('')
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false)
  const [transferStatus, setTransferStatus] = useState<string | null>(null)

  // --- SMTP State ---
  const [smtpHost, setSmtpHost] = useState('smtp.mailgun.org')
  const [smtpPort, setSmtpPort] = useState(587)
  const [smtpSecurity, setSmtpSecurity] = useState<'starttls' | 'ssl' | 'none'>('starttls')
  const [smtpUser, setSmtpUser] = useState('postmaster@sandbox.mailgun.org')
  const [smtpPass, setSmtpPass] = useState('')
  const [smtpFrom, setSmtpFrom] = useState('developer@example.com')
  const [smtpTo, setSmtpTo] = useState('recipient@example.com')
  const [smtpSubject, setSmtpSubject] = useState('IndoctrinatedEdit SMTP Diagnostic Test')
  const [smtpBody, setSmtpBody] = useState(
    '<h1>SMTP Diagnostic Passed</h1><p>Sent via IndoctrinatedEdit Remote Protocol Studio with STARTTLS handshake validation.</p>'
  )
  const [isSendingMail, setIsSendingMail] = useState(false)
  const [smtpHandshakeLogs, setSmtpHandshakeLogs] = useState<
    Array<{ type: 'client' | 'server' | 'info'; text: string; time: string }>
  >([
    { type: 'info', text: 'Ready to run real ESMTP/STARTTLS protocol handshake.', time: '00:00:00' },
  ])
  const [smtpResultStatus, setSmtpResultStatus] = useState<'idle' | 'success' | 'failed'>('idle')

  // --- Telnet / Raw TCP-TLS Socket State ---
  const [tcpHost, setTcpHost] = useState('127.0.0.1')
  const [tcpPort, setTcpPort] = useState(6379)
  const [tcpUseTls, setTcpUseTls] = useState(false)
  const [isTcpConnected, setIsTcpConnected] = useState(false)
  const [tcpPayload, setTcpPayload] = useState('PING\\r\\n')
  const [tcpLogs, setTcpLogs] = useState<string[]>([
    '[TCP Lab] Ready to open a real Node.js TCP/TLS socket.',
  ])
  const tcpSessionIdRef = useRef<string>('remote_tcp_1')

  useEffect(() => {
    const infra = typeof window !== 'undefined' ? (window as any).electronAPI?.infra : undefined
    if (!infra?.onTcpEvent) return
    const unsub = infra.onTcpEvent((ev: any) => {
      if (ev.id !== tcpSessionIdRef.current) return
      if (ev.type === 'data') {
        setTcpLogs((prev) => [...prev, `[RECV <<<] ${ev.data}`])
      } else if (ev.type === 'error') {
        setTcpLogs((prev) => [...prev, `[TCP ERROR] ${ev.error}`])
        setIsTcpConnected(false)
      } else if (ev.type === 'close') {
        setTcpLogs((prev) => [...prev, '[TCP] Remote socket closed.'])
        setIsTcpConnected(false)
      }
    })
    return () => {
      unsub()
      void infra.tcpDisconnect?.(tcpSessionIdRef.current)
    }
  }, [])

  const sshScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (sshScrollRef.current) {
      sshScrollRef.current.scrollTop = sshScrollRef.current.scrollHeight
    }
  }, [sshTerminalBuffer])

  // --- SSH Actions (Real OpenSSH via Electron IPC) ---
  const handleConnectSsh = async () => {
    if (isSshConnected) {
      setIsSshConnected(false)
      setSshTerminalBuffer((prev) => [
        ...prev,
        `[SSH] Disconnected from ${sshUser}@${sshHost}:${sshPort}.`,
      ])
      return
    }

    setSshTerminalBuffer((prev) => [
      ...prev,
      `[SSH] Connecting via OpenSSH to ${sshUser}@${sshHost}:${sshPort}...`,
    ])
    const res = await remoteProtocolService.sshExec({
      host: sshHost,
      port: sshPort,
      username: sshUser,
      keyPath: sshKeyPath || undefined,
      command: 'uname -a && pwd',
    })
    setSshLatency(res.latencyMs)
    if (res.ok) {
      setIsSshConnected(true)
      const lines = res.stdout.trim().split(/\r?\n/).filter(Boolean)
      setSshTerminalBuffer((prev) => [
        ...prev,
        `[SSH] Connected (${res.latencyMs}ms).`,
        ...lines,
      ])
      if (lines.length > 1) setCurrentRemotePath(lines[lines.length - 1].trim())
    } else {
      setIsSshConnected(false)
      setSshTerminalBuffer((prev) => [
        ...prev,
        `[SSH Error] ${res.stderr || `Exited with code ${res.exitCode}`}`,
      ])
    }
  }

  const handleSendSshCommand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sshInput.trim()) return

    const cmd = sshInput.trim()
    setSshInput('')

    if (cmd === 'clear' || cmd === 'cls') {
      setSshTerminalBuffer([])
      return
    }

    if (!isSshConnected) {
      setSshTerminalBuffer((prev) => [
        ...prev,
        `$ ${cmd}`,
        `[SSH Error] Not connected. Click Quick Connect first.`,
      ])
      return
    }

    setSshTerminalBuffer((prev) => [...prev, `${sshUser}@${sshHost}:$ ${cmd}`])
    const res = await remoteProtocolService.sshExec({
      host: sshHost,
      port: sshPort,
      username: sshUser,
      keyPath: sshKeyPath || undefined,
      command: cmd,
    })
    setSshLatency(res.latencyMs)
    const out = [res.stdout, res.stderr].filter(Boolean).join('\n').trim()
    setSshTerminalBuffer((prev) => [
      ...prev,
      out || `(exit code ${res.exitCode})`,
    ])
  }

  const handleSelectBookmark = (bm: SshSessionBookmark) => {
    setSshHost(bm.host)
    setSshPort(bm.port)
    setSshUser(bm.user)
    setSshAuthType(bm.authType)
    if (bm.keyPath) setSshKeyPath(bm.keyPath)
  }

  const handleSaveCurrentBookmark = () => {
    remoteProtocolService.addBookmark({
      name: `${sshUser}@${sshHost}`,
      host: sshHost,
      port: sshPort,
      user: sshUser,
      authType: sshAuthType,
      keyPath: sshKeyPath || undefined,
      group: 'Local',
      category: 'Local',
    })
    setSavedBookmarks(remoteProtocolService.getBookmarks())
  }

  const handleDeleteBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    remoteProtocolService.deleteBookmark(id)
    setSavedBookmarks(remoteProtocolService.getBookmarks())
  }

  // --- SFTP / FTP Actions (Real OpenSSH/SCP & Pure-Node RFC 959 FTP via Electron IPC) ---
  const handleRefreshSftp = async (targetPath = currentRemotePath) => {
    setTransferStatus(`[${fileProtocol.toUpperCase()}] Listing ${targetPath}...`)
    const res =
      fileProtocol === 'ftp'
        ? await remoteProtocolService.ftpList({
            host: sshHost,
            port: ftpPort,
            username: sshUser || 'anonymous',
            password: sshPassword,
            remotePath: targetPath,
          })
        : await remoteProtocolService.sftpList({
            host: sshHost,
            port: sshPort,
            username: sshUser,
            keyPath: sshKeyPath || undefined,
            remotePath: targetPath,
          })
    if (res.ok) {
      const parentEntry: RemoteFileItem = { name: '..', type: 'directory', size: '--', permissions: 'drwxr-xr-x', modified: '' }
      const withoutParent = res.entries.filter((e) => e.name !== '..')
      setRemoteFiles([parentEntry, ...withoutParent])
      setTransferStatus(`[${fileProtocol.toUpperCase()}] Loaded ${withoutParent.length} items from ${targetPath}`)
    } else {
      setTransferStatus(`${fileProtocol.toUpperCase()} Error: ${res.error || 'Failed to list directory'}`)
    }
  }

  const handleOpenRemoteFile = async (file: RemoteFileItem) => {
    if (file.type === 'directory') {
      let nextPath = currentRemotePath
      if (file.name === '..') {
        const parts = currentRemotePath.split('/').filter(Boolean)
        parts.pop()
        nextPath = '/' + parts.join('/')
      } else {
        nextPath = currentRemotePath.endsWith('/') ? currentRemotePath + file.name : currentRemotePath + '/' + file.name
      }
      setCurrentRemotePath(nextPath)
      await handleRefreshSftp(nextPath)
      return
    }

    const remoteFile = currentRemotePath.endsWith('/') ? currentRemotePath + file.name : currentRemotePath + '/' + file.name
    setTransferStatus(`[${fileProtocol.toUpperCase()}] Reading ${remoteFile}...`)
    const res =
      fileProtocol === 'ftp'
        ? await remoteProtocolService.ftpRead({
            host: sshHost,
            port: ftpPort,
            username: sshUser || 'anonymous',
            password: sshPassword,
            remoteFile,
          })
        : await remoteProtocolService.sftpRead({
            host: sshHost,
            port: sshPort,
            username: sshUser,
            keyPath: sshKeyPath || undefined,
            remoteFile,
          })
    if (res.ok) {
      setSelectedRemoteFile(file)
      setEditingFileContent(res.content || '')
      setIsEditModalOpen(true)
      setTransferStatus(null)
    } else {
      setTransferStatus(`Read failed: ${res.error}`)
    }
  }

  const handleSaveRemoteFile = async () => {
    if (!selectedRemoteFile) return
    const remoteFile = currentRemotePath.endsWith('/')
      ? currentRemotePath + selectedRemoteFile.name
      : currentRemotePath + '/' + selectedRemoteFile.name
    const res =
      fileProtocol === 'ftp'
        ? await remoteProtocolService.ftpWrite({
            host: sshHost,
            port: ftpPort,
            username: sshUser || 'anonymous',
            password: sshPassword,
            remoteFile,
            content: editingFileContent,
          })
        : await remoteProtocolService.sftpWrite({
            host: sshHost,
            port: sshPort,
            username: sshUser,
            keyPath: sshKeyPath || undefined,
            remoteFile,
            content: editingFileContent,
          })
    setIsEditModalOpen(false)
    if (res.ok) {
      setTransferStatus(`[${fileProtocol.toUpperCase()}] Saved ${remoteFile} to remote host.`)
      await handleRefreshSftp(currentRemotePath)
    } else {
      setTransferStatus(`Save failed: ${res.error}`)
    }
  }

  const handleDownloadRemoteFile = async (file: RemoteFileItem) => {
    const remoteFile = currentRemotePath.endsWith('/') ? currentRemotePath + file.name : currentRemotePath + '/' + file.name
    setTransferStatus(`[${fileProtocol.toUpperCase()}] Downloading ${file.name}...`)
    const readRes =
      fileProtocol === 'ftp'
        ? await remoteProtocolService.ftpRead({
            host: sshHost,
            port: ftpPort,
            username: sshUser || 'anonymous',
            password: sshPassword,
            remoteFile,
          })
        : await remoteProtocolService.sftpRead({
            host: sshHost,
            port: sshPort,
            username: sshUser,
            keyPath: sshKeyPath || undefined,
            remoteFile,
          })
    if (!readRes.ok) {
      setTransferStatus(`Download failed: ${readRes.error}`)
      return
    }
    const content = readRes.content || ''
    if (window.electronAPI?.saveFileAs) {
      const saved = await window.electronAPI.saveFileAs(file.name, content)
      setTransferStatus(saved ? `Downloaded ${file.name} to ${saved.path}` : 'Download canceled.')
    } else {
      const blob = new Blob([content], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
      setTransferStatus(`Downloaded ${file.name}`)
    }
  }

  const handleDeleteRemoteFile = async (file: RemoteFileItem) => {
    const remoteFile = currentRemotePath.endsWith('/') ? currentRemotePath + file.name : currentRemotePath + '/' + file.name
    setTransferStatus(`[${fileProtocol.toUpperCase()}] Deleting ${file.name}...`)
    const res =
      fileProtocol === 'ftp'
        ? await remoteProtocolService.ftpDelete({
            host: sshHost,
            port: ftpPort,
            username: sshUser || 'anonymous',
            password: sshPassword,
            remoteFile,
          })
        : await remoteProtocolService.sftpDelete({
            host: sshHost,
            port: sshPort,
            username: sshUser,
            keyPath: sshKeyPath || undefined,
            remoteFile,
          })
    if (res.ok) {
      setTransferStatus(`Deleted ${remoteFile}`)
      await handleRefreshSftp(currentRemotePath)
    } else {
      setTransferStatus(`Delete failed: ${res.error}`)
    }
  }

  const handleUploadFile = async () => {
    const picked = await window.electronAPI?.openFileDialog?.()
    if (!picked?.path) return
    setTransferStatus(`[${fileProtocol.toUpperCase()}] Uploading ${picked.name} to ${currentRemotePath}...`)
    let res: { ok: boolean; error?: string }
    if (fileProtocol === 'ftp') {
      const content = (await window.electronAPI?.readFile?.(picked.path)) ?? ''
      const remoteFile = currentRemotePath.endsWith('/') ? currentRemotePath + picked.name : currentRemotePath + '/' + picked.name
      res = await remoteProtocolService.ftpWrite({
        host: sshHost,
        port: ftpPort,
        username: sshUser || 'anonymous',
        password: sshPassword,
        remoteFile,
        content,
      })
    } else {
      res = await remoteProtocolService.sftpUpload({
        host: sshHost,
        port: sshPort,
        username: sshUser,
        keyPath: sshKeyPath || undefined,
        localPath: picked.path,
        remotePath: currentRemotePath,
      })
    }
    if (res.ok) {
      setTransferStatus(`Uploaded ${picked.name} successfully.`)
      await handleRefreshSftp(currentRemotePath)
    } else {
      setTransferStatus(`Upload failed: ${res.error}`)
    }
  }

  // --- SMTP Actions (Real Electron ESMTP/STARTTLS client with clean error reporting) ---
  const handleSendTestMail = async () => {
    setIsSendingMail(true)
    setSmtpResultStatus('idle')
    const now = () => new Date().toLocaleTimeString()

    setSmtpHandshakeLogs([
      { type: 'info', text: `Connecting to SMTP host ${smtpHost}:${smtpPort} (Security: ${smtpSecurity.toUpperCase()})...`, time: now() },
    ])

    if (typeof window !== 'undefined' && window.electronAPI?.infra?.smtpSend) {
      try {
        const res = await window.electronAPI.infra.smtpSend({
          host: smtpHost,
          port: Number(smtpPort) || 587,
          security: smtpSecurity,
          username: smtpUser || undefined,
          password: smtpPass && smtpPass !== '••••••••••••' ? smtpPass : undefined,
          from: smtpFrom,
          to: smtpTo,
          subject: smtpSubject,
          body: smtpBody,
        })
        setSmtpHandshakeLogs(res.transcript.map((t) => ({ ...t, time: now() })))
        if (res.ok) {
          setSmtpResultStatus('success')
        } else {
          setSmtpHandshakeLogs((prev) => [
            ...prev,
            { type: 'info', text: `SMTP Error: ${res.error || 'Delivery failed'}`, time: now() },
          ])
          setSmtpResultStatus('failed')
        }
      } catch (err: any) {
        setSmtpHandshakeLogs((prev) => [
          ...prev,
          { type: 'info', text: `SMTP Exception: ${err?.message || String(err)}`, time: now() },
        ])
        setSmtpResultStatus('failed')
      } finally {
        setIsSendingMail(false)
      }
      return
    }

    // Browser-only fallback when Electron IPC is unavailable
    setSmtpHandshakeLogs((prev) => [
      ...prev,
      { type: 'info', text: 'Real SMTP socket transmission requires the Electron desktop app.', time: now() },
    ])
    setIsSendingMail(false)
    setSmtpResultStatus('failed')
  }

  // --- Real Raw TCP / TLS Socket Actions via Electron IPC ---
  const handleToggleTcp = async () => {
    const infra = typeof window !== 'undefined' ? (window as any).electronAPI?.infra : undefined
    if (isTcpConnected) {
      await infra?.tcpDisconnect?.(tcpSessionIdRef.current)
      setIsTcpConnected(false)
      setTcpLogs((prev) => [...prev, `[TCP] Disconnected from ${tcpHost}:${tcpPort}.`])
      return
    }

    if (!infra?.tcpConnect) {
      setTcpLogs((prev) => [...prev, '[TCP Error] Raw TCP/TLS sockets require the Electron desktop app.'])
      return
    }

    setTcpLogs((prev) => [...prev, `[TCP] Opening ${tcpUseTls ? 'TLS' : 'TCP'} socket to ${tcpHost}:${tcpPort}...`])
    const res = await infra.tcpConnect({
      id: tcpSessionIdRef.current,
      host: tcpHost,
      port: Number(tcpPort),
      useTls: tcpUseTls,
    })
    if (res.ok) {
      setIsTcpConnected(true)
      setTcpLogs((prev) => [...prev, `[TCP] Connected to ${tcpHost}:${tcpPort} (${tcpUseTls ? 'TLS' : 'Plain TCP'}).`])
    } else {
      setIsTcpConnected(false)
      setTcpLogs((prev) => [...prev, `[TCP Error] ${res.error || 'Connection refused'}`])
    }
  }

  const handleSendTcpPayload = async () => {
    if (!isTcpConnected) {
      setTcpLogs((prev) => [...prev, `[TCP Error] Socket not connected.`])
      return
    }
    const infra = typeof window !== 'undefined' ? (window as any).electronAPI?.infra : undefined
    const clean = tcpPayload.replace(/\\r/g, '\r').replace(/\\n/g, '\n')
    setTcpLogs((prev) => [...prev, `[SEND >>>] ${JSON.stringify(clean)}`])
    const ok = await infra?.tcpSend?.(tcpSessionIdRef.current, clean)
    if (!ok) {
      setTcpLogs((prev) => [...prev, '[TCP Error] Failed to write payload to socket.'])
    }
  }

  return (
    <div className={`remote-protocol-studio-root ${isDocked ? 'docked' : ''}`}>
      {/* Top Header Navigation Strip */}
      <div className="remote-top-header">
        <div className="remote-header-left">
          <div className="remote-title-badge">
            <Server size={14} className="remote-icon" />
            <span>Remote Protocol Studio</span>
            <span className="pro-badge">PRO SUITE</span>
          </div>

          <div className="subtab-buttons-group">
            <button
              className={`subtab-btn ${activeSubTab === 'ssh' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('ssh')}
            >
              <TerminalIcon size={12} />
              <span>SSH Sessions</span>
            </button>

            <button
              className={`subtab-btn ${activeSubTab === 'sftp' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('sftp')}
            >
              <Folder size={12} />
              <span>SFTP / FTP Explorer</span>
            </button>

            <button
              className={`subtab-btn ${activeSubTab === 'smtp' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('smtp')}
            >
              <Mail size={12} />
              <span>SMTP Mail Lab</span>
            </button>

            <button
              className={`subtab-btn ${activeSubTab === 'telnet' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('telnet')}
            >
              <Wifi size={12} />
              <span>TCP Socket Lab</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Work Area */}
      <div className="remote-studio-body">
        {/* ======================= SSH TAB ======================= */}
        {activeSubTab === 'ssh' && (
          <div className="ssh-studio-pane">
            {/* Quick Connect & Bookmarks Bar */}
            <div className="ssh-quick-connect-bar glass-panel">
              <div className="qc-inputs-row">
                <div className="qc-field host-field">
                  <label>Host / IP</label>
                  <input
                    type="text"
                    value={sshHost}
                    onChange={(e) => setSshHost(e.target.value)}
                    placeholder="e.g. 192.168.1.100"
                  />
                </div>

                <div className="qc-field port-field">
                  <label>Port</label>
                  <input
                    type="number"
                    value={sshPort}
                    onChange={(e) => setSshPort(Number(e.target.value))}
                  />
                </div>

                <div className="qc-field user-field">
                  <label>User</label>
                  <input
                    type="text"
                    value={sshUser}
                    onChange={(e) => setSshUser(e.target.value)}
                    placeholder="root / ubuntu"
                  />
                </div>

                <div className="qc-field auth-field">
                  <label>Auth Mode</label>
                  <select
                    value={sshAuthType}
                    onChange={(e) => setSshAuthType(e.target.value as 'password' | 'key')}
                    style={{ background: 'rgba(15,23,42,0.7)', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '4px 6px', fontSize: 11 }}
                  >
                    <option value="key">SSH Key</option>
                    <option value="password">Password</option>
                  </select>
                </div>

                <div className="qc-field auth-field">
                  <label>{sshAuthType === 'key' ? 'Key Path' : 'Password'}</label>
                  {sshAuthType === 'key' ? (
                    <input
                      type="text"
                      value={sshKeyPath}
                      onChange={(e) => setSshKeyPath(e.target.value)}
                      placeholder="~/.ssh/id_ed25519 (optional)"
                    />
                  ) : (
                    <input
                      type="password"
                      value={sshPassword}
                      onChange={(e) => setSshPassword(e.target.value)}
                      placeholder="Password (used for FTP / auth)"
                    />
                  )}
                </div>

                <button
                  className="sftp-tool-btn"
                  onClick={handleSaveCurrentBookmark}
                  title="Save Host Bookmark"
                >
                  + Bookmark
                </button>

                <button
                  className={`qc-connect-btn ${isSshConnected ? 'connected' : ''}`}
                  onClick={() => void handleConnectSsh()}
                >
                  {isSshConnected ? (
                    <>
                      <Square size={12} fill="currentColor" /> Disconnect
                    </>
                  ) : (
                    <>
                      <Play size={12} fill="currentColor" /> Quick Connect
                    </>
                  )}
                </button>
              </div>

              {/* Saved Sessions Quick Selector */}
              <div className="saved-bookmarks-strip">
                <span className="strip-title">Bookmarks:</span>
                {savedBookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="bm-pill glass-interactive"
                    onClick={() => handleSelectBookmark(bm)}
                    title={`Connect to ${bm.user}@${bm.host}:${bm.port}`}
                  >
                    <Star
                      size={10}
                      className={`star-icon ${bm.starred ? 'starred' : ''}`}
                    />
                    <span className="bm-name">{bm.name}</span>
                    <span className={`bm-tag ${(bm.category || bm.group || 'Local').toLowerCase()}`}>
                      {bm.category || bm.group || 'Local'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteBookmark(bm.id, e)}
                      title="Delete Bookmark"
                      style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0, marginLeft: 4, display: 'inline-flex' }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Terminal Screen */}
            <div className="ssh-terminal-container glass-panel">
              <div className="ssh-terminal-header">
                <div className="ssh-status-indicators">
                  <span className={`status-dot ${isSshConnected ? 'online' : 'offline'}`} />
                  <span className="status-label">
                    {isSshConnected
                      ? `Connected: ${sshUser}@${sshHost}:${sshPort} (TLS/SSH2)`
                      : 'Terminal Offline'}
                  </span>
                  {isSshConnected && (
                    <span className="latency-badge">⚡ {sshLatency}ms Latency</span>
                  )}
                </div>

                <button
                  className="term-clear-btn"
                  onClick={() => setSshTerminalBuffer([])}
                  title="Clear Console"
                >
                  <Trash2 size={11} /> Clear
                </button>
              </div>

              <div className="ssh-terminal-viewport" ref={sshScrollRef}>
                {sshTerminalBuffer.map((line, idx) => (
                  <div key={idx} className="term-line">
                    {line.replace(/\x1b\[[0-9;]*m/g, '')}
                  </div>
                ))}
              </div>

              <form className="ssh-input-bar" onSubmit={handleSendSshCommand}>
                <span className="prompt-sym">❯</span>
                <input
                  type="text"
                  value={sshInput}
                  onChange={(e) => setSshInput(e.target.value)}
                  placeholder={
                    isSshConnected
                      ? "Execute command on remote server (e.g. ls, uname -a, df -h, ping 8.8.8.8)..."
                      : "Connect to start running remote commands..."
                  }
                  autoComplete="off"
                  spellCheck={false}
                />
                <button type="submit" className="exec-btn glass-interactive">
                  <Send size={12} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ======================= SFTP / FTP TAB ======================= */}
        {activeSubTab === 'sftp' && (
          <div className="sftp-studio-pane">
            {/* SFTP / FTP Toolbar */}
            <div className="sftp-toolbar glass-panel">
              <div className="sftp-path-bar" style={{ gap: 6, flexWrap: 'wrap' }}>
                <select
                  value={fileProtocol}
                  onChange={(e) => setFileProtocol(e.target.value as 'sftp' | 'ftp')}
                  style={{ background: 'rgba(15,23,42,0.75)', color: '#64D2FF', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 6, padding: '3px 6px', fontSize: 11, fontWeight: 600 }}
                  title="File Transfer Protocol"
                >
                  <option value="sftp">SFTP (OpenSSH)</option>
                  <option value="ftp">FTP (RFC 959)</option>
                </select>
                {fileProtocol === 'ftp' && (
                  <>
                    <input
                      type="number"
                      value={ftpPort}
                      onChange={(e) => setFtpPort(Number(e.target.value) || 21)}
                      style={{ width: 56, fontSize: 11 }}
                      className="path-input"
                      title="FTP Port (default 21)"
                    />
                    <input
                      type="password"
                      value={sshPassword}
                      onChange={(e) => setSshPassword(e.target.value)}
                      placeholder="FTP Password"
                      style={{ width: 110, fontSize: 11 }}
                      className="path-input"
                    />
                  </>
                )}
                <span className="path-label">Remote Path:</span>
                <input
                  type="text"
                  value={currentRemotePath}
                  onChange={(e) => setCurrentRemotePath(e.target.value)}
                  className="path-input"
                />
                <button
                  className="sftp-tool-btn"
                  onClick={() => void handleRefreshSftp(currentRemotePath)}
                  title={`Refresh Remote Directory (${fileProtocol.toUpperCase()})`}
                >
                  <RefreshCw size={12} />
                </button>
              </div>

              <div className="sftp-actions-group">
                <button className="sftp-tool-btn upload" onClick={() => void handleUploadFile()}>
                  <Upload size={12} /> Upload File...
                </button>
              </div>
            </div>

            {transferStatus && <div className="transfer-banner">{transferStatus}</div>}

            {/* Remote File Table */}
            <div className="sftp-file-grid-container glass-panel">
              <table className="sftp-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Size</th>
                    <th>Permissions</th>
                    <th>Modified</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {remoteFiles.map((file, idx) => (
                    <tr
                      key={idx}
                      className="file-row"
                      onDoubleClick={() => handleOpenRemoteFile(file)}
                    >
                      <td className="name-cell">
                        {file.type === 'directory' ? (
                          <Folder size={14} className="folder-icon" />
                        ) : (
                          <FileCode size={14} className="file-icon" />
                        )}
                        <span className="file-title">{file.name}</span>
                      </td>
                      <td className="size-cell">{file.size}</td>
                      <td className="perm-cell">
                        <code>{file.permissions}</code>
                      </td>
                      <td className="time-cell">{file.modified}</td>
                      <td className="actions-cell" style={{ display: 'flex', gap: 4 }}>
                        {file.type === 'file' && (
                          <>
                            <button
                              className="row-action-btn"
                              onClick={() => handleOpenRemoteFile(file)}
                              title="Edit Remote File"
                            >
                              <Edit3 size={11} /> Edit
                            </button>
                            <button
                              className="row-action-btn"
                              onClick={() => void handleDownloadRemoteFile(file)}
                              title="Download Remote File"
                            >
                              <Download size={11} />
                            </button>
                            <button
                              className="row-action-btn"
                              onClick={() => void handleDeleteRemoteFile(file)}
                              title="Delete Remote File"
                            >
                              <Trash2 size={11} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* In-Editor Remote File Edit Modal */}
            {isEditModalOpen && selectedRemoteFile && (
              <div className="remote-edit-modal-overlay">
                <div className="remote-edit-modal glass-panel">
                  <div className="modal-header">
                    <div className="modal-title">
                      <FileCode size={14} color="#64D2FF" />
                      <span>Remote File Editor: {selectedRemoteFile.name}</span>
                      <span className="path-tag">{currentRemotePath}/{selectedRemoteFile.name}</span>
                    </div>
                    <button
                      className="modal-close"
                      onClick={() => setIsEditModalOpen(false)}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="modal-body">
                    <textarea
                      value={editingFileContent}
                      onChange={(e) => setEditingFileContent(e.target.value)}
                      className="remote-code-textarea"
                      spellCheck={false}
                    />
                  </div>

                  <div className="modal-footer">
                    <button
                      className="modal-cancel-btn"
                      onClick={() => setIsEditModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="modal-save-btn"
                      onClick={handleSaveRemoteFile}
                    >
                      <Upload size={12} /> Save & Upload to Server
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================= SMTP TAB ======================= */}
        {activeSubTab === 'smtp' && (
          <div className="smtp-studio-pane">
            <div className="smtp-split-layout">
              {/* Left Column: Server Config & Email Composer */}
              <div className="smtp-config-col glass-panel">
                <div className="section-title">
                  <Mail size={13} color="#BF5AF2" />
                  <span>SMTP Server Configuration</span>
                </div>

                <div className="form-grid">
                  <div className="form-field full">
                    <label>SMTP Host</label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                    />
                  </div>

                  <div className="form-field half">
                    <label>Port</label>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                    />
                  </div>

                  <div className="form-field half">
                    <label>Security</label>
                    <select
                      value={smtpSecurity}
                      onChange={(e) => setSmtpSecurity(e.target.value as any)}
                    >
                      <option value="starttls">STARTTLS (Port 587)</option>
                      <option value="ssl">SSL / TLS (Port 465)</option>
                      <option value="none">Plain / None (Port 25)</option>
                    </select>
                  </div>

                  <div className="form-field half">
                    <label>Username / Login</label>
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                    />
                  </div>

                  <div className="form-field half">
                    <label>Password / API Token</label>
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                    />
                  </div>
                </div>

                <div className="section-title composer-title">
                  <Edit3 size={13} color="#64D2FF" />
                  <span>Email Envelope & Payload</span>
                </div>

                <div className="form-grid">
                  <div className="form-field half">
                    <label>Sender (MAIL FROM)</label>
                    <input
                      type="text"
                      value={smtpFrom}
                      onChange={(e) => setSmtpFrom(e.target.value)}
                    />
                  </div>

                  <div className="form-field half">
                    <label>Recipient (RCPT TO)</label>
                    <input
                      type="text"
                      value={smtpTo}
                      onChange={(e) => setSmtpTo(e.target.value)}
                    />
                  </div>

                  <div className="form-field full">
                    <label>Subject</label>
                    <input
                      type="text"
                      value={smtpSubject}
                      onChange={(e) => setSmtpSubject(e.target.value)}
                    />
                  </div>

                  <div className="form-field full">
                    <label>HTML / Text Message Body</label>
                    <textarea
                      rows={4}
                      value={smtpBody}
                      onChange={(e) => setSmtpBody(e.target.value)}
                      className="smtp-body-input"
                    />
                  </div>
                </div>

                <button
                  className="send-mail-btn glass-interactive"
                  onClick={handleSendTestMail}
                  disabled={isSendingMail}
                >
                  {isSendingMail ? (
                    <>
                      <RefreshCw size={13} className="spin-icon" /> Executing SMTP Handshake...
                    </>
                  ) : (
                    <>
                      <Send size={13} /> Send SMTP Test Email & Inspect Handshake
                    </>
                  )}
                </button>
              </div>

              {/* Right Column: Live SMTP Handshake Protocol Trace */}
              <div className="smtp-trace-col glass-panel">
                <div className="trace-header">
                  <div className="trace-title">
                    <Lock size={13} color="#30D158" />
                    <span>Live SMTP Handshake Inspector</span>
                  </div>

                  {smtpResultStatus === 'success' && (
                    <span className="handshake-badge success">
                      <CheckCircle2 size={11} /> 250 OK (Message Queued)
                    </span>
                  )}
                  {smtpResultStatus === 'failed' && (
                    <span className="handshake-badge" style={{ background: 'rgba(255,69,58,0.18)', color: '#FF453A', border: '1px solid rgba(255,69,58,0.4)' }}>
                      SMTP Delivery Failed
                    </span>
                  )}
                </div>

                <div className="trace-console">
                  {smtpHandshakeLogs.map((log, idx) => (
                    <div key={idx} className={`trace-row ${log.type}`}>
                      <span className="log-time">{log.time}</span>
                      <span className="log-role">
                        {log.type === 'client' ? '>>> CLIENT' : log.type === 'server' ? '<<< SERVER' : '--- INFO'}
                      </span>
                      <span className="log-msg">{log.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TELNET / TCP TAB ======================= */}
        {activeSubTab === 'telnet' && (
          <div className="telnet-studio-pane">
            <div className="telnet-config-bar glass-panel">
              <div className="tcp-field host">
                <label>Socket Target Host</label>
                <input
                  type="text"
                  value={tcpHost}
                  onChange={(e) => setTcpHost(e.target.value)}
                />
              </div>

              <div className="tcp-field port">
                <label>Port</label>
                <input
                  type="number"
                  value={tcpPort}
                  onChange={(e) => setTcpPort(Number(e.target.value))}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#CBD5E1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={tcpUseTls}
                  onChange={(e) => setTcpUseTls(e.target.checked)}
                />
                TLS
              </label>

              <button
                className={`tcp-toggle-btn ${isTcpConnected ? 'connected' : ''}`}
                onClick={() => void handleToggleTcp()}
              >
                {isTcpConnected ? 'Disconnect Socket' : 'Open Raw TCP Stream'}
              </button>
            </div>

            <div className="telnet-console-container glass-panel">
              <div className="telnet-viewport">
                {tcpLogs.map((line, idx) => (
                  <div key={idx} className="tcp-line">
                    {line}
                  </div>
                ))}
              </div>

              <div className="tcp-send-bar">
                <input
                  type="text"
                  value={tcpPayload}
                  onChange={(e) => setTcpPayload(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void handleSendTcpPayload()
                    }
                  }}
                  placeholder="Raw packet string (e.g. PING\r\n or GET / HTTP/1.1\r\n\r\n)..."
                />
                <button
                  className="tcp-send-btn glass-interactive"
                  onClick={() => void handleSendTcpPayload()}
                >
                  <Send size={12} /> Send Packet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

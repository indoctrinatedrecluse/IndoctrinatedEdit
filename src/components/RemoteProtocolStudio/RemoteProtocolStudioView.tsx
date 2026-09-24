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
  Trash2,
  Edit3,
  CheckCircle2,
  Send,
  Terminal as TerminalIcon,
  Star,
  Lock,
} from 'lucide-react'

export type RemoteStudioTab = 'ssh' | 'sftp' | 'smtp' | 'telnet'

interface SshSessionBookmark {
  id: string
  name: string
  host: string
  port: number
  user: string
  authType: 'password' | 'key'
  category: 'production' | 'staging' | 'database' | 'local'
  starred: boolean
  lastConnected?: string
}

interface RemoteFileItem {
  name: string
  type: 'file' | 'directory'
  size: string
  permissions: string
  modified: string
  content?: string
}

export const RemoteProtocolStudioView: React.FC<{ isDocked?: boolean; onClose?: () => void }> = ({
  isDocked = true,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<RemoteStudioTab>('ssh')

  // --- SSH State ---
  const [sshHost, setSshHost] = useState('192.168.1.120')
  const [sshPort, setSshPort] = useState(22)
  const [sshUser, setSshUser] = useState('root')
  const [sshAuthType, setSshAuthType] = useState<'password' | 'key'>('password')
  const [isSshConnected, setIsSshConnected] = useState(false)
  const [sshTerminalBuffer, setSshTerminalBuffer] = useState<string[]>([
    'IndoctrinatedEdit Remote Protocol Studio [SSH / SFTP / SMTP Suite v1.0.0]',
    'Type commands or connect to remote host to begin interactive SSH session.',
  ])
  const [sshInput, setSshInput] = useState('')
  const [sshLatency, setSshLatency] = useState<number>(18)

  const [savedBookmarks] = useState<SshSessionBookmark[]>([
    {
      id: 'bm-1',
      name: 'AWS Production Web Cluster',
      host: 'ec2-54-180-20-11.us-east-1.compute.amazonaws.com',
      port: 22,
      user: 'ubuntu',
      authType: 'key',
      category: 'production',
      starred: true,
      lastConnected: 'Today, 10:14 AM',
    },
    {
      id: 'bm-2',
      name: 'Staging K8s Ingress Node',
      host: '10.0.12.45',
      port: 2222,
      user: 'deploy',
      authType: 'password',
      category: 'staging',
      starred: true,
      lastConnected: 'Yesterday',
    },
    {
      id: 'bm-3',
      name: 'Database Primary (Postgres)',
      host: '192.168.1.200',
      port: 22,
      user: 'postgres',
      authType: 'key',
      category: 'database',
      starred: false,
      lastConnected: '3 days ago',
    },
    {
      id: 'bm-4',
      name: 'Raspberry Pi Home Gateway',
      host: '192.168.1.1',
      port: 22,
      user: 'pi',
      authType: 'password',
      category: 'local',
      starred: false,
      lastConnected: 'Sep 21, 2026',
    },
  ])

  // --- SFTP State ---
  const [currentRemotePath, setCurrentRemotePath] = useState('/var/www/html/app')
  const [remoteFiles, setRemoteFiles] = useState<RemoteFileItem[]>([
    { name: '..', type: 'directory', size: '-', permissions: 'drwxr-xr-x', modified: '2026-09-24 08:00' },
    { name: 'src', type: 'directory', size: '4.0 KB', permissions: 'drwxr-xr-x', modified: '2026-09-24 09:12' },
    { name: 'config', type: 'directory', size: '4.0 KB', permissions: 'drwxr-xr-x', modified: '2026-09-23 18:40' },
    { name: 'logs', type: 'directory', size: '12.4 KB', permissions: 'drwxrwxr-x', modified: '2026-09-24 10:30' },
    { name: 'server.js', type: 'file', size: '18.2 KB', permissions: '-rw-r--r--', modified: '2026-09-24 10:05', content: 'const express = require("express");\nconst app = express();\napp.get("/health", (req, res) => res.json({ status: "ok" }));\napp.listen(3000);' },
    { name: 'package.json', type: 'file', size: '1.4 KB', permissions: '-rw-r--r--', modified: '2026-09-24 09:30', content: '{\n  "name": "remote-app",\n  "version": "1.0.0",\n  "dependencies": {\n    "express": "^4.19.2"\n  }\n}' },
    { name: '.env.production', type: 'file', size: '420 B', permissions: '-rw-------', modified: '2026-09-22 14:15', content: 'PORT=3000\nNODE_ENV=production\nDB_HOST=10.0.12.45' },
    { name: 'docker-compose.yml', type: 'file', size: '2.1 KB', permissions: '-rw-r--r--', modified: '2026-09-20 11:20', content: 'version: "3.8"\nservices:\n  web:\n    build: .\n    ports:\n      - "80:3000"' },
  ])
  const [selectedRemoteFile, setSelectedRemoteFile] = useState<RemoteFileItem | null>(null)
  const [editingFileContent, setEditingFileContent] = useState<string>('')
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false)
  const [transferStatus, setTransferStatus] = useState<string | null>(null)

  // --- SMTP State ---
  const [smtpHost, setSmtpHost] = useState('smtp.mailgun.org')
  const [smtpPort, setSmtpPort] = useState(587)
  const [smtpSecurity, setSmtpSecurity] = useState<'starttls' | 'ssl' | 'none'>('starttls')
  const [smtpUser, setSmtpUser] = useState('postmaster@sandbox.mailgun.org')
  const [smtpPass, setSmtpPass] = useState('••••••••••••')
  const [smtpFrom, setSmtpFrom] = useState('developer@indoctrinated.io')
  const [smtpTo, setSmtpTo] = useState('admin@client.com')
  const [smtpSubject, setSmtpSubject] = useState('🚀 IndoctrinatedEdit SMTP Diagnostic Test')
  const [smtpBody, setSmtpBody] = useState(
    '<h1>SMTP Diagnostic Passed</h1><p>Sent securely via IndoctrinatedEdit Remote Protocol Studio with STARTTLS handshake validation.</p>'
  )
  const [isSendingMail, setIsSendingMail] = useState(false)
  const [smtpHandshakeLogs, setSmtpHandshakeLogs] = useState<
    Array<{ type: 'client' | 'server' | 'info'; text: string; time: string }>
  >([
    { type: 'info', text: 'Ready to run SMTP protocol handshake diagnosis.', time: '00:00:00' },
  ])
  const [smtpResultStatus, setSmtpResultStatus] = useState<'idle' | 'success' | 'failed'>('idle')

  // --- Telnet / Raw TCP Socket State ---
  const [tcpHost, setTcpHost] = useState('127.0.0.1')
  const [tcpPort, setTcpPort] = useState(6379)
  const [isTcpConnected, setIsTcpConnected] = useState(false)
  const [tcpPayload, setTcpPayload] = useState('PING\r\n')
  const [tcpLogs, setTcpLogs] = useState<string[]>([
    '[TCP Lab] Ready to connect to raw socket endpoints.',
  ])

  const sshScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (sshScrollRef.current) {
      sshScrollRef.current.scrollTop = sshScrollRef.current.scrollHeight
    }
  }, [sshTerminalBuffer])

  // --- SSH Actions ---
  const handleConnectSsh = () => {
    if (isSshConnected) {
      setIsSshConnected(false)
      setSshTerminalBuffer((prev) => [
        ...prev,
        `\x1b[33m[SSH] Connection to ${sshUser}@${sshHost}:${sshPort} terminated by user.\x1b[0m`,
      ])
      return
    }

    setIsSshConnected(true)
    setSshLatency(Math.floor(Math.random() * 20) + 12)
    setSshTerminalBuffer((prev) => [
      ...prev,
      `\x1b[36m[SSH] Initiating handshake to ${sshUser}@${sshHost}:${sshPort}...\x1b[0m`,
      `\x1b[32m[SSH] Host key verified (SHA256:4tM8nK9wP3xQ7vL2bZ0yR1). Authenticated as ${sshUser}.\x1b[0m`,
      `\x1b[32m[SSH] Interactive pseudo-terminal (xterm-256color) allocated.\x1b[0m`,
      `Welcome to Ubuntu 24.04.1 LTS (GNU/Linux 6.8.0-40-generic x86_64)`,
      ` * Documentation:  https://help.ubuntu.com`,
      ` * Management:     https://landscape.canonical.com`,
      ` * Support:        https://ubuntu.com/pro`,
      `Last login: Thu Sep 24 10:15:22 2026 from 192.168.1.50`,
      `${sshUser}@${sshHost.split('.')[0]}:~$ `,
    ])
  }

  const handleSendSshCommand = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sshInput.trim()) return

    const cmd = sshInput.trim()
    setSshInput('')

    if (!isSshConnected) {
      setSshTerminalBuffer((prev) => [
        ...prev,
        `$ ${cmd}`,
        `\x1b[31m[SSH Error] Not connected. Connect to a host or select a bookmark above.\x1b[0m`,
      ])
      return
    }

    setSshTerminalBuffer((prev) => [...prev, `${sshUser}@${sshHost.split('.')[0]}:~$ ${cmd}`])

    setTimeout(() => {
      if (cmd === 'clear' || cmd === 'cls') {
        setSshTerminalBuffer([`${sshUser}@${sshHost.split('.')[0]}:~$ `])
        return
      }
      if (cmd === 'uname -a') {
        setSshTerminalBuffer((prev) => [
          ...prev,
          `Linux ubuntu-node-01 6.8.0-40-generic #40-Ubuntu SMP PREEMPT_DYNAMIC x86_64 x86_64 x86_64 GNU/Linux`,
        ])
      } else if (cmd === 'ls' || cmd === 'ls -la' || cmd === 'll') {
        setSshTerminalBuffer((prev) => [
          ...prev,
          `total 48\ndrwxr-xr-x 6 ${sshUser} ${sshUser} 4096 Sep 24 10:20 .\ndrwxr-xr-x 3 root root 4096 Sep 20 12:00 ..\n-rw------- 1 ${sshUser} ${sshUser} 1250 Sep 24 10:15 .bash_history\n-rw-r--r-- 1 ${sshUser} ${sshUser}  220 Sep 20 12:00 .bash_logout\n-rw-r--r-- 1 ${sshUser} ${sshUser} 3771 Sep 20 12:00 .bashrc\ndrwx------ 2 ${sshUser} ${sshUser} 4096 Sep 20 12:05 .ssh\ndrwxr-xr-x 4 ${sshUser} ${sshUser} 4096 Sep 24 09:30 app`,
        ])
      } else if (cmd.startsWith('ping')) {
        setSshTerminalBuffer((prev) => [
          ...prev,
          `PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.\n64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=8.42 ms\n64 bytes from 8.8.8.8: icmp_seq=2 ttl=118 time=8.19 ms\n--- 8.8.8.8 ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss, time 1001ms`,
        ])
      } else if (cmd === 'df -h') {
        setSshTerminalBuffer((prev) => [
          ...prev,
          `Filesystem      Size  Used Avail Use% Mounted on\n/dev/root        48G   14G   32G  31% /\ntmpfs           3.9G     0  3.9G   0% /dev/shm`,
        ])
      } else {
        setSshTerminalBuffer((prev) => [
          ...prev,
          `[remote: ${cmd}] -> Executed successfully (exit code: 0).`,
        ])
      }
    }, 120)
  }

  const handleSelectBookmark = (bm: SshSessionBookmark) => {
    setSshHost(bm.host)
    setSshPort(bm.port)
    setSshUser(bm.user)
    setSshAuthType(bm.authType)
  }

  // --- SFTP Actions ---
  const handleOpenRemoteFile = (file: RemoteFileItem) => {
    if (file.type === 'directory') {
      if (file.name === '..') {
        const parts = currentRemotePath.split('/').filter(Boolean)
        parts.pop()
        setCurrentRemotePath('/' + parts.join('/'))
      } else {
        setCurrentRemotePath((prev) => (prev.endsWith('/') ? prev + file.name : prev + '/' + file.name))
      }
      return
    }

    setSelectedRemoteFile(file)
    setEditingFileContent(file.content || `// Remote file: ${file.name}\n// Size: ${file.size}\n`)
    setIsEditModalOpen(true)
  }

  const handleSaveRemoteFile = () => {
    if (!selectedRemoteFile) return
    setRemoteFiles((prev) =>
      prev.map((f) =>
        f.name === selectedRemoteFile.name ? { ...f, content: editingFileContent, modified: 'Just now' } : f
      )
    )
    setIsEditModalOpen(false)
    setTransferStatus(`Saved & synced ${selectedRemoteFile.name} to remote server!`)
    setTimeout(() => setTransferStatus(null), 3000)
  }

  const handleUploadSimulator = () => {
    setTransferStatus('Uploading local workspace bundle to remote server...')
    setTimeout(() => {
      setRemoteFiles((prev) => [
        ...prev,
        {
          name: `upload-${Date.now().toString(36)}.tar.gz`,
          type: 'file',
          size: '48.5 KB',
          permissions: '-rw-r--r--',
          modified: 'Just now',
          content: 'TAR GZ binary payload',
        },
      ])
      setTransferStatus('Upload completed! (48.5 KB transferred)')
      setTimeout(() => setTransferStatus(null), 3000)
    }, 1000)
  }

  // --- SMTP Actions ---
  const handleSendTestMail = () => {
    setIsSendingMail(true)
    setSmtpResultStatus('idle')
    const now = () => new Date().toLocaleTimeString()

    setSmtpHandshakeLogs([
      { type: 'info', text: `Connecting to SMTP host ${smtpHost}:${smtpPort} (Security: ${smtpSecurity.toUpperCase()})...`, time: now() },
    ])

    setTimeout(() => {
      setSmtpHandshakeLogs((prev) => [
        ...prev,
        { type: 'server', text: `220 ${smtpHost} ESMTP Indoctrinated Mail Service ready`, time: now() },
        { type: 'client', text: `EHLO client.indoctrinated.io`, time: now() },
        { type: 'server', text: `250-${smtpHost} at your service, [192.168.1.50]\n250-SIZE 35882577\n250-8BITMIME\n250-AUTH LOGIN PLAIN\n250-STARTTLS\n250 ENHANCEDSTATUSCODES`, time: now() },
      ])
    }, 400)

    setTimeout(() => {
      setSmtpHandshakeLogs((prev) => [
        ...prev,
        { type: 'client', text: `STARTTLS`, time: now() },
        { type: 'server', text: `220 2.0.0 Ready to start TLS (TLSv1.3, TLS_AES_256_GCM_SHA384)`, time: now() },
        { type: 'client', text: `AUTH LOGIN ${btoa(smtpUser)}`, time: now() },
        { type: 'server', text: `235 2.7.0 Authentication successful`, time: now() },
      ])
    }, 800)

    setTimeout(() => {
      setSmtpHandshakeLogs((prev) => [
        ...prev,
        { type: 'client', text: `MAIL FROM:<${smtpFrom}>`, time: now() },
        { type: 'server', text: `250 2.1.0 Ok`, time: now() },
        { type: 'client', text: `RCPT TO:<${smtpTo}>`, time: now() },
        { type: 'server', text: `250 2.1.5 Ok`, time: now() },
        { type: 'client', text: `DATA\nSubject: ${smtpSubject}\nFrom: ${smtpFrom}\nTo: ${smtpTo}\nContent-Type: text/html; charset=UTF-8\n\n${smtpBody}\n.`, time: now() },
        { type: 'server', text: `250 2.0.0 Ok: queued as ID-${Math.random().toString(36).substring(2, 9).toUpperCase()}`, time: now() },
        { type: 'client', text: `QUIT`, time: now() },
        { type: 'server', text: `221 2.0.0 ${smtpHost} closing transmission channel`, time: now() },
      ])
      setIsSendingMail(false)
      setSmtpResultStatus('success')
    }, 1300)
  }

  // --- Telnet / TCP Actions ---
  const handleToggleTcp = () => {
    if (isTcpConnected) {
      setIsTcpConnected(false)
      setTcpLogs((prev) => [...prev, `[TCP] Disconnected from ${tcpHost}:${tcpPort}.`])
      return
    }

    setIsTcpConnected(true)
    setTcpLogs((prev) => [
      ...prev,
      `[TCP] Connecting to ${tcpHost}:${tcpPort}...`,
      `[TCP] Socket Connected! Local: 127.0.0.1:54321 <-> Remote: ${tcpHost}:${tcpPort}`,
      `[TCP] Ready for raw stream duplex IO.`,
    ])
  }

  const handleSendTcpPayload = () => {
    if (!isTcpConnected) {
      setTcpLogs((prev) => [...prev, `[TCP Error] Socket not connected.`])
      return
    }
    const clean = tcpPayload.replace(/\\r/g, '\r').replace(/\\n/g, '\n')
    setTcpLogs((prev) => [
      ...prev,
      `[SEND >>>] ${JSON.stringify(clean)}`,
    ])

    setTimeout(() => {
      if (clean.includes('PING')) {
        setTcpLogs((prev) => [...prev, `[RECV <<<] +PONG\r\n`])
      } else if (clean.includes('INFO')) {
        setTcpLogs((prev) => [
          ...prev,
          `[RECV <<<] # Server\r\nredis_version:7.2.4\r\nos:Linux 6.8.0-40-generic x86_64\r\ntcp_port:${tcpPort}\r\nuptime_in_seconds:348912\r\n`,
        ])
      } else {
        setTcpLogs((prev) => [...prev, `[RECV <<<] +OK\r\n`])
      }
    }, 100)
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
              <span>SFTP Explorer</span>
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
                  <label>Auth Type</label>
                  <select
                    value={sshAuthType}
                    onChange={(e) => setSshAuthType(e.target.value as any)}
                  >
                    <option value="password">Password</option>
                    <option value="key">Private Key (PEM/PPK)</option>
                  </select>
                </div>

                <button
                  className={`qc-connect-btn ${isSshConnected ? 'connected' : ''}`}
                  onClick={handleConnectSsh}
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
                    <span className={`bm-tag ${bm.category}`}>{bm.category}</span>
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
                    {line}
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

        {/* ======================= SFTP TAB ======================= */}
        {activeSubTab === 'sftp' && (
          <div className="sftp-studio-pane">
            {/* SFTP Toolbar */}
            <div className="sftp-toolbar glass-panel">
              <div className="sftp-path-bar">
                <span className="path-label">Remote Path:</span>
                <input
                  type="text"
                  value={currentRemotePath}
                  onChange={(e) => setCurrentRemotePath(e.target.value)}
                  className="path-input"
                />
                <button
                  className="sftp-tool-btn"
                  onClick={() => setTransferStatus('Refreshed directory listing')}
                  title="Refresh Folder"
                >
                  <RefreshCw size={12} />
                </button>
              </div>

              <div className="sftp-actions-group">
                <button className="sftp-tool-btn upload" onClick={handleUploadSimulator}>
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
                      <td className="actions-cell">
                        {file.type === 'file' && (
                          <button
                            className="row-action-btn"
                            onClick={() => handleOpenRemoteFile(file)}
                            title="Edit Remote File"
                          >
                            <Edit3 size={11} /> Edit
                          </button>
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

              <button
                className={`tcp-toggle-btn ${isTcpConnected ? 'connected' : ''}`}
                onClick={handleToggleTcp}
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
                  placeholder="Raw packet string (e.g. PING\r\n or GET / HTTP/1.1\r\n\r\n)..."
                />
                <button
                  className="tcp-send-btn glass-interactive"
                  onClick={handleSendTcpPayload}
                >
                  <Send size={12} /> Send Packet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .remote-protocol-studio-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(10, 14, 26, 0.96);
          color: var(--text-primary);
          overflow: hidden;
          font-family: var(--font-ui);
        }

        .remote-top-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 14px;
          background: rgba(0, 0, 0, 0.35);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        .remote-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .remote-title-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #FFF;
          white-space: nowrap;
        }

        .remote-icon {
          color: #64D2FF;
        }

        .pro-badge {
          font-size: 9px;
          font-weight: 800;
          color: #BF5AF2;
          background: rgba(191, 90, 242, 0.15);
          border: 1px solid rgba(191, 90, 242, 0.35);
          padding: 1px 5px;
          border-radius: 4px;
        }

        .subtab-buttons-group {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 2px;
          border-radius: 6px;
        }

        .subtab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 4px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .subtab-btn:hover {
          color: #FFF;
          background: rgba(255, 255, 255, 0.06);
        }

        .subtab-btn.active {
          background: rgba(10, 132, 255, 0.2);
          color: #64D2FF;
          box-shadow: 0 0 8px rgba(10, 132, 255, 0.2);
        }

        .remote-studio-body {
          flex: 1;
          display: flex;
          overflow: hidden;
          padding: 12px;
        }

        /* SSH Pane */
        .ssh-studio-pane {
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 10px;
          overflow: hidden;
        }

        .ssh-quick-connect-bar {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(14, 18, 30, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          flex-shrink: 0;
        }

        .qc-inputs-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .qc-field {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .qc-field label {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.3px;
        }

        .qc-field input, .qc-field select {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 4px 8px;
          color: #FFF;
          font-size: 11.5px;
          font-family: var(--font-mono);
          outline: none;
        }

        .qc-field.host-field { flex: 2; min-width: 150px; }
        .qc-field.port-field { width: 65px; }
        .qc-field.user-field { width: 100px; }
        .qc-field.auth-field { width: 130px; }

        .qc-connect-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 4px;
          border: 1px solid rgba(48, 209, 88, 0.4);
          background: rgba(48, 209, 88, 0.18);
          color: #30D158;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          height: 28px;
        }

        .qc-connect-btn:hover {
          background: rgba(48, 209, 88, 0.3);
          color: #FFF;
          box-shadow: 0 0 10px rgba(48, 209, 88, 0.3);
        }

        .qc-connect-btn.connected {
          background: rgba(255, 69, 58, 0.18);
          border-color: rgba(255, 69, 58, 0.4);
          color: #FF453A;
        }

        .saved-bookmarks-strip {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
          padding-top: 4px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .strip-title {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .bm-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 2px 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 10.5px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.12s ease;
        }

        .bm-pill:hover {
          background: rgba(255, 255, 255, 0.09);
          color: #FFF;
        }

        .star-icon.starred { color: #FFD60A; fill: #FFD60A; }
        .bm-tag { font-size: 8.5px; font-weight: 800; padding: 1px 3px; border-radius: 2px; }
        .bm-tag.production { background: rgba(255, 69, 58, 0.2); color: #FF453A; }
        .bm-tag.staging { background: rgba(255, 159, 10, 0.2); color: #FF9F0A; }
        .bm-tag.database { background: rgba(48, 209, 88, 0.2); color: #30D158; }
        .bm-tag.local { background: rgba(100, 210, 255, 0.2); color: #64D2FF; }

        .ssh-terminal-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: rgba(10, 14, 24, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          overflow: hidden;
        }

        .ssh-terminal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          background: rgba(0, 0, 0, 0.35);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 11px;
        }

        .ssh-status-indicators {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .status-dot.online { background: #30D158; box-shadow: 0 0 6px #30D158; }
        .status-dot.offline { background: #8E8E93; }

        .latency-badge {
          font-size: 9.5px;
          color: #64D2FF;
          background: rgba(100, 210, 255, 0.12);
          padding: 1px 6px;
          border-radius: 3px;
        }

        .term-clear-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 10.5px;
        }

        .term-clear-btn:hover { color: #FFF; }

        .ssh-terminal-viewport {
          flex: 1;
          padding: 10px 14px;
          overflow-y: auto;
          font-family: var(--font-mono);
          font-size: 12px;
          line-height: 1.45;
          color: #E6EDF3;
          user-select: text;
        }

        .term-line { white-space: pre-wrap; word-break: break-all; }

        .ssh-input-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(0, 0, 0, 0.3);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .prompt-sym { color: #30D158; font-weight: 800; }
        .ssh-input-bar input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #FFF;
          font-family: var(--font-mono);
          font-size: 12px;
        }

        .exec-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          width: 24px;
          height: 24px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .exec-btn:hover { background: rgba(10, 132, 255, 0.25); color: #FFF; }

        /* SFTP Styles */
        .sftp-studio-pane {
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 10px;
          overflow: hidden;
        }

        .sftp-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: rgba(14, 18, 30, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          gap: 10px;
          flex-shrink: 0;
        }

        .sftp-path-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .path-label { font-size: 11px; font-weight: 700; color: var(--text-muted); }
        .path-input {
          flex: 1;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 4px 8px;
          color: #64D2FF;
          font-family: var(--font-mono);
          font-size: 11.5px;
          outline: none;
        }

        .sftp-tool-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }

        .sftp-tool-btn:hover { background: rgba(255, 255, 255, 0.1); color: #FFF; }
        .sftp-tool-btn.upload { background: rgba(10, 132, 255, 0.2); border-color: rgba(10, 132, 255, 0.4); color: #64D2FF; }

        .transfer-banner {
          padding: 6px 12px;
          background: rgba(48, 209, 88, 0.15);
          border: 1px solid rgba(48, 209, 88, 0.3);
          border-radius: 6px;
          font-size: 11px;
          color: #30D158;
          font-weight: 600;
        }

        .sftp-file-grid-container {
          flex: 1;
          background: rgba(10, 14, 24, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          overflow: auto;
        }

        .sftp-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11.5px;
        }

        .sftp-table th {
          text-align: left;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.3);
          color: var(--text-muted);
          font-weight: 700;
          font-size: 10.5px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .sftp-table td {
          padding: 7px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }

        .file-row { cursor: pointer; transition: background 0.1s ease; }
        .file-row:hover { background: rgba(255, 255, 255, 0.05); }

        .name-cell { display: flex; align-items: center; gap: 8px; font-weight: 500; }
        .folder-icon { color: #FFD60A; }
        .file-icon { color: #64D2FF; }
        .perm-cell code { font-family: var(--font-mono); color: #8E8E93; font-size: 10.5px; }

        .row-action-btn {
          display: flex;
          align-items: center;
          gap: 3px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
          cursor: pointer;
        }

        .row-action-btn:hover { background: rgba(10, 132, 255, 0.3); color: #FFF; }

        /* Remote File Edit Modal */
        .remote-edit-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .remote-edit-modal {
          width: 650px;
          height: 480px;
          background: rgba(14, 18, 30, 0.96);
          border: var(--specular-border);
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.8);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .modal-title { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 12.5px; }
        .path-tag { font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); }
        .modal-close { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 14px; }

        .modal-body { flex: 1; padding: 12px; display: flex; }
        .remote-code-textarea {
          flex: 1;
          width: 100%;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 10px;
          color: #FFF;
          font-family: var(--font-mono);
          font-size: 12px;
          line-height: 1.5;
          resize: none;
          outline: none;
        }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          padding: 10px 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .modal-cancel-btn {
          padding: 6px 12px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          border-radius: 4px;
          cursor: pointer;
        }

        .modal-save-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 14px;
          background: rgba(48, 209, 88, 0.25);
          border: 1px solid rgba(48, 209, 88, 0.5);
          color: #30D158;
          font-weight: 700;
          border-radius: 4px;
          cursor: pointer;
        }

        /* SMTP Styles */
        .smtp-studio-pane { flex: 1; display: flex; overflow: hidden; }
        .smtp-split-layout { display: flex; flex: 1; gap: 12px; overflow: hidden; }

        .smtp-config-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 14px;
          background: rgba(14, 18, 30, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          overflow-y: auto;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .form-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .form-field { display: flex; flex-direction: column; gap: 3px; }
        .form-field.full { width: 100%; }
        .form-field.half { width: calc(50% - 4px); }

        .form-field label { font-size: 10px; font-weight: 700; color: var(--text-muted); }
        .form-field input, .form-field select, .form-field textarea {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 5px 8px;
          color: #FFF;
          font-size: 11.5px;
          font-family: inherit;
          outline: none;
        }

        .smtp-body-input { font-family: var(--font-mono); font-size: 11px; resize: vertical; }

        .send-mail-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px;
          border-radius: 6px;
          border: 1px solid rgba(191, 90, 242, 0.4);
          background: rgba(191, 90, 242, 0.2);
          color: #BF5AF2;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 4px;
          transition: all 0.15s ease;
        }

        .send-mail-btn:hover { background: rgba(191, 90, 242, 0.35); color: #FFF; }

        .smtp-trace-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: rgba(10, 14, 24, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          overflow: hidden;
        }

        .trace-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: rgba(0, 0, 0, 0.35);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .trace-title { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 12px; }
        .handshake-badge { font-size: 10px; font-weight: 700; display: flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 4px; }
        .handshake-badge.success { background: rgba(48, 209, 88, 0.15); color: #30D158; border: 1px solid rgba(48, 209, 88, 0.3); }

        .trace-console {
          flex: 1;
          padding: 12px;
          overflow-y: auto;
          font-family: var(--font-mono);
          font-size: 11.5px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .trace-row {
          display: flex;
          gap: 8px;
          line-height: 1.4;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .log-time { color: var(--text-muted); font-size: 10px; flex-shrink: 0; }
        .log-role { font-weight: 800; font-size: 10px; flex-shrink: 0; }
        .trace-row.client .log-role { color: #64D2FF; }
        .trace-row.server .log-role { color: #30D158; }
        .trace-row.info .log-role { color: #FF9F0A; }

        /* Telnet / TCP Styles */
        .telnet-studio-pane { display: flex; flex-direction: column; flex: 1; gap: 10px; }
        .telnet-config-bar { display: flex; align-items: flex-end; gap: 10px; padding: 10px 14px; border-radius: 8px; }
        .tcp-field { display: flex; flex-direction: column; gap: 3px; }
        .tcp-field.host { flex: 2; }
        .tcp-field.port { width: 90px; }
        .tcp-field input { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 4px 8px; color: #FFF; font-size: 12px; font-family: var(--font-mono); }
        .tcp-toggle-btn { height: 28px; padding: 0 14px; border-radius: 4px; border: 1px solid rgba(10,132,255,0.4); background: rgba(10,132,255,0.2); color: #64D2FF; font-weight: 700; font-size: 11.5px; cursor: pointer; }
        .tcp-toggle-btn.connected { background: rgba(255,69,58,0.2); border-color: rgba(255,69,58,0.4); color: #FF453A; }

        .telnet-console-container { flex: 1; display: flex; flex-direction: column; border-radius: 8px; overflow: hidden; background: rgba(10,14,24,0.85); }
        .telnet-viewport { flex: 1; padding: 12px; overflow-y: auto; font-family: var(--font-mono); font-size: 12px; color: #E6EDF3; }
        .tcp-line { margin-bottom: 4px; }
        .tcp-send-bar { display: flex; gap: 8px; padding: 8px 12px; background: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.06); }
        .tcp-send-bar input { flex: 1; background: transparent; border: none; outline: none; color: #FFF; font-family: var(--font-mono); font-size: 12px; }
        .tcp-send-btn { display: flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 4px; background: rgba(48,209,88,0.2); border: 1px solid rgba(48,209,88,0.4); color: #30D158; font-weight: 600; font-size: 11px; cursor: pointer; }
      `}</style>
    </div>
  )
}

import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import {
  getRepoStatus,
  stageFile,
  unstageFile,
  commitChanges,
  initGitRepository,
  getGitBlame,
  getGitDiff,
  applyGitPatch,
  listBranches,
  checkoutBranch,
  deleteBranch,
  gitPull,
  gitPush,
  gitFetch,
  discardFileChanges,
  stashList,
  stashSave,
  stashPop,
  stashDrop,
  cherryPickCommit,
  revertCommit,
  mergeBranch,
  rebaseBranch,
  showCommitDetails,
  getRemoteInfo,
} from './git-service'
import { setupDebugIPC, disposeDebugSessions } from './debug-adapter-service'
import { setupWorkspaceToolsIPC } from './workspace-tools-service'
import { mcpClientManager, setupMcpClientIPC } from './mcp-client-service'
import { infraSocketManager, setupInfraIPC } from './infra-ipc-service'
import {
  setupIPC as setupAiIPC,
} from './ai-service'
import {
  detectToolchain,
  detectAllToolchains,
  DEFAULT_TOOLCHAINS,
} from './toolchain-service'
import { terminalService } from './terminal-service'
import { updateService } from './update-service'
import { antigravityAcpClient, setupAntigravityAcpIPC } from './antigravity-acp-service'
import { licenseService } from './license-service'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

// Set application identity
app.name = 'IndoctrinatedEdit'

// Prevent Windows disk cache file lock & shader cache movement collisions (0x5 Access is denied)
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
app.commandLine.appendSwitch('disable-gpu-program-cache')

// Single instance locking to prevent duplicate processes from fighting over %APPDATA% cache files
const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
}

let win: BrowserWindow | null = null
let splashWin: BrowserWindow | null = null

function createSplashWindow() {
  splashWin = new BrowserWindow({
    width: 500,
    height: 340,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    alwaysOnTop: true,
    center: true,
    show: false,
    skipTaskbar: true,
    hasShadow: true,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  const publicDir = process.env.VITE_PUBLIC || path.join(__dirname, '../public')
  const splashPath = path.join(publicDir, 'splash.html')
  splashWin.loadFile(splashPath)
  splashWin.once('ready-to-show', () => {
    splashWin?.show()
  })
}

function createWindow() {
  const candidatePreloadPaths = [
    path.join(__dirname, 'preload.cjs'),
    path.join(__dirname, 'preload.mjs'),
    path.join(__dirname, 'preload.js'),
    path.join(MAIN_DIST, 'preload.cjs'),
    path.join(MAIN_DIST, 'preload.mjs'),
    path.join(MAIN_DIST, 'preload.js'),
  ]
  let preloadPath = path.join(__dirname, 'preload.cjs')
  for (const candidate of candidatePreloadPaths) {
    try {
      // NOTE: must not use a bare `require` here - the Electron main process is
      // bundled as ESM, where `require` is undefined and the ReferenceError was
      // previously swallowed, silently disabling this fallback search.
      if (existsSync(candidate)) {
        preloadPath = candidate
        break
      }
    } catch {}
  }

  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 550,
    frame: false,
    transparent: false,
    backgroundColor: '#0b0f19',
    hasShadow: true,
    show: false,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      plugins: true,
    },
  })

  // Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // Smooth transition from Splash Screen to Main Window when React DOM is fully ready
  let hasShownMainWindow = false
  const showMainWindow = () => {
    if (hasShownMainWindow) return
    hasShownMainWindow = true

    if (splashWin && !splashWin.isDestroyed()) {
      // Reveal main window while splash is still on top so it paints underneath
      if (win && !win.isDestroyed()) {
        win.maximize()
        win.show()
        win.focus()
        sendMaxState()
      }

      // Smoothly fade out the splash card
      splashWin.webContents.postMessage('fade-out', '*')
      setTimeout(() => {
        if (splashWin && !splashWin.isDestroyed()) {
          splashWin.destroy()
          splashWin = null
        }
      }, 400)
    } else {
      if (win && !win.isDestroyed()) {
        win.maximize()
        win.show()
        win.focus()
        sendMaxState()
      }
    }
  }

  // Safety fallback: reveal window after 8s if renderer hangs
  const safetyTimeout = setTimeout(showMainWindow, 8000)

  ipcMain.removeHandler('app:ready')
  ipcMain.handle('app:ready', () => {
    clearTimeout(safetyTimeout)
    showMainWindow()
  })

  // Window control event forwarders
  const sendMaxState = () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('window-maximized-state', win.isMaximized())
    }
  }

  win.on('maximize', sendMaxState)
  win.on('unmaximize', sendMaxState)
  win.on('restore', sendMaxState)

  // Native close paths (Alt+F4, taskbar/title-bar close) must tear the terminal
  // process trees down as well. The in-app close button goes through the
  // `window:close` IPC handler below, which does the same thing - killAll() is
  // idempotent, so both hooks can safely run.
  win.on('close', () => {
    try {
      terminalService.killAll()
    } catch (e) {
      console.warn('[Main] Error killing terminals on window close:', e)
    }
  })
}

// IPC Handlers for frameless window controls
ipcMain.handle('window:minimize', (event) => {
  const target = BrowserWindow.fromWebContents(event.sender) || win
  if (target && !target.isDestroyed()) {
    target.minimize()
  }
})

ipcMain.handle('window:maximize', (event) => {
  const target = BrowserWindow.fromWebContents(event.sender) || win
  if (!target || target.isDestroyed()) return false
  if (target.isMaximized()) {
    target.unmaximize()
    return false
  } else {
    target.maximize()
    return true
  }
})

function disposeAllSubsystems() {
  try {
    terminalService.killAll()
  } catch {}
  try {
    mcpClientManager.disposeAll()
  } catch {}
  try {
    infraSocketManager.disposeAll()
  } catch {}
  try {
    void antigravityAcpClient.disconnect()
  } catch {}
  try {
    disposeDebugSessions()
  } catch {}
  try {
    updateService.triggerPendingInstallOnQuit()
  } catch {}
}

ipcMain.handle('window:close', (event) => {
  const target = BrowserWindow.fromWebContents(event.sender) || win
  disposeAllSubsystems()
  if (target && !target.isDestroyed()) {
    target.destroy()
  }
  if (process.platform !== 'darwin') {
    app.exit(0)
  }
})

ipcMain.handle('window:isMaximized', (event) => {
  const target = BrowserWindow.fromWebContents(event.sender) || win
  return target && !target.isDestroyed() ? target.isMaximized() : false
})

ipcMain.handle('window:setZoom', (event, action: 'in' | 'out' | 'reset') => {
  const target = BrowserWindow.fromWebContents(event.sender) || win
  if (!target || target.isDestroyed()) return 0
  const wc = target.webContents
  const cur = wc.getZoomLevel()
  const next = action === 'reset' ? 0 : action === 'in' ? Math.min(cur + 0.5, 4) : Math.max(cur - 0.5, -4)
  wc.setZoomLevel(next)
  return next
})

ipcMain.handle('window:toggleFullscreen', (event) => {
  const target = BrowserWindow.fromWebContents(event.sender) || win
  if (!target || target.isDestroyed()) return false
  const next = !target.isFullScreen()
  target.setFullScreen(next)
  return next
})

ipcMain.handle('app:getVersion', () => {
  return app.getVersion()
})

// IPC Handlers for native file system dialogs and operations
ipcMain.handle('dialog:openFile', async () => {
  if (!win) return null
  const result = await dialog.showOpenDialog(win, {
    title: 'Open File',
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Documents & Prose', extensions: ['md', 'markdown', 'pdf', 'docx', 'doc', 'txt', 'html', 'ipynb'] },
      { name: 'Source Files', extensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'html', 'css', 'md', 'py', 'rs', 'go', 'cs', 'cpp', 'c', 'pdf', 'docx', 'doc'] },
    ],
  })

  if (result.canceled || result.filePaths.length === 0) return null
  const filePath = result.filePaths[0]
  const fileName = path.basename(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const isBinaryDoc = ['.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)
  let content = ''
  if (isBinaryDoc) {
    const buf = await fs.readFile(filePath)
    const mime = ext === '.pdf' ? 'application/pdf' : (ext === '.docx' || ext === '.doc') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream'
    content = `data:${mime};base64,${buf.toString('base64')}`
  } else {
    content = await fs.readFile(filePath, 'utf-8')
  }
  return { path: filePath, name: fileName, content }
})

ipcMain.handle('dialog:openFolder', async () => {
  if (!win) return null
  const result = await dialog.showOpenDialog(win, {
    title: 'Open Workspace Folder',
    properties: ['openDirectory'],
  })

  if (result.canceled || result.filePaths.length === 0) return null
  const folderPath = result.filePaths[0]
  const folderName = path.basename(folderPath)

  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true })
    const files = entries
      .filter((e) => !e.name.startsWith('.git') && e.name !== 'node_modules' && e.name !== 'dist' && e.name !== 'dist-electron')
      .map((e) => ({
        name: e.name,
        path: path.join(folderPath, e.name),
        isDirectory: e.isDirectory(),
      }))

    return { folderPath, folderName, files }
  } catch (err) {
    console.error('Failed to read workspace folder:', err)
    return { folderPath, folderName, files: [] }
  }
})

ipcMain.handle('fs:readFolder', async (_, folderPath: string) => {
  try {
    const stat = await fs.stat(folderPath)
    if (!stat.isDirectory()) return null

    const folderName = path.basename(folderPath)
    const entries = await fs.readdir(folderPath, { withFileTypes: true })
    const files = entries
      .filter((e) => !e.name.startsWith('.git') && e.name !== 'node_modules' && e.name !== 'dist' && e.name !== 'dist-electron')
      .map((e) => ({
        name: e.name,
        path: path.join(folderPath, e.name),
        isDirectory: e.isDirectory(),
      }))

    return { folderPath, folderName, files }
  } catch (err) {
    console.error(`Failed to read folder at "${folderPath}":`, err)
    return null
  }
})

ipcMain.handle('fs:listWorkspaceFiles', async (_, rootPath: string, maxFiles: number = 2000) => {
  try {
    const results: Array<{ name: string; relativePath: string; path: string; isDirectory: boolean }> = []
    const ignored = new Set(['.git', 'node_modules', 'dist', 'dist-electron', 'build', '.idea', '.vscode', '.gemini', 'target'])

    async function walk(dir: string, relPrefix: string = '', depth: number = 0) {
      if (depth > 10 || results.length >= maxFiles) return
      let entries: import('node:fs').Dirent[] = []
      try {
        entries = await fs.readdir(dir, { withFileTypes: true })
      } catch {
        return
      }

      for (const entry of entries) {
        if (ignored.has(entry.name) || entry.name.startsWith('.')) continue
        const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          results.push({ name: entry.name, relativePath: relPath, path: fullPath, isDirectory: true })
          await walk(fullPath, relPath, depth + 1)
        } else {
          results.push({ name: entry.name, relativePath: relPath, path: fullPath, isDirectory: false })
        }

        if (results.length >= maxFiles) break
      }
    }

    await walk(rootPath)
    return results
  } catch (err) {
    console.error('Failed to list workspace files:', err)
    return []
  }
})

ipcMain.handle('fs:checkExists', async (_, targetPath: string) => {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
})

ipcMain.handle('fs:readFile', async (_, filePath: string) => {
  return await fs.readFile(filePath, 'utf-8')
})

ipcMain.handle('fs:readFileBase64', async (_, filePath: string) => {
  const buffer = await fs.readFile(filePath)
  return buffer.toString('base64')
})

ipcMain.handle('fs:saveFile', async (_, filePath: string, content: string) => {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(filePath, content, 'utf-8')
  return true
})

ipcMain.handle('dialog:saveFileAs', async (_, defaultName: string, content: string) => {
  if (!win) return null
  const result = await dialog.showSaveDialog(win, {
    title: 'Save File As',
    defaultPath: defaultName,
  })

  if (result.canceled || !result.filePath) return null
  const dir = path.dirname(result.filePath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(result.filePath, content, 'utf-8')
  return { path: result.filePath, name: path.basename(result.filePath) }
})

// ==========================================
// Git Microservice IPC Handlers
// ==========================================
ipcMain.handle('git:getRepoStatus', async (_, cwd?: string) => {
  const targetDir = cwd || process.env.APP_ROOT || process.cwd()
  return await getRepoStatus(targetDir)
})

ipcMain.handle('git:stageFile', async (_, filePath: string, cwd?: string) => {
  const targetDir = cwd || process.env.APP_ROOT || process.cwd()
  return await stageFile(targetDir, filePath)
})

ipcMain.handle('git:unstageFile', async (_, filePath: string, cwd?: string) => {
  const targetDir = cwd || process.env.APP_ROOT || process.cwd()
  return await unstageFile(targetDir, filePath)
})

ipcMain.handle('git:commit', async (_, message: string, cwd?: string) => {
  const targetDir = cwd || process.env.APP_ROOT || process.cwd()
  return await commitChanges(targetDir, message)
})

ipcMain.handle('git:init', async (_, cwd?: string) => {
  const targetDir = cwd || process.env.APP_ROOT || process.cwd()
  return await initGitRepository(targetDir)
})

ipcMain.handle('git:blame', async (_, filePath: string, cwd?: string) => {
  const targetDir = cwd || process.env.APP_ROOT || process.cwd()
  return await getGitBlame(targetDir, filePath)
})

ipcMain.handle('git:diff', async (_, options?: { staged?: boolean; filePath?: string; cwd?: string }) => {
  const targetDir = options?.cwd || process.env.APP_ROOT || process.cwd()
  return await getGitDiff(targetDir, options)
})

ipcMain.handle('git:applyPatch', async (_, patch: string, options?: { cached?: boolean; reverse?: boolean; cwd?: string }) => {
  const targetDir = options?.cwd || process.env.APP_ROOT || process.cwd()
  return await applyGitPatch(targetDir, patch, options)
})

ipcMain.handle('git:branches', async (_, cwd?: string) => {
  return await listBranches(cwd || process.env.APP_ROOT || process.cwd())
})
ipcMain.handle('git:checkout', async (_, branch: string, createNew?: boolean, cwd?: string) => {
  return await checkoutBranch(cwd || process.env.APP_ROOT || process.cwd(), branch, Boolean(createNew))
})
ipcMain.handle('git:deleteBranch', async (_, branch: string, force?: boolean, cwd?: string) => {
  return await deleteBranch(cwd || process.env.APP_ROOT || process.cwd(), branch, Boolean(force))
})
ipcMain.handle('git:pull', async (_, cwd?: string) => {
  return await gitPull(cwd || process.env.APP_ROOT || process.cwd())
})
ipcMain.handle('git:push', async (_, cwd?: string) => {
  return await gitPush(cwd || process.env.APP_ROOT || process.cwd())
})
ipcMain.handle('git:fetch', async (_, cwd?: string) => {
  return await gitFetch(cwd || process.env.APP_ROOT || process.cwd())
})
ipcMain.handle('git:discardFile', async (_, filePath: string, isUntracked?: boolean, cwd?: string) => {
  return await discardFileChanges(cwd || process.env.APP_ROOT || process.cwd(), filePath, Boolean(isUntracked))
})
ipcMain.handle('git:stashList', async (_, cwd?: string) => {
  return await stashList(cwd || process.env.APP_ROOT || process.cwd())
})
ipcMain.handle('git:stashSave', async (_, message?: string, cwd?: string) => {
  return await stashSave(cwd || process.env.APP_ROOT || process.cwd(), message)
})
ipcMain.handle('git:stashPop', async (_, ref?: string, cwd?: string) => {
  return await stashPop(cwd || process.env.APP_ROOT || process.cwd(), ref)
})
ipcMain.handle('git:stashDrop', async (_, ref: string, cwd?: string) => {
  return await stashDrop(cwd || process.env.APP_ROOT || process.cwd(), ref)
})
ipcMain.handle('git:cherryPick', async (_, hash: string, cwd?: string) => {
  return await cherryPickCommit(cwd || process.env.APP_ROOT || process.cwd(), hash)
})
ipcMain.handle('git:revert', async (_, hash: string, cwd?: string) => {
  return await revertCommit(cwd || process.env.APP_ROOT || process.cwd(), hash)
})
ipcMain.handle('git:merge', async (_, branch: string, cwd?: string) => {
  return await mergeBranch(cwd || process.env.APP_ROOT || process.cwd(), branch)
})
ipcMain.handle('git:rebase', async (_, branch: string, cwd?: string) => {
  return await rebaseBranch(cwd || process.env.APP_ROOT || process.cwd(), branch)
})
ipcMain.handle('git:showCommit', async (_, hash: string, cwd?: string) => {
  return await showCommitDetails(cwd || process.env.APP_ROOT || process.cwd(), hash)
})
ipcMain.handle('git:remoteInfo', async (_, cwd?: string) => {
  return await getRemoteInfo(cwd || process.env.APP_ROOT || process.cwd())
})

// ==========================================
// Real Multi-Runtime Debug Adapter (CDP / DAP)
// ==========================================
setupDebugIPC(ipcMain, () => win)

// ==========================================
// Workspace CLI, Bundle, Search & Binary IPC
// ==========================================
setupWorkspaceToolsIPC(ipcMain)

// ==========================================
// Real MCP Stdio JSON-RPC 2.0 Client IPC
// ==========================================
setupMcpClientIPC(ipcMain)

// ==========================================
// Real Network & Infrastructure Studios IPC
// ==========================================
setupInfraIPC(ipcMain, () => win)

// ==========================================
// AI Multi-Model Service IPC Handlers
// ==========================================
setupAiIPC(ipcMain)

// ==========================================
// Antigravity Official ACP (`agy acp`) Client IPC
// ==========================================
setupAntigravityAcpIPC(ipcMain, () => win)

// ==========================================
// Compiler & SDK Auto-Detection IPC Handlers
// ==========================================
ipcMain.handle('toolchain:detectOne', async (_, definition) => {
  return await detectToolchain(definition)
})

ipcMain.handle('toolchain:detectAll', async (_, customDefinitions) => {
  const definitions = customDefinitions && customDefinitions.length > 0
    ? customDefinitions
    : DEFAULT_TOOLCHAINS
  return await detectAllToolchains(definitions)
})

ipcMain.handle('toolchain:getDefaultDefinitions', async () => {
  return DEFAULT_TOOLCHAINS
})

// ==========================================
// Terminal Subsystem IPC Handlers
// ==========================================
terminalService.setupIPC(ipcMain, () => win)

// ==========================================
// Auto-Updater Subsystem IPC Handlers
// ==========================================
updateService.setupIPC(ipcMain, () => win)

// ==========================================
// Licensing & Activation IPC Handlers
// ==========================================
licenseService.setupIPC(ipcMain)



app.on('second-instance', () => {
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }
})

app.on('before-quit', () => {
  disposeAllSubsystems()
})

app.on('will-quit', () => {
  disposeAllSubsystems()
})

app.on('window-all-closed', () => {
  disposeAllSubsystems()
  if (process.platform !== 'darwin') {
    app.exit(0)
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createSplashWindow()
    createWindow()
  }
})

app.whenReady().then(() => {
  createSplashWindow()
  createWindow()
})

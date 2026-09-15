import { app, BrowserWindow, ipcMain, shell, dialog, screen } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import {
  getRepoStatus,
  stageFile,
  unstageFile,
  commitChanges,
  initGitRepository,
} from './git-service'
import {
  streamAiResponse,
  cancelAiStream,
  listOllamaModels,
  AiRequestOptions,
} from './ai-service'
import {
  detectToolchain,
  detectAllToolchains,
  DEFAULT_TOOLCHAINS,
} from './toolchain-service'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

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
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 550,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    backgroundMaterial: process.platform === 'win32' ? 'acrylic' : undefined,
    hasShadow: true,
    show: false,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
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

  // Transparent Frameless Window State Management
  let isCustomMaximized = false
  let unmaximizedBounds: Electron.Rectangle = { x: 100, y: 100, width: 1280, height: 820 }

  const maximizeWindow = (targetWin: BrowserWindow | null = win): boolean => {
    if (!targetWin || targetWin.isDestroyed()) return true
    isCustomMaximized = true
    try {
      unmaximizedBounds = targetWin.getBounds()
    } catch {}
    try {
      targetWin.maximize()
    } catch {}
    try {
      const currentScreen = screen.getDisplayMatching(targetWin.getBounds())
      if (currentScreen?.workArea) {
        targetWin.setBounds(currentScreen.workArea)
      }
    } catch {}
    targetWin.webContents.send('window-maximized-state', true)
    return true
  }

  const unmaximizeWindow = (targetWin: BrowserWindow | null = win): boolean => {
    if (!targetWin || targetWin.isDestroyed()) return false
    isCustomMaximized = false
    try {
      targetWin.unmaximize()
    } catch {}
    try {
      if (unmaximizedBounds) {
        targetWin.setBounds(unmaximizedBounds)
      }
    } catch {}
    targetWin.webContents.send('window-maximized-state', false)
    return false
  }

  const toggleMaximizeWindow = (targetWin: BrowserWindow | null = win): boolean => {
    if (!targetWin || targetWin.isDestroyed()) return false
    const currentlyMaximized = isCustomMaximized || targetWin.isMaximized()
    if (currentlyMaximized) {
      return unmaximizeWindow(targetWin)
    } else {
      return maximizeWindow(targetWin)
    }
  }

  // Smooth transition from Splash Screen to Main Window when React DOM is fully ready
  let hasShownMainWindow = false
  const showMainWindow = () => {
    if (hasShownMainWindow) return
    hasShownMainWindow = true

    if (splashWin && !splashWin.isDestroyed()) {
      splashWin.webContents.postMessage('fade-out', '*')
      setTimeout(() => {
        if (splashWin && !splashWin.isDestroyed()) {
          splashWin.destroy()
          splashWin = null
        }
        if (win && !win.isDestroyed()) {
          maximizeWindow(win)
          win.show()
          win.focus()
        }
      }, 320)
    } else {
      if (win && !win.isDestroyed()) {
        maximizeWindow(win)
        win.show()
        win.focus()
      }
    }
  }

  // Safety fallback: reveal window after 6s if renderer hangs
  const safetyTimeout = setTimeout(showMainWindow, 6000)

  ipcMain.handle('app:ready', () => {
    clearTimeout(safetyTimeout)
    showMainWindow()
  })

  // Window control event forwarders
  win.on('maximize', () => {
    isCustomMaximized = true
    win?.webContents.send('window-maximized-state', true)
  })

  win.on('unmaximize', () => {
    isCustomMaximized = false
    win?.webContents.send('window-maximized-state', false)
  })

  // IPC Handlers for frameless window controls
  ipcMain.handle('window:minimize', (event) => {
    const target = BrowserWindow.fromWebContents(event.sender) || win
    target?.minimize()
  })

  ipcMain.handle('window:maximize', (event) => {
    const target = BrowserWindow.fromWebContents(event.sender) || win
    return toggleMaximizeWindow(target)
  })

  ipcMain.handle('window:close', (event) => {
    const target = BrowserWindow.fromWebContents(event.sender) || win
    target?.close()
  })

  ipcMain.handle('window:isMaximized', (event) => {
    const target = BrowserWindow.fromWebContents(event.sender) || win
    return isCustomMaximized || (target?.isMaximized() ?? false)
  })
}

// IPC Handlers for native file system dialogs and operations
ipcMain.handle('dialog:openFile', async () => {
  if (!win) return null
  const result = await dialog.showOpenDialog(win, {
    title: 'Open File',
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Source Files', extensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'html', 'css', 'md', 'py', 'rs', 'go', 'cs', 'cpp', 'c'] },
    ],
  })

  if (result.canceled || result.filePaths.length === 0) return null
  const filePath = result.filePaths[0]
  const content = await fs.readFile(filePath, 'utf-8')
  const fileName = path.basename(filePath)
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

ipcMain.handle('fs:readFile', async (_, filePath: string) => {
  return await fs.readFile(filePath, 'utf-8')
})

ipcMain.handle('fs:saveFile', async (_, filePath: string, content: string) => {
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

// ==========================================
// AI Multi-Model Service IPC Handlers
// ==========================================
ipcMain.handle('ai:listOllamaModels', async (_, host?: string) => {
  return await listOllamaModels(host)
})

ipcMain.handle('ai:cancelStream', async (_, requestId: string) => {
  cancelAiStream(requestId)
})

ipcMain.handle('ai:startStream', async (event, requestId: string, options: AiRequestOptions) => {
  streamAiResponse(requestId, options, (chunk) => {
    if (!event.sender.isDestroyed()) {
      event.sender.send(`ai:chunk:${requestId}`, chunk)
    }
  })
  return true
})

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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
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

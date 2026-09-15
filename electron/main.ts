import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null = null

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
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
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

  // Window control event forwarders
  win.on('maximize', () => {
    win?.webContents.send('window-maximized-state', true)
  })

  win.on('unmaximize', () => {
    win?.webContents.send('window-maximized-state', false)
  })
}

// IPC Handlers for frameless window controls
ipcMain.handle('window:minimize', () => {
  win?.minimize()
})

ipcMain.handle('window:maximize', () => {
  if (win?.isMaximized()) {
    win.unmaximize()
  } else {
    win?.maximize()
  }
})

ipcMain.handle('window:close', () => {
  win?.close()
})

ipcMain.handle('window:isMaximized', () => {
  return win?.isMaximized() ?? false
})

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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

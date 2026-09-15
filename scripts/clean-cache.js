import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

console.log('🧹 [IndoctrinatedEdit] Starting Cache & Artifact Cleanup...')

const homeDir = os.homedir()
const isWindows = process.platform === 'win32'
const isMac = process.platform === 'darwin'
const isLinux = process.platform === 'linux'

// Potential application directories across OS platforms
const candidatePaths = []

if (isWindows) {
  const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming')
  const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local')

  candidatePaths.push(
    path.join(appData, 'indoctrinated-edit'),
    path.join(appData, 'IndoctrinatedEdit'),
    path.join(localAppData, 'indoctrinated-edit'),
    path.join(localAppData, 'IndoctrinatedEdit'),
    path.join(localAppData, 'indoctrinated-edit-updater'),
    path.join(localAppData, 'indoctrinatededit-updater'),
    path.join(localAppData, 'Programs', 'indoctrinated-edit'),
    path.join(appData, 'Electron')
  )
} else if (isMac) {
  const appSupport = path.join(homeDir, 'Library', 'Application Support')
  const caches = path.join(homeDir, 'Library', 'Caches')

  candidatePaths.push(
    path.join(appSupport, 'indoctrinated-edit'),
    path.join(appSupport, 'IndoctrinatedEdit'),
    path.join(caches, 'indoctrinated-edit'),
    path.join(caches, 'IndoctrinatedEdit'),
    path.join(appSupport, 'Electron')
  )
} else if (isLinux) {
  const configDir = process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config')
  const cacheDir = process.env.XDG_CACHE_HOME || path.join(homeDir, '.cache')

  candidatePaths.push(
    path.join(configDir, 'indoctrinated-edit'),
    path.join(configDir, 'IndoctrinatedEdit'),
    path.join(cacheDir, 'indoctrinated-edit'),
    path.join(cacheDir, 'IndoctrinatedEdit'),
    path.join(configDir, 'Electron')
  )
}

// Local project caches
candidatePaths.push(
  path.join(process.cwd(), 'node_modules', '.vite'),
  path.join(process.cwd(), 'dist'),
  path.join(process.cwd(), 'dist-electron')
)

let removedCount = 0

for (const targetPath of candidatePaths) {
  if (fs.existsSync(targetPath)) {
    try {
      console.log(`🗑️  Removing: ${targetPath}`)
      fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
      console.log(`   ✨ Successfully purged: ${path.basename(targetPath)}`)
      removedCount++
    } catch (err) {
      console.warn(`   ⚠️  Failed to delete ${targetPath} (possibly locked by running process): ${err.message}`)
    }
  }
}

console.log(`\n🎉 [IndoctrinatedEdit] Cleanup completed! Removed ${removedCount} cache / artifact locations.`)

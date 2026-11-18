import { exec, execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'
import type { IpcMain } from 'electron'

export interface WorkspaceExecResult {
  exitCode: number
  stdout: string
  stderr: string
  durationMs: number
  timedOut: boolean
}

export interface BundleFileEntry {
  name: string
  relativePath: string
  rawSizeBytes: number
  gzipSizeBytes: number
  extension: string
  modules?: Array<{ name: string; sizeKb: number; percentage: number }>
}

export interface WorkspaceBundleScanResult {
  buildDir: string | null
  totalRawBytes: number
  totalGzipBytes: number
  files: BundleFileEntry[]
  duplicates: Array<{ name: string; versions: string[]; dependents?: string[] }>
}

export interface WorkspaceSearchMatch {
  filePath: string
  relativePath: string
  lineNumber: number
  lineText: string
}

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'dist-electron',
  'build',
  'release',
  '.next',
  '.nuxt',
  'target',
  '__pycache__',
  '.venv',
  'venv',
  'coverage',
])

/**
 * Execute a shell command cleanly with timeout, optional cwd/env, and captured stdout/stderr.
 */
export async function execWorkspaceCommand(options: {
  command: string
  cwd?: string
  env?: Record<string, string>
  timeoutMs?: number
}): Promise<WorkspaceExecResult> {
  const start = Date.now()
  const timeoutMs = Math.min(Math.max(options.timeoutMs || 60000, 1000), 300000)
  const cwd = options.cwd || process.cwd()
  const env = options.env ? { ...process.env, ...options.env } : process.env

  return new Promise<WorkspaceExecResult>((resolve) => {
    const child = exec(
      options.command,
      {
        cwd,
        env,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - start
        if (!error) {
          resolve({ exitCode: 0, stdout: stdout || '', stderr: stderr || '', durationMs, timedOut: false })
          return
        }
        const timedOut = Boolean((error as any).killed && (error as any).signal === 'SIGTERM')
        const exitCode = typeof (error as any).code === 'number' ? (error as any).code : 1
        resolve({
          exitCode,
          stdout: stdout || '',
          stderr: stderr || error.message || '',
          durationMs,
          timedOut,
        })
      }
    )

    child.on('error', (err) => {
      resolve({
        exitCode: 1,
        stdout: '',
        stderr: err.message,
        durationMs: Date.now() - start,
        timedOut: false,
      })
    })
  })
}

/**
 * Walk a workspace directory cleanly, skipping build/vendor directories.
 */
export async function findWorkspaceFiles(options: {
  rootDir: string
  maxDepth?: number
  maxFiles?: number
  includeExtensions?: string[]
}): Promise<Array<{ name: string; path: string; relativePath: string; sizeBytes: number }>> {
  const rootDir = path.resolve(options.rootDir)
  const maxDepth = options.maxDepth ?? 8
  const maxFiles = options.maxFiles ?? 2000
  const extFilter = options.includeExtensions
    ? new Set(options.includeExtensions.map((e) => (e.startsWith('.') ? e.toLowerCase() : `.${e.toLowerCase()}`)))
    : null

  const results: Array<{ name: string; path: string; relativePath: string; sizeBytes: number }> = []

  async function walk(dir: string, depth: number) {
    if (depth > maxDepth || results.length >= maxFiles) return
    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (results.length >= maxFiles) break
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue
        await walk(path.join(dir, entry.name), depth + 1)
      } else if (entry.isFile()) {
        if (extFilter) {
          const ext = path.extname(entry.name).toLowerCase()
          if (!extFilter.has(ext)) continue
        }
        const fullPath = path.join(dir, entry.name)
        let sizeBytes = 0
        try {
          const stat = await fs.stat(fullPath)
          sizeBytes = stat.size
        } catch {
          // ignore
        }
        results.push({
          name: entry.name,
          path: fullPath,
          relativePath: path.relative(rootDir, fullPath).replace(/\\/g, '/'),
          sizeBytes,
        })
      }
    }
  }

  await walk(rootDir, 0)
  return results
}

/**
 * Search workspace files on disk for a literal or regex pattern.
 */
export async function searchWorkspaceText(options: {
  rootDir: string
  query: string
  isRegex?: boolean
  caseSensitive?: boolean
  filePattern?: string
  maxMatches?: number
}): Promise<WorkspaceSearchMatch[]> {
  const maxMatches = options.maxMatches ?? 100
  const matches: WorkspaceSearchMatch[] = []
  if (!options.query) return matches

  let re: RegExp
  try {
    const flags = options.caseSensitive ? '' : 'i'
    re = options.isRegex
      ? new RegExp(options.query, flags)
      : new RegExp(options.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags)
  } catch {
    return matches
  }

  let fileRegex: RegExp | null = null
  if (options.filePattern && options.filePattern.trim()) {
    const escaped = options.filePattern
      .trim()
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
    fileRegex = new RegExp(escaped, 'i')
  }

  const files = await findWorkspaceFiles({ rootDir: options.rootDir, maxDepth: 8, maxFiles: 1500 })
  for (const file of files) {
    if (matches.length >= maxMatches) break
    if (file.sizeBytes > 1024 * 1024) continue // Skip >1MB files
    if (fileRegex && !fileRegex.test(file.relativePath) && !fileRegex.test(file.name)) continue

    let content: string
    try {
      content = await fs.readFile(file.path, 'utf-8')
      if (content.includes('\0')) continue // Skip binary files
    } catch {
      continue
    }

    const lines = content.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) {
        matches.push({
          filePath: file.path,
          relativePath: file.relativePath,
          lineNumber: i + 1,
          lineText: lines[i].trim().slice(0, 300),
        })
        if (matches.length >= maxMatches) break
      }
    }
  }

  return matches
}

/**
 * Scan actual workspace build output directory (dist/, build/, out/, .next/static)
 * and calculate real raw + gzip sizes, plus duplicate package versions from package-lock.json.
 */
export async function scanWorkspaceBundle(rootDir: string): Promise<WorkspaceBundleScanResult> {
  const candidates = ['dist', 'build', 'out', path.join('.next', 'static')]
  let buildDir: string | null = null

  for (const rel of candidates) {
    const full = path.join(rootDir, rel)
    try {
      const stat = await fs.stat(full)
      if (stat.isDirectory()) {
        buildDir = full
        break
      }
    } catch {
      // try next candidate
    }
  }

  const files: BundleFileEntry[] = []
  let totalRawBytes = 0
  let totalGzipBytes = 0

  if (buildDir) {
    const walkBuild = async (dir: string) => {
      let entries
      try {
        entries = await fs.readdir(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await walkBuild(fullPath)
        } else if (entry.isFile()) {
          try {
            const buf = await fs.readFile(fullPath)
            const gz = zlib.gzipSync(buf, { level: 6 })
            totalRawBytes += buf.length
            totalGzipBytes += gz.length
            let modules: Array<{ name: string; sizeKb: number; percentage: number }> | undefined
            if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
              try {
                const mapRaw = await fs.readFile(`${fullPath}.map`, 'utf-8')
                const mapJson = JSON.parse(mapRaw)
                if (Array.isArray(mapJson.sources) && mapJson.sources.length > 0) {
                  const contents: any[] = Array.isArray(mapJson.sourcesContent) ? mapJson.sourcesContent : []
                  const byPkg = new Map<string, number>()
                  let totalSrcBytes = 0
                  for (let si = 0; si < mapJson.sources.length; si++) {
                    const srcPath = String(mapJson.sources[si] || '').replace(/\\/g, '/')
                    const nmIdx = srcPath.lastIndexOf('node_modules/')
                    let label = srcPath
                    if (nmIdx !== -1) {
                      const sub = srcPath.slice(nmIdx + 'node_modules/'.length).split('/')
                      label = sub[0]?.startsWith('@') && sub[1] ? `${sub[0]}/${sub[1]}` : (sub[0] || srcPath)
                    } else {
                      label = srcPath.replace(/^(\.\.\/)+/, '')
                    }
                    const bytes = typeof contents[si] === 'string' ? Buffer.byteLength(contents[si], 'utf8') : Math.round(buf.length / mapJson.sources.length)
                    byPkg.set(label, (byPkg.get(label) || 0) + bytes)
                    totalSrcBytes += bytes
                  }
                  const denom = Math.max(1, totalSrcBytes)
                  modules = Array.from(byPkg.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 15)
                    .map(([name, bytes]) => ({
                      name,
                      sizeKb: Math.round((bytes / 1024) * 10) / 10,
                      percentage: Math.round((bytes / denom) * 1000) / 10,
                    }))
                }
              } catch {
                // No sibling source map
              }
            }
            files.push({
              name: entry.name,
              relativePath: path.relative(buildDir!, fullPath).replace(/\\/g, '/'),
              rawSizeBytes: buf.length,
              gzipSizeBytes: gz.length,
              extension: path.extname(entry.name).toLowerCase(),
              modules,
            })
          } catch {
            // ignore unreadable asset
          }
        }
      }
    }
    await walkBuild(buildDir)
    files.sort((a, b) => b.rawSizeBytes - a.rawSizeBytes)
  }

  // Detect duplicate package versions from package-lock.json if present
  const duplicates: Array<{ name: string; versions: string[] }> = []
  try {
    const lockRaw = await fs.readFile(path.join(rootDir, 'package-lock.json'), 'utf-8')
    const lock = JSON.parse(lockRaw)
    if (lock?.packages && typeof lock.packages === 'object') {
      const versionMap = new Map<string, Set<string>>()
      for (const [pkgPath, meta] of Object.entries<any>(lock.packages)) {
        if (!pkgPath || !meta?.version) continue
        const lastNm = pkgPath.lastIndexOf('node_modules/')
        if (lastNm === -1) continue
        const pkgName = pkgPath.slice(lastNm + 'node_modules/'.length)
        if (!versionMap.has(pkgName)) versionMap.set(pkgName, new Set())
        versionMap.get(pkgName)!.add(String(meta.version))
      }
      for (const [name, versions] of versionMap.entries()) {
        if (versions.size > 1) {
          duplicates.push({ name, versions: Array.from(versions).sort() })
        }
      }
      duplicates.sort((a, b) => b.versions.length - a.versions.length)
    }
  } catch {
    // No lockfile or invalid JSON
  }

  return {
    buildDir,
    totalRawBytes,
    totalGzipBytes,
    files: files.slice(0, 200),
    duplicates: duplicates.slice(0, 50),
  }
}

/**
 * Read raw file bytes as Uint8Array (for Hex Inspector without UTF-8 corruption).
 */
export async function readFileBinary(filePath: string, maxBytes = 4 * 1024 * 1024): Promise<Uint8Array> {
  const handle = await fs.open(filePath, 'r')
  try {
    const stat = await handle.stat()
    const length = Math.min(stat.size, maxBytes)
    const buffer = Buffer.alloc(length)
    if (length > 0) {
      await handle.read(buffer, 0, length, 0)
    }
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  } finally {
    await handle.close()
  }
}

/**
 * Write raw binary bytes directly to disk without UTF-8 re-encoding (for Hex Inspector saves).
 */
export async function writeFileBinary(filePath: string, bytes: Uint8Array | number[]): Promise<boolean> {
  const buf = bytes instanceof Uint8Array ? Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength) : Buffer.from(bytes)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, buf)
  return true
}

export function setupWorkspaceToolsIPC(ipcMain: IpcMain): void {
  ipcMain.handle('workspace:execCommand', async (_, options) => {
    return execWorkspaceCommand(options)
  })

  ipcMain.handle('workspace:findFiles', async (_, options) => {
    return findWorkspaceFiles(options)
  })

  ipcMain.handle('workspace:searchText', async (_, options) => {
    return searchWorkspaceText(options)
  })

  ipcMain.handle('workspace:scanBundle', async (_, rootDir: string) => {
    return scanWorkspaceBundle(rootDir || process.cwd())
  })

  ipcMain.handle('workspace:readFileBinary', async (_, filePath: string, maxBytes?: number) => {
    return readFileBinary(filePath, maxBytes)
  })

  ipcMain.handle('workspace:writeFileBinary', async (_, filePath: string, bytes: Uint8Array | number[]) => {
    return writeFileBinary(filePath, bytes)
  })
}

export { execFile }

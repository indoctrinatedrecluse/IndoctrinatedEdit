import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import fs from 'node:fs/promises'
import { ToolchainDefinition, DetectedToolchain } from '../packages/sdk/types'
import { DEFAULT_TOOLCHAINS } from '../packages/sdk/toolchains'

export { DEFAULT_TOOLCHAINS }

const execFileAsync = promisify(execFile)

/**
 * Fast lookup to find an executable's absolute path using PATH environment or system utilities.
 * Uses a strict 1000ms timeout to ensure startup is never blocked.
 */
export async function findExecutable(binaryName: string): Promise<string | null> {
  const isWindows = process.platform === 'win32'
  const lookupCmd = isWindows ? 'where.exe' : 'which'

  try {
    const { stdout } = await execFileAsync(lookupCmd, [binaryName], {
      timeout: 1000,
      windowsHide: true,
    })
    const lines = stdout.trim().split(/\r?\n/)
    if (lines.length > 0 && lines[0].trim().length > 0) {
      return lines[0].trim()
    }
  } catch {
    // lookupCmd failed or timed out, fallback to PATH directory check
  }

  // Direct PATH scan fallback
  const pathEnv = process.env.PATH || ''
  const pathDelimiter = isWindows ? ';' : ':'
  const dirs = pathEnv.split(pathDelimiter).filter(Boolean)
  const exts = isWindows ? ['.exe', '.cmd', '.bat', ''] : ['']

  for (const dir of dirs) {
    for (const ext of exts) {
      const fullPath = path.join(dir, binaryName + ext)
      try {
        await fs.access(fullPath)
        return fullPath
      } catch {
        // Not found in this directory, continue
      }
    }
  }

  return null
}

/**
 * Executes a binary with its version query flag and parses output with regex.
 */
export async function extractVersion(
  executablePath: string,
  versionFlag: string = '--version',
  customPattern?: string
): Promise<string | undefined> {
  try {
    const isWindowsBatchShim = process.platform === 'win32' && /\.(cmd|bat)$/i.test(executablePath)
    const args = versionFlag.includes(' ') ? versionFlag.split(' ') : [versionFlag]
    const { stdout, stderr } = await execFileAsync(executablePath, args, {
      timeout: 8000,
      windowsHide: true,
      shell: isWindowsBatchShim,
    })
    const rawOutput = (stdout + ' ' + stderr).trim()

    if (customPattern) {
      const regex = new RegExp(customPattern, 'i')
      const match = rawOutput.match(regex)
      if (match && match[1]) {
        return match[1]
      }
    }

    // Generic version pattern fallback: e.g. "1.2.3" or "v1.2.3"
    const genericRegex = /(?:version\s*|v)?([0-9]+\.[0-9]+(?:\.[0-9]+)?(?:-[a-zA-Z0-9.]+)?)/i
    const genericMatch = rawOutput.match(genericRegex)
    if (genericMatch && genericMatch[1]) {
      return genericMatch[1]
    }

    // Return the first line truncated if no pattern matched
    const firstLine = rawOutput.split(/\r?\n/)[0]
    return firstLine ? firstLine.slice(0, 40).trim() : undefined
  } catch {
    return undefined
  }
}

/**
 * Detect a single toolchain definition.
 */
export async function detectToolchain(definition: ToolchainDefinition): Promise<DetectedToolchain> {
  const timestamp = Date.now()

  for (const binary of definition.binaryNames) {
    const execPath = await findExecutable(binary)
    if (execPath) {
      const version = await extractVersion(
        execPath,
        definition.versionFlag ?? '--version',
        definition.versionPattern
      )

      return {
        id: definition.id,
        name: definition.name,
        language: definition.language,
        found: true,
        binaryName: binary,
        path: execPath,
        version: version ?? 'Installed',
        lastChecked: timestamp,
      }
    }
  }

  return {
    id: definition.id,
    name: definition.name,
    language: definition.language,
    found: false,
    lastChecked: timestamp,
  }
}

/**
 * Detect all toolchains non-blockingly.
 */
export async function detectAllToolchains(
  definitions: ToolchainDefinition[] = DEFAULT_TOOLCHAINS
): Promise<DetectedToolchain[]> {
  const results = await Promise.all(definitions.map((def) => detectToolchain(def)))
  return results
}

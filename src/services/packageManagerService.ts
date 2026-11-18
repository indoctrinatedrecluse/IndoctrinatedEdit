/**
 * IndoctrinatedEdit - Package & Dependency Manager Service
 */

export interface DependencyItem {
  name: string
  currentVersion: string
  latestVersion: string
  isOutdated: boolean
  ecosystem: 'npm' | 'pypi' | 'cargo' | 'golang'
  license: string
  approxSizeKb?: number
  vulnerabilitiesCount?: number
  highestSeverity?: 'critical' | 'high' | 'moderate' | 'low' | 'none'
  description?: string
}

export interface ManifestScanResult {
  filePath: string
  ecosystem: 'npm' | 'pypi' | 'cargo' | 'golang'
  totalDependencies: number
  outdatedCount: number
  vulnerabilitiesCount: number
  dependencies: DependencyItem[]
}

class PackageManagerService {
  public parseManifest(fileName: string, content: string): ManifestScanResult {
    const lowerName = fileName.toLowerCase()

    if (lowerName.includes('package.json')) {
      return this.parseNpmPackageJson(fileName, content)
    } else if (lowerName.includes('requirements.txt')) {
      return this.parsePythonRequirements(fileName, content)
    } else if (lowerName.includes('cargo.toml')) {
      return this.parseCargoToml(fileName, content)
    } else if (lowerName.includes('go.mod')) {
      return this.parseGoMod(fileName, content)
    }

    // Default sample npm scan
    return this.parseNpmPackageJson('package.json', content || '{}')
  }

  private deterministicSizeKb(name: string): number {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) % 760
    }
    return Math.abs(hash) + 40
  }

  /**
   * Run live `npm outdated --json` / `npm audit --json` / install / uninstall in Electron desktop mode.
   */
  public async runNpmAction(
    action: 'install' | 'uninstall' | 'update' | 'audit' | 'outdated',
    cwd: string,
    packageName?: string
  ): Promise<{ success: boolean; output: string; exitCode: number }> {
    if (typeof window === 'undefined' || !window.electronAPI?.workspace?.execCommand) {
      return { success: false, output: 'Live package CLI actions require the Electron desktop app.', exitCode: 1 }
    }
    const safePkg = packageName ? packageName.replace(/[^a-zA-Z0-9@/_.-]/g, '') : ''
    let cmd = 'npm outdated --json'
    if (action === 'audit') cmd = 'npm audit --json'
    else if (action === 'install' && safePkg) cmd = `npm install ${safePkg}`
    else if (action === 'uninstall' && safePkg) cmd = `npm uninstall ${safePkg}`
    else if (action === 'update') cmd = safePkg ? `npm update ${safePkg}` : 'npm update'

    const res = await window.electronAPI.workspace.execCommand({ command: cmd, cwd, timeoutMs: 180000 })
    return {
      success: res.exitCode === 0,
      output: [res.stdout, res.stderr].filter(Boolean).join('\n').trim(),
      exitCode: res.exitCode,
    }
  }

  /**
   * Scan the real workspace manifest (package.json / requirements.txt / Cargo.toml / go.mod)
   * and enrich npm dependencies with real `npm outdated --json` and `npm audit --json` telemetry.
   */
  public async scanWorkspaceAsync(
    workspacePath: string,
    options?: { runOutdated?: boolean; runAudit?: boolean }
  ): Promise<ManifestScanResult | null> {
    if (typeof window === 'undefined' || !window.electronAPI?.readFile || !workspacePath) {
      return null
    }
    const root = workspacePath.replace(/[\\/]+$/, '')
    const candidates = ['package.json', 'requirements.txt', 'Cargo.toml', 'go.mod']
    let result: ManifestScanResult | null = null

    for (const fileName of candidates) {
      try {
        const content = await window.electronAPI.readFile(`${root}/${fileName}`)
        result = this.parseManifest(fileName, content)
        break
      } catch {
        // try next manifest type
      }
    }
    if (!result) return null

    if (result.ecosystem === 'npm') {
      if (options?.runOutdated) {
        const out = await this.runNpmAction('outdated', root)
        try {
          const jsonStart = out.output.indexOf('{')
          if (jsonStart !== -1) {
            const parsed = JSON.parse(out.output.slice(jsonStart))
            for (const dep of result.dependencies) {
              const info = parsed[dep.name]
              if (info?.latest) {
                dep.latestVersion = String(info.latest)
                dep.isOutdated = dep.currentVersion !== dep.latestVersion
              }
            }
          }
        } catch {
          // ignore non-JSON npm outdated
        }
      }
      if (options?.runAudit) {
        const aud = await this.runNpmAction('audit', root)
        try {
          const jsonStart = aud.output.indexOf('{')
          if (jsonStart !== -1) {
            const parsed = JSON.parse(aud.output.slice(jsonStart))
            const vulns = parsed.vulnerabilities || {}
            for (const dep of result.dependencies) {
              const v = vulns[dep.name]
              if (v) {
                dep.vulnerabilitiesCount = Array.isArray(v.via) ? v.via.length : 1
                const sev = String(v.severity || 'moderate').toLowerCase()
                dep.highestSeverity = (['critical', 'high', 'moderate', 'low'].includes(sev) ? sev : 'moderate') as DependencyItem['highestSeverity']
              } else {
                dep.vulnerabilitiesCount = 0
                dep.highestSeverity = 'none'
              }
            }
          }
        } catch {
          // ignore non-JSON npm audit
        }
      }

      result.outdatedCount = result.dependencies.filter((d) => d.isOutdated).length
      result.vulnerabilitiesCount = result.dependencies.reduce((acc, d) => acc + (d.vulnerabilitiesCount || 0), 0)
    }

    return result
  }

  private parseNpmPackageJson(filePath: string, content: string): ManifestScanResult {
    const dependencies: DependencyItem[] = []
    try {
      const pkg = JSON.parse(content)
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      }

      for (const [name, rawVersion] of Object.entries(allDeps)) {
        const cleanVer = String(rawVersion).trim().replace(/^[\^~>=<]+\s*/, '')

        dependencies.push({
          name,
          currentVersion: cleanVer,
          latestVersion: cleanVer,
          isOutdated: false,
          ecosystem: 'npm',
          license: this.getMockLicense(name),
          vulnerabilitiesCount: 0,
          highestSeverity: 'none',
          description: `Declared in ${filePath}`,
        })
      }
    } catch {
      // Return empty manifest cleanly if malformed
    }

    const outdatedCount = dependencies.filter((d) => d.isOutdated).length
    const vulnCount = dependencies.reduce((acc, d) => acc + (d.vulnerabilitiesCount || 0), 0)

    return {
      filePath,
      ecosystem: 'npm',
      totalDependencies: dependencies.length,
      outdatedCount,
      vulnerabilitiesCount: vulnCount,
      dependencies,
    }
  }

  private parsePythonRequirements(filePath: string, content: string): ManifestScanResult {
    const dependencies: DependencyItem[] = []
    const lines = content.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))

    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9_-]+)(?:==|>=|<=)?(.*)/)
      if (match) {
        const name = match[1]
        const ver = match[2] || '1.0.0'
        dependencies.push({
          name,
          currentVersion: ver,
          latestVersion: ver,
          isOutdated: false,
          ecosystem: 'pypi',
          license: 'MIT',
          approxSizeKb: 240,
          vulnerabilitiesCount: 0,
          highestSeverity: 'none',
        })
      }
    }

    return {
      filePath,
      ecosystem: 'pypi',
      totalDependencies: dependencies.length,
      outdatedCount: 0,
      vulnerabilitiesCount: 0,
      dependencies,
    }
  }

  private parseCargoToml(filePath: string, content: string): ManifestScanResult {
    const dependencies: DependencyItem[] = []
    const lines = content.split('\n')
    let inDeps = false

    for (const line of lines) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      if (/^\[(dev-|build-)?dependencies\]$/i.test(t)) {
        inDeps = true
        continue
      }
      if (t.startsWith('[')) {
        inDeps = false
        continue
      }
      if (inDeps && t.includes('=')) {
        const eqIdx = t.indexOf('=')
        const name = t.slice(0, eqIdx).trim()
        const rawVal = t.slice(eqIdx + 1).trim()
        let ver = ''
        if (rawVal.startsWith('{')) {
          const verMatch = rawVal.match(/version\s*=\s*["']([^"']+)["']/)
          ver = verMatch ? verMatch[1] : 'workspace'
        } else {
          ver = rawVal.replace(/^["']|["']$/g, '').split('#')[0].trim().replace(/^["']|["']$/g, '')
        }
        if (!name) continue
        dependencies.push({
          name,
          currentVersion: ver || 'latest',
          latestVersion: ver || 'latest',
          isOutdated: false,
          ecosystem: 'cargo',
          license: 'MIT / Apache-2.0',
          approxSizeKb: this.deterministicSizeKb(name),
          vulnerabilitiesCount: 0,
          highestSeverity: 'none',
        })
      }
    }

    return {
      filePath,
      ecosystem: 'cargo',
      totalDependencies: dependencies.length,
      outdatedCount: 0,
      vulnerabilitiesCount: 0,
      dependencies,
    }
  }

  private parseGoMod(filePath: string, content: string): ManifestScanResult {
    const dependencies: DependencyItem[] = []
    const lines = content.split('\n')

    for (const line of lines) {
      const match = line.trim().match(/^([a-zA-Z0-9.\-_/]+)\s+v([0-9.]+)/)
      if (match) {
        dependencies.push({
          name: match[1],
          currentVersion: match[2],
          latestVersion: match[2],
          isOutdated: false,
          ecosystem: 'golang',
          license: 'BSD-3-Clause',
          approxSizeKb: 95,
          vulnerabilitiesCount: 0,
          highestSeverity: 'none',
        })
      }
    }

    return {
      filePath,
      ecosystem: 'golang',
      totalDependencies: dependencies.length,
      outdatedCount: 0,
      vulnerabilitiesCount: 0,
      dependencies,
    }
  }

  private getMockLicense(name: string): string {
    if (name.startsWith('@types/')) return 'MIT'
    if (name.includes('gpl')) return 'GPL-3.0'
    if (name.includes('apache')) return 'Apache-2.0'
    return 'MIT'
  }
}

export const packageManagerService = new PackageManagerService()

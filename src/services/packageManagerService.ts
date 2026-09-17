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

  private parseNpmPackageJson(filePath: string, content: string): ManifestScanResult {
    const dependencies: DependencyItem[] = []
    try {
      const pkg = JSON.parse(content)
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      }

      for (const [name, rawVersion] of Object.entries(allDeps)) {
        const cleanVer = String(rawVersion).replace(/[\^~>=<]/g, '')
        const mockLatest = this.calculateMockLatest(cleanVer)
        const isOutdated = cleanVer !== mockLatest
        const vuln = this.checkMockVulnerability(name)

        dependencies.push({
          name,
          currentVersion: cleanVer,
          latestVersion: mockLatest,
          isOutdated,
          ecosystem: 'npm',
          license: this.getMockLicense(name),
          approxSizeKb: Math.floor(Math.random() * 800 + 40),
          vulnerabilitiesCount: vuln.count,
          highestSeverity: vuln.severity,
          description: `Core package module for ${name}`,
        })
      }
    } catch {
      // Return sample packages if empty/malformed
      dependencies.push(
        { name: 'react', currentVersion: '18.3.1', latestVersion: '19.0.0', isOutdated: true, ecosystem: 'npm', license: 'MIT', approxSizeKb: 312, vulnerabilitiesCount: 0, highestSeverity: 'none' },
        { name: 'lucide-react', currentVersion: '0.454.0', latestVersion: '0.454.0', isOutdated: false, ecosystem: 'npm', license: 'ISC', approxSizeKb: 140, vulnerabilitiesCount: 0, highestSeverity: 'none' },
        { name: 'framer-motion', currentVersion: '11.11.10', latestVersion: '12.0.0', isOutdated: true, ecosystem: 'npm', license: 'MIT', approxSizeKb: 450, vulnerabilitiesCount: 0, highestSeverity: 'none' },
        { name: 'axios', currentVersion: '0.21.1', latestVersion: '1.7.9', isOutdated: true, ecosystem: 'npm', license: 'MIT', approxSizeKb: 180, vulnerabilitiesCount: 1, highestSeverity: 'high' },
        { name: 'monaco-editor', currentVersion: '0.52.2', latestVersion: '0.52.2', isOutdated: false, ecosystem: 'npm', license: 'MIT', approxSizeKb: 4200, vulnerabilitiesCount: 0, highestSeverity: 'none' }
      )
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
      if (t.startsWith('[dependencies]')) {
        inDeps = true
        continue
      }
      if (t.startsWith('[')) {
        inDeps = false
      }
      if (inDeps && t.includes('=')) {
        const [k, v] = t.split('=')
        const name = k.trim()
        const ver = v.trim().replace(/"/g, '')
        dependencies.push({
          name,
          currentVersion: ver,
          latestVersion: ver,
          isOutdated: false,
          ecosystem: 'cargo',
          license: 'MIT / Apache-2.0',
          approxSizeKb: 120,
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

  private calculateMockLatest(curr: string): string {
    const parts = curr.split('.')
    if (parts.length >= 3) {
      const major = parseInt(parts[0], 10)
      if (major > 0 && Math.random() > 0.6) {
        return `${major + 1}.0.0`
      }
    }
    return curr
  }

  private checkMockVulnerability(name: string): { count: number; severity: DependencyItem['highestSeverity'] } {
    if (name.toLowerCase() === 'axios') {
      return { count: 1, severity: 'high' }
    }
    if (name.toLowerCase().includes('lodash')) {
      return { count: 1, severity: 'moderate' }
    }
    return { count: 0, severity: 'none' }
  }

  private getMockLicense(name: string): string {
    if (name.startsWith('@types/')) return 'MIT'
    if (name.includes('gpl')) return 'GPL-3.0'
    if (name.includes('apache')) return 'Apache-2.0'
    return 'MIT'
  }
}

export const packageManagerService = new PackageManagerService()

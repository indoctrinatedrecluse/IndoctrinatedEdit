/**
 * IndoctrinatedEdit - Bundle & Dependency Analyzer Service
 * Package size inspector, node_modules / vendor dependency tree visualizer, duplicate package detector, and import cost estimator.
 */

export interface BundleChunk {
  id: string
  name: string
  sizeKb: number
  gzipSizeKb: number
  percentage: number
  color: string
  isVendor: boolean
  modules: { name: string; sizeKb: number; percentage: number }[]
}

export interface ImportCostEstimate {
  packageName: string
  sizeKb: number
  gzipKb: number
  treeShakeable: boolean
  hasSideEffects: boolean
  source?: 'bundlephobia' | 'catalog' | 'offline-estimate'
  alternative?: { name: string; savingKb: number; reason: string }
}

export interface DuplicatePackageAlert {
  packageName: string
  versions: string[]
  totalWastedKb: number
  dependents: string[]
}

class BundleAnalyzerService {
  private sampleChunks: BundleChunk[] = [
    {
      id: 'chunk_vendor_monaco',
      name: 'vendor-monaco-editor.js',
      sizeKb: 1840.5,
      gzipSizeKb: 480.2,
      percentage: 42.5,
      color: '#0A84FF',
      isVendor: true,
      modules: [
        { name: 'monaco-editor/esm/vs/editor', sizeKb: 920.0, percentage: 50.0 },
        { name: 'monaco-editor/esm/vs/language/typescript', sizeKb: 610.5, percentage: 33.2 },
        { name: 'monaco-editor/esm/vs/base', sizeKb: 310.0, percentage: 16.8 },
      ],
    },
    {
      id: 'chunk_vendor_react',
      name: 'vendor-react-ecosystem.js',
      sizeKb: 490.0,
      gzipSizeKb: 135.0,
      percentage: 11.3,
      color: '#30D158',
      isVendor: true,
      modules: [
        { name: 'react-dom/client', sizeKb: 280.0, percentage: 57.1 },
        { name: 'framer-motion', sizeKb: 140.0, percentage: 28.6 },
        { name: 'lucide-react', sizeKb: 70.0, percentage: 14.3 },
      ],
    },
    {
      id: 'chunk_app_components',
      name: 'app-extensions-bundle.js',
      sizeKb: 890.4,
      gzipSizeKb: 215.8,
      percentage: 20.6,
      color: '#BF5AF2',
      isVendor: false,
      modules: [
        { name: 'components/AiChat', sizeKb: 240.0, percentage: 27.0 },
        { name: 'components/Database', sizeKb: 180.2, percentage: 20.2 },
        { name: 'components/Docker', sizeKb: 160.0, percentage: 18.0 },
        { name: 'components/PortSentinel', sizeKb: 95.0, percentage: 10.7 },
        { name: 'components/RedisStudio', sizeKb: 115.2, percentage: 12.9 },
        { name: 'components/OtherExtensions', sizeKb: 100.0, percentage: 11.2 },
      ],
    },
    {
      id: 'chunk_vendor_utils',
      name: 'vendor-utilities.js',
      sizeKb: 620.0,
      gzipSizeKb: 165.2,
      percentage: 14.3,
      color: '#FF9F0A',
      isVendor: true,
      modules: [
        { name: 'sql.js (WebAssembly Engine)', sizeKb: 380.0, percentage: 61.3 },
        { name: 'diff', sizeKb: 140.0, percentage: 22.6 },
        { name: 'crypto-es', sizeKb: 100.0, percentage: 16.1 },
      ],
    },
    {
      id: 'chunk_styles',
      name: 'liquid-glass-styles.css',
      sizeKb: 490.2,
      gzipSizeKb: 92.4,
      percentage: 11.3,
      color: '#64D2FF',
      isVendor: false,
      modules: [
        { name: 'glass-design-tokens.css', sizeKb: 210.0, percentage: 42.8 },
        { name: 'monaco-theme-overrides.css', sizeKb: 160.2, percentage: 32.7 },
        { name: 'micro-animations.css', sizeKb: 120.0, percentage: 24.5 },
      ],
    },
  ]

  private importEstimates: Record<string, ImportCostEstimate> = {
    lodash: {
      packageName: 'lodash',
      sizeKb: 71.2,
      gzipKb: 24.8,
      treeShakeable: false,
      hasSideEffects: false,
      alternative: {
        name: 'lodash-es / native JS methods',
        savingKb: 58.4,
        reason: 'lodash-es supports modern tree-shaking with zero dead code',
      },
    },
    moment: {
      packageName: 'moment',
      sizeKb: 288.0,
      gzipKb: 72.5,
      treeShakeable: false,
      hasSideEffects: false,
      alternative: {
        name: 'date-fns or Intl.DateTimeFormat',
        savingKb: 260.0,
        reason: 'date-fns only bundles functions you explicitly import',
      },
    },
    axios: {
      packageName: 'axios',
      sizeKb: 34.0,
      gzipKb: 11.2,
      treeShakeable: true,
      hasSideEffects: false,
      alternative: {
        name: 'Native fetch() API',
        savingKb: 34.0,
        reason: 'Built directly into all modern browser and Node 18+ engines',
      },
    },
    'lucide-react': {
      packageName: 'lucide-react',
      sizeKb: 18.5,
      gzipKb: 5.2,
      treeShakeable: true,
      hasSideEffects: false,
    },
    'framer-motion': {
      packageName: 'framer-motion',
      sizeKb: 124.0,
      gzipKb: 38.0,
      treeShakeable: true,
      hasSideEffects: false,
    },
  }

  private duplicateAlerts: DuplicatePackageAlert[] = [
    {
      packageName: 'tslib',
      versions: ['2.3.1', '2.6.2'],
      totalWastedKb: 22.4,
      dependents: ['framer-motion', 'monaco-editor', 'rxjs'],
    },
    {
      packageName: 'semver',
      versions: ['6.3.0', '7.5.4'],
      totalWastedKb: 48.0,
      dependents: ['eslint', 'vite-plugin-dts'],
    },
  ]

  /**
   * Scan real workspace build artifacts (`dist/`, `build/`, `out/`, `.next/static`)
   * and `package-lock.json` duplicates via Electron IPC.
   */
  public async analyzeWorkspace(workspaceRoot: string): Promise<{
    isLive: boolean
    buildDir: string | null
    chunks: BundleChunk[]
    duplicates: DuplicatePackageAlert[]
  }> {
    if (typeof window === 'undefined' || !window.electronAPI?.workspace?.scanBundle || !workspaceRoot) {
      return {
        isLive: false,
        buildDir: null,
        chunks: this.getChunks(),
        duplicates: this.getDuplicates(),
      }
    }

    const scan = await window.electronAPI.workspace.scanBundle(workspaceRoot)
    const totalRaw = Math.max(1, scan.totalRawBytes)
    const colors = ['#0A84FF', '#BF5AF2', '#30D158', '#FF9F0A', '#64D2FF', '#FF453A']

    const chunks: BundleChunk[] = scan.files.map((f: any, idx) => ({
      id: `live_chunk_${idx}`,
      name: f.relativePath,
      sizeKb: Math.round((f.rawSizeBytes / 1024) * 10) / 10,
      gzipSizeKb: Math.round((f.gzipSizeBytes / 1024) * 10) / 10,
      percentage: Math.round((f.rawSizeBytes / totalRaw) * 1000) / 10,
      isVendor: /vendor|node_modules/i.test(f.relativePath),
      modules: Array.isArray(f.modules) ? f.modules : [],
      color: colors[idx % colors.length],
    }))

    const duplicates: DuplicatePackageAlert[] = scan.duplicates.map((d: any) => ({
      packageName: d.name,
      versions: d.versions,
      totalWastedKb: Math.round((d.versions.length - 1) * 24 * 10) / 10,
      dependents: Array.isArray(d.dependents) && d.dependents.length > 0 ? d.dependents : ['package-lock.json'],
    }))

    // Always overwrite cached duplicate alerts with live lockfile scan (even if 0 duplicates found!)
    this.duplicateAlerts = duplicates
    if (scan.buildDir) {
      this.sampleChunks = chunks
    }

    return {
      isLive: Boolean(scan.buildDir),
      buildDir: scan.buildDir,
      chunks: scan.buildDir ? chunks : [],
      duplicates,
    }
  }

  public getChunks(): BundleChunk[] {
    return [...this.sampleChunks]
  }

  public getTotalSizeKb(): { rawKb: number; gzipKb: number } {
    const rawKb = this.sampleChunks.reduce((acc, c) => acc + c.sizeKb, 0)
    const gzipKb = this.sampleChunks.reduce((acc, c) => acc + c.gzipSizeKb, 0)
    return { rawKb: Math.round(rawKb * 10) / 10, gzipKb: Math.round(gzipKb * 10) / 10 }
  }

  /**
   * Fetch genuine package bundle size via Bundlephobia API in Electron desktop mode,
   * falling back to known estimates or deterministic estimate if offline.
   */
  public async estimateImportCostAsync(packageName: string): Promise<ImportCostEstimate> {
    const clean = packageName.trim()
    if (!clean) return this.estimateImportCost('')

    if (typeof window !== 'undefined' && window.electronAPI?.infra?.httpRequest) {
      try {
        const res = await window.electronAPI.infra.httpRequest({
          url: `https://bundlephobia.com/api/size?package=${encodeURIComponent(clean)}`,
          method: 'GET',
          headers: { Accept: 'application/json', 'User-Agent': 'IndoctrinatedEdit' },
          timeoutMs: 6000,
        })
        if (res.ok) {
          const data = JSON.parse(res.body)
          if (typeof data.size === 'number' && typeof data.gzip === 'number') {
            const known = this.importEstimates[clean.toLowerCase()]
            return {
              packageName: data.name || clean,
              sizeKb: Math.round((data.size / 1024) * 10) / 10,
              gzipKb: Math.round((data.gzip / 1024) * 10) / 10,
              treeShakeable: Boolean(data.hasJSModule || data.hasJSNext),
              hasSideEffects: Boolean(data.hasSideEffects),
              source: 'bundlephobia',
              alternative: known?.alternative,
            }
          }
        }
      } catch {
        // offline fallback
      }
    }
    return this.estimateImportCost(clean)
  }

  public estimateImportCost(packageName: string): ImportCostEstimate {
    const clean = packageName.toLowerCase().trim()
    if (this.importEstimates[clean]) {
      return { ...this.importEstimates[clean], source: 'catalog' }
    }
    // Offline fallback heuristic when Bundlephobia API is unreachable
    const hash = clean.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    const sizeKb = Math.round(((hash % 120) + 15) * 10) / 10
    return {
      packageName,
      sizeKb,
      gzipKb: Math.round(sizeKb * 0.32 * 10) / 10,
      treeShakeable: true,
      hasSideEffects: false,
      source: 'offline-estimate',
    }
  }

  public getDuplicates(): DuplicatePackageAlert[] {
    return [...this.duplicateAlerts]
  }

  public exportReportMarkdown(): string {
    const total = this.getTotalSizeKb()
    let md = `# IndoctrinatedEdit Bundle Size & Dependency Breakdown\n\n`
    md += `**Total Bundle Size:** ${total.rawKb} KB (Gzipped: ${total.gzipKb} KB)\n\n`
    md += `## Chunks Breakdown\n\n`
    md += `| Chunk Name | Raw Size | Gzip Size | Share |\n| :--- | :--- | :--- | :--- |\n`
    for (const chunk of this.sampleChunks) {
      md += `| \`${chunk.name}\` | ${chunk.sizeKb} KB | ${chunk.gzipSizeKb} KB | ${chunk.percentage}% |\n`
    }
    md += `\n## Detected Duplicate Packages\n\n`
    for (const dup of this.duplicateAlerts) {
      md += `- **${dup.packageName}**: Versions \`${dup.versions.join(', ')}\` (Wasted ~${dup.totalWastedKb} KB across ${dup.dependents.join(', ')})\n`
    }
    return md
  }
}

export const bundleAnalyzerService = new BundleAnalyzerService()

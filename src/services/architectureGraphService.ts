/**
 * IndoctrinatedEdit - Architecture & Dependency Flow Graph Engine
 * Discovers module imports, detects circular dependency loops, finds orphan files,
 * and generates interactive coordinates for visual dependency maps.
 */

export interface DependencyNode {
  id: string
  label: string
  path: string
  type: 'component' | 'service' | 'hook' | 'util' | 'extension' | 'other'
  sizeBytes?: number
  inDegree: number
  outDegree: number
  isOrphan: boolean
  isCircular: boolean
  x: number
  y: number
}

export interface DependencyEdge {
  id: string
  source: string
  target: string
  importType: 'static' | 'dynamic' | 'type-only'
}

export interface ArchitectureGraph {
  nodes: DependencyNode[]
  edges: DependencyEdge[]
  circularLoops: string[][]
  orphans: string[]
  metrics: {
    totalFiles: number
    totalDependencies: number
    maxDepth: number
    cyclomaticCoupling: number
  }
}

class ArchitectureGraphService {
  /**
   * Parses imports across a dictionary of workspace files and builds a dependency graph.
   */
  public buildDependencyGraph(files: Record<string, string>): ArchitectureGraph {
    const fileKeys = Object.keys(files)
    if (fileKeys.length === 0) {
      return this.generateSampleGraph()
    }

    const nodeMap = new Map<string, DependencyNode>()
    const edges: DependencyEdge[] = []
    const edgeSet = new Set<string>()

    // 1. Create base nodes
    fileKeys.forEach((filePath, idx) => {
      const fileName = filePath.split(/[/\\]/).pop() || filePath
      const nodeType = this.classifyNodeType(filePath)
      const angle = (idx / Math.max(fileKeys.length, 1)) * 2 * Math.PI
      const radius = 160 + (idx % 3) * 60

      nodeMap.set(filePath, {
        id: filePath,
        label: fileName,
        path: filePath,
        type: nodeType,
        sizeBytes: files[filePath].length,
        inDegree: 0,
        outDegree: 0,
        isOrphan: false,
        isCircular: false,
        x: 350 + Math.cos(angle) * radius,
        y: 260 + Math.sin(angle) * radius,
      })
    })

    // 2. Extract imports and build edges
    fileKeys.forEach((sourcePath) => {
      const content = files[sourcePath]
      const imports = this.extractImports(content)

      imports.forEach((rawImport) => {
        const targetPath = this.resolveImportPath(sourcePath, rawImport.path, fileKeys)
        if (targetPath && targetPath !== sourcePath) {
          const edgeId = `${sourcePath}->${targetPath}`
          if (!edgeSet.has(edgeId)) {
            edgeSet.add(edgeId)
            edges.push({
              id: edgeId,
              source: sourcePath,
              target: targetPath,
              importType: rawImport.isType ? 'type-only' : 'static',
            })

            const srcNode = nodeMap.get(sourcePath)
            const tgtNode = nodeMap.get(targetPath)
            if (srcNode) srcNode.outDegree++
            if (tgtNode) tgtNode.inDegree++
          }
        }
      })
    })

    // 3. Circular Dependency Detection
    const circularLoops = this.detectCircularDependencies(fileKeys, edges)
    const circularNodeIds = new Set<string>()
    circularLoops.forEach((loop) => loop.forEach((id) => circularNodeIds.add(id)))

    // 4. Identify Orphans (files with 0 incoming dependencies, excluding root files like App / main)
    const orphans: string[] = []
    nodeMap.forEach((node) => {
      node.isCircular = circularNodeIds.has(node.id)
      if (node.inDegree === 0 && !node.path.match(/App\.|main\.|index\.|server\./i)) {
        node.isOrphan = true
        orphans.push(node.id)
      }
    })

    const nodes = Array.from(nodeMap.values())

    return {
      nodes,
      edges,
      circularLoops,
      orphans,
      metrics: {
        totalFiles: nodes.length,
        totalDependencies: edges.length,
        maxDepth: this.calculateMaxDepth(nodes, edges),
        cyclomaticCoupling: nodes.length > 0 ? Math.round((edges.length / nodes.length) * 100) / 100 : 0,
      },
    }
  }

  private classifyNodeType(path: string): DependencyNode['type'] {
    if (path.includes('components') || path.endsWith('.tsx') || path.endsWith('.jsx')) return 'component'
    if (path.includes('services') || path.includes('service')) return 'service'
    if (path.includes('hooks') || path.includes('use')) return 'hook'
    if (path.includes('utils') || path.includes('helpers')) return 'util'
    if (path.includes('extensions')) return 'extension'
    return 'other'
  }

  private extractImports(content: string): { path: string; isType: boolean }[] {
    const results: { path: string; isType: boolean }[] = []
    
    // JS/TS ES6 imports: import ... from '...'
    const es6Regex = /import\s+(?:type\s+)?(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g
    let match: RegExpExecArray | null
    while ((match = es6Regex.exec(content)) !== null) {
      const isType = match[0].includes('import type')
      results.push({ path: match[1], isType })
    }

    // CommonJS require('...')
    const cjsRegex = /require\(['"]([^'"]+)['"]\)/g
    while ((match = cjsRegex.exec(content)) !== null) {
      results.push({ path: match[1], isType: false })
    }

    // Python imports: from x import y / import z
    const pyRegex = /(?:from\s+([a-zA-Z0-9_.]+)\s+import|import\s+([a-zA-Z0-9_.]+))/g
    while ((match = pyRegex.exec(content)) !== null) {
      const mod = match[1] || match[2]
      if (mod && !mod.startsWith('sys') && !mod.startsWith('os')) {
        results.push({ path: mod, isType: false })
      }
    }

    return results
  }

  private resolveImportPath(currentFile: string, importPath: string, allFiles: string[]): string | null {
    // Relative imports
    if (importPath.startsWith('.')) {
      const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'))
      const parts = `${currentDir}/${importPath}`.split('/')
      const normalizedParts: string[] = []

      for (const p of parts) {
        if (p === '.' || p === '') continue
        if (p === '..') normalizedParts.pop()
        else normalizedParts.push(p)
      }

      const normalized = normalizedParts.join('/')
      const candidate = allFiles.find((f) => {
        const withoutExt = f.replace(/\.[^/.]+$/, '')
        return f === normalized || withoutExt === normalized || f.endsWith(normalized)
      })

      return candidate || null
    }

    // Absolute / alias imports
    const candidate = allFiles.find((f) => f.includes(importPath))
    return candidate || null
  }

  private detectCircularDependencies(nodes: string[], edges: DependencyEdge[]): string[][] {
    const adj = new Map<string, string[]>()
    nodes.forEach((n) => adj.set(n, []))
    edges.forEach((e) => {
      const list = adj.get(e.source) || []
      list.push(e.target)
      adj.set(e.source, list)
    })

    const cycles: string[][] = []
    const visited = new Set<string>()
    const recStack = new Set<string>()
    const path: string[] = []

    const dfs = (curr: string) => {
      visited.add(curr)
      recStack.add(curr)
      path.push(curr)

      const neighbors = adj.get(curr) || []
      for (const next of neighbors) {
        if (!visited.has(next)) {
          dfs(next)
        } else if (recStack.has(next)) {
          // Found cycle
          const cycleStartIdx = path.indexOf(next)
          if (cycleStartIdx !== -1) {
            cycles.push([...path.slice(cycleStartIdx), next])
          }
        }
      }

      recStack.delete(curr)
      path.pop()
    }

    nodes.forEach((n) => {
      if (!visited.has(n)) dfs(n)
    })

    return cycles
  }

  private calculateMaxDepth(nodes: DependencyNode[], edges: DependencyEdge[]): number {
    if (nodes.length === 0 || edges.length === 0) return 1
    const adj = new Map<string, string[]>()
    edges.forEach((e) => {
      const list = adj.get(e.source) || []
      list.push(e.target)
      adj.set(e.source, list)
    })

    let max = 1
    const memo = new Map<string, number>()

    const getDepth = (id: string, visited: Set<string>): number => {
      if (memo.has(id)) return memo.get(id)!
      if (visited.has(id)) return 1
      visited.add(id)

      const neighbors = adj.get(id) || []
      let d = 1
      for (const n of neighbors) {
        d = Math.max(d, 1 + getDepth(n, new Set(visited)))
      }
      memo.set(id, d)
      return d
    }

    nodes.forEach((n) => {
      max = Math.max(max, getDepth(n.id, new Set()))
    })

    return max
  }

  /**
   * Generates a realistic mock architecture graph when no workspace is active.
   */
  public generateSampleGraph(): ArchitectureGraph {
    const nodes: DependencyNode[] = [
      { id: 'src/App.tsx', label: 'App.tsx', path: 'src/App.tsx', type: 'component', inDegree: 0, outDegree: 4, isOrphan: false, isCircular: false, x: 350, y: 80 },
      { id: 'src/components/Editor/EditorHost.tsx', label: 'EditorHost.tsx', path: 'src/components/Editor/EditorHost.tsx', type: 'component', inDegree: 1, outDegree: 3, isOrphan: false, isCircular: false, x: 200, y: 190 },
      { id: 'src/components/Sidebar/Sidebar.tsx', label: 'Sidebar.tsx', path: 'src/components/Sidebar/Sidebar.tsx', type: 'component', inDegree: 1, outDegree: 2, isOrphan: false, isCircular: false, x: 500, y: 190 },
      { id: 'src/services/lspService.ts', label: 'lspService.ts', path: 'src/services/lspService.ts', type: 'service', inDegree: 2, outDegree: 1, isOrphan: false, isCircular: false, x: 140, y: 320 },
      { id: 'src/services/gitAdvancedService.ts', label: 'gitAdvancedService.ts', path: 'src/services/gitAdvancedService.ts', type: 'service', inDegree: 2, outDegree: 0, isOrphan: false, isCircular: false, x: 350, y: 320 },
      { id: 'src/services/globalSearchService.ts', label: 'globalSearchService.ts', path: 'src/services/globalSearchService.ts', type: 'service', inDegree: 1, outDegree: 0, isOrphan: false, isCircular: false, x: 550, y: 320 },
      { id: 'src/hooks/useKeyboardShortcuts.ts', label: 'useKeyboardShortcuts.ts', path: 'src/hooks/useKeyboardShortcuts.ts', type: 'hook', inDegree: 1, outDegree: 1, isOrphan: false, isCircular: false, x: 350, y: 190 },
      { id: 'src/utils/circularDemoA.ts', label: 'circularDemoA.ts', path: 'src/utils/circularDemoA.ts', type: 'util', inDegree: 1, outDegree: 1, isOrphan: false, isCircular: true, x: 120, y: 440 },
      { id: 'src/utils/circularDemoB.ts', label: 'circularDemoB.ts', path: 'src/utils/circularDemoB.ts', type: 'util', inDegree: 1, outDegree: 1, isOrphan: false, isCircular: true, x: 280, y: 440 },
      { id: 'src/utils/legacyDeadFile.ts', label: 'legacyDeadFile.ts', path: 'src/utils/legacyDeadFile.ts', type: 'util', inDegree: 0, outDegree: 0, isOrphan: true, isCircular: false, x: 580, y: 440 },
    ]

    const edges: DependencyEdge[] = [
      { id: 'e1', source: 'src/App.tsx', target: 'src/components/Editor/EditorHost.tsx', importType: 'static' },
      { id: 'e2', source: 'src/App.tsx', target: 'src/components/Sidebar/Sidebar.tsx', importType: 'static' },
      { id: 'e3', source: 'src/App.tsx', target: 'src/hooks/useKeyboardShortcuts.ts', importType: 'static' },
      { id: 'e4', source: 'src/components/Editor/EditorHost.tsx', target: 'src/services/lspService.ts', importType: 'static' },
      { id: 'e5', source: 'src/components/Editor/EditorHost.tsx', target: 'src/services/gitAdvancedService.ts', importType: 'static' },
      { id: 'e6', source: 'src/components/Sidebar/Sidebar.tsx', target: 'src/services/globalSearchService.ts', importType: 'static' },
      { id: 'e7', source: 'src/hooks/useKeyboardShortcuts.ts', target: 'src/services/lspService.ts', importType: 'static' },
      { id: 'e8', source: 'src/utils/circularDemoA.ts', target: 'src/utils/circularDemoB.ts', importType: 'static' },
      { id: 'e9', source: 'src/utils/circularDemoB.ts', target: 'src/utils/circularDemoA.ts', importType: 'static' },
    ]

    return {
      nodes,
      edges,
      circularLoops: [['src/utils/circularDemoA.ts', 'src/utils/circularDemoB.ts', 'src/utils/circularDemoA.ts']],
      orphans: ['src/utils/legacyDeadFile.ts'],
      metrics: {
        totalFiles: 10,
        totalDependencies: 9,
        maxDepth: 4,
        cyclomaticCoupling: 0.9,
      },
    }
  }
}

export const architectureGraphService = new ArchitectureGraphService()

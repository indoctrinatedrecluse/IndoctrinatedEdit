import { describe, it, expect } from 'vitest'
import { architectureGraphService } from '../src/services/architectureGraphService'

describe('Architecture & Dependency Flow Graph Subsystem', () => {
  it('should generate a valid sample architecture graph with circular loops and metrics', () => {
    const graph = architectureGraphService.generateSampleGraph()
    expect(graph.nodes.length).toBeGreaterThan(0)
    expect(graph.edges.length).toBeGreaterThan(0)
    expect(graph.metrics.totalFiles).toBe(10)
    expect(graph.circularLoops.length).toBeGreaterThan(0)
    expect(graph.orphans.length).toBeGreaterThan(0)
  })

  it('should parse real file imports, build edges, and detect cycles', () => {
    const mockFiles: Record<string, string> = {
      'src/A.ts': 'import { b } from "./B"; export const a = 1;',
      'src/B.ts': 'import { c } from "./C"; export const b = 2;',
      'src/C.ts': 'import { a } from "./A"; export const c = 3;',
      'src/Orphan.ts': 'export const unused = true;',
    }

    const graph = architectureGraphService.buildDependencyGraph(mockFiles)
    expect(graph.nodes.length).toBe(4)
    expect(graph.edges.length).toBe(3)
    expect(graph.circularLoops.length).toBeGreaterThan(0)
    expect(graph.orphans).toContain('src/Orphan.ts')
  })
})

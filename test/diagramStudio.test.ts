import { describe, it, expect } from 'vitest'
import { diagramStudioService } from '../src/services/diagramStudioService'

describe('DiagramStudioService', () => {
  it('retrieves architecture and flowchart diagram templates', () => {
    const templates = diagramStudioService.getTemplates()
    expect(templates.length).toBeGreaterThan(0)
    expect(templates.some((t) => t.id === 'arch_microservices')).toBe(true)
    expect(templates.some((t) => t.category === 'sequence')).toBe(true)
    expect(templates.some((t) => t.category === 'erd')).toBe(true)
  })

  it('generates class diagrams from TypeScript / JavaScript source code', () => {
    const tsCode = `
      export class WorkspaceEngine extends BaseEngine {
        public execute(): void {}
      }
      export interface FileNode {}
    `
    const diagram = diagramStudioService.generateDiagramFromCode('WorkspaceEngine.ts', tsCode)
    expect(diagram).toContain('classDiagram')
    expect(diagram).toContain('class WorkspaceEngine')
    expect(diagram).toContain('BaseEngine <|-- WorkspaceEngine')
    expect(diagram).toContain('class FileNode')
  })

  it('generates flowchart diagram fallback for non-class files', () => {
    const diagram = diagramStudioService.generateDiagramFromCode('styles.css', 'body { color: red; }')
    expect(diagram).toContain('graph TD')
    expect(diagram).toContain('styles.css')
  })
})

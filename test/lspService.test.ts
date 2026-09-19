import { describe, it, expect, beforeEach } from 'vitest'
import { lspService } from '../src/services/lspService'

describe('LspService', () => {
  const sampleTS = `
export interface UserProfile {
  id: string
  name: string
}

export class UserManager {
  private users: UserProfile[] = []

  public getUser(id: string): UserProfile | undefined {
    return this.users.find(u => u.id === id)
  }
}

export function createManager(): UserManager {
  return new UserManager()
}
`

  const sampleConsumer = `
import { UserManager, createManager } from './sampleTS'

const manager = createManager()
const user = manager.getUser('123')
`

  beforeEach(() => {
    lspService.registerWorkspace(() => ({
      'src/userManager.ts': sampleTS,
      'src/app.ts': sampleConsumer,
    }))
  })

  it('finds definition across current file and workspace', () => {
    const def = lspService.findDefinition('UserManager', 'src/app.ts')
    expect(def).not.toBeNull()
    expect(def?.filePath).toBe('src/userManager.ts')
    expect(def?.lineNumber).toBeGreaterThan(0)
  })

  it('finds all symbol references across workspace files', () => {
    const refs = lspService.findReferences('UserManager')
    expect(refs.length).toBeGreaterThanOrEqual(3)
    const filePaths = refs.map((r) => r.filePath)
    expect(filePaths).toContain('src/userManager.ts')
    expect(filePaths).toContain('src/app.ts')
  })

  it('prepares and calculates workspace rename accurately', () => {
    const renamePlan = lspService.prepareRename('UserManager', 'AccountManager')
    expect(renamePlan.symbolName).toBe('UserManager')
    expect(renamePlan.newName).toBe('AccountManager')
    expect(renamePlan.affectedFiles).toBe(2)
    expect(renamePlan.totalOccurrences).toBeGreaterThanOrEqual(3)
  })

  it('applies workspace rename atomically across file records', () => {
    const initialFiles = {
      'src/userManager.ts': sampleTS,
      'src/app.ts': sampleConsumer,
    }
    const renamePlan = lspService.prepareRename('UserManager', 'AccountManager')
    const updatedFiles = lspService.applyRename(renamePlan, initialFiles)

    expect(updatedFiles['src/userManager.ts']).toContain('class AccountManager')
    expect(updatedFiles['src/userManager.ts']).not.toContain('class UserManager')
    expect(updatedFiles['src/app.ts']).toContain('import { AccountManager')
  })

  it('extracts document symbols (classes, interfaces, functions)', () => {
    const symbols = lspService.extractDocumentSymbols('src/userManager.ts', sampleTS)
    expect(symbols.length).toBe(3)
    expect(symbols.some((s) => s.name === 'UserProfile' && s.kind === 'interface')).toBe(true)
    expect(symbols.some((s) => s.name === 'UserManager' && s.kind === 'class')).toBe(true)
    expect(symbols.some((s) => s.name === 'createManager' && s.kind === 'function')).toBe(true)
  })

  it('computes breadcrumbs based on cursor line position', () => {
    // Line 8 is inside UserManager
    const breadcrumbs = lspService.getBreadcrumbs('src/userManager.ts', sampleTS, 8)
    expect(breadcrumbs.length).toBe(2)
    expect(breadcrumbs[0].kind).toBe('file')
    expect(breadcrumbs[0].name).toBe('userManager.ts')
    expect(breadcrumbs[1].kind).toBe('class')
    expect(breadcrumbs[1].name).toBe('UserManager')
  })
})

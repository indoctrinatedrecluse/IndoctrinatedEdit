import { describe, it, expect } from 'vitest'
import {
  DEFAULT_TOOLCHAINS,
  detectToolchain,
  findExecutable,
  extractVersion,
} from '../electron/toolchain-service'
import { ToolchainService } from '../src/services/toolchainService'
import { ToolchainDefinition } from '../packages/sdk/types'

describe('Compiler & SDK Auto-Detection Framework', () => {
  it('should define comprehensive default toolchains', () => {
    expect(DEFAULT_TOOLCHAINS.length).toBeGreaterThanOrEqual(8)
    const languages = DEFAULT_TOOLCHAINS.map((t) => t.language)
    expect(languages).toContain('javascript')
    expect(languages).toContain('typescript')
    expect(languages).toContain('python')
    expect(languages).toContain('rust')
    expect(languages).toContain('go')
    expect(languages).toContain('cpp')
    expect(languages).toContain('git')

    for (const toolchain of DEFAULT_TOOLCHAINS) {
      expect(toolchain.id).toMatch(/^toolchain\.[a-z0-9_]+$/)
      expect(toolchain.name).toBeDefined()
      expect(toolchain.binaryNames.length).toBeGreaterThan(0)
    }
  })

  it('should locate installed system executables (e.g. node, git)', async () => {
    const nodePath = await findExecutable('node')
    expect(nodePath).toBeDefined()
    expect(nodePath).not.toBeNull()
    expect(typeof nodePath).toBe('string')

    const gitPath = await findExecutable('git')
    expect(gitPath).toBeDefined()
    expect(gitPath).not.toBeNull()
  })

  it('should detect Node.js runtime and parse semantic version', async () => {
    const nodeDef = DEFAULT_TOOLCHAINS.find((t) => t.id === 'toolchain.node')!
    const result = await detectToolchain(nodeDef)

    expect(result.found).toBe(true)
    expect(result.binaryName).toBe('node')
    expect(result.path).toBeDefined()
    expect(result.version).toMatch(/^[0-9]+\.[0-9]+/)
    expect(result.lastChecked).toBeGreaterThan(0)
  })

  it('should return found=false for non-existent dummy toolchain', async () => {
    const dummyDef: ToolchainDefinition = {
      id: 'toolchain.non_existent_compiler',
      name: 'Non Existent Compiler',
      language: 'unknown',
      binaryNames: ['non_existent_compiler_xyz_999'],
    }

    const result = await detectToolchain(dummyDef)
    expect(result.found).toBe(false)
    expect(result.path).toBeUndefined()
  })

  it('should allow dynamic registration and unregistration in ToolchainService', () => {
    const service = new ToolchainService()
    const customDef: ToolchainDefinition = {
      id: 'toolchain.kotlin',
      name: 'Kotlin Compiler (kotlinc)',
      language: 'kotlin',
      binaryNames: ['kotlinc'],
      versionFlag: '-version',
    }

    service.registerToolchain(customDef)
    const defs = service.getDefinitions()
    expect(defs.some((d) => d.id === 'toolchain.kotlin')).toBe(true)

    service.unregisterToolchain('toolchain.kotlin')
    const updatedDefs = service.getDefinitions()
    expect(updatedDefs.some((d) => d.id === 'toolchain.kotlin')).toBe(false)
  })
})

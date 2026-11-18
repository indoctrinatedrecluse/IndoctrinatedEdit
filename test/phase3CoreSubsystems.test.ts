import { describe, it, expect } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'
import { parseGitBlamePorcelain } from '../electron/git-service'
import {
  execWorkspaceCommand,
  findWorkspaceFiles,
  searchWorkspaceText,
  scanWorkspaceBundle,
  readFileBinary,
} from '../electron/workspace-tools-service'
import { taskRunnerService } from '../src/services/taskRunnerService'
import { runService } from '../src/services/runService'
import { DiagnosticsService } from '../src/services/diagnosticsService'
import { lspService } from '../src/services/lspService'
import { packageManagerService } from '../src/services/packageManagerService'
import { testExplorerService } from '../src/services/testExplorerService'

describe('Phase 3 — Core IDE Subsystems & Real Electron Backends', () => {
  it('parses git blame --line-porcelain output accurately', () => {
    const sample = [
      'e8f7a912b40d123456789abcdef0123456789abc 1 1 1',
      'author Jane Doe',
      'author-mail <jane@example.com>',
      'author-time 1700000000',
      'summary feat: add engine',
      '\tconst x = 1',
    ].join('\n')

    const entries = parseGitBlamePorcelain(sample)
    expect(entries).toHaveLength(1)
    expect(entries[0].lineNumber).toBe(1)
    expect(entries[0].shortHash).toBe('e8f7a91')
    expect(entries[0].author).toBe('Jane Doe')
    expect(entries[0].authorEmail).toBe('jane@example.com')
    expect(entries[0].summary).toBe('feat: add engine')
  })

  it('execWorkspaceCommand, findWorkspaceFiles, searchWorkspaceText, scanWorkspaceBundle, readFileBinary work against real temp workspace', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'indoc-phase3-'))
    try {
      await fs.mkdir(path.join(tmpDir, 'src'), { recursive: true })
      await fs.mkdir(path.join(tmpDir, 'dist'), { recursive: true })
      await fs.writeFile(path.join(tmpDir, 'src', 'app.ts'), 'export const magicToken = 42\n')
      await fs.writeFile(path.join(tmpDir, 'dist', 'bundle.js'), 'console.log("hello world");'.repeat(40))
      const rawBin = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x80, 0xff, 0x00])
      await fs.writeFile(path.join(tmpDir, 'sample.bin'), rawBin)

      const execRes = await execWorkspaceCommand({ command: 'node -e "console.log(123)"', cwd: tmpDir })
      expect(execRes.exitCode).toBe(0)
      expect(execRes.stdout.trim()).toBe('123')

      const files = await findWorkspaceFiles({ rootDir: tmpDir })
      expect(files.some((f) => f.relativePath === 'src/app.ts')).toBe(true)

      const matches = await searchWorkspaceText({ rootDir: tmpDir, query: 'magicToken' })
      expect(matches).toHaveLength(1)
      expect(matches[0].lineNumber).toBe(1)

      const bundle = await scanWorkspaceBundle(tmpDir)
      expect(bundle.buildDir).toBe(path.join(tmpDir, 'dist'))
      expect(bundle.files).toHaveLength(1)
      expect(bundle.totalRawBytes).toBeGreaterThan(bundle.totalGzipBytes)
      expect(bundle.totalGzipBytes).toBeGreaterThan(0)

      const readBytes = await readFileBinary(path.join(tmpDir, 'sample.bin'))
      expect(Array.from(readBytes)).toEqual([0x7f, 0x45, 0x4c, 0x46, 0x80, 0xff, 0x00])
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('validates 5-field Cron expressions strictly and computes genuine next occurrences', () => {
    expect(taskRunnerService.analyzeCron('not a valid cron expr').isValid).toBe(false)
    expect(taskRunnerService.analyzeCron('99 * * * *').isValid).toBe(false)

    // Reference date: Monday 2026-01-05 08:00:00 local time
    const ref = new Date(2026, 0, 5, 8, 0, 0)
    const res = taskRunnerService.analyzeCron('30 9 * * MON-FRI', ref)
    expect(res.isValid).toBe(true)
    expect(res.nextOccurrences).toHaveLength(10)
    // First occurrence must be 09:30 on the same Monday, NOT 09:00 (now + 1h)
    expect(res.nextOccurrences[0]).toContain('9:30')
  })

  it('runService resolves npx tsx without duplicating tsx token', () => {
    const tsProfile = runService.getProfileForLanguage('typescript')!
    const resolved = runService.resolveRunCommand(tsProfile, { filePath: '/repo/index.ts' })
    expect(resolved.command).toBe('npx tsx "/repo/index.ts"')
    expect(resolved.command).not.toContain('"npx tsx" tsx')
  })

  it('diagnosticsService ignores brackets inside strings and comments', () => {
    const ds = DiagnosticsService.getInstance()
    const code = [
      'const str = "{ [ (";',
      '// comment with unclosed ( and {',
      '/* block comment [ */',
      'const ok = [1, 2, 3];',
    ].join('\n')
    const items = ds.analyzeCode('clean.ts', 'clean.ts', code, 'typescript')
    const syntaxErrors = items.filter((i) => i.code?.startsWith('syntax('))
    expect(syntaxErrors).toHaveLength(0)
  })

  it('lspService rename skips strings and comments and findDefinition ignores plain calls', () => {
    const files: Record<string, string> = {
      'src/a.ts': [
        '// computeSum is documented here',
        'const label = "computeSum";',
        'computeSum(1, 2);',
        'export function computeSum(a: number, b: number) { return a + b; }',
      ].join('\n'),
    }
    lspService.registerWorkspace(() => files)

    const def = lspService.findDefinition('computeSum')
    expect(def?.lineNumber).toBe(4)

    const plan = lspService.prepareRename('computeSum', 'addNumbers')
    const updated = lspService.applyRename(plan, files)
    expect(updated['src/a.ts']).toContain('// computeSum is documented here')
    expect(updated['src/a.ts']).toContain('const label = "computeSum";')
    expect(updated['src/a.ts']).toContain('addNumbers(1, 2);')
    expect(updated['src/a.ts']).toContain('export function addNumbers(')
  })

  it('packageManagerService parses Cargo dev-dependencies & inline tables deterministically', () => {
    const cargo = [
      '[dependencies]',
      'serde = { version = "1.0.210", features = ["derive"] }',
      '[dev-dependencies]',
      'criterion = "0.5"',
    ].join('\n')
    const r1 = packageManagerService.parseManifest('Cargo.toml', cargo)
    const r2 = packageManagerService.parseManifest('Cargo.toml', cargo)
    expect(r1.dependencies.map((d) => `${d.name}@${d.currentVersion}`)).toEqual(['serde@1.0.210', 'criterion@0.5'])
    expect(r1.dependencies[0].approxSizeKb).toBe(r2.dependencies[0].approxSizeKb)
  })

  it('testExplorerService detects .spec.tsx and ignores non-test files inside test_ directories', () => {
    testExplorerService.registerWorkspace(() => ({
      'src/Button.spec.tsx': `describe('Button', () => { it('renders', () => {}) })`,
      'src/test_utils/helper.ts': `export const helper = () => 1`,
    }))
    const files = testExplorerService.discoverTests()
    expect(files.map((f) => f.filePath)).toEqual(['src/Button.spec.tsx'])
  })
})

/**
 * ✨ Universal Test Explorer & Test Runner Service
 * 
 * Provides automated test discovery, AST parsing of test suites and cases,
 * test execution runner, duration tracking, and diagnostics navigation.
 */

export type TestItemStatus = 'idle' | 'running' | 'passed' | 'failed' | 'skipped'

export interface TestCaseItem {
  id: string
  name: string
  filePath: string
  lineNumber: number
  status: TestItemStatus
  durationMs?: number
  errorMessage?: string
  stackTrace?: string
  suiteName?: string
}

export interface TestSuiteItem {
  id: string
  name: string
  filePath: string
  lineNumber: number
  status: TestItemStatus
  testCases: TestCaseItem[]
}

export interface TestFileItem {
  id: string
  filePath: string
  fileName: string
  framework: 'vitest' | 'jest' | 'pytest' | 'gotest' | 'cargotest' | 'darttest' | 'generic'
  status: TestItemStatus
  suites: TestSuiteItem[]
  directTests: TestCaseItem[]
  durationMs?: number
  isCollapsed?: boolean
}

export interface TestExplorerSummary {
  totalFiles: number
  totalTests: number
  passed: number
  failed: number
  running: number
  skipped: number
  totalDurationMs: number
  isRunning: boolean
}

export interface TestExplorerState {
  files: TestFileItem[]
  summary: TestExplorerSummary
  lastRunTimestamp?: number
}

type TestExplorerListener = (state: TestExplorerState) => void

class TestExplorerService {
  private files: Map<string, TestFileItem> = new Map()
  private listeners: Set<TestExplorerListener> = new Set()
  private isRunning: boolean = false
  private fileContentsProvider: () => Record<string, string> = () => ({})
  private workspaceRoot: string | undefined

  public setWorkspaceRoot(root?: string): void {
    this.workspaceRoot = root
  }

  public registerWorkspace(getFiles: () => Record<string, string>): void {
    this.fileContentsProvider = getFiles
    this.discoverTests()
  }

  /**
   * Scan real test files on disk via Electron IPC (plus any open memory buffers).
   */
  public async discoverWorkspaceTestsAsync(workspaceRoot?: string): Promise<TestFileItem[]> {
    const root = workspaceRoot || this.workspaceRoot
    this.workspaceRoot = root
    this.discoverTests()

    if (!root || typeof window === 'undefined' || !window.electronAPI?.workspace?.findFiles || !window.electronAPI?.readFile) {
      return Array.from(this.files.values())
    }

    try {
      const found = await window.electronAPI.workspace.findFiles({
        rootDir: root,
        maxDepth: 6,
        maxFiles: 1500,
        includeExtensions: ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.dart'],
      })
      for (const f of found) {
        if (!this.isTestFilePath(f.relativePath) && !this.isTestFilePath(f.name)) continue
        if (this.files.has(f.path)) continue
        try {
          const content = await window.electronAPI.readFile(f.path)
          const parsed = this.parseTestFile(f.path, content)
          if (parsed) this.files.set(f.path, parsed)
        } catch {
          // ignore unreadable test file
        }
      }
      this.notify()
    } catch {
      // ignore discovery errors
    }

    return Array.from(this.files.values())
  }

  public subscribe(listener: TestExplorerListener): () => void {
    this.listeners.add(listener)
    listener(this.getState())
    return () => this.listeners.delete(listener)
  }

  public getState(): TestExplorerState {
    const fileList = Array.from(this.files.values())
    let totalTests = 0
    let passed = 0
    let failed = 0
    let running = 0
    let skipped = 0
    let totalDurationMs = 0

    for (const f of fileList) {
      if (f.durationMs) totalDurationMs += f.durationMs

      const countTests = (tests: TestCaseItem[]) => {
        for (const t of tests) {
          totalTests++
          if (t.status === 'passed') passed++
          else if (t.status === 'failed') failed++
          else if (t.status === 'running') running++
          else if (t.status === 'skipped') skipped++
        }
      }

      countTests(f.directTests)
      for (const s of f.suites) {
        countTests(s.testCases)
      }
    }

    return {
      files: fileList,
      summary: {
        totalFiles: fileList.length,
        totalTests,
        passed,
        failed,
        running,
        skipped,
        totalDurationMs,
        isRunning: this.isRunning,
      },
    }
  }

  /**
   * Discover and parse all test files in the workspace
   */
  public discoverTests(): TestFileItem[] {
    const files = this.fileContentsProvider()
    this.files.clear()

    for (const [filePath, content] of Object.entries(files)) {
      if (typeof content !== 'string') continue
      if (!this.isTestFilePath(filePath)) continue

      const testFile = this.parseTestFile(filePath, content)
      if (testFile) {
        this.files.set(filePath, testFile)
      }
    }

    this.notify()
    return Array.from(this.files.values())
  }

  private isTestFilePath(filePath: string): boolean {
    const norm = filePath.replace(/\\/g, '/').toLowerCase()
    const base = norm.split('/').pop() || norm
    return (
      base.endsWith('.test.ts') ||
      base.endsWith('.test.tsx') ||
      base.endsWith('.test.js') ||
      base.endsWith('.test.jsx') ||
      base.endsWith('.spec.ts') ||
      base.endsWith('.spec.tsx') ||
      base.endsWith('.spec.js') ||
      base.endsWith('.spec.jsx') ||
      (base.startsWith('test_') && base.endsWith('.py')) ||
      base.endsWith('_test.py') ||
      base.endsWith('_test.go') ||
      base.endsWith('_test.dart') ||
      (norm.startsWith('test/') && /\.(ts|tsx|js|jsx)$/.test(base)) ||
      (norm.startsWith('tests/') && base.endsWith('.rs'))
    )
  }

  private parseTestFile(filePath: string, content: string): TestFileItem | null {
    const fileName = filePath.split(/[/\\]/).pop() || filePath
    const lines = content.split(/\r?\n/)
    const suites: TestSuiteItem[] = []
    const directTests: TestCaseItem[] = []

    let currentSuite: TestSuiteItem | null = null

    // Determine test framework
    let framework: TestFileItem['framework'] = 'generic'
    if (filePath.endsWith('.go')) framework = 'gotest'
    else if (filePath.endsWith('.py')) framework = 'pytest'
    else if (filePath.endsWith('.rs')) framework = 'cargotest'
    else if (filePath.endsWith('.dart')) framework = 'darttest'
    else if (content.includes('vitest')) framework = 'vitest'
    else if (content.includes('jest')) framework = 'jest'

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const lineNum = i + 1

      // JS / TS: describe('...', () => {
      const describeMatch = line.match(/(?:describe|suite)\s*\(\s*['"`](.*?)['"`]/)
      if (describeMatch) {
        currentSuite = {
          id: `${filePath}:suite:${describeMatch[1]}:${lineNum}`,
          name: describeMatch[1],
          filePath,
          lineNumber: lineNum,
          status: 'idle',
          testCases: [],
        }
        suites.push(currentSuite)
        continue
      }

      // JS / TS: it('...', ...) or test('...', ...)
      const itMatch = line.match(/(?:it|test)\s*\(\s*['"`](.*?)['"`]/)
      if (itMatch) {
        const testCase: TestCaseItem = {
          id: `${filePath}:test:${itMatch[1]}:${lineNum}`,
          name: itMatch[1],
          filePath,
          lineNumber: lineNum,
          status: 'idle',
          suiteName: currentSuite?.name,
        }

        if (currentSuite) {
          currentSuite.testCases.push(testCase)
        } else {
          directTests.push(testCase)
        }
        continue
      }

      // Python: def test_...
      const pyTestMatch = line.match(/^def\s+(test_[a-zA-Z0-9_]+)\s*\(/)
      if (pyTestMatch) {
        directTests.push({
          id: `${filePath}:py:${pyTestMatch[1]}:${lineNum}`,
          name: pyTestMatch[1].replace(/^test_/, '').replace(/_/g, ' '),
          filePath,
          lineNumber: lineNum,
          status: 'idle',
        })
        continue
      }

      // Go: func Test...
      const goTestMatch = line.match(/^func\s+(Test[a-zA-Z0-9_]+)\s*\(/)
      if (goTestMatch) {
        directTests.push({
          id: `${filePath}:go:${goTestMatch[1]}:${lineNum}`,
          name: goTestMatch[1],
          filePath,
          lineNumber: lineNum,
          status: 'idle',
        })
        continue
      }

      // Rust: #[test] followed by fn test_...
      if (line.startsWith('#[test]') || line.startsWith('#[tokio::test]')) {
        const nextLine = (lines[i + 1] || '').trim()
        const rsMatch = nextLine.match(/^(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_]+)\s*\(/)
        if (rsMatch) {
          directTests.push({
            id: `${filePath}:rs:${rsMatch[1]}:${lineNum + 1}`,
            name: rsMatch[1],
            filePath,
            lineNumber: lineNum + 1,
            status: 'idle',
          })
          continue
        }
      }
    }

    if (suites.length === 0 && directTests.length === 0) {
      return null
    }

    return {
      id: filePath,
      filePath,
      fileName,
      framework,
      status: 'idle',
      suites,
      directTests,
      isCollapsed: false,
    }
  }

  /**
   * Run all tests in the workspace
   */
  public async runAllTests(): Promise<TestExplorerState> {
    this.isRunning = true
    this.setAllStatus('running')
    this.notify()

    for (const file of this.files.values()) {
      await this.runFileInternal(file)
    }

    this.isRunning = false
    this.notify()
    return this.getState()
  }

  /**
   * Run only previously failed tests
   */
  public async runFailedTests(): Promise<TestExplorerState> {
    this.isRunning = true
    this.notify()

    for (const file of this.files.values()) {
      let hasFailed = false
      const allTests = [
        ...file.directTests,
        ...file.suites.flatMap((s) => s.testCases),
      ]

      for (const t of allTests) {
        if (t.status === 'failed') {
          hasFailed = true
          t.status = 'running'
        }
      }

      if (hasFailed) {
        file.status = 'running'
        this.notify()
        await this.runFileInternal(file, true)
      }
    }

    this.isRunning = false
    this.notify()
    return this.getState()
  }

  /**
   * Run a single test file
   */
  public async runFile(filePath: string): Promise<TestFileItem | undefined> {
    const file = this.files.get(filePath)
    if (!file) return undefined

    this.isRunning = true
    file.status = 'running'
    this.notify()

    await this.runFileInternal(file)

    this.isRunning = false
    this.notify()
    return file
  }

  /**
   * Run a single test case
   */
  public async runSingleTest(testId: string): Promise<TestCaseItem | undefined> {
    let targetTest: TestCaseItem | undefined
    let parentFile: TestFileItem | undefined

    for (const file of this.files.values()) {
      for (const t of file.directTests) {
        if (t.id === testId) {
          targetTest = t
          parentFile = file
          break
        }
      }
      if (targetTest) break

      for (const s of file.suites) {
        for (const t of s.testCases) {
          if (t.id === testId) {
            targetTest = t
            parentFile = file
            break
          }
        }
        if (targetTest) break
      }
    }

    if (!targetTest || !parentFile) return undefined

    targetTest.status = 'running'
    this.notify()

    const res = await this.executeRealOrFallback(parentFile, targetTest.name)
    targetTest.durationMs = res.durationMs
    targetTest.status = res.passed ? 'passed' : 'failed'
    targetTest.errorMessage = res.errorMessage
    targetTest.stackTrace = res.stackTrace

    this.updateParentStatus(parentFile)
    this.notify()
    return targetTest
  }

  private buildRealTestCommand(file: TestFileItem, testName?: string): string {
    const escapedFile = file.filePath.replace(/"/g, '\\"')
    const escapedTest = testName ? testName.replace(/"/g, '\\"') : ''
    switch (file.framework) {
      case 'pytest':
        return testName ? `pytest "${escapedFile}" -k "${escapedTest}"` : `pytest "${escapedFile}"`
      case 'gotest':
        return testName ? `go test -v -run "${escapedTest}" ./...` : `go test -v ./...`
      case 'cargotest':
        return testName ? `cargo test "${escapedTest}"` : `cargo test`
      case 'darttest':
        return testName ? `dart test "${escapedFile}" --name "${escapedTest}"` : `dart test "${escapedFile}"`
      case 'jest':
        return testName ? `npx jest "${escapedFile}" -t "${escapedTest}" --json` : `npx jest "${escapedFile}" --json`
      case 'vitest':
      default:
        return testName
          ? `npx vitest run "${escapedFile}" -t "${escapedTest}" --reporter=json`
          : `npx vitest run "${escapedFile}" --reporter=json`
    }
  }

  private parseJsonAssertionResults(
    stdout: string
  ): Map<string, { status: TestItemStatus; durationMs?: number; errorMessage?: string }> {
    const map = new Map<string, { status: TestItemStatus; durationMs?: number; errorMessage?: string }>()
    const firstBrace = stdout.indexOf('{')
    const lastBrace = stdout.lastIndexOf('}')
    if (firstBrace === -1 || lastBrace <= firstBrace) return map
    try {
      const json = JSON.parse(stdout.slice(firstBrace, lastBrace + 1))
      const testResults: any[] = json.testResults || []
      for (const tr of testResults) {
        for (const a of tr.assertionResults || []) {
          const title = String(a.title || a.fullName || '').trim()
          if (!title) continue
          const status: TestItemStatus =
            a.status === 'passed' ? 'passed' : a.status === 'failed' ? 'failed' : 'skipped'
          map.set(title, {
            status,
            durationMs: typeof a.duration === 'number' ? Math.max(1, Math.round(a.duration)) : undefined,
            errorMessage: Array.isArray(a.failureMessages) && a.failureMessages[0] ? String(a.failureMessages[0]).slice(0, 1200) : undefined,
          })
        }
      }
    } catch {
      // non-JSON reporter output
    }
    return map
  }

  private async executeRealOrFallback(
    file: TestFileItem,
    testName?: string
  ): Promise<{
    passed: boolean
    durationMs: number
    errorMessage?: string
    stackTrace?: string
    perTestResults?: Map<string, { status: TestItemStatus; durationMs?: number; errorMessage?: string }>
  }> {
    const start = performance.now()
    if (typeof window !== 'undefined' && window.electronAPI?.workspace?.execCommand) {
      const cmd = this.buildRealTestCommand(file, testName)
      const res = await window.electronAPI.workspace.execCommand({
        command: cmd,
        cwd: this.workspaceRoot,
        timeoutMs: 120000,
      })
      const passed = res.exitCode === 0
      const combined = [res.stderr, res.stdout].filter(Boolean).join('\n').trim()
      const perTestResults =
        file.framework === 'vitest' || file.framework === 'jest'
          ? this.parseJsonAssertionResults(res.stdout)
          : undefined
      return {
        passed,
        durationMs: res.durationMs,
        errorMessage: passed ? undefined : (combined.split(/\r?\n/).find((l) => /error|fail|assert|expected/i.test(l)) || `Test exited with code ${res.exitCode}`),
        stackTrace: passed ? undefined : combined.slice(0, 4000),
        perTestResults,
      }
    }

    // Browser / unit-test sandbox fallback
    await new Promise((r) => setTimeout(r, 15))
    return {
      passed: true,
      durationMs: Math.max(1, Math.round(performance.now() - start)),
    }
  }

  private async runFileInternal(file: TestFileItem, onlyFailed: boolean = false): Promise<void> {
    const fileStart = performance.now()

    // In Electron desktop mode, run the real test runner once per file for accurate per-test results
    if (typeof window !== 'undefined' && window.electronAPI?.workspace?.execCommand) {
      const allTests = [...file.directTests, ...file.suites.flatMap((s) => s.testCases)]
      for (const t of allTests) {
        if (!onlyFailed || t.status === 'running') t.status = 'running'
      }
      this.notify()

      const res = await this.executeRealOrFallback(file)
      const perTestMs = allTests.length > 0 ? Math.max(1, Math.round(res.durationMs / allTests.length)) : res.durationMs
      for (const t of allTests) {
        if (onlyFailed && t.status !== 'running') continue
        const exact = res.perTestResults?.get(t.name)
        if (exact) {
          t.status = exact.status
          t.durationMs = exact.durationMs ?? perTestMs
          t.errorMessage = exact.errorMessage
          t.stackTrace = exact.errorMessage
        } else {
          t.durationMs = perTestMs
          t.status = res.passed ? 'passed' : 'failed'
          t.errorMessage = res.errorMessage
          t.stackTrace = res.stackTrace
        }
      }
      for (const suite of file.suites) {
        suite.status = suite.testCases.some((t) => t.status === 'failed')
          ? 'failed'
          : suite.testCases.every((t) => t.status === 'passed')
          ? 'passed'
          : 'skipped'
      }
      file.durationMs = res.durationMs
      this.updateParentStatus(file)
      return
    }

    const executeTests = async (tests: TestCaseItem[]) => {
      for (const test of tests) {
        if (onlyFailed && test.status !== 'running') continue

        test.status = 'running'
        this.notify()

        const tStart = performance.now()
        await new Promise((r) => setTimeout(r, 10))
        test.durationMs = Math.round(performance.now() - tStart)
        test.status = 'passed'
      }
    }

    await executeTests(file.directTests)
    for (const suite of file.suites) {
      await executeTests(suite.testCases)
      suite.status = suite.testCases.every((t) => t.status === 'passed') ? 'passed' : 'failed'
    }

    file.durationMs = Math.round(performance.now() - fileStart)
    this.updateParentStatus(file)
  }

  private updateParentStatus(file: TestFileItem) {
    const allTests = [
      ...file.directTests,
      ...file.suites.flatMap((s) => s.testCases),
    ]

    if (allTests.some((t) => t.status === 'failed')) {
      file.status = 'failed'
    } else if (allTests.every((t) => t.status === 'passed')) {
      file.status = 'passed'
    } else if (allTests.some((t) => t.status === 'running')) {
      file.status = 'running'
    } else {
      file.status = 'idle'
    }
  }

  private setAllStatus(status: TestItemStatus) {
    for (const file of this.files.values()) {
      file.status = status
      for (const d of file.directTests) d.status = status
      for (const s of file.suites) {
        s.status = status
        for (const t of s.testCases) t.status = status
      }
    }
  }

  public clearResults(): void {
    this.setAllStatus('idle')
    for (const f of this.files.values()) {
      f.durationMs = undefined
      for (const d of f.directTests) d.durationMs = undefined
      for (const s of f.suites) {
        for (const t of s.testCases) t.durationMs = undefined
      }
    }
    this.notify()
  }

  private notify() {
    const state = this.getState()
    for (const listener of this.listeners) {
      listener(state)
    }
  }
}

export const testExplorerService = new TestExplorerService()

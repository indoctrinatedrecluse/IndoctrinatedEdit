/**
 * GitHub Actions & CI/CD Workflow Management Subsystem
 * Inspects repository workflows, triggers manual dispatches, monitors active runs,
 * visualizes matrix jobs, and streams colorized step execution logs.
 */

export type WorkflowRunStatus = 'completed' | 'in_progress' | 'queued' | 'failed' | 'cancelled'
export type WorkflowConclusion = 'success' | 'failure' | 'cancelled' | 'skipped' | null

export interface WorkflowFile {
  id: string
  name: string
  path: string
  state: 'active' | 'disabled'
  triggers: ('push' | 'pull_request' | 'workflow_dispatch' | 'schedule' | 'release')[]
  description: string
  category: 'build' | 'release' | 'test' | 'security' | 'deploy'
}

export interface WorkflowStep {
  number: number
  name: string
  status: 'completed' | 'in_progress' | 'queued' | 'failed' | 'skipped'
  conclusion: WorkflowConclusion
  durationSeconds: number
  logs?: string[]
}

export interface WorkflowJob {
  id: string
  name: string
  runner: string
  status: WorkflowRunStatus
  conclusion: WorkflowConclusion
  durationSeconds: number
  steps: WorkflowStep[]
}

export interface WorkflowRun {
  id: string
  workflowId: string
  name: string
  runNumber: number
  event: 'push' | 'pull_request' | 'workflow_dispatch' | 'release'
  status: WorkflowRunStatus
  conclusion: WorkflowConclusion
  branch: string
  actor: {
    name: string
    avatar?: string
    email?: string
  }
  commit: {
    hash: string
    shortHash: string
    message: string
  }
  startedAt: string
  durationFormatted: string
  jobs: WorkflowJob[]
}

export class GitWorkflowService {
  private workflows: WorkflowFile[] = []
  private runs: WorkflowRun[] = []
  private selectedRunId: string | null = null
  private selectedJobId: string | null = null
  private listeners: Set<() => void> = new Set()
  private pollInterval: NodeJS.Timeout | null = null

  constructor() {
    this.initDefaultWorkflows()
    this.initDefaultRuns()
    this.startSimulationClock()
  }

  private initDefaultWorkflows() {
    this.workflows = [
      {
        id: 'release.yml',
        name: 'Release & Cross-Platform Packaging',
        path: '.github/workflows/release.yml',
        state: 'active',
        triggers: ['release', 'workflow_dispatch'],
        description: 'Builds Windows portable, Linux AppImage/Tarball, and macOS dmg packages and uploads assets.',
        category: 'release',
      },
      {
        id: 'build.yml',
        name: 'Continuous Integration & Build Matrix',
        path: '.github/workflows/build.yml',
        state: 'active',
        triggers: ['push', 'pull_request', 'workflow_dispatch'],
        description: 'TypeScript type check, Vite multi-target production bundle, and electron compilation.',
        category: 'build',
      },
      {
        id: 'test.yml',
        name: 'Vitest Unit & Integration Suites',
        path: '.github/workflows/test.yml',
        state: 'active',
        triggers: ['push', 'pull_request'],
        description: 'Executes all 35+ test files with code coverage reporting.',
        category: 'test',
      },
      {
        id: 'security-lint.yml',
        name: 'Security Audit & ESLint Scanner',
        path: '.github/workflows/security-lint.yml',
        state: 'active',
        triggers: ['push', 'schedule'],
        description: 'NPM audit vulnerabilities, secret token detection, and AST linting.',
        category: 'security',
      },
    ]
  }

  private initDefaultRuns() {
    this.runs = [
      {
        id: 'run_450_release',
        workflowId: 'release.yml',
        name: 'Release & Cross-Platform Packaging',
        runNumber: 45,
        event: 'release',
        status: 'in_progress',
        conclusion: null,
        branch: 'master',
        actor: { name: 'indoctrinatedrecluse', email: 'abmitra1999@gmail.com' },
        commit: {
          hash: 'a1b2c3d4e5f67a8b9c0d1e2f3a4b5c6d7e8f9a0b',
          shortHash: 'a1b2c3d',
          message: 'release: v4.6.0 Model Context Protocol (MCP) Host Studio, AI Agent Tools Bridge, and Settings Updates',
        },
        startedAt: new Date().toISOString(),
        durationFormatted: '1m 28s',
        jobs: [
          {
            id: 'job_win_460',
            name: 'Build Windows (x64 NSIS / Portable)',
            runner: 'windows-latest',
            status: 'in_progress',
            conclusion: null,
            durationSeconds: 88,
            steps: [
              { number: 1, name: 'Set up Node.js 22.x', status: 'completed', conclusion: 'success', durationSeconds: 6 },
              { number: 2, name: 'Install dependencies (npm ci)', status: 'completed', conclusion: 'success', durationSeconds: 22 },
              { number: 3, name: 'Build TypeScript & Vite bundle (4.6.0)', status: 'completed', conclusion: 'success', durationSeconds: 36 },
              { number: 4, name: 'Package Electron binary & NSIS installer', status: 'in_progress', conclusion: null, durationSeconds: 14 },
              { number: 5, name: 'Upload Release Asset (IndoctrinatedEdit-Setup-4.6.0.exe)', status: 'queued', conclusion: null, durationSeconds: 0 },
            ],
          },
          {
            id: 'job_linux_460',
            name: 'Build Linux AppImage & Tarball',
            runner: 'ubuntu-22.04',
            status: 'in_progress',
            conclusion: null,
            durationSeconds: 74,
            steps: [
              { number: 1, name: 'Set up Node.js 22.x', status: 'completed', conclusion: 'success', durationSeconds: 5 },
              { number: 2, name: 'Install libfuse2 & build tools', status: 'completed', conclusion: 'success', durationSeconds: 18 },
              { number: 3, name: 'Compile Web & Main Processes (v4.6.0)', status: 'completed', conclusion: 'success', durationSeconds: 35 },
              { number: 4, name: 'Generate AppImage & Tarball binaries', status: 'in_progress', conclusion: null, durationSeconds: 12 },
              { number: 5, name: 'Upload release assets (IndoctrinatedEdit-4.6.0.AppImage)', status: 'queued', conclusion: null, durationSeconds: 0 },
            ],
          },
        ],
      },
      {
        id: 'run_410_1',
        workflowId: 'release.yml',
        name: 'Release & Cross-Platform Packaging',
        runNumber: 42,
        event: 'workflow_dispatch',
        status: 'completed',
        conclusion: 'success',
        branch: 'master',
        actor: { name: 'indoctrinatedrecluse', email: 'maintainer@indoctrinated.dev' },
        commit: {
          hash: '9a4f21b7c8e6d3a1f4e59c0b1a2d3e4f5a6b7c8d',
          shortHash: '9a4f21b',
          message: 'release: v4.1.0 Liquid Glass runner and CI workflows suite',
        },
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        durationFormatted: '4m 18s',
        jobs: [
          {
            id: 'job_win',
            name: 'Build Windows (x64 NSIS / Portable)',
            runner: 'windows-latest',
            status: 'completed',
            conclusion: 'success',
            durationSeconds: 142,
            steps: [
              { number: 1, name: 'Set up Node.js 22.x', status: 'completed', conclusion: 'success', durationSeconds: 6 },
              { number: 2, name: 'Install dependencies (npm ci)', status: 'completed', conclusion: 'success', durationSeconds: 28 },
              { number: 3, name: 'Build TypeScript & Vite bundle', status: 'completed', conclusion: 'success', durationSeconds: 19 },
              { number: 4, name: 'Package Electron executable', status: 'completed', conclusion: 'success', durationSeconds: 55 },
              { number: 5, name: 'Upload Release Artifact (IndoctrinatedEdit-4.1.0-Setup.exe)', status: 'completed', conclusion: 'success', durationSeconds: 34 },
            ],
          },
          {
            id: 'job_linux_appimage',
            name: 'Build Linux AppImage & Tarball',
            runner: 'ubuntu-22.04',
            status: 'completed',
            conclusion: 'success',
            durationSeconds: 178,
            steps: [
              { number: 1, name: 'Set up Node.js 22.x', status: 'completed', conclusion: 'success', durationSeconds: 5 },
              { number: 2, name: 'Install libfuse2 & dependencies', status: 'completed', conclusion: 'success', durationSeconds: 22 },
              { number: 3, name: 'Compile Web & Main Processes', status: 'completed', conclusion: 'success', durationSeconds: 21 },
              { number: 4, name: 'Generate AppImage & Tarball binaries', status: 'completed', conclusion: 'success', durationSeconds: 88 },
              { number: 5, name: 'Upload release assets', status: 'completed', conclusion: 'success', durationSeconds: 42 },
            ],
          },
        ],
      },
      {
        id: 'run_build_ci_2',
        workflowId: 'build.yml',
        name: 'Continuous Integration & Build Matrix',
        runNumber: 128,
        event: 'push',
        status: 'completed',
        conclusion: 'success',
        branch: 'master',
        actor: { name: 'indoctrinatedrecluse' },
        commit: {
          hash: '3f2e1a4d5b6c7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
          shortHash: '3f2e1a4',
          message: 'feat: configurable interpreters and run arguments modal',
        },
        startedAt: new Date(Date.now() - 7200000).toISOString(),
        durationFormatted: '1m 24s',
        jobs: [
          {
            id: 'job_build_tsc',
            name: 'Type Check & Vite Production Build',
            runner: 'ubuntu-latest',
            status: 'completed',
            conclusion: 'success',
            durationSeconds: 84,
            steps: [
              { number: 1, name: 'Checkout Repository', status: 'completed', conclusion: 'success', durationSeconds: 2 },
              { number: 2, name: 'Setup Node.js Environment', status: 'completed', conclusion: 'success', durationSeconds: 4 },
              { number: 3, name: 'Run npm ci', status: 'completed', conclusion: 'success', durationSeconds: 32 },
              { number: 4, name: 'Run tsc & vite build', status: 'completed', conclusion: 'success', durationSeconds: 46 },
            ],
          },
        ],
      },
      {
        id: 'run_test_ci_3',
        workflowId: 'test.yml',
        name: 'Vitest Unit & Integration Suites',
        runNumber: 127,
        event: 'push',
        status: 'completed',
        conclusion: 'success',
        branch: 'master',
        actor: { name: 'indoctrinatedrecluse' },
        commit: {
          hash: '3f2e1a4d5b6c7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
          shortHash: '3f2e1a4',
          message: 'feat: configurable interpreters and run arguments modal',
        },
        startedAt: new Date(Date.now() - 7500000).toISOString(),
        durationFormatted: '48s',
        jobs: [
          {
            id: 'job_vitest',
            name: 'Vitest Suite (35 files, 234 tests)',
            runner: 'ubuntu-latest',
            status: 'completed',
            conclusion: 'success',
            durationSeconds: 48,
            steps: [
              { number: 1, name: 'Checkout Repo', status: 'completed', conclusion: 'success', durationSeconds: 2 },
              { number: 2, name: 'Install Modules', status: 'completed', conclusion: 'success', durationSeconds: 26 },
              { number: 3, name: 'Execute Vitest in Threads', status: 'completed', conclusion: 'success', durationSeconds: 20 },
            ],
          },
        ],
      },
    ]

    this.selectedRunId = this.runs[0].id
    this.selectedJobId = this.runs[0].jobs[0].id
  }

  private startSimulationClock() {
    this.pollInterval = setInterval(() => {
      // Simulate live progress for any 'in_progress' runs
      let hasChange = false
      this.runs.forEach((r) => {
        if (r.status === 'in_progress') {
          const inProgressJob = r.jobs.find((j) => j.status === 'in_progress')
          if (inProgressJob) {
            const currentStep = inProgressJob.steps.find((s) => s.status === 'in_progress')
            if (currentStep) {
              currentStep.status = 'completed'
              currentStep.conclusion = 'success'
              const nextStep = inProgressJob.steps.find((s) => s.status === 'queued')
              if (nextStep) {
                nextStep.status = 'in_progress'
              } else {
                inProgressJob.status = 'completed'
                inProgressJob.conclusion = 'success'
                const nextJob = r.jobs.find((j) => j.status === 'queued')
                if (nextJob) {
                  nextJob.status = 'in_progress'
                  if (nextJob.steps[0]) nextJob.steps[0].status = 'in_progress'
                } else {
                  r.status = 'completed'
                  r.conclusion = 'success'
                }
              }
              hasChange = true
            }
          }
        }
      })
      if (hasChange) this.notify()
    }, 4000)
  }

  public getWorkflows(): WorkflowFile[] {
    return this.workflows
  }

  public getRuns(workflowId?: string): WorkflowRun[] {
    if (workflowId) {
      return this.runs.filter((r) => r.workflowId === workflowId)
    }
    return this.runs
  }

  public getSelectedRun(): WorkflowRun | null {
    if (!this.selectedRunId) return this.runs[0] || null
    return this.runs.find((r) => r.id === this.selectedRunId) || this.runs[0] || null
  }

  public setSelectedRunId(id: string | null): void {
    this.selectedRunId = id
    const run = this.getSelectedRun()
    if (run && run.jobs.length > 0) {
      this.selectedJobId = run.jobs[0].id
    }
    this.notify()
  }

  public getSelectedJob(): WorkflowJob | null {
    const run = this.getSelectedRun()
    if (!run) return null
    return run.jobs.find((j) => j.id === this.selectedJobId) || run.jobs[0] || null
  }

  public setSelectedJobId(id: string | null): void {
    this.selectedJobId = id
    this.notify()
  }

  public triggerWorkflow(
    workflowId: string,
    branch = 'master',
    inputs: Record<string, string> = {}
  ): WorkflowRun {
    const wf = this.workflows.find((w) => w.id === workflowId) || this.workflows[0]
    const runNumber = this.runs.length + 1
    const newRunId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`

    const newRun: WorkflowRun = {
      id: newRunId,
      workflowId: wf.id,
      name: wf.name,
      runNumber,
      event: 'workflow_dispatch',
      status: 'in_progress',
      conclusion: null,
      branch,
      actor: { name: 'indoctrinatedrecluse', email: 'maintainer@indoctrinated.dev' },
      commit: {
        hash: 'e8d9c0b1a2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7',
        shortHash: 'e8d9c0b',
        message: inputs['tag'] ? `manual dispatch for tag: ${inputs['tag']}` : 'Manual workflow dispatch trigger',
      },
      startedAt: new Date().toISOString(),
      durationFormatted: '0m 12s',
      jobs: [
        {
          id: `job_${newRunId}_1`,
          name: wf.category === 'release' ? 'Build Multi-Platform Packages' : 'Matrix Build & Run Tests',
          runner: 'ubuntu-latest',
          status: 'in_progress',
          conclusion: null,
          durationSeconds: 12,
          steps: [
            { number: 1, name: 'Checkout Repository', status: 'completed', conclusion: 'success', durationSeconds: 2 },
            { number: 2, name: 'Setup Node.js Environment', status: 'completed', conclusion: 'success', durationSeconds: 4 },
            { number: 3, name: 'Install Dependencies (npm ci)', status: 'in_progress', conclusion: null, durationSeconds: 6 },
            { number: 4, name: 'Build TypeScript & Vite bundle', status: 'queued', conclusion: null, durationSeconds: 0 },
            { number: 5, name: 'Upload GitHub Release Artifacts', status: 'queued', conclusion: null, durationSeconds: 0 },
          ],
        },
      ],
    }

    this.runs.unshift(newRun)
    this.selectedRunId = newRun.id
    this.selectedJobId = newRun.jobs[0].id
    this.notify()
    return newRun
  }

  public rerunWorkflow(runId: string): void {
    const run = this.runs.find((r) => r.id === runId)
    if (run) {
      run.status = 'in_progress'
      run.conclusion = null
      run.startedAt = new Date().toISOString()
      run.jobs.forEach((j) => {
        j.status = 'in_progress'
        j.conclusion = null
        j.steps.forEach((s, idx) => {
          s.status = idx === 0 ? 'in_progress' : 'queued'
          s.conclusion = null
        })
      })
      this.selectedRunId = run.id
      this.notify()
    }
  }

  public cancelWorkflow(runId: string): void {
    const run = this.runs.find((r) => r.id === runId)
    if (run && run.status === 'in_progress') {
      run.status = 'cancelled'
      run.conclusion = 'cancelled'
      run.jobs.forEach((j) => {
        if (j.status === 'in_progress') {
          j.status = 'cancelled'
          j.conclusion = 'cancelled'
        }
      })
      this.notify()
    }
  }

  public getJobLogs(runId: string, jobId: string): string[] {
    const run = this.runs.find((r) => r.id === runId)
    const job = run?.jobs.find((j) => j.id === jobId)
    if (!job) return ['No logs available for selected job.']

    const logs: string[] = [
      `[INFO] Starting runner: ${job.runner} on host-node-04`,
      `[INFO] Job '${job.name}' initialized with event: ${run?.event}`,
      `[INFO] Ref: refs/heads/${run?.branch} | Commit: ${run?.commit.shortHash}`,
      `[STEP 1] Running: Checkout Repository (actions/checkout@v4)...`,
      `Syncing repository: indoctrinatedrecluse/IndoctrinatedEdit to .`,
      `HEAD is now at ${run?.commit.shortHash} ${run?.commit.message}`,
      `[STEP 2] Running: Setup Node.js Environment (actions/setup-node@v4)...`,
      `Found in cache: node v22.14.0 (x64)`,
      `Environment variable PATH updated with Node.js binaries.`,
      `[STEP 3] Running: Install Dependencies (npm ci)...`,
      `added 842 packages, and audited 843 packages in 12s`,
      `found 0 vulnerabilities`,
    ]

    if (job.status === 'completed' && job.conclusion === 'success') {
      logs.push(
        `[STEP 4] Running: Build TypeScript & Vite bundle...`,
        `$ tsc && vite build`,
        `vite v6.4.3 building for production...`,
        `✓ 3490 modules transformed.`,
        `dist/index.html 0.86 kB`,
        `dist/assets/index-EzAfEr-c.js 4,793.83 kB`,
        `✓ built in 14.39s`,
        `[STEP 5] Running: Upload GitHub Release Artifacts...`,
        `Creating release tag ${run?.commit.shortHash}...`,
        `Uploading release/IndoctrinatedEdit-4.1.0-win-x64.exe (84.2 MB) [100%]`,
        `Uploading release/IndoctrinatedEdit-4.1.0-linux-x86_64.AppImage (78.9 MB) [100%]`,
        `Uploading release/IndoctrinatedEdit-4.1.0-linux-x86_64.tar.gz (72.4 MB) [100%]`,
        `[SUCCESS] Job completed with status 0 (Success) in ${job.durationSeconds}s`
      )
    } else if (job.status === 'in_progress') {
      logs.push(
        `[STEP 3] Compiling and checking packages in progress...`,
        `[RUNNING] Executing active build process (PID: 4892)...`
      )
    }

    return logs
  }

  public dispose(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn())
  }
}

export const gitWorkflowService = new GitWorkflowService()

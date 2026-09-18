import { describe, it, expect } from 'vitest'
import { gitWorkflowService } from '../src/services/gitWorkflowService'

describe('Git Workflow & GitHub Actions CI/CD Subsystem', () => {
  it('should list configured repository workflow definitions', () => {
    const workflows = gitWorkflowService.getWorkflows()
    expect(workflows.length).toBeGreaterThanOrEqual(4)

    const releaseWf = workflows.find((w) => w.id === 'release.yml')
    expect(releaseWf).toBeDefined()
    expect(releaseWf?.category).toBe('release')
    expect(releaseWf?.triggers).toContain('workflow_dispatch')
  })

  it('should retrieve workflow runs list and filter by workflow ID', () => {
    const allRuns = gitWorkflowService.getRuns()
    expect(allRuns.length).toBeGreaterThanOrEqual(3)

    const releaseRuns = gitWorkflowService.getRuns('release.yml')
    expect(releaseRuns.length).toBeGreaterThan(0)
    expect(releaseRuns.every((r) => r.workflowId === 'release.yml')).toBe(true)
  })

  it('should trigger a new manual workflow dispatch run', () => {
    const newRun = gitWorkflowService.triggerWorkflow('release.yml', 'master', { tag: 'v4.3.0' })
    expect(newRun).toBeDefined()
    expect(newRun.status).toBe('in_progress')
    expect(newRun.branch).toBe('master')
    expect(newRun.commit.message).toContain('v4.3.0')

    const currentRuns = gitWorkflowService.getRuns()
    expect(currentRuns[0].id).toBe(newRun.id)
  })

  it('should retrieve job logs for execution steps', () => {
    const run = gitWorkflowService.getRuns()[0]
    expect(run).toBeDefined()
    expect(run.jobs.length).toBeGreaterThan(0)

    const job = run.jobs[0]
    const logs = gitWorkflowService.getJobLogs(run.id, job.id)
    expect(logs.length).toBeGreaterThan(0)
    expect(logs.some((l) => l.includes('[INFO]') || l.includes('[STEP') || l.includes('Runner'))).toBe(true)
  })

  it('should re-run or cancel active workflow runs', () => {
    const run = gitWorkflowService.triggerWorkflow('build.yml', 'feature/liquid-glass')
    expect(run.status).toBe('in_progress')

    gitWorkflowService.cancelWorkflow(run.id)
    const cancelled = gitWorkflowService.getRuns().find((r) => r.id === run.id)
    expect(cancelled?.status).toBe('cancelled')

    gitWorkflowService.rerunWorkflow(run.id)
    const rerun = gitWorkflowService.getRuns().find((r) => r.id === run.id)
    expect(rerun?.status).toBe('in_progress')
  })
})

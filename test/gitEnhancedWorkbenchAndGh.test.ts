import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  listTags,
  createTag,
  deleteTag,
  resetToCommit,
  checkGhCli,
} from '../electron/git-service'
import { gitWorkflowService } from '../src/services/gitWorkflowService'
import { notificationService } from '../src/services/notificationService'

describe('Git Enhanced Workbench & GitHub CLI Integration Tests', () => {
  beforeEach(() => {
    notificationService.dismissAll()
  })

  describe('Git Tag & Reset Operations', () => {
    it('should list tags and parse formatted tag entries', async () => {
      const tags = await listTags(process.cwd())
      expect(Array.isArray(tags)).toBe(true)
      if (tags.length > 0) {
        expect(tags[0]).toHaveProperty('name')
        expect(tags[0]).toHaveProperty('hash')
      }
    })

    it('should reject tag creation with empty name', async () => {
      const res = await createTag(process.cwd(), '')
      expect(res.success).toBe(false)
      expect(res.error).toContain('cannot be empty')
    })

    it('should construct valid git reset args format without throwing', async () => {
      // Non-destructive check with mock or invalid hash error
      const res = await resetToCommit(process.cwd(), 'invalid-hash-0000', 'mixed')
      expect(res).toHaveProperty('success')
    })
  })

  describe('GitHub CLI Status & Notification Detection', () => {
    it('should detect GitHub CLI presence or report clean error object', async () => {
      const status = await checkGhCli(process.cwd())
      expect(status).toHaveProperty('installed')
      expect(typeof status.installed).toBe('boolean')
      if (status.installed) {
        expect(status.version).toBeDefined()
        expect(typeof status.authenticated).toBe('boolean')
      }
    })

    it('should trigger notifyGitHubCliMissing and register in notificationService', () => {
      const notifId = notificationService.notifyGitHubCliMissing()
      expect(notifId).toBeDefined()

      const notifs = notificationService.getNotifications()
      const found = notifs.find((n) => n.id === 'missing-toolchain-gh')
      expect(found).toBeDefined()
      expect(found?.title).toContain('GitHub CLI')
      expect(found?.type).toBe('warning')
      expect(found?.category).toBe('git')
      expect(found?.priority).toBe('high')
      expect(found?.actions?.length).toBeGreaterThanOrEqual(1)
      expect(found?.actions?.[0].label).toContain('Install')
    })
  })

  describe('GitWorkflowService Enhanced CI/CD & PR Operations', () => {
    it('should check gh CLI status via workflow service and handle missing state', async () => {
      const status = await gitWorkflowService.checkGhCliStatus(process.cwd())
      expect(status).toHaveProperty('installed')
    })

    it('should return pull requests array or clean fallback', async () => {
      const prs = await gitWorkflowService.fetchPullRequestsAsync(process.cwd())
      expect(Array.isArray(prs)).toBe(true)
    })

    it('should return releases array or clean fallback', async () => {
      const releases = await gitWorkflowService.fetchReleasesAsync(process.cwd())
      expect(Array.isArray(releases)).toBe(true)
    })

    it('should fetch run details without throwing', async () => {
      const runs = gitWorkflowService.getRuns()
      if (runs.length > 0) {
        const enriched = await gitWorkflowService.fetchRunDetailsAsync(runs[0].id)
        expect(enriched).toBeDefined()
        expect(enriched?.id).toBe(runs[0].id)
      }
    })

    it('should attempt re-run of failed jobs or return clean error message', async () => {
      const runs = gitWorkflowService.getRuns()
      if (runs.length > 0) {
        const res = await gitWorkflowService.rerunFailedJobsAsync(runs[0].id)
        expect(res).toHaveProperty('ok')
        expect(res).toHaveProperty('message')
      }
    })
  })

  describe('Notification Center DND, Chime & Toast Subsystem', () => {
    it('should toggle sound and DND state', () => {
      const initialSound = notificationService.isSoundEnabled()
      notificationService.setSoundEnabled(!initialSound)
      expect(notificationService.isSoundEnabled()).toBe(!initialSound)
      notificationService.setSoundEnabled(initialSound)

      const initialDnd = notificationService.isDndEnabled()
      notificationService.setDndEnabled(!initialDnd)
      expect(notificationService.isDndEnabled()).toBe(!initialDnd)
      notificationService.setDndEnabled(initialDnd)
    })

    it('should dispatch toast callbacks on toast-eligible notifications', () => {
      const toastHandler = vi.fn()
      const unsubscribe = notificationService.onToast(toastHandler)

      notificationService.addNotification({
        title: 'Build Success',
        message: 'Compilation complete',
        type: 'success',
        showToast: true,
      })

      expect(toastHandler).toHaveBeenCalledTimes(1)
      expect(toastHandler.mock.calls[0][0].title).toBe('Build Success')

      unsubscribe()
    })
  })
})

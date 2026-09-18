import { describe, it, expect, beforeEach } from 'vitest'
import {
  AiService,
  DEFAULT_AUTO_APPROVE_SETTINGS,
  AUTO_APPROVE_PRESETS,
} from '../src/services/aiService'
import { AiAutoApproveSettings } from '@sdk/types'

// Setup in-memory mock for localStorage if not provided by environment
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {}
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      for (const k in store) delete store[k]
    },
    length: 0,
    key: (_i: number) => null,
  }
}

describe('AI Auto-Approve & Autonomous Permissions System', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset internal static cache
    AiService.saveAutoApproveSettings({ ...DEFAULT_AUTO_APPROVE_SETTINGS })
  })

  it('should initialize with safe default auto-approve settings', () => {
    const settings = AiService.getAutoApproveSettings()
    expect(settings.autoApproveRead).toBe(true)
    expect(settings.autoApproveWrite).toBe(false)
    expect(settings.autoApproveRun).toBe(false)
    expect(settings.autoApproveBrowser).toBe(true)
    expect(settings.autoApproveGit).toBe(false)
    expect(settings.maxAutoIterations).toBe(10)
  })

  it('should evaluate canAutoApprove correctly based on current configuration', () => {
    expect(AiService.canAutoApprove('read')).toBe(true)
    expect(AiService.canAutoApprove('write')).toBe(false)
    expect(AiService.canAutoApprove('run')).toBe(false)
    expect(AiService.canAutoApprove('browser')).toBe(true)
    expect(AiService.canAutoApprove('git')).toBe(false)

    // Enable write, run, and git
    AiService.saveAutoApproveSettings({
      autoApproveRead: true,
      autoApproveWrite: true,
      autoApproveRun: true,
      autoApproveBrowser: true,
      autoApproveGit: true,
      maxAutoIterations: 25,
    })

    expect(AiService.canAutoApprove('write')).toBe(true)
    expect(AiService.canAutoApprove('run')).toBe(true)
    expect(AiService.canAutoApprove('git')).toBe(true)
  })

  it('should apply security presets correctly (paranoid, balanced, autonomous)', () => {
    // 1. Paranoid preset
    const paranoid = AiService.applyAutoApprovePreset('paranoid')
    expect(paranoid.autoApproveRead).toBe(false)
    expect(paranoid.autoApproveWrite).toBe(false)
    expect(paranoid.autoApproveRun).toBe(false)
    expect(paranoid.autoApproveBrowser).toBe(false)
    expect(paranoid.autoApproveGit).toBe(false)
    expect(AiService.canAutoApprove('read')).toBe(false)

    // 2. Autonomous preset
    const autonomous = AiService.applyAutoApprovePreset('autonomous')
    expect(autonomous.autoApproveRead).toBe(true)
    expect(autonomous.autoApproveWrite).toBe(true)
    expect(autonomous.autoApproveRun).toBe(true)
    expect(autonomous.autoApproveBrowser).toBe(true)
    expect(autonomous.autoApproveGit).toBe(true)
    expect(autonomous.maxAutoIterations).toBe(25)
    expect(AiService.canAutoApprove('run')).toBe(true)
    expect(AiService.canAutoApprove('write')).toBe(true)

    // 3. Balanced preset
    const balanced = AiService.applyAutoApprovePreset('balanced')
    expect(balanced.autoApproveRead).toBe(true)
    expect(balanced.autoApproveWrite).toBe(false)
    expect(balanced.autoApproveRun).toBe(false)
    expect(balanced.autoApproveBrowser).toBe(true)
    expect(balanced.autoApproveGit).toBe(false)
  })

  it('should notify subscribers when auto-approve settings change', () => {
    let notified: AiAutoApproveSettings | null = null
    const unsub = AiService.onAutoApproveChanged((s) => {
      notified = s
    })

    AiService.saveAutoApproveSettings({
      autoApproveRead: true,
      autoApproveWrite: true,
      autoApproveRun: true,
      autoApproveBrowser: true,
      autoApproveGit: false,
      maxAutoIterations: 15,
    })

    expect(notified).not.toBeNull()
    expect(notified?.autoApproveRun).toBe(true)
    expect(notified?.autoApproveWrite).toBe(true)
    expect(notified?.maxAutoIterations).toBe(15)

    unsub()
  })
})

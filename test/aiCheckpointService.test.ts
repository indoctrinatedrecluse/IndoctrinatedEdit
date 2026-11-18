import { describe, it, expect, beforeEach } from 'vitest'
import { AiCheckpointService } from '../src/services/aiCheckpointService'

describe('AI Checkpoint & Shadow Snapshot Subsystem', () => {
  beforeEach(() => {
    AiCheckpointService.clear()
  })

  it('records pre-edit file snapshot and generates a unique checkpoint', async () => {
    let mockFileStore: Record<string, string> = {
      'd:/Projects/MyProject/src/index.ts': 'export const version = "1.0.0";',
    }

    const checkpoint = await AiCheckpointService.recordSnapshot({
      toolCallId: 'call-edit-1',
      filePath: 'd:/Projects/MyProject/src/index.ts',
      newContent: 'export const version = "2.0.0";',
      description: 'Bump version',
      currentContentResolver: async (path) => mockFileStore[path] ?? null,
    })

    expect(checkpoint).toBeDefined()
    expect(checkpoint.id).toMatch(/^cp-/)
    expect(checkpoint.toolCallId).toBe('call-edit-1')
    expect(checkpoint.files.length).toBe(1)
    expect(checkpoint.files[0].beforeContent).toBe('export const version = "1.0.0";')
    expect(checkpoint.files[0].afterContent).toBe('export const version = "2.0.0";')
    expect(checkpoint.files[0].isNewFile).toBe(false)
    expect(checkpoint.restored).toBe(false)

    const allCheckpoints = AiCheckpointService.getCheckpoints()
    expect(allCheckpoints.length).toBe(1)
    expect(allCheckpoints[0].id).toBe(checkpoint.id)
  })

  it('rolls back modified file to pre-edit snapshot using provided fileWriter', async () => {
    const mockFileStore: Record<string, string> = {
      'd:/Projects/MyProject/src/config.ts': 'const port = 3000;',
    }

    const cp = await AiCheckpointService.recordSnapshot({
      toolCallId: 'call-edit-config',
      filePath: 'd:/Projects/MyProject/src/config.ts',
      newContent: 'const port = 8080;',
      currentContentResolver: async (path) => mockFileStore[path] ?? null,
    })

    // Simulate file having been modified by agent
    mockFileStore['d:/Projects/MyProject/src/config.ts'] = 'const port = 8080;'

    // User triggers rollback
    const success = await AiCheckpointService.rollbackCheckpoint(cp.id, async (path, content) => {
      mockFileStore[path] = content
      return true
    })

    expect(success).toBe(true)
    expect(mockFileStore['d:/Projects/MyProject/src/config.ts']).toBe('const port = 3000;')

    const updatedCp = AiCheckpointService.getCheckpoints().find((c) => c.id === cp.id)
    expect(updatedCp?.restored).toBe(true)
  })

  it('subscribes and notifies listeners on snapshot recording and rollbacks', async () => {
    let notifiedCount = 0
    const unsub = AiCheckpointService.subscribe((cps) => {
      notifiedCount = cps.length
    })

    await AiCheckpointService.recordSnapshot({
      toolCallId: 'call-snap-1',
      filePath: 'src/main.ts',
      newContent: 'console.log(42);',
      currentContentResolver: async () => 'console.log(1);',
    })

    expect(notifiedCount).toBe(1)
    unsub()
  })
})

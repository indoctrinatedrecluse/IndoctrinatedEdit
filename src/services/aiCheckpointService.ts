/**
 * IndoctrinatedEdit - AI Checkpoint & Shadow Snapshot Service
 * Provides automatic pre-edit snapshots and 1-click rollback of agent file modifications.
 */

export interface AiFileSnapshot {
  filePath: string
  fileName: string
  beforeContent: string
  afterContent: string
  isNewFile: boolean
}

export interface AiCheckpoint {
  id: string
  toolCallId: string
  timestamp: number
  description: string
  files: AiFileSnapshot[]
  restored: boolean
}

const CHECKPOINTS_STORAGE_KEY = 'indoctrinated:ai:checkpoints'

export class AiCheckpointService {
  private static checkpoints: AiCheckpoint[] = []
  private static listeners: Set<(checkpoints: AiCheckpoint[]) => void> = new Set()
  private static initialized = false

  static initialize(): void {
    if (this.initialized) return
    this.initialized = true
    this.loadFromStorage()
  }

  private static loadFromStorage(): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const raw = sessionStorage.getItem(CHECKPOINTS_STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as AiCheckpoint[]
          if (Array.isArray(parsed)) {
            this.checkpoints = parsed
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load AI checkpoints from session storage', err)
    }
  }

  private static persistToStorage(): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(CHECKPOINTS_STORAGE_KEY, JSON.stringify(this.checkpoints.slice(-50)))
      }
    } catch (err) {
      console.warn('Failed to persist AI checkpoints to session storage', err)
    }
  }

  /**
   * Captures a pre-edit shadow snapshot before the AI applies a file write or edit.
   */
  static async recordSnapshot(params: {
    toolCallId: string
    filePath: string
    newContent: string
    description?: string
    currentContentResolver?: (path: string) => Promise<string | null>
  }): Promise<AiCheckpoint> {
    this.initialize()

    const { toolCallId, filePath, newContent, description, currentContentResolver } = params
    const fileName = filePath.split(/[/\\]/).pop() || filePath

    let beforeContent = ''
    let isNewFile = true

    if (currentContentResolver) {
      try {
        const existing = await currentContentResolver(filePath)
        if (existing !== null) {
          beforeContent = existing
          isNewFile = false
        }
      } catch {
        // File does not exist yet
      }
    } else if (typeof window !== 'undefined' && window.electronAPI?.readFile) {
      try {
        const existing = await window.electronAPI.readFile(filePath)
        if (existing !== undefined && existing !== null) {
          beforeContent = existing
          isNewFile = false
        }
      } catch {
        // File does not exist yet
      }
    }

    const checkpoint: AiCheckpoint = {
      id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      toolCallId,
      timestamp: Date.now(),
      description: description || `Edit ${fileName}`,
      files: [
        {
          filePath,
          fileName,
          beforeContent,
          afterContent: newContent,
          isNewFile,
        },
      ],
      restored: false,
    }

    this.checkpoints.unshift(checkpoint)
    this.persistToStorage()
    this.notify()

    return checkpoint
  }

  /**
   * Rolls back all files modified in the specified checkpoint to their pre-edit state.
   */
  static async rollbackCheckpoint(
    checkpointId: string,
    fileWriter: (path: string, content: string) => Promise<boolean>
  ): Promise<boolean> {
    this.initialize()

    const cp = this.checkpoints.find((c) => c.id === checkpointId)
    if (!cp || cp.restored) return false

    let allSuccess = true
    for (const f of cp.files) {
      try {
        const ok = await fileWriter(f.filePath, f.beforeContent)
        if (!ok) allSuccess = false
      } catch (err) {
        console.error(`Failed to rollback file "${f.filePath}":`, err)
        allSuccess = false
      }
    }

    if (allSuccess) {
      cp.restored = true
      this.persistToStorage()
      this.notify()
    }

    return allSuccess
  }

  static getCheckpoints(): AiCheckpoint[] {
    this.initialize()
    return [...this.checkpoints]
  }

  static getCheckpointForToolCall(toolCallId: string): AiCheckpoint | undefined {
    this.initialize()
    return this.checkpoints.find((c) => c.toolCallId === toolCallId)
  }

  static subscribe(listener: (checkpoints: AiCheckpoint[]) => void): () => void {
    this.initialize()
    this.listeners.add(listener)
    listener(this.getCheckpoints())
    return () => this.listeners.delete(listener)
  }

  static clear(): void {
    this.checkpoints = []
    this.persistToStorage()
    this.notify()
  }

  private static notify(): void {
    const list = this.getCheckpoints()
    for (const l of this.listeners) {
      try {
        l(list)
      } catch (err) {
        console.error('Error in AI checkpoint subscriber', err)
      }
    }
  }
}

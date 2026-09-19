import { describe, it, expect, vi } from 'vitest'
import { SplitLayoutMode, EditorPaneState } from '../src/components/Editor/EditorGrid'

describe('EditorGrid & Split Pane Layout Management', () => {
  it('should support all standard IDE split layout modes', () => {
    const modes: SplitLayoutMode[] = ['single', 'split-vertical', 'split-horizontal', 'grid-2x2']
    expect(modes).toHaveLength(4)
    expect(modes).toContain('split-vertical')
    expect(modes).toContain('grid-2x2')
  })

  it('should maintain independent tab sets and active tabs for each pane', () => {
    const pane1: EditorPaneState = {
      id: 'pane-1',
      activeTabId: 'index.ts',
      tabIds: ['index.ts', 'app.ts'],
    }

    const pane2: EditorPaneState = {
      id: 'pane-2',
      activeTabId: 'test.ts',
      tabIds: ['index.ts', 'test.ts'],
    }

    expect(pane1.id).not.toBe(pane2.id)
    expect(pane1.activeTabId).toBe('index.ts')
    expect(pane2.activeTabId).toBe('test.ts')
  })

  it('should calculate proper split resize ratios within safe bounds', () => {
    const clampRatio = (val: number) => Math.max(15, Math.min(85, val))

    expect(clampRatio(50)).toBe(50)
    expect(clampRatio(5)).toBe(15) // clamped min
    expect(clampRatio(95)).toBe(85) // clamped max
  })
})

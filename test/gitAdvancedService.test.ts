import { describe, it, expect } from 'vitest'
import { gitAdvancedService } from '../src/services/gitAdvancedService'

describe('GitAdvancedService', () => {
  const conflictedCode = `
import React from 'react'

<<<<<<< HEAD
export const Title = () => <h1>Local Feature Version</h1>
=======
export const Title = () => <h1>Incoming Main Version</h1>
>>>>>>> main

export default Title
`

  it('detects and parses Git merge conflicts accurately', () => {
    const conflicts = gitAdvancedService.parseConflicts('src/Title.tsx', conflictedCode)
    expect(conflicts.length).toBe(1)
    expect(conflicts[0].startLine).toBe(4)
    expect(conflicts[0].endLine).toBe(8)
    expect(conflicts[0].currentBranch).toBe('HEAD')
    expect(conflicts[0].incomingBranch).toBe('main')
    expect(conflicts[0].currentText).toContain('Local Feature Version')
    expect(conflicts[0].incomingText).toContain('Incoming Main Version')
  })

  it('resolves conflict by accepting Current change (HEAD)', () => {
    const conflicts = gitAdvancedService.parseConflicts('src/Title.tsx', conflictedCode)
    const resolved = gitAdvancedService.resolveConflictInContent(
      conflictedCode,
      conflicts[0],
      'current'
    )
    expect(resolved).toContain('Local Feature Version')
    expect(resolved).not.toContain('<<<<<<<')
    expect(resolved).not.toContain('=======')
    expect(resolved).not.toContain('>>>>>>>')
  })

  it('resolves conflict by accepting Incoming change', () => {
    const conflicts = gitAdvancedService.parseConflicts('src/Title.tsx', conflictedCode)
    const resolved = gitAdvancedService.resolveConflictInContent(
      conflictedCode,
      conflicts[0],
      'incoming'
    )
    expect(resolved).toContain('Incoming Main Version')
    expect(resolved).not.toContain('<<<<<<<')
  })

  it('resolves conflict by accepting Both changes', () => {
    const conflicts = gitAdvancedService.parseConflicts('src/Title.tsx', conflictedCode)
    const resolved = gitAdvancedService.resolveConflictInContent(
      conflictedCode,
      conflicts[0],
      'both'
    )
    expect(resolved).toContain('Local Feature Version')
    expect(resolved).toContain('Incoming Main Version')
  })

  it('resolves all conflicts across document at once', () => {
    const resolvedAll = gitAdvancedService.resolveAllConflicts(
      'src/Title.tsx',
      conflictedCode,
      'current'
    )
    const remaining = gitAdvancedService.parseConflicts('src/Title.tsx', resolvedAll)
    expect(remaining.length).toBe(0)
  })

  it('computes git blame annotations for lines in a file', () => {
    const blame = gitAdvancedService.getBlameForFile('src/Title.tsx', conflictedCode)
    expect(blame.length).toBeGreaterThan(0)
    expect(blame[0].author).toBeDefined()
    expect(blame[0].commitHash).toBeDefined()
    expect(blame[0].relativeDate).toBeDefined()
  })

  it('calculates diff hunks and tracks staging state', () => {
    const oldCode = 'line 1\nline 2\nline 3'
    const newCode = 'line 1\nmodified line 2\nline 3'

    const hunks = gitAdvancedService.calculateHunks('test.txt', oldCode, newCode)
    expect(hunks.length).toBe(1)
    expect(hunks[0].type).toBe('modification')

    gitAdvancedService.stageHunk(hunks[0].id)
    expect(gitAdvancedService.isHunkStaged(hunks[0].id)).toBe(true)

    gitAdvancedService.unstageHunk(hunks[0].id)
    expect(gitAdvancedService.isHunkStaged(hunks[0].id)).toBe(false)
  })
})

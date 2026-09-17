import { describe, it, expect } from 'vitest'
import { diffStudioService } from '../src/services/diffStudioService'

describe('diffStudioService', () => {
  it('computes diff between two strings accurately', () => {
    const orig = 'const a = 1;\nconst b = 2;\nconsole.log(a + b);'
    const mod = 'const a = 1;\nconst b = 3;\nconsole.log(a * b);'

    const res = diffStudioService.computeDiff(orig, mod)
    expect(res.lines.length).toBeGreaterThan(0)
    expect(res.summary.modifications).toBe(2)
    expect(res.summary.unchanged).toBe(1)
  })

  it('handles addition and deletion correctly', () => {
    const orig = 'line 1\nline 2'
    const mod = 'line 1\nline 2\nline 3'

    const res = diffStudioService.computeDiff(orig, mod)
    expect(res.summary.additions).toBe(1)
    expect(res.summary.deletions).toBe(0)
  })

  it('computes character-level differences', () => {
    const left = 'const greeting = "Hello World";'
    const right = 'const greeting = "Hello Universe";'

    const charDiff = diffStudioService.computeCharDiff(left, right)
    expect(charDiff.left.some((c) => c.text === 'World' && c.type === 'del')).toBe(true)
    expect(charDiff.right.some((c) => c.text === 'Universe' && c.type === 'add')).toBe(true)
  })

  it('generates standard unified patch format', () => {
    const orig = 'hello'
    const mod = 'world'

    const patch = diffStudioService.generateUnifiedPatch('test.txt', orig, mod)
    expect(patch).toContain('--- a/test.txt')
    expect(patch).toContain('+++ b/test.txt')
    expect(patch).toContain('-hello')
    expect(patch).toContain('+world')
  })

  it('parses and resolves git merge conflict markers', () => {
    const conflictText = `function test() {
<<<<<<< HEAD
  return 1;
=======
  return 2;
>>>>>>> branch
}`

    const conflicts = diffStudioService.parseMergeConflicts(conflictText)
    expect(conflicts.length).toBe(1)
    expect(conflicts[0].currentText).toBe('  return 1;')
    expect(conflicts[0].incomingText).toBe('  return 2;')

    const resolvedCurrent = diffStudioService.resolveConflict(conflictText, conflicts[0].id, 'accept-current')
    expect(resolvedCurrent).toContain('return 1;')
    expect(resolvedCurrent).not.toContain('<<<<<<<')

    const resolvedIncoming = diffStudioService.resolveConflict(conflictText, conflicts[0].id, 'accept-incoming')
    expect(resolvedIncoming).toContain('return 2;')
    expect(resolvedIncoming).not.toContain('<<<<<<<')
  })
})

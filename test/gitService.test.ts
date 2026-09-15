import { describe, it, expect } from 'vitest'
import { isGitRepo, getRepoStatus, getCommitLog } from '../electron/git-service'

describe('Git Service & Visual Commit Graph', () => {
  it('should detect that current project workspace is a Git repo', async () => {
    const isRepo = await isGitRepo(process.cwd())
    expect(isRepo).toBe(true)
  })

  it('should parse repository status including branch and commit log', async () => {
    const status = await getRepoStatus(process.cwd())
    expect(status.isRepo).toBe(true)
    expect(status.branch).toBeDefined()
    expect(status.branch.length).toBeGreaterThan(0)
    expect(Array.isArray(status.staged)).toBe(true)
    expect(Array.isArray(status.working)).toBe(true)
    expect(Array.isArray(status.commits)).toBe(true)
    expect(status.commits.length).toBeGreaterThan(0)
  })

  it('should retrieve commit logs with topological track indices', async () => {
    const commits = await getCommitLog(process.cwd(), 10)
    expect(commits.length).toBeGreaterThan(0)

    const first = commits[0]
    expect(first.hash).toBeDefined()
    expect(first.hash.length).toBe(40)
    expect(first.shortHash).toBeDefined()
    expect(first.shortHash.length).toBeGreaterThanOrEqual(7)
    expect(first.authorName).toBeDefined()
    expect(first.message).toBeDefined()
    expect(typeof first.trackIndex).toBe('number')
    expect(first.trackIndex).toBeGreaterThanOrEqual(0)
  })

  it('should correctly handle non-git directory gracefully', async () => {
    const nonGitPath = process.platform === 'win32' ? 'C:\\Windows' : '/tmp'
    const status = await getRepoStatus(nonGitPath)
    expect(status.isRepo).toBe(false)
    expect(status.commits).toEqual([])
    expect(status.staged).toEqual([])
  })
})

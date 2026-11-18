import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { GitCommit, GitFileChange, GitFileStatusCode, GitRepoStatus } from '../packages/sdk/types'

const execFileAsync = promisify(execFile)

async function runGitRaw(args: string[], cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', args, { cwd, maxBuffer: 10 * 1024 * 1024 })
    return stdout
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(message)
  }
}

async function runGit(args: string[], cwd: string): Promise<string> {
  const stdout = await runGitRaw(args, cwd)
  return stdout.trim()
}

/**
 * Pure parser for `git status --porcelain=v1` output.
 * Preserves leading spaces on the first line (e.g. ` M src/foo.ts`), handles renames (`R  old -> new`),
 * and unquotes C-escaped Git paths.
 */
export function parsePorcelainStatus(rawOutput: string): {
  staged: GitFileChange[]
  working: GitFileChange[]
} {
  const staged: GitFileChange[] = []
  const working: GitFileChange[] = []
  if (!rawOutput) return { staged, working }

  const lines = rawOutput.split(/\r?\n/)
  for (const line of lines) {
    if (!line || line.length < 4) continue
    const indexStatus = line[0]
    const workStatus = line[1]
    let rawPath = line.substring(3).trim()

    // Handle renames/copies: "old/path -> new/path"
    if ((indexStatus === 'R' || indexStatus === 'C' || workStatus === 'R' || workStatus === 'C') && rawPath.includes(' -> ')) {
      const arrowIdx = rawPath.lastIndexOf(' -> ')
      rawPath = rawPath.substring(arrowIdx + 4).trim()
    }

    const filePath = rawPath.replace(/^"|"$/g, '')
    if (!filePath) continue

    if (indexStatus !== ' ' && indexStatus !== '?') {
      staged.push({
        path: filePath,
        status: (indexStatus as GitFileStatusCode) || 'M',
        isStaged: true,
      })
    }

    if (workStatus !== ' ' || indexStatus === '?') {
      working.push({
        path: filePath,
        status: (workStatus === '?' || indexStatus === '?' ? '?' : (workStatus as GitFileStatusCode)) || 'M',
        isStaged: false,
      })
    }
  }

  return { staged, working }
}

export async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    const res = await runGit(['rev-parse', '--is-inside-work-tree'], cwd)
    return res === 'true'
  } catch {
    return false
  }
}

export async function getRepoStatus(cwd: string): Promise<GitRepoStatus> {
  const isRepo = await isGitRepo(cwd)
  if (!isRepo) {
    return {
      isRepo: false,
      branch: '',
      ahead: 0,
      behind: 0,
      staged: [],
      working: [],
      commits: [],
    }
  }

  // 1. Current Branch
  let branch = 'HEAD'
  try {
    branch = await runGit(['branch', '--show-current'], cwd)
    if (!branch) {
      branch = await runGit(['rev-parse', '--short', 'HEAD'], cwd)
    }
  } catch {
    branch = 'master'
  }

  // 2. Ahead / Behind
  let ahead = 0
  let behind = 0
  try {
    const counts = await runGit(['rev-list', '--left-right', '--count', 'HEAD...@{u}'], cwd)
    const [left, right] = counts.split(/\s+/).map(Number)
    ahead = left || 0
    behind = right || 0
  } catch {
    // No upstream tracking configured, ignore
  }

  // 3. Staged & Working Tree Changes
  let staged: GitFileChange[] = []
  let working: GitFileChange[] = []

  try {
    // CRITICAL: Use runGitRaw (NOT .trim()) so leading space on line 1 (" M file.ts") is never stripped!
    const statusOut = await runGitRaw(['status', '--porcelain=v1'], cwd)
    const parsed = parsePorcelainStatus(statusOut)
    staged = parsed.staged
    working = parsed.working
  } catch (err) {
    console.warn('Failed to parse git status:', err)
  }

  // 4. Commits & Visual Graph
  const commits = await getCommitLog(cwd)

  return {
    isRepo: true,
    branch,
    ahead,
    behind,
    staged,
    working,
    commits,
  }
}

export async function getCommitLog(cwd: string, limit = 40): Promise<GitCommit[]> {
  try {
    // Format: Hash | ShortHash | AuthorName | AuthorEmail | ISO Date | Relative Date | Subject | Parents | Refs
    const delimiter = '~~~'
    const format = `%H${delimiter}%h${delimiter}%an${delimiter}%ae${delimiter}%aI${delimiter}%ar${delimiter}%s${delimiter}%P${delimiter}%D`
    const raw = await runGit(['log', `-n`, String(limit), `--format=${format}`], cwd)

    if (!raw) return []

    const lines = raw.split('\n')
    const commits: GitCommit[] = []

    // Map for calculating topological tracks
    const activeTracks: (string | null)[] = []

    for (const line of lines) {
      if (!line.trim()) continue
      const parts = line.split(delimiter)
      if (parts.length < 8) continue

      const [hash, shortHash, authorName, authorEmail, date, relativeDate, message, rawParents, rawRefs] = parts
      const parents = rawParents ? rawParents.trim().split(/\s+/) : []
      const refs = rawRefs
        ? rawRefs.split(',').map((r) => r.trim()).filter(Boolean)
        : []

      // Calculate track column for visual subway map
      let trackIndex = activeTracks.indexOf(hash)
      if (trackIndex === -1) {
        // Find first empty slot or append
        const emptySlot = activeTracks.indexOf(null)
        if (emptySlot !== -1) {
          trackIndex = emptySlot
          activeTracks[emptySlot] = hash
        } else {
          trackIndex = activeTracks.length
          activeTracks.push(hash)
        }
      }

      // Replace current commit with first parent
      if (parents.length > 0) {
        activeTracks[trackIndex] = parents[0]
        // If merge, track remaining parents
        for (let i = 1; i < parents.length; i++) {
          const p = parents[i]
          if (!activeTracks.includes(p)) {
            const nextEmpty = activeTracks.indexOf(null)
            if (nextEmpty !== -1) {
              activeTracks[nextEmpty] = p
            } else {
              activeTracks.push(p)
            }
          }
        }
      } else {
        activeTracks[trackIndex] = null
      }

      commits.push({
        hash,
        shortHash,
        authorName,
        authorEmail,
        date,
        relativeDate,
        message,
        parents,
        refs,
        trackIndex,
      })
    }

    return commits
  } catch {
    return []
  }
}

export async function stageFile(cwd: string, filePath: string): Promise<boolean> {
  try {
    await runGit(['add', filePath], cwd)
    return true
  } catch {
    return false
  }
}

export async function unstageFile(cwd: string, filePath: string): Promise<boolean> {
  try {
    await runGit(['restore', '--staged', '--', filePath], cwd)
    return true
  } catch {
    // Unborn branch (no HEAD commit yet): fall back to git rm --cached
    try {
      await runGit(['rm', '--cached', '--', filePath], cwd)
      return true
    } catch {
      return false
    }
  }
}

export async function commitChanges(cwd: string, message: string): Promise<boolean> {
  try {
    await runGit(['commit', '-m', message], cwd)
    return true
  } catch {
    return false
  }
}

export async function initGitRepository(cwd: string): Promise<boolean> {
  try {
    await runGit(['init'], cwd)
    return true
  } catch {
    return false
  }
}

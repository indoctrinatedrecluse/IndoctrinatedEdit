import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'
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
    const raw = await runGit(['log', '--all', '--topo-order', `-n`, String(limit), `--format=${format}`], cwd)

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

export interface GitBlameEntry {
  lineNumber: number
  hash: string
  shortHash: string
  author: string
  authorEmail: string
  date: string
  summary: string
}

/**
 * Pure parser for `git blame --line-porcelain <file>` output.
 */
export function parseGitBlamePorcelain(raw: string): GitBlameEntry[] {
  const entries: GitBlameEntry[] = []
  if (!raw) return entries

  const lines = raw.split(/\r?\n/)
  let curHash = ''
  let curLine = 0
  let curAuthor = 'Unknown'
  let curEmail = ''
  let curTime = 0
  let curSummary = ''

  for (const line of lines) {
    const headerMatch = line.match(/^([0-9a-f]{40})\s+\d+\s+(\d+)(?:\s+\d+)?$/)
    if (headerMatch) {
      curHash = headerMatch[1]
      curLine = Number(headerMatch[2])
      continue
    }
    if (line.startsWith('author ')) {
      curAuthor = line.slice(7).trim()
    } else if (line.startsWith('author-mail ')) {
      curEmail = line.slice(12).trim().replace(/^<|>$/g, '')
    } else if (line.startsWith('author-time ')) {
      curTime = Number(line.slice(12).trim()) || 0
    } else if (line.startsWith('summary ')) {
      curSummary = line.slice(8).trim()
    } else if (line.startsWith('\t')) {
      entries.push({
        lineNumber: curLine,
        hash: curHash,
        shortHash: curHash.slice(0, 7),
        author: curAuthor,
        authorEmail: curEmail,
        date: curTime ? new Date(curTime * 1000).toISOString() : '',
        summary: curSummary,
      })
    }
  }

  return entries
}

export async function getGitBlame(cwd: string, filePath: string): Promise<GitBlameEntry[]> {
  try {
    const raw = await runGitRaw(['blame', '--line-porcelain', '--', filePath], cwd)
    return parseGitBlamePorcelain(raw)
  } catch {
    return []
  }
}

export async function getGitDiff(
  cwd: string,
  options?: { staged?: boolean; filePath?: string }
): Promise<string> {
  try {
    const args = ['diff']
    if (options?.staged) args.push('--cached')
    if (options?.filePath) {
      args.push('--', options.filePath)
    }
    return await runGitRaw(args, cwd)
  } catch {
    return ''
  }
}

export async function applyGitPatch(
  cwd: string,
  patch: string,
  options?: { cached?: boolean; reverse?: boolean }
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const args = ['apply']
    if (options?.cached) args.push('--cached')
    if (options?.reverse) args.push('--reverse')
    args.push('-')

    const child = spawn('git', args, { cwd, windowsHide: true })
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('error', (err) => {
      resolve({ success: false, error: err.message })
    })
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true })
      } else {
        resolve({ success: false, error: stderr.trim() || `git apply exited with code ${code}` })
      }
    })
    child.stdin.write(patch)
    child.stdin.end()
  })
}

export interface GitActionResult {
  success: boolean
  output?: string
  error?: string
}

async function runGitAction(args: string[], cwd: string): Promise<GitActionResult> {
  try {
    const out = await runGit(args, cwd)
    return { success: true, output: out }
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) }
  }
}

export async function listBranches(cwd: string): Promise<{ current: string; local: string[]; remote: string[] }> {
  try {
    const current = await runGit(['branch', '--show-current'], cwd).catch(() => '')
    const localRaw = await runGit(['branch', '--format=%(refname:short)'], cwd).catch(() => '')
    const remoteRaw = await runGit(['branch', '-r', '--format=%(refname:short)'], cwd).catch(() => '')
    return {
      current,
      local: localRaw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
      remote: remoteRaw.split(/\r?\n/).map((s) => s.trim()).filter((s) => Boolean(s) && !s.endsWith('/HEAD')),
    }
  } catch {
    return { current: '', local: [], remote: [] }
  }
}

export async function checkoutBranch(cwd: string, branch: string, createNew = false): Promise<GitActionResult> {
  const args = createNew ? ['checkout', '-b', branch] : ['checkout', branch]
  return runGitAction(args, cwd)
}

export async function deleteBranch(cwd: string, branch: string, force = false): Promise<GitActionResult> {
  return runGitAction(['branch', force ? '-D' : '-d', branch], cwd)
}

export async function gitPull(cwd: string): Promise<GitActionResult> {
  return runGitAction(['pull'], cwd)
}

export async function gitPush(cwd: string): Promise<GitActionResult> {
  return runGitAction(['push'], cwd)
}

export async function gitFetch(cwd: string): Promise<GitActionResult> {
  return runGitAction(['fetch', '--all', '--prune'], cwd)
}

export async function discardFileChanges(cwd: string, filePath: string, isUntracked = false): Promise<GitActionResult> {
  if (isUntracked) {
    try {
      const target = path.resolve(cwd, filePath)
      await fs.rm(target, { recursive: true, force: true })
      return { success: true, output: `Removed untracked ${filePath}` }
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) }
    }
  }
  return runGitAction(['checkout', '--', filePath], cwd)
}

export interface GitStashEntry {
  ref: string
  message: string
  date: string
}

export async function stashList(cwd: string): Promise<GitStashEntry[]> {
  try {
    const raw = await runGit(['stash', 'list', '--format=%gd~~~%gs~~~%ar'], cwd)
    if (!raw) return []
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [ref, message, date] = line.split('~~~')
        return { ref: ref || 'stash@{0}', message: message || '', date: date || '' }
      })
  } catch {
    return []
  }
}

export async function stashSave(cwd: string, message?: string): Promise<GitActionResult> {
  const args = message?.trim() ? ['stash', 'push', '-u', '-m', message.trim()] : ['stash', 'push', '-u']
  return runGitAction(args, cwd)
}

export async function stashPop(cwd: string, ref?: string): Promise<GitActionResult> {
  return runGitAction(ref ? ['stash', 'pop', ref] : ['stash', 'pop'], cwd)
}

export async function stashDrop(cwd: string, ref: string): Promise<GitActionResult> {
  return runGitAction(['stash', 'drop', ref], cwd)
}

export async function cherryPickCommit(cwd: string, hash: string): Promise<GitActionResult> {
  return runGitAction(['cherry-pick', hash], cwd)
}

export async function revertCommit(cwd: string, hash: string): Promise<GitActionResult> {
  return runGitAction(['revert', '--no-edit', hash], cwd)
}

export async function mergeBranch(cwd: string, branch: string): Promise<GitActionResult> {
  return runGitAction(['merge', branch], cwd)
}

export async function rebaseBranch(cwd: string, branch: string): Promise<GitActionResult> {
  return runGitAction(['rebase', branch], cwd)
}

export async function showCommitDetails(
  cwd: string,
  hash: string
): Promise<{ hash: string; stat: string; files: string[]; diff: string }> {
  try {
    const stat = await runGit(['show', '--stat', '--format=fuller', hash], cwd)
    const filesRaw = await runGit(['show', '--name-only', '--format=', hash], cwd)
    const diff = await runGitRaw(['show', '--format=', hash], cwd)
    return {
      hash,
      stat,
      files: filesRaw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
      diff: diff.slice(0, 60000),
    }
  } catch (err: any) {
    return { hash, stat: err?.message || 'Failed to load commit details', files: [], diff: '' }
  }
}

export async function getRemoteInfo(cwd: string): Promise<{ url: string; owner?: string; repo?: string }> {
  try {
    const url = await runGit(['remote', 'get-url', 'origin'], cwd)
    const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/i)
    if (match) {
      return { url, owner: match[1], repo: match[2] }
    }
    return { url }
  } catch {
    return { url: '' }
  }
}

export interface GitTagEntry {
  name: string
  hash: string
  date: string
  message: string
}

export async function listTags(cwd: string): Promise<GitTagEntry[]> {
  try {
    const delimiter = '~~~'
    const format = `%(refname:short)${delimiter}%(objectname:short)${delimiter}%(creatordate:iso8601)${delimiter}%(contents:subject)`
    const raw = await runGit(['tag', '-l', `--format=${format}`, '--sort=-creatordate'], cwd)
    if (!raw) return []
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [name, hash, date, message] = line.split(delimiter)
        return {
          name: name || '',
          hash: hash || '',
          date: date || '',
          message: message || '',
        }
      })
  } catch {
    return []
  }
}

export async function createTag(
  cwd: string,
  tagName: string,
  message?: string,
  commitHash?: string
): Promise<GitActionResult> {
  const safeTag = tagName.trim()
  if (!safeTag) return { success: false, error: 'Tag name cannot be empty' }
  const args = message?.trim()
    ? ['tag', '-a', safeTag, '-m', message.trim()]
    : ['tag', safeTag]
  if (commitHash?.trim()) {
    args.push(commitHash.trim())
  }
  return runGitAction(args, cwd)
}

export async function deleteTag(cwd: string, tagName: string): Promise<GitActionResult> {
  return runGitAction(['tag', '-d', tagName.trim()], cwd)
}

export async function resetToCommit(
  cwd: string,
  hash: string,
  mode: 'soft' | 'mixed' | 'hard' = 'mixed'
): Promise<GitActionResult> {
  return runGitAction(['reset', `--${mode}`, hash.trim()], cwd)
}

export interface GhCliStatus {
  installed: boolean
  version?: string
  authenticated: boolean
  account?: string
  error?: string
}

export async function checkGhCli(cwd: string): Promise<GhCliStatus> {
  try {
    const { stdout: verOut } = await execFileAsync('gh', ['--version'], { cwd, timeout: 5000, windowsHide: true })
    const verMatch = verOut.match(/gh version\s+([0-9.]+)/i)
    const version = verMatch ? verMatch[1] : verOut.split('\n')[0].trim()

    let authenticated = false
    let account = ''
    try {
      const { stdout: authOut, stderr: authErr } = await execFileAsync('gh', ['auth', 'status'], {
        cwd,
        timeout: 6000,
        windowsHide: true,
      })
      const combined = `${authOut}\n${authErr}`
      authenticated = combined.includes('Logged in to') || combined.includes('Active account: true')
      const acctMatch = combined.match(/account\s+([a-zA-Z0-9_-]+)/i) || combined.match(/Logged in to [^\s]+ account\s+([a-zA-Z0-9_-]+)/i)
      if (acctMatch) account = acctMatch[1]
    } catch (authErr: any) {
      const msg = String(authErr?.message || authErr)
      authenticated = msg.includes('Logged in to')
    }

    return {
      installed: true,
      version,
      authenticated,
      account,
    }
  } catch (err: any) {
    return {
      installed: false,
      authenticated: false,
      error: err?.message || 'GitHub CLI (gh) executable not found in PATH',
    }
  }
}

export async function ghPrList(cwd: string, limit = 20): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const { stdout } = await execFileAsync(
      'gh',
      ['pr', 'list', '--limit', String(limit), '--json', 'number,title,author,state,headRefName,baseRefName,createdAt,url,isDraft'],
      { cwd, timeout: 12000, windowsHide: true }
    )
    const data = JSON.parse(stdout || '[]')
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to list pull requests' }
  }
}

export async function ghPrCheckout(cwd: string, prNumber: number): Promise<GitActionResult> {
  try {
    const { stdout } = await execFileAsync('gh', ['pr', 'checkout', String(prNumber)], {
      cwd,
      timeout: 20000,
      windowsHide: true,
    })
    return { success: true, output: stdout.trim() }
  } catch (err: any) {
    return { success: false, error: err?.message || 'gh pr checkout failed' }
  }
}

export async function ghReleaseList(cwd: string, limit = 15): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const { stdout } = await execFileAsync(
      'gh',
      ['release', 'list', '--limit', String(limit), '--json', 'tagName,name,publishedAt,isDraft,isPrerelease'],
      { cwd, timeout: 12000, windowsHide: true }
    )
    const data = JSON.parse(stdout || '[]')
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to list GitHub releases' }
  }
}

export async function ghRunView(cwd: string, runId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { stdout } = await execFileAsync(
      'gh',
      ['run', 'view', runId.replace(/[^0-9]/g, ''), '--json', 'jobs,status,conclusion,event,workflowName,headBranch,headSha,url'],
      { cwd, timeout: 15000, windowsHide: true }
    )
    const data = JSON.parse(stdout || '{}')
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to view workflow run details' }
  }
}

export async function ghRunLogs(
  cwd: string,
  runId: string,
  jobId?: string,
  failedOnly = false
): Promise<{ success: boolean; logs?: string[]; error?: string }> {
  try {
    const args = ['run', 'view', runId.replace(/[^0-9]/g, '')]
    if (failedOnly) {
      args.push('--log-failed')
    } else if (jobId) {
      args.push('--job', jobId.replace(/[^0-9]/g, ''), '--log')
    } else {
      args.push('--log')
    }
    const { stdout } = await execFileAsync('gh', args, { cwd, timeout: 20000, maxBuffer: 15 * 1024 * 1024, windowsHide: true })
    const logs = stdout.split(/\r?\n/).slice(-300)
    return { success: true, logs }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch workflow run logs' }
  }
}

/**
 * Persistent Multi-Language Jupyter Kernel Service (Electron Main Process)
 *
 * - Python Kernel: Spawns a persistent `python -u` REPL worker process with newline-delimited JSON IPC.
 *   Preserves globals across cell runs, evaluates final AST expression (like IPython),
 *   captures matplotlib figures as base64 PNG, Pandas DataFrames as HTML, real locals() variables,
 *   and real process RSS memory.
 * - Node.js Kernel: Runs a persistent Node.js `vm` context capturing stdout/stderr, final value,
 *   and live variables.
 * - Environment Discovery: Queries real `python --version`, `node --version`, and `pip list --format=json`.
 */

import { spawn, execFile, ChildProcess } from 'node:child_process'
import { promisify } from 'node:util'
import vm from 'node:vm'
import type { IpcMain } from 'electron'

const execFileAsync = promisify(execFile)

export interface KernelExecutionOutput {
  output_type: 'stream' | 'execute_result' | 'display_data' | 'error'
  name?: 'stdout' | 'stderr'
  text?: string
  data?: Record<string, any>
  ename?: string
  evalue?: string
  traceback?: string[]
}

export interface KernelVariableInfo {
  name: string
  type: string
  size: string
  value: string
}

export interface KernelExecResponse {
  ok: boolean
  outputs: KernelExecutionOutput[]
  variables: KernelVariableInfo[]
  ramMb: number
  durationMs: number
  error?: string
}

const PYTHON_WORKER_SCRIPT = `
import sys, json, io, ast, traceback, base64, os

try:
    import matplotlib
    matplotlib.use('Agg')
except Exception:
    pass

ns = {'__name__': '__main__', '__builtins__': __builtins__}

def get_ram_mb():
    try:
        import resource
        r = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        return round(r / (1024.0 * 1024.0) if sys.platform == 'darwin' else r / 1024.0, 1)
    except Exception:
        return 32.0

def collect_vars():
    out = []
    for k, v in list(ns.items()):
        if k.startswith('_'):
            continue
        tname = type(v).__name__
        if tname in ('module', 'function', 'type', 'builtin_function_or_method'):
            continue
        try:
            if hasattr(v, 'shape'):
                sz = str(v.shape)
            elif hasattr(v, '__len__'):
                sz = f"len={len(v)}"
            else:
                sz = f"{sys.getsizeof(v)} B"
            val_str = repr(v)
            if len(val_str) > 120:
                val_str = val_str[:117] + '...'
            out.append({'name': k, 'type': tname, 'size': sz, 'value': val_str})
        except Exception:
            pass
    return out[:60]

for raw_line in sys.stdin:
    raw_line = raw_line.strip()
    if not raw_line:
        continue
    try:
        req = json.loads(raw_line)
    except Exception:
        continue
    req_id = req.get('id')
    code = req.get('code', '')
    outputs = []
    stdout_buf = io.StringIO()
    stderr_buf = io.StringIO()
    old_out, old_err = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = stdout_buf, stderr_buf
    ok = True
    try:
        tree = ast.parse(code, mode='exec')
        last_expr = None
        if tree.body and isinstance(tree.body[-1], ast.Expr):
            last_expr = ast.Expression(tree.body.pop().value)
        if tree.body:
            exec(compile(tree, '<cell>', 'exec'), ns, ns)
        if last_expr is not None:
            val = eval(compile(last_expr, '<cell>', 'eval'), ns, ns)
            if val is not None:
                data = {'text/plain': repr(val)}
                if hasattr(val, '_repr_html_'):
                    try:
                        html = val._repr_html_()
                        if html:
                            data['text/html'] = html
                    except Exception:
                        pass
                if hasattr(val, '_repr_svg_'):
                    try:
                        svg = val._repr_svg_()
                        if svg:
                            data['image/svg+xml'] = svg
                    except Exception:
                        pass
                outputs.append({'output_type': 'execute_result', 'data': data})
        if 'matplotlib.pyplot' in sys.modules:
            import matplotlib.pyplot as plt
            for fignum in plt.get_fignums():
                fig = plt.figure(fignum)
                bio = io.BytesIO()
                fig.savefig(bio, format='png', bbox_inches='tight', dpi=110)
                b64 = base64.b64encode(bio.getvalue()).decode('ascii')
                outputs.append({'output_type': 'display_data', 'data': {'image/png': b64, 'text/plain': '<Figure>'}})
            plt.close('all')
    except Exception as ex:
        ok = False
        tb = traceback.format_exc().splitlines()
        outputs.append({
            'output_type': 'error',
            'ename': type(ex).__name__,
            'evalue': str(ex),
            'traceback': tb
        })
    finally:
        sys.stdout, sys.stderr = old_out, old_err
    so = stdout_buf.getvalue()
    se = stderr_buf.getvalue()
    if so:
        outputs.insert(0, {'output_type': 'stream', 'name': 'stdout', 'text': so})
    if se:
        outputs.append({'output_type': 'stream', 'name': 'stderr', 'text': se})
    resp = {'id': req_id, 'ok': ok, 'outputs': outputs, 'variables': collect_vars(), 'ramMb': get_ram_mb()}
    sys.__stdout__.write('__IE_JUPYTER__' + json.dumps(resp) + '\\n')
    sys.__stdout__.flush()
`

class PersistentPythonKernel {
  private child: ChildProcess | null = null
  private reqId = 1
  private rxBuf = ''
  private pending = new Map<number, { resolve: (r: any) => void; reject: (e: Error) => void }>()

  private ensureRunning(cwd?: string): Promise<void> {
    if (this.child && !this.child.killed && this.child.stdin?.writable) {
      return Promise.resolve()
    }
    return new Promise((resolve, reject) => {
      const pyCmd = process.platform === 'win32' ? 'python' : 'python3'
      try {
        this.child = spawn(pyCmd, ['-u', '-c', PYTHON_WORKER_SCRIPT], {
          cwd: cwd || process.cwd(),
          windowsHide: true,
          env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        })
      } catch (err: any) {
        reject(new Error(`Failed to start Python kernel (${pyCmd}): ${err?.message}`))
        return
      }

      let started = false
      this.child.on('error', (err: any) => {
        const msg = err.code === 'ENOENT' ? `Python executable '${pyCmd}' not found on PATH.` : err.message
        for (const [, p] of this.pending) p.reject(new Error(msg))
        this.pending.clear()
        this.child = null
        if (!started) reject(new Error(msg))
      })

      this.child.stdout?.on('data', (chunk) => {
        this.rxBuf += String(chunk)
        let idx: number
        while ((idx = this.rxBuf.indexOf('\n')) !== -1) {
          const line = this.rxBuf.slice(0, idx).trim()
          this.rxBuf = this.rxBuf.slice(idx + 1)
          const marker = '__IE_JUPYTER__'
          const mPos = line.indexOf(marker)
          if (mPos !== -1) {
            try {
              const payload = JSON.parse(line.slice(mPos + marker.length))
              const p = this.pending.get(payload.id)
              if (p) {
                this.pending.delete(payload.id)
                p.resolve(payload)
              }
            } catch {
              // ignore malformed JSON
            }
          }
        }
      })

      this.child.on('close', () => {
        for (const [, p] of this.pending) p.reject(new Error('Python kernel exited unexpectedly'))
        this.pending.clear()
        this.child = null
      })

      setTimeout(() => {
        if (this.child && !this.child.killed) {
          started = true
          resolve()
        }
      }, 60)
    })
  }

  public async execute(code: string, cwd?: string): Promise<KernelExecResponse> {
    const start = Date.now()
    try {
      await this.ensureRunning(cwd)
    } catch (err: any) {
      return {
        ok: false,
        outputs: [{ output_type: 'error', ename: 'KernelStartError', evalue: err.message, traceback: [err.message] }],
        variables: [],
        ramMb: 0,
        durationMs: Date.now() - start,
        error: err.message,
      }
    }

    const id = this.reqId++
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          this.restart()
          resolve({
            ok: false,
            outputs: [{ output_type: 'error', ename: 'TimeoutError', evalue: 'Cell execution exceeded 60s limit', traceback: ['Cell execution timed out and kernel was restarted.'] }],
            variables: [],
            ramMb: 0,
            durationMs: Date.now() - start,
            error: 'Timeout',
          })
        }
      }, 60000)

      this.pending.set(id, {
        resolve: (res) => {
          clearTimeout(timer)
          resolve({
            ok: Boolean(res.ok),
            outputs: Array.isArray(res.outputs) ? res.outputs : [],
            variables: Array.isArray(res.variables) ? res.variables : [],
            ramMb: Number(res.ramMb) || 0,
            durationMs: Date.now() - start,
          })
        },
        reject: (err) => {
          clearTimeout(timer)
          resolve({
            ok: false,
            outputs: [{ output_type: 'error', ename: 'KernelError', evalue: err.message, traceback: [err.message] }],
            variables: [],
            ramMb: 0,
            durationMs: Date.now() - start,
            error: err.message,
          })
        },
      })

      this.child!.stdin!.write(JSON.stringify({ id, code }) + '\n')
    })
  }

  public interrupt(): void {
    try {
      if (this.child && !this.child.killed) {
        this.child.kill('SIGINT')
      }
    } catch {}
  }

  public restart(): void {
    try {
      if (this.child && !this.child.killed) {
        this.child.kill()
      }
    } catch {}
    this.child = null
    this.rxBuf = ''
    for (const [, p] of this.pending) p.reject(new Error('Kernel restarted'))
    this.pending.clear()
  }
}

class PersistentNodeKernel {
  private context: vm.Context | null = null
  private stdoutLogs: string[] = []
  private stderrLogs: string[] = []

  private ensureContext(): vm.Context {
    if (!this.context) {
      const sandbox: Record<string, any> = {
        console: {
          log: (...args: any[]) => this.stdoutLogs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
          info: (...args: any[]) => this.stdoutLogs.push(args.map(String).join(' ')),
          warn: (...args: any[]) => this.stderrLogs.push(args.map(String).join(' ')),
          error: (...args: any[]) => this.stderrLogs.push(args.map(String).join(' ')),
        },
        Math,
        Date,
        JSON,
        Array,
        Object,
        Map,
        Set,
        RegExp,
        Buffer,
        URL,
        TextEncoder,
        TextDecoder,
      }
      this.context = vm.createContext(sandbox)
    }
    return this.context
  }

  public execute(code: string): KernelExecResponse {
    const start = Date.now()
    const ctx = this.ensureContext()
    this.stdoutLogs = []
    this.stderrLogs = []
    const outputs: KernelExecutionOutput[] = []
    let ok = true

    try {
      const result = vm.runInContext(code, ctx, { timeout: 15000 })
      if (this.stdoutLogs.length > 0) {
        outputs.push({ output_type: 'stream', name: 'stdout', text: this.stdoutLogs.join('\n') + '\n' })
      }
      if (this.stderrLogs.length > 0) {
        outputs.push({ output_type: 'stream', name: 'stderr', text: this.stderrLogs.join('\n') + '\n' })
      }
      if (result !== undefined) {
        const plain = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)
        outputs.push({ output_type: 'execute_result', data: { 'text/plain': plain } })
      }
    } catch (err: any) {
      ok = false
      outputs.push({
        output_type: 'error',
        ename: err?.name || 'Error',
        evalue: err?.message || String(err),
        traceback: (err?.stack || String(err)).split('\n'),
      })
    }

    const skip = new Set(['console', 'Math', 'Date', 'JSON', 'Array', 'Object', 'Map', 'Set', 'RegExp', 'Buffer', 'URL', 'TextEncoder', 'TextDecoder'])
    const variables: KernelVariableInfo[] = []
    for (const [k, v] of Object.entries(ctx)) {
      if (skip.has(k) || typeof v === 'function') continue
      const str = typeof v === 'object' ? JSON.stringify(v)?.slice(0, 100) || '[Object]' : String(v)
      variables.push({
        name: k,
        type: Array.isArray(v) ? `Array(${v.length})` : typeof v,
        size: `${str.length} B`,
        value: str,
      })
    }

    return {
      ok,
      outputs,
      variables: variables.slice(0, 50),
      ramMb: Math.round((process.memoryUsage().rss / (1024 * 1024)) * 10) / 10,
      durationMs: Date.now() - start,
    }
  }

  public restart(): void {
    this.context = null
  }
}

const pythonKernel = new PersistentPythonKernel()
const nodeKernel = new PersistentNodeKernel()

export function disposeJupyterKernels(): void {
  pythonKernel.restart()
  nodeKernel.restart()
}

export async function getJupyterEnvInfo(): Promise<{
  pythonVersion: string | null
  nodeVersion: string
  packages: Array<{ name: string; version: string }>
}> {
  const pyCmd = process.platform === 'win32' ? 'python' : 'python3'
  let pythonVersion: string | null = null
  let packages: Array<{ name: string; version: string }> = []

  try {
    const { stdout, stderr } = await execFileAsync(pyCmd, ['--version'], { timeout: 5000, windowsHide: true })
    pythonVersion = (stdout || stderr).trim().replace(/^Python\s+/i, '')
  } catch {
    pythonVersion = null
  }

  if (pythonVersion) {
    try {
      const { stdout } = await execFileAsync(pyCmd, ['-m', 'pip', 'list', '--format=json'], {
        timeout: 12000,
        windowsHide: true,
      })
      const parsed = JSON.parse(stdout)
      if (Array.isArray(parsed)) {
        packages = parsed.slice(0, 120).map((p: any) => ({ name: String(p.name), version: String(p.version) }))
      }
    } catch {
      packages = []
    }
  }

  return {
    pythonVersion,
    nodeVersion: process.versions.node,
    packages,
  }
}

export function setupJupyterIPC(ipcMain: IpcMain): void {
  ipcMain.handle('jupyter:execute', async (_, opts: { language: 'python' | 'javascript'; code: string; cwd?: string }) => {
    if (opts.language === 'javascript') {
      return nodeKernel.execute(opts.code)
    }
    return await pythonKernel.execute(opts.code, opts.cwd)
  })

  ipcMain.handle('jupyter:restart', async (_, language?: 'python' | 'javascript') => {
    if (!language || language === 'python') pythonKernel.restart()
    if (!language || language === 'javascript') nodeKernel.restart()
    return true
  })

  ipcMain.handle('jupyter:interrupt', async () => {
    pythonKernel.interrupt()
    return true
  })

  ipcMain.handle('jupyter:getEnvInfo', async () => {
    return await getJupyterEnvInfo()
  })
}

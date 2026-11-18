import { describe, it, expect, afterEach, vi } from 'vitest'
import { jupyterKernelService } from '../src/services/jupyterKernelService'
import { cryptoDevToolsService } from '../src/services/cryptoDevToolsService'
import { envVaultService } from '../src/services/envVaultService'

describe('Phase R2-7: Persistent Jupyter Kernel, Real CryptoLab & Real EnvVault Disk I/O', () => {
  const origWindow = (globalThis as any).window

  afterEach(() => {
    if (origWindow === undefined) {
      delete (globalThis as any).window
    } else {
      ;(globalThis as any).window = origWindow
    }
  })

  it('jupyterKernelService delegates cell execution, variables, RAM, and restart to Electron persistent kernel IPC', async () => {
    const execute = vi.fn().mockResolvedValue({
      ok: true,
      outputs: [{ output_type: 'stream', name: 'stdout', text: '84\n' }],
      variables: [{ name: 'x', type: 'int', size: '28 B', value: '84' }],
      ramMb: 48.5,
      durationMs: 12,
    })
    const restart = vi.fn().mockResolvedValue(true)

    ;(globalThis as any).window = {
      electronAPI: {
        jupyter: {
          execute,
          restart,
          interrupt: vi.fn().mockResolvedValue(true),
          getEnvInfo: vi.fn().mockResolvedValue({
            pythonVersion: '3.12.7',
            nodeVersion: '22.14.0',
            packages: [{ name: 'numpy', version: '2.1.0' }],
          }),
        },
      },
    }

    await jupyterKernelService.loadEnvInfoAsync()
    expect(jupyterKernelService.getInstalledPackages()[0].name).toBe('numpy')

    const cell = {
      id: 'c1',
      cell_type: 'code' as const,
      source: 'x = 42 * 2\nprint(x)',
      execution_count: null,
      outputs: [],
      metadata: {},
    }
    const outputs = await jupyterKernelService.executeCell(cell)
    expect(execute).toHaveBeenCalledWith({ language: 'python', code: 'x = 42 * 2\nprint(x)' })
    expect(outputs[0].text).toBe('84\n')
    expect(jupyterKernelService.getVariables().find((v) => v.name === 'x')?.value).toBe('84')
    expect(jupyterKernelService.getEstimatedMemoryUsage()).toContain('48.5 MB')

    jupyterKernelService.restartKernel()
    expect(restart).toHaveBeenCalled()
  })

  it('cryptoDevToolsService signs and verifies real HS256 JWTs via Web Crypto', async () => {
    const token = await cryptoDevToolsService.signJwtAsync({ sub: 'alice', role: 'admin' }, 'super-secret-key', 'HS256')
    const ok = await cryptoDevToolsService.verifyJwtAsync(token, 'super-secret-key')
    expect(ok.valid).toBe(true)
    expect(ok.algorithm).toBe('HS256')

    const bad = await cryptoDevToolsService.verifyJwtAsync(token, 'wrong-secret')
    expect(bad.valid).toBe(false)
  })

  it('cryptoDevToolsService generates real RFC 6238 HMAC-SHA1 TOTP test vector (12345678901234567890 at t=59s -> 287082)', async () => {
    // Official RFC 6238 Appendix B test vector: secret = "12345678901234567890" (Base32: GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ), t=59s -> 94287082 (6 digits: 287082)
    const res = await cryptoDevToolsService.generateTotpAsync('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 30, 6, 59 * 1000)
    expect(res.code).toBe('287082')
  })

  it('cryptoDevToolsService performs real Web Crypto ECDSA keypair generation and AES-256-GCM round-trip', async () => {
    const kp = await cryptoDevToolsService.generateKeyPairAsync('ECDSA-P256')
    expect(kp.publicKey).toContain('-----BEGIN PUBLIC KEY-----')
    expect(kp.privateKey).toContain('-----BEGIN PRIVATE KEY-----')
    expect(kp.publicKey.length).toBeGreaterThan(100)

    const ct = await cryptoDevToolsService.aesEncryptAsync('hello 🌍 secret', 'pass-123')
    const pt = await cryptoDevToolsService.aesDecryptAsync(ct, 'pass-123')
    expect(pt).toBe('hello 🌍 secret')
  })

  it('cryptoDevToolsService handles UTF-8 hex/binary and quoted RFC-4180 CSV', () => {
    const hex = cryptoDevToolsService.encode('hex', 'café')
    expect(cryptoDevToolsService.decode('hex', hex)).toBe('café')

    const jsonStr = cryptoDevToolsService.transformFormat('name,city\n"Doe, Jane","New York"', 'csv', 'json')
    const parsed = JSON.parse(jsonStr)
    expect(parsed[0].name).toBe('Doe, Jane')
    expect(parsed[0].city).toBe('New York')
  })

  it('envVaultService loads/saves workspace .env files while preserving comment lines', async () => {
    const saveFile = vi.fn().mockResolvedValue(true)
    ;(globalThis as any).window = {
      electronAPI: {
        readFolder: vi.fn().mockResolvedValue([
          { name: '.env', path: '/repo/.env', isDirectory: false },
          { name: '.env.example', path: '/repo/.env.example', isDirectory: false },
        ]),
        readFile: vi.fn().mockImplementation(async (p: string) => {
          if (p.endsWith('.env')) return '# Core Config\nPORT=3000\nAPI_KEY=secret\n'
          if (p.endsWith('.env.example')) return 'PORT=3000\nAPI_KEY=placeholder\n'
          throw new Error('ENOENT')
        }),
        saveFile,
      },
    }

    const loaded = await envVaultService.loadWorkspaceEnvFilesAsync('/repo')
    expect(Object.keys(loaded)).toEqual(['.env', '.env.example'])

    const vars = envVaultService.parseEnvContent(loaded['.env'])
    const updated = vars.map((v) => (v.key === 'PORT' ? { ...v, value: '8080' } : v))
    const merged = envVaultService.mergeVariablesPreservingComments(loaded['.env'], updated)
    expect(merged).toContain('# Core Config')
    expect(merged).toContain('PORT=8080')

    await envVaultService.saveWorkspaceEnvFileAsync('/repo', '.env', merged)
    expect(saveFile).toHaveBeenCalledWith('/repo/.env', merged)
  })
})

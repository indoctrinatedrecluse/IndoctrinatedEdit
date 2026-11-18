import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { sanitizeHtml, sanitizeSvg, utf8ToBase64, base64ToUtf8, validateWorkspacePath } from '../src/utils/security'
import { AiGuardrailService, AiToolExecutor } from '../src/services/aiToolsService'
import { McpService } from '../src/services/mcpService'
import { parsePorcelainStatus } from '../electron/git-service'
import { formatterService } from '../src/services/formatterService'
import { previewService } from '../src/services/previewService'
import { restClientService } from '../src/services/restClientService'
import { redisStudioService } from '../src/services/redisStudioService'
import { hexInspectorService } from '../src/services/hexInspectorService'
import { cryptoDevToolsService } from '../src/services/cryptoDevToolsService'
import { envVaultService } from '../src/services/envVaultService'

describe('Phase 1 — Security, Data Corruption & Crash Hotfixes', () => {
  describe('1. Path Traversal & MCP Guardrails', () => {
    it('blocks relative ../ escape outside workspaceRoot', () => {
      const res = validateWorkspacePath('../../etc/passwd', '/home/user/project')
      expect(res.valid).toBe(false)
      expect(res.error).toMatch(/escapes workspace root/i)
    })

    it('blocks absolute paths outside workspaceRoot on Windows (case-insensitive drive)', () => {
      const res = AiGuardrailService.validatePath('C:\\Users\\other\\secret.txt', 'd:\\Projects\\App')
      expect(res.valid).toBe(false)
      expect(res.error).toMatch(/escapes workspace root/i)
    })

    it('allows valid internal paths and collapses safe internal .. segments', () => {
      const res = AiGuardrailService.validatePath('src/components/../utils/helper.ts', 'D:\\Projects\\App')
      expect(res.valid).toBe(true)
      expect(res.resolvedPath).toBe('D:/Projects/App/src/utils/helper.ts')
    })

    it('blocks obfuscated secret paths like src/../.env and C:/Windows/System32', () => {
      expect(AiGuardrailService.validatePath('src/../.env', '/repo').valid).toBe(false)
      expect(AiGuardrailService.validatePath('C:/Windows/System32/cmd.exe').valid).toBe(false)
      expect(AiGuardrailService.validatePath('file\0.ts', '/repo').valid).toBe(false)
    })

    it('enforces path guardrails inside MCP read_file_content tool', async () => {
      const result = await McpService.callTool('mcp-filesystem', 'read_file_content', {
        path: '.env',
        workspaceRoot: '/repo',
      })
      expect(result.success).toBe(false)
      expect(result.isError).toBe(true)
      expect(result.content?.[0]?.text || result.output).toMatch(/Security Guardrail/i)
    })
  })

  describe('2. XSS Sanitization & Markdown Fenced Code Protection', () => {
    it('strips scripts, event handlers, and javascript: URIs from HTML and SVG', () => {
      const dirtyHtml = `<img src=x onerror="alert(1)"><a href="javascript:alert(2)">Click</a><script>evil()</script>`
      const cleanHtml = sanitizeHtml(dirtyHtml)
      expect(cleanHtml).not.toContain('<script')
      expect(cleanHtml).not.toContain('onerror')
      expect(cleanHtml).not.toContain('javascript:')

      const dirtySvg = `<svg><script>alert(1)</script><foreignObject><div>x</div></foreignObject><rect onload="x()" width="10" height="10"/></svg>`
      const cleanSvg = sanitizeSvg(dirtySvg)
      expect(cleanSvg).not.toContain('<script')
      expect(cleanSvg).not.toContain('foreignObject')
      expect(cleanSvg).not.toContain('onload')
      expect(cleanSvg).toContain('<rect')
    })

    it('preserves # comments and $vars inside fenced markdown code blocks', () => {
      const md = [
        '# Real Heading',
        '',
        '```bash',
        '# bash comment should NOT become h1',
        'echo $HOME and $USER',
        '```',
        '',
        '[Bad Link](javascript:alert(1))',
      ].join('\n')

      const { html } = previewService.renderMarkdown(md)
      expect(html).toContain('# bash comment should NOT become h1')
      expect(html).not.toContain('data-heading="bash comment')
      expect(html).toContain('echo $HOME and $USER')
      expect(html).not.toContain('javascript:')
    })
  })

  describe('3. Git Porcelain Status Parser', () => {
    it('preserves leading space on the first unstaged line and parses renames', () => {
      const raw = ' M src/firstFile.ts\nM  src/stagedFile.ts\nR  src/old.ts -> src/new.ts\n?? untracked.txt\n'
      const { staged, working } = parsePorcelainStatus(raw)

      expect(working.map((w) => w.path)).toEqual(['src/firstFile.ts', 'untracked.txt'])
      expect(working[0].status).toBe('M')
      expect(staged.map((s) => s.path)).toEqual(['src/stagedFile.ts', 'src/new.ts'])
      expect(staged[1].status).toBe('R')
    })
  })

  describe('4. Formatter Safety (No Data Corruption)', () => {
    it('preserves Python dedentation after blocks', async () => {
      const py = [
        'def greet(name):',
        '    if name:',
        '        return f"hi {name}"',
        '    return "hi"',
        '',
        'print(greet("world"))',
      ].join('\n')

      const res = await formatterService.formatDocument(py, 'python')
      expect(res.formatted).toContain('\nprint(greet("world"))')
      expect(res.formatted).toContain('\n    return "hi"')
    })

    it('preserves Rust lifetimes and double-quoted strings without injecting JS formatting', async () => {
      const rs = `fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {\nlet msg = "hello";\nx\n}`
      const res = await formatterService.formatDocument(rs, 'rust')
      expect(res.formatted).toContain(`<'a>`)
      expect(res.formatted).toContain(`"hello"`)
    })

    it('does not split CSS data:image/svg+xml;base64 URIs', async () => {
      const css = `.icon { background-image: url("data:image/svg+xml;base64,PHN2Zz4="); color: red; }`
      const res = await formatterService.formatDocument(css, 'css')
      expect(res.formatted).toContain(`url("data:image/svg+xml;base64,PHN2Zz4=")`)
    })

    it('handles JSONC files with comments without throwing', async () => {
      const jsonc = `{\n// comment\n"a": 1\n}`
      const res = await formatterService.formatDocument(jsonc, 'json')
      expect(res.errors).toBeUndefined()
      expect(res.formatted).toContain('// comment')
    })

    it('preserves base indentation when formatting a nested range', async () => {
      const ts = [
        'function outer() {',
        '  if (true) {',
        '    const a = 1',
        '    const b = 2',
        '  }',
        '}',
      ].join('\n')
      const res = await formatterService.formatRange(ts, 3, 4, 'typescript')
      expect(res.formatted.split('\n')[2]).toBe('    const a = 1;')
      expect(res.formatted.split('\n')[3]).toBe('    const b = 2;')

      const jsx = `<Button className="primary" onClick={fn}>Click</Button>`
      const jsxRes = await formatterService.formatDocument(jsx, 'typescript')
      expect(jsxRes.formatted).toContain('className="primary"')
      expect(jsxRes.formatted).not.toContain('</Button>;')
    })
  })

  describe('5. AI Tools Correctness', () => {
    it('allows deleting code via propose_file_edit with newSnippet === ""', async () => {
      const res = await AiToolExecutor.execute(
        {
          id: 'tc-1',
          toolName: 'propose_file_edit',
          arguments: {
            filePath: 'src/demo.ts',
            originalSnippet: 'const dead = 1\n',
            newSnippet: '',
            description: 'Delete dead line',
          },
        },
        {
          workspaceRoot: '/repo',
          openFiles: [{ path: '/repo/src/demo.ts', name: 'demo.ts', content: 'const dead = 1\nconst live = 2\n' }],
        },
        'act'
      )
      expect(res.success).toBe(true)
      expect(res.diff?.fullContent).toBe('const live = 2\n')
    })

    it('search_code does not mutate caller openFiles and matches consecutive lines', async () => {
      const openFiles = [{ path: '/repo/a.ts', name: 'a.ts', content: 'needle 1\nneedle 2\nneedle 3' }]
      const res = await AiToolExecutor.execute(
        { id: 'tc-2', toolName: 'search_code', arguments: { query: 'needle' } },
        { workspaceRoot: '/repo', openFiles, activeFileName: 'b.ts', activeFileContent: 'needle 4' },
        'act'
      )
      expect(openFiles).toHaveLength(1)
      expect(res.success).toBe(true)
      expect(res.output).toContain('Found 4 matches')
    })
  })

  describe('6. Crash Guards, UTF-8 Base64, CSPRNG & AES-256-GCM Vault', () => {
    it('REST buildFullUrl does not throw on invalid URL or unresolved template vars', () => {
      const url = restClientService.buildFullUrl({
        id: 'r1',
        name: 'bad',
        method: 'GET',
        url: 'http://{{unresolved_host}}:invalid/api',
        headers: [],
        params: [{ id: 'p1', key: 'q', value: '1', enabled: true }],
        bodyType: 'none',
        bodyContent: '',
        auth: { type: 'none' },
      })
      expect(url).toContain('q=1')
    })

    it('Redis getKeys safely handles regex metacharacters like [ and (', () => {
      expect(() => redisStudioService.getKeys('[unclosed(')).not.toThrow()
    })

    it('Hex Inspector safely handles empty buffers without RangeError', () => {
      const info = hexInspectorService.inspectByteAtOffset(new Uint8Array(0), 0)
      expect(info.byteHex).toBe('00')
      expect(info.float32LE).toBe('N/A')
    })

    it('CryptoLab handles out-of-range epochs, UTF-8 SHA-256, and UTF-8 Base64', async () => {
      const epoch = cryptoDevToolsService.convertEpoch(1e30)
      expect(epoch.iso8601).toContain('Invalid Date')

      // Verify exact RFC 6234 SHA-256 digest for multi-byte UTF-8 input "café"
      const expectedSha256 = createHash('sha256').update('café', 'utf8').digest('hex')
      const hashes = await cryptoDevToolsService.computeHashes('café')
      const sha256 = hashes.find((h) => h.algorithm === 'SHA-256')
      expect(sha256?.hash).toBe(expectedSha256)

      const b64 = utf8ToBase64('héllo 🚀 世界')
      expect(base64ToUtf8(b64)).toBe('héllo 🚀 世界')
    })

    it('Env Vault encrypts and decrypts with real AES-256-GCM and rejects empty/wrong passphrases', async () => {
      const vars = [
        { key: 'API_KEY', value: 'sk-secret-value-🚀', isSecret: true, isMasked: true, category: 'api_key' as const },
      ]
      await expect(envVaultService.encryptVaultAsync(vars, '')).rejects.toThrow()

      const encrypted = await envVaultService.encryptVaultAsync(vars, 'super-strong-passphrase')
      const decrypted = await envVaultService.decryptVaultAsync(encrypted, 'super-strong-passphrase')
      expect(decrypted).toEqual(vars)

      await expect(envVaultService.decryptVaultAsync(encrypted, 'wrong-passphrase')).rejects.toThrow()
    })
  })
})

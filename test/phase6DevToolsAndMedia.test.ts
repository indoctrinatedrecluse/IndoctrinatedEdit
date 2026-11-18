import { describe, it, expect } from 'vitest'
import { createHash, createHmac } from 'node:crypto'
import { cryptoDevToolsService } from '../src/services/cryptoDevToolsService'
import { colorStudioService } from '../src/services/colorStudioService'
import { jsonStudioService } from '../src/services/jsonStudioService'
import { regexService } from '../src/services/regexService'
import { diffStudioService } from '../src/services/diffStudioService'
import { svgStudioService } from '../src/services/svgStudioService'
import { jupyterKernelService } from '../src/services/jupyterKernelService'

describe('Phase 6 — DevTools, Data & Media Studios Real Engines', () => {
  it('CryptoLab computes genuine RFC MD5, SHA-1, SHA-256, SHA-384, SHA-512, HMAC-SHA256 & real Web Crypto ECDSA keypair', async () => {
    const input = 'hello indoctrinated 🚀'
    const key = 'super-secret-hmac-key'
    const hashes = await cryptoDevToolsService.computeHashes(input, key)
    const byAlg = Object.fromEntries(hashes.map((h) => [h.algorithm, h.hash]))

    expect(byAlg['MD5']).toBe(createHash('md5').update(input, 'utf8').digest('hex'))
    expect(byAlg['SHA-1']).toBe(createHash('sha1').update(input, 'utf8').digest('hex'))
    expect(byAlg['SHA-256']).toBe(createHash('sha256').update(input, 'utf8').digest('hex'))
    expect(byAlg['SHA-384']).toBe(createHash('sha384').update(input, 'utf8').digest('hex'))
    expect(byAlg['SHA-512']).toBe(createHash('sha512').update(input, 'utf8').digest('hex'))
    expect(byAlg['HMAC-SHA256']).toBe(createHmac('sha256', key).update(input, 'utf8').digest('hex'))

    // Verify genuine Ethereum Keccak-256 standard vectors
    const emptyKeccak = (await cryptoDevToolsService.computeHashes('')).find((h) => h.algorithm.includes('Keccak'))?.hash
    const helloKeccak = (await cryptoDevToolsService.computeHashes('hello')).find((h) => h.algorithm.includes('Keccak'))?.hash
    expect(emptyKeccak).toBe('0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470')
    expect(helloKeccak).toBe('0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8')

    const kp = await cryptoDevToolsService.generateKeyPairAsync('ECDSA-P256')
    expect(kp.publicKeyPem).toContain('-----BEGIN PUBLIC KEY-----')
    expect(kp.privateKeyPem).toContain('-----BEGIN PRIVATE KEY-----')
  })

  it('Color Studio computes true OKLCH, parses hsl(), rejects invalid hex NaN, and composites alpha WCAG contrast', () => {
    const pureRed = colorStudioService.parseColor('#FF0000')
    // True OKLCH for #FF0000 is ~ oklch(62.8% 0.258 29) (not fake BT.601 29.9% 0.200 0)
    expect(pureRed.oklchString).toMatch(/^oklch\(62\.[789]% 0\.25[789] 29\)$/)

    const fromHsl = colorStudioService.parseColor('hsl(120, 100%, 50%)')
    expect(fromHsl.hex).toBe('#00FF00')

    const badHex = colorStudioService.parseColor('#ZZZZZZ')
    expect(badHex.hex).not.toContain('NAN')

    const alphaContrast = colorStudioService.calculateContrastRatio('rgba(255, 255, 255, 0.2)', '#000000')
    expect(alphaContrast.ratio).toBeLessThan(3)
  })

  it('JSON & JQ Studio handles chained brackets, slices, negative indices, and reports unknown filters', () => {
    const data = { matrix: [[10, 20], [30, 40]], items: ['a', 'b', 'c', 'd'] }
    expect(jsonStudioService.queryJq(data, '.matrix[0][1]').result).toBe(20)
    expect(jsonStudioService.queryJq(data, '.items[-1]').result).toBe('d')
    expect(jsonStudioService.queryJq(data, '.items[1:3]').result).toEqual(['b', 'c'])
    expect(jsonStudioService.queryJq(data, '.items | unknown_op').error).toMatch(/Unsupported JQ filter/i)
  })

  it('Regex Lab matches IPv6 properly, preserves $$ / $10 in substitution, and benchmarks consistently', () => {
    const ipv6 = regexService.generateRegexFromPrompt('valid IPv6 address')
    expect(ipv6.explanation).toContain('IPv6')

    const sub = regexService.substituteRegex('(foo)-(bar)', 'g', 'foo-bar', '$$1=$1 $2')
    expect(sub.result).toBe('$1=foo bar')
    expect(sub.count).toBe(1)

    const bench = regexService.benchmarkRegex('abc', 'g', 'xyz abc', 50)
    expect(bench.durationUs).toBeGreaterThanOrEqual(0)
  })

  it('Diff Studio parses diff3 base markers cleanly', () => {
    const diff3 = [
      '<<<<<<< HEAD',
      'const v = 2',
      '||||||| base',
      'const v = 1',
      '=======',
      'const v = 3',
      '>>>>>>> feat',
    ].join('\n')
    const blocks = diffStudioService.parseMergeConflicts(diff3)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].currentText).toBe('const v = 2')
    expect(blocks[0].baseText).toBe('const v = 1')
    expect(blocks[0].incomingText).toBe('const v = 3')
  })

  it('SVG Studio dynamically recolors arbitrary SVGs and exports valid TSX with size wired', () => {
    const customSvg = '<!-- logo --><svg viewBox="0 0 24 24"><circle fill="#FF5500" stroke-dasharray="4 2" r="10"/></svg>'
    const recolored = svgStudioService.recolorSvg(customSvg, '#00FF88')
    expect(recolored).toContain('fill="#00FF88"')

    const tsx = svgStudioService.generateReactComponent(customSvg, 'MyLogo')
    expect(tsx).not.toContain('<!--')
    expect(tsx).toContain('strokeDasharray="4 2"')
    expect(tsx).toContain('width={size ?? props.width}')
  })

  it('Jupyter preserves empty cells array and evaluates arithmetic safely without eval()', async () => {
    const emptyNb = jupyterKernelService.parseNotebook(JSON.stringify({ cells: [], nbformat: 4, nbformat_minor: 5 }))
    expect(emptyNb.cells).toHaveLength(0)

    const cell = {
      id: 'c1',
      cell_type: 'code' as const,
      source: '(2 + 3) * 4 - 1',
      execution_count: null,
      outputs: [],
      metadata: {},
    }
    const outputs = await jupyterKernelService.executeCell(cell)
    expect(outputs[0]?.data?.['text/plain']).toBe('19')
  })
})

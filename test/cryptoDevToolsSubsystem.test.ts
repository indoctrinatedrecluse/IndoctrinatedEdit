import { describe, it, expect } from 'vitest'
import { cryptoDevToolsService } from '../src/services/cryptoDevToolsService'

describe('CryptoDevToolsService Subsystem Tests', () => {
  it('should generate and decode a valid JWT token', () => {
    const token = cryptoDevToolsService.generateSampleJwt('usr_recluse_42', 'superadmin', 7200)
    expect(token).toBeDefined()
    expect(token.split('.').length).toBe(3)

    const decoded = cryptoDevToolsService.decodeJwt(token)
    expect(decoded.header.alg).toBe('HS256')
    expect(decoded.payload.sub).toBe('usr_recluse_42')
    expect(decoded.payload.role).toBe('superadmin')
    expect(decoded.isExpired).toBe(false)
  })

  it('should handle malformed and invalid JWT gracefully', () => {
    const malformed = 'not.a.valid.jwt.token'
    const res = cryptoDevToolsService.decodeJwt(malformed)
    expect(res.error).toBeDefined()
  })

  it('should compute cryptographic hashes and HMAC correctly', async () => {
    const input = 'IndoctrinatedEdit Liquid Glass Specular Engine'
    const key = 'secret_test_key'
    const hashes = await cryptoDevToolsService.computeHashes(input, key)

    expect(hashes.length).toBeGreaterThanOrEqual(6)
    const md5 = hashes.find((h) => h.algorithm === 'MD5')
    const sha256 = hashes.find((h) => h.algorithm === 'SHA-256')
    const keccak = hashes.find((h) => h.algorithm.includes('Keccak'))
    const hmac = hashes.find((h) => h.algorithm === 'HMAC-SHA256')

    expect(md5).toBeDefined()
    expect(md5?.hash).toHaveLength(32)
    expect(sha256).toBeDefined()
    expect(sha256?.hash).toHaveLength(64)
    expect(keccak).toBeDefined()
    expect(keccak?.hash.startsWith('0x')).toBe(true)
    expect(hmac).toBeDefined()
  })

  it('should encode and decode various formats losslessly', () => {
    const original = 'Liquid Glass Specular Engine 3.0.0!'

    // Base64
    const b64 = cryptoDevToolsService.encode('base64', original)
    expect(cryptoDevToolsService.decode('base64', b64)).toBe(original)

    // Base64URL
    const b64url = cryptoDevToolsService.encode('base64url', original)
    expect(cryptoDevToolsService.decode('base64url', b64url)).toBe(original)

    // Hex
    const hex = cryptoDevToolsService.encode('hex', original)
    expect(cryptoDevToolsService.decode('hex', hex)).toBe(original)

    // URL
    const url = cryptoDevToolsService.encode('url', original)
    expect(cryptoDevToolsService.decode('url', url)).toBe(original)

    // HTML Entities
    const htmlTest = '<script>alert("XSS") & \'test\'</script>'
    const htmlEnc = cryptoDevToolsService.encode('html', htmlTest)
    expect(htmlEnc).toContain('&lt;')
    expect(htmlEnc).toContain('&amp;')
    expect(cryptoDevToolsService.decode('html', htmlEnc)).toBe(htmlTest)

    // Binary
    const bin = cryptoDevToolsService.encode('binary', 'ABC')
    expect(cryptoDevToolsService.decode('binary', bin)).toBe('ABC')

    // ROT13
    const rot = cryptoDevToolsService.encode('rot13', 'Hello')
    expect(cryptoDevToolsService.decode('rot13', rot)).toBe('Hello')
  })

  it('should generate valid UUID v4, UUID v7, ULID, and API keys', () => {
    const uuid4 = cryptoDevToolsService.generateUuidV4()
    expect(uuid4).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)

    const uuid7 = cryptoDevToolsService.generateUuidV7()
    expect(uuid7).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)

    const ulid = cryptoDevToolsService.generateUlid()
    expect(ulid).toHaveLength(26)

    const apiKey = cryptoDevToolsService.generateRandomApiKey('test_key_', 24)
    expect(apiKey.startsWith('test_key_')).toBe(true)

    const pwd = cryptoDevToolsService.generateSecurePassword(16)
    expect(pwd).toHaveLength(16)
  })

  it('should accurately convert epoch timestamps to ISO and relative strings', () => {
    const sec = 1789500000
    const converted = cryptoDevToolsService.convertEpoch(sec)
    expect(converted.seconds).toBe(sec)
    expect(converted.iso8601).toBeDefined()
    expect(converted.relativeTime).toBeDefined()
  })

  it('should transform JSON to YAML and CSV accurately', () => {
    const jsonStr = JSON.stringify({ app: 'IndoctrinatedEdit', version: '3.0.0' })
    const yamlRes = cryptoDevToolsService.transformFormat(jsonStr, 'json', 'yaml')
    expect(yamlRes).toContain('app: "IndoctrinatedEdit"')
    expect(yamlRes).toContain('version: "3.0.0"')

    const csvInput = 'id,name,role\n1,Recluse,Admin\n2,Alice,Developer'
    const jsonRes = cryptoDevToolsService.transformFormat(csvInput, 'csv', 'json')
    const parsed = JSON.parse(jsonRes)
    expect(parsed).toHaveLength(2)
    expect(parsed[0].name).toBe('Recluse')
  })

  it('should generate cryptographic RSA/ECC keypairs in PEM format', () => {
    const keypair = cryptoDevToolsService.generateKeyPair('RSA-2048')
    expect(keypair.publicKey).toContain('BEGIN PUBLIC KEY')
    expect(keypair.privateKey).toContain('BEGIN PRIVATE KEY')
    expect(keypair.keyType).toBe('RSA-2048')
  })
})

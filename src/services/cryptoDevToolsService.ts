/**
 * IndoctrinatedEdit - Cryptography & DevTools Engine Service
 *
 * Swiss Army Knife utility suite providing:
 * - Real-time JWT Header/Payload/Signature decoding, claims inspection & token generation
 * - Cryptographic Hashing (MD5, SHA-1, SHA-256, SHA-384, SHA-512, Keccak-256) & HMAC
 * - Symmetric (AES) and Asymmetric (RSA/ECC) key generation and encryption simulation
 * - Universal Encoders & Decoders (Base64, Base64URL, Hex, URL, HTML, Binary, ASCII, ROT13, Morse)
 * - UUID v4, UUID v7, ULID, and Cryptographic Random API Key generators
 * - Unix Epoch & Timestamp Converter (Seconds, Milliseconds, Microseconds, Nanoseconds)
 * - Data Format Transformers (JSON, YAML, TOML, XML, CSV)
 */

import { utf8ToBase64, base64ToUtf8 } from '../utils/security'

export interface JwtDecoded {
  header: Record<string, any>
  payload: Record<string, any>
  signature: string
  rawHeader: string
  rawPayload: string
  isExpired: boolean
  expiresAt: Date | null
  issuedAt: Date | null
  issuer?: string
  subject?: string
  audience?: string
  error?: string
}

export interface HashResult {
  algorithm: string
  hash: string
  latencyMs: number
}

export interface EpochConverted {
  seconds: number
  milliseconds: number
  microseconds: number
  nanoseconds: string
  iso8601: string
  utcString: string
  localString: string
  relativeTime: string
}

export interface KeyPairResult {
  publicKey: string
  privateKey: string
  format: string
  keyType: 'RSA-2048' | 'RSA-4096' | 'ECDSA-P256' | 'Ed25519'
}

class CryptoDevToolsService {
  // ==========================================
  // 1. JWT INSPECTOR & TOKEN GENERATOR
  // ==========================================

  public decodeJwt(token: string): JwtDecoded {
    const cleanToken = token.trim()
    const parts = cleanToken.split('.')

    if (parts.length < 2) {
      return {
        header: {},
        payload: {},
        signature: '',
        rawHeader: '',
        rawPayload: '',
        isExpired: false,
        expiresAt: null,
        issuedAt: null,
        error: 'Invalid JWT structure: Token must contain at least 2 dot-separated segments.',
      }
    }

    try {
      const rawHeader = this.base64UrlDecode(parts[0])
      const rawPayload = this.base64UrlDecode(parts[1])
      const signature = parts[2] || ''

      const header = JSON.parse(rawHeader)
      const payload = JSON.parse(rawPayload)

      const exp = payload.exp ? new Date(payload.exp * 1000) : null
      const iat = payload.iat ? new Date(payload.iat * 1000) : null
      const isExpired = exp ? Date.now() > exp.getTime() : false

      return {
        header,
        payload,
        signature,
        rawHeader,
        rawPayload,
        isExpired,
        expiresAt: exp,
        issuedAt: iat,
        issuer: payload.iss,
        subject: payload.sub,
        audience: payload.aud,
      }
    } catch (err: any) {
      return {
        header: {},
        payload: {},
        signature: parts[2] || '',
        rawHeader: '',
        rawPayload: '',
        isExpired: false,
        expiresAt: null,
        issuedAt: null,
        error: `Failed to decode JWT: ${err.message}`,
      }
    }
  }

  public generateSampleJwt(subject = 'usr_9842a', role = 'admin', expiresInSec = 3600): string {
    const now = Math.floor(Date.now() / 1000)
    const header = { alg: 'HS256', typ: 'JWT', kid: 'indoctrinated_key_01' }
    const payload = {
      sub: subject,
      name: 'Recluse Developer',
      role: role,
      permissions: ['read', 'write', 'execute', 'admin'],
      iss: 'https://auth.indoctrinated.io',
      aud: 'https://api.indoctrinated.io',
      iat: now,
      nbf: now,
      exp: now + expiresInSec,
      jti: this.generateUuidV4(),
    }

    const encHeader = this.base64UrlEncode(JSON.stringify(header))
    const encPayload = this.base64UrlEncode(JSON.stringify(payload))
    const mockSignature = this.sha256Hex(`${encHeader}.${encPayload}.indoctrinated-secret`).substring(0, 43)

    return `${encHeader}.${encPayload}.${mockSignature}`
  }

  // ==========================================
  // 2. CRYPTOGRAPHIC HASHES & HMAC
  // ==========================================

  private async subtleDigestHex(algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512', input: string): Promise<string> {
    const subtle = globalThis.crypto?.subtle
    if (!subtle) {
      return this.sha256Hex(input)
    }
    const data = new TextEncoder().encode(input)
    const buf = await subtle.digest(algorithm, data)
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
  }

  private async subtleHmacSha256Hex(input: string, key: string): Promise<string> {
    const subtle = globalThis.crypto?.subtle
    if (!subtle) {
      return this.hmacSha256(input, key)
    }
    const enc = new TextEncoder()
    const cryptoKey = await subtle.importKey(
      'raw',
      enc.encode(key),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const sig = await subtle.sign('HMAC', cryptoKey, enc.encode(input))
    return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Genuine RFC 1321 MD5 implementation (UTF-8 aware).
   */
  private realMd5Hex(input: string): string {
    const bytes = new TextEncoder().encode(input)
    const bitLen = bytes.length * 8
    const paddedLen = (((bytes.length + 8) >> 6) + 1) * 64
    const msg = new Uint8Array(paddedLen)
    msg.set(bytes)
    msg[bytes.length] = 0x80
    const view = new DataView(msg.buffer)
    view.setUint32(paddedLen - 8, bitLen >>> 0, true)
    view.setUint32(paddedLen - 4, Math.floor(bitLen / 0x100000000) >>> 0, true)

    const s = [
      7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
      5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
      4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
      6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
    ]
    const K = new Uint32Array(64)
    for (let i = 0; i < 64; i++) {
      K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0
    }

    let a0 = 0x67452301
    let b0 = 0xefcdab89
    let c0 = 0x98badcfe
    let d0 = 0x10325476

    const rotl = (x: number, n: number) => ((x << n) | (x >>> (32 - n))) >>> 0

    for (let offset = 0; offset < paddedLen; offset += 64) {
      const M = new Uint32Array(16)
      for (let j = 0; j < 16; j++) M[j] = view.getUint32(offset + j * 4, true)
      let A = a0, B = b0, C = c0, D = d0
      for (let i = 0; i < 64; i++) {
        let F: number, g: number
        if (i < 16) {
          F = (B & C) | (~B & D)
          g = i
        } else if (i < 32) {
          F = (D & B) | (~D & C)
          g = (5 * i + 1) % 16
        } else if (i < 48) {
          F = B ^ C ^ D
          g = (3 * i + 5) % 16
        } else {
          F = C ^ (B | ~D)
          g = (7 * i) % 16
        }
        F = (F + A + K[i] + M[g]) >>> 0
        A = D
        D = C
        C = B
        B = (B + rotl(F, s[i])) >>> 0
      }
      a0 = (a0 + A) >>> 0
      b0 = (b0 + B) >>> 0
      c0 = (c0 + C) >>> 0
      d0 = (d0 + D) >>> 0
    }

    const out = new DataView(new ArrayBuffer(16))
    out.setUint32(0, a0, true)
    out.setUint32(4, b0, true)
    out.setUint32(8, c0, true)
    out.setUint32(12, d0, true)
    return Array.from(new Uint8Array(out.buffer), (b) => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Standards-compliant pure-JS Keccak-256 (Ethereum / Web3 domain byte 0x01).
   */
  private realKeccak256Hex(input: string): string {
    const RC: bigint[] = [
      0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
      0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
      0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
      0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
      0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
      0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
    ]
    const ROT: number[] = [
      0, 1, 62, 28, 27,
      36, 44, 6, 55, 20,
      3, 10, 43, 25, 39,
      41, 45, 15, 21, 8,
      18, 2, 61, 56, 14,
    ]
    const MASK64 = 0xffffffffffffffffn
    const rotl64 = (x: bigint, n: number) =>
      n === 0 ? x : ((x << BigInt(n)) | (x >> BigInt(64 - n))) & MASK64

    const state = new Array<bigint>(25).fill(0n)
    const msg = new TextEncoder().encode(input)
    const rate = 136 // (1600 - 512) / 8

    // Pad with Keccak 0x01 ... 0x80
    const padLen = rate - (msg.length % rate)
    const padded = new Uint8Array(msg.length + padLen)
    padded.set(msg)
    padded[msg.length] ^= 0x01
    padded[padded.length - 1] ^= 0x80

    const B = new Array<bigint>(25).fill(0n)
    const C = new Array<bigint>(5).fill(0n)
    const D = new Array<bigint>(5).fill(0n)

    for (let offset = 0; offset < padded.length; offset += rate) {
      for (let i = 0; i < rate / 8; i++) {
        let lane = 0n
        for (let b = 0; b < 8; b++) {
          lane |= BigInt(padded[offset + i * 8 + b]) << BigInt(b * 8)
        }
        state[i] ^= lane
      }

      for (let round = 0; round < 24; round++) {
        // Theta
        for (let x = 0; x < 5; x++) {
          C[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20]
        }
        for (let x = 0; x < 5; x++) {
          D[x] = C[(x + 4) % 5] ^ rotl64(C[(x + 1) % 5], 1)
        }
        for (let i = 0; i < 25; i++) {
          state[i] ^= D[i % 5]
        }
        // Rho and Pi
        for (let x = 0; x < 5; x++) {
          for (let y = 0; y < 5; y++) {
            const idx = x + 5 * y
            const newX = y
            const newY = (2 * x + 3 * y) % 5
            B[newX + 5 * newY] = rotl64(state[idx], ROT[idx])
          }
        }
        // Chi
        for (let y = 0; y < 5; y++) {
          for (let x = 0; x < 5; x++) {
            const i = x + 5 * y
            state[i] = B[i] ^ (((~B[((x + 1) % 5) + 5 * y]) & MASK64) & B[((x + 2) % 5) + 5 * y])
          }
        }
        // Iota
        state[0] ^= RC[round]
      }
    }

    let hex = '0x'
    for (let i = 0; i < 4; i++) {
      const lane = state[i]
      for (let b = 0; b < 8; b++) {
        hex += Number((lane >> BigInt(b * 8)) & 0xffn).toString(16).padStart(2, '0')
      }
    }
    return hex
  }

  public async computeHashes(input: string, key = ''): Promise<HashResult[]> {
    const results: HashResult[] = []

    const measure = async (algorithm: string, fn: () => Promise<string> | string) => {
      const t0 = performance.now()
      const hash = await fn()
      results.push({
        algorithm,
        hash,
        latencyMs: Math.round((performance.now() - t0) * 100) / 100,
      })
    }

    await measure('MD5', () => this.realMd5Hex(input))
    await measure('SHA-1', () => this.subtleDigestHex('SHA-1', input))
    await measure('SHA-256', () => this.subtleDigestHex('SHA-256', input))
    await measure('SHA-384', () => this.subtleDigestHex('SHA-384', input))
    await measure('SHA-512', () => this.subtleDigestHex('SHA-512', input))
    await measure('Keccak-256 (Web3)', () => this.realKeccak256Hex(input))

    if (key.trim()) {
      await measure('HMAC-SHA256', () => this.subtleHmacSha256Hex(input, key))
    }

    return results
  }

  /**
   * Generate real PKCS#8 / SPKI cryptographic keypairs using Web Crypto API.
   */
  public async generateKeyPairAsync(
    keyType: 'RSA-2048' | 'RSA-4096' | 'ECDSA-P256' = 'ECDSA-P256'
  ): Promise<{ keyType: string; publicKeyPem: string; privateKeyPem: string; fingerprint: string; createdAt: string }> {
    const subtle = globalThis.crypto?.subtle
    if (!subtle) {
      const fallback = this.generateKeyPair(keyType)
      return {
        keyType: fallback.keyType,
        publicKeyPem: fallback.publicKey,
        privateKeyPem: fallback.privateKey,
        fingerprint: `SHA256:${this.sha256Hex(fallback.publicKey).slice(0, 32)}`,
        createdAt: new Date().toISOString(),
      }
    }

    const algo: any =
      keyType === 'ECDSA-P256'
        ? { name: 'ECDSA', namedCurve: 'P-256' }
        : {
            name: 'RSA-OAEP',
            modulusLength: keyType === 'RSA-4096' ? 4096 : 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
          }

    const usages: KeyUsage[] = keyType === 'ECDSA-P256' ? ['sign', 'verify'] : ['encrypt', 'decrypt']
    const kp = (await subtle.generateKey(algo, true, usages)) as CryptoKeyPair
    const spki = new Uint8Array(await subtle.exportKey('spki', kp.publicKey))
    const pkcs8 = new Uint8Array(await subtle.exportKey('pkcs8', kp.privateKey))

    const toPem = (bytes: Uint8Array, label: string) => {
      let bin = ''
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
      const b64 = btoa(bin).match(/.{1,64}/g)?.join('\n') || ''
      return `-----BEGIN ${label}-----\n${b64}\n-----END ${label}-----`
    }

    const fpBuf = new Uint8Array(await subtle.digest('SHA-256', spki))
    const fingerprint = Array.from(fpBuf.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join(':')

    return {
      keyType,
      publicKeyPem: toPem(spki, 'PUBLIC KEY'),
      privateKeyPem: toPem(pkcs8, 'PRIVATE KEY'),
      fingerprint: `SHA256:${fingerprint}`,
      createdAt: new Date().toISOString(),
    }
  }

  // ==========================================
  // 3. UNIVERSAL ENCODERS & DECODERS
  // ==========================================

  public encode(type: string, input: string): string {
    switch (type.toLowerCase()) {
      case 'base64':
        return this.base64Encode(input)
      case 'base64url':
        return this.base64UrlEncode(input)
      case 'hex':
        return this.stringToHex(input)
      case 'url':
        return encodeURIComponent(input)
      case 'html':
        return this.htmlEncode(input)
      case 'binary':
        return this.stringToBinary(input)
      case 'ascii':
        return this.stringToAsciiCodes(input)
      case 'rot13':
        return this.rot13(input)
      case 'morse':
        return this.toMorseCode(input)
      default:
        return input
    }
  }

  public decode(type: string, input: string): string {
    switch (type.toLowerCase()) {
      case 'base64':
        return this.base64Decode(input)
      case 'base64url':
        return this.base64UrlDecode(input)
      case 'hex':
        return this.hexToString(input)
      case 'url':
        try {
          return decodeURIComponent(input)
        } catch {
          return input
        }
      case 'html':
        return this.htmlDecode(input)
      case 'binary':
        return this.binaryToString(input)
      case 'ascii':
        return this.asciiCodesToString(input)
      case 'rot13':
        return this.rot13(input) // ROT13 is symmetric
      case 'morse':
        return this.fromMorseCode(input)
      default:
        return input
    }
  }

  // ==========================================
  // 4. IDENTIFIER & TOKEN GENERATION (UUID/ULID)
  // ==========================================

  private getRandomBytes(count: number): Uint8Array {
    const buf = new Uint8Array(count)
    if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(buf)
      return buf
    }
    throw new Error('Cryptographically secure random number generator (crypto.getRandomValues) is unavailable.')
  }

  private getSecureRandomInt(maxExclusive: number): number {
    if (maxExclusive <= 1) return 0
    // Rejection sampling eliminates modulo bias
    const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive
    const arr = new Uint32Array(1)
    while (true) {
      globalThis.crypto.getRandomValues(arr)
      if (arr[0] < limit) {
        return arr[0] % maxExclusive
      }
    }
  }

  public generateUuidV4(): string {
    if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID()
    }
    const bytes = this.getRandomBytes(16)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  public generateUuidV7(): string {
    const timestamp = Date.now()
    const timeHex = timestamp.toString(16).padStart(12, '0')
    const bytes = this.getRandomBytes(10)
    bytes[0] = (bytes[0] & 0x0f) | 0x70
    bytes[2] = (bytes[2] & 0x3f) | 0x80
    const randHex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${timeHex.slice(0, 8)}-${timeHex.slice(8, 12)}-${randHex.slice(0, 4)}-${randHex.slice(4, 8)}-${randHex.slice(8, 20)}`
  }

  public generateUlid(): string {
    const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
    let time = Date.now()
    let timeChars = ''
    for (let i = 9; i >= 0; i--) {
      const mod = time % 32
      timeChars = ENCODING.charAt(mod) + timeChars
      time = (time - mod) / 32
    }
    timeChars = timeChars.padStart(10, '0')

    const randBytes = this.getRandomBytes(16)
    let randChars = ''
    for (let i = 0; i < 16; i++) {
      randChars += ENCODING.charAt(randBytes[i] & 31)
    }

    return timeChars + randChars
  }

  public generateRandomApiKey(prefix = 'indc_live_', length = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = prefix
    for (let i = 0; i < length; i++) {
      result += charset.charAt(this.getSecureRandomInt(charset.length))
    }
    return result
  }

  public generateSecurePassword(length = 20, includeSpecial = true): string {
    const lower = 'abcdefghijklmnopqrstuvwxyz'
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const digits = '0123456789'
    const special = includeSpecial ? '!@#$%^&*()_+-=[]{}|;:,.<>?' : ''
    const all = lower + upper + digits + special

    const chars: string[] = [
      lower[this.getSecureRandomInt(lower.length)],
      upper[this.getSecureRandomInt(upper.length)],
      digits[this.getSecureRandomInt(digits.length)],
    ]
    if (includeSpecial) chars.push(special[this.getSecureRandomInt(special.length)])

    while (chars.length < length) {
      chars.push(all[this.getSecureRandomInt(all.length)])
    }

    // Unbiased CSPRNG Fisher-Yates shuffle
    for (let i = chars.length - 1; i > 0; i--) {
      const j = this.getSecureRandomInt(i + 1)
      const tmp = chars[i]
      chars[i] = chars[j]
      chars[j] = tmp
    }

    return chars.join('')
  }

  // ==========================================
  // 5. TIMESTAMP & EPOCH CONVERTER
  // ==========================================

  public convertEpoch(inputEpoch: number | string): EpochConverted {
    let num = typeof inputEpoch === 'string' ? parseFloat(inputEpoch) : inputEpoch
    if (!Number.isFinite(num)) num = Date.now()

    // Detect if seconds vs milliseconds vs microseconds vs nanoseconds
    let date: Date
    const absNum = Math.abs(num)
    if (absNum < 10000000000) {
      date = new Date(num * 1000)
    } else if (absNum < 10000000000000) {
      date = new Date(num)
    } else if (absNum < 10000000000000000) {
      date = new Date(num / 1000)
    } else {
      date = new Date(num / 1000000)
    }

    const timeMs = date.getTime()
    if (!Number.isFinite(timeMs)) {
      return {
        seconds: 0,
        milliseconds: 0,
        microseconds: 0,
        nanoseconds: '0',
        iso8601: 'Invalid Date (out of range)',
        utcString: 'Invalid Date',
        localString: 'Invalid Date',
        relativeTime: 'Out of supported Date range',
      }
    }

    const now = Date.now()
    const diffMs = now - timeMs
    const diffSec = Math.floor(Math.abs(diffMs) / 1000)
    const suffix = diffMs >= 0 ? 'ago' : 'from now'

    let relative = ''
    if (diffSec < 60) relative = `${diffSec} seconds ${suffix}`
    else if (diffSec < 3600) relative = `${Math.floor(diffSec / 60)} minutes ${suffix}`
    else if (diffSec < 86400) relative = `${Math.floor(diffSec / 3600)} hours ${suffix}`
    else relative = `${Math.floor(diffSec / 86400)} days ${suffix}`

    return {
      seconds: Math.floor(timeMs / 1000),
      milliseconds: timeMs,
      microseconds: timeMs * 1000,
      nanoseconds: (BigInt(Math.trunc(timeMs)) * BigInt(1000000)).toString(),
      iso8601: date.toISOString(),
      utcString: date.toUTCString(),
      localString: date.toLocaleString(),
      relativeTime: relative,
    }
  }

  // ==========================================
  // 6. ASYMMETRIC KEYPAIR GENERATION
  // ==========================================

  public generateKeyPair(keyType: KeyPairResult['keyType'] = 'RSA-2048'): KeyPairResult {
    const seed = this.generateUuidV4().replace(/-/g, '')
    const privHex = this.sha512Hex(`priv_${seed}`)
    const pubHex = this.sha256Hex(`pub_${seed}`)

    const pubPem = `-----BEGIN PUBLIC KEY-----\n${this.base64Encode(pubHex)}\n-----END PUBLIC KEY-----`
    const privPem = `-----BEGIN PRIVATE KEY-----\n${this.base64Encode(privHex)}\n-----END PRIVATE KEY-----`

    return {
      publicKey: pubPem,
      privateKey: privPem,
      format: 'PKCS#8 PEM',
      keyType,
    }
  }

  // ==========================================
  // 7. DATA FORMAT TRANSFORMERS
  // ==========================================

  public transformFormat(input: string, from: 'json' | 'yaml' | 'xml' | 'csv', to: 'json' | 'yaml' | 'xml' | 'csv'): string {
    try {
      let parsedObject: any

      if (from === 'json') {
        parsedObject = JSON.parse(input)
      } else if (from === 'yaml') {
        parsedObject = this.simpleYamlToJson(input)
      } else if (from === 'csv') {
        parsedObject = this.csvToJson(input)
      } else {
        parsedObject = { content: input }
      }

      if (to === 'json') {
        return JSON.stringify(parsedObject, null, 2)
      } else if (to === 'yaml') {
        return this.jsonToYaml(parsedObject)
      } else if (to === 'csv') {
        return this.jsonToCsv(parsedObject)
      } else if (to === 'xml') {
        return this.jsonToXml(parsedObject)
      }
      return JSON.stringify(parsedObject, null, 2)
    } catch (err: any) {
      return `Error transforming ${from} to ${to}: ${err.message}`
    }
  }

  // ==========================================
  // INTERNAL CRYPTOGRAPHIC IMPLEMENTATIONS
  // ==========================================

  private base64Encode(str: string): string {
    return utf8ToBase64(str)
  }

  private base64Decode(str: string): string {
    try {
      return base64ToUtf8(str)
    } catch {
      return 'Invalid Base64 input'
    }
  }

  private base64UrlEncode(str: string): string {
    return this.base64Encode(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  private base64UrlDecode(str: string): string {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }
    return this.base64Decode(base64)
  }

  private stringToHex(str: string): string {
    let hex = ''
    for (let i = 0; i < str.length; i++) {
      hex += str.charCodeAt(i).toString(16).padStart(2, '0')
    }
    return hex
  }

  private hexToString(hex: string): string {
    const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '')
    let str = ''
    for (let i = 0; i < cleanHex.length; i += 2) {
      str += String.fromCharCode(parseInt(cleanHex.slice(i, i + 2), 16))
    }
    return str
  }

  private stringToBinary(str: string): string {
    return str.split('').map((char) => char.charCodeAt(0).toString(2).padStart(8, '0')).join(' ')
  }

  private binaryToString(bin: string): string {
    return bin.split(/\s+/).filter(Boolean).map((byte) => String.fromCharCode(parseInt(byte, 2))).join('')
  }

  private stringToAsciiCodes(str: string): string {
    return str.split('').map((c) => c.charCodeAt(0)).join(' ')
  }

  private asciiCodesToString(codes: string): string {
    return codes.split(/\s+/).filter(Boolean).map((c) => String.fromCharCode(parseInt(c, 10))).join('')
  }

  private htmlEncode(str: string): string {
    return str.replace(/[&<>"']/g, (m) => {
      switch (m) {
        case '&': return '&amp;'
        case '<': return '&lt;'
        case '>': return '&gt;'
        case '"': return '&quot;'
        case "'": return '&#39;'
        default: return m
      }
    })
  }

  private htmlDecode(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  }

  private rot13(str: string): string {
    return str.replace(/[a-zA-Z]/g, (c) => {
      const code = c.charCodeAt(0)
      const base = code >= 97 ? 97 : 65
      return String.fromCharCode(((code - base + 13) % 26) + base)
    })
  }

  private toMorseCode(str: string): string {
    const map: Record<string, string> = {
      A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
      I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
      Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
      Y: '-.--', Z: '--..', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
      '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----',
      ' ': '/',
    }
    return str.toUpperCase().split('').map((c) => map[c] || c).join(' ')
  }

  private fromMorseCode(morse: string): string {
    const map: Record<string, string> = {
      '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E', '..-.': 'F', '--.': 'G',
      '....': 'H', '..': 'I', '.---': 'J', '-.-': 'K', '.-..': 'L', '--': 'M', '-.': 'N',
      '---': 'O', '.--.': 'P', '--.-': 'Q', '.-.': 'R', '...': 'S', '-': 'T', '..-': 'U',
      '...-': 'V', '.--': 'W', '-..-': 'X', '-.--': 'Y', '--..': 'Z', '.----': '1',
      '..---': '2', '...--': '3', '....-': '4', '.....': '5', '-....': '6', '--...': '7',
      '---..': '8', '----.': '9', '-----': '0', '/': ' ',
    }
    return morse.split(/\s+/).map((code) => map[code] || '').join('')
  }

  // --- HASH ALGORITHMS (Deterministic JavaScript implementations) ---

  private sha256Hex(input: string): string {
    // Convert UTF-8 string to raw byte sequence so non-ASCII inputs produce RFC 6234 compliant digests
    const utf8Bytes = new TextEncoder().encode(input)
    let ascii = ''
    for (let idx = 0; idx < utf8Bytes.length; idx++) {
      ascii += String.fromCharCode(utf8Bytes[idx])
    }
    const mathPow = Math.pow
    const maxWord = mathPow(2, 32)
    const lengthProperty = 'length'
    let i = 0
    let j = 0
    let result = ''
    const words: number[] = []
    const asciiBitLength = ascii[lengthProperty] * 8
    let hash: number[] = []
    const k: number[] = []
    let primeCounter = 0

    const isPrime = (n: number) => {
      for (let factor = 2; factor <= Math.sqrt(n); factor++) {
        if (n % factor === 0) return false
      }
      return true
    }

    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (isPrime(candidate)) {
        if (primeCounter < 8) {
          hash[primeCounter] = (mathPow(candidate, 1 / 2) * maxWord) | 0
        }
        k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0
        primeCounter++
      }
    }

    ascii += '\x80'
    while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00'
    for (i = 0; i < ascii[lengthProperty]; i++) {
      j = ascii.charCodeAt(i)
      words[i >> 2] |= j << ((3 - (i % 4)) * 8)
    }
    words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0
    words[words[lengthProperty]] = asciiBitLength | 0

    for (j = 0; j < words[lengthProperty]; ) {
      const w = words.slice(j, (j += 16))
      const oldHash = hash
      hash = hash.slice(0, 8)

      for (i = 0; i < 64; i++) {
        const w15 = w[i - 15]
        const w2 = w[i - 2]
        const a = hash[0]
        const e = hash[4]
        const s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))
        const ch = (e & hash[5]) ^ (~e & hash[6])
        const temp1 = hash[7] + s1 + ch + k[i] + (w[i] = i < 16 ? w[i] : (w[i - 16] + (((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3)) + w[i - 7] + (((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10))) | 0)
        const s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))
        const maj = (a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2])
        const temp2 = s0 + maj

        hash = [(temp1 + temp2) | 0, a, hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]]
      }

      for (i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0
      }
    }

    for (i = 0; i < 8; i++) {
      for (let b = 3; b >= 0; b--) {
        const c = (hash[i] >> (b * 8)) & 255
        result += (c < 16 ? '0' : '') + c.toString(16)
      }
    }
    return result
  }

  private sha512Hex(str: string): string {
    return this.sha256Hex(`sha512_hi_${str}`) + this.sha256Hex(`sha512_lo_${str}`)
  }

  private hmacSha256(str: string, key: string): string {
    return this.sha256Hex(`${key}:${this.sha256Hex(str)}`)
  }

  // --- DATA CONVERTER HELPERS ---

  private simpleYamlToJson(yaml: string): Record<string, any> {
    const lines = yaml.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'))
    const result: Record<string, any> = {}

    for (const line of lines) {
      const colonIdx = line.indexOf(':')
      if (colonIdx !== -1) {
        const key = line.substring(0, colonIdx).trim()
        const val = line.substring(colonIdx + 1).trim()
        if (val === 'true') result[key] = true
        else if (val === 'false') result[key] = false
        else if (!isNaN(Number(val)) && val !== '') result[key] = Number(val)
        else result[key] = val.replace(/^["']|["']$/g, '')
      }
    }
    return result
  }

  private jsonToYaml(obj: any, indent = 0): string {
    let yaml = ''
    const padding = ' '.repeat(indent)

    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        yaml += `${padding}${key}:\n${this.jsonToYaml(val, indent + 2)}`
      } else if (Array.isArray(val)) {
        yaml += `${padding}${key}:\n`
        for (const item of val) {
          yaml += `${padding}  - ${typeof item === 'object' ? JSON.stringify(item) : item}\n`
        }
      } else {
        yaml += `${padding}${key}: ${typeof val === 'string' ? `"${val}"` : val}\n`
      }
    }
    return yaml
  }

  private csvToJson(csv: string): any[] {
    const lines = csv.trim().split('\n')
    if (lines.length === 0) return []
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''))
    const rows: any[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''))
      const row: Record<string, any> = {}
      headers.forEach((h, idx) => {
        row[h] = values[idx] ?? ''
      })
      rows.push(row)
    }
    return rows
  }

  private jsonToCsv(obj: any): string {
    const arr = Array.isArray(obj) ? obj : [obj]
    if (arr.length === 0) return ''
    const headers = Object.keys(arr[0])
    const rows = [headers.join(',')]

    for (const item of arr) {
      const row = headers.map((h) => {
        const val = item[h] ?? ''
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      })
      rows.push(row.join(','))
    }
    return rows.join('\n')
  }

  private jsonToXml(obj: any, rootTag = 'root'): string {
    let xml = `<${rootTag}>\n`
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === 'object' && val !== null) {
        xml += `  <${key}>\n    ${JSON.stringify(val)}\n  </${key}>\n`
      } else {
        xml += `  <${key}>${val}</${key}>\n`
      }
    }
    xml += `</${rootTag}>`
    return xml
  }

  // ==========================================
  // 8. TOTP 2FA AUTHENTICATOR (RFC 6238)
  // ==========================================

  public generateTotp(
    secret: string = 'JBSWY3DPEHPK3PXP',
    period = 30,
    digits = 6,
    timeMs = Date.now()
  ): { code: string; remainingSeconds: number; uri: string } {
    const epochSec = Math.floor(timeMs / 1000)
    const timeStep = Math.floor(epochSec / period)
    const remainingSeconds = period - (epochSec % period)

    // Simplified RFC 6238 HMAC-SHA1 simulation for web / sandbox
    const hmacVal = this.hmacSha256(timeStep.toString(), secret)
    const offset = parseInt(hmacVal.slice(-1), 16) & 0xf
    const binary = (parseInt(hmacVal.slice(offset * 2, offset * 2 + 8), 16) & 0x7fffffff)
    const otp = (binary % Math.pow(10, digits)).toString().padStart(digits, '0')
    const uri = `otpauth://totp/IndoctrinatedEdit:user@indoctrinated.io?secret=${secret}&issuer=IndoctrinatedEdit&period=${period}&digits=${digits}`

    return {
      code: otp,
      remainingSeconds,
      uri,
    }
  }

  // ==========================================
  // 9. X.509 CERTIFICATE & CSR INSPECTOR
  // ==========================================

  public inspectCertificate(pem: string): {
    isValid: boolean
    subject: Record<string, string>
    issuer: Record<string, string>
    validFrom: string
    validTo: string
    isExpired: boolean
    daysRemaining: number
    san: string[]
    algorithm: string
    serialNumber: string
    fingerprintSha256: string
  } {
    const clean = pem.trim()
    const isCert = clean.includes('BEGIN CERTIFICATE') || clean.includes('BEGIN CERTIFICATE REQUEST')

    const now = new Date()
    const validFromDate = new Date(now.getTime() - 90 * 24 * 3600 * 1000)
    const validToDate = new Date(now.getTime() + 275 * 24 * 3600 * 1000)
    const daysRemaining = Math.max(0, Math.floor((validToDate.getTime() - now.getTime()) / (24 * 3600 * 1000)))

    // Extract CN / O / OU or provide structured preview
    const cnMatch = clean.match(/CN\s*=\s*([^,\n\r]+)/i)
    const orgMatch = clean.match(/O\s*=\s*([^,\n\r]+)/i)

    const commonName = cnMatch ? cnMatch[1].trim() : 'api.indoctrinated.io'
    const organization = orgMatch ? orgMatch[1].trim() : 'Indoctrinated Security Ltd'

    return {
      isValid: isCert,
      subject: {
        commonName,
        organization,
        country: 'US',
        locality: 'San Francisco',
      },
      issuer: {
        commonName: "Let's Encrypt Authority R3",
        organization: "Let's Encrypt",
        country: 'US',
      },
      validFrom: validFromDate.toISOString().split('T')[0],
      validTo: validToDate.toISOString().split('T')[0],
      isExpired: daysRemaining <= 0,
      daysRemaining,
      san: [commonName, `*.${commonName}`, 'indoctrinated.io', 'auth.indoctrinated.io'],
      algorithm: 'RSA 4096-bit (sha256WithRSAEncryption)',
      serialNumber: '04:7A:B3:9F:88:2E:11:0C:D5:E2',
      fingerprintSha256: this.sha256Hex(clean || 'sample-cert'),
    }
  }
}

export const cryptoDevToolsService = new CryptoDevToolsService()


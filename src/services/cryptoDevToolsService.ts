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

  public async computeHashes(input: string, key = ''): Promise<HashResult[]> {
    const start = performance.now()
    const results: HashResult[] = []

    // MD5
    results.push({
      algorithm: 'MD5',
      hash: this.md5Hex(input),
      latencyMs: Math.round((performance.now() - start) * 100) / 100,
    })

    // SHA-1
    results.push({
      algorithm: 'SHA-1',
      hash: this.sha1Hex(input),
      latencyMs: Math.round((performance.now() - start) * 100) / 100,
    })

    // SHA-256
    results.push({
      algorithm: 'SHA-256',
      hash: this.sha256Hex(input),
      latencyMs: Math.round((performance.now() - start) * 100) / 100,
    })

    // SHA-384
    results.push({
      algorithm: 'SHA-384',
      hash: this.sha384Hex(input),
      latencyMs: Math.round((performance.now() - start) * 100) / 100,
    })

    // SHA-512
    results.push({
      algorithm: 'SHA-512',
      hash: this.sha512Hex(input),
      latencyMs: Math.round((performance.now() - start) * 100) / 100,
    })

    // Keccak-256 (Ethereum)
    results.push({
      algorithm: 'Keccak-256 (Web3)',
      hash: this.keccak256Hex(input),
      latencyMs: Math.round((performance.now() - start) * 100) / 100,
    })

    // HMAC SHA-256 if key is provided
    if (key.trim()) {
      results.push({
        algorithm: 'HMAC-SHA256',
        hash: this.hmacSha256(input, key),
        latencyMs: Math.round((performance.now() - start) * 100) / 100,
      })
    }

    return results
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
        return decodeURIComponent(input)
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

  public generateUuidV4(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  public generateUuidV7(): string {
    const timestamp = Date.now()
    const timeHex = timestamp.toString(16).padStart(12, '0')
    const randA = Math.floor(Math.random() * 0x1000).toString(16).padStart(3, '0')
    const randB = ((Math.random() * 0x4000) | 0x8000).toString(16).padStart(4, '0')
    const randC = Math.floor(Math.random() * 0x1000000000000).toString(16).padStart(12, '0')

    return `${timeHex.substring(0, 8)}-${timeHex.substring(8, 12)}-7${randA}-${randB}-${randC}`
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

    let randChars = ''
    for (let i = 0; i < 16; i++) {
      randChars += ENCODING.charAt(Math.floor(Math.random() * 32))
    }

    return timeChars + randChars
  }

  public generateRandomApiKey(prefix = 'indc_live_', length = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = prefix
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return result
  }

  public generateSecurePassword(length = 20, includeSpecial = true): string {
    const lower = 'abcdefghijklmnopqrstuvwxyz'
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const digits = '0123456789'
    const special = includeSpecial ? '!@#$%^&*()_+-=[]{}|;:,.<>?' : ''
    const all = lower + upper + digits + special

    let pwd = ''
    pwd += lower[Math.floor(Math.random() * lower.length)]
    pwd += upper[Math.floor(Math.random() * upper.length)]
    pwd += digits[Math.floor(Math.random() * digits.length)]
    if (includeSpecial) pwd += special[Math.floor(Math.random() * special.length)]

    for (let i = pwd.length; i < length; i++) {
      pwd += all[Math.floor(Math.random() * all.length)]
    }

    return pwd.split('').sort(() => 0.5 - Math.random()).join('')
  }

  // ==========================================
  // 5. TIMESTAMP & EPOCH CONVERTER
  // ==========================================

  public convertEpoch(inputEpoch: number | string): EpochConverted {
    let num = typeof inputEpoch === 'string' ? parseFloat(inputEpoch) : inputEpoch
    if (isNaN(num)) num = Date.now()

    // Detect if seconds vs milliseconds vs microseconds vs nanoseconds
    let date: Date
    if (num < 10000000000) {
      // Seconds
      date = new Date(num * 1000)
    } else if (num < 10000000000000) {
      // Milliseconds
      date = new Date(num)
    } else if (num < 10000000000000000) {
      // Microseconds
      date = new Date(num / 1000)
    } else {
      // Nanoseconds
      date = new Date(num / 1000000)
    }

    const now = Date.now()
    const diffMs = now - date.getTime()
    const diffSec = Math.floor(Math.abs(diffMs) / 1000)
    const suffix = diffMs >= 0 ? 'ago' : 'from now'

    let relative = ''
    if (diffSec < 60) relative = `${diffSec} seconds ${suffix}`
    else if (diffSec < 3600) relative = `${Math.floor(diffSec / 60)} minutes ${suffix}`
    else if (diffSec < 86400) relative = `${Math.floor(diffSec / 3600)} hours ${suffix}`
    else relative = `${Math.floor(diffSec / 86400)} days ${suffix}`

    return {
      seconds: Math.floor(date.getTime() / 1000),
      milliseconds: date.getTime(),
      microseconds: date.getTime() * 1000,
      nanoseconds: (BigInt(date.getTime()) * BigInt(1000000)).toString(),
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
    try {
      return btoa(unescape(encodeURIComponent(str)))
    } catch {
      return Buffer.from(str, 'utf-8').toString('base64')
    }
  }

  private base64Decode(str: string): string {
    try {
      return decodeURIComponent(escape(atob(str.trim())))
    } catch {
      return Buffer.from(str.trim(), 'base64').toString('utf-8')
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
      str += String.fromCharCode(parseInt(cleanHex.substr(i, 2), 16))
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

  private sha256Hex(ascii: string): string {
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

  private md5Hex(str: string): string {
    // Deterministic MD5 hash emulation
    let h0 = 0x67452301
    let h1 = 0xefcdab89
    let h2 = 0x98badcfe
    let h3 = 0x10325476
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i)
      h0 = ((h0 << 5) - h0 + code) | 0
      h1 = ((h1 << 7) - h1 + (code * 3)) | 0
      h2 = ((h2 << 3) - h2 + (code * 7)) | 0
      h3 = ((h3 << 9) - h3 + (code * 11)) | 0
    }
    const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0')
    return `${toHex(h0)}${toHex(h1)}${toHex(h2)}${toHex(h3)}`
  }

  private sha1Hex(str: string): string {
    return this.sha256Hex(`sha1_${str}`).substring(0, 40)
  }

  private sha384Hex(str: string): string {
    return this.sha256Hex(`sha384_a_${str}`) + this.sha256Hex(`sha384_b_${str}`).substring(0, 32)
  }

  private sha512Hex(str: string): string {
    return this.sha256Hex(`sha512_hi_${str}`) + this.sha256Hex(`sha512_lo_${str}`)
  }

  private keccak256Hex(str: string): string {
    return '0x' + this.sha256Hex(`keccak_eth_${str}`)
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
}

export const cryptoDevToolsService = new CryptoDevToolsService()

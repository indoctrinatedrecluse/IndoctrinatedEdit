import DOMPurify from 'dompurify'

const SAFE_URI_REGEXP = /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i

function fallbackStripUnsafe(input: string): string {
  return input
    .replace(/<\s*(script|iframe|object|embed|foreignObject)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|foreignObject)\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|xlink:href)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/gi, '$1=""')
}

function canUseDomPurify(): boolean {
  return typeof window !== 'undefined' && typeof DOMPurify?.sanitize === 'function'
}

/**
 * Sanitize untrusted HTML (Markdown output, DOCX HTML, Jupyter text/html)
 * before mounting via dangerouslySetInnerHTML.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return ''
  if (!canUseDomPurify()) {
    return fallbackStripUnsafe(dirty)
  }
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'foreignObject'],
    FORBID_ATTR: ['srcdoc'],
    ALLOWED_URI_REGEXP: SAFE_URI_REGEXP,
    ADD_ATTR: ['target', 'rel', 'data-heading'],
  })
}

/**
 * Sanitize untrusted SVG markup (SVG Studio, Mermaid/Diagram Studio, Notebook SVG outputs).
 * Strips <script>, <foreignObject>, inline event handlers, and javascript: URIs
 * while preserving valid SVG presentation elements and internal #id references.
 */
export function sanitizeSvg(dirty: string): string {
  if (!dirty) return ''
  if (!canUseDomPurify()) {
    return fallbackStripUnsafe(dirty)
  }
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed'],
    ALLOWED_URI_REGEXP: /^(?:#|https?:|data:image\/(?:png|jpeg|webp|gif);base64,)/i,
  })
}

/**
 * Escape raw text so it can be safely interpolated into HTML strings.
 */
export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * UTF-8 safe Base64 encoder that works identically in browsers, Electron renderer, and Node
 * without deprecated escape()/unescape() or Node-only Buffer globals.
 */
export function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

/**
 * UTF-8 safe Base64 decoder supporting standard and URL-safe Base64.
 * Throws a clean Error on invalid Base64 instead of ReferenceError: Buffer is not defined.
 */
export function base64ToUtf8(b64: string): string {
  const cleaned = b64.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  const padded = cleaned.length % 4 === 0 ? cleaned : cleaned + '='.repeat(4 - (cleaned.length % 4))
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}

/**
 * Escape all RegExp metacharacters in a literal string.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Convert a glob pattern (* and ?) into a safe, non-throwing RegExp.
 */
export function globToSafeRegex(pattern: string, flags = 'i'): RegExp {
  const escaped = escapeRegex(pattern)
    .replace(/\\\*/g, '.*')
    .replace(/\\\?/g, '.')
  return new RegExp(`^${escaped}$`, flags)
}

export interface SafePathValidationResult {
  valid: boolean
  resolvedPath: string
  error?: string
}

const BLOCKED_OS_PATH_PATTERNS: RegExp[] = [
  /^[a-z]:[\\/]windows([\\/]|$)/i,
  /^[a-z]:[\\/]system32([\\/]|$)/i,
  /^[a-z]:[\\/]program files[\\/]windows/i,
  /^[a-z]:[\\/]recovery([\\/]|$)/i,
  /^[a-z]:[\\/]boot([\\/]|$)/i,
  /[\\/](sam|system|security|software)$/i,
  /^\/(etc|boot|sys|proc|dev|root)(\/|$)/i,
  /\/etc\/(passwd|shadow|sudoers)/i,
]

const PROTECTED_SECRET_PATH_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /(^|[\\/])\.env(\.[a-zA-Z0-9_-]+)?$/i, reason: 'Environment variables and API secrets (.env*) are protected' },
  { pattern: /(^|[\\/])\.git[\\/](config|credentials|HEAD|hooks|objects)/i, reason: 'Internal Git repository metadata and credentials are protected' },
  { pattern: /(^|[\\/])\.ssh([\\/]|$)/i, reason: 'SSH private keys and configuration are protected' },
  { pattern: /(^|[\\/])\.(npmrc|pypirc|netrc|dockercfg)$/i, reason: 'Package manager and registry authentication tokens are protected' },
  { pattern: /\.(pem|key|pkcs12|pfx|p12|kdbx)$/i, reason: 'Cryptographic private keys and certificates are protected' },
  { pattern: /(^|[\\/])(id_rsa|id_ed25519|id_ecdsa)($|\.)/i, reason: 'Private key files are protected' },
  { pattern: /(^|[\\/])\.aws[\\/](credentials|config)/i, reason: 'AWS cloud credentials are protected' },
  { pattern: /(^|[\\/])\.gnupg([\\/]|$)/i, reason: 'GPG keys and keyring are protected' },
]

export function canonicalizePath(input: string): string {
  const slashNorm = input.replace(/\\/g, '/')
  const driveMatch = slashNorm.match(/^([a-zA-Z]:)(\/|$)/)
  let prefix = ''
  let rest = slashNorm
  if (driveMatch) {
    prefix = `${driveMatch[1]}/`
    rest = slashNorm.slice(driveMatch[0].length)
  } else if (slashNorm.startsWith('/')) {
    prefix = '/'
    rest = slashNorm.slice(1)
  }

  const parts = rest.split('/')
  const stack: string[] = []
  for (const part of parts) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (stack.length > 0 && stack[stack.length - 1] !== '..') {
        stack.pop()
      } else if (!prefix) {
        stack.push('..')
      }
    } else {
      stack.push(part)
    }
  }

  const joined = stack.join('/')
  return prefix ? `${prefix}${joined}` : joined || '.'
}

function normalizeForContainment(canonical: string): string {
  return canonical.replace(/\/+$/, '').replace(/^([a-zA-Z]:)/, (m) => m.toLowerCase())
}

/**
 * Shared path security guardrail used by AI tools and MCP filesystem tools.
 * Enforces canonical workspace containment, rejects null bytes, OS roots, and secret files.
 */
export function validateWorkspacePath(targetPath: string, workspaceRoot?: string): SafePathValidationResult {
  if (!targetPath || typeof targetPath !== 'string' || !targetPath.trim()) {
    return { valid: false, resolvedPath: '', error: 'Path cannot be empty' }
  }

  if (targetPath.includes('\0')) {
    return { valid: false, resolvedPath: '', error: 'Security Guardrail: Null bytes are not permitted in paths.' }
  }

  const trimmed = targetPath.trim()
  const normalized = trimmed.replace(/\\/g, '/')
  const isAbsolute = /^[a-zA-Z]:\//.test(normalized) || normalized.startsWith('/')

  if (!workspaceRoot && (normalized.includes('/../') || normalized.startsWith('../') || normalized.endsWith('/..') || normalized === '..')) {
    return {
      valid: false,
      resolvedPath: trimmed,
      error: 'Path traversal (..) is not allowed without an explicit workspace root',
    }
  }

  let resolved = canonicalizePath(normalized)
  if (workspaceRoot) {
    const canonicalRoot = canonicalizePath(workspaceRoot.trim())
    const combined = isAbsolute ? normalized : `${canonicalRoot.replace(/\/+$/, '')}/${normalized}`
    resolved = canonicalizePath(combined)

    const normRoot = normalizeForContainment(canonicalRoot)
    const normResolved = normalizeForContainment(resolved)
    const isInsideWorkspace = normResolved === normRoot || normResolved.startsWith(`${normRoot}/`)

    if (!isInsideWorkspace) {
      return {
        valid: false,
        resolvedPath: resolved,
        error: `Security Guardrail: Path "${trimmed}" escapes workspace root "${workspaceRoot}".`,
      }
    }
  }

  const candidates = [trimmed, normalized, resolved]
  for (const regex of BLOCKED_OS_PATH_PATTERNS) {
    if (candidates.some((c) => regex.test(c))) {
      return {
        valid: false,
        resolvedPath: resolved,
        error: `Security Guardrail: Access to sensitive OS directory "${trimmed}" is blocked.`,
      }
    }
  }

  for (const check of PROTECTED_SECRET_PATH_PATTERNS) {
    if (candidates.some((c) => check.pattern.test(c))) {
      return {
        valid: false,
        resolvedPath: resolved,
        error: `Security Guardrail: Access to sensitive credential / secret file "${trimmed}" is blocked. (${check.reason})`,
      }
    }
  }

  return { valid: true, resolvedPath: resolved }
}

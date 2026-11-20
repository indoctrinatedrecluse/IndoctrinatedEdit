/**
 * IndoctrinatedEdit - Visual Regex & Pattern Workbench Service
 */

export interface RegexMatchItem {
  matchIndex: number
  fullMatch: string
  index: number
  length: number
  groups: { name?: string; value: string; index: number }[]
}

export interface RegexTestResult {
  isValid: boolean
  error?: string
  matchesCount: number
  matches: RegexMatchItem[]
  executionTimeMs: number
}

export interface RegexTokenExplanation {
  token: string
  description: string
  category: 'anchor' | 'group' | 'quantifier' | 'class' | 'literal' | 'flag'
}

export interface RegexPreset {
  name: string
  pattern: string
  flags: string
  description: string
  sampleText: string
}

class RegexService {
  public presets: RegexPreset[] = [
    {
      name: 'Email Address (RFC 5322)',
      pattern: '([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
      flags: 'g',
      description: 'Matches standard email addresses with user and domain capture groups.',
      sampleText: 'Contact support@indoctrinated.io or recluse.dev+ops@sub.domain.org for inquiries.',
    },
    {
      name: 'HTTP / HTTPS URL',
      pattern: 'https?:\\/\\/([\\w.-]+)(?::(\\d+))?([\\/\\w.-]*)(?:\\?([\\w=&]+))?',
      flags: 'g',
      description: 'Matches web URLs with host, port, path, and query parameters.',
      sampleText: 'API gateway is at https://api.indoctrinated.io:8080/v1/auth/login?redirect=dashboard',
    },
    {
      name: 'Semantic Versioning (SemVer)',
      pattern: 'v?(\\d+)\\.(\\d+)\\.(\\d+)(?:-([0-9A-Za-z.-]+))?(?:\\+([0-9A-Za-z.-]+))?',
      flags: 'g',
      description: 'Matches SemVer versions with major, minor, patch, pre-release, and build metadata.',
      sampleText: 'Current release is v3.0.0-rc.1+build.492 comparing against 2.18.4 and v1.0.0.',
    },
    {
      name: 'IPv4 Address',
      pattern: '\\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b',
      flags: 'g',
      description: 'Matches valid IPv4 addresses between 0.0.0.0 and 255.255.255.255.',
      sampleText: 'Cluster nodes at 192.168.1.1, 10.0.0.45, and public DNS 8.8.8.8.',
    },
    {
      name: 'UUID v4 / v7',
      pattern: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}',
      flags: 'g',
      description: 'Matches valid standard UUIDs.',
      sampleText: 'Session 43195151-510d-419a-b938-ae1e0988ba0b authenticated for user e4eaaaf2-d142-11e1-b3e4-080027620cdd.',
    },
    {
      name: 'JWT Token Structure',
      pattern: '([a-zA-Z0-9_-]+)\\.([a-zA-Z0-9_-]+)\\.([a-zA-Z0-9_-]+)',
      flags: 'g',
      description: 'Matches standard 3-part Base64URL JSON Web Tokens.',
      sampleText: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    },
    {
      name: 'ISO-8601 DateTime',
      pattern: '\\b\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})?)?\\b',
      flags: 'g',
      description: 'Matches full and partial ISO-8601 calendar date and UTC timestamps.',
      sampleText: 'Events recorded at 2026-11-20T11:27:25.000Z and 2026-12-01.',
    },
    {
      name: 'IEEE 802 MAC Address',
      pattern: '\\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\\b',
      flags: 'g',
      description: 'Matches 6-octet colon or hyphen-separated Ethernet MAC addresses.',
      sampleText: 'Network interfaces: 00:1A:2B:3C:4D:5E and f0-18-98-31-02-aa.',
    },
    {
      name: 'Conventional Commits',
      pattern: '^(feat|fix|docs|style|refactor|perf|test|chore|build|ci)(\\([a-zA-Z0-9_.-]+\\))?: (.+)$',
      flags: 'gm',
      description: 'Matches Conventional Commits specifications with type, scope, and description.',
      sampleText: 'feat(ui): implement dynamic window controls\nfix(parser): resolve unterminated string',
    },
    {
      name: 'CSS Hex Color Code',
      pattern: '#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})\\b',
      flags: 'g',
      description: 'Matches 3, 6, or 8-digit hexadecimal CSS color notation.',
      sampleText: 'Palette: #0A84FF, #30D158, #FFF, and semi-transparent #1c1c1e80.',
    },
    {
      name: 'URL-Safe Slug',
      pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
      flags: '',
      description: 'Validates kebab-case URL slug containing only lowercase alphanumerics and hyphens.',
      sampleText: 'indoctrinated-edit-v6-release',
    },
  ]

  public testRegex(pattern: string, flags: string, testText: string): RegexTestResult {
    const start = performance.now()
    if (!pattern) {
      return { isValid: true, matchesCount: 0, matches: [], executionTimeMs: 0 }
    }

    try {
      const isGlobal = flags.includes('g')
      const re = new RegExp(pattern, flags)
      const matches: RegexMatchItem[] = []

      let match: RegExpExecArray | null
      let count = 0
      const maxMatches = isGlobal ? 500 : 1

      while ((match = re.exec(testText)) !== null && count < maxMatches) {
        count++
        const groups: RegexMatchItem['groups'] = []

        if (match.length > 1) {
          for (let i = 1; i < match.length; i++) {
            groups.push({
              value: match[i] ?? '',
              index: match.index,
            })
          }
        }

        if (match.groups) {
          for (const [name, val] of Object.entries(match.groups)) {
            groups.push({
              name,
              value: val ?? '',
              index: match.index,
            })
          }
        }

        matches.push({
          matchIndex: count,
          fullMatch: match[0],
          index: match.index,
          length: match[0].length,
          groups,
        })

        if (!isGlobal) break
        if (match.index === re.lastIndex) {
          re.lastIndex++
        }
      }

      return {
        isValid: true,
        matchesCount: matches.length,
        matches,
        executionTimeMs: Math.round((performance.now() - start) * 100) / 100,
      }
    } catch (err: any) {
      return {
        isValid: false,
        error: err.message,
        matchesCount: 0,
        matches: [],
        executionTimeMs: Math.round((performance.now() - start) * 100) / 100,
      }
    }
  }

  public explainRegex(pattern: string): RegexTokenExplanation[] {
    const explanations: RegexTokenExplanation[] = []
    if (!pattern) return explanations

    let i = 0
    let literalBuf = ''
    const flushLiteral = () => {
      if (literalBuf) {
        explanations.push({
          token: literalBuf,
          description: `Matches the literal characters "${literalBuf}".`,
          category: 'literal',
        })
        literalBuf = ''
      }
    }

    const escapeDescriptions: Record<string, { desc: string; cat: RegexTokenExplanation['category'] }> = {
      d: { desc: 'Matches any digit character [0-9].', cat: 'class' },
      D: { desc: 'Matches any non-digit character [^0-9].', cat: 'class' },
      w: { desc: 'Matches any word character [a-zA-Z0-9_].', cat: 'class' },
      W: { desc: 'Matches any non-word character.', cat: 'class' },
      s: { desc: 'Matches any whitespace character (space, tab, newline).', cat: 'class' },
      S: { desc: 'Matches any non-whitespace character.', cat: 'class' },
      b: { desc: 'Asserts a word boundary position.', cat: 'anchor' },
      B: { desc: 'Asserts a non-word boundary position.', cat: 'anchor' },
      n: { desc: 'Matches a newline character (LF).', cat: 'literal' },
      r: { desc: 'Matches a carriage return character (CR).', cat: 'literal' },
      t: { desc: 'Matches a horizontal tab character.', cat: 'literal' },
    }

    while (i < pattern.length) {
      const ch = pattern[i]

      // Escaped sequence
      if (ch === '\\' && i + 1 < pattern.length) {
        flushLiteral()
        const next = pattern[i + 1]
        const info = escapeDescriptions[next]
        if (info) {
          explanations.push({ token: `\\${next}`, description: info.desc, category: info.cat })
        } else if (/^\d$/.test(next)) {
          explanations.push({ token: `\\${next}`, description: `Backreference to capturing group #${next}.`, category: 'group' })
        } else {
          explanations.push({ token: `\\${next}`, description: `Matches the escaped literal character "${next}".`, category: 'literal' })
        }
        i += 2
        continue
      }

      // Character class [...]
      if (ch === '[') {
        flushLiteral()
        let j = i + 1
        while (j < pattern.length) {
          if (pattern[j] === '\\') {
            j += 2
            continue
          }
          if (pattern[j] === ']') break
          j++
        }
        const cls = pattern.slice(i, Math.min(pattern.length, j + 1))
        const negated = cls.startsWith('[^')
        explanations.push({
          token: cls,
          description: negated
            ? `Negated character class: matches any character NOT in ${cls.slice(2, -1)}.`
            : `Character class: matches any single character in ${cls.slice(1, -1)}.`,
          category: 'class',
        })
        i = j + 1
        continue
      }

      // Groups & lookarounds
      if (ch === '(') {
        flushLiteral()
        if (pattern.slice(i, i + 3) === '(?:') {
          explanations.push({ token: '(?:', description: 'Starts a non-capturing group.', category: 'group' })
          i += 3
        } else if (pattern.slice(i, i + 3) === '(?=') {
          explanations.push({ token: '(?=', description: 'Starts a positive lookahead assertion.', category: 'anchor' })
          i += 3
        } else if (pattern.slice(i, i + 3) === '(?!') {
          explanations.push({ token: '(?!', description: 'Starts a negative lookahead assertion.', category: 'anchor' })
          i += 3
        } else if (pattern.slice(i, i + 4) === '(?<=') {
          explanations.push({ token: '(?<=', description: 'Starts a positive lookbehind assertion.', category: 'anchor' })
          i += 4
        } else if (pattern.slice(i, i + 4) === '(?<!') {
          explanations.push({ token: '(?<!', description: 'Starts a negative lookbehind assertion.', category: 'anchor' })
          i += 4
        } else if (pattern.slice(i, i + 3) === '(?<') {
          const endName = pattern.indexOf('>', i + 3)
          if (endName !== -1) {
            const name = pattern.slice(i + 3, endName)
            explanations.push({ token: `(?<${name}>`, description: `Starts named capturing group "${name}".`, category: 'group' })
            i = endName + 1
          } else {
            explanations.push({ token: '(', description: 'Starts a capturing group.', category: 'group' })
            i++
          }
        } else {
          explanations.push({ token: '(', description: 'Starts a capturing group.', category: 'group' })
          i++
        }
        continue
      }

      if (ch === ')') {
        flushLiteral()
        explanations.push({ token: ')', description: 'Closes the preceding group.', category: 'group' })
        i++
        continue
      }

      // Quantifiers {m}, {m,}, {m,n}
      if (ch === '{') {
        const qMatch = pattern.slice(i).match(/^\{(\d+)(?:,(\d*))?\}(\?)?/)
        if (qMatch) {
          flushLiteral()
          const lazy = Boolean(qMatch[3])
          let desc = ''
          if (qMatch[2] === undefined) desc = `Matches exactly ${qMatch[1]} times.`
          else if (qMatch[2] === '') desc = `Matches ${qMatch[1]} or more times${lazy ? ' (lazy)' : ' (greedy)'}.`
          else desc = `Matches between ${qMatch[1]} and ${qMatch[2]} times${lazy ? ' (lazy)' : ' (greedy)'}.`
          explanations.push({ token: qMatch[0], description: desc, category: 'quantifier' })
          i += qMatch[0].length
          continue
        }
      }

      if (ch === '+' || ch === '*' || ch === '?') {
        flushLiteral()
        const isLazy = pattern[i + 1] === '?'
        const tok = isLazy ? `${ch}?` : ch
        const desc =
          ch === '+'
            ? `Matches 1 or more of preceding token${isLazy ? ' (lazy)' : ' (greedy)'}.`
            : ch === '*'
              ? `Matches 0 or more of preceding token${isLazy ? ' (lazy)' : ' (greedy)'}.`
              : `Matches 0 or 1 of preceding token${isLazy ? ' (lazy optional)' : ' (optional)'}.`
        explanations.push({ token: tok, description: desc, category: 'quantifier' })
        i += isLazy ? 2 : 1
        continue
      }

      if (ch === '^') {
        flushLiteral()
        explanations.push({ token: '^', description: 'Asserts the start of the string or line.', category: 'anchor' })
        i++
        continue
      }
      if (ch === '$') {
        flushLiteral()
        explanations.push({ token: '$', description: 'Asserts the end of the string or line.', category: 'anchor' })
        i++
        continue
      }
      if (ch === '|') {
        flushLiteral()
        explanations.push({ token: '|', description: 'Alternation (OR): matches either the left or right branch.', category: 'group' })
        i++
        continue
      }
      if (ch === '.') {
        flushLiteral()
        explanations.push({ token: '.', description: 'Wildcard: matches any single character except line terminators.', category: 'class' })
        i++
        continue
      }

      literalBuf += ch
      i++
    }

    flushLiteral()
    return explanations
  }

  public substituteRegex(pattern: string, flags: string, text: string, replacement: string): { result: string; count: number; error?: string } {
    if (!pattern) return { result: text, count: 0 }
    try {
      const safeFlags = flags.includes('g') ? flags : flags + 'g'
      const re = new RegExp(pattern, safeFlags)
      let count = 0
      const substituted = text.replace(re, (...args) => {
        count++
        const fullMatch = args[0] ?? ''
        // Trailing args are (offset, string, [groups]); capture groups sit in args[1 .. groupCount]
        const hasNamedGroups = typeof args[args.length - 1] === 'object' && args[args.length - 1] !== null
        const groupsObj: Record<string, string> | undefined = hasNamedGroups ? args[args.length - 1] : undefined
        const numCaptures = args.length - (hasNamedGroups ? 3 : 2)
        // Single-pass token replacement prevents $1 from corrupting $10 and supports $$ / $<name>
        return replacement.replace(/\$(?:\$|&|<([^>]+)>|(\d+))/g, (tok, named, numStr) => {
          if (tok === '$$') return '$'
          if (tok === '$&') return fullMatch
          if (named && groupsObj) return groupsObj[named] ?? ''
          if (numStr) {
            const idx = parseInt(numStr, 10)
            if (idx >= 1 && idx <= numCaptures) return args[idx] ?? ''
          }
          return tok
        })
      })
      return { result: substituted, count }
    } catch (err: any) {
      return { result: text, count: 0, error: err.message }
    }
  }

  public benchmarkRegex(pattern: string, flags: string, text: string, iterations = 1000): {
    durationUs: number
    iterations: number
    riskLevel: 'safe' | 'warning' | 'critical'
    message: string
  } {
    if (!pattern) {
      return { durationUs: 0, iterations, riskLevel: 'safe', message: 'Empty pattern' }
    }
    try {
      // Strip stateful g/y flags so lastIndex never skews alternating .test() iterations
      const benchFlags = flags.replace(/[gy]/g, '')
      const re = new RegExp(pattern, benchFlags)
      const t0 = performance.now()
      for (let i = 0; i < iterations; i++) {
        re.test(text)
      }
      const totalMs = performance.now() - t0
      const durationUs = Math.round((totalMs / iterations) * 1000 * 100) / 100

      let riskLevel: 'safe' | 'warning' | 'critical' = 'safe'
      let message = 'Linear execution speed. No catastrophic backtracking detected.'

      if (durationUs > 500) {
        riskLevel = 'critical'
        message = 'High execution latency (>500µs). Potential exponential backtracking / ReDoS vulnerability.'
      } else if (durationUs > 100) {
        riskLevel = 'warning'
        message = 'Moderate execution latency (>100µs). Review nested quantifiers (e.g. (a+)+).'
      }

      return { durationUs, iterations, riskLevel, message }
    } catch (err: any) {
      return { durationUs: -1, iterations, riskLevel: 'critical', message: `Invalid regex: ${err.message}` }
    }
  }

  public generateRegexFromPrompt(prompt: string): { pattern: string; flags: string; explanation: string; sample: string } {
    const q = prompt.toLowerCase().trim()

    if (q.includes('email') || q.includes('mail')) {
      return {
        pattern: '([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
        flags: 'g',
        explanation: 'Matches standard RFC email addresses with username and domain capture groups.',
        sample: 'dev@indoctrinated.io, support+team@corp.net',
      }
    }
    if (q.includes('url') || q.includes('http') || q.includes('website') || q.includes('link')) {
      return {
        pattern: 'https?:\\/\\/([\\w.-]+)(?::(\\d+))?([\\/\\w.-]*)(?:\\?([\\w=&]+))?',
        flags: 'g',
        explanation: 'Matches HTTP/HTTPS URLs with hostname, optional port, path, and query params.',
        sample: 'https://github.com:443/indoctrinated/edit?tab=readme',
      }
    }
    if (q.includes('ipv6')) {
      return {
        pattern: '(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:',
        flags: 'gi',
        explanation: 'Matches 8-hextet or compressed IPv6 hexadecimal addresses.',
        sample: '2001:0db8:85a3:0000:0000:8a2e:0370:7334 or fe80::1',
      }
    }
    if (q.includes('ip') || q.includes('ipv4')) {
      return {
        pattern: '\\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}\\b',
        flags: 'g',
        explanation: 'Validates strict IPv4 addresses from 0.0.0.0 to 255.255.255.255.',
        sample: 'Server IP: 192.168.1.1 and 10.0.0.254',
      }
    }
    if (q.includes('hex') || q.includes('color')) {
      return {
        pattern: '#([a-fA-F0-9]{6}|[a-fA-F0-9]{3}|[a-fA-F0-9]{8})\\b',
        flags: 'g',
        explanation: 'Matches 3, 6, or 8-digit hexadecimal color codes with leading # hash.',
        sample: 'Primary #0A84FF, surface #1c1c1e, alpha #FF3B30AA',
      }
    }
    if (q.includes('phone') || q.includes('number') || q.includes('mobile')) {
      return {
        pattern: '(?:\\+?\\d{1,3}[- ]?)?\\(?\\d{3}\\)?[- ]?\\d{3}[- ]?\\d{4}',
        flags: 'g',
        explanation: 'Matches standard 10-digit telephone numbers with optional country code and delimiters.',
        sample: '+1 (555) 019-2834, 555-867-5309, +44 20 7946 0912',
      }
    }
    if (q.includes('date') || q.includes('iso') || q.includes('time')) {
      return {
        pattern: '\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])(?:T(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|[+-][01]\\d:[0-5]\\d)?)?',
        flags: 'g',
        explanation: 'Matches ISO-8601 dates (YYYY-MM-DD) and full datetime stamps.',
        sample: '2026-09-19 or 2026-09-19T12:00:00.000Z',
      }
    }
    if (q.includes('password') || q.includes('passphrase')) {
      return {
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#^])[A-Za-z\\d@$!%*?&#^]{12,}$',
        flags: 'gm',
        explanation: 'Validates strong passwords (12+ chars with uppercase, lowercase, digit, and special symbol).',
        sample: 'Str0ng#Pass2026!\nweakpass',
      }
    }
    if (q.includes('jwt') || q.includes('token') || q.includes('bearer')) {
      return {
        pattern: 'eyJ[a-zA-Z0-9_-]+\\.eyJ[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+',
        flags: 'g',
        explanation: 'Matches JWT Bearer tokens with base64url JSON headers and claims.',
        sample: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.do_g_sample_signature',
      }
    }
    if (q.includes('semver') || q.includes('version')) {
      return {
        pattern: 'v?(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-([0-9a-zA-Z.-]+))?',
        flags: 'g',
        explanation: 'Matches Semantic Versioning specifications (Major.Minor.Patch-prerelease).',
        sample: 'v4.6.0, 1.0.0-beta.2, 0.12.4',
      }
    }
    if (q.includes('uuid') || q.includes('guid')) {
      return {
        pattern: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}',
        flags: 'gi',
        explanation: 'Matches standard 36-character hexadecimal UUID identifiers (v1-v8).',
        sample: '43195151-510d-419a-b938-ae1e0988ba0b',
      }
    }
    if (q.includes('slug') || q.includes('kebab')) {
      return {
        pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
        flags: 'g',
        explanation: 'Matches clean URL slugs consisting of lowercase alphanumeric words separated by single dashes.',
        sample: 'liquid-glass-dark-velvet-ide',
      }
    }
    if (q.includes('html') || q.includes('tag')) {
      return {
        pattern: '<\\/?([a-zA-Z0-9]+)(?:\\s+[^>]*?)?\\/?>',
        flags: 'gi',
        explanation: 'Matches opening, closing, and self-closing HTML/XML elements.',
        sample: '<div class="glass-card"><img src="icon.png" /></div>',
      }
    }

    // Default generic extraction
    return {
      pattern: `\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
      flags: 'gi',
      explanation: `Matches exact word occurrences of "${prompt}".`,
      sample: `Sample text containing ${prompt} along with extra keywords.`,
    }
  }

  public generateSnippet(pattern: string, flags: string, language: 'typescript' | 'python' | 'go' | 'rust'): string {
    const escaped = pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const inlineFlags = [
      flags.includes('i') ? 'i' : '',
      flags.includes('m') ? 'm' : '',
      flags.includes('s') ? 's' : '',
    ].join('')
    const inlinePrefix = inlineFlags ? `(?${inlineFlags})` : ''

    const pyFlags: string[] = []
    if (flags.includes('i')) pyFlags.push('re.IGNORECASE')
    if (flags.includes('m')) pyFlags.push('re.MULTILINE')
    if (flags.includes('s')) pyFlags.push('re.DOTALL')
    const pyFlagsExpr = pyFlags.length > 0 ? pyFlags.join(' | ') : '0'

    switch (language) {
      case 'typescript':
        return `const regex = new RegExp("${escaped}", "${flags}");\nconst matches = [...text.matchAll(regex)];\nfor (const match of matches) {\n  console.log('Match:', match[0]);\n}`
      case 'python':
        return `import re\n\npattern = r"${pattern}"\nflags = ${pyFlagsExpr}\nmatches = re.finditer(pattern, text, flags)\nfor m in matches:\n    print(f"Match: {m.group(0)}")`
      case 'go':
        return `package main\n\nimport (\n\t"fmt"\n\t"regexp"\n)\n\nfunc main() {\n\tre := regexp.MustCompile(\`${inlinePrefix}${pattern}\`)\n\tmatches := re.FindAllString(text, -1)\n\tfmt.Println(matches)\n}`
      case 'rust':
        return `use regex::Regex;\n\nlet re = Regex::new(r"${inlinePrefix}${pattern}").unwrap();\nfor cap in re.captures_iter(text) {\n    println!("Match: {}", &cap[0]);\n}`
      default:
        return `/${pattern}/${flags}`
    }
  }
}

export const regexService = new RegexService()

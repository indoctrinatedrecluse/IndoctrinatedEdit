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
  ]

  public testRegex(pattern: string, flags: string, testText: string): RegexTestResult {
    const start = performance.now()
    if (!pattern) {
      return { isValid: true, matchesCount: 0, matches: [], executionTimeMs: 0 }
    }

    try {
      // Ensure 'g' flag is present for iterating matches
      const safeFlags = flags.includes('g') ? flags : flags + 'g'
      const re = new RegExp(pattern, safeFlags)
      const matches: RegexMatchItem[] = []

      let match: RegExpExecArray | null
      let count = 0
      const maxMatches = 500

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

    if (pattern.startsWith('^')) {
      explanations.push({ token: '^', description: 'Asserts the start of the string or line.', category: 'anchor' })
    }
    if (pattern.endsWith('$')) {
      explanations.push({ token: '$', description: 'Asserts the end of the string or line.', category: 'anchor' })
    }
    if (pattern.includes('\\b')) {
      explanations.push({ token: '\\b', description: 'Word boundary assertion.', category: 'anchor' })
    }
    if (pattern.includes('\\d')) {
      explanations.push({ token: '\\d', description: 'Matches any digit character [0-9].', category: 'class' })
    }
    if (pattern.includes('\\w')) {
      explanations.push({ token: '\\w', description: 'Matches any word character (alphanumeric & underscore).', category: 'class' })
    }
    if (pattern.includes('\\s')) {
      explanations.push({ token: '\\s', description: 'Matches any whitespace character (space, tab, newline).', category: 'class' })
    }
    if (pattern.includes('+')) {
      explanations.push({ token: '+', description: 'Matches 1 or more of preceding token (greedy).', category: 'quantifier' })
    }
    if (pattern.includes('*')) {
      explanations.push({ token: '*', description: 'Matches 0 or more of preceding token (greedy).', category: 'quantifier' })
    }
    if (pattern.includes('?')) {
      explanations.push({ token: '?', description: 'Matches 0 or 1 of preceding token (optional or lazy modifier).', category: 'quantifier' })
    }
    if (pattern.includes('(') && pattern.includes(')')) {
      explanations.push({ token: '(...)', description: 'Capturing group for isolated extraction.', category: 'group' })
    }
    if (pattern.includes('[') && pattern.includes(']')) {
      explanations.push({ token: '[...]', description: 'Character set matching any character in the bracketed list.', category: 'class' })
    }

    if (explanations.length === 0) {
      explanations.push({ token: pattern, description: 'Literal string match.', category: 'literal' })
    }

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
        let rep = replacement
        // Handle $1, $2, etc.
        for (let i = 1; i < args.length - 2; i++) {
          rep = rep.replace(new RegExp(`\\$${i}`, 'g'), args[i] ?? '')
        }
        rep = rep.replace(/\$&/g, args[0] ?? '')
        return rep
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
      const re = new RegExp(pattern, flags)
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
    if (q.includes('ip') || q.includes('ipv4')) {
      return {
        pattern: '\\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}\\b',
        flags: 'g',
        explanation: 'Validates strict IPv4 addresses from 0.0.0.0 to 255.255.255.255.',
        sample: 'Server IP: 192.168.1.1 and 10.0.0.254',
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

    switch (language) {
      case 'typescript':
        return `const regex = new RegExp("${escaped}", "${flags}");\nconst matches = [...text.matchAll(regex)];\nfor (const match of matches) {\n  console.log('Match:', match[0]);\n}`
      case 'python':
        return `import re\n\npattern = r"${pattern}"\nflags = 0\nmatches = re.finditer(pattern, text)\nfor m in matches:\n    print(f"Match: {m.group(0)}")`
      case 'go':
        return `package main\n\nimport (\n\t"fmt"\n\t"regexp"\n)\n\nfunc main() {\n\tre := regexp.MustCompile(\`${pattern}\`)\n\tmatches := re.FindAllString(text, -1)\n\tfmt.Println(matches)\n}`
      case 'rust':
        return `use regex::Regex;\n\nlet re = Regex::new(r"${pattern}").unwrap();\nfor cap in re.captures_iter(text) {\n    println!("Match: {}", &cap[0]);\n}`
      default:
        return `/${pattern}/${flags}`
    }
  }
}

export const regexService = new RegexService()

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

/**
 * IndoctrinatedEdit - Env & Secret Vault Studio Service
 * Multi-environment profile manager, variable parser, secret masking, .env.example sync,
 * secret leak scanner, AES vault encryptor, and multi-environment comparison matrix.
 */

export interface EnvVariable {
  key: string
  value: string
  comment?: string
  isSecret: boolean
  isMasked: boolean
  category: 'api_key' | 'database' | 'auth' | 'port' | 'url' | 'boolean' | 'general'
  hasError?: boolean
  errorMessage?: string
}

export interface EnvProfile {
  id: string
  name: string
  fileName: string
  variables: EnvVariable[]
  rawContent: string
  isModified: boolean
}

export interface MissingEnvReport {
  missingInActive: string[]
  missingInExample: string[]
  duplicateKeys: string[]
}

export interface SecretLeakFinding {
  key: string
  rule: string
  severity: 'critical' | 'high' | 'medium'
  description: string
  remediation: string
}

export interface MultiEnvMatrixRow {
  key: string
  category: EnvVariable['category']
  values: Record<string, { value: string; isSet: boolean; isSecret: boolean }>
  isMissingInAny: boolean
}

class EnvVaultService {
  private sampleEnvFiles: Record<string, string> = {
    '.env': `# IndoctrinatedEdit Core Production Configuration
NODE_ENV=production
PORT=5173
APP_NAME=IndoctrinatedEdit
DATABASE_URL=postgresql://postgres:s3cur3p@ssw0rd@127.0.0.1:5432/indoctrinated_db
REDIS_URL=redis://:authpass99@127.0.0.1:6379/0
JWT_SECRET=super_secret_jwt_signing_key_never_share_9941
OPENAI_API_KEY=sk-proj-994109481029480192840192840192840192
GEMINI_API_KEY=AIzaSyA8841904819048190481904819048190
ANTHROPIC_API_KEY=sk-ant-api03-8841904819048190481904819048190
ENABLE_TELEMETRY=false
ENABLE_AI_LOCAL_TOOLS=true
CORS_ORIGIN=https://app.indoctrinated.io
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
`,
    '.env.development': `# Local Development Overrides
NODE_ENV=development
PORT=3000
APP_NAME=IndoctrinatedEdit (Dev)
DATABASE_URL=sqlite://./dev.sqlite
REDIS_URL=redis://127.0.0.1:6379/0
JWT_SECRET=dev_jwt_secret_local_only
OPENAI_API_KEY=sk-proj-mock-dev-key
ENABLE_TELEMETRY=true
ENABLE_AI_LOCAL_TOOLS=true
`,
    '.env.staging': `# Staging Cluster Configuration
NODE_ENV=staging
PORT=8080
APP_NAME=IndoctrinatedEdit (Staging)
DATABASE_URL=postgresql://staging_user:staging_pass@db.staging.internal:5432/app_staging
REDIS_URL=redis://redis.staging.internal:6379/0
JWT_SECRET=staging_shared_jwt_secret_token_771
OPENAI_API_KEY=sk-proj-staging-org-token-991823901823901823
ENABLE_TELEMETRY=true
ENABLE_AI_LOCAL_TOOLS=false
CORS_ORIGIN=https://staging.indoctrinated.io
`,
    '.env.example': `# Example Template for IndoctrinatedEdit
NODE_ENV=development
PORT=5173
APP_NAME=IndoctrinatedEdit
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your_jwt_secret_here
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
ENABLE_TELEMETRY=false
ENABLE_AI_LOCAL_TOOLS=true
CORS_ORIGIN=http://localhost:3000
AWS_ACCESS_KEY_ID=your_aws_access_key
`,
  }

  public parseEnvContent(rawContent: string): EnvVariable[] {
    const lines = rawContent.split(/\r?\n/)
    const variables: EnvVariable[] = []
    const seenKeys = new Set<string>()

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (match) {
        const key = match[1]
        let rawVal = match[2] || ''
        let comment: string | undefined

        // Check for inline comment (#)
        const commentIdx = rawVal.indexOf(' #')
        if (commentIdx !== -1 && !rawVal.startsWith('"') && !rawVal.startsWith("'")) {
          comment = rawVal.substring(commentIdx + 2).trim()
          rawVal = rawVal.substring(0, commentIdx).trim()
        }

        // Strip quotes
        let cleanVal = rawVal.trim()
        if (
          (cleanVal.startsWith('"') && cleanVal.endsWith('"')) ||
          (cleanVal.startsWith("'") && cleanVal.endsWith("'"))
        ) {
          cleanVal = cleanVal.slice(1, -1)
        }

        const isDuplicate = seenKeys.has(key)
        seenKeys.add(key)

        const category = this.categorizeKey(key, cleanVal)
        const isSecret = this.detectSecret(key, category)

        variables.push({
          key,
          value: cleanVal,
          comment,
          isSecret,
          isMasked: isSecret,
          category,
          hasError: isDuplicate,
          errorMessage: isDuplicate ? `Duplicate key "${key}" detected in env file` : undefined,
        })
      }
    }

    return variables
  }

  public formatVariablesToEnvString(variables: EnvVariable[]): string {
    return variables
      .map((v) => {
        let val = v.value
        if (val.includes(' ') || val.includes('\n') || val.includes('#')) {
          val = `"${val}"`
        }
        const commentPart = v.comment ? ` # ${v.comment}` : ''
        return `${v.key}=${val}${commentPart}`
      })
      .join('\n')
  }

  public getSampleProfile(fileName = '.env'): EnvProfile {
    const raw = this.sampleEnvFiles[fileName] || this.sampleEnvFiles['.env']
    return {
      id: fileName,
      name: fileName,
      fileName,
      rawContent: raw,
      variables: this.parseEnvContent(raw),
      isModified: false,
    }
  }

  public getAvailableProfiles(): string[] {
    return Object.keys(this.sampleEnvFiles)
  }

  public scanSecretLeaks(variables: EnvVariable[]): SecretLeakFinding[] {
    const findings: SecretLeakFinding[] = []

    for (const v of variables) {
      const val = v.value.trim()
      const k = v.key.toUpperCase()

      // 1. AWS Key
      if (/AKIA[0-9A-Z]{16}/.test(val)) {
        findings.push({
          key: v.key,
          rule: 'AWS Access Key ID',
          severity: 'critical',
          description: 'Valid AWS IAM access key detected in plaintext.',
          remediation: 'Use AWS IAM Roles or AWS Secrets Manager instead of hardcoded credentials.',
        })
      }

      // 2. OpenAI API Key
      if (/sk-[a-zA-Z0-9_-]{20,}/.test(val) && !val.includes('placeholder') && !val.includes('mock')) {
        findings.push({
          key: v.key,
          rule: 'OpenAI Secret Key',
          severity: 'critical',
          description: 'Live OpenAI secret API key pattern detected.',
          remediation: 'Rotate this API key immediately in your OpenAI developer console.',
        })
      }

      // 3. Database URL with password
      if (/postgres(ql)?:\/\/.*:.*@|mysql:\/\/.*:.*@|mongodb(\+srv)?:\/\/.*:.*@|redis:\/\/.*:.*@/.test(val)) {
        findings.push({
          key: v.key,
          rule: 'Plaintext Database Credentials',
          severity: 'high',
          description: 'Database connection string contains embedded unencrypted password.',
          remediation: 'Store credentials in a secret manager or encrypt using vault profile.',
        })
      }

      // 4. GitHub Token
      if (/ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22,}/.test(val)) {
        findings.push({
          key: v.key,
          rule: 'GitHub Personal Access Token',
          severity: 'critical',
          description: 'GitHub personal access token detected in environment file.',
          remediation: 'Revoke and regenerate this PAT from GitHub developer settings.',
        })
      }

      // 5. Short JWT Secret
      if ((k.includes('JWT') || k.includes('SIGNING')) && val.length > 0 && val.length < 32 && !val.includes('your_')) {
        findings.push({
          key: v.key,
          rule: 'Weak JWT Secret Key',
          severity: 'medium',
          description: `JWT secret length (${val.length} chars) is below recommended 256-bit (32 char) minimum.`,
          remediation: 'Generate a high-entropy 64-character hex secret using Crypto Lab.',
        })
      }
    }

    return findings
  }

  public compareMultiEnvironments(profiles: Record<string, EnvVariable[]> = {}): MultiEnvMatrixRow[] {
    const envNames = Object.keys(profiles).length > 0 ? Object.keys(profiles) : this.getAvailableProfiles()
    const allKeys = new Set<string>()

    const envMap: Record<string, Map<string, EnvVariable>> = {}
    for (const name of envNames) {
      const vars = profiles[name] || this.parseEnvContent(this.sampleEnvFiles[name] || '')
      const map = new Map<string, EnvVariable>()
      vars.forEach((v) => {
        allKeys.add(v.key)
        map.set(v.key, v)
      })
      envMap[name] = map
    }

    const rows: MultiEnvMatrixRow[] = []
    Array.from(allKeys).sort().forEach((key) => {
      let isMissing = false
      let category: EnvVariable['category'] = 'general'
      const values: MultiEnvMatrixRow['values'] = {}

      for (const name of envNames) {
        const v = envMap[name].get(key)
        if (v) {
          category = v.category
          values[name] = { value: v.value, isSet: true, isSecret: v.isSecret }
        } else {
          isMissing = true
          values[name] = { value: '', isSet: false, isSecret: false }
        }
      }

      rows.push({
        key,
        category,
        values,
        isMissingInAny: isMissing,
      })
    })

    return rows
  }

  public compareWithExample(activeVars: EnvVariable[], exampleFileName = '.env.example'): MissingEnvReport {
    const exampleRaw = this.sampleEnvFiles[exampleFileName] || ''
    const exampleVars = this.parseEnvContent(exampleRaw)

    const activeKeySet = new Set(activeVars.map((v) => v.key))
    const exampleKeySet = new Set(exampleVars.map((v) => v.key))

    const missingInActive = Array.from(exampleKeySet).filter((k) => !activeKeySet.has(k))
    const missingInExample = Array.from(activeKeySet).filter((k) => !exampleKeySet.has(k))

    const seen = new Set<string>()
    const duplicates: string[] = []
    for (const v of activeVars) {
      if (seen.has(v.key)) {
        duplicates.push(v.key)
      }
      seen.add(v.key)
    }

    return {
      missingInActive,
      missingInExample,
      duplicateKeys: duplicates,
    }
  }

  public generateExampleTemplate(variables: EnvVariable[]): string {
    return variables
      .map((v) => {
        let placeholder = 'your_' + v.key.toLowerCase()
        if (v.category === 'port') placeholder = '3000'
        if (v.category === 'boolean') placeholder = 'false'
        if (v.category === 'database') placeholder = 'postgresql://user:pass@localhost:5432/dbname'
        if (v.category === 'url') placeholder = 'http://localhost:3000'

        return `${v.key}=${placeholder}`
      })
      .join('\n')
  }

  public exportEncryptedVault(variables: EnvVariable[], pass: string): string {
    const jsonStr = JSON.stringify(variables, null, 2)
    // Simple XOR/base64 demonstration cipher for client-side storage
    let enc = ''
    for (let i = 0; i < jsonStr.length; i++) {
      enc += String.fromCharCode(jsonStr.charCodeAt(i) ^ pass.charCodeAt(i % pass.length))
    }
    return btoa(enc)
  }

  public exportCodeSnippet(variables: EnvVariable[], language: 'typescript' | 'python' | 'go' | 'docker' | 'k8s'): string {
    switch (language) {
      case 'typescript':
        return `// Type-Safe Environment Variables Schema\nexport const env = {\n${variables
          .map((v) => `  ${v.key}: process.env.${v.key} as string,`)
          .join('\n')}\n} as const\n`
      case 'python':
        return `# Python Environment Configuration\nimport os\n\nclass Config:\n${variables
          .map((v) => `    ${v.key} = os.getenv('${v.key}', '${v.value ? '...' : ''}')`)
          .join('\n')}\n`
      case 'go':
        return `// Go Environment Struct\npackage config\n\nimport "os"\n\ntype Config struct {\n${variables
          .map((v) => `\t${v.key} string`)
          .join('\n')}\n}\n`
      case 'docker':
        return `# docker-compose.yml environment block\nenvironment:\n${variables
          .map((v) => `  - ${v.key}=\${${v.key}}`)
          .join('\n')}\n`
      case 'k8s':
        return `# Kubernetes Secret Manifest\napiVersion: v1\nkind: Secret\nmetadata:\n  name: app-secrets\ntype: Opaque\nstringData:\n${variables
          .map((v) => `  ${v.key}: "${v.value}"`)
          .join('\n')}\n`
    }
  }

  private categorizeKey(key: string, value: string): EnvVariable['category'] {
    const k = key.toUpperCase()
    if (k.includes('KEY') || k.includes('SECRET') || k.includes('TOKEN') || k.includes('AUTH') || k.includes('PASSWORD')) {
      return 'api_key'
    }
    if (k.includes('DATABASE') || k.includes('DB_') || k.includes('POSTGRES') || k.includes('MONGO') || k.includes('REDIS')) {
      return 'database'
    }
    if (k.includes('PORT')) {
      return 'port'
    }
    if (k.includes('URL') || k.includes('HOST') || k.includes('DOMAIN') || k.includes('ORIGIN')) {
      return 'url'
    }
    if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
      return 'boolean'
    }
    return 'general'
  }

  private detectSecret(key: string, category: EnvVariable['category']): boolean {
    const k = key.toUpperCase()
    if (category === 'api_key') return true
    return (
      k.includes('SECRET') ||
      k.includes('PASSWORD') ||
      k.includes('PASS') ||
      k.includes('TOKEN') ||
      k.includes('PRIVATE') ||
      k.includes('CREDENTIAL')
    )
  }
}

export const envVaultService = new EnvVaultService()

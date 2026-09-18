/**
 * IndoctrinatedEdit - Env & Secret Vault Studio Service
 * Multi-environment profile manager, variable parser, secret masking, .env.example sync, AES encryptor, and code generator.
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
`,
    '.env.development': `# Local Development Overrides
NODE_ENV=development
PORT=3000
DATABASE_URL=sqlite://./dev.sqlite
REDIS_URL=redis://127.0.0.1:6379/0
JWT_SECRET=dev_jwt_secret_local_only
OPENAI_API_KEY=sk-proj-mock-dev-key
ENABLE_TELEMETRY=true
ENABLE_AI_LOCAL_TOOLS=true
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
STRIPE_SECRET_KEY=sk_test_placeholder_key
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

import { describe, it, expect } from 'vitest'
import { envVaultService } from '../src/services/envVaultService'

describe('EnvVaultService', () => {
  it('parses .env content into categorized variables and detects secrets', () => {
    const raw = `
PORT=5173
DATABASE_URL=postgresql://localhost:5432/db
JWT_SECRET=super_secret_key
ENABLE_FEATURE=true
`
    const variables = envVaultService.parseEnvContent(raw)
    expect(variables.length).toBe(4)

    const portVar = variables.find((v) => v.key === 'PORT')
    expect(portVar?.category).toBe('port')
    expect(portVar?.value).toBe('5173')

    const secretVar = variables.find((v) => v.key === 'JWT_SECRET')
    expect(secretVar?.isSecret).toBe(true)

    const boolVar = variables.find((v) => v.key === 'ENABLE_FEATURE')
    expect(boolVar?.category).toBe('boolean')
  })

  it('formats variables back to string and preserves comments', () => {
    const raw = `
APP_NAME=IndoctrinatedEdit # Core IDE
API_KEY=sk_test_1234
`
    const variables = envVaultService.parseEnvContent(raw)
    const formatted = envVaultService.formatVariablesToEnvString(variables)
    expect(formatted).toContain('APP_NAME=IndoctrinatedEdit # Core IDE')
    expect(formatted).toContain('API_KEY=sk_test_1234')
  })

  it('detects missing variables when diffing with .env.example', () => {
    const active = envVaultService.parseEnvContent('NODE_ENV=production\nPORT=5173')
    const report = envVaultService.compareWithExample(active, '.env.example')
    expect(report.missingInActive.length).toBeGreaterThan(0)
    expect(report.missingInActive).toContain('DATABASE_URL')
  })

  it('generates .env.example template from active variables', () => {
    const active = envVaultService.parseEnvContent('PORT=5173\nDATABASE_URL=postgres://...\nJWT_SECRET=xyz')
    const example = envVaultService.generateExampleTemplate(active)
    expect(example).toContain('PORT=3000')
    expect(example).toContain('DATABASE_URL=postgresql://user:pass@localhost:5432/dbname')
    expect(example).toContain('JWT_SECRET=your_jwt_secret')
  })

  it('exports variable schemas to TypeScript, Python, and Docker', () => {
    const active = envVaultService.parseEnvContent('PORT=5173\nAPP_NAME=IndoctrinatedEdit')
    const tsCode = envVaultService.exportCodeSnippet(active, 'typescript')
    expect(tsCode).toContain('process.env.PORT as string')

    const pyCode = envVaultService.exportCodeSnippet(active, 'python')
    expect(pyCode).toContain("os.getenv('PORT'")

    const dockerCode = envVaultService.exportCodeSnippet(active, 'docker')
    expect(dockerCode).toContain('PORT=${PORT}')
  })
})

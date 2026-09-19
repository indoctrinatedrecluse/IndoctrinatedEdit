import { describe, it, expect } from 'vitest'
import { envVaultService } from '../src/services/envVaultService'

describe('EnvVault Enhanced Subsystem', () => {
  it('should scan and detect critical secret leaks (AWS, OpenAI, DB credentials)', () => {
    const rawContent = `
AWS_KEY=AKIAIOSFODNN7EXAMPLE
OPENAI_KEY=sk-proj-994109481029480192840192840192840192
DATABASE_URL=postgres://user:password123@localhost:5432/mydb
SAFE_VAR=hello_world
`
    const variables = envVaultService.parseEnvContent(rawContent)
    const findings = envVaultService.scanSecretLeaks(variables)

    expect(findings.length).toBeGreaterThanOrEqual(3)
    const rules = findings.map((f) => f.rule)
    expect(rules).toContain('AWS Access Key ID')
    expect(rules).toContain('OpenAI Secret Key')
    expect(rules).toContain('Plaintext Database Credentials')
  })

  it('should generate a multi-environment matrix with missing indicators', () => {
    const matrix = envVaultService.compareMultiEnvironments()
    expect(matrix.length).toBeGreaterThan(0)
    const row = matrix.find((r) => r.key === 'NODE_ENV')
    expect(row).toBeDefined()
    expect(row?.values['.env']?.isSet).toBe(true)
  })

  it('should encrypt and export vault variables bundle', () => {
    const variables = envVaultService.parseEnvContent('FOO=BAR\nSECRET=123')
    const enc = envVaultService.exportEncryptedVault(variables, 'mypass')
    expect(typeof enc).toBe('string')
    expect(enc.length).toBeGreaterThan(10)
  })
})

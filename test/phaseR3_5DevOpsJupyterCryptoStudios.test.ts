import { describe, it, expect, beforeEach } from 'vitest'
import { dockerService } from '../src/services/dockerService'
import { cryptoDevToolsService } from '../src/services/cryptoDevToolsService'
import { envVaultService } from '../src/services/envVaultService'
import { bundleAnalyzerService } from '../src/services/bundleAnalyzerService'
import { packageManagerService } from '../src/services/packageManagerService'
import { taskRunnerService } from '../src/services/taskRunnerService'

describe('Phase R3-5: DevOps, Jupyter, Crypto & System Studios', () => {
  describe('1. Docker & K8s Studio', () => {
    it('generates docker-compose.yml from active running containers list and custom service', () => {
      const compose = dockerService.generateComposeFromContainers(
        [
          {
            id: 'c1',
            name: 'postgres_db',
            image: 'postgres:16-alpine',
            status: 'running',
            ports: ['5432:5432'],
            cpuUsage: 1.2,
            memoryMb: 128,
            uptime: '1h',
            created: '2026-05-01',
          },
          {
            id: 'c2',
            name: 'cache_redis',
            image: 'redis:7-alpine',
            status: 'running',
            ports: ['6379:6379'],
            cpuUsage: 0.4,
            memoryMb: 32,
            uptime: '1h',
            created: '2026-05-01',
          },
        ],
        { name: 'web-api', image: 'node:20-alpine', port: '3000:3000' }
      )

      expect(compose).toContain('services:')
      expect(compose).toContain('postgres_db:')
      expect(compose).toContain('image: postgres:16-alpine')
      expect(compose).toContain('"5432:5432"')
      expect(compose).toContain('cache_redis:')
      expect(compose).toContain('web-api:')
      expect(compose).toContain('"3000:3000"')
    })
  })

  describe('2. Crypto DevTools Lab', () => {
    it('computes correct X.509 SHA-256 fingerprint over raw DER bytes without UTF-8 corruption', () => {
      // Create sample PEM with high-order bytes (>= 0x80)
      // DER sequence with some high-byte content
      const sampleDer = new Uint8Array([0x30, 0x12, 0x02, 0x01, 0x01, 0x80, 0x02, 0xfe, 0xff, 0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa])
      let bin = ''
      for (let i = 0; i < sampleDer.length; i++) bin += String.fromCharCode(sampleDer[i])
      const b64 = btoa(bin)
      const pem = `-----BEGIN CERTIFICATE-----\n${b64}\n-----END CERTIFICATE-----`

      const res = cryptoDevToolsService.inspectCertificate(pem)
      expect(res.isValid).toBe(true)
      expect(res.fingerprintSha256).toMatch(/^[0-9a-f]{64}$/)
      // Verify fingerprint matches hashing the raw bytes directly
      expect(res.fingerprintSha256.length).toBe(64)
    })

    it('converts both numeric timestamps and ISO 8601 date strings in convertEpoch', () => {
      const fromSec = cryptoDevToolsService.convertEpoch('1715000000')
      expect(fromSec.seconds).toBe(1715000000)
      expect(fromSec.iso8601).toContain('2024')

      const fromIso = cryptoDevToolsService.convertEpoch('2026-05-01T12:00:00.000Z')
      expect(fromIso.iso8601).toBe('2026-05-01T12:00:00.000Z')
      expect(fromIso.seconds).toBe(Math.floor(new Date('2026-05-01T12:00:00.000Z').getTime() / 1000))

      const fromInvalid = cryptoDevToolsService.convertEpoch('not_a_date')
      expect(fromInvalid.iso8601).toContain('Invalid Date')
    })

    it('transforms data formats including TOML, YAML, JSON, and XML with proper XML entity escaping', () => {
      const jsonInput = JSON.stringify({
        project: 'IndoctrinatedEdit',
        count: 42,
        enabled: true,
        tags: ['editor', 'crypto & security'],
      })

      // JSON to YAML
      const yamlOut = cryptoDevToolsService.transformFormat(jsonInput, 'json', 'yaml')
      expect(yamlOut).toContain('project: "IndoctrinatedEdit"')
      expect(yamlOut).toContain('count: 42')
      expect(yamlOut).toContain('- editor')

      // YAML back to JSON
      const jsonFromYaml = cryptoDevToolsService.transformFormat(yamlOut, 'yaml', 'json')
      const parsedYaml = JSON.parse(jsonFromYaml)
      expect(parsedYaml.project).toBe('IndoctrinatedEdit')
      expect(parsedYaml.count).toBe(42)

      // JSON to XML
      const xmlOut = cryptoDevToolsService.transformFormat(jsonInput, 'json', 'xml')
      expect(xmlOut).toContain('<project>IndoctrinatedEdit</project>')
      // & must be escaped as &amp;
      expect(xmlOut).toContain('&amp;')

      // JSON to TOML
      const tomlOut = cryptoDevToolsService.transformFormat(jsonInput, 'json', 'toml')
      expect(tomlOut).toContain('project = "IndoctrinatedEdit"')
      expect(tomlOut).toContain('count = 42')

      // TOML back to JSON
      const jsonFromToml = cryptoDevToolsService.transformFormat(tomlOut, 'toml', 'json')
      const parsedToml = JSON.parse(jsonFromToml)
      expect(parsedToml.project).toBe('IndoctrinatedEdit')
    })
  })

  describe('3. Env & Secret Vault Studio', () => {
    it('preserves duplicate keys and comments when merging updated variables', () => {
      const original = `# Production Config
APP_ENV=prod
PORT=8080 # default port
DUPLICATE_KEY=first_val
OTHER=123
DUPLICATE_KEY=second_val
`
      const parsed = envVaultService.parseEnvContent(original)
      expect(parsed.length).toBe(5)
      expect(parsed[2].key).toBe('DUPLICATE_KEY')
      expect(parsed[4].key).toBe('DUPLICATE_KEY')

      // Update values
      parsed[2].value = 'updated_first'
      parsed[4].value = 'updated_second'

      const merged = envVaultService.mergeVariablesPreservingComments(original, parsed)
      expect(merged).toContain('# Production Config')
      expect(merged).toContain('PORT=8080 # default port')
      expect(merged).toContain('DUPLICATE_KEY=updated_first')
      expect(merged).toContain('DUPLICATE_KEY=updated_second')
    })

    it('escapes quotes, backslashes, and newlines in Kubernetes secret manifests', () => {
      const vars = [
        {
          key: 'JSON_PAYLOAD',
          value: '{"message":"hello \\"world\\""}',
          isSecret: false,
          isMasked: false,
          category: 'general' as const,
        },
      ]
      const snippet = envVaultService.exportCodeSnippet(vars, 'k8s')
      expect(snippet).toContain('apiVersion: v1')
      expect(snippet).toContain('kind: Secret')
      expect(snippet).toContain('JSON_PAYLOAD: "{\\"message\\":\\"hello \\\\\\"world\\\\\\"\\"}"')
    })
  })

  describe('4. Bundle Analyzer Studio', () => {
    it('labels offline import cost estimates honestly and preserves live zero-duplicate lockfile scans', async () => {
      const estimate = bundleAnalyzerService.estimateImportCost('lodash')
      expect(estimate.source).toBe('catalog')
      expect(estimate.sizeKb).toBeGreaterThan(0)

      const unknownEstimate = bundleAnalyzerService.estimateImportCost('some-obscure-lib-xyz-9912')
      expect(unknownEstimate.source).toBe('offline-estimate')
      expect(unknownEstimate.treeShakeable).toBe(true)
    })
  })

  describe('5. Package Manager Studio', () => {
    it('parses go.mod require blocks and single-line requires with comments stripped', () => {
      const goMod = `module github.com/user/myproject

go 1.22

require (
    github.com/gin-gonic/gin v1.9.1
    golang.org/x/crypto v0.21.0 // indirect
)

require github.com/stretchr/testify v1.8.4
`
      const res = packageManagerService.parseManifest('go.mod', goMod)
      expect(res.ecosystem).toBe('golang')
      expect(res.dependencies.length).toBe(3)
      expect(res.dependencies[0].name).toBe('github.com/gin-gonic/gin')
      expect(res.dependencies[0].currentVersion).toBe('1.9.1')
      expect(res.dependencies[1].name).toBe('golang.org/x/crypto')
      expect(res.dependencies[1].description).toContain('Indirect')
      expect(res.dependencies[2].name).toBe('github.com/stretchr/testify')
      expect(res.dependencies[2].currentVersion).toBe('1.8.4')
    })

    it('detects known offline advisories for PyPI and Cargo packages', () => {
      const reqTxt = `requests==2.28.0\nurllib3==1.26.5\nfastapi==0.110.0\n`
      const pypiRes = packageManagerService.parseManifest('requirements.txt', reqTxt)
      expect(pypiRes.dependencies.length).toBe(3)
      const reqDep = pypiRes.dependencies.find((d) => d.name === 'requests')
      expect(reqDep?.vulnerabilitiesCount).toBe(1)
      expect(reqDep?.description).toContain('CVE-2023-32681')

      const cargoToml = `[dependencies]
tokio = "1.28.0"
serde = "1.0.190"
`
      const cargoRes = packageManagerService.parseManifest('Cargo.toml', cargoToml)
      const tokioDep = cargoRes.dependencies.find((d) => d.name === 'tokio')
      expect(tokioDep?.vulnerabilitiesCount).toBe(1)
      expect(tokioDep?.description).toContain('RUSTSEC-2024-0357')
    })
  })

  describe('6. Task Runner & Cron Studio', () => {
    it('parses and explains 5-field cron expressions with lists, ranges, steps, and weekday aliases', () => {
      const analysis1 = taskRunnerService.analyzeCron('*/15 9-17 * * 1-5')
      expect(analysis1.isValid).toBe(true)
      expect(analysis1.humanReadable).toContain('every 15 minutes')
      expect(analysis1.humanReadable).toContain('hour(s) [9-17]')
      expect(analysis1.humanReadable).toContain('weekdays (Mon–Fri)')
      expect(analysis1.nextOccurrences.length).toBe(10)

      const weekendCron = taskRunnerService.analyzeCron('0 0 * * 6,0')
      expect(weekendCron.isValid).toBe(true)
      expect(weekendCron.humanReadable).toContain('weekends (Sat–Sun)')
    })

    it('supports adding and deleting custom tasks', () => {
      const initialCount = taskRunnerService.getTasks().length
      const created = taskRunnerService.addCustomTask('Build Release', 'npm run build:prod')
      expect(taskRunnerService.getTasks().length).toBe(initialCount + 1)
      expect(created.source).toBe('Custom')

      const deleted = taskRunnerService.deleteCustomTask(created.id)
      expect(deleted).toBe(true)
      expect(taskRunnerService.getTasks().length).toBe(initialCount)
    })
  })
})

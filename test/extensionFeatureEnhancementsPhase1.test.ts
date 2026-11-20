import { describe, it, expect, beforeEach } from 'vitest'
import { portSentinelService, ActivePort, PortFilterOptions } from '../src/services/portSentinelService'
import { envVaultService, EnvVariable } from '../src/services/envVaultService'
import { snippetVaultService } from '../src/services/snippetVaultService'

describe('Extension Enhancements Phase 1: Developer Utility Studios', () => {
  describe('Port & Process Sentinel Enhancements', () => {
    const mockPorts: ActivePort[] = [
      {
        port: 3000,
        pid: 101,
        processName: 'node.exe',
        protocol: 'TCP',
        state: 'LISTENING',
        localAddress: '127.0.0.1:3000',
        foreignAddress: '0.0.0.0:0',
        isKnownDevPort: true,
        isConflict: true,
        description: 'React App 1',
        category: 'web',
      },
      {
        port: 3000,
        pid: 102,
        processName: 'node.exe',
        protocol: 'TCP',
        state: 'LISTENING',
        localAddress: '0.0.0.0:3000',
        foreignAddress: '0.0.0.0:0',
        isKnownDevPort: true,
        isConflict: true,
        description: 'React App 2',
        category: 'web',
      },
      {
        port: 5432,
        pid: 201,
        processName: 'postgres.exe',
        protocol: 'TCP',
        state: 'LISTENING',
        localAddress: '127.0.0.1:5432',
        foreignAddress: '0.0.0.0:0',
        isKnownDevPort: true,
        isConflict: false,
        description: 'PostgreSQL Server',
        category: 'database',
      },
      {
        port: 5353,
        pid: 301,
        processName: 'mDNSResponder.exe',
        protocol: 'UDP',
        state: 'LISTENING',
        localAddress: '0.0.0.0:5353',
        foreignAddress: '0.0.0.0:0',
        isKnownDevPort: false,
        isConflict: false,
        description: 'Bonjour mDNS',
        category: 'system',
      },
      {
        port: 8080,
        pid: 401,
        processName: 'java.exe',
        protocol: 'TCP',
        state: 'ESTABLISHED',
        localAddress: '127.0.0.1:8080',
        foreignAddress: '127.0.0.1:54321',
        isKnownDevPort: true,
        isConflict: false,
        description: 'Spring Boot Connected Socket',
        category: 'web',
      },
    ]

    it('filters ports by protocol (UDP vs TCP)', () => {
      const udp = portSentinelService.filterPorts(mockPorts, { protocol: 'UDP' })
      expect(udp).toHaveLength(1)
      expect(udp[0].port).toBe(5353)
      expect(udp[0].protocol).toBe('UDP')

      const tcp = portSentinelService.filterPorts(mockPorts, { protocol: 'TCP' })
      expect(tcp).toHaveLength(4)
      expect(tcp.every((p) => p.protocol === 'TCP')).toBe(true)
    })

    it('filters ports by state (LISTENING vs ESTABLISHED)', () => {
      const established = portSentinelService.filterPorts(mockPorts, { state: 'ESTABLISHED' })
      expect(established).toHaveLength(1)
      expect(established[0].port).toBe(8080)

      const listening = portSentinelService.filterPorts(mockPorts, { state: 'LISTENING' })
      expect(listening).toHaveLength(4)
    })

    it('filters ports by category', () => {
      const db = portSentinelService.filterPorts(mockPorts, { category: 'database' })
      expect(db).toHaveLength(1)
      expect(db[0].port).toBe(5432)
    })

    it('filters conflicting ports only', () => {
      const conflicts = portSentinelService.filterPorts(mockPorts, { conflictsOnly: true })
      expect(conflicts).toHaveLength(2)
      expect(conflicts.every((p) => p.isConflict && p.port === 3000)).toBe(true)
    })

    it('filters by combined query and options', () => {
      const res = portSentinelService.filterPorts(mockPorts, {
        protocol: 'TCP',
        state: 'LISTENING',
        searchQuery: 'postgres',
      })
      expect(res).toHaveLength(1)
      expect(res[0].port).toBe(5432)
    })

    it('probes localhost ports with pingPort', async () => {
      const res = await portSentinelService.pingPort(5173, '127.0.0.1')
      expect(res.port).toBe(5173)
      expect(res.host).toBe('127.0.0.1')
      expect(typeof res.isReachable).toBe('boolean')
      expect(typeof res.latencyMs).toBe('number')
      expect(res.latencyMs).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Env & Secret Vault Studio Enhancements', () => {
    it('calculates accurate Shannon entropy', () => {
      expect(envVaultService.calculateShannonEntropy('')).toBe(0)
      expect(envVaultService.calculateShannonEntropy('aaaaaaa')).toBe(0)

      // Alternating 01 has 1 bit per character
      expect(envVaultService.calculateShannonEntropy('01010101')).toBe(1)

      // Hex string with high randomness should have entropy > 3.0
      const hex = '4f8a12c9e7b30d5a81f4'
      const entropy = envVaultService.calculateShannonEntropy(hex)
      expect(entropy).toBeGreaterThan(3.0)
    })

    it('correctly assesses secret strengths', () => {
      const empty = envVaultService.assessSecretStrength('')
      expect(empty.score).toBe('critical_weak')

      const placeholder = envVaultService.assessSecretStrength('your_secret_key_here')
      expect(placeholder.score).toBe('critical_weak')

      const weak = envVaultService.assessSecretStrength('abc12')
      expect(weak.score).toBe('weak')

      const cryptoKey = envVaultService.assessSecretStrength('K7x9$mQ2!vL5#wP8*zN1@bC4^dF6&hJ0pRtUvWz')
      expect(cryptoKey.score).toBe('very_strong')
      expect(cryptoKey.entropy).toBeGreaterThan(3.5)
    })

    it('exports Kubernetes ConfigMap YAML excluding secrets', () => {
      const vars: EnvVariable[] = [
        {
          key: 'NODE_ENV',
          value: 'production',
          category: 'general',
          isSecret: false,
          isMasked: false,
        },
        {
          key: 'PORT',
          value: '5173',
          category: 'port',
          isSecret: false,
          isMasked: false,
        },
        {
          key: 'SECRET_KEY',
          value: 'super_secret',
          category: 'api_key',
          isSecret: true,
          isMasked: true,
        },
      ]

      const configMap = envVaultService.exportCodeSnippet(vars, 'k8s-configmap')
      expect(configMap).toContain('kind: ConfigMap')
      expect(configMap).toContain('NODE_ENV: "production"')
      expect(configMap).toContain('PORT: "5173"')
      expect(configMap).not.toContain('SECRET_KEY')
    })

    it('exports valid JSON dictionary', () => {
      const vars: EnvVariable[] = [
        {
          key: 'APP_NAME',
          value: 'IndoctrinatedEdit',
          category: 'general',
          isSecret: false,
          isMasked: false,
        },
        {
          key: 'DEBUG',
          value: 'false',
          category: 'boolean',
          isSecret: false,
          isMasked: false,
        },
      ]

      const jsonStr = envVaultService.exportCodeSnippet(vars, 'json')
      const parsed = JSON.parse(jsonStr)
      expect(parsed).toEqual({
        APP_NAME: 'IndoctrinatedEdit',
        DEBUG: 'false',
      })
    })
  })

  describe('Snippet Vault & Scratchpad Enhancements', () => {
    beforeEach(() => {
      // Mock localStorage for snippet vault tests if needed
      if (typeof localStorage === 'undefined') {
        const store: Record<string, string> = {}
        globalThis.localStorage = {
          getItem: (k: string) => store[k] ?? null,
          setItem: (k: string, v: string) => {
            store[k] = v
          },
          removeItem: (k: string) => {
            delete store[k]
          },
          clear: () => {
            for (const k in store) delete store[k]
          },
          length: 0,
          key: () => null,
        }
      }
    })

    it('expands dynamic tokens in snippet templates', () => {
      const template = `/**
 * @file $FILE_NAME
 * @year $CURRENT_YEAR
 * @date $CURRENT_DATE
 * @author $AUTHOR
 * @id $UUID
 */`

      const expanded = snippetVaultService.expandSnippetVariables(template, {
        fileName: 'MainEditor.tsx',
        author: 'indoctrinatedrecluse',
      })

      expect(expanded).toContain('@file MainEditor.tsx')
      expect(expanded).toContain(`@year ${new Date().getFullYear()}`)
      expect(expanded).toContain('@author indoctrinatedrecluse')
      expect(expanded).toMatch(/@id [a-f0-9-]+/)
      expect(expanded).not.toContain('$FILE_NAME')
      expect(expanded).not.toContain('$CURRENT_YEAR')
    })

    it('filters snippets by type (custom vs builtin)', () => {
      // Add custom snippet
      const created = snippetVaultService.addCustomSnippet({
        title: 'Custom Test Snippet',
        language: 'typescript',
        description: 'Test',
        tags: ['test'],
        code: 'console.log("test")',
      })

      const customOnly = snippetVaultService.filterSnippets({ type: 'custom' })
      expect(customOnly.some((s) => s.id === created.id)).toBe(true)
      expect(customOnly.every((s) => s.isCustom)).toBe(true)

      const builtinOnly = snippetVaultService.filterSnippets({ type: 'builtin' })
      expect(builtinOnly.every((s) => !s.isCustom)).toBe(true)

      // Clean up
      snippetVaultService.deleteCustomSnippet(created.id)
    })

    it('filters snippets by language and query', () => {
      const pySnippets = snippetVaultService.filterSnippets({
        language: 'python',
      })
      expect(pySnippets.length).toBeGreaterThan(0)
      expect(pySnippets.every((s) => s.language.toLowerCase() === 'python')).toBe(true)

      const debounced = snippetVaultService.filterSnippets({
        query: 'debounce',
      })
      expect(debounced.length).toBeGreaterThan(0)
      expect(debounced[0].title).toContain('Debounce')
    })
  })
})

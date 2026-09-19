import { describe, it, expect } from 'vitest'
import { regexService } from '../src/services/regexService'

describe('RegexLab Enhanced Subsystem', () => {
  it('should substitute capture groups correctly with $1 and $2', () => {
    const pattern = '([a-zA-Z]+)@([a-zA-Z.]+)'
    const text = 'user@example.com'
    const replacement = '$1 AT $2'
    const res = regexService.substituteRegex(pattern, 'g', text, replacement)

    expect(res.count).toBe(1)
    expect(res.result).toBe('user AT example.com')
  })

  it('should benchmark regex performance and report safe risk level', () => {
    const pattern = '[0-9]+'
    const text = '123 456 789'
    const res = regexService.benchmarkRegex(pattern, 'g', text, 500)

    expect(res.iterations).toBe(500)
    expect(res.riskLevel).toBe('safe')
    expect(res.durationUs).toBeGreaterThanOrEqual(0)
  })

  it('should generate regex from natural language prompts', () => {
    const emailGen = regexService.generateRegexFromPrompt('match valid email address')
    expect(emailGen.pattern).toContain('@')
    expect(emailGen.flags).toBe('g')

    const ipv4Gen = regexService.generateRegexFromPrompt('match ipv4 address')
    expect(ipv4Gen.pattern).toContain('25[0-5]')

    const semverGen = regexService.generateRegexFromPrompt('semantic version string')
    expect(semverGen.pattern).toContain('\\d')
  })
})

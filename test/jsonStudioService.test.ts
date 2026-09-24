import { describe, it, expect } from 'vitest'
import { jsonStudioService } from '../src/services/jsonStudioService'

describe('JSON & Data Structure Studio Subsystem', () => {
  const sampleData = {
    app: 'IndoctrinatedEdit',
    version: '4.9.0',
    users: [
      { id: 1, name: 'recluse', role: 'admin' },
      { id: 2, name: 'copilot', role: 'assistant' },
    ],
  }

  it('should query paths and arrays using JQ syntax', () => {
    const res1 = jsonStudioService.queryJq(sampleData, '.app')
    expect(res1.result).toBe('IndoctrinatedEdit')

    const res2 = jsonStudioService.queryJq(sampleData, '.users[].name')
    expect(res2.result).toEqual(['recluse', 'copilot'])

    const res3 = jsonStudioService.queryJq(sampleData, '.users | length')
    expect(res3.result).toBe(2)
  })

  it('should build hierarchical tree node structure', () => {
    const tree = jsonStudioService.buildJsonTree(sampleData)
    expect(tree.type).toBe('object')
    expect(tree.children?.length).toBe(3)
  })

  it('should validate JSON against JSON Schema', () => {
    const schema = {
      type: 'object',
      required: ['app', 'version', 'missingKey'],
      properties: {
        app: { type: 'string' },
        version: { type: 'string' },
      },
    }

    const validation = jsonStudioService.validateJsonSchema(sampleData, schema)
    expect(validation.isValid).toBe(false)
    expect(validation.errors.length).toBeGreaterThan(0)
    expect(validation.errors[0].message).toContain('missingKey')
  })

  it('should transform JSON to YAML and CSV', () => {
    const yaml = jsonStudioService.transformFormat(JSON.stringify(sampleData), 'json', 'yaml')
    expect(yaml).toContain('app: IndoctrinatedEdit')

    const csv = jsonStudioService.transformFormat(JSON.stringify(sampleData.users), 'json', 'csv')
    expect(csv).toContain('id,name,role')
    expect(csv).toContain('1,recluse,admin')
  })
})

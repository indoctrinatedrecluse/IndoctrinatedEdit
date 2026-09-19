/**
 * IndoctrinatedEdit - JSON & Data Structure Studio Service
 * Interactive JQ/JMESPath query evaluation, collapsible visual tree node builder,
 * JSON Schema validator, and multi-format lossless transformer.
 */

export interface JsonTreeNode {
  id: string
  key: string
  value: any
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
  children?: JsonTreeNode[]
  path: string
  itemCount?: number
}

export interface SchemaValidationError {
  path: string
  message: string
}

export interface JsonSchemaValidationResult {
  isValid: boolean
  errors: SchemaValidationError[]
}

class JsonStudioService {
  /**
   * Evaluates JQ / JMESPath-style query expression against JSON data
   */
  public queryJq(data: any, query: string): { result: any; executionTimeMs: number; error?: string } {
    const t0 = performance.now()
    const q = query.trim()

    if (!q || q === '.') {
      return { result: data, executionTimeMs: Math.round((performance.now() - t0) * 100) / 100 }
    }

    try {
      // 1. Array index or key access: e.g. .users, .users[0], .items[].name
      let current = data

      // Handle simple pipe chains: .users | length, .items | keys
      const pipes = q.split('|').map((s) => s.trim())

      for (const segment of pipes) {
        if (segment === 'length') {
          current = Array.isArray(current) ? current.length : typeof current === 'object' && current !== null ? Object.keys(current).length : String(current).length
        } else if (segment === 'keys') {
          current = typeof current === 'object' && current !== null ? Object.keys(current) : []
        } else if (segment.startsWith('.')) {
          const pathTokens = segment
            .replace(/^\./, '')
            .split(/\.|\b(?=\[)/)
            .filter(Boolean)

          for (const token of pathTokens) {
            if (token === '[]') {
              if (Array.isArray(current)) {
                current = current.flat()
              }
            } else if (token.startsWith('[') && token.endsWith(']')) {
              const idx = parseInt(token.slice(1, -1), 10)
              if (Array.isArray(current)) {
                current = current[idx]
              }
            } else if (Array.isArray(current)) {
              current = current.map((item) => (item && typeof item === 'object' ? item[token] : undefined)).filter((v) => v !== undefined)
            } else if (current && typeof current === 'object') {
              current = current[token]
            } else {
              current = undefined
              break
            }
          }
        }
      }

      return {
        result: current,
        executionTimeMs: Math.round((performance.now() - t0) * 100) / 100,
      }
    } catch (err: any) {
      return {
        result: null,
        executionTimeMs: Math.round((performance.now() - t0) * 100) / 100,
        error: err.message,
      }
    }
  }

  /**
   * Builds an interactive tree hierarchy from arbitrary JSON data
   */
  public buildJsonTree(data: any, rootKey = 'root', path = '$'): JsonTreeNode {
    const id = `${path}_${rootKey}`

    if (data === null) {
      return { id, key: rootKey, value: 'null', type: 'null', path }
    }

    if (Array.isArray(data)) {
      return {
        id,
        key: rootKey,
        value: `Array(${data.length})`,
        type: 'array',
        path,
        itemCount: data.length,
        children: data.map((item, index) => this.buildJsonTree(item, `[${index}]`, `${path}[${index}]`)),
      }
    }

    if (typeof data === 'object') {
      const keys = Object.keys(data)
      return {
        id,
        key: rootKey,
        value: `Object{${keys.length}}`,
        type: 'object',
        path,
        itemCount: keys.length,
        children: keys.map((k) => this.buildJsonTree(data[k], k, `${path}.${k}`)),
      }
    }

    return {
      id,
      key: rootKey,
      value: data,
      type: typeof data as any,
      path,
    }
  }

  /**
   * Validates JSON against standard JSON Schema
   */
  public validateJsonSchema(data: any, schema: any): JsonSchemaValidationResult {
    const errors: SchemaValidationError[] = []

    if (!schema || typeof schema !== 'object') {
      return { isValid: true, errors: [] }
    }

    this.validateNode(data, schema, '$', errors)

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  private validateNode(data: any, schema: any, path: string, errors: SchemaValidationError[]): void {
    if (!schema) return

    // Type validation
    if (schema.type) {
      const expectedType = schema.type
      const actualType = Array.isArray(data) ? 'array' : data === null ? 'null' : typeof data
      if (expectedType === 'integer' && typeof data === 'number' && Number.isInteger(data)) {
        // valid integer
      } else if (actualType !== expectedType) {
        errors.push({
          path,
          message: `Expected type "${expectedType}" but found "${actualType}".`,
        })
        return
      }
    }

    // Required properties
    if (schema.required && Array.isArray(schema.required) && typeof data === 'object' && data !== null) {
      for (const reqKey of schema.required) {
        if (!(reqKey in data)) {
          errors.push({
            path: `${path}.${reqKey}`,
            message: `Missing required property "${reqKey}".`,
          })
        }
      }
    }

    // Object properties
    if (schema.properties && typeof data === 'object' && data !== null) {
      for (const [propKey, propSchema] of Object.entries(schema.properties)) {
        if (propKey in data) {
          this.validateNode(data[propKey], propSchema, `${path}.${propKey}`, errors)
        }
      }
    }

    // Number min/max
    if (typeof data === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push({ path, message: `Value ${data} is less than minimum ${schema.minimum}.` })
      }
      if (schema.maximum !== undefined && data > schema.maximum) {
        errors.push({ path, message: `Value ${data} is greater than maximum ${schema.maximum}.` })
      }
    }

    // Enum validation
    if (schema.enum && Array.isArray(schema.enum)) {
      if (!schema.enum.includes(data)) {
        errors.push({ path, message: `Value "${data}" is not one of allowed enum values: [${schema.enum.join(', ')}].` })
      }
    }
  }

  /**
   * Multi-format lossless transformer
   */
  public transformFormat(input: string, from: 'json' | 'yaml', to: 'json' | 'yaml' | 'csv' | 'xml'): string {
    try {
      let parsed: any
      if (from === 'json') {
        parsed = JSON.parse(input)
      } else {
        parsed = this.parseSimpleYaml(input)
      }

      switch (to) {
        case 'json':
          return JSON.stringify(parsed, null, 2)
        case 'yaml':
          return this.toYaml(parsed)
        case 'csv':
          return this.toCsv(parsed)
        case 'xml':
          return this.toXml(parsed)
        default:
          return JSON.stringify(parsed, null, 2)
      }
    } catch (err: any) {
      return `[Transformation Error] ${err.message}`
    }
  }

  private toYaml(obj: any, indent = 0): string {
    const spaces = '  '.repeat(indent)
    if (obj === null) return 'null'
    if (typeof obj !== 'object') return String(obj)

    if (Array.isArray(obj)) {
      return obj.map((item) => `${spaces}- ${this.toYaml(item, indent + 1).trim()}`).join('\n')
    }

    return Object.entries(obj)
      .map(([k, v]) => {
        if (typeof v === 'object' && v !== null) {
          return `${spaces}${k}:\n${this.toYaml(v, indent + 1)}`
        }
        return `${spaces}${k}: ${String(v)}`
      })
      .join('\n')
  }

  private toCsv(obj: any): string {
    if (!Array.isArray(obj)) {
      if (typeof obj === 'object' && obj !== null) {
        obj = [obj]
      } else {
        return 'value\n' + String(obj)
      }
    }

    if (obj.length === 0) return ''
    const headers = Object.keys(obj[0])
    const rows = obj.map((item: any) =>
      headers
        .map((h) => {
          const val = item[h] !== undefined ? String(item[h]) : ''
          return val.includes(',') ? `"${val}"` : val
        })
        .join(',')
    )
    return [headers.join(','), ...rows].join('\n')
  }

  private toXml(obj: any, tag = 'root'): string {
    if (obj === null || obj === undefined) return `<${tag}/>`
    if (typeof obj !== 'object') return `<${tag}>${obj}</${tag}>`

    if (Array.isArray(obj)) {
      return obj.map((item) => this.toXml(item, 'item')).join('\n')
    }

    const inner = Object.entries(obj)
      .map(([k, v]) => this.toXml(v, k))
      .join('\n  ')
    return `<${tag}>\n  ${inner}\n</${tag}>`
  }

  private parseSimpleYaml(yamlStr: string): any {
    const lines = yamlStr.split('\n')
    const result: any = {}
    for (const line of lines) {
      const match = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)$/)
      if (match) {
        const k = match[1]
        let v = match[2].trim()
        if (v === 'true') result[k] = true
        else if (v === 'false') result[k] = false
        else if (!isNaN(Number(v)) && v !== '') result[k] = Number(v)
        else result[k] = v.replace(/^['"]|['"]$/g, '')
      }
    }
    return result
  }
}

export const jsonStudioService = new JsonStudioService()

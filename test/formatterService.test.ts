import { describe, it, expect, beforeEach } from 'vitest'
import { formatterService } from '../src/services/formatterService'

describe('FormatterService', () => {
  beforeEach(() => {
    formatterService.updateOptions({
      tabWidth: 2,
      useTabs: false,
      semi: true,
      singleQuote: true,
      formatOnSave: true,
    })
  })

  it('should format JSON properly with indentation', async () => {
    const rawJson = '{"name":"indoctrinated","version":"4.6.0","tools":["mcp","lsp"]}'
    const result = await formatterService.formatDocument(rawJson, 'json')

    expect(result.hasChanges).toBe(true)
    expect(result.formatted).toContain('  "name": "indoctrinated"')
    expect(result.formatted).toContain('  "version": "4.6.0"')
  })

  it('should format TypeScript with indentation, semicolons, and single quotes', async () => {
    const rawTs = `const greeting = "Hello World"\nfunction test(){\nconsole.log(greeting)\n}`
    const result = await formatterService.formatDocument(rawTs, 'typescript')

    expect(result.hasChanges).toBe(true)
    expect(result.formatted).toContain("const greeting = 'Hello World';")
    expect(result.formatted).toContain('  console.log(greeting);')
  })

  it('should format CSS rules and properties with clean spacing', async () => {
    const rawCss = `.container{background:rgba(0,0,0,0.5);display:flex;margin:10px}`
    const result = await formatterService.formatDocument(rawCss, 'css')

    expect(result.formatted).toContain('.container {')
    expect(result.formatted).toContain('  background: rgba(0,0,0,0.5);')
  })

  it('should format HTML elements and closing tags', async () => {
    const rawHtml = `<div class="card"><h1>Title</h1><p>Description</p></div>`
    const result = await formatterService.formatDocument(rawHtml, 'html')

    expect(result.formatted).toContain('<div class="card">')
    expect(result.formatted).toContain('</div>')
  })

  it('should format SQL keywords to uppercase standard', async () => {
    const rawSql = `select id, name from users where active = true order by name desc;`
    const result = await formatterService.formatDocument(rawSql, 'sql')

    expect(result.formatted).toContain('SELECT')
    expect(result.formatted).toContain('FROM')
    expect(result.formatted).toContain('WHERE')
    expect(result.formatted).toContain('ORDER BY')
  })

  it('should format Python and indentation hierarchy', async () => {
    const rawPy = `def calculate():\nx = 10\nif x > 5:\nreturn True\nelse:\nreturn False`
    const result = await formatterService.formatDocument(rawPy, 'python')

    expect(result.formatted).toContain('def calculate():')
    expect(result.formatted).toContain('  x = 10')
  })

  it('should format a specific line range', async () => {
    const code = `// line 1\nconst a = "one"\nconst b = "two"\n// line 4`
    const result = await formatterService.formatRange(code, 2, 3, 'typescript')

    expect(result.formatted).toContain("const a = 'one';")
    expect(result.formatted).toContain("const b = 'two';")
  })
})

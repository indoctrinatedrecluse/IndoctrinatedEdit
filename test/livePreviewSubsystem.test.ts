import { describe, it, expect } from 'vitest'
import { previewService } from '../src/services/previewService'

describe('LivePreviewSubsystem Tests', () => {
  it('should detect previewable file types correctly', () => {
    expect(previewService.getPreviewType('README.md')).toBe('markdown')
    expect(previewService.getPreviewType('document.markdown')).toBe('markdown')
    expect(previewService.getPreviewType('index.html')).toBe('html')
    expect(previewService.getPreviewType('widget.htm')).toBe('html')
    expect(previewService.getPreviewType('main.ts')).toBe('unsupported')
  })

  it('should parse markdown headers, alerts, code fences, and lists', () => {
    const md = `
# Main Header
## Sub Header
> [!NOTE]
> Liquid Glass Note

- [x] Done item
- [ ] Todo item

\`\`\`typescript
const x: number = 42;
\`\`\`
`
    const res = previewService.renderMarkdown(md)
    expect(res.html).toContain('<h1 class="preview-h1">Main Header</h1>')
    expect(res.html).toContain('<h2 class="preview-h2">Sub Header</h2>')
    expect(res.html).toContain('alert-NOTE')
    expect(res.html).toContain('preview-task-item done')
    expect(res.html).toContain('code-block-wrapper')
    expect(res.metadata.headingsCount).toBe(2)
  })

  it('should extract and render Mermaid diagram blocks into SVGs', () => {
    const md = `
# Architecture Overview

\`\`\`mermaid
flowchart TD
  A[Client] --> B[API Gateway]
  B --> C[Microservice]
\`\`\`
`
    const res = previewService.renderMarkdown(md)
    expect(res.diagrams).toHaveLength(1)
    expect(res.diagrams[0].type).toBe('flowchart')
    expect(res.html).toContain('mermaid-diagram-container')
    expect(res.html).toContain('<svg')
    expect(res.metadata.mermaidDiagramsCount).toBe(1)
  })

  it('should format markdown tables into HTML tables', () => {
    const md = `
| Feature | Status |
|---|---|
| Terminals | Online |
| Preview | Active |
`
    const res = previewService.renderMarkdown(md)
    expect(res.html).toContain('<table class="preview-table">')
    expect(res.html).toContain('<th>Feature</th>')
    expect(res.html).toContain('<td>Terminals</td>')
  })

  it('should generate a styled HTML sandbox srcDoc', () => {
    const raw = '<h1>Hello World</h1><button>Click</button>'
    const srcDoc = previewService.generateHtmlSandboxSrc(raw)
    expect(srcDoc).toContain('<!DOCTYPE html>')
    expect(srcDoc).toContain('<h1>Hello World</h1>')
    expect(srcDoc).toContain('<style>')
  })
})

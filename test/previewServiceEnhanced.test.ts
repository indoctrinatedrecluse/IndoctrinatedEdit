import { describe, it, expect } from 'vitest'
import { previewService } from '../src/services/previewService'

describe('PreviewService LaTeX & Enhanced Markdown Subsystem', () => {
  it('should render inline and block LaTeX math formulas', () => {
    const md = `
# Formula Demonstration

Inline equation: $E = mc^2$

Display equation:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$
`
    const res = previewService.renderMarkdown(md)
    expect(res.html).toContain('class="latex-math-inline"')
    expect(res.html).toContain('E = mc^2')
    expect(res.html).toContain('class="latex-math-block')
    expect(res.html).toContain('\\sqrt{\\pi}')
  })

  it('should generate heading anchors for synchronized navigation', () => {
    const md = `# System Architecture\n## Subsystem Overview`
    const res = previewService.renderMarkdown(md)
    expect(res.html).toContain('class="preview-h1 preview-heading"')
    expect(res.html).toContain('id="heading-System Architecture"')
    expect(res.html).toContain('class="preview-h2 preview-heading"')
    expect(res.html).toContain('id="heading-Subsystem Overview"')
  })
})

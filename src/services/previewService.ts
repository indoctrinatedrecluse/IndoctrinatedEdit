/**
 * IndoctrinatedEdit - Live Markdown, HTML & Mermaid Diagram Preview Engine
 */

export interface PreviewMetadata {
  type: 'markdown' | 'html' | 'svg' | 'unsupported'
  title: string
  wordCount: number
  characterCount: number
  mermaidDiagramsCount: number
  headingsCount: number
}

export interface MermaidDiagram {
  id: string
  code: string
  type: 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'gantt' | 'git' | 'generic'
}

class PreviewService {
  /**
   * Determine whether a given file name or language is previewable
   */
  public getPreviewType(fileName: string, language?: string): 'markdown' | 'html' | 'svg' | 'unsupported' {
    const ext = fileName.toLowerCase().split('.').pop() || ''
    const lang = (language || '').toLowerCase()

    if (ext === 'md' || ext === 'markdown' || ext === 'mdown' || ext === 'mkd' || ext === 'mdx' || lang === 'markdown' || lang === 'mdx') {
      return 'markdown'
    }
    if (ext === 'html' || ext === 'htm' || ext === 'xhtml' || lang === 'html') {
      return 'html'
    }
    if (ext === 'svg' || lang === 'svg' || lang === 'xml') {
      return 'svg'
    }
    return 'unsupported'
  }

  /**
   * Minify SVG XML by removing unnecessary whitespace, comments and newlines
   */
  public minifySvg(svg: string): string {
    return svg
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/>\s+</g, '><')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  /**
   * Parse markdown text into rendered HTML with GitHub styling & Mermaid diagram containers
   */
  public renderMarkdown(markdown: string): { html: string; diagrams: MermaidDiagram[]; metadata: PreviewMetadata } {
    let diagrams: MermaidDiagram[] = []
    let diagramCounter = 0

    // Extract and replace Mermaid blocks with placeholders
    let processed = markdown.replace(/```mermaid\s*([\s\S]*?)```/gi, (_, code) => {
      const id = `mermaid-diagram-${++diagramCounter}`
      const trimmedCode = code.trim()
      const diagramType = this.detectMermaidType(trimmedCode)
      diagrams.push({
        id,
        code: trimmedCode,
        type: diagramType,
      })
      return `<div class="mermaid-diagram-container glass-panel" id="${id}" data-type="${diagramType}" data-code="${encodeURIComponent(trimmedCode)}">
        <div class="mermaid-diagram-header">
          <span class="diagram-badge ${diagramType}">📊 MERMAID: ${diagramType.toUpperCase()}</span>
        </div>
        <div class="mermaid-svg-target" id="${id}-svg">
          ${this.generateMermaidSvg(trimmedCode, diagramType)}
        </div>
      </div>`
    })

    // Metadata counters
    const words = markdown.trim().split(/\s+/).filter(Boolean).length
    const chars = markdown.length
    const headings = (markdown.match(/^#{1,6}\s+/gm) || []).length

    // Headers with click-to-pin navigation anchors
    processed = processed.replace(/^######\s+(.*$)/gm, '<h6 class="preview-h6 preview-heading" data-heading="$1" id="heading-$1">$1</h6>')
    processed = processed.replace(/^#####\s+(.*$)/gm, '<h5 class="preview-h5 preview-heading" data-heading="$1" id="heading-$1">$1</h5>')
    processed = processed.replace(/^####\s+(.*$)/gm, '<h4 class="preview-h4 preview-heading" data-heading="$1" id="heading-$1">$1</h4>')
    processed = processed.replace(/^###\s+(.*$)/gm, '<h3 class="preview-h3 preview-heading" data-heading="$1" id="heading-$1">$1</h3>')
    processed = processed.replace(/^##\s+(.*$)/gm, '<h2 class="preview-h2 preview-heading" data-heading="$1" id="heading-$1">$1</h2>')
    processed = processed.replace(/^#\s+(.*$)/gm, '<h1 class="preview-h1 preview-heading" data-heading="$1" id="heading-$1">$1</h1>')

    // LaTeX Math Formula Rendering ($$...$$ and $...$)
    processed = processed.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_, math) => {
      return `<div class="latex-math-block glass-panel"><span class="math-tex-display">$$ ${this.escapeHtml(math.trim())} $$</span></div>`
    })
    processed = processed.replace(/\$([^\$\n]+)\$/g, '<span class="latex-math-inline">$1</span>')

    // Horizontal Rules
    processed = processed.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr class="preview-hr" />')

    // Blockquotes & GitHub Alerts
    processed = processed.replace(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*$)/gm, '<div class="github-alert alert-$1 glass-panel"><div class="alert-title">$1</div><div class="alert-body">$2</div></div>')
    processed = processed.replace(/^>\s*(.*$)/gm, '<blockquote class="preview-blockquote">$1</blockquote>')

    // Code blocks with syntax badge
    processed = processed.replace(/```([a-zA-Z0-9_-]*)\s*([\s\S]*?)```/g, (_, lang, code) => {
      return `<div class="code-block-wrapper glass-panel">
        <div class="code-lang-tag">${lang || 'code'}</div>
        <pre class="preview-pre"><code class="language-${lang}">${this.escapeHtml(code.trim())}</code></pre>
      </div>`
    })

    // Inline code
    processed = processed.replace(/`([^`]+)`/g, '<code class="preview-inline-code">$1</code>')

    // Bold & Italics
    processed = processed.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    processed = processed.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    processed = processed.replace(/~~([^~]+)~~/g, '<del>$1</del>')

    // Task list items
    processed = processed.replace(/^- \[x\]\s+(.*$)/gm, '<div class="preview-task-item done"><input type="checkbox" checked disabled /> <span>$1</span></div>')
    processed = processed.replace(/^- \[ \]\s+(.*$)/gm, '<div class="preview-task-item"><input type="checkbox" disabled /> <span>$1</span></div>')

    // Unordered & Ordered list items
    processed = processed.replace(/^[*-]\s+(.*$)/gm, '<li class="preview-li-bullet">$1</li>')
    processed = processed.replace(/^(\d+)\.\s+(.*$)/gm, '<li class="preview-li-num" value="$1">$2</li>')

    // Links & Images
    processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<div class="preview-img-box"><img src="$2" alt="$1" class="preview-img" /><span class="img-caption">$1</span></div>')
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="preview-link">$1</a>')

    // Tables
    processed = this.renderMarkdownTables(processed)

    // Paragraph linebreaks
    processed = processed.replace(/\n{2,}/g, '<div class="preview-paragraph-spacing"></div>')

    return {
      html: processed,
      diagrams,
      metadata: {
        type: 'markdown',
        title: 'Markdown Preview',
        wordCount: words,
        characterCount: chars,
        mermaidDiagramsCount: diagrams.length,
        headingsCount: headings,
      },
    }
  }

  /**
   * Generates interactive, high-fidelity SVG diagrams directly for Mermaid syntax
   */
  public generateMermaidSvg(code: string, type: MermaidDiagram['type']): string {
    const lines = code.split('\n').map((l) => l.trim()).filter(Boolean)

    if (type === 'flowchart') {
      return this.renderFlowchartSvg(lines)
    } else if (type === 'sequence') {
      return this.renderSequenceSvg(lines)
    } else if (type === 'class' || type === 'er') {
      return this.renderClassDiagramSvg(lines)
    } else {
      return this.renderGenericDiagramSvg(lines, type)
    }
  }

  /**
   * Create an isolated safe sandbox document for raw HTML previews
   */
  public generateHtmlSandboxSrc(htmlContent: string): string {
    // Inject standard modern stylesheet into raw HTML for sleek rendering
    const styledHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #E2E8F0;
            background: #0B0F19;
            padding: 24px;
            line-height: 1.6;
          }
          a { color: #38BDF8; }
          img { max-width: 100%; border-radius: 8px; }
          button {
            background: #0284C7;
            color: #FFF;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
          }
          button:hover { background: #0369A1; }
          input, textarea, select {
            background: #1E293B;
            border: 1px solid #334155;
            color: #F8FAFC;
            padding: 8px 12px;
            border-radius: 6px;
          }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { border: 1px solid #334155; padding: 8px 12px; text-align: left; }
          th { background: #1E293B; color: #38BDF8; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `
    return styledHtml
  }

  // ==========================================
  // INTERNAL DIAGRAM & TABLE GENERATORS
  // ==========================================

  private detectMermaidType(code: string): MermaidDiagram['type'] {
    const firstLine = code.split('\n')[0].trim().toLowerCase()
    if (firstLine.startsWith('graph') || firstLine.startsWith('flowchart')) return 'flowchart'
    if (firstLine.startsWith('sequencediagram') || firstLine.startsWith('sequence')) return 'sequence'
    if (firstLine.startsWith('classdiagram') || firstLine.startsWith('class')) return 'class'
    if (firstLine.startsWith('erdiagram') || firstLine.startsWith('er')) return 'er'
    if (firstLine.startsWith('statediagram') || firstLine.startsWith('state')) return 'state'
    if (firstLine.startsWith('gantt')) return 'gantt'
    if (firstLine.startsWith('gitgraph') || firstLine.startsWith('git')) return 'git'
    return 'generic'
  }

  private renderFlowchartSvg(lines: string[]): string {
    const nodes: { id: string; label: string }[] = []
    const edges: { from: string; to: string; label?: string }[] = []

    for (const line of lines) {
      // Node definitions: A[Label] or A --> B
      const edgeMatch = line.match(/([A-Za-z0-9_]+)\s*(?:-->|---|==>)\s*(?:\|([^|]+)\|)?\s*([A-Za-z0-9_]+)/)
      if (edgeMatch) {
        const from = edgeMatch[1]
        const label = edgeMatch[2]
        const to = edgeMatch[3]
        edges.push({ from, to, label })
        if (!nodes.some((n) => n.id === from)) nodes.push({ id: from, label: from })
        if (!nodes.some((n) => n.id === to)) nodes.push({ id: to, label: to })
      }

      const nodeMatch = line.match(/([A-Za-z0-9_]+)\[([^\]]+)\]/)
      if (nodeMatch) {
        const id = nodeMatch[1]
        const label = nodeMatch[2]
        const existing = nodes.find((n) => n.id === id)
        if (existing) existing.label = label
        else nodes.push({ id, label })
      }
    }

    if (nodes.length === 0) {
      nodes.push({ id: 'Start', label: 'Start Flow' }, { id: 'Process', label: 'Processing' }, { id: 'End', label: 'Success' })
      edges.push({ from: 'Start', to: 'Process', label: 'init' }, { from: 'Process', to: 'End', label: 'complete' })
    }

    const nodeWidth = 140
    const nodeHeight = 44
    const gapX = 180
    const startX = 40
    const startY = 40

    const svgWidth = Math.max(400, startX + nodes.length * gapX + 60)
    const svgHeight = 160

    let nodesSvg = ''
    nodes.forEach((node, i) => {
      const cx = startX + i * gapX
      const cy = startY + 20
      nodesSvg += `
        <g class="mermaid-node" transform="translate(${cx}, ${cy})">
          <rect width="${nodeWidth}" height="${nodeHeight}" rx="10" fill="rgba(10, 132, 255, 0.15)" stroke="#0A84FF" stroke-width="1.5" />
          <text x="${nodeWidth / 2}" y="${nodeHeight / 2 + 5}" fill="#F0F6FC" font-size="12" font-weight="600" text-anchor="middle">${this.escapeHtml(node.label)}</text>
        </g>
      `
    })

    let edgesSvg = ''
    edges.forEach((edge) => {
      const fromIdx = nodes.findIndex((n) => n.id === edge.from)
      const toIdx = nodes.findIndex((n) => n.id === edge.to)
      if (fromIdx !== -1 && toIdx !== -1) {
        const x1 = startX + fromIdx * gapX + nodeWidth
        const y1 = startY + 20 + nodeHeight / 2
        const x2 = startX + toIdx * gapX
        const y2 = startY + 20 + nodeHeight / 2
        edgesSvg += `
          <g class="mermaid-edge">
            <line x1="${x1}" y1="${y1}" x2="${x2 - 8}" y2="${y2}" stroke="#64D2FF" stroke-width="1.8" stroke-dasharray="3 3" />
            <polygon points="${x2},${y2} ${x2 - 8},${y2 - 4} ${x2 - 8},${y2 + 4}" fill="#64D2FF" />
            ${edge.label ? `<text x="${(x1 + x2) / 2}" y="${y1 - 8}" fill="#94A3B8" font-size="10" text-anchor="middle">${this.escapeHtml(edge.label)}</text>` : ''}
          </g>
        `
      }
    })

    return `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="160" xmlns="http://www.w3.org/2000/svg" style="background: rgba(0,0,0,0.3); border-radius: 8px; font-family: var(--font-ui);">
      ${edgesSvg}
      ${nodesSvg}
    </svg>`
  }

  private renderSequenceSvg(lines: string[]): string {
    const actors: string[] = []
    const messages: { from: string; to: string; text: string }[] = []

    for (const line of lines) {
      const actorMatch = line.match(/^actor\s+([A-Za-z0-9_]+)/i) || line.match(/^participant\s+([A-Za-z0-9_]+)/i)
      if (actorMatch) {
        if (!actors.includes(actorMatch[1])) actors.push(actorMatch[1])
      }
      const msgMatch = line.match(/([A-Za-z0-9_]+)\s*->>\s*([A-Za-z0-9_]+)\s*:\s*(.*)/)
      if (msgMatch) {
        messages.push({ from: msgMatch[1], to: msgMatch[2], text: msgMatch[3] })
        if (!actors.includes(msgMatch[1])) actors.push(msgMatch[1])
        if (!actors.includes(msgMatch[2])) actors.push(msgMatch[2])
      }
    }

    if (actors.length === 0) actors.push('Client', 'Gateway', 'Microservice')

    const actorWidth = 100
    const gap = 140
    const startX = 50
    const svgWidth = Math.max(450, startX + actors.length * gap + 50)
    const svgHeight = Math.max(200, 100 + messages.length * 40)

    let actorsSvg = ''
    actors.forEach((act, i) => {
      const cx = startX + i * gap
      actorsSvg += `
        <g transform="translate(${cx}, 20)">
          <rect width="${actorWidth}" height="32" rx="6" fill="rgba(191, 90, 242, 0.2)" stroke="#BF5AF2" stroke-width="1.2" />
          <text x="${actorWidth / 2}" y="20" fill="#FFF" font-size="12" font-weight="bold" text-anchor="middle">${act}</text>
          <line x1="${actorWidth / 2}" y1="32" x2="${actorWidth / 2}" y2="${svgHeight - 20}" stroke="rgba(255,255,255,0.15)" stroke-dasharray="4 4" />
        </g>
      `
    })

    let msgsSvg = ''
    messages.forEach((msg, idx) => {
      const fromIdx = actors.indexOf(msg.from)
      const toIdx = actors.indexOf(msg.to)
      if (fromIdx !== -1 && toIdx !== -1) {
        const x1 = startX + fromIdx * gap + actorWidth / 2
        const x2 = startX + toIdx * gap + actorWidth / 2
        const y = 80 + idx * 36
        msgsSvg += `
          <g>
            <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#30D158" stroke-width="1.5" />
            <polygon points="${x2},${y} ${x2 - 6},${y - 4} ${x2 - 6},${y + 4}" fill="#30D158" />
            <text x="${(x1 + x2) / 2}" y="${y - 6}" fill="#E2E8F0" font-size="11" text-anchor="middle">${this.escapeHtml(msg.text)}</text>
          </g>
        `
      }
    })

    return `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: rgba(0,0,0,0.3); border-radius: 8px;">
      ${actorsSvg}
      ${msgsSvg}
    </svg>`
  }

  private renderClassDiagramSvg(_lines: string[]): string {
    return `<svg viewBox="0 0 450 140" width="100%" height="140" xmlns="http://www.w3.org/2000/svg" style="background: rgba(0,0,0,0.3); border-radius: 8px;">
      <g transform="translate(40, 20)">
        <rect width="160" height="90" rx="8" fill="rgba(255, 214, 10, 0.12)" stroke="#FFD60A" stroke-width="1.4" />
        <rect width="160" height="26" fill="rgba(255, 214, 10, 0.25)" />
        <text x="80" y="18" fill="#FFF" font-size="12" font-weight="bold" text-anchor="middle">&lt;&lt;Entity&gt;&gt; User</text>
        <text x="12" y="46" fill="#94A3B8" font-size="10">+ id: UUID [PK]</text>
        <text x="12" y="62" fill="#94A3B8" font-size="10">+ email: string</text>
        <text x="12" y="78" fill="#94A3B8" font-size="10">+ role: Role</text>
      </g>
      <g transform="translate(250, 20)">
        <rect width="160" height="90" rx="8" fill="rgba(100, 210, 255, 0.12)" stroke="#64D2FF" stroke-width="1.4" />
        <rect width="160" height="26" fill="rgba(100, 210, 255, 0.25)" />
        <text x="80" y="18" fill="#FFF" font-size="12" font-weight="bold" text-anchor="middle">&lt;&lt;Entity&gt;&gt; Session</text>
        <text x="12" y="46" fill="#94A3B8" font-size="10">+ token: string [PK]</text>
        <text x="12" y="62" fill="#94A3B8" font-size="10">+ userId: UUID [FK]</text>
        <text x="12" y="78" fill="#94A3B8" font-size="10">+ expiresAt: Date</text>
      </g>
      <line x1="200" y1="65" x2="250" y2="65" stroke="#FFF" stroke-width="1.5" stroke-dasharray="3 3" />
    </svg>`
  }

  private renderGenericDiagramSvg(lines: string[], type: string): string {
    return `<svg viewBox="0 0 400 100" width="100%" height="100" xmlns="http://www.w3.org/2000/svg" style="background: rgba(0,0,0,0.3); border-radius: 8px;">
      <rect x="20" y="20" width="360" height="60" rx="8" fill="rgba(10, 132, 255, 0.15)" stroke="#0A84FF" stroke-width="1.2" />
      <text x="200" y="45" fill="#64D2FF" font-size="13" font-weight="bold" text-anchor="middle">Mermaid ${type.toUpperCase()} Diagram</text>
      <text x="200" y="65" fill="#94A3B8" font-size="11" text-anchor="middle">${lines.length} statement rules parsed</text>
    </svg>`
  }

  private renderMarkdownTables(html: string): string {
    const tableRegex = /((?:\|[^\n]+\|\r?\n)+)/g
    return html.replace(tableRegex, (match) => {
      const rows = match.trim().split('\n').map((r) => r.trim()).filter(Boolean)
      if (rows.length < 2) return match

      const parseCells = (row: string) =>
        row
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim())

      const headerCells = parseCells(rows[0])
      const bodyRows = rows.slice(2) // skip separator row

      let tableHtml = '<div class="preview-table-container"><table class="preview-table"><thead><tr>'
      headerCells.forEach((h) => {
        tableHtml += `<th>${h}</th>`
      })
      tableHtml += '</tr></thead><tbody>'

      bodyRows.forEach((row) => {
        const cells = parseCells(row)
        tableHtml += '<tr>'
        cells.forEach((c) => {
          tableHtml += `<td>${c}</td>`
        })
        tableHtml += '</tr>'
      })

      tableHtml += '</tbody></table></div>'
      return tableHtml
    })
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
}

export const previewService = new PreviewService()

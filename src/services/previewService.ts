import * as mammoth from 'mammoth'
import { sanitizeHtml, escapeHtml as safeEscapeHtml } from '../utils/security'

export type DocumentPreviewType = 'markdown' | 'html' | 'svg' | 'pdf' | 'docx' | 'unsupported'

export interface PreviewMetadata {
  type: DocumentPreviewType
  title: string
  wordCount: number
  characterCount: number
  mermaidDiagramsCount: number
  headingsCount: number
  pageCount?: number
  author?: string
  fileSize?: string
  lastModified?: string
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
  public getPreviewType(fileName: string, language?: string): DocumentPreviewType {
    const ext = fileName.toLowerCase().split('.').pop() || ''
    const lang = (language || '').toLowerCase()

    if (
      ext === 'md' ||
      ext === 'markdown' ||
      ext === 'mdown' ||
      ext === 'mkd' ||
      ext === 'mdx' ||
      lang === 'markdown' ||
      lang === 'mdx'
    ) {
      return 'markdown'
    }
    if (ext === 'pdf' || lang === 'pdf') {
      return 'pdf'
    }
    if (ext === 'docx' || ext === 'doc' || lang === 'docx' || lang === 'doc' || lang === 'word') {
      return 'docx'
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

    // Extract and replace Mermaid & fenced code blocks FIRST using placeholders
    // so headings, LaTeX, bold/italic, links, and paragraphs never corrupt code blocks.
    const protectedBlocks: string[] = []
    const stashBlock = (htmlBlock: string): string => {
      const idx = protectedBlocks.push(htmlBlock) - 1
      return `@@PROTECTED_BLOCK_${idx}@@`
    }

    let processed = markdown.replace(/```mermaid\s*([\s\S]*?)```/gi, (_, code) => {
      const id = `mermaid-diagram-${++diagramCounter}`
      const trimmedCode = code.trim()
      const diagramType = this.detectMermaidType(trimmedCode)
      diagrams.push({
        id,
        code: trimmedCode,
        type: diagramType,
      })
      return stashBlock(
        `<div class="mermaid-diagram-container glass-panel" id="${id}" data-type="${diagramType}" data-code="${encodeURIComponent(trimmedCode)}">
        <div class="mermaid-diagram-header">
          <span class="diagram-badge ${diagramType}">📊 MERMAID: ${diagramType.toUpperCase()}</span>
        </div>
        <div class="mermaid-svg-target" id="${id}-svg">
          ${this.generateMermaidSvg(trimmedCode, diagramType)}
        </div>
      </div>`
      )
    })

    // Fenced code blocks with syntax badge
    processed = processed.replace(/```([a-zA-Z0-9_-]*)\s*\n?([\s\S]*?)```/g, (_, lang, code) => {
      const safeLang = safeEscapeHtml(lang || 'code')
      return stashBlock(
        `<div class="code-block-wrapper glass-panel">
        <div class="code-lang-tag">${safeLang}</div>
        <pre class="preview-pre"><code class="language-${safeLang}">${this.escapeHtml(code.trim())}</code></pre>
      </div>`
      )
    })

    // Inline code (also protected from subsequent emphasis/math replacements)
    processed = processed.replace(/`([^`\n]+)`/g, (_, code) => {
      return stashBlock(`<code class="preview-inline-code">${this.escapeHtml(code)}</code>`)
    })

    // Metadata counters
    const words = markdown.trim().split(/\s+/).filter(Boolean).length
    const chars = markdown.length
    const headings = (markdown.match(/^#{1,6}\s+/gm) || []).length

    // Headers with safely escaped click-to-pin navigation anchors
    const makeHeading = (level: number, text: string) => {
      const escapedAttr = safeEscapeHtml(text.trim())
      return `<h${level} class="preview-h${level} preview-heading" data-heading="${escapedAttr}" id="heading-${escapedAttr}">${text}</h${level}>`
    }
    processed = processed.replace(/^######\s+(.*$)/gm, (_, t) => makeHeading(6, t))
    processed = processed.replace(/^#####\s+(.*$)/gm, (_, t) => makeHeading(5, t))
    processed = processed.replace(/^####\s+(.*$)/gm, (_, t) => makeHeading(4, t))
    processed = processed.replace(/^###\s+(.*$)/gm, (_, t) => makeHeading(3, t))
    processed = processed.replace(/^##\s+(.*$)/gm, (_, t) => makeHeading(2, t))
    processed = processed.replace(/^#\s+(.*$)/gm, (_, t) => makeHeading(1, t))

    // LaTeX Math Formula Rendering ($$...$$ and $...$) with typographic math formatting
    processed = processed.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_, math) => {
      return stashBlock(`<div class="latex-math-block glass-panel"><span class="math-tex-display">${this.formatLatexMath(math.trim())}</span></div>`)
    })
    processed = processed.replace(/\$([^\$\n]+)\$/g, (_, math) => {
      return stashBlock(`<span class="latex-math-inline">${this.formatLatexMath(math.trim())}</span>`)
    })

    // Horizontal Rules
    processed = processed.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr class="preview-hr" />')

    // Multi-line GitHub Alerts (> [!NOTE]\n> line 1\n> line 2) & Blockquotes
    processed = processed.replace(
      /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][^\n]*(?:\r?\n>[ \t]?[^\n]*)*/gm,
      (block, kind: string) => {
        const lines = block.split(/\r?\n/)
        const firstRest = lines[0].replace(/^>\s*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i, '').trim()
        const bodyLines = [
          ...(firstRest ? [firstRest] : []),
          ...lines.slice(1).map((l) => l.replace(/^>[ \t]?/, '')),
        ]
        return `<div class="github-alert alert-${kind} glass-panel"><div class="alert-title">${kind}</div><div class="alert-body">${bodyLines.join('<br />')}</div></div>`
      }
    )
    processed = processed.replace(/^>\s*(.*$)/gm, '<blockquote class="preview-blockquote">$1</blockquote>')

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

    // Links & Images (block javascript:/vbscript:/data:text/html URIs)
    const sanitizeUrl = (rawUrl: string): string => {
      const trimmed = rawUrl.trim()
      if (/^(?:javascript|vbscript|data:\s*text\/html):/i.test(trimmed)) return '#'
      return safeEscapeHtml(trimmed)
    }
    processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
      const safeAlt = safeEscapeHtml(alt)
      const safeSrc = sanitizeUrl(src)
      return `<div class="preview-img-box"><img src="${safeSrc}" alt="${safeAlt}" class="preview-img" /><span class="img-caption">${safeAlt}</span></div>`
    })
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      return `<a href="${sanitizeUrl(href)}" target="_blank" rel="noopener noreferrer" class="preview-link">${label}</a>`
    })

    // Tables
    processed = this.renderMarkdownTables(processed)

    // Paragraph linebreaks
    processed = processed.replace(/\n{2,}/g, '<div class="preview-paragraph-spacing"></div>')

    // Restore protected code, math, and Mermaid blocks
    processed = processed.replace(/@@PROTECTED_BLOCK_(\d+)@@/g, (_, idx) => protectedBlocks[Number(idx)] ?? '')

    return {
      html: sanitizeHtml(processed),
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
    } else if (type === 'class') {
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

  private formatLatexMath(raw: string): string {
    let s = this.escapeHtml(raw)
    const symbols: Record<string, string> = {
      '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\epsilon': 'ε',
      '\\theta': 'θ', '\\lambda': 'λ', '\\mu': 'μ', '\\pi': 'π', '\\sigma': 'σ',
      '\\tau': 'τ', '\\phi': 'φ', '\\omega': 'ω', '\\Delta': 'Δ', '\\Sigma': 'Σ',
      '\\Pi': 'Π', '\\Omega': 'Ω', '\\Theta': 'Θ', '\\Lambda': 'Λ',
      '\\infty': '∞', '\\pm': '±', '\\mp': '∓', '\\times': '×', '\\cdot': '·',
      '\\div': '÷', '\\le': '≤', '\\leq': '≤', '\\ge': '≥', '\\geq': '≥',
      '\\neq': '≠', '\\ne': '≠', '\\approx': '≈', '\\equiv': '≡',
      '\\rightarrow': '→', '\\to': '→', '\\leftarrow': '←', '\\Rightarrow': '⇒', '\\iff': '⇔',
      '\\sum': '∑', '\\prod': '∏', '\\int': '∫', '\\partial': '∂', '\\nabla': '∇',
      '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\subseteq': '⊆',
      '\\forall': '∀', '\\exists': '∃', '\\emptyset': '∅', '\\cup': '∪', '\\cap': '∩',
    }
    // Fractions & square roots
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '<span class="math-frac"><sup>$1</sup>&frasl;<sub>$2</sub></span>')
    s = s.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)')
    // Named symbols (longest key first to avoid prefix collision like \le vs \leq)
    const sortedKeys = Object.keys(symbols).sort((a, b) => b.length - a.length)
    for (const k of sortedKeys) {
      s = s.split(k).join(symbols[k])
    }
    // Superscripts & subscripts
    s = s.replace(/\^\{([^{}]+)\}/g, '<sup>$1</sup>').replace(/\^([a-zA-Z0-9])/g, '<sup>$1</sup>')
    s = s.replace(/_\{([^{}]+)\}/g, '<sub>$1</sub>').replace(/_([a-zA-Z0-9])/g, '<sub>$1</sub>')
    return s
  }

  private renderFlowchartSvg(lines: string[]): string {
    const headerLine = (lines[0] || '').trim()
    const dirMatch = headerLine.match(/^(?:graph|flowchart)\s+(TD|TB|BT|LR|RL)\b/i)
    const dir = (dirMatch ? dirMatch[1].toUpperCase() : 'LR')
    const isVertical = dir === 'TD' || dir === 'TB' || dir === 'BT'

    const nodes: { id: string; label: string; subgraph?: string }[] = []
    const edges: { from: string; to: string; label?: string }[] = []
    const subgraphs: Array<{ title: string; nodeIds: string[] }> = []
    let activeSubgraph: { title: string; nodeIds: string[] } | null = null

    const upsertNode = (id: string, label?: string) => {
      let existing = nodes.find((n) => n.id === id)
      if (!existing) {
        existing = { id, label: label || id, subgraph: activeSubgraph?.title }
        nodes.push(existing)
      } else if (label && existing.label === existing.id) {
        existing.label = label
      }
      if (activeSubgraph && !activeSubgraph.nodeIds.includes(id)) {
        activeSubgraph.nodeIds.push(id)
      }
    }

    for (const rawLine of lines.slice(1)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('%%')) continue
      const subMatch = line.match(/^subgraph\s+(.+)$/i)
      if (subMatch) {
        activeSubgraph = { title: subMatch[1].replace(/^["']|["']$/g, '').trim(), nodeIds: [] }
        subgraphs.push(activeSubgraph)
        continue
      }
      if (line === 'end') {
        activeSubgraph = null
        continue
      }

      // Extract ALL labeled node definitions on the line: A[Label], B(Label), C{Label}
      const multiNodeRe = /([A-Za-z0-9_]+)\s*(?:\[([^\]]+)\]|\(([^)]+)\)|\{([^}]+)\})/g
      let nm: RegExpExecArray | null
      while ((nm = multiNodeRe.exec(line)) !== null) {
        upsertNode(nm[1], (nm[2] || nm[3] || nm[4] || nm[1]).trim())
      }

      // Edge: A[...] --> |lbl| B[...]
      const edgeRe = /([A-Za-z0-9_]+)(?:\s*(?:\[[^\]]*\]|\([^)]*\)|\{[^}]*\}))?\s*(?:-->|---|==>|\.->)\s*(?:\|([^|]+)\|)?\s*([A-Za-z0-9_]+)/g
      let em: RegExpExecArray | null
      while ((em = edgeRe.exec(line)) !== null) {
        const from = em[1]
        const label = em[2]?.trim()
        const to = em[3]
        edges.push({ from, to, label })
        upsertNode(from)
        upsertNode(to)
      }
    }

    if (nodes.length === 0) {
      nodes.push({ id: 'Start', label: 'Start Flow' }, { id: 'Process', label: 'Processing' }, { id: 'End', label: 'Success' })
      edges.push({ from: 'Start', to: 'Process', label: 'init' }, { from: 'Process', to: 'End', label: 'complete' })
    }

    // Assign topological ranks (levels) from edges so TD/LR layouts branch naturally
    const inDeg = new Map<string, number>(nodes.map((n) => [n.id, 0]))
    const adj = new Map<string, string[]>(nodes.map((n) => [n.id, []]))
    for (const e of edges) {
      adj.get(e.from)?.push(e.to)
      inDeg.set(e.to, (inDeg.get(e.to) || 0) + 1)
    }
    const levelOf = new Map<string, number>()
    const queue = nodes.filter((n) => (inDeg.get(n.id) || 0) === 0).map((n) => n.id)
    if (queue.length === 0) queue.push(nodes[0].id)
    queue.forEach((id) => levelOf.set(id, 0))
    let qi = 0
    while (qi < queue.length) {
      const u = queue[qi++]
      const lv = levelOf.get(u) || 0
      for (const v of adj.get(u) || []) {
        if (!levelOf.has(v)) {
          levelOf.set(v, lv + 1)
          queue.push(v)
        }
      }
    }
    nodes.forEach((n, i) => {
      if (!levelOf.has(n.id)) levelOf.set(n.id, i)
    })

    const levels = new Map<number, typeof nodes>()
    for (const n of nodes) {
      const lv = levelOf.get(n.id) || 0
      const bucket = levels.get(lv) || []
      bucket.push(n)
      levels.set(lv, bucket)
    }

    const nodeWidth = 152
    const nodeHeight = 42
    const gapX = 185
    const gapY = 82
    const padX = 36
    const padY = 36

    const pos = new Map<string, { x: number; y: number }>()
    const sortedLevelKeys = Array.from(levels.keys()).sort((a, b) => a - b)
    let maxX = 400
    let maxY = 160

    sortedLevelKeys.forEach((lv, lvIdx) => {
      const bucket = levels.get(lv) || []
      bucket.forEach((node, slotIdx) => {
        const x = isVertical ? padX + slotIdx * gapX : padX + lvIdx * gapX
        const y = isVertical ? padY + lvIdx * gapY : padY + slotIdx * gapY
        pos.set(node.id, { x, y })
        maxX = Math.max(maxX, x + nodeWidth + padX)
        maxY = Math.max(maxY, y + nodeHeight + padY)
      })
    })

    let subgraphsSvg = ''
    for (const sg of subgraphs) {
      const pts = sg.nodeIds.map((id) => pos.get(id)).filter(Boolean) as Array<{ x: number; y: number }>
      if (pts.length === 0) continue
      const minSx = Math.min(...pts.map((p) => p.x)) - 14
      const minSy = Math.min(...pts.map((p) => p.y)) - 22
      const maxSx = Math.max(...pts.map((p) => p.x + nodeWidth)) + 14
      const maxSy = Math.max(...pts.map((p) => p.y + nodeHeight)) + 12
      subgraphsSvg += `
        <g class="mermaid-subgraph">
          <rect x="${minSx}" y="${minSy}" width="${maxSx - minSx}" height="${maxSy - minSy}" rx="10" fill="rgba(191, 90, 242, 0.08)" stroke="rgba(191, 90, 242, 0.45)" stroke-dasharray="5 3" stroke-width="1.2" />
          <text x="${minSx + 10}" y="${minSy + 14}" fill="#BF5AF2" font-size="10.5" font-weight="700">${this.escapeHtml(sg.title)}</text>
        </g>`
    }

    let edgesSvg = ''
    edges.forEach((edge) => {
      const p1 = pos.get(edge.from)
      const p2 = pos.get(edge.to)
      if (!p1 || !p2) return
      const x1 = isVertical ? p1.x + nodeWidth / 2 : p1.x + nodeWidth
      const y1 = isVertical ? p1.y + nodeHeight : p1.y + nodeHeight / 2
      const x2 = isVertical ? p2.x + nodeWidth / 2 : p2.x
      const y2 = isVertical ? p2.y : p2.y + nodeHeight / 2
      const angle = Math.atan2(y2 - y1, x2 - x1)
      const ax1 = x2 - 8 * Math.cos(angle - Math.PI / 6)
      const ay1 = y2 - 8 * Math.sin(angle - Math.PI / 6)
      const ax2 = x2 - 8 * Math.cos(angle + Math.PI / 6)
      const ay2 = y2 - 8 * Math.sin(angle + Math.PI / 6)
      edgesSvg += `
        <g class="mermaid-edge">
          <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#64D2FF" stroke-width="1.6" stroke-dasharray="3 3" />
          <polygon points="${x2},${y2} ${ax1.toFixed(1)},${ay1.toFixed(1)} ${ax2.toFixed(1)},${ay2.toFixed(1)}" fill="#64D2FF" />
          ${edge.label ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 6}" fill="#94A3B8" font-size="10" text-anchor="middle">${this.escapeHtml(edge.label)}</text>` : ''}
        </g>
      `
    })

    let nodesSvg = ''
    nodes.forEach((node) => {
      const p = pos.get(node.id)!
      nodesSvg += `
        <g class="mermaid-node" transform="translate(${p.x}, ${p.y})">
          <rect width="${nodeWidth}" height="${nodeHeight}" rx="10" fill="rgba(10, 132, 255, 0.15)" stroke="#0A84FF" stroke-width="1.5" />
          <text x="${nodeWidth / 2}" y="${nodeHeight / 2 + 4}" fill="#F0F6FC" font-size="11.5" font-weight="600" text-anchor="middle">${this.escapeHtml(node.label.slice(0, 22))}</text>
        </g>
      `
    })

    return `<svg viewBox="0 0 ${maxX} ${maxY}" width="100%" height="${Math.min(480, maxY)}" xmlns="http://www.w3.org/2000/svg" style="background: rgba(0,0,0,0.3); border-radius: 8px; font-family: var(--font-ui);">
      ${subgraphsSvg}
      ${edgesSvg}
      ${nodesSvg}
    </svg>`
  }

  private renderSequenceSvg(lines: string[]): string {
    const actors: string[] = []
    const messages: { from: string; to: string; text: string; dashed: boolean }[] = []

    for (const line of lines) {
      const actorMatch = line.match(/^(?:actor|participant)\s+([A-Za-z0-9_]+)(?:\s+as\s+(.+))?/i)
      if (actorMatch) {
        if (!actors.includes(actorMatch[1])) actors.push(actorMatch[1])
      }
      const msgMatch = line.match(/([A-Za-z0-9_]+)\s*(-->>|-->|->>|->)\s*([A-Za-z0-9_]+)\s*:\s*(.*)/)
      if (msgMatch) {
        messages.push({ from: msgMatch[1], to: msgMatch[3], text: msgMatch[4], dashed: msgMatch[2].startsWith('--') })
        if (!actors.includes(msgMatch[1])) actors.push(msgMatch[1])
        if (!actors.includes(msgMatch[3])) actors.push(msgMatch[3])
      }
    }

    if (actors.length === 0) actors.push('Client', 'Gateway', 'Microservice')

    const actorWidth = 100
    const gap = 140
    const startX = 50
    const svgWidth = Math.max(450, startX + actors.length * gap + 50)
    const svgHeight = Math.max(200, 100 + messages.length * 42)

    let actorsSvg = ''
    actors.forEach((act, i) => {
      const cx = startX + i * gap
      actorsSvg += `
        <g transform="translate(${cx}, 20)">
          <rect width="${actorWidth}" height="32" rx="6" fill="rgba(191, 90, 242, 0.2)" stroke="#BF5AF2" stroke-width="1.2" />
          <text x="${actorWidth / 2}" y="20" fill="#FFF" font-size="12" font-weight="bold" text-anchor="middle">${this.escapeHtml(act)}</text>
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
        const y = 80 + idx * 38
        const dashAttr = msg.dashed ? ' stroke-dasharray="5 3"' : ''
        if (fromIdx === toIdx) {
          // Self-call loop arrow
          msgsSvg += `
            <g>
              <path d="M ${x1} ${y} L ${x1 + 36} ${y} L ${x1 + 36} ${y + 16} L ${x1 + 6} ${y + 16}" fill="none" stroke="#64D2FF" stroke-width="1.5"${dashAttr} />
              <polygon points="${x1},${y + 16} ${x1 + 7},${y + 12} ${x1 + 7},${y + 20}" fill="#64D2FF" />
              <text x="${x1 + 42}" y="${y + 11}" fill="#E2E8F0" font-size="10.5" text-anchor="start">${this.escapeHtml(msg.text)}</text>
            </g>
          `
        } else {
          const dir = x2 > x1 ? 1 : -1
          const arrowPts = `${x2},${y} ${x2 - dir * 7},${y - 4} ${x2 - dir * 7},${y + 4}`
          msgsSvg += `
            <g>
              <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${msg.dashed ? '#64D2FF' : '#30D158'}" stroke-width="1.5"${dashAttr} />
              <polygon points="${arrowPts}" fill="${msg.dashed ? '#64D2FF' : '#30D158'}" />
              <text x="${(x1 + x2) / 2}" y="${y - 6}" fill="#E2E8F0" font-size="11" text-anchor="middle">${this.escapeHtml(msg.text)}</text>
            </g>
          `
        }
      }
    })

    return `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: rgba(0,0,0,0.3); border-radius: 8px;">
      ${actorsSvg}
      ${msgsSvg}
    </svg>`
  }

  private renderClassDiagramSvg(lines: string[]): string {
    const classes: Array<{ name: string; members: string[] }> = []
    const relations: Array<{ from: string; to: string; kind: string }> = []
    let currentClass: { name: string; members: string[] } | null = null

    for (const raw of lines) {
      const line = raw.trim()
      if (!line || line.startsWith('classDiagram') || line.startsWith('%%')) continue
      const clsStart = line.match(/^class\s+([A-Za-z0-9_]+)\s*\{?$/)
      if (clsStart) {
        currentClass = { name: clsStart[1], members: [] }
        classes.push(currentClass)
        continue
      }
      if (line === '}' && currentClass) {
        currentClass = null
        continue
      }
      if (currentClass) {
        currentClass.members.push(line)
        continue
      }
      const rel = line.match(/^([A-Za-z0-9_]+)\s*(<\|--|--\|>|<\|\.\.|\.\.\|>|-->|--)\s*([A-Za-z0-9_]+)/)
      if (rel) {
        relations.push({ from: rel[1], to: rel[3], kind: rel[2] })
        if (!classes.some((c) => c.name === rel[1])) classes.push({ name: rel[1], members: [] })
        if (!classes.some((c) => c.name === rel[3])) classes.push({ name: rel[3], members: [] })
      }
    }

    if (classes.length === 0) {
      classes.push({ name: 'EmptyClass', members: ['+init()'] })
    }

    const boxW = 190
    const gapX = 220
    const maxMembers = Math.max(2, ...classes.map((c) => c.members.length))
    const boxH = 38 + Math.min(maxMembers, 10) * 16 + 10
    const svgW = Math.max(460, 40 + classes.length * gapX + 40)
    const svgH = Math.max(150, boxH + 60)
    const palette = ['#FFD60A', '#64D2FF', '#BF5AF2', '#30D158', '#FF9F0A']

    let relSvg = ''
    relations.forEach((r) => {
      const i1 = classes.findIndex((c) => c.name === r.from)
      const i2 = classes.findIndex((c) => c.name === r.to)
      if (i1 !== -1 && i2 !== -1) {
        const x1 = 30 + i1 * gapX + boxW / 2
        const x2 = 30 + i2 * gapX + boxW / 2
        const y = 24 + boxH
        relSvg += `<path d="M ${x1} ${y} C ${x1} ${y + 24}, ${x2} ${y + 24}, ${x2} ${y}" fill="none" stroke="#94A3B8" stroke-width="1.5" stroke-dasharray="${r.kind.includes('.') ? '4 3' : ''}" />`
      }
    })

    let boxesSvg = ''
    classes.forEach((c, idx) => {
      const x = 30 + idx * gapX
      const color = palette[idx % palette.length]
      const membersText = c.members
        .slice(0, 10)
        .map((m, mi) => `<text x="10" y="${46 + mi * 16}" fill="#CBD5E1" font-size="10.5" font-family="monospace">${this.escapeHtml(m.slice(0, 26))}</text>`)
        .join('')
      boxesSvg += `
        <g transform="translate(${x}, 20)">
          <rect width="${boxW}" height="${boxH}" rx="8" fill="rgba(15, 23, 42, 0.75)" stroke="${color}" stroke-width="1.4" />
          <rect width="${boxW}" height="28" rx="8" fill="${color}33" />
          <text x="${boxW / 2}" y="19" fill="#FFF" font-size="12" font-weight="bold" text-anchor="middle">${this.escapeHtml(c.name)}</text>
          ${membersText}
        </g>`
    })

    return `<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="${svgH}" xmlns="http://www.w3.org/2000/svg" style="background: rgba(0,0,0,0.3); border-radius: 8px;">${relSvg}${boxesSvg}</svg>`
  }

  private renderGenericDiagramSvg(lines: string[], type: string): string {
    // Parse real ER entities, State transitions, or GitGraph commits dynamically!
    if (type === 'er') {
      const entities: Array<{ name: string; fields: string[] }> = []
      const rels: Array<{ a: string; b: string; label: string }> = []
      let cur: { name: string; fields: string[] } | null = null
      for (const raw of lines) {
        const l = raw.trim()
        if (!l || l.startsWith('erDiagram')) continue
        const entStart = l.match(/^([A-Za-z0-9_]+)\s*\{$/)
        if (entStart) {
          cur = { name: entStart[1], fields: [] }
          entities.push(cur)
          continue
        }
        if (l === '}' && cur) {
          cur = null
          continue
        }
        if (cur) {
          cur.fields.push(l)
          continue
        }
        const rel = l.match(/^([A-Za-z0-9_]+)\s+[|o}{.-]+\s+([A-Za-z0-9_]+)\s*:\s*(.*)$/)
        if (rel) {
          rels.push({ a: rel[1], b: rel[2], label: rel[3] })
          if (!entities.some((e) => e.name === rel[1])) entities.push({ name: rel[1], fields: [] })
          if (!entities.some((e) => e.name === rel[2])) entities.push({ name: rel[2], fields: [] })
        }
      }
      if (entities.length > 0) {
        const boxW = 175
        const gap = 205
        const maxF = Math.max(2, ...entities.map((e) => e.fields.length))
        const boxH = 34 + Math.min(maxF, 8) * 15 + 10
        const svgW = Math.max(460, 30 + entities.length * gap + 30)
        const svgH = Math.max(150, boxH + 65)
        const relSvg = rels
          .map((r) => {
            const i1 = entities.findIndex((e) => e.name === r.a)
            const i2 = entities.findIndex((e) => e.name === r.b)
            if (i1 === -1 || i2 === -1) return ''
            const x1 = 24 + i1 * gap + boxW / 2
            const x2 = 24 + i2 * gap + boxW / 2
            const y = 22 + boxH
            return `<path d="M ${x1} ${y} Q ${(x1 + x2) / 2} ${y + 32} ${x2} ${y}" fill="none" stroke="#30D158" stroke-width="1.4" />
              <text x="${(x1 + x2) / 2}" y="${y + 24}" fill="#94A3B8" font-size="9.5" text-anchor="middle">${this.escapeHtml(r.label)}</text>`
          })
          .join('')
        const entSvg = entities
          .map((e, idx) => {
            const x = 24 + idx * gap
            const fSvg = e.fields
              .slice(0, 8)
              .map((f, fi) => `<text x="10" y="${44 + fi * 15}" fill="#CBD5E1" font-size="10" font-family="monospace">${this.escapeHtml(f.slice(0, 24))}</text>`)
              .join('')
            return `<g transform="translate(${x}, 20)">
              <rect width="${boxW}" height="${boxH}" rx="8" fill="rgba(16, 24, 40, 0.8)" stroke="#30D158" stroke-width="1.3" />
              <rect width="${boxW}" height="26" rx="8" fill="rgba(48, 209, 88, 0.2)" />
              <text x="${boxW / 2}" y="17" fill="#FFF" font-size="11.5" font-weight="bold" text-anchor="middle">${this.escapeHtml(e.name)}</text>
              ${fSvg}
            </g>`
          })
          .join('')
        return `<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="${svgH}" xmlns="http://www.w3.org/2000/svg" style="background: rgba(0,0,0,0.3); border-radius: 8px;">${relSvg}${entSvg}</svg>`
      }
    }

    if (type === 'state') {
      const states: string[] = []
      const transitions: Array<{ from: string; to: string; label?: string }> = []
      for (const raw of lines) {
        const m = raw.trim().match(/^(\[\*\]|[A-Za-z0-9_]+)\s*-->\s*(\[\*\]|[A-Za-z0-9_]+)(?:\s*:\s*(.*))?$/)
        if (m) {
          const from = m[1] === '[*]' ? 'Start' : m[1]
          const to = m[2] === '[*]' ? 'End' : m[2]
          transitions.push({ from, to, label: m[3] })
          if (!states.includes(from)) states.push(from)
          if (!states.includes(to)) states.push(to)
        }
      }
      if (states.length > 0) {
        const gap = 155
        const svgW = Math.max(460, 40 + states.length * gap)
        const svgH = 150
        const edgeSvg = transitions
          .map((t) => {
            const i1 = states.indexOf(t.from)
            const i2 = states.indexOf(t.to)
            const x1 = 30 + i1 * gap + 60
            const x2 = 30 + i2 * gap + 60
            const y = 72
            return `<path d="M ${x1} ${y} Q ${(x1 + x2) / 2} ${i1 < i2 ? 24 : 122} ${x2} ${y}" fill="none" stroke="#BF5AF2" stroke-width="1.5" />`
          })
          .join('')
        const nodeSvg = states
          .map((s, i) => `<g transform="translate(${30 + i * gap}, 52)">
            <rect width="120" height="38" rx="19" fill="rgba(191, 90, 242, 0.18)" stroke="#BF5AF2" stroke-width="1.4" />
            <text x="60" y="23" fill="#FFF" font-size="11" font-weight="600" text-anchor="middle">${this.escapeHtml(s.slice(0, 16))}</text>
          </g>`)
          .join('')
        return `<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="${svgH}" xmlns="http://www.w3.org/2000/svg" style="background: rgba(0,0,0,0.3); border-radius: 8px;">${edgeSvg}${nodeSvg}</svg>`
      }
    }

    if (type === 'git') {
      const commits: Array<{ id: string; branch: string; tag?: string }> = []
      let curBranch = 'main'
      const branchTracks = new Map<string, number>([['main', 0]])
      for (const raw of lines) {
        const l = raw.trim()
        const br = l.match(/^(?:branch|checkout)\s+([A-Za-z0-9_/-]+)/)
        if (br) {
          curBranch = br[1]
          if (!branchTracks.has(curBranch)) branchTracks.set(curBranch, branchTracks.size)
          continue
        }
        const cm = l.match(/^commit(?:\s+id:\s*"([^"]+)")?(?:.*tag:\s*"([^"]+)")?/)
        if (cm) {
          commits.push({ id: cm[1] || `c${commits.length + 1}`, branch: curBranch, tag: cm[2] })
        }
        const mg = l.match(/^merge\s+([A-Za-z0-9_/-]+)(?:\s+id:\s*"([^"]+)")?/)
        if (mg) {
          commits.push({ id: mg[2] || `merge ${mg[1]}`, branch: curBranch })
        }
      }
      if (commits.length > 0) {
        const colors = ['#0A84FF', '#30D158', '#BF5AF2', '#FF9F0A', '#64D2FF']
        const stepX = 90
        const svgW = Math.max(460, 50 + commits.length * stepX)
        const svgH = Math.max(120, 45 + branchTracks.size * 38)
        let svg = ''
        commits.forEach((c, idx) => {
          const lane = branchTracks.get(c.branch) || 0
          const cx = 44 + idx * stepX
          const cy = 36 + lane * 36
          const color = colors[lane % colors.length]
          if (idx > 0) {
            const prevLane = branchTracks.get(commits[idx - 1].branch) || 0
            svg += `<line x1="${44 + (idx - 1) * stepX}" y1="${36 + prevLane * 36}" x2="${cx}" y2="${cy}" stroke="${color}" stroke-width="2" />`
          }
          svg += `<circle cx="${cx}" cy="${cy}" r="7" fill="${color}" stroke="#FFF" stroke-width="1.5" />`
          svg += `<text x="${cx}" y="${cy + 20}" fill="#CBD5E1" font-size="9.5" text-anchor="middle">${this.escapeHtml(c.id.slice(0, 12))}</text>`
          if (c.tag) {
            svg += `<text x="${cx}" y="${cy - 12}" fill="#FFD60A" font-size="9" font-weight="bold" text-anchor="middle">${this.escapeHtml(c.tag)}</text>`
          }
        })
        return `<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="${svgH}" xmlns="http://www.w3.org/2000/svg" style="background: rgba(0,0,0,0.3); border-radius: 8px;">${svg}</svg>`
      }
    }

    if (type === 'gantt') {
      let title = 'Project Schedule'
      let currentSection = 'Default'
      const tasks: Array<{ label: string; section: string; status: string; durationDays: number }> = []
      for (const raw of lines) {
        const l = raw.trim()
        if (!l || l.startsWith('gantt') || l.startsWith('dateFormat') || l.startsWith('%%')) continue
        if (l.toLowerCase().startsWith('title ')) {
          title = l.slice(6).trim()
          continue
        }
        if (l.toLowerCase().startsWith('section ')) {
          currentSection = l.slice(8).trim()
          continue
        }
        const colonIdx = l.indexOf(':')
        if (colonIdx !== -1) {
          const label = l.slice(0, colonIdx).trim()
          const meta = l.slice(colonIdx + 1).trim()
          const status = /\bcrit\b/i.test(meta) ? 'crit' : /\bdone\b/i.test(meta) ? 'done' : /\bactive\b/i.test(meta) ? 'active' : 'normal'
          const durMatch = meta.match(/(\d+)\s*([dhw])/i)
          const durationDays = durMatch
            ? parseInt(durMatch[1], 10) * (durMatch[2].toLowerCase() === 'w' ? 7 : 1)
            : 5
          tasks.push({ label, section: currentSection, status, durationDays })
        }
      }
      if (tasks.length > 0) {
        const labelW = 160
        const barAreaW = 360
        const rowH = 28
        const svgW = labelW + barAreaW + 30
        const svgH = 44 + tasks.length * rowH + 16
        const totalUnits = Math.max(10, tasks.reduce((acc, t) => acc + t.durationDays, 0))
        let cursor = 0
        let rowsSvg = `<text x="${svgW / 2}" y="24" fill="#F8FAFC" font-size="13" font-weight="bold" text-anchor="middle">${this.escapeHtml(title)}</text>`
        const statusColors: Record<string, string> = {
          done: '#30D158',
          active: '#0A84FF',
          crit: '#FF453A',
          normal: '#BF5AF2',
        }
        tasks.forEach((t, idx) => {
          const y = 40 + idx * rowH
          const bx = labelW + Math.round((cursor / totalUnits) * barAreaW)
          const bw = Math.max(24, Math.round((t.durationDays / totalUnits) * barAreaW))
          cursor += t.durationDays
          const col = statusColors[t.status] || '#0A84FF'
          rowsSvg += `
            <text x="${labelW - 10}" y="${y + 15}" fill="#CBD5E1" font-size="10.5" text-anchor="end">${this.escapeHtml(t.label.slice(0, 22))}</text>
            <rect x="${bx}" y="${y + 3}" width="${bw}" height="18" rx="4" fill="${col}44" stroke="${col}" stroke-width="1.2" />
            <text x="${bx + bw / 2}" y="${y + 15}" fill="#FFF" font-size="9.5" text-anchor="middle">${t.durationDays}d</text>
          `
        })
        return `<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="${svgH}" xmlns="http://www.w3.org/2000/svg" style="background: rgba(0,0,0,0.3); border-radius: 8px;">${rowsSvg}</svg>`
      }
    }

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

  /**
   * Helper to convert base64 (or data URL) into an ArrayBuffer
   */
  public base64ToArrayBuffer(base64OrDataUrl: string): ArrayBuffer {
    const clean = base64OrDataUrl.replace(/^data:[^;]+;base64,/, '').trim()
    const binaryString = atob(clean)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  /**
   * Render Microsoft Word DOCX (and DOC) documents into formatted HTML preview
   */
  public async renderDocx(
    content: string | ArrayBuffer,
    fileName: string = 'document.docx'
  ): Promise<{ html: string; metadata: PreviewMetadata; textContent: string }> {
    let arrayBuffer: ArrayBuffer

    if (typeof content === 'string') {
      if (content.startsWith('data:') || /^[A-Za-z0-9+/=]{100,}/.test(content.slice(0, 200).replace(/\s+/g, ''))) {
        try {
          arrayBuffer = this.base64ToArrayBuffer(content)
        } catch {
          const encoder = new TextEncoder()
          arrayBuffer = encoder.encode(content).buffer
        }
      } else {
        const encoder = new TextEncoder()
        arrayBuffer = encoder.encode(content).buffer
      }
    } else {
      arrayBuffer = content
    }

    const isDoc = fileName.toLowerCase().endsWith('.doc') && !fileName.toLowerCase().endsWith('.docx')

    // Check if it's a legacy OLE2 Word document or DOCX zip
    const bytes = new Uint8Array(arrayBuffer)
    const isZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
    const isOle2 = bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0

    let htmlBody = ''
    let textContent = ''
    let isLegacy = false

    if (isZip || (!isOle2 && !isDoc)) {
      try {
        const mammothFn = (mammoth as any).default || mammoth
        const result = await mammothFn.convertToHtml({ arrayBuffer })
        htmlBody = result.value
        
        // Extract raw text for search & stats
        const rawTextRes = await mammothFn.extractRawText({ arrayBuffer })
        textContent = rawTextRes.value
      } catch {
        // If mammoth fails or partial package, fall back to extracted text runs
        htmlBody = this.extractTextFromBinaryDoc(bytes, fileName)
        textContent = htmlBody.replace(/<[^>]+>/g, ' ')
        isLegacy = true
      }
    } else {
      // Legacy Word 97-2003 OLE2 (.doc)
      htmlBody = this.extractTextFromBinaryDoc(bytes, fileName)
      textContent = htmlBody.replace(/<[^>]+>/g, ' ')
      isLegacy = true
    }

    const words = textContent.trim().split(/\s+/).filter(Boolean).length
    const chars = textContent.length
    const headings = (htmlBody.match(/<h[1-6]\b/gi) || []).length
    const estimatedPages = Math.max(1, Math.ceil(words / 320))

    const wrappedHtml = `
      <div class="docx-document-container">
        ${isLegacy ? `
          <div class="docx-legacy-banner glass-panel">
            <span class="legacy-badge">📄 Legacy Document</span>
            <span>Displaying extracted text from <strong>${this.escapeHtml(fileName)}</strong> (Microsoft Word 97–2003 binary format).</span>
          </div>
        ` : ''}
        <article class="docx-document-sheet">
          ${htmlBody || '<p class="empty-doc-notice">Document contains no readable body text.</p>'}
        </article>
      </div>
    `

    return {
      html: wrappedHtml,
      textContent,
      metadata: {
        type: 'docx',
        title: fileName,
        wordCount: words,
        characterCount: chars,
        mermaidDiagramsCount: 0,
        headingsCount: headings,
        pageCount: estimatedPages,
        fileSize: bytes.length > 0 ? `${(bytes.length / 1024).toFixed(1)} KB` : 'Word Document',
      },
    }
  }

  /**
   * Resilient extractor for legacy Word .doc or non-standard binary document streams
   */
  private extractTextFromBinaryDoc(bytes: Uint8Array, fileName: string): string {
    const textChunks: string[] = []
    let currentChunk = ''

    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i]
      // Printable ASCII characters or newline/tab
      if ((b >= 32 && b <= 126) || b === 10 || b === 13 || b === 9) {
        currentChunk += String.fromCharCode(b)
      } else {
        if (currentChunk.trim().length >= 4) {
          textChunks.push(currentChunk.trim())
        }
        currentChunk = ''
      }
    }
    if (currentChunk.trim().length >= 4) {
      textChunks.push(currentChunk.trim())
    }

    // Filter out common binary keywords & metadata signatures
    const filtered = textChunks.filter((chunk) => {
      if (chunk.length < 3) return false
      if (/^(Microsoft Word|CompObj|WordDocument|SummaryInformation|DocumentSummaryInformation|Table)/i.test(chunk)) {
        return false
      }
      return /[a-zA-Z0-9]/.test(chunk)
    })

    if (filtered.length === 0) {
      return `<p>Legacy Microsoft Word binary format detected (${this.escapeHtml(fileName)}). No printable text extracted.</p>`
    }

    return filtered.map((p) => `<p>${this.escapeHtml(p)}</p>`).join('\n')
  }

  /**
   * Render PDF document URL and extract structure metadata
   */
  public renderPdf(
    content: string | ArrayBuffer,
    fileName: string = 'document.pdf'
  ): { pdfUrl: string; metadata: PreviewMetadata; extractedText: string } {
    let pdfUrl = ''
    let bytes: Uint8Array

    if (typeof content === 'string') {
      if (content.startsWith('data:application/pdf')) {
        pdfUrl = content
        try {
          const ab = this.base64ToArrayBuffer(content)
          bytes = new Uint8Array(ab)
        } catch {
          bytes = new Uint8Array(0)
        }
      } else if (/^[A-Za-z0-9+/=]{100,}/.test(content.slice(0, 200).replace(/\s+/g, ''))) {
        pdfUrl = `data:application/pdf;base64,${content.trim()}`
        try {
          const ab = this.base64ToArrayBuffer(content)
          bytes = new Uint8Array(ab)
        } catch {
          bytes = new Uint8Array(0)
        }
      } else {
        // Plain string (e.g. file URL or raw string)
        const encoder = new TextEncoder()
        bytes = encoder.encode(content)
        try {
          const base64 = btoa(unescape(encodeURIComponent(content)))
          pdfUrl = `data:application/pdf;base64,${base64}`
        } catch {
          pdfUrl = ''
        }
      }
    } else {
      bytes = new Uint8Array(content)
      const blob = new Blob([content], { type: 'application/pdf' })
      pdfUrl = URL.createObjectURL(blob)
    }

    // Heuristically extract PDF metadata & approximate page count
    let pdfString = ''
    try {
      const decoder = new TextDecoder('latin1')
      pdfString = decoder.decode(bytes.slice(0, Math.min(bytes.length, 500000)))
    } catch {}

    // Match /Count \d+ in Pages dict or count /Type\s*\/Page\b
    let pageCount = 1
    const countMatch = pdfString.match(/\/Count\s+(\d+)/)
    if (countMatch) {
      pageCount = parseInt(countMatch[1], 10) || 1
    } else {
      const pageOccurrences = (pdfString.match(/\/Type\s*\/Page\b/g) || []).length
      if (pageOccurrences > 0) {
        pageCount = pageOccurrences
      }
    }

    // Extract text in Tj and TJ operators
    const textMatches = pdfString.match(/\(([^)]+)\)\s*Tj/g) || []
    const extractedWords = textMatches
      .map((m) => m.replace(/^\(/, '').replace(/\)\s*Tj$/, ''))
      .join(' ')
      .trim()

    return {
      pdfUrl,
      extractedText: extractedWords,
      metadata: {
        type: 'pdf',
        title: fileName,
        wordCount: extractedWords.split(/\s+/).filter(Boolean).length,
        characterCount: extractedWords.length,
        mermaidDiagramsCount: 0,
        headingsCount: 0,
        pageCount,
        fileSize: bytes.length > 0 ? `${(bytes.length / 1024).toFixed(1)} KB` : 'PDF Document',
      },
    }
  }
}

export const previewService = new PreviewService()

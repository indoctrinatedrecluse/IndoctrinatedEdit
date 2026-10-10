import { describe, it, expect } from 'vitest'
import { previewService } from '../src/services/previewService'
import { extensionRegistry } from '../src/extensions/extensionRegistry'

describe('Universal Document & Prose Studio (Markdown, PDF & DOCX)', () => {
  describe('Document Preview Type Resolution', () => {
    it('should correctly classify markdown file extensions', () => {
      expect(previewService.getPreviewType('README.md')).toBe('markdown')
      expect(previewService.getPreviewType('guide.markdown')).toBe('markdown')
      expect(previewService.getPreviewType('component.mdx')).toBe('markdown')
      expect(previewService.getPreviewType('notes.mdown')).toBe('markdown')
    })

    it('should correctly classify PDF file extensions', () => {
      expect(previewService.getPreviewType('report.pdf')).toBe('pdf')
      expect(previewService.getPreviewType('WHITE_PAPER.PDF')).toBe('pdf')
      expect(previewService.getPreviewType('unnamed', 'pdf')).toBe('pdf')
    })

    it('should correctly classify Microsoft Word documents (DOCX & DOC)', () => {
      expect(previewService.getPreviewType('document.docx')).toBe('docx')
      expect(previewService.getPreviewType('legacy_notes.doc')).toBe('docx')
      expect(previewService.getPreviewType('PROPOSAL.DOCX')).toBe('docx')
      expect(previewService.getPreviewType('unnamed', 'docx')).toBe('docx')
      expect(previewService.getPreviewType('unnamed', 'doc')).toBe('docx')
    })

    it('should correctly classify web formats (HTML and SVG)', () => {
      expect(previewService.getPreviewType('index.html')).toBe('html')
      expect(previewService.getPreviewType('template.htm')).toBe('html')
      expect(previewService.getPreviewType('icon.svg')).toBe('svg')
    })

    it('should classify unsupported arbitrary files', () => {
      expect(previewService.getPreviewType('archive.zip')).toBe('unsupported')
      expect(previewService.getPreviewType('binary.exe')).toBe('unsupported')
    })
  })

  describe('PDF Document Rendering & Metadata Extraction', () => {
    it('should generate a valid PDF preview data structure and extract page count', () => {
      const mockPdfContent = `%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>
endobj
3 0 obj
<< /Type /Page >>
endobj
4 0 obj
<< /Type /Page >>
endobj
stream
BT (IndoctrinatedEdit Architecture Document) Tj ET
endstream
%%EOF`

      const res = previewService.renderPdf(mockPdfContent, 'Architecture.pdf')
      expect(res.pdfUrl).toContain('data:application/pdf;base64,')
      expect(res.metadata.type).toBe('pdf')
      expect(res.metadata.title).toBe('Architecture.pdf')
      expect(res.metadata.pageCount).toBe(2)
      expect(res.extractedText).toContain('IndoctrinatedEdit Architecture Document')
    })
  })

  describe('Microsoft Word DOCX & DOC Document Rendering', () => {
    it('should handle legacy Word 97-2003 .doc binary extraction gracefully', async () => {
      // Simulate an OLE2 binary header (D0 CF 11 E0) with extracted text runs
      const oleBytes = new Uint8Array([
        0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, // OLE2 signature
        0x00, 0x00, 0x00, 0x00,
        ...Array.from('Executive Summary of System Architecture').map((c) => c.charCodeAt(0)),
        0x00, 0x00,
        ...Array.from('This is a legacy Word document tested in IndoctrinatedEdit.').map((c) => c.charCodeAt(0)),
      ])

      const res = await previewService.renderDocx(oleBytes.buffer, 'Quarterly_Report.doc')
      expect(res.metadata.type).toBe('docx')
      expect(res.metadata.title).toBe('Quarterly_Report.doc')
      expect(res.html).toContain('docx-legacy-banner')
      expect(res.html).toContain('Executive Summary of System Architecture')
      expect(res.textContent).toContain('Executive Summary')
    })

    it('should convert text content to Word Document sheets', async () => {
      const res = await previewService.renderDocx('Sample Word document body content', 'Spec.docx')
      expect(res.metadata.type).toBe('docx')
      expect(res.html).toContain('docx-document-sheet')
      expect(res.metadata.wordCount).toBeGreaterThan(0)
    })
  })

  describe('Extension Bundling & Registration', () => {
    it('should register Universal Document & Prose Studio with generic bundle name', () => {
      const ext = extensionRegistry.get('indoctrinated.ext.livepreview')
      expect(ext).toBeDefined()
      expect(ext?.name).toBe('Universal Document & Prose Studio')
      expect(ext?.description).toContain('Markdown, PDF, Microsoft Word (DOCX/DOC)')
      expect(ext?.category).toBe('Tools')
    })

    it('should resolve language IDs for PDF and DOCX files in the extension registry', () => {
      expect(extensionRegistry.resolveLanguageForFilename('whitepaper.pdf')).toBe('pdf')
      expect(extensionRegistry.resolveLanguageForFilename('manual.docx')).toBe('docx')
      expect(extensionRegistry.resolveLanguageForFilename('legacy.doc')).toBe('docx')
    })
  })
})

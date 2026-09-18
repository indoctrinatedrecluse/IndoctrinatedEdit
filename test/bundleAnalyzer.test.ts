import { describe, it, expect } from 'vitest'
import { bundleAnalyzerService } from '../src/services/bundleAnalyzerService'

describe('BundleAnalyzerService', () => {
  it('retrieves bundle chunks and calculates total size', () => {
    const chunks = bundleAnalyzerService.getChunks()
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks.some((c) => c.name.includes('monaco'))).toBe(true)

    const total = bundleAnalyzerService.getTotalSizeKb()
    expect(total.rawKb).toBeGreaterThan(0)
    expect(total.gzipKb).toBeGreaterThan(0)
    expect(total.gzipKb).toBeLessThan(total.rawKb)
  })

  it('estimates package import costs and suggests tree-shakeable alternatives', () => {
    const momentEst = bundleAnalyzerService.estimateImportCost('moment')
    expect(momentEst.packageName).toBe('moment')
    expect(momentEst.sizeKb).toBeGreaterThan(100)
    expect(momentEst.alternative).toBeDefined()
    expect(momentEst.alternative?.name).toContain('date-fns')

    const lodashEst = bundleAnalyzerService.estimateImportCost('lodash')
    expect(lodashEst.alternative?.name).toContain('lodash-es')
  })

  it('detects duplicate packages across dependency trees', () => {
    const duplicates = bundleAnalyzerService.getDuplicates()
    expect(duplicates.length).toBeGreaterThan(0)
    expect(duplicates.some((d) => d.packageName === 'tslib')).toBe(true)
  })

  it('exports Markdown breakdown report', () => {
    const report = bundleAnalyzerService.exportReportMarkdown()
    expect(report).toContain('# IndoctrinatedEdit Bundle Size')
    expect(report).toContain('vendor-monaco-editor.js')
    expect(report).toContain('Detected Duplicate Packages')
  })
})

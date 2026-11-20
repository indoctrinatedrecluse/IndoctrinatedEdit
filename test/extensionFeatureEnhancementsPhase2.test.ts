import { describe, it, expect } from 'vitest'
import { colorStudioService } from '../src/services/colorStudioService'
import { diffStudioService } from '../src/services/diffStudioService'
import { regexService } from '../src/services/regexService'

describe('Extension Enhancements Phase 2: Visual & Code Analysis Engines', () => {
  describe('Color Studio & CVD Accessibility Enhancements', () => {
    it('simulates Color Vision Deficiency (CVD) for red, green, blue, and monochromacy', () => {
      const pureRed = '#FF0000'
      const protan = colorStudioService.simulateCVD(pureRed, 'protanopia')
      // Under protanopia, red component loses weight and shifts toward yellow/brown
      expect(protan).toMatch(/^#[0-9A-F]{6}$/)
      expect(protan).not.toBe(pureRed)

      const pureGreen = '#00FF00'
      const deutan = colorStudioService.simulateCVD(pureGreen, 'deuteranopia')
      expect(deutan).toMatch(/^#[0-9A-F]{6}$/)
      expect(deutan).not.toBe(pureGreen)

      const pureBlue = '#0000FF'
      const tritan = colorStudioService.simulateCVD(pureBlue, 'tritanopia')
      expect(tritan).toMatch(/^#[0-9A-F]{6}$/)
      expect(tritan).not.toBe(pureBlue)

      const achromat = colorStudioService.simulateCVD('#0A84FF', 'achromatopsia')
      expect(achromat).toMatch(/^#[0-9A-F]{6}$/)
      // For grayscale, R == G == B
      const r = achromat.slice(1, 3)
      const g = achromat.slice(3, 5)
      const b = achromat.slice(5, 7)
      expect(r).toBe(g)
      expect(g).toBe(b)
    })

    it('generates extended harmonies including Tetradic and Monochromatic palettes', () => {
      const harmonies = colorStudioService.generateHarmonies('#0A84FF')
      expect(harmonies.complementary).toMatch(/^#[0-9A-F]{6}$/)
      expect(harmonies.analogous).toHaveLength(2)
      expect(harmonies.triadic).toHaveLength(2)
      expect(harmonies.tetradic).toHaveLength(3)
      expect(harmonies.monochromatic).toHaveLength(4)

      // Tetradic hues should be distributed around the 360-degree circle
      harmonies.tetradic.forEach((hex) => {
        expect(hex).toMatch(/^#[0-9A-F]{6}$/)
      })

      // Monochromatic should produce 4 distinct lightness steps
      expect(new Set(harmonies.monochromatic).size).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Diff Studio Word-Level & Patch Enhancements', () => {
    it('computes word-level diff segmentation on modified lines', () => {
      const oldLine = 'const port = 3000;'
      const newLine = 'const port = 8080;'

      const wordDiff = diffStudioService.computeWordDiff(oldLine, newLine)
      expect(wordDiff.left.some((c) => c.type === 'del' && c.text === '3000')).toBe(true)
      expect(wordDiff.right.some((c) => c.type === 'add' && c.text === '8080')).toBe(true)
      expect(wordDiff.left.some((c) => c.type === 'same' && c.text.includes('const port = '))).toBe(true)
    })

    it('generates unified git-compatible patch', () => {
      const orig = 'line1\nline2\nline3\n'
      const mod = 'line1\nmodified line 2\nline3\n'

      const patch = diffStudioService.generateUnifiedPatch('server.ts', orig, mod)
      expect(patch).toContain('--- a/server.ts')
      expect(patch).toContain('+++ b/server.ts')
      expect(patch).toContain('@@')
      expect(patch).toContain('-line2')
      expect(patch).toContain('+modified line 2')
    })
  })

  describe('Regex Lab Preset & Matching Enhancements', () => {
    it('contains new presets and matches accurately', () => {
      const isoPreset = regexService.presets.find((p) => p.name === 'ISO-8601 DateTime')
      expect(isoPreset).toBeDefined()
      const isoResult = regexService.testRegex(isoPreset!.pattern, isoPreset!.flags, isoPreset!.sampleText)
      expect(isoResult.isValid).toBe(true)
      expect(isoResult.matchesCount).toBeGreaterThan(0)

      const macPreset = regexService.presets.find((p) => p.name === 'IEEE 802 MAC Address')
      expect(macPreset).toBeDefined()
      const macResult = regexService.testRegex(macPreset!.pattern, macPreset!.flags, macPreset!.sampleText)
      expect(macResult.isValid).toBe(true)
      expect(macResult.matchesCount).toBe(2)

      const commitPreset = regexService.presets.find((p) => p.name === 'Conventional Commits')
      expect(commitPreset).toBeDefined()
      const commitResult = regexService.testRegex(commitPreset!.pattern, commitPreset!.flags, commitPreset!.sampleText)
      expect(commitResult.isValid).toBe(true)
      expect(commitResult.matchesCount).toBe(2)

      const colorPreset = regexService.presets.find((p) => p.name === 'CSS Hex Color Code')
      expect(colorPreset).toBeDefined()
      const colorResult = regexService.testRegex(colorPreset!.pattern, colorPreset!.flags, colorPreset!.sampleText)
      expect(colorResult.isValid).toBe(true)
      expect(colorResult.matchesCount).toBe(4)

      const slugPreset = regexService.presets.find((p) => p.name === 'URL-Safe Slug')
      expect(slugPreset).toBeDefined()
      const slugResult = regexService.testRegex(slugPreset!.pattern, slugPreset!.flags, slugPreset!.sampleText)
      expect(slugResult.isValid).toBe(true)
      expect(slugResult.matchesCount).toBe(1)
    })
  })
})

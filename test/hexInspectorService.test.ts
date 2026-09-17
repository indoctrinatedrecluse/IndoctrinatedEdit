import { describe, it, expect } from 'vitest'
import { hexInspectorService } from '../src/services/hexInspectorService'

describe('hexInspectorService', () => {
  it('generates 16-byte formatted hex rows', () => {
    const text = 'Hello, IndoctrinatedEdit Hex Engine!'
    const rows = hexInspectorService.generateHexDump(text)

    expect(rows.length).toBeGreaterThan(1)
    expect(rows[0].bytes.length).toBe(16)
    expect(rows[0].bytes[0].char).toBe('H')
    expect(rows[0].bytes[0].hex).toBe('48')
    expect(rows[0].offsetHex).toBe('00000000')
  })

  it('inspects data types at offset', () => {
    const data = new Uint8Array([0x7F, 0x45, 0x4C, 0x46, 0x01, 0x02, 0x03, 0x04])
    const inspection = hexInspectorService.inspectByteAtOffset(data, 0)

    expect(inspection.offset).toBe(0)
    expect(inspection.byteHex).toBe('7F')
    expect(inspection.uint8).toBe(127)
    expect(inspection.binaryBits).toBe('01111111')
  })

  it('searches for ASCII string matches', () => {
    const text = 'Quick brown fox jumps over lazy dog'
    const matches = hexInspectorService.searchBytes(text, 'fox', false)

    expect(matches.length).toBe(1)
    expect(matches[0]).toBe(12)
  })

  it('searches for Hex pattern matches', () => {
    const text = 'ABCD'
    const matches = hexInspectorService.searchBytes(text, '42 43', true) // 'BC'

    expect(matches.length).toBe(1)
    expect(matches[0]).toBe(1)
  })
})

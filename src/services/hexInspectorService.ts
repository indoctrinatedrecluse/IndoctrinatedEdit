/**
 * IndoctrinatedEdit - Hex & Binary Inspector Service
 */

export interface HexRow {
  offset: number
  offsetHex: string
  bytes: Array<{ index: number; hex: string; char: string; byteVal: number }>
  ascii: string
}

export interface ByteInspection {
  offset: number
  byteHex: string
  binaryBits: string
  int8: number
  uint8: number
  int16LE: number
  int16BE: number
  uint16LE: number
  uint16BE: number
  int32LE: number
  int32BE: number
  uint32LE: number
  uint32BE: number
  float32LE: string
  float32BE: string
  float64LE: string
  float64BE: string
  utf8Char: string
}

class HexInspectorService {
  /**
   * Convert string or buffer into formatted 16-byte hex rows
   */
  public generateHexDump(data: Uint8Array | string, bytesPerRow = 16): HexRow[] {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
    const rows: HexRow[] = []

    for (let i = 0; i < bytes.length; i += bytesPerRow) {
      const rowBytes: Array<{ index: number; hex: string; char: string; byteVal: number }> = []
      let ascii = ''

      for (let j = 0; j < bytesPerRow; j++) {
        const byteIndex = i + j
        if (byteIndex < bytes.length) {
          const val = bytes[byteIndex]
          const hex = val.toString(16).padStart(2, '0').toUpperCase()
          // Printable ASCII (32-126)
          const char = val >= 32 && val <= 126 ? String.fromCharCode(val) : '.'
          rowBytes.push({ index: byteIndex, hex, char, byteVal: val })
          ascii += char
        }
      }

      rows.push({
        offset: i,
        offsetHex: i.toString(16).padStart(8, '0').toUpperCase(),
        bytes: rowBytes,
        ascii,
      })
    }

    return rows
  }

  /**
   * Inspect data types at a specific byte offset
   */
  public inspectByteAtOffset(data: Uint8Array | string, offset: number): ByteInspection {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
    const safeOffset = Math.max(0, Math.min(offset, bytes.length - 1))
    const byteVal = bytes.length > 0 ? bytes[safeOffset] : 0
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

    const canRead2 = safeOffset + 2 <= bytes.length
    const canRead4 = safeOffset + 4 <= bytes.length
    const canRead8 = safeOffset + 8 <= bytes.length

    return {
      offset: safeOffset,
      byteHex: byteVal.toString(16).padStart(2, '0').toUpperCase(),
      binaryBits: byteVal.toString(2).padStart(8, '0'),
      int8: view.getInt8(safeOffset),
      uint8: view.getUint8(safeOffset),
      int16LE: canRead2 ? view.getInt16(safeOffset, true) : 0,
      int16BE: canRead2 ? view.getInt16(safeOffset, false) : 0,
      uint16LE: canRead2 ? view.getUint16(safeOffset, true) : 0,
      uint16BE: canRead2 ? view.getUint16(safeOffset, false) : 0,
      int32LE: canRead4 ? view.getInt32(safeOffset, true) : 0,
      int32BE: canRead4 ? view.getInt32(safeOffset, false) : 0,
      uint32LE: canRead4 ? view.getUint32(safeOffset, true) : 0,
      uint32BE: canRead4 ? view.getUint32(safeOffset, false) : 0,
      float32LE: canRead4 ? view.getFloat32(safeOffset, true).toFixed(4) : 'N/A',
      float32BE: canRead4 ? view.getFloat32(safeOffset, false).toFixed(4) : 'N/A',
      float64LE: canRead8 ? view.getFloat64(safeOffset, true).toFixed(4) : 'N/A',
      float64BE: canRead8 ? view.getFloat64(safeOffset, false).toFixed(4) : 'N/A',
      utf8Char: byteVal >= 32 && byteVal <= 126 ? String.fromCharCode(byteVal) : '·',
    }
  }

  /**
   * Search for byte pattern or string inside data
   */
  public searchBytes(data: Uint8Array | string, query: string, isHex = false): number[] {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
    const matches: number[] = []
    if (!query.trim()) return matches

    if (isHex) {
      const cleanHex = query.replace(/[^0-9a-fA-F]/g, '')
      if (cleanHex.length % 2 !== 0) return matches
      const targetBytes: number[] = []
      for (let i = 0; i < cleanHex.length; i += 2) {
        targetBytes.push(parseInt(cleanHex.substring(i, i + 2), 16))
      }

      for (let i = 0; i <= bytes.length - targetBytes.length; i++) {
        let match = true
        for (let j = 0; j < targetBytes.length; j++) {
          if (bytes[i + j] !== targetBytes[j]) {
            match = false
            break
          }
        }
        if (match) matches.push(i)
      }
    } else {
      const targetBytes = new TextEncoder().encode(query)
      for (let i = 0; i <= bytes.length - targetBytes.length; i++) {
        let match = true
        for (let j = 0; j < targetBytes.length; j++) {
          if (bytes[i + j] !== targetBytes[j]) {
            match = false
            break
          }
        }
        if (match) matches.push(i)
      }
    }

    return matches
  }
}

export const hexInspectorService = new HexInspectorService()

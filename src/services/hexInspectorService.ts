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
  int64LE?: string
  uint64LE?: string
  utf8Char: string
}

class HexInspectorService {
  /**
   * Detect well-known binary container/executable magic headers from leading bytes.
   */
  public detectFileMagic(data: Uint8Array | string): string {
    const b = typeof data === 'string' ? new TextEncoder().encode(data) : data
    if (b.length < 2) return 'Raw Data'
    if (b.length >= 4 && b[0] === 0x7f && b[1] === 0x45 && b[2] === 0x4c && b[3] === 0x46) return 'ELF Binary'
    if (b[0] === 0x4d && b[1] === 0x5a) return 'Windows PE/MZ Executable'
    if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'PNG Image'
    if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'JPEG Image'
    if (b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'PDF Document'
    if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05)) return 'ZIP / DOCX / JAR Archive'
    if (b[0] === 0x1f && b[1] === 0x8b) return 'GZIP Compressed Stream'
    if (b.length >= 4 && b[0] === 0x00 && b[1] === 0x61 && b[2] === 0x73 && b[3] === 0x6d) return 'WebAssembly (WASM)'
    if (b.length >= 16 && new TextDecoder().decode(b.slice(0, 15)) === 'SQLite format 3') return 'SQLite 3 Database'
    if (b.length >= 4 && ((b[0] === 0xfe && b[1] === 0xed && b[2] === 0xfa) || (b[0] === 0xcf && b[1] === 0xfa && b[2] === 0xed))) return 'Mach-O Executable'
    if (b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'GIF Image'
    return 'Text / Binary Buffer'
  }
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
    if (bytes.length === 0) {
      return {
        offset: 0,
        byteHex: '00',
        binaryBits: '00000000',
        int8: 0,
        uint8: 0,
        int16LE: 0,
        int16BE: 0,
        uint16LE: 0,
        uint16BE: 0,
        int32LE: 0,
        int32BE: 0,
        uint32LE: 0,
        uint32BE: 0,
        float32LE: 'N/A',
        float32BE: 'N/A',
        float64LE: 'N/A',
        float64BE: 'N/A',
        int64LE: 'N/A',
        uint64LE: 'N/A',
        utf8Char: '·',
      }
    }

    const safeOffset = Math.max(0, Math.min(offset, bytes.length - 1))
    const byteVal = bytes[safeOffset]
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
      int64LE: canRead8 && typeof view.getBigInt64 === 'function' ? view.getBigInt64(safeOffset, true).toString() : 'N/A',
      uint64LE: canRead8 && typeof view.getBigUint64 === 'function' ? view.getBigUint64(safeOffset, true).toString() : 'N/A',
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
      if (cleanHex.length === 0 || cleanHex.length % 2 !== 0) return matches
      const targetBytes: number[] = []
      for (let i = 0; i < cleanHex.length; i += 2) {
        targetBytes.push(parseInt(cleanHex.substring(i, i + 2), 16))
      }

      if (targetBytes.length === 0 || targetBytes.length > bytes.length) return matches

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
      if (targetBytes.length === 0 || targetBytes.length > bytes.length) return matches
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

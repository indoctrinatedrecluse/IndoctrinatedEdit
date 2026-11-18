import React, { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Cpu,
} from 'lucide-react'
import { hexInspectorService, HexRow, ByteInspection } from '../../services/hexInspectorService'
import './HexInspectorView.css'

interface HexInspectorViewProps {
  activeFileName?: string
  activeFileContent?: string
}

const sampleBinaryText = `ELF\x02\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x02\x00>\x00\x01\x00\x00\x00\x80\x10@\x00\x00\x00\x00\x00@\x00\x00\x00\x00\x00\x00\x00IndoctrinatedEdit High Performance Kernel v4.1.0 LiquidGlass Engine`

export const HexInspectorView: React.FC<HexInspectorViewProps> = ({
  activeFileName = 'binary.bin',
  activeFileContent = '',
}) => {
  const [inputText, setInputText] = useState<string>(() => activeFileContent || sampleBinaryText)
  const [selectedByteOffset, setSelectedByteOffset] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchIsHex, setSearchIsHex] = useState<boolean>(false)

  useEffect(() => {
    if (activeFileContent !== undefined && activeFileContent !== '') {
      setInputText(activeFileContent)
      setSelectedByteOffset(0)
    }
  }, [activeFileContent, activeFileName])

  const hexRows: HexRow[] = useMemo(() => {
    return hexInspectorService.generateHexDump(inputText)
  }, [inputText])

  const byteInspection: ByteInspection = useMemo(() => {
    return hexInspectorService.inspectByteAtOffset(inputText, selectedByteOffset)
  }, [inputText, selectedByteOffset])

  const searchMatches = useMemo(() => {
    return hexInspectorService.searchBytes(inputText, searchQuery, searchIsHex)
  }, [inputText, searchQuery, searchIsHex])

  // Highlight every byte of multi-byte search matches in O(1) lookup via Set
  const matchedByteSet = useMemo(() => {
    const set = new Set<number>()
    if (searchMatches.length === 0) return set
    const matchLen = searchIsHex
      ? Math.max(1, searchQuery.replace(/\s+/g, '').length / 2 | 0)
      : Math.max(1, new TextEncoder().encode(searchQuery).length)
    for (const startOffset of searchMatches) {
      for (let i = 0; i < matchLen; i++) set.add(startOffset + i)
    }
    return set
  }, [searchMatches, searchQuery, searchIsHex])

  return (
    <div className="hex-inspector-root">
      {/* Top Controls Toolbar */}
      <div className="hex-toolbar glass-panel">
        <div
          className="search-wrapper"
          onWheel={(e) => {
            e.currentTarget.scrollLeft += e.deltaY
          }}
        >
          <Search size={12} className="search-icon" />
          <input
            type="text"
            className="hex-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchIsHex ? 'Search Hex (e.g. 45 4C 46)...' : 'Search ASCII text...'}
          />
          <button
            className={`hex-mode-chip ${searchIsHex ? 'active' : ''}`}
            onClick={() => setSearchIsHex(!searchIsHex)}
            title="Toggle Hex / Text search mode"
          >
            {searchIsHex ? 'HEX' : 'TXT'}
          </button>
        </div>

        {searchMatches.length > 0 && (
          <span className="matches-badge">
            {searchMatches.length} match{searchMatches.length > 1 ? 'es' : ''}
          </span>
        )}
      </div>

      {/* Main Hex Stage Grid */}
      <div className="hex-stage-grid">
        {/* Left: Hex Dump Matrix */}
        <div className="hex-dump-panel custom-scrollbar">
          <div className="hex-matrix-header">
            <span className="col-offset">OFFSET</span>
            <span className="col-bytes">00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F</span>
            <span className="col-ascii">ASCII</span>
          </div>

          <div className="hex-rows-list">
            {hexRows.map((row) => (
              <div key={row.offset} className="hex-dump-row">
                <span className="row-offset">{row.offsetHex}</span>

                <div className="row-bytes-grid">
                  {row.bytes.map((b) => {
                    const isSelected = b.index === selectedByteOffset
                    const isMatch = matchedByteSet.has(b.index)
                    return (
                      <span
                        key={b.index}
                        className={`hex-byte-cell ${isSelected ? 'selected' : ''} ${isMatch ? 'match' : ''}`}
                        onClick={() => setSelectedByteOffset(b.index)}
                        title={`Offset 0x${b.index.toString(16).toUpperCase()} (${b.index})`}
                      >
                        {b.hex}
                      </span>
                    )
                  })}
                </div>

                <span className="row-ascii-str">{row.ascii}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Data Type Inspector */}
        <div className="byte-inspector-panel glass-panel">
          <div className="inspector-title">
            <Cpu size={12} color="#64D2FF" />
            <span>BYTE INSPECTOR ({activeFileName} @ 0x{byteInspection.offset.toString(16).toUpperCase()})</span>
          </div>

          <div className="type-inspector-grid">
            <div className="inspect-row">
              <span className="type-label">Hex / Binary:</span>
              <span className="type-val highlight">0x{byteInspection.byteHex} ({byteInspection.binaryBits})</span>
            </div>

            <div className="inspect-row">
              <span className="type-label">Int8 / UInt8:</span>
              <span className="type-val">{byteInspection.int8} / {byteInspection.uint8}</span>
            </div>

            <div className="inspect-row">
              <span className="type-label">Int16 (LE / BE):</span>
              <span className="type-val">{byteInspection.int16LE} / {byteInspection.int16BE}</span>
            </div>

            <div className="inspect-row">
              <span className="type-label">UInt16 (LE / BE):</span>
              <span className="type-val">{byteInspection.uint16LE} / {byteInspection.uint16BE}</span>
            </div>

            <div className="inspect-row">
              <span className="type-label">Int32 (LE / BE):</span>
              <span className="type-val">{byteInspection.int32LE} / {byteInspection.int32BE}</span>
            </div>

            <div className="inspect-row">
              <span className="type-label">UInt32 (LE / BE):</span>
              <span className="type-val">{byteInspection.uint32LE} / {byteInspection.uint32BE}</span>
            </div>

            <div className="inspect-row">
              <span className="type-label">Float32 (LE):</span>
              <span className="type-val">{byteInspection.float32LE}</span>
            </div>

            <div className="inspect-row">
              <span className="type-label">Float64 (LE):</span>
              <span className="type-val">{byteInspection.float64LE}</span>
            </div>

            <div className="inspect-row">
              <span className="type-label">UTF-8 Char:</span>
              <span className="type-val char-val">'{byteInspection.utf8Char}'</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

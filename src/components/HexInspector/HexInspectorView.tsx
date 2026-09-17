import React, { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Cpu,
} from 'lucide-react'
import { hexInspectorService, HexRow, ByteInspection } from '../../services/hexInspectorService'

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
    if (activeFileContent) {
      setInputText(activeFileContent)
    }
  }, [activeFileContent])

  const hexRows: HexRow[] = useMemo(() => {
    return hexInspectorService.generateHexDump(inputText)
  }, [inputText])

  const byteInspection: ByteInspection = useMemo(() => {
    return hexInspectorService.inspectByteAtOffset(inputText, selectedByteOffset)
  }, [inputText, selectedByteOffset])

  const searchMatches = useMemo(() => {
    return hexInspectorService.searchBytes(inputText, searchQuery, searchIsHex)
  }, [inputText, searchQuery, searchIsHex])

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
                    const isMatch = searchMatches.includes(b.index)
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

      <style>{`
        .hex-inspector-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: rgba(10, 14, 24, 0.95);
          color: var(--text-primary);
          overflow: hidden;
          font-family: var(--font-ui);
        }

        .hex-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          gap: 8px;
          flex-shrink: 0;
        }

        .search-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          padding: 3px 8px;
          flex: 1;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .search-icon { color: var(--text-muted); flex-shrink: 0; }

        .hex-search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #FFF;
          font-family: var(--font-mono);
          font-size: 11px;
        }

        .hex-mode-chip {
          font-size: 9px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-muted);
          cursor: pointer;
          flex-shrink: 0;
        }

        .hex-mode-chip.active {
          background: rgba(10, 132, 255, 0.3);
          color: #64D2FF;
          border-color: rgba(10, 132, 255, 0.5);
        }

        .matches-badge {
          font-size: 9.5px;
          font-weight: 700;
          color: #30D158;
          background: rgba(48, 209, 88, 0.15);
          padding: 2px 6px;
          border-radius: 3px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .hex-stage-grid {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          gap: 8px;
          padding: 8px;
        }

        .hex-dump-panel {
          flex: 1;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          overflow: auto;
          padding: 8px;
          font-family: var(--font-mono);
          font-size: 11px;
        }

        .hex-matrix-header {
          display: flex;
          color: var(--text-muted);
          font-size: 9.5px;
          font-weight: 800;
          padding-bottom: 4px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 4px;
          user-select: none;
        }

        .col-offset { width: 75px; flex-shrink: 0; }
        .col-bytes { flex: 1; min-width: 290px; }
        .col-ascii { width: 130px; flex-shrink: 0; }

        .hex-dump-row {
          display: flex;
          align-items: center;
          padding: 1px 0;
        }

        .row-offset {
          width: 75px;
          color: #0A84FF;
          font-weight: 700;
          user-select: none;
          flex-shrink: 0;
        }

        .row-bytes-grid {
          display: flex;
          gap: 4px;
          flex: 1;
          min-width: 290px;
        }

        .hex-byte-cell {
          width: 17px;
          text-align: center;
          cursor: pointer;
          border-radius: 2px;
          color: #CBD5E1;
        }

        .hex-byte-cell:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #FFF;
        }

        .hex-byte-cell.selected {
          background: #0A84FF;
          color: #FFF;
          font-weight: 800;
        }

        .hex-byte-cell.match {
          background: #FFD60A;
          color: #000;
          font-weight: 800;
        }

        .row-ascii-str {
          width: 130px;
          color: #94A3B8;
          white-space: pre;
          flex-shrink: 0;
        }

        .byte-inspector-panel {
          padding: 10px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        .inspector-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 800;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .type-inspector-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 12px;
          font-family: var(--font-mono);
          font-size: 10.5px;
        }

        .inspect-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .type-label { color: var(--text-muted); font-size: 10px; }
        .type-val { color: #E2E8F0; font-weight: 600; }
        .type-val.highlight { color: #64D2FF; }
        .type-val.char-val { color: #30D158; font-weight: 700; }
      `}</style>
    </div>
  )
}

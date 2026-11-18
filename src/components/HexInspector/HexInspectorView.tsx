import React, { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Cpu,
  FolderOpen,
  Save,
  Undo2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { hexInspectorService, HexRow, ByteInspection } from '../../services/hexInspectorService'
import './HexInspectorView.css'

interface HexInspectorViewProps {
  activeFilePath?: string
  activeFileName?: string
  activeFileContent?: string
}

const sampleBinaryBytes = new TextEncoder().encode(
  `\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x02\x00>\x00\x01\x00\x00\x00\x80\x10@\x00\x00\x00\x00\x00IndoctrinatedEdit Binary Inspector`
)

const ROWS_PER_PAGE = 64

export const HexInspectorView: React.FC<HexInspectorViewProps> = ({
  activeFilePath,
  activeFileName = 'binary.bin',
  activeFileContent = '',
}) => {
  const [rawBytes, setRawBytes] = useState<Uint8Array>(() =>
    activeFileContent ? new TextEncoder().encode(activeFileContent) : sampleBinaryBytes
  )
  const [loadedPath, setLoadedPath] = useState<string | undefined>(activeFilePath)
  const [loadedName, setLoadedName] = useState<string>(activeFileName)
  const [selectedByteOffset, setSelectedByteOffset] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchIsHex, setSearchIsHex] = useState<boolean>(false)
  const [matchCursor, setMatchCursor] = useState<number>(0)
  const [page, setPage] = useState<number>(0)
  const [editHexInput, setEditHexInput] = useState<string>('')
  const [undoStack, setUndoStack] = useState<Array<{ offset: number; prevVal: number }>>([])
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const loadActive = async () => {
      if (activeFilePath && window.electronAPI?.workspace?.readFileBinary) {
        try {
          const buf = await window.electronAPI.workspace.readFileBinary(activeFilePath, 2 * 1024 * 1024)
          if (!cancelled && buf) {
            setRawBytes(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
            setLoadedPath(activeFilePath)
            setLoadedName(activeFileName)
            setSelectedByteOffset(0)
            setPage(0)
            setUndoStack([])
            return
          }
        } catch {
          // fallback to string content
        }
      }
      if (!cancelled && activeFileContent !== undefined && activeFileContent !== '') {
        setRawBytes(new TextEncoder().encode(activeFileContent))
        setLoadedPath(activeFilePath)
        setLoadedName(activeFileName)
        setSelectedByteOffset(0)
        setPage(0)
        setUndoStack([])
      }
    }
    void loadActive()
    return () => {
      cancelled = true
    }
  }, [activeFilePath, activeFileContent, activeFileName])

  const allHexRows: HexRow[] = useMemo(() => {
    return hexInspectorService.generateHexDump(rawBytes)
  }, [rawBytes])

  const totalPages = Math.max(1, Math.ceil(allHexRows.length / ROWS_PER_PAGE))
  const visibleRows = useMemo(() => {
    const start = page * ROWS_PER_PAGE
    return allHexRows.slice(start, start + ROWS_PER_PAGE)
  }, [allHexRows, page])

  const fileMagic = useMemo(() => hexInspectorService.detectFileMagic(rawBytes), [rawBytes])

  const byteInspection: ByteInspection = useMemo(() => {
    return hexInspectorService.inspectByteAtOffset(rawBytes, selectedByteOffset)
  }, [rawBytes, selectedByteOffset])

  useEffect(() => {
    setEditHexInput(byteInspection.byteHex)
  }, [byteInspection.byteHex, selectedByteOffset])

  const searchMatches = useMemo(() => {
    return hexInspectorService.searchBytes(rawBytes, searchQuery, searchIsHex)
  }, [rawBytes, searchQuery, searchIsHex])

  const matchedByteSet = useMemo(() => {
    const set = new Set<number>()
    if (searchMatches.length === 0) return set
    const matchLen = searchIsHex
      ? Math.max(1, (searchQuery.replace(/\s+/g, '').length / 2) | 0)
      : Math.max(1, new TextEncoder().encode(searchQuery).length)
    for (const startOffset of searchMatches) {
      for (let i = 0; i < matchLen; i++) set.add(startOffset + i)
    }
    return set
  }, [searchMatches, searchQuery, searchIsHex])

  const jumpToOffset = (offset: number) => {
    const safe = Math.max(0, Math.min(offset, Math.max(0, rawBytes.length - 1)))
    setSelectedByteOffset(safe)
    setPage(Math.floor(safe / (16 * ROWS_PER_PAGE)))
  }

  const handleStepMatch = (dir: 1 | -1) => {
    if (searchMatches.length === 0) return
    const nextIdx = (matchCursor + dir + searchMatches.length) % searchMatches.length
    setMatchCursor(nextIdx)
    jumpToOffset(searchMatches[nextIdx])
  }

  const handleOpenBinary = async () => {
    const picked = await window.electronAPI?.openFileDialog?.()
    if (!picked?.path || !window.electronAPI?.workspace?.readFileBinary) return
    const buf = await window.electronAPI.workspace.readFileBinary(picked.path, 2 * 1024 * 1024)
    setRawBytes(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
    setLoadedPath(picked.path)
    setLoadedName(picked.name)
    setSelectedByteOffset(0)
    setPage(0)
    setUndoStack([])
  }

  const handleApplyByteEdit = () => {
    const parsed = parseInt(editHexInput.trim(), 16)
    if (isNaN(parsed) || parsed < 0 || parsed > 255 || selectedByteOffset >= rawBytes.length) return
    const prevVal = rawBytes[selectedByteOffset]
    if (prevVal === parsed) return
    const next = new Uint8Array(rawBytes)
    next[selectedByteOffset] = parsed
    setUndoStack((s) => [...s.slice(-49), { offset: selectedByteOffset, prevVal }])
    setRawBytes(next)
  }

  const handleUndo = () => {
    if (undoStack.length === 0) return
    const last = undoStack[undoStack.length - 1]
    const next = new Uint8Array(rawBytes)
    next[last.offset] = last.prevVal
    setRawBytes(next)
    setUndoStack((s) => s.slice(0, -1))
    jumpToOffset(last.offset)
  }

  const handleSaveBinary = async () => {
    if (!loadedPath || !window.electronAPI?.workspace?.writeFileBinary) {
      setStatusMsg('Open a disk file in Electron to save binary edits.')
      setTimeout(() => setStatusMsg(null), 2500)
      return
    }
    await window.electronAPI.workspace.writeFileBinary(loadedPath, rawBytes)
    setUndoStack([])
    setStatusMsg(`Saved ${rawBytes.length} bytes to ${loadedName}`)
    setTimeout(() => setStatusMsg(null), 2500)
  }

  return (
    <div className="hex-inspector-root">
      {/* Top Controls Toolbar */}
      <div className="hex-toolbar glass-panel" style={{ flexWrap: 'wrap', gap: 6 }}>
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
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setMatchCursor(0)
            }}
            placeholder={searchIsHex ? 'Search Hex (e.g. 7F 45 4C 46)...' : 'Search ASCII text...'}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="matches-badge">
              {matchCursor + 1}/{searchMatches.length}
            </span>
            <button className="hex-mode-chip" onClick={() => handleStepMatch(-1)} title="Previous Match">
              <ChevronLeft size={10} />
            </button>
            <button className="hex-mode-chip" onClick={() => handleStepMatch(1)} title="Next Match">
              <ChevronRight size={10} />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <span className="matches-badge" title="Detected Binary Magic Header">
            {fileMagic} ({rawBytes.length} B)
          </span>
          <button className="hex-mode-chip" onClick={() => void handleOpenBinary()} title="Open Binary File">
            <FolderOpen size={11} />
          </button>
          <button className="hex-mode-chip" onClick={handleUndo} disabled={undoStack.length === 0} title="Undo Byte Edit">
            <Undo2 size={11} />
          </button>
          <button className="hex-mode-chip active" onClick={() => void handleSaveBinary()} title="Save Binary File">
            <Save size={11} />
          </button>
        </div>
      </div>

      {statusMsg && (
        <div style={{ padding: '4px 10px', fontSize: 11, color: '#30D158', background: 'rgba(48,209,88,0.12)' }}>
          {statusMsg}
        </div>
      )}

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
            {visibleRows.map((row) => (
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

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 6, fontSize: 11 }}>
              <button className="hex-mode-chip" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Prev
              </button>
              <span>Page {page + 1} / {totalPages}</span>
              <button className="hex-mode-chip" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right: Data Type Inspector & Inline Byte Editor */}
        <div className="byte-inspector-panel glass-panel">
          <div className="inspector-title">
            <Cpu size={12} color="#64D2FF" />
            <span>BYTE INSPECTOR ({loadedName} @ 0x{byteInspection.offset.toString(16).toUpperCase()})</span>
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 0 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 6 }}>
            <span style={{ fontSize: 11, opacity: 0.75 }}>Patch Byte (Hex):</span>
            <input
              type="text"
              maxLength={2}
              value={editHexInput}
              onChange={(e) => setEditHexInput(e.target.value.replace(/[^0-9a-fA-F]/g, '').toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApplyByteEdit()
              }}
              style={{ width: 42, padding: '2px 6px', fontFamily: 'monospace', fontSize: 11, borderRadius: 4, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#64D2FF' }}
            />
            <button className="hex-mode-chip active" onClick={handleApplyByteEdit}>
              Write
            </button>
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
              <span className="type-label">Int64 / UInt64 (LE):</span>
              <span className="type-val">{byteInspection.int64LE} / {byteInspection.uint64LE}</span>
            </div>

            <div className="inspect-row">
              <span className="type-label">Float32 (LE / BE):</span>
              <span className="type-val">{byteInspection.float32LE} / {byteInspection.float32BE}</span>
            </div>

            <div className="inspect-row">
              <span className="type-label">Float64 (LE / BE):</span>
              <span className="type-val">{byteInspection.float64LE} / {byteInspection.float64BE}</span>
            </div>

            <div className="inspect-row">
              <span className="type-label">UTF-8 Char:</span>
              <span className="type-val char-val">&apos;{byteInspection.utf8Char}&apos;</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

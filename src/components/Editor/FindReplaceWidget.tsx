import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Replace,
  ChevronUp,
  ChevronDown,
  X,
  CaseSensitive,
  WholeWord,
  Regex,
  ListFilter,
  CheckCheck,
  RotateCw,
} from 'lucide-react'

export interface FindOptions {
  matchCase: boolean
  matchWholeWord: boolean
  isRegex: boolean
  inSelection: boolean
}

export interface FindReplaceWidgetProps {
  isOpen: boolean
  initialMode?: 'find' | 'replace'
  initialSearchText?: string
  totalMatches: number
  currentMatchIndex: number
  onClose: () => void
  onSearchChange: (query: string, options: FindOptions) => void
  onFindNext: () => void
  onFindPrevious: () => void
  onReplaceCurrent: (replaceText: string) => void
  onReplaceAll: (replaceText: string) => void
  onSelectAllMatches: () => void
}

export const FindReplaceWidget: React.FC<FindReplaceWidgetProps> = ({
  isOpen,
  initialMode = 'find',
  initialSearchText = '',
  totalMatches,
  currentMatchIndex,
  onClose,
  onSearchChange,
  onFindNext,
  onFindPrevious,
  onReplaceCurrent,
  onReplaceAll,
  onSelectAllMatches,
}) => {
  const [mode, setMode] = useState<'find' | 'replace'>(initialMode)
  const [searchQuery, setSearchQuery] = useState(initialSearchText)
  const [replaceQuery, setReplaceQuery] = useState('')
  const [options, setOptions] = useState<FindOptions>({
    matchCase: false,
    matchWholeWord: false,
    isRegex: false,
    inSelection: false,
  })

  const searchInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
      if (initialSearchText) {
        setSearchQuery(initialSearchText)
      }
      setTimeout(() => {
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }, 50)
    }
  }, [isOpen, initialMode, initialSearchText])

  const notifyChange = useCallback(
    (query: string, opts: FindOptions) => {
      onSearchChange(query, opts)
    },
    [onSearchChange]
  )

  const handleQueryChange = (val: string) => {
    setSearchQuery(val)
    notifyChange(val, options)
  }

  const toggleOption = (key: keyof FindOptions) => {
    const next = { ...options, [key]: !options[key] }
    setOptions(next)
    notifyChange(searchQuery, next)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.altKey) {
        // Alt+Enter -> Select all occurrences
        onSelectAllMatches()
      } else if (e.shiftKey) {
        onFindPrevious()
      } else {
        onFindNext()
      }
      return
    }

    if (e.key === 'F3') {
      e.preventDefault()
      if (e.shiftKey) {
        onFindPrevious()
      } else {
        onFindNext()
      }
      return
    }

    if (e.altKey) {
      if (e.key.toLowerCase() === 'c') {
        e.preventDefault()
        toggleOption('matchCase')
      } else if (e.key.toLowerCase() === 'w') {
        e.preventDefault()
        toggleOption('matchWholeWord')
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault()
        toggleOption('isRegex')
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault()
        toggleOption('inSelection')
      }
    }
  }

  const handleReplaceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.ctrlKey || e.altKey) {
        onReplaceAll(replaceQuery)
      } else {
        onReplaceCurrent(replaceQuery)
      }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="find-replace-overlay glass-panel"
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
          onKeyDown={handleKeyDown}
        >
          {/* Ambient Glow */}
          <div className="fr-glow orb-1" />

          <div className="fr-container">
            {/* Toggle Mode Button (Find / Replace Accordion) */}
            <button
              className={`fr-mode-toggle glass-interactive ${mode === 'replace' ? 'active' : ''}`}
              onClick={() => setMode((m) => (m === 'find' ? 'replace' : 'find'))}
              title={mode === 'find' ? 'Toggle Replace (Ctrl+H)' : 'Collapse Replace (Ctrl+F)'}
            >
              {mode === 'find' ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>

            {/* Inputs & Actions Column */}
            <div className="fr-body">
              {/* Find Row */}
              <div className="fr-row find-row">
                <div className="fr-input-wrapper">
                  <Search size={13} className="fr-search-icon" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="fr-input"
                    placeholder="Find in document..."
                    value={searchQuery}
                    onChange={(e) => handleQueryChange(e.target.value)}
                  />

                  {/* Option Toggles */}
                  <div className="fr-toggles">
                    <button
                      type="button"
                      className={`fr-toggle-btn glass-interactive ${options.matchCase ? 'active' : ''}`}
                      onClick={() => toggleOption('matchCase')}
                      title="Match Case (Alt+C)"
                    >
                      <CaseSensitive size={13} />
                    </button>
                    <button
                      type="button"
                      className={`fr-toggle-btn glass-interactive ${options.matchWholeWord ? 'active' : ''}`}
                      onClick={() => toggleOption('matchWholeWord')}
                      title="Match Whole Word (Alt+W)"
                    >
                      <WholeWord size={13} />
                    </button>
                    <button
                      type="button"
                      className={`fr-toggle-btn glass-interactive ${options.isRegex ? 'active' : ''}`}
                      onClick={() => toggleOption('isRegex')}
                      title="Use Regular Expression (Alt+R)"
                    >
                      <Regex size={13} />
                    </button>
                    <button
                      type="button"
                      className={`fr-toggle-btn glass-interactive ${options.inSelection ? 'active' : ''}`}
                      onClick={() => toggleOption('inSelection')}
                      title="Find in Selection (Alt+L)"
                    >
                      <ListFilter size={13} />
                    </button>
                  </div>
                </div>

                {/* Match Counter Badge */}
                <div className="fr-match-badge">
                  {searchQuery ? (
                    totalMatches > 0 ? (
                      <span>
                        {currentMatchIndex + 1} of {totalMatches}
                      </span>
                    ) : (
                      <span className="no-matches">No results</span>
                    )
                  ) : (
                    <span className="no-matches">0 matches</span>
                  )}
                </div>

                {/* Navigation Buttons */}
                <div className="fr-nav-buttons">
                  <button
                    type="button"
                    className="fr-nav-btn glass-interactive"
                    onClick={onFindPrevious}
                    disabled={totalMatches === 0}
                    title="Previous Match (Shift+Enter / Shift+F3)"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    type="button"
                    className="fr-nav-btn glass-interactive"
                    onClick={onFindNext}
                    disabled={totalMatches === 0}
                    title="Next Match (Enter / F3)"
                  >
                    <ChevronDown size={13} />
                  </button>
                  <button
                    type="button"
                    className="fr-nav-btn glass-interactive select-all-btn"
                    onClick={onSelectAllMatches}
                    disabled={totalMatches === 0}
                    title="Select All Occurrences for Multi-Cursor (Alt+Enter)"
                  >
                    <CheckCheck size={13} />
                  </button>
                </div>
              </div>

              {/* Replace Row (Accordion) */}
              {mode === 'replace' && (
                <motion.div
                  className="fr-row replace-row"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="fr-input-wrapper">
                    <Replace size={13} className="fr-search-icon" />
                    <input
                      ref={replaceInputRef}
                      type="text"
                      className="fr-input"
                      placeholder="Replace with..."
                      value={replaceQuery}
                      onChange={(e) => setReplaceQuery(e.target.value)}
                      onKeyDown={handleReplaceKeyDown}
                    />
                  </div>

                  {/* Replace Action Buttons */}
                  <div className="fr-replace-actions">
                    <button
                      type="button"
                      className="fr-action-btn glass-interactive"
                      onClick={() => onReplaceCurrent(replaceQuery)}
                      disabled={totalMatches === 0}
                      title="Replace current match (Enter)"
                    >
                      <span>Replace</span>
                    </button>
                    <button
                      type="button"
                      className="fr-action-btn glass-interactive highlight"
                      onClick={() => onReplaceAll(replaceQuery)}
                      disabled={totalMatches === 0}
                      title="Replace all occurrences (Ctrl+Alt+Enter)"
                    >
                      <RotateCw size={11} />
                      <span>Replace All</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Close Overlay */}
            <button className="fr-close-btn glass-interactive" onClick={onClose} title="Close (Esc)">
              <X size={13} />
            </button>
          </div>

          <style>{`
            .find-replace-overlay {
              position: absolute;
              top: 8px;
              right: 28px;
              z-index: 100;
              width: 440px;
              max-width: calc(100vw - 320px);
              background: rgba(14, 18, 30, 0.92);
              backdrop-filter: blur(28px) saturate(200%);
              -webkit-backdrop-filter: blur(28px) saturate(200%);
              border: 1px solid rgba(255, 255, 255, 0.16);
              border-radius: 12px;
              box-shadow: 0 16px 48px -8px rgba(0, 0, 0, 0.75), 0 0 24px rgba(10, 132, 255, 0.2);
              padding: 6px 8px;
              overflow: hidden;
            }

            .fr-glow {
              position: absolute;
              border-radius: 50%;
              filter: blur(40px);
              pointer-events: none;
              opacity: 0.25;
            }

            .fr-glow.orb-1 {
              width: 120px;
              height: 120px;
              background: radial-gradient(circle, #0A84FF 0%, transparent 70%);
              top: -30px;
              right: -30px;
            }

            .fr-container {
              display: flex;
              align-items: flex-start;
              gap: 6px;
              position: relative;
              z-index: 1;
            }

            .fr-mode-toggle {
              width: 24px;
              height: 26px;
              margin-top: 1px;
              border-radius: 6px;
              border: 1px solid rgba(255, 255, 255, 0.1);
              background: rgba(255, 255, 255, 0.04);
              color: rgba(235, 235, 245, 0.6);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all 0.15s ease;
              flex-shrink: 0;
            }

            .fr-mode-toggle:hover,
            .fr-mode-toggle.active {
              color: #0A84FF;
              background: rgba(10, 132, 255, 0.15);
              border-color: rgba(10, 132, 255, 0.3);
            }

            .fr-body {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 5px;
            }

            .fr-row {
              display: flex;
              align-items: center;
              gap: 6px;
            }

            .fr-input-wrapper {
              flex: 1;
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 3px 8px;
              background: rgba(255, 255, 255, 0.06);
              border: 1px solid rgba(255, 255, 255, 0.14);
              border-radius: 8px;
              height: 28px;
              transition: all 0.15s ease;
            }

            .fr-input-wrapper:focus-within {
              border-color: #0A84FF;
              background: rgba(255, 255, 255, 0.09);
              box-shadow: 0 0 0 2px rgba(10, 132, 255, 0.25);
            }

            .fr-search-icon {
              color: rgba(235, 235, 245, 0.45);
              flex-shrink: 0;
            }

            .fr-input {
              flex: 1;
              background: transparent;
              border: none;
              outline: none;
              color: rgba(255, 255, 255, 0.95);
              font-family: var(--font-mono, 'JetBrains Mono', monospace);
              font-size: 11.5px;
              min-width: 80px;
            }

            .fr-input::placeholder {
              color: rgba(235, 235, 245, 0.35);
              font-family: var(--font-sans, -apple-system, sans-serif);
            }

            .fr-toggles {
              display: flex;
              align-items: center;
              gap: 2px;
            }

            .fr-toggle-btn {
              width: 20px;
              height: 20px;
              border-radius: 4px;
              border: 1px solid transparent;
              background: transparent;
              color: rgba(235, 235, 245, 0.45);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all 0.12s ease;
              padding: 0;
            }

            .fr-toggle-btn:hover {
              color: rgba(255, 255, 255, 0.85);
              background: rgba(255, 255, 255, 0.08);
            }

            .fr-toggle-btn.active {
              background: rgba(10, 132, 255, 0.22);
              border-color: rgba(10, 132, 255, 0.4);
              color: #5AC8FA;
            }

            .fr-match-badge {
              font-size: 11px;
              font-family: var(--font-mono, monospace);
              color: rgba(235, 235, 245, 0.7);
              padding: 0 4px;
              white-space: nowrap;
              min-width: 65px;
              text-align: center;
            }

            .fr-match-badge .no-matches {
              color: rgba(235, 235, 245, 0.35);
            }

            .fr-nav-buttons {
              display: flex;
              align-items: center;
              gap: 2px;
            }

            .fr-nav-btn {
              width: 24px;
              height: 26px;
              border-radius: 6px;
              border: 1px solid rgba(255, 255, 255, 0.1);
              background: rgba(255, 255, 255, 0.04);
              color: rgba(235, 235, 245, 0.7);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all 0.12s ease;
            }

            .fr-nav-btn:hover:not(:disabled) {
              background: rgba(255, 255, 255, 0.1);
              color: #fff;
            }

            .fr-nav-btn:disabled {
              opacity: 0.3;
              cursor: not-allowed;
            }

            .fr-nav-btn.select-all-btn:hover:not(:disabled) {
              background: rgba(48, 209, 88, 0.2);
              color: #30D158;
              border-color: rgba(48, 209, 88, 0.35);
            }

            .fr-replace-actions {
              display: flex;
              align-items: center;
              gap: 4px;
            }

            .fr-action-btn {
              height: 26px;
              padding: 0 8px;
              border-radius: 6px;
              border: 1px solid rgba(255, 255, 255, 0.12);
              background: rgba(255, 255, 255, 0.05);
              color: rgba(235, 235, 245, 0.85);
              font-size: 11px;
              font-weight: 500;
              display: flex;
              align-items: center;
              gap: 4px;
              cursor: pointer;
              transition: all 0.12s ease;
              white-space: nowrap;
            }

            .fr-action-btn:hover:not(:disabled) {
              background: rgba(255, 255, 255, 0.12);
              color: #fff;
            }

            .fr-action-btn.highlight:hover:not(:disabled) {
              background: rgba(191, 90, 242, 0.22);
              border-color: rgba(191, 90, 242, 0.4);
              color: #BF5AF2;
            }

            .fr-action-btn:disabled {
              opacity: 0.3;
              cursor: not-allowed;
            }

            .fr-close-btn {
              width: 24px;
              height: 26px;
              margin-top: 1px;
              border-radius: 6px;
              border: 1px solid transparent;
              background: transparent;
              color: rgba(235, 235, 245, 0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all 0.12s ease;
              flex-shrink: 0;
            }

            .fr-close-btn:hover {
              background: rgba(255, 69, 58, 0.2);
              color: #FF453A;
              border-color: rgba(255, 69, 58, 0.35);
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

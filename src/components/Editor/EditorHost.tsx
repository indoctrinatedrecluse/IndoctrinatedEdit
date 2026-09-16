import { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react'
import Editor, { OnMount, loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { ThemeDefinition } from '@sdk/index'
import { extensionRegistry } from '../../extensions/extensionRegistry'
import { debugService } from '../../services/debugService'
import { FindReplaceWidget, FindOptions } from './FindReplaceWidget'

// Force @monaco-editor/react to use local monaco bundle, bypassing cdn.jsdelivr.net completely
loader.config({ monaco })

// Initialize built-in Monaco language extensions immediately
extensionRegistry.initializeMonacoExtensions(monaco)

export interface SelectionInfo {
  text: string
  startLine: number
  endLine: number
}

export interface DocumentSymbol {
  name: string
  kind: 'class' | 'function' | 'interface' | 'method' | 'variable' | 'heading' | 'type'
  line: number
  detail?: string
}

export interface EditorHostHandle {
  insertAtCursor: (text: string) => void
  replaceSelection: (text: string) => void
  getSelectedText: () => string
  goToLine: (lineNumber: number, column?: number) => void
  formatDocument: () => void
  triggerAction: (actionId: string) => void
  transformSelection: (type: 'uppercase' | 'lowercase' | 'titlecase' | 'trim' | 'sort') => void
  getOutlineSymbols: () => DocumentSymbol[]
  openFind: (initialText?: string) => void
  openReplace: () => void
  closeFind: () => void
  findNext: () => void
  findPrevious: () => void
  replaceCurrent: (replaceText: string) => void
  replaceAll: (replaceText: string) => void
  selectAllOccurrences: () => void
  addSelectionToNextFindMatch: () => void
  insertCursorAbove: () => void
  insertCursorBelow: () => void
}

interface EditorHostProps {
  content: string
  language: string
  theme: ThemeDefinition
  activeFilePath?: string
  onChange?: (value: string | undefined) => void
  onCursorChange?: (line: number, column: number) => void
  onSelectionChange?: (selection: SelectionInfo | null) => void
  onEditorReady?: () => void
}

export const EditorHost = forwardRef<EditorHostHandle, EditorHostProps>(({
  content,
  language,
  theme,
  activeFilePath = 'welcome.ts',
  onChange,
  onCursorChange,
  onSelectionChange,
  onEditorReady,
}, ref) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof monaco | null>(null)
  const decorationsRef = useRef<string[]>([])
  const searchDecorationsRef = useRef<string[]>([])

  // Find & Replace Suite State
  const [isFindOpen, setIsFindOpen] = useState(false)
  const [findMode, setFindMode] = useState<'find' | 'replace'>('find')
  const [findSearchText, setFindSearchText] = useState('')
  const [totalMatches, setTotalMatches] = useState(0)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const findMatchesRef = useRef<monaco.editor.FindMatch[]>([])
  const findOptionsRef = useRef<FindOptions>({
    matchCase: false,
    matchWholeWord: false,
    isRegex: false,
    inSelection: false,
  })

  const clearSearchDecorations = useCallback(() => {
    const editor = editorRef.current
    if (editor) {
      searchDecorationsRef.current = editor.deltaDecorations(searchDecorationsRef.current, [])
    }
    findMatchesRef.current = []
    setTotalMatches(0)
    setCurrentMatchIndex(0)
  }, [])

  const updateSearchDecorations = useCallback((matches: monaco.editor.FindMatch[], activeIndex: number) => {
    const editor = editorRef.current
    const monacoInstance = monacoRef.current
    if (!editor || !monacoInstance) return

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = matches.map((m, idx) => ({
      range: m.range,
      options: {
        className: idx === activeIndex ? 'find-match-highlight-active' : 'find-match-highlight',
        overviewRuler: {
          color: idx === activeIndex ? '#FF9F0A' : '#FFD60A',
          position: monacoInstance.editor.OverviewRulerLane.Right,
        },
      },
    }))

    searchDecorationsRef.current = editor.deltaDecorations(searchDecorationsRef.current, newDecorations)
  }, [])

  const handleSearchChange = useCallback((query: string, opts: FindOptions) => {
    setFindSearchText(query)
    findOptionsRef.current = opts
    const editor = editorRef.current
    if (!editor) return

    const model = editor.getModel()
    if (!model || !query) {
      clearSearchDecorations()
      return
    }

    try {
      let searchRange: monaco.Range | undefined = undefined
      if (opts.inSelection) {
        const sel = editor.getSelection()
        if (sel && !sel.isEmpty()) {
          searchRange = sel
        }
      }

      const matches = model.findMatches(
        query,
        searchRange || model.getFullModelRange(),
        opts.isRegex,
        opts.matchCase,
        opts.matchWholeWord ? '`~!@#$%^&*()-=+[{]}\\|;:\'",.<>/? \t\n\r' : null,
        true
      )

      findMatchesRef.current = matches
      setTotalMatches(matches.length)

      if (matches.length > 0) {
        // Find match closest to or at current cursor position
        const pos = editor.getPosition()
        let matchIdx = 0
        if (pos) {
          const found = matches.findIndex(
            (m) => m.range.startLineNumber >= pos.lineNumber && m.range.startColumn >= pos.column
          )
          if (found >= 0) matchIdx = found
        }
        setCurrentMatchIndex(matchIdx)
        updateSearchDecorations(matches, matchIdx)
        editor.revealRangeInCenter(matches[matchIdx].range)
        editor.setSelection(matches[matchIdx].range)
      } else {
        setCurrentMatchIndex(0)
        clearSearchDecorations()
      }
    } catch (err) {
      console.warn('Find regex / search syntax error:', err)
      clearSearchDecorations()
    }
  }, [clearSearchDecorations, updateSearchDecorations])

  const handleFindNext = useCallback(() => {
    const editor = editorRef.current
    const matches = findMatchesRef.current
    if (!editor || matches.length === 0) return

    const nextIdx = (currentMatchIndex + 1) % matches.length
    setCurrentMatchIndex(nextIdx)
    updateSearchDecorations(matches, nextIdx)
    editor.revealRangeInCenter(matches[nextIdx].range)
    editor.setSelection(matches[nextIdx].range)
  }, [currentMatchIndex, updateSearchDecorations])

  const handleFindPrevious = useCallback(() => {
    const editor = editorRef.current
    const matches = findMatchesRef.current
    if (!editor || matches.length === 0) return

    const prevIdx = (currentMatchIndex - 1 + matches.length) % matches.length
    setCurrentMatchIndex(prevIdx)
    updateSearchDecorations(matches, prevIdx)
    editor.revealRangeInCenter(matches[prevIdx].range)
    editor.setSelection(matches[prevIdx].range)
  }, [currentMatchIndex, updateSearchDecorations])

  const handleReplaceCurrent = useCallback((replaceText: string) => {
    const editor = editorRef.current
    const matches = findMatchesRef.current
    if (!editor || matches.length === 0) return

    const currentMatch = matches[currentMatchIndex]
    if (!currentMatch) return

    editor.executeEdits('find-replace', [{
      range: currentMatch.range,
      text: replaceText,
      forceMoveMarkers: true,
    }])

    handleSearchChange(findSearchText, findOptionsRef.current)
  }, [currentMatchIndex, findSearchText, handleSearchChange])

  const handleReplaceAll = useCallback((replaceText: string) => {
    const editor = editorRef.current
    const matches = findMatchesRef.current
    if (!editor || matches.length === 0) return

    const edits = matches.map((m) => ({
      range: m.range,
      text: replaceText,
      forceMoveMarkers: true,
    }))

    editor.executeEdits('find-replace-all', edits)
    handleSearchChange(findSearchText, findOptionsRef.current)
  }, [findSearchText, handleSearchChange])

  const handleSelectAllMatches = useCallback(() => {
    const editor = editorRef.current
    const matches = findMatchesRef.current
    if (!editor || matches.length === 0) return

    const selections = matches.map((m) => new monaco.Selection(
      m.range.startLineNumber,
      m.range.startColumn,
      m.range.endLineNumber,
      m.range.endColumn
    ))

    editor.setSelections(selections)
    editor.focus()
  }, [])

  useImperativeHandle(ref, () => ({
    insertAtCursor: (text: string) => {
      const editor = editorRef.current
      if (editor && monacoRef.current) {
        const position = editor.getPosition()
        if (position) {
          editor.executeEdits('ai-assistant', [{
            range: new monacoRef.current.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            text,
            forceMoveMarkers: true,
          }])
          editor.focus()
        }
      }
    },
    replaceSelection: (text: string) => {
      const editor = editorRef.current
      if (editor) {
        const selection = editor.getSelection()
        if (selection) {
          editor.executeEdits('ai-assistant', [{
            range: selection,
            text,
            forceMoveMarkers: true,
          }])
          editor.focus()
        }
      }
    },
    getSelectedText: () => {
      const editor = editorRef.current
      if (editor) {
        const model = editor.getModel()
        const selection = editor.getSelection()
        if (model && selection && !selection.isEmpty()) {
          return model.getValueInRange(selection)
        }
      }
      return ''
    },
    goToLine: (lineNumber: number, column = 1) => {
      const editor = editorRef.current
      if (editor) {
        const model = editor.getModel()
        const lineCount = model ? model.getLineCount() : 1
        const targetLine = Math.max(1, Math.min(lineNumber, lineCount))
        editor.setPosition({ lineNumber: targetLine, column })
        editor.revealLineInCenter(targetLine)
        editor.focus()
      }
    },
    formatDocument: () => {
      const editor = editorRef.current
      if (editor) {
        editor.getAction('editor.action.formatDocument')?.run()
      }
    },
    triggerAction: (actionId: string) => {
      const editor = editorRef.current
      if (editor) {
        editor.getAction(actionId)?.run()
      }
    },
    transformSelection: (type: 'uppercase' | 'lowercase' | 'titlecase' | 'trim' | 'sort') => {
      const editor = editorRef.current
      if (!editor) return
      const selection = editor.getSelection()
      const model = editor.getModel()
      if (!model) return

      const targetRange = selection && !selection.isEmpty()
        ? selection
        : model.getFullModelRange()

      const text = model.getValueInRange(targetRange)
      let transformed = text

      switch (type) {
        case 'uppercase':
          transformed = text.toUpperCase()
          break
        case 'lowercase':
          transformed = text.toLowerCase()
          break
        case 'titlecase':
          transformed = text.replace(/\b\w/g, (c) => c.toUpperCase())
          break
        case 'trim':
          transformed = text
            .split('\n')
            .map((l) => l.trimEnd())
            .join('\n')
          break
        case 'sort':
          transformed = text
            .split('\n')
            .sort((a, b) => a.localeCompare(b))
            .join('\n')
          break
      }

      editor.executeEdits('edit-transform', [{
        range: targetRange,
        text: transformed,
        forceMoveMarkers: true,
      }])
      editor.focus()
    },
    getOutlineSymbols: (): DocumentSymbol[] => {
      const editor = editorRef.current
      if (!editor) return []
      const model = editor.getModel()
      if (!model) return []

      const symbols: DocumentSymbol[] = []
      const lineCount = model.getLineCount()

      for (let i = 1; i <= lineCount; i++) {
        const line = model.getLineContent(i)
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue

        // Markdown headings
        const mdHeadingMatch = trimmed.match(/^(#{1,6})\s+(.+)/)
        if (mdHeadingMatch) {
          symbols.push({
            name: mdHeadingMatch[2],
            kind: 'heading',
            line: i,
            detail: `Heading (H${mdHeadingMatch[1].length})`,
          })
          continue
        }

        // Classes / Structs / Interfaces / Types
        const classMatch = trimmed.match(/(?:export\s+)?(?:abstract\s+)?(?:class|struct|interface|trait|enum)\s+([A-Za-z0-9_$]+)/)
        if (classMatch) {
          const kind = trimmed.includes('interface')
            ? 'interface'
            : trimmed.includes('class')
            ? 'class'
            : 'type'
          symbols.push({
            name: classMatch[1],
            kind,
            line: i,
            detail: trimmed.slice(0, 50),
          })
          continue
        }

        // Type aliases
        const typeMatch = trimmed.match(/(?:export\s+)?type\s+([A-Za-z0-9_$]+)\s*=/)
        if (typeMatch) {
          symbols.push({
            name: typeMatch[1],
            kind: 'type',
            line: i,
            detail: 'Type Alias',
          })
          continue
        }
      }

      return symbols
    },
    openFind: (initialText?: string) => {
      const editor = editorRef.current
      let seed = initialText
      if (!seed && editor) {
        const selection = editor.getSelection()
        const model = editor.getModel()
        if (model && selection && !selection.isEmpty()) {
          seed = model.getValueInRange(selection)
        }
      }
      setIsFindOpen(true)
      setFindMode('find')
      if (seed) {
        setFindSearchText(seed)
        handleSearchChange(seed, findOptionsRef.current)
      }
    },
    openReplace: () => {
      const editor = editorRef.current
      let seed = ''
      if (editor) {
        const selection = editor.getSelection()
        const model = editor.getModel()
        if (model && selection && !selection.isEmpty()) {
          seed = model.getValueInRange(selection)
        }
      }
      setIsFindOpen(true)
      setFindMode('replace')
      if (seed) {
        setFindSearchText(seed)
        handleSearchChange(seed, findOptionsRef.current)
      }
    },
    closeFind: () => {
      setIsFindOpen(false)
      clearSearchDecorations()
    },
    findNext: () => {
      handleFindNext()
    },
    findPrevious: () => {
      handleFindPrevious()
    },
    replaceCurrent: (replaceText: string) => {
      handleReplaceCurrent(replaceText)
    },
    replaceAll: (replaceText: string) => {
      handleReplaceAll(replaceText)
    },
    selectAllOccurrences: () => {
      handleSelectAllMatches()
    },
    addSelectionToNextFindMatch: () => {
      const editor = editorRef.current
      if (editor) {
        editor.getAction('editor.action.addSelectionToNextFindMatch')?.run()
      }
    },
    insertCursorAbove: () => {
      const editor = editorRef.current
      if (editor) {
        editor.getAction('editor.action.insertCursorAbove')?.run()
      }
    },
    insertCursorBelow: () => {
      const editor = editorRef.current
      if (editor) {
        editor.getAction('editor.action.insertCursorBelow')?.run()
      }
    },
  }))

  const registerAndApplyTheme = (monacoInstance: typeof monaco, targetTheme: ThemeDefinition) => {
    try {
      const themeName = targetTheme.id

      monacoInstance.editor.defineTheme(themeName, {
        base: 'vs-dark',
        inherit: true,
        rules: targetTheme.colors.tokenRules.map((rule) => ({
          token: rule.token,
          foreground: rule.foreground.replace('#', ''),
          fontStyle: rule.fontStyle,
        })),
        colors: {
          'editor.background': '#00000000', // 100% transparent canvas for frosted glass
          'editor.foreground': targetTheme.colors.textPrimary,
          'editor.lineHighlightBackground': 'rgba(255, 255, 255, 0.035)',
          'editor.lineHighlightBorder': 'rgba(255, 255, 255, 0.06)',
          'editorCursor.foreground': targetTheme.colors.accentGlow ? targetTheme.colors.textPrimary : '#0A84FF',
          'editorWhitespace.foreground': 'rgba(255, 255, 255, 0.08)',
          'editorLineNumber.foreground': 'rgba(235, 235, 245, 0.28)',
          'editorLineNumber.activeForeground': targetTheme.colors.textPrimary,
          'editor.selectionBackground': 'rgba(10, 132, 255, 0.25)',
          'editor.selectionHighlightBackground': 'rgba(10, 132, 255, 0.15)',
          'editorGutter.background': '#00000000',
          'editorBracketMatch.background': 'rgba(10, 132, 255, 0.2)',
          'editorBracketMatch.border': '#0A84FF',
          'editorStickyScroll.background': targetTheme.colors.glassBackground,
          'editorStickyScroll.border': targetTheme.colors.specularBorder,
          'scrollbarSlider.background': 'rgba(255, 255, 255, 0.12)',
          'scrollbarSlider.hoverBackground': 'rgba(255, 255, 255, 0.24)',
          'scrollbarSlider.activeBackground': 'rgba(255, 255, 255, 0.35)',
          // Minimap glass tokens
          'minimapSlider.background': 'rgba(255, 255, 255, 0.08)',
          'minimapSlider.hoverBackground': 'rgba(255, 255, 255, 0.16)',
          'minimapSlider.activeBackground': 'rgba(255, 255, 255, 0.24)',
          'minimap.errorHighlight': 'rgba(255, 69, 58, 0.35)',
          'minimap.warningHighlight': 'rgba(255, 214, 10, 0.35)',
          'minimap.selectionHighlight': 'rgba(10, 132, 255, 0.28)',
          'minimap.findMatchHighlight': 'rgba(255, 159, 10, 0.35)',
          'minimap.background': '#00000000',
        },
      })

      monacoInstance.editor.setTheme(themeName)
    } catch (err) {
      console.warn('Failed to define or set custom Monaco theme:', err)
      monacoInstance.editor.setTheme('vs-dark')
    }
  }

  // Update Breakpoint & Execution Line Decorations
  const updateDebugDecorations = useCallback(() => {
    const editor = editorRef.current
    const monacoInstance = monacoRef.current
    if (!editor || !monacoInstance) return

    const bps = debugService.getBreakpoints(activeFilePath)
    const activeLoc = debugService.getActiveLocation()

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = []

    // 1. Breakpoint Glyphs
    bps.forEach((bp) => {
      let glyphClass = 'debug-breakpoint-glyph'
      if (!bp.enabled) {
        glyphClass = 'debug-breakpoint-glyph-disabled'
      } else if (bp.condition) {
        glyphClass = 'debug-breakpoint-glyph-conditional'
      } else if (bp.logMessage) {
        glyphClass = 'debug-breakpoint-glyph-logpoint'
      }

      newDecorations.push({
        range: new monacoInstance.Range(bp.line, 1, bp.line, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: glyphClass,
          glyphMarginHoverMessage: {
            value: `Breakpoint (Line ${bp.line})${bp.condition ? ` [Cond: ${bp.condition}]` : ''}${bp.logMessage ? ` [Log: ${bp.logMessage}]` : ''}`,
          },
        },
      })
    })

    // 2. Active Execution Paused Line
    if (activeLoc && (activeLoc.filePath === activeFilePath || activeLoc.filePath.endsWith(activeFilePath))) {
      newDecorations.push({
        range: new monacoInstance.Range(activeLoc.line, 1, activeLoc.line, 1),
        options: {
          isWholeLine: true,
          className: 'debug-active-execution-line',
          glyphMarginClassName: 'debug-active-line-glyph',
          overviewRuler: {
            color: '#FFD60A',
            position: monacoInstance.editor.OverviewRulerLane.Full,
          },
        },
      })
    }

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations)
  }, [activeFilePath])

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor
    monacoRef.current = monacoInstance

    registerAndApplyTheme(monacoInstance, theme)

    // Track cursor position for reactive status bar updates
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.(e.position.lineNumber, e.position.column)
    })

    // Track text selection for AI chat context attachment
    editor.onDidChangeCursorSelection((e) => {
      const selection = e.selection
      const model = editor.getModel()
      if (model && selection && !selection.isEmpty()) {
        const text = model.getValueInRange(selection)
        onSelectionChange?.({
          text,
          startLine: selection.startLineNumber,
          endLine: selection.endLineNumber,
        })
      } else {
        onSelectionChange?.(null)
      }
    })

    // Listen for Gutter Glyph Margin Clicks to Toggle Breakpoints
    editor.onMouseDown((e) => {
      if (e.target.type === monacoInstance.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const line = e.target.position?.lineNumber
        if (line && activeFilePath) {
          debugService.toggleBreakpoint(activeFilePath, line)
        }
      }
    })

    // Initial decorations update
    updateDebugDecorations()

    // Signal that Monaco editor has mounted and applied initial theme
    // Double RAF ensures Monaco canvas and syntax highlighting are composited to the screen
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        onEditorReady?.()
      })
    })
  }

  // Synchronize decorations whenever breakpoints or active file changes
  useEffect(() => {
    const unsub = debugService.subscribe(() => {
      updateDebugDecorations()
    })
    updateDebugDecorations()
    return () => unsub()
  }, [updateDebugDecorations, activeFilePath])

  // Update theme dynamically whenever theme changes
  useEffect(() => {
    if (monacoRef.current) {
      registerAndApplyTheme(monacoRef.current, theme)
    }
  }, [theme])

  return (
    <div className="editor-host-container">
      {/* Floating Liquid Glass Find & Replace Suite Overlay */}
      <FindReplaceWidget
        isOpen={isFindOpen}
        initialMode={findMode}
        initialSearchText={findSearchText}
        totalMatches={totalMatches}
        currentMatchIndex={currentMatchIndex}
        onClose={() => {
          setIsFindOpen(false)
          clearSearchDecorations()
        }}
        onSearchChange={handleSearchChange}
        onFindNext={handleFindNext}
        onFindPrevious={handleFindPrevious}
        onReplaceCurrent={handleReplaceCurrent}
        onReplaceAll={handleReplaceAll}
        onSelectAllMatches={handleSelectAllMatches}
      />

      <Editor
        height="100%"
        language={language}
        value={content}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          fontFamily: "var(--font-mono)",
          fontSize: 13.5,
          lineHeight: 22,
          fontLigatures: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          glyphMargin: true, // Enable Gutter Glyph Margin for Breakpoints & Execution Arrow
          multiCursorModifier: 'alt', // Alt+Click inserts multiple cursors
          multiCursorPaste: 'spread',
          multiCursorLimit: 10000,
          // FIX: Disable sticky scroll so symbols are not persistently pinned on scroll
          stickyScroll: {
            enabled: false,
          },
          // Polish the code preview (minimap) on the right
          minimap: {
            enabled: true,
            renderCharacters: true,
            maxColumn: 90,
            scale: 1,
            showSlider: 'always',
            autohide: false,
            side: 'right',
          },
          padding: { top: 16, bottom: 16 },
          roundedSelection: true,
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          renderLineHighlight: 'all',
          scrollBeyondLastLine: false,
          overviewRulerBorder: false,
        }}
      />

      <style>{`
        .editor-host-container {
          flex: 1;
          height: 100%;
          position: relative;
          background: transparent;
          overflow: hidden;
        }

        /* In-Editor Find & Replace Search Highlight Decorations */
        .find-match-highlight {
          background: rgba(255, 214, 10, 0.22) !important;
          border-bottom: 2px solid rgba(255, 214, 10, 0.6);
          border-radius: 2px;
        }

        .find-match-highlight-active {
          background: rgba(255, 159, 10, 0.45) !important;
          border-bottom: 2px solid #FF9F0A;
          box-shadow: 0 0 8px rgba(255, 159, 10, 0.5);
          border-radius: 2px;
        }

        /* Ensure Monaco DOM nodes allow glass transparency */
        .editor-host-container .monaco-editor,
        .editor-host-container .monaco-editor .overflow-guard,
        .editor-host-container .monaco-editor .monaco-editor-background {
          background-color: transparent !important;
        }

        /* Frosted Glass Minimap Preview Enhancement */
        .editor-host-container .monaco-editor .minimap {
          border-left: 1px solid rgba(255, 255, 255, 0.08) !important;
          background: rgba(0, 0, 0, 0.15) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        /* Translucent liquid glass minimap slider without nested backdrop-filter bug */
        .editor-host-container .monaco-editor .minimap-slider {
          background: transparent !important;
          border-radius: var(--radius-xs);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.16);
          box-sizing: border-box;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          pointer-events: auto;
        }

        .editor-host-container .monaco-editor .minimap-slider .minimap-slider-horizontal {
          background: rgba(255, 255, 255, 0.08) !important;
          border-radius: var(--radius-xs);
          transition: background-color 0.2s ease;
        }

        .editor-host-container .monaco-editor .minimap-slider:hover {
          border-color: rgba(255, 255, 255, 0.38);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .editor-host-container .monaco-editor .minimap-slider:hover .minimap-slider-horizontal {
          background: rgba(255, 255, 255, 0.16) !important;
        }

        .editor-host-container .monaco-editor .minimap-slider.active .minimap-slider-horizontal {
          background: rgba(255, 255, 255, 0.24) !important;
        }

        /* Sticky scroll frosted glass if ever toggled */
        .editor-host-container .monaco-editor .sticky-widget {
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
        }

        /* Debugger Gutter Glyphs */
        .debug-breakpoint-glyph {
          background: #FF453A;
          width: 10px !important;
          height: 10px !important;
          border-radius: 50%;
          margin-left: 5px;
          margin-top: 6px;
          box-shadow: 0 0 8px rgba(255, 69, 58, 0.7);
          cursor: pointer;
        }

        .debug-breakpoint-glyph-disabled {
          background: rgba(235, 235, 245, 0.4);
          width: 8px !important;
          height: 8px !important;
          border-radius: 50%;
          margin-left: 6px;
          margin-top: 7px;
          border: 1px solid rgba(255, 255, 255, 0.5);
          cursor: pointer;
        }

        .debug-breakpoint-glyph-conditional {
          background: #FFD60A;
          width: 10px !important;
          height: 10px !important;
          transform: rotate(45deg);
          margin-left: 5px;
          margin-top: 6px;
          box-shadow: 0 0 8px rgba(255, 214, 10, 0.7);
          cursor: pointer;
        }

        .debug-breakpoint-glyph-logpoint {
          background: #0A84FF;
          width: 10px !important;
          height: 10px !important;
          transform: rotate(45deg);
          margin-left: 5px;
          margin-top: 6px;
          box-shadow: 0 0 8px rgba(10, 132, 255, 0.7);
          cursor: pointer;
        }

        .debug-active-line-glyph {
          width: 0;
          height: 0;
          border-top: 5px solid transparent;
          border-bottom: 5px solid transparent;
          border-left: 8px solid #FFD60A;
          margin-left: 6px;
          margin-top: 6px;
          filter: drop-shadow(0 0 4px #FFD60A);
        }

        .debug-active-execution-line {
          background: rgba(255, 214, 10, 0.15) !important;
          border-top: 1px solid rgba(255, 214, 10, 0.3);
          border-bottom: 1px solid rgba(255, 214, 10, 0.3);
        }
      `}</style>
    </div>
  )
})

EditorHost.displayName = 'EditorHost'

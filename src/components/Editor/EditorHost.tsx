import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import Editor, { OnMount, loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { ThemeDefinition } from '@sdk/index'

// Force @monaco-editor/react to use local monaco bundle, bypassing cdn.jsdelivr.net completely
loader.config({ monaco })

export interface SelectionInfo {
  text: string
  startLine: number
  endLine: number
}

export interface EditorHostHandle {
  insertAtCursor: (text: string) => void
  replaceSelection: (text: string) => void
  getSelectedText: () => string
}

interface EditorHostProps {
  content: string
  language: string
  theme: ThemeDefinition
  onChange?: (value: string | undefined) => void
  onCursorChange?: (line: number, column: number) => void
  onSelectionChange?: (selection: SelectionInfo | null) => void
  onEditorReady?: () => void
}

export const EditorHost = forwardRef<EditorHostHandle, EditorHostProps>(({
  content,
  language,
  theme,
  onChange,
  onCursorChange,
  onSelectionChange,
  onEditorReady,
}, ref) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof monaco | null>(null)

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
  }))

  const registerAndApplyTheme = (monacoInstance: typeof monaco, targetTheme: ThemeDefinition) => {
    try {
      const sanitizedId = targetTheme.id.replace(/[^a-zA-Z0-9-]/g, '-')
      const themeName = `indoctrinated-${sanitizedId}`

      monacoInstance.editor.defineTheme(themeName, {
        base: targetTheme.type === 'light' ? 'vs' : 'vs-dark',
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
        },
      })

      monacoInstance.editor.setTheme(themeName)
    } catch (err) {
      console.warn('Failed to define or set custom Monaco theme:', err)
      monacoInstance.editor.setTheme('vs-dark')
    }
  }

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

    // Signal that Monaco editor has mounted and applied initial theme
    onEditorReady?.()
  }

  // Update theme dynamically whenever theme changes
  useEffect(() => {
    if (monacoRef.current) {
      registerAndApplyTheme(monacoRef.current, theme)
    }
  }, [theme])

  return (
    <div className="editor-host-container">
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

        .editor-host-container .monaco-editor .minimap-slider {
          background: rgba(255, 255, 255, 0.16) !important;
          border-radius: var(--radius-xs);
          border: 1px solid rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(8px);
        }

        .editor-host-container .monaco-editor .minimap-slider:hover {
          background: rgba(255, 255, 255, 0.28) !important;
        }

        /* Sticky scroll frosted glass if ever toggled */
        .editor-host-container .monaco-editor .sticky-widget {
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
        }
      `}</style>
    </div>
  )
})

EditorHost.displayName = 'EditorHost'

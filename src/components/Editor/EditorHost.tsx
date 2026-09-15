import React, { useRef, useEffect } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { CupertinoMidnightGlassTheme } from '@/themes/defaultGlassTheme'

interface EditorHostProps {
  content: string
  language: string
  theme: CupertinoMidnightGlassTheme
  onChange?: (value: string | undefined) => void
  onCursorChange?: (line: number, column: number) => void
}

export const EditorHost: React.FC<EditorHostProps> = ({
  content,
  language,
  theme,
  onChange,
  onCursorChange,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor

    // Define custom Liquid Glass Monaco theme
    monacoInstance.editor.defineTheme('indoctrinated-glass-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: theme.colors.tokenRules.map((rule) => ({
        token: rule.token,
        foreground: rule.foreground,
        fontStyle: rule.fontStyle,
      })),
      colors: {
        'editor.background': '#00000000', // 100% transparent canvas so frosted glass shows through
        'editor.foreground': theme.colors.textPrimary,
        'editor.lineHighlightBackground': 'rgba(255, 255, 255, 0.035)',
        'editor.lineHighlightBorder': 'rgba(255, 255, 255, 0.06)',
        'editorCursor.foreground': '#0A84FF',
        'editorWhitespace.foreground': 'rgba(255, 255, 255, 0.08)',
        'editorLineNumber.foreground': 'rgba(235, 235, 245, 0.28)',
        'editorLineNumber.activeForeground': '#0A84FF',
        'editor.selectionBackground': 'rgba(10, 132, 255, 0.25)',
        'editor.selectionHighlightBackground': 'rgba(10, 132, 255, 0.15)',
        'editorGutter.background': '#00000000',
        'editorBracketMatch.background': 'rgba(10, 132, 255, 0.2)',
        'editorBracketMatch.border': '#0A84FF',
        'scrollbarSlider.background': 'rgba(255, 255, 255, 0.12)',
        'scrollbarSlider.hoverBackground': 'rgba(255, 255, 255, 0.24)',
        'scrollbarSlider.activeBackground': 'rgba(255, 255, 255, 0.35)',
      },
    })

    monacoInstance.editor.setTheme('indoctrinated-glass-theme')

    // Track cursor position for reactive status bar updates
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.(e.position.lineNumber, e.position.column)
    })
  }

  // Update theme dynamically when theme prop changes
  useEffect(() => {
    if (editorRef.current) {
      monaco.editor.setTheme('indoctrinated-glass-theme')
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
        theme="indoctrinated-glass-theme"
        options={{
          fontFamily: "var(--font-mono)",
          fontSize: 13.5,
          lineHeight: 22,
          fontLigatures: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          minimap: {
            enabled: true,
            renderCharacters: false,
            maxColumn: 80,
            scale: 1,
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
      `}</style>
    </div>
  )
}

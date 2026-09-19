/**
 * ✨ Universal Prettier & Code Formatter Extension
 * 
 * ID: indoctrinated.ext.prettier-formatter
 * Integrates multi-language code formatting directly into the Monaco editor,
 * supporting Document Formatting, Range Formatting, and Format-on-Save.
 */

import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { formatterService } from '../../services/formatterService'

export const prettierExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.prettier-formatter',
  name: 'Universal Code Formatter (Prettier)',
  version: '1.0.0',
  description: 'Enterprise multi-language code formatting engine for TypeScript, JS, HTML, CSS, JSON, Markdown, YAML, Python, Rust, Go, and SQL.',
  author: 'indoctrinatedrecluse',
  type: 'Built-in',
  category: 'Tools',
  iconName: 'Sparkles',
  status: 'Active',
  snippetsCount: 12,
  languages: [
    { id: 'typescript', extensions: ['.ts', '.tsx'], aliases: ['TypeScript', 'TS', 'TSX'] },
    { id: 'javascript', extensions: ['.js', '.jsx', '.mjs', '.cjs'], aliases: ['JavaScript', 'JS', 'JSX'] },
    { id: 'json', extensions: ['.json', '.jsonc'], aliases: ['JSON', 'JSONC'] },
    { id: 'html', extensions: ['.html', '.htm', '.xml', '.svg'], aliases: ['HTML', 'XML', 'SVG'] },
    { id: 'css', extensions: ['.css', '.scss', '.less'], aliases: ['CSS', 'SCSS', 'LESS'] },
    { id: 'markdown', extensions: ['.md', '.markdown'], aliases: ['Markdown', 'MD'] },
    { id: 'yaml', extensions: ['.yaml', '.yml'], aliases: ['YAML', 'YML'] },
    { id: 'python', extensions: ['.py'], aliases: ['Python', 'PY'] },
    { id: 'rust', extensions: ['.rs'], aliases: ['Rust', 'RS'] },
    { id: 'go', extensions: ['.go'], aliases: ['Go', 'Golang'] },
    { id: 'sql', extensions: ['.sql'], aliases: ['SQL', 'PostgreSQL', 'MySQL'] },
  ],
}

const SUPPORTED_LANGUAGES = [
  'typescript',
  'javascript',
  'json',
  'html',
  'css',
  'scss',
  'less',
  'markdown',
  'yaml',
  'python',
  'rust',
  'go',
  'sql',
  'xml',
]

export function registerPrettierExtension(monacoInstance: typeof monaco): void {
  for (const lang of SUPPORTED_LANGUAGES) {
    try {
      // 1. Document Formatting Edit Provider
      monacoInstance.languages.registerDocumentFormattingEditProvider(lang, {
        async provideDocumentFormattingEdits(model) {
          const text = model.getValue()
          const result = await formatterService.formatDocument(text, lang)
          if (!result.hasChanges) return []

          const fullRange = model.getFullModelRange()
          return [
            {
              range: fullRange,
              text: result.formatted,
            },
          ]
        },
      })

      // 2. Document Range Formatting Edit Provider
      monacoInstance.languages.registerDocumentRangeFormattingEditProvider(lang, {
        async provideDocumentRangeFormattingEdits(model, range) {
          const text = model.getValue()
          const result = await formatterService.formatRange(
            text,
            range.startLineNumber,
            range.endLineNumber,
            lang
          )
          if (!result.hasChanges) return []

          const fullRange = model.getFullModelRange()
          return [
            {
              range: fullRange,
              text: result.formatted,
            },
          ]
        },
      })
    } catch {
      // ignore registration if language already has formatting provider
    }
  }

  // Register Formatter Configuration Snippets for .prettierrc & .editorconfig
  try {
    monacoInstance.languages.registerCompletionItemProvider('json', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        return {
          suggestions: [
            {
              label: 'prettierrc-config',
              kind: monacoInstance.languages.CompletionItemKind.Snippet,
              insertText: [
                '{',
                '  "semi": ${1:true},',
                '  "singleQuote": ${2:true},',
                '  "tabWidth": ${3:2},',
                '  "trailingComma": "${4|es5,all,none|}",',
                '  "printWidth": ${5:80},',
                '  "bracketSpacing": ${6:true}',
                '}',
              ].join('\n'),
              insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Standard Prettier Configuration Schema',
              range,
            },
          ],
        }
      },
    })
  } catch {
    // ignore
  }
}

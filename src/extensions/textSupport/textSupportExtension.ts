import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { textileLanguageConfiguration, textileMonarchLanguage } from './textileGrammar'
import {
  rstLanguageConfiguration,
  rstMonarchLanguage,
  adocLanguageConfiguration,
  adocMonarchLanguage,
  logMonarchLanguage,
} from './rstAndAdocGrammar'
import {
  textileSnippets,
  markdownSnippets,
  plaintextSnippets,
  rstSnippets,
  adocSnippets,
} from './textSnippets'

const csvMonarchLanguage: monaco.languages.IMonarchLanguage = {
  tokenizer: {
    root: [
      [/"([^"]|"")*"/, 'string'],
      [/,/, 'delimiter'],
      [/\b-?\d+(\.\d+)?\b/, 'number'],
      [/\b(true|false|null|NULL|NA)\b/, 'keyword'],
      [/[^,"\r\n]+/, 'identifier'],
    ],
  },
}

const csvSnippets = [
  {
    label: 'csv-table-header',
    detail: 'CSV Table with Header',
    documentation: 'Insert a standard RFC 4180 CSV header and sample rows',
    insertText: [
      'id,name,email,role',
      '1,"${1:Alice Smith}",${2:alice@example.com},${3:admin}',
      '2,"${4:Bob Jones}",${5:bob@example.com},${6:developer}',
    ].join('\n'),
  },
]

export const textSupportManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.text-pack',
  name: 'Universal Text & Prose Language Pack',
  version: '1.0.0',
  description: 'Rich syntax highlighting, Monarch tokenizers, and snippets for Plain Text, Markdown, Redmine Textile, reStructuredText, AsciiDoc, CSV, and Logs.',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'FileText',
  status: 'Active',
  type: 'Built-in',
  snippetsCount:
    textileSnippets.length +
    markdownSnippets.length +
    plaintextSnippets.length +
    rstSnippets.length +
    adocSnippets.length +
    csvSnippets.length,
  languages: [
    {
      id: 'textile',
      extensions: ['.textile'],
      aliases: ['Redmine Textile', 'Textile', 'textile'],
      mimetypes: ['text/x-textile'],
      configuration: textileLanguageConfiguration,
      monarchTokensProvider: textileMonarchLanguage,
      snippets: textileSnippets,
    },
    {
      id: 'markdown',
      extensions: ['.md', '.markdown', '.mdown', '.mkd'],
      aliases: ['Markdown', 'markdown'],
      mimetypes: ['text/x-markdown', 'text/markdown'],
      snippets: markdownSnippets,
    },
    {
      id: 'plaintext',
      extensions: ['.txt', '.text'],
      aliases: ['Plain Text', 'plaintext', 'text'],
      mimetypes: ['text/plain'],
      snippets: plaintextSnippets,
    },
    {
      id: 'rst',
      extensions: ['.rst', '.rest'],
      aliases: ['reStructuredText', 'rst', 'rest'],
      mimetypes: ['text/x-rst'],
      configuration: rstLanguageConfiguration,
      monarchTokensProvider: rstMonarchLanguage,
      snippets: rstSnippets,
    },
    {
      id: 'adoc',
      extensions: ['.adoc', '.asciidoc'],
      aliases: ['AsciiDoc', 'adoc', 'asciidoc'],
      mimetypes: ['text/x-asciidoc'],
      configuration: adocLanguageConfiguration,
      monarchTokensProvider: adocMonarchLanguage,
      snippets: adocSnippets,
    },
    {
      id: 'log',
      extensions: ['.log'],
      aliases: ['Log File', 'log'],
      mimetypes: ['text/x-log'],
      monarchTokensProvider: logMonarchLanguage,
      snippets: plaintextSnippets,
    },
    {
      id: 'csv',
      extensions: ['.csv', '.tsv'],
      aliases: ['CSV', 'TSV', 'csv'],
      mimetypes: ['text/csv', 'text/tab-separated-values'],
      monarchTokensProvider: csvMonarchLanguage,
      snippets: csvSnippets,
    },
    {
      id: 'pdf',
      extensions: ['.pdf'],
      aliases: ['PDF Document', 'PDF', 'pdf'],
      mimetypes: ['application/pdf'],
    },
    {
      id: 'docx',
      extensions: ['.docx', '.doc'],
      aliases: ['Microsoft Word', 'Word Document', 'docx', 'doc'],
      mimetypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
    },
  ],
}

// Track if already registered to avoid duplicated Monaco providers

export function registerTextSupportExtension(monacoInstance: typeof monaco): monaco.IDisposable[] {
  const disposables: monaco.IDisposable[] = []
  if (!monacoInstance) return disposables

  textSupportManifest.languages?.forEach((lang) => {
    // 1. Register language if not already known to Monaco
    const existing = monacoInstance.languages.getLanguages().some((l) => l.id === lang.id)
    if (!existing) {
      monacoInstance.languages.register({
        id: lang.id,
        extensions: lang.extensions,
        aliases: lang.aliases,
        mimetypes: lang.mimetypes,
      })
    }

    // 2. Set Language Configuration (brackets, comments, autoclose)
    if (lang.configuration) {
      const d = monacoInstance.languages.setLanguageConfiguration(lang.id, lang.configuration)
      if (d) disposables.push(d)
    }

    // 3. Set Monarch Tokens Provider (syntax tokenizer)
    if (lang.monarchTokensProvider) {
      const d = monacoInstance.languages.setMonarchTokensProvider(lang.id, lang.monarchTokensProvider)
      if (d) disposables.push(d)
    }

    // 4. Register Completion Item Provider for Snippets
    if (lang.snippets && lang.snippets.length > 0) {
      const d = monacoInstance.languages.registerCompletionItemProvider(lang.id, {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position)
          const range: monaco.IRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          }

          const suggestions: monaco.languages.CompletionItem[] = (lang.snippets || []).map((snippet) => ({
            label: snippet.label,
            kind: monacoInstance.languages.CompletionItemKind.Snippet,
            detail: snippet.detail || `${lang.id} snippet`,
            documentation: snippet.documentation,
            insertText: snippet.insertText,
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          }))

          return { suggestions }
        },
      })
      if (d) disposables.push(d)
    }
  })

  return disposables
}

import * as monaco from 'monaco-editor'

// --- reStructuredText (reST) ---
export const rstLanguageConfiguration: monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: '..',
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '`', close: '`' },
    { open: '"', close: '"' },
    { open: '**', close: '**' },
    { open: '*', close: '*' },
  ],
}

export const rstMonarchLanguage: monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.rst',
  tokenizer: {
    root: [
      // Directives .. note::, .. code-block::
      [/^\s*\.\.\s+[a-zA-Z0-9_\-]+::/, 'keyword.directive'],
      [/^\s*\.\.\s+_[a-zA-Z0-9_\-]+:/, 'string.link.target'],
      [/^\s*\.\..*$/, 'comment'],

      // Section underlines/overlines (===, ---, ~~~, ^^^, """)
      [/^[=\-`:'"~^_*+#<>]{3,}$/, 'markup.heading'],

      // Roles :ref:`label`, :doc:`file`, :code:`x`
      [/:\w+:`[^`]+`/, 'variable.parameter'],

      // Inline code
      [/``[^`]+``/, 'markup.raw.inline'],

      // Strong / Emphasis
      [/\*\*[^*]+\*\*/, 'markup.bold'],
      [/\*[^*]+\*/, 'markup.italic'],

      // References & Links `text <url>`_ or `text`_
      [/`[^`]+`__?/, 'string.link'],

      // Lists & bullets
      [/^\s*[\*\-+]\s+/, 'markup.list.bullet'],
      [/^\s*(\d+|\#)\.\s+/, 'markup.list.number'],
    ],
  },
}

// --- AsciiDoc (.adoc) ---
export const adocLanguageConfiguration: monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: '//',
    blockComment: ['////', '////'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '`', close: '`' },
    { open: '"', close: '"' },
    { open: '*', close: '*' },
    { open: '_', close: '_' },
  ],
}

export const adocMonarchLanguage: monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.adoc',
  tokenizer: {
    root: [
      // Section headers: = Document Title, == Section 1, === Section 2
      [/^={1,6}\s+.*$/, 'markup.heading'],

      // Admonitions: NOTE:, TIP:, WARNING:, IMPORTANT:, CAUTION:
      [/^(NOTE|TIP|IMPORTANT|WARNING|CAUTION):\s/, 'keyword.admonition'],

      // Block attributes [source,python], [quote]
      [/^\[[^\]]+\]$/, 'variable.parameter'],

      // Block delimiters ----, ===, ****, ____
      [/^(\-{4,}|\={4,}|\*{4,}|\_{4,})$/, 'keyword.delimiter'],

      // Source / Code block
      [/`[^`]+`/, 'markup.raw.inline'],

      // Bold & Italic
      [/\*[^*]+\*/, 'markup.bold'],
      [/_[^_]+_/, 'markup.italic'],

      // Comments
      [/^\/\/\/\/.*$/, 'comment', '@blockComment'],
      [/^\/\/.*$/, 'comment'],

      // Macros and links image::path[], link:url[]
      [/(image|video|audio|include|link)::[^\[]*\[[^\]]*\]/, 'string.link'],
    ],

    blockComment: [
      [/^\/\/\/\/$/, 'comment', '@pop'],
      [/.*$/, 'comment'],
    ],
  },
}

// --- Log / Plaintext Highlighting ---
export const logMonarchLanguage: monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.log',
  tokenizer: {
    root: [
      // Log Levels with crisp theme-aware token mapping
      [/\b(FATAL|CRITICAL|EMERGENCY)\b/, 'keyword.error'],
      [/\b(ERROR|ERR|FAIL|FAILED|FAILURE)\b/, 'keyword.error'],
      [/\b(WARN|WARNING)\b/, 'keyword.warn'],
      [/\b(INFO|NOTICE|STATUS)\b/, 'keyword.info'],
      [/\b(DEBUG|TRACE|VERBOSE)\b/, 'keyword.debug'],
      [/\b(SUCCESS|OK|PASSED)\b/, 'keyword.success'],

      // Timestamps & ISO dates (e.g. 2026-09-15 20:30:00.123 or 2026-09-15T20:30:00Z)
      [/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?\b/, 'type.timestamp'],
      [/\b\d{2}:\d{2}:\d{2}(\.\d+)?\b/, 'type.timestamp'],

      // IP Addresses & UUIDs
      [/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b/, 'number.ip'],
      [/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/, 'string.uuid'],

      // HTTP Methods & Status Codes
      [/\b(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/, 'keyword.http'],
      [/\b(200|201|204|301|302|304|400|401|403|404|500|502|503|504)\b/, 'number.http'],

      // URLs
      [/https?:\/\/[^\s]+/, 'string.link'],
    ],
  },
}

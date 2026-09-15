import * as monaco from 'monaco-editor'

export const textileLanguageConfiguration: monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: '###',
    blockComment: ['<!--', '-->'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
    ['<', '>'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '<', close: '>' },
    { open: '"', close: '"' },
    { open: '*', close: '*' },
    { open: '_', close: '_' },
    { open: '@', close: '@' },
    { open: '+', close: '+' },
    { open: '-', close: '-' },
    { open: '~', close: '~' },
    { open: '^', close: '^' },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '<', close: '>' },
    { open: '"', close: '"' },
    { open: '*', close: '*' },
    { open: '_', close: '_' },
    { open: '@', close: '@' },
    { open: '+', close: '+' },
    { open: '-', close: '-' },
    { open: '~', close: '~' },
    { open: '^', close: '^' },
  ],
  wordPattern: /(-?\d*\.\d\w*)|([^`~!@#%^&*()\-=+[{\]}\\|;:'",.<>/?\s]+)/g,
}

export const textileMonarchLanguage: monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.textile',

  keywords: [
    'toc',
    'collapse',
    'include',
    'macro',
    'child_pages',
  ],

  tokenizer: {
    root: [
      // Redmine Macros {{toc}}, {{collapse(...) ...}}
      [/\{\{[a-zA-Z0-9_-]+/, { token: 'keyword.macro', bracket: '@open', next: '@macro' }],

      // Redmine Wiki Links [[Wiki Page]], [[project:Wiki Page|Title]]
      [/\[\[[^\]|]+(\|[^\]]+)?\]\]/, 'string.link.wiki'],

      // Redmine Issue Links #1234, ##1234, issue:123
      [/#\d+/, 'number.issue'],
      [/(issue|issues)(:|#)\d+/, 'number.issue'],
      [/(commit|revision|changeset):[a-f0-9]+/, 'keyword.commit'],
      [/source:[^\s]+/, 'string.source'],
      [/version:[^\s]+/, 'type.version'],

      // Section Headers: h1. Title, h2(class). Title, h3>. Title
      [/^h[1-6]([<>=()#._-]+)?\.\s.*$/, 'markup.heading'],

      // Blockquote: bq. or bq..
      [/^bq(\.\.|\.)\s/, 'markup.quote'],

      // Block Code: bc. or bc.. or pre.
      [/^bc(\.\.|\.)/, 'markup.raw.block', '@blockCode'],
      [/^pre(\.\.|\.)/, 'markup.raw.block', '@blockCode'],
      [/<pre><code>/, 'markup.raw.block', '@htmlCode'],

      // Paragraph markers: p. or p>. or p=.
      [/^p([<>=()#._-]+)?\.\s/, 'keyword.paragraph'],

      // Lists: Unordered * , ** , *** or Ordered # , ## , ###
      [/^(\*+)\s/, 'markup.list.bullet'],
      [/^(#+)\s/, 'markup.list.number'],
      [/^(-+)\s/, 'markup.list.bullet'],

      // Tables: |_. Header | or | Cell |
      [/^\|.*\|$/, { token: 'markup.table', next: '@table' }],
      [/^\|/, { token: 'markup.table', next: '@table' }],

      // HTML tags (Redmine supports standard HTML tags)
      [/<(\w+)[^>]*>/, 'tag'],
      [/<\/(\w+)>/, 'tag'],

      // Inline Code: @code snippet@
      [/@[^@\n]+@/, 'markup.raw.inline'],

      // Links: "link title(link tooltip)":https://example.com or "link title":url
      [/"[^"\n]+(\([^)]+\))?":((https?:\/\/|www\.)[^\s]+|\/[^\s]*|#[^\s]*)/, 'string.link'],

      // Images: !image_url(alt)! or !image_url!:https://...
      [/![^\s!]+(\([^)]+\))?!(:((https?:\/\/|www\.)[^\s]+))?/, 'string.image'],

      // Bold: *bold text*
      [/(^|\s)\*([^*\s\n]|([^*\s\n][^*\n]*[^*\s\n]))\*($|\s)/, 'markup.bold'],

      // Italic: _italic text_
      [/(^|\s)_([^_\s\n]|([^_\s\n][^_\n]*[^_\s\n]))_($|\s)/, 'markup.italic'],

      // Underline / Inserted: +inserted text+
      [/(^|\s)\+([^+\s\n]|([^+\s\n][^+\n]*[^+\s\n]))\+($|\s)/, 'markup.underline'],

      // Strikethrough / Deleted: -deleted text-
      [/(^|\s)-([^-\s\n]|([^-\s\n][^-\n]*[^-\s\n]))-($|\s)/, 'markup.strikethrough'],

      // Superscript: ^super^ and Subscript: ~sub~
      [/\^[^\^\s\n]+\^/, 'markup.superscript'],
      [/~[^~\s\n]+~/, 'markup.subscript'],

      // HTML comments
      [/<!--/, 'comment', '@comment'],
    ],

    macro: [
      [/\}\}/, { token: 'keyword.macro', bracket: '@close', next: '@pop' }],
      [/[(,)]/, 'delimiter'],
      [/[a-zA-Z0-9_\-./:]+/, 'string'],
      [/./, 'keyword.macro'],
    ],

    table: [
      [/\|_\.[^|]*/, 'markup.table.header'],
      [/\|[^|]*/, 'markup.table.cell'],
      [/$/, 'markup.table', '@pop'],
    ],

    blockCode: [
      [/^(p|h[1-6]|bq|bc)(\.\.|\.)\s/, { token: '@rematch', next: '@pop' }],
      [/^```/, { token: 'markup.raw.block', next: '@pop' }],
      [/.*$/, 'markup.raw.block'],
    ],

    htmlCode: [
      [/<\/code><\/pre>/, 'markup.raw.block', '@pop'],
      [/.*$/, 'markup.raw.block'],
    ],

    comment: [
      [/[^-]+/, 'comment'],
      [/-->/, 'comment', '@pop'],
      [/-/, 'comment'],
    ],
  },
}

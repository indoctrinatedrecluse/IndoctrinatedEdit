import { SnippetDefinition } from '../extensionTypes'

// --- Redmine Textile Snippets ---
export const textileSnippets: SnippetDefinition[] = [
  {
    label: 'h1',
    detail: 'Textile: Heading Level 1',
    documentation: 'Insert a top-level section header (h1.)',
    insertText: 'h1. ${1:Heading Title}\n\n$0',
  },
  {
    label: 'h2',
    detail: 'Textile: Heading Level 2',
    documentation: 'Insert a sub-heading (h2.)',
    insertText: 'h2. ${1:Subheading}\n\n$0',
  },
  {
    label: 'h3',
    detail: 'Textile: Heading Level 3',
    documentation: 'Insert a level 3 heading (h3.)',
    insertText: 'h3. ${1:Section}\n\n$0',
  },
  {
    label: 'table',
    detail: 'Textile: Data Table',
    documentation: 'Insert a formatted Redmine Textile table with header row',
    insertText: '|_. ${1:Header 1} |_. ${2:Header 2} |_. ${3:Header 3} |\n| ${4:Value 1}  | ${5:Value 2}  | ${6:Value 3}  |\n| ${7:Value 4}  | ${8:Value 5}  | ${9:Value 6}  |\n$0',
  },
  {
    label: 'bc',
    detail: 'Textile: Block Code (bc.)',
    documentation: 'Insert a block code snippet in Textile format',
    insertText: 'bc. ${1:// Code goes here}\n\n$0',
  },
  {
    label: 'bc..',
    detail: 'Textile: Multi-paragraph Code Block',
    documentation: 'Insert a multi-paragraph block code section',
    insertText: 'bc.. ${1:// Multi-line code block}\n\np. $0',
  },
  {
    label: 'precode',
    detail: 'Textile: HTML Pre/Code Block',
    documentation: 'Insert standard Redmine syntax-highlighted code block',
    insertText: '<pre><code class="${1|javascript,typescript,python,ruby,sql,html,css,bash|}">\n${2:// Code snippet}\n</code></pre>\n$0',
  },
  {
    label: 'bq',
    detail: 'Textile: Blockquote',
    documentation: 'Insert a blockquote quote paragraph',
    insertText: 'bq. ${1:Quote text}\n\n$0',
  },
  {
    label: 'toc',
    detail: 'Redmine: Table of Contents Macro',
    documentation: 'Insert the {{toc}} table of contents macro',
    insertText: '{{toc}}\n\n$0',
  },
  {
    label: 'collapse',
    detail: 'Redmine: Collapsible Section Macro',
    documentation: 'Insert a collapsible dropdown section {{collapse(...)}}',
    insertText: '{{collapse(${1:Click to expand...})\n${2:Hidden contents and details here}\n}}\n$0',
  },
  {
    label: 'issue',
    detail: 'Redmine: Issue Reference (#123)',
    documentation: 'Reference a Redmine issue by ID',
    insertText: '#${1:1234} $0',
  },
  {
    label: 'link',
    detail: 'Textile: External Link',
    documentation: 'Insert a Textile named link with URL',
    insertText: '"${1:Link Text}":${2:https://example.com} $0',
  },
  {
    label: 'img',
    detail: 'Textile: Image Embed',
    documentation: 'Insert an image in Textile format',
    insertText: '!${1:image_url}(${2:alt_text})! $0',
  },
  {
    label: 'tasklist',
    detail: 'Textile: Task / Checklist',
    documentation: 'Insert a bulleted task list',
    insertText: '* [ ] ${1:Task item 1}\n* [ ] ${2:Task item 2}\n* [x] ${3:Completed task}\n$0',
  },
]

// --- Enhanced Markdown Snippets ---
export const markdownSnippets: SnippetDefinition[] = [
  {
    label: 'table',
    detail: 'Markdown: GFM Table',
    documentation: 'Insert a GitHub Flavored Markdown table',
    insertText: '| ${1:Header 1} | ${2:Header 2} | ${3:Header 3} |\n| :--- | :--- | :--- |\n| ${4:Cell 1} | ${5:Cell 2} | ${6:Cell 3} |\n| ${7:Cell 4} | ${8:Cell 5} | ${9:Cell 6} |\n$0',
  },
  {
    label: 'alert-note',
    detail: 'Markdown: GitHub Alert [!NOTE]',
    documentation: 'Insert a GitHub-style [!NOTE] callout box',
    insertText: '> [!NOTE]\n> ${1:Informational note and context}\n$0',
  },
  {
    label: 'alert-tip',
    detail: 'Markdown: GitHub Alert [!TIP]',
    documentation: 'Insert a GitHub-style [!TIP] callout box',
    insertText: '> [!TIP]\n> ${1:Helpful tip or optimization}\n$0',
  },
  {
    label: 'alert-important',
    detail: 'Markdown: GitHub Alert [!IMPORTANT]',
    documentation: 'Insert a GitHub-style [!IMPORTANT] callout box',
    insertText: '> [!IMPORTANT]\n> ${1:Crucial requirement or instruction}\n$0',
  },
  {
    label: 'alert-warning',
    detail: 'Markdown: GitHub Alert [!WARNING]',
    documentation: 'Insert a GitHub-style [!WARNING] callout box',
    insertText: '> [!WARNING]\n> ${1:Critical warning or breaking change}\n$0',
  },
  {
    label: 'codeblock',
    detail: 'Markdown: Fenced Code Block',
    documentation: 'Insert a fenced code block with language specifier',
    insertText: '```${1|typescript,javascript,python,rust,go,html,css,json,bash|}\n${2:// Code here}\n```\n$0',
  },
  {
    label: 'frontmatter',
    detail: 'Markdown: YAML Frontmatter',
    documentation: 'Insert a YAML metadata frontmatter block',
    insertText: '---\ntitle: "${1:Document Title}"\ndate: "${2:2026-09-15}"\nauthor: "${3:indoctrinatedrecluse}"\ntags: [${4:guide, docs}]\n---\n\n# $1\n\n$0',
  },
  {
    label: 'details',
    detail: 'Markdown: Collapsible <details> Block',
    documentation: 'Insert an HTML5 collapsible details disclosure widget',
    insertText: '<details>\n  <summary>${1:Click to expand}</summary>\n\n  ${2:Hidden contents here}\n</details>\n$0',
  },
  {
    label: 'badge',
    detail: 'Markdown: Shields.io Badge',
    documentation: 'Insert a status badge from shields.io',
    insertText: '![${1:Badge Label}](https://img.shields.io/badge/${2:label}-${3:value}-${4:blue}?style=flat-square) $0',
  },
]

// --- Plaintext / Note Snippets ---
export const plaintextSnippets: SnippetDefinition[] = [
  {
    label: 'todo',
    detail: 'Plaintext: Action Item',
    documentation: 'Insert a timestamped TODO item',
    insertText: '[TODO] ${1:Task description} (Created: ${2:2026-09-15}) $0',
  },
  {
    label: 'header',
    detail: 'Plaintext: Boxed Header Banner',
    documentation: 'Insert an ASCII divider banner for text documentation',
    insertText: '================================================================================\n  ${1:SECTION TITLE}\n================================================================================\n$0',
  },
  {
    label: 'divider',
    detail: 'Plaintext: Horizontal Divider',
    documentation: 'Insert a divider line',
    insertText: '--------------------------------------------------------------------------------\n$0',
  },
  {
    label: 'changelog-entry',
    detail: 'Plaintext: Changelog Item',
    documentation: 'Insert a changelog version entry',
    insertText: '## [${1:1.0.0}] - ${2:2026-09-15}\n### ${3|Added,Changed,Deprecated,Removed,Fixed,Security|}\n- ${4:Description of change}\n$0',
  },
]

// --- reStructuredText Snippets ---
export const rstSnippets: SnippetDefinition[] = [
  {
    label: 'directive-code',
    detail: 'reST: Code Block Directive',
    documentation: 'Insert .. code-block:: directive',
    insertText: '.. code-block:: ${1|python,javascript,c,cpp,bash|}\n\n   ${2:# Code goes here}\n$0',
  },
  {
    label: 'directive-note',
    detail: 'reST: Note Admonition',
    documentation: 'Insert .. note:: directive',
    insertText: '.. note::\n\n   ${1:Note content goes here}\n$0',
  },
  {
    label: 'directive-warning',
    detail: 'reST: Warning Admonition',
    documentation: 'Insert .. warning:: directive',
    insertText: '.. warning::\n\n   ${1:Warning content goes here}\n$0',
  },
]

// --- AsciiDoc Snippets ---
export const adocSnippets: SnippetDefinition[] = [
  {
    label: 'source',
    detail: 'AsciiDoc: Source Code Block',
    documentation: 'Insert [source,lang] block',
    insertText: '[source,${1|java,python,rust,typescript,bash|}]\n----\n${2:// Code here}\n----\n$0',
  },
  {
    label: 'admonition-note',
    detail: 'AsciiDoc: NOTE Admonition',
    documentation: 'Insert NOTE: block',
    insertText: 'NOTE: ${1:Note description here}\n\n$0',
  },
  {
    label: 'admonition-tip',
    detail: 'AsciiDoc: TIP Admonition',
    documentation: 'Insert TIP: block',
    insertText: 'TIP: ${1:Tip recommendation here}\n\n$0',
  },
]

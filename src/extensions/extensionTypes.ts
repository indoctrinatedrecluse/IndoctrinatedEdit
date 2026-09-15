import * as monaco from 'monaco-editor'

export type ExtensionCategory = 'Languages' | 'Themes' | 'Snippets' | 'Linters' | 'AI' | 'Tools'
export type ExtensionStatus = 'Active' | 'Installed' | 'Disabled' | 'Running'

export interface SnippetDefinition {
  label: string
  detail?: string
  documentation?: string
  insertText: string
  insertTextRules?: monaco.languages.CompletionItemInsertTextRule
}

export interface LanguageContribution {
  id: string
  extensions: string[]
  aliases?: string[]
  mimetypes?: string[]
  configuration?: monaco.languages.LanguageConfiguration
  monarchTokensProvider?: monaco.languages.IMonarchLanguage
  snippets?: SnippetDefinition[]
}

export interface ExtensionManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  category: ExtensionCategory
  iconName?: string // Name of lucide icon
  status: ExtensionStatus
  type: 'Built-in' | 'Microservice' | 'Community'
  languages?: LanguageContribution[]
  snippetsCount?: number
}

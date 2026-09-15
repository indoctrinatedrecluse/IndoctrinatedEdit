/**
 * Core type definitions for the IndoctrinatedEdit SDK.
 */

export enum ThemeType {
  Dark = 'dark',
  Light = 'light',
}

export interface SyntaxTokenRule {
  token: string
  foreground: string
  fontStyle?: 'italic' | 'bold' | 'underline'
}

export interface GlassPalette {
  /** Frosted glass viewport background rgba */
  glassBackground: string
  /** Blur filter intensity (e.g., '28px') */
  glassBlurRadius: string
  /** Color saturation boost (e.g., '190%') */
  glassSaturation: string
  /** Specular border color (e.g., 'rgba(255, 255, 255, 0.16)') */
  specularBorder: string
  /** Ambient accent illumination (e.g., 'rgba(0, 122, 255, 0.45)') */
  accentGlow: string
  /** Primary text color */
  textPrimary: string
  /** Secondary/muted text color */
  textMuted: string
  /** Sidebar background */
  sidebarBackground: string
  /** Titlebar background */
  titlebarBackground: string
  /** Status bar background */
  statusBarBackground: string
  /** Syntax highlighting rules for Monaco editor */
  tokenRules: SyntaxTokenRule[]
}

export interface LanguageDefinition {
  id: string
  displayName: string
  extensions: string[]
  aliases?: string[]
  filenames?: string[]
}

export interface IStatusBarItem {
  id: string
  text: string
  tooltip?: string
  alignment: 'left' | 'right'
  priority?: number
  icon?: string
  onClick?: () => void
}

export interface InlineCompletionContext {
  line: number
  column: number
  lineContent: string
  fullContent: string
  languageId: string
}

export interface IInlineCompletion {
  insertText: string
}

export interface IInlineCompletionProvider {
  provideInlineCompletions(context: InlineCompletionContext): Promise<IInlineCompletion[] | null>
}

export interface ToolchainCheckResult {
  toolName: string
  installed: boolean
  version?: string
  path?: string
  error?: string
}

export interface IToolchainCheck {
  toolName: string
  checkAsync(): Promise<ToolchainCheckResult>
}

/* =========================================================================
 * Git & Visual Graph Contracts
 * ========================================================================= */

export type GitFileStatusCode = 'M' | 'A' | 'D' | '?' | 'R' | 'U'

export interface GitFileChange {
  path: string
  status: GitFileStatusCode
  isStaged: boolean
}

export interface GitCommit {
  hash: string
  shortHash: string
  authorName: string
  authorEmail: string
  date: string
  relativeDate: string
  message: string
  parents: string[]
  refs: string[]
  trackIndex?: number
}

export interface GitRepoStatus {
  isRepo: boolean
  branch: string
  ahead: number
  behind: number
  staged: GitFileChange[]
  working: GitFileChange[]
  commits: GitCommit[]
}

/* =========================================================================
 * UI View Contribution Contracts
 * ========================================================================= */

export interface ViewContribution {
  id: string
  title: string
  icon: string
  location: 'activitybar' | 'panel' | 'bottom'
}

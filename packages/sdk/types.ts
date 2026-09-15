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
 * Compiler & SDK Auto-Detection Contracts
 * ========================================================================= */

export interface ToolchainDefinition {
  /** Unique identifier, e.g. 'toolchain.rust', 'toolchain.python' */
  id: string
  /** Display name, e.g. 'Rust Compiler (rustc)' */
  name: string
  /** Associated language id, e.g. 'rust', 'python', 'typescript' */
  language: string
  /** Binary executable names to search in PATH, e.g. ['rustc', 'cargo'] */
  binaryNames: string[]
  /** Argument used to query version (defaults to '--version') */
  versionFlag?: string
  /** Optional regex pattern string to extract version string from output */
  versionPattern?: string
  /** Official documentation or installation URL */
  downloadUrl?: string
  /** Description or category */
  description?: string
}

export interface DetectedToolchain {
  id: string
  name: string
  language: string
  found: boolean
  binaryName?: string
  path?: string
  version?: string
  lastChecked: number
  error?: string
}

export interface IToolchainRegistry {
  registerToolchain(definition: ToolchainDefinition): void
  unregisterToolchain(id: string): void
  getDefinitions(): ToolchainDefinition[]
  getDetectedToolchains(): DetectedToolchain[]
  detectAll(): Promise<DetectedToolchain[]>
  detectOne(id: string): Promise<DetectedToolchain | null>
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

/* =========================================================================
 * AI Multi-Model & Chat Contracts
 * ========================================================================= */

export type AiProvider = 'openai' | 'deepseek' | 'gemini' | 'claude' | 'ollama' | 'antigravity'

export interface AiModelOption {
  id: string
  name: string
  provider: AiProvider
  description?: string
  supportsReasoning?: boolean
}

export interface AiChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoning?: string
  timestamp: number
  attachment?: {
    type: 'selection' | 'file'
    fileName: string
    code: string
    startLine?: number
    endLine?: number
  }
}

export interface AiProviderConfig {
  provider: AiProvider
  apiKey?: string
  endpoint?: string
  modelId?: string
}

export interface AiStreamChunk {
  text?: string
  reasoning?: string
  done?: boolean
  error?: string
}

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

export type AiToolCategory = 'read' | 'write' | 'run' | 'browser' | 'git'

export type AiToolCallStatus = 'pending_approval' | 'approved' | 'executing' | 'completed' | 'failed' | 'rejected' | 'blocked_by_guardrail'

export interface AiToolParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  required?: boolean
  enum?: string[]
}

export interface AiToolDefinition {
  name: string
  description: string
  category: AiToolCategory
  parameters: Record<string, AiToolParameterSchema>
  requiredParams: string[]
  requiresApprovalByDefault?: boolean
}

export interface AiToolCall {
  id: string
  toolName: string
  arguments: Record<string, any>
  status: AiToolCallStatus
  category: AiToolCategory
  requestedAt: number
  executedAt?: number
  autoApproved?: boolean
  guardrailNote?: string
}

export interface AiToolResult {
  toolCallId: string
  toolName: string
  success: boolean
  output: string
  error?: string
  diff?: {
    filePath: string
    originalSnippet?: string
    newSnippet?: string
    fullContent?: string
    applied?: boolean
  }
}

export interface AiContextMention {
  type: 'file' | 'selection' | 'problems' | 'terminal' | 'git' | 'workspace'
  label: string
  description: string
  data?: any
}

export interface AiChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoning?: string
  timestamp: number
  attachment?: {
    type: 'selection' | 'file' | 'problems' | 'terminal' | 'git' | 'workspace'
    fileName?: string
    code?: string
    startLine?: number
    endLine?: number
    meta?: Record<string, any>
  }
  toolCalls?: AiToolCall[]
  toolResults?: AiToolResult[]
  isAgentTurn?: boolean
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
  toolCalls?: AiToolCall[]
}

export interface AiAutoApproveSettings {
  autoApproveRead: boolean
  autoApproveWrite: boolean
  autoApproveRun: boolean
  autoApproveBrowser: boolean
  autoApproveGit: boolean
  maxAutoIterations?: number
}

export type AutoApprovePreset = 'paranoid' | 'balanced' | 'autonomous'

/* =========================================================================
 * Antigravity Python SDK & Personal Account Contracts
 * ========================================================================= */

export interface AntigravityUserProfile {
  id: string
  email: string
  name: string
  picture?: string
  locale?: string
}

export interface AntigravitySession {
  userId: string
  email: string
  name: string
  picture?: string
  tier: 'personal' | 'pro' | 'enterprise'
  subscriptionActive: boolean
  tokenType: 'oauth' | 'adc' | 'session' | 'api_key'
  accessToken: string
  refreshToken?: string
  expiresAt: number
}

export interface AntigravityQuotaInfo {
  tier: string
  rpmLimit: number
  rpmRemaining: number
  tpmLimit: number
  tpmRemaining: number
  contextWindowTokens: number
  dailyComputesRemaining: number
  dailyComputesLimit: number
  activeModels: string[]
}

export interface AntigravitySidecarStatus {
  running: boolean
  port: number
  pid?: number
  pythonVersion?: string
  authStatus: 'authenticated' | 'unauthenticated' | 'authenticating' | 'error'
  activeSession?: AntigravitySession | null
}

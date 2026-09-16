import { ExtensionManifest, LanguageContribution } from '../extensions/extensionTypes'
import { notificationService } from './notificationService'

export interface ExtensionConflict {
  resource: string // e.g. file extension '.m', '.pl', languageId 'custom-dsl'
  claimants: Array<{
    extensionId: string
    extensionName: string
    languageId: string
    category?: string
  }>
  resolvedLanguageId: string
  resolutionStrategy: 'heuristic' | 'priority' | 'cycle-break' | 'fallback'
  details?: string
}

export interface LanguageResolutionResult {
  languageId: string
  extensionId?: string
  resolvedBy: 'exact' | 'heuristic' | 'priority' | 'monaco-default' | 'fallback'
  isFallback: boolean
}

/**
 * Heuristic signature rule for disambiguating file extensions claimed by multiple languages.
 */
interface ContentHeuristic {
  patterns: RegExp[]
  languageId: string
  weight: number
}

const CONTENT_HEURISTICS: Record<string, ContentHeuristic[]> = {
  // .m: Objective-C vs MATLAB / Octave vs Mercury
  'm': [
    { patterns: [/@interface\b/, /@implementation\b/, /#import\s+<Foundation\//, /#import\s+<UIKit\//], languageId: 'objective-c', weight: 10 },
    { patterns: [/\bfunction\s+.*=/, /\bmeshgrid\b/, /%[^\n]*/, /\bclc\s*;/, /\bclear\s+all\b/], languageId: 'matlab', weight: 8 },
    { patterns: [/:- module\b/, /:- interface\b/, /:- pred\b/], languageId: 'prolog', weight: 7 },
  ],
  // .pl: Prolog vs Perl
  'pl': [
    { patterns: [/:-/, /\?-/, /\bconsult\(/, /\bfindall\(/], languageId: 'prolog', weight: 10 },
    { patterns: [/use strict;/, /use warnings;/, /my\s+\$/, /sub\s+\w+\s*\{/], languageId: 'perl', weight: 9 },
  ],
  // .v: Coq vs Verilog / SystemVerilog
  'v': [
    { patterns: [/\bRequire\s+Import\b/, /\bInductive\b/, /\bLemma\b/, /\bProof\./, /\bQed\./], languageId: 'coq', weight: 10 },
    { patterns: [/\bmodule\b[\s\S]*?\bendmodule\b/, /\balways\s*@/, /\bwire\b/, /\breg\b/], languageId: 'systemverilog', weight: 9 },
  ],
  // .h: C vs C++ vs Objective-C
  'h': [
    { patterns: [/@interface\b/, /#import\s+[<"]/], languageId: 'objective-c', weight: 10 },
    { patterns: [/\bclass\s+\w+/, /\bnamespace\s+\w+/, /\btemplate\s*</, /\bstd::/], languageId: 'cpp', weight: 9 },
    { patterns: [/#ifndef\b/, /#define\b/, /typedef\s+struct/], languageId: 'c', weight: 5 },
  ],
  // .r: R vs Rust (rare) vs REBOL
  'r': [
    { patterns: [/library\(/, /<-/, /%>/, /\|\>/, /ggplot\(/], languageId: 'r', weight: 10 },
  ],
  // .ts / .tsx: React vs Angular vs Pure TypeScript
  'tsx': [
    { patterns: [/import\s+React/, /from\s+['"]react['"]/, /<[A-Z]\w*/], languageId: 'typescriptreact', weight: 10 },
  ],
  'ts': [
    { patterns: [/@Component\s*\(/, /@Injectable\s*\(/, /@NgModule\s*\(/], languageId: 'typescript', weight: 9 },
    { patterns: [/import\s+React/, /from\s+['"]react['"]/], languageId: 'typescriptreact', weight: 8 },
  ],
}

/**
 * Inter-Extension Conflict Resolution & Cyclic Dependency Arbiter Engine
 */
export class ConflictResolutionService {
  private static instance: ConflictResolutionService

  // Inverted file extension index: '.ext' -> Array of claimants
  private fileExtensionMap: Map<string, Array<{ extensionId: string; extensionName: string; language: LanguageContribution }>> = new Map()
  
  // Language alias graph for cycle detection: 'alias' -> 'targetLanguage'
  private aliasGraph: Map<string, string> = new Map()

  // Track resolved conflicts to avoid duplicate notifications
  private loggedConflicts: Set<string> = new Set()

  private constructor() {}

  public static getInstance(): ConflictResolutionService {
    if (!ConflictResolutionService.instance) {
      ConflictResolutionService.instance = new ConflictResolutionService()
    }
    return ConflictResolutionService.instance
  }

  /**
   * Rebuild the extension claimant registry from all active extension manifests.
   */
  public indexManifests(manifests: ExtensionManifest[]): void {
    this.fileExtensionMap.clear()
    this.aliasGraph.clear()

    for (const manifest of manifests) {
      if (!manifest.languages || manifest.status === 'Disabled') continue

      for (const lang of manifest.languages) {
        // Register file extensions
        for (const rawExt of lang.extensions) {
          const extKey = rawExt.startsWith('.') ? rawExt.slice(1).toLowerCase() : rawExt.toLowerCase()
          if (!this.fileExtensionMap.has(extKey)) {
            this.fileExtensionMap.set(extKey, [])
          }
          this.fileExtensionMap.get(extKey)!.push({
            extensionId: manifest.id,
            extensionName: manifest.name,
            language: lang,
          })
        }

        // Register language aliases for cycle checking
        if (lang.aliases) {
          for (const alias of lang.aliases) {
            const aliasKey = alias.toLowerCase()
            if (aliasKey !== lang.id.toLowerCase()) {
              this.aliasGraph.set(aliasKey, lang.id)
            }
          }
        }
      }
    }
  }

  /**
   * Resolves language for a given filename and optional content snippet.
   * Uses heuristic content inspection, cycle breaking, and deterministic priority.
   * Guaranteed NEVER to throw — gracefully returns a safe fallback.
   */
  public resolveLanguageForFilename(filename: string, fileContent?: string): LanguageResolutionResult {
    try {
      if (!filename || typeof filename !== 'string') {
        return { languageId: 'plaintext', resolvedBy: 'fallback', isFallback: true }
      }

      // Check for exact full filename matches first (e.g. 'Dockerfile', 'Containerfile', 'README.md')
      const basename = filename.split(/[/\\]/).pop() || filename
      const rawExt = basename.split('.').pop()?.toLowerCase() || ''
      const extKey = basename.toLowerCase() === rawExt ? basename.toLowerCase() : rawExt

      const claimants = this.fileExtensionMap.get(extKey)

      // Heuristic evaluation tier: If file content is provided and heuristics exist for this extension
      if (fileContent && CONTENT_HEURISTICS[extKey]) {
        const heuristicRes = this.evaluateHeuristics(extKey, fileContent, claimants)
        if (heuristicRes) {
          return heuristicRes
        }
      }

      // Case 1: No extensions claim this file extension -> Monaco default mapping or fallback
      if (!claimants || claimants.length === 0) {
        const monacoDefault = this.getStandardMonacoFallback(extKey)
        return {
          languageId: monacoDefault,
          resolvedBy: monacoDefault !== 'plaintext' ? 'monaco-default' : 'fallback',
          isFallback: monacoDefault === 'plaintext',
        }
      }

      // Case 2: Exactly one extension claims this file extension
      if (claimants.length === 1) {
        const canonicalLang = this.resolveAliasWithCycleCheck(claimants[0].language.id)
        return {
          languageId: canonicalLang,
          extensionId: claimants[0].extensionId,
          resolvedBy: 'exact',
          isFallback: false,
        }
      }

      // Case 3: Multiple extensions claim this file extension (Collision without content heuristic match)
      return this.disambiguateCollisionByPriority(extKey, claimants)
    } catch (err) {
      // The editor should NEVER crash on resolution errors
      notificationService.notifyWarning(
        'Language Resolution Engine',
        `Encountered unexpected resolution error for "${filename}": ${err instanceof Error ? err.message : String(err)}. Safely fell back to Monaco default syntax.`
      )
      return { languageId: 'plaintext', resolvedBy: 'fallback', isFallback: true }
    }
  }

  /**
   * Evaluates content heuristic patterns against file content.
   */
  private evaluateHeuristics(
    extKey: string,
    content: string,
    claimants?: Array<{ extensionId: string; extensionName: string; language: LanguageContribution }>
  ): LanguageResolutionResult | null {
    const heuristics = CONTENT_HEURISTICS[extKey]
    if (!heuristics || !content) return null

    let bestMatch: { languageId: string; score: number } | null = null

    for (const h of heuristics) {
      let matches = 0
      for (const pattern of h.patterns) {
        if (pattern.test(content)) {
          matches += 1
        }
      }
      if (matches > 0) {
        const score = matches * h.weight
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { languageId: h.languageId, score }
        }
      }
    }

    if (bestMatch) {
      const canonical = this.resolveAliasWithCycleCheck(bestMatch.languageId)
      const winningClaimant = claimants?.find((c) => c.language.id === canonical || c.language.id === bestMatch!.languageId)

      return {
        languageId: canonical,
        extensionId: winningClaimant?.extensionId,
        resolvedBy: 'heuristic',
        isFallback: false,
      }
    }

    return null
  }

  /**
   * Resolves language alias chains and strictly prevents cyclic recursion (e.g., A -> B -> C -> A).
   */
  public resolveAliasWithCycleCheck(startLanguage: string): string {
    const visited = new Set<string>()
    let current = startLanguage.toLowerCase()
    const chain: string[] = [current]
    const maxDepth = 12

    for (let depth = 0; depth < maxDepth; depth++) {
      visited.add(current)
      const next = this.aliasGraph.get(current)

      if (!next || next.toLowerCase() === current) {
        return current
      }

      const nextLower = next.toLowerCase()
      if (visited.has(nextLower)) {
        // Cycle detected! Break cycle immediately
        const cycleStr = [...chain, nextLower].join(' -> ')
        const conflictKey = `cycle:${cycleStr}`

        if (!this.loggedConflicts.has(conflictKey)) {
          this.loggedConflicts.add(conflictKey)
          notificationService.notifyWarning(
            'Extension Rule Arbiter',
            `Detected and broke cyclic language rule dependency (${cycleStr}). Auto-resolved safely to '${current}'.`
          )
        }

        // Break edge in alias graph to prevent repeating cycle checks
        this.aliasGraph.delete(current)
        return current
      }

      current = nextLower
      chain.push(current)
    }

    // Exceeded max depth, fallback to startLanguage
    return startLanguage
  }

  /**
   * Resolves collision via deterministic priority when content is empty or uninformative.
   */
  private disambiguateCollisionByPriority(
    extKey: string,
    claimants: Array<{ extensionId: string; extensionName: string; language: LanguageContribution }>
  ): LanguageResolutionResult {
    // Deterministic priority resolution: Built-in 'Languages' > 'Frameworks' > alphabetical extensionId
    const sortedClaimants = [...claimants].sort((a, b) => {
      const aIsLanguages = a.extensionId.includes('ext.') && !a.extensionId.includes('mega-pack')
      const bIsLanguages = b.extensionId.includes('ext.') && !b.extensionId.includes('mega-pack')
      if (aIsLanguages && !bIsLanguages) return -1
      if (!aIsLanguages && bIsLanguages) return 1
      return a.extensionId.localeCompare(b.extensionId)
    })

    const winner = sortedClaimants[0]
    const resolvedLang = this.resolveAliasWithCycleCheck(winner.language.id)

    const conflictKey = `collision:${extKey}:${claimants.map((c) => c.extensionId).join(',')}`
    if (!this.loggedConflicts.has(conflictKey)) {
      this.loggedConflicts.add(conflictKey)
      notificationService.notifyInfo(
        'Extension Conflict Resolution',
        `File extension '.${extKey}' is claimed by multiple extensions (${claimants.map((c) => c.extensionName).join(', ')}). Auto-resolved to '${winner.extensionName}' (${resolvedLang}).`
      )
    }

    return {
      languageId: resolvedLang,
      extensionId: winner.extensionId,
      resolvedBy: 'priority',
      isFallback: false,
    }
  }

  /**
   * Safely wraps a Monaco language registration or provider execution with auto-recovery and fallback.
   */
  public safeExecuteProvider<T>(
    providerName: string,
    languageId: string,
    action: () => T,
    fallbackValue: T
  ): T {
    try {
      return action()
    } catch (err) {
      notificationService.notifyError(
        'Extension Provider Fault',
        `Language provider '${providerName}' for '${languageId}' encountered an error: ${err instanceof Error ? err.message : String(err)}. Monaco gracefully fell back to default handler.`
      )
      return fallbackValue
    }
  }

  /**
   * Built-in standard Monaco language fallback mapping for extensions without explicit active contributions.
   */
  private getStandardMonacoFallback(ext: string): string {
    const fallbackMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      json: 'json',
      html: 'html',
      htm: 'html',
      css: 'css',
      scss: 'scss',
      less: 'less',
      md: 'markdown',
      markdown: 'markdown',
      py: 'python',
      rs: 'rust',
      go: 'go',
      cs: 'csharp',
      cpp: 'cpp',
      c: 'cpp',
      h: 'cpp',
      hpp: 'cpp',
      java: 'java',
      php: 'php',
      rb: 'ruby',
      swift: 'swift',
      kt: 'kotlin',
      kts: 'kotlin',
      sh: 'shell',
      bash: 'shell',
      zsh: 'shell',
      ps1: 'powershell',
      sql: 'sql',
      r: 'r',
      jl: 'julia',
      scala: 'scala',
      lua: 'lua',
      pl: 'prolog',
      sol: 'solidity',
      yaml: 'yaml',
      yml: 'yaml',
      xml: 'xml',
      toml: 'ini',
      ini: 'ini',
      log: 'log',
      txt: 'plaintext',
    }

    return fallbackMap[ext] || 'plaintext'
  }
}

export const conflictResolutionService = ConflictResolutionService.getInstance()

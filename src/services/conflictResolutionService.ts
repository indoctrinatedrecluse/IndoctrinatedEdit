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
  resolutionStrategy: 'project-context' | 'path-heuristic' | 'content-heuristic' | 'specialization-priority' | 'cycle-break' | 'fallback'
  details?: string
}

export interface LanguageResolutionResult {
  languageId: string
  extensionId?: string
  resolvedBy: 'exact' | 'project-context' | 'path-heuristic' | 'heuristic' | 'priority' | 'monaco-default' | 'fallback'
  isFallback: boolean
  confidence?: number
}

export type ProjectFrameworkType =
  | 'angular'
  | 'react'
  | 'vue'
  | 'svelte'
  | 'nest'
  | 'node'
  | 'python'
  | 'rust'
  | 'go'
  | 'dart'
  | 'dotnet'
  | 'java'
  | 'php'
  | 'solidity'
  | 'unknown'

export interface WorkspaceContextInfo {
  workspacePath?: string
  framework?: ProjectFrameworkType
  detectedMarkers?: string[]
  dependencies?: string[]
}

/**
 * Heuristic signature rule for disambiguating file extensions based on content inspection.
 */
interface ContentHeuristic {
  patterns: RegExp[]
  languageId: string
  targetExtensionId?: string
  weight: number
}

const CONTENT_HEURISTICS: Record<string, ContentHeuristic[]> = {
  // .m: Objective-C vs MATLAB / Octave vs Mercury
  'm': [
    { patterns: [/@interface\b/, /@implementation\b/, /#import\s+<Foundation\//, /#import\s+<UIKit\//], languageId: 'objective-c', targetExtensionId: 'indoctrinated.ext.swift-apple', weight: 10 },
    { patterns: [/\bfunction\s+.*=/, /\bmeshgrid\b/, /%[^\n]*/, /\bclc\s*;/, /\bclear\s+all\b/], languageId: 'matlab', targetExtensionId: 'indoctrinated.ext.datascience-scientific', weight: 8 },
    { patterns: [/:- module\b/, /:- interface\b/, /:- pred\b/], languageId: 'prolog', targetExtensionId: 'indoctrinated.ext.logic-formal-methods', weight: 7 },
  ],
  // .pl: Prolog vs Perl
  'pl': [
    { patterns: [/:-/, /\?-/, /\bconsult\(/, /\bfindall\(/], languageId: 'prolog', targetExtensionId: 'indoctrinated.ext.logic-formal-methods', weight: 10 },
    { patterns: [/use strict;/, /use warnings;/, /my\s+\$/, /sub\s+\w+\s*\{/], languageId: 'perl', targetExtensionId: 'indoctrinated.ext.backend-mega-pack', weight: 9 },
  ],
  // .v: Coq vs Verilog / SystemVerilog
  'v': [
    { patterns: [/\bRequire\s+Import\b/, /\bInductive\b/, /\bLemma\b/, /\bProof\./, /\bQed\./], languageId: 'coq', targetExtensionId: 'indoctrinated.ext.logic-formal-methods', weight: 10 },
    { patterns: [/\bmodule\b[\s\S]*?\bendmodule\b/, /\balways\s*@/, /\bwire\b/, /\breg\b/], languageId: 'systemverilog', targetExtensionId: 'indoctrinated.ext.devops-iac', weight: 9 },
  ],
  // .h: C vs C++ vs Objective-C
  'h': [
    { patterns: [/@interface\b/, /#import\s+[<"]/], languageId: 'objective-c', targetExtensionId: 'indoctrinated.ext.swift-apple', weight: 10 },
    { patterns: [/\bclass\s+\w+/, /\bnamespace\s+\w+/, /\btemplate\s*</, /\bstd::/], languageId: 'cpp', targetExtensionId: 'indoctrinated.ext.cpp-pack', weight: 9 },
    { patterns: [/#ifndef\b/, /#define\b/, /typedef\s+struct/], languageId: 'c', targetExtensionId: 'indoctrinated.ext.cpp-pack', weight: 5 },
  ],
  // .r: R vs Rust vs REBOL
  'r': [
    { patterns: [/library\(/, /<-/, /%>/, /\|\>/, /ggplot\(/], languageId: 'r', targetExtensionId: 'indoctrinated.ext.datascience-scientific', weight: 10 },
  ],
  // .ts / .tsx: React vs Angular vs NestJS vs Vanilla TypeScript
  'tsx': [
    { patterns: [/import\s+React/, /from\s+['"]react['"]/, /<[A-Z]\w*/, /className=/], languageId: 'typescriptreact', targetExtensionId: 'indoctrinated.ext.react-pack', weight: 10 },
  ],
  'ts': [
    { patterns: [/@Component\s*\(/, /@Injectable\s*\(/, /@NgModule\s*\(/, /@Directive\s*\(/, /templateUrl:/], languageId: 'typescript', targetExtensionId: 'indoctrinated.ext.angular-pack', weight: 10 },
    { patterns: [/@Controller\s*\(/, /@Get\s*\(/, /@Post\s*\(/, /@Module\s*\(/], languageId: 'typescript', targetExtensionId: 'indoctrinated.ext.backend-mega-pack', weight: 9 },
    { patterns: [/import\s+React/, /from\s+['"]react['"]/, /useState\s*\(/, /useEffect\s*\(/], languageId: 'typescriptreact', targetExtensionId: 'indoctrinated.ext.react-pack', weight: 8 },
  ],
  'vue': [
    { patterns: [/<template>/, /<script\s+setup/, /defineProps\s*\(/], languageId: 'vue', targetExtensionId: 'indoctrinated.ext.frontend-mega-pack', weight: 10 },
  ],
  'svelte': [
    { patterns: [/<script>/, /<style>/, /export\s+let\s+/], languageId: 'svelte', targetExtensionId: 'indoctrinated.ext.frontend-mega-pack', weight: 10 },
  ],
}

/**
 * Inter-Extension Conflict Resolution & Cyclic Dependency Arbiter Engine
 * 
 * Multi-Tier Strategy:
 * Tier 1: Project Build & Framework Context (Angular, React, Vue, Svelte, Nest, Rust, Go, Python, etc.)
 * Tier 2: File Location & Semantic Path Heuristics (e.g. /components/, /angular/, /controllers/)
 * Tier 3: In-File Content & AST/Token Signatures
 * Tier 4: Extension Category & Specialization Affinity Scoring
 * Tier 5: Deterministic Fallback & Cycle-Safe Monaco Mapping
 */
export class ConflictResolutionService {
  private static instance: ConflictResolutionService

  // Inverted file extension index: 'ext' -> Array of claimants
  private fileExtensionMap: Map<string, Array<{ extensionId: string; extensionName: string; language: LanguageContribution; category?: string }>> = new Map()
  
  // Language alias graph for cycle detection: 'alias' -> 'targetLanguage'
  private aliasGraph: Map<string, string> = new Map()

  // Track resolved conflicts to avoid duplicate notifications
  private loggedConflicts: Set<string> = new Set()

  // Detected project context
  private workspaceContext: WorkspaceContextInfo = {
    framework: 'unknown',
    detectedMarkers: [],
    dependencies: [],
  }

  private constructor() {}

  public static getInstance(): ConflictResolutionService {
    if (!ConflictResolutionService.instance) {
      ConflictResolutionService.instance = new ConflictResolutionService()
    }
    return ConflictResolutionService.instance
  }

  /**
   * Set or update workspace project context to inform Tier 1 resolution.
   */
  public setWorkspaceContext(params: {
    workspacePath?: string
    files?: Array<{ name: string; path?: string; isDirectory?: boolean }>
    packageJsonContent?: string | Record<string, any>
  }): void {
    const markers: string[] = []
    const deps: string[] = []
    let detectedFramework: ProjectFrameworkType = 'unknown'

    this.workspaceContext.workspacePath = params.workspacePath

    // Inspect files list for build and manifest markers
    if (params.files && Array.isArray(params.files)) {
      for (const f of params.files) {
        const name = f.name.toLowerCase()
        markers.push(name)

        if (name === 'angular.json' || name === '.angular') detectedFramework = 'angular'
        else if (name.startsWith('next.config.') || name === 'next-env.d.ts') detectedFramework = 'react'
        else if (name.startsWith('nuxt.config.')) detectedFramework = 'vue'
        else if (name.startsWith('svelte.config.')) detectedFramework = 'svelte'
        else if (name === 'nest-cli.json') detectedFramework = 'nest'
        else if (name === 'cargo.toml') detectedFramework = 'rust'
        else if (name === 'go.mod') detectedFramework = 'go'
        else if (name === 'pubspec.yaml') detectedFramework = 'dart'
        else if (name === 'requirements.txt' || name === 'pyproject.toml' || name === 'manage.py') detectedFramework = 'python'
        else if (name === 'composer.json') detectedFramework = 'php'
        else if (name === 'pom.xml' || name === 'build.gradle' || name === 'build.gradle.kts') detectedFramework = 'java'
        else if (name === 'foundry.toml' || name.startsWith('hardhat.config.')) detectedFramework = 'solidity'
      }
    }

    // Inspect package.json dependencies if available
    if (params.packageJsonContent) {
      try {
        const pkg = typeof params.packageJsonContent === 'string'
          ? JSON.parse(params.packageJsonContent)
          : params.packageJsonContent

        const allDeps = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {}),
          ...(pkg.peerDependencies || {}),
        }

        for (const dep of Object.keys(allDeps)) {
          deps.push(dep)
          if (dep === '@angular/core' || dep === '@angular/cli') detectedFramework = 'angular'
          else if (dep === 'next' || dep === 'react' || dep === 'react-dom') {
            if (detectedFramework !== 'angular') detectedFramework = 'react'
          }
          else if (dep === 'vue' || dep === 'nuxt') {
            if (detectedFramework !== 'angular' && detectedFramework !== 'react') detectedFramework = 'vue'
          }
          else if (dep === 'svelte' || dep === '@sveltejs/kit') detectedFramework = 'svelte'
          else if (dep === '@nestjs/core' || dep === '@nestjs/common') detectedFramework = 'nest'
          else if (dep === 'express' || dep === 'fastify' || dep === 'koa') {
            if (detectedFramework === 'unknown') detectedFramework = 'node'
          }
        }
      } catch {
        // Safe parse ignore
      }
    }

    this.workspaceContext = {
      workspacePath: params.workspacePath,
      framework: detectedFramework,
      detectedMarkers: markers,
      dependencies: deps,
    }
  }

  /**
   * Get current detected workspace framework context
   */
  public getWorkspaceContext(): WorkspaceContextInfo {
    return this.workspaceContext
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
        if (lang.extensions && Array.isArray(lang.extensions)) {
          for (const rawExt of lang.extensions) {
            const extKey = rawExt.startsWith('.') ? rawExt.slice(1).toLowerCase() : rawExt.toLowerCase()
            if (!this.fileExtensionMap.has(extKey)) {
              this.fileExtensionMap.set(extKey, [])
            }
            this.fileExtensionMap.get(extKey)!.push({
              extensionId: manifest.id,
              extensionName: manifest.name,
              category: manifest.category,
              language: lang,
            })
          }
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
   * Uses 5-tier architecture:
   * 1. Content Heuristic evaluation (if content provided and has high confidence)
   * 2. Exact match (if exactly 1 claimant)
   * 3. Project Context (if multi-claimant)
   * 4. Path Heuristics (if multi-claimant)
   * 5. Specialization Priority & Deterministic Fallback
   */
  public resolveLanguageForFilename(filename: string, fileContent?: string): LanguageResolutionResult {
    try {
      if (!filename || typeof filename !== 'string') {
        return { languageId: 'plaintext', resolvedBy: 'fallback', isFallback: true }
      }

      const basename = filename.split(/[/\\]/).pop() || filename
      const rawExt = basename.split('.').pop()?.toLowerCase() || ''
      const extKey = basename.toLowerCase() === rawExt ? basename.toLowerCase() : rawExt

      const claimants = this.fileExtensionMap.get(extKey)

      // Tier 3 Early: In-File Content & AST/Token Signatures (e.g. .m, .pl, .v, .ts decorators)
      if (fileContent && CONTENT_HEURISTICS[extKey]) {
        const contentResult = this.evaluateHeuristics(extKey, fileContent, claimants)
        if (contentResult) {
          return contentResult
        }
      }

      // Case 1: No claimants registered -> use Monaco default mapping
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

      // Tier 1: Project Build & Framework Context
      const projectResult = this.resolveByProjectContext(extKey, claimants)
      if (projectResult) {
        return projectResult
      }

      // Tier 2: File Path & Directory Heuristics
      const pathResult = this.resolveByPathHeuristic(filename, extKey, claimants)
      if (pathResult) {
        return pathResult
      }

      // Tier 4: Extension Category & Specialization Tier Priority Scoring
      return this.disambiguateCollisionBySpecialization(extKey, claimants)
    } catch (err) {
      // The editor should NEVER crash on resolution errors
      return { languageId: 'plaintext', resolvedBy: 'fallback', isFallback: true }
    }
  }

  /**
   * Tier 1: Resolves collision by inspecting overall project build/framework context.
   */
  private resolveByProjectContext(
    _extKey: string,
    claimants: Array<{ extensionId: string; extensionName: string; language: LanguageContribution; category?: string }>
  ): LanguageResolutionResult | null {
    const fw = this.workspaceContext.framework

    if (fw === 'angular') {
      const angularClaimant = claimants.find((c) => c.extensionId.includes('angular'))
      if (angularClaimant) {
        return {
          languageId: this.resolveAliasWithCycleCheck(angularClaimant.language.id),
          extensionId: angularClaimant.extensionId,
          resolvedBy: 'project-context',
          isFallback: false,
          confidence: 0.95,
        }
      }
    }

    if (fw === 'react') {
      const reactClaimant = claimants.find((c) => c.extensionId.includes('react'))
      if (reactClaimant) {
        return {
          languageId: this.resolveAliasWithCycleCheck(reactClaimant.language.id),
          extensionId: reactClaimant.extensionId,
          resolvedBy: 'project-context',
          isFallback: false,
          confidence: 0.95,
        }
      }
    }

    if (fw === 'vue' || fw === 'svelte') {
      const feClaimant = claimants.find((c) => c.extensionId.includes('frontend-mega-pack') || c.extensionId.includes(fw))
      if (feClaimant) {
        return {
          languageId: this.resolveAliasWithCycleCheck(feClaimant.language.id),
          extensionId: feClaimant.extensionId,
          resolvedBy: 'project-context',
          isFallback: false,
          confidence: 0.9,
        }
      }
    }

    if (fw === 'nest' || fw === 'node') {
      const beClaimant = claimants.find((c) => c.extensionId.includes('backend-mega-pack') || c.extensionId.includes('node'))
      if (beClaimant) {
        return {
          languageId: this.resolveAliasWithCycleCheck(beClaimant.language.id),
          extensionId: beClaimant.extensionId,
          resolvedBy: 'project-context',
          isFallback: false,
          confidence: 0.9,
        }
      }
    }

    if (fw === 'python') {
      const pyClaimant = claimants.find((c) => c.extensionId.includes('python'))
      if (pyClaimant) {
        return {
          languageId: this.resolveAliasWithCycleCheck(pyClaimant.language.id),
          extensionId: pyClaimant.extensionId,
          resolvedBy: 'project-context',
          isFallback: false,
          confidence: 0.95,
        }
      }
    }

    if (fw === 'rust') {
      const rsClaimant = claimants.find((c) => c.extensionId.includes('rust'))
      if (rsClaimant) {
        return {
          languageId: this.resolveAliasWithCycleCheck(rsClaimant.language.id),
          extensionId: rsClaimant.extensionId,
          resolvedBy: 'project-context',
          isFallback: false,
          confidence: 0.95,
        }
      }
    }

    if (fw === 'go') {
      const goClaimant = claimants.find((c) => c.extensionId.includes('go'))
      if (goClaimant) {
        return {
          languageId: this.resolveAliasWithCycleCheck(goClaimant.language.id),
          extensionId: goClaimant.extensionId,
          resolvedBy: 'project-context',
          isFallback: false,
          confidence: 0.95,
        }
      }
    }

    return null
  }

  /**
   * Tier 2: Resolves collision by inspecting file directory path heuristics.
   */
  private resolveByPathHeuristic(
    filename: string,
    _extKey: string,
    claimants: Array<{ extensionId: string; extensionName: string; language: LanguageContribution; category?: string }>
  ): LanguageResolutionResult | null {
    const normalized = filename.replace(/\\/g, '/').toLowerCase()

    // Angular paths
    if (normalized.includes('.component.ts') || normalized.includes('.service.ts') || normalized.includes('.module.ts') || normalized.includes('/angular/')) {
      const ang = claimants.find((c) => c.extensionId.includes('angular'))
      if (ang) {
        return {
          languageId: this.resolveAliasWithCycleCheck(ang.language.id),
          extensionId: ang.extensionId,
          resolvedBy: 'path-heuristic',
          isFallback: false,
        }
      }
    }

    // React components / hooks
    if (normalized.includes('/components/') || normalized.includes('/hooks/') || normalized.includes('/pages/') || normalized.includes('/views/')) {
      const react = claimants.find((c) => c.extensionId.includes('react'))
      if (react) {
        return {
          languageId: this.resolveAliasWithCycleCheck(react.language.id),
          extensionId: react.extensionId,
          resolvedBy: 'path-heuristic',
          isFallback: false,
        }
      }
    }

    // Backend controllers / routes
    if (normalized.includes('/controllers/') || normalized.includes('/routes/') || normalized.includes('/services/') || normalized.includes('/api/')) {
      const backend = claimants.find((c) => c.extensionId.includes('backend-mega-pack'))
      if (backend) {
        return {
          languageId: this.resolveAliasWithCycleCheck(backend.language.id),
          extensionId: backend.extensionId,
          resolvedBy: 'path-heuristic',
          isFallback: false,
        }
      }
    }

    // MCP Studio files
    if (normalized.includes('/mcp/') || normalized.includes('mcp_config') || normalized.includes('mcp-')) {
      const mcp = claimants.find((c) => c.extensionId.includes('mcp'))
      if (mcp) {
        return {
          languageId: this.resolveAliasWithCycleCheck(mcp.language.id),
          extensionId: mcp.extensionId,
          resolvedBy: 'path-heuristic',
          isFallback: false,
        }
      }
    }

    return null
  }

  /**
   * Tier 3: Evaluates content heuristic patterns against file content.
   */
  private evaluateHeuristics(
    extKey: string,
    content: string,
    claimants?: Array<{ extensionId: string; extensionName: string; language: LanguageContribution; category?: string }>
  ): LanguageResolutionResult | null {
    const heuristics = CONTENT_HEURISTICS[extKey]
    if (!heuristics || !content) return null

    let bestMatch: { languageId: string; targetExtensionId?: string; score: number } | null = null

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
          bestMatch = { languageId: h.languageId, targetExtensionId: h.targetExtensionId, score }
        }
      }
    }

    if (bestMatch) {
      const canonical = this.resolveAliasWithCycleCheck(bestMatch.languageId)
      const winningClaimant = claimants?.find((c) =>
        (bestMatch!.targetExtensionId && c.extensionId === bestMatch!.targetExtensionId) ||
        c.language.id === canonical ||
        c.language.id === bestMatch!.languageId
      )

      return {
        languageId: canonical,
        extensionId: winningClaimant?.extensionId || bestMatch.targetExtensionId,
        resolvedBy: 'heuristic',
        isFallback: false,
      }
    }

    return null
  }

  /**
   * Tier 4: Resolves collision by extension specialization tier scoring.
   * Primary Language > Framework Mega-Pack > Runtime Suite > Protocol Studio > Formatter / Linter
   */
  private disambiguateCollisionBySpecialization(
    _extKey: string,
    claimants: Array<{ extensionId: string; extensionName: string; language: LanguageContribution; category?: string }>
  ): LanguageResolutionResult {
    const getScore = (c: { extensionId: string; category?: string }): number => {
      const id = c.extensionId.toLowerCase()
      // Dedicated language suites have highest affinity
      if (id.includes('angular') || id.includes('react') || id.includes('python') || id.includes('rust') || id.includes('go') || id.includes('cpp') || id.includes('java') || id.includes('dotnet') || id.includes('php') || id.includes('ruby') || id.includes('swift') || id.includes('kotlin') || id.includes('flutter')) {
        return 100
      }
      // Framework mega-packs
      if (id.includes('frontend-mega-pack') || id.includes('backend-mega-pack')) {
        return 60
      }
      // Runtimes / Platforms
      if (id.includes('node') || id.includes('devops')) {
        return 40
      }
      // Protocol / Tooling Studios
      if (id.includes('mcp') || id.includes('database') || id.includes('rest')) {
        return 20
      }
      // Formatters / Linters should never steal language ID from primary syntax highlighters
      if (id.includes('prettier') || id.includes('formatter') || id.includes('linter')) {
        return 5
      }
      return 30
    }

    const sorted = [...claimants].sort((a, b) => {
      const scoreDiff = getScore(b) - getScore(a)
      if (scoreDiff !== 0) return scoreDiff
      return a.extensionId.localeCompare(b.extensionId)
    })

    const winner = sorted[0]
    const resolvedLang = this.resolveAliasWithCycleCheck(winner.language.id)

    return {
      languageId: resolvedLang,
      extensionId: winner.extensionId,
      resolvedBy: 'priority',
      isFallback: false,
    }
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
      ipynb: 'ipynb',
      jupyter: 'ipynb',
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

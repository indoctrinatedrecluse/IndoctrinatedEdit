import { ToolchainDefinition, DetectedToolchain, IToolchainRegistry } from '@sdk/types'

const CACHE_KEY = 'indoctrinated:toolchain:cache'
const CACHE_TTL_MS = 1000 * 60 * 15 // 15 minutes

interface CachedToolchainData {
  timestamp: number
  results: DetectedToolchain[]
}

export class ToolchainService implements IToolchainRegistry {
  private static instance: ToolchainService | null = null
  private definitions: Map<string, ToolchainDefinition> = new Map()
  private detectedResults: Map<string, DetectedToolchain> = new Map()
  private listeners: Set<(results: DetectedToolchain[]) => void> = new Set()
  private isDetecting: boolean = false
  private hasInitialized: boolean = false

  public static getInstance(): ToolchainService {
    if (!ToolchainService.instance) {
      ToolchainService.instance = new ToolchainService()
    }
    return ToolchainService.instance
  }

  constructor() {
    this.loadCache()
    this.registerBuiltinDefinitions()
  }

  /**
   * Register default toolchains supported out-of-the-box.
   */
  private registerBuiltinDefinitions() {
    const builtins: ToolchainDefinition[] = [
      {
        id: 'toolchain.node',
        name: 'Node.js Runtime',
        language: 'javascript',
        binaryNames: ['node', 'nodejs'],
        versionFlag: '--version',
        versionPattern: 'v?([0-9]+\\.[0-9]+\\.[0-9]+)',
        downloadUrl: 'https://nodejs.org',
        description: 'JavaScript runtime built on Chrome V8 engine',
      },
      {
        id: 'toolchain.typescript',
        name: 'TypeScript Compiler',
        language: 'typescript',
        binaryNames: ['tsc'],
        versionFlag: '--version',
        versionPattern: 'Version\\s+([0-9]+\\.[0-9]+\\.[0-9]+)',
        downloadUrl: 'https://www.typescriptlang.org',
        description: 'Typed superset of JavaScript',
      },
      {
        id: 'toolchain.python',
        name: 'Python Interpreter',
        language: 'python',
        binaryNames: ['python', 'python3', 'py'],
        versionFlag: '--version',
        versionPattern: 'Python\\s+([0-9]+\\.[0-9]+\\.[0-9]+)',
        downloadUrl: 'https://www.python.org',
        description: 'High-level dynamic programming language',
      },
      {
        id: 'toolchain.rust',
        name: 'Rust Compiler (rustc)',
        language: 'rust',
        binaryNames: ['rustc', 'cargo'],
        versionFlag: '--version',
        versionPattern: 'rustc\\s+([0-9]+\\.[0-9]+\\.[0-9]+)',
        downloadUrl: 'https://www.rust-lang.org',
        description: 'Blazingly fast, memory-efficient systems language',
      },
      {
        id: 'toolchain.go',
        name: 'Go Compiler',
        language: 'go',
        binaryNames: ['go'],
        versionFlag: 'version',
        versionPattern: 'go([0-9]+\\.[0-9]+(?:\\.[0-9]+)?)',
        downloadUrl: 'https://go.dev',
        description: 'Open source programming language supported by Google',
      },
      {
        id: 'toolchain.cpp',
        name: 'C/C++ Compiler (GCC / Clang)',
        language: 'cpp',
        binaryNames: ['gcc', 'clang', 'g++', 'cl'],
        versionFlag: '--version',
        versionPattern: '(?:gcc|clang|g\\+\\+)\\s+(?:version\\s+)?([0-9]+\\.[0-9]+(?:\\.[0-9]+)?)',
        downloadUrl: 'https://gcc.gnu.org',
        description: 'High performance native systems compiler',
      },
      {
        id: 'toolchain.dotnet',
        name: '.NET SDK',
        language: 'csharp',
        binaryNames: ['dotnet'],
        versionFlag: '--version',
        versionPattern: '([0-9]+\\.[0-9]+\\.[0-9]+)',
        downloadUrl: 'https://dotnet.microsoft.com',
        description: 'Cross-platform developer platform for building apps',
      },
      {
        id: 'toolchain.java',
        name: 'Java Development Kit (JDK)',
        language: 'java',
        binaryNames: ['javac', 'java'],
        versionFlag: '-version',
        versionPattern: '(?:javac|java|openjdk)\\s+([0-9]+(?:\\.[0-9]+)*)',
        downloadUrl: 'https://www.oracle.com/java',
        description: 'Robust, class-based, object-oriented language and runtime',
      },
      {
        id: 'toolchain.php',
        name: 'PHP CLI & Runtime',
        language: 'php',
        binaryNames: ['php', 'composer'],
        versionFlag: '--version',
        versionPattern: 'PHP\\s+([0-9]+\\.[0-9]+\\.[0-9]+)',
        downloadUrl: 'https://www.php.net',
        description: 'Popular general-purpose web scripting language',
      },
      {
        id: 'toolchain.ruby',
        name: 'Ruby & Bundler',
        language: 'ruby',
        binaryNames: ['ruby', 'bundle', 'rails'],
        versionFlag: '--version',
        versionPattern: 'ruby\\s+([0-9]+\\.[0-9]+\\.[0-9]+)',
        downloadUrl: 'https://www.ruby-lang.org',
        description: 'Dynamic, open source programming language with a focus on simplicity',
      },
      {
        id: 'toolchain.flutter',
        name: 'Flutter SDK',
        language: 'dart',
        binaryNames: ['flutter', 'dart'],
        versionFlag: '--version',
        versionPattern: 'Flutter\\s+([0-9]+\\.[0-9]+\\.[0-9]+)',
        downloadUrl: 'https://flutter.dev',
        description: 'Google multi-platform framework for mobile, web, and desktop',
      },
      {
        id: 'toolchain.git',
        name: 'Git Version Control',
        language: 'git',
        binaryNames: ['git'],
        versionFlag: '--version',
        downloadUrl: 'https://git-scm.com',
        description: 'Distributed version control system',
      },
      {
        id: 'toolchain.swift',
        name: 'Swift Compiler',
        language: 'swift',
        binaryNames: ['swiftc', 'swift'],
        versionFlag: '--version',
        versionPattern: 'Swift\\s+version\\s+([0-9]+\\.[0-9]+(?:\\.[0-9]+)?)',
        downloadUrl: 'https://www.swift.org',
        description: 'Powerful, intuitive programming language for Apple platforms and Linux',
      },
      {
        id: 'toolchain.kotlin',
        name: 'Kotlin Compiler',
        language: 'kotlin',
        binaryNames: ['kotlinc', 'kotlin'],
        versionFlag: '-version',
        versionPattern: 'kotlinc-jvm\\s+([0-9]+\\.[0-9]+(?:\\.[0-9]+)?)',
        downloadUrl: 'https://kotlinlang.org',
        description: 'Modern concise multiplatform language targeting JVM, Android, and Native',
      },
      {
        id: 'toolchain.r',
        name: 'R Language Environment',
        language: 'r',
        binaryNames: ['Rscript', 'R'],
        versionFlag: '--version',
        versionPattern: 'R\\s+version\\s+([0-9]+\\.[0-9]+\\.[0-9]+)',
        downloadUrl: 'https://www.r-project.org',
        description: 'Language and environment for statistical computing and graphics',
      },
      {
        id: 'toolchain.julia',
        name: 'Julia Language',
        language: 'julia',
        binaryNames: ['julia'],
        versionFlag: '--version',
        versionPattern: 'julia\\s+version\\s+([0-9]+\\.[0-9]+\\.[0-9]+)',
        downloadUrl: 'https://julialang.org',
        description: 'High-level, high-performance dynamic programming language for technical computing',
      },
      {
        id: 'toolchain.elixir',
        name: 'Elixir & Erlang BEAM',
        language: 'elixir',
        binaryNames: ['elixir', 'erl'],
        versionFlag: '--version',
        versionPattern: 'Elixir\\s+([0-9]+\\.[0-9]+\\.[0-9]+)',
        downloadUrl: 'https://elixir-lang.org',
        description: 'Dynamic, functional language designed for building scalable and maintainable applications',
      },
      {
        id: 'toolchain.zig',
        name: 'Zig Toolchain',
        language: 'zig',
        binaryNames: ['zig'],
        versionFlag: 'version',
        versionPattern: '([0-9]+\\.[0-9]+\\.[0-9]+)',
        downloadUrl: 'https://ziglang.org',
        description: 'General-purpose programming language and toolchain for maintaining robust, optimal software',
      },
      {
        id: 'toolchain.sql',
        name: 'PostgreSQL / SQL Client',
        language: 'sql',
        binaryNames: ['psql', 'mysql', 'sqlite3'],
        versionFlag: '--version',
        versionPattern: '(?:psql|mysql|sqlite3)\\s+.*?([0-9]+\\.[0-9]+(?:\\.[0-9]+)?)',
        downloadUrl: 'https://www.postgresql.org',
        description: 'Relational database interactive terminals and query engines',
      },
      {
        id: 'toolchain.solidity',
        name: 'Solidity & Foundry Toolchain',
        language: 'solidity',
        binaryNames: ['forge', 'solc'],
        versionFlag: '--version',
        versionPattern: '(?:forge|solc)\\s+([0-9]+\\.[0-9]+\\.[0-9]+)',
        downloadUrl: 'https://getfoundry.sh',
        description: 'Ethereum and EVM smart contract compilation and testing framework',
      },
      {
        id: 'toolchain.prolog',
        name: 'SWI-Prolog / Logic Engine',
        language: 'prolog',
        binaryNames: ['swipl', 'gprolog', 'prolog'],
        versionFlag: '--version',
        versionPattern: 'SWI-Prolog\\s+version\\s+([0-9]+\\.[0-9]+\\.[0-9]+)',
        downloadUrl: 'https://www.swi-prolog.org',
        description: 'Comprehensive First-Order Predicate Logic and constraint logic programming system',
      },
      {
        id: 'toolchain.lisp',
        name: 'Common Lisp & Scheme/Racket',
        language: 'lisp',
        binaryNames: ['sbcl', 'clisp', 'racket', 'guile'],
        versionFlag: '--version',
        versionPattern: '(?:SBCL|CLISP|Racket|Guile)\\s+([0-9]+\\.[0-9]+(?:\\.[0-9]+)?)',
        downloadUrl: 'https://www.sbcl.org',
        description: 'High performance Common Lisp compiler and dynamic symbolic S-expression system',
      },
    ]

    for (const def of builtins) {
      this.definitions.set(def.id, def)
    }
  }

  /**
   * Register a new toolchain definition. Called by language extensions.
   */
  public registerToolchain(definition: ToolchainDefinition): void {
    this.definitions.set(definition.id, definition)
    // Non-blocking single check in the background for this newly added toolchain
    if (this.hasInitialized) {
      setTimeout(() => {
        this.detectOne(definition.id)
      }, 100)
    }
  }

  /**
   * Unregister a toolchain definition.
   */
  public unregisterToolchain(id: string): void {
    this.definitions.delete(id)
    this.detectedResults.delete(id)
    this.notifyListeners()
  }

  /**
   * Get all registered definitions.
   */
  public getDefinitions(): ToolchainDefinition[] {
    return Array.from(this.definitions.values())
  }

  /**
   * Get all currently detected results.
   */
  public getDetectedToolchains(): DetectedToolchain[] {
    return Array.from(this.detectedResults.values())
  }

  /**
   * Get detected toolchain for a specific language.
   */
  public getToolchainForLanguage(languageId: string): DetectedToolchain | undefined {
    return Array.from(this.detectedResults.values()).find(
      (tc) => tc.language === languageId && tc.found
    )
  }

  /**
   * Subscribe to detection result updates.
   */
  public onDidDetect(listener: (results: DetectedToolchain[]) => void): () => void {
    this.listeners.add(listener)
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => {
        if (this.listeners.has(listener)) {
          try {
            listener(this.getDetectedToolchains())
          } catch (err) {
            console.error('Toolchain listener error:', err)
          }
        }
      })
    } else {
      setTimeout(() => {
        if (this.listeners.has(listener)) {
          try {
            listener(this.getDetectedToolchains())
          } catch (err) {
            console.error('Toolchain listener error:', err)
          }
        }
      }, 0)
    }
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners(): void {
    const list = this.getDetectedToolchains()
    for (const listener of this.listeners) {
      try {
        listener(list)
      } catch (err) {
        console.error('Toolchain listener error:', err)
      }
    }
  }

  /**
   * Schedule non-blocking detection during browser idle time or after startup.
   */
  public scheduleBackgroundDetection(delayMs: number = 1500): void {
    if (this.hasInitialized) return
    this.hasInitialized = true

    const runDetection = () => {
      // If cache is fresh, skip heavy detection
      if (this.isCacheFresh()) {
        return
      }

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          this.detectAll().catch((err) => console.warn('Background toolchain detection error:', err))
        }, { timeout: 3000 })
      } else {
        setTimeout(() => {
          this.detectAll().catch((err) => console.warn('Background toolchain detection error:', err))
        }, 100)
      }
    }

    setTimeout(runDetection, delayMs)
  }

  /**
   * Detect a single toolchain by ID.
   */
  public async detectOne(id: string): Promise<DetectedToolchain | null> {
    const def = this.definitions.get(id)
    if (!def) return null

    if (typeof window !== 'undefined' && window.electronAPI?.toolchain) {
      try {
        const result = await window.electronAPI.toolchain.detectOne(def)
        this.detectedResults.set(result.id, result)
        this.notifyListeners()
        this.saveCache()
        return result
      } catch (err) {
        console.warn(`Failed to detect toolchain ${id}:`, err)
      }
    }

    // Mock fallback when not running in Electron
    const fallback: DetectedToolchain = {
      id: def.id,
      name: def.name,
      language: def.language,
      found: false,
      lastChecked: Date.now(),
    }
    this.detectedResults.set(fallback.id, fallback)
    this.notifyListeners()
    return fallback
  }

  /**
   * Run detection for all registered toolchains.
   */
  public async detectAll(force: boolean = false): Promise<DetectedToolchain[]> {
    if (this.isDetecting) {
      return this.getDetectedToolchains()
    }

    if (!force && this.isCacheFresh()) {
      return this.getDetectedToolchains()
    }

    this.isDetecting = true

    try {
      const defs = this.getDefinitions()
      if (typeof window !== 'undefined' && window.electronAPI?.toolchain) {
        const results = await window.electronAPI.toolchain.detectAll(defs)
        for (const res of results) {
          this.detectedResults.set(res.id, res)
        }
      } else {
        // Fallback for non-electron environments
        for (const def of defs) {
          if (!this.detectedResults.has(def.id)) {
            this.detectedResults.set(def.id, {
              id: def.id,
              name: def.name,
              language: def.language,
              found: false,
              lastChecked: Date.now(),
            })
          }
        }
      }

      this.saveCache()
      this.notifyListeners()
    } finally {
      this.isDetecting = false
    }

    return this.getDetectedToolchains()
  }

  private isCacheFresh(): boolean {
    if (this.detectedResults.size === 0) return false
    const oldestTimestamp = Math.min(
      ...Array.from(this.detectedResults.values()).map((r) => r.lastChecked)
    )
    return Date.now() - oldestTimestamp < CACHE_TTL_MS
  }

  private loadCache(): void {
    try {
      if (typeof localStorage === 'undefined') return
      const data = localStorage.getItem(CACHE_KEY)
      if (data) {
        const parsed: CachedToolchainData = JSON.parse(data)
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.results)) {
          for (const item of parsed.results) {
            this.detectedResults.set(item.id, item)
          }
        }
      }
    } catch {
      // Ignore cache reading errors
    }
  }

  private saveCache(): void {
    try {
      if (typeof localStorage === 'undefined') return
      const data: CachedToolchainData = {
        timestamp: Date.now(),
        results: Array.from(this.detectedResults.values()),
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    } catch {
      // Ignore cache writing errors
    }
  }
}

export const toolchainService = ToolchainService.getInstance()

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import fs from 'node:fs/promises'
import { ToolchainDefinition, DetectedToolchain } from '../packages/sdk/types'

const execFileAsync = promisify(execFile)

/**
 * Standard toolchain definitions bundled by default.
 * Language extensions can register additional toolchains dynamically.
 */
export const DEFAULT_TOOLCHAINS: ToolchainDefinition[] = [
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
    versionPattern: '(?:gcc|clang)\\s+(?:version\\s+)?([0-9]+\\.[0-9]+(?:\\.[0-9]+)?)',
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
    versionPattern: 'git\\s+version\\s+([0-9]+\\.[0-9]+\\.[0-9]+)',
    downloadUrl: 'https://git-scm.com',
    description: 'Fast, distributed version control system',
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

/**
 * Fast lookup to find an executable's absolute path using PATH environment or system utilities.
 * Uses a strict 1000ms timeout to ensure startup is never blocked.
 */
export async function findExecutable(binaryName: string): Promise<string | null> {
  const isWindows = process.platform === 'win32'
  const lookupCmd = isWindows ? 'where.exe' : 'which'

  try {
    const { stdout } = await execFileAsync(lookupCmd, [binaryName], {
      timeout: 1000,
      windowsHide: true,
    })
    const lines = stdout.trim().split(/\r?\n/)
    if (lines.length > 0 && lines[0].trim().length > 0) {
      return lines[0].trim()
    }
  } catch {
    // lookupCmd failed or timed out, fallback to PATH directory check
  }

  // Direct PATH scan fallback
  const pathEnv = process.env.PATH || ''
  const pathDelimiter = isWindows ? ';' : ':'
  const dirs = pathEnv.split(pathDelimiter).filter(Boolean)
  const exts = isWindows ? ['.exe', '.cmd', '.bat', ''] : ['']

  for (const dir of dirs) {
    for (const ext of exts) {
      const fullPath = path.join(dir, binaryName + ext)
      try {
        await fs.access(fullPath)
        return fullPath
      } catch {
        // Not found in this directory, continue
      }
    }
  }

  return null
}

/**
 * Executes a binary with its version query flag and parses output with regex.
 */
export async function extractVersion(
  executablePath: string,
  versionFlag: string = '--version',
  customPattern?: string
): Promise<string | undefined> {
  try {
    const { stdout, stderr } = await execFileAsync(executablePath, [versionFlag], {
      timeout: 1200,
      windowsHide: true,
    })
    const rawOutput = (stdout + ' ' + stderr).trim()

    if (customPattern) {
      const regex = new RegExp(customPattern, 'i')
      const match = rawOutput.match(regex)
      if (match && match[1]) {
        return match[1]
      }
    }

    // Generic version pattern fallback: e.g. "1.2.3" or "v1.2.3"
    const genericRegex = /(?:version\s*|v)?([0-9]+\.[0-9]+(?:\.[0-9]+)?(?:-[a-zA-Z0-9.]+)?)/i
    const genericMatch = rawOutput.match(genericRegex)
    if (genericMatch && genericMatch[1]) {
      return genericMatch[1]
    }

    // Return the first line truncated if no pattern matched
    const firstLine = rawOutput.split(/\r?\n/)[0]
    return firstLine ? firstLine.slice(0, 40).trim() : undefined
  } catch {
    return undefined
  }
}

/**
 * Detect a single toolchain definition.
 */
export async function detectToolchain(definition: ToolchainDefinition): Promise<DetectedToolchain> {
  const timestamp = Date.now()

  for (const binary of definition.binaryNames) {
    const execPath = await findExecutable(binary)
    if (execPath) {
      const version = await extractVersion(
        execPath,
        definition.versionFlag ?? '--version',
        definition.versionPattern
      )

      return {
        id: definition.id,
        name: definition.name,
        language: definition.language,
        found: true,
        binaryName: binary,
        path: execPath,
        version: version ?? 'Installed',
        lastChecked: timestamp,
      }
    }
  }

  return {
    id: definition.id,
    name: definition.name,
    language: definition.language,
    found: false,
    lastChecked: timestamp,
  }
}

/**
 * Detect all toolchains non-blockingly.
 */
export async function detectAllToolchains(
  definitions: ToolchainDefinition[] = DEFAULT_TOOLCHAINS
): Promise<DetectedToolchain[]> {
  const results = await Promise.all(definitions.map((def) => detectToolchain(def)))
  return results
}

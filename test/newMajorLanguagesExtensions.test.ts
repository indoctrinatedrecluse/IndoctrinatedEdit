import { describe, it, expect, vi } from 'vitest'
import { swiftExtensionManifest } from '../src/extensions/swiftSupport/swiftExtension'
import { SWIFT_SNIPPETS, OBJC_SNIPPETS } from '../src/extensions/swiftSupport/swiftSnippets'
import { kotlinExtensionManifest } from '../src/extensions/kotlinSupport/kotlinExtension'
import { KOTLIN_SNIPPETS, COMPOSE_SNIPPETS, GRADLE_KTS_SNIPPETS } from '../src/extensions/kotlinSupport/kotlinSnippets'
import { devopsExtensionManifest } from '../src/extensions/devopsSupport/devopsExtension'
import { BASH_SNIPPETS, POWERSHELL_SNIPPETS, TERRAFORM_SNIPPETS, DOCKER_SNIPPETS, KUBERNETES_SNIPPETS } from '../src/extensions/devopsSupport/devopsSnippets'
import { dataScienceExtensionManifest } from '../src/extensions/dataScienceSupport/dataScienceExtension'
import { R_SNIPPETS, JULIA_SNIPPETS, SCALA_SNIPPETS, MATLAB_SNIPPETS } from '../src/extensions/dataScienceSupport/dataScienceSnippets'
import { beamFunctionalExtensionManifest } from '../src/extensions/beamFunctionalSupport/beamFunctionalExtension'
import { ELIXIR_SNIPPETS, ERLANG_SNIPPETS, HASKELL_SNIPPETS, CLOJURE_SNIPPETS, OCAML_SNIPPETS, JANET_SNIPPETS } from '../src/extensions/beamFunctionalSupport/beamFunctionalSnippets'
import { systemsGamingExtensionManifest } from '../src/extensions/systemsGamingSupport/systemsGamingExtension'
import { ZIG_SNIPPETS, ODIN_SNIPPETS, NIM_SNIPPETS, LUA_SNIPPETS, GDSCRIPT_SNIPPETS, ASSEMBLY_SNIPPETS } from '../src/extensions/systemsGamingSupport/systemsGamingSnippets'
import { databaseSchemaExtensionManifest } from '../src/extensions/databaseSchemaSupport/databaseSchemaExtension'
import { SQL_SNIPPETS, GRAPHQL_SNIPPETS, PRISMA_SNIPPETS } from '../src/extensions/databaseSchemaSupport/databaseSchemaSnippets'
import { web3ExtensionManifest } from '../src/extensions/web3Support/web3Extension'
import { SOLIDITY_SNIPPETS, MOVE_SNIPPETS, CAIRO_SNIPPETS, VYPER_SNIPPETS } from '../src/extensions/web3Support/web3Snippets'
import { extensionRegistry } from '../src/extensions/extensionRegistry'
import { toolchainService } from '../src/services/toolchainService'
import { notificationService } from '../src/services/notificationService'

describe('Native Apple & Swift Suite', () => {
  it('should have valid Swift extension manifest registered in ExtensionRegistry', () => {
    expect(swiftExtensionManifest.id).toBe('indoctrinated.ext.swift-apple')
    const registered = extensionRegistry.get('indoctrinated.ext.swift-apple')
    expect(registered).toBeDefined()
    expect(registered?.name).toContain('Swift')
    expect(registered?.languages?.map((l) => l.id)).toEqual(['swift', 'objective-c'])
  })

  it('should contain Swift and Objective-C snippets', () => {
    expect(SWIFT_SNIPPETS.length).toBeGreaterThanOrEqual(10)
    expect(OBJC_SNIPPETS.length).toBeGreaterThanOrEqual(5)
    expect(SWIFT_SNIPPETS.map((s) => s.label)).toContain('swift-swiftui-view')
    expect(SWIFT_SNIPPETS.map((s) => s.label)).toContain('swift-vapor-route')
  })

  it('should check toolchain.swift', async () => {
    const info = await toolchainService.detectOne('toolchain.swift')
    expect(info).toBeDefined()
    expect(typeof info?.found).toBe('boolean')
  })
})

describe('Kotlin & Android Multiplatform Suite', () => {
  it('should have valid Kotlin extension manifest registered in ExtensionRegistry', () => {
    expect(kotlinExtensionManifest.id).toBe('indoctrinated.ext.kotlin-android')
    const registered = extensionRegistry.get('indoctrinated.ext.kotlin-android')
    expect(registered).toBeDefined()
    expect(registered?.name).toContain('Kotlin')
    expect(registered?.languages?.map((l) => l.id)).toEqual(['kotlin', 'gradle-kotlin'])
  })

  it('should contain Kotlin, Compose, and Gradle Kts snippets', () => {
    expect(KOTLIN_SNIPPETS.length).toBeGreaterThanOrEqual(5)
    expect(COMPOSE_SNIPPETS.length).toBeGreaterThanOrEqual(5)
    expect(GRADLE_KTS_SNIPPETS.length).toBeGreaterThanOrEqual(5)
    expect(COMPOSE_SNIPPETS.map((s) => s.label)).toContain('compose-screen')
  })

  it('should check toolchain.kotlin', async () => {
    const info = await toolchainService.detectOne('toolchain.kotlin')
    expect(info).toBeDefined()
    expect(typeof info?.found).toBe('boolean')
  })
})

describe('DevOps, Cloud IaC & Shell Automation Suite', () => {
  it('should have valid DevOps extension manifest registered in ExtensionRegistry', () => {
    expect(devopsExtensionManifest.id).toBe('indoctrinated.ext.devops-iac')
    const registered = extensionRegistry.get('indoctrinated.ext.devops-iac')
    expect(registered).toBeDefined()
    expect(registered?.languages?.map((l) => l.id)).toContain('shell')
    expect(registered?.languages?.map((l) => l.id)).toContain('hcl')
    expect(registered?.languages?.map((l) => l.id)).toContain('dockerfile')
  })

  it('should contain Bash, PowerShell, Terraform, Docker, and K8s snippets', () => {
    expect(BASH_SNIPPETS.length).toBeGreaterThan(0)
    expect(POWERSHELL_SNIPPETS.length).toBeGreaterThan(0)
    expect(TERRAFORM_SNIPPETS.length).toBeGreaterThan(0)
    expect(DOCKER_SNIPPETS.length).toBeGreaterThan(0)
    expect(KUBERNETES_SNIPPETS.length).toBeGreaterThan(0)
  })
})

describe('Data Science, AI & Scientific Computing Suite', () => {
  it('should have valid Data Science manifest registered in ExtensionRegistry', () => {
    expect(dataScienceExtensionManifest.id).toBe('indoctrinated.ext.datascience-scientific')
    const registered = extensionRegistry.get('indoctrinated.ext.datascience-scientific')
    expect(registered).toBeDefined()
    expect(registered?.languages?.map((l) => l.id)).toContain('r')
    expect(registered?.languages?.map((l) => l.id)).toContain('julia')
    expect(registered?.languages?.map((l) => l.id)).toContain('scala')
  })

  it('should contain R, Julia, Scala 3, and MATLAB snippets', () => {
    expect(R_SNIPPETS.length).toBeGreaterThan(0)
    expect(JULIA_SNIPPETS.length).toBeGreaterThan(0)
    expect(SCALA_SNIPPETS.length).toBeGreaterThan(0)
    expect(MATLAB_SNIPPETS.length).toBeGreaterThan(0)
  })

  it('should check toolchain.r and toolchain.julia', async () => {
    const rInfo = await toolchainService.detectOne('toolchain.r')
    expect(rInfo).toBeDefined()
    const juliaInfo = await toolchainService.detectOne('toolchain.julia')
    expect(juliaInfo).toBeDefined()
  })
})

describe('BEAM & Functional Programming Suite (with Janet and Elixir)', () => {
  it('should have valid BEAM Functional manifest registered in ExtensionRegistry', () => {
    expect(beamFunctionalExtensionManifest.id).toBe('indoctrinated.ext.beam-functional')
    const registered = extensionRegistry.get('indoctrinated.ext.beam-functional')
    expect(registered).toBeDefined()
    const langIds = registered?.languages?.map((l) => l.id)
    expect(langIds).toContain('elixir')
    expect(langIds).toContain('erlang')
    expect(langIds).toContain('haskell')
    expect(langIds).toContain('clojure')
    expect(langIds).toContain('ocaml')
    expect(langIds).toContain('janet')
  })

  it('should contain rich snippets for Elixir, Erlang, Haskell, Clojure, OCaml, and Janet', () => {
    expect(ELIXIR_SNIPPETS.length).toBeGreaterThan(0)
    expect(ERLANG_SNIPPETS.length).toBeGreaterThan(0)
    expect(HASKELL_SNIPPETS.length).toBeGreaterThan(0)
    expect(CLOJURE_SNIPPETS.length).toBeGreaterThan(0)
    expect(OCAML_SNIPPETS.length).toBeGreaterThan(0)
    expect(JANET_SNIPPETS.length).toBeGreaterThan(0)
    expect(JANET_SNIPPETS.map((s) => s.label)).toContain('janet-defn')
    expect(ELIXIR_SNIPPETS.map((s) => s.label)).toContain('elixir-liveview')
  })

  it('should check toolchain.elixir', async () => {
    const info = await toolchainService.detectOne('toolchain.elixir')
    expect(info).toBeDefined()
  })
})

describe('Systems, Native Performance & Game Scripting Suite (with Odin & Zig)', () => {
  it('should have valid Systems Gaming manifest registered in ExtensionRegistry', () => {
    expect(systemsGamingExtensionManifest.id).toBe('indoctrinated.ext.systems-gaming')
    const registered = extensionRegistry.get('indoctrinated.ext.systems-gaming')
    expect(registered).toBeDefined()
    const langIds = registered?.languages?.map((l) => l.id)
    expect(langIds).toContain('zig')
    expect(langIds).toContain('odin')
    expect(langIds).toContain('nim')
    expect(langIds).toContain('lua')
    expect(langIds).toContain('gdscript')
    expect(langIds).toContain('assembly')
  })

  it('should contain snippets for Zig, Odin, Nim, Lua, GDScript, Assembly, and WAT', () => {
    expect(ZIG_SNIPPETS.length).toBeGreaterThan(0)
    expect(ODIN_SNIPPETS.length).toBeGreaterThan(0)
    expect(NIM_SNIPPETS.length).toBeGreaterThan(0)
    expect(LUA_SNIPPETS.length).toBeGreaterThan(0)
    expect(GDSCRIPT_SNIPPETS.length).toBeGreaterThan(0)
    expect(ASSEMBLY_SNIPPETS.length).toBeGreaterThan(0)
    expect(ODIN_SNIPPETS.map((s) => s.label)).toContain('odin-main')
    expect(ODIN_SNIPPETS.map((s) => s.label)).toContain('odin-struct')
  })

  it('should check toolchain.zig', async () => {
    const info = await toolchainService.detectOne('toolchain.zig')
    expect(info).toBeDefined()
  })
})

describe('Database, SQL Dialects & API Schema Pack', () => {
  it('should have valid Database & Schema manifest registered in ExtensionRegistry', () => {
    expect(databaseSchemaExtensionManifest.id).toBe('indoctrinated.ext.database-schema')
    const registered = extensionRegistry.get('indoctrinated.ext.database-schema')
    expect(registered).toBeDefined()
    const langIds = registered?.languages?.map((l) => l.id)
    expect(langIds).toContain('sql')
    expect(langIds).toContain('graphql')
    expect(langIds).toContain('prisma')
  })

  it('should contain SQL, GraphQL, and Prisma snippets', () => {
    expect(SQL_SNIPPETS.length).toBeGreaterThan(0)
    expect(GRAPHQL_SNIPPETS.length).toBeGreaterThan(0)
    expect(PRISMA_SNIPPETS.length).toBeGreaterThan(0)
  })

  it('should check toolchain.sql', async () => {
    const info = await toolchainService.detectOne('toolchain.sql')
    expect(info).toBeDefined()
  })
})

describe('Web3, Smart Contracts & Zero-Knowledge Suite', () => {
  it('should have valid Web3 manifest registered in ExtensionRegistry', () => {
    expect(web3ExtensionManifest.id).toBe('indoctrinated.ext.web3-smart-contracts')
    const registered = extensionRegistry.get('indoctrinated.ext.web3-smart-contracts')
    expect(registered).toBeDefined()
    const langIds = registered?.languages?.map((l) => l.id)
    expect(langIds).toContain('solidity')
    expect(langIds).toContain('move')
    expect(langIds).toContain('cairo')
    expect(langIds).toContain('vyper')
  })

  it('should contain Solidity, Move, Cairo ZK, and Vyper snippets', () => {
    expect(SOLIDITY_SNIPPETS.length).toBeGreaterThan(0)
    expect(MOVE_SNIPPETS.length).toBeGreaterThan(0)
    expect(CAIRO_SNIPPETS.length).toBeGreaterThan(0)
    expect(VYPER_SNIPPETS.length).toBeGreaterThan(0)
  })

  it('should check toolchain.solidity', async () => {
    const info = await toolchainService.detectOne('toolchain.solidity')
    expect(info).toBeDefined()
  })
})

describe('Monaco Extension Initializer for all 8 new suites', () => {
  it('should initialize without throwing errors when registered with Monaco', () => {
    const registeredLanguages: string[] = []
    const fakeMonaco = {
      languages: {
        registerCompletionItemProvider: (lang: string, _provider: any) => {
          registeredLanguages.push(lang)
          return { dispose: () => {} }
        },
        CompletionItemKind: { Snippet: 27 },
        CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
      },
    } as any

    expect(() => {
      extensionRegistry.initializeMonacoExtensions(fakeMonaco)
    }).not.toThrow()

    expect(registeredLanguages).toContain('swift')
    expect(registeredLanguages).toContain('kotlin')
    expect(registeredLanguages).toContain('shell')
    expect(registeredLanguages).toContain('r')
    expect(registeredLanguages).toContain('elixir')
    expect(registeredLanguages).toContain('janet')
    expect(registeredLanguages).toContain('odin')
    expect(registeredLanguages).toContain('zig')
    expect(registeredLanguages).toContain('sql')
    expect(registeredLanguages).toContain('solidity')
    expect(registeredLanguages).toContain('move')
    expect(registeredLanguages).toContain('cairo')
    expect(registeredLanguages).toContain('vyper')
  })
})

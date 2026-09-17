import { describe, it, expect, vi } from 'vitest'
import { swiftExtensionManifest } from '../src/extensions/swiftSupport/swiftExtension'
import { SWIFT_SNIPPETS, OBJC_SNIPPETS } from '../src/extensions/swiftSupport/swiftSnippets'
import { kotlinExtensionManifest } from '../src/extensions/kotlinSupport/kotlinExtension'
import { KOTLIN_SNIPPETS, COMPOSE_SNIPPETS, GRADLE_KTS_SNIPPETS } from '../src/extensions/kotlinSupport/kotlinSnippets'
import { devopsExtensionManifest } from '../src/extensions/devopsSupport/devopsExtension'
import { TERRAFORM_SNIPPETS, DOCKER_SNIPPETS, KUBERNETES_SNIPPETS } from '../src/extensions/devopsSupport/devopsSnippets'
import { dataScienceExtensionManifest } from '../src/extensions/dataScienceSupport/dataScienceExtension'
import { R_SNIPPETS, SCALA_SNIPPETS, MATLAB_SNIPPETS } from '../src/extensions/dataScienceSupport/dataScienceSnippets'
import { beamFunctionalExtensionManifest } from '../src/extensions/beamFunctionalSupport/beamFunctionalExtension'
import { ELIXIR_SNIPPETS, ERLANG_SNIPPETS, HASKELL_SNIPPETS, CLOJURE_SNIPPETS, OCAML_SNIPPETS, JANET_SNIPPETS } from '../src/extensions/beamFunctionalSupport/beamFunctionalSnippets'
import { systemsGamingExtensionManifest } from '../src/extensions/systemsGamingSupport/systemsGamingExtension'
import { ODIN_SNIPPETS, NIM_SNIPPETS, ASSEMBLY_SNIPPETS } from '../src/extensions/systemsGamingSupport/systemsGamingSnippets'
import { databaseSchemaExtensionManifest } from '../src/extensions/databaseSchemaSupport/databaseSchemaExtension'
import { SQL_SNIPPETS, GRAPHQL_SNIPPETS, PRISMA_SNIPPETS } from '../src/extensions/databaseSchemaSupport/databaseSchemaSnippets'
import { web3ExtensionManifest } from '../src/extensions/web3Support/web3Extension'
import { SOLIDITY_SNIPPETS, MOVE_SNIPPETS, CAIRO_SNIPPETS, VYPER_SNIPPETS } from '../src/extensions/web3Support/web3Snippets'
import { logicFormalExtensionManifest } from '../src/extensions/logicFormalSupport/logicFormalExtension'
import {
  PROLOG_FOPL_SNIPPETS,
  COMMON_LISP_SNIPPETS,
  SCHEME_RACKET_SNIPPETS,
  LAMBDA_CALCULUS_SNIPPETS,
  FORMAL_METHODS_SNIPPETS,
} from '../src/extensions/logicFormalSupport/logicFormalSnippets'
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

describe('DevOps, Cloud IaC & Container Suite', () => {
  it('should have valid DevOps extension manifest registered in ExtensionRegistry', () => {
    expect(devopsExtensionManifest.id).toBe('indoctrinated.ext.devops-iac')
    const registered = extensionRegistry.get('indoctrinated.ext.devops-iac')
    expect(registered).toBeDefined()
    expect(registered?.languages?.map((l) => l.id)).toContain('hcl')
    expect(registered?.languages?.map((l) => l.id)).toContain('dockerfile')
    expect(registered?.languages?.map((l) => l.id)).toContain('yaml')
  })

  it('should contain Terraform, Docker, and K8s snippets', () => {
    expect(TERRAFORM_SNIPPETS.length).toBeGreaterThan(0)
    expect(DOCKER_SNIPPETS.length).toBeGreaterThan(0)
    expect(KUBERNETES_SNIPPETS.length).toBeGreaterThan(0)
  })
})

describe('Data Science, R & Numerical Computing Suite', () => {
  it('should have valid Data Science manifest registered in ExtensionRegistry', () => {
    expect(dataScienceExtensionManifest.id).toBe('indoctrinated.ext.datascience-scientific')
    const registered = extensionRegistry.get('indoctrinated.ext.datascience-scientific')
    expect(registered).toBeDefined()
    expect(registered?.languages?.map((l) => l.id)).toContain('r')
    expect(registered?.languages?.map((l) => l.id)).toContain('scala')
    expect(registered?.languages?.map((l) => l.id)).toContain('matlab')
  })

  it('should contain R, Scala 3, and MATLAB snippets', () => {
    expect(R_SNIPPETS.length).toBeGreaterThan(0)
    expect(SCALA_SNIPPETS.length).toBeGreaterThan(0)
    expect(MATLAB_SNIPPETS.length).toBeGreaterThan(0)
  })

  it('should check toolchain.r', async () => {
    const rInfo = await toolchainService.detectOne('toolchain.r')
    expect(rInfo).toBeDefined()
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

describe('Systems, Native Performance & Game Scripting Suite (with Odin, Nim & Assembly)', () => {
  it('should have valid Systems Gaming manifest registered in ExtensionRegistry', () => {
    expect(systemsGamingExtensionManifest.id).toBe('indoctrinated.ext.systems-gaming')
    const registered = extensionRegistry.get('indoctrinated.ext.systems-gaming')
    expect(registered).toBeDefined()
    const langIds = registered?.languages?.map((l) => l.id)
    expect(langIds).toContain('odin')
    expect(langIds).toContain('nim')
    expect(langIds).toContain('assembly')
    expect(langIds).toContain('wat')
  })

  it('should contain snippets for Odin, Nim, Assembly, and WAT', () => {
    expect(ODIN_SNIPPETS.length).toBeGreaterThan(0)
    expect(NIM_SNIPPETS.length).toBeGreaterThan(0)
    expect(ASSEMBLY_SNIPPETS.length).toBeGreaterThan(0)
    expect(ODIN_SNIPPETS.map((s) => s.label)).toContain('odin-main')
    expect(ODIN_SNIPPETS.map((s) => s.label)).toContain('odin-struct')
  })

  it('should check toolchain.odin and toolchain.nim', async () => {
    const odinInfo = await toolchainService.detectOne('toolchain.odin')
    expect(odinInfo).toBeDefined()
    const nimInfo = await toolchainService.detectOne('toolchain.nim')
    expect(nimInfo).toBeDefined()
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

describe('Logic Programming, Lambda Calculus & Formal Methods Suite', () => {
  it('should have valid Logic & Formal Methods manifest registered in ExtensionRegistry', () => {
    expect(logicFormalExtensionManifest.id).toBe('indoctrinated.ext.logic-formal-methods')
    const registered = extensionRegistry.get('indoctrinated.ext.logic-formal-methods')
    expect(registered).toBeDefined()
    const langIds = registered?.languages?.map((l) => l.id)
    expect(langIds).toContain('prolog')
    expect(langIds).toContain('lisp')
    expect(langIds).toContain('scheme')
    expect(langIds).toContain('lambda-calculus')
    expect(langIds).toContain('lean')
    expect(langIds).toContain('coq')
    expect(langIds).toContain('tla')
  })

  it('should contain Prolog/FOPL, Common Lisp, Scheme/Racket, Pure Lambda, and Formal Proof snippets', () => {
    expect(PROLOG_FOPL_SNIPPETS.length).toBeGreaterThan(0)
    expect(COMMON_LISP_SNIPPETS.length).toBeGreaterThan(0)
    expect(SCHEME_RACKET_SNIPPETS.length).toBeGreaterThan(0)
    expect(LAMBDA_CALCULUS_SNIPPETS.length).toBeGreaterThan(0)
    expect(FORMAL_METHODS_SNIPPETS.length).toBeGreaterThan(0)
    expect(PROLOG_FOPL_SNIPPETS.map((s) => s.label)).toContain('prolog-kb-rules')
    expect(LAMBDA_CALCULUS_SNIPPETS.map((s) => s.label)).toContain('lambda-church-numerals')
    expect(LAMBDA_CALCULUS_SNIPPETS.map((s) => s.label)).toContain('lambda-y-combinator')
    expect(LAMBDA_CALCULUS_SNIPPETS.map((s) => s.label)).toContain('lambda-ski-combinators')
  })

  it('should check toolchain.prolog and toolchain.lisp', async () => {
    const prologInfo = await toolchainService.detectOne('toolchain.prolog')
    expect(prologInfo).toBeDefined()
    const lispInfo = await toolchainService.detectOne('toolchain.lisp')
    expect(lispInfo).toBeDefined()
  })
})

describe('Monaco Extension Initializer for all new suites', () => {
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
    expect(registeredLanguages).toContain('prolog')
    expect(registeredLanguages).toContain('lisp')
    expect(registeredLanguages).toContain('scheme')
    expect(registeredLanguages).toContain('lambda-calculus')
    expect(registeredLanguages).toContain('lean')
    expect(registeredLanguages).toContain('coq')
    expect(registeredLanguages).toContain('tla')
  })
})

import * as monaco from 'monaco-editor'
import { ExtensionManifest } from './extensionTypes'
import { textSupportManifest, registerTextSupportExtension } from './textSupport/textSupportExtension'
import { goExtensionManifest, registerGoExtension } from './goSupport/goExtension'
import { rustExtensionManifest, registerRustExtension } from './rustSupport/rustExtension'
import { cppExtensionManifest, registerCppExtension } from './cppSupport/cppExtension'
import { pythonExtensionManifest, registerPythonExtension } from './pythonSupport/pythonExtension'
import { javaExtensionManifest, registerJavaExtension } from './javaSupport/javaExtension'
import { dotnetExtensionManifest, registerDotnetExtension } from './dotnetSupport/dotnetExtension'
import { phpExtensionManifest, registerPhpExtension } from './phpSupport/phpExtension'
import { angularExtensionManifest, registerAngularExtension } from './angularSupport/angularExtension'
import { reactExtensionManifest, registerReactExtension } from './reactSupport/reactExtension'
import { flutterExtensionManifest, registerFlutterExtension } from './flutterSupport/flutterExtension'
import { rubyExtensionManifest, registerRubyExtension } from './rubySupport/rubyExtension'
import { nodeExtensionManifest, registerNodeExtension } from './nodeSupport/nodeExtension'
import { frontendExtensionManifest, registerFrontendMegaPackExtension } from './frontendMegaPack/frontendExtension'
import { backendExtensionManifest, registerBackendMegaPackExtension } from './backendMegaPack/backendExtension'
import { swiftExtensionManifest, registerSwiftExtension } from './swiftSupport/swiftExtension'
import { kotlinExtensionManifest, registerKotlinExtension } from './kotlinSupport/kotlinExtension'
import { devopsExtensionManifest, registerDevopsExtension } from './devopsSupport/devopsExtension'
import { dataScienceExtensionManifest, registerDataScienceExtension } from './dataScienceSupport/dataScienceExtension'
import { beamFunctionalExtensionManifest, registerBeamFunctionalExtension } from './beamFunctionalSupport/beamFunctionalExtension'
import { systemsGamingExtensionManifest, registerSystemsGamingExtension } from './systemsGamingSupport/systemsGamingExtension'
import { databaseSchemaExtensionManifest, registerDatabaseSchemaExtension } from './databaseSchemaSupport/databaseSchemaExtension'
import { web3ExtensionManifest, registerWeb3Extension } from './web3Support/web3Extension'
import { logicFormalExtensionManifest, registerLogicFormalExtension } from './logicFormalSupport/logicFormalExtension'
import { databaseExtensionManifest, registerDatabaseExtension } from './databaseStudio/databaseExtension'
import { restClientExtensionManifest, registerRestClientExtension } from './restClient/restClientExtension'
import { luaExtensionManifest, registerLuaExtension } from './luaSupport/luaExtension'
import { zigExtensionManifest, registerZigExtension } from './zigSupport/zigExtension'
import { gdscriptExtensionManifest, registerGDScriptExtension } from './gdscriptSupport/gdscriptExtension'
import { shellScriptExtensionManifest, registerShellScriptExtension } from './shellScriptSupport/shellScriptExtension'
import { juliaExtensionManifest, registerJuliaExtension } from './juliaSupport/juliaExtension'
import { mcpExtensionManifest, registerMcpExtension } from './mcpSupport/mcpExtension'
import { antigravityExtensionManifest, registerAntigravityExtension } from './antigravitySupport/antigravityExtension'
import { remoteProtocolExtensionManifest, registerRemoteProtocolExtension } from './remoteProtocolSupport/remoteProtocolExtension'
import { prettierExtensionManifest, registerPrettierExtension } from './formatterSupport/prettierExtension'
import { conflictResolutionService } from '../services/conflictResolutionService'
import { notificationService } from '../services/notificationService'

class ExtensionRegistry {
  private extensions: Map<string, ExtensionManifest> = new Map()

  constructor() {
    // 1. Universal Text & Prose Pack
    this.register(textSupportManifest)

    // 2. Go Universal Suite & Toolchain
    this.register(goExtensionManifest)

    // 3. Rust & Cargo Ecosystem Extension
    this.register(rustExtensionManifest)

    // 4. C/C++ Universal Engine & Toolchain
    this.register(cppExtensionManifest)

    // 5. Python & AI Ecosystem Extension
    this.register(pythonExtensionManifest)

    // 6. Java & JVM Universal Suite
    this.register(javaExtensionManifest)

    // 7. .NET & C# Enterprise Suite
    this.register(dotnetExtensionManifest)

    // 8. PHP & Laravel Ecosystem Suite
    this.register(phpExtensionManifest)

    // 9. Angular & TypeScript Enterprise Suite
    this.register(angularExtensionManifest)

    // 10. React 19 & Next.js Modern Ecosystem
    this.register(reactExtensionManifest)

    // 11. Flutter & Dart Mobile/Desktop Suite
    this.register(flutterExtensionManifest)

    // 12. Ruby & Ruby on Rails Suite
    this.register(rubyExtensionManifest)

    // 13. Node.js Core Runtime Suite
    this.register(nodeExtensionManifest)

    // 14. Universal Frontend Mega-Pack
    this.register(frontendExtensionManifest)

    // 15. Universal Backend Mega-Pack
    this.register(backendExtensionManifest)

    // 16. Native Apple & Swift Suite
    this.register(swiftExtensionManifest)

    // 17. Kotlin & Android Multiplatform Suite
    this.register(kotlinExtensionManifest)

    // 18. DevOps, Cloud IaC & Container Suite
    this.register(devopsExtensionManifest)

    // 19. Data Science, R & Numerical Computing Suite
    this.register(dataScienceExtensionManifest)

    // 20. BEAM & Functional Programming Suite
    this.register(beamFunctionalExtensionManifest)

    // 21. Systems, Native Performance & Game Scripting Suite
    this.register(systemsGamingExtensionManifest)

    // 22. Database, SQL Dialects & API Schema Pack
    this.register(databaseSchemaExtensionManifest)

    // 23. Web3, Smart Contracts & Zero-Knowledge Suite
    this.register(web3ExtensionManifest)

    // 24. Logic Programming, Lambda Calculus & Formal Methods Suite
    this.register(logicFormalExtensionManifest)

    // 25. Database Studio & SQL Query Runner
    this.register(databaseExtensionManifest)

    // 26. REST & GraphQL API Client
    this.register(restClientExtensionManifest)

    // 27. Dedicated Lua & Luau Game Engine Suite
    this.register(luaExtensionManifest)

    // 28. Dedicated Zig Native Systems Suite
    this.register(zigExtensionManifest)

    // 29. Dedicated Godot & GDScript 4 Suite
    this.register(gdscriptExtensionManifest)

    // 30. Universal Shell & PowerShell Automation Suite
    this.register(shellScriptExtensionManifest)

    // 31. Dedicated Julia High-Performance Scientific Suite
    this.register(juliaExtensionManifest)

    // 32. Model Context Protocol (MCP) & AI Agent Studio
    this.register(mcpExtensionManifest)

    // 33. Google Antigravity Suite & Agent Subsystem
    this.register(antigravityExtensionManifest)

    // 34. Remote Protocol Studio (SSH, SFTP, FTP & SMTP)
    this.register(remoteProtocolExtensionManifest)

    // 35. Cryptography & DevTools Studio
    this.register({
      id: 'indoctrinated.ext.cryptolab',
      name: 'Cryptography & DevTools Studio',
      version: '1.0.0',
      description: 'Interactive JWT inspector/signer, universal hashes/HMAC, codecs, UUID/ULID entropy generators, epoch time machine, and format transformers.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'ShieldCheck',
      status: 'Active',
      type: 'Built-in',
    })

    // JSON & JQ Structure Studio
    this.register({
      id: 'indoctrinated.ext.jsonstudio',
      name: 'JSON & JQ Structure Studio',
      version: '1.0.0',
      description: 'Interactive JQ/JMESPath query sandbox, collapsible hierarchical tree explorer, JSON Schema validator, and multi-format data transformer.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'FileCode2',
      status: 'Active',
      type: 'Built-in',
    })

    // 33. Live Markdown, Static HTML & Mermaid Diagram Studio
    this.register({
      id: 'indoctrinated.ext.livepreview',
      name: 'Live Markdown, HTML & Mermaid Diagram Studio',
      version: '1.0.0',
      description: 'Split-canvas and dock live preview for Markdown and HTML with GitHub alerts, tables, and Mermaid.js vector diagram rendering.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'Eye',
      status: 'Active',
      type: 'Built-in',
    })

    // 34. Docker & Container Studio
    this.register({
      id: 'indoctrinated.ext.docker',
      name: 'Docker & Container Studio',
      version: '1.0.0',
      description: 'Visual Docker container dashboard, CPU/Memory telemetry meters, live log streaming, volumes/images inspector, and compose generator.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'Container',
      status: 'Active',
      type: 'Built-in',
    })

    // 35. WebSocket & Event Streams Workbench
    this.register({
      id: 'indoctrinated.ext.websocket',
      name: 'WebSocket & Event Streams Workbench',
      version: '1.0.0',
      description: 'Real-time bidirectional WebSocket and event stream testing client with interactive packet composer and message waterfall.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'Radio',
      status: 'Active',
      type: 'Built-in',
    })

    // 36. Visual Regex & Pattern Lab
    this.register({
      id: 'indoctrinated.ext.regexlab',
      name: 'Visual Regex & Pattern Lab',
      version: '1.0.0',
      description: 'Interactive regex arena with real-time match highlighting, capture group inspector, token-by-token natural language explainer, and multi-language code generation.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'Code2',
      status: 'Active',
      type: 'Built-in',
    })

    // 37. Package & Dependency Manager
    this.register({
      id: 'indoctrinated.ext.packagemanager',
      name: 'Package & Dependency Manager',
      version: '1.0.0',
      description: 'Universal manifest scanner for package.json, requirements.txt, Cargo.toml, and go.mod with outdated dependency and CVE vulnerability detection.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'Package',
      status: 'Active',
      type: 'Built-in',
    })

    // 38. Task Runner & Cron Expression Studio
    this.register({
      id: 'indoctrinated.ext.taskrunner',
      name: 'Task Runner & Cron Expression Studio',
      version: '1.0.0',
      description: 'Workspace project scripts discovery runner and 5-field Cron schedule builder with natural English translation and projection triggers.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'Play',
      status: 'Active',
      type: 'Built-in',
    })

    // 39. Liquid Glass Shader Shaper
    this.register({
      id: 'indoctrinated.ext.liquid-glass-fx',
      name: 'Liquid Glass Shader Shaper',
      version: '1.0.1',
      description: 'Specular reflection, frosted glass blur, and dynamic chromatic aberration theme rendering engine.',
      author: 'indoctrinatedrecluse',
      category: 'Themes',
      iconName: 'Sparkles',
      status: 'Running',
      type: 'Microservice',
    })

    // 40. Unified Diagnostics & Toolchain Bus
    this.register({
      id: 'indoctrinated.ext.linter',
      name: 'Unified Diagnostics & Toolchain Bus',
      version: '1.0.1',
      description: 'Multi-compiler discovery for Node, Python, Rust, Go, GCC, C#, Java, PHP, Ruby, Flutter, Swift, Kotlin, R, Julia, Elixir, Zig, Lua, GDScript, SQL, Solidity, and Shell with real-time error markers.',
      author: 'indoctrinatedrecluse',
      category: 'Linters',
      iconName: 'Cpu',
      status: 'Running',
      type: 'Microservice',
    })

    // 33. Universal Code Formatter (Prettier Multi-Language Engine)
    this.register(prettierExtensionManifest)

    // Index all registered manifests into the conflict arbiter
    this.reindexConflicts()
  }

  public register(manifest: ExtensionManifest) {
    this.extensions.set(manifest.id, manifest)
    this.reindexConflicts()
  }

  public get(id: string): ExtensionManifest | undefined {
    return this.extensions.get(id)
  }

  public getAll(): ExtensionManifest[] {
    return Array.from(this.extensions.values())
  }

  public reindexConflicts(): void {
    conflictResolutionService.indexManifests(this.getAll())
  }

  public resolveLanguageForFilename(filename: string, content?: string): string {
    const res = conflictResolutionService.resolveLanguageForFilename(filename, content)
    return res.languageId
  }

  public initializeMonacoExtensions(monacoInstance: typeof monaco) {
    const safeInit = (name: string, fn: () => void) => {
      try {
        fn()
      } catch (err) {
        notificationService.notifyError(
          'Extension System',
          `Failed to initialize extension ${name}: ${err instanceof Error ? err.message : String(err)}. Monaco will fall back to default syntax highlighting.`
        )
      }
    }

    safeInit('Text Support', () => registerTextSupportExtension(monacoInstance))
    safeInit('Go Universal', () => registerGoExtension(monacoInstance))
    safeInit('Rust Ecosystem', () => registerRustExtension(monacoInstance))
    safeInit('C/C++ Universal', () => registerCppExtension(monacoInstance))
    safeInit('Python AI', () => registerPythonExtension(monacoInstance))
    safeInit('Java Universal', () => registerJavaExtension(monacoInstance))
    safeInit('Dotnet Suite', () => registerDotnetExtension(monacoInstance))
    safeInit('PHP & Laravel', () => registerPhpExtension(monacoInstance))
    safeInit('Angular Enterprise', () => registerAngularExtension(monacoInstance))
    safeInit('React Ecosystem', () => registerReactExtension(monacoInstance))
    safeInit('Flutter & Dart', () => registerFlutterExtension(monacoInstance))
    safeInit('Ruby & Rails', () => registerRubyExtension(monacoInstance))
    safeInit('Node.js Core', () => registerNodeExtension(monacoInstance))
    safeInit('Frontend Mega-Pack', () => registerFrontendMegaPackExtension(monacoInstance))
    safeInit('Backend Mega-Pack', () => registerBackendMegaPackExtension(monacoInstance))
    safeInit('Native Apple & Swift', () => registerSwiftExtension(monacoInstance))
    safeInit('Kotlin & Android Multiplatform', () => registerKotlinExtension(monacoInstance))
    safeInit('DevOps & Cloud IaC', () => registerDevopsExtension(monacoInstance))
    safeInit('Data Science & R Analytics', () => registerDataScienceExtension(monacoInstance))
    safeInit('BEAM & Functional Programming', () => registerBeamFunctionalExtension(monacoInstance))
    safeInit('Systems & Game Scripting', () => registerSystemsGamingExtension(monacoInstance))
    safeInit('Database & Schema Pack', () => registerDatabaseSchemaExtension(monacoInstance))
    safeInit('Database Studio', () => registerDatabaseExtension(monacoInstance))
    safeInit('REST & GraphQL Client', () => registerRestClientExtension(monacoInstance))
    safeInit('Web3 & Smart Contracts', () => registerWeb3Extension(monacoInstance))
    safeInit('Logic & Formal Methods', () => registerLogicFormalExtension(monacoInstance))
    safeInit('Lua & Luau Game Engine', () => registerLuaExtension(monacoInstance))
    safeInit('Zig Native Systems', () => registerZigExtension(monacoInstance))
    safeInit('Godot & GDScript', () => registerGDScriptExtension(monacoInstance))
    safeInit('Shell & PowerShell Automation', () => registerShellScriptExtension(monacoInstance))
    safeInit('Julia High-Performance Scientific', () => registerJuliaExtension(monacoInstance))
    safeInit('MCP Server & Agent Studio', () => registerMcpExtension(monacoInstance))
    safeInit('Google Antigravity', () => registerAntigravityExtension(monacoInstance))
    safeInit('Remote Protocol Studio (SSH/SFTP/SMTP)', () => registerRemoteProtocolExtension(monacoInstance))
    safeInit('Universal Code Formatter (Prettier)', () => registerPrettierExtension(monacoInstance))
  }
}

export const extensionRegistry = new ExtensionRegistry()

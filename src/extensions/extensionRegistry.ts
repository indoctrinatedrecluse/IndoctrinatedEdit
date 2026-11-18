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
import { jupyterExtensionManifest, registerJupyterExtension } from './jupyterSupport/jupyterExtension'
import { prettierExtensionManifest, registerPrettierExtension } from './formatterSupport/prettierExtension'
import { conflictResolutionService } from '../services/conflictResolutionService'
import { notificationService } from '../services/notificationService'
import { outputChannelService } from '../services/outputChannelService'
import { ensureCustomLanguagesRegistered } from './extensionHelpers'

const DISABLED_EXTENSIONS_STORAGE_KEY = 'indoctrinated_disabled_extensions_v1'

class ExtensionRegistry {
  private extensions: Map<string, ExtensionManifest> = new Map()
  private disabledIds: Set<string> = new Set()
  private disposablesByExtension: Map<string, monaco.IDisposable[]> = new Map()
  private registrars: Map<string, { name: string; fn: (m: typeof monaco) => monaco.IDisposable[] | void }> = new Map()
  private monacoInstance: typeof monaco | null = null
  private listeners: Set<() => void> = new Set()
  private isConstructing = true

  constructor() {
    this.loadDisabledState()
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

    // 35. Jupyter Notebooks & Live Kernel Studio
    this.register(jupyterExtensionManifest)

    // 35. Cryptography & DevTools Studio (PRO)
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
      isPro: true,
    })

    // MockLab API Mock Server (PRO)
    this.register({
      id: 'indoctrinated.ext.mocklab',
      name: 'MockLab API Mock Server',
      version: '1.0.0',
      description: 'Zero-config local HTTP mock server, endpoint route builder, response latency simulator, and real-time traffic audit logs.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'Server',
      status: 'Active',
      type: 'Built-in',
      isPro: true,
    })

    // GraphQL & gRPC Studio (PRO)
    this.register({
      id: 'indoctrinated.ext.graphql',
      name: 'GraphQL and gRPC Studio',
      version: '1.0.0',
      description: 'Interactive GraphQL query runner with schema visualizer, gRPC proto explorer, variable composer, and introspection engine.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'Globe',
      status: 'Active',
      type: 'Built-in',
      isPro: true,
    })

    // SVG & Asset Studio (PRO)
    this.register({
      id: 'indoctrinated.ext.svgstudio',
      name: 'SVG & Asset Studio',
      version: '1.0.0',
      description: 'Vector graphics visual canvas, path bezier handles, SVG optimizer/minifier, code generator, and multi-format raster exporter.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'Shapes',
      status: 'Active',
      type: 'Built-in',
      isPro: true,
    })

    // AI Multi-Model Assistant (PRO)
    this.register({
      id: 'indoctrinated.ext.aiassistant',
      name: 'AI Multi-Model Assistant',
      version: '1.0.0',
      description: 'Context-aware AI coding copilot supporting Google Gemini 2.5 Pro/Flash, OpenAI GPT-4o, Claude 3.5 Sonnet, Local Ollama, and inline refactoring.',
      author: 'indoctrinatedrecluse',
      category: 'AI',
      iconName: 'Bot',
      status: 'Active',
      type: 'Built-in',
      isPro: true,
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

    // 33. Universal Document & Prose Studio (Markdown, PDF, DOCX & Office)
    this.register({
      id: 'indoctrinated.ext.livepreview',
      name: 'Universal Document & Prose Studio',
      version: '1.2.0',
      description: 'Split-canvas, in-tab, and dock live document preview for Markdown, PDF, Microsoft Word (DOCX/DOC), HTML, and SVG with GitHub alerts, LaTeX math, and Mermaid.js diagrams.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'FileText',
      status: 'Active',
      type: 'Built-in',
    })

    // 34. Docker & Container Studio (PRO)
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
      isPro: true,
    })

    // 35. WebSocket & Event Streams Workbench (PRO)
    this.register({
      id: 'indoctrinated.ext.websocket',
      name: 'WebSocket & Event Streams Worklab',
      version: '1.0.0',
      description: 'Real-time bidirectional WebSocket and event stream testing client with interactive packet composer and message waterfall.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'Radio',
      status: 'Active',
      type: 'Built-in',
      isPro: true,
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

    // 39. Liquid Glass Shader Shaper (Core Theme Engine)
    this.register({
      id: 'indoctrinated.ext.liquid-glass-fx',
      name: 'Liquid Glass Theme & Shader Engine',
      version: '6.0.0',
      description: 'Built-in glassmorphism theme presets, frosted glass surfaces, and specular reflection CSS styling.',
      author: 'indoctrinatedrecluse',
      category: 'Themes',
      iconName: 'Sparkles',
      status: 'Active',
      type: 'Built-in',
    })

    // 40. Unified Diagnostics & Toolchain Bus (Core Diagnostics Engine)
    this.register({
      id: 'indoctrinated.ext.linter',
      name: 'Unified Diagnostics & Toolchain Bus',
      version: '6.0.0',
      description: 'Multi-compiler discovery for Node, Python, Rust, Go, GCC, C#, Java, PHP, Ruby, Flutter, Swift, Kotlin, R, Julia, Elixir, Zig, Lua, GDScript, SQL, Solidity, and Shell with real-time error markers.',
      author: 'indoctrinatedrecluse',
      category: 'Linters',
      iconName: 'Cpu',
      status: 'Active',
      type: 'Built-in',
    })

    // 41. Universal Code Formatter (Prettier Multi-Language Engine)
    this.register(prettierExtensionManifest)

    // 42-50. Built-in Free RightDock Studios (previously unlisted in Extensions Sidebar)
    this.register({
      id: 'indoctrinated.ext.portsentinel',
      name: 'Port Sentinel & Process Monitor',
      version: '1.0.0',
      description: 'Inspect listening TCP/UDP dev ports, probe local endpoints, and terminate stuck processes.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'Radio',
      status: 'Active',
      type: 'Built-in',
    })

    this.register({
      id: 'indoctrinated.ext.redisstudio',
      name: 'Redis & Key-Value Studio',
      version: '1.0.0',
      description: 'Key-value explorer, TTL inspector, interactive command REPL, and Pub/Sub stream monitor.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'Database',
      status: 'Active',
      type: 'Built-in',
    })

    this.register({
      id: 'indoctrinated.ext.envvault',
      name: 'Env & Secret Vault Studio',
      version: '1.0.0',
      description: 'Manage .env profiles, mask secrets, scan for credential leaks, and export AES-256-GCM encrypted bundles.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'Lock',
      status: 'Active',
      type: 'Built-in',
    })

    this.register({
      id: 'indoctrinated.ext.diagramstudio',
      name: 'Diagram & Architecture Studio',
      version: '1.0.0',
      description: 'Visual Mermaid diagram workbench and workspace dependency radar graph.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'GitBranch',
      status: 'Active',
      type: 'Built-in',
    })

    this.register({
      id: 'indoctrinated.ext.bundleanalyzer',
      name: 'Bundle & Chunk Analyzer',
      version: '1.0.0',
      description: 'Inspect build bundle sizes, tree-shaking estimates, and duplicate dependency alerts.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'Package',
      status: 'Active',
      type: 'Built-in',
    })

    this.register({
      id: 'indoctrinated.ext.diffstudio',
      name: 'Diff & 3-Way Merge Studio',
      version: '1.0.0',
      description: 'Compare code revisions, inspect unified patches, and resolve Git merge conflicts interactively.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'FileCode2',
      status: 'Active',
      type: 'Built-in',
    })

    this.register({
      id: 'indoctrinated.ext.hexinspector',
      name: 'Binary & Hex Inspector',
      version: '1.0.0',
      description: 'Byte-level hex dump viewer with signed/unsigned int, float, binary, and ASCII decoding.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'Cpu',
      status: 'Active',
      type: 'Built-in',
    })

    this.register({
      id: 'indoctrinated.ext.snippetvault',
      name: 'Snippet Vault & Scratchpad',
      version: '1.0.0',
      description: 'Persistent personal code snippet library and quick developer scratchpad.',
      author: 'indoctrinatedrecluse',
      category: 'Tools',
      iconName: 'Code2',
      status: 'Active',
      type: 'Built-in',
    })

    this.register({
      id: 'indoctrinated.ext.colorstudio',
      name: 'Color & Liquid Glass Studio',
      version: '1.0.0',
      description: 'Color space converter, WCAG contrast checker, harmony generator, and glassmorphism shader builder.',
      author: 'indoctrinatedrecluse',
      category: 'Themes',
      iconName: 'Sparkles',
      status: 'Active',
      type: 'Built-in',
    })

    this.isConstructing = false
    // Batch-index all registered manifests ONCE into the conflict arbiter
    this.reindexConflicts()
    this.syncVisualExtensionState()
  }

  private syncVisualExtensionState(): void {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.dataset.liquidGlassExt = this.isEnabled('indoctrinated.ext.liquid-glass-fx') ? 'on' : 'off'
    }
  }

  private loadDisabledState(): void {
    try {
      if (typeof localStorage === 'undefined') return
      const raw = localStorage.getItem(DISABLED_EXTENSIONS_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        for (const id of parsed) {
          if (typeof id === 'string') this.disabledIds.add(id)
        }
      }
    } catch {
      // Ignore storage access errors
    }
  }

  private persistDisabledState(): void {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(DISABLED_EXTENSIONS_STORAGE_KEY, JSON.stringify(Array.from(this.disabledIds)))
    } catch {
      // Ignore storage quota errors
    }
  }

  private notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn()
      } catch {
        // Isolate subscriber errors
      }
    })
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  public register(manifest: ExtensionManifest, options?: { skipReindex?: boolean }) {
    const hydrated: ExtensionManifest = {
      ...manifest,
      status: this.disabledIds.has(manifest.id) ? 'Disabled' : manifest.status,
    }
    this.extensions.set(manifest.id, hydrated)
    if (!this.isConstructing && !options?.skipReindex) {
      this.reindexConflicts()
      this.notify()
    }
  }

  public isEnabled(id: string): boolean {
    const ext = this.extensions.get(id)
    if (!ext) return false
    return ext.status !== 'Disabled' && !this.disabledIds.has(id)
  }

  public disable(id: string): boolean {
    const ext = this.extensions.get(id)
    if (!ext) return false
    this.disabledIds.add(id)
    this.extensions.set(id, { ...ext, status: 'Disabled' })

    const disposables = this.disposablesByExtension.get(id)
    if (disposables) {
      for (const d of disposables) {
        try {
          d.dispose()
        } catch {
          // Ignore disposal errors
        }
      }
      this.disposablesByExtension.delete(id)
    }

    this.persistDisabledState()
    this.reindexConflicts()
    this.syncVisualExtensionState()
    outputChannelService.append('Extensions', `Disabled extension: ${ext.name} (${id})`, 'info')
    this.notify()
    return true
  }

  public enable(id: string): boolean {
    const ext = this.extensions.get(id)
    if (!ext) return false
    this.disabledIds.delete(id)
    this.extensions.set(id, { ...ext, status: 'Active' })
    this.persistDisabledState()
    this.reindexConflicts()
    this.syncVisualExtensionState()

    // Re-register Monaco providers live if Monaco is already initialized
    if (this.monacoInstance && this.registrars.has(id) && !this.disposablesByExtension.has(id)) {
      const entry = this.registrars.get(id)!
      this.invokeRegistrar(id, entry.name, entry.fn, this.monacoInstance)
    }

    outputChannelService.append('Extensions', `Enabled extension: ${ext.name} (${id})`, 'success')
    this.notify()
    return true
  }

  public toggle(id: string): boolean {
    return this.isEnabled(id) ? !this.disable(id) : this.enable(id)
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

  private invokeRegistrar(
    id: string,
    name: string,
    fn: (m: typeof monaco) => monaco.IDisposable[] | void,
    monacoInstance: typeof monaco
  ) {
    if (!this.isEnabled(id) || this.disposablesByExtension.has(id)) return
    const captured: monaco.IDisposable[] = []
    const track = (val: unknown) => {
      if (val && typeof (val as monaco.IDisposable).dispose === 'function' && !captured.includes(val as monaco.IDisposable)) {
        captured.push(val as monaco.IDisposable)
      }
    }

    const wrappedLanguages = monacoInstance?.languages
      ? new Proxy(monacoInstance.languages, {
          get(target, prop, receiver) {
            const orig = Reflect.get(target, prop, receiver)
            if (
              typeof orig === 'function' &&
              typeof prop === 'string' &&
              (prop.startsWith('register') || prop === 'setLanguageConfiguration' || prop === 'setMonarchTokensProvider')
            ) {
              return (...args: unknown[]) => {
                const res = orig.apply(target, args)
                track(res)
                return res
              }
            }
            return orig
          },
        })
      : monacoInstance?.languages

    const wrappedMonaco = monacoInstance
      ? new Proxy(monacoInstance, {
          get(target, prop, receiver) {
            if (prop === 'languages') return wrappedLanguages
            return Reflect.get(target, prop, receiver)
          },
        })
      : monacoInstance

    try {
      const result = fn(wrappedMonaco)
      if (Array.isArray(result)) {
        for (const d of result) track(d)
      }
      if (captured.length > 0) {
        this.disposablesByExtension.set(id, captured)
      }
    } catch (err) {
      notificationService.notifyError(
        'Extension System',
        `Failed to initialize extension ${name}: ${err instanceof Error ? err.message : String(err)}. Monaco will fall back to default syntax highlighting.`
      )
    }
  }

  public initializeMonacoExtensions(monacoInstance: typeof monaco) {
    this.monacoInstance = monacoInstance
    // Register all custom non-builtin Monaco language IDs + Monarch tokenizers FIRST
    ensureCustomLanguagesRegistered(monacoInstance)

    const registerAndInit = (id: string, name: string, fn: (m: typeof monaco) => monaco.IDisposable[] | void) => {
      this.registrars.set(id, { name, fn })
      this.invokeRegistrar(id, name, fn, monacoInstance)
    }

    registerAndInit(textSupportManifest.id, 'Text Support', registerTextSupportExtension)
    registerAndInit(goExtensionManifest.id, 'Go Universal', registerGoExtension)
    registerAndInit(rustExtensionManifest.id, 'Rust Ecosystem', registerRustExtension)
    registerAndInit(cppExtensionManifest.id, 'C/C++ Universal', registerCppExtension)
    registerAndInit(pythonExtensionManifest.id, 'Python AI', registerPythonExtension)
    registerAndInit(javaExtensionManifest.id, 'Java Universal', registerJavaExtension)
    registerAndInit(dotnetExtensionManifest.id, 'Dotnet Suite', registerDotnetExtension)
    registerAndInit(phpExtensionManifest.id, 'PHP & Laravel', registerPhpExtension)
    registerAndInit(angularExtensionManifest.id, 'Angular Enterprise', registerAngularExtension)
    registerAndInit(reactExtensionManifest.id, 'React Ecosystem', registerReactExtension)
    registerAndInit(flutterExtensionManifest.id, 'Flutter & Dart', registerFlutterExtension)
    registerAndInit(rubyExtensionManifest.id, 'Ruby & Rails', registerRubyExtension)
    registerAndInit(nodeExtensionManifest.id, 'Node.js Core', registerNodeExtension)
    registerAndInit(frontendExtensionManifest.id, 'Frontend Mega-Pack', registerFrontendMegaPackExtension)
    registerAndInit(backendExtensionManifest.id, 'Backend Mega-Pack', registerBackendMegaPackExtension)
    registerAndInit(swiftExtensionManifest.id, 'Native Apple & Swift', registerSwiftExtension)
    registerAndInit(kotlinExtensionManifest.id, 'Kotlin & Android Multiplatform', registerKotlinExtension)
    registerAndInit(devopsExtensionManifest.id, 'DevOps & Cloud IaC', registerDevopsExtension)
    registerAndInit(dataScienceExtensionManifest.id, 'Data Science & R Analytics', registerDataScienceExtension)
    registerAndInit(beamFunctionalExtensionManifest.id, 'BEAM & Functional Programming', registerBeamFunctionalExtension)
    registerAndInit(systemsGamingExtensionManifest.id, 'Systems & Game Scripting', registerSystemsGamingExtension)
    registerAndInit(databaseSchemaExtensionManifest.id, 'Database & Schema Pack', registerDatabaseSchemaExtension)
    registerAndInit(databaseExtensionManifest.id, 'Database Studio', registerDatabaseExtension)
    registerAndInit(restClientExtensionManifest.id, 'REST & GraphQL Client', registerRestClientExtension)
    registerAndInit(web3ExtensionManifest.id, 'Web3 & Smart Contracts', registerWeb3Extension)
    registerAndInit(logicFormalExtensionManifest.id, 'Logic & Formal Methods', registerLogicFormalExtension)
    registerAndInit(luaExtensionManifest.id, 'Lua & Luau Game Engine', registerLuaExtension)
    registerAndInit(zigExtensionManifest.id, 'Zig Native Systems', registerZigExtension)
    registerAndInit(gdscriptExtensionManifest.id, 'Godot & GDScript', registerGDScriptExtension)
    registerAndInit(shellScriptExtensionManifest.id, 'Shell & PowerShell Automation', registerShellScriptExtension)
    registerAndInit(juliaExtensionManifest.id, 'Julia High-Performance Scientific', registerJuliaExtension)
    registerAndInit(mcpExtensionManifest.id, 'MCP Server & Agent Studio', registerMcpExtension)
    registerAndInit(antigravityExtensionManifest.id, 'Google Antigravity', registerAntigravityExtension)
    registerAndInit(remoteProtocolExtensionManifest.id, 'Remote Protocol Studio (SSH/SFTP/SMTP)', registerRemoteProtocolExtension)
    registerAndInit(jupyterExtensionManifest.id, 'Jupyter Notebooks & Live Kernel Studio', registerJupyterExtension)
    registerAndInit(prettierExtensionManifest.id, 'Universal Code Formatter (Prettier)', registerPrettierExtension)
    outputChannelService.append('Extensions', `Initialized ${this.registrars.size} Monaco extension registrars.`, 'success')
  }
}

export const extensionRegistry = new ExtensionRegistry()

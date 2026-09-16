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

    // 18. DevOps, Cloud IaC & Shell Automation Suite
    this.register(devopsExtensionManifest)

    // 19. Data Science, AI & Scientific Computing Suite
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

    // 25. Liquid Glass Shader Shaper
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

    // 26. Unified Diagnostics & Toolchain Bus
    this.register({
      id: 'indoctrinated.ext.linter',
      name: 'Unified Diagnostics & Toolchain Bus',
      version: '1.0.1',
      description: 'Multi-compiler discovery for Node, Python, Rust, Go, GCC, C#, Java, PHP, Ruby, Flutter, Swift, Kotlin, R, Julia, Elixir, Zig, SQL, Solidity, and Prolog with real-time error markers.',
      author: 'indoctrinatedrecluse',
      category: 'Linters',
      iconName: 'Cpu',
      status: 'Running',
      type: 'Microservice',
    })
  }

  public register(manifest: ExtensionManifest) {
    this.extensions.set(manifest.id, manifest)
  }

  public get(id: string): ExtensionManifest | undefined {
    return this.extensions.get(id)
  }

  public getAll(): ExtensionManifest[] {
    return Array.from(this.extensions.values())
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
    safeInit('Data Science & AI', () => registerDataScienceExtension(monacoInstance))
    safeInit('BEAM & Functional Programming', () => registerBeamFunctionalExtension(monacoInstance))
    safeInit('Systems & Game Scripting', () => registerSystemsGamingExtension(monacoInstance))
    safeInit('Database & Schema Pack', () => registerDatabaseSchemaExtension(monacoInstance))
    safeInit('Web3 & Smart Contracts', () => registerWeb3Extension(monacoInstance))
    safeInit('Logic & Formal Methods', () => registerLogicFormalExtension(monacoInstance))
  }
}

export const extensionRegistry = new ExtensionRegistry()



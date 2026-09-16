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

    // 13. Liquid Glass Shader Shaper
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

    // 14. Unified Diagnostics & Toolchain Bus
    this.register({
      id: 'indoctrinated.ext.linter',
      name: 'Unified Diagnostics & Toolchain Bus',
      version: '1.0.1',
      description: 'Multi-compiler discovery for Python, Rust, Go, GCC, C#, Java, PHP, Ruby, and Flutter with real-time error markers.',
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
    registerTextSupportExtension(monacoInstance)
    registerGoExtension(monacoInstance)
    registerRustExtension(monacoInstance)
    registerCppExtension(monacoInstance)
    registerPythonExtension(monacoInstance)
    registerJavaExtension(monacoInstance)
    registerDotnetExtension(monacoInstance)
    registerPhpExtension(monacoInstance)
    registerAngularExtension(monacoInstance)
    registerReactExtension(monacoInstance)
    registerFlutterExtension(monacoInstance)
    registerRubyExtension(monacoInstance)
  }
}

export const extensionRegistry = new ExtensionRegistry()

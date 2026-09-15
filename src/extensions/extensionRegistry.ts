import * as monaco from 'monaco-editor'
import { ExtensionManifest } from './extensionTypes'
import { textSupportManifest, registerTextSupportExtension } from './textSupport/textSupportExtension'
import { goExtensionManifest, registerGoExtension } from './goSupport/goExtension'
import { rustExtensionManifest, registerRustExtension } from './rustSupport/rustExtension'

class ExtensionRegistry {
  private extensions: Map<string, ExtensionManifest> = new Map()

  constructor() {
    // 1. Universal Text & Prose Pack
    this.register(textSupportManifest)

    // 2. Go Universal Suite & Toolchain
    this.register(goExtensionManifest)

    // 3. Rust & Cargo Ecosystem Extension
    this.register(rustExtensionManifest)

    // 4. TypeScript & React Engine
    this.register({
      id: 'indoctrinated.ext.typescript',
      name: 'TypeScript & React Engine',
      version: '1.0.1',
      description: 'Heavyweight language services, autocompletion, type inference, and syntax support for TSX and JSX.',
      author: 'indoctrinatedrecluse',
      category: 'Languages',
      iconName: 'Code2',
      status: 'Active',
      type: 'Built-in',
      snippetsCount: 32,
    })

    // 5. Liquid Glass Shader Shaper
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

    // 6. Unified Diagnostics & Toolchain Bus
    this.register({
      id: 'indoctrinated.ext.linter',
      name: 'Unified Diagnostics & Toolchain Bus',
      version: '1.0.1',
      description: 'Multi-compiler discovery for Python, Rust, Go, GCC, C#, and Java with real-time error markers.',
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
  }
}

export const extensionRegistry = new ExtensionRegistry()

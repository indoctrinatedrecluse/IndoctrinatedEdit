import { describe, it, expect, vi } from 'vitest'
import { nodeExtensionManifest } from '../src/extensions/nodeSupport/nodeExtension'
import { NODE_SNIPPETS } from '../src/extensions/nodeSupport/nodeSnippets'
import { frontendExtensionManifest } from '../src/extensions/frontendMegaPack/frontendExtension'
import {
  VUE_SNIPPETS,
  SVELTE_SNIPPETS,
  SOLID_SNIPPETS,
  PREACT_SNIPPETS,
  STREAMLIT_SNIPPETS,
  DASH_SNIPPETS,
  REFLEX_SNIPPETS,
  FLET_SNIPPETS,
  ANVIL_SNIPPETS,
  LIVEWIRE_SNIPPETS,
  INERTIA_SNIPPETS,
  BLADE_UI_SNIPPETS,
  SYMFONY_UX_SNIPPETS,
  HOTWIRE_SNIPPETS,
  VIEWCOMPONENT_SNIPPETS,
  BLAZOR_SNIPPETS,
  ALPINE_SNIPPETS,
} from '../src/extensions/frontendMegaPack/frontendSnippets'
import { backendExtensionManifest } from '../src/extensions/backendMegaPack/backendExtension'
import {
  EXPRESS_SNIPPETS,
  NESTJS_SNIPPETS,
  FASTIFY_SNIPPETS,
  KOA_SNIPPETS,
  HONO_SNIPPETS,
  DJANGO_NINJA_SNIPPETS,
  FASTAPI_SNIPPETS,
  SANIC_SNIPPETS,
  FLASK_SNIPPETS,
  SYMFONY_BACKEND_SNIPPETS,
  CODEIGNITER_SNIPPETS,
  SLIM_SNIPPETS,
  SINATRA_SNIPPETS,
  HANAMI_SNIPPETS,
  KTOR_SNIPPETS,
  SPRING_BOOT_SNIPPETS,
  MICRONAUT_SNIPPETS,
  QUARKUS_SNIPPETS,
  GIN_SNIPPETS,
  FIBER_SNIPPETS,
  ECHO_SNIPPETS,
  DOTNET_BACKEND_SNIPPETS,
  ACTIX_SNIPPETS,
  AXUM_SNIPPETS,
} from '../src/extensions/backendMegaPack/backendSnippets'
import { extensionRegistry } from '../src/extensions/extensionRegistry'
import { toolchainService } from '../src/services/toolchainService'
import { notificationService } from '../src/services/notificationService'

describe('Node.js Extension & Snippets Suite', () => {
  it('should have valid Node.js extension manifest registered', () => {
    expect(nodeExtensionManifest.id).toBe('indoctrinated.ext.node-pack')
    expect(nodeExtensionManifest.category).toBe('Tools')
    const registered = extensionRegistry.get('indoctrinated.ext.node-pack')
    expect(registered).toBeDefined()
    expect(registered?.name).toContain('Node.js')
  })

  it('should contain robust Node.js standard snippets', () => {
    expect(NODE_SNIPPETS.length).toBeGreaterThanOrEqual(10)
    const labels = NODE_SNIPPETS.map((s) => s.label)
    expect(labels).toContain('node-httpserver')
    expect(labels).toContain('node-fs-promises')
    expect(labels).toContain('node-eventemitter')
    expect(labels).toContain('node-worker-thread')
    expect(labels).toContain('node-stream-pipeline')
  })

  it('should support node toolchain detection via toolchainService', async () => {
    const info = await toolchainService.detectOne('toolchain.node')
    expect(info).toBeDefined()
    expect(typeof info?.found).toBe('boolean')
  })
})

describe('Universal Frontend Mega-Pack Extension & Snippets Suite', () => {
  it('should have valid Frontend Mega-Pack manifest registered', () => {
    expect(frontendExtensionManifest.id).toBe('indoctrinated.ext.frontend-mega-pack')
    expect(frontendExtensionManifest.category).toBe('Frameworks')
    const registered = extensionRegistry.get('indoctrinated.ext.frontend-mega-pack')
    expect(registered).toBeDefined()
    expect(registered?.name).toContain('Frontend Mega-Pack')
  })

  it('should contain comprehensive frontend framework coverage', () => {
    // 1. Node based
    expect(VUE_SNIPPETS.length).toBeGreaterThan(0)
    expect(SVELTE_SNIPPETS.length).toBeGreaterThan(0)
    expect(SOLID_SNIPPETS.length).toBeGreaterThan(0)
    expect(PREACT_SNIPPETS.length).toBeGreaterThan(0)

    // 2. Python based
    expect(STREAMLIT_SNIPPETS.length).toBeGreaterThan(0)
    expect(DASH_SNIPPETS.length).toBeGreaterThan(0)
    expect(REFLEX_SNIPPETS.length).toBeGreaterThan(0)
    expect(FLET_SNIPPETS.length).toBeGreaterThan(0)
    expect(ANVIL_SNIPPETS.length).toBeGreaterThan(0)

    // 3. PHP based
    expect(LIVEWIRE_SNIPPETS.length).toBeGreaterThan(0)
    expect(INERTIA_SNIPPETS.length).toBeGreaterThan(0)
    expect(BLADE_UI_SNIPPETS.length).toBeGreaterThan(0)
    expect(SYMFONY_UX_SNIPPETS.length).toBeGreaterThan(0)

    // 4. Ruby based
    expect(HOTWIRE_SNIPPETS.length).toBeGreaterThan(0)
    expect(VIEWCOMPONENT_SNIPPETS.length).toBeGreaterThan(0)

    // 5. .NET based
    expect(BLAZOR_SNIPPETS.length).toBeGreaterThan(0)

    // 6. HTML-first
    expect(ALPINE_SNIPPETS.length).toBeGreaterThan(0)
  })
})

describe('Universal Backend Mega-Pack Extension & Snippets Suite', () => {
  it('should have valid Backend Mega-Pack manifest registered', () => {
    expect(backendExtensionManifest.id).toBe('indoctrinated.ext.backend-mega-pack')
    expect(backendExtensionManifest.category).toBe('Frameworks')
    const registered = extensionRegistry.get('indoctrinated.ext.backend-mega-pack')
    expect(registered).toBeDefined()
    expect(registered?.name).toContain('Backend Mega-Pack')
  })

  it('should contain complete backend frameworks across all languages', () => {
    // Node
    expect(EXPRESS_SNIPPETS.length).toBeGreaterThan(0)
    expect(NESTJS_SNIPPETS.length).toBeGreaterThan(0)
    expect(FASTIFY_SNIPPETS.length).toBeGreaterThan(0)
    expect(KOA_SNIPPETS.length).toBeGreaterThan(0)
    expect(HONO_SNIPPETS.length).toBeGreaterThan(0)

    // Python
    expect(DJANGO_NINJA_SNIPPETS.length).toBeGreaterThan(0)
    expect(FASTAPI_SNIPPETS.length).toBeGreaterThan(0)
    expect(SANIC_SNIPPETS.length).toBeGreaterThan(0)
    expect(FLASK_SNIPPETS.length).toBeGreaterThan(0)

    // PHP
    expect(SYMFONY_BACKEND_SNIPPETS.length).toBeGreaterThan(0)
    expect(CODEIGNITER_SNIPPETS.length).toBeGreaterThan(0)
    expect(SLIM_SNIPPETS.length).toBeGreaterThan(0)

    // Ruby
    expect(SINATRA_SNIPPETS.length).toBeGreaterThan(0)
    expect(HANAMI_SNIPPETS.length).toBeGreaterThan(0)

    // Java / Kotlin
    expect(KTOR_SNIPPETS.length).toBeGreaterThan(0)
    expect(SPRING_BOOT_SNIPPETS.length).toBeGreaterThan(0)
    expect(MICRONAUT_SNIPPETS.length).toBeGreaterThan(0)
    expect(QUARKUS_SNIPPETS.length).toBeGreaterThan(0)

    // Go
    expect(GIN_SNIPPETS.length).toBeGreaterThan(0)
    expect(FIBER_SNIPPETS.length).toBeGreaterThan(0)
    expect(ECHO_SNIPPETS.length).toBeGreaterThan(0)

    // .NET
    expect(DOTNET_BACKEND_SNIPPETS.length).toBeGreaterThan(0)

    // Rust
    expect(ACTIX_SNIPPETS.length).toBeGreaterThan(0)
    expect(AXUM_SNIPPETS.length).toBeGreaterThan(0)
  })
})

describe('Resilience and Notification Center Fallbacks', () => {
  it('should notify error center gracefully on Monaco registration crash', () => {
    const notifySpy = vi.spyOn(notificationService, 'notifyError')

    const fakeMonacoBroken = {
      languages: {
        registerCompletionItemProvider: () => {
          throw new Error('Simulated Monaco provider fault')
        },
        CompletionItemKind: { Snippet: 27 },
        CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
      },
    } as any

    expect(() => {
      extensionRegistry.initializeMonacoExtensions(fakeMonacoBroken)
    }).not.toThrow()

    expect(notifySpy).toHaveBeenCalled()
  })
})

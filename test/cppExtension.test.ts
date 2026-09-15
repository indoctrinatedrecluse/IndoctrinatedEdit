import { describe, it, expect } from 'vitest'
import { extensionRegistry } from '../src/extensions/extensionRegistry'
import { cppExtensionManifest } from '../src/extensions/cppSupport/cppExtension'
import { cppSnippets } from '../src/extensions/cppSupport/cppSnippets'

describe('C/C++ Universal Engine & Ecosystem Extension', () => {
  it('registers C/C++ extension in extensionRegistry with correct metadata', () => {
    const cppExt = extensionRegistry.get('indoctrinated.ext.cpp-pack')
    expect(cppExt).toBeDefined()
    expect(cppExt?.name).toBe('C/C++ Universal Engine & Toolchain')
    expect(cppExt?.iconName).toBe('Terminal')
    expect(cppExt?.category).toBe('Languages')
    expect(cppExt?.status).toBe('Active')
  })

  it('provides varied snippets across Modern C++, C, SIMD, Game Dev, Web, GUI, and CMake', () => {
    const labels = cppSnippets.map((s) => s.label)
    // C++ Core
    expect(labels).toContain('main-cpp')
    expect(labels).toContain('class-rule5')
    expect(labels).toContain('concept')
    expect(labels).toContain('coroutine-task')
    expect(labels).toContain('ranges-pipeline')
    expect(labels).toContain('variant-visit')

    // C Core & POSIX
    expect(labels).toContain('main-c')
    expect(labels).toContain('struct-typedef')
    expect(labels).toContain('pthreads-worker')
    expect(labels).toContain('simd-avx2')
    expect(labels).toContain('mmap-io')

    // Frameworks & Tools
    expect(labels).toContain('raylib-game')
    expect(labels).toContain('crow-server')
    expect(labels).toContain('imgui-widget')
    expect(labels).toContain('cmake-project')
  })

  it('contains language definitions for both C++ and C with appropriate file extensions', () => {
    const cppLang = cppExtensionManifest.languages?.find((l) => l.id === 'cpp')
    const cLang = cppExtensionManifest.languages?.find((l) => l.id === 'c')

    expect(cppLang).toBeDefined()
    expect(cppLang?.extensions).toContain('.cpp')
    expect(cppLang?.extensions).toContain('.hpp')
    expect(cppLang?.extensions).toContain('.cxx')

    expect(cLang).toBeDefined()
    expect(cLang?.extensions).toContain('.c')
    expect(cLang?.extensions).toContain('.h')
  })
})

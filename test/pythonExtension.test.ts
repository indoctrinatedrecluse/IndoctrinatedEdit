import { describe, it, expect } from 'vitest'
import { extensionRegistry } from '../src/extensions/extensionRegistry'
import { pythonExtensionManifest } from '../src/extensions/pythonSupport/pythonExtension'
import { pythonSnippets } from '../src/extensions/pythonSupport/pythonSnippets'
import { toolchainService } from '../src/services/toolchainService'

describe('Python & AI Ecosystem Extension & Toolchain Detection', () => {
  it('registers Python extension in extensionRegistry with correct metadata', () => {
    const pyExt = extensionRegistry.get('indoctrinated.ext.python-pack')
    expect(pyExt).toBeDefined()
    expect(pyExt?.name).toBe('Python & AI Ecosystem Extension')
    expect(pyExt?.iconName).toBe('Code2')
    expect(pyExt?.category).toBe('Languages')
    expect(pyExt?.status).toBe('Active')
  })

  it('provides varied snippets across Core 3.11+, Web frameworks, AI/Data Science, and CLI/Testing', () => {
    const labels = pythonSnippets.map((s) => s.label)

    // Core Python & Typing
    expect(labels).toContain('main-py')
    expect(labels).toContain('dataclass')
    expect(labels).toContain('pydantic-model')
    expect(labels).toContain('async-taskgroup')
    expect(labels).toContain('context-mgr')
    expect(labels).toContain('match-case')

    // Web & Microservices
    expect(labels).toContain('fastapi-app')
    expect(labels).toContain('flask-app')
    expect(labels).toContain('django-view')

    // AI & Data Science
    expect(labels).toContain('pandas-pipeline')
    expect(labels).toContain('numpy-vectorized')
    expect(labels).toContain('pytorch-model')
    expect(labels).toContain('scikit-pipeline')

    // Testing & CLI
    expect(labels).toContain('pytest-fixture')
    expect(labels).toContain('click-cli')
  })

  it('contains Python language definition with appropriate file extensions', () => {
    const lang = pythonExtensionManifest.languages?.find((l) => l.id === 'python')
    expect(lang).toBeDefined()
    expect(lang?.extensions).toContain('.py')
    expect(lang?.extensions).toContain('.pyi')
    expect(lang?.extensions).toContain('.ipynb')
    expect(lang?.extensions).toContain('.pyx')
  })

  it('verifies toolchain definitions for Python and C/C++ in toolchainService', () => {
    const definitions = toolchainService.getDefinitions()

    const pyDef = definitions.find((d) => d.id === 'toolchain.python')
    expect(pyDef).toBeDefined()
    expect(pyDef?.binaryNames).toContain('python')
    expect(pyDef?.binaryNames).toContain('python3')

    const cppDef = definitions.find((d) => d.id === 'toolchain.cpp')
    expect(cppDef).toBeDefined()
    expect(cppDef?.binaryNames).toContain('gcc')
    expect(cppDef?.binaryNames).toContain('g++')
    expect(cppDef?.binaryNames).toContain('clang')
    expect(cppDef?.binaryNames).toContain('cl')
  })
})

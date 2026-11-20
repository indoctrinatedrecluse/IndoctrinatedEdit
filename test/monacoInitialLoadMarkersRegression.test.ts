import { describe, it, expect } from 'vitest'
import { toMonacoModelPath, configureMonacoCompilerOptions } from '../src/components/Editor/monacoConfig'
import { sessionService } from '../src/services/sessionService'

describe('Monaco Initial Load & Red Underlines Regression Guard', () => {
  it('toMonacoModelPath generates safe, valid Monaco file URIs with preserved file extensions', () => {
    expect(toMonacoModelPath('')).toBe('file:///welcome.ts')
    expect(toMonacoModelPath(undefined)).toBe('file:///welcome.ts')

    // Windows backslash paths
    const winPath = 'D:\\Projects\\IndoctrinatedEdit\\src\\App.tsx'
    const winUri = toMonacoModelPath(winPath)
    expect(winUri).toBe('file:///D:/Projects/IndoctrinatedEdit/src/App.tsx')
    expect(winUri.endsWith('.tsx')).toBe(true)

    // POSIX paths
    const posixPath = '/home/user/project/main.py'
    const posixUri = toMonacoModelPath(posixPath)
    expect(posixUri).toBe('file:///home/user/project/main.py')
    expect(posixUri.endsWith('.py')).toBe(true)

    // Relative paths
    const relPath = 'src/index.ts'
    const relUri = toMonacoModelPath(relPath)
    expect(relUri).toBe('file:///src/index.ts')
    expect(relUri.endsWith('.ts')).toBe(true)

    // Already file:// URI
    const existingUri = 'file:///workspace/server.go'
    expect(toMonacoModelPath(existingUri)).toBe('file:///workspace/server.go')
  })

  it('configureMonacoCompilerOptions configures noSemanticValidation: true and React JSX prior to model mount', () => {
    let capturedTsCompilerOpts: any = null
    let capturedTsDiagOpts: any = null
    let capturedJsCompilerOpts: any = null
    let capturedJsDiagOpts: any = null
    let capturedJsonDiagOpts: any = null

    const mockMonaco = {
      languages: {
        typescript: {
          ScriptTarget: { ESNext: 99 },
          ModuleKind: { ESNext: 99 },
          ModuleResolutionKind: { NodeJs: 2 },
          JsxEmit: { ReactJSX: 4 },
          typescriptDefaults: {
            setCompilerOptions: (opts: any) => {
              capturedTsCompilerOpts = opts
            },
            setDiagnosticsOptions: (opts: any) => {
              capturedTsDiagOpts = opts
            },
          },
          javascriptDefaults: {
            setCompilerOptions: (opts: any) => {
              capturedJsCompilerOpts = opts
            },
            setDiagnosticsOptions: (opts: any) => {
              capturedJsDiagOpts = opts
            },
          },
        },
        json: {
          jsonDefaults: {
            setDiagnosticsOptions: (opts: any) => {
              capturedJsonDiagOpts = opts
            },
          },
        },
      },
    }

    // Invoke configuration
    configureMonacoCompilerOptions(mockMonaco)

    expect(capturedTsCompilerOpts).toBeDefined()
    expect(capturedTsCompilerOpts.jsx).toBe(4) // ReactJSX
    expect(capturedTsCompilerOpts.allowNonTsExtensions).toBe(true)
    expect(capturedTsCompilerOpts.experimentalDecorators).toBe(true)

    // noSemanticValidation MUST be true so unresolved external imports don't paint the file in red squiggles
    expect(capturedTsDiagOpts).toBeDefined()
    expect(capturedTsDiagOpts.noSemanticValidation).toBe(true)
    // noSyntaxValidation MUST be false so genuine syntax errors remain visible
    expect(capturedTsDiagOpts.noSyntaxValidation).toBe(false)

    expect(capturedJsCompilerOpts).toBeDefined()
    expect(capturedJsCompilerOpts.jsx).toBe(4)
    expect(capturedJsDiagOpts.noSemanticValidation).toBe(true)
    expect(capturedJsDiagOpts.noSyntaxValidation).toBe(false)

    expect(capturedJsonDiagOpts).toBeDefined()
    expect(capturedJsonDiagOpts.allowComments).toBe(true)
  })

  it('sessionService synchronous loadSession supplies immediate tabs and activeTabId on startup', () => {
    // Setup a mock saved session
    sessionService.saveSession({
      workspacePath: 'D:/Projects/MyReactApp',
      workspaceName: 'MyReactApp',
      tabs: [
        { id: 'src/App.tsx', name: 'App.tsx', language: 'typescriptreact' },
        { id: 'package.json', name: 'package.json', language: 'json' },
      ],
      activeTabId: 'src/App.tsx',
    })

    const loaded = sessionService.loadSession()
    expect(loaded).toBeDefined()
    expect(loaded?.activeTabId).toBe('src/App.tsx')
    expect(loaded?.tabs).toHaveLength(2)
    expect(loaded?.tabs[0].language).toBe('typescriptreact')
    expect(loaded?.workspacePath).toBe('D:/Projects/MyReactApp')
  })
})

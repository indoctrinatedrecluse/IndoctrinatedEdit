import { describe, it, expect, vi } from 'vitest'
import { outputChannelService } from '../src/services/outputChannelService'
import { editorPreferencesService } from '../src/services/editorPreferencesService'
import { extensionRegistry } from '../src/extensions/extensionRegistry'
import { RendererUpdateService } from '../src/services/updateService'
import { SessionService } from '../src/services/sessionService'

describe('Phase R2-1 — Shell Wiring, Extension Lifecycle, Output Channel, Updater & Session Restore', () => {
  it('outputChannelService appends, filters by channel, and clears live entries', () => {
    outputChannelService.clear('All')
    outputChannelService.append('Git', 'Switched to branch main', 'success')
    outputChannelService.append('Extensions', 'Loaded 36 registrars', 'info')

    expect(outputChannelService.getEntries('Git')).toHaveLength(1)
    expect(outputChannelService.getEntries('Extensions')).toHaveLength(1)
    expect(outputChannelService.getEntries('All')).toHaveLength(2)

    outputChannelService.clear('Git')
    expect(outputChannelService.getEntries('Git')).toHaveLength(0)
    expect(outputChannelService.getEntries('Extensions')).toHaveLength(1)
  })

  it('editorPreferencesService persists updates and notifies subscribers', () => {
    const observed: boolean[] = []
    const unsub = editorPreferencesService.subscribe((p) => observed.push(p.minimapEnabled))
    editorPreferencesService.updatePreferences({ minimapEnabled: false })
    expect(editorPreferencesService.getPreferences().minimapEnabled).toBe(false)
    expect(observed).toEqual([false])
    editorPreferencesService.updatePreferences({ minimapEnabled: true })
    unsub()
  })

  it('extensionRegistry truly disposes providers on disable() and re-registers them on enable()', () => {
    let registerCalls = 0
    let disposeCalls = 0
    const mockMonaco: any = {
      languages: {
        getLanguages: () => [],
        register: vi.fn(),
        setMonarchTokensProvider: vi.fn(),
        setLanguageConfiguration: vi.fn(),
        registerCompletionItemProvider: vi.fn(() => {
          registerCalls++
          return {
            dispose: () => {
              disposeCalls++
            },
          }
        }),
        registerDocumentFormattingEditProvider: vi.fn(() => ({ dispose: () => { disposeCalls++ } })),
        registerDocumentRangeFormattingEditProvider: vi.fn(() => ({ dispose: () => { disposeCalls++ } })),
        CompletionItemKind: { Snippet: 27, Keyword: 17, Function: 1 },
        CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
      },
    }

    extensionRegistry.initializeMonacoExtensions(mockMonaco)
    const beforeDisableRegister = registerCalls
    expect(beforeDisableRegister).toBeGreaterThan(20)

    const rustId = 'indoctrinated.ext.rust-pack'
    const beforeDispose = disposeCalls
    extensionRegistry.disable(rustId)
    expect(disposeCalls).toBeGreaterThan(beforeDispose)
    expect(extensionRegistry.isEnabled(rustId)).toBe(false)

    // Re-enabling MUST re-register the provider live!
    extensionRegistry.enable(rustId)
    expect(extensionRegistry.isEnabled(rustId)).toBe(true)
    expect(registerCalls).toBeGreaterThan(beforeDisableRegister)
  })

  it('RendererUpdateService surfaces info.error as status="error" instead of masking as upToDate', async () => {
    const svc = new RendererUpdateService()
    const origElectron = (globalThis as any).window?.electronAPI
    ;(globalThis as any).window = (globalThis as any).window || {}
    ;(globalThis as any).window.electronAPI = {
      updater: {
        checkForUpdates: vi.fn().mockResolvedValue({
          updateAvailable: false,
          currentVersion: '6.1.1',
          latestVersion: '6.1.1',
          releaseName: 'IndoctrinatedEdit 6.1.1',
          releaseNotes: '',
          publishedAt: new Date().toISOString(),
          releaseUrl: 'https://github.com/indoctrinatedrecluse/IndoctrinatedEdit/releases',
          matchedAsset: null,
          allAssets: [],
          channel: 'stable',
          error: 'GitHub API rate limit exceeded',
        }),
      },
    }

    await svc.checkForUpdates(true)
    expect(svc.getStatus()).toBe('error')

    if (origElectron === undefined) delete (globalThis as any).window.electronAPI
    else (globalThis as any).window.electronAPI = origElectron
  })

  it('SessionService restores binary .pdf/.docx tabs via readFileBase64 with data URI prefix', async () => {
    const svc = new SessionService()
    svc.saveSession({
      workspacePath: 'D:/docs',
      workspaceName: 'docs',
      tabs: [{ id: 'D:/docs/spec.pdf', name: 'spec.pdf', language: 'pdf' }],
      activeTabId: 'D:/docs/spec.pdf',
    })

    ;(globalThis as any).window = (globalThis as any).window || {}
    const origElectron = (globalThis as any).window.electronAPI
    ;(globalThis as any).window.electronAPI = {
      checkExists: vi.fn().mockResolvedValue(true),
      readFolder: vi.fn().mockResolvedValue({ folderPath: 'D:/docs', folderName: 'docs', files: [] }),
      readFile: vi.fn().mockResolvedValue('CORRUPTED_UTF8'),
      readFileBase64: vi.fn().mockResolvedValue('JVBERi0xLjQ='),
    }

    const restored = await svc.restoreSession([], {}, (n) => (n.endsWith('.pdf') ? 'pdf' : 'plaintext'))
    expect(restored.fileContents['D:/docs/spec.pdf']).toBe('data:application/pdf;base64,JVBERi0xLjQ=')

    if (origElectron === undefined) delete (globalThis as any).window.electronAPI
    else (globalThis as any).window.electronAPI = origElectron
  })
})

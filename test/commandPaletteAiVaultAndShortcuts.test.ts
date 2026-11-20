import { describe, it, expect, vi, beforeEach } from 'vitest'
import { commandRegistry, CommandItem } from '../src/services/commandRegistry'
import { fuzzyMatch } from '../src/components/CommandPalette/fuzzySearch'
import { aiVaultService } from '../src/services/aiVaultService'
import { notificationService } from '../src/services/notificationService'
import { AiKeyVaultModal } from '../src/components/AI/AiKeyVaultModal'

// Polyfill in-memory localStorage for Node test runner
if (typeof globalThis.localStorage === 'undefined') {
  let store: Record<string, string> = {}
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value)
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length
    },
  } as any
}

describe('Command Palette - AI Key Vault & Expanded Capabilities', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('AI Key & Endpoint Vault Command Registry', () => {
    it('registers and executes AI key vault command successfully', () => {
      let modalOpened = false
      const unreg = commandRegistry.register({
        id: 'ai.keyVault',
        title: 'AI: Manage API Keys, Endpoints & Vault...',
        category: 'AI',
        shortcut: 'Ctrl+Alt+Shift+K',
        description: 'Open unified liquid glass API key vault to manage keys, endpoints, and live test probes',
        handler: () => {
          modalOpened = true
        },
      })

      const cmd = commandRegistry.get('ai.keyVault')
      expect(cmd).toBeDefined()
      expect(cmd?.title).toBe('AI: Manage API Keys, Endpoints & Vault...')
      expect(cmd?.shortcut).toBe('Ctrl+Alt+Shift+K')
      expect(cmd?.category).toBe('AI')

      commandRegistry.execute('ai.keyVault')
      expect(modalOpened).toBe(true)

      unreg()
      expect(commandRegistry.get('ai.keyVault')).toBeUndefined()
    })

    it('matches "vault", "api key", and "mcp" in Command Palette fuzzy search', () => {
      const title = 'AI: Manage API Keys, Endpoints & Vault...'
      const desc = 'Open unified liquid glass API key vault to manage keys, endpoints, live test probes, and MCP synchronization'

      const matchVault = fuzzyMatch('vault', title)
      expect(matchVault).not.toBeNull()
      expect(matchVault!.score).toBeGreaterThan(0)

      const matchApiKey = fuzzyMatch('api key', title)
      expect(matchApiKey).not.toBeNull()

      const matchMcp = fuzzyMatch('mcp', desc)
      expect(matchMcp).not.toBeNull()
    })

    it('executes MCP credential sync command and notifies user', () => {
      aiVaultService.setProviderKey('gemini', 'AIzaSyTestKeyForMcpSync1234567890123')
      aiVaultService.setProviderKey('openai', 'sk-proj-testkeyforpalette1234567')

      const notifySpy = vi.spyOn(notificationService, 'notifySuccess')

      const unreg = commandRegistry.register({
        id: 'ai.syncMcp',
        title: 'AI: Synchronize Credentials to MCP Runtime Environment',
        category: 'AI',
        description: 'Export all configured API keys and URLs into the Model Context Protocol process environment',
        handler: () => {
          const env = aiVaultService.getMcpEnvironmentMap()
          const count = Object.keys(env).length
          notificationService.notifySuccess('MCP Sync', `Synchronized ${count} credentials to Model Context Protocol environment`)
        },
      })

      commandRegistry.execute('ai.syncMcp')
      expect(notifySpy).toHaveBeenCalledWith(
        'MCP Sync',
        expect.stringContaining('Synchronized')
      )

      unreg()
      notifySpy.mockRestore()
    })
  })

  describe('Git & GitHub CLI Commands Integration', () => {
    it('registers GitHub Actions and Pull Request commands', () => {
      const commands: CommandItem[] = [
        {
          id: 'git.ghWorkflows',
          title: 'Git: View GitHub Actions Workflow Runs (gh run list)',
          category: 'Git',
          description: 'Inspect CI/CD status and workflow jobs via GitHub CLI',
          handler: vi.fn(),
        },
        {
          id: 'git.ghPrs',
          title: 'Git: View Pull Requests (gh pr list)',
          category: 'Git',
          description: 'List and inspect open pull requests in current repository',
          handler: vi.fn(),
        },
      ]

      const unregAll = commandRegistry.registerMany(commands)
      expect(commandRegistry.get('git.ghWorkflows')).toBeDefined()
      expect(commandRegistry.get('git.ghPrs')).toBeDefined()

      const matchGhw = fuzzyMatch('gh run', commandRegistry.get('git.ghWorkflows')!.title)
      expect(matchGhw).not.toBeNull()

      unregAll()
    })
  })

  describe('File Path Clipboard & Buffer Commands', () => {
    it('registers path copy and batch buffer operations', () => {
      const commands: CommandItem[] = [
        {
          id: 'file.copyPath',
          title: 'File: Copy Active File Path',
          category: 'File',
          shortcut: 'Shift+Alt+C',
          description: 'Copy absolute filesystem path of active document to clipboard',
          handler: vi.fn(),
        },
        {
          id: 'file.copyRelativePath',
          title: 'File: Copy Relative File Path',
          category: 'File',
          shortcut: 'Ctrl+K Ctrl+Shift+C',
          description: 'Copy workspace-relative path of active document to clipboard',
          handler: vi.fn(),
        },
        {
          id: 'file.saveAll',
          title: 'File: Save All Dirty Files',
          category: 'File',
          shortcut: 'Ctrl+K S',
          description: 'Save all modified editor tabs to disk',
          handler: vi.fn(),
        },
      ]

      const unreg = commandRegistry.registerMany(commands)
      expect(commandRegistry.get('file.copyPath')).toBeDefined()
      expect(commandRegistry.get('file.copyRelativePath')).toBeDefined()
      expect(commandRegistry.get('file.saveAll')).toBeDefined()

      unreg()
    })
  })

  describe('AIKeyVaultModal Component Contract', () => {
    it('exports functional React component', () => {
      expect(AiKeyVaultModal).toBeDefined()
      expect(typeof AiKeyVaultModal).toBe('function')
    })
  })
})

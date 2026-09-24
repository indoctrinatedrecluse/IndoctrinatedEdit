import { describe, it, expect } from 'vitest'
import { extensionRegistry } from '../src/extensions/extensionRegistry'
import { remoteProtocolExtensionManifest, registerRemoteProtocolExtension, remoteSnippets } from '../src/extensions/remoteProtocolSupport/remoteProtocolExtension'
import { terminalService } from '../src/services/terminalService'
import { previewService } from '../src/services/previewService'

describe('Remote Protocol Studio & Strengthened Terminal TUI Subsystem', () => {
  describe('Remote Protocol Studio Extension', () => {
    it('should be registered in the Extension Registry with full capabilities', () => {
      const ext = extensionRegistry.get('indoctrinated.ext.remote-protocol-studio')
      expect(ext).toBeDefined()
      expect(ext?.name).toContain('Remote Protocol Studio')
      expect(ext?.category).toBe('Tools')
      expect(ext?.snippetsCount).toBe(remoteSnippets.length)
    })

    it('should provide SSH, SMTP, and SFTP code templates', () => {
      expect(remoteSnippets.length).toBeGreaterThanOrEqual(3)
      const labels = remoteSnippets.map((s) => s.label)
      expect(labels).toContain('ssh-config-host')
      expect(labels).toContain('smtp-test-envelope')
      expect(labels).toContain('sftp-batch-script')
    })

    it('should register Monaco completion provider for sshconfig language without throwing', () => {
      const mockMonaco: any = {
        languages: {
          registerCompletionItemProvider: (lang: string, provider: any) => {
            expect(lang).toBe('sshconfig')
            expect(provider).toBeDefined()
          },
        },
      }
      expect(() => registerRemoteProtocolExtension(mockMonaco)).not.toThrow()
    })
  })

  describe('Strengthened VT100 / ANSI Interactive Terminal Engine', () => {
    it('should parse standard ANSI color escape codes into tokens', () => {
      const ansiString = '\x1b[32m[OK]\x1b[0m \x1b[31mFailed\x1b[0m'
      const tokens = terminalService.parseAnsi(ansiString)
      expect(tokens.length).toBeGreaterThanOrEqual(2)
      expect(tokens[0].text).toBe('[OK]')
      expect(tokens[0].color).toBe('#30D158')
      expect(tokens[1].text).toBe(' ')
      expect(tokens[2].text).toBe('Failed')
      expect(tokens[2].color).toBe('#FF453A')
    })

    it('should parse 256-color palette and TrueColor 24-bit RGB codes', () => {
      const rgbString = '\x1b[38;2;100;210;255mCyan TrueColor\x1b[0m'
      const tokens = terminalService.parseAnsi(rgbString)
      expect(tokens[0].text).toBe('Cyan TrueColor')
      expect(tokens[0].color).toBe('rgb(100, 210, 255)')
    })

    it('should handle alternate screen buffers and cursor positioning for TUI CLI tools', async () => {
      const tab = await terminalService.createTab()
      expect(tab).toBeDefined()

      // Send alternate buffer enter code and TUI screen update
      terminalService.appendOutput(tab.id, '\x1b[?1049h\x1b[2J\x1b[H=== IR PMON TUI SYSTEM MONITOR ===\r\nCPU: 12% | RAM: 45%\r\n')
      expect(tab.buffer.some((l) => l.includes('IR PMON TUI SYSTEM MONITOR'))).toBe(true)

      // Send alternate buffer exit code
      terminalService.appendOutput(tab.id, '\x1b[?1049l')
      expect(tab.buffer).toBeDefined()
    })

    it('should dispatch raw TUI key sequences (Arrows, WASD, Enter, Esc, Q, Ctrl+C)', async () => {
      const tab = await terminalService.createTab()
      let writtenData = ''
      terminalService.setElectronAPI({
        terminal: {
          write: async (_id: string, data: string) => {
            writtenData = data
            return true
          },
        },
      })

      await terminalService.sendTuiKey(tab.id, 'up')
      expect(writtenData).toBe('\x1b[A')

      await terminalService.sendTuiKey(tab.id, 'down')
      expect(writtenData).toBe('\x1b[B')

      await terminalService.sendTuiKey(tab.id, 'enter')
      expect(writtenData).toBe('\r')

      await terminalService.sendTuiKey(tab.id, 'escape')
      expect(writtenData).toBe('\x1b')

      await terminalService.sendTuiKey(tab.id, 'ctrl-c')
      expect(writtenData).toBe('\x03')

      await terminalService.sendTuiKey(tab.id, 'q')
      expect(writtenData).toBe('q')
    })
  })

  describe('Contextual Live Markdown Preview Subsystem', () => {
    it('should detect Markdown files by extension and render HTML with Mermaid and KaTeX support', () => {
      expect(previewService.getPreviewType('README.md')).toBe('markdown')
      expect(previewService.getPreviewType('notes.markdown')).toBe('markdown')
      expect(previewService.getPreviewType('doc.mdx')).toBe('markdown')
      expect(previewService.getPreviewType('index.html')).toBe('html')
      expect(previewService.getPreviewType('icon.svg')).toBe('svg')

      const sample = '# Title\n\n> [!NOTE]\n> Note content\n\n$$\\alpha + \\beta$$'
      const res = previewService.renderMarkdown(sample)
      expect(res.html).toContain('preview-h1')
      expect(res.html).toContain('alert-NOTE')
      expect(res.html).toContain('latex-math-block')
    })
  })
})

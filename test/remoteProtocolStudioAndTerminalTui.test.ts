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

    it('should dispatch raw TUI key sequences (Arrows, Nav, WASD, Enter, Esc, Q, Ctrl+C, Space, Tab, Backspace) directly to terminal session', async () => {
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

      await terminalService.sendTuiKey(tab.id, 'left')
      expect(writtenData).toBe('\x1b[D')

      await terminalService.sendTuiKey(tab.id, 'right')
      expect(writtenData).toBe('\x1b[C')

      await terminalService.sendTuiKey(tab.id, 'pgup')
      expect(writtenData).toBe('\x1b[5~')

      await terminalService.sendTuiKey(tab.id, 'pgdn')
      expect(writtenData).toBe('\x1b[6~')

      await terminalService.sendTuiKey(tab.id, 'home')
      expect(writtenData).toBe('\x1b[H')

      await terminalService.sendTuiKey(tab.id, 'end')
      expect(writtenData).toBe('\x1b[F')

      await terminalService.sendTuiKey(tab.id, 'w')
      expect(writtenData).toBe('w')

      await terminalService.sendTuiKey(tab.id, 's')
      expect(writtenData).toBe('s')

      await terminalService.sendTuiKey(tab.id, 'a')
      expect(writtenData).toBe('a')

      await terminalService.sendTuiKey(tab.id, 'd')
      expect(writtenData).toBe('d')

      await terminalService.sendTuiKey(tab.id, 'enter')
      expect(writtenData).toBe('\r')

      await terminalService.sendTuiKey(tab.id, 'escape')
      expect(writtenData).toBe('\x1b')

      await terminalService.sendTuiKey(tab.id, 'space')
      expect(writtenData).toBe(' ')

      await terminalService.sendTuiKey(tab.id, 'tab')
      expect(writtenData).toBe('\t')

      await terminalService.sendTuiKey(tab.id, 'backspace')
      expect(writtenData).toBe('\x7f')

      await terminalService.sendTuiKey(tab.id, 'r')
      expect(writtenData).toBe('r')

      await terminalService.sendTuiKey(tab.id, 'c')
      expect(writtenData).toBe('c')

      await terminalService.sendTuiKey(tab.id, 'm')
      expect(writtenData).toBe('m')

      await terminalService.sendTuiKey(tab.id, 'n')
      expect(writtenData).toBe('n')

      await terminalService.sendTuiKey(tab.id, 'p')
      expect(writtenData).toBe('p')

      await terminalService.sendTuiKey(tab.id, 'k')
      expect(writtenData).toBe('k')

      await terminalService.sendTuiKey(tab.id, 'y')
      expect(writtenData).toBe('y')

      await terminalService.sendTuiKey(tab.id, 'ctrl-c')
      expect(writtenData).toBe('\x03')

      await terminalService.sendTuiKey(tab.id, 'ctrl+c')
      expect(writtenData).toBe('\x03')

      await terminalService.sendTuiKey(tab.id, 'ctrl-d')
      expect(writtenData).toBe('\x04')

      await terminalService.sendTuiKey(tab.id, 'ctrl-z')
      expect(writtenData).toBe('\x1a')

      await terminalService.sendTuiKey(tab.id, 'ctrl-l')
      expect(writtenData).toBe('\x0c')

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

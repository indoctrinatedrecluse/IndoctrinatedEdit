import type * as monaco from 'monaco-editor'
import { ExtensionManifest, SnippetDefinition } from '../extensionTypes'

export const remoteSnippets: SnippetDefinition[] = [
  {
    label: 'ssh-config-host',
    documentation: 'Standard SSH Client Host Configuration Block',
    insertText: 'Host ${1:myserver}\n    HostName ${2:192.168.1.100}\n    User ${3:root}\n    Port ${4:22}\n    IdentityFile ${5:~/.ssh/id_rsa}\n    ServerAliveInterval 60\n$0',
  },
  {
    label: 'smtp-test-envelope',
    documentation: 'SMTP Raw Protocol Envelope Handshake Template',
    insertText: 'EHLO ${1:client.example.com}\nAUTH LOGIN\n${2:base64_user}\n${3:base64_pass}\nMAIL FROM:<${4:sender@example.com}>\nRCPT TO:<${5:recipient@example.com}>\nDATA\nSubject: ${6:Test Email}\nFrom: ${4:sender@example.com}\nTo: ${5:recipient@example.com}\n\n${7:Hello World from Indoctrinated Remote Studio!}\n.\nQUIT\n$0',
  },
  {
    label: 'sftp-batch-script',
    documentation: 'SFTP Batch Upload / Download Script',
    insertText: 'cd ${1:/var/www/html}\nput ${2:local_file.tar.gz}\nchmod 755 ${2:local_file.tar.gz}\nls -la\nbye\n$0',
  },
]

export const remoteProtocolExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.remote-protocol-studio',
  name: 'Remote Protocol Studio (SSH, SFTP, FTP & SMTP)',
  version: '1.0.0',
  description: 'MobaXTerm-style remote feature suite for interactive SSH terminal sessions, SFTP/FTP remote file explorer, and SMTP email diagnostic lab.',
  author: 'indoctrinatedrecluse',
  category: 'Tools',
  iconName: 'Server',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: remoteSnippets.length,
  languages: [
    {
      id: 'sshconfig',
      extensions: ['.sshconfig', 'ssh_config', 'sshd_config'],
      aliases: ['SSH Config', 'SSH'],
      snippets: remoteSnippets,
    },
  ],
}

let isRegistered = false

export function registerRemoteProtocolExtension(monacoInstance?: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  try {
    monacoInstance.languages.registerCompletionItemProvider('sshconfig', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        const suggestions: monaco.languages.CompletionItem[] = remoteSnippets.map((s) => ({
          label: s.label,
          kind: monacoInstance.languages.CompletionItemKind.Snippet,
          documentation: s.documentation,
          insertText: s.insertText,
          insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        }))

        return { suggestions }
      },
    })
  } catch (err) {
    console.warn('Could not register Remote Protocol extension:', err)
  }
}

import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import {
  SHELL_SNIPPETS,
  TERRAFORM_SNIPPETS,
  DOCKER_SNIPPETS,
  KUBERNETES_SNIPPETS,
  devopsSnippets,
} from './devopsSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const devopsExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.devops-iac',
  name: 'DevOps, Cloud IaC & Shell Automation Suite',
  version: '1.0.0',
  description:
    'Complete DevOps, Cloud Infrastructure as Code, Containerization, and Shell Scripting suite for Bash, Zsh, PowerShell, Terraform HCL, Docker, and Kubernetes.',
  author: 'indoctrinatedrecluse',
  category: 'Tools',
  iconName: 'Terminal',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: devopsSnippets.length,
  languages: [
    {
      id: 'shell',
      extensions: ['.sh', '.bash', '.zsh'],
      aliases: ['Shell Script', 'Bash', 'Zsh'],
      snippets: SHELL_SNIPPETS,
    },
    {
      id: 'powershell',
      extensions: ['.ps1', '.psm1', '.psd1'],
      aliases: ['PowerShell', 'pwsh'],
      snippets: SHELL_SNIPPETS,
    },
    {
      id: 'hcl',
      extensions: ['.tf', '.hcl', '.tfvars'],
      aliases: ['Terraform', 'HCL', 'OpenTofu'],
      snippets: TERRAFORM_SNIPPETS,
    },
    {
      id: 'dockerfile',
      extensions: ['Dockerfile', 'Containerfile', '.dockerignore'],
      aliases: ['Dockerfile', 'Containerfile'],
      snippets: DOCKER_SNIPPETS,
    },
    {
      id: 'yaml',
      extensions: ['.yml', '.yaml'],
      aliases: ['Kubernetes Manifests', 'Docker Compose', 'GitHub Actions'],
      snippets: [...DOCKER_SNIPPETS, ...KUBERNETES_SNIPPETS],
    },
  ],
}

let isRegistered = false

export function registerDevopsExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  const registerForLang = (lang: string, snippetsList: typeof SHELL_SNIPPETS) => {
    try {
      monacoInstance.languages.registerCompletionItemProvider(lang, {
        provideCompletionItems: (model, position) => {
          try {
            const word = model.getWordUntilPosition(position)
            const range: monaco.IRange = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            }
            return {
              suggestions: snippetsList.map((s) => ({
                label: s.label,
                kind: monacoInstance.languages.CompletionItemKind.Snippet,
                detail: s.detail || 'DevOps / IaC Snippet',
                documentation: s.documentation,
                insertText: s.insertText,
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              })),
            }
          } catch (innerErr) {
            notificationService.notifyError(
              'DevOps & IaC Engine',
              `Completion provider failed for ${lang}: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`
            )
            return { suggestions: [] }
          }
        },
      })
    } catch (err) {
      notificationService.notifyError(
        'DevOps & IaC Engine',
        `Failed to register language provider for ${lang}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  registerForLang('shell', SHELL_SNIPPETS)
  registerForLang('powershell', SHELL_SNIPPETS)
  registerForLang('hcl', TERRAFORM_SNIPPETS)
  registerForLang('dockerfile', DOCKER_SNIPPETS)
  registerForLang('yaml', [...DOCKER_SNIPPETS, ...KUBERNETES_SNIPPETS])

  triggerDevopsToolchainCheck()
}

export function triggerDevopsToolchainCheck() {
  let unsubscribe: (() => void) | undefined
  unsubscribe = toolchainService.onDidDetect((results) => {
    const gitToolchain = results.find((tc) => tc.language === 'git')
    if (gitToolchain) {
      if (!gitToolchain.found) {
        notificationService.notifyMissingToolchain(
          'DevOps, Cloud IaC & Shell Suite',
          'git / docker / terraform',
          'https://git-scm.com/downloads'
        )
      }
      unsubscribe?.()
    }
  })

  toolchainService.detectOne('toolchain.git').catch(() => {})
}

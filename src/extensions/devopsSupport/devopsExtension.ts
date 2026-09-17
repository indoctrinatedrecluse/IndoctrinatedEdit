import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import {
  TERRAFORM_SNIPPETS,
  DOCKER_SNIPPETS,
  KUBERNETES_SNIPPETS,
  devopsSnippets,
} from './devopsSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const devopsExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.devops-iac',
  name: 'DevOps, Cloud IaC & Container Suite',
  version: '1.0.0',
  description:
    'Complete DevOps, Cloud Infrastructure as Code, and Containerization suite for Terraform HCL, OpenTofu, Docker, and Kubernetes.',
  author: 'indoctrinatedrecluse',
  category: 'Tools',
  iconName: 'Server',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: devopsSnippets.length,
  languages: [
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
      aliases: ['Kubernetes Manifests', 'Docker Compose', 'Helm'],
      snippets: [...DOCKER_SNIPPETS, ...KUBERNETES_SNIPPETS],
    },
  ],
}

let isRegistered = false

export function registerDevopsExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  const registerForLang = (lang: string, snippetsList: typeof TERRAFORM_SNIPPETS, prefix: string) => {
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

            const suggestions: monaco.languages.CompletionItem[] = snippetsList.map((snip) => ({
              label: snip.label,
              kind: monacoInstance.languages.CompletionItemKind.Snippet,
              detail: `${prefix} ${snip.detail}`,
              documentation: {
                value: `**${snip.detail}**\n\n${snip.documentation}`,
              },
              insertText: snip.insertText,
              insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            }))

            return { suggestions }
          } catch (err) {
            console.error(`DevOps snippet provider failed for ${lang}:`, err)
            return { suggestions: [] }
          }
        },
      })
    } catch (err) {
      console.error(`Could not register completion provider for ${lang}:`, err)
    }
  }

  registerForLang('hcl', TERRAFORM_SNIPPETS, '☁️')
  registerForLang('dockerfile', DOCKER_SNIPPETS, '🐳')
  registerForLang('yaml', [...DOCKER_SNIPPETS, ...KUBERNETES_SNIPPETS], '☸️')

  // Register toolchains for Terraform & Docker
  toolchainService.registerToolchain({
    id: 'toolchain.terraform',
    name: 'Terraform / OpenTofu CLI',
    language: 'hcl',
    binaryNames: ['tofu', 'terraform'],
    versionFlag: 'version',
    versionPattern: '(?:Terraform|OpenTofu)\\s+v([0-9]+\\.[0-9]+\\.[0-9]+)',
    downloadUrl: 'https://opentofu.org',
    description: 'Infrastructure as Code tool for declarative cloud provisioning',
  })

  toolchainService.registerToolchain({
    id: 'toolchain.docker',
    name: 'Docker Engine CLI',
    language: 'dockerfile',
    binaryNames: ['docker', 'podman'],
    versionFlag: '--version',
    versionPattern: '(?:Docker|podman)\\s+version\\s+([0-9]+\\.[0-9]+\\.[0-9]+)',
    downloadUrl: 'https://www.docker.com',
    description: 'Container application development and virtualization engine',
  })

  notificationService.notifyInfo('Extension System', '☁️ DevOps, Cloud IaC & Container Suite activated')
}

import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import {
  backendSnippets,
  EXPRESS_SNIPPETS,
  NESTJS_SNIPPETS,
  FASTIFY_SNIPPETS,
  KOA_SNIPPETS,
  HONO_SNIPPETS,
  DJANGO_NINJA_SNIPPETS,
  FASTAPI_SNIPPETS,
  SANIC_SNIPPETS,
  FLASK_SNIPPETS,
  SYMFONY_BACKEND_SNIPPETS,
  CODEIGNITER_SNIPPETS,
  SLIM_SNIPPETS,
  SINATRA_SNIPPETS,
  HANAMI_SNIPPETS,
  KTOR_SNIPPETS,
  SPRING_BOOT_SNIPPETS,
  MICRONAUT_SNIPPETS,
  QUARKUS_SNIPPETS,
  GIN_SNIPPETS,
  FIBER_SNIPPETS,
  ECHO_SNIPPETS,
  DOTNET_BACKEND_SNIPPETS,
  ACTIX_SNIPPETS,
  AXUM_SNIPPETS,
} from './backendSnippets'
import { notificationService } from '../../services/notificationService'

export const backendExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.backend-mega-pack',
  name: 'Universal Backend Mega-Pack (Express, Nest, Django, Symfony, Ktor, Gin, Axum)',
  version: '1.0.0',
  description:
    'Comprehensive multi-runtime backend suite covering Express 5, NestJS, Fastify, Koa, Hono (Node), Django Ninja, FastAPI, Sanic, Flask (Python), Symfony, CodeIgniter, Slim (PHP), Sinatra, Hanami (Ruby), Ktor, Spring Boot, Micronaut, Quarkus (Java/Kotlin), Gin, Fiber, Echo (Go), SignalR/Minimal APIs (.NET), and Actix-Web, Axum (Rust).',
  author: 'indoctrinatedrecluse',
  category: 'Frameworks',
  iconName: 'Server',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: backendSnippets.length,
  languages: [
    {
      id: 'javascript',
      extensions: ['.js', '.mjs', '.cjs'],
      aliases: ['Node.js Backend'],
      snippets: [...EXPRESS_SNIPPETS, ...NESTJS_SNIPPETS, ...FASTIFY_SNIPPETS, ...KOA_SNIPPETS, ...HONO_SNIPPETS],
    },
    {
      id: 'typescript',
      extensions: ['.ts'],
      aliases: ['TypeScript Backend'],
      snippets: [...EXPRESS_SNIPPETS, ...NESTJS_SNIPPETS, ...FASTIFY_SNIPPETS, ...KOA_SNIPPETS, ...HONO_SNIPPETS],
    },
    {
      id: 'python',
      extensions: ['.py'],
      aliases: ['Python Backend (FastAPI, Django Ninja, Sanic, Flask)'],
      snippets: [...DJANGO_NINJA_SNIPPETS, ...FASTAPI_SNIPPETS, ...SANIC_SNIPPETS, ...FLASK_SNIPPETS],
    },
    {
      id: 'php',
      extensions: ['.php'],
      aliases: ['PHP Backend (Symfony, CodeIgniter, Slim)'],
      snippets: [...SYMFONY_BACKEND_SNIPPETS, ...CODEIGNITER_SNIPPETS, ...SLIM_SNIPPETS],
    },
    {
      id: 'ruby',
      extensions: ['.rb'],
      aliases: ['Ruby Backend (Sinatra, Hanami)'],
      snippets: [...SINATRA_SNIPPETS, ...HANAMI_SNIPPETS],
    },
    {
      id: 'java',
      extensions: ['.java', '.kt'],
      aliases: ['Java/Kotlin Backend (Ktor, Spring Boot, Micronaut, Quarkus)'],
      snippets: [...SPRING_BOOT_SNIPPETS, ...MICRONAUT_SNIPPETS, ...QUARKUS_SNIPPETS, ...KTOR_SNIPPETS],
    },
    {
      id: 'go',
      extensions: ['.go'],
      aliases: ['Go Backend (Gin, Fiber, Echo)'],
      snippets: [...GIN_SNIPPETS, ...FIBER_SNIPPETS, ...ECHO_SNIPPETS],
    },
    {
      id: 'csharp',
      extensions: ['.cs'],
      aliases: ['.NET Backend (SignalR, Minimal APIs)'],
      snippets: DOTNET_BACKEND_SNIPPETS,
    },
    {
      id: 'rust',
      extensions: ['.rs'],
      aliases: ['Rust Backend (Actix-Web, Axum)'],
      snippets: [...ACTIX_SNIPPETS, ...AXUM_SNIPPETS],
    },
  ],
}

let isRegistered = false

export function registerBackendMegaPackExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  const safeRegisterCompletion = (
    lang: string,
    snippetsProvider: (range: monaco.IRange) => monaco.languages.CompletionItem[]
  ) => {
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
              suggestions: snippetsProvider(range),
            }
          } catch (innerErr) {
            notificationService.notifyError(
              'Backend Mega-Pack Engine',
              `Provider execution failed for language ${lang}: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}. Gracefully falling back.`
            )
            return { suggestions: [] }
          }
        },
      })
    } catch (err) {
      notificationService.notifyError(
        'Backend Mega-Pack Engine',
        `Failed to register language provider for ${lang}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  // 1. Node.js Backends (JS / TS)
  const nodeBackendSnippets = (range: monaco.IRange): monaco.languages.CompletionItem[] => [
    ...EXPRESS_SNIPPETS,
    ...NESTJS_SNIPPETS,
    ...FASTIFY_SNIPPETS,
    ...KOA_SNIPPETS,
    ...HONO_SNIPPETS,
  ].map((s) => ({
    label: s.label,
    kind: monacoInstance.languages.CompletionItemKind.Snippet,
    detail: s.detail || 'Node Backend Snippet',
    documentation: s.documentation,
    insertText: s.insertText,
    insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
  }))

  safeRegisterCompletion('javascript', nodeBackendSnippets)
  safeRegisterCompletion('typescript', nodeBackendSnippets)

  // 2. Python Backends
  safeRegisterCompletion('python', (range) =>
    [
      ...DJANGO_NINJA_SNIPPETS,
      ...FASTAPI_SNIPPETS,
      ...SANIC_SNIPPETS,
      ...FLASK_SNIPPETS,
    ].map((s) => ({
      label: s.label,
      kind: monacoInstance.languages.CompletionItemKind.Snippet,
      detail: s.detail || 'Python Backend Snippet',
      documentation: s.documentation,
      insertText: s.insertText,
      insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    }))
  )

  // 3. PHP Backends
  safeRegisterCompletion('php', (range) =>
    [
      ...SYMFONY_BACKEND_SNIPPETS,
      ...CODEIGNITER_SNIPPETS,
      ...SLIM_SNIPPETS,
    ].map((s) => ({
      label: s.label,
      kind: monacoInstance.languages.CompletionItemKind.Snippet,
      detail: s.detail || 'PHP Backend Snippet',
      documentation: s.documentation,
      insertText: s.insertText,
      insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    }))
  )

  // 4. Ruby Backends
  safeRegisterCompletion('ruby', (range) =>
    [
      ...SINATRA_SNIPPETS,
      ...HANAMI_SNIPPETS,
    ].map((s) => ({
      label: s.label,
      kind: monacoInstance.languages.CompletionItemKind.Snippet,
      detail: s.detail || 'Ruby Backend Snippet',
      documentation: s.documentation,
      insertText: s.insertText,
      insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    }))
  )

  // 5. Java / Kotlin Backends
  const javaBackendSnippets = (range: monaco.IRange): monaco.languages.CompletionItem[] =>
    [
      ...SPRING_BOOT_SNIPPETS,
      ...MICRONAUT_SNIPPETS,
      ...QUARKUS_SNIPPETS,
      ...KTOR_SNIPPETS,
    ].map((s) => ({
      label: s.label,
      kind: monacoInstance.languages.CompletionItemKind.Snippet,
      detail: s.detail || 'Java/Kotlin Backend Snippet',
      documentation: s.documentation,
      insertText: s.insertText,
      insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    }))
  safeRegisterCompletion('java', javaBackendSnippets)
  safeRegisterCompletion('kotlin', javaBackendSnippets)

  // 6. Go Backends
  safeRegisterCompletion('go', (range) =>
    [
      ...GIN_SNIPPETS,
      ...FIBER_SNIPPETS,
      ...ECHO_SNIPPETS,
    ].map((s) => ({
      label: s.label,
      kind: monacoInstance.languages.CompletionItemKind.Snippet,
      detail: s.detail || 'Go Backend Snippet',
      documentation: s.documentation,
      insertText: s.insertText,
      insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    }))
  )

  // 7. C# / .NET Backends
  safeRegisterCompletion('csharp', (range) =>
    DOTNET_BACKEND_SNIPPETS.map((s) => ({
      label: s.label,
      kind: monacoInstance.languages.CompletionItemKind.Snippet,
      detail: s.detail || '.NET Backend Snippet',
      documentation: s.documentation,
      insertText: s.insertText,
      insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    }))
  )

  // 8. Rust Backends
  safeRegisterCompletion('rust', (range) =>
    [
      ...ACTIX_SNIPPETS,
      ...AXUM_SNIPPETS,
    ].map((s) => ({
      label: s.label,
      kind: monacoInstance.languages.CompletionItemKind.Snippet,
      detail: s.detail || 'Rust Backend Snippet',
      documentation: s.documentation,
      insertText: s.insertText,
      insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    }))
  )
}

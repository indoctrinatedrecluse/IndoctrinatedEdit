import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { frontendSnippets } from './frontendSnippets'
import { notificationService } from '../../services/notificationService'

export const frontendExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.frontend-mega-pack',
  name: 'Universal Frontend Mega-Pack (Vue, Svelte, Solid, Streamlit, Blazor, Alpine)',
  version: '1.0.0',
  description: 'Massive multi-ecosystem UI suite covering Vue 3, Svelte 5, SolidJS, Preact, Streamlit, Dash, Reflex, Flet, Livewire 3, Inertia.js, Hotwire/Turbo, Blazor, and Alpine.js.',
  author: 'indoctrinatedrecluse',
  category: 'Frameworks',
  iconName: 'Layers',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: frontendSnippets.length,
  languages: [
    {
      id: 'html',
      extensions: ['.vue', '.svelte', '.blade.php', '.erb', '.razor', '.html', '.htm'],
      aliases: ['HTML Frontend', 'Vue', 'Svelte', 'Blade', 'Razor', 'Alpine'],
      snippets: frontendSnippets,
    },
    {
      id: 'javascript',
      extensions: ['.vue', '.svelte', '.js', '.jsx'],
      aliases: ['Frontend JS'],
      snippets: frontendSnippets,
    },
    {
      id: 'typescript',
      extensions: ['.vue', '.svelte', '.ts', '.tsx'],
      aliases: ['Frontend TS'],
      snippets: frontendSnippets,
    },
    {
      id: 'python',
      extensions: ['.py'],
      aliases: ['Python UI (Streamlit, Reflex, Dash, Flet)'],
      snippets: frontendSnippets.filter((s) =>
        ['streamlit-app', 'dash-app', 'reflex-app', 'flet-app'].includes(s.label)
      ),
    },
    {
      id: 'php',
      extensions: ['.php', '.blade.php'],
      aliases: ['PHP UI (Livewire, Blade)'],
      snippets: frontendSnippets.filter((s) => s.label === 'livewire-component'),
    },
    {
      id: 'csharp',
      extensions: ['.razor', '.cs'],
      aliases: ['Blazor UI'],
      snippets: frontendSnippets.filter((s) => s.label === 'blazor-component'),
    },
    {
      id: 'ruby',
      extensions: ['.erb', '.rb'],
      aliases: ['Ruby UI (Hotwire, ViewComponent)'],
      snippets: frontendSnippets.filter((s) =>
        ['hotwire-turbo-frame', 'view-component'].includes(s.label)
      ),
    },
  ],
}

let isRegistered = false

export function registerFrontendMegaPackExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  const targetLanguages = ['html', 'javascript', 'typescript', 'python', 'php', 'csharp', 'ruby']

  const provideSnippets = (model: monaco.editor.ITextModel, position: monaco.Position) => {
    try {
      const word = model.getWordUntilPosition(position)
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const suggestions: monaco.languages.CompletionItem[] = frontendSnippets.map((snippet) => ({
        label: snippet.label,
        kind: monacoInstance.languages.CompletionItemKind.Snippet,
        detail: snippet.detail || 'Frontend Mega-Pack Snippet',
        documentation: snippet.documentation,
        insertText: snippet.insertText,
        insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
      }))

      return { suggestions }
    } catch (err) {
      notificationService.notifyError(
        'Frontend Mega-Pack Completion Warning',
        err,
        'Frontend Language Service'
      )
      return { suggestions: [] }
    }
  }

  for (const lang of targetLanguages) {
    try {
      monacoInstance.languages.registerCompletionItemProvider(lang, {
        provideCompletionItems: provideSnippets,
      })
    } catch (err) {
      console.warn(`Could not register Frontend Mega-Pack for language \${lang}:`, err)
    }
  }
}

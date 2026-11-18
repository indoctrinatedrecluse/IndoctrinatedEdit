import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import {
  frontendSnippets,
  VUE_SNIPPETS,
  SVELTE_SNIPPETS,
  SOLID_SNIPPETS,
  PREACT_SNIPPETS,
  STREAMLIT_SNIPPETS,
  DASH_SNIPPETS,
  REFLEX_SNIPPETS,
  FLET_SNIPPETS,
  ANVIL_SNIPPETS,
  LIVEWIRE_SNIPPETS,
  INERTIA_SNIPPETS,
  BLADE_UI_SNIPPETS,
  SYMFONY_UX_SNIPPETS,
  HOTWIRE_SNIPPETS,
  VIEWCOMPONENT_SNIPPETS,
  BLAZOR_SNIPPETS,
  ALPINE_SNIPPETS,
} from './frontendSnippets'
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
      id: 'vue',
      extensions: ['.vue'],
      aliases: ['Vue', 'vue'],
      snippets: [...VUE_SNIPPETS, ...INERTIA_SNIPPETS],
    },
    {
      id: 'svelte',
      extensions: ['.svelte'],
      aliases: ['Svelte', 'svelte'],
      snippets: SVELTE_SNIPPETS,
    },
    {
      id: 'razor',
      extensions: ['.razor', '.cshtml'],
      aliases: ['Razor', 'Blazor'],
      snippets: BLAZOR_SNIPPETS,
    },
    {
      id: 'html',
      extensions: ['.blade.php', '.erb', '.html', '.htm'],
      aliases: ['HTML Frontend', 'Blade', 'Alpine'],
      snippets: [...ALPINE_SNIPPETS, ...BLADE_UI_SNIPPETS, ...HOTWIRE_SNIPPETS],
    },
    {
      id: 'javascript',
      extensions: ['.js', '.jsx'],
      aliases: ['Frontend JS'],
      snippets: [...SOLID_SNIPPETS, ...PREACT_SNIPPETS, ...SYMFONY_UX_SNIPPETS],
    },
    {
      id: 'typescript',
      extensions: ['.ts', '.tsx'],
      aliases: ['Frontend TS'],
      snippets: [...SOLID_SNIPPETS, ...PREACT_SNIPPETS, ...SYMFONY_UX_SNIPPETS],
    },
    {
      id: 'python',
      extensions: ['.py'],
      aliases: ['Python UI (Streamlit, Reflex, Dash, Flet, Anvil)'],
      snippets: [...STREAMLIT_SNIPPETS, ...DASH_SNIPPETS, ...REFLEX_SNIPPETS, ...FLET_SNIPPETS, ...ANVIL_SNIPPETS],
    },
    {
      id: 'php',
      extensions: ['.php', '.blade.php'],
      aliases: ['PHP UI (Livewire, Blade)'],
      snippets: [...LIVEWIRE_SNIPPETS, ...BLADE_UI_SNIPPETS],
    },
    {
      id: 'csharp',
      extensions: ['.cs'],
      aliases: ['Blazor UI'],
      snippets: BLAZOR_SNIPPETS,
    },
    {
      id: 'ruby',
      extensions: ['.erb', '.rb'],
      aliases: ['Ruby UI (Hotwire, ViewComponent)'],
      snippets: [...HOTWIRE_SNIPPETS, ...VIEWCOMPONENT_SNIPPETS],
    },
  ],
}


export function registerFrontendMegaPackExtension(monacoInstance: typeof monaco): monaco.IDisposable[] {
  if (!monacoInstance) return []

  const disposables: monaco.IDisposable[] = []
  const langEntries = frontendExtensionManifest.languages || []

  for (const langEntry of langEntries) {
    const langSnippets = langEntry.snippets || frontendSnippets
    try {
      const d = monacoInstance.languages.registerCompletionItemProvider(langEntry.id, {
        provideCompletionItems: (model: monaco.editor.ITextModel, position: monaco.Position) => {
          try {
            const word = model.getWordUntilPosition(position)
            const range: monaco.IRange = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            }

            const suggestions: monaco.languages.CompletionItem[] = langSnippets.map((snippet) => ({
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
              String(err),
              'Frontend Language Service'
            )
            return { suggestions: [] }
          }
        },
      })
      if (d) disposables.push(d)
    } catch (err) {
      console.warn(`Could not register Frontend Mega-Pack for language ${langEntry.id}:`, err)
    }
  }

  return disposables
}

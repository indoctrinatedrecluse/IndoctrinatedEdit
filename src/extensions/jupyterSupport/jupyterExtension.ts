import type * as monaco from 'monaco-editor'
import { ExtensionManifest, SnippetDefinition } from '../extensionTypes'

export const jupyterSnippets: SnippetDefinition[] = [
  {
    label: 'ipynb-data-science-header',
    documentation: 'Standard Data Science & Machine Learning Imports Block',
    insertText: 'import numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\nimport seaborn as sns\n\n%matplotlib inline\nsns.set_theme(style="darkgrid")\n$0',
  },
  {
    label: 'ipynb-interactive-cell',
    documentation: 'Python Interactive Cell Separator Block',
    insertText: '# %%\n# Cell: ${1:Analysis Block}\n${2:# Your code here}\n$0',
  },
  {
    label: 'ipynb-train-test-split',
    documentation: 'Scikit-Learn Train/Test Split & Scaler pipeline',
    insertText: 'from sklearn.model_selection import train_test_split\nfrom sklearn.preprocessing import StandardScaler\n\nX_train, X_test, y_train, y_test = train_test_split(${1:X}, ${2:y}, test_size=${3:0.2}, random_state=42)\nscaler = StandardScaler()\nX_train_scaled = scaler.fit_transform(X_train)\nX_test_scaled = scaler.transform(X_test)\n$0',
  },
  {
    label: 'ipynb-figure-plot',
    documentation: 'Matplotlib High-Resolution Subplot Figure',
    insertText: 'fig, ax = plt.subplots(figsize=(${1:10}, ${2:4}), dpi=150)\nax.plot(${3:x}, ${4:y}, label="${5:Series A}", color="#0A84FF", lw=2)\nax.set_title("${6:Plot Title}")\nax.set_xlabel("${7:X Axis}")\nax.set_ylabel("${8:Y Axis}")\nax.legend()\nplt.tight_layout()\nplt.show()\n$0',
  },
]

export const jupyterExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.jupyter-notebook-engine',
  name: 'Jupyter Notebooks & Live Kernel Studio',
  version: '1.0.0',
  description:
    'Full-featured interactive Jupyter Notebook (.ipynb) visual editor with live multi-language execution, cell management, DataFrame inspection, SVG charts, and variable explorer.',
  author: 'indoctrinatedrecluse',
  category: 'Tools',
  iconName: 'BookOpen',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: jupyterSnippets.length,
  languages: [
    {
      id: 'ipynb',
      extensions: ['.ipynb', '.jupyter'],
      aliases: ['Jupyter Notebook', 'IPython Notebook', 'Notebook'],
      snippets: jupyterSnippets,
    },
  ],
}

let isRegistered = false

export function registerJupyterExtension(monacoInstance?: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  try {
    const registerForLang = (langId: string) => {
      try {
        monacoInstance.languages.registerCompletionItemProvider(langId, {
          provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position)
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            }

            const suggestions: monaco.languages.CompletionItem[] = jupyterSnippets.map((s) => ({
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
        console.warn(`Could not register completion provider for ${langId}:`, err)
      }
    }

    registerForLang('ipynb')
    registerForLang('python')
  } catch (err) {
    console.warn('Could not initialize Jupyter Monaco extension:', err)
  }
}

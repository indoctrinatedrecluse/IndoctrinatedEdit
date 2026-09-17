import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { gdscriptSnippets } from './gdscriptSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const gdscriptExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.gdscript',
  name: 'Godot 4 & GDScript Game Development Suite',
  version: '1.0.0',
  description:
    'Dedicated Godot Engine 4.x & GDScript suite featuring CharacterBody2D/3D templates, signal architecture, custom Resource models, and physics controllers.',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'Gamepad',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: gdscriptSnippets.length,
  languages: [
    {
      id: 'gdscript',
      extensions: ['.gd', '.tscn', '.tres', '.godot'],
      aliases: ['GDScript', 'gdscript', 'Godot', 'Godot4'],
      snippets: gdscriptSnippets,
    },
  ],
}

let isRegistered = false

export function registerGDScriptExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  try {
    monacoInstance.languages.registerCompletionItemProvider('gdscript', {
      provideCompletionItems: (model, position) => {
        try {
          const word = model.getWordUntilPosition(position)
          const range: monaco.IRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          }

          const suggestions: monaco.languages.CompletionItem[] = gdscriptSnippets.map((snip) => ({
            label: snip.label,
            kind: monacoInstance.languages.CompletionItemKind.Snippet,
            detail: `🚀 ${snip.detail}`,
            documentation: {
              value: `**${snip.detail}**\n\n${snip.documentation}`,
            },
            insertText: snip.insertText,
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          }))

          return { suggestions }
        } catch (err) {
          console.error('GDScript snippet provider failed:', err)
          return { suggestions: [] }
        }
      },
    })
  } catch (err) {
    console.error('Could not register GDScript extension provider:', err)
  }

  // Register toolchain for Godot
  toolchainService.registerToolchain({
    id: 'toolchain.godot',
    name: 'Godot 4 Engine & CLI',
    language: 'gdscript',
    binaryNames: ['godot', 'godot4', 'godot-headless'],
    versionFlag: '--version',
    versionPattern: '([0-9]+\\.[0-9]+(?:\\.[0-9]+)?)',
    downloadUrl: 'https://godotengine.org',
    description: 'Free, open-source 2D and 3D game engine and editor runtime',
  })

  notificationService.notifyInfo('Extension System', '🚀 Godot 4 & GDScript Suite activated')
}

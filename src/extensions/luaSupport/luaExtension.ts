import * as monaco from 'monaco-editor'
import { ExtensionManifest } from '../extensionTypes'
import { luaSnippets } from './luaSnippets'
import { toolchainService } from '../../services/toolchainService'
import { notificationService } from '../../services/notificationService'

export const luaExtensionManifest: ExtensionManifest = {
  id: 'indoctrinated.ext.lua-luau',
  name: 'Lua, Luau & Game Engine Development Suite',
  version: '1.0.0',
  description:
    'Dedicated first-class Lua & Luau suite for Lua 5.1-5.4, LuaJIT, Roblox Luau, LÖVE2D game engine, Neovim configurations, and OpenResty high-concurrency microservices.',
  author: 'indoctrinatedrecluse',
  category: 'Languages',
  iconName: 'Gamepad2',
  status: 'Active',
  type: 'Built-in',
  snippetsCount: luaSnippets.length,
  languages: [
    {
      id: 'lua',
      extensions: ['.lua', '.luau', '.rockspec'],
      aliases: ['Lua', 'lua', 'Luau', 'LÖVE', 'Love2D', 'Roblox'],
      snippets: luaSnippets,
    },
  ],
}

let isRegistered = false

export function registerLuaExtension(monacoInstance: typeof monaco) {
  if (isRegistered || !monacoInstance) return
  isRegistered = true

  try {
    monacoInstance.languages.registerCompletionItemProvider('lua', {
      provideCompletionItems: (model, position) => {
        try {
          const word = model.getWordUntilPosition(position)
          const range: monaco.IRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          }

          const suggestions: monaco.languages.CompletionItem[] = luaSnippets.map((snip) => ({
            label: snip.label,
            kind: monacoInstance.languages.CompletionItemKind.Snippet,
            detail: `🌙 ${snip.detail}`,
            documentation: {
              value: `**${snip.detail}**\n\n${snip.documentation}`,
            },
            insertText: snip.insertText,
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          }))

          return { suggestions }
        } catch (err) {
          console.error('Lua snippet provider failed:', err)
          return { suggestions: [] }
        }
      },
    })
  } catch (err) {
    console.error('Could not register Lua extension provider:', err)
  }

  // Register toolchain for Lua / LuaJIT
  toolchainService.registerToolchain({
    id: 'toolchain.lua',
    name: 'Lua / LuaJIT Runtime',
    language: 'lua',
    binaryNames: ['lua', 'luajit', 'luau'],
    versionFlag: '-v',
    versionPattern: '(?:Lua|LuaJIT|Luau)\\s+([0-9]+\\.[0-9]+(?:\\.[0-9]+)?)',
    downloadUrl: 'https://www.lua.org/download.html',
    description: 'Powerful, efficient, lightweight, embeddable scripting language',
  })

  notificationService.notifyInfo('Extension System', '🌙 Lua & Luau Game Engine Suite activated')
}

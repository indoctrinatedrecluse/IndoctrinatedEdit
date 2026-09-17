import { describe, it, expect } from 'vitest'
import { luaExtensionManifest } from '../src/extensions/luaSupport/luaExtension'
import {
  CORE_LUA_SNIPPETS,
  LOVE2D_SNIPPETS,
  ROBLOX_LUAU_SNIPPETS,
  NEOVIM_LUA_SNIPPETS,
  OPENRESTY_SNIPPETS,
} from '../src/extensions/luaSupport/luaSnippets'
import { zigExtensionManifest } from '../src/extensions/zigSupport/zigExtension'
import { ZIG_CORE_SNIPPETS } from '../src/extensions/zigSupport/zigSnippets'
import { gdscriptExtensionManifest } from '../src/extensions/gdscriptSupport/gdscriptExtension'
import { GDSCRIPT_CORE_SNIPPETS } from '../src/extensions/gdscriptSupport/gdscriptSnippets'
import { shellScriptExtensionManifest } from '../src/extensions/shellScriptSupport/shellScriptExtension'
import {
  BASH_SNIPPETS,
  POWERSHELL_SNIPPETS,
  BATCH_SNIPPETS,
} from '../src/extensions/shellScriptSupport/shellScriptSnippets'
import { juliaExtensionManifest } from '../src/extensions/juliaSupport/juliaExtension'
import { JULIA_CORE_SNIPPETS } from '../src/extensions/juliaSupport/juliaSnippets'
import { extensionRegistry } from '../src/extensions/extensionRegistry'
import { toolchainService } from '../src/services/toolchainService'

describe('Dedicated Language Extensions & Zero-Overlap Tests', () => {
  // 1. Lua & Luau Game Engine Suite
  describe('🌙 Lua & Luau Game Development Suite', () => {
    it('should have valid Lua manifest registered in ExtensionRegistry', () => {
      expect(luaExtensionManifest.id).toBe('indoctrinated.ext.lua-luau')
      const reg = extensionRegistry.get('indoctrinated.ext.lua-luau')
      expect(reg).toBeDefined()
      expect(reg?.languages?.map((l) => l.id)).toContain('lua')
    })

    it('should have rich snippets for Core Lua, Love2D, Luau, Neovim, and OpenResty', () => {
      expect(CORE_LUA_SNIPPETS.length).toBeGreaterThan(0)
      expect(LOVE2D_SNIPPETS.length).toBeGreaterThan(0)
      expect(ROBLOX_LUAU_SNIPPETS.length).toBeGreaterThan(0)
      expect(NEOVIM_LUA_SNIPPETS.length).toBeGreaterThan(0)
      expect(OPENRESTY_SNIPPETS.length).toBeGreaterThan(0)

      expect(CORE_LUA_SNIPPETS.map((s) => s.label)).toContain('lua-class')
      expect(LOVE2D_SNIPPETS.map((s) => s.label)).toContain('love-lifecycle')
      expect(ROBLOX_LUAU_SNIPPETS.map((s) => s.label)).toContain('luau-strict-service')
    })

    it('should check toolchain.lua', async () => {
      const info = await toolchainService.detectOne('toolchain.lua')
      expect(info).toBeDefined()
    })
  })

  // 2. Zig Native Systems Suite
  describe('⚡ Zig & Native Systems Suite', () => {
    it('should have valid Zig manifest registered in ExtensionRegistry', () => {
      expect(zigExtensionManifest.id).toBe('indoctrinated.ext.zig')
      const reg = extensionRegistry.get('indoctrinated.ext.zig')
      expect(reg).toBeDefined()
      expect(reg?.languages?.map((l) => l.id)).toContain('zig')
    })

    it('should have comprehensive Zig snippets', () => {
      expect(ZIG_CORE_SNIPPETS.length).toBeGreaterThan(0)
      expect(ZIG_CORE_SNIPPETS.map((s) => s.label)).toContain('zig-main-gpa')
      expect(ZIG_CORE_SNIPPETS.map((s) => s.label)).toContain('zig-build-zig')
    })

    it('should check toolchain.zig', async () => {
      const info = await toolchainService.detectOne('toolchain.zig')
      expect(info).toBeDefined()
    })
  })

  // 3. Godot & GDScript Suite
  describe('🚀 Godot 4 & GDScript Suite', () => {
    it('should have valid GDScript manifest registered in ExtensionRegistry', () => {
      expect(gdscriptExtensionManifest.id).toBe('indoctrinated.ext.gdscript')
      const reg = extensionRegistry.get('indoctrinated.ext.gdscript')
      expect(reg).toBeDefined()
      expect(reg?.languages?.map((l) => l.id)).toContain('gdscript')
    })

    it('should have GDScript 4 node & controller snippets', () => {
      expect(GDSCRIPT_CORE_SNIPPETS.length).toBeGreaterThan(0)
      expect(GDSCRIPT_CORE_SNIPPETS.map((s) => s.label)).toContain('gd-character-body-2d')
    })

    it('should check toolchain.godot', async () => {
      const info = await toolchainService.detectOne('toolchain.godot')
      expect(info).toBeDefined()
    })
  })

  // 4. Universal Shell & PowerShell Automation Suite
  describe('📜 Universal Shell & PowerShell Suite', () => {
    it('should have valid Shell manifest registered in ExtensionRegistry', () => {
      expect(shellScriptExtensionManifest.id).toBe('indoctrinated.ext.shell-powershell')
      const reg = extensionRegistry.get('indoctrinated.ext.shell-powershell')
      expect(reg).toBeDefined()
      expect(reg?.languages?.map((l) => l.id)).toContain('shell')
      expect(reg?.languages?.map((l) => l.id)).toContain('powershell')
      expect(reg?.languages?.map((l) => l.id)).toContain('bat')
    })

    it('should have Bash, PowerShell, and Batch snippets', () => {
      expect(BASH_SNIPPETS.length).toBeGreaterThan(0)
      expect(POWERSHELL_SNIPPETS.length).toBeGreaterThan(0)
      expect(BATCH_SNIPPETS.length).toBeGreaterThan(0)
      expect(BASH_SNIPPETS.map((s) => s.label)).toContain('sh-strict-header')
      expect(POWERSHELL_SNIPPETS.map((s) => s.label)).toContain('ps-advanced-function')
    })

    it('should check toolchain.shell and toolchain.powershell', async () => {
      const shInfo = await toolchainService.detectOne('toolchain.shell')
      expect(shInfo).toBeDefined()
      const psInfo = await toolchainService.detectOne('toolchain.powershell')
      expect(psInfo).toBeDefined()
    })
  })

  // 5. Julia Scientific Suite
  describe('🧬 Julia Scientific Suite', () => {
    it('should have valid Julia manifest registered in ExtensionRegistry', () => {
      expect(juliaExtensionManifest.id).toBe('indoctrinated.ext.julia')
      const reg = extensionRegistry.get('indoctrinated.ext.julia')
      expect(reg).toBeDefined()
      expect(reg?.languages?.map((l) => l.id)).toContain('julia')
    })

    it('should have Julia ML, ODE, and Multiple Dispatch snippets', () => {
      expect(JULIA_CORE_SNIPPETS.length).toBeGreaterThan(0)
      expect(JULIA_CORE_SNIPPETS.map((s) => s.label)).toContain('julia-multiple-dispatch')
      expect(JULIA_CORE_SNIPPETS.map((s) => s.label)).toContain('julia-flux-model')
    })

    it('should check toolchain.julia', async () => {
      const info = await toolchainService.detectOne('toolchain.julia')
      expect(info).toBeDefined()
    })
  })

  // 6. Zero-Overlap Audit
  describe('🛡️ Zero-Overlap Ecosystem Integrity Audit', () => {
    it('should verify total registered extensions count', () => {
      const all = extensionRegistry.getAll()
      expect(all.length).toBeGreaterThanOrEqual(35)
    })

    it('should resolve .lua, .zig, .gd, .sh, .ps1, and .jl accurately without duplicate collision', () => {
      expect(extensionRegistry.resolveLanguageForFilename('main.lua')).toBe('lua')
      expect(extensionRegistry.resolveLanguageForFilename('main.luau')).toBe('lua')
      expect(extensionRegistry.resolveLanguageForFilename('engine.zig')).toBe('zig')
      expect(extensionRegistry.resolveLanguageForFilename('player.gd')).toBe('gdscript')
      expect(extensionRegistry.resolveLanguageForFilename('deploy.sh')).toBe('shell')
      expect(extensionRegistry.resolveLanguageForFilename('script.ps1')).toBe('powershell')
      expect(extensionRegistry.resolveLanguageForFilename('simulation.jl')).toBe('julia')
    })
  })
})

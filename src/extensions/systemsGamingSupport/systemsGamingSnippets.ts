import { SnippetDefinition } from '../extensionTypes'

// 1. Odin Snippets (Game & Systems programming)
export const ODIN_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'odin-main',
    detail: 'Odin: Main Procedure Entrypoint with Format Printing',
    documentation: 'Odin main entrypoint procedure importing core:fmt and core:mem',
    insertText: 'package main\n\nimport "core:fmt"\n\nmain :: proc() {\n\tfmt.println("✨ [IndoctrinatedEdit] Odin Systems & Gaming Engine Initialized")\n\t${1:// Game and engine logic}\n}\n$0',
  },
  {
    label: 'odin-struct',
    detail: 'Odin: Data-Oriented Struct with Explicit Alignment & Procedures',
    documentation: 'Odin struct declaration with procedures and data-oriented fields',
    insertText: '${1:GlassSurface} :: struct {\n\tsheen_factor: f32,\n\troughness:    f32,\n\tis_active:    bool,\n}\n\ninit_surface :: proc(sheen: f32 = 0.85) -> ${1:GlassSurface} {\n\treturn ${1:GlassSurface}{\n\t\tsheen_factor = sheen,\n\t\troughness    = 0.12,\n\t\tis_active    = true,\n\t}\n}\n$0',
  },
  {
    label: 'odin-raylib-window',
    detail: 'Odin: Raylib Game Loop with Arena Allocator',
    documentation: 'Odin data-oriented game loop using Raylib graphics and temp_allocator',
    insertText: 'package main\n\nimport "core:fmt"\nimport "core:mem"\nimport rl "vendor:raylib"\n\nmain :: proc() {\n\trl.InitWindow(800, 600, "✨ IndoctrinatedEdit Odin Engine")\n\tdefer rl.CloseWindow()\n\trl.SetTargetFPS(60)\n\n\tfor !rl.WindowShouldClose() {\n\t\t// Frame temporary memory tracking\n\t\tfree_all(context.temp_allocator)\n\n\t\trl.BeginDrawing()\n\t\trl.ClearBackground(rl.Color{12, 14, 20, 255})\n\n\t\trl.DrawText("Liquid Glass Specular Odin Shaper", 190, 200, 24, rl.RAYWHITE)\n\t\trl.DrawCircle(400, 350, 45, rl.Color{10, 132, 255, 200})\n\n\t\trl.EndDrawing()\n\t}\n}\n$0',
  },
]

// 2. Nim Snippets
export const NIM_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'nim-async-http',
    detail: 'Nim: Async HTTP Server with Macro Decorators',
    documentation: 'Nim async/await HTTP server using std/asynchttpserver and JSON responses',
    insertText: 'import std/[asynchttpserver, asyncdispatch, json]\n\nproc main() {.async.} =\n  var server = newAsyncHttpServer()\n  \n  proc cb(req: Request) {.async.} =\n    let headers = {"Content-Type": "application/json"}\n    let payload = %* {"status": "ok", "runtime": "Nim Compiled Engine"}\n    await req.respond(Http200, $payload, headers.newHttpHeaders())\n\n  echo "✨ Nim server running on http://127.0.0.1:8080"\n  await server.serve(Port(8080), cb)\n\nwaitFor main()\n$0',
  },
]

// 3. Assembly & WAT Snippets
export const ASSEMBLY_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'asm-x86-64-entry',
    detail: 'Assembly (x86_64 NASM): Linux Syscall 64-bit Entry',
    documentation: 'NASM x86_64 assembly writing to stdout and clean exit syscall',
    insertText: 'section .data\n    msg db "✨ Liquid Glass Native Assembly", 0xA\n    len equ $ - msg\n\nsection .text\n    global _start\n\n_start:\n    ; sys_write (rax=1, rdi=1, rsi=msg, rdx=len)\n    mov rax, 1\n    mov rdi, 1\n    mov rsi, msg\n    mov rdx, len\n    syscall\n\n    ; sys_exit (rax=60, rdi=0)\n    mov rax, 60\n    xor rdi, rdi\n    syscall\n$0',
  },
  {
    label: 'wat-module-export',
    detail: 'WebAssembly (WAT): S-Expression Function Module',
    documentation: 'WebAssembly Text Format module with memory and exported arithmetic function',
    insertText: '(module\n  (memory (export "memory") 1)\n  (func $specularAdd (param $a f32) (param $b f32) (result f32)\n    local.get $a\n    local.get $b\n    f32.add\n  )\n  (export "specularAdd" (func $specularAdd))\n)\n$0',
  },
]

export const SYSTEMS_GAMING_SNIPPETS: SnippetDefinition[] = [
  ...ODIN_SNIPPETS,
  ...NIM_SNIPPETS,
  ...ASSEMBLY_SNIPPETS,
]

export const systemsGamingSnippets = SYSTEMS_GAMING_SNIPPETS

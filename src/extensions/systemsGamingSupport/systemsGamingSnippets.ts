import { SnippetDefinition } from '../extensionTypes'

// 1. Zig Snippets
export const ZIG_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'zig-allocator-main',
    detail: 'Zig: Main Entrypoint with GeneralPurposeAllocator',
    documentation: 'Zig idiomatic memory management using GPA with defer deinit and error handling',
    insertText: 'const std = @import("std");\n\npub fn main() !void {\n    var gpa = std.heap.GeneralPurposeAllocator(.{}){};\n    defer _ = gpa.deinit();\n    const allocator = gpa.allocator();\n\n    const stdout = std.io.getStdOut().writer();\n    try stdout.print("✨ [IndoctrinatedEdit] Zig Systems Engine Initialized\\n", .{});\n\n    const buffer = try allocator.alloc(u8, 1024);\n    defer allocator.free(buffer);\n    @memset(buffer, 0x42);\n\n    try stdout.print("Allocated bytes: {d} at address {*} \\n", .{ buffer.len, buffer.ptr });\n}\n$0',
  },
  {
    label: 'zig-comptime-struct',
    detail: 'Zig: Comptime Generic Data Structure',
    documentation: 'Zig compile-time generic struct generation with methods',
    insertText: 'const std = @import("std");\n\npub fn CircularBuffer(comptime T: type, comptime capacity: usize) type {\n    return struct {\n        items: [capacity]T = undefined,\n        head: usize = 0,\n        tail: usize = 0,\n        count: usize = 0,\n\n        const Self = @This();\n\n        pub fn push(self: *Self, item: T) bool {\n            if (self.count == capacity) return false;\n            self.items[self.head] = item;\n            self.head = (self.head + 1) % capacity;\n            self.count += 1;\n            return true;\n        }\n    };\n}\n$0',
  },
]

// 2. Odin Snippets (Game & Systems programming)
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

// 3. Nim Snippets
export const NIM_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'nim-async-http',
    detail: 'Nim: Async HTTP Server with Macro Decorators',
    documentation: 'Nim async/await HTTP server using std/asynchttpserver and JSON responses',
    insertText: 'import std/[asynchttpserver, asyncdispatch, json]\n\nproc main() {.async.} =\n  var server = newAsyncHttpServer()\n  \n  proc cb(req: Request) {.async.} =\n    let headers = {"Content-Type": "application/json"}\n    let payload = %* {"status": "ok", "runtime": "Nim Compiled Engine"}\n    await req.respond(Http200, $payload, headers.newHttpHeaders())\n\n  echo "✨ Nim server running on http://127.0.0.1:8080"\n  await server.serve(Port(8080), cb)\n\nwaitFor main()\n$0',
  },
]

// 4. Lua / Luau Snippets
export const LUA_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'lua-love2d-loop',
    detail: 'Lua / Love2D: Game Lifecycle (load, update, draw)',
    documentation: 'LÖVE 2D game lifecycle callbacks with delta-time physics and canvas draw',
    insertText: 'function love.load()\n    love.graphics.setBackgroundColor(0.05, 0.05, 0.08)\n    player = { x = 400, y = 300, speed = 250, radius = 20 }\nend\n\nfunction love.update(dt)\n    if love.keyboard.isDown("right") then player.x = player.x + player.speed * dt end\n    if love.keyboard.isDown("left") then player.x = player.x - player.speed * dt end\n    if love.keyboard.isDown("down") then player.y = player.y + player.speed * dt end\n    if love.keyboard.isDown("up") then player.y = player.y - player.speed * dt end\nend\n\nfunction love.draw()\n    love.graphics.setColor(0.04, 0.52, 1.0, 0.85)\n    love.graphics.circle("fill", player.x, player.y, player.radius)\n    love.graphics.setColor(1, 1, 1, 1)\n    love.graphics.print("✨ IndoctrinatedEdit Lua Engine", 10, 10)\nend\n$0',
  },
]

// 5. GDScript Snippets (Godot 4)
export const GDSCRIPT_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'gdscript-character-body',
    detail: 'GDScript (Godot 4): CharacterBody3D Controller with Physics',
    documentation: 'Godot 4 CharacterBody3D script with gravity, acceleration, and move_and_slide()',
    insertText: 'extends CharacterBody3D\n\n@export var speed: float = 5.0\n@export var jump_velocity: float = 4.5\n\nvar gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")\n\nfunc _physics_process(delta: float) -> void:\n\tif not is_on_floor():\n\t\tvelocity.y -= gravity * delta\n\n\tif Input.is_action_just_pressed("ui_accept") and is_on_floor():\n\t\tvelocity.y = jump_velocity\n\n\tvar input_dir := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")\n\tvar direction := (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()\n\tif direction:\n\t\tvelocity.x = direction.x * speed\n\t\tvelocity.z = direction.z * speed\n\telse:\n\t\tvelocity.x = move_toward(velocity.x, 0, speed)\n\t\tvelocity.z = move_toward(velocity.z, 0, speed)\n\n\tmove_and_slide()\n$0',
  },
]

// 6. Assembly & WAT Snippets
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
  ...ZIG_SNIPPETS,
  ...ODIN_SNIPPETS,
  ...NIM_SNIPPETS,
  ...LUA_SNIPPETS,
  ...GDSCRIPT_SNIPPETS,
  ...ASSEMBLY_SNIPPETS,
]

export const systemsGamingSnippets = SYSTEMS_GAMING_SNIPPETS

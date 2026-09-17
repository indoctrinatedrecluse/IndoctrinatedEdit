import { SnippetDefinition } from '../extensionTypes'

export const ZIG_CORE_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'zig-main-gpa',
    detail: 'Zig: Main Entrypoint with GeneralPurposeAllocator',
    documentation: 'Zig idiomatic memory management using GeneralPurposeAllocator with defer deinit and error handling',
    insertText: 'const std = @import("std");\n\npub fn main() !void {\n    var gpa = std.heap.GeneralPurposeAllocator(.{}){};\n    defer _ = gpa.deinit();\n    const allocator = gpa.allocator();\n\n    const stdout = std.io.getStdOut().writer();\n    try stdout.print("✨ [IndoctrinatedEdit] Zig Systems Engine Initialized\\n", .{});\n\n    const buffer = try allocator.alloc(u8, 1024);\n    defer allocator.free(buffer);\n    @memset(buffer, 0x42);\n\n    try stdout.print("Allocated {d} bytes at {*} \\n", .{ buffer.len, buffer.ptr });\n}\n$0',
  },
  {
    label: 'zig-comptime-generic',
    detail: 'Zig: Comptime Generic Data Structure',
    documentation: 'Zig compile-time generic struct generation with methods and typed bounds',
    insertText: 'const std = @import("std");\n\npub fn CircularBuffer(comptime T: type, comptime capacity: usize) type {\n    return struct {\n        items: [capacity]T = undefined,\n        head: usize = 0,\n        tail: usize = 0,\n        count: usize = 0,\n\n        const Self = @This();\n\n        pub fn push(self: *Self, item: T) bool {\n            if (self.count == capacity) return false;\n            self.items[self.head] = item;\n            self.head = (self.head + 1) % capacity;\n            self.count += 1;\n            return true;\n        }\n\n        pub fn pop(self: *Self) ?T {\n            if (self.count == 0) return null;\n            const item = self.items[self.tail];\n            self.tail = (self.tail + 1) % capacity;\n            self.count -= 1;\n            return item;\n        }\n    };\n}\n$0',
  },
  {
    label: 'zig-build-zig',
    detail: 'Zig: Standard build.zig Multi-Target Executable & Unit Tests',
    documentation: 'Zig 0.13+ standard build.zig script configuring native executable, optimization modes, and test steps',
    insertText: 'const std = @import("std");\n\npub fn build(b: *std.Build) void {\n    const target = b.standardTargetOptions(.{});\n    const optimize = b.standardOptimizeOption(.{});\n\n    const exe = b.addExecutable(.{\n        .name = "${1:engine}",\n        .root_source_file = b.path("src/main.zig"),\n        .target = target,\n        .optimize = optimize,\n    });\n    b.installArtifact(exe);\n\n    const run_cmd = b.addRunArtifact(exe);\n    run_cmd.step.dependOn(b.getInstallStep());\n\n    const run_step = b.step("run", "Run the application");\n    run_step.dependOn(&run_cmd.step);\n\n    const unit_tests = b.addTest(.{\n        .root_source_file = b.path("src/main.zig"),\n        .target = target,\n        .optimize = optimize,\n    });\n    const run_unit_tests = b.addRunArtifact(unit_tests);\n    const test_step = b.step("test", "Run unit tests");\n    test_step.dependOn(&run_unit_tests.step);\n}\n$0',
  },
  {
    label: 'zig-c-import',
    detail: 'Zig: Seamless @cImport C Header Interop',
    documentation: 'Zig direct C header integration using @cImport and @cInclude',
    insertText: 'const std = @import("std");\nconst c = @cImport({\n    @cInclude("stdio.h");\n    @cInclude("stdlib.h");\n    @cInclude("math.h");\n});\n\npub fn main() void {\n    _ = c.printf("✨ Invoking C runtime from Zig engine: sqrt(16) = %.2f\\n", c.sqrt(16.0));\n}\n$0',
  },
  {
    label: 'zig-simd-vector',
    detail: 'Zig: Hardware SIMD Vector Operations (@Vector)',
    documentation: 'Zig SIMD @Vector type with hardware-accelerated vector arithmetic',
    insertText: 'const std = @import("std");\n\npub fn dotProduct4(a: @Vector(4, f32), b: @Vector(4, f32)) f32 {\n    const mul = a * b;\n    return @reduce(.Add, mul);\n}\n$0',
  },
]

export const zigSnippets: SnippetDefinition[] = [...ZIG_CORE_SNIPPETS]

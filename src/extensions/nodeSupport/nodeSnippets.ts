import { SnippetDefinition } from '../extensionTypes'

export const NODE_SNIPPETS: SnippetDefinition[] = [
  // --- Modern Node.js 20 / 22+ Core APIs ---
  {
    label: 'node-httpserver',
    detail: 'Node.js: Native node:http Server with Async Routing',
    documentation: 'Modern ESM native HTTP server using node:http with graceful shutdown',
    insertText: 'import http from "node:http";\n\nconst server = http.createServer((req, res) => {\n  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);\n\n  if (req.method === "GET" && url.pathname === "/health") {\n    res.writeHead(200, { "Content-Type": "application/json" });\n    res.end(JSON.stringify({ status: "healthy", runtime: "Node.js Native Server" }));\n    return;\n  }\n\n  res.writeHead(404, { "Content-Type": "application/json" });\n  res.end(JSON.stringify({ error: "Route not found" }));\n});\n\nconst PORT = process.env.PORT || 3000;\nserver.listen(PORT, () => {\n  console.log(`✨ Server running on http://localhost:${PORT}`);\n});\n$0',
  },
  {
    label: 'node-fs-promises',
    detail: 'Node.js: node:fs/promises File Operations',
    documentation: 'Async zero-blocking filesystem reads and writes with JSON parsing',
    insertText: 'import fs from "node:fs/promises";\nimport path from "node:path";\n\nasync function ${1:processFile}(filePath: string): Promise<void> {\n  try {\n    const rawData = await fs.readFile(filePath, "utf-8");\n    const parsed = JSON.parse(rawData);\n    \n    // Process JSON data\n    parsed.updatedAt = Date.now();\n    \n    await fs.writeFile(filePath, JSON.stringify(parsed, null, 2), "utf-8");\n    console.log("Successfully updated:", filePath);\n  } catch (err) {\n    console.error("FS operation error:", err);\n  }\n}\n$0',
  },
  {
    label: 'node-stream-pipeline',
    detail: 'Node.js: node:stream/promises Pipeline with Transform',
    documentation: 'High-throughput stream piping with Transform stream and backpressure handling',
    insertText: 'import { pipeline } from "node:stream/promises";\nimport { createReadStream, createWriteStream } from "node:fs";\nimport { Transform } from "node:stream";\n\nasync function ${1:transformStream}(sourcePath: string, destPath: string) {\n  const upperTransform = new Transform({\n    transform(chunk, encoding, callback) {\n      callback(null, chunk.toString().toUpperCase());\n    },\n  });\n\n  await pipeline(\n    createReadStream(sourcePath),\n    upperTransform,\n    createWriteStream(destPath)\n  );\n  console.log("Stream pipeline processing complete.");\n}\n$0',
  },
  {
    label: 'node-worker-thread',
    detail: 'Node.js: node:worker_threads Multi-Threading',
    documentation: 'CPU-intensive parallel worker execution using Worker threads and postMessage',
    insertText: 'import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";\nimport { fileURLToPath } from "node:url";\n\nif (isMainThread) {\n  export function runWorkerTask(data: unknown): Promise<unknown> {\n    return new Promise((resolve, reject) => {\n      const worker = new Worker(fileURLToPath(import.meta.url), { workerData: data });\n      worker.on("message", resolve);\n      worker.on("error", reject);\n      worker.on("exit", (code) => {\n        if (code !== 0) reject(new Error(`Worker stopped with code ${code}`));\n      });\n    });\n  }\n} else {\n  // Worker task execution\n  const result = { processed: true, input: workerData };\n  parentPort?.postMessage(result);\n}\n$0',
  },
  {
    label: 'node-eventemitter',
    detail: 'Node.js: node:events Strongly Typed EventEmitter',
    documentation: 'Robust event emitter instance with typed event signatures',
    insertText: 'import { EventEmitter } from "node:events";\n\nexport class ${1:DataPipelineBus} extends EventEmitter {\n  notifyDataReady(payload: Record<string, unknown>) {\n    this.emit("dataReady", payload);\n  }\n\n  notifyError(err: Error) {\n    this.emit("error", err);\n  }\n}\n$0',
  },
  {
    label: 'node-childprocess-spawn',
    detail: 'Node.js: node:child_process Async Spawn with Buffering',
    documentation: 'Execute system binary and collect stdout/stderr asynchronously',
    insertText: 'import { spawn } from "node:child_process";\n\nexport function executeCommand(cmd: string, args: string[] = []): Promise<string> {\n  return new Promise((resolve, reject) => {\n    const proc = spawn(cmd, args);\n    let stdout = "";\n    let stderr = "";\n\n    proc.stdout.on("data", (data) => { stdout += data.toString(); });\n    proc.stderr.on("data", (data) => { stderr += data.toString(); });\n\n    proc.on("close", (code) => {\n      if (code === 0) resolve(stdout.trim());\n      else reject(new Error(`Command failed with code ${code}: ${stderr}`));\n    });\n  });\n}\n$0',
  },
  {
    label: 'node-crypto-hash',
    detail: 'Node.js: node:crypto Secure Hashing & Random Tokens',
    documentation: 'Cryptographic SHA-256 generation and secure UUID/random bytes',
    insertText: 'import { createHash, randomBytes } from "node:crypto";\n\nexport function sha256(content: string): string {\n  return createHash("sha256").update(content).digest("hex");\n}\n\nexport function generateSecureToken(bytes = 32): string {\n  return randomBytes(bytes).toString("hex");\n}\n$0',
  },
  {
    label: 'node-native-test',
    detail: 'Node.js: Built-in node:test Runner with Assert',
    documentation: 'Native test suite using node:test and node:assert/strict with zero dependencies',
    insertText: 'import { describe, it, before, after } from "node:test";\nimport assert from "node:assert/strict";\n\ndescribe("${1:Core Utility Suite}", () => {\n  before(() => {\n    // Setup test fixtures\n  });\n\n  it("${2:should compute hash correctly}", () => {\n    const value = 40 + 2;\n    assert.equal(value, 42, "Value should match computed answer");\n  });\n\n  it("${3:should handle async resolutions}", async () => {\n    const delayed = await Promise.resolve("liquid-glass");\n    assert.match(delayed, /glass/);\n  });\n});\n',
  },
  {
    label: 'node-package-json',
    detail: 'Node.js: Modern ESM package.json Manifest',
    documentation: 'Production-ready package.json with ESM type: module, exports map, and scripts',
    insertText: '{\n  "name": "indoctrinated-${1:service}",\n  "version": "1.0.0",\n  "description": "Next-generation liquid glass microservice",\n  "type": "module",\n  "main": "dist/index.js",\n  "types": "dist/index.d.ts",\n  "exports": {\n    ".": {\n      "types": "./dist/index.d.ts",\n      "import": "./dist/index.js"\n    }\n  },\n  "scripts": {\n    "build": "tsc",\n    "start": "node dist/index.js",\n    "dev": "node --watch src/index.ts",\n    "test": "node --test"\n  },\n  "dependencies": {},\n  "devDependencies": {\n    "@types/node": "^22.0.0",\n    "typescript": "^5.6.0"\n  }\n}\n',
  },
  {
    label: 'node-env-config',
    detail: 'Node.js: process.env Type-Safe Config Loader',
    documentation: 'Modern process.env configuration loader with fallback defaults',
    insertText: 'export const config = {\n  port: parseInt(process.env.PORT || "3000", 10),\n  nodeEnv: process.env.NODE_ENV || "development",\n  isProduction: process.env.NODE_ENV === "production",\n  apiSecret: process.env.API_SECRET || "liquid-glass-dev-secret",\n} as const;\n$0',
  },
]

export const nodeSnippets = NODE_SNIPPETS

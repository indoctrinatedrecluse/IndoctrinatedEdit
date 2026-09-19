# Changelog

All notable changes to **IndoctrinatedEdit** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.7.0] - 2026-09-19

### 🚀 Minor Release — Developer-Desired IDE GUI Extensions Suite, Multi-Pane Grid & Advanced IDE Subsystems

IndoctrinatedEdit 4.7.0 transforms the application into an ultra-modern, full-fledged IDE with 7 new Developer-Desired GUI Extensions, flexible multi-pane workspace grid, universal code formatting, LSP refactoring, test runner, and advanced source control:

#### 🧰 Developer-Desired IDE GUI Extensions Suite
- **Regex Studio & ReDoS Analyzer**:
  - Live interactive regex testing with group match breakdowns and capture tokenization.
  - Substitution live diff engine showing side-by-side before/after transforms.
  - Safe catastrophic backtracking benchmark radar (ReDoS detection) with execution timer.
  - Built-in library of common developer regex presets (SemVer, Email, IPv4/v6, UUID, ISO dates) and AI pattern builder.
- **Architecture & Workspace Dependency Flow Map**:
  - Interactive visual dependency graph showing module imports, caller/callee relationships, and cluster topologies.
  - Cycle Radar: Automatically detects circular dependency chains across TypeScript/JavaScript modules.
  - Orphan Module Detector: Discovers isolated files and unused components.
  - 1-click export to Mermaid diagram syntax, SVG visual, or JSON graph.
- **Multi-Environment Vault & Secret Leak Scanner**:
  - Side-by-side multi-environment matrix comparison (`.env.local`, `.env.development`, `.env.staging`, `.env.production`).
  - Active workspace Secret Leak Scanner detecting exposed API keys (AWS, OpenAI, Gemini, GitHub tokens, JWTs, DB connection URIs).
  - Secure AES-256-GCM encrypted vault backups with passphrase protection and 1-click `.env` export.
- **Live WebSocket & SSE Streaming Hub**:
  - Dual-protocol client supporting both bi-directional WebSockets and Server-Sent Events (SSE) streaming.
  - Real-time rolling ping/pong latency telemetry chart with minimum, average, and jitter metrics.
  - Full message forge with JSON linting, message history filtering, and auto-reconnect logic.
- **Liquid Glass Shader Lab & WCAG 2.2 Auditor**:
  - Live CSS backdrop-filter and glassmorphic shader designer with blur, saturation, specular sheen, and surface opacity sliders.
  - WCAG 2.2 & APCA contrast ratio auditor verifying accessibility compliance across AA and AAA levels.
  - Color vision deficiency simulations (Protanopia, Deuteranopia, Tritanopia, Achromatopsia).
  - Harmony generator for complementary, triadic, and analogous color palettes with CSS code export.
- **JSON, JQ, Schema & Data Structure Studio**:
  - Real-time JQ and JMESPath expression sandbox with syntax tree filtering.
  - Interactive collapsible tree explorer with node search, type badges, and key copying.
  - Live JSON Schema validation with precise error path indicators.
  - Instant multi-format conversion between JSON, YAML, TOML, CSV, and XML.
- **Live Markdown, LaTeX & Mermaid Preview**:
  - Side-by-side synchronized rendering with KaTeX LaTeX math support (`$...$`, `$$...$$`).
  - Interactive document outline with clickable heading anchors.
  - Glassmorphic styled GitHub alerts (Note, Tip, Important, Warning, Caution).
  - Dynamic Mermaid diagram generation and rendering.

#### 🪟 Multi-Pane Editor Grid & Workspace Layout
- **Dynamic Split Grid Layouts**: Split active editor tabs horizontally, vertically, or in 2x2 grid configurations.
- **Independent Pane State**: Each split pane maintains independent scroll positions, active document focus, cursor states, and tab bars.
- **Seamless Pane Navigation**: Keyboard shortcuts and menu commands for splitting, closing, and cycling focus between panes.

#### ⚡ Universal Code Formatter Engine
- **Multi-Language Prettier-Compatible Engine**: Instant code formatting for JavaScript, TypeScript, TSX/JSX, JSON, CSS, HTML, and Markdown.
- **Format on Save**: Optional automatic formatting triggered on file save with configurable tab width and quote styles.
- **Format Selection & Document**: Context menu and Command Palette triggers (`Shift+Alt+F`).

#### 🔍 Workspace Global Search & Replace
- **High-Performance Global Search**: Fast regex and case-sensitive text search across entire workspace directory trees.
- **Include / Exclude Filters**: Glob pattern matching to target or ignore specific directories (e.g. `node_modules`, `dist`, `*.test.ts`).
- **Interactive Match Replace**: Batch workspace replace with live diff confirmation and file-grouped preview.

#### 🧪 Integrated Test Explorer & Runner
- **Visual Test Tree Discovery**: Automatic scanning and discovery of unit test suites and test cases.
- **1-Click Test Execution**: Run individual tests, test suites, or all tests with live pass/fail indicators and execution time metrics.
- **Failure Stack Trace Inspector**: Instant inspection of assertion failures with direct jump to source code.

#### 🛠️ Language Server Protocol (LSP) Refactoring Subsystem
- **Find All References Modal**: Search and display all symbol references across the workspace with line previews.
- **Atomic Rename Refactoring**: Rename symbols across multiple files simultaneously with conflict prevention.
- **Inline Git Blame Lens**: Live inline author, timestamp, and commit hash annotations on active editor lines.
- **Breadcrumbs Navigation Bar**: Interactive file path and symbol hierarchy breadcrumbs above the editor.

#### 🔀 Advanced SCM & 3-Way Merge Studio
- **3-Way Visual Conflict Resolver**: Side-by-side Current vs Incoming vs Result merge studio with 1-click resolution buttons.
- **Commit Graph Visualizer**: Interactive commit history DAG tree with branch heads, tags, and commit inspection.

#### 🚀 Task Runner & Debug Launch Configurations
- **`.indoctrinated/launch.json` & `tasks.json` Support**: Define build, test, and debug configurations.
- **Integrated Task Console**: Real-time stdout/stderr streaming with status tracking and exit code monitoring.

---

## [4.6.0] - 2026-09-18

### 🚀 Minor Release — Model Context Protocol (MCP) Host Studio, AI Agent Tools Bridge, & Settings Reactivity

IndoctrinatedEdit 4.6.0 establishes the editor as a comprehensive **Model Context Protocol (MCP) Host** and integrates seamless server management, live tool inspection, and dual-mode AI agent capabilities:

#### 🌐 Full MCP Host Runtime & Multi-Transport Engine
- **JSON-RPC 2.0 Client/Host Architecture**: Standard protocol communication across `stdio`, `sse` (Server-Sent Events), and `builtin` in-memory services.
- **Protocol Discovery**: Implements full discovery for `tools/list`, `resources/list`, and `prompts/list`.
- **Tool Execution Dispatcher**: Dynamic tool execution (`tools/call`) with live latency measurement, argument validation, and output security sanitization.
- **`mcp_config.json` Compatibility**: Live editing, export to clipboard/file, and 1-click import of standard multi-server configurations.
- **Pre-Packaged MCP Presets**: Ready-to-use production servers for *Filesystem* (`@modelcontextprotocol/server-filesystem`), *Git* (`@modelcontextprotocol/server-git`), *Memory Graph* (`@modelcontextprotocol/server-memory`), *Web Content Fetcher* (`@modelcontextprotocol/server-fetch`), *Google Gemini & SDK Docs* (`gemini-api-docs-mcp`), and *SQLite Database* (`@modelcontextprotocol/server-sqlite`).

#### 🧩 Dedicated MCP Studio Modal & Extension
- **`indoctrinated.ext.mcp-studio` Built-in Extension**: Registered in the extension registry with Monaco autocomplete snippets for `mcp_config.json`, TypeScript servers (`@modelcontextprotocol/sdk`), and Python FastMCP (`fastmcp`).
- **MCP Studio Modal UI**:
  - **Servers Tab**: Detailed server manager with custom executable commands, args, environment variables, SSE URLs, timeouts, and live ping health checks.
  - **Live Tool Tester Tab**: Interactive parameter schema browser and JSON argument runner with instant output execution diffs.
  - **Resources & Prompts Tab**: Context document URIs and prompt templates inspector.
  - **Catalog Tab**: 1-click server installer.
- **Command Palette & AI Header Shortcuts**: Access via `Ctrl+Shift+M` or the new MCP Host launcher button in the AI Assistant header.

#### 🤖 Dual-Mode AI Agent Operation (With or Without MCP)
- **Seamless Fallback**: When MCP servers are disabled or unavailable, AI agents operate 100% autonomously using native built-in workspace tools without dependencies.
- **Dynamic Tool Injection**: When MCP servers are enabled, active tools are automatically registered in `AiToolsRegistry` and injected into the agent system prompt.
- **Security & Auto-Approve**: MCP tool calls are governed by the granular *Auto-Approve Web & MCP* permission setting.

#### ⚙️ Settings Panel Enhancements & Reactivity Fix
- **Instant Reactivity**: Fixed state binding in `Sidebar.tsx` so AI Auto-Approve checkboxes toggle visually immediately on click with bidirectional sync to the AI Chat dock.
- **Application & Software Updates in Settings**: Added dedicated update management in the Settings view with version display, release channel badge, and direct "Check for Updates..." trigger.
- **MCP Summary in Settings**: Active servers count and quick launcher button directly inside the Settings panel.

---

## [4.5.0] - 2026-09-18

### 🚀 Minor Release — Auto-Updater Subsystem, Cross-Platform Release Packaging & Integrity Verification

IndoctrinatedEdit 4.5.0 introduces an integrated, secure **Auto-Updater Subsystem** across Windows, Linux, and macOS:

#### 🔄 Autonomous Release Discovery & Check Frequency
- **Graceful Startup Check**: Automatically evaluates available releases 5 seconds after launch.
- **Periodic Background Scheduler**: Configurable check intervals (*On Startup*, *Daily*, *Weekly*, or *Manual Only*).
- **Channels**: Switch dynamically between `Stable` (default), `Beta`, and `Nightly` release streams.
- **Manual Trigger**: Quick check via **Help &rarr; Check for Updates...** and Command Palette.

#### 🎯 Platform & Architecture Matcher
- **Windows (`win32` / `x64`)**: Automatically matches NSIS installers (`.exe`), portable binaries, and standalone `.zip` archives.
- **Linux (`linux` / `x64`)**: Matches AppImage packages (`.AppImage`), Debian packages (`.deb`), and `.tar.gz` archives.
- **macOS (`darwin` / `x64`, `arm64`)**: Matches Apple Silicon and Intel `.dmg` installer packages.

#### ⚡ Real-Time Streaming & Checksum Security
- **Chunked Stream Downloader**: Real-time progress tracking with download rate (`MB/s`), total size indicators, and estimated time remaining (ETA).
- **SHA-256 Checksum Validation**: Automatically verifies package integrity against release `SHA256SUMS.txt` before execution.
- **Clean Installer Execution**: Spawns detached installer processes (`.exe` on Windows, `chmod +x` on Linux `.AppImage`, `.dmg` on macOS) and closes the running instance cleanly.

#### 🪟 Liquid Glass Update Modal & Status Indicators
- **`UpdateModal`**: Dark Velvet themed dialog with version diff banner, release notes scrollbox, live download progress bar, and 1-click **"Download & Install"** / **"Restart App"** actions.
- **Status Bar Indicator**: Real-time cyan update chip (`Update v4.5.0`) in the status bar footer.
- **GitHub Release Automation (`release.yml`)**: Automated dual-runner CI matrix that builds and publishes Windows and Linux artifacts with aggregated `SHA256SUMS.txt`.

---

## [4.4.0] - 2026-09-18

### 🚀 Minor Release — 8 Developer GUI Extensions (Auxiliary Right Dock), Scrollable Activity Bar, and Interactive Dev Tools

IndoctrinatedEdit 4.4.0 introduces 8 developer-centric GUI extensions integrated into the Liquid Glass Auxiliary Right Dock, accessible via the Left Activity Bar, Command Palette, View Menu, and dedicated keyboard shortcuts (`Ctrl+Alt+1` through `Ctrl+Alt+8`):

#### 🛡️ Port & Process Sentinel (`Ctrl+Alt+1`)
- **Active Port Scanner & Conflict Detector**: Scans common development ports (3000, 5173, 8080, 8000, 4000, 5432, 6379, 27017, etc.) with real-time status badges and process metadata (`PID`, `Process Name`, `Protocol`).
- **HTTP / TCP Health Probe**: Real-time HTTP ping and status latency checker (`200 OK`, `404`, `500`).
- **Process Killer & Free Port Action**: Terminate hung dev servers directly from the UI without opening Task Manager or terminal kill commands.
- **Custom Port Watcher**: Add custom port ranges to watch for unexpected bindings and background services.

#### 🗄️ Redis & KV Cache Studio (`Ctrl+Alt+2`)
- **Key-Value Tree & Namespace Browser**: Explore string, hash, list, set, and zset keys organized by folder namespaces (`user:`, `session:`, `cache:`).
- **Interactive Multi-Type Value Editor**: Modify cached values, hash fields, and sets in real-time with JSON syntax validation.
- **TTL Manager & Key Expiry Inspector**: View remaining TTL seconds and update or remove expirations instantly.
- **Interactive REPL CLI**: Execute raw Redis commands (`GET`, `SET`, `HGETALL`, `FLUSHDB`, `INFO`) with formatted output.
- **Pub/Sub Stream Monitor**: Subscribe to live channels and inspect streaming payloads.

#### 🔐 Env & Secret Vault Studio (`Ctrl+Alt+3`)
- **Multi-Environment Profile Switcher**: Manage `.env.local`, `.env.development`, `.env.staging`, and `.env.production` profiles.
- **Secret Masking & Reveal Toggle**: Mask sensitive tokens, API keys, and database passwords with 1-click reveal.
- **`.env.example` Diff & Sync Auditor**: Automatically scan for missing environment variables between active `.env` and `.env.example`.
- **Template Generator**: 1-click generation of boilerplate `.env` presets for Node.js, Next.js, Django, FastAPI, Go, and Rust.
- **Code Exporter**: Export environment configs as TypeScript, Python, Shell, or JSON snippets.

#### 🧪 MockLab API Mock Server (`Ctrl+Alt+4`)
- **Zero-Config Local Mock HTTP Server**: Spins up a local mock router on port `4040` for rapid frontend prototyping without backend dependencies.
- **Status & Latency Simulation**: Configure custom HTTP response codes (`200`, `201`, `400`, `401`, `404`, `500`) and simulated network latency delays (0ms - 2000ms).
- **Dynamic Faker Token Interpolation**: Inject randomized placeholders (`{{id}}`, `{{name}}`, `{{email}}`, `{{avatar}}`, `{{timestamp}}`) into mock JSON responses.
- **Live Traffic Stream**: Real-time log of incoming requests with method, path, response status, and duration.

#### ⚡ GraphQL & gRPC Studio (`Ctrl+Alt+5`)
- **Introspection Schema Explorer**: Query remote GraphQL endpoints and explore schema documentation, types, queries, and mutations.
- **Query & Mutation Runner**: Integrated query editor with variable payload support and formatted JSON response viewer.
- **Latency & Header Inspector**: Real-time response timing metrics, payload size calculation, and custom request header configuration.
- **Client Code Exporter**: Generate type-safe queries for TypeScript, Apollo Client, `urql`, `fetch`, and cURL.

#### 📊 Architecture & Diagram Studio (`Ctrl+Alt+6`)
- **Interactive Mermaid Diagram Visualizer**: Live rendering of flowcharts, sequence diagrams, state machines, class diagrams, ER diagrams, and git graphs.
- **Interactive Pan & Zoom Canvas**: Smooth zoom and pan navigation for complex architecture diagrams with 1-click SVG download.
- **Code-to-Diagram Auto-Analyzer**: Automatically generate visual class diagrams and module dependency graphs from active TypeScript/JavaScript source code.
- **Template Gallery**: Pre-built templates for Microservices Architecture, Auth OAuth2 Flow, Database Schema, and Gitflow.

#### 📦 Bundle & Dependency Analyzer (`Ctrl+Alt+7`)
- **Interactive Bundle TreeMap**: Visual breakdown of direct and transitive dependencies with size percentages and file counts.
- **Import Cost Estimator**: Instant Gzip and minified size cost estimation for packages and modules before committing.
- **Duplicate & Bloat Detector**: Flags duplicate transitive dependency versions and oversized libraries.
- **Markdown Audit Exporter**: Generate exportable bundle health reports for PR reviews and CI/CD pipelines.

#### 🎨 SVG & Asset Studio (`Ctrl+Alt+8`)
- **Dark & Light Checkerboard Preview**: Live rendering of SVG code with zoom, dark/light grid backgrounds, and dimension badges.
- **Palette Recolor Engine**: Extract and swap fill/stroke color palettes interactively.
- **SVGO Optimizer & Minifier**: Strip unnecessary metadata, comments, and empty tags to reduce file size.
- **React TSX Component Generator**: Convert SVGs into clean, typed React/Lucide-compatible JSX components.
- **CSS Snippet & Data URI Exporter**: Export as inline background CSS, base64 Data URIs, or Sprite Sheet symbols.

#### 📜 Scrollable Activity Bar & Icon Dock
- **Hidden Scrollbar Vertical Navigation**: Smooth mouse wheel scrolling (`overflow-y: auto`) across all primary and dock extension icons without an intrusive scrollbar (`scrollbar-width: none;`, `::-webkit-scrollbar { display: none; }`).
- **Pinned Bottom Group**: Settings and lower actions stay persistently anchored at the bottom of the viewport.

---

## [4.3.0] - 2026-09-18

### 🚀 Minor Release — Autonomous AI Local Tools, Context Mentions (@), Slash Commands (/), Multi-Layer Security Guardrails, and Interactive Diff Studio

IndoctrinatedEdit 4.3.0 introduces an agentic AI pairing engine tightly integrated with the local workspace and Monaco editor: a **Local AI Tool Registry** with 10 tools; **Multi-Layer Security Guardrails** enforcing path traversal sandboxing and destructive command protection; **Context Mentions (`@`)** and **Slash Commands (`/`)** with live autocomplete popups; **Interactive Tool Call & Unified Diff Cards**; and **Smooth Mouse Wheel Horizontal Scrolling** on bottom toolbars.

#### 🛠️ Local AI Tools Subsystem & Editor Grounding
- **`read_file`**: Reads workspace files with 1-indexed line-range slices.
- **`list_workspace_files`**: Explores workspace folders and subfolder directory trees.
- **`search_code`**: Fast text and regex pattern matching across active files.
- **`get_editor_diagnostics`**: Real-time queries for Monaco, LSP, and compiler error markers, warnings, and problems.
- **`get_git_status` & `get_git_diff`**: Deep inspection of branch states, ahead/behind counters, staged diffs, and working tree changes.
- **`propose_file_edit`**: Emits unified code patch proposals with side-by-side diff viewers and 1-click **Accept Diff** / **Discard** actions.
- **`execute_terminal_command`**: Runs CLI commands, unit tests, and build scripts with execution timeouts and output capture.
- **`trigger_project_run`**: Integrates with the VS Code Run Subsystem to trigger configured run targets.
- **`open_editor_file`**: Programmatic navigation to specific files, lines, and columns in Monaco Editor.

#### 🛡️ Multi-Layer Security Guardrails Engine (`AiGuardrailService`)
- **Strict Path Sandboxing**: Normalizes and confines file access strictly to workspace boundaries, blocking path traversal (`../..`) and access to sensitive OS system roots (`C:\Windows\System32`, `/etc/shadow`, `/proc`, `/root`).
- **Destructive Command Blocklist**: Proactively flags and blocks dangerous commands (`rm -rf /`, `del /s /q C:\*`, disk formatting, fork bombs, OS process termination, and pipe-to-shell payloads).
- **Autonomous Auto-Approve Integration**: Read operations default to Auto-Approve; Write, Run, and Git actions strictly require manual authorization unless the user enables autonomous permissions.
- **Output Capping & Loop Protection**: Protects token context with automatic output truncation and bounds autonomous multi-turn loops via `maxAutoIterations`.

#### 🎯 Context Mentions (`@`) & Slash Commands (`/`)
- **`@` Mention Autocomplete**: Instant popup to attach `@selection`, `@file`, `@problems`, `@terminal`, `@git`, and `@workspace`.
- **`/` Slash Commands**: Rapid triggers for `/fix Problems`, `/test Suite`, `/commit Message`, `/refactor`, `/explain`, `/run`, and `/docs`.

#### 🎛️ Interactive Tool Cards & Smooth Scrolling
- **Rich Tool Cards**: Visual status badges (`Pending Approval`, `Executing`, `Done`, `Guardrail Blocked`, `Rejected`) with parameter formatting and manual approve/reject actions.
- **Unified Diff Viewer**: Highlights green additions and red deletions with 1-click **Accept Diff**.
- **Mouse Wheel Horizontal Scrolling**: Translates mouse wheel vertical scrolls to horizontal navigation on the bottom quick actions bar and permissions drawer.

---

## [4.2.0] - 2026-09-18

### 🚀 Minor Release — VS Code Run & Build Engine, Safe Project Switching, Supercharged Debugger, Git Workflows CI/CD, Antigravity & ChatGPT Codex Subscriptions, and AI Auto-Approve Permissions

IndoctrinatedEdit 4.2.0 delivers major developer workflow upgrades: a full VS Code-inspired **Run & Build Subsystem** with customizable interpreters, arguments, and project-level scopes; a **Safe Project & Folder Switcher** with dirty buffer detection and unsaved changes confirmation; a **Supercharged Debug Extension** with exception breakpoints, function breakpoints, multi-thread/goroutines switcher, in-flight variable editing, and raw hex/memory inspector; a **Liquid Glass Git Studio with GitHub Actions Workflows Tab**; and an **AI Assistant Suite** supporting Antigravity (Personal) and ChatGPT Codex subscriptions alongside granular **Autonomous Agent Auto-Approve Permissions**.

#### ▶️ VS Code-Inspired Run & Build Subsystem (`Ctrl+F5`, `F5`, `Ctrl+Shift+F5`)
- **Universal Run Controls & Toolbar**: Direct 1-click execution (`▶`) from the editor header and command palette.
- **Run Configuration Studio (`Ctrl+Alt+R`)**: Configure custom compilers/interpreters (`python`, `node`, `ts-node`, `rustc`, `go`, `gcc`, `javac`, `bash`, `pwsh`, `ruby`), additional CLI arguments, environment variables, working directory, pre-launch build commands, and file vs project scoping.
- **Run with Custom Arguments Modal (`Ctrl+Shift+F5`)**: Execute the active buffer with ad-hoc interactive CLI arguments, environment variables, and pre-run build flags.
- **Auto-Detecting Toolchain Engine**: Automatically identifies language targets and suggests optimal runtime arguments.

#### 📂 Safe Folder & Project Switching (Unsaved Changes Guard)
- **Dirty Buffer Protection**: When opening a folder or project, IndoctrinatedEdit automatically clears unmodified files and prompts the user if any buffers contain unsaved modifications.
- **Unsaved Changes Dialog**: Offers 1-click `Save All & Open`, `Don't Save (Discard)`, or `Cancel` with granular file summaries and modified byte counters.

#### 🐞 Supercharged Debug Extension Suite
- **Function Breakpoints**: Set named function breakpoints with hit counts and expression conditions.
- **Exception Breakpoints**: Toggle automatic pausing on All Caught or Uncaught Exceptions.
- **Multi-Thread & Goroutines Inspector**: Real-time thread list with thread switching, call stacks, and execution states.
- **Live In-Flight Variable Editing**: Directly edit local and closure variable values while execution is paused.
- **Raw Hex / Memory Inspector Drawer (`[HEX]`)**: Inspect memory addresses, hex dumps, and ASCII bytes for active variables and pointer buffers.
- **Loaded Modules & Assemblies Inspector**: Track loaded binaries, shared objects, DLLs, and debug symbol statuses (`Symbols Loaded` / `No Symbols`).

#### 🌿 Liquid Glass Git Workflows & CI/CD Studio
- **GitHub Actions Workflows Tab**: Inspect workflows (`release.yml`, `build.yml`, `test.yml`, `security-lint.yml`), historical runs, durations, commit authors, and matrix job statuses.
- **Manual Workflow Dispatch Modal**: Trigger any workflow on-demand with custom branch/tag targets (`v4.2.0`) and input parameters.
- **ANSI Colorized Execution Logs**: Stream and view colorized terminal logs for workflow steps and matrix jobs with auto-refresh.

#### 🤖 AI Assistant Subscriptions & Autonomous Auto-Approve System
- **Antigravity (Personal Subscription) Integration**: Dedicated models (`antigravity-personal-agent`, `antigravity-gemini-2-5-pro`, `antigravity-claude-3-7-sonnet`) with automatic subscription header routing (`X-Antigravity-Subscription-Tier: personal`).
- **ChatGPT Codex & OpenAI Subscriptions**: Native support for `gpt-4o-codex`, `chatgpt-4o-latest`, `o3-mini`, `gpt-4o`, and `gpt-4o-mini` with bearer/session token authentication.
- **Autonomous Agent Auto-Approve Permissions**:
  - Granular toggles for **Auto-Approve Read** (files & symbols), **Auto-Approve Write & Patches**, **Auto-Approve Run (Terminal)**, **Auto-Approve Web & MCP**, and **Auto-Approve Git Actions**.
  - **One-Click Security Presets**: `Strict (Ask All)`, `Balanced (Safe Default)`, and `Full Autonomous`.
  - **Safety Loop Guardrail**: Configurable maximum autonomous step threshold (1 to 100 steps).
  - **Live Header Status Pill & Dynamic Action Buttons**: Visual badges for `Auto Run ▶`, `Auto Insert`, and `Auto Replace`.

---

## [4.1.0] - 2026-09-17

### 🚀 Minor Release — Visual Diff & 3-Way Merge Studio, Hex Inspector, Snippet Vault & Liquid Glass Studio

IndoctrinatedEdit 4.1.0 delivers 4 brand-new developer workbenches (Visual Diff & 3-Way Merge Studio, Hex & Binary Inspector, Snippet Vault & Scratchpad, and Color Palette & Liquid Glass Studio), enhanced existing tool suites (SVG vector live visualizer & minifier, TOTP 2FA authenticator, X.509 certificate inspector, Kubernetes manifest generator, Dockerfile security linter), and ultra-smooth horizontal mouse-wheel scrolling across all auxiliary toolbars.

#### 🔀 Visual Diff & 3-Way Merge Studio (`Ctrl+Alt+M`)
- **Side-by-Side & Unified Diff Viewer**: Instant line-by-line and character-level diff computation between active editor buffer and target/clipboard text.
- **3-Way Git Merge Conflict Resolver**: Parses standard conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) and enables one-click conflict resolution (Accept Current / HEAD, Accept Incoming, or Accept Both).
- **Unified Patch Exporter**: Generates and copies standard unified diff `.patch` files.

#### 💾 Hex & Binary Inspector (`Ctrl+Alt+H`)
- **16-Byte Hex Matrix**: Visual hex dump viewer with 8-digit byte offset columns, hex values, and printable ASCII representation.
- **Interactive Byte Inspector**: Click any byte to decode data types in real-time (`Int8`, `UInt8`, `Int16 LE/BE`, `UInt16 LE/BE`, `Int32 LE/BE`, `UInt32 LE/BE`, `Float32`, `Float64`, binary bits, and UTF-8 characters).
- **Hex & Text Byte Search**: Fast search for ASCII substrings and hexadecimal byte patterns.

#### 🔖 Snippet Vault & Scratchpad (`Ctrl+Alt+S`)
- **Production Snippet Library**: Curated, categorized templates across TypeScript, Python, Rust, Go, SQL, Shell, Docker, and Liquid Glass.
- **Custom Snippet Creator**: Create, tag, and persist custom snippets with one-click insertion into the active editor buffer.
- **Auto-Saved Scratchpad**: Persistent multi-line scratch buffer for temporary notes, payloads, and drafts.

#### 🎨 Color Palette & Liquid Glass Studio (`Ctrl+Alt+O`)
- **Universal Color Converter**: Live conversions between HEX, RGB/RGBA, HSL/HSLA, OKLCH (Modern CSS), and CMYK (Print).
- **Liquid Glass Theme Scaffolding**: Generates ready-to-use Antigravity Liquid Glass design tokens (`glassBackground`, `specularBorder`, `accentGlow`, `textPrimary`, `textMuted`) with live interactive glass card preview.
- **Color Harmonies**: Instant complementary, analogous, and triadic color schemes.

#### ⚡ Enhanced Workbenches & UI Polish
- **SVG Vector Visualizer & Minifier**: Live vector diagram rendering with whitespace & comment minification inside Live Preview Studio.
- **TOTP 2FA Authenticator (RFC 6238)**: Generates and validates 6-digit real-time two-factor authentication tokens in Crypto Lab.
- **X.509 Certificate Inspector**: Parses SSL/TLS `.crt`, `.pem`, and `.cer` certificates with Subject Alternative Names (SAN) and expiry tracking.
- **Kubernetes Manifest Generator & Dockerfile Linter**: Interactive K8s Deployment/Service manifest scaffolding and security rule auditing in Docker Studio.
- **Smooth Mouse-Wheel Horizontal Scrolling**: Fluid wheel and swipe scrolling across all dock headers, toolbars, subbars, and tag chips.
- **Optimized Release Pipeline**: Decoupled multi-platform packaging from publication to eliminate concurrent release upload collisions.

---

## [4.0.0] - 2026-09-17

### 🚀 Major Release — 7 Functional Developer Workbenches, 5 Dedicated Language Suites & Zero-Overlap Architecture

IndoctrinatedEdit 4.0.0 is a milestone major release introducing 7 interactive Liquid Glass developer workbenches (Cryptography Lab, Live Markdown & Mermaid Studio, Docker Studio, WebSocket Workbench, Visual Regex Lab, Package & Vulnerability Auditor, Task & Cron Runner) and 5 dedicated first-class language suites (Lua & Luau, Zig, Godot 4 / GDScript, Universal Shell / PowerShell, Julia Scientific) with a zero-overlap ecosystem architecture.

#### 🛡️ Cryptography & DevTools Studio (`Ctrl+Alt+C`)
- **Interactive JWT Inspector & Signer**: Decode headers, claims payload, algorithm validation, token expiration detection, and custom claim generator.
- **Universal Hash & HMAC Engine**: MD5, SHA-1, SHA-256, SHA-384, SHA-512, SHA-3, Keccak-256, and HMAC keyed hashing with instant clipboard copy.
- **Universal Codec Suite**: Instant encoding and decoding for Base64, Hexadecimal, URL Percent-encoding, HTML Entities, Binary bitstreams, ASCII code points, ROT13, and Morse Code.
- **Security & Entropy Generator**: Cryptographically secure UUID v4, monotonic UUID v7, ULID, Nanoid, customizable alphanumeric passwords, and hex API keys.
- **Epoch Time Machine**: Multi-format timestamp converter (Seconds, Milliseconds, Microseconds, Nanoseconds) with human-readable ISO-8601, UTC, relative time offsets, and customizable format builder.
- **Data Format Transformer**: Live bidirectional conversion between JSON, YAML, TOML, CSV, and XML with syntax validation and error reporting.
- **Asymmetric Keypair Generator**: Generate RSA 2048/4096-bit and ECDSA (P-256, P-384, Ed25519) public/private keypairs in PEM format.

#### 📝 Live Markdown, Static HTML & Mermaid Diagram Studio (`Ctrl+Alt+V`)
- **Live Markdown & HTML Renderer**: Real-time rendering with GitHub Flavored Markdown, GitHub-style alerts (`[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`), syntax-highlighted code blocks, and markdown tables.
- **Interactive Mermaid.js Diagram Studio**: Live vector rendering of Flowcharts, Sequence Diagrams, Class Diagrams, State Diagrams, and ER Models.
- **Sandboxed HTML Multi-Device Viewport**: Sandboxed iframe preview with one-click responsive device presets: Full / Desktop (1024px) / Tablet (768px) / Mobile (375px).

#### 🐳 Docker & Container Studio (`Ctrl+Alt+K`)
- **Container Dashboard**: Real-time listing of active and stopped containers, live CPU & memory resource meters, and port mappings.
- **Container Lifecycle Controls**: Start, stop, restart, delete containers, and prune dangling images in one click.
- **Live ANSI Log Stream**: Real-time terminal log viewer with search filtering and auto-scroll.
- **Images, Volumes & Compose Generator**: Inspect container images and local volumes, with built-in Docker Compose template scaffolding.

#### 🕸️ WebSocket & Event Streams Workbench (`Ctrl+Alt+W`)
- **Bidirectional WebSocket Client**: Connect to `wss://` / `ws://` endpoints or built-in mock echo streams with subprotocol support.
- **Real-time Message Waterfall**: Visual timeline separating inbound and outbound packets with timestamp tracking and JSON inspector.
- **Interactive Packet Composer**: Send formatted JSON or raw text payloads with one-click sample presets.

#### 📊 Visual Regex & Pattern Lab (`Ctrl+Alt+X`)
- **Interactive Match Arena**: Real-time regex pattern testing with live match counts, capture group inspector, and index offsets.
- **Natural-Language Regex Explainer**: Token-by-token decomposition explaining lookaheads, quantifiers, character classes, and boundary assertions in plain English.
- **Preset Library & Code Generator**: Library of validated patterns (Email, URL, IPv4/IPv6, SemVer, UUID, Dates) and multi-language code generators for TypeScript, Python, Go, and Rust.

#### 📦 Package & Dependency Manager (`Ctrl+Alt+P`)
- **Universal Manifest Scanner**: Automatic detection and parsing of `package.json` (npm), `requirements.txt` (PyPI), `Cargo.toml` (Cargo), and `go.mod` (Go Modules).
- **Outdated Version & Vulnerability Auditor**: Real-time comparison of current vs latest versions, alongside CVE security advisory detection and SPDX license compliance auditor.

#### ⏱️ Task Runner & Cron Expression Studio (`Ctrl+Alt+T`)
- **Project Task Runner**: Auto-discovers build, test, lint, and serve scripts from workspace manifests with one-click execution and status tracking.
- **Visual Cron Expression Builder**: 5-field Cron parser (`* * * * *`) translating complex cron syntax into plain English schedules with a projection table of the next 10 trigger timestamps.

#### 🌙 Dedicated First-Class Language Suites & Zero-Overlap Architecture
- **Lua, Luau & Game Development Suite (`indoctrinated.ext.lua-luau`)**: Comprehensive first-class IDE support for Lua 5.1–5.4, LuaJIT, Roblox Luau (`--!strict`), LÖVE 2D (Love2D lifecycle, physics & canvas), Neovim configuration (`lazy.nvim`, `vim.api`), and OpenResty / Nginx Lua API gateways.
- **Zig & Native Systems Toolchain Suite (`indoctrinated.ext.zig`)**: Complete Zig 0.13+ language support featuring GeneralPurposeAllocator idioms, `comptime` generic structures, `build.zig` multi-target build scripts, `@cImport` seamless C-interop, and SIMD `@Vector` acceleration.
- **Godot 4 & GDScript Game Development Suite (`indoctrinated.ext.gdscript`)**: Dedicated Godot 4.x suite with CharacterBody2D/3D templates, typed signal and event bus architectures, custom Resource data classes (`@export`), and finite state machines.
- **Universal Shell, PowerShell & Automation Suite (`indoctrinated.ext.shell-powershell`)**: Production-grade scripting support for Bash, Zsh, POSIX sh (`set -euo pipefail`), PowerShell 7 (`[CmdletBinding()]` pipelines), and Windows Batch scripts (`.bat`/`.cmd`).
- **Julia High-Performance Scientific Computing Suite (`indoctrinated.ext.julia`)**: Multiple dispatch type specialization, Flux.jl neural network architectures, DifferentialEquations.jl ODE solvers, and DataFrames.jl ETL pipelines.
- **Zero-Overlap Refactoring**: Clean separation of responsibilities across multi-language packs — `systemsGamingSupport` focuses on Odin, Nim, Assembly, and WAT; `dataScienceSupport` focuses on R, Scala 3, and MATLAB/Octave; `devopsSupport` focuses on Terraform HCL, Dockerfile, and Kubernetes YAML; and `beamFunctionalSupport` unifies Elixir, Erlang, Haskell, Clojure, OCaml, and Janet with zero duplication.

---

## [3.0.0] - 2026-09-16

### 🚀 Major Release — Terminal Multiplexer, Problems & Linter Engine, Database Studio, REST API Client, Multi-Compiler Debugger & Multi-Cursor Find/Replace

IndoctrinatedEdit 3.0.0 is a milestone major release expanding the editor into a comprehensive, extensible IDE with native multi-shell terminals, real-time code diagnostics, integrated database querying, an in-editor REST/GraphQL client, multi-compiler breakpoint debugging, and full multi-cursor / regex find and replace capabilities.

#### 💻 Integrated Multi-Shell Terminal Subsystem
- **Native Multi-Shell Support**: Run and switch between **PowerShell**, **Bash**, **Git Bash**, **Cygwin**, and **Command Prompt** directly in the bottom dockable panel.
- **Dynamic PATH Auto-Discovery**: Automatically discovers installed shells across standard Windows/Unix locations and active environment paths.
- **Configurable Terminal Profiles**: Custom shells and startup arguments configurable via `~/.indoctrinated/terminal.json`, accessible via Command Palette (`> Preferences: Open Terminal Configuration (JSON)`).
- **Modern Terminal Experience**: ANSI 256-color parsing, multi-tab terminal management, split views, and Liquid Glass aesthetics.

#### ⚠️ Unified "Problems" Panel & High-Accuracy Linter Integration
- **Dedicated Diagnostics Panel**: Real-time listing of workspace syntax errors, warnings, and code hints in a collapsible bottom panel.
- **Multi-Language Static Analysis**: Accurate linters and syntax validators for TypeScript, JavaScript, Python (PEP 8), CSS, and JSON integrated with Monaco model markers.
- **Interactive Triage**: Filter by severity (Errors, Warnings, Info), live search query filtering, file grouping, double-click line navigation, and clipboard export.
- **Live Status Bar Counter**: Real-time error and warning badges with one-click direct jump into the Problems panel.

#### 🗄️ Database Schema Viewer & SQL Query Runner Extension
- **Visual Schema Explorer**: Interactive sidebar explorer displaying connected database tables, column definitions, data types, and PK/FK indicators.
- **Interactive SQL Runner**: In-editor SQL query execution supporting complex queries (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `JOIN`, `WHERE`, `GROUP BY`, aggregate functions).
- **Tabular Results Grid**: Sortable, searchable data grid with pagination, deep JSON inspector modal, query execution history, and CSV/JSON export.
- **Right Auxiliary Pane Integration**: Seamlessly switch between AI Assistant, Database Studio, and REST Client in the right auxiliary panel.

#### 🌐 Feature-Packed In-Editor REST & GraphQL API Client Extension
- **Comprehensive API Client**: Construct and execute HTTP/REST and GraphQL requests with full support for query parameters, headers, authentication (Bearer token, Basic auth, API Key), and formatted payloads.
- **Environment Variables**: Dynamic variable interpolation (`{{baseUrl}}`, `{{token}}`, `{{apiKey}}`) across request URLs, headers, and request bodies.
- **Rich Response Inspector**: Formatted JSON response viewer with syntax highlighting, HTTP status badges, round-trip latency, payload size counters, and copy triggers.
- **cURL Exporter & History**: One-click cURL export and persistent request execution history with replay functionality.

#### 🐞 Breakpoint Setting & Multi-Compiler Debug Analysis Protocol
- **Gutter Breakpoints & Glyph Margin**: Click gutter to toggle line breakpoints, conditional breakpoints, hit counts, and inline logpoints (`F9`).
- **Multi-Compiler Runtime Adapters**: Debugging protocols for **Node.js / TypeScript (V8)**, **Python (debugpy)**, **Rust / C++ (LLDB)**, and **Go (Delve)**.
- **Floating Execution Control Toolbar**: Floating Liquid Glass toolbar with Continue (`F5`), Pause (`F6`), Step Over (`F10`), Step Into (`F11`), Step Out (`Shift+F11`), Restart (`Ctrl+Shift+F5`), and Stop (`Shift+F5`).
- **Run & Debug Panel**: Call stack inspection, scoped variable viewer (Local, Global, Closure, Registers), Watch expressions evaluator, breakpoint manager, and interactive REPL debug console.

#### 🔍 Multi-Cursor / Multi-Line Editing & Advanced Find/Replace Suite
- **Advanced Find & Replace Suite**: Floating widget with real-time match counters, Match Case (`Alt+C`), Whole Word (`Alt+W`), Regular Expression (`Alt+R`), and Find in Selection (`Alt+L`).
- **Batch & Interactive Replacement**: Step-by-step match navigation (`Enter`/`F3`, `Shift+Enter`/`Shift+F3`), single replacement, and atomic batch Replace All (`Ctrl+Alt+Enter`).
- **Multi-Cursor & Multi-Line Editing**: Spawning cursors via `Alt+Click`, vertical column cursors (`Ctrl+Alt+Up` / `Ctrl+Alt+Down`), select next match (`Ctrl+D`), and select all occurrences (`Alt+Enter` / `Ctrl+Shift+L`).
- **Updated Shortcuts Reference**: All new shortcuts documented in Help -> Keyboard Shortcuts modal (`Ctrl+K Ctrl+S`).

---

## [2.0.0] - 2026-09-16

### 🚀 Major Release — Session Persistence, Multi-Mode Command Palette, Keyboard Shortcuts Modal, Conflict Arbiter & Expanded Ecosystems

IndoctrinatedEdit 2.0.0 is a milestone major release transforming the editor into a resilient, high-productivity development suite with session auto-restoration, VS Code-parity Command Palette modes, an interactive Keyboard Shortcuts reference, intelligent conflict resolution, 10 Liquid Glass themes, and comprehensive multi-language ecosystem coverage.

#### 💾 Workspace & File Session Persistence
- **Auto-Restore on Launch**: Automatically restores the last opened workspace project directory, all active editor tabs, scroll context, and file contents across app launches.
- **Fault-Tolerant File Restoration**: Missing, deleted, or corrupted files are silently dropped from open tabs without interrupting editor startup or blocking the UI.
- **Graceful Workspace Fallback**: If a previously opened workspace folder is moved, deleted, or inaccessible, the session manager notifies the user via the Notification Center and smoothly falls back to the default workspace and demo files.

#### ⚡ VS Code-Grade Multi-Mode Command Palette
- **Prefix-Driven Search Router**:
  - `>` (**Commands Mode**): Search and execute all application commands, editor operations, themes, git actions, and AI tools.
  - `@` (**Document Outline & Symbol Jump**): Scans the active document in real time to extract classes, interfaces, types, functions, methods, and markdown headings, enabling direct one-click navigation.
  - `#` (**Workspace Symbols & Features**): Search across project symbols and global capabilities.
  - `:` (**Go to Line / Column**): Jump directly to a target line (e.g. `:42` or `:128:10`).
  - `?` (**Help & Mode Picker**): Explains all prefix modes with click-to-switch and `Tab` completion.
- **Unified Search & Category Filter Chips**: In default search mode, filter instantly across `All`, `Files`, `Commands`, `Symbols`, `Themes`, and `Edit` categories.

#### ⌨️ Interactive Keyboard Shortcuts Reference Modal
- **Help Menu Integration**: Added `Help > Keyboard Shortcuts` (`Ctrl+K Ctrl+S` or `F1`).
- **Liquid Glass Modal**: Styled with frosted glassmorphism, ambient glow orbs, and specular accents.
- **Interactive Filtering & Execution**: Live search by action title, key combination (`ctrl+p`, `save`, `format`), or category (`General`, `File`, `Edit`, `Navigation`, `View`, `AI`, `Git`), complete with styled `<kbd>` keycaps and direct **Run** buttons.

#### 🛡️ Inter-Extension Conflict Resolution & Cyclic Rule Arbiter
- **4-Tier Language Resolution Algorithm**: Tier 1 (Content Heuristics) $\to$ Tier 2 (Exact Single Claimant) $\to$ Tier 3 (Deterministic Priority Disambiguation) $\to$ Tier 4 (Monaco Default Fallback).
- **Weighted Content Heuristics**: Automatic content inspection regex rules for colliding file extensions (`.m` Objective-C vs MATLAB, `.pl` Prolog vs Perl, `.v` Coq vs SystemVerilog, `.h` C vs C++ vs Obj-C, `.ts`/`.tsx` React vs Angular).
- **Directed Graph Cycle Detection**: DFS graph cycle detection with depth bounding that detects and prunes circular language alias dependencies (e.g. $A \to B \to C \to A$) and alerts the Notification Center.
- **Fault-Tolerant Provider Sandbox**: Sandboxes tokenizers, completion providers, and hover providers to ensure unhandled exceptions never crash the Monaco editor runtime.

#### 🎨 10 Retro, Futuristic & Neon Liquid Glass Themes
- **Synthwave '84 Sunset Neon**: 1980s outrun arcade neon violet glass with magenta borders and sunset gold accents.
- **Matrix Cyberdeck Phosphor**: Cybernetic terminal with digital rain carbon glass and pure phosphor green accents.
- **Retro CRT Amber 1982**: Monochrome cathode-ray tube mainframe terminal with 589nm amber phosphor glow.
- **Tokyo Night Neo-Akiba**: Midnight Shinjuku streetscape with electric neon purple and sakura pink accents.
- **Deep Space Nebula Quantum**: Interstellar ultraviolet dark matter with starlight cyan and pulsar magenta radiance.
- **TRON Laser Grid Hologram**: Photonic vector aesthetic with intense laser cyan and holographic cobalt highlights.
- **Classic Themes**: Cupertino Midnight Glass, Liquid Obsidian, Frosted Amber Glow, and Cyberpunk 2077 Neon.

#### 📦 Universal Language Ecosystems & Mega-Packs
- **Systems & Gaming**: Zig, Odin, Nim, D, V, Jai, Crystal, Janet.
- **BEAM & Functional**: Erlang, Elixir, Gleam, OCaml, ReasonML, F#.
- **Logic & Formal Verification**: LISP, Scheme, Racket, Clojure, Prolog, Mercury, Coq, Lean 4, Agda, Isabelle.
- **Web & Mobile Frameworks**: PHP/Laravel, Angular, React 19/Next.js 15, Flutter/Dart, Ruby on Rails, Node.js 22+.
- **Frontend & Backend Mega-Packs**: Vue 3, Svelte 5, SolidJS, Streamlit, Dash, Reflex, Flet, Livewire, Blazor, Alpine.js, FastAPI, NestJS, Spring Boot, Ktor, Actix-Web, Axum, Gin.

#### 🪪 License & About Dialog Updates
- Updated Help -> License and Help -> About modal dialogs to display active `v2.0.0 PRO` release version.

---

## [1.3.0] - 2026-09-16

### 🚀 Minor Feature Release — Full-Stack Web & Mobile Ecosystems, Mega-Packs, and Error Resilience

This major minor release equips IndoctrinatedEdit with end-to-end framework and runtime support spanning the modern web, cross-platform mobile, enterprise microservices, and reactive full-stack monoliths. In addition, it introduces system-wide fault-tolerant completion boundaries that gracefully log issues to the Notification Center and fall back to default syntax highlighting.

#### 🌐 Dedicated Web & Mobile Framework Extensions
- **PHP & Laravel Ecosystem Suite (`indoctrinated.ext.php-laravel`)**:
  - Full support for PHP 8.3/8.4 and Laravel 11 (`.php`, `.blade.php`).
  - Snippets: Eloquent ORM relationships (`belongsTo`, `hasMany`), Laravel routing (`Route::get/post`), Form Request validation (`rules()`), Blade directives (`@if`, `@foreach`, `@extends`), and PHP 8 match expressions / typed readonly properties.
  - Non-blocking toolchain detection for `php` and `composer`.
- **Angular & TypeScript Enterprise Suite (`indoctrinated.ext.angular-pack`)**:
  - Full support for Angular 18+ standalone components (`.component.ts`, `.component.html`, `.service.ts`, `.guard.ts`).
  - Snippets: Standalone Components with modern `@Component` imports, Signal-based reactivity (`signal()`, `computed()`, `effect()`), Angular Signals Inputs & Outputs, Signal Store state management, and Functional Route Guards (`CanActivateFn`).
- **React 19 & Next.js Modern Ecosystem (`indoctrinated.ext.react-pack`)**:
  - Full support for React 19, Server Components, and Next.js 15 App Router (`.tsx`, `.jsx`, `.ts`, `.js`).
  - Snippets: React 19 `useActionState` and Server Actions, Next.js Server & Client Components (`'use client'`, `'use server'`), Custom typed React Hooks, and Context Providers.
- **Flutter & Dart Mobile/Desktop Suite (`indoctrinated.ext.flutter-pack`)**:
  - Full support for Flutter 3+ and Dart 3.5+ (`.dart`).
  - Snippets: `StatelessWidget` and `StatefulWidget`, `ConsumerWidget` / Riverpod StateNotifier providers, Bloc / Cubit state management, Custom `CustomPainter` canvas rendering, and Liquid Glass UI containers.
  - Non-blocking toolchain detection for `flutter` and `dart`.
- **Ruby & Ruby on Rails Suite (`indoctrinated.ext.ruby-rails`)**:
  - Full support for Ruby 3.3+ and Ruby on Rails 7.2/8 (`.rb`, `.erb`, `.rake`).
  - Snippets: Rails REST Controllers, ActiveRecord Models with validations and scopes, ActiveSupport Concerns, and Service Objects.
  - Non-blocking toolchain detection for `ruby`, `gem`, and `bundle`.
- **Node.js Core Runtime Extension (`indoctrinated.ext.node-pack`)**:
  - Full support for Modern Node.js 20/22+ ESM runtimes (`.js`, `.mjs`, `.cjs`, `.ts`).
  - Snippets: Native ESM HTTP server (`node:http`), asynchronous filesystem (`node:fs/promises`), worker threads multi-processing (`node:worker_threads`), high-throughput stream pipelines (`node:stream/promises`), zero-dependency native test suite (`node:test`, `node:assert/strict`), strongly typed `node:events`, and `node:crypto`.
  - Non-blocking toolchain detection for `node` and `npm`.

#### 📦 Universal Mega-Pack Suites
- **Universal Frontend Mega-Pack (`indoctrinated.ext.frontend-mega-pack`)**:
  - **Node-based**: Vue 3 (`<script setup>`), Svelte 5 (Runes `$state`, `$derived`, `$props`), SolidJS (`createSignal`), Preact (`@preact/signals`).
  - **Python-based UI**: Streamlit (AI & interactive data dashboards), Dash / Plotly (Reactive analytics), Reflex (Pure Python stateful web apps), Flet (Flutter-powered Python apps), Anvil (Full-stack Python forms).
  - **PHP-based UI**: Livewire 3 (Reactive components & `#[Validate]`), Inertia.js (Vue SPA Monolith adapter), Blade UI components (`@props`, slots), Symfony UX (Stimulus controllers).
  - **Ruby-based UI**: Hotwire / Turbo Frames & Streams, GitHub ViewComponent classes & templates.
  - **.NET-based UI**: Blazor Interactive Server/WASM Razor components (`@rendermode`, `@code`).
  - **HTML-First**: Alpine.js declarative reactive widgets (`x-data`, `x-bind`, `x-transition`).
- **Universal Backend Mega-Pack (`indoctrinated.ext.backend-mega-pack`)**:
  - **Node-based**: Express 5, NestJS, Fastify, Koa, Hono.
  - **Python-based**: FastAPI (WebSockets & Lifespan), Django Ninja (Type-safe async APIs), Sanic, Flask.
  - **PHP-based**: Symfony 7 (`#[Route]`, `#[MapRequestPayload]`), CodeIgniter 4 (`ResourceController`), Slim 4 (PSR-7 microservice).
  - **Ruby-based**: Sinatra, Hanami 2 (Action classes with schema validation).
  - **Java / Kotlin-based**: Ktor 3 (Kotlin coroutines & Netty), Spring Boot 3 WebFlux (Reactive `Mono`/`Flux`), Micronaut (AOT compile-time DI), Quarkus (Mutiny reactive REST).
  - **Go-based**: Gin, Fiber, Echo.
  - **.NET-based**: ASP.NET Core SignalR typed Hubs & Minimal APIs.
  - **Rust-based**: Actix-Web, Axum (Tokio-backed async router with Tower layers).

#### 🛡️ Fault-Tolerant Monaco Resilience & Fallbacks
- **Defensive Error Envelopes**: All Monaco extension providers and completions run inside protective try/catch wrappers.
- **Notification Center Integration**: Any runtime fault or rule-matching crash automatically triggers user-visible diagnostic alerts via the Notification Center without interrupting editor operations.
- **Graceful Syntax Highlighting Fallback**: In the event of provider errors, Monaco automatically falls back to default syntax highlighting.

#### ⚡ Non-Blocking Idle Toolchain Auto-Detection
- Multi-compiler discovery for Node, Python, Rust, Go, GCC, C#, Java, PHP, Ruby, and Flutter runs asynchronously during browser idle frames (`requestIdleCallback`) with a 15-minute TTL cache, keeping IDE startup instantaneous.

#### 🪪 License & About Dialog Updates
- Updated Help -> License and Help -> About modal dialogs to display active `v1.3.0 PRO` release version.

---

## [1.2.1] - 2026-09-15

### 🩹 Hotfix Release — Chromium Windows Cache Locking & Cleanup Automation

This hotfix addresses Windows-specific Chromium GPU disk cache file locking (`0x5 Access is denied`) and introduces single instance application locking and automated cache purging utilities.

#### 🛠️ Chromium & Electron Process Hardening
- **In-Memory GPU Shader Caching**: Configured `disable-gpu-shader-disk-cache` and `disable-gpu-program-cache` switches in the Electron main process, eliminating Chromium's file lock collisions on `%APPDATA%\indoctrinated-edit\GPUCache` and `Cache_Data`.
- **Single Instance Process Lock**: Enforced `app.requestSingleInstanceLock()`. Duplicate app launches now cleanly quit immediately while focusing the primary existing window (`app.on('second-instance')`), preventing simultaneous profile collisions.
- **Explicit Application Identity**: Configured `app.name = 'IndoctrinatedEdit'` to enforce structured UserData and LocalAppData folder paths.

#### 🧹 Cache & Artifact Purge Tooling
- **Automated Cleaner Scripts**: Added `scripts/clean-cache.js` (cross-platform Node.js cleaner) and `scripts/clean-cache.ps1` (native PowerShell cleaner with automatic lock process termination).
- **NPM Script Integration**: Added `npm run clean:cache` and `npm run clean:cache:win` for on-demand purging of `%APPDATA%`, `%LOCALAPPDATA%`, and local Vite HMR caches.

#### 🪪 License & About Dialog Updates
- Updated Help -> License and Help -> About modal dialogs to display active `v1.2.1 PRO` release version.

---

## [1.2.0] - 2026-09-15

### ⚡ Minor Feature Release — C/C++, Python & AI, Java & JVM, and .NET/C# Universal Extensions

This release introduces four major ecosystem extensions expanding IndoctrinatedEdit into a powerhouse IDE for native systems, AI & numerical computing, enterprise JVM backends, and .NET microservices, all bundled with rich snippet libraries and non-blocking compiler auto-detection.

#### ⚙️ C/C++ Universal Engine & Ecosystem Extension (`indoctrinated.ext.cpp-pack`)
- **Broad Language Support**: First-class support for C and Modern C++ (`.cpp`, `.cxx`, `.cc`, `.c`, `.hpp`, `.hxx`, `.hh`, `.ixx`, `.cppm`).
- **Comprehensive Snippet Suite**:
  - **Modern C++20 / C++23**: `main-cpp`, `class-rule5` (Rule of Five), `concept` (requires clauses), `coroutine-task` (`co_yield` generators), `ranges-pipeline` (`std::views` filtering & mapping), `variant-visit` (`std::variant` & visitor overload pattern).
  - **C Core & POSIX Systems**: `main-c`, `struct-typedef` (lifecycle patterns), `pthreads-worker` (POSIX threads & mutexes), `mmap-io` (zero-copy memory mapping).
  - **Low-Level SIMD**: `simd-avx2` (Intel AVX2 vectorized parallel float math).
  - **Game Dev & Graphics**: `raylib-game` (Raylib desktop window bootstrap & 60fps render loop).
  - **Web Microservices**: `crow-server` (Crow C++ HTTP API routing with JSON responses).
  - **GUI**: `imgui-widget` (Immediate mode Dear ImGui window with interactive sliders & controls).
  - **Modern Build Systems**: `cmake-project` (Target-based CMake 3.25+ configuration).
- **Toolchain Discovery**: Auto-detects `gcc`, `g++`, `clang`, and `cl` with missing compiler guidance.

#### 🐍 Python & AI Ecosystem Extension (`indoctrinated.ext.python-pack`)
- **Full Python Language Suite**: Associations for `.py`, `.pyi`, `.pyw`, `.ipynb`, `.pyx`, `.pyd`.
- **Comprehensive Snippet Suite**:
  - **Modern Python 3.11 / 3.12+**: `main-py` (`argparse` CLI entrypoint), `dataclass` (`slots=True` & `frozen=True`), `pydantic-model` (Pydantic V2 schemas & validators), `async-taskgroup` (`asyncio.TaskGroup()` concurrency), `context-mgr` (`@contextmanager`), `match-case` (structural pattern matching).
  - **Web Frameworks**: `fastapi-app` (FastAPI async API with lifespan & CORS), `flask-app` (Flask blueprint), `django-view` (DRF class-based `APIView`).
  - **Data Science, AI & ML**: `pandas-pipeline` (DataFrame query, aggregation, Parquet IO), `numpy-vectorized` (vectorized matrix math & softmax), `pytorch-model` (PyTorch `nn.Module` classifier & training loop), `scikit-pipeline` (`StandardScaler` & `RandomForestClassifier`).
  - **Testing & CLI**: `pytest-fixture` (fixtures with parameterized tests), `click-cli` (Click command group).
- **Toolchain Discovery**: Auto-detects `python`, `python3`, and `py` with missing interpreter guidance.

#### ☕ Java & JVM Universal Suite (`indoctrinated.ext.java-pack`)
- **Enterprise JVM Support**: Associations for `.java`, `.jav`, `.class`, `.jar`, `.gradle`, `.pom`.
- **Comprehensive Snippet Suite**:
  - **Modern Java 17 / 21 LTS**: `main-java`, `record` (immutable data carriers), `sealed-interface` (sealed domain hierarchies), `virtual-threads` (Project Loom virtual thread per-task executor), `stream-pipeline` (`Collectors.groupingBy`).
  - **Enterprise Frameworks**: `spring-boot-app` (Spring Boot 3 REST controller), `quarkus-resource` (Quarkus reactive endpoints), `jpa-entity` (Jakarta Persistence / Hibernate entity with auditing).
  - **Testing & Build Systems**: `junit5-test` (JUnit 5 parameterized tests), `maven-pom` (Java 21 Maven POM), `gradle-build` (Kotlin DSL `build.gradle.kts`).
- **Toolchain Discovery**: Auto-detects JDK binaries (`javac`, `java`) with download guidance.

#### 🔷 .NET & C# Enterprise Suite (`indoctrinated.ext.dotnet-pack`)
- **Enterprise .NET Support**: Associations for `.cs`, `.csx`, `.csproj`, `.sln`, `.fsproj`, `.vb`.
- **Comprehensive Snippet Suite**:
  - **Modern C# 12 / 13 & .NET 8 / 9**: `program-top-level` (WebApplication top-level statements), `primary-ctor` (C# 12 primary constructors with DI), `record-class` (positional immutable records), `pattern-matching` (switch expressions), `async-enumerable` (`IAsyncEnumerable<T>` streaming).
  - **ASP.NET Core & Microservices**: `minimal-api` (`MapGroup` & `TypedResults`), `controller-api` (`[ApiController]`), `middleware` (custom latency logger middleware), `efcore-dbcontext` & `efcore-entity` (EF Core with fluent mappings), `masstransit-consumer` (event-driven messaging).
  - **Cross-Platform MVVM, Testing & Build**: `mvvm-viewmodel` (CommunityToolkit.Mvvm `[ObservableProperty]`), `xunit-test` (xUnit `[Theory]` & `[InlineData]`), `csproj-modern` (SDK-style `.csproj` targeting `net8.0`).
- **Toolchain Discovery**: Auto-detects `dotnet` (.NET SDK) with download guidance.

#### 🪪 License & About Dialog Updates
- Updated Help -> License and Help -> About modal dialogs to display active `v1.2.0 PRO` release version.

---

## [1.1.0] - 2026-09-15

### 🚀 Minor Feature Release — Extensions, Top Menus, Toolchain Auto-Detect & Notification Center

This minor release introduces comprehensive top application menus, full extension support with rich language packs (Textile/Markdown/reST/AsciiDoc, Go, and Rust), background compiler auto-detection with missing toolchain warnings, and the authentic iOS Liquid Glass Notification Center.

#### 🧭 Top Menu Bar & Interactive Dialogs
- **Top Application Menus**: Implemented standard VS Code-like `File`, `View`, and `Help` dropdown menus with Liquid Glass styling, click activation, hover switching, and keyboard shortcuts.
- **Unique Shortcut Mapping & Chord Support**: Implemented two-key chord sequences (`Ctrl+K` followed by `Ctrl+O` for Open Workspace Folder) to resolve Monaco outline shortcut collisions (`Ctrl+Shift+O`).
- **About IndoctrinatedEdit Modal**: Added interactive dialog showcasing version info (`v1.1.0 PRO`), project philosophy, author portfolio link (`https://portfolio-flutter-78bcf.web.app/`), and sister project (`RecluseEdit`).
- **License & Perpetual PRO Activation**: Added Liquid Glass License modal displaying perpetual community entitlement, dynamic version string, lifetime seat validation, and authentic license key generator (`INDC-PRO-XXXX-XXXX-GLAS`) with one-click clipboard copy.

#### 🔔 Notification Center & Toolchain Auto-Detect
- **Interactive Notification Center**: Liquid Glass floating drawer/popover accessed via the main title bar bell icon (with unread badge counter), `View -> Notifications` (`Ctrl+Shift+N`), and Command Palette.
- **"Dismiss All" & Batch Management**: One-click dismissal resetting unread and pending notification counters to zero instantly.
- **Compiler Auto-Detection Alerts**: Integrates with `toolchainService` to run non-blocking background compiler checks when extensions load, notifying users if `go` or `rustc`/`cargo` is missing from PATH with direct download/install actions.
- **Human-Readable Error Dispatcher**: Unified error logging (`notificationService.notifyError`) presenting friendly diagnostics for agent crashes and service failures.

#### 🧩 Extensions & Universal Text Support Extension
- **Universal Text & Prose Language Pack (`indoctrinated.ext.text-pack`)**: Bundled all-in-one text formats extension supporting **Plain Text** (`.txt`), **Markdown** (`.md`, `.markdown`), **Redmine Textile** (`.textile`), **reStructuredText** (`.rst`), **AsciiDoc** (`.adoc`), **Log Files** (`.log`), and **CSV/TSV** (`.csv`, `.tsv`).
- **Redmine Textile Monarch Tokenizer**: Custom syntax grammar for headers (`h1.`-`h6.`), inline formatting (`*bold*`, `_italic_`, `+underline+`, `-deleted-`, `@code@`), blocks (`bc..`, `bq.`), data tables (`|_. Header |`), Redmine issues (`#123`), commits (`commit:hash`), and macros (`{{toc}}`, `{{collapse}}`).
- **Comprehensive Snippet Suite**: Embedded Monaco completion item providers with snippet expansions for Markdown tables, GitHub alert callouts (`[!NOTE]`, `[!TIP]`, `[!WARNING]`), Textile tables, code blocks, Redmine macros, frontmatter, and plain text notes.

#### 🐹 Go Universal Suite & Toolchain Extension
- **Go Ecosystem Pack (`indoctrinated.ext.go-pack`)**: Full Go language support with rich snippets for standard library (`goroutine`, `channel`, `select`, `table-test`) and popular frameworks (**Gin**, **Fiber**, **Echo**, **GORM**, **Cobra**).
- **Toolchain Discovery**: Auto-detects `go` binary and toolchain status in the background.

#### 🦀 Rust & Cargo Ecosystem Extension
- **Rust Development Pack (`indoctrinated.ext.rust-pack`)**: Complete Rust language and Cargo support with snippets for core idioms (`derive`, `impl`, `trait`, `match`, `testmod`) and ecosystems (**Tokio**, **Axum**, **Actix-Web**, **Serde**, **Clap**).
- **Toolchain Discovery**: Auto-detects `rustc` and `cargo` toolchains with missing compiler guidance (`https://rustup.rs`).

---

## [1.0.1] - 2026-09-15

### 🩹 Hotfix Release — Minimap Glass, Title Bar Fix & Resizable Panes

This hotfix resolves critical UI layout rendering bugs, introduces interactive draggable splitters for the sidebar and AI panel, and polishes the AI chat interface.

#### ⚡ Monaco Minimap & Highlighter Glass Fix
- **Eliminated Compounding Backgrounds & Opacity Bugs**: Fixed issue where the minimap slider became a solid opaque block by separating outer slider framing from inner horizontal slider fills.
- **Removed Nested `backdrop-filter` in Slider**: Prevented Chromium/Electron nested blur compositing anomalies where nested backdrop-filter layers flattened into opaque artifacts over transparent backgrounds.
- **Registered Explicit Monaco Minimap Theme Tokens**: Added `minimapSlider.background`, `minimapSlider.hoverBackground`, `minimapSlider.activeBackground`, and translucent `minimap.errorHighlight` (`rgba(255, 69, 58, 0.35)`) to preserve crisp character legibility beneath the viewport slider.

#### 🪟 Window Frame & Title Bar Persistence
- **Fixed Disappearing Title Bar / Window Controls**: Resolved bug in AI Assistant where `scrollIntoView({ behavior: 'smooth' })` scrolled the entire browser window and pushed the frameless `WindowFrame` and minimize/maximize/close buttons offscreen.
- **Internal Container Scrolling**: Switched AI message scrolling to scoped `container.scrollTop = container.scrollHeight`.
- **Strict Layout Locking**: Added strict `max-height: 100vh; overflow: hidden;` and `flex-shrink: 0` constraints to the app shell and window frame.

#### 📐 Interactive Draggable Resizable Panes
- **Resizable Left Sidebar**: Added interactive glass divider sash enabling smooth drag-to-resize from 180px to 500px (default 260px).
- **Resizable Right AI Dock**: Added interactive glass divider sash enabling smooth drag-to-resize from 320px to 700px (default 420px).
- **Visual Hover & Active Sashes**: Glowing cyan/blue drag indicators with `col-resize` cursors.

#### 🤖 AI Chat Panel Polish & Responsive Fixes
- **Expanded Default Width**: Increased initial AI chat panel width from 380px to 420px for comfortable reading without cramped line breaks.
- **Adaptive Header & Truncation**: Pinned action buttons (`Key`, `Clear`, `Close`) with `flex-shrink: 0` and enabled clean model name truncation so header items never overflow or clip.
- **Enhanced Quick-Action Bar**: Improved chip layout and scroll container to prevent button cutoff.

---

## [1.0.0] - 2026-09-15 (Archived)

### ✨ Initial Release — The Liquid Glass Era

The inaugural release of **IndoctrinatedEdit**, the flashy, feature-packed general-purpose desktop text and code editor for Linux & Windows crafted by **[indoctrinatedrecluse](https://github.com/indoctrinatedrecluse)**.

#### 🪟 Liquid Glass UI & Design System
- **Authentic Cupertino Frosted Glass**: Multi-layered hardware-accelerated glass materials (`backdrop-filter: blur(28px) saturate(200%)`), specular rim highlights, and ambient glow shaders.
- **Physics-Based Spring Motion**: Natural, fluid interactions powered by Framer Motion.
- **Custom Traffic Light Window Controls**: Floating frosted glass capsule with Apple-grade traffic light dots (Minimize `#FF9F0A`, Maximize/Restore `#30D158`, Close `#FF453A`) revealing micro-icons on hover with neon bloom.
- **Window Hit-Test & Control Fixes**: Dedicated draggable title bar spacers flanking the search pill preventing Chromium hit-test caching conflicts, with full native minimize, maximize, and restore support on Windows and Linux.
- **Default Maximized Launch**: Automatically opens in maximized mode on launch for immediate full-width workspace editing.
- **Segmented Liquid Glass UI Bars**:
  - Frameless window frame with interactive workspace/file search pill and specular cyan rim line.
  - Segmented status bar with interactive Git branch chip, syntax diagnostics counters, microservice status pulse orb, cursor position, encoding, and dynamic theme switcher.
  - Floating tab bar with active tab neon glow bar, dirty indicators, and new tab shortcut (<kbd>Ctrl+N</kbd>).

#### ⚡ Heavyweight Monaco Editor Core
- **100% Transparent Canvas**: Custom syntax grammar and token rules rendered over dynamic frosted glass.
- **Full IDE Capabilities**: Multi-cursor editing, bracket pair colorization, indentation guides, code folding, and smooth cursor animations.
- **Frosted Minimap Preview**: Typography character rendering with frosted glass slider and specular boundary line.
- **Sticky Scroll Fix**: Fixed symbol overlap bug on transparent backgrounds by cleanly disabling sticky scroll pinning.

#### 🎨 Dynamic Themes Engine
- Built-in theme switcher with real-time CSS variable and Monaco token re-theming:
  - **Cupertino Midnight Glass**: Royal blue accent (`#0A84FF`) on deep navy glass canvas.
  - **Liquid Obsidian**: Emerald obsidian glow (`#30D158`) with vibrant teal highlights (`#00F5D4`).
  - **Frosted Amber Glow**: Warm amber radiance (`#FF9F0A`) with golden specular rim lighting.
  - **Cyberpunk 2077 Neon**: High-voltage synthwave aesthetic with neon magenta (`#FF0055`), electric cyan (`#00F0FF`), and night-city yellow (`#FFD600`).

#### 🌿 Git Microservice & Visual Subway-Map Graph
- **Out-of-Process CLI Git Backend**: Dedicated child-process service calculating topological branch lanes, ahead/behind counts, and staged/working tree modifications.
- **Visual Subway-Map Commit Graph**: Glowing SVG branch rails, circular commit nodes, relative commit timestamps, and author details.
- **Staging & Commit Controls**: One-click stage/unstage file actions and commit message prompt.
- **Activity Bar Badge**: Source control icon with real-time uncommitted changes badge.

#### 🔍 Universal Command Palette (<kbd>Ctrl+Shift+P</kbd> / <kbd>Ctrl+P</kbd>)
- **Floating Spring Modal**: Centered frosted glass overlay with fuzzy search.
- **Dual Modes**:
  - `>` **Commands Mode** (<kbd>Ctrl+Shift+P</kbd> / <kbd>F1</kbd>): Search across File, View, Preferences, Themes, Git, and AI commands.
  - **Files Mode** (<kbd>Ctrl+P</kbd>): Instant fuzzy jumping across open tabs and workspace files.
- **Extensible `CommandRegistry` Service**: Allows core and extensions to dynamically register commands and shortcuts.

#### 🤖 Multi-Model AI Chat Right Dock (<kbd>Ctrl+Alt+A</kbd>)
- **Multi-Provider BYOK & Local Models**:
  - **DeepSeek**: `deepseek-chat` (V3) and `deepseek-reasoner` (R1 with chain-of-thought tokens).
  - **OpenAI**: `gpt-4o`, `gpt-4o-mini`, and `o3-mini`.
  - **Google Gemini**: `gemini-2.5-flash` and `gemini-2.5-pro` (via OpenAI-compatible API).
  - **Anthropic Claude**: `claude-3-7-sonnet` and `claude-3-5-sonnet`.
  - **Ollama**: Automatic local model discovery at `http://localhost:11434`.
  - **Antigravity / Custom Proxy**: ADC session and reverse proxy endpoints.
- **Zero CORS Streaming Bridge**: Out-of-process Electron streaming engine with `AbortController` cancellation.
- **Reasoning Process Viewer**: Expandable chain-of-thought accordion with animated thinking spinner.
- **Deep Editor Integration**:
  - One-click **Attach Selection** (with line numbers `welcome.ts (lines 14-25)`) and **Attach File**.
  - One-click **Insert at Cursor** and **Replace Selection** directly targeting the Monaco editor.
  - Quick action chips: *Explain*, *Bugs & Security*, *Refactor*, *Tests*.

#### 🚀 Instant Liquid Glass Splash Screen & Zero-Flash Handshake
- Synchronous frameless launch window with 3D cybernetic prism brand graphic.
- Shimmering neon loading progress bar with dynamic subsystem status messages.
- Author footer: **`by indoctrinatedrecluse ✨`**.
- Persists until Monaco Editor and React DOM are 100% mounted, compiled, and painted.
- Seamless cross-fade transition revealing the main window with zero gray flash.

#### 🧩 Extensibility SDK
- `@sdk/index` exposing `ExtensionPlugin` and `ThemeDefinition` base classes with complete TypeScript definitions.
- Dynamic plugin registry with lifecycle hooks (`activate`, `deactivate`).

#### 🚀 Performance & Critical Startup Optimizations
- **Local Monaco Bundling**: Configured `loader.config({ monaco })` to bypass external CDN fetches from `cdn.jsdelivr.net`, guaranteeing 100% offline, instantaneous (<300ms) startup.
- **Monaco Web Workers in Vite**: Added `src/monacoWorker.ts` with `self.MonacoEnvironment` and Vite `?worker` imports, preventing AMD `require.toUrl` runtime crashes.
- **Monaco Theme Name Validation**: Sanitized theme names using `.replace(/[^a-zA-Z0-9-]/g, '-')` to strictly satisfy Monaco's `/^[a-z0-9\-]+$/i` naming regex, eliminating React mount crashes.
- **CommonJS Preload Output**: Configured Rollup to emit `dist-electron/preload.cjs` in CommonJS format for Electron preload security.
- **Relative Asset Resolution**: Configured `base: './'` in `vite.config.ts` for clean desktop file loading.

#### 🛠️ Compiler & SDK Auto-Detection Framework
- **Non-Blocking Background Detection Engine**:
  - Built `electron/toolchain-service.ts` with asynchronous, timeout-guarded executable resolution using PATH scanning, `where.exe` (Windows), and `which` (Linux/macOS).
  - Built-in detection for **Node.js**, **TypeScript**, **Python**, **Rust**, **Go**, **C/C++ (GCC/Clang)**, **.NET SDK**, **Java JDK**, and **Git**.
  - Background scheduler in `src/services/toolchainService.ts` executing during browser idle time (`requestIdleCallback`) without impacting startup or editing performance.
  - Local caching with 15-minute TTL to minimize shell execution overhead.
- **Extensible Extension API**:
  - Added `registerToolchain(definition: ToolchainDefinition)` to `IExtensionHostRegistry` and `packages/sdk/types.ts`, allowing future language extensions to auto-register compilers and SDKs.

#### 🧪 Comprehensive Release Compliance Test Suite
- **Vitest Automated Testing Framework**:
  - Full test suite executed via `npm test` with 100% pass rate (24/24 tests across 6 files).
  - **`test/sdk.test.ts`**: Verifies plugin lifecycle contracts, context interfaces, and type schemas.
  - **`test/themes.test.ts`**: Verifies theme contracts, color token presence, and strictly validates all theme names against Monaco's naming regex.
  - **`test/commandRegistry.test.ts`**: Verifies command registration, unregistration, category filtering, and execution.
  - **`test/gitService.test.ts`**: Verifies repository detection, branch extraction, and commit history topological lane assignment.
  - **`test/aiService.test.ts`**: Verifies stream error handling and graceful offline host fallback.
  - **`test/toolchain.test.ts`**: Verifies toolchain resolution, version pattern regexes, and registry management.

---

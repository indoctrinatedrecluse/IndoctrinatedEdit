# Changelog

All notable changes to **IndoctrinatedEdit** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

# Changelog

All notable changes to **IndoctrinatedEdit** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

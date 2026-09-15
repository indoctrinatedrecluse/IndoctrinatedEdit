# ✨ IndoctrinatedEdit

> *Crafted with passion by **[indoctrinatedrecluse](https://github.com/indoctrinatedrecluse)*** ❤️✨

---

### 🔗 Sister Project

> **Looking for our ultra-lightweight Windows counterpart?**  
> Check out **[RecluseEdit](https://github.com/indoctrinatedrecluse/RecluseEdit)** — a lightning-fast, ultra-lean web application code editor crafted with WPF, C#, and .NET 10 for Windows.

---

## 🌟 Overview

**IndoctrinatedEdit** is a hyper-modern, flashy, feature-packed general-purpose desktop text and code editor built for both **Linux** and **Windows**. 

Where its sister project **RecluseEdit** prioritizes an ultra-minimal binary footprint and native Windows execution, **IndoctrinatedEdit** flips the equation: bundle size is unconstrained, visuals are GPU-accelerated, and aesthetics take center stage. Built with a signature **iOS "Liquid Glass"** frosted aesthetic, physics-based spring animations, Monaco Editor core, out-of-process Git subway-map visualization, universal command palette, and a multi-model AI assistant dock, IndoctrinatedEdit delivers a desktop editing experience that feels genuinely alive.

---

## 🎯 Key Features

### 🪟 Authentic "Liquid Glass" Cupertino Aesthetic
- **Frosted Glass Canvas**: Multi-layered hardware-accelerated materials (`backdrop-filter: blur(28px) saturate(200%)`), specular rim highlights, and ambient glow shaders.
- **Cross-Platform Translucency**: Native Windows 11 DWM Acrylic composition and Linux Wayland/X11 transparent compositor compatibility.
- **Custom Traffic Light Capsule Controls**: Frosted glass capsule with Apple-grade traffic light buttons (Minimize `#FF9F0A`, Maximize/Restore `#30D158`, Close `#FF453A`) revealing micro-icons on hover with neon bloom.
- **Segmented Glass UI Bars**: Custom frameless header with search pill and specular cyan rim line, dynamic floating tab bar, and segmented status bar with branch, diagnostics, microservices pulse orb, and encoding chips.

### ⚡ Heavyweight Monaco Editor Core
- **100% Transparent Canvas**: Custom syntax grammar and token rules rendered directly over dynamic frosted glass.
- **Full IDE Capabilities**: Multi-cursor editing, bracket pair colorization, indentation guides, code folding, and smooth caret animations.
- **Frosted Minimap Preview**: High-density typography rendering with frosted glass viewport slider and specular boundary lines.

### 🎨 4 Dynamic Liquid Glass Themes
Switchable in real-time with full Monaco token and CSS variable re-theming:
1. **Cupertino Midnight Glass**: Royal blue accent (`#0A84FF`) on deep navy glass canvas.
2. **Liquid Obsidian**: Emerald obsidian glow (`#30D158`) with vibrant teal highlights (`#00F5D4`).
3. **Frosted Amber Glow**: Warm amber radiance (`#FF9F0A`) with golden specular rim lighting.
4. **Cyberpunk 2077 Neon**: High-voltage synthwave aesthetic with neon magenta (`#FF0055`), electric cyan (`#00F0FF`), and night-city yellow (`#FFD600`).

### 🌿 Out-of-Process Git Microservice & Subway-Map Graph
- Dedicated background Git CLI backend for calculating branch states, topological lanes, ahead/behind counts, and staged/working tree modifications.
- Visual subway-map commit graph with glowing SVG branch rails, circular commit nodes, relative commit timestamps, and author details.
- One-click file staging/unstaging and commit controls.
- Uncommitted changes counter badge in the Activity Bar.

### 🔍 Universal Command Palette (<kbd>Ctrl+Shift+P</kbd> / <kbd>Ctrl+P</kbd>)
- Floating spring modal with fuzzy search.
- **`>` Commands Mode** (<kbd>Ctrl+Shift+P</kbd> / <kbd>F1</kbd>): Instant access to File, View, Preferences, Themes, Git, and AI commands.
- **Files Mode** (<kbd>Ctrl+P</kbd>): Instant fuzzy jumping across open tabs and workspace files.

### 🤖 Multi-Model AI Chat Right Dock (<kbd>Ctrl+Alt+A</kbd>)
- **Multi-Provider BYOK & Local Models**:
  - **DeepSeek**: `deepseek-chat` (V3) and `deepseek-reasoner` (R1 with chain-of-thought tokens).
  - **OpenAI**: `gpt-4o`, `gpt-4o-mini`, and `o3-mini`.
  - **Google Gemini**: `gemini-2.5-flash` and `gemini-2.5-pro` (via OpenAI-compatible API).
  - **Anthropic Claude**: `claude-3-7-sonnet` and `claude-3-5-sonnet`.
  - **Ollama**: Automatic local model discovery at `http://localhost:11434`.
  - **Antigravity / Custom Proxy**: ADC session and reverse proxy endpoints.
- **Real-Time Streaming**: Zero CORS restrictions via Electron backend bridge with `AbortController` cancellation.
- **Reasoning Process Viewer**: Expandable chain-of-thought accordion with animated thinking spinner.
- **Deep Editor Integration**: One-click **Attach Selection** (with line numbers), **Attach File**, **Insert at Cursor**, and **Replace Selection**.
- **Quick Action Chips**: *Explain*, *Bugs & Security*, *Refactor*, *Tests*.

### 🚀 Instant Liquid Glass Splash Screen
- Synchronous frameless transparent launch window with 3D cybernetic prism brand graphic.
- Shimmering neon loading progress bar with dynamic subsystem status messages.
- Author attribution footer: **`by indoctrinatedrecluse ✨`**.
- Seamless 350ms fade-out transition upon Monaco editor and React DOM readiness.

---

## ⌨️ Keyboard Shortcuts

| Action | Shortcut (Windows/Linux) |
| :--- | :--- |
| **Universal Command Palette** | <kbd>Ctrl+Shift+P</kbd> or <kbd>F1</kbd> |
| **Quick Open File** | <kbd>Ctrl+P</kbd> |
| **Toggle AI Assistant Right Dock** | <kbd>Ctrl+Alt+A</kbd> or <kbd>Ctrl+Shift+A</kbd> |
| **Source Control & Git Graph** | <kbd>Ctrl+Shift+G</kbd> |
| **Toggle Primary Sidebar** | <kbd>Ctrl+B</kbd> |
| **Show Explorer** | <kbd>Ctrl+Shift+E</kbd> |
| **New Untitled File** | <kbd>Ctrl+N</kbd> |
| **Open File...** | <kbd>Ctrl+O</kbd> |
| **Open Workspace Folder...** | <kbd>Ctrl+Shift+O</kbd> |
| **Save File** | <kbd>Ctrl+S</kbd> |
| **Save File As...** | <kbd>Ctrl+Shift+S</kbd> |
| **Close Current Tab** | <kbd>Ctrl+W</kbd> |
| **Preferences / Settings** | <kbd>Ctrl+,</kbd> |

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Desktop Host / Runtime** | [Electron 34](https://www.electronjs.org/) + Node.js |
| **Frontend UI Framework** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Editor Core Engine** | [Monaco Editor](https://microsoft.github.io/monaco-editor/) (`@monaco-editor/react`) |
| **Motion Physics** | [Framer Motion](https://www.framer.com/motion/) |
| **UI Icons** | [Lucide Icons](https://lucide.dev/) |
| **Styling Engine** | Vanilla CSS Cupertino Glassmorphism Design System |
| **Packaging & Distribution**| [Electron Builder](https://www.electron.build/) (NSIS, ZIP, AppImage, Tarball) |
| **Build Toolchain** | [Vite 6](https://vitejs.dev/) + Vite Plugin Electron |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ installed
- Git installed and accessible in your system PATH

### Installation & Local Run
```bash
# Clone the repository
git clone https://github.com/indoctrinatedrecluse/IndoctrinatedEdit.git
cd IndoctrinatedEdit

# Install dependencies
npm install

# Run locally in development mode
npm run dev
```

### Automated Testing
```bash
# Run the automated release compliance test suite
npm test
```

### Packaging & Distribution
```bash
# Compile and build production bundles
npm run build

# Package for Windows (NSIS Installer & Portable ZIP)
npm run pack:win

# Package for Linux (AppImage & Tarball)
npm run pack:linux
```

---

## 🗺️ Roadmap & Milestones

- [x] **Phase 1: Git Microservice & Visual Subway-Map Graph**
- [x] **Phase 2: Flashy Custom Icon & Software Branding**
- [x] **Phase 3: Universal Command Palette (<kbd>Ctrl+Shift+P</kbd> / <kbd>Ctrl+P</kbd>)**
- [x] **Phase 4: Custom Frameless UI Bars & Traffic Light Capsules + Cyberpunk Theme**
- [x] **Phase 5: Multi-Model AI Chat Right Dock (BYOK, Ollama, Streaming, Code Attachment)**
- [x] **Phase 6: Liquid Glass Splash Screen (Instant launch screen with graphic & author footer)**
- [x] **Phase 7: Startup Optimization & Zero-Flash Handshake (<300ms launch, local Monaco bundling & Vite web workers)**
- [x] **Phase 8: Compiler & SDK Auto-Detection Framework (Non-blocking background runner & extension registration API)**
- [x] **Phase 9: Comprehensive Release Compliance Test Suite (Automated tests for SDK, Monaco theme contracts, Git topology, and toolchains)**

---

## 📄 License & Attribution

Crafted with passion by **[indoctrinatedrecluse](https://github.com/indoctrinatedrecluse)**.  
See [CHANGELOG.md](CHANGELOG.md) for full release notes and feature breakdown.

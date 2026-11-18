# MobileLayout Studio 📱✨
> **Visual UI/UX Designer & LLM Code Bridge for Angular & Ionic Projects**

MobileLayout Studio bridges the gap between visual interface design and AI-assisted code generation. Describing UI/UX changes with words alone has severe limitations: spacing, padding, alignment, Ionic component tokens, and layout hierarchies are notoriously tedious and ambiguous in text prompts. 

With MobileLayout Studio, you can visually inspect, tweak, and design interfaces on an interactive mobile canvas, and immediately transmit those precise visual deltas to an **LLM** (Google Gemini, OpenCode, Ollama, LM Studio, or Antigravity) to produce clean, production-ready Angular and Ionic code applied directly to your project files.

---

## 🚀 Key Features

- **📱 Interactive Mobile Canvas Simulator**:
  - Device frames for **iPhone 15 Pro**, **Pixel 8**, **iPad Mini**, and **Responsive**.
  - Orientation toggle (Portrait / Landscape) and zoom controls (75%, 85%, 100%, 115%).
- **🔍 Zero-Config Target Project Proxy**:
  - Connects directly to any running dev server (e.g. `ionic serve` or `ng serve` on `http://localhost:8100` or `4200`).
  - Injects a lightweight inspector bridge on-the-fly without altering your project's `package.json` or configuration.
  - Automatically strips frame-prevention headers so your live app renders seamlessly inside the Studio canvas.
- **⚡ Ionic-First Visual Property Inspector**:
  - **Color Tokens**: 1-click styling using Ionic design tokens (`primary`, `secondary`, `tertiary`, `success`, `warning`, `danger`, `dark`, `medium`, `light`).
  - **Component Props**: Toggle Ionic button variants (`fill="outline"`, `expand="block"`, `shape="round"`, `slot="start"`).
  - **CSS Custom Properties**: Direct visual editing of `--background`, `--color`, `--border-radius`, `--padding-start`, etc.
  - **Visual Box Model**: Interactive margin and padding diagram with real-time numeric inputs.
  - **Flexbox / Grid Layout**: Visual controls for direction, align, justify, and gap.
- **🧩 Ionic Component Catalog**:
  - Quick palette of essential Ionic components (`<ion-card>`, `<ion-button>`, `<ion-item>`, `<ion-list>`, `<ion-badge>`, `<ion-chip>`, `<ion-searchbar>`, `<ion-toggle>`).
  - 1-click copy snippet or stage component insertion.
- **🎯 Intelligent Source Locator & Template Matcher**:
  - Scans your project's `src/app/**/*.html` and `.scss` files.
  - Accurately matches any clicked DOM element back to its source template line, preserving Angular directives (`*ngIf`, `*ngFor`, `@if`, `@for`, `(click)`, `[bindings]`).
- **🤖 Multi-Provider LLM Integration**:
  - **Google Gemini API**: Native support for Gemini 2.5/2.0/1.5 models with custom API keys.
  - **OpenCode Service**: Connects to a running OpenCode V2 service through its native REST API.
  - **Antigravity / Clipboard Export**: Generates pre-formatted markdown prompts ready to paste directly into Antigravity or your AI chat.
- **📝 Monaco Diff Review & 1-Click Apply**:
  - Side-by-side Monaco diff editor showing exact changes to `.html` templates and `.scss` stylesheets before committing.
  - "Apply Changes to Project" safely writes changes to disk and triggers instant Angular Hot Module Replacement (HMR).

---

## 🛠️ Quick Start

### 1. Install & Build
```bash
# In the MobileLayout directory
npm install
npm run build:bridge
```

### 2. Start MobileLayout Studio
```bash
# Starts the backend server (port 3300) and target proxy (port 3301)
npm run dev:server
```

### 3. Start the Studio UI
```bash
npm run dev:studio
```
Open your browser to `http://localhost:3300` (or `http://localhost:5173`).

---

## 🔗 Connecting Your Angular / Ionic Project

1. Start your Angular / Ionic project as normal in your terminal:
   ```bash
   # In your project folder:
   ionic serve
   # (Runs on http://localhost:8100)
   ```
2. In MobileLayout Studio, click the **Settings** (⚙️) icon in the top right navbar.
3. Configure:
   - **Target Dev Server URL**: `http://localhost:8100`
   - **Project Source Folder**: Absolute path to your project (e.g. `C:\Users\YourName\Documents\MyIonicApp`).
   - **LLM Engine**: Select **Gemini** (and enter your API key) or **OpenCode** with the service URL `http://localhost:4096`.
4. Click **Save & Connect**.
5. Your live app will now render inside the mobile device canvas on the screen!

### Using the OpenCode service

1. Start an OpenCode V2 service: run `opencode serve --service`, or use the managed background service.
2. Set your provider and model in `opencode.json` (for example, provider `anthropic`, model `claude-sonnet-4`).
3. In Studio Settings, select **OpenCode** and use service URL `http://localhost:4096` (add an optional Bearer token for a remote service). Set **Model Name** to `providerID/model`, e.g. `anthropic/claude-sonnet-4`, or leave it blank to use OpenCode's configured default.
4. OpenCode only generates text: MobileLayout turns it into a `.html`/`.scss` diff for review in Monaco and applies it to your files only when you click **Apply Changes to Project**. OpenCode never edits your files directly.

---

## 🎨 Workflow: Designing & Generating Code

1. **Inspect Element**: Ensure the **Inspect UI** button in the navbar is active. Hover over any element in the mobile canvas and click to select it.
2. **Visual Tweaks**: In the right sidebar, adjust Ionic attributes, colors, margins, padding, or layout. The canvas updates instantly with a live visual preview.
3. **Queue Changes**: All visual adjustments are staged automatically. Click the **Changes** button in the navbar to open the Staging Drawer.
4. **Add Design Intent (Optional)**: Type any extra natural language instructions (e.g., *"Make this card look like a sleek Apple Wallet card with secondary color outline"*).
5. **Generate Code**:
   - Click **Generate Code Changes** to have Gemini or OpenCode produce the exact `.html` and `.scss` diff.
   - Or click **Copy Prompt for Antigravity** to paste the formatted context directly into Antigravity.
6. **Review & Apply**:
   - In the Monaco Diff viewer, inspect the proposed changes side-by-side with your original code.
   - Click **Apply Changes to Project** to write the changes directly to your files.
   - Your running Angular/Ionic app immediately reloads via HMR!

---

## 🔌 MCP Integration (AI Agent Access)

MobileLayout Studio exposes its inspection and generation capabilities over MCP at `POST /mcp` (JSON-RPC). The standalone `@mobile-layout/mcp` package forwards `tools/call` to that endpoint over stdio. Available tools:

- `mobile_layout_status` — live Studio / proxy / device status
- `mobile_layout_get_element` — inspect the selected canvas element
- `mobile_layout_apply_style`, `mobile_layout_apply_attribute`, `mobile_layout_update_text`, `mobile_layout_insert_component` — live, canvas-only edits
- `mobile_layout_scan_source` — locate the source `.html` / `.scss` file for an element
- `mobile_layout_run_uiux_audit`, `mobile_layout_set_device`, `mobile_layout_get_llm_logs` — audit, device and telemetry
- **`mobile_layout_generate_patch`** — send a natural-language `userIntent` to the configured OpenCode service and receive an HTML/SCSS **diff for review**
- `mobile_layout_apply_source_patch` — write reviewed changes to disk (triggers HMR)

### Review-then-apply workflow

`mobile_layout_generate_patch` is read-only. It builds a `PromptContext` from `userIntent` and the optional inputs (`htmlFilePath`, `scssFilePath`, `matchedSnippet`, `fullHtmlContent`, `fullScssContent`, `visualChanges`). When the full content is omitted it is read from disk under the configured project root, and any path that escapes that root is refused. The tool calls OpenCode and returns `{ explanation, htmlDiff, scssDiff, updatedHtmlContent?, updatedScssContent? }` as MCP text content — it **never writes a project file**. Review the diff first, then pass the updated content to `mobile_layout_apply_source_patch` (or click **Apply Changes to Project** in the Studio) to persist it and trigger HMR.

---

## 📂 Project Structure

```
MobileLayout/
├── packages/
│   ├── bridge/             # Injected client-side inspector script
│   │   ├── src/
│   │   │   ├── inspector.ts# DOM hover/selection overlay, style extraction
│   │   │   └── index.ts    # Auto-initialization entrypoint
│   │   └── package.json
│   ├── server/             # Node.js Express backend & proxy
│   │   ├── src/
│   │   │   ├── proxy.ts    # Dev proxy & HTML script injector (port 3301)
│   │   │   ├── scanner.ts  # Angular template matcher & AST locator
│   │   │   ├── patcher.ts  # Safe file writing & diff generation
│   │   │   ├── llm/        # Gemini, OpenCode & prompt synthesizers
│   │   │   ├── routes.ts   # REST API endpoints
│   │   │   └── index.ts    # Express server entry (port 3300)
│   │   └── package.json
│   └── studio/             # Studio Frontend (Vite + React + TailwindCSS)
│       ├── src/
│       │   ├── components/ # Canvas, Inspector, Palette, Staging, DiffModal
│       │   ├── App.tsx     # State orchestration & postMessage bridge
│       │   └── index.css
│       └── package.json
└── tests/                  # Automated unit & integration tests
    ├── fixtures/           # Sample Ionic/Angular app fixture
    └── run-tests.ts        # Node test suite runner
```

---

## 🛡️ License
MIT

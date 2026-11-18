# MobileLayout MCP Server for OpenCode & AI Assistants

The **MobileLayout Model Context Protocol (MCP)** server allows **OpenCode**, Claude, Cursor, and other AI coding assistants to directly inspect, visually edit, audit, and patch mobile Angular/Ionic & Capacitor applications in real-time.

---

## ⚡ Quick Start: Connect to OpenCode

OpenCode supports both **Remote Streamable HTTP** (recommended when MobileLayout server is running) and **Local Stdio**.

### Method 1: Remote HTTP (Recommended)
With the MobileLayout dev server running on port `3300`:
```bash
opencode mcp add --url http://localhost:3300/mcp mobile-layout
```

Verify connection:
```bash
opencode mcp list
# Output:
# ✓ mobile-layout  connected
```

This creates or updates `opencode.json`:
```json
{
  "mcp": {
    "servers": {
      "mobile-layout": {
        "type": "remote",
        "url": "http://localhost:3300/mcp"
      }
    }
  }
}
```

### Method 2: Local Stdio Command
If running OpenCode against the local Node script directly:
```bash
opencode mcp add mobile-layout -- node C:\Users\SENA\Documents\MobileLayout\packages\mcp\dist\index.js
```

---

## 🛠️ Available MCP Tools

| Tool Name | Description |
| :--- | :--- |
| `mobile_layout_status` | Retrieve live status of MobileLayout Studio, active target app URL, proxy port, active device, and staged changes. |
| `mobile_layout_get_element` | Get detailed DOM element details (computed styles, tag, attributes, box model, safe-area insets, and layout warnings). |
| `mobile_layout_apply_style` | Apply live CSS styles to any element in the mobile preview canvas (e.g. `minHeight="48px"`, `paddingTop="47px"`). |
| `mobile_layout_apply_attribute` | Modify or set HTML attributes on elements (e.g. `color="primary"`, `fill="outline"`, `expand="block"`). |
| `mobile_layout_update_text` | Edit live text content (button labels, headers, descriptions) on the mobile screen. |
| `mobile_layout_insert_component` | Insert Ionic components or premade templates (Auth, Profile, E-Commerce, etc.) into the mobile DOM. |
| `mobile_layout_scan_source` | Scan Angular project files on disk to find the exact `.html` / `.scss` template and line number. |
| `mobile_layout_apply_source_patch` | Write verified code changes directly to `.html` or `.scss` files on disk with automated backups. |
| `mobile_layout_run_uiux_audit` | Run screen-wide mobile UX heuristics (Touch targets < 44px, Safe Area insets, WCAG contrast, Ionic semantics) and return score (0-100). |
| `mobile_layout_set_device` | Switch mobile viewport preset (e.g. `pixel-8-pro`, `galaxy-s24-ultra`, `galaxy-s23`, `iphone-15`, `z-fold-5-open`). |
| `mobile_layout_get_llm_logs` | Fetch telemetry logs of recent code generation calls, latencies, and raw prompts/responses. |

---

## 💡 Example Prompt for OpenCode

Once connected in OpenCode, you can instruct OpenCode naturally:

```bash
opencode run "Check the mobile layout status and inspect the active element. If it has any safe area or touch target issues, apply a quick fix and update the Angular source file."
```

OpenCode will:
1. Call `mobile_layout_status` and `mobile_layout_get_element`.
2. Discover touch target or safe area warnings.
3. Call `mobile_layout_apply_style` to fix it visually on the mobile screen.
4. Call `mobile_layout_scan_source` to locate the Angular component file.
5. Call `mobile_layout_apply_source_patch` to persist the code change to disk!

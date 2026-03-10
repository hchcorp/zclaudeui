# Zak-UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web dashboard where users create action buttons that run Claude Code autonomously, with polished streaming output.

**Architecture:** Express backend (port 6970) serves React frontend and exposes REST + SSE APIs. The Agent SDK (`@anthropic-ai/claude-agent-sdk`) runs Claude Code with `bypassPermissions`. Button configs stored in a JSON file.

**Tech Stack:** Node.js 25, TypeScript, Express, Vite, React, @anthropic-ai/claude-agent-sdk, SSE

---

## Project Structure

```
zak-ui/
├── package.json
├── tsconfig.json
├── tsconfig.server.json
├── vite.config.ts
├── index.html                  ← Vite entry
├── data/
│   └── buttons.json            ← button configs (persisted)
├── server/
│   ├── index.ts                ← Express app, serves API + static
│   ├── routes/
│   │   ├── buttons.ts          ← CRUD endpoints
│   │   └── run.ts              ← execution + SSE stream
│   └── services/
│       └── agent.ts            ← Agent SDK wrapper
├── src/                        ← React frontend
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css
│   ├── components/
│   │   ├── ButtonGrid.tsx
│   │   ├── ButtonCard.tsx
│   │   ├── CreateButtonModal.tsx
│   │   └── ExecutionPanel.tsx
│   └── hooks/
│       └── useExecution.ts     ← SSE hook
└── docs/plans/
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.server.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `.gitignore`

**Step 1: Initialize package.json**

```bash
cd ~/zak-ui
npm init -y
```

Then edit `package.json`:
```json
{
  "name": "zak-ui",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "tsx watch server/index.ts",
    "dev:client": "vite",
    "build": "vite build",
    "start": "NODE_ENV=production tsx server/index.ts"
  }
}
```

**Step 2: Install dependencies**

```bash
npm install express @anthropic-ai/claude-agent-sdk uuid
npm install -D typescript @types/express @types/node @types/uuid tsx vite @vitejs/plugin-react react react-dom @types/react @types/react-dom concurrently
```

**Step 3: Create tsconfig.json (frontend)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": { "~/*": ["src/*"] }
  },
  "include": ["src/**/*", "vite-env.d.ts"],
  "exclude": ["node_modules", "dist", "server"]
}
```

**Step 4: Create tsconfig.server.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist-server",
    "rootDir": "."
  },
  "include": ["server/**/*"]
}
```

**Step 5: Create vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 6971,
    proxy: {
      "/api": "http://localhost:6970",
    },
  },
  build: {
    outDir: "dist",
  },
});
```

**Step 6: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Zak-UI</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 7: Create .gitignore**

```
node_modules/
dist/
dist-server/
*.log
```

**Step 8: Create data/buttons.json with default button**

```json
[
  {
    "id": "fix-openclaw",
    "name": "Fix OpenClaw",
    "prompt": "check openclaw and fix if needed",
    "cwd": "/home/openclaw",
    "color": "#4F46E5",
    "icon": "wrench",
    "createdAt": "2026-03-10T00:00:00Z"
  }
]
```

**Step 9: Commit**

```bash
git add -A && git commit -m "feat: project scaffolding"
```

---

### Task 2: Backend — Express Server + Button CRUD

**Files:**
- Create: `server/index.ts`
- Create: `server/routes/buttons.ts`

**Step 1: Create server/index.ts**

```typescript
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { buttonsRouter } from "./routes/buttons.js";
import { runRouter } from "./routes/run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 6970;

app.use(express.json());

// API routes
app.use("/api/buttons", buttonsRouter);
app.use("/api/run", runRouter);

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Zak-UI server running on http://0.0.0.0:${PORT}`);
});
```

**Step 2: Create server/routes/buttons.ts**

```typescript
import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "..", "..", "data", "buttons.json");

export interface ButtonConfig {
  id: string;
  name: string;
  prompt: string;
  cwd: string;
  color: string;
  icon: string;
  createdAt: string;
}

function readButtons(): ButtonConfig[] {
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw);
}

function writeButtons(buttons: ButtonConfig[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(buttons, null, 2));
}

export const buttonsRouter = Router();

buttonsRouter.get("/", (_req, res) => {
  res.json(readButtons());
});

buttonsRouter.post("/", (req, res) => {
  const buttons = readButtons();
  const newButton: ButtonConfig = {
    id: uuidv4(),
    name: req.body.name,
    prompt: req.body.prompt,
    cwd: req.body.cwd || "/home/openclaw",
    color: req.body.color || "#4F46E5",
    icon: req.body.icon || "play",
    createdAt: new Date().toISOString(),
  };
  buttons.push(newButton);
  writeButtons(buttons);
  res.status(201).json(newButton);
});

buttonsRouter.put("/:id", (req, res) => {
  const buttons = readButtons();
  const idx = buttons.findIndex((b) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  buttons[idx] = { ...buttons[idx], ...req.body, id: req.params.id };
  writeButtons(buttons);
  res.json(buttons[idx]);
});

buttonsRouter.delete("/:id", (req, res) => {
  let buttons = readButtons();
  buttons = buttons.filter((b) => b.id !== req.params.id);
  writeButtons(buttons);
  res.status(204).end();
});
```

**Step 3: Verify server starts**

```bash
cd ~/zak-ui && npx tsx server/index.ts
```

Expected: "Zak-UI server running on http://0.0.0.0:6970" (will error on missing run router — that's fine, stop with Ctrl+C)

**Step 4: Commit**

```bash
git add server/ && git commit -m "feat: Express server + button CRUD API"
```

---

### Task 3: Backend — Agent SDK Execution + SSE

**Files:**
- Create: `server/services/agent.ts`
- Create: `server/routes/run.ts`

**Step 1: Create server/services/agent.ts**

This wraps the Agent SDK and emits events via a callback.

```typescript
import { query, ClaudeAgentOptions } from "@anthropic-ai/claude-agent-sdk";

export interface ActivityEvent {
  type: "tool_call" | "thinking" | "text";
  tool?: string;
  summary: string;
  timestamp: string;
}

export interface ExecutionCallbacks {
  onActivity: (event: ActivityEvent) => void;
  onResult: (text: string, stopReason: string) => void;
  onError: (message: string) => void;
  onDone: () => void;
}

function summarizeToolCall(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case "Bash": {
      const cmd = String(input.command || "").slice(0, 80);
      return `Ran: ${cmd}${String(input.command || "").length > 80 ? "..." : ""}`;
    }
    case "Read":
      return `Read ${input.file_path || "file"}`;
    case "Edit":
      return `Edited ${input.file_path || "file"}`;
    case "Write":
      return `Created ${input.file_path || "file"}`;
    case "Glob":
      return `Searched for ${input.pattern || "files"}`;
    case "Grep":
      return `Searched content: ${input.pattern || "pattern"}`;
    case "WebSearch":
      return `Web search: ${input.query || ""}`;
    case "WebFetch":
      return `Fetched: ${input.url || "page"}`;
    default:
      return `${toolName}`;
  }
}

export async function executeButton(
  prompt: string,
  cwd: string,
  callbacks: ExecutionCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  try {
    for await (const message of query({
      prompt,
      options: {
        cwd,
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep", "WebFetch", "WebSearch"],
        maxTurns: 50,
      },
    })) {
      if (signal?.aborted) break;

      // Handle different message types
      if ("result" in message) {
        callbacks.onResult(message.result || "", message.stop_reason || "end_turn");
      } else if (message.type === "assistant") {
        for (const block of (message as any).content || []) {
          if (block.type === "tool_use") {
            callbacks.onActivity({
              type: "tool_call",
              tool: block.name,
              summary: summarizeToolCall(block.name, block.input || {}),
              timestamp: new Date().toISOString(),
            });
          } else if (block.type === "text" && block.text) {
            callbacks.onActivity({
              type: "text",
              summary: block.text.slice(0, 200),
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    }
    callbacks.onDone();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    callbacks.onError(msg);
    callbacks.onDone();
  }
}
```

**Step 2: Create server/routes/run.ts**

```typescript
import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { executeButton } from "../services/agent.js";
import type { ButtonConfig } from "./buttons.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "..", "..", "data", "buttons.json");

// Track active runs
const activeRuns = new Map<string, AbortController>();

export const runRouter = Router();

// Start execution — returns immediately, client connects via SSE
runRouter.get("/:buttonId", (req, res) => {
  const buttons: ButtonConfig[] = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  const button = buttons.find((b) => b.id === req.params.buttonId);

  if (!button) {
    return res.status(404).json({ error: "Button not found" });
  }

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const abortController = new AbortController();
  const runId = button.id + "-" + Date.now();
  activeRuns.set(runId, abortController);

  sendEvent("started", { runId, buttonName: button.name });

  executeButton(button.prompt, button.cwd, {
    onActivity: (event) => sendEvent("activity", event),
    onResult: (text, stopReason) => sendEvent("result", { text, stopReason }),
    onError: (message) => sendEvent("error", { message }),
    onDone: () => {
      sendEvent("done", {});
      activeRuns.delete(runId);
      res.end();
    },
  }, abortController.signal);

  req.on("close", () => {
    abortController.abort();
    activeRuns.delete(runId);
  });
});

// Stop active run
runRouter.post("/stop/:runId", (req, res) => {
  const controller = activeRuns.get(req.params.runId);
  if (controller) {
    controller.abort();
    activeRuns.delete(req.params.runId);
    res.json({ stopped: true });
  } else {
    res.status(404).json({ error: "Run not found" });
  }
});
```

**Step 3: Verify server starts cleanly**

```bash
cd ~/zak-ui && npx tsx server/index.ts
# Should print: Zak-UI server running on http://0.0.0.0:6970
# Ctrl+C to stop
```

**Step 4: Commit**

```bash
git add server/ && git commit -m "feat: Agent SDK execution engine + SSE streaming"
```

---

### Task 4: Frontend — React App Shell

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/App.css`
- Create: `src/vite-env.d.ts`

**Step 1: Create src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />
```

**Step 2: Create src/main.tsx**

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

**Step 3: Create src/App.css**

Full CSS for the dashboard — polished, dark theme, Inter font:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg: #0f1117;
  --surface: #1a1d27;
  --surface-hover: #22253a;
  --border: #2a2d3e;
  --text: #e4e4e7;
  --text-muted: #71717a;
  --accent: #4F46E5;
  --accent-hover: #4338CA;
  --success: #22c55e;
  --error: #ef4444;
  --warning: #f59e0b;
  --radius: 12px;
  --radius-sm: 8px;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
}

.header h1 {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* Button Grid */
.button-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

/* Button Card */
.button-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  overflow: hidden;
}

.button-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}

.button-card:hover {
  background: var(--surface-hover);
  border-color: var(--text-muted);
  transform: translateY(-1px);
}

.button-card.running {
  border-color: var(--accent);
  box-shadow: 0 0 20px rgba(79, 70, 229, 0.15);
}

.button-card .icon {
  font-size: 24px;
  margin-bottom: 12px;
}

.button-card .name {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}

.button-card .prompt-preview {
  font-size: 13px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.button-card .actions {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.15s;
}

.button-card:hover .actions {
  opacity: 1;
}

.button-card .delete-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  font-size: 14px;
}

.button-card .delete-btn:hover {
  color: var(--error);
  background: rgba(239, 68, 68, 0.1);
}

/* Add Button Card */
.add-card {
  background: transparent;
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 20px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  transition: all 0.15s ease;
  color: var(--text-muted);
}

.add-card:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.add-card .plus {
  font-size: 28px;
  font-weight: 300;
  margin-bottom: 4px;
}

.add-card span {
  font-size: 13px;
  font-weight: 500;
}

/* Execution Panel */
.execution-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.execution-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.execution-header .title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 15px;
}

.execution-header .stop-btn {
  background: var(--error);
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.execution-header .stop-btn:hover {
  opacity: 0.9;
}

/* Result Card */
.result-card {
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.result-card.success {
  border-left: 3px solid var(--success);
}

.result-card.error {
  border-left: 3px solid var(--error);
}

.result-card pre {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Activity Log */
.activity-toggle {
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
}

.activity-toggle:hover {
  color: var(--text);
}

.activity-list {
  padding: 0 20px 16px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0;
  font-size: 13px;
  color: var(--text-muted);
  border-bottom: 1px solid rgba(42, 45, 62, 0.5);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-item .tool-badge {
  background: rgba(79, 70, 229, 0.15);
  color: var(--accent);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.activity-item .summary {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 28px;
  width: 480px;
  max-width: 90vw;
}

.modal h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
}

.modal .field {
  margin-bottom: 16px;
}

.modal label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.modal input,
.modal textarea {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.modal input:focus,
.modal textarea:focus {
  border-color: var(--accent);
}

.modal textarea {
  min-height: 80px;
  resize: vertical;
}

.color-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}

.color-swatch:hover {
  transform: scale(1.1);
}

.color-swatch.selected {
  border-color: white;
  box-shadow: 0 0 0 2px var(--bg);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}

.btn {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.btn-primary {
  background: var(--accent);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-secondary {
  background: var(--surface-hover);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--border);
}
```

**Step 4: Create src/App.tsx**

```typescript
import { useState, useCallback } from "react";
import { ButtonGrid } from "./components/ButtonGrid";
import { CreateButtonModal } from "./components/CreateButtonModal";
import { ExecutionPanel } from "./components/ExecutionPanel";
import { useExecution } from "./hooks/useExecution";

export interface ButtonConfig {
  id: string;
  name: string;
  prompt: string;
  cwd: string;
  color: string;
  icon: string;
  createdAt: string;
}

export default function App() {
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const execution = useExecution();

  const loadButtons = useCallback(async () => {
    const res = await fetch("/api/buttons");
    setButtons(await res.json());
    setLoaded(true);
  }, []);

  if (!loaded) {
    loadButtons();
  }

  const handleRun = (button: ButtonConfig) => {
    execution.start(button);
  };

  const handleCreate = async (data: Omit<ButtonConfig, "id" | "createdAt">) => {
    const res = await fetch("/api/buttons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const newButton = await res.json();
    setButtons((prev) => [...prev, newButton]);
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/buttons/${id}`, { method: "DELETE" });
    setButtons((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Zak-UI</h1>
      </header>

      <ButtonGrid
        buttons={buttons}
        onRun={handleRun}
        onDelete={handleDelete}
        onAdd={() => setShowModal(true)}
        runningId={execution.runningButtonId}
      />

      {execution.isActive && <ExecutionPanel execution={execution} />}

      {showModal && (
        <CreateButtonModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add src/ index.html && git commit -m "feat: React app shell + global styles"
```

---

### Task 5: Frontend — Components

**Files:**
- Create: `src/components/ButtonGrid.tsx`
- Create: `src/components/ButtonCard.tsx`
- Create: `src/components/CreateButtonModal.tsx`
- Create: `src/components/ExecutionPanel.tsx`

**Step 1: Create src/components/ButtonCard.tsx**

```typescript
import type { ButtonConfig } from "../App";

const ICONS: Record<string, string> = {
  wrench: "\u{1F527}",
  play: "\u{25B6}\u{FE0F}",
  rocket: "\u{1F680}",
  chart: "\u{1F4CA}",
  shield: "\u{1F6E1}\u{FE0F}",
  search: "\u{1F50D}",
  gear: "\u{2699}\u{FE0F}",
  bolt: "\u{26A1}",
  globe: "\u{1F310}",
  clipboard: "\u{1F4CB}",
};

interface Props {
  button: ButtonConfig;
  onRun: () => void;
  onDelete: () => void;
  isRunning: boolean;
}

export function ButtonCard({ button, onRun, onDelete, isRunning }: Props) {
  return (
    <div
      className={`button-card ${isRunning ? "running" : ""}`}
      style={{ "--accent-color": button.color } as React.CSSProperties}
      onClick={onRun}
    >
      <style>{`.button-card[style*="${button.color}"]::before { background: ${button.color}; }`}</style>
      <div className="actions">
        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          ✕
        </button>
      </div>
      <div className="icon">{ICONS[button.icon] || ICONS.play}</div>
      <div className="name">{button.name}</div>
      <div className="prompt-preview">{button.prompt}</div>
    </div>
  );
}
```

**Step 2: Create src/components/ButtonGrid.tsx**

```typescript
import type { ButtonConfig } from "../App";
import { ButtonCard } from "./ButtonCard";

interface Props {
  buttons: ButtonConfig[];
  onRun: (button: ButtonConfig) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  runningId: string | null;
}

export function ButtonGrid({ buttons, onRun, onDelete, onAdd, runningId }: Props) {
  return (
    <div className="button-grid">
      {buttons.map((btn) => (
        <ButtonCard
          key={btn.id}
          button={btn}
          onRun={() => onRun(btn)}
          onDelete={() => onDelete(btn.id)}
          isRunning={runningId === btn.id}
        />
      ))}
      <div className="add-card" onClick={onAdd}>
        <div className="plus">+</div>
        <span>New Action</span>
      </div>
    </div>
  );
}
```

**Step 3: Create src/components/CreateButtonModal.tsx**

```typescript
import { useState } from "react";
import type { ButtonConfig } from "../App";

const COLORS = [
  "#4F46E5", "#7C3AED", "#EC4899", "#EF4444",
  "#F59E0B", "#22C55E", "#06B6D4", "#3B82F6",
];

const ICONS = [
  { id: "wrench", label: "\u{1F527}" },
  { id: "play", label: "\u{25B6}\u{FE0F}" },
  { id: "rocket", label: "\u{1F680}" },
  { id: "chart", label: "\u{1F4CA}" },
  { id: "shield", label: "\u{1F6E1}\u{FE0F}" },
  { id: "search", label: "\u{1F50D}" },
  { id: "gear", label: "\u{2699}\u{FE0F}" },
  { id: "bolt", label: "\u{26A1}" },
  { id: "globe", label: "\u{1F310}" },
  { id: "clipboard", label: "\u{1F4CB}" },
];

interface Props {
  onClose: () => void;
  onCreate: (data: Omit<ButtonConfig, "id" | "createdAt">) => void;
}

export function CreateButtonModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [cwd, setCwd] = useState("/home/openclaw");
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState("play");

  const handleSubmit = () => {
    if (!name.trim() || !prompt.trim()) return;
    onCreate({ name: name.trim(), prompt: prompt.trim(), cwd, color, icon });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>New Action Button</h2>

        <div className="field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fix OpenClaw" autoFocus />
        </div>

        <div className="field">
          <label>Prompt (what Claude should do)</label>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. check openclaw and fix if needed" />
        </div>

        <div className="field">
          <label>Working Directory</label>
          <input value={cwd} onChange={(e) => setCwd(e.target.value)} />
        </div>

        <div className="field">
          <label>Color</label>
          <div className="color-picker">
            {COLORS.map((c) => (
              <div
                key={c}
                className={`color-swatch ${color === c ? "selected" : ""}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <label>Icon</label>
          <div className="color-picker">
            {ICONS.map((ic) => (
              <div
                key={ic.id}
                className={`color-swatch ${icon === ic.id ? "selected" : ""}`}
                style={{ background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}
                onClick={() => setIcon(ic.id)}
              >
                {ic.label}
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!name.trim() || !prompt.trim()}>Create</button>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Create src/components/ExecutionPanel.tsx**

```typescript
import { useState } from "react";
import type { ExecutionState } from "../hooks/useExecution";

interface Props {
  execution: ExecutionState;
}

export function ExecutionPanel({ execution }: Props) {
  const [showActivity, setShowActivity] = useState(true);

  return (
    <div className="execution-panel">
      <div className="execution-header">
        <div className="title">
          {execution.status === "running" && <div className="spinner" />}
          {execution.status === "running" ? `Running: ${execution.buttonName}` : `Completed: ${execution.buttonName}`}
        </div>
        {execution.status === "running" && (
          <button className="stop-btn" onClick={execution.stop}>Stop</button>
        )}
      </div>

      {execution.result && (
        <div className={`result-card ${execution.error ? "error" : "success"}`}>
          <pre>{execution.result}</pre>
        </div>
      )}

      {execution.error && (
        <div className="result-card error">
          <pre>{execution.error}</pre>
        </div>
      )}

      {execution.activities.length > 0 && (
        <>
          <button className="activity-toggle" onClick={() => setShowActivity(!showActivity)}>
            {showActivity ? "▾" : "▸"} Activity ({execution.activities.length} steps)
          </button>
          {showActivity && (
            <div className="activity-list">
              {execution.activities.map((a, i) => (
                <div key={i} className="activity-item">
                  {a.tool && <span className="tool-badge">{a.tool}</span>}
                  <span className="summary">{a.summary}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add src/components/ && git commit -m "feat: all frontend components"
```

---

### Task 6: Frontend — SSE Hook

**Files:**
- Create: `src/hooks/useExecution.ts`

**Step 1: Create the hook**

```typescript
import { useState, useCallback, useRef } from "react";
import type { ButtonConfig } from "../App";

export interface ActivityItem {
  type: "tool_call" | "thinking" | "text";
  tool?: string;
  summary: string;
  timestamp: string;
}

export interface ExecutionState {
  isActive: boolean;
  status: "idle" | "running" | "done" | "error";
  runningButtonId: string | null;
  buttonName: string;
  activities: ActivityItem[];
  result: string | null;
  error: string | null;
  start: (button: ButtonConfig) => void;
  stop: () => void;
  dismiss: () => void;
}

export function useExecution(): ExecutionState {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [buttonId, setButtonId] = useState<string | null>(null);
  const [buttonName, setButtonName] = useState("");
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const start = useCallback((button: ButtonConfig) => {
    // Close existing connection
    eventSourceRef.current?.close();

    setStatus("running");
    setButtonId(button.id);
    setButtonName(button.name);
    setActivities([]);
    setResult(null);
    setError(null);

    const es = new EventSource(`/api/run/${button.id}`);
    eventSourceRef.current = es;

    es.addEventListener("activity", (e) => {
      const data = JSON.parse(e.data);
      setActivities((prev) => [...prev, data]);
    });

    es.addEventListener("result", (e) => {
      const data = JSON.parse(e.data);
      setResult(data.text);
    });

    es.addEventListener("error", (e) => {
      try {
        const data = JSON.parse(e.data);
        setError(data.message);
      } catch {
        setError("Connection lost");
      }
    });

    es.addEventListener("done", () => {
      setStatus("done");
      es.close();
    });

    es.onerror = () => {
      if (status === "running") {
        setStatus("error");
        setError("Connection to server lost");
      }
      es.close();
    };
  }, []);

  const stop = useCallback(() => {
    eventSourceRef.current?.close();
    setStatus("done");
  }, []);

  const dismiss = useCallback(() => {
    eventSourceRef.current?.close();
    setStatus("idle");
    setButtonId(null);
    setActivities([]);
    setResult(null);
    setError(null);
  }, []);

  return {
    isActive: status !== "idle",
    status,
    runningButtonId: status === "running" ? buttonId : null,
    buttonName,
    activities,
    result,
    error,
    start,
    stop,
    dismiss,
  };
}
```

**Step 2: Commit**

```bash
git add src/hooks/ && git commit -m "feat: SSE execution hook"
```

---

### Task 7: Build + Test End-to-End

**Step 1: Run dev mode**

```bash
cd ~/zak-ui && npm run dev
```

Verify:
- Server on http://localhost:6970
- Vite dev on http://localhost:6971 (proxying /api to 6970)
- Open http://localhost:6971 in browser
- Should see "Fix OpenClaw" button + "New Action" card
- Click "Fix OpenClaw" — should start streaming

**Step 2: Build for production**

```bash
cd ~/zak-ui && npm run build
```

**Step 3: Test production mode**

```bash
cd ~/zak-ui && npm start
```

Open http://100.105.79.38:6970 via Tailscale — should serve the built app.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: complete Zak-UI v1"
```

---

### Task 8: PM2 Production Setup

**Step 1: Register with PM2**

```bash
cd ~/zak-ui
~/.nvm/versions/node/v25.6.1/bin/pm2 start "npm start" --name zak-ui
~/.nvm/versions/node/v25.6.1/bin/pm2 save
```

**Step 2: Verify**

```bash
~/.nvm/versions/node/v25.6.1/bin/pm2 list
curl -s -o /dev/null -w '%{http_code}' http://localhost:6970
```

Expected: PM2 shows `zak-ui` as online, curl returns 200.

---

## Summary

| Task | Description | Estimated Size |
|------|-------------|----------------|
| 1 | Project scaffolding | ~10 files |
| 2 | Express server + button CRUD | 2 files |
| 3 | Agent SDK execution + SSE | 2 files |
| 4 | React app shell + CSS | 4 files |
| 5 | All frontend components | 4 files |
| 6 | SSE execution hook | 1 file |
| 7 | Build + test E2E | 0 files (integration) |
| 8 | PM2 production setup | 0 files (infra) |

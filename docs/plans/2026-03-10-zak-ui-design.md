# Zak-UI — Claude Action Dashboard

## Overview
Web dashboard with customizable action buttons that run Claude Code autonomously via the Agent SDK. Output displayed in a polished, non-technical format with live activity streaming.

## Architecture

```
React Frontend (Vite, port 3111)
  ↕ REST API + SSE stream
Express Backend (Node.js/TS, port 3110)
  ↓
@anthropic-ai/claude-agent-sdk
  ↓
Claude Code CLI (bypassPermissions)
```

## Tech Stack
- **Frontend:** Vite + React + TypeScript, hand-crafted CSS (no UI framework)
- **Backend:** Express + TypeScript, claude-agent-sdk
- **Streaming:** Server-Sent Events (SSE)
- **Storage:** `data/buttons.json` for button configs
- **Access:** Tailscale (like FAD dashboard)

## API Endpoints

### Buttons CRUD
- `GET /api/buttons` — list all buttons
- `POST /api/buttons` — create button
- `PUT /api/buttons/:id` — update button
- `DELETE /api/buttons/:id` — delete button

### Execution
- `POST /api/run/:id` — start execution, returns `runId`
- `GET /api/run/:runId/stream` — SSE stream of execution events

### SSE Event Types
```
event: activity
data: {"type": "tool_call", "tool": "Bash", "summary": "Checked gateway status"}

event: activity
data: {"type": "thinking", "summary": "Analyzing cron job configs..."}

event: result
data: {"text": "OpenClaw is healthy. 9 cron jobs fixed.", "stopReason": "end_turn"}

event: error
data: {"message": "Claude Code CLI not found"}

event: done
data: {}
```

## Button Schema
```json
{
  "id": "uuid",
  "name": "Fix OpenClaw",
  "prompt": "check openclaw and fix if needed",
  "cwd": "/home/openclaw",
  "color": "#4F46E5",
  "icon": "wrench",
  "createdAt": "2026-03-10T00:00:00Z"
}
```

## Frontend Layout

### Button Grid
- Cards in a responsive grid (auto-fill, min 200px)
- Each card: icon, name, color accent, play button
- [+] button opens creation modal
- Right-click or long-press for edit/delete

### Creation Modal
- Name (text input)
- Prompt (textarea)
- Working directory (text input, default: ~/)
- Color picker (preset palette)
- Icon selector (small icon set)

### Execution Panel
- Appears below button grid when a button is running
- **Result section** (top, prominent): final answer in a clean card
- **Live Activity** (collapsible): scrolling list of tool calls with friendly summaries
- Progress indicator while running
- Only one execution at a time

## Agent SDK Configuration
```typescript
query({
  prompt: button.prompt,
  options: {
    cwd: button.cwd,
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep", "WebFetch", "WebSearch"],
    maxTurns: 30,
  },
})
```

## Output Processing
- Tool calls → friendly one-line summaries (e.g., "Bash: systemctl status" → "Checked gateway status")
- AssistantMessage text blocks → accumulated for final result
- ResultMessage → displayed as the final answer
- Errors → displayed in error card with retry option

## Default Button (pre-loaded)
```json
{
  "id": "fix-openclaw",
  "name": "Fix OpenClaw",
  "prompt": "check openclaw and fix if needed",
  "cwd": "/home/openclaw",
  "color": "#4F46E5",
  "icon": "wrench"
}
```

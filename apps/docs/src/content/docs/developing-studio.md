---
title: Developing the studio
description: Commands to run desktop, API, UI, and UI+API modes
---

Quester Studio can run as a **desktop app**, an **HTTP API**, or a **browser UI** talking to that API. Shared editor code uses a `QuesterClient`; only the transport changes (Electrobun RPC vs HTTP JSON + SSE).

Full debug guide: [DEBUGGING.md](https://github.com/9paradox/quester-studio/blob/main/DEBUGGING.md).

## Prerequisites

```bash
bun install
bun run build:pkgs
```

## Command cheat sheet

| Mode | Command(s) | URL / window |
|------|------------|--------------|
| **Desktop** (UI + desktop backend) | `bun run --filter @quester-studio/desktop dev` | Electrobun app |
| **Desktop + UI HMR** | `bun run --filter @quester-studio/desktop dev:hmr` | Electrobun + `http://127.0.0.1:5173` |
| **API only** | `bun run --filter @quester-studio/api dev` | `http://127.0.0.1:8787` |
| **UI only (mock)** | `bun run --filter @quester-studio/desktop dev:web:mock` | `http://127.0.0.1:5173` — in-memory fixture |
| **UI only (→ API)** | `bun run --filter @quester-studio/desktop dev:web` | Needs API on `:8787` |
| **UI + API** | Terminal A: API · Terminal B: `dev:web` | UI → API |

### Desktop (UI + Electrobun)

```bash
bun run --filter @quester-studio/desktop dev
# live UI reload:
bun run --filter @quester-studio/desktop dev:hmr
```

### API only

```bash
# optional (PowerShell):
# $env:QUESTER_WORKSPACE_ROOT="examples/sample-workspace"

bun run --filter @quester-studio/api dev
# health: http://127.0.0.1:8787/health
```

### UI only (mock — no API)

```bash
bun run --filter @quester-studio/desktop dev:web:mock
```

In-memory fixture workspace. Good for layout/canvas work. Data resets on refresh.

### UI only (HTTP — API required)

```bash
bun run --filter @quester-studio/desktop dev:web
```

Without the API, workspace load/run will fail — use **mock** or **UI + API**.

### UI + API

```bash
# Terminal A
bun run --filter @quester-studio/api dev

# Terminal B
bun run --filter @quester-studio/desktop dev:web
```

Open `http://127.0.0.1:5173`. Optional: `$env:VITE_QUESTER_API_URL="http://127.0.0.1:8787"`.

### Stop

- Cursor terminal: trash icon (Ctrl+C often fails on Windows)
- Leftovers: `bun run --filter @quester-studio/desktop dev:stop`
- Kill by port: `netstat -ano | findstr ":5173"` then `Stop-Process -Id <PID> -Force`

## Switching backends

| Entry | Client |
|-------|--------|
| `apps/desktop/src/renderer/main.tsx` | Electrobun RPC |
| `apps/desktop/src/renderer/main.web.tsx` | `HttpQuesterClient` |

## Package map

| Package / app | Role |
|---------------|------|
| `@quester-studio/api-contract` | DTOs + `QuesterClient` / HTTP client |
| `@quester-studio/workspace-service` | Workspace FS + execute |
| `apps/api` | HTTP + SSE |
| `apps/desktop` | Electrobun shell + shared React editor |

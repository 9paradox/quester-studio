# Debugging Quester Studio

This guide covers **setup**, **develop**, and **debug** for each studio mode: engine/CLI, desktop (Electrobun), API-only, and UI + HTTP API. Launch configurations live in [`.vscode/launch.json`](.vscode/launch.json).

## Prerequisites

- [Bun](https://bun.sh) 1.3.14 (see root `package.json`)
- **Bun for Visual Studio Code** extension (`oven.bun-vscode`) — recommended in [`.vscode/extensions.json`](.vscode/extensions.json)
- Open the **repository root** as the workspace folder (so `${workspaceFolder}` paths resolve)

Build workspace packages before debugging anything that imports `@quester-studio/engine`, schema, api-contract, or workspace-service:

```bash
bun run build:pkgs
```

Most launch configs run the `build:pkgs` preLaunchTask automatically.

## Quick reference

| Target | VS Code launch config | Source |
|--------|----------------------|--------|
| Any open `*.test.ts` | **Debug Current Test File** | Current editor file |
| Any open `.ts` file | **Debug Current File** | Current editor file |
| `@quester-studio/engine` tests | **Debug Current Test File** | `packages/engine/src/**/*.test.ts` |
| `@quester-studio/cli` | **Debug CLI: validate sample workspace** / **run sample flow** | `packages/cli/src/cli.ts` |
| `@quester-studio/workspace-service` | **Debug Current Test File** | `packages/workspace-service/src/**/*.test.ts` |
| `apps/api` | **Debug API server** | `apps/api/src/index.ts` |
| Desktop main (RPC → workspace-service) | **Desktop: Attach Main Process** | `apps/desktop/src/main/` |
| Desktop main + UI HMR | **Desktop: Attach Main (HMR + DevTools)** | `apps/desktop/src/main/` |
| UI + HTTP API (browser) | **Debug Web UI (API client)** | `apps/desktop` `dev:web` |
| React renderer (Electrobun HMR) | **Debug Desktop Renderer** | `apps/desktop/src/renderer/` |

## Modes at a glance

| Mode | Setup | Develop | Debug |
|------|--------|---------|--------|
| **Desktop** | `bun install` + `bun run build:pkgs` | `bun run --filter @quester-studio/desktop dev` / `dev:hmr` | Attach main + Electrobun DevTools (below) |
| **API only** | Same + optional `QUESTER_WORKSPACE_ROOT` | `bun run --filter @quester-studio/api dev` | **Debug API server** or `bun --inspect-wait` |
| **UI + HTTP API** | Start API, then UI | Terminal A: API; Terminal B: `dev:web` | Chrome DevTools on UI; API launch config on server |
| **CLI / engine** | `bun run build:pkgs` | package scripts / `quester` CLI | Existing engine + CLI sections |

**Switch desktop vs HTTP backend:** the React store uses `getQuesterClient()`. Desktop entry (`main.tsx`) registers `ElectrobunQuesterClient`; web entry (`main.web.tsx`) registers `HttpQuesterClient` (`VITE_QUESTER_API_URL`, default `http://127.0.0.1:8787`).

Flow `http` nodes always run on the **backend** (desktop main or `apps/api`), never in the browser.

## Command cheat sheet

Run from the **repo root**. First time (or after schema/engine changes):

```bash
bun install
bun run build:pkgs
```

PowerShell: use `;` between commands, not `&&`. Stop a hung process with the trash icon on the terminal, or see **Stop** below.

| What you want | Command(s) | Opens |
|---------------|------------|--------|
| **Desktop** (UI + Electrobun backend together) | `bun run --filter @quester-studio/desktop dev` | Electrobun window (bundled UI) |
| **Desktop + live UI HMR** | `bun run --filter @quester-studio/desktop dev:hmr` | Electrobun + Vite `http://127.0.0.1:5173` |
| **API only** | `bun run --filter @quester-studio/api dev` | `http://127.0.0.1:8787` |
| **UI only** (browser SPA, **mock** data) | `bun run --filter @quester-studio/desktop dev:web:mock` | `http://127.0.0.1:5173` — in-memory fixture, no API |
| **UI only** (browser SPA → real API) | `bun run --filter @quester-studio/desktop dev:web` | Needs API on `:8787` |
| **UI + API** | Terminal A: `bun run --filter @quester-studio/api dev`  ·  Terminal B: `bun run --filter @quester-studio/desktop dev:web` | UI → API |

### Copy-paste blocks

**Desktop (UI inside desktop app)**

```bash
bun run build:pkgs
bun run --filter @quester-studio/desktop dev
```

**Desktop with UI hot reload**

```bash
bun run build:pkgs
bun run --filter @quester-studio/desktop dev:hmr
```

**API only**

```bash
bun run build:pkgs
# optional workspace root (PowerShell):
# $env:QUESTER_WORKSPACE_ROOT="H:\Projects\quester\quester-studio\examples\sample-workspace"
bun run --filter @quester-studio/api dev
```

**UI only** (browser; in-memory mock — no API)

```bash
bun run build:pkgs
bun run --filter @quester-studio/desktop dev:web:mock
```

Open sample / default workspace in the UI. Edits and runs stay in memory (lost on refresh). For real workspace data, use **UI + API** instead.

**UI only** (browser → HTTP API — API must be running)

```bash
bun run build:pkgs
bun run --filter @quester-studio/desktop dev:web
```

**UI + API** (two terminals)

```bash
# Terminal A — API
bun run build:pkgs
bun run --filter @quester-studio/api dev

# Terminal B — UI
bun run --filter @quester-studio/desktop dev:web
```

Optional API URL for the UI (default is `http://127.0.0.1:8787`):

```powershell
$env:VITE_QUESTER_API_URL="http://127.0.0.1:8787"
bun run --filter @quester-studio/desktop dev:web
```

### Stop

| Running | How to stop |
|---------|-------------|
| Any `bun` / Vite in Cursor terminal | Trash icon on that terminal (Ctrl+C often fails on Windows) |
| Vite / desktop leftovers | `bun run --filter @quester-studio/desktop dev:stop` |
| Process on port 5173 or 8787 | `netstat -ano \| findstr ":5173"` then `Stop-Process -Id <PID> -Force` |

---

## Engine (`@quester-studio/engine`)

Engine logic lives in `packages/engine/src/`. Tests are colocated as `*.test.ts`.

### Debug a test

1. Open a test file, e.g. `packages/engine/src/execute.test.ts`
2. Set breakpoints in the test or in `execute.ts`, `workspace.ts`, etc.
3. Run **Debug Current Test File** (F5 with that file active)

### Debug implementation directly

1. Open a source file (e.g. `packages/engine/src/execute.ts`)
2. Run **Debug Current File**

If you change `@quester-studio/schema` or `@quester-studio/nodes`, rebuild first:

```bash
bun run build:pkgs
```

### From the terminal

```bash
cd packages/engine
bun test src/execute.test.ts
bun --inspect-wait src/execute.test.ts   # wait for debugger on port 6499, then attach
```

---

## CLI (`@quester-studio/cli`)

Entry point: `packages/cli/src/cli.ts`. Depends on built `@quester-studio/engine`.

### VS Code launch configs

| Config | What it runs |
|--------|----------------|
| **Debug CLI: validate sample workspace** | `quester validate examples/sample-workspace` |
| **Debug CLI: run sample flow** | `quester run` on the sample login-and-profile flow |

Set breakpoints in `packages/cli/src/cli.ts` or in engine code, then start the config from **Run and Debug**.

### Custom CLI arguments

Duplicate a CLI launch entry in `.vscode/launch.json` and change `args`, for example:

```json
"args": ["run", "path/to/flow.flow.json", "--workspace", "path/to/workspace", "--env", "local"]
```

### From the terminal

```bash
bun run build:pkgs
bun --inspect-wait packages/cli/src/cli.ts validate examples/sample-workspace
```

Attach with **Attach to Bun** (`ws://localhost:6499/`) or the VS Code Bun debugger.

---

## Desktop main process

Electrobun main process: `apps/desktop/src/main/index.ts` (window + RPC wiring). Handlers are thin re-exports of `@quester-studio/workspace-service` plus Electrobun-only APIs (folder picker).

### Attach and debug (recommended)

| Config | Dev script | UI source | Use when |
|--------|------------|-----------|----------|
| **Desktop: Attach Main Process** | `dev:debug` | Bundled `views://` assets | Debugging RPC, handlers, flow execution |
| **Desktop: Attach Main (HMR + DevTools)** | `dev:hmr:debug` | Vite dev server (`127.0.0.1:5173`) | Main process + live React HMR |

Both configs:

1. Build packages and start the app with `DEV=1` (DevTools open in the Electrobun window)
2. Wait for the debugger on port **6499**
3. Attach automatically

Set breakpoints in `packages/workspace-service/src/service.ts` or `apps/desktop/src/main/handlers.ts`, then start the config.

### Debug workspace-service / handlers in isolation

**Debug Desktop Handlers** runs `apps/desktop/src/main/index.test.ts` (re-exports service). Prefer `packages/workspace-service/src/**/*.test.ts` with **Debug Current Test File** for service-only work.

### Manual scripts

```bash
bun run build:pkgs
bun run --filter @quester-studio/desktop dev:debug      # bundled UI + inspect-wait
bun run --filter @quester-studio/desktop dev:hmr:debug    # Vite HMR + inspect-wait
```

Then attach with **Attach to Bun**.

### Stop stale dev processes

If the window is blank or port 5173 is stuck, stop leftover Vite / launcher processes:

```bash
bun run --filter @quester-studio/desktop dev:stop
```

Close any open Quester window before restarting on Windows (Electrobun locks the build folder).

---

## React renderer (`apps/desktop/src/renderer`)

Renderer UI: React 19 + React Flow under `apps/desktop/src/renderer/`. Backend calls go through `getQuesterClient()` (`src/renderer/lib/quester-client.ts`) — Electrobun RPC in desktop builds, HTTP + SSE in web mode.

### Option A — Chrome DevTools (renderer only)

Best for component state, React tree, and CSS. Without `dev:web` + API, RPC/HTTP to the backend will not work in standalone Chrome.

| Config | Starts |
|--------|--------|
| **Debug Desktop Renderer** | `dev:hmr` (Vite on `127.0.0.1:5173`) + Chrome |
| **Debug Desktop Renderer (HMR debug)** | `dev:hmr:debug` + Chrome |

`webRoot` is set to `apps/desktop/src/renderer` so breakpoints map to `.tsx` sources.

### Option B — Electrobun window DevTools

Run **Desktop: Attach Main (HMR + DevTools)** or `dev:hmr:debug`. The Electrobun webview opens DevTools automatically (`DEV=1`). Full RPC works; you can debug UI and backend together.

### Option C — HMR without VS Code

```bash
bun run build:pkgs
bun run --filter @quester-studio/desktop dev:hmr
```

Edit files under `src/renderer/` — Vite hot-reloads the webview.

### Renderer layout

| Path | Role |
|------|------|
| `src/renderer/main.tsx` | Desktop React entry (Electrobun client) |
| `src/renderer/main.web.tsx` | Browser entry (HTTP client) |
| `src/renderer/lib/quester-client.ts` | `getQuesterClient` / `setQuesterClient` |
| `src/renderer/lib/electrobun.ts` | Typed Electrobun RPC |
| `src/renderer/components/AppShell.tsx` | Workspace + run panel layout |
| `src/renderer/components/FlowCanvas.tsx` | React Flow canvas |

---

## HTTP API (`apps/api`)

Bun server: HTTP JSON for workspace/run RPCs, SSE for `nodeRunStatus` during executes. Uses `@quester-studio/workspace-service`.

### Setup

```bash
bun install
bun run build:pkgs
# optional — defaults to examples/sample-workspace discovery
set QUESTER_WORKSPACE_ROOT=examples/sample-workspace   # PowerShell: $env:QUESTER_WORKSPACE_ROOT="..."
```

### Develop

```bash
bun run --filter @quester-studio/api dev
# listens on http://127.0.0.1:8787 (QUESTER_API_PORT / QUESTER_API_HOST)
curl http://127.0.0.1:8787/health
```

### Debug

| Config / command | Use |
|------------------|-----|
| **Debug API server** | Launch `apps/api/src/index.ts` under the Bun debugger |
| `bun test` in `apps/api` | Integration tests against sample workspace |
| `bun --inspect-wait apps/api/src/index.ts` | Attach with **Attach to Bun** |

Breakpoints: `apps/api/src/index.ts`, `packages/workspace-service/src/service.ts`.

---

## UI + HTTP API (Vite web mode)

Run the editor as a client-only SPA against `apps/api` (no Electrobun, no React SSR).

### Setup

Same as API, then ensure packages are built.

### Develop (two terminals)

```bash
# Terminal A
bun run --filter @quester-studio/api dev

# Terminal B
bun run --filter @quester-studio/desktop dev:web
# optional: VITE_QUESTER_API_URL=http://127.0.0.1:8787
```

Open `http://127.0.0.1:5173`. Use **Open sample workspace** in the UI (folder picker returns null in web mode).

### Debug

| Piece | How |
|-------|-----|
| UI | Browser DevTools, or **Debug Web UI (API client)** |
| API | **Debug API server** in a second debugger session |
| Client switch | `main.web.tsx` → `createHttpQuesterClient`; desktop `main.tsx` → Electrobun |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| White Electrobun window in debug | `bun run --filter @quester-studio/desktop dev:stop`, then retry |
| `EADDRINUSE` on port 5173 | `dev:stop`; Vite uses `strictPort` and will not silently move ports |
| Breakpoints not hit in CLI/desktop | Run `bun run build:pkgs` so workspace packages match source |
| Desktop will not restart | Close the Quester window; on Windows kill `launcher` / `bun` if needed |
| Schema / engine types out of date | `bun run --filter @quester-studio/schema build` then `bun run build:pkgs` |

## Related docs

- [CONTRIBUTING.md](./CONTRIBUTING.md) — local dev and PR workflow
- [apps/desktop/README.md](./apps/desktop/README.md) — desktop architecture and demo flow
- [SECURITY.md](./SECURITY.md) — secrets and trust model (desktop validates in main process)

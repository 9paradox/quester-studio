# Debugging Quester Studio

This guide covers debugging **engine**, **CLI**, **desktop main process**, and **React renderer** code in VS Code / Cursor. Launch configurations live in [`.vscode/launch.json`](.vscode/launch.json).

## Prerequisites

- [Bun](https://bun.sh) 1.3.14 (see root `package.json`)
- **Bun for Visual Studio Code** extension (`oven.bun-vscode`) — recommended in [`.vscode/extensions.json`](.vscode/extensions.json)
- Open the **repository root** as the workspace folder (so `${workspaceFolder}` paths resolve)

Build workspace packages before debugging anything that imports `@quester/engine` or `@quester/schema`:

```bash
bun run build:pkgs
```

Most launch configs run the `build:pkgs` preLaunchTask automatically.

## Quick reference

| Target | VS Code launch config | Source |
|--------|----------------------|--------|
| Any open `*.test.ts` | **Debug Current Test File** | Current editor file |
| Any open `.ts` file | **Debug Current File** | Current editor file |
| `@quester/engine` tests | **Debug Current Test File** | `packages/engine/src/**/*.test.ts` |
| `@quester/cli` | **Debug CLI: validate sample workspace** / **run sample flow** | `packages/cli/src/cli.ts` |
| Desktop main (RPC, handlers) | **Desktop: Attach Main Process** | `apps/desktop/src/main/` |
| Desktop main + UI HMR | **Desktop: Attach Main (HMR + DevTools)** | `apps/desktop/src/main/` |
| React renderer only | **Debug Desktop Renderer** | `apps/desktop/src/renderer/` |

---

## Engine (`@quester/engine`)

Engine logic lives in `packages/engine/src/`. Tests are colocated as `*.test.ts`.

### Debug a test

1. Open a test file, e.g. `packages/engine/src/execute.test.ts`
2. Set breakpoints in the test or in `execute.ts`, `workspace.ts`, etc.
3. Run **Debug Current Test File** (F5 with that file active)

### Debug implementation directly

1. Open a source file (e.g. `packages/engine/src/execute.ts`)
2. Run **Debug Current File**

If you change `@quester/schema` or `@quester/nodes`, rebuild first:

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

## CLI (`@quester/cli`)

Entry point: `packages/cli/src/cli.ts`. Depends on built `@quester/engine`.

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

Electrobun main process: `apps/desktop/src/main/index.ts` (window + RPC wiring) and `handlers.ts` (workspace load, `executeFlow`).

### Attach and debug (recommended)

| Config | Dev script | UI source | Use when |
|--------|------------|-----------|----------|
| **Desktop: Attach Main Process** | `dev:debug` | Bundled `views://` assets | Debugging RPC, handlers, flow execution |
| **Desktop: Attach Main (HMR + DevTools)** | `dev:hmr:debug` | Vite dev server (`127.0.0.1:5173`) | Main process + live React HMR |

Both configs:

1. Build packages and start the app with `DEV=1` (DevTools open in the Electrobun window)
2. Wait for the debugger on port **6499**
3. Attach automatically

Set breakpoints in `apps/desktop/src/main/handlers.ts` (or `index.ts`), then start the config.

### Debug main handlers in isolation

**Debug Desktop Handlers** runs `apps/desktop/src/main/index.test.ts` with `build:pkgs` — useful for handler logic without launching the full Electrobun shell.

### Manual scripts

```bash
bun run build:pkgs
bun run --filter @quester/desktop dev:debug      # bundled UI + inspect-wait
bun run --filter @quester/desktop dev:hmr:debug    # Vite HMR + inspect-wait
```

Then attach with **Attach to Bun**.

### Stop stale dev processes

If the window is blank or port 5173 is stuck, stop leftover Vite / launcher processes:

```bash
bun run --filter @quester/desktop dev:stop
```

Close any open Quester window before restarting on Windows (Electrobun locks the build folder).

---

## React renderer (`apps/desktop/src/renderer`)

Renderer UI: React 19 + React Flow under `apps/desktop/src/renderer/`. RPC calls go through `src/renderer/lib/electrobun.ts` to the main process.

### Option A — Chrome DevTools (renderer only)

Best for component state, React tree, and CSS. **RPC to the main process will not work** in standalone Chrome (workspace load fails by design); use this for pure UI work.

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
bun run --filter @quester/desktop dev:hmr
```

Edit files under `src/renderer/` — Vite hot-reloads the webview.

### Renderer layout

| Path | Role |
|------|------|
| `src/renderer/main.tsx` | React entry |
| `src/renderer/components/AppShell.tsx` | Workspace + run panel layout |
| `src/renderer/components/FlowCanvas.tsx` | React Flow canvas |
| `src/renderer/lib/electrobun.ts` | Typed RPC client |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| White Electrobun window in debug | `bun run --filter @quester/desktop dev:stop`, then retry |
| `EADDRINUSE` on port 5173 | `dev:stop`; Vite uses `strictPort` and will not silently move ports |
| Breakpoints not hit in CLI/desktop | Run `bun run build:pkgs` so workspace packages match source |
| Desktop will not restart | Close the Quester window; on Windows kill `launcher` / `bun` if needed |
| Schema / engine types out of date | `bun run --filter @quester/schema build` then `bun run build:pkgs` |

## Related docs

- [CONTRIBUTING.md](./CONTRIBUTING.md) — local dev and PR workflow
- [apps/desktop/README.md](./apps/desktop/README.md) — desktop architecture and demo flow
- [SECURITY.md](./SECURITY.md) — secrets and trust model (desktop validates in main process)

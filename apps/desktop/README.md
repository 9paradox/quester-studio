# Quester Desktop (Electrobun)

Visual flow builder with Electrobun IPC, workspace loading, and live flow execution.

## Dev setup

1. Install dependencies from the monorepo root: `bun install`
2. Build packages: `bun run build:pkgs`
3. Start desktop dev: `bun run --filter @quester-studio/desktop dev`

Close any running Quester window before restarting `dev` (Electrobun locks the build folder on Windows).

For HMR during UI work:

```bash
bun run --filter @quester-studio/desktop dev:hmr
```

Stop leftover Vite / launcher processes if the window is blank or port 5173 is stuck:

```bash
bun run --filter @quester-studio/desktop dev:stop
```

## Debugging

Use VS Code / Cursor **Run and Debug** with the configs in [`.vscode/launch.json`](../../.vscode/launch.json). Full guide: [DEBUGGING.md](../../DEBUGGING.md).

| Goal | Launch config |
|------|----------------|
| Main process (handlers, RPC) | **Desktop: Attach Main Process** |
| Main + live React HMR | **Desktop: Attach Main (HMR + DevTools)** |
| React components only (Chrome) | **Debug Desktop Renderer** |
| Handler unit tests | **Debug Desktop Handlers** |

Install the Bun extension (`oven.bun-vscode`) for breakpoints and attach.

## Demo flow

1. Launch the app — it opens `examples/sample-workspace` by default
2. Select **Demo — main nodes** (`demo-main-nodes`) in the flow sidebar
3. Pick env **local**, then **Run** — fetch a DummyJSON product and extract its title
4. Optional: open **Login and profile** and set Input / Run panel JSON to `{"username":"emilys","password":"emilyspass"}`
5. Canvas **Note** stickies are documentation only (no edges, not executed)
6. Click **Open workspace** to pick any folder containing `quester.json`

## Architecture

- **Main process** (`src/main/handlers.ts`) — workspace load, validation, `executeFlow`
- **RPC** (`src/shared/rpc.ts`) — typed Electrobun contract between main and renderer
- **Renderer** (`src/renderer/components/`) — workspace bar, flow sidebar, canvas, run panel

## Verify

```bash
bun run --filter @quester-studio/desktop lint
bun run --filter @quester-studio/desktop test
bun run --filter @quester-studio/desktop test:smoke   # AppShell / flow / settings render paths
bun run --filter @quester-studio/desktop build:app    # vite + Electrobun → artifacts/ (for releases)
bun run --filter @quester-studio/desktop dev
```

Renderer smoke tests (`AppShell.smoke.test.tsx`) mount the shell with mocked Electrobun RPC (Happy DOM + Testing Library). They run as part of `bun run --filter @quester-studio/desktop test` and therefore CI.

Release packaging: `build:app` writes distributables under `apps/desktop/artifacts/`. On Windows it also runs `package-windows.mjs` to produce:
- `Quester-<version>-win-x64-portable.zip` — extract and run `bin/launcher.exe`
- `Quester-<version>-win-x64-setup.exe` — NSIS installer (choose folder + Apps uninstall; needs [NSIS](https://nsis.sourceforge.io/) locally, or CI installs it)

On **macOS**, run `bun run --filter @quester-studio/desktop build:app:mac` (or `build:app` on macOS — Windows packaging is skipped automatically). Electrobun emits unsigned macOS artifacts under `artifacts/`; codesign/notarize stay off per project policy.

The Release workflow uploads those files to the GitHub Release (Linux, Windows, and macOS matrix jobs).

Compare run output to CLI:

```bash
bunx --bun quester run examples/sample-workspace/flows/demo-main-nodes.flow.json \
  --workspace examples/sample-workspace --env local
```

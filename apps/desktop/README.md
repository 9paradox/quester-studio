# Quester Desktop (Electrobun)

Visual flow builder with Electrobun IPC, workspace loading, and live flow execution.

## Dev setup

1. Install dependencies from the monorepo root: `bun install`
2. Build packages: `bun run build:pkgs`
3. Start desktop dev: `bun run --filter @quester/desktop dev`

Close any running Quester window before restarting `dev` (Electrobun locks the build folder on Windows).

For HMR during UI work:

```bash
bun run --filter @quester/desktop dev:hmr
```

## Demo flow

1. Launch the app — it opens `examples/sample-workspace` by default
2. Select **Login and profile (JSONPlaceholder)** in the flow sidebar
3. In the run panel, keep env `local` and the default JSON input
4. Click **Run** — output shows the profile HTTP response
5. Click **Open workspace** to pick any folder containing `quester.json`

## Architecture

- **Main process** (`src/main/handlers.ts`) — workspace load, validation, `executeFlow`
- **RPC** (`src/shared/rpc.ts`) — typed Electrobun contract between main and renderer
- **Renderer** (`src/renderer/components/`) — workspace bar, flow sidebar, canvas, run panel

## Verify

```bash
bun run --filter @quester/desktop lint
bun run --filter @quester/desktop test
bun run --filter @quester/desktop dev
```

Compare run output to CLI:

```bash
bunx --bun quester run login-and-profile \
  --workspace examples/sample-workspace --env local \
  --input '{"username":"demo","email":"demo@example.com"}'
```

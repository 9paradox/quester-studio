# @quester-studio/api

Local HTTP JSON + SSE API over `@quester-studio/workspace-service`.

## Commands

```bash
# from repo root
bun run build:pkgs
bun run --filter @quester-studio/api dev
```

- Listen: `http://127.0.0.1:8787` (`QUESTER_API_PORT` / `QUESTER_API_HOST`)
- Workspace: `QUESTER_WORKSPACE_ROOT` (optional; discovers `examples/sample-workspace`)

## With browser UI

```bash
# Terminal A
bun run --filter @quester-studio/api dev

# Terminal B
bun run --filter @quester-studio/desktop dev:web
```

See [DEBUGGING.md](../../DEBUGGING.md) command cheat sheet for desktop / UI / API modes.

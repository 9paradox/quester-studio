# @quester-studio/api

Local HTTP JSON + SSE API over `@quester-studio/workspace-service`.

**Localhost-dev only** — no authentication; do not bind beyond loopback or expose on a network. See [SECURITY.md](../../SECURITY.md).

## Commands

```bash
# from repo root
bun run build:pkgs
bun run --filter @quester-studio/api dev
```

- Listen: `http://127.0.0.1:8787` (`QUESTER_API_PORT` / `QUESTER_API_HOST`)
- Non-loopback bind requires `QUESTER_API_ALLOW_REMOTE=1` (discouraged)
- Workspace: `QUESTER_WORKSPACE_ROOT` (optional default discovery; when set, also jails `workspace`/`path` request fields)

## With browser UI

```bash
# Terminal A
bun run --filter @quester-studio/api dev

# Terminal B
bun run --filter @quester-studio/desktop dev:web
```

See [DEBUGGING.md](../../DEBUGGING.md) command cheat sheet for desktop / UI / API modes.

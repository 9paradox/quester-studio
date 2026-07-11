# Quester Desktop (Electrobun)

Minimal Electrobun + React Flow scaffold for the Quester visual flow builder.

## Dev setup

1. Install dependencies from the monorepo root: `bun install`
2. Build packages: `bun run build`
3. Start desktop dev: `bun run --filter @quester/desktop dev`

RPC stubs in `src/main/index.ts`: `openWorkspace`, `executeFlow`, `listFlows`.

Renderer loads nodes from the sample `login-and-profile` flow for React Flow preview.

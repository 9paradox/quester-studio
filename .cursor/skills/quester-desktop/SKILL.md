---
name: quester-desktop
description: Develop the Quester desktop app — Electrobun main process, Vite/React renderer, React Flow canvas, workspace IPC. Use when working on apps/desktop, flow builder UI, Electrobun, or wiring engine execution into the desktop.
---

# Quester Desktop App

Visual flow builder at `apps/desktop`. Stack: **Electrobun** (shell), **Vite** (renderer build), **React 19**, **React Flow 11**, **shadcn/ui** (preset `b1D3m6L2`, style `base-mira`), **Tailwind v4**.

## Layout

```
apps/desktop/
  components.json         # shadcn/ui config (preset b1D3m6L2)
  src/main/index.ts       # Main process — workspace + execution RPCs
  src/renderer/
    main.tsx              # React entry, flow canvas
    styles.css            # Tailwind v4 + shadcn theme
    components/ui/        # shadcn components (CLI-managed)
    lib/utils.ts          # cn() helper
  vite.config.ts
  package.json            # dev: electrobun dev | build: vite build
```

## Main process (current)

Exports used as RPC handlers:

- `openWorkspace(path?)` — `loadWorkspace` from `@quester/engine`
- `listFlows(path?)` — flow id/name list
- `executeFlowRpc(flowId, { env, input })` — validate + `executeFlow`
- `loadSampleFlowJson()` — reads example flow file

Default workspace: `examples/sample-workspace` (relative to repo root).

## Renderer (current)

- Imports sample flow JSON directly (not yet wired to main process)
- Maps `flow.nodes` → React Flow nodes (`type: "default"`)
- Maps `flow.edges` → React Flow edges
- Header + full-height `<ReactFlow>` with Background, MiniMap, Controls

## Development

```bash
bun run --filter @quester/desktop dev    # electrobun dev
bun run --filter @quester/desktop build  # vite build → dist/renderer/
```

Build packages first if engine/schema changed:

```bash
bun run build:pkgs
```

## Implementation priorities

When extending the desktop, prefer this order:

1. **IPC** — Expose main-process functions to renderer via Electrobun RPC
2. **Workspace picker** — Open folder, list flows from real workspace
3. **Flow loader** — Load selected `*.flow.json` into canvas (not hardcoded sample)
4. **Custom node types** — React Flow `nodeTypes` map per `type` (http, input, if, …)
5. **Run panel** — Env selector, JSON input, call `executeFlowRpc`, show output/events
6. **Editor** — Node inspector for `data` fields (forms from Zod schemas later)

## React Flow mapping

```typescript
// Flow JSON → React Flow
const rfNodes = flow.nodes.map((n) => ({
  id: n.id,
  type: n.type,  // register custom components in nodeTypes
  position: n.position ?? { x: 0, y: 0 },
  data: { label: n.data?.label ?? n.type, ...n.data },
}));

const rfEdges = flow.edges.map((e) => ({
  id: e.id,
  source: e.source,
  target: e.target,
  sourceHandle: e.sourceHandle ?? undefined,
}));
```

## If-node edges

`if` nodes branch via `sourceHandle: "true" | "false"`. Register two source handles on the if node component.

## Dependencies

- `@quester/engine` — `loadWorkspace`, `executeFlow`
- `@quester/schema` — `validateFlow` (main process before run)
- shadcn/ui — renderer UI components (`@/components/ui/*`)

Keep validation in main process; renderer sends flow id + input, never executes HTTP directly.

## UI conventions

- **shadcn/ui** — use `@/components/ui/*` components and theme tokens; see skill `shadcn-ui`
- Add components via `npx shadcn@latest add <name> -y` in `apps/desktop`
- Custom markup only for React Flow nodes/canvas (domain-specific)
- Local-first: no cloud calls unless flow nodes request them at run time

## Verify

```bash
bun run --filter @quester/desktop lint
bun run --filter @quester/desktop dev   # manual smoke test
```

After IPC + run panel: execute sample flow and compare output to CLI:

```bash
bunx --bun quester run examples/sample-workspace/flows/login-and-profile.flow.json \
  --workspace examples/sample-workspace --env local \
  --input '{"username":"emilys","password":"emilyspass"}'
```

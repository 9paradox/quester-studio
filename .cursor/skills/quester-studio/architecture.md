# Quester Studio Architecture

## Package dependency graph

```
@quester-studio/schema  (no internal deps)
       ↓
@quester-studio/nodes   → schema (node data Zod schemas)
       ↓
@quester-studio/engine  → schema, nodes
       ↓
@quester-studio/cli     → schema, engine
@quester-studio/desktop → schema, engine
```

## Schema layer (`@quester-studio/schema`)

- **flow.ts** — `flowSchemaV1`, `builtinNodeTypes`, per-type `nodeDataSchemaForType`
- **workspace.ts** — `quester.json` manifest
- **environment.ts** / **secrets.ts** — env files
- **graph-validation.ts** — DAG rules (input node, reachability, if-branch handles)
- **emit-schemas.ts** — writes `schemas/quester/**/*.schema.json`

## Execution layer

### `@quester-studio/nodes`

- `FlowNodePlugin`: `{ type, execute(ctx) → { output, branch?, vars? } }`
- `NodeExecutionContext`: node, input, flowInput, vars, nodeOutputs, resolveTemplate, fetch
- Builtins auto-register in `src/index.ts`

### `@quester-studio/engine`

- `loadWorkspace(root)` — reads manifest, flows, environments
- `executeFlow(flow, { input, env, secrets, vars, fetch, events })` — topological walk with if-branching
- `resolveTemplate` in `variables.ts` — `{{env.*}}`, `{{input.*}}`, `{{nodes.*}}`, `{{vars.*}}`

## Flow file format (v1)

```json
{
  "id": "my-flow",
  "version": "v1",
  "name": "Optional title",
  "nodes": [
    { "id": "n1", "type": "http", "data": { ... }, "position": { "x": 0, "y": 0 } }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "n2", "sourceHandle": null }
  ]
}
```

`if` nodes use `sourceHandle`: `"true"` or `"false"` on outgoing edges.

## Desktop app (current state)

- **Main** (`apps/desktop/src/main/index.ts`): workspace RPC stubs — `openWorkspace`, `listFlows`, `executeFlowRpc`
- **Renderer** (`apps/desktop/src/renderer/main.tsx`): static React Flow view of sample flow
- **Stack**: Electrobun, Vite, React 19, React Flow 11, Tailwind

Target: wire main↔renderer IPC, load real workspaces, custom node components per type.

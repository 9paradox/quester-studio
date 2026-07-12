---
name: add-flow-node
description: Add a new builtin flow node type to Quester Studio — Zod schema, node plugin, registry, JSON Schema emit, and tests. Use when adding a node, extending builtinNodeTypes, or implementing execute() for a new step type.
---

# Add a Builtin Flow Node

Adding a node touches **schema** (validation) and **nodes** (execution). Keep both in sync.

## Checklist

```
- [ ] 1. Zod schema in packages/schema/src/nodes/<type>.ts
- [ ] 2. Export from packages/schema/src/nodes/index.ts
- [ ] 3. Register in packages/schema/src/flow.ts (builtinNodeTypes + nodeDataByType)
- [ ] 4. Add to packages/schema/src/emit-schemas.ts specs array
- [ ] 5. Plugin in packages/nodes/src/builtin/<type>.ts
- [ ] 6. Export from packages/nodes/src/builtin/index.ts
- [ ] 7. Register in packages/nodes/src/index.ts builtins array
- [ ] 8. Tests (schema validation + plugin behavior)
- [ ] 9. bun run --filter @quester/schema build (regenerates schemas/)
- [ ] 10. bun run test
```

## 1. Schema (`packages/schema/src/nodes/<type>.ts`)

```typescript
import { z } from "zod";

export const myNodeDataSchema = z.object({
  label: z.string().optional(),
  // node-specific fields
});

export type MyNodeData = z.infer<typeof myNodeDataSchema>;
```

## 2. Register in flow.ts

```typescript
// builtinNodeTypes array — add "mytype"
// nodeDataByType — add mytype: myNodeDataSchema
// import myNodeDataSchema from "./nodes/mytype.js"
```

## 3. Emit JSON Schema

In `emit-schemas.ts`, add to `specs`:

```typescript
["quester/nodes/mytype.schema.json", myNodeDataSchema],
```

## 4. Plugin (`packages/nodes/src/builtin/<type>.ts`)

```typescript
import { myNodeDataSchema } from "@quester/schema";
import type { FlowNodePlugin } from "../types.js";

export const myPlugin: FlowNodePlugin = {
  type: "mytype",
  async execute(ctx) {
    const data = myNodeDataSchema.parse(ctx.node.data);
    // use ctx.input, ctx.resolveTemplate(), ctx.fetch, ctx.vars, ctx.nodeOutputs
    return { output: { /* result */ } };
    // if node: return { output, branch: "true" | "false" }
    // set vars: return { output, vars: { key: value } }
  },
};
```

## 5. Register plugin

- Export from `builtin/index.ts`
- Add `myPlugin` to `builtins` array in `packages/nodes/src/index.ts`

## Patterns from existing nodes

| Node | Notes |
|------|-------|
| `http` | `ctx.resolveTemplate` on url/headers/body; returns status/body |
| `extract` | JMESPath `expression` over previous node output |
| `if` | Returns `branch: "true" \| "false"`; engine uses `sourceHandle` on edges |
| `set` | Merges into `vars` via `return { output, vars }` |
| `template` | String interpolation via `resolveTemplate` |
| `start` | Graph entry; output only; emits `{}` |
| `input` / `output` | Run payload on the wire / last output |

## Tests

**Schema** (`packages/schema/src/validate-flow.test.ts` or dedicated):

```typescript
import { describe, expect, test } from "bun:test";
import { validateNodeData } from "./flow.js";

test("mytype node data", () => {
  expect(validateNodeData("mytype", { /* valid */ }).success).toBe(true);
});
```

**Plugin** (`packages/nodes/src/builtin/<type>.test.ts` or engine integration):

```typescript
import { describe, expect, test } from "bun:test";
import { myPlugin } from "./mytype.js";

test("executes", async () => {
  const result = await myPlugin.execute({ /* minimal ctx */ });
  expect(result.output).toEqual(/* expected */);
});
```

## Verify

```bash
bun run --filter @quester/schema build
bun run --filter @quester/nodes test
bun run --filter @quester/engine test
```

Optionally add a node to `examples/sample-workspace/flows/` and run:

```bash
bunx --bun quester validate examples/sample-workspace
bunx --bun quester run <flow-path> --workspace examples/sample-workspace --env local
```

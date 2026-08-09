---
title: foreach
description: Framed loop — body per item, complete with results
---

`foreach` is a **framed subgraph container**. Resolve `items` to an array, then run the body once per element. Templates inside the body can use `{{item}}` / `{{index}}` (or a custom `itemVar`). Outer continuation uses the **`complete`** handle with collected results.

## Wiring

Same entry/exit model as [`try`](../try/) — **one** body entry and **one** body exit. Outer continuation is the header-right **`complete`** handle.

| Edge | Handles |
|------|---------|
| Outside → frame | target = foreach |
| Frame → body | `sourceHandle: "entry"` |
| Body → frame | `targetHandle: "exit"` |
| Frame → outside | `sourceHandle: "complete"` |

## Fields

| Field | Required | Notes |
|-------|----------|-------|
| `items` | yes | JMESPath on previous output, or templated JSON array string |
| `itemVar` | no | Template scope name (default `item`) |
| `maxItems` | no | Cap (default 100, hard max 10000) |
| `concurrency` | no | Parallel body iterations (max 32) |
| `label` | no | UI only |

Legacy map-only `map` is **rejected** — put mapping logic in body nodes instead.

## Output

```json
{ "results": [ /* per-item exit outputs */ ], "count": 3, "truncated": false }
```

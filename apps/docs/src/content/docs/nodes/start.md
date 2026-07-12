---
title: start
description: Sole flow entry node — output only, at most one child
---

Graph entry point. Every flow must have **exactly one** `start` node. It has **no input handle** (output only) and may have **at most one** outgoing edge.

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Ignored |
| **Output** | `{}` (empty object so the single child can run) |

Run payload is **not** produced by `start`. Use [`input`](/nodes/input/) after start if you want it on the wire, or `{{input.*}}` in templates.

## Rules

- Exactly one `start` per flow
- No incoming edges
- At most one child (`start → next` only)
- All other nodes must be reachable from `start`
- Validation / run fails if these rules are broken

## Examples

### Minimal

```json
{
  "id": "hello",
  "version": "v1",
  "nodes": [
    { "id": "start", "type": "start", "data": { "label": "Start" } },
    {
      "id": "out",
      "type": "output",
      "data": { "map": { "ok": "true" } }
    }
  ],
  "edges": [{ "id": "e0", "source": "start", "target": "out" }]
}
```

### With input then HTTP

```
start → input → http → extract → output
```

```json
{
  "edges": [
    { "id": "e0", "source": "start", "target": "input" },
    { "id": "e1", "source": "input", "target": "login" }
  ]
}
```

Not allowed: two starts, or `start` branching to two children.

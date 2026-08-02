---
title: start
description: Sole flow entry node — output only, at most one child
---
Graph entry point. Every flow must have **exactly one** `start` node. It has **no input handle** (output only) and may have **at most one** outgoing edge.

Run payload is **not** produced here. Chain `start → input → …` to put it on the wire, or use `{{input.*}}` in templates. Overview: [How flows work](../../concepts/).


<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 480 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="start ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <text class="qs-caption" x="70" y="36" text-anchor="middle">no in</text>
  <rect class="qs-node qs-node-accent" x="40" y="48" width="160" height="56" rx="8"/>
  <text class="qs-label" x="120" y="82" text-anchor="middle">start</text>
  <line class="qs-edge" x1="200" y1="76" x2="300" y2="76"/>
  <circle class="qs-port" cx="306" cy="76" r="6"/>
  <text class="qs-caption" x="360" y="80">out ×1 (max 1 edge)</text>
</svg>
<figcaption>Sole entry. Exactly one start per flow.</figcaption>
</figure>
<!-- qs-ports:end -->

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Ignored |
| **Output** | `{}` (empty object so the single child can run) |

## Rules

- Exactly one `start` per flow
- No incoming edges
- At most one child (`start → next` only)
- All **executable** nodes must be reachable from `start` ([`note`](../note/) stickies are exempt and cannot be connected)
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




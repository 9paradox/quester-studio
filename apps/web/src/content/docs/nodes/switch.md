---
title: switch
description: Multi-branch on a templated expression or JMESPath (sourceHandle per case)
---
Picks an outgoing edge by matching a string value against `cases`. Extends the `if` branching model with more than two handles.

Use templated `expression` for run/vars/nodes fields, or `path` as JMESPath on **previous** (`body.type`, not `previous.body.type`). See [How flows work](../../concepts/).




<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 580 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="switch multi-branch ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="100" r="6"/>
  <text class="qs-caption" x="48" y="130" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="100" x2="140" y2="100"/>
  <rect class="qs-node qs-node-accent" x="140" y="70" width="150" height="60" rx="8"/>
  <text class="qs-label" x="215" y="106" text-anchor="middle">switch</text>
  <path class="qs-edge qs-edge-ok" d="M290 84 H360 V40 H430"/>
  <circle class="qs-port" cx="436" cy="40" r="6"/>
  <text class="qs-caption" x="500" y="44">case…</text>
  <path class="qs-edge" d="M290 100 H360"/>
  <circle class="qs-port" cx="366" cy="100" r="6"/>
  <text class="qs-caption" x="430" y="104">case…</text>
  <path class="qs-edge" d="M290 116 H360 V160 H430"/>
  <circle class="qs-port" cx="436" cy="160" r="6"/>
  <text class="qs-caption" x="500" y="164">default</text>
</svg>
<figcaption>One handle per case plus default.</figcaption>
</figure>
<!-- qs-ports:end -->

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `expression` | string | Optional templated string used for matching |
| `path` | string | Optional JMESPath on **previous** output; result is stringified |
| `cases` | array | `{ value, handle }` — at least one case |
| `defaultHandle` | string | Handle when nothing matches (default `"default"`) |

Provide **`expression` and/or `path`**.

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output |
| **Output** | `{ "matched": "<handle>" }` |
| **Branch** | The matched `handle` (or default) — must match `sourceHandle` on edges |

## Edges

```json
{
  "id": "e-ok",
  "source": "byStatus",
  "target": "okPath",
  "sourceHandle": "ok"
}
```

## Examples

### Templated expression

```json
{
  "id": "byStatus",
  "type": "switch",
  "data": {
    "expression": "{{nodes.head.status}}",
    "cases": [
      { "value": "200", "handle": "ok" },
      { "value": "404", "handle": "missing" }
    ],
    "defaultHandle": "other"
  }
}
```

### JMESPath on previous HTTP output

```json
{
  "data": {
    "path": "status",
    "cases": [{ "value": "200", "handle": "ok" }],
    "defaultHandle": "other"
  }
}
```




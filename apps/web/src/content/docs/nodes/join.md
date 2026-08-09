---
title: join
description: Barrier with N incoming edges — collect predecessor outputs by node id
---
Waits for **every live predecessor**, then emits an object of their outputs keyed by node id. Use this for diamond fan-in and reconvergence after [`if`](../if/) / [`switch`](../switch/) / [`try`](../try/).

All other nodes allow **at most one** incoming edge. Prefer [`merge`](../merge/) when you need deep-merge of named sources rather than a barrier.

<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="join ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="50" r="6"/>
  <circle class="qs-port" cx="48" cy="90" r="6"/>
  <text class="qs-caption" x="48" y="120" text-anchor="middle">in ×N</text>
  <line class="qs-edge" x1="54" y1="50" x2="150" y2="65"/>
  <line class="qs-edge" x1="54" y1="90" x2="150" y2="75"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">join</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>N arms in, one collect-map out. Fan-out from join shares the same object.</figcaption>
</figure>
<!-- qs-ports:end -->

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Built by the engine as `{ [predId]: output }` for completed predecessors |
| **Output** | Same collect-map object |

Exclusive-branch arms that were not taken are **not** waited on (XOR orphan awareness). Diamond fan-out waits for **both** arms (AND).

## Examples

### Diamond

```
start → a → b ↘
             join → …
      → a → c ↗
```

```json
{
  "id": "j",
  "type": "join",
  "data": { "label": "Both arms" }
}
```

Example output after `b`/`c` templates:

```json
{ "b": "from-b", "c": "from-c" }
```

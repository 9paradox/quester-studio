---
title: foreach
description: Framed loop — body per item, complete with results
---

`foreach` is a **framed subgraph container**. Resolve `items` to an array, then run the body once per element. Templates inside the body can use `{{item}}` / `{{index}}` (or a custom `itemVar`). Outer continuation uses the **`complete`** handle with collected results.


<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="foreach ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="75" r="6"/>
  <text class="qs-caption" x="48" y="108" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="75" x2="140" y2="75"/>
  <rect class="qs-node qs-node-accent" x="140" y="45" width="140" height="60" rx="8"/>
  <text class="qs-label" x="210" y="81" text-anchor="middle">foreach</text>
  <line class="qs-edge qs-edge-ok" x1="280" y1="75" x2="400" y2="75"/>
  <circle class="qs-port" cx="406" cy="75" r="6"/>
  <text class="qs-caption" x="460" y="79">complete</text>
</svg>
<figcaption>Framed loop container — see frame diagram below.</figcaption>
</figure>
<!-- qs-ports:end -->

<!-- qs-frame:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 720 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="foreach framed container">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="36" cy="110" r="6"/>
  <text class="qs-caption" x="36" y="148" text-anchor="middle">in</text>
  <line class="qs-edge" x1="42" y1="110" x2="88" y2="110"/>
  <rect class="qs-node qs-node-accent" x="88" y="32" width="432" height="156" rx="10" fill="color-mix(in oklch, var(--qs-accent) 6%, var(--qs-surface))"/>
  <rect class="qs-node qs-node-accent" x="88" y="32" width="432" height="28" rx="10"/>
  <rect class="qs-node qs-node-accent" x="88" y="48" width="432" height="12" rx="0" fill="color-mix(in oklch, var(--qs-accent) 10%, var(--qs-surface))"/>
  <text class="qs-label" x="120" y="52">foreach frame</text>
  <circle class="qs-port" cx="120" cy="168" r="5"/>
  <text class="qs-caption" x="120" y="192" text-anchor="middle">entry</text>
  <line class="qs-edge qs-edge-ok" x1="126" y1="168" x2="200" y2="168"/>
  <rect class="qs-node" x="200" y="144" width="120" height="48" rx="8"/>
  <text class="qs-label" x="260" y="174" text-anchor="middle">body</text>
  <line class="qs-edge qs-edge-ok" x1="320" y1="168" x2="394" y2="168"/>
  <circle class="qs-port" cx="400" cy="168" r="5"/>
  <text class="qs-caption" x="400" y="192" text-anchor="middle">exit</text>
  <text class="qs-caption" x="304" y="128" text-anchor="middle">children · parentId → frame</text>
  <path class="qs-edge qs-edge-ok" d="M520 80 H560 V88 H610"/>
  <circle class="qs-port" cx="616" cy="88" r="6"/>
  <text class="qs-caption" x="660" y="92">complete</text>
</svg>
<figcaption>Resolve <code>items</code>, run body per element via entry → … → exit, then continue on <code>complete</code> with collected results.</figcaption>
</figure>
<!-- qs-frame:end -->

## Wiring

Same entry/exit model as [`try`](../try/) — **one** body entry and **one** body exit. Outer continuation is the header-right **`complete`** handle.

| Edge | Handles |
|------|---------|
| Outside → frame | target = foreach |
| Frame → body | `sourceHandle: "entry"` |
| Body → frame | `targetHandle: "exit"` |
| Frame → outside | `sourceHandle: "complete"` |

## Nesting

Same rules as [`try`](../try/): nest `foreach` inside `try` (or the reverse) with no max depth; reject parent cycles. Canvas hit-test picks the deepest frame. When a nested frame is the body child, wires use parent `entry` → child `in` and child outer handle (`success` / `failed` / `complete`) → parent `exit` — body `entry`/`exit` stay inside the nested frame.

Example sample: `examples/sample-workspace/flows/nested-frames.flow.json` (`foreach` → `try` → template).

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

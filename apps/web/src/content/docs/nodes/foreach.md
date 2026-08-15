---
title: foreach
description: Framed loop — body per item, complete with results
---

`foreach` is a **framed subgraph container**. Resolve `items` to an array, then run the body once per element. Templates inside the body can use `{{item}}` / `{{index}}` (or a custom `itemVar`). Outer continuation uses the **`complete`** handle with collected results.

<!-- qs-frame:start -->
<figure class="qs-diagram qs-diagram-frame">
<svg class="qs-svg" viewBox="0 0 640 248" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="foreach frame ports and wiring">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <text class="qs-caption" x="320" y="22" text-anchor="middle" dominant-baseline="middle">Header ports = outside flow · entry/exit = inside body only</text>
  <line class="qs-edge" x1="12" y1="82" x2="64" y2="82"/>
  <circle class="qs-port" cx="64" cy="82" r="6"/>
  <text class="qs-caption" x="54" y="82" text-anchor="end" dominant-baseline="middle">in</text>
  <rect class="qs-node qs-node-accent" x="64" y="48" width="440" height="172" rx="10" fill="color-mix(in oklch, var(--qs-accent) 5%, var(--qs-surface))"/>
  <rect x="64" y="48" width="440" height="36" rx="10" fill="color-mix(in oklch, var(--qs-accent) 12%, var(--qs-surface))" stroke="none"/>
  <line x1="64" y1="84" x2="504" y2="84" stroke="var(--qs-line)" stroke-width="1"/>
  <text class="qs-label" x="78" y="66" text-anchor="start" dominant-baseline="middle">foreach</text>
  <circle class="qs-port" cx="504" cy="82" r="6"/>
  <line class="qs-edge qs-edge-ok" x1="510" y1="82" x2="540" y2="82"/>
  <text class="qs-caption" x="546" y="82" text-anchor="start" dominant-baseline="middle">complete</text>
  <rect class="qs-node" x="78" y="98" width="412" height="108" rx="8" stroke-dasharray="5 4" fill="color-mix(in oklch, var(--qs-accent) 3%, var(--qs-surface))"/>
  <text class="qs-caption" x="284" y="112" text-anchor="middle" dominant-baseline="middle">body · parentId children</text>
  <circle class="qs-port" cx="78" cy="155" r="6"/>
  <text class="qs-caption" x="90" y="155" text-anchor="start" dominant-baseline="middle">entry</text>
  <line class="qs-edge qs-edge-ok" x1="84" y1="155" x2="236" y2="155"/>
  <rect class="qs-node" x="236" y="133" width="96" height="44" rx="8"/>
  <text class="qs-label" x="284" y="155" text-anchor="middle" dominant-baseline="middle">child</text>
  <line class="qs-edge qs-edge-ok" x1="332" y1="155" x2="484" y2="155"/>
  <circle class="qs-port" cx="490" cy="155" r="6"/>
  <text class="qs-caption" x="478" y="155" text-anchor="end" dominant-baseline="middle">exit</text>
  <text class="qs-mono" x="320" y="230" text-anchor="middle" dominant-baseline="middle">entry = sourceHandle · exit = targetHandle</text>
</svg>
<figcaption>Header: outside <code>in</code> → frame, then <code>complete</code> out. Body: <code>entry</code> → child → <code>exit</code> runs once per item.</figcaption>
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

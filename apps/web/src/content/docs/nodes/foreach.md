---
title: foreach
description: Framed loop — body per item, complete with results
---

`foreach` is a **framed subgraph container**. Resolve `items` to an array, then run the body once per element. Templates inside the body can use `{{item}}` / `{{index}}` (or a custom `itemVar`). Outer continuation uses the **`complete`** handle with collected results.



<!-- qs-frame:start -->
<figure class="qs-diagram qs-diagram-frame">
<svg class="qs-svg" viewBox="0 0 620 218" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="foreach frame ports and wiring">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <text class="qs-caption" x="310" y="18" text-anchor="middle">Header ports = outside flow · entry/exit = inside body only</text>
  <line class="qs-edge" x1="8" y1="55" x2="72" y2="55"/>
  <circle class="qs-port" cx="72" cy="55" r="6"/>
  <text class="qs-caption qs-text-below" x="72" y="67" text-anchor="middle">in</text>
  <rect class="qs-node qs-node-accent" x="72" y="38" width="420" height="138" rx="10" fill="color-mix(in oklch, var(--qs-accent) 5%, var(--qs-surface))"/>
  <rect x="72" y="38" width="420" height="34" rx="10" fill="color-mix(in oklch, var(--qs-accent) 12%, var(--qs-surface))" stroke="none"/>
  <line x1="72" y1="72" x2="492" y2="72" stroke="var(--qs-line)" stroke-width="1"/>
  <text class="qs-label" x="86" y="55">foreach</text>
  <circle class="qs-port" cx="492" cy="55" r="6"/>
  <line class="qs-edge qs-edge-ok" x1="498" y1="55" x2="538" y2="55"/>
  <text class="qs-caption" x="546" y="55" text-anchor="start">complete</text>
  <rect class="qs-node" x="86" y="84" width="392" height="92" rx="8" stroke-dasharray="5 4" fill="color-mix(in oklch, var(--qs-accent) 3%, var(--qs-surface))"/>
  <text class="qs-caption" x="282" y="100" text-anchor="middle">body · parentId children</text>
  <circle class="qs-port" cx="86" cy="130" r="6"/>
  <text class="qs-caption qs-text-below" x="86" y="142" text-anchor="middle">entry</text>
  <line class="qs-edge qs-edge-ok" x1="92" y1="130" x2="228" y2="130"/>
  <rect class="qs-node" x="228" y="108" width="96" height="44" rx="8"/>
  <text class="qs-label" x="276" y="130">child</text>
  <line class="qs-edge qs-edge-ok" x1="324" y1="130" x2="472" y2="130"/>
  <circle class="qs-port" cx="478" cy="130" r="6"/>
  <text class="qs-caption qs-text-below" x="478" y="142" text-anchor="middle">exit</text>
  <text class="qs-mono" x="310" y="208" text-anchor="middle" style="font-size:10px">entry = sourceHandle · exit = targetHandle</text>
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

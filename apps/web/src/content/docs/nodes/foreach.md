---
title: foreach
description: Framed loop — body per item, complete with results
---

`foreach` is a **framed subgraph container**. Resolve `items` to an array, then run the body once per element. Templates inside the body can use `{{item}}` / `{{index}}` (or a custom `itemVar`). Outer continuation uses the **`complete`** handle with collected results.





<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 540 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="foreach outer frame ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <text class="qs-caption" x="270" y="18" text-anchor="middle">Outside wires use header ports only — not body entry/exit</text>
  <line class="qs-edge" x1="36" y1="58" x2="88" y2="58"/>
  <circle class="qs-port" cx="30" cy="58" r="5"/>
  <text class="qs-caption" x="30" y="82" text-anchor="middle">in</text>
  <rect class="qs-node qs-node-accent" x="88" y="36" width="330" height="118" rx="8" fill="color-mix(in oklch, var(--qs-accent) 5%, var(--qs-surface))"/>
  <rect class="qs-node qs-node-accent" x="88" y="36" width="330" height="30" rx="8"/>
  <rect x="88" y="54" width="330" height="12" fill="color-mix(in oklch, var(--qs-accent) 8%, var(--qs-surface))" stroke="none"/>
  <text class="qs-label" x="110" y="56">foreach</text>
  <circle class="qs-port" cx="88" cy="58" r="5"/>
  <circle class="qs-port" cx="418" cy="58" r="5"/>
  <text class="qs-caption" x="448" y="62">complete</text>
  <line class="qs-edge qs-edge-ok" x1="424" y1="58" x2="470" y2="58"/>
  <circle class="qs-port" cx="476" cy="58" r="5"/>
  <rect class="qs-node" x="104" y="78" width="298" height="60" rx="6" stroke-dasharray="4 3" fill="none"/>
  <text class="qs-caption" x="253" y="112" text-anchor="middle">inner body · entry → … → exit</text>
</svg>
<figcaption>Framed loop container — outer ports on the header; entry/exit on the inner body border. See the frame wiring diagram below.</figcaption>
</figure>
<!-- qs-ports:end -->

<!-- qs-frame:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 720 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="foreach framed container wiring">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <text class="qs-caption" x="360" y="18" text-anchor="middle">Matches desktop: header ports outside · entry/exit on inner body border</text>
  <line class="qs-edge" x1="24" y1="56" x2="88" y2="56"/>
  <circle class="qs-port" cx="18" cy="56" r="6"/>
  <text class="qs-caption" x="18" y="78" text-anchor="middle">in</text>
  <rect class="qs-node qs-node-accent" x="88" y="32" width="460" height="188" rx="10" fill="color-mix(in oklch, var(--qs-accent) 5%, var(--qs-surface))"/>
  <rect class="qs-node qs-node-accent" x="88" y="32" width="460" height="32" rx="10"/>
  <rect x="88" y="52" width="460" height="12" fill="color-mix(in oklch, var(--qs-accent) 10%, var(--qs-surface))" stroke="none"/>
  <text class="qs-label" x="110" y="54">foreach</text>
  <circle class="qs-port" cx="88" cy="56" r="6"/>
  <circle class="qs-port" cx="542" cy="56" r="6"/>
  <line class="qs-edge qs-edge-ok" x1="548" y1="56" x2="598" y2="56"/>
  <circle class="qs-port" cx="604" cy="56" r="6"/>
  <text class="qs-caption" x="648" y="60">complete</text>
  <rect class="qs-node" x="104" y="78" width="428" height="128" rx="8" stroke-dasharray="5 4" fill="color-mix(in oklch, var(--qs-accent) 4%, var(--qs-surface))"/>
  <text class="qs-caption" x="318" y="96" text-anchor="middle">body area (children use parentId)</text>
  <circle class="qs-port" cx="118" cy="158" r="6"/>
  <text class="qs-caption" x="118" y="182" text-anchor="middle">entry</text>
  <text class="qs-caption" x="118" y="196" text-anchor="middle">source →</text>
  <line class="qs-edge qs-edge-ok" x1="124" y1="158" x2="248" y2="158"/>
  <rect class="qs-node" x="248" y="134" width="120" height="48" rx="8"/>
  <text class="qs-label" x="308" y="164" text-anchor="middle">child</text>
  <line class="qs-edge qs-edge-ok" x1="368" y1="158" x2="492" y2="158"/>
  <circle class="qs-port" cx="518" cy="158" r="6"/>
  <text class="qs-caption" x="518" y="182" text-anchor="middle">exit</text>
  <text class="qs-caption" x="518" y="196" text-anchor="middle">← target</text>
  <text class="qs-mono" x="360" y="228" text-anchor="middle" style="font-size:10px">sourceHandle: "entry" · targetHandle: "exit"</text>
</svg>
<figcaption>Resolve <code>items</code>, run inner <code>entry</code> → body → <code>exit</code> per item, then continue on header <code>complete</code>.</figcaption>
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

---
title: try
description: Framed exception boundary — success / failed handles
---

`try` is a **framed subgraph container**. Body children run once; if any body node throws (HTTP/assert/etc.), the run continues on the **`failed`** handle. A clean exit through the body **`exit`** port takes **`success`**.

Soft condition branching belongs on [`if`](../if/), not `try`.

<!-- qs-frame:start -->
<figure class="qs-diagram qs-diagram-frame">
<svg class="qs-svg" viewBox="0 0 620 218" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="try frame ports and wiring">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <text class="qs-caption" x="310" y="18" text-anchor="middle">Header ports = outside flow · entry/exit = inside body only</text>
  <line class="qs-edge" x1="8" y1="55" x2="72" y2="55"/>
  <circle class="qs-port" cx="72" cy="55" r="6"/>
  <text class="qs-caption" x="62" y="55" text-anchor="end">in</text>
  <rect class="qs-node qs-node-accent" x="72" y="38" width="420" height="138" rx="10" fill="color-mix(in oklch, var(--qs-accent) 5%, var(--qs-surface))"/>
  <rect x="72" y="38" width="420" height="34" rx="10" fill="color-mix(in oklch, var(--qs-accent) 12%, var(--qs-surface))" stroke="none"/>
  <line x1="72" y1="72" x2="492" y2="72" stroke="var(--qs-line)" stroke-width="1"/>
  <text class="qs-label" x="86" y="55">try</text>
  <circle class="qs-port" cx="492" cy="48" r="6"/>
  <text class="qs-caption" x="504" y="48" text-anchor="start">success</text>
  <line class="qs-edge qs-edge-ok" x1="498" y1="48" x2="538" y2="48"/>
  <circle class="qs-port" cx="492" cy="62" r="6"/>
  <text class="qs-caption" x="504" y="62" text-anchor="start">failed</text>
  <line class="qs-edge" x1="498" y1="62" x2="538" y2="62"/>
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
<figcaption>Header: outside <code>in</code> → frame, then <code>success</code> or <code>failed</code> out. Body: one <code>entry</code> → child → <code>exit</code> path on the inner border.</figcaption>
</figure>
<!-- qs-frame:end -->

## Canvas shape

Outside wires attach only to the frame (left **in**, header-right **`success`** / **`failed`**). Inside the frame, wire a **single** `entry → body → exit` path (one entry edge and one exit edge).

## Wiring

| Edge | Handles |
|------|---------|
| Outside → frame | target = try |
| Frame → first body child | `sourceHandle: "entry"` |
| Last body child → frame | `targetHandle: "exit"` |
| Frame → outside | `sourceHandle: "success"` or `"failed"` |

Children use `parentId` pointing at the try node (and usually `extent: "parent"`).

## Nesting

`try` and `foreach` may nest inside each other with no max depth. Parenting must stay a tree (`parentId` cycles are rejected).

On the canvas:

- Drag a frame into another frame (or drop from the palette onto a frame) to set `parentId`
- Drag out clears the parent
- Drop / hit-test prefers the **deepest** containing frame, then the smallest

Body wiring when the body child is itself a frame: parent `entry` → nested frame `in`; nested frame `success` / `failed` (or foreach `complete`) → parent `exit`. Body `entry` / `exit` on the nested frame stay for **its** children only.

A nested `try` does not rethrow into an outer frame: failed runs return a `{ failed: true, ... }` payload and the outer body exit still completes unless something else throws.

## Fields

| Field | Required | Notes |
|-------|----------|-------|
| `label` | no | UI only |

Legacy soft `condition` / `checks` on `try` are **rejected** — migrate those flows to `if`.

## Output

| Path | Output |
|------|--------|
| **success** | Last body exit node's output |
| **failed** | `{ "failed": true, "error": string, "input": <container input> }` |

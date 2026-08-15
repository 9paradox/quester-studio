---
title: try
description: Framed exception boundary — success / failed handles
---

`try` is a **framed subgraph container**. Body children run once; if any body node throws (HTTP/assert/etc.), the run continues on the **`failed`** handle. A clean exit through the body **`exit`** port takes **`success`**.

Soft condition branching belongs on [`if`](../if/), not `try`.

<!-- qs-frame:start -->
<figure class="qs-diagram qs-diagram-frame">
<svg class="qs-svg" viewBox="0 0 640 248" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="try frame ports and wiring">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <text class="qs-caption" x="320" y="22" text-anchor="middle" dominant-baseline="middle">Header ports = outside flow · entry/exit = inside body only</text>
  <rect class="qs-node qs-node-accent" x="64" y="48" width="440" height="172" rx="10"/>
  <path class="qs-frame-header" d="M 74 48 H 494 Q 504 48 504 58 V 84 H 64 V 58 Q 64 48 74 48 Z"/>
  <line x1="64" y1="84" x2="504" y2="84" stroke="var(--qs-line)" stroke-width="1"/>
  <text class="qs-label" x="78" y="66" text-anchor="start" dominant-baseline="middle">try</text>
  <rect class="qs-node" x="78" y="98" width="412" height="108" rx="8" stroke-dasharray="5 4"/>
  <text class="qs-caption" x="284" y="112" text-anchor="middle" dominant-baseline="middle">body · parentId children</text>
  <rect class="qs-node" x="236" y="133" width="96" height="44" rx="8"/>
  <text class="qs-label" x="284" y="155" text-anchor="middle" dominant-baseline="middle">child</text>
  <line class="qs-edge" x1="42" y1="82" x2="64" y2="82"/>
  <line class="qs-edge qs-edge-ok" x1="504" y1="66" x2="534" y2="66"/>
  <line class="qs-edge" x1="504" y1="94" x2="534" y2="94"/>
  <line class="qs-edge qs-edge-ok" x1="84" y1="155" x2="236" y2="155"/>
  <line class="qs-edge qs-edge-ok" x1="332" y1="155" x2="484" y2="155"/>
  <circle class="qs-port" cx="36" cy="82" r="6"/>
  <circle class="qs-port" cx="540" cy="66" r="6"/>
  <circle class="qs-port" cx="540" cy="94" r="6"/>
  <path class="qs-port" d="M 78 149 A 6 6 0 0 1 78 161 L 78 149 Z"/>
  <path class="qs-port" d="M 490 149 A 6 6 0 0 0 490 161 L 490 149 Z"/>
<text class="qs-caption" x="36" y="112" text-anchor="middle" dominant-baseline="middle">in ×1</text>
<text class="qs-caption" x="552" y="66" text-anchor="start" dominant-baseline="middle">success ×1</text>
<text class="qs-caption" x="552" y="94" text-anchor="start" dominant-baseline="middle">failed ×1</text>
<text class="qs-caption" x="86" y="143" text-anchor="start" dominant-baseline="auto">entry</text>
<text class="qs-caption" x="482" y="143" text-anchor="end" dominant-baseline="auto">exit</text>
  <text class="qs-mono" x="320" y="230" text-anchor="middle" dominant-baseline="middle">entry = sourceHandle · exit = targetHandle</text>
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

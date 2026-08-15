---
title: try
description: Framed exception boundary — success / failed handles
---

`try` is a **framed subgraph container**. Body children run once; if any body node throws (HTTP/assert/etc.), the run continues on the **`failed`** handle. A clean exit through the body **`exit`** port takes **`success`**.

Soft condition branching belongs on [`if`](../if/), not `try`.


<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 560 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="try branch ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="90" r="6"/>
  <text class="qs-caption" x="48" y="120" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="90" x2="140" y2="90"/>
  <rect class="qs-node qs-node-accent" x="140" y="60" width="140" height="60" rx="8"/>
  <text class="qs-label" x="210" y="96" text-anchor="middle">try</text>
  <path class="qs-edge qs-edge-ok" d="M280 78 H340 V50 H400"/>
  <circle class="qs-port" cx="406" cy="50" r="6"/>
  <text class="qs-caption" x="460" y="54">success</text>
  <path class="qs-edge" d="M280 102 H340 V130 H400"/>
  <circle class="qs-port" cx="406" cy="130" r="6"/>
  <text class="qs-caption" x="460" y="134">failed</text>
</svg>
<figcaption>Framed exception boundary — see frame diagram below. Connect edges with matching <code>sourceHandle</code>.</figcaption>
</figure>
<!-- qs-ports:end -->

<!-- qs-frame:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 720 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="try framed container">
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
  <text class="qs-label" x="120" y="52">try frame</text>
  <circle class="qs-port" cx="120" cy="168" r="5"/>
  <text class="qs-caption" x="120" y="192" text-anchor="middle">entry</text>
  <line class="qs-edge qs-edge-ok" x1="126" y1="168" x2="200" y2="168"/>
  <rect class="qs-node" x="200" y="144" width="120" height="48" rx="8"/>
  <text class="qs-label" x="260" y="174" text-anchor="middle">body</text>
  <line class="qs-edge qs-edge-ok" x1="320" y1="168" x2="394" y2="168"/>
  <circle class="qs-port" cx="400" cy="168" r="5"/>
  <text class="qs-caption" x="400" y="192" text-anchor="middle">exit</text>
  <text class="qs-caption" x="304" y="128" text-anchor="middle">children · parentId → frame</text>
  <path class="qs-edge qs-edge-ok" d="M520 50 H560 V58 H610"/>
  <circle class="qs-port" cx="616" cy="58" r="6"/>
  <text class="qs-caption" x="660" y="62">success</text>
  <path class="qs-edge " d="M520 110 H560 V118 H610"/>
  <circle class="qs-port" cx="616" cy="118" r="6"/>
  <text class="qs-caption" x="660" y="122">failed</text>
</svg>
<figcaption>Outside wires attach to the frame only. Body runs entry → … → exit once; throws take <code>failed</code>.</figcaption>
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

---
title: try
description: Framed exception boundary — success / failed handles
---

`try` is a **framed subgraph container**. Body children run once; if any body node throws (HTTP/assert/etc.), the run continues on the **`failed`** handle. A clean exit through the body **`exit`** port takes **`success`**.

Soft condition branching belongs on [`if`](../if/), not `try`.





<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 540 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="try outer frame ports">
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
  <text class="qs-label" x="110" y="56">try</text>
  <circle class="qs-port" cx="88" cy="58" r="5"/>
  <circle class="qs-port" cx="418" cy="46" r="5"/>
  <text class="qs-caption" x="448" y="50">success</text>
  <line class="qs-edge qs-edge-ok" x1="424" y1="46" x2="470" y2="46"/>
  <circle class="qs-port" cx="476" cy="46" r="5"/>
  <circle class="qs-port" cx="418" cy="72" r="5"/>
  <text class="qs-caption" x="448" y="76">failed</text>
  <line class="qs-edge " x1="424" y1="72" x2="470" y2="72"/>
  <circle class="qs-port" cx="476" cy="72" r="5"/>
  <rect class="qs-node" x="104" y="78" width="298" height="60" rx="6" stroke-dasharray="4 3" fill="none"/>
  <text class="qs-caption" x="253" y="112" text-anchor="middle">inner body · entry → … → exit</text>
</svg>
<figcaption>Framed exception boundary — outer ports on the header; entry/exit on the inner body border. See the frame wiring diagram below.</figcaption>
</figure>
<!-- qs-ports:end -->

<!-- qs-frame:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 720 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="try framed container wiring">
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
  <text class="qs-label" x="110" y="54">try</text>
  <circle class="qs-port" cx="88" cy="56" r="6"/>
  <circle class="qs-port" cx="542" cy="44" r="6"/>
  <line class="qs-edge qs-edge-ok" x1="548" y1="44" x2="598" y2="44"/>
  <circle class="qs-port" cx="604" cy="44" r="6"/>
  <text class="qs-caption" x="648" y="48">success</text>
  <line class="qs-edge " x1="548" y1="70" x2="598" y2="70"/>
  <circle class="qs-port" cx="604" cy="70" r="6"/>
  <text class="qs-caption" x="648" y="74">failed</text>
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
<figcaption><code>in</code> and header <code>success</code>/<code>failed</code> are outside. Body wires use inner <code>entry</code> (source) → child → <code>exit</code> (target).</figcaption>
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

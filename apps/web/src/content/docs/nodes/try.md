---
title: try
description: Framed exception boundary — success / failed handles
---

`try` is a **framed subgraph container**. Body children run once; if any body node throws (HTTP/assert/etc.), the run continues on the **`failed`** handle. A clean exit through the body **`exit`** port takes **`success`**.

Soft condition branching belongs on [`if`](../if/), not `try`.

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

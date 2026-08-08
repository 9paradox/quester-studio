---
title: note
description: Canvas sticky for plain-text annotations (not executed)
---
A disconnected canvas sticky for documentation on the flow. Notes have no handles, cannot be connected, and are skipped by reachability validation and execution — CLI and desktop runs ignore them.


<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 420 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="note has no ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <rect class="qs-node qs-node-deny" x="110" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="210" y="75" text-anchor="middle">note</text>
  <text class="qs-caption" x="210" y="128" text-anchor="middle">no handles · no edges</text>
</svg>
<figcaption>Canvas sticky. Edges to/from note are invalid.</figcaption>
</figure>
<!-- qs-ports:end -->

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `text` | string | Plain-text body shown on the canvas |
| `fontSize` | number | Body font size in CSS pixels (10–48, default 12) |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | None (canvas-only) |
| **Output** | Not executed |

## Examples

```json
{
  "id": "tip",
  "type": "note",
  "data": {
    "label": "Note",
    "text": "Use local env for DummyJSON credentials",
    "fontSize": 14
  },
  "position": { "x": 40, "y": 280 },
  "width": 240,
  "height": 160
}
```




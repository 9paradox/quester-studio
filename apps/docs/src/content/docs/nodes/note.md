---
title: note
description: Canvas sticky for plain-text annotations (not executed)
---

A disconnected canvas sticky for documentation on the flow. Notes have no handles, cannot be connected, and are skipped by reachability validation and execution — CLI and desktop runs ignore them.

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `text` | string | Plain-text body shown on the canvas |

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
    "text": "Use local env for DummyJSON credentials"
  },
  "position": { "x": 40, "y": 280 },
  "width": 240,
  "height": 160
}
```

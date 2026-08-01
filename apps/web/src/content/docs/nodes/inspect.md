---
title: inspect
description: Pass through or JMESPath-subset previous output for debugging; alias preview
---

Debug/display step — same idea as [`json`](../json/): passthrough or JMESPath subset of the **previous** output. Alias type: **`preview`**.

Prefer this when you want an explicit “inspect” step in the canvas; `json` remains available for the same behavior.

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `expression` | string | Optional JMESPath; omit to pass through |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output |
| **Output** | Full previous output, or JMESPath result |

## Examples

### Passthrough

```json
{
  "id": "peek",
  "type": "inspect",
  "data": { "label": "Inspect" }
}
```

### Subset

```json
{
  "type": "preview",
  "data": { "expression": "body.products[0]" }
}
```

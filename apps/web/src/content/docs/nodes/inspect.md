---
title: inspect
description: Pass through or JMESPath-subset previous output for debugging; alias preview
---
Debug/display step — same idea as [`json`](../json/): passthrough or JMESPath subset of the **previous** output. Alias type: **`preview`**.

Prefer this when you want an explicit “inspect” step in the canvas; `json` remains available for the same behavior. Expressions start at the previous root (`body`), not `previous.body` ([How flows work](../../concepts/)).


<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="inspect ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="70" r="6"/>
  <text class="qs-caption" x="48" y="100" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="70" x2="150" y2="70"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">inspect</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>Debug view; alias preview. Multiple outgoing edges (fan-out) share the same output.</figcaption>
</figure>
<!-- qs-ports:end -->

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




---
title: delay
description: Sleep for N milliseconds (optional jitter); alias wait
---
Pauses the flow, then passes the previous node output through unchanged. Useful for rate limits and demo pacing. Alias type: **`wait`** (same schema and plugin).


<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="delay ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="70" r="6"/>
  <text class="qs-caption" x="48" y="100" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="70" x2="150" y2="70"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">delay</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>Sleep, then passthrough. Multiple outgoing edges (fan-out) share the same output.</figcaption>
</figure>
<!-- qs-ports:end -->

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `ms` | number | Non-negative sleep duration in milliseconds |
| `jitterMs` | number | Optional extra random delay from `0` to this value |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output |
| **Output** | Same as input (passthrough) |

Respects run **Stop** / `AbortSignal` between waits when the runtime provides a signal (desktop Stop, cancel RPC).

## Examples

```json
{
  "id": "pause",
  "type": "delay",
  "data": { "ms": 250, "jitterMs": 50, "label": "Brief pause" }
}
```

```json
{
  "id": "waitAlias",
  "type": "wait",
  "data": { "ms": 1000 }
}
```




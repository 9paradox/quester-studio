---
title: delay
description: Sleep for N milliseconds (optional jitter); alias wait
---

Pauses the flow, then passes the previous node output through unchanged. Useful for rate limits and demo pacing. Alias type: **`wait`** (same schema and plugin).

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

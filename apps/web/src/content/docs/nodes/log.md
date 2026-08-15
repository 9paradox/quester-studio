---
title: log
description: Write a templated message to the run log and pass data through
---
Appends a resolved message to the run log (CLI stderr / desktop Logs). Passes the previous output through, adding a `logged` field when the input is a plain object.

`message` is templated (`{{input.*}}` or `{{nodes.id…}}`). [How flows work](../../concepts/).




<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="log ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="70" r="6"/>
  <text class="qs-caption" x="48" y="100" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="70" x2="150" y2="70"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">log</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>Log line; wire continues. Multiple outgoing edges (fan-out) share the same output.</figcaption>
</figure>
<!-- qs-ports:end -->

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `message` | string | Templated log line |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output |
| **Output** | Object input plus `{ logged }`, or `{ value, logged }` for non-objects |

## Examples

```json
{
  "id": "progress",
  "type": "log",
  "data": {
    "message": "User {{input.username}} status={{nodes.head.status}}",
    "label": "Log progress"
  }
}
```




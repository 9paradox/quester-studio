---
title: subflow
description: Call another flow in the same workspace (depth and cycle guards)
---
Runs another flow by id and returns that flow’s **output** node result. Depth is capped (default max **5**); cyclic call stacks are rejected. See [SECURITY.md](https://github.com/9paradox/quester-studio/blob/main/SECURITY.md).




<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="subflow ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="70" r="6"/>
  <text class="qs-caption" x="48" y="100" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="70" x2="150" y2="70"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">subflow</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>Calls another flow. Multiple outgoing edges (fan-out) share the same output.</figcaption>
</figure>
<!-- qs-ports:end -->

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `flowId` | string | Target flow id (filename without `.flow.json`) |
| `input` | object | Optional map of string templates → subflow run input fields |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output (not automatically passed unless you map it in `input`) |
| **Output** | Subflow’s flow output value |

## Examples

```json
{
  "id": "callEcho",
  "type": "subflow",
  "data": {
    "flowId": "echo-subflow",
    "input": {
      "message": "foreach count={{nodes.mapIds.count}}"
    },
    "label": "Call echo-subflow"
  }
}
```

The sample workspace includes `echo-subflow` for this pattern; `kitchen-sink` calls it on the demo path.




---
title: subflow
description: Call another flow in the same workspace (depth and cycle guards)
---

Runs another flow by id and returns that flow’s **output** node result. Depth is capped (default max **5**); cyclic call stacks are rejected. See [SECURITY.md](https://github.com/9paradox/quester-studio/blob/main/SECURITY.md).

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

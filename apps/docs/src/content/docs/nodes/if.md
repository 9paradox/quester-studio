---
title: if
description: Branch the flow on a templated condition and/or JMESPath checks (true / false handles)
---

Evaluates a condition and/or checks, then continues along the matching edge.

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `condition` | string | Optional templated expression |
| `checks` | array | Optional JMESPath checks (same shape/ops as [`assert`](/nodes/assert/)) |

Provide **`condition` and/or `checks`** (at least one). When both are set, they are combined with **AND**.

## Condition rules

1. Resolve `{{…}}` in `condition`.
2. Result is **true** if it is the string `"true"`, or any other non-empty string except `"0"` and `"false"`.
3. Result is **false** for `""`, `"0"`, or `"false"`.

## Checks

Same operators as `assert` (`eq`, `gte`, `contains`, …) against the **previous node’s output**. All checks must pass.

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output |
| **Output** | `{ "condition": true \| false }` |
| **Branch** | `"true"` or `"false"` — matches `sourceHandle` on edges |

## Edges

```json
{
  "id": "e-yes",
  "source": "check",
  "target": "setYes",
  "sourceHandle": "true"
}
```

```json
{
  "id": "e-no",
  "source": "check",
  "target": "setNo",
  "sourceHandle": "false"
}
```

## Examples

### Input flag

```json
{
  "id": "check",
  "type": "if",
  "data": { "condition": "{{input.active}}" }
}
```

With `--input '{"active":"true"}'` → true branch.  
With `--input '{"active":""}'` → false branch.

### HTTP status range (checks only)

After an `http` node:

```json
{
  "id": "ok",
  "type": "if",
  "data": {
    "checks": [
      { "path": "status", "op": "gte", "value": 200 },
      { "path": "status", "op": "lt", "value": 300 }
    ]
  }
}
```

### Condition and checks (AND)

```json
{
  "data": {
    "condition": "{{vars.runDemo}}",
    "checks": [{ "path": "status", "op": "eq", "value": 200 }]
  }
}
```

### Literal false

```json
{
  "condition": "false"
}
```

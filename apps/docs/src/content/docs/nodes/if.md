---
title: if
description: Branch the flow on a templated condition (true / false handles)
---

Evaluates a condition and continues along the matching edge.

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `condition` | string | required | Templated expression |

## Condition rules

1. Resolve `{{…}}` in `condition`.
2. Result is **true** if it is the string `"true"`, or any other non-empty string except `"0"` and `"false"`.
3. Result is **false** for `""`, `"0"`, or `"false"`.

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

### Literal false

```json
{
  "condition": "false"
}
```

### From HTTP status (via extract + set)

Prefer extracting first, then conditioning on a var or a simple template:

```json
{
  "id": "ok",
  "type": "if",
  "data": { "condition": "{{nodes.statusCheck}}" }
}
```

Where `statusCheck` is an extract/template that yields `"true"` / `"false"`.

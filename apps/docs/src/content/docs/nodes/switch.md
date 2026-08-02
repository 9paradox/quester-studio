---
title: switch
description: Multi-branch on a templated expression or JMESPath (sourceHandle per case)
---

Picks an outgoing edge by matching a string value against `cases`. Extends the `if` branching model with more than two handles.

Use templated `expression` for run/vars/nodes fields, or `path` as JMESPath on **previous** (`body.type`, not `previous.body.type`). See [How flows work](../../concepts/).

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `expression` | string | Optional templated string used for matching |
| `path` | string | Optional JMESPath on **previous** output; result is stringified |
| `cases` | array | `{ value, handle }` — at least one case |
| `defaultHandle` | string | Handle when nothing matches (default `"default"`) |

Provide **`expression` and/or `path`**.

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output |
| **Output** | `{ "matched": "<handle>" }` |
| **Branch** | The matched `handle` (or default) — must match `sourceHandle` on edges |

## Edges

```json
{
  "id": "e-ok",
  "source": "byStatus",
  "target": "okPath",
  "sourceHandle": "ok"
}
```

## Examples

### Templated expression

```json
{
  "id": "byStatus",
  "type": "switch",
  "data": {
    "expression": "{{nodes.head.status}}",
    "cases": [
      { "value": "200", "handle": "ok" },
      { "value": "404", "handle": "missing" }
    ],
    "defaultHandle": "other"
  }
}
```

### JMESPath on previous HTTP output

```json
{
  "data": {
    "path": "status",
    "cases": [{ "value": "200", "handle": "ok" }],
    "defaultHandle": "other"
  }
}
```

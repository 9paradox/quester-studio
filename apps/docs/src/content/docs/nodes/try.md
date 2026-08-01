---
title: try
description: Soft-fail branch — ok / catch handles without failing the run
---

Like [`if`](../if/), but intended for soft failure paths: failing checks take the **`catch`** handle instead of throwing (unlike [`assert`](../assert/)).

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `condition` | string | Optional templated truthy string |
| `checks` | array | Optional JMESPath checks (same ops as `assert`) |

Provide **`condition` and/or `checks`**. When both are set, they are combined with **AND**.

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output |
| **Output** | `{ "ok": true \| false, "input": <previous> }` |
| **Branch** | `"ok"` or `"catch"` |

## Edges

```json
{
  "source": "soft",
  "target": "happy",
  "sourceHandle": "ok"
}
```

```json
{
  "source": "soft",
  "target": "recover",
  "sourceHandle": "catch"
}
```

## Examples

```json
{
  "id": "soft",
  "type": "try",
  "data": {
    "checks": [{ "path": "matched", "op": "eq", "value": "ok" }],
    "label": "Try matched ok"
  }
}
```

This does **not** catch thrown errors from upstream nodes; it only branches on condition/checks evaluated against the previous output.

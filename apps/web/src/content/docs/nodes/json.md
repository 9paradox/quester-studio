---
title: json
description: Pass through or subset the previous node output with optional JMESPath
---

Selects JSON for the next step — either the whole previous output or a JMESPath subset. Useful as a display/debug step or to narrow data before `assert` / `transform`.

For run-panel / `--input` data, use `{{input.*}}` (not this node’s root).

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `expression` | string | Optional JMESPath; omit to pass through previous output |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output |
| **Output** | Full previous output, or JMESPath result |

## Examples

### Passthrough

```json
{
  "id": "view",
  "type": "json",
  "data": { "label": "Inspect" }
}
```

### First array item

```json
{
  "id": "first",
  "type": "json",
  "data": { "expression": "items[0]" }
}
```

Input `{ "items": [{ "id": 9 }] }` → `{ "id": 9 }`.

### HTTP body only

```json
{
  "expression": "body"
}
```

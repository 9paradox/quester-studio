---
title: foreach
description: Map over an array with max-items / concurrency caps
---

Processes an array of items (map-style), returning `{ results, count, truncated }`. Caps protect against runaway loops — see [SECURITY.md](https://github.com/9paradox/quester-studio/blob/main/SECURITY.md).

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `items` | string | JMESPath on previous output, **or** a templated JSON array string (must include `{{…}}`) |
| `itemVar` | string | Name for each element in `map` scope (default `item`) |
| `maxItems` | number | Cap (default `100`, hard max `10000`) |
| `concurrency` | number | Optional parallel workers (hard max `32`) |
| `map` | string | Optional JMESPath on `{ [itemVar]: item, index }` per element |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output (for JMESPath `items`) |
| **Output** | `{ results, count, truncated }` |

Abort/Stop cancels between items when a signal is provided.

## Examples

### JMESPath array on previous output

After an `http` node whose body has `products`:

```json
{
  "id": "titles",
  "type": "foreach",
  "data": {
    "items": "body.products",
    "map": "item.title",
    "maxItems": 50
  }
}
```

### Templated JSON array

```json
{
  "data": {
    "items": "[{{vars.limit}},{{vars.skip}},3]",
    "map": "item",
    "maxItems": 10
  }
}
```

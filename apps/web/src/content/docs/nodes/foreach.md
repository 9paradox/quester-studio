---
title: foreach
description: Map over an array with max-items / concurrency caps
---
Processes an array of items (map-style), returning `{ results, count, truncated }`. Caps protect against runaway loops — see [SECURITY.md](https://github.com/9paradox/quester-studio/blob/main/SECURITY.md).

`items` is either JMESPath on **previous** (`body.items`) or a templated JSON array string that includes `{{…}}` (e.g. `{{input.ids}}` or `{{nodes.<id>…}}`). In JMESPath mode do not write `previous.body.items`. [How flows work](../../concepts/).


<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="foreach ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="70" r="6"/>
  <text class="qs-caption" x="48" y="100" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="70" x2="150" y2="70"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">foreach</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>Maps an array (capped). Multiple outgoing edges (fan-out) share the same output.</figcaption>
</figure>
<!-- qs-ports:end -->

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




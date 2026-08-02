---
title: transform
description: Build a new object by mapping keys to JMESPath expressions
---
Creates an object where each key is the result of a JMESPath expression over the previous output (`body.id`, not `previous.body.id`). Run fields: `{{input.*}}` in other nodes — see [How flows work](../../concepts/).


<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="transform ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="70" r="6"/>
  <text class="qs-caption" x="48" y="100" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="70" x2="150" y2="70"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">transform</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>Build object via JMESPath map. Multiple outgoing edges (fan-out) share the same output.</figcaption>
</figure>
<!-- qs-ports:end -->

## Data

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | string | | Optional UI label |
| `map` | object | `{}` | Output key → JMESPath expression |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output (JMESPath root) |
| **Output** | New object with mapped keys |

## Examples

### Pick fields from nested data

Previous input:

```json
{ "user": { "id": 1, "name": "Ada", "role": "admin" } }
```

```json
{
  "id": "shape",
  "type": "transform",
  "data": {
    "map": {
      "id": "user.id",
      "name": "user.name"
    }
  }
}
```

Output:

```json
{ "id": 1, "name": "Ada" }
```

### From HTTP body

```json
{
  "map": {
    "id": "body.id",
    "email": "body.email",
    "status": "status"
  }
}
```

### Array projection

```json
{
  "map": {
    "names": "body.users[*].name",
    "firstId": "body.users[0].id"
  }
}
```

### Empty map

```json
{
  "map": {}
}
```

Output: `{}`.




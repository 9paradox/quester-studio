---
title: transform
description: Build a new object by mapping keys to JMESPath expressions
---

Creates an object where each key is the result of a JMESPath expression over the previous output.

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

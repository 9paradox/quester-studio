---
title: output
description: Produce the final flow result (passthrough or mapped fields)
---

Marks the flow result. Without `map`, returns the previous node’s output. With `map`, builds a new object from templated values.

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `map` | object | Optional key → template string |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output |
| **Output** | Previous input, or mapped object |

Mapped values are templated. If the resolved string is valid JSON, it is parsed; otherwise it stays a string.

## Examples

### Passthrough

```json
{
  "id": "output",
  "type": "output",
  "data": { "label": "Result" }
}
```

Returns whatever the previous node produced (often a full HTTP result).

### Mapped result

```json
{
  "id": "output",
  "type": "output",
  "data": {
    "map": {
      "userId": "{{nodes.userId}}",
      "email": "{{input.email}}",
      "status": "{{nodes.profile.status}}"
    }
  }
}
```

Example output:

```json
{
  "userId": "1",
  "email": "demo@example.com",
  "status": "200"
}
```

### Parsed JSON field

If a template resolves to JSON text, it becomes a structured value:

```json
{
  "map": {
    "profile": "{{nodes.profile.body}}"
  }
}
```

When `body` stringifies to an object in the template context, parsing may yield a nested object — prefer referencing fields you need explicitly when possible.

### Greeting only

```json
{
  "map": {
    "message": "Hello {{input.name}}"
  }
}
```

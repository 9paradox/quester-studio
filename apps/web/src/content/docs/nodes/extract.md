---
title: extract
description: Pull a value from the previous node output with JMESPath
---

Selects a value from the **previous node’s output** using [JMESPath](https://jmespath.org/).

For run-panel / `--input` fields, use `{{input.*}}` in templates (or a `template` / `set` node) — not extract.

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `expression` | string | required | JMESPath over the previous output |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output (the JSON root for JMESPath) |
| **Output** | Result of the expression (any JSON type, or `null` if missing) |

Downstream:

- The **next** node’s input is the extracted value (not the full previous object).
- Templates can use `{{nodes.<extractId>}}`.

```
http (full response) → extract (body.id → 42) → http (url uses {{nodes.userId}})
```

### Example — field from HTTP response

**Previous node output:**

```json
{
  "status": 201,
  "body": { "id": 42, "email": "demo@example.com" },
  "text": "{\"id\":42,\"email\":\"demo@example.com\"}",
  "headers": {},
  "request": { "method": "POST", "url": "https://api.example.com/users", "headers": {} },
  "timing": { "startedAt": 0, "endedAt": 10, "durationMs": 10 },
  "size": 40
}
```

**Node:**

```json
{
  "id": "userId",
  "type": "extract",
  "data": {
    "label": "User id",
    "expression": "body.id"
  }
}
```

| | Value |
| --- | --- |
| **Output** | `42` |
| **Later** | `{{nodes.userId}}` → `"42"` |

### Example — nested object

```json
{
  "id": "user",
  "type": "extract",
  "data": { "expression": "body" }
}
```

Output: `{ "id": 42, "email": "demo@example.com" }`  
Then `{{nodes.user.email}}` → `"demo@example.com"`.

### Example — need a run-input field instead

Do **not** use extract. Use a template on the next HTTP node:

```json
{
  "headers": { "X-User-Email": "{{input.email}}" }
}
```

Or capture it with `set` / `template`:

```json
{
  "type": "set",
  "data": { "variables": { "email": "{{input.email}}" } }
}
```

### Example — missing path

```json
{ "expression": "body.missing" }
```

Output: `null` · `{{nodes.userId}}` → `""`.

## More JMESPath examples

Assume previous output:

```json
{
  "body": {
    "items": [{ "id": 9, "name": "a" }, { "id": 10, "name": "b" }],
    "users": [
      { "name": "Ada", "active": true },
      { "name": "Bob", "active": false }
    ]
  }
}
```

| Expression | Output |
| --- | --- |
| `body.items[0].id` | `9` |
| `body.users[?active].name \| [0]` | `"Ada"` |
| `body.items[*].name` | `["a", "b"]` |

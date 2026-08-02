---
title: extract
description: Pull a value from the previous node output with JMESPath
---
Selects a value from the **previous node’s output** using [JMESPath](https://jmespath.org/).

For run-panel / `--input` fields, use `{{input.*}}` in templates (or a `template` / `set` node) — not extract.

<div class="qs-callout qs-callout-warn">

**Do not type** `previous.body` or `input.abc` in the JMESPath expression. After an HTTP node the root *is* the response — use `body.id`, `body.title`, `status`. Diagrams: [How flows work](../../concepts/).

</div>


<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="extract ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="70" r="6"/>
  <text class="qs-caption" x="48" y="100" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="70" x2="150" y2="70"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">extract</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>JMESPath over wire JSON (body.id, products[0]). Multiple outgoing edges (fan-out) share the same output.</figcaption>
</figure>
<!-- qs-ports:end -->

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

If you truly need JMESPath over the run payload, place an [`input`](../input/) node immediately before extract so previous *is* that object, then express `email` (not `input.email`).

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




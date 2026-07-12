---
title: assert
description: Fail the flow when JMESPath checks on the previous output do not pass
---

Runs one or more checks against the previous node’s output. On failure, execution throws and the flow stops.

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `checks` | array | required (min 1) | List of checks |

### Check object

| Field | Type | Description |
| --- | --- | --- |
| `path` | string | JMESPath against previous output |
| `equals` | any | Optional; deep-equal expected value |

- With `equals`: value at `path` must **exactly** deep-equal `equals` (JSON stringify compare — not a partial/subset match).
- Without `equals`: value at `path` must be truthy.

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output |
| **Output** | `{ "ok": true, "failures": [] }` on success |
| **On failure** | Throws `Assertion failed: …` |

## Examples

### Status equals 200

After an `http` node:

```json
{
  "id": "assertOk",
  "type": "assert",
  "data": {
    "checks": [{ "path": "status", "equals": 200 }]
  }
}
```

### Body field present

```json
{
  "checks": [{ "path": "body.id" }]
}
```

### Multiple checks

```json
{
  "id": "assertLogin",
  "type": "assert",
  "data": {
    "label": "Login ok",
    "checks": [
      { "path": "status", "equals": 201 },
      { "path": "body.id" },
      { "path": "body.email", "equals": "demo@example.com" }
    ]
  }
}
```

### Nested / object equality

`equals` compares with **exact deep equality** (`JSON.stringify` on both sides). The value at `path` must match `equals` fully — same keys, same nested values. Extra fields on the actual value cause a failure.

**Previous HTTP output:**

```json
{
  "status": 200,
  "body": { "ok": true, "role": "admin" }
}
```

**Pass — whole object matches:**

```json
{
  "checks": [
    {
      "path": "body",
      "equals": { "ok": true, "role": "admin" }
    }
  ]
}
```

**Fail — actual body has an extra field** (`id`), so it is not equal:

```json
{
  "body": { "ok": true, "role": "admin", "id": 1 }
}
```

Prefer asserting fields separately when you only care about some keys:

```json
{
  "checks": [
    { "path": "body.ok", "equals": true },
    { "path": "body.role", "equals": "admin" }
  ]
}
```

You can also point `path` at a nested object and still require an exact match:

```json
{
  "checks": [
    {
      "path": "body.user.profile",
      "equals": { "theme": "dark", "locale": "en" }
    }
  ]
}
```

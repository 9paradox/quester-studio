---
title: assert
description: Fail the flow when JMESPath checks on the previous output do not pass
---
Runs one or more checks against the previous node’s output. On failure, execution throws and the flow stops.

Check `path` values are JMESPath from the previous root (`status`, `body.id`) — not `previous.status` and not run-input paths (use templates / an [`input`](../input/) node first). See [How flows work](../../concepts/).




<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="assert ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="70" r="6"/>
  <text class="qs-caption" x="48" y="100" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="70" x2="150" y2="70"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">assert</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>JMESPath checks or throw. Multiple outgoing edges (fan-out) share the same output.</figcaption>
</figure>
<!-- qs-ports:end -->

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `checks` | array | required (min 1) | List of checks |

### Check object

| Field | Type | Description |
| --- | --- | --- |
| `path` | string | JMESPath against previous output |
| `op` | string | Optional operator (default `truthy`, or `eq` when `equals` is set) |
| `value` | any | Comparison value for ops that need one |
| `equals` | any | Legacy alias for `op: "eq"` + `value` |

### Operators

| `op` | Needs `value` | Passes when |
| --- | --- | --- |
| `eq` | yes | Deep equal (`JSON.stringify`) |
| `neq` | yes | Not deep equal |
| `gt` / `gte` / `lt` / `lte` | yes | Numeric compare when both sides are numbers (or numeric strings); otherwise string compare |
| `contains` | yes | String includes, or array has a deep-equal element |
| `notContains` | yes | Inverse of `contains` |
| `startsWith` / `endsWith` | yes | String prefix / suffix |
| `matches` | yes | `RegExp(value).test(actual)` on a string (or stringified number/boolean) |
| `exists` | no | Value is not `null` / `undefined` |
| `truthy` | no | JavaScript truthiness |
| `falsy` | no | JavaScript falsiness |

Legacy forms still work:

- `{ "path": "body.id" }` → `truthy`
- `{ "path": "status", "equals": 200 }` → `eq`

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output |
| **Output** | `{ "ok": true, "failures": [] }` on success |
| **On failure** | Throws `Assertion failed: …` |

## Examples

### Status in 2xx

```json
{
  "id": "assertOk",
  "type": "assert",
  "data": {
    "checks": [
      { "path": "status", "op": "gte", "value": 200 },
      { "path": "status", "op": "lt", "value": 300 }
    ]
  }
}
```

### Body message contains text

```json
{
  "checks": [
    { "path": "body.message", "op": "contains", "value": "created" }
  ]
}
```

### Legacy equals (still valid)

```json
{
  "checks": [{ "path": "status", "equals": 200 }]
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
      { "path": "status", "op": "eq", "value": 201 },
      { "path": "body.id", "op": "exists" },
      { "path": "body.email", "op": "eq", "value": "demo@example.com" }
    ]
  }
}
```

### Nested / object equality

`eq` (and legacy `equals`) compares with **exact deep equality** (`JSON.stringify` on both sides). The value at `path` must match fully — same keys, same nested values. Extra fields on the actual value cause a failure.

Prefer asserting fields separately when you only care about some keys:

```json
{
  "checks": [
    { "path": "body.ok", "op": "eq", "value": true },
    { "path": "body.role", "op": "eq", "value": "admin" }
  ]
}
```




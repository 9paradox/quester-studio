---
title: if
description: Branch the flow on a templated condition and/or JMESPath checks (true / false handles)
---
Evaluates a condition and/or checks, then continues along the matching edge.

- `condition` may use templates (`{{input.active}}`, `{{nodes.x…}}`).
- `checks[].path` is JMESPath on **previous** output (`status`, not `previous.status`).

Concepts: [How flows work](../../concepts/).


<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 560 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="if branch ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="90" r="6"/>
  <text class="qs-caption" x="48" y="120" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="90" x2="140" y2="90"/>
  <rect class="qs-node qs-node-accent" x="140" y="60" width="140" height="60" rx="8"/>
  <text class="qs-label" x="210" y="96" text-anchor="middle">if</text>
  <path class="qs-edge qs-edge-ok" d="M280 78 H340 V50 H400"/>
  <circle class="qs-port" cx="406" cy="50" r="6"/>
  <text class="qs-caption" x="460" y="54">true</text>
  <path class="qs-edge" d="M280 102 H340 V130 H400"/>
  <circle class="qs-port" cx="406" cy="130" r="6"/>
  <text class="qs-caption" x="460" y="134">false</text>
</svg>
<figcaption>Follows matching sourceHandle. Connect edges with matching <code>sourceHandle</code>.</figcaption>
</figure>
<!-- qs-ports:end -->

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `condition` | string | Optional templated expression |
| `checks` | array | Optional JMESPath checks (same shape/ops as [`assert`](../assert/)) |

Provide **`condition` and/or `checks`** (at least one). When both are set, they are combined with **AND**.

## Condition rules

1. Resolve `{{…}}` in `condition`.
2. Result is **true** if it is the string `"true"`, or any other non-empty string except `"0"` and `"false"`.
3. Result is **false** for `""`, `"0"`, or `"false"`.

## Checks

Same operators as `assert` (`eq`, `gte`, `contains`, …) against the **previous node’s output**. All checks must pass.

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output |
| **Output** | `{ "condition": true \| false }` |
| **Branch** | `"true"` or `"false"` — matches `sourceHandle` on edges |

## Edges

```json
{
  "id": "e-yes",
  "source": "check",
  "target": "setYes",
  "sourceHandle": "true"
}
```

```json
{
  "id": "e-no",
  "source": "check",
  "target": "setNo",
  "sourceHandle": "false"
}
```

## Examples

### Input flag

```json
{
  "id": "check",
  "type": "if",
  "data": { "condition": "{{input.active}}" }
}
```

With `--input '{"active":"true"}'` → true branch.  
With `--input '{"active":""}'` → false branch.

### HTTP status range (checks only)

After an `http` node:

```json
{
  "id": "ok",
  "type": "if",
  "data": {
    "checks": [
      { "path": "status", "op": "gte", "value": 200 },
      { "path": "status", "op": "lt", "value": 300 }
    ]
  }
}
```

### Condition and checks (AND)

```json
{
  "data": {
    "condition": "{{vars.runDemo}}",
    "checks": [{ "path": "status", "op": "eq", "value": 200 }]
  }
}
```

### Literal false

```json
{
  "condition": "false"
}
```




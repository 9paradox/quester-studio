---
title: try
description: Soft-fail branch — ok / catch handles without failing the run
---
Like [`if`](../if/), but intended for soft failure paths: failing checks take the **`catch`** handle instead of throwing (unlike [`assert`](../assert/)).

`checks` use JMESPath on **previous** (`status`, not `previous.status`). Templated `condition` may use `{{input.*}}`. [How flows work](../../concepts/).


<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 560 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="try branch ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="90" r="6"/>
  <text class="qs-caption" x="48" y="120" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="90" x2="140" y2="90"/>
  <rect class="qs-node qs-node-accent" x="140" y="60" width="140" height="60" rx="8"/>
  <text class="qs-label" x="210" y="96" text-anchor="middle">try</text>
  <path class="qs-edge qs-edge-ok" d="M280 78 H340 V50 H400"/>
  <circle class="qs-port" cx="406" cy="50" r="6"/>
  <text class="qs-caption" x="460" y="54">ok</text>
  <path class="qs-edge" d="M280 102 H340 V130 H400"/>
  <circle class="qs-port" cx="406" cy="130" r="6"/>
  <text class="qs-caption" x="460" y="134">catch</text>
</svg>
<figcaption>Soft-fail branch handles. Connect edges with matching <code>sourceHandle</code>.</figcaption>
</figure>
<!-- qs-ports:end -->

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `condition` | string | Optional templated truthy string |
| `checks` | array | Optional JMESPath checks (same ops as `assert`) |

Provide **`condition` and/or `checks`**. When both are set, they are combined with **AND**.

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output |
| **Output** | `{ "ok": true \| false, "input": <previous> }` |
| **Branch** | `"ok"` or `"catch"` |

## Edges

```json
{
  "source": "soft",
  "target": "happy",
  "sourceHandle": "ok"
}
```

```json
{
  "source": "soft",
  "target": "recover",
  "sourceHandle": "catch"
}
```

## Examples

```json
{
  "id": "soft",
  "type": "try",
  "data": {
    "checks": [{ "path": "matched", "op": "eq", "value": "ok" }],
    "label": "Try matched ok"
  }
}
```

This does **not** catch thrown errors from upstream nodes; it only branches on condition/checks evaluated against the previous output.




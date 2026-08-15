---
title: json
description: Pass through or subset the previous node output with optional JMESPath
---
Selects JSON for the next step — either the whole previous output or a JMESPath subset. Useful as a display/debug step or to narrow data before `assert` / `transform`.

For run-panel / `--input` data, use `{{input.*}}` (not this node’s root). Expressions are JMESPath on previous — `body`, not `previous.body` or `input.field` ([How flows work](../../concepts/)).




<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="json ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="70" r="6"/>
  <text class="qs-caption" x="48" y="100" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="70" x2="150" y2="70"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">json</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>Passthrough or JMESPath subset. Multiple outgoing edges (fan-out) share the same output.</figcaption>
</figure>
<!-- qs-ports:end -->

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `expression` | string | Optional JMESPath; omit to pass through previous output |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output |
| **Output** | Full previous output, or JMESPath result |

## Examples

### Passthrough

```json
{
  "id": "view",
  "type": "json",
  "data": { "label": "Inspect" }
}
```

### First array item

```json
{
  "id": "first",
  "type": "json",
  "data": { "expression": "items[0]" }
}
```

Input `{ "items": [{ "id": 9 }] }` → `{ "id": 9 }`.

### HTTP body only

```json
{
  "expression": "body"
}
```




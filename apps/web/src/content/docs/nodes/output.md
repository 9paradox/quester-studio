---
title: output
description: Produce the final flow result (passthrough or mapped fields)
---
Marks the flow result. Without `map`, returns the previous node’s output. With `map`, builds a new object from templated values (`{{input.*}}` or `{{nodes.id…}}`). [How flows work](../../concepts/).


<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 480 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="output ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="70" cy="76" r="6"/>
  <text class="qs-caption" x="70" y="108" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="76" y1="76" x2="170" y2="76"/>
  <rect class="qs-node qs-node-accent" x="170" y="48" width="160" height="56" rx="8"/>
  <text class="qs-label" x="250" y="82" text-anchor="middle">output</text>
  <text class="qs-caption" x="390" y="80">no out</text>
</svg>
<figcaption>Flow result. Terminal for the chosen path.</figcaption>
</figure>
<!-- qs-ports:end -->

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




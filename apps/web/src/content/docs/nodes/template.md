---
title: template
description: Render a string with {{…}} tokens and optional Eta expressions
---
Builds a string. First `{{…}}` tokens are resolved, then the result is rendered with [Eta](https://eta.js.org/).

Mustache templates use `{{input.*}}` and `{{nodes.*}}`. Eta can also use `it.previous` for the wire JSON. Concepts: [How flows work](../../concepts/).


<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="template ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="70" r="6"/>
  <text class="qs-caption" x="48" y="100" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="70" x2="150" y2="70"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">template</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>Renders a string. Multiple outgoing edges (fan-out) share the same output.</figcaption>
</figure>
<!-- qs-ports:end -->

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `template` | string | required | Template source |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output (available as Eta `it.previous`) |
| **Output** | Rendered string |

### Eta context (`it`)

| Key | Meaning |
| --- | --- |
| `it.input` | Flow run input |
| `it.vars` | Current vars |
| `it.nodes` | Map of node id → output |
| `it.previous` | Previous node output |

## Examples

### Simple mustache only

```json
{
  "id": "msg",
  "type": "template",
  "data": {
    "template": "Hello {{input.username}}, token={{vars.token}}"
  }
}
```

### Eta expression

```json
{
  "id": "eta",
  "type": "template",
  "data": {
    "template": "Hello <%= it.input.username %>"
  }
}
```

### Build a JSON string for a later http body

```json
{
  "id": "payload",
  "type": "template",
  "data": {
    "template": "{\"id\":<%= it.previous %>,\"name\":\"{{input.username}}\"}"
  }
}
```

### Conditional Eta

```json
{
  "template": "<%= it.input.active ? 'on' : 'off' %>"
}
```




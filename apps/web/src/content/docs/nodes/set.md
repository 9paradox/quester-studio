---
title: set
description: Write flow variables for later {{vars.*}} references
---
Merges key/value pairs into the flow’s `vars` bag. The previous node’s output is passed through unchanged.

String values are [templated](../../templates/): `{{input.*}}` or `{{nodes.id…}}`. Overview: [How flows work](../../concepts/).


<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="set ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="70" r="6"/>
  <text class="qs-caption" x="48" y="100" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="70" x2="150" y2="70"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">set</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>Writes vars; passes wire through. Multiple outgoing edges (fan-out) share the same output.</figcaption>
</figure>
<!-- qs-ports:end -->

## Data

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | string | | Optional UI label |
| `variables` | object | `{}` | Keys to set; string values are templated |

Values may be `string`, `number`, or `boolean`.

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output |
| **Output** | Same as input (passthrough) |
| **Side effect** | Updates `vars` for subsequent nodes |

## Examples

### Static and templated vars

```json
{
  "id": "init",
  "type": "set",
  "data": {
    "variables": {
      "greeting": "Hello {{input.username}}",
      "retryCount": 3,
      "enabled": true
    }
  }
}
```

Later: `{{vars.greeting}}`, `{{vars.retryCount}}`.

### Capture from a previous extract

If the previous node output is a token string (e.g. from `extract`):

```json
{
  "id": "storeToken",
  "type": "set",
  "data": {
    "variables": {
      "token": "{{nodes.tokenExtract}}"
    }
  }
}
```

Or after an HTTP node:

```json
{
  "variables": {
    "token": "{{nodes.login.body.token}}"
  }
}
```

### Branch labels

Often paired with [`if`](../if/):

```json
{
  "id": "setYes",
  "type": "set",
  "data": { "variables": { "path": "yes" } }
}
```




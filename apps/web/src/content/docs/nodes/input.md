---
title: input
description: Puts the flow run payload on the wire (not the graph entry)
---
Places the Run panel / `--input` JSON on the wire for the next node. The graph entry is [`start`](../start/), not `input`.

Typical chain: `start → input → http → …`

<div class="qs-callout qs-callout-warn">

**Name collision:** this **node type** is not the same as `{{input.*}}` (run payload in templates) or “execute input” (previous node JSON). You do **not** need an `input` node just to read run data later — `{{input.username}}` works from any templated field. See [How flows work](../../concepts/).

</div>


<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="input ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="70" r="6"/>
  <text class="qs-caption" x="48" y="100" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="70" x2="150" y2="70"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">input</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>Puts run payload on the wire. Multiple outgoing edges (fan-out) share the same output.</figcaption>
</figure>
<!-- qs-ports:end -->

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `value` | any | Default run payload persisted in the flow file (desktop Run panel loads this) |
| `schema` | object | Optional JSON Schema-like hint (not enforced at execute time) |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output (often `{}` from `start`) — ignored |
| **Output** | The flow run input object (`--input` / Run panel) |

## Examples

### After start

```json
{
  "id": "input",
  "type": "input",
  "data": {
    "label": "Credentials",
    "value": {
      "username": "demo",
      "email": "demo@example.com"
    }
  }
}
```

Desktop loads `data.value` into the Run input editor when you open the flow. CLI `--input` still overrides at execute time:

```bash
--input '{"username":"demo","email":"demo@example.com"}'
```

Output:

```json
{ "username": "demo", "email": "demo@example.com" }
```

### Prefer templates when you only need fields

```json
{
  "headers": { "X-User": "{{input.username}}" }
}
```

[`extract`](../extract/) always reads the **previous** node (e.g. HTTP `body.id`), not the run payload. For JMESPath over the run object without templates, put an `input` node immediately before `extract`.




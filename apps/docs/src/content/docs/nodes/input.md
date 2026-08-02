---
title: input
description: Puts the flow run payload on the wire (not the graph entry)
---

Places the Run panel / `--input` JSON on the wire for the next node. The graph entry is [`start`](../start/), not `input`.

Typical chain: `start → input → http → …`

<div class="qs-callout-mistakes">

**Name collision:** this **node type** is not the same as `{{input.*}}` (run payload in templates) or “execute input” (previous node JSON). You do **not** need an `input` node just to read run data later — `{{input.username}}` works from any templated field. See [How flows work](../../concepts/).

</div>

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

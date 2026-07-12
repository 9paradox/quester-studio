---
title: input
description: Puts the flow run payload on the wire (not the graph entry)
---

Places the Run panel / `--input` JSON on the wire for the next node. The graph entry is [`start`](/nodes/start/), not `input`.

Typical chain: `start → input → http → …`

You do **not** need an `input` node just to read run data later — `{{input.*}}` works from any templated field. Use this node when the next step should receive the run payload as its previous output.

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `schema` | object | Optional JSON Schema-like hint (not enforced at execute time) |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output (often `{}` from `start`) |
| **Output** | The flow run input object (`--input` / Run panel) |

## Examples

### After start

```json
{
  "id": "input",
  "type": "input",
  "data": { "label": "Credentials" }
}
```

Run with:

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

[`extract`](/nodes/extract/) always reads the **previous** node (e.g. HTTP `body.id`), not the run payload.

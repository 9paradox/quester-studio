---
title: Template syntax
description: How {{env}}, {{input}}, {{vars}}, {{secrets}}, {{nodes}}, and {{previous}} resolve at runtime
---

String fields in nodes (URLs, headers, bodies, conditions, `set` values, and `output` maps) support **mustache-style** tokens. The engine replaces each `{{…}}` before the node runs.

New to Quester? Read [How flows work](../concepts/) first — especially **input node vs `{{input.*}}`** vs **`{{previous.*}}`**.

## Scopes

| Token | Source | Example |
| --- | --- | --- |
| `{{env.KEY}}` | Environment `variables` | `{{env.API_BASE}}` |
| `{{secrets.KEY}}` | Secrets file for the selected env | `{{secrets.API_TOKEN}}` |
| `{{input.path}}` | Flow **run** input (CLI `--input` / Run panel) | `{{input.username}}` |
| `{{vars.key}}` | Variables set by `set` nodes | `{{vars.token}}` |
| `{{nodes.id}}` | Full output of a prior node | `{{nodes.login}}` |
| `{{nodes.id.path}}` | Nested field on a prior node output | `{{nodes.login.body.id}}` |
| `{{previous}}` / `{{previous.path}}` | **Wire** — previous node’s output (execute input) | `{{previous.body.id}}` |

Missing paths resolve to an empty string (`""`).

<div class="qs-callout-mistakes">

**Still wrong:** bare `previous.body` without `{{…}}`, and JMESPath expressions like extract’s `previous.body` (the root *is* previous — use `body.id`). Prefer a named node (`{{nodes.login.body.id}}`) when you need a step that is not immediately upstream.

</div>

## Run input vs wire (previous) vs `input` node

| Need | Use |
| --- | --- |
| Field from Run panel / `--input` in a URL, header, body, etc. | `{{input.email}}` |
| Put that same payload on the wire for the next node | [`input`](../nodes/input/) node (`start → input → …`) |
| Field from the **immediate** previous step | `{{previous.body.id}}` or [`extract`](../nodes/extract/) JMESPath `body.id` |
| Field from a named earlier node | `{{nodes.httpId.body.id}}` |
| Combine bags | [`merge`](../nodes/merge/) `sources: ["previous", "input", …]` |

[`extract`](../nodes/extract/) and [`json`](../nodes/json/) always search the **previous node output** with JMESPath. They do not accept `source: "input"` and do not understand `{{…}}` inside the expression.

## Dot paths

Paths walk plain objects with `.`:

```
{{input.profile.age}}
{{previous.body.user.id}}
{{nodes.login.body.user.id}}
{{env.API_BASE}}
```

## Examples

### URL and headers

```json
{
  "method": "GET",
  "url": "{{env.API_BASE}}/users/{{previous.body.id}}",
  "headers": {
    "Authorization": "Bearer {{secrets.API_TOKEN}}"
  }
}
```

Same idea with an explicit node id (works even if another step sits between):

```json
{
  "url": "{{env.API_BASE}}/users/{{nodes.login.body.id}}"
}
```

### JSON body as a string

Templates are applied to the whole string:

```json
{
  "method": "POST",
  "url": "{{env.API_BASE}}/users",
  "headers": { "Content-Type": "application/json" },
  "body": "{\"username\": \"{{input.username}}\", \"email\": \"{{input.email}}\"}"
}
```

### Object body

Object bodies are stringified, then templated:

```json
{
  "body": {
    "username": "{{input.username}}",
    "token": "{{secrets.API_TOKEN}}"
  }
}
```

### Conditions (`if`)

Use a templated `condition` string and/or `checks` (same operators as `assert`). When both are set, they are AND’d:

```json
{
  "type": "if",
  "data": {
    "condition": "{{input.active}}",
    "checks": [{ "path": "status", "op": "gte", "value": 200 }]
  }
}
```

A bare `condition` is treated as truthy unless the resolved string is `""`, `"0"`, or `"false"`. Check `path` values are JMESPath on the **previous** output (e.g. after HTTP: `status`), not `previous.status` inside the JMESPath.

### `set` variables

String values are templated; numbers and booleans are stored as-is:

```json
{
  "type": "set",
  "data": {
    "variables": {
      "greeting": "Hello {{input.username}}",
      "lastStatus": "{{previous.status}}",
      "retryCount": 3
    }
  }
}
```

Later nodes can use `{{vars.greeting}}`.

## Template node vs `{{…}}`

- **`{{…}}` tokens** — simple string substitution in any templated field (including `{{previous.*}}`).
- **`template` node** — also supports [Eta](https://eta.js.org/) (`<%= it.input.name %>`, `<%= it.previous %>`) after `{{…}}` resolution. See [template node](../nodes/template/).

## JMESPath (separate)

`extract`, `transform`, `assert`, and `json` use **JMESPath** over the **previous node’s output** — not `{{…}}` tokens.

| Goal | Expression |
| --- | --- |
| HTTP response id | `body.id` |
| Nested name | `body.user.name` |
| First item | `body.items[0]` |

In a **template** next door you may write `{{previous.body.id}}`. In the extract **expression** itself, write `body.id` only.

---
title: Template syntax
description: How {{env}}, {{input}}, {{vars}}, {{secrets}}, and {{nodes}} resolve at runtime
---

String fields in nodes (URLs, headers, bodies, conditions, `set` values, and `output` maps) support **mustache-style** tokens. The engine replaces each `{{…}}` before the node runs.

## Scopes

| Token | Source | Example |
| --- | --- | --- |
| `{{env.KEY}}` | Environment `variables` | `{{env.API_BASE}}` |
| `{{secrets.KEY}}` | Secrets file for the selected env | `{{secrets.API_TOKEN}}` |
| `{{input.path}}` | Flow run input (CLI `--input` / Run panel) | `{{input.username}}` |
| `{{vars.key}}` | Variables set by `set` nodes | `{{vars.token}}` |
| `{{nodes.id}}` | Full output of a prior node | `{{nodes.login}}` |
| `{{nodes.id.path}}` | Nested field on a prior node output | `{{nodes.login.body.id}}` |

Missing paths resolve to an empty string (`""`).

### Run input vs previous node

| Need | Use |
| --- | --- |
| Field from Run panel / `--input` | `{{input.email}}` (or merge `sources: ["input"]`) |
| Field from the last step (e.g. HTTP `body.id`) | [`extract`](/nodes/extract/) JMESPath, or `{{nodes.httpId.body.id}}` |

[`extract`](/nodes/extract/) and [`json`](/nodes/json/) always search the **previous** node output. They do not accept `source: "input"`.

## Dot paths

Paths walk plain objects with `.`:

```
{{input.profile.age}}
{{nodes.login.body.user.id}}
{{env.API_BASE}}
```

## Examples

### URL and headers

```json
{
  "method": "GET",
  "url": "{{env.API_BASE}}/users/{{nodes.userId}}",
  "headers": {
    "Authorization": "Bearer {{secrets.API_TOKEN}}"
  }
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

The condition is templated, then treated as truthy unless the result is `""`, `"0"`, or `"false"`:

```json
{
  "type": "if",
  "data": { "condition": "{{input.active}}" }
}
```

### `set` variables

String values are templated; numbers and booleans are stored as-is:

```json
{
  "type": "set",
  "data": {
    "variables": {
      "greeting": "Hello {{input.username}}",
      "retryCount": 3
    }
  }
}
```

Later nodes can use `{{vars.greeting}}`.

## Template node vs `{{…}}`

- **`{{…}}` tokens** — simple string substitution in any templated field.
- **`template` node** — also supports [Eta](https://eta.js.org/) (`<%= it.input.name %>`) after `{{…}}` resolution. See [template node](/nodes/template/).

## JMESPath (separate)

`extract`, `transform`, `assert`, and `json` use **JMESPath** over the **previous node’s output** — not `{{…}}` tokens. Example: `body.id`, `user.name`, `items[0]`.

Run payload fields belong in templates: `{{input.email}}`.

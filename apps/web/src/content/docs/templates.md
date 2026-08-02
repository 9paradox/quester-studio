---
title: Template syntax
description: How {{env}}, {{input}}, {{vars}}, {{secrets}}, and {{nodes}} resolve at runtime
---

String fields in nodes (URLs, headers, bodies, conditions, `set` values, and `output` maps) support **mustache-style** tokens. The engine replaces each `{{…}}` before the node runs.

The **previous node’s JSON is not a template scope**. It is already the next node’s execute input — use [JMESPath](https://jmespath.org/) there (`body.id`, `products[0]`). See [How flows work](../concepts/).

<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 680 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Template scopes">
  <defs>
    <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
    </marker>
  </defs>
  <rect class="qs-badge" x="24" y="40" width="110" height="56" rx="8"/>
  <text class="qs-mono" x="79" y="74" text-anchor="middle">{{env}}</text>
  <rect class="qs-badge" x="150" y="40" width="110" height="56" rx="8"/>
  <text class="qs-mono" x="205" y="74" text-anchor="middle">{{secrets}}</text>
  <rect class="qs-badge" x="276" y="40" width="110" height="56" rx="8"/>
  <text class="qs-mono" x="331" y="74" text-anchor="middle">{{input}}</text>
  <rect class="qs-badge" x="402" y="40" width="110" height="56" rx="8"/>
  <text class="qs-mono" x="457" y="74" text-anchor="middle">{{vars}}</text>
  <rect class="qs-badge" x="528" y="40" width="128" height="56" rx="8"/>
  <text class="qs-mono" x="592" y="74" text-anchor="middle">{{nodes.id}}</text>
  <text class="qs-caption" x="340" y="128" text-anchor="middle">Wire / JMESPath sits outside this row — use body.title on extract</text>
</svg>
<figcaption>Five template roots. Merge also has source keywords <code>previous</code> / <code>input</code> / <code>vars</code> / node ids — those are not mustache scopes.</figcaption>
</figure>

## Scopes

| Token | Source | Example |
| --- | --- | --- |
| `{{env.KEY}}` | Environment `variables` | `{{env.API_BASE}}` |
| `{{secrets.KEY}}` | Secrets file for the selected env | `{{secrets.API_TOKEN}}` |
| `{{input.path}}` | Flow **run** input (CLI `--input` / Run panel) | `{{input.username}}` |
| `{{vars.key}}` | Variables set by `set` nodes | `{{vars.token}}` |
| `{{nodes.id}}` | Full output of a prior node | `{{nodes.login}}` |
| `{{nodes.id.path}}` | Nested field on a prior node output | `{{nodes.login.body.id}}` |

Missing paths resolve to an empty string (`""`).

## Run input vs wire vs `input` node

| Need | Use |
| --- | --- |
| Field from Run panel / `--input` in a string | `{{input.email}}` |
| Put that payload on the wire for the next node | [`input`](../nodes/input/) node |
| Field from the last step inside extract/assert/json | JMESPath `body.id` |
| Field from a named earlier node in a string | `{{nodes.httpId.body.id}}` |
| Combine bags | [`merge`](../nodes/merge/) `sources: ["previous", "input", …]` |

## Dot paths

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

```json
{
  "method": "POST",
  "url": "{{env.API_BASE}}/users",
  "headers": { "Content-Type": "application/json" },
  "body": "{\"username\": \"{{input.username}}\", \"email\": \"{{input.email}}\"}"
}
```

### Object body

```json
{
  "body": {
    "username": "{{input.username}}",
    "token": "{{secrets.API_TOKEN}}"
  }
}
```

### Conditions (`if`)

```json
{
  "type": "if",
  "data": {
    "condition": "{{input.active}}",
    "checks": [{ "path": "status", "op": "gte", "value": 200 }]
  }
}
```

`checks[].path` is JMESPath on the **wire** (e.g. `status` after HTTP).

### `set` variables

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

## Template node vs `{{…}}`

- **`{{…}}` tokens** — string substitution in templated fields.
- **`template` node** — also supports [Eta](https://eta.js.org/) (`<%= it.input.name %>`, `<%= it.previous %>`) after mustache resolution. See [template node](../nodes/template/).

## JMESPath (wire, not mustache)

`extract`, `transform`, `assert`, and `json` query the **previous node output** with JMESPath:

| Goal | Expression |
| --- | --- |
| HTTP body id | `body.id` |
| First product | `body.products[0]` |
| Nested name | `body.user.name` |

---
title: template
description: Render a string with {{…}} tokens and optional Eta expressions
---

Builds a string. First `{{…}}` tokens are resolved, then the result is rendered with [Eta](https://eta.js.org/).

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

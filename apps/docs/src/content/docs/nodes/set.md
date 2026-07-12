---
title: set
description: Write flow variables for later {{vars.*}} references
---

Merges key/value pairs into the flow’s `vars` bag. The previous node’s output is passed through unchanged.

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

Often paired with [`if`](/nodes/if/):

```json
{
  "id": "setYes",
  "type": "set",
  "data": { "variables": { "path": "yes" } }
}
```

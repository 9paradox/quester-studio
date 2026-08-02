---
title: log
description: Write a templated message to the run log and pass data through
---

Appends a resolved message to the run log (CLI stderr / desktop Logs). Passes the previous output through, adding a `logged` field when the input is a plain object.

`message` is templated (`{{input.*}}`, `{{nodes.id…}}`, `{{previous.*}}`). [How flows work](../../concepts/).

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `message` | string | Templated log line |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output |
| **Output** | Object input plus `{ logged }`, or `{ value, logged }` for non-objects |

## Examples

```json
{
  "id": "progress",
  "type": "log",
  "data": {
    "message": "User {{input.username}} status={{nodes.head.status}}",
    "label": "Log progress"
  }
}
```

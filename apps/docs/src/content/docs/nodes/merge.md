---
title: merge
description: Deep-merge objects from previous, run input, vars, or named node outputs
---

Deep-merges one or more sources left-to-right. Later sources overwrite conflicting keys; nested plain objects are merged recursively.

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `sources` | string[] | required (min 1) | Source names |

### Source names

| Name | Resolves to |
| --- | --- |
| `previous` | Previous node output |
| `input` | Flow run input (same bag as `{{input.*}}`) |
| `vars` | Current vars object |
| `<nodeId>` | That node’s stored output |

This `input` name is only for **merge `sources`**. [`extract`](/nodes/extract/) / [`json`](/nodes/json/) always read the previous node — they have no `source: "input"` option. Prefer `{{input.*}}` when you only need a field in a string.

Non-object values are wrapped as `{ [sourceName]: value }` before merging.

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output (`previous`) |
| **Output** | Merged plain object |

## Examples

### Merge previous with vars

```json
{
  "id": "combined",
  "type": "merge",
  "data": {
    "sources": ["previous", "vars"]
  }
}
```

If previous is `{ "a": 1, "nested": { "x": 1 } }` and vars is `{ "b": 2, "nested": { "y": 2 } }`:

```json
{
  "a": 1,
  "b": 2,
  "nested": { "x": 1, "y": 2 }
}
```

### Include flow input and a node

```json
{
  "sources": ["input", "login", "vars"]
}
```

Here `"input"` means the Run panel / `--input` object, not an `input` node id (unless a node is also literally named `input` — prefer the keyword for run payload).

### Overlay defaults

```json
{
  "sources": ["defaultsNode", "previous"]
}
```

Later source (`previous`) wins on key conflicts.

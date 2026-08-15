---
title: merge
description: Deep-merge objects from previous, run input, vars, or named node outputs
---
Deep-merges one or more sources left-to-right. Later sources overwrite conflicting keys; nested plain objects are merged recursively.

<div class="qs-callout qs-callout-warn">

Here `previous` and `input` are **merge source keywords** (`sources: ["previous", "input", …]`). In templates use `{{input.*}}` or `{{nodes.id…}}` — there is no `{{nodes.<id>…}}` mustache scope. See [How flows work](../../concepts/).

</div>




<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="merge ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="70" r="6"/>
  <text class="qs-caption" x="48" y="100" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="70" x2="150" y2="70"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">merge</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>Deep-merge named sources. Multiple outgoing edges (fan-out) share the same output.</figcaption>
</figure>
<!-- qs-ports:end -->

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

This `input` name is only for **merge `sources`**. [`extract`](../extract/) / [`json`](../json/) always read the previous node — they have no `source: "input"` option. Prefer `{{input.*}}` when you only need a field in a string.

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




---
title: Nodes overview
description: Builtin flow node types, ports, edges, and when to use each
---

Flows are graphs of **nodes** linked by **edges**. Each executable type has handles (ports), an execute-time **wire input** (previous output), and an **output** stored as `{{nodes.<id>}}`.

Read [How flows work](../concepts/) for connection rules, fan-out vs branches, and wire vs templates.

<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 700 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Port legend">
  <defs>
    <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
    </marker>
  </defs>
  <circle class="qs-port" cx="60" cy="70" r="7"/>
  <text class="qs-caption" x="60" y="100" text-anchor="middle">target (in)</text>
  <line class="qs-edge" x1="70" y1="70" x2="160" y2="70"/>
  <rect class="qs-node qs-node-accent" x="160" y="42" width="160" height="56" rx="8"/>
  <text class="qs-label" x="240" y="76" text-anchor="middle">node</text>
  <line class="qs-edge" x1="320" y1="70" x2="410" y2="70"/>
  <circle class="qs-port" cx="420" cy="70" r="7"/>
  <text class="qs-caption" x="420" y="100" text-anchor="middle">source (out)</text>
  <text class="qs-caption" x="560" y="68" text-anchor="middle">named outs on</text>
  <text class="qs-caption" x="560" y="86" text-anchor="middle">if · try · switch</text>
  <text class="qs-caption" x="560" y="104" text-anchor="middle">foreach · complete</text>
</svg>
<figcaption>Linear nodes use one in and one out. Branch nodes add labeled source handles.</figcaption>
</figure>

## Builtin types

| Type | In | Out | Output (summary) |
| --- | --- | --- | --- |
| [start](./start/) | 0 | 1 (max 1 edge) | `{}` |
| [input](./input/) | 1 | 1 | Flow run input object |
| [form](./form/) | 1 | 1 | Submitted field object (pauses until submit) |
| [http](./http/) | 1 | 1 · fan-out ok | `{ status, body, headers, … }` |
| [extract](./extract/) | 1 | 1 | JMESPath result on **wire** |
| [template](./template/) | 1 | 1 | Rendered string |
| [set](./set/) | 1 | 1 | Passthrough + `vars` |
| [if](./if/) | 1 | `true` / `false` | `{ condition }` |
| [switch](./switch/) | 1 | cases + default | `{ matched }` |
| [delay](./delay/) | 1 | 1 | Passthrough |
| [foreach](./foreach/) | 1 | 1 (`complete`) · fan-out ok | `{ results, count, truncated }` |
| [try](./try/) | 1 | `success` / `failed` | body exit output · or `{ failed, error, input }` |
| [subflow](./subflow/) | 1 | 1 | Subflow output |
| [output](./output/) | 1 | 0 | Flow result |
| [assert](./assert/) | 1 | 1 | `{ ok: true }` or throws |
| [transform](./transform/) | 1 | 1 | Mapped object |
| [merge](./merge/) | 1 | 1 | Merged object |
| [join](./join/) | N | 1 · fan-out ok | `{ [predId]: output, … }` |
| [json](./json/) | 1 | 1 | Subset / passthrough |
| [log](./log/) | 1 | 1 | Input + `{ logged }` |
| [inspect](./inspect/) | 1 | 1 | Selected JSON |
| [note](./note/) | 0 | 0 | Not executed · no edges |

## Execution model

1. Exactly one [`start`](./start/); all executable nodes reachable from it. [`note`](./note/) may be disconnected and never has edges.
2. Nodes run along edges from `start` (branch filters by `sourceHandle`).
3. Each node receives the previous output as execute input (the wire). JMESPath roots there: `body.id`, not a template.
4. Run panel / `--input` is `{{input.*}}`. An [`input`](./input/) node places that object on the wire.
5. `set` updates `vars`.
6. Linear nodes may **fan-out** to several children (same output). Each node (except [`join`](./join/)) may have **at most one** incoming edge.

## Shared conventions

- Optional `label` for the UI.
- Templated strings: [template syntax](../templates/).
- JMESPath nodes always query the **wire**, not run input (unless you first put run data on the wire with an `input` node).

## Example chain

```
start → input → http (login) → extract (body.id) → http (profile) → output
```

| Step | How you read data |
| --- | --- |
| HTTP needs credentials | `{{input.username}}` or secrets |
| Next needs id from login | extract `body.id` or later `{{nodes.login.body.id}}` |
| Wrong | Mustache for wire fields with no scope; extract `input.username` when you meant run input |

Samples: `demo-main-nodes.flow.json`, `login-and-profile.flow.json`, `search-pick-cart.flow.json`, `forms-showcase.flow.json`, `nested-frames.flow.json`, `kitchen-sink.flow.json`.

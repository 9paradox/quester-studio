---
title: Nodes overview
description: Builtin flow node types, inputs, outputs, and when to use each
---

Flows are graphs of **nodes**. Each builtin type has a `data` schema, an execute-time **input** (previous node output), and an **output** stored as `{{nodes.<id>}}`.

## Builtin types

| Type | Role | Output (summary) |
| --- | --- | --- |
| [start](./start/) | Sole graph entry (output only) | `{}` |
| [input](./input/) | Puts run payload on the wire | Flow input object |
| [http](./http/) | HTTP request | `{ status, body, headers, request, … }` |
| [extract](./extract/) | JMESPath on **previous** output | Extracted value |
| [template](./template/) | String / Eta render | Rendered string |
| [set](./set/) | Write `vars` | Passes previous input through |
| [if](./if/) | Branch | `{ condition }` + `true`/`false` handle |
| [switch](./switch/) | Multi-branch | `{ matched }` + case handles |
| [delay](./delay/) | Sleep (`wait` alias) | Passthrough |
| [foreach](./foreach/) | Map over array (capped) | `{ results, count, truncated }` |
| [try](./try/) | Soft-fail branch | `{ ok, input }` + `ok`/`catch` |
| [subflow](./subflow/) | Call another flow | Subflow output |
| [output](./output/) | Flow result | Mapped object or previous input |
| [assert](./assert/) | Fail on checks | `{ ok: true }` or throws |
| [transform](./transform/) | Build object via JMESPath map | New object |
| [merge](./merge/) | Deep-merge sources | Merged object |
| [json](./json/) | Passthrough / JMESPath on previous | Selected JSON |
| [log](./log/) | Run log message | Input + `{ logged }` |
| [inspect](./inspect/) | Debug passthrough (`preview` alias) | Selected JSON |
| [note](./note/) | Canvas sticky annotation | Not executed |

## Execution model

1. A flow must have **exactly one** [`start`](./start/) node; all other executable nodes must be reachable from it. `start` has at most one child. [`note`](./note/) nodes are canvas-only: they may be disconnected, cannot have edges, and are not executed.
2. Nodes run in topological order along edges, beginning at `start`.
3. Each node receives the **previous** node’s output as execute input.
4. The run’s `--input` / Run panel JSON is always available as `{{input.*}}`. An [`input`](./input/) node puts that object on the wire.
5. `set` updates `vars` for later nodes.
6. `if` follows the edge whose `sourceHandle` is `"true"` or `"false"`.
7. `switch` / `try` follow the edge whose `sourceHandle` matches the chosen branch (`cases` / `ok`|`catch`).

## Shared conventions

- Optional `label` on every node for the UI.
- String fields that support templates use [template syntax](../templates/).
- JMESPath nodes (`extract`, `transform`, `assert`, `json`, `inspect`, `foreach` items path, `switch` path) always query the **previous node’s output**, not the run payload (unless you use templates / `{{nodes.*}}`).
- For run-panel fields, use `{{input.path}}` (or `set` / `template`).
- Loop and composition caps (`foreach` max items, `subflow` depth) are documented in [SECURITY.md](https://github.com/9paradox/quester-studio/blob/main/SECURITY.md).

## Example chain

```
start → input → http (login) → extract (body.id) → http (profile) → output
```

See the sample workspace:

- `examples/sample-workspace/flows/demo-main-nodes.flow.json` — short pedagogical walkthrough (screenshots / guide)
- `examples/sample-workspace/flows/login-and-profile.flow.json` — auth + profile walkthrough
- `examples/sample-workspace/flows/echo-subflow.flow.json` — minimal [`subflow`](./subflow/) target
- `examples/sample-workspace/flows/kitchen-sink.flow.json` — every builtin (including delay, switch, try, foreach, subflow, log, inspect, and a disconnected [`note`](./note/)), template scopes, JMESPath, and HTTP methods against [DummyJSON](https://dummyjson.com/docs)

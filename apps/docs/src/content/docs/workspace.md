---
title: Workspace files
description: Layout and formats for quester.json, flows, environments, and collections
---

A **workspace** is a folder with a `quester.json` manifest. Everything Quester loads — flows, environments, secrets, and collections — lives under that root.

## Layout

```
my-workspace/
  quester.json
  flows/
    login-and-profile.flow.json
  environments/
    local.json
    local.secrets.json          # gitignored
    local.secrets.json.example  # committed template
  collections/
    Auth/
      login.request.json
    Users/
      get-user.request.json
```

## `quester.json`

Manifest that names the workspace and optional directory overrides.

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | string | required | Workspace display name |
| `version` | `"v1"` | required | Manifest version |
| `flowsDir` | string | `"flows"` | Relative path to flow files |
| `environmentsDir` | string | `"environments"` | Relative path to env / secrets |
| `collectionsDir` | string | `"collections"` | Relative path to request collections |

### Example

```json
{
  "name": "sample-workspace",
  "version": "v1",
  "flowsDir": "flows",
  "environmentsDir": "environments",
  "collectionsDir": "collections"
}
```

## Flows (`*.flow.json`)

Each flow is a graph of nodes and edges.

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Stable flow id |
| `version` | `"v1"` | Flow format version |
| `name` | string | Optional display name |
| `description` | string | Optional description |
| `nodes` | array | At least one node; must include exactly one `start` |
| `edges` | array | Connections between nodes |

Graph rules: exactly one `start` (no incoming edges, ≤1 outgoing); no cycles; every node reachable from `start`.

### Node shape

```json
{
  "id": "login",
  "type": "http",
  "data": { "method": "POST", "url": "{{env.API_BASE}}/users" },
  "position": { "x": 250, "y": 0 }
}
```

| Field | Description |
| --- | --- |
| `id` | Unique within the flow; used in `{{nodes.id}}` |
| `type` | Builtin type (`input`, `http`, …) or custom |
| `data` | Type-specific config (see [Nodes](/nodes/)) |
| `position` | Optional canvas coordinates |

### Edge shape

```json
{
  "id": "e1",
  "source": "in",
  "target": "login",
  "sourceHandle": null
}
```

`source` / `target` here are **node ids** (not extract’s removed data field). For `if` nodes, set `sourceHandle` to `"true"` or `"false"` to pick a branch.

### Minimal flow

```json
{
  "id": "hello",
  "version": "v1",
  "name": "Hello",
  "nodes": [
    { "id": "start", "type": "start", "data": {} },
    {
      "id": "out",
      "type": "output",
      "data": {
        "map": { "message": "Hello {{input.name}}" }
      }
    }
  ],
  "edges": [{ "id": "e1", "source": "start", "target": "out" }]
}
```

## Related

- [Environments & secrets](/workspace-secrets/)
- [Collections & requests](/collections/)
- [Template syntax](/templates/)
- [Nodes](/nodes/)

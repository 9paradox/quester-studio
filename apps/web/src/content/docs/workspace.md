---
title: Workspace files
description: Layout and formats for quester.json, flows, environments, and collections
---

A **workspace** is a folder with a `quester.json` manifest. Everything Quester loads — flows, environments, secrets, and collections — lives under that root.

For how nodes connect and how `{{input.*}}` differs from the `input` node, see [How flows work](../concepts/).

## Layout

<figure class="qs-filetree" aria-label="Sample workspace directory layout">
<pre class="qs-filetree__pre"><code><span class="qs-ft-dir">my-workspace/</span>
  <span class="qs-ft-file">quester.json</span>
  <span class="qs-ft-dir">flows/</span>
    <span class="qs-ft-file">demo-main-nodes.flow.json</span>
    <span class="qs-ft-file">login-and-profile.flow.json</span>
    <span class="qs-ft-file">echo-subflow.flow.json</span>
    <span class="qs-ft-file">kitchen-sink.flow.json</span>
  <span class="qs-ft-dir">environments/</span>
    <span class="qs-ft-file">local.json</span>
    <span class="qs-ft-file">local.secrets.json</span> <span class="qs-ft-note"># gitignored</span>
    <span class="qs-ft-file">local.secrets.json.example</span> <span class="qs-ft-note"># committed template</span>
  <span class="qs-ft-dir">collections/</span>
    <span class="qs-ft-dir">Auth/</span>
      <span class="qs-ft-file">login.request.json</span>
      <span class="qs-ft-file">me.request.json</span>
      <span class="qs-ft-file">refresh.request.json</span>
    <span class="qs-ft-dir">Products/</span>
      <span class="qs-ft-file">search-products.request.json</span>
      <span class="qs-ft-file">add-product.request.json</span>
      <span class="qs-ft-file">update-product.request.json</span>
      <span class="qs-ft-file">patch-product.request.json</span>
      <span class="qs-ft-file">delete-product.request.json</span>
    <span class="qs-ft-dir">System/</span>
      <span class="qs-ft-file">ping.request.json</span>
      <span class="qs-ft-file">head-test.request.json</span>
      <span class="qs-ft-file">options-test.request.json</span>
    <span class="qs-ft-dir">Users/</span>
      <span class="qs-ft-file">get-user.request.json</span></code></pre>
</figure>

## `quester.json`

Manifest that names the workspace and optional directory overrides.

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | string | required | Workspace display name |
| `version` | `"v1"` | required | Manifest version |
| `description` | string | optional | Human-readable notes |
| `flowsDir` | string | `"flows"` | Relative path to flow files |
| `environmentsDir` | string | `"environments"` | Relative path to env / secrets |
| `collectionsDir` | string | `"collections"` | Relative path to request collections |
| `settings.http.defaultHeaders` | object | `{}` | Headers merged into every HTTP node (node keys win) |
| `settings.http.timeoutMs` | number | omitted | Request timeout in ms; `0` = none |
| `settings.http.maxResponseBytes` | number | omitted | Max response body size; `0` = unlimited |
| `settings.http.proxyUrl` | string | omitted | HTTP(S) proxy URL; `""` clears an outer proxy |
| `settings.http.caFile` | string | omitted | Workspace-relative PEM CA path; `""` clears |
| `settings.http.verifyTls` | boolean | omitted | Verify TLS (inherits → app preference / env) |
| `settings.http.cookieJar` | boolean | omitted | In-run cookie jar; default on when unset |

### Example

```json
{
  "name": "sample-workspace",
  "version": "v1",
  "description": "Sample flows for local development",
  "flowsDir": "flows",
  "environmentsDir": "environments",
  "collectionsDir": "collections",
  "settings": {
    "http": {
      "defaultHeaders": { "Accept": "application/json" },
      "timeoutMs": 30000
    }
  }
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
| `settings.http` | object | Optional HTTP defaults (same shape as workspace; overrides workspace) |
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
| `data` | Type-specific config (see [Nodes](../nodes/)) |
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

- [Environments & secrets](../workspace-secrets/)
- [Collections & requests](../collections/)
- [Template syntax](../templates/)
- [Nodes](../nodes/)

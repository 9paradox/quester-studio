---
title: Workspace files
description: Layout and formats for quester.json, flows, environments, and collections
---

A **workspace** is a folder with a `quester.json` manifest. Everything Quester loads — flows, environments, secrets, collections, and forms — lives under that root.

For how nodes connect and how `{{input.*}}` differs from the `input` node, see [How flows work](../concepts/).

## Layout

<figure class="qs-filetree" aria-label="Sample workspace directory layout">
<pre class="qs-filetree__pre"><code><span class="qs-ft-dir">my-workspace/</span>
  <span class="qs-ft-file">quester.json</span>
  <span class="qs-ft-dir">flows/</span>
    <span class="qs-ft-file">demo-main-nodes.flow.json</span>
    <span class="qs-ft-file">login-and-profile.flow.json</span>
    <span class="qs-ft-file">search-pick-cart.flow.json</span>
    <span class="qs-ft-file">echo-subflow.flow.json</span>
    <span class="qs-ft-file">kitchen-sink.flow.json</span>
  <span class="qs-ft-dir">forms/</span>
    <span class="qs-ft-file">search-products.form.json</span>
    <span class="qs-ft-file">pick-product.form.json</span>
    <span class="qs-ft-file">product-detail.form.json</span>
  <span class="qs-ft-dir">environments/</span>
    <span class="qs-ft-file">local.json</span>
    <span class="qs-ft-file">local.secrets.json</span> <span class="qs-ft-note"># gitignored</span>
    <span class="qs-ft-file">local.secrets.json.example</span> <span class="qs-ft-note"># committed template</span>
  <span class="qs-ft-dir">collections/</span>
    …
  <span class="qs-ft-dir">suites/</span>
    <span class="qs-ft-file">smoke.suite.json</span>
  <span class="qs-ft-dir">runs/</span> <span class="qs-ft-note"># gitignored when enabled</span>
</code></pre>
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
| `formsDir` | string | `"forms"` | Relative path to form definitions |
| `runs.enabled` | boolean | `false` | Write per-step run logs under `runs.dir` |
| `runs.dir` | string | `"runs"` | Relative path for on-disk run folders |
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
  "formsDir": "forms",
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

## Forms (`*.form.json`)

Forms live under `formsDir` (default `forms/`) as `{id}.form.json`. A flow can include multiple **`form` nodes**; each pauses until values are submitted, then continues with that node’s output (`{{nodes.<formNodeId>.*}}`).

This is different from the **`input` node**, which exposes the run’s initial `--input` / flow input payload once at the start.

| Field | Type | Description |
| --- | --- | --- |
| `version` | `"v1"` | Form format version |
| `id` | string | Stable form id (file stem) |
| `name` | string | Display name |
| `description` | string | Optional |
| `fields` | array | Field definitions |

**Field types:** `string`, `number`, `boolean`, `json`, `select`.

- `default` may be a template (e.g. `{{nodes.getProfile.body.email}}`) resolved when the form pauses.
- `readonly: true` shows a value but keeps it fixed on submit (useful for product detail review).
- `select` needs static `options` **or** dynamic `optionsFrom` (`items` template → array, plus `value` / `label` property names).

**Desktop:** when a `form` node runs, the app shows the resolved fields; Submit resumes the run.

**CLI:** pass pre-filled answers keyed by **form node id** (not form file id):

```bash
quester run search-pick-cart --workspace examples/sample-workspace --env local \
  --forms examples/sample-workspace/forms/search-pick-cart.forms.json
```

Omit fields that should keep resolved defaults; required fields and select membership are still validated. There are no interactive TTY prompts in v1.

Sample flow: `flows/search-pick-cart.flow.json` (search → pick from results → detail → add to cart).

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

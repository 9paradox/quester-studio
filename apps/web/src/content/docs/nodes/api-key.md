---
title: apiKey
description: Send an API key as a header or query parameter on later HTTP requests
---
Stores a named key either in `httpAuthHeaders` (`in: "header"`, default) or `httpAuthQuery` (`in: "query"`). Later [`http`](../http/) nodes on this run apply those values.

This node does **not** send a request. The wire is passthrough. The key **value** is not copied onto this node’s output.

- **Header mode:** following HTTP nodes get the named header. A header with the same name on the HTTP node **wins** (case-insensitive).
- **Query mode:** the key is added to the following HTTP URL. Query keys **already on that URL** win over inherited auth query.

Empty name or value after template resolve fails at execute time.

Typical chains: `apiKey (header) → http`, then `apiKey (query) → http`. Sample: `auth-helpers.flow.json`.

<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="apiKey ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="70" r="6"/>
  <text class="qs-caption" x="48" y="100" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="70" x2="150" y2="70"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">apiKey</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>Writes API key header or query; wire passthrough. Multiple outgoing edges (fan-out) share the same output.</figcaption>
</figure>
<!-- qs-ports:end -->

## Data

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | string | | Optional UI label |
| `name` | string | required | Header or query parameter name |
| `value` | string | required | Templated key value |
| `in` | enum | `"header"` | `header` · `query` |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output (passthrough) |
| **Output** | Same as input |
| **Vars** | Merges `httpAuthHeaders` or `httpAuthQuery` for **following** HTTP nodes |

## Examples

### Header: previous node → apiKey → HTTP

Previous node can be anything (often another HTTP or auth helper). Next HTTP lists **no** `X-Api-Key`.

```
… → key (apiKey header) → products (http GET)
```

```json
{
  "id": "key",
  "type": "apiKey",
  "data": {
    "name": "X-Api-Key",
    "value": "{{secrets.API_TOKEN}}",
    "in": "header"
  }
}
```

```json
{
  "id": "products",
  "type": "http",
  "data": {
    "method": "GET",
    "url": "{{env.API_BASE}}/products/1",
    "headers": {}
  }
}
```

Request snapshot on `products` includes `X-Api-Key`.

### Query: apiKey → HTTP

```json
{
  "id": "keyQ",
  "type": "apiKey",
  "data": {
    "name": "apiKey",
    "value": "demo-query-key",
    "in": "query"
  }
}
```

```json
{
  "id": "productsQ",
  "type": "http",
  "data": {
    "method": "GET",
    "url": "{{env.API_BASE}}/products/1",
    "headers": {}
  }
}
```

Request snapshot URL includes `apiKey=demo-query-key`. If the HTTP URL already had `?apiKey=from-url`, that value wins.

### Next HTTP overrides the header

```json
{
  "id": "productsOverride",
  "type": "http",
  "data": {
    "method": "GET",
    "url": "{{env.API_BASE}}/products/1",
    "headers": { "X-Api-Key": "from-node" }
  }
}
```

The node header wins over the inherited apiKey header.

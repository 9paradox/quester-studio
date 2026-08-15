---
title: basicAuth
description: Set Authorization Basic on later HTTP requests
---
Resolves username and password, then stores `Authorization: Basic <base64(user:pass)>` in `httpAuthHeaders`. Later [`http`](../http/) nodes on this run send that header unless they set `Authorization` themselves.

This node does **not** send a request. The wire is passthrough. The password is **not** included in this node’s output. Prefer [`{{secrets.*}}`](../../workspace-secrets/) (or `{{input.*}}`) for credentials. Empty password after template resolve fails at execute time.

If a [`bearer`](../bearer/) ran earlier, this helper **overwrites** `Authorization` (same header name). In the sample, that is after `me` and `mycart` already used Bearer.

Typical chain: `… → mycart (still Bearer) → listProducts (skipInheritedAuth) → basicAuth → http` (now Basic). Sample: `auth-helpers.flow.json`.

<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="basicAuth ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="70" r="6"/>
  <text class="qs-caption" x="48" y="100" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="70" x2="150" y2="70"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">basicAuth</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>Writes Authorization Basic; wire passthrough. Multiple outgoing edges (fan-out) share the same output.</figcaption>
</figure>
<!-- qs-ports:end -->

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `username` | string | Templated username |
| `password` | string | Required; templated |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output (passthrough) |
| **Output** | Same as input; credentials not echoed |
| **Vars** | Merges `httpAuthHeaders.Authorization` for **following** HTTP nodes |

## Examples

### Input → basicAuth → HTTP

Previous node puts credentials on the run payload (or use secrets). Next HTTP has **no** `Authorization` header.

```
start → creds (input) → basic (basicAuth) → call (http GET)
```

```json
{
  "id": "creds",
  "type": "input",
  "data": {
    "value": { "username": "emilys", "password": "emilyspass" }
  }
}
```

```json
{
  "id": "basic",
  "type": "basicAuth",
  "data": {
    "username": "{{input.username}}",
    "password": "{{input.password}}"
  }
}
```

```json
{
  "id": "call",
  "type": "http",
  "data": {
    "method": "GET",
    "url": "{{env.API_BASE}}/protected",
    "headers": {}
  }
}
```

Inspect `call`’s request snapshot for `Authorization: Basic …`. The `basic` step output must not contain the password.

### Secrets instead of input

```json
{
  "type": "basicAuth",
  "data": {
    "username": "{{secrets.username}}",
    "password": "{{secrets.password}}"
  }
}
```

---
title: bearer
description: Set Authorization Bearer on later HTTP requests
---
Resolves a templated token and stores `Authorization: Bearer <token>` in in-run vars (`httpAuthHeaders`). Later [`http`](../http/) nodes **on this run** send that header unless they set `Authorization` themselves.

This node does **not** send a request. It does **not** copy the previous node’s `headers` (an HTTP response also has `headers`). The wire is passthrough: whatever arrived from the previous node is what the next non-HTTP node still sees.

Prefer [`{{secrets.*}}`](../../workspace-secrets/) or `{{nodes.<id>…}}` for the token. The token is **not** copied onto this node’s output. This is not OAuth2.

Auth vars last for the rest of the run — **every later HTTP node** inherits Bearer until something overwrites `Authorization` (another auth helper, or a header on that HTTP node). You do not add a second `bearer` for `mycart`. [`subflow`](../subflow/) starts with empty vars.

Typical chain: `login → extract → bearer → me → mycart` (token on both GETs). Add `listProducts` with `skipInheritedAuth` when a hop must stay public. Sample: `auth-helpers.flow.json`.

<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="bearer ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="70" r="6"/>
  <text class="qs-caption" x="48" y="100" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="70" x2="150" y2="70"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">bearer</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>Writes Authorization Bearer; wire passthrough. Multiple outgoing edges (fan-out) share the same output.</figcaption>
</figure>
<!-- qs-ports:end -->

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `token` | string | Required; templated. Empty after resolve fails at execute time |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output (passthrough; unused unless you template it into `token`) |
| **Output** | Same as input |
| **Vars** | Merges `httpAuthHeaders.Authorization` for **following** HTTP nodes |

## Examples

### Login → extract → bearer → me → mycart

Previous node is an [`extract`](../extract/) whose output is the access-token **string**. Following HTTP nodes have **no** `Authorization` header — they all inherit Bearer from vars. One `bearer` covers `me` **and** `mycart`.

```
login (http POST) → accessToken (extract body.accessToken) → auth (bearer) → me (http GET) → mycart (http GET)
```

```json
{
  "id": "accessToken",
  "type": "extract",
  "data": { "expression": "body.accessToken" }
}
```

```json
{
  "id": "auth",
  "type": "bearer",
  "data": {
    "label": "Bearer",
    "token": "{{nodes.accessToken}}"
  }
}
```

```json
{
  "id": "me",
  "type": "http",
  "data": {
    "method": "GET",
    "url": "{{env.API_BASE}}/auth/me",
    "headers": {}
  }
}
```

```json
{
  "id": "mycart",
  "type": "http",
  "data": {
    "method": "GET",
    "url": "{{env.API_BASE}}/carts/user/{{nodes.me.body.id}}",
    "headers": {}
  }
}
```

Inspect **both** `me` and `mycart` request snapshots: `Authorization: Bearer …`. No second bearer node.

You can also take the token from an HTTP body without extract: `"token": "{{nodes.login.body.accessToken}}"`.

### Token from secrets (no previous HTTP)

Previous node can be `start` / `input`. Next HTTP still inherits the header.

```json
{
  "id": "auth",
  "type": "bearer",
  "data": { "token": "{{secrets.API_TOKEN}}" }
}
```

### Skip inherited auth on one hop

After bearer, `me` and `mycart` still send the token. `listProducts` sets `skipInheritedAuth: true` so that request has no `Authorization`. The next HTTP hop after it **still** inherits Bearer unless it also skips (or a later helper overwrites).

```json
{
  "id": "listProducts",
  "type": "http",
  "data": {
    "method": "GET",
    "url": "{{env.API_BASE}}/products?limit=3",
    "headers": {},
    "skipInheritedAuth": true
  }
}
```

### Override on a later HTTP node

A following HTTP node that sets `Authorization` (any casing) **wins** over the helper.

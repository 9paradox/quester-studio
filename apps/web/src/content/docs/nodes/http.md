---
title: http
description: Perform an HTTP request and capture status, body, headers, and timing
---
Sends an HTTP request. URL, headers, and body support [templates](../../templates/).

The previous node’s JSON is available as execute input but is **not** sent unless you template it into `url` / `headers` / `body`. Typical teaching chain: `start → input → http → extract` ([How flows work](../../concepts/)).

Header merge order (later wins, header names compared case-insensitively):

1. Workspace / flow `settings.http.defaultHeaders`
2. In-run auth vars from [`bearer`](../bearer/) / [`basicAuth`](../basic-auth/) / [`apiKey`](../api-key/) (`httpAuthHeaders`) — applied on **every** HTTP hop after the helper until overwritten, unless this node sets `skipInheritedAuth: true`
3. This node’s `headers`

Query: `httpAuthQuery` is applied to the resolved URL; **query keys already on the URL win**. Auth helpers do **not** copy the previous node’s `headers` (HTTP responses also have `headers`).

[`subflow`](../subflow/) runs start with empty vars, so parent-flow auth is not inherited.

| Need in this node | Use |
| --- | --- |
| Run panel / `--input` field | `{{input.username}}` |
| Field from an earlier named node | `{{nodes.login.body.token}}` |
| In a later extract/json on this response | JMESPath `body.id` (wire root) |

<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="http ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="70" r="6"/>
  <text class="qs-caption" x="48" y="100" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="70" x2="150" y2="70"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">http</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>Wire in unused unless templated into the request. Multiple outgoing edges (fan-out) share the same output.</figcaption>
</figure>
<!-- qs-ports:end -->


## Data

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | string | | Optional UI label |
| `method` | enum | `"GET"` | `GET` · `POST` · `PUT` · `PATCH` · `DELETE` · `HEAD` · `OPTIONS` |
| `url` | string | required | Must resolve to `http:` or `https:` |
| `headers` | object | `{}` | Header name → string (templated) |
| `skipInheritedAuth` | boolean | `false` | If true, do not apply helper auth headers/query on **this** request. Later HTTP hops still inherit. Workspace default headers still apply. |
| `body` | string \| object | | Omitted for GET/HEAD at send time |

## Input / output

| | Value |
| --- | --- |
| **Execute input** | Previous node output (not sent unless you template it) |
| **Output** | See below |

### Output shape

```ts
{
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;       // parsed JSON, or raw text if not JSON
  text: string;        // raw response body
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  };
  timing: {
    startedAt: number;
    endedAt: number;
    durationMs: number;
  };
  size: number;        // response body byte length
}
```

Common template paths:

- `{{nodes.login.status}}`
- `{{nodes.login.body.id}}`
- `{{nodes.login.body.token}}`

## Examples

### GET with env base URL

```json
{
  "id": "profile",
  "type": "http",
  "data": {
    "label": "Profile",
    "method": "GET",
    "url": "{{env.API_BASE}}/users/{{nodes.userId}}",
    "headers": {}
  }
}
```

### POST JSON body

```json
{
  "id": "login",
  "type": "http",
  "data": {
    "label": "Login",
    "method": "POST",
    "url": "{{env.API_BASE}}/users",
    "headers": { "Content-Type": "application/json" },
    "body": "{\"username\": \"{{input.username}}\", \"email\": \"{{input.email}}\"}"
  }
}
```

### Bearer token from secrets

```json
{
  "id": "secure",
  "type": "http",
  "data": {
    "method": "GET",
    "url": "{{env.API_BASE}}/me",
    "headers": {
      "Authorization": "Bearer {{secrets.API_TOKEN}}"
    }
  }
}
```

### Skip inherited helper auth

Use after a [`bearer`](../bearer/) (or other helper) when this hop should be unauthenticated. Later HTTP nodes still inherit unless they also skip.

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

### Object body (templated after stringify)

```json
{
  "method": "POST",
  "url": "{{env.API_BASE}}/items",
  "headers": { "Content-Type": "application/json" },
  "body": {
    "name": "{{input.name}}",
    "owner": "{{input.username}}"
  }
}
```

## Errors

- Non-`http`/`https` URLs throw at execute time.
- Network failures throw with a request snapshot attached.

Standalone request files use a similar shape — see [Collections & requests](../../collections/).




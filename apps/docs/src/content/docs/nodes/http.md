---
title: http
description: Perform an HTTP request and capture status, body, headers, and timing
---

Sends an HTTP request. URL, headers, and body support [templates](/templates/).

## Data

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | string | | Optional UI label |
| `method` | enum | `"GET"` | `GET` · `POST` · `PUT` · `PATCH` · `DELETE` · `HEAD` · `OPTIONS` |
| `url` | string | required | Must resolve to `http:` or `https:` |
| `headers` | object | `{}` | Header name → string (templated) |
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

Standalone request files use a similar shape — see [Collections & requests](/collections/).

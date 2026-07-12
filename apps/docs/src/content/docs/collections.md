---
title: Collections & requests
description: Standalone HTTP requests stored as *.request.json under collections/
---

**Collections** group reusable HTTP requests as files. They are independent of flows: open and edit them in the desktop Request editor, or keep them as API docs in git.

## Layout

```
collections/
  Auth/
    login.request.json
  Users/
    get-user.request.json
  health.request.json          # at collection root
```

- Folder names are collection groups (e.g. `Auth`, `Users`).
- Files must end with `.request.json`.
- Nested folders are allowed; the request path is the relative path without the extension (e.g. `Auth/login`).

The directory name comes from `collectionsDir` in [`quester.json`](/workspace/) (default `"collections"`).

## Request file (`*.request.json`)

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `version` | `"v1"` | required | Format version |
| `id` | string | required | Stable id |
| `name` | string | required | Display name |
| `method` | enum | `"GET"` | `GET` · `POST` · `PUT` · `PATCH` · `DELETE` · `HEAD` · `OPTIONS` |
| `url` | string | required | Absolute or template-ready URL |
| `headers` | object | `{}` | String header map |
| `body` | string \| object | optional | Request body |

### Example — POST with JSON body

```json
{
  "version": "v1",
  "id": "login",
  "name": "Login",
  "method": "POST",
  "url": "https://dummyjson.com/auth/login",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "username": "emilys",
    "password": "emilyspass"
  }
}
```

### Example — GET

```json
{
  "version": "v1",
  "id": "get-user",
  "name": "Get user",
  "method": "GET",
  "url": "https://dummyjson.com/users/1",
  "headers": {}
}
```

### Example — string body

```json
{
  "version": "v1",
  "id": "raw-post",
  "name": "Raw POST",
  "method": "POST",
  "url": "https://httpbin.org/post",
  "headers": {
    "Content-Type": "text/plain"
  },
  "body": "plain text payload"
}
```

### Example — auth header placeholder

Requests can store the same `{{…}}` tokens as HTTP nodes; resolve them when you run from a flow or a future runner that applies an environment:

```json
{
  "version": "v1",
  "id": "me",
  "name": "Current user",
  "method": "GET",
  "url": "{{env.API_BASE}}/me",
  "headers": {
    "Authorization": "Bearer {{secrets.API_TOKEN}}"
  }
}
```

## Requests vs `http` nodes

| | Collection request | Flow `http` node |
| --- | --- | --- |
| File | `*.request.json` | Inside `*.flow.json` |
| Purpose | Reusable single-call docs / editor | Step in a multi-node graph |
| Graph | None | Connected with edges, extract, assert, … |

You can mirror a request’s method/url/headers/body into an `http` node when building a flow.

## Validate

Request files are validated with the same schema as the engine (`request` v1). Invalid JSON or missing required fields fail load/save.

See also [Workspace files](/workspace/) and [HTTP node](/nodes/http/).

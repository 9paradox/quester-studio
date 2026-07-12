---
title: Environments & secrets
description: Environment variables, secrets files, and how to reference them in flows
---

Each **environment** is a named config used when you validate or run a flow (`--env local`, or the desktop env selector).

## Files

Under `environments/` (or `environmentsDir` from [`quester.json`](/workspace/)):

| File | Committed? | Purpose |
| --- | --- | --- |
| `<name>.json` | Yes | Non-secret variables |
| `<name>.secrets.json` | **No** | Secret strings |
| `<name>.secrets.json.example` | Yes | Template for teammates |

Add `*.secrets.json` to `.gitignore`.

## Environment (`<name>.json`)

| Field | Type | Description |
| --- | --- | --- |
| `name` | string | Environment name (usually matches the filename) |
| `version` | `"v1"` | Format version |
| `variables` | object | Map of string / number / boolean values |

### Example

```json
{
  "name": "local",
  "version": "v1",
  "variables": {
    "API_BASE": "https://jsonplaceholder.typicode.com",
    "TIMEOUT_MS": 5000,
    "DEBUG": true
  }
}
```

### Reference in flows

```
{{env.API_BASE}}
{{env.TIMEOUT_MS}}
```

## Secrets (`<name>.secrets.json`)

| Field | Type | Description |
| --- | --- | --- |
| `version` | `"v1"` | Format version |
| `secrets` | object | Map of **string** values only |

### Example template (committed)

```json
{
  "version": "v1",
  "secrets": {
    "API_TOKEN": "replace-me"
  }
}
```

### Local file (gitignored)

```bash
cp environments/local.secrets.json.example environments/local.secrets.json
```

```json
{
  "version": "v1",
  "secrets": {
    "API_TOKEN": "real-token-value"
  }
}
```

### Reference in flows

```
{{secrets.API_TOKEN}}
```

```json
{
  "headers": {
    "Authorization": "Bearer {{secrets.API_TOKEN}}"
  }
}
```

## Staging vs local

```
environments/
  local.json
  local.secrets.json
  staging.json
  staging.secrets.json
```

```bash
bunx quester run flows/login.flow.json --workspace . --env staging --input '{"username":"demo"}'
```

## Security notes

- Quester does **not** encrypt secrets at rest. Protect the workspace with OS permissions.
- Never commit `*.secrets.json`, `.env`, or live tokens.
- Resolved HTTP URLs must be `http:` or `https:` only.

Full trust model: [SECURITY.md](https://github.com/9paradox/quester-studio/blob/main/SECURITY.md).

## JSON Schema

Emitted schemas live under `schemas/quester/`. After changing `@quester/schema`:

```bash
bun run --filter @quester/schema build
```

---
title: Workspace & secrets
description: Git-friendly workspaces and secret handling
---

## Workspace layout

```
my-workspace/
  quester.json              # manifest
  flows/*.flow.json         # flow graphs
  environments/local.json   # env variables (committed)
  environments/local.secrets.json  # secrets (gitignored)
```

## Environment variables

Store non-sensitive configuration in `environments/<name>.json`:

```json
{
  "version": "v1",
  "name": "local",
  "variables": {
    "API_BASE": "https://api.example.com"
  }
}
```

Reference in flows: `{{env.API_BASE}}`.

## Secrets

Secrets live in `environments/<name>.secrets.json` — **never commit** these files.

Copy from the example template:

```bash
cp environments/local.secrets.json.example environments/local.secrets.json
```

Reference in flows: `{{secrets.API_TOKEN}}`.

Quester does not encrypt secrets at rest. Protect your workspace directory with OS permissions.

See [SECURITY.md](https://github.com/9paradox/quester-studio/blob/main/SECURITY.md) for the full trust model.

## JSON Schema

Emitted schemas live in the repo under `schemas/quester/`. Rebuild after changing `@quester/schema`:

```bash
bun run --filter @quester/schema build
```

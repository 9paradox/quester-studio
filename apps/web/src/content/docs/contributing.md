---
title: Contributing
description: How to contribute to Quester Studio
---

See the full guide in the repository: [CONTRIBUTING.md](https://github.com/9paradox/quester-studio/blob/main/CONTRIBUTING.md).

## Quick checks

```bash
bun install
bun run lint
bun run typecheck
bun run build
bun run test
```

## Debugging and studio modes

See [DEBUGGING.md](https://github.com/9paradox/quester-studio/blob/main/DEBUGGING.md) and [Developing the studio](../developing-studio/) for desktop, API-only, and UI+HTTP setup / develop / debug.

## Pull requests

- Use Conventional Commits for PR titles (squash merge to `main`)
- Add tests for logic changes
- Include a `.changeset/*.md` for user-facing changes
- Reference GitHub issues when applicable

## Package boundaries

| Package | Responsibility |
|---------|----------------|
| `@quester-studio/schema` | Zod validation only |
| `@quester-studio/nodes` | Node `execute()` plugins |
| `@quester-studio/engine` | Workspace load + flow execution |
| `@quester-studio/cli` | `quester init` / `quester validate` / `quester run` |
| `@quester-studio/api-contract` | Shared DTOs + `QuesterClient` |
| `@quester-studio/workspace-service` | FS workspace + execute |
| `apps/api` | HTTP JSON + SSE API |

## Pre-commit hooks

Lefthook runs Biome on staged files after `bun install`.

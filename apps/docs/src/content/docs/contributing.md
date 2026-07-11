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

## Pull requests

- Use Conventional Commits for PR titles (squash merge to `main`)
- Add tests for logic changes
- Include a `.changeset/*.md` for user-facing changes
- Reference GitHub issues when applicable

## Package boundaries

| Package | Responsibility |
|---------|----------------|
| `@quester/schema` | Zod validation only |
| `@quester/nodes` | Node `execute()` plugins |
| `@quester/engine` | Workspace load + flow execution |
| `@quester/cli` | `quester validate` / `quester run` |

## Pre-commit hooks

Lefthook runs Biome on staged files after `bun install`.

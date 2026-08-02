---
name: quester-studio
description: >-
  Develop the Quester Studio monorepo — Bun workspaces, flow schema, engine,
  CLI, and apps. Use when working in quester-studio, adding packages, running
  builds/tests, validating flows, or changing workspace/flow JSON formats.
---

# Quester Studio

Local-first visual API flow platform. **Quester** = desktop product; **Quester Studio** = this monorepo.

## Architecture

```
apps/desktop     Electrobun + React Flow (visual builder)
apps/web         Product site + docs (Astro; GitHub Pages)
packages/schema  Zod schemas + validation (@quester-studio/schema)
packages/nodes   Node plugins — execute() per node type (@quester-studio/nodes)
packages/engine  Flow execution, workspace loading (@quester-studio/engine)
packages/cli     quester validate | run (@quester-studio/cli)
schemas/         JSON Schema emitted from @quester-studio/schema (do not hand-edit)
examples/        Sample workspaces (*.flow.json)
```

**Data flow:** `*.flow.json` → `@quester-studio/schema` validates → `@quester-studio/engine` executes via `@quester-studio/nodes` plugins.

Docs content lives under `apps/web/src/content/docs/` (not a separate Starlight app).

## Requirements

- **Bun 1.3.14** (`packageManager` in root `package.json`)
- **Biome** for lint/format
- **Turborepo** for dev task graph; root `build`/`test` use `bun run --filter` because Turbo 2.10 does not enumerate Bun workspaces here

## Commands

```bash
bun install
bun run build          # all packages + apps
bun run test           # schema, nodes, engine, cli
bun run lint           # biome check .
bun run dev            # turbo run dev

# Package-scoped
bun run --filter @quester-studio/schema build
bun run --filter @quester-studio/desktop dev
bun run --filter @quester-studio/web build

# CLI (after build)
bunx --bun quester validate examples/sample-workspace
bunx --bun quester run examples/sample-workspace/flows/login-and-profile.flow.json \
  --workspace examples/sample-workspace --env local \
  --input '{"username":"emilys","password":"emilyspass"}'
```

## Workspace layout

```
my-workspace/
  quester.json              # manifest (name, flowsDir, environmentsDir)
  flows/*.flow.json         # flow graphs
  environments/local.json   # env variables (git-friendly)
  environments/local.secrets.json  # secrets (gitignored)
```

Template strings use `{{env.*}}`, `{{input.*}}`, `{{nodes.id}}`, `{{vars.*}}`, `{{secrets.*}}`.

Previous-node JSON is the **wire** (execute input). JMESPath on extract/assert/json uses `body.id`, not `{{previous.*}}` (there is no mustache previous scope). See docs: How flows work.

## Builtin node types

`start`, `input`, `http`, `extract`, `template`, `set`, `if`, `switch`, `delay`/`wait`, `foreach`, `try`, `subflow`, `output`, `assert`, `transform`, `merge`, `json`, `log`, `inspect`/`preview`, `note`

## Change checklist

| Change type | Touch |
|-------------|-------|
| New node type | See skill `add-flow-node` |
| Schema/validation | `packages/schema`, run `emit-schemas` |
| Execution logic | `packages/nodes` plugin + `packages/engine` if graph/vars |
| CLI | `packages/cli/src/cli.ts` |
| Desktop UI | See skill `quester-desktop` |
| Docs / marketing | `apps/web` (`src/content/docs/`, site pages) |
| Public JSON Schema | Rebuild `@quester-studio/schema` (updates `schemas/`) |

## Conventions

- ESM with `.js` import suffixes in TypeScript
- Tests in `src/**/*.test.ts` (`bun:test`)
- User-facing changes need a Changeset
- Never commit secrets, `.env`, or hand-edited `schemas/`

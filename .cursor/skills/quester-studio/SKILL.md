---
name: quester-studio
description: Develop the Quester Studio monorepo — Bun workspaces, flow schema, engine, CLI, and apps. Use when working in quester-studio, adding packages, running builds/tests, validating flows, or changing workspace/flow JSON formats.
---

# Quester Studio

Local-first visual API flow platform. **Quester** = desktop product; **Quester Studio** = this monorepo.

## Architecture

```
apps/desktop     Electrobun + React Flow (visual builder)
apps/web         Marketing site (Astro)
apps/docs        Documentation (Astro Starlight)
packages/schema  Zod schemas + validation (@quester/schema)
packages/nodes   Node plugins — execute() per node type (@quester/nodes)
packages/engine  Flow execution, workspace loading (@quester/engine)
packages/cli     quester validate | run (@quester/cli)
schemas/         JSON Schema emitted from @quester/schema (do not hand-edit)
examples/        Sample workspaces (*.flow.json)
```

**Data flow:** `*.flow.json` → `@quester/schema` validates → `@quester/engine` executes via `@quester/nodes` plugins.

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
bun run --filter @quester/schema build
bun run --filter @quester/desktop dev

# CLI (after build)
bunx --bun quester validate examples/sample-workspace
bunx --bun quester run examples/sample-workspace/flows/login-and-profile.flow.json \
  --workspace examples/sample-workspace --env local \
  --input '{"username":"demo","email":"demo@example.com"}'
```

## Workspace layout

```
my-workspace/
  quester.json              # manifest (name, flowsDir, environmentsDir)
  flows/*.flow.json         # flow graphs
  environments/local.json   # env variables (git-friendly)
  environments/local.secrets.json  # secrets (gitignored)
```

Flow nodes use `{{env.VAR}}`, `{{input.field}}`, `{{nodes.nodeId}}`, `{{vars.key}}` in templates.

## Builtin node types

`input`, `http`, `extract`, `template`, `set`, `if`, `output`

## Change checklist

| Change type | Touch |
|-------------|-------|
| New node type | See skill `add-flow-node` |
| Schema/validation | `packages/schema`, run `emit-schemas` |
| Execution logic | `packages/nodes` plugin + `packages/engine` if graph/vars |
| CLI | `packages/cli/src/cli.ts` |
| Desktop UI | See skill `quester-desktop` |
| Public JSON Schema | Rebuild `@quester/schema` (updates `schemas/`) |

## Conventions

- ESM (`"type": "module"`), `.js` extensions in TypeScript imports
- Zod for all schema; `validateFlow` / `validateWorkspace` return `{ success, data?, error?, issues? }`
- Tests: `bun:test` in each package's `src/*.test.ts`
- Keep changes minimal; match existing package boundaries
- Do not commit secrets; use `*.secrets.json.example` patterns

## Verification loop

After package changes:

1. `bun run lint`
2. `bun run typecheck`
3. `bun run --filter <package> build`
4. `bun run --filter <package> test`
5. If schema changed: confirm `schemas/` updated
6. If user-facing: add `.changeset/*.md` (`bun run changeset`)
7. If engine/nodes changed: run sample flow via CLI

## Testing (required from project start)

Every package with logic must have `bun:test` coverage in `src/**/*.test.ts`:

| Package | Test focus |
|---------|------------|
| `@quester/schema` | Zod validation, graph rules, workspace/env manifests |
| `@quester/nodes` | Plugin registry, each builtin `execute()` |
| `@quester/engine` | Templates, graph sort, workspace load, flow execution |
| `@quester/cli` | End-to-end CLI against `examples/sample-workspace` |
| `@quester/desktop` | Main-process workspace RPCs |

Run all tests: `bun run test`

**When adding features**, add or extend tests in the same PR — no placeholder tests.

## Additional resources

- [CONTRIBUTING.md](../../CONTRIBUTING.md) — branches, commits, PRs
- [ROADMAP.md](../../ROADMAP.md) — planned work
- Architecture details: [architecture.md](architecture.md)
- Adding nodes: skill `add-flow-node`
- Desktop app: skill `quester-desktop`
- Releases: skill `release-workflow`
- Feature planning: skill `feature-planning`

# Contributing to Quester Studio

Thank you for contributing. This document covers local development, git workflow, and pull request expectations.

## Requirements

- [Bun](https://bun.sh) 1.3.14 (see `packageManager` in root `package.json`)
- Git

## Local development

```bash
bun install
bun run build
bun run lint
bun run typecheck
bun run test
```

Package-scoped work:

```bash
bun run --filter @quester/schema build
bun run --filter @quester/schema test
```

After changing `@quester/schema`, confirm `schemas/` was regenerated (do not hand-edit JSON Schema files).

## Branching

- `main` is protected and always releasable.
- Use short-lived branches:
  - `feat/<topic>` — new capability
  - `fix/<topic>` — bug fix
  - `chore/<topic>` — tooling, docs, hygiene
  - `hotfix/<version>` — patch from a release tag

## Commit workflow

### When to commit

1. After a **logical unit** of work passes local checks (`lint` + affected `test`/`build`).
2. Before opening or updating a PR, run `bun run build && bun run test`.
3. Do **not** commit failing tests, secrets, or hand-edited `schemas/` output.

### Commit message format (Conventional Commits)

```
<type>(<scope>): <short summary>
```

| Type | Use |
|------|-----|
| `feat` | User-facing capability |
| `fix` | Bug fix |
| `chore` | Tooling, deps, hygiene |
| `docs` | Documentation only |
| `test` | Tests only |
| `refactor` | Same behavior, restructured |
| `ci` | Workflow changes |
| `security` | Security hardening |

**Scope** (optional): `schema`, `nodes`, `engine`, `cli`, `desktop`, `ci`, `deps`.

Examples:

```
feat(desktop): add workspace folder picker
fix(nodes): reject non-http(s) URLs at execute time
docs: expand getting-started guide
```

### Merge strategy on `main`

Configure the GitHub repository (Settings → General → Pull Requests):

| Setting | Value |
|---------|-------|
| Allow squash merging | Enabled |
| Allow merge commits | Disabled |
| Allow rebase merging | Disabled |
| Automatically delete head branches | Enabled |

**Squash merge only.** The PR title becomes the squash commit message — use Conventional Commits format.

Branch protection (Settings → Branches): require CI status checks before merging to `main`.

## Pull requests

1. PR title = Conventional Commit (becomes squash message).
2. Reference an issue when applicable (`Fixes #123` or `Refs #123`).
3. User-facing changes include a `.changeset/*.md` file in the same PR.
4. Add or extend tests for logic changes.
5. Never commit `*.secrets.json`, `.env`, or API keys.

See the [pull request template](.github/pull_request_template.md) for the full checklist.

## CI

CI runs on Ubuntu for consistency and speed:

1. `bun run lint`
2. `bun run typecheck`
3. `bun audit`
4. `bun run build`
5. `bun run test`

## Pre-commit hooks

After `bun install`, Lefthook installs automatically (`prepare` script):

- **pre-commit:** Biome check on staged files
- **pre-push:** full test suite

## Issue labels

Apply these labels when triaging (create in GitHub → Issues → Labels):

| Label | Use |
|-------|-----|
| `type:feature` | New capability |
| `type:bug` | Defect |
| `type:chore` | Tooling / hygiene |
| `type:docs` | Documentation |
| `type:security` | Security |
| `area:schema` | `@quester/schema` |
| `area:nodes` | `@quester/nodes` |
| `area:engine` | `@quester/engine` |
| `area:cli` | `@quester/cli` |
| `area:desktop` | Desktop app |
| `area:docs` | Docs / web apps |
| `area:infra` | CI, release, hooks |
| `priority:high` | Current milestone |
| `priority:medium` | Next milestone |
| `priority:low` | Backlog |
| `good first issue` | Onboarding-friendly |
| `blocked` | Waiting on dependency |

Seed labels and backlog issues (optional):

```bash
./.github/scripts/seed-labels.sh
./.github/scripts/seed-issues.sh
```

Requires [GitHub CLI](https://cli.github.com/) (`gh`) authenticated to the repository.

## GitHub Projects (optional)

Create a **Quester Studio** project board with columns: Backlog → Planned → In progress → Review → Done. Link issues to milestones (`v0.2.0`, etc.).

## Package boundaries

- `@quester/schema` — Zod validation only
- `@quester/nodes` — node `execute()` plugins
- `@quester/engine` — workspace load + flow execution
- `@quester/cli` — `quester validate` / `quester run`

Do not put execution logic in schema or UI in engine.

## Releases

See [CHANGELOG.md](./CHANGELOG.md) and [ROADMAP.md](./ROADMAP.md). Release process is documented in `.cursor/skills/release-workflow/SKILL.md` for maintainers.

## Questions

Open a [GitHub Discussion](https://github.com/9paradox/quester-studio/discussions) or issue if something is unclear.

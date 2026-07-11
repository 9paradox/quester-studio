---
name: dev-workflow
description: End-to-end Quester Studio development loop — debug, code, verify, commit, push, and merge PRs. Use when the user wants to develop a feature, fix a bug, debug locally, ship a branch, or follow the standard git workflow.
---

# Dev workflow

Standard loop for Quester Studio: **develop → debug → commit → push → merge**.

Repo: `9paradox/quester-studio`. Default branch: `main` (protected, squash-merge only). Shell on Windows: PowerShell — chain commands with `;`, not `&&`.

## 1. Start a session

```powershell
git fetch origin
git checkout main
git pull origin main
git checkout -b feat/<topic>
```

Before coding:

1. Read [ROADMAP.md](../../ROADMAP.md) and find or open a GitHub issue (`Fixes #N` in the PR).
2. Pick the right skill: `quester-studio`, `quester-desktop`, `add-flow-node`, etc.
3. Run once if deps changed: `bun install`

## 2. Develop

Write the change in the right package. Keep diffs small; match existing patterns.

| Area | Touch |
|------|-------|
| Validation / flow format | `@quester/schema` |
| Node execution | `@quester/nodes` |
| Graph / workspace / run | `@quester/engine` |
| CLI commands | `@quester/cli` |
| UI / IPC | `apps/desktop` |

Conventions: ESM + `.js` import suffixes; tests in `src/**/*.test.ts`; user-facing → `.changeset/*.md`; never commit secrets or hand-edited `schemas/`.

## 3. Debug

### Packages (schema, nodes, engine, cli)

```powershell
# Fast feedback on one package
bun run --filter @quester/engine test
bun run --filter @quester/engine build

# Run a single test file
bun test packages/engine/src/some.test.ts
```

After schema changes, rebuild and confirm `schemas/` regenerated:

```powershell
bun run --filter @quester/schema build
```

Compare engine/nodes behavior to CLI:

```powershell
bun run build:pkgs
bunx --bun quester validate examples/sample-workspace
bunx --bun quester run examples/sample-workspace/flows/login-and-profile.flow.json `
  --workspace examples/sample-workspace --env local `
  --input '{"username":"demo","email":"demo@example.com"}'
```

### Desktop (Electrobun + React)

```powershell
bun run build:pkgs
bun run --filter @quester/desktop dev
```

For renderer HMR while iterating UI:

```powershell
bun run --filter @quester/desktop dev:hmr
```

Desktop tests (main-process RPCs):

```powershell
bun run --filter @quester/desktop test
```

### Debug checklist

- [ ] Reproduced the issue (test, CLI run, or manual desktop smoke)
- [ ] Identified package boundary (`schema` / `nodes` / `engine` / `cli` / `desktop`)
- [ ] Scoped change — no unrelated refactors

## 4. Verify (before commit or PR)

```powershell
bun run lint
bun run typecheck
bun run --filter <affected-package> test
bun run --filter <affected-package> build
```

Before opening or updating a PR, run the full gate:

```powershell
bun run build
bun run test
```

Hooks (installed via `bun install` / Lefthook):

- **pre-commit** — Biome on staged files
- **pre-push** — full test suite

## 5. Commit

**Only commit when the user explicitly asks.**

When asked, draft a Conventional Commit:

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

Scopes: `schema`, `nodes`, `engine`, `cli`, `desktop`, `ci`, `deps`.

Example flow:

```powershell
git status
git diff
git add <paths>
git commit -m "feat(desktop): add flow save to disk"
```

If pre-commit fails, fix issues and create a **new** commit (do not amend unless hook auto-fixed staged files).

## 6. Push

```powershell
git push -u origin HEAD
```

Pre-push runs the full test suite. If it fails, fix locally and push again.

Ensure `gh` is authenticated for PRs:

```powershell
gh auth status
```

## 7. Open PR and merge

### Create PR

```powershell
gh pr create --title "feat(desktop): add flow save to disk" --body "$( @'
## Summary
- Save edited flow JSON back to workspace disk
- Add tests for save RPC

## Test plan
- [ ] Open sample workspace, edit flow, save, reload
- [ ] `bun run test` passes

Fixes #N
'@ )"
```

PR title = squash commit message (Conventional Commits). Include `Fixes #N` or `Refs #N`.

### Wait for CI

CI runs: `lint` → `typecheck` → `bun audit` → `build` → `test`.

```powershell
gh pr checks <number> --watch
```

### Merge

Squash merge only (PR title becomes the commit on `main`):

```powershell
gh pr merge <number> --squash --delete-branch
```

Or merge via GitHub UI with **Squash and merge**.

### After merge — tidy branches

Use skill `git-tidy` to delete stale local/remote `feat/*`, `fix/*`, `chore/*` branches.

```powershell
git checkout main
git pull origin main
```

## Quick reference card

```
develop → branch + code in right package (+ tests / changeset)
debug   → repro + scoped tests / desktop dev / CLI compare
verify  → lint + typecheck + build + test (full gate before PR)
commit  → conventional message → pre-commit passes
push    → git push -u origin HEAD → pre-push passes
merge   → gh pr create → CI green → squash merge → git-tidy
```

## Related skills

- `quester-studio` — monorepo commands and package boundaries
- `quester-desktop` — Electrobun dev and IPC
- `feature-planning` — issues, milestones, ROADMAP
- `git-tidy` — post-merge branch cleanup
- `release-workflow` — versioning and releases

---
name: release-workflow
description: Quester Studio release process — Changesets, npm publish, desktop GitHub Release, hotfixes. Use when versioning, cutting releases, or adding changesets.
---

# Release workflow

## When to add a changeset

Add `.changeset/*.md` in the **same PR** as user-facing changes:

| Bump | When |
|------|------|
| patch | Bug fix, internal improvement |
| minor | New feature, backward compatible |
| major | Breaking change (`BREAKING CHANGE:` or `feat!:`) |

Run `bun run changeset` locally. Fixed group bumps all `@quester/*` packages together.

## Version locally (fallback)

```bash
bun run changeset        # add changeset files in PRs
bun run version          # bump package.json + CHANGELOG.md
bun run build && bun run test
```

Open PR with version bumps. Merge to `main`.

## Publish release

1. Ensure `NPM_TOKEN` is set in GitHub repo secrets (npm Automation token).
2. Check the **Release gate** checklist in [ROADMAP.md](../../ROADMAP.md) (first public preview: v0.4.0).
3. Run **Release** workflow manually (`workflow_dispatch`) with version e.g. `0.4.0`.
4. Workflow publishes npm packages and creates GitHub Release `v0.4.0` with unsigned desktop artifacts (Windows + Linux; no macOS yet).
   - Desktop job runs `bun run --filter @quester/desktop build:app` (`vite build` + `electrobun build --env=stable`).
   - Uploads `apps/desktop/artifacts/**` (e.g. Windows `*-Quester-Setup*.zip`), not Vite `dist/` alone.
5. Confirm [Try Quester](../../apps/docs/src/content/docs/try.md) docs match the live Release links.

Release notes include: *Development build — see SECURITY.md for download verification.*

## Hotfix

1. Branch `hotfix/1.2.1` from tag `v1.2.0`
2. Fix + test + patch changeset
3. PR → squash merge to `main`
4. `bun run version` → release workflow → `v1.2.1`

## After release

- Update [ROADMAP.md](../../ROADMAP.md) (move items to Shipped)
- Close milestone issues
- Sync docs roadmap page

## First-time setup

1. npm account with public `@quester` scope access
2. GitHub `NPM_TOKEN` secret
3. Branch protection on `main`: require CI, squash merge only
4. GitHub Pages enabled for docs (Settings → Pages → GitHub Actions)

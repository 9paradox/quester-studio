---
name: feature-planning
description: Plan and track Quester Studio features — ROADMAP, GitHub Issues, milestones, PR scope. Use before starting new features or epics.
---

# Feature planning

## Before coding

1. Read [ROADMAP.md](../../ROADMAP.md) — is this planned?
2. Open or find a GitHub Issue with `type:feature` + `area:*` + milestone
3. Pick the right skill:
   - New node type → `add-flow-node`
   - Desktop UI → `quester-desktop`
   - Engine/schema → `quester-studio`

## Issue labels

- `type:feature`, `area:desktop|schema|nodes|engine|cli|docs|infra`
- `priority:high` (current milestone), `medium`, `low` (backlog)

## Branch and PR

```
feat/<short-name>   or   feat/issue-42
```

PR must include:
- [ ] `Fixes #N` or `Refs #N`
- [ ] Tests for logic changes
- [ ] `.changeset/*.md` if user-facing
- [ ] ROADMAP checkbox updated if scope changed

## Do not

- Expand scope beyond the issue without updating ROADMAP and issue
- Leave `TODO` without `TODO(#issue)`
- Skip milestone assignment for planned work

## Seed backlog

```bash
./.github/scripts/seed-labels.sh
./.github/scripts/seed-issues.sh
```

## Milestones

| Milestone | Focus |
|-----------|-------|
| v0.6.0 | **Shipped** |
| v0.6.x | **Current** — priority polish (see ROADMAP.md); no version jumps |
| v0.9+ | Only when desktop → web → docs are properly polished |

Work from ROADMAP priority todos and **one plan file at a time** in [.cursor/plans/](../../.cursor/plans/README.md). Prefer patch releases on the current minor line.

Before coding a slice: open the matching `NN-*.md` plan, confirm dependencies, then branch.

## After a plan completes

When automated work for a plan is done (lint/tests green, ROADMAP/BUGS updated as needed), **ask the user to manually test** the concrete X / Y / Z items in that plan’s **After complete — ask user to confirm** section. Do not treat the plan as fully closed until they confirm or explicitly skip.

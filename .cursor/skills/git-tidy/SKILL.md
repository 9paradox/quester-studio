---
name: git-tidy
description: Audit and tidy local git state and GitHub branches/PRs for Quester Studio. Use when the user asks if branches are clean, to delete stale branches, or after merging PRs.
---

# Git and GitHub tidy-up

Audit working tree, local branches, and GitHub remotes. Delete **merged** feature/fix branches only after user confirmation.

Repo: `9paradox/quester-studio`. Default branch: `main` (protected, squash-merge only).

## Audit (run in parallel)

```powershell
git status
git branch -vv
git fetch --prune
gh auth status
gh pr list --state all --limit 30
gh api repos/9paradox/quester-studio/branches --paginate -q ".[].name"
```

If `gh` is not authenticated, tell the user to run `gh auth login` and stop before any delete step.

## Report format

Summarize in a short table:

| Area | Status |
|------|--------|
| Working tree | clean / dirty |
| Current branch | name, synced with remote? |
| Stale local branches | merged PR branches still present |
| Stale remote branches | same, on `origin` |
| Open PRs | count; note Dependabot separately |

**Clean** = working tree clean, on `main`, synced with `origin/main`, no stale `feat/*`, `fix/*`, `chore/*`, or `hotfix/*` branches after merge.

**Squash-merge caveat:** merged PR branches often have different SHAs than `main`. Use `gh pr list` MERGED status (or `gh pr view <n> --json mergedAt,headRefName`) — not `git merge-base --is-ancestor`.

## What to delete

Delete when **all** are true:

- PR state is `MERGED` (or user explicitly asks to remove a closed/abandoned branch)
- Branch matches `feat/*`, `fix/*`, `chore/*`, or `hotfix/*`
- Branch is not `main`

**Do not delete without asking:**

- `main` or any branch with unmerged work
- Open PR branches (including Dependabot)
- Branches the user is still using locally

## Cleanup (after user confirms)

PowerShell: chain with `;`, not `&&`.

```powershell
git branch -d <branch>
git push origin --delete <branch>
```

Multiple branches:

```powershell
git branch -d feat/foo fix/bar
git push origin --delete feat/foo fix/bar
```

Use `-D` only if the user explicitly wants to force-delete an unmerged local branch.

## Safety

- Never force-push `main`
- Never delete remote branches the user did not approve
- Run `git fetch --prune` after remote deletes to refresh tracking refs
- Re-run audit commands to verify final state

## When to offer cleanup

After merging a PR (squash to `main`), suggest deleting the head branch if it still exists locally or on GitHub.

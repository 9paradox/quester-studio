## Summary

<!-- PR title must be a Conventional Commit — it becomes the squash commit message on merge. -->

## Checklist

- [ ] `bun run lint` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run build` passes
- [ ] `bun run test` passes
- [ ] No secrets committed (`*.secrets.json`, `.env`, tokens)
- [ ] If `@quester/schema` changed: `schemas/` regenerated
- [ ] Tests added or updated for logic changes
- [ ] User-facing change includes `.changeset/*.md` in this PR
- [ ] Issue referenced (`Fixes #N` or `Refs #N`) when applicable

## Test plan

<!-- How did you verify this change? -->

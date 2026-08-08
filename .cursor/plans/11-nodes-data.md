# Plan 11 — Nodes: data helpers

**Priority:** 11  
**Status:** after stability wave  
**ROADMAP:** §6 Data  

## Goal

Common data shaping / generation without requiring a `code` node.

## Out of scope

`code` node (plan 13); CSV/table etc. (Later).

## Work

- [ ] `pick` / `omit`  
- [ ] `uuid` / `timestamp` / `random`  
- [ ] `schema` validation node  
- [ ] Richer query helpers where JMESPath isn’t enough  

## Done when

Each node fully wired (schema, execute, desktop, docs, tests, changeset).

## After complete — ask user to confirm

When this plan’s work is done and automated tests/lint pass, **ask the user** to manually verify:

- [ ] **X** — `pick` / `omit` (and any query helpers): shape JSON as expected from a small sample flow.
- [ ] **Y** — `uuid` / `timestamp` / `random`: values generate and template into later steps.
- [ ] **Z** — `schema` validation node: valid payload passes, invalid fails with a clear message; desktop + docs present.

Do not treat the plan as fully closed until the user confirms (or explicitly skips) these checks.

## Skills

`add-flow-node`

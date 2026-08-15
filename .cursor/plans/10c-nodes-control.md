# Plan 10c — Nodes: parallel + while

**Priority:** 10c (after plan 10b; after framed try/foreach 09 / 09b)  
**Status:** after 09b + prefer after 10/10b  
**ROADMAP:** §6 Control  
**Depends on:** plan 09 / 09b framed containers

## Goal

Framed control nodes for fan-out and condition loops, with the same nesting/hit-test story as `try` / `foreach` and hard caps from SECURITY.md.

## Out of scope

- Auth / HTTP helper nodes (plans 10 / 10b)
- Generic `group` / `frame` (Later)
- Changing existing `foreach` `complete` / `try` `success`/`failed` handle names unless required for consistency

## Dependencies

Framed `try` / `foreach` and nested frames. Extend `FRAME_CONTAINER_TYPES` and engine frame execution; do not invent a second container system.

## Work

- [ ] `parallel` (framed; join semantics + concurrency cap aligned with foreach ≤ 32)
- [ ] `loop` / `while` (framed; max-iteration / abort per SECURITY.md — no unbounded loops)
- [ ] Schema graph validation: parent/body/exit rules; cycle rejection
- [ ] Engine tests: abort, caps, nested with try/foreach
- [ ] Desktop: catalog, frames, inspector, help
- [ ] Docs + changeset; update SECURITY.md caps section

## Done when

User can add `parallel` and `while` frames on the canvas; graphs validate and run; caps/abort are tested and documented.

## After complete — ask user to confirm

When this plan’s work is done and automated tests/lint pass, **ask the user** to manually verify:

- [ ] **X** — `parallel`: branches run as documented; join output is usable; concurrency cap is obvious in inspector.
- [ ] **Y** — `loop` / `while`: stops at max iterations; Stop/abort cancels; no runaway loop in a small sample.
- [ ] **Z** — Nesting with `try`/`foreach` (or documented limits); catalog, inspector, and docs exist for each node.

Do not treat the plan as fully closed until the user confirms (or explicitly skips) these checks.

## Skills

`add-flow-node`, `quester-desktop`, `quester-studio`, `security-review`

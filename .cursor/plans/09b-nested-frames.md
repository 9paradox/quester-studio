# Plan 09b — Nested frames

**Priority:** 9b (immediately after plan 09)  
**Status:** code complete (await user X/Y/Z)  
**ROADMAP:** §6 Control — Nested frames (follow-up to framed `try` / `foreach`)  
**Depends on:** plan 09 (framed try/foreach) code complete  

## Goal

Allow `try` / `foreach` to nest inside each other via the desktop UI, with engine regression coverage and docs that match runtime behavior.

Today: schema + engine can accept/execute nested frames when `parentId` is set; desktop drag/hit-test blocks nesting frames (`reparentNodeInFlow` + top-level-only `findFrameAtPoint`; comment “nested ok later”).

## Out of scope

- Generic `group` / `frame` (Later)
- `parallel` / `while` (separate §6 items)
- Changing outer handle semantics (`success` / `failed` / `complete`)
- Max nesting depth (cycles only; no depth cap)

## Dependencies

Requires plan 09 framed containers. Prefer landing after user X/Y/Z on 09, or in parallel only if nesting PRs stay additive.

## Work

- [x] Desktop — allow reparenting a frame into another frame (block self/descendant cycles only; keep blocking `start`)
- [x] Desktop — `findFrameAtPoint` (and drop hit-test) considers nested frames; prefer deepest / smallest containing frame
- [x] Desktop — palette / canvas add: dropping a `try`/`foreach` onto a frame parents it; drag out clears parent; resize/extent correct for nested frames
- [x] Desktop — entry/exit + outer-handle wiring when the body child is itself a frame (e.g. foreach entry → nested try; nested try success/failed → foreach exit or sibling)
- [x] Schema — confirm validation already allows nested frames; add explicit graph-validation tests for try∈foreach, foreach∈try, and cycle rejection
- [x] Engine — regression tests: nested try inside foreach (success + failed paths); foreach inside try; depth ≥ 2; concurrency + nested try
- [x] Docs — update `try` / `foreach` node pages with nesting rules (what UI allows; how outer handles attach)
- [x] Optional sample — one framed nest in examples (or doc snippet) that validates + runs

## Done when

User can drag `try` into `foreach` (and the reverse) on the canvas; nested flows validate and run; tests cover depth ≥ 2; docs describe nesting.

## After complete — ask user to confirm

When this plan’s work is done and automated tests/lint pass, **ask the user** to manually verify:

- [ ] **X** — Desktop: drag `try` into `foreach` and `foreach` into `try`; drag out; deepest-frame drop target feels right.
- [ ] **Y** — Run foreach→try→http: per-item success and a thrown error inside try behave as expected (`complete` / collected results; try `failed` when wired).
- [ ] **Z** — Validate rejects parent cycles; docs/sample match UI.

Do not treat the plan as fully closed until the user confirms (or explicitly skips) these checks.

## Skills

`quester-desktop`, `quester-studio`

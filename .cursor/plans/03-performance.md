# Plan 03 — Performance

**Priority:** 3  
**Status:** after B4/B5 (plan 01) preferred  
**ROADMAP:** §2 Performance  

## Goal

Snappy desktop + predictable engine/CLI under large flows, big JSON, long suites.

## Out of scope

New viewer product UX (plan 04/07) — but share virtualization choices with them.

## Dependencies

B5 fixed so long runs can be profiled honestly.

## Work

- [ ] Profile desktop canvas — pan/zoom/select on large graphs  
- [ ] Defer canvas position commits to drag-end (no per-frame full-flow stringify)  
- [ ] Profile inspector / response panel on large JSON / long logs  
- [ ] Performant JSON viewer foundation — Monaco-class + virtualize / lazy parse (feeds plan 04)  
- [ ] Lazy / truncate on-canvas `json` / `inspect` viewers  
- [ ] Engine — big responses, long suites; sensible default `maxResponseBytes`  
- [ ] Cut unnecessary re-renders / IPC chatter on run status  
- [ ] Fast workspace load (many flows / collections / run history)  
- [ ] CLI suite performance for CI-scale smoke  

## Done when

Documented before/after notes (even informal) for canvas drag and a large response open; no obvious freezes on sample-scale suites.

## After complete — ask user to confirm

When this plan’s work is done and automated tests/lint pass, **ask the user** to manually verify:

- [ ] **X** — Large-graph canvas: pan/zoom/select and node drag feel snappy; positions commit on drag-end (no per-frame freeze).
- [ ] **Y** — Large JSON / long logs in inspector or response panel open without multi-second UI lockups.
- [ ] **Z** — Workspace with many flows/runs loads promptly; sample-scale suite/CLI run does not thrash the UI or machine.

Do not treat the plan as fully closed until the user confirms (or explicitly skips) these checks.

## Skills

`quester-desktop`, `quester-studio`

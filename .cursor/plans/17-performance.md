# Plan 17 — Performance

**Priority:** 17 (last)  
**Status:** Later — after plans 04–16; absorb perf debt from landed viewers / run UX / canvas  
**ROADMAP:** §2 Performance  

## Goal

Snappy desktop + predictable engine/CLI under large flows, big JSON, long suites — after feature/UI foundations exist so the pass targets real hotspots.

## Out of scope

New viewer product UX (plan 04/07) — land those first; this plan hardens virtualization / lazy parse on top.

## Dependencies

- Run **last** so canvas, JSON/response viewers, logs, and run UX can ship first; this pass profiles and hardens them.
- B5 fixed so long runs can be profiled honestly (plan 01).

## Work

- [ ] Profile desktop canvas — pan/zoom/select on large graphs  
- [ ] Defer canvas position commits to drag-end (no per-frame full-flow stringify)  
- [ ] Profile inspector / response panel on large JSON / long logs  
- [ ] Performant JSON viewer hardening — virtualize / lazy parse on plan 04 foundations  
- [ ] Lazy / truncate on-canvas `json` / `inspect` viewers  
- [ ] Engine — big responses, long suites; sensible default `maxResponseBytes`  
- [x] Cut unnecessary re-renders / IPC chatter on run status — **retired by plan 21** ([#138](https://github.com/9paradox/quester-studio/pull/138))  
- [ ] Fast workspace load (many flows / collections / run history)  
- [ ] CLI suite performance for CI-scale smoke  
- [ ] Fold in any interim perf notes / TODOs left by plans 04–16  

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

# Plan 09 — Framed try / foreach

**Priority:** 9  
**Status:** complete (user confirmed X/Y/Z)  
**ROADMAP:** §6 Control — Framed `try` / `foreach`  
**BUGS:** closes B13  

## Goal

`try` / `foreach` as required subgraph containers (no dual soft/map-only mode); real error boundary for `try`.

## Out of scope

Generic `group`/`frame` (Later); `parallel` / `while` (same §6, separate follow-ups).

## Dependencies

**Requires** B4 fan-in join semantics. Breaking schema — plan migration carefully (additive fields + validate errors on legacy).

## Work

- [x] Schema — `parentId` (+ optional `extent`); children only under `try`/`foreach`; forbid edges leaving frame except container handles  
- [x] Engine — `try` body once; throw → `failed`, else `success`  
- [x] Engine — `foreach` body per item (`item`/`index`); single `complete` with `results`  
- [x] Desktop — resizable frames; drag into/out of parent; handles: try `success`/`failed`, foreach `complete`  
- [x] Inspector — container fields only; drop soft-guard / map-only empty modes  
- [x] Migrate samples + docs; validate errors on legacy soft-`try` / map-only `foreach`; soft branch stays on `if`  

## Done when

Sample uses framed containers; a thrown HTTP/assert inside `try` takes `failed` handle; foreach collects results; B13 marked fixed in BUGS.md.

## After complete — ask user to confirm

When this plan’s work is done and automated tests/lint pass, **ask the user** to manually verify:

- [x] **X** — Desktop: draw/resize frames; drag nodes into/out of `try` / `foreach`; handles match (`success`/`failed`, `complete`).
- [x] **Y** — Throw/fail inside `try` body follows `failed`; success follows `success`.
- [x] **Z** — `foreach` runs body per item and exposes collected `results`; samples validate; legacy soft-try / map-only fail with clear errors.

## Skills

`add-flow-node`, `quester-studio`, `quester-desktop`

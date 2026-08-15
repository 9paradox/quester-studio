# Plan 05 — Desktop Run UX

**Priority:** 5  
**Status:** complete (user confirmed X/Y/Z)  

**ROADMAP:** §3 Run UX (+ run/debug clarity)  

## Goal

Clear, compact run feedback: animated nodes, full node list, asserts, overall rollup.

## Out of scope

Folder logs browser (plan 07); engine fan-in (plan 01 B4) but list should show real execution order once B4 lands.

## Dependencies

**Requires** B5 (long runs) and B8 (no double-run / Stop races).

## Work

- [x] Node run animation — in-progress / success / fail (performant on large graphs)  
- [x] Run status panel — compact list of **all** nodes (order, type/name, state, duration)  
- [x] Assert visibility — every `assert` / check outcome (pass/fail + message)  
- [x] Final overall status — success / failed / cancelled + counts (asserts, failed nodes, timing)  
- [x] Tie into existing Response/Logs panels without breaking per-flow isolation (B3)  

## Done when

A flow with multiple asserts shows each result in the list; overall status matches engine outcome; animation does not tank FPS on a 50+ node flow.

## After complete — ask user to confirm

When this plan’s work is done and automated tests/lint pass, **ask the user** to manually verify:

- [x] **X** — During a run, nodes animate in-progress / success / fail without obvious canvas lag.
- [x] **Y** — Run status panel lists all nodes with order, state, duration; every assert shows pass/fail + message.
- [x] **Z** — Final overall status (success / failed / cancelled + counts) matches engine; Response/Logs stay per-flow isolated.

Do not treat the plan as fully closed until the user confirms (or explicitly skips) these checks.

## Skills

`quester-desktop`

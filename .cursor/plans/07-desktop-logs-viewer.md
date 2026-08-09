# Plan 07 — Desktop folder logs viewer

**Priority:** 7  
**Status:** code complete (await user X/Y/Z)  
**ROADMAP:** §3 Builders — folder logs viewer  

## Goal

Browse workspace `runs/` (and related log folders) with JSON raw or structured UI and multi-tab support.

## Out of scope

Changing run-file on-disk format (unless small additive fields needed for structured UI).

## Dependencies

Plan 04 shared viewer; plan 01 B7 so opened logs don’t surprise with secrets (disk already redacted).

## Work

- [x] Sidebar / command to open runs folder browser  
- [x] List run directories + step files  
- [x] Tabs — multiple files/runs open at once  
- [x] Modes — raw JSON (Monaco) **or** structured UI (step list, I/O sections)  
- [x] Safe paths — stay inside workspace runs dir (align with B10 discipline)  

## Done when

User can open a past suite/flow run, inspect steps in UI mode, and flip to raw JSON without leaving the app.

## After complete — ask user to confirm

When this plan’s work is done and automated tests/lint pass, **ask the user** to manually verify:

- [ ] **X** — Open runs folder browser from sidebar/command; list run dirs + step files inside the workspace only.
- [ ] **Y** — Open multiple files/runs in tabs; switch between them without losing place.
- [ ] **Z** — Toggle structured UI (steps / I/O) vs raw JSON for the same step; secrets stay redacted as expected.

Do not treat the plan as fully closed until the user confirms (or explicitly skips) these checks.

## Skills

`quester-desktop`, `quester-studio`

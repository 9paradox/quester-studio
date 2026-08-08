# Plan 04 — Desktop JSON / response viewers

**Priority:** 4  
**Status:** after plan 01; use plan 03 viewer foundation  
**ROADMAP:** §3 Builders — collections JSON, response new tab  

## Goal

Proper, performant editing/viewing of JSON for collections and responses (Monaco-class).

## Out of scope

Forms editor (plan 12), code editor (plan 13), folder logs browser (plan 07 — reuse components).

## Dependencies

Plan 03 JSON viewer foundation ideal; can land a first Monaco integration here if needed.

## Work

- [ ] Shared JSON editor/viewer component (e.g. `@monaco-editor/react` or equivalent)  
  - Syntax highlight, fold, search, large-body safe  
- [ ] Wire into **Collections** request/body (and related JSON fields)  
- [ ] **Response viewer** — open in a new app tab (full-bleed JSON / pretty / headers; keep panel for quick peek)  
- [ ] Theme parity with desktop light/dark  

## Done when

Large collection body (~MB-class) editable without UI freeze; response “Open in tab” works; panel peek still works.

## After complete — ask user to confirm

When this plan’s work is done and automated tests/lint pass, **ask the user** to manually verify:

- [ ] **X** — Collections: edit a large JSON body with highlight/fold/search; UI stays usable.
- [ ] **Y** — Response “Open in tab” shows full JSON/pretty/headers; panel quick-peek still works.
- [ ] **Z** — Light and dark themes look correct for the shared viewer/editor.

Do not treat the plan as fully closed until the user confirms (or explicitly skips) these checks.

## Skills

`quester-desktop`, `shadcn-ui`

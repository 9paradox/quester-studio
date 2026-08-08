# Plan 04 — Desktop JSON / response viewers

**Priority:** 4  
**Status:** after plan 01; perf pass (plan 03) comes later  
**ROADMAP:** §3 Builders — collections JSON, response new tab  

## Goal

Proper, performant editing/viewing of JSON for collections and responses (Monaco-class).

## Out of scope

Forms editor (plan 12), code editor (plan 13), folder logs browser (plan 07 — reuse components). Plan 03 will harden large-payload performance after this lands.

## Dependencies

None blocking from plan 03. Land Monaco (or equivalent) here; leave hooks / choices that the later perf pass can reuse (virtualize / lazy parse).

## Work

- [x] Shared JSON editor/viewer component (e.g. `@monaco-editor/react` or equivalent)  
  - Syntax highlight, fold, search, large-body safe  
- [x] Wire into **Collections** request/body (and related JSON fields)  
- [x] **Response viewer** — open in a new app tab (full-bleed JSON / pretty / headers; keep panel for quick peek)  
- [x] Theme parity with desktop light/dark  

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

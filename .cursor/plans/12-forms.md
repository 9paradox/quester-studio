# Plan 12 — Forms

**Priority:** 12  
**Status:** after plans 04 + 06 (editor + DnD patterns)  
**ROADMAP:** §3 Forms builder + §6 Forms & custom code (`form` node)  

## Goal

First-class **Forms** workspace section (like collections/flows): editor, files on disk, drag to canvas as a `form` node that can replace plain `input`.

## Out of scope

Code node (plan 13); multi-tenant form hosting.

## Dependencies

JSON/Monaco patterns (04); sidebar → canvas DnD (06).

## Work

- [ ] Workspace layout — e.g. `forms/*.form.json` + manifest field  
- [ ] Schema for form definition (fields, types, validation, defaults)  
- [ ] Desktop Forms section — list / create / edit in form builder UI  
- [ ] `form` node — references a form; supplies structured run payload  
- [ ] Drag form from sidebar onto canvas  
- [ ] CLI / `quester run` — still accept JSON matching the form  
- [ ] Sample form + docs  

## Done when

Create a form → drop on canvas → run with UI fields or CLI JSON; behaves as input replacement for that flow.

## After complete — ask user to confirm

When this plan’s work is done and automated tests/lint pass, **ask the user** to manually verify:

- [ ] **X** — Create/edit a form under Forms; file lands on disk and lists/reloads correctly.
- [ ] **Y** — Drag form onto canvas as `form` node; fill fields in UI and run successfully.
- [ ] **Z** — Same flow runs from CLI with JSON matching the form; sample + docs work cold.

Do not treat the plan as fully closed until the user confirms (or explicitly skips) these checks.

## Skills

`quester-desktop`, `add-flow-node`, `quester-studio`

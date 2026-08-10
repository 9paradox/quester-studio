# Plan 12 — Forms

**Priority:** 12  
**Status:** implemented (await user X/Y/Z)  
**ROADMAP:** §3 Forms builder + §6 Forms & custom code (`form` node)  

## Goal

First-class **Forms** workspace section (like collections/flows): editor, files on disk, drag to canvas as a `form` node that pauses mid-flow for structured input (multiple forms per flow; dynamic defaults / selects).

## Out of scope

Code node (plan 13); multi-tenant form hosting; interactive CLI prompts.

## Dependencies

JSON/Monaco patterns (04); sidebar → canvas DnD (06).

## Work

- [x] Workspace layout — e.g. `forms/*.form.json` + manifest field  
- [x] Schema for form definition (fields, types, validation, defaults)  
- [x] Desktop Forms section — list / create / edit in form builder UI  
- [x] `form` node — references a form; supplies structured run payload (await/submit)  
- [x] Drag form from sidebar onto canvas  
- [x] CLI / `quester run` — `--forms` / `--form-input` map by form node id  
- [x] Sample form + docs  

## Done when

Create a form → drop on canvas → run with UI fields or CLI JSON; mid-flow wait/submit works for multi-form flows.

## After complete — ask user to confirm

When this plan’s work is done and automated tests/lint pass, **ask the user** to manually verify:

- [ ] **X** — Create/edit a form under Forms; file lands on disk and lists/reloads correctly.
- [ ] **Y** — Multi-form run: search → pick from results → detail form shows product → submit adds to cart.
- [ ] **Z** — Same flow runs from CLI with `--forms` map; sample + docs work cold.

Do not treat the plan as fully closed until the user confirms (or explicitly skips) these checks.

## Skills

`quester-desktop`, `add-flow-node`, `quester-studio`

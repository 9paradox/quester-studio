# Plan 06 — Desktop canvas, DnD, nodes UI

**Priority:** 6  
**Status:** after plan 01  
**ROADMAP:** §3 Builders (DnD, nodes UI) + Canvas & editor  

## Goal

IDE-feel canvas: better nodes, flow (and later form/code) drag-drop, editor ergonomics.

## Out of scope

Framed containers (plan 09); forms/code product (12/13) — leave DnD hooks for them.

## Dependencies

None hard. Forms/code DnD consummated in 12/13.

## Work

- [x] Nodes UI enhance — chrome, status, handles, type identity; selected / running / error  
- [x] Flow drag-and-drop onto canvas — define UX: open tab vs drop as `subflow`  
- [x] Form / code DnD hooks — same sidebar → canvas pattern (stub OK until 12/13)  
- [x] Canvas ergonomics — selection, multi-select, alignment, edge editing  
- [x] Inspector depth — clear per-node forms; fewer dead ends  
- [x] Per-flow console lines (fix global `consoleLines` gap)  
- [x] Template / JMESPath assist polish beyond v1  
- [ ] Command palette + shortcuts coverage  
- [ ] Preferences discoverability  
- [ ] Welcome / empty / error states  

## Done when

Dragging a flow from the sidebar has a documented, working behavior; node visual states readable at a glance; console does not leak across flows.

**UX locked this slice:** Click flow → open tab. Drag flow → insert `subflow` (self-drop blocked). Droppable sidebar rows show grip icons.

## After complete — ask user to confirm

When this plan’s work is done and automated tests/lint pass, **ask the user** to manually verify:

- [ ] **X** — Drag a flow from the sidebar onto the canvas — documented UX (open tab vs `subflow`) works as specified.
- [ ] **Y** — Node chrome/states (selected / running / error) are readable; selection, multi-select, and edge editing feel usable.
- [ ] **Z** — Console lines stay per-flow; inspector / palette / welcome empty states have no obvious dead ends.

Do not treat the plan as fully closed until the user confirms (or explicitly skips) these checks.

## Skills

`quester-desktop`, `shadcn-ui`

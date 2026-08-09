# @quester-studio/schema

## 0.6.2

### Patch Changes

- bba12dc: Add optional `fontSize` (px) on note sticky nodes for canvas body text.

- f2c407e: Frame polish: put `success`/`failed`/`complete` on the header-right, allow only one entry and one exit per frame, reattach exit when chaining body nodes, and reject body sibling cycles on the canvas.
- cbf5369: Breaking: framed `try` / `foreach` containers with `parentId`, entry/exit edges, and outer `success`/`failed` / `complete` handles. Soft-try and map-only foreach are rejected; soft branching stays on `if`.
- 205ff52: Enforce at most one incoming edge for ordinary nodes (docs `in ×1`). New `join` node accepts N inputs and emits a collect-map of predecessor outputs for diamonds and post-branch reconvergence. Frame auto-wiring no longer adds redundant entry edges.
- bdb408f: Allow nesting `try` / `foreach` frames on the canvas (deepest-frame drop target). Nested frames wire parent `entry`→child `in` and child `success`/`complete`→parent `exit`. Template lint recognizes `{{item}}`/`{{index}}` inside nested foreach bodies.
- f4ddc5e: Stability: template `mode` (`eta` | `safe`), document eta-as-code in SECURITY, and clarify try soft-check + web Try/Guide/roadmap drift.
- f4ddc5e: Stability: abortable capped `delay`, reject unsafe flow/env/secrets path ids, and exclude secrets/runs from desktop sample sync.

## 0.6.0

### Minor Changes

- f90b614: Scenario testing focus: site and docs for developers, testers, and business analysts; on-disk per-step run logs; `quester suite` and `--report` JSON; sample smoke suite and continuous integration validate step.

## 0.5.0

### Minor Changes

- 3ed1209: Cap foreach `maxItems` (≤10000) and `concurrency` (≤32); document loop/subflow resource limits in SECURITY.md.
- f6aa29b: v1.0 thin slice: Postman Collection v2.1 import (`quester import-collection` + desktop Collections **Import**), unsigned macOS desktop artifact in release CI, flow format `v1` freeze note. Desktop polish: bundled sample workspace, installer icon/shortcuts, per-flow runs with stop/toasts, command palette, shortcuts table, run summary, JMESPath assist. New nodes: delay, switch, foreach, try, subflow, log, inspect; AbortSignal cancel; disk cookie jar.

## 0.4.5

### Patch Changes

- bf913ef: Add a `note` canvas sticky node — disconnected plain-text annotations that are not executed and do not break CLI runs.
- f33404d: Windows desktop releases now ship a portable zip and an NSIS installer (choose install folder; uninstall from Settings → Apps).

## 0.4.0

### Minor Changes

- e04dd22: Collections: standalone `*.request.json` files, Request editor tab (Send), and drag requests onto the canvas as HTTP nodes.
- 3f98c6e: Richer `if` / `assert` check operators (`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, and more). Legacy `equals` still works.
- d863bb0: Details, settings, and preferences: edit flow/workspace name & description; App Preferences and Workspace Settings editor tabs; workspace HTTP default headers and timeout (merged into HTTP nodes); SSL verification preference in Preferences.
- 946cd98: HTTP settings MVP: flow settings UI, maxResponseBytes, in-run cookie jar, proxyUrl, caFile, workspace/flow verifyTls, and Preferences shortcuts (Ctrl/⌘ Enter, Ctrl/⌘ W).
- e04dd22: New flow nodes: `assert`, `transform`, `merge`, and `json` (canvas JSON display).
- 38d00d0: Rename npm scope from `@quester/*` to `@quester-studio/*` to match the publishable npm org (first public release).
- 896fdb4: Add `start` node as the sole flow entry (exactly one; at most one child); execution and validation begin at `start`.

### Patch Changes

- f4a90fb: Inspector Save button, canvas zoom controls, error toasts, logs clear, assert path clear fix, themed zoom controls, and resizable JSON nodes (optional width/height on flow nodes).
- 8789f58: Governance foundation: CI gates, contributor docs, security hardening, and release tooling.
- 87ef4d2: Persist default run input on the input node (`data.value`) and hydrate the desktop Run panel from the flow file.
- 896fdb4: Remove extract/json `source: "input"` — both always read the previous node; use `{{input.*}}` for run payload.
- a50e569: Include validation issue details and fix suggestions in flow validation errors (save/run/CLI).

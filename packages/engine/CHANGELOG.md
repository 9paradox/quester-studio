# @quester-studio/engine

## 0.6.2

### Patch Changes

- b091c84: Desktop Runs browser: tree navigation, delete file/run folders with confirm, and fix cancel leaving run meta stuck as "running".
- d597645: Desktop Run UX: live Response summary + step timeline (click to focus on canvas), assert per-check outcomes, node run durations/animation, and cancelled/success rollup.
- cbf5369: Breaking: framed `try` / `foreach` containers with `parentId`, entry/exit edges, and outer `success`/`failed` / `complete` handles. Soft-try and map-only foreach are rejected; soft branching stays on `if`.
- 205ff52: Enforce at most one incoming edge for ordinary nodes (docs `in ×1`). New `join` node accepts N inputs and emits a collect-map of predecessor outputs for diamonds and post-branch reconvergence. Frame auto-wiring no longer adds redundant entry edges.
- bdb408f: Allow nesting `try` / `foreach` frames on the canvas (deepest-frame drop target). Nested frames wire parent `entry`→child `in` and child `success`/`complete`→parent `exit`. Template lint recognizes `{{item}}`/`{{index}}` inside nested foreach bodies.
- e74aeba: Stability: fan-in join semantics, long desktop runs, secret redaction in RPC logs, hero sample `{{input.*}}` credentials, and localhost-only API guardrails.
- f4ddc5e: Stability: cookie jar uses final response URL and honors Secure/Path; CLI shares jar with subflows and loads secrets from `environmentsDir`.
- Updated dependencies [d597645]
- Updated dependencies [f2c407e]
- Updated dependencies [cbf5369]
- Updated dependencies [205ff52]
- Updated dependencies [bdb408f]
- Updated dependencies [bba12dc]
- Updated dependencies [f4ddc5e]
- Updated dependencies [f4ddc5e]
- Updated dependencies [f4ddc5e]
  - @quester-studio/nodes@0.6.2
  - @quester-studio/schema@0.6.2

## 0.6.0

### Minor Changes

- f90b614: Scenario testing focus: site and docs for developers, testers, and business analysts; on-disk per-step run logs; `quester suite` and `--report` JSON; sample smoke suite and continuous integration validate step.

### Patch Changes

- 02ea008: Revert `{{previous}}` template scope. Consolidate docs into `apps/web` with How-flows-work diagrams and brand-matched code/filetree styles; remove the legacy Starlight docs app.
- Updated dependencies [f90b614]
  - @quester-studio/schema@0.6.0
  - @quester-studio/nodes@0.6.0

## 0.5.0

### Minor Changes

- f6aa29b: v1.0 thin slice: Postman Collection v2.1 import (`quester import-collection` + desktop Collections **Import**), unsigned macOS desktop artifact in release CI, flow format `v1` freeze note. Desktop polish: bundled sample workspace, installer icon/shortcuts, per-flow runs with stop/toasts, command palette, shortcuts table, run summary, JMESPath assist. New nodes: delay, switch, foreach, try, subflow, log, inspect; AbortSignal cancel; disk cookie jar.

### Patch Changes

- Updated dependencies [3ed1209]
- Updated dependencies [f6aa29b]
  - @quester-studio/schema@0.5.0
  - @quester-studio/nodes@0.5.0

## 0.4.5

### Patch Changes

- bf913ef: Add a `note` canvas sticky node — disconnected plain-text annotations that are not executed and do not break CLI runs.
- f33404d: Windows desktop releases now ship a portable zip and an NSIS installer (choose install folder; uninstall from Settings → Apps).
- Updated dependencies [bf913ef]
- Updated dependencies [f33404d]
  - @quester-studio/schema@0.4.5
  - @quester-studio/nodes@0.4.5

## 0.4.0

### Minor Changes

- e04dd22: Collections: standalone `*.request.json` files, Request editor tab (Send), and drag requests onto the canvas as HTTP nodes.
- 6bb1e87: Polish desktop run Response/Logs with per-node JSON I/O, HTTP request/response details (headers, latency, size), template highlighting, and key-value headers editing.
- d863bb0: Details, settings, and preferences: edit flow/workspace name & description; App Preferences and Workspace Settings editor tabs; workspace HTTP default headers and timeout (merged into HTTP nodes); SSL verification preference in Preferences.
- 946cd98: HTTP settings MVP: flow settings UI, maxResponseBytes, in-run cookie jar, proxyUrl, caFile, workspace/flow verifyTls, and Preferences shortcuts (Ctrl/⌘ Enter, Ctrl/⌘ W).
- 38d00d0: Rename npm scope from `@quester/*` to `@quester-studio/*` to match the publishable npm org (first public release).
- 896fdb4: Add `start` node as the sole flow entry (exactly one; at most one child); execution and validation begin at `start`.
- 368b4d3: Add desktop workspace welcome (open / create / sample / recents) and share scaffoldWorkspace with the CLI.

### Patch Changes

- 8789f58: Governance foundation: CI gates, contributor docs, security hardening, and release tooling.
- 87ef4d2: Add a DummyJSON kitchen-sink sample flow plus matching collections, local env vars, and secrets template.
- f3ce31c: Point the sample workspace login flow at dummyjson auth (`emilys` / `emilyspass`) with assert + extract side branches.
- Updated dependencies [e04dd22]
- Updated dependencies [3f98c6e]
- Updated dependencies [6bb1e87]
- Updated dependencies [f4a90fb]
- Updated dependencies [d863bb0]
- Updated dependencies [8789f58]
- Updated dependencies [946cd98]
- Updated dependencies [87ef4d2]
- Updated dependencies [e04dd22]
- Updated dependencies [896fdb4]
- Updated dependencies [38d00d0]
- Updated dependencies [896fdb4]
- Updated dependencies [a50e569]
  - @quester-studio/schema@0.2.0
  - @quester-studio/nodes@0.2.0

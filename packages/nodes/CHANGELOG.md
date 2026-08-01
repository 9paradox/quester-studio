# @quester-studio/nodes

## 0.4.5

### Patch Changes

- bf913ef: Add a `note` canvas sticky node — disconnected plain-text annotations that are not executed and do not break CLI runs.
- f33404d: Windows desktop releases now ship a portable zip and an NSIS installer (choose install folder; uninstall from Settings → Apps).
- Updated dependencies [bf913ef]
- Updated dependencies [f33404d]
  - @quester-studio/schema@0.4.5

## 0.4.0

### Minor Changes

- 3f98c6e: Richer `if` / `assert` check operators (`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, and more). Legacy `equals` still works.
- 6bb1e87: Polish desktop run Response/Logs with per-node JSON I/O, HTTP request/response details (headers, latency, size), template highlighting, and key-value headers editing.
- d863bb0: Details, settings, and preferences: edit flow/workspace name & description; App Preferences and Workspace Settings editor tabs; workspace HTTP default headers and timeout (merged into HTTP nodes); SSL verification preference in Preferences.
- 946cd98: HTTP settings MVP: flow settings UI, maxResponseBytes, in-run cookie jar, proxyUrl, caFile, workspace/flow verifyTls, and Preferences shortcuts (Ctrl/⌘ Enter, Ctrl/⌘ W).
- e04dd22: New flow nodes: `assert`, `transform`, `merge`, and `json` (canvas JSON display).
- 38d00d0: Rename npm scope from `@quester/*` to `@quester-studio/*` to match the publishable npm org (first public release).
- 896fdb4: Add `start` node as the sole flow entry (exactly one; at most one child); execution and validation begin at `start`.

### Patch Changes

- 8789f58: Governance foundation: CI gates, contributor docs, security hardening, and release tooling.
- 896fdb4: Remove extract/json `source: "input"` — both always read the previous node; use `{{input.*}}` for run payload.
- Updated dependencies [e04dd22]
- Updated dependencies [3f98c6e]
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

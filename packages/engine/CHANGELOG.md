# @quester-studio/engine

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

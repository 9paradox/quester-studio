# @quester-studio/cli

## 0.6.0

### Minor Changes

- f90b614: Scenario testing focus: site and docs for developers, testers, and business analysts; on-disk per-step run logs; `quester suite` and `--report` JSON; sample smoke suite and continuous integration validate step.

### Patch Changes

- Updated dependencies [02ea008]
- Updated dependencies [f90b614]
  - @quester-studio/engine@0.6.0
  - @quester-studio/schema@0.6.0

## 0.5.0

### Minor Changes

- cd3d198: Separate studio UI and backend for local debug: shared `api-contract` / `workspace-service`, `apps/api` (HTTP + SSE), and desktop `dev:web` / `dev:web:mock` modes. Documents setup and debug for each mode. No change to flow format or CLI behavior.
- f6aa29b: v1.0 thin slice: Postman Collection v2.1 import (`quester import-collection` + desktop Collections **Import**), unsigned macOS desktop artifact in release CI, flow format `v1` freeze note. Desktop polish: bundled sample workspace, installer icon/shortcuts, per-flow runs with stop/toasts, command palette, shortcuts table, run summary, JMESPath assist. New nodes: delay, switch, foreach, try, subflow, log, inspect; AbortSignal cancel; disk cookie jar.

### Patch Changes

- Updated dependencies [3ed1209]
- Updated dependencies [f6aa29b]
  - @quester-studio/schema@0.5.0
  - @quester-studio/engine@0.5.0

## 0.4.5

### Patch Changes

- 52b15b6: Desktop ships a Quester app icon/logo, matches the Windows title bar to the app theme (persisted under local app data), and lets Preferences open without a workspace.
- 6505d36: Docs and README: note node coverage, demo-main-nodes samples, and an app shell screenshot.
- bf913ef: Add a `note` canvas sticky node — disconnected plain-text annotations that are not executed and do not break CLI runs.
- f33404d: Windows desktop releases now ship a portable zip and an NSIS installer (choose install folder; uninstall from Settings → Apps).
- Updated dependencies [bf913ef]
- Updated dependencies [f33404d]
  - @quester-studio/schema@0.4.5
  - @quester-studio/engine@0.4.5

## 0.4.0

### Minor Changes

- 946cd98: HTTP settings MVP: flow settings UI, maxResponseBytes, in-run cookie jar, proxyUrl, caFile, workspace/flow verifyTls, and Preferences shortcuts (Ctrl/⌘ Enter, Ctrl/⌘ W).
- 70012c9: Add `quester init` to scaffold a new workspace with a start → input starter flow.
- 38d00d0: Rename npm scope from `@quester/*` to `@quester-studio/*` to match the publishable npm org (first public release).
- 368b4d3: Add desktop workspace welcome (open / create / sample / recents) and share scaffoldWorkspace with the CLI.

### Patch Changes

- 8789f58: Governance foundation: CI gates, contributor docs, security hardening, and release tooling.
- 87ef4d2: Add a DummyJSON kitchen-sink sample flow plus matching collections, local env vars, and secrets template.
- f3ce31c: Point the sample workspace login flow at dummyjson auth (`emilys` / `emilyspass`) with assert + extract side branches.
- a50e569: Include validation issue details and fix suggestions in flow validation errors (save/run/CLI).
- Updated dependencies [e04dd22]
- Updated dependencies [3f98c6e]
- Updated dependencies [6bb1e87]
- Updated dependencies [f4a90fb]
- Updated dependencies [d863bb0]
- Updated dependencies [8789f58]
- Updated dependencies [946cd98]
- Updated dependencies [87ef4d2]
- Updated dependencies [87ef4d2]
- Updated dependencies [e04dd22]
- Updated dependencies [896fdb4]
- Updated dependencies [38d00d0]
- Updated dependencies [f3ce31c]
- Updated dependencies [896fdb4]
- Updated dependencies [a50e569]
- Updated dependencies [368b4d3]
  - @quester-studio/schema@0.2.0
  - @quester-studio/engine@0.2.0

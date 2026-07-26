# @quester-studio/desktop

## 0.4.0

### Minor Changes

- e04dd22: Collections: standalone `*.request.json` files, Request editor tab (Send), and drag requests onto the canvas as HTTP nodes.
- 3f98c6e: Richer `if` / `assert` check operators (`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, and more). Legacy `equals` still works.
- 97ee836: Cursor-style IDE layout for the desktop app: unified top bar with flow tabs, activity sidebar, canvas toolbar, inspector panel, bottom console/logs/response, and custom flow card nodes with editing and save support.
- b5a575c: Context-aware autocomplete for `{{â€¦}}` templates and JMESPath fields, with nested paths from static node contracts and a learned path-shape cache (`.quester/path-shapes.json`). Includes copy-path from response trees, warn-only stale-path lint, and Eta `it.*` completion on template nodes.
- 892181f: Show live per-node run status on the flow canvas (idle, running, success, error, skipped) while a flow executes.
- 568e080: Desktop MVP: Electrobun IPC, workspace folder picker, flow list/loader, and run panel with live flow execution.
- 6bb1e87: Polish desktop run Response/Logs with per-node JSON I/O, HTTP request/response details (headers, latency, size), template highlighting, and key-value headers editing.
- b04cc37: Add inspector autosave, canvas Save near Run, context menus (node duplicate/delete, edge delete), Ctrl/Cmd+S, and a right activity bar matching the left sidebar.
- e04dd22: Settings activity view with light/dark/system theme, and drag-and-drop from the node palette onto the flow canvas.
- 66f87ef: Integrate shadcn/ui design system (preset b1D3m6L2) for desktop app chrome â€” buttons, forms, side panels, and theme tokens.
- 0e3edef: Polish the right sidebar with a catalog-driven inspector, per-node Response panels, and in-app node help. Use a lightweight, theme-matched JSON tree for read-only data, and a CodeMirror-based editor for editable JSON and template fields with `{{...}}` highlighting and context-aware autocomplete (env, input, nodes, vars). HTTP body fields include a JSON/XML/HTML/Text dropdown that syncs Content-Type and editor highlighting.
- d863bb0: Details, settings, and preferences: edit flow/workspace name & description; App Preferences and Workspace Settings editor tabs; workspace HTTP default headers and timeout (merged into HTTP nodes); SSL verification preference in Preferences.
- 946cd98: HTTP settings MVP: flow settings UI, maxResponseBytes, in-run cookie jar, proxyUrl, caFile, workspace/flow verifyTls, and Preferences shortcuts (Ctrl/âŒ˜ Enter, Ctrl/âŒ˜ W).
- e04dd22: New flow nodes: `assert`, `transform`, `merge`, and `json` (canvas JSON display).
- 896fdb4: Add `start` node as the sole flow entry (exactly one; at most one child); execution and validation begin at `start`.
- 368b4d3: Add desktop workspace welcome (open / create / sample / recents) and share scaffoldWorkspace with the CLI.

### Patch Changes

- a50e569: Fix canvas edge editing: Delete/Backspace and context menu delete, plus drag-to-reconnect endpoints.
- 7422d16: Improve env and secrets editors with `{{env.*}}` / `{{secrets.*}}` usage hints, a header Save button, masked secret values with show/hide, and template autocomplete for env and secrets keys.
- ea458ac: Fix canvas viewport jump when opening flows, repair env/secrets key-value editing, and add sidebar list icons.
- 49d5a7f: Fix desktop builder UX bugs: shared node icons/accents, Assert checks editor, neutral run/request defaults, and persisted canvas zoom.
- f4a90fb: Inspector Save button, canvas zoom controls, error toasts, logs clear, assert path clear fix, themed zoom controls, and resizable JSON nodes (optional width/height on flow nodes).
- 0debdca: Persist flow HTTP settings on Save and auto-save dirty flows before run so timeout and other settings actually apply.
- 87ef4d2: Persist default run input on the input node (`data.value`) and hydrate the desktop Run panel from the flow file.
- 87ef4d2: Add a DummyJSON kitchen-sink sample flow plus matching collections, local env vars, and secrets template.
- 1eeef51: Replace native rename/create name prompts with a shadcn dialog consistent with the rest of the UI.
- 896fdb4: Remove extract/json `source: "input"` â€” both always read the previous node; use `{{input.*}}` for run payload.
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

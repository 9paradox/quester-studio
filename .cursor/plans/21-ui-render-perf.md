# Plan 21 — Desktop UI: stop run ticks re-rendering the whole editor

**Priority:** 21
**Status:** not started
**Read first:** [UI-REVIEW-EXECUTION.md](./UI-REVIEW-EXECUTION.md)
**Depends on:** plans 18–20 landed
**Branch:** `perf/ui-selector-narrowing`
**Changeset:** no (internal)
**ROADMAP:** retires §2 Performance — "Cut unnecessary re-renders / IPC chatter on run status"

## Goal

`selectActiveFlowRun` returns a fresh object whose identity changes on **every** `nodeStatuses` /
`nodeTimings` patch during a run. Five consumers subscribe to the whole object instead of the one
field they need, so every status tick re-renders `EditorArea` (and the `FlowCanvas` subtree),
`NodeInspector`, `Panel`, and every on-canvas JSON viewer.

This plan narrows those subscriptions. It is a pure read-path change: no store action, no RPC, no
rendered output changes.

## Out of scope

The heavier canvas work — replacing `useEdges()` in every node with a scoped subscription, and adding
`React.memo` to the custom node components — stays in [plan 17](./17-performance.md). It needs
profiling and careful graph-behaviour testing. Do **not** start it here.

Virtualization of `JsonViewer` / path picker / run tree also stays in plan 17.

## Execution contract (short form)

One task per turn. Verify with `bun run lint`,
`bun run --filter @quester-studio/desktop typecheck`, and
`bun run --filter @quester-studio/desktop test` before committing. The store has strong coverage in
`src/renderer/stores/quester-store.test.ts` (1300+ lines) — it must stay green after every task.

## The pattern to apply

`components/StatusBar.tsx` already does this correctly. Copy it:

```tsx
// BAD — re-renders on every nodeStatuses/nodeTimings patch
const { isRunning } = useQuesterStore(selectActiveFlowRun);

// GOOD — re-renders only when isRunning flips
const isRunning = useQuesterStore((s) => selectActiveFlowRun(s).isRunning);
```

The rule: **one `useQuesterStore` call per primitive field.** Do not group fields into an object
selector — that reintroduces the identity problem. Only reach for `useShallow` when the value is
genuinely a collection.

---

## The full inventory — run this once before T1

```bash
cd apps/desktop/src/renderer
rg -n 'useQuesterStore\(selectActiveFlowRun\)' --glob '*.tsx'
```

**Expect** exactly 6 matches across 5 files. This is the complete list of what tasks T1–T6 fix:

| File | Line | Current code | Task |
|---|---|---|---|
| `components/nodes/FlowNodes.tsx` | 750 | `const runResult = useQuesterStore(selectActiveFlowRun).runResult;` | T6 |
| `components/nodes/FlowNodes.tsx` | 791 | `const runResult = useQuesterStore(selectActiveFlowRun).runResult;` | T6 |
| `components/PlaygroundSheet.tsx` | 18 | `const { isRunning } = useQuesterStore(selectActiveFlowRun);` | T2 |
| `components/Panel.tsx` | 132 | `const { runResult, runError } = useQuesterStore(selectActiveFlowRun);` | T3 |
| `components/EditorArea.tsx` | 27 | `const { isRunning } = useQuesterStore(selectActiveFlowRun);` | T1 |
| `components/AuxiliarySidebar.tsx` | 25 | destructures 5 fields | T5 |

Note the `FlowNodes` shape: reading `.runResult` *outside* the hook does not help. Zustand compares
the value the **selector** returned, which is the whole run-slot object, so its identity churn still
re-renders. The fix is always to move the field access **inside** the selector.

---

## T1 — `EditorArea`

**Change** `components/EditorArea.tsx` line 27:

```tsx
// before
const { isRunning } = useQuesterStore(selectActiveFlowRun);

// after
const isRunning = useQuesterStore((s) => selectActiveFlowRun(s).isRunning);
```

`isRunning` is used only to pass to `CanvasControls`, so nothing else changes.

**Why this matters most:** `EditorArea` is the parent of `FlowCanvas`. Every re-render here re-passes
14 props to the canvas.

---

## T2 — `PlaygroundSheet`

**Change** `components/PlaygroundSheet.tsx` line 18 — it needs only `isRunning`:

```tsx
// before
const { isRunning } = useQuesterStore(selectActiveFlowRun);

// after
const isRunning = useQuesterStore((s) => selectActiveFlowRun(s).isRunning);
```

---

## T3 — `Panel`

`components/Panel.tsx` destructures `{ runResult, runError }` from the whole run slot, so the console
and logs tabs re-render on every status tick even though neither field changed.

**Change**

```tsx
// before
const { runResult, runError } = useQuesterStore(selectActiveFlowRun);

// after
const runResult = useQuesterStore((s) => selectActiveFlowRun(s).runResult);
const runError = useQuesterStore((s) => selectActiveFlowRun(s).runError);
```

`runResult` is an object reference held in the store, so its identity is stable between runs — this is
safe.

---

## T4 — `Panel` should not scan all open tabs

Still in `components/Panel.tsx`. It subscribes to the entire `openTabs` array and `activeTabId`, then
does a manual `.find(...)` to get the active flow tab — even though `selectActiveFlowTab` already
exists and is used elsewhere.

**Change**

```tsx
// before
const openTabs = useQuesterStore((s) => s.openTabs);
const activeTabId = useQuesterStore((s) => s.activeTabId);

const activeFlowTab = openTabs.find(
	(t): t is FlowEditorTab => t.id === activeTabId && t.kind === "flow",
);

// after
const activeFlowTab = useQuesterStore(selectActiveFlowTab);
```

Add `selectActiveFlowTab` to the existing import from `@/stores/selectors.js`. Remove the now-unused
`FlowEditorTab` type import if Biome flags it.

**Careful:** `selectActiveFlowTab` returns `null` where the old code returned `undefined`. Check every
use of `activeFlowTab` in the file — the existing guards are `!activeFlowTab` and
`activeFlowTab ? … : …`, which behave identically for both, but confirm rather than assume. The
`clearHistory` callback's dependency array also references it.

---

## T5 — Split `AuxiliarySidebar` so the Inspector stops subscribing to run state

This is the highest-value task in the plan and the only one that needs real restructuring.

`components/AuxiliarySidebar.tsx` destructures **five** fields
(`runResult`, `runError`, `isRunning`, `nodeStatuses`, `nodeTimings`) from the run slot at the top of
the component — unconditionally. So when the Inspector tab is active and the Response tab is not even
mounted, every single node status tick still re-renders `NodeInspector` and its whole field tree.

**Change** — extract two sibling components in the same file so each subscribes only to what it
renders:

```tsx
function InspectorPanelBody() {
	const flowTab = useQuesterStore(selectActiveFlowTab);
	const selectedNodeId = useQuesterStore((s) => s.selectedNodeId);
	const selectedNodeIds = useQuesterStore((s) => s.selectedNodeIds);
	const handleUpdateNode = useQuesterStore((s) => s.handleUpdateNode);
	const deleteNodes = useQuesterStore((s) => s.deleteNodes);

	// …exactly the JSX that is inside the `activeTab === "inspector"` branch today…
}

function ResponsePanelBody() {
	// …the run-state subscriptions move here, unchanged…
}
```

Then `AuxiliarySidebar` keeps only the shell (width, open, `activeTab`, header, `Separator`, Save
button) and renders `{activeTab === "inspector" ? <InspectorPanelBody /> : <ResponsePanelBody />}`.

**Rules for this task**

- Move the JSX verbatim. Do not restyle, do not rename props, do not change the `ScrollArea` /
  `p-3` wrappers.
- The header's Save button needs `flowTab?.dirty` — keep that subscription in the parent shell.
- `selectedNode` is derived as `flow?.nodes.find(n => n.id === selectedNodeId)`. Both children need
  it, so derive it inside each child from that child's own `flowTab` subscription. Wrap it in
  `useMemo(() => …, [flow, selectedNodeId])` while you are there.
- Do **not** add `React.memo` to these — they subscribe to the store directly, so memo would do
  nothing.

**Verify** manually in the mock app: select a node, confirm the inspector still edits fields and
saves; switch to the Response tab, run a flow, confirm the timeline and node output still appear.

---

## T6 — On-canvas JSON and Inspect nodes

`components/nodes/FlowNodes.tsx` — `JsonFlowNode` and `InspectFlowNode` subscribe to the whole run
slot but need only their own node's output.

**Locate**

```bash
rg -n 'selectActiveFlowRun' components/nodes/FlowNodes.tsx
```

**Expect** 3 matches: the import on line 7, plus the two identical usages on lines 750 and 791.

**Change** both usages. The minimum safe edit keeps the same variable and shape:

```tsx
// before (both lines)
const runResult = useQuesterStore(selectActiveFlowRun).runResult;

// after
const runResult = useQuesterStore((s) => selectActiveFlowRun(s).runResult);
```

That alone removes the identity churn, because `runResult` is a stable reference between runs.

**Then**, if and only if the surrounding component reads `runResult` solely to index one node's
output, narrow it further to that node's output. Read the 20 lines below each usage first to confirm
the node id variable name and how `runResult` is consumed — do not assume it is called `id`. If
`runResult` is used for anything else in the component, stop at the edit above and leave it.

**Why this matters:** these nodes mount a recursive `JsonViewer`. Today every status tick re-renders
the entire JSON tree of every json/inspect node on the canvas.

---

## T7 — Memoize the `PrimarySidebar` filters

`components/PrimarySidebar.tsx` recomputes five `.filter()` passes on every render
(`filteredFlows`, `filteredForms`, `filteredEnvs`, `filteredSecrets`, `filteredRequests`) while
`filteredRunTree` and `requestsByCollection` are already memoized. The component makes 40+ separate
store subscriptions, so it re-renders often.

**Change** wrap each of the five in `useMemo` with the correct dependencies:

```tsx
const filteredFlows = useMemo(() => {
	const q = search.trim().toLowerCase();
	if (!q) return flows;
	return flows.filter(
		(f) => f.name.toLowerCase().includes(q) || f.id.toLowerCase().includes(q),
	);
}, [flows, search]);
```

Note the small behaviour-preserving tidy: hoist `const q = search.trim().toLowerCase()` out of the
predicate (it is currently recomputed per item) and return the original array when the query is
empty. `useMemo` is already imported.

Dependencies: `filteredFlows` → `[flows, search]`; `filteredForms` → `[forms, search]`;
`filteredEnvs` → `[envs, search]`; `filteredSecrets` → `[secretFiles, search]`;
`filteredRequests` → `[requests, search]`.

**Do not** attempt to consolidate the 40+ `useQuesterStore` calls in this task — that is a bigger
refactor and belongs in its own PR.

---

## T8 — Stabilise the `ReactFlow` config props

`components/FlowCanvas.tsx` recreates three config values on every render, and leaves four handlers
unmemoized. React Flow treats changed prop identity as a config update.

**Change**

1. Hoist to module scope, above the component:
   ```tsx
   const DELETE_KEYS = ["Backspace", "Delete"] as const;
   const DEFAULT_EDGE_OPTIONS = { interactionWidth: 12, reconnectable: true } as const;
   const PRO_OPTIONS = { hideAttribution: true } as const;
   ```
   Use the **exact** `interactionWidth` value already in the file — read it first, do not assume 12.
2. Use them in the JSX: `deleteKeyCode={typingInUi ? null : DELETE_KEYS}`,
   `defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}`, `proOptions={PRO_OPTIONS}`.
3. Wrap `onEdgeContextMenu`, `onNodeContextMenu`, `onPaneContextMenu`, and `onMoveEnd` in
   `useCallback` with correct dependency arrays.

**Careful:** `onMoveEnd` calls `onZoomChange`. Make sure that goes in the dependency array or zoom
reporting will go stale — the status bar zoom percentage is the visible symptom, and the smoke test
does not cover it. Verify manually that the status bar zoom still updates when you zoom the canvas.

---

## T9 — Guard the selector contract with a test

**Change** `src/renderer/stores/quester-store.test.ts` (or a new
`src/renderer/stores/selectors.test.ts` if that file is already large) — add a test asserting that
narrowing works, i.e. that a `nodeStatuses` patch does not change the narrowed value:

```ts
// after dispatching a node status update for a running flow
const before = selectActiveFlowRun(useQuesterStore.getState()).isRunning;
// …apply a node status event…
const after = selectActiveFlowRun(useQuesterStore.getState()).isRunning;
expect(after).toBe(before);
```

Follow whatever helpers the existing tests use to seed a running flow — do not invent new fixtures.

---

## Done when

- `rg -n 'useQuesterStore\(selectActiveFlowRun\)' --glob '*.tsx'` returns 0 matches.
- No component destructures more than one field from a single store selector call.
- `quester-store.test.ts` is green.
- Manual check: start a run on the sample flow with the Inspector tab open and a node selected — the
  inspector fields do not flicker or lose caret position while node statuses tick through.
- Manual check: canvas zoom still updates the status bar percentage.

## After complete — ask user to confirm

- [ ] **X** — Run a flow with the Inspector tab open and a text field focused: the caret stays put and typing is not interrupted while node statuses tick.
- [ ] **Y** — Switch to the Response tab and run again: timeline, node outputs, and flow output all still populate correctly.
- [ ] **Z** — Canvas pan/zoom, node delete via Backspace/Delete, edge reconnect, and the status bar zoom percentage all behave exactly as before.

## Skills

`quester-desktop`, `quester-studio`

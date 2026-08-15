# Plan 18 — Desktop UI: focus visibility + control state

**Priority:** 18
**Status:** not started
**Read first:** [UI-REVIEW-EXECUTION.md](./UI-REVIEW-EXECUTION.md)
**Branch:** `feat/ui-focus-states`
**Changeset:** yes (patch, `@quester-studio/desktop`)

## Goal

Make every interactive control in the renderer visibly focusable and expose its selected/pressed
state to assistive tech. Today there are **zero** `focus-visible:` declarations outside
`components/ui/**`, and four controls are literally invisible while focused.

## Out of scope

Form field labelling (plan 19). Tokens and shared primitives (plan 20). Selector perf (plan 21).

## Execution contract (short form)

One task per turn. Run `Locate` first and match the `Expect` count or STOP. Verify with
`bun run lint`, `bun run --filter @quester-studio/desktop typecheck`, and
`bun run --filter @quester-studio/desktop test` before committing. Change nothing the task did not
name. Respect the guardrail table in the execution contract.

---

## T1 — Keyboard focus is invisible on hover-revealed controls

Four controls use `opacity-0 group-hover:opacity-100`. Because `opacity: 0` also hides the focus
outline, a keyboard user tabbing onto them sees nothing at all.

**Locate**

```bash
cd apps/desktop/src/renderer
rg -n 'opacity-0[^"]*group-hover:opacity-100' --glob '*.tsx'
```

**Expect** 4 matches: `components/TopBar.tsx` (1), `components/PrimarySidebar.tsx` (3).

**Change** — three are `<Button>`/button elements, so they take `focus-visible:`. The fourth is a
wrapper `div` around two buttons, so it takes `focus-within:`.

`components/TopBar.tsx` — the tab close button:

```
opacity-0 hover:bg-muted group-hover:opacity-100
```
becomes
```
opacity-0 hover:bg-muted group-hover:opacity-100 focus-visible:opacity-100
```

`components/PrimarySidebar.tsx` — the two run-tree delete buttons (both occurrences):

```
className="mr-1 shrink-0 opacity-0 group-hover:opacity-100"
```
becomes
```
className="mr-1 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
```

`components/PrimarySidebar.tsx` — the rename/delete wrapper `div`:

```
className="flex shrink-0 opacity-0 group-hover:opacity-100"
```
becomes
```
className="flex shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100"
```

**Verify** additionally that the count is now 4 with the new classes:

```bash
rg -n 'focus-visible:opacity-100|focus-within:opacity-100' --glob '*.tsx' | wc -l   # expect 4
```

---

## T2 — Add a shared focus-ring class constant

Every custom (non-shadcn) button in the app relies on the browser's default focus ring, which looks
different from the `focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`
treatment that `components/ui/button.tsx` uses everywhere else.

**Create** `apps/desktop/src/renderer/lib/focusRing.ts`:

```ts
/**
 * Focus ring for bespoke (non-shadcn) controls — canvas overlays, activity rails,
 * tab strips, resize gutters. Mirrors the `focus-visible:` treatment in
 * `components/ui/button.tsx` so keyboard focus looks identical app-wide.
 */
export const focusRing =
	"outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";
```

**Do not** apply it anywhere yet. T3 and T4 consume it.

**Verify** typecheck passes (the file is unused for now, which is fine — it is exported).

---

## T3 — Deduplicate the activity rail button and give it a focus ring

`ActivityBar.tsx` and `AuxiliaryActivityBar.tsx` each define a byte-identical `buttonClass(active)`
function.

**Locate**

```bash
cd apps/desktop/src/renderer
rg -n 'function buttonClass' --glob '*.tsx'
```

**Expect** 2 matches: `components/AuxiliaryActivityBar.tsx`, `components/ActivityBar.tsx`.

**Create** `apps/desktop/src/renderer/lib/railButton.ts`:

```ts
import { focusRing } from "@/lib/focusRing.js";
import { cn } from "@/lib/utils.js";

/** Shared class for the 48px icon rails on either side of the editor. */
export function railButtonClass(active: boolean): string {
	return cn(
		"inline-flex size-9 items-center justify-center rounded-md border border-transparent text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
		focusRing,
		active && "bg-sidebar-accent text-sidebar-accent-foreground",
	);
}
```

**Change** in both `components/ActivityBar.tsx` and `components/AuxiliaryActivityBar.tsx`:

1. Delete the local `function buttonClass(active: boolean): string { ... }` block at the bottom of
   the file.
2. Add the import `import { railButtonClass } from "@/lib/railButton.js";`
3. Replace every `cn(buttonClass(X))` with `railButtonClass(X)`.
4. If `cn` is now unused in the file, remove its import (Biome will flag it if you miss this).

**Do not** change any `aria-label` string — `AppShell.smoke.test.tsx` looks up `Flows` and
`Preferences` by label.

**Verify**

```bash
rg -n 'buttonClass' --glob '*.tsx'     # expect only railButtonClass usages
```

---

## T4 — Give the remaining bespoke buttons a focus ring

**Locate**

```bash
cd apps/desktop/src/renderer
rg -n '<button' --glob '*.tsx' -g '!components/ui/**' -g '!*.test.tsx'
```

**Expect** 13 matches across 8 files.

**Change** — add `focusRing` to these **7** call sites only:

| File | Which button |
|---|---|
| `components/TopBar.tsx` | the workspace chip trigger, and the tab activate button |
| `components/SettingsPageLayout.tsx` | the settings category nav button |
| `components/Panel.tsx` | the collapsed "Panel" expand strip, and the collapse chevron |
| `components/JsonViewer.tsx` | the tree expand/collapse toggle |
| `components/PathPickerDialog.tsx` | the path list row |
| `components/WorkspaceWelcome.tsx` | the recent-workspace row |

**Skip** these 4, they are intentional and already handled: `components/ResizeGutter.tsx` and
`components/Panel.tsx` resize grips (they have `aria-label="Resize panel"` and a hover/active
background), and `components/TopBar.tsx` / `components/PrimarySidebar.tsx` tab and file rows already
covered above or in T1.

**How** — where the button already uses `cn(...)`, add `focusRing` as the first argument. Where it
uses a plain string, wrap it:

```tsx
// before
className="w-full truncate rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-muted"

// after
className={cn(
	focusRing,
	"w-full truncate rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-muted",
)}
```

Add `import { focusRing } from "@/lib/focusRing.js";` and, if not already present,
`import { cn } from "@/lib/utils.js";`.

**Do not** convert any of these to the shadcn `Button` component in this task — that changes DOM
structure and risks the smoke test. Class-only changes here.

---

## T5 — Expose the Preferences rail button's active state

`components/ActivityBar.tsx` renders the Preferences button with a hardcoded inactive state, so it
never highlights even when the settings view is open, unlike every other item in the same rail.

**Change** the Preferences `TooltipTrigger`:

- `className={railButtonClass(false)}` becomes
  `className={railButtonClass(sidebarOpen && activeView === "settings")}`
- add `aria-pressed={sidebarOpen && activeView === "settings"}`

`sidebarOpen` and `activeView` are already read at the top of the component. Keep
`aria-label="Preferences"` exactly as-is.

---

## T6 — Make the editor tab strip a real tab list

`components/TopBar.tsx` renders a visual tab strip with no tab semantics — active state is colour
only.

**Change**

1. On the scroll container `div` (the one with `ref={scrollRef}` and `onWheel={onWheel}`), add
   `role="tablist"` and `aria-label="Open editors"`.
2. On the per-tab activate `<button>` (the one with `onClick={() => { setActiveTabId(tab.id); ... }}`),
   add `role="tab"` and `aria-selected={active}`.
3. Replace the bare dirty dot with an accessible one. The dot is:
   ```tsx
   <span className="size-1.5 shrink-0 rounded-full bg-primary" />
   ```
   becomes
   ```tsx
   <span
   	className="size-1.5 shrink-0 rounded-full bg-primary"
   	role="img"
   	aria-label="Unsaved changes"
   />
   ```

**Do not** add `role="tabpanel"` anywhere or wire `aria-controls` — the editor area is not a
sibling panel and faking the relationship would be worse than omitting it.

**Do not** change the `ContextMenuTrigger` structure or the `draggable` behaviour.

---

## T7 — Same treatment for the sidebar list rows

`components/PrimarySidebar.tsx` conveys selection with `bg-sidebar-accent` only.

**Change**

1. In `FileListItem`, on the row `<button>`, add `aria-current={selected ? "true" : undefined}`.
2. In `RequestListItem`, on the row `<button>`, add `aria-current={selected ? "true" : undefined}`.
3. Both components render the same bare dirty dot as T6 — apply the same
   `role="img" aria-label="Unsaved changes"` treatment. There are 2 occurrences in this file.

**Locate**

```bash
rg -n 'size-1.5 shrink-0 rounded-full bg-primary' components/PrimarySidebar.tsx   # expect 2
```

---

## T8 — Announce async run status

Status text changes silently today, so screen reader users get no signal that a run started or
finished.

**Change** `components/StatusBar.tsx` — on the **left-hand** `div` (the one containing the workspace
name, flow name, env, activity label, and indexing label), add:

```tsx
role="status"
aria-live="polite"
```

**Do not** put the live region on the `<footer>` itself and do **not** add it to the right-hand
counters `div` — the node/edge/tab/zoom counters change constantly and would spam the announcement
queue.

**Do not** change the counter text. `AppShell.smoke.test.tsx` matches `/2 nodes · 1 edges/`
verbatim.

Then in `components/response/RunStatusPanel.tsx`, find the run outcome badge row (`Running…`,
`Success`, `Failed`) and add `role="status" aria-live="polite"` to its immediate wrapper. And in
`components/PlaygroundSheet.tsx`, add `role="alert"` to the JSON validation error paragraph (the one
with `text-destructive`).

---

## T9 — Dialog titles and descriptions

Base UI warns when a dialog mounts without a title, and screen readers announce nothing useful when
the description is missing.

**Change**

1. `components/NodeHelpDialog.tsx` — `DialogTitle` and `DialogDescription` are currently inside an
   `open ? (…) : null` branch, so the content can mount without a title. Move `DialogTitle` and
   `DialogDescription` **out** of the conditional so they always render. Keep the heavy body content
   inside the conditional.
2. `components/FlowSettingsDialog.tsx` — has a `DialogTitle` but no description. Add a
   `DialogDescription` with the text `Name, description, and HTTP defaults for this flow.`
3. `components/PlaygroundSheet.tsx` — has a `SheetTitle` but no description. Add a
   `SheetDescription` with the text `Run a single node against ad-hoc input.`
4. `components/ConfirmDialog.tsx` and `components/NamePromptDialog.tsx` render `DialogDescription`
   only when a description string is present. Leave these as-is — the dialogs are trivial and always
   have a title. **No change.**

**Verify** the desktop test suite still passes; several dialogs are mounted by the smoke test.

---

## T10 — Gate spinner animation on reduced motion

`styles.css` already gates the two custom node keyframes behind
`@media (prefers-reduced-motion: reduce)`, but Tailwind's `animate-spin` is not gated.

**Locate**

```bash
cd apps/desktop/src/renderer
rg -n 'animate-spin' --glob '*.tsx'
```

**Expect** 4 matches: `components/StatusBar.tsx`, `components/BaseFlowNode.tsx`,
`components/response/RunStatusPanel.tsx`, `components/ui/sonner.tsx`.

**Change** append ` motion-reduce:animate-none` to each `animate-spin` class string.

**Do not** touch the overlay enter/exit animations in `ui/dialog.tsx`, `ui/sheet.tsx`,
`ui/tooltip.tsx`, `ui/dropdown-menu.tsx`, `ui/context-menu.tsx`, or `ui/select.tsx` — those are
upstream shadcn files and should be handled by a preset update, not hand edits.

---

## Done when

- `rg -c 'focus-visible' --glob '*.tsx' -g '!components/ui/**'` returns a non-zero count in at least
  8 files (it is 0 today).
- Tabbing from the canvas through the tab strip, the activity rails, the sidebar list, and the
  sidebar row actions shows a visible ring on **every** stop, including the tab close button and the
  rename/delete buttons.
- `bun run lint`, desktop `typecheck`, and desktop `test` are all green.
- No `aria-label`, visible label, or counter string from the guardrail table changed.

## After complete — ask user to confirm

- [ ] **X** — Tab through the whole shell with the keyboard only: every stop shows a visible focus ring, and the tab close / sidebar rename / sidebar delete buttons become visible when focused.
- [ ] **Y** — With a screen reader or the browser accessibility tree, the editor tabs report as tabs with a selected state, and starting a run announces "Running…".
- [ ] **Z** — Enable OS "reduce motion": spinners stop animating and nothing else visibly breaks.

## Skills

`quester-desktop`, `shadcn-ui`

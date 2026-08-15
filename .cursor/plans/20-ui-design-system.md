# Plan 20 — Desktop UI: type scale, tokens, shared primitives, alignment

**Priority:** 20
**Status:** not started
**Read first:** [UI-REVIEW-EXECUTION.md](./UI-REVIEW-EXECUTION.md)
**Depends on:** plans 18 and 19 landed
**Branch:** `feat/ui-design-system`
**Changeset:** yes (patch, `@quester-studio/desktop`)

## Goal

Close the consistency gaps found in review: 92 un-tokenized arbitrary font sizes, the last 3
hardcoded palette colours, 5 different panel-header heights, 3 competing "unsaved" indicators, and
several verbatim-duplicated markup blocks.

## Out of scope

No new features. No changes to what any control does. The only intentional *visual* changes in this
whole plan are the 4px header alignment in T5 and the unified dirty indicator in T7 — everything else
must render pixel-identically.

## Execution contract (short form)

One task per turn. Run `Locate` first and match the `Expect` count or STOP. Verify with
`bun run lint`, `bun run --filter @quester-studio/desktop typecheck`, and
`bun run --filter @quester-studio/desktop test` before committing.

---

## T1 — Add type-scale tokens

There are 46 `text-[10px]`, 42 `text-[11px]`, and 4 `text-[9px]` utilities across 30+ files.
`NodeInspector.tsx` alone uses `text-[10px]` 16 times. Nothing stops the next component from picking
`text-[10.5px]`.

**Change** `apps/desktop/src/renderer/styles.css` — add a new block immediately **after** the
existing `@theme inline { … }` block closes and **before** `@layer base {`:

```css
@theme {
	--text-2xs: 0.6875rem; /* 11px — dense metadata, hints, chips */
	--text-3xs: 0.625rem; /* 10px — uppercase column heads, node badges */
}
```

**Why this is a no-op visually — verified, not assumed.** A Tailwind v4 font-size theme key only
emits a `line-height` if you also define `--text-2xs--line-height`. We deliberately do not. Building
the app with the block above and inspecting the emitted CSS gives:

```
.text-[11px]  ->  font-size:11px
.text-2xs     ->  font-size:var(--text-2xs)      /* 0.6875rem */
.text-[10px]  ->  font-size:10px
.text-3xs     ->  font-size:var(--text-3xs)      /* 0.625rem  */
.text-xs      ->  font-size:var(--text-xs);line-height:var(--tw-leading,var(--text-xs--line-height))
```

Both the arbitrary values and the new tokens emit `font-size` only, so surrounding
`leading-relaxed` / `leading-none` classes keep working untouched. Contrast `.text-xs`, which *does*
carry a line-height because Tailwind ships `--text-xs--line-height` — that is exactly the trap we are
avoiding.

**One honest caveat:** `0.6875rem` equals 11px only at a 16px root font size, which is the default
and what this app runs at. Using `rem` (rather than a hardcoded `11px`) is deliberate and matches how
Tailwind's own scale is defined, so the dense UI scales if a user ever bumps their base font size. If
you would rather guarantee byte-identical pixels forever, use `--text-2xs: 11px` and
`--text-3xs: 10px` instead — both are acceptable; pick one and do not mix.

**Do not** define line-height variants. **Do not** add a `--text-4xs`; the four `text-[9px]` uses are
canvas port labels and stay as-is.

---

## T2 — Migrate the arbitrary font sizes to the tokens

**Locate**

```bash
cd apps/desktop/src/renderer
rg -o 'text-\[11px\]' --glob '*.tsx' | wc -l   # expect 42
rg -o 'text-\[10px\]' --glob '*.tsx' | wc -l   # expect 46
```

**Change** — a plain textual replacement across `src/renderer/**/*.tsx`:

- `text-[11px]` becomes `text-2xs`
- `text-[10px]` becomes `text-3xs`

Do it file by file so the diff stays reviewable. Do **not** touch `text-[9px]`,
`text-[0.625rem]`, or any `text-[var(--…)]`.

**Verify**

```bash
rg -o 'text-\[1[01]px\]' --glob '*.tsx' | wc -l   # expect 0
rg -o 'text-2xs' --glob '*.tsx' | wc -l           # expect 42
rg -o 'text-3xs' --glob '*.tsx' | wc -l           # expect 46
```

Then start the mock app (`bun run dev:web:mock`) and confirm the status bar, node cards, and
inspector hints look unchanged. If anything shifted, the token block in T1 is wrong — stop and
report.

---

## T3 — Add a `warning` colour token and retire the amber classes

`text-amber-600 dark:text-amber-400` is the only hardcoded palette colour left in the renderer, and
it violates the repo's shadcn/Tailwind rule.

**Locate**

```bash
cd apps/desktop/src/renderer
rg -n 'amber' --glob '*.tsx'
```

**Expect** 3 matches: `components/FormEditor.tsx` (2), `components/StatusBar.tsx` (1).

**Change** `styles.css`:

1. In the `@theme inline` block, next to `--color-destructive`, add:
   ```css
   --color-warning: var(--warning);
   ```
2. In `:root`, next to `--destructive`, add (this is Tailwind's `amber-600`, so light mode is
   unchanged):
   ```css
   --warning: oklch(0.666 0.179 58.318);
   ```
3. In `.dark`, next to `--destructive`, add (Tailwind's `amber-400`, so dark mode is unchanged):
   ```css
   --warning: oklch(0.828 0.189 84.429);
   ```

**Then** replace all 3 usages of `text-amber-600 dark:text-amber-400` with `text-warning`.

**Verify**

```bash
rg -n 'amber' --glob '*.tsx' | wc -l   # expect 0
rg -n 'text-warning' --glob '*.tsx' | wc -l   # expect 3
```

---

## T4 — Extract the repeated markup

Five patterns are duplicated verbatim enough to be worth a component. Create them all in one new
file, then migrate call sites.

**Create** `apps/desktop/src/renderer/components/Typography.tsx`:

```tsx
import { cn } from "@/lib/utils.js";
import type { ReactNode } from "react";

/** Inline `code` chip for template tokens and file names in prose. */
export function CodeChip({ children }: { children: ReactNode }) {
	return (
		<code className="rounded bg-muted px-1 py-0.5 font-mono text-2xs">
			{children}
		</code>
	);
}

/** Helper text under a field or section. */
export function FieldHint({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<p className={cn("text-2xs leading-relaxed text-muted-foreground", className)}>
			{children}
		</p>
	);
}

/** Small uppercase section heading used in panels and response views. */
export function SectionHeading({ children }: { children: ReactNode }) {
	return (
		<h3 className="text-xs font-medium text-muted-foreground">{children}</h3>
	);
}

/** Empty / zero-result state for sidebar lists and panels. */
export function EmptyState({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<p className={cn("px-2 py-4 text-xs text-muted-foreground", className)}>
			{children}
		</p>
	);
}
```

**Then migrate, one component per turn**, verifying between each:

Counts below are exact as of this plan being written, and assume T2 already renamed
`text-[11px]` to `text-2xs`. Verify each with `rg -o '<pattern>' --glob '*.tsx' | wc -l` before you
start, and STOP if a number differs.

| Component | Pattern | Migrate | Files (occurrences) |
|---|---|---|---|
| `CodeChip` | `rounded bg-muted px-1 py-0.5 font-mono text-2xs` | 11 of 11 | `EditorArea` (10), `FormEditor` (1) |
| `FieldHint` | `text-2xs leading-relaxed text-muted-foreground` | 5 of 6 | `NodeInspector` (2), `JmesPathField` (1), `FormEditor` (1), `ForeachItemsField` (1) — **skip** `BaseFlowNode` (1) |
| `SectionHeading` | `<h3 className="text-xs font-medium text-muted-foreground">` | 22 of 22 | `response/NodeResponsePanels` (16), `NodeHelpDialog` (4), `response/RunStatusPanel` (1), `ResponseView` (1) |
| `EmptyState` | `px-2 py-4 text-xs text-muted-foreground` | 8 of 8 | `PrimarySidebar` (8) |

Start with `CodeChip` in `EditorArea.tsx` — it is the densest and most obviously mechanical (10
occurrences in two adjacent description blocks).

**Two deliberate exclusions, do not "fix" them:**

- `BaseFlowNode.tsx` keeps its own hint class. It is a React Flow canvas node, and the canvas is the
  one place the repo's shadcn rule allows bespoke markup. Pulling an app-chrome component into it
  couples the canvas to panel styling.
- `RunLogViewerPage.tsx` has three `<h2>` elements with the *same* classes as the 22 `<h3>`s. Leave
  them as `<h2>`. That file has a real `<h1>` (the log title), so its `<h2>`s are correct hierarchy,
  whereas the response-panel `<h3>`s have no `<h2>` ancestor. Converting them to `SectionHeading`
  would demote a correct heading level. Fixing the response panels' heading levels properly is a
  separate change needing design input — out of scope here.

**Do not** change the rendered element type. `CodeChip` must stay a `<code>`, `SectionHeading` must
stay an `<h3>`, `EmptyState` and `FieldHint` must stay `<p>`. Changing the tag would alter the
accessibility tree and could break tests that query by role.

---

## T5 — Align the two side-panel header heights

Measured in the browser: the right panel header is exactly 36px (`h-9`, `top: 36`, `bottom: 72`). The
left sidebar header is 32px because it is sized implicitly by `px-3 py-2 text-xs` (16px line box +
16px padding). Both panels start at the same y, so their titles sit on different baselines and the
divider rules beneath them are 4px out of alignment.

**Change** `components/PrimarySidebar.tsx` — the view-title header:

```tsx
// before
<div className="shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70">

// after
<div className="flex h-9 shrink-0 items-center px-3 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70">
```

This matches `components/AuxiliarySidebar.tsx` exactly and puts both on the same 36px rhythm as the
`TopBar`.

**Verify** in the mock app: the divider under "WORKSPACE" and the divider under "INSPECTOR" are on
the same pixel row. This is the one place in this plan where the pixels are *supposed* to move.

**Note for a follow-up (do not do it here):** `RequestEditor` uses `h-10`,
`ResponseViewerPage` / `RunLogViewerPage` use `py-2.5`, and `KeyValueEditor` /
`SettingsPageLayout` use `py-3` for the same structural role. Unifying those five is a larger visual
change and needs design sign-off — leave a `TODO(#issue)` only if an issue exists, otherwise leave
them alone.

---

## T6 — Make the canvas control card alignment self-maintaining

`components/CanvasControls.tsx` puts `mt-3` on the Save / Run / Stop buttons to line them up with the
`Select` that sits under the "Environment" label. It aligns correctly today *only* because the
label's line box plus `gap-0.5` happens to equal 12px. Any change to that label breaks it silently.

**Locate**

```bash
rg -n 'mt-3 h-7' components/CanvasControls.tsx    # expect 3
```

**Change**

1. On the inner card `div`, change `items-center` to `items-end`.
2. Remove `mt-3` from all three buttons (`className="mt-3 h-7"` becomes `className="h-7"`).

**Verify** the card renders identically to before — the buttons' bottom edges still line up with the
`Select`'s bottom edge. Keep the visible text `Environment` and the Run button's name `Run`
unchanged; the smoke test asserts both.

---

## T7 — One dirty indicator, not three

There are three visual languages for unsaved state: a green `bg-primary` dot on tabs and sidebar
rows, amber text in the status bar, and an unused muted-grey `DirtyBadge`.

**Change**

1. Delete the unused `DirtyBadge` export at the bottom of `components/TopBar.tsx`. Confirm it is dead
   first:
   ```bash
   rg -n 'DirtyBadge' --glob '*.tsx' --glob '*.ts'   # expect 1 — the definition only
   ```
2. In `components/StatusBar.tsx`, keep the word `unsaved` but change it from a bare coloured span to
   the same semantic as everywhere else — a dot plus text, using the warning token from T3:
   ```tsx
   <span className="inline-flex items-center gap-1 text-warning">
   	<span className="size-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
   	unsaved
   </span>
   ```
3. Leave the tab and sidebar dots as `bg-primary`. They mean "this file is dirty"; the status bar dot
   means "something in the workspace is dirty". Same shape, different colour, consistent language.

**Do not** change the `{nodeCount} nodes · {edgeCount} edges` string or its pluralisation while you
are in this file.

---

## T8 — Replace the pipe-character dividers in the status bar

`components/StatusBar.tsx` uses `<span className="text-border">|</span>` as a divider. Screen readers
read the pipe aloud.

**Locate**

```bash
rg -n 'text-border' components/StatusBar.tsx
```

**Expect** 7 matches, at lines 64, 68, 72, 90, 102, 106, and 110. All 7 are the same
`<span className="text-border">|</span>` divider.

**Change** each to a decorative separator that is hidden from assistive tech:

```tsx
<span className="text-border" aria-hidden>
	|
</span>
```

**Do not** swap in the shadcn `Separator` component here — a vertical `Separator` in a 24px-tall
flex row needs explicit sizing and would change the visual spacing. `aria-hidden` fixes the actual
defect with zero visual change.

---

## T9 — Unify the three key/value grid editors

`HeadersEditor`, `KeyValueEditor`, and `TemplateMapEditor` all render the same
`grid-cols-[1fr_1fr_auto]` two-column-plus-action grid, but they disagree on gutter (`gap-1.5 px-0.5`
vs `gap-2 px-1`) and row alignment (`items-start` vs `items-center`). The inconsistency is visible
when switching between the Headers tab and an env file.

**Locate**

```bash
rg -n 'grid-cols-\[1fr_1fr_auto\]' --glob '*.tsx'
```

**Expect** 6 matches across 3 files (a header row and a body row in each).

**Change** — standardise on the `HeadersEditor` values, which are the tightest and most common:
`gap-1.5 px-0.5` for the header row, `items-start gap-1.5` for body rows. Update `KeyValueEditor`
(`gap-2 px-1` and `items-center gap-2`) and `TemplateMapEditor` to match.

**Then** extract the shared header row into `components/Typography.tsx` (or a new
`components/KeyValueGrid.tsx` if you prefer — either is fine, pick one and be consistent):

```tsx
export function KeyValueGridHead({
	keyLabel,
	valueLabel,
}: {
	keyLabel: string;
	valueLabel: string;
}) {
	return (
		<div className="grid grid-cols-[1fr_1fr_auto] gap-1.5 px-0.5 text-3xs font-medium tracking-wide text-muted-foreground uppercase">
			<span>{keyLabel}</span>
			<span>{valueLabel}</span>
			<span className="w-7" />
		</div>
	);
}
```

Call it with `keyLabel="Header"` / `valueLabel="Value"` in `HeadersEditor`, and `"Key"` / `"Value"` in
`KeyValueEditor`.

**Careful:** `KeyValueEditor` rows currently use `items-center` and its inputs are plain `Input`s
(one line tall), whereas `HeadersEditor` rows use `items-start` because `TemplateField` can grow.
Switching `KeyValueEditor` to `items-start` is the intended change, but eyeball the env editor
afterwards to confirm the delete button still lines up with the inputs. If it looks wrong, keep
`items-center` in `KeyValueEditor` and note it in the PR.

---

## T10 — Move `clamp` out of a component file

`components/ResizeGutter.tsx` exports a `clamp` helper that `RequestEditor.tsx` imports. Utilities
should not live in component modules.

**Change**

1. Add `clamp` to `apps/desktop/src/renderer/lib/utils.ts` (or create `lib/math.ts` if you prefer a
   dedicated module — either is acceptable):
   ```ts
   export function clamp(value: number, min: number, max: number): number {
   	return Math.min(max, Math.max(min, value));
   }
   ```
2. Delete the `clamp` function and its `export { clamp }` from `ResizeGutter.tsx`.
3. Update the import in `RequestEditor.tsx` — it currently does
   `import { ResizeGutter, clamp } from "./ResizeGutter.js";`, which becomes two imports.

**Verify**

```bash
rg -n 'clamp' --glob '*.ts' --glob '*.tsx'   # no import should point at ResizeGutter
```

---

## Done when

- `rg -o 'text-\[1[01]px\]' --glob '*.tsx' | wc -l` returns 0.
- `rg -n 'amber' --glob '*.tsx' | wc -l` returns 0.
- The "WORKSPACE" and "INSPECTOR" divider rules sit on the same pixel row.
- `CodeChip`, `FieldHint`, `SectionHeading`, and `EmptyState` are used instead of the duplicated class
  strings at the call-site counts listed in T4.
- `bun run lint`, desktop `typecheck`, and desktop `test` green.
- Apart from T5 (header alignment) and T7 (status bar dot), before/after screenshots match.

## After complete — ask user to confirm

- [ ] **X** — Left sidebar and right inspector headers line up; their divider rules are on the same row in both light and dark themes.
- [ ] **Y** — Status bar "unsaved", the form editor warnings, and the node/edge counters all look right in both themes; nothing turned grey or invisible.
- [ ] **Z** — Headers tab, env file editor, and template map editor rows all look consistent, and add/remove row still works in each.

## Skills

`quester-desktop`, `shadcn-ui`

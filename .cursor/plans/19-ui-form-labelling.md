# Plan 19 — Desktop UI: associate every label with its control

**Priority:** 19
**Status:** not started
**Read first:** [UI-REVIEW-EXECUTION.md](./UI-REVIEW-EXECUTION.md)
**Depends on:** plan 18 landed
**Branch:** `fix/ui-form-labelling`
**Changeset:** no (internal accessibility plumbing, no visible change)

## Goal

Every visible field label in the renderer is currently a floating `<Label>` or `<span>` with no
`htmlFor`, so no control in the node inspector, request editor, or form-await dialog has an
accessible name. This plan wires them up. **Nothing changes visually.**

This plan is deliberately repetitive and low-risk. It is the best candidate for a cheap model.

## Out of scope

Do not restyle anything. Do not replace any control with a different component. Do not add new
fields. Labels keep their exact visible text.

## Execution contract (short form)

One task per turn. Run `Locate` first and match the `Expect` count or STOP. Verify with
`bun run lint`, `bun run --filter @quester-studio/desktop typecheck`, and
`bun run --filter @quester-studio/desktop test` before committing.

## Naming convention — use this everywhere in this plan

IDs are kebab-case, prefixed by the surface, suffixed by the data key:

```
inspector-<nodeType>-<field>     e.g. inspector-http-url, inspector-template-mode
request-<field>                  e.g. request-method, request-url, request-env
form-await-<inputId>             e.g. form-await-username
panel-<field>                    e.g. panel-console-filter, panel-log-level
sidebar-<view>-search            e.g. sidebar-flows-search
```

Where a component renders a list of rows, append the row's stable id, never the array index.

---

## T1 — Teach `InspectorField` to link its label

`components/NodeInspector.tsx` defines `InspectorField` near the bottom of the file. It renders
`<Label className="text-xs text-muted-foreground">{label}</Label>` with **no** `htmlFor`, and it
backs all 36 inspector fields.

**Change** the component signature and the `<Label>` only:

```tsx
function InspectorField({
	label,
	htmlFor,
	hint,
	action,
	error,
	children,
}: {
	label: string;
	/** Id of the control this label names. Omit only for composite fields. */
	htmlFor?: string;
	hint?: ReactNode;
	action?: ReactNode;
	error?: string;
	children: ReactNode;
}) {
```

and

```tsx
<Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
	{label}
</Label>
```

Leave the rest of the component byte-identical: same wrapper classes, same hint paragraph, same
error paragraph, same order.

**Verify** typecheck passes. `htmlFor` is optional, so all 36 existing call sites still compile
unchanged. Commit here — this is a safe standalone step.

---

## T2 — Pass `htmlFor` + `id` for every simple inspector field

**Locate**

```bash
cd apps/desktop/src/renderer
rg -c '<InspectorField' components/NodeInspector.tsx
```

**Expect** 36.

**Change** — work top-to-bottom through the file. For each `<InspectorField>` whose child is a
**single** `Input`, `Select`, `TemplateField`, `CodeEditor`, or `JsonDraftField`:

1. Add `htmlFor="<id>"` to the `InspectorField`, using the naming convention above.
2. Add the matching `id="<id>"` to the child control.

For `Select`, the id goes on `SelectTrigger`, not on `Select`:

```tsx
<InspectorField label="Method" htmlFor="inspector-http-method">
	<Select value={...} onValueChange={...}>
		<SelectTrigger id="inspector-http-method" className="w-full">
			<SelectValue />
		</SelectTrigger>
		...
	</Select>
</InspectorField>
```

`TemplateField`, `JsonDraftField`, and `CodeEditor` all already accept an `id` prop — check their
props before assuming, but no signature changes should be needed.

**Skip** — leave `htmlFor` off these, they wrap multiple controls and a single label cannot name
them all. They are handled in T3/T4 instead:

- the `Headers` field (wraps `HeadersEditor`)
- the `Checks` field (wraps `AssertChecksEditor`)
- any field wrapping `SwitchCasesEditor`, `ForeachItemsField`, `TemplateMapEditor`,
  `JmesPathMapEditor`, or `KeyValueEditor`

**Verify** every `htmlFor` has exactly one matching `id` in the same file:

```bash
rg -o 'htmlFor="[^"]+"' components/NodeInspector.tsx | sort > /tmp/for.txt
rg -o 'id="inspector-[^"]+"' components/NodeInspector.tsx | sort > /tmp/id.txt
wc -l /tmp/for.txt /tmp/id.txt      # the two counts must match
```

If the counts differ, you missed an `id` or added a stray `htmlFor`. Fix before committing.

---

## T3 — Name the composite editors with a group label

The multi-control editors cannot use `htmlFor`. Give each a group role and label instead.

**Change** — in each of these components, add `role="group"` and `aria-label` to the outermost
wrapper element:

| File | `aria-label` |
|---|---|
| `components/HeadersEditor.tsx` | `Headers` |
| `components/AssertChecksEditor.tsx` | `Assertion checks` |
| `components/SwitchCasesEditor.tsx` | `Switch cases` |
| `components/TemplateMapEditor.tsx` | `Template map` |
| `components/JmesPathMapEditor.tsx` | `JMESPath map` |

For `HeadersEditor` the outermost element is the `<Tabs>` — put the attributes on that.

**Then** give the per-row inputs accessible names. These editors currently rely on a `<span>` column
header plus a `placeholder`. Add `aria-label` to each row control, including the row's key so it is
unambiguous:

```tsx
// HeadersEditor row — header name field
<TemplateField
	value={row.key}
	onChange={...}
	placeholder="Content-Type"
	completionMode="header-key"
	className="h-8"
	aria-label="Header name"
/>
```

If `TemplateField` does not forward unknown props, **stop and check** — it may need an explicit
`ariaLabel?: string` prop threaded to `CodeEditor` (which already supports `ariaLabel`). If so, add
that prop in T5 first, then come back.

**Do not** remove the visible `<span>` column headers — they are the sighted user's affordance.

---

## T4 — Name the request editor row

`components/RequestEditor.tsx` has the worst case: the method `Select`, the URL `TemplateField`, and
the environment `Select` sit in a bare toolbar row with no labels at all.

**Change** — this row has no space for visible labels, so use `aria-label`:

| Control | Attribute |
|---|---|
| method `SelectTrigger` | `aria-label="HTTP method"` |
| URL `TemplateField` | accessible name `Request URL` (see T5) |
| env `SelectTrigger` | `aria-label="Environment"` |

**Do not** add visible label text to this row — it would change the layout.

Also add labels to the filters in `components/Panel.tsx`: `aria-label="Filter console"` and
`aria-label="Filter logs"` on the two `Input`s, and `aria-label="Log level"` on the log level
`SelectTrigger`. And in `components/PrimarySidebar.tsx`, add `aria-label={searchPlaceholder}` to the
`SidebarFileList` search `Input`, plus `aria-label="Search requests"` and `aria-label="Search runs"`
to the two standalone search inputs.

---

## T5 — Thread `ariaLabel` through the CodeMirror wrappers

`components/CodeEditor.tsx` already accepts `ariaLabel?: string` and applies it as `aria-label`. But
`components/TemplateField.tsx` and `components/JsonDraftField.tsx` wrap it and never forward one, so
every templated field and JSON field in the app is an unlabelled text box.

**Change** — in **both** `TemplateField.tsx` and `JsonDraftField.tsx`:

1. Add `ariaLabel?: string;` to the props type, next to the existing `id?: string;`.
2. Destructure `ariaLabel` in the component signature.
3. Pass `ariaLabel={ariaLabel}` down to `<CodeEditor ... />`.

For `TemplateField` note the `PathPickerField` wrapper branch — the `editor` element is built once
and used in both the wrapped and unwrapped return paths, so passing the prop into `<CodeEditor>`
covers both. Do not duplicate the element.

**Then** go back and supply `ariaLabel` at the call sites that need it: the `RequestEditor` URL field
(`ariaLabel="Request URL"`), and the `HeadersEditor` row fields from T3.

**Verify**

```bash
cd apps/desktop/src/renderer
rg -n 'ariaLabel' components/TemplateField.tsx components/JsonDraftField.tsx   # expect 3 each
```

---

## T6 — Fix the two remaining label wiring gaps

1. `components/FormAwaitDialog.tsx` — `ResolvedFieldControl` renders a `<Label>` with no `htmlFor`
   above a `Select` / `Textarea` / `Input`. Wire it with `form-await-<inputId>` using the field's
   stable input id (not the array index).
2. `components/SettingsPageLayout.tsx` — `SettingsField` uses a raw `<label htmlFor={htmlFor}>`.
   Replace the raw element with the shadcn `Label` component
   (`import { Label } from "@/components/ui/label.js";`), keeping `htmlFor` and the exact same
   className. Then audit its call sites: any `SettingsField` without `htmlFor` needs one, plus a
   matching `id` on its control.

**Do not** change the visible text of any settings label — `AppShell.smoke.test.tsx` asserts on
`Theme` and `Request timeout (ms)`.

3. `components/CanvasControls.tsx` — the "Environment" `<span>` is not associated with its `Select`.
   Add `id="canvas-env-label"` to the span and `aria-labelledby="canvas-env-label"` to the
   `SelectTrigger`. Keep the span's visible text exactly `Environment`.

---

## T7 — Add a regression test

**Create** `apps/desktop/src/renderer/components/InspectorLabelling.test.tsx` following the existing
patterns in `AssistedMapEditors.test.tsx` (same imports, same `mockDesktopRpc()` setup if needed).

Assert that a rendered `NodeInspector` for an `http` node exposes named controls:

```tsx
expect(screen.getByLabelText("Method")).toBeInTheDocument();
expect(screen.getByLabelText("URL")).toBeInTheDocument();
```

Keep the test small — two or three `getByLabelText` assertions on one node type is enough to catch a
regression in `InspectorField`. Do not snapshot the DOM.

---

## Done when

- Every `htmlFor` in `NodeInspector.tsx` has exactly one matching `id` in the same file.
- `getByLabelText` works for the inspector Method and URL fields in the new test.
- The request toolbar's method, URL, and environment controls all have accessible names.
- No visible text, layout, or class string changed anywhere. A screenshot before and after this plan
  should be pixel-identical.
- `bun run lint`, desktop `typecheck`, and desktop `test` green.

## After complete — ask user to confirm

- [ ] **X** — Open a flow, select an HTTP node, and confirm the inspector looks pixel-identical to before this plan.
- [ ] **Y** — With the browser accessibility inspector, the inspector Method/URL/Body controls and the request toolbar controls all report a non-empty accessible name.
- [ ] **Z** — Headers editor, switch cases, and assert checks still add/remove/edit rows exactly as before.

## Skills

`quester-desktop`, `shadcn-ui`

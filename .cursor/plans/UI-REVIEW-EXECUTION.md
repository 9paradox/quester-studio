# UI review — execution contract (plans 18–21)

Read this **once** before starting plan 18, 19, 20, or 21. These four plans came out of a UI/UX
engineering review of `apps/desktop/src/renderer`. They are written to be executed mechanically,
one task at a time, by a small/cheap model.

**After 18–21 landed:** keep the *product* lessons (focus rings, labelled fields, type-scale
tokens, narrow zustand selectors) on all later desktop UI work. That standing list lives in
`.cursor/rules/desktop-ui-review.mdc`. This file’s “never change behaviour / exact smoke strings”
rules applied **only while executing 18–21**. Later plans may change copy and behaviour on purpose
(update the smoke test in the same change).

## The contract

1. **One task per turn.** Do task `T1`, verify, commit. Then `T2`. Never batch tasks.
2. **Every task has a `Locate` command.** Run it first. If the number of matches does not equal the
   **Expect** count in the task, **STOP** and report the mismatch. Do not guess.
3. **Never change behaviour.** These plans are styling, markup, accessibility attributes, and store
   selector narrowing only. Do not touch RPC, engine, schema, flow execution, or store actions.
4. **Do not refactor anything the task did not name.** No renames, no reordering imports, no
   "while I'm here" cleanups. Biome handles formatting.
5. **Verify after every task** with the loop below. All three must pass before you commit.
6. **If a task turns out to be wrong** (the code does not look like the plan describes), stop and
   report it. Do not improvise a different fix.

## Setup (once per machine)

```bash
# Bun 1.3.14 is required and may not be on PATH.
command -v bun || curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.14"
export PATH="$HOME/.bun/bin:$PATH"

cd /workspace
bun install
bun run build:pkgs        # desktop imports built workspace packages
```

## Verify loop (after every task)

```bash
export PATH="$HOME/.bun/bin:$PATH"
cd /workspace
bun run lint                                        # biome, must be clean
bun run --filter @quester-studio/desktop typecheck   # tsc --noEmit, must be clean
bun run --filter @quester-studio/desktop test        # bun:test, must be green
```

`bun run lint` failing on formatting only? Run `bun run format` and re-verify.

## Optional visual check

```bash
export PATH="$HOME/.bun/bin:$PATH"
cd /workspace/apps/desktop
bun run dev:web:mock     # http://127.0.0.1:5173 with an in-memory mock workspace
```

## Hard guardrails — these break tests if you touch them

`apps/desktop/src/renderer/components/AppShell.smoke.test.tsx` asserts on exact strings. Do **not**
change any of the following, in any task:

| Must stay exactly | Where |
|---|---|
| `aria-label="Flows"` and `aria-label="Preferences"` | `ActivityBar.tsx` |
| The visible text `Environment` | `CanvasControls.tsx` |
| The Run button's accessible name `Run` | `CanvasControls.tsx` |
| `{nodeCount} nodes · {edgeCount} edges` — including the `·` and the un-pluralised `edges` | `StatusBar.tsx` |
| `Quester Studio` as an `<h1>` heading | `WorkspaceWelcome.tsx` |
| `Appearance` / `Network` / `HTTP` as `<button>` accessible names | `SettingsPageLayout.tsx` |
| The label text `Theme` and `Request timeout (ms)` | settings editors |
| `Select a file from the sidebar` | `EditorArea.tsx` |

## Branch and commit convention

One branch and one PR per plan. Conventional Commits, scope `desktop`.

```bash
git checkout -b feat/ui-focus-states        # plan 18
git commit -m "fix(desktop): make keyboard focus visible on hover-revealed controls"
```

Add a changeset only for plans 18 and 20 (user-visible). Plans 19 and 21 are internal:

```bash
bun run changeset      # patch bump for @quester-studio/desktop
```

## Plan order

Run them in this order. Each assumes the previous one landed.

| Plan | Scope | Risk |
|---|---|---|
| [18](./18-ui-focus-and-states.md) | Focus visibility, ARIA state, live regions, dialog descriptions | Low |
| [19](./19-ui-form-labelling.md) | Associate every form label with its control | Low, repetitive |
| [20](./20-ui-design-system.md) | Type-scale tokens, warning token, shared primitives, header alignment | Low–medium |
| [21](./21-ui-render-perf.md) | Narrow zustand selectors so run ticks stop re-rendering the editor | Medium |

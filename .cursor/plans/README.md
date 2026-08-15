# Plans index (0.6.x)

Open **one plan at a time**, in priority order. Source of truth for checkboxes: [ROADMAP.md](../../ROADMAP.md) and [BUGS.md](../../BUGS.md). Update both when a plan lands.

| # | Plan | When to open |
|---|------|----------------|
| 01 | [Stability — critical / high](./01-stability-critical.md) | **Start here** |
| 02 | [Stability — medium](./02-stability-medium.md) | After 01 — **code complete** (await user X/Y/Z) |
| 04 | [Desktop — JSON / response viewers](./04-desktop-json-viewers.md) | After 01; perf hardening later (plan 17) |
| 05 | [Desktop — Run UX](./05-desktop-run-ux.md) | After B5/B8 (plan 01) |
| 06 | [Desktop — canvas, DnD, nodes UI](./06-desktop-canvas-nodes.md) | After 01 — **code complete** (await user X/Y/Z) |
| 07 | [Desktop — folder logs viewer](./07-desktop-logs-viewer.md) | After 04 (reuse viewer) — **code complete** (await user X/Y/Z) |
| 09 | [Framed try / foreach](./09-framed-try-foreach.md) | After B4 (fan-in) — **complete** |
| 09b | [Nested frames](./09b-nested-frames.md) | After 09 — **complete** |
| 10 | [Nodes — auth + HTTP](./10-nodes-auth-http.md) | After stability wave |
| 11 | [Nodes — data helpers](./11-nodes-data.md) | After stability wave |
| 12 | [Forms](./12-forms.md) | After 04/06 — **code complete** (await user X/Y/Z) |
| 13 | [Code node](./13-code-node.md) | After 04 + SECURITY discipline; do not rush |
| 14 | [AI options](./14-ai-options.md) | Later — after polish track |
| 15 | [MCP integration](./15-mcp.md) | Later — after polish track |
| 16 | [Web + docs](./16-web-and-docs.md) | After 09–15; one pass absorbs landed product changes |
| 17 | [Performance](./17-performance.md) | **Last** — after 04–16; harden hotspots from landed UI/engine work |
| 18 | [UI — focus + control state](./18-ui-focus-and-states.md) | UI/UX review wave — start here |
| 19 | [UI — form labelling](./19-ui-form-labelling.md) | After 18 |
| 20 | [UI — design system](./20-ui-design-system.md) | After 19 |
| 21 | [UI — render perf](./21-ui-render-perf.md) | After 20; retires one plan-17 line item |

Plans 18–21 came out of a UI/UX engineering review of `apps/desktop/src/renderer`. They are written
to be executed mechanically, one task per turn, by a small/cheap model — read
[UI-REVIEW-EXECUTION.md](./UI-REVIEW-EXECUTION.md) first for the shared contract, setup, verify loop,
and the guardrail list of strings that must not change.

## How to use

1. Open the next unfinished plan file.
2. Branch `fix/<bug-id>` or `feat/<short-name>`.
3. Implement only that plan’s scope.
4. Check off items in the plan + ROADMAP/BUGS.
5. Ship as small 0.6.x PRs (changeset if user-facing).
6. **After complete — ask the user to test** the plan’s listed X / Y / Z checks (see each plan’s **After complete — ask user to confirm** section). Do not mark the plan fully closed until they confirm or explicitly skip.

## Skills

- Monorepo / engine — `.cursor/skills/quester-studio`
- Desktop — `.cursor/skills/quester-desktop`
- New node — `.cursor/skills/add-flow-node`
- Security-sensitive — `.cursor/skills/security-review`

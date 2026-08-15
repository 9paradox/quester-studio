# Plans index (0.6.x)

Open **one plan at a time**, in priority order. Source of truth for checkboxes: [ROADMAP.md](../../ROADMAP.md) and [BUGS.md](../../BUGS.md). Update both when a plan lands.

**Fully complete** (work + user X/Y/Z): **01**, **02**, **04**, **05**, **06**, **07**, **09**, **09b**, **10**, **12**, **18**, **19**, **20**, **21**.

**Not complete:** **10b**, **10c**, **11**, **13**, **14**, **15**, **16**, **17**.

| # | Plan | Status |
|---|------|--------|
| 01 | [Stability — critical / high](./01-stability-critical.md) | **Complete** (user confirmed X/Y/Z) |
| 02 | [Stability — medium](./02-stability-medium.md) | **Complete** (user confirmed X/Y/Z); ROADMAP ongoing hardening still open |
| 04 | [Desktop — JSON / response viewers](./04-desktop-json-viewers.md) | **Complete** (user confirmed X/Y/Z); perf later (plan 17) |
| 05 | [Desktop — Run UX](./05-desktop-run-ux.md) | **Complete** (user confirmed X/Y/Z) |
| 06 | [Desktop — canvas, DnD, nodes UI](./06-desktop-canvas-nodes.md) | **Complete** (user confirmed X/Y/Z) |
| 07 | [Desktop — folder logs viewer](./07-desktop-logs-viewer.md) | **Complete** (user confirmed X/Y/Z) |
| 09 | [Framed try / foreach](./09-framed-try-foreach.md) | **Complete** (user confirmed X/Y/Z) |
| 09b | [Nested frames](./09b-nested-frames.md) | **Complete** (user confirmed X/Y/Z) |
| 10 | [Nodes — auth helpers](./10-nodes-auth-http.md) | **Complete** (user confirmed X/Y/Z) |
| 10b | [Nodes — HTTP / API helpers](./10b-nodes-http-helpers.md) | Not started — after plan 10 |
| 10c | [Nodes — parallel + while](./10c-nodes-control.md) | Not started — after 09b; prefer after 10b |
| 11 | [Nodes — data helpers](./11-nodes-data.md) | Not started — after stability wave |
| 12 | [Forms](./12-forms.md) | **Complete** (user confirmed X/Y/Z) |
| 13 | [Code node](./13-code-node.md) | Not started — after 04 + SECURITY; do not rush |
| 14 | [AI options](./14-ai-options.md) | Later — after polish track |
| 15 | [MCP integration](./15-mcp.md) | Later — after polish track |
| 16 | [Web + docs](./16-web-and-docs.md) | Later — after 09–15 |
| 17 | [Performance](./17-performance.md) | Last — after 04–16 (one line retired by plan 21) |
| 18 | [UI — focus + control state](./18-ui-focus-and-states.md) | **Complete** (user confirmed X/Y/Z) — [#128](https://github.com/9paradox/quester-studio/pull/128) |
| 19 | [UI — form labelling](./19-ui-form-labelling.md) | **Complete** (user confirmed X/Y/Z) — [#129](https://github.com/9paradox/quester-studio/pull/129) |
| 20 | [UI — design system](./20-ui-design-system.md) | **Complete** (user confirmed X/Y/Z) |
| 21 | [UI — render perf](./21-ui-render-perf.md) | **Complete** (user confirmed X/Y/Z) — [#138](https://github.com/9paradox/quester-studio/pull/138) |

Plans 18–21 shipped the desktop UI bar (focus, labelling, tokens, selector narrowing).
**Keep applying those lessons on every later renderer change** — see
`.cursor/rules/desktop-ui-review.mdc` and skill `quester-desktop`.
The mechanical one-task contract in [UI-REVIEW-EXECUTION.md](./UI-REVIEW-EXECUTION.md) was only
for executing 18–21; do not use it to freeze empty-state copy when a later plan (e.g. 06) is
supposed to change that copy.

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

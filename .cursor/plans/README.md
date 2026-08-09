# Plans index (0.6.x)

Open **one plan at a time**, in priority order. Source of truth for checkboxes: [ROADMAP.md](../../ROADMAP.md) and [BUGS.md](../../BUGS.md). Update both when a plan lands.

| # | Plan | When to open |
|---|------|----------------|
| 01 | [Stability — critical / high](./01-stability-critical.md) | **Start here** |
| 02 | [Stability — medium](./02-stability-medium.md) | After 01 — **code complete** (await user X/Y/Z) |
| 03 | [Performance](./03-performance.md) | After core run correctness (01 B4/B5) |
| 04 | [Desktop — JSON / response viewers](./04-desktop-json-viewers.md) | After 01; pairs with 03 |
| 05 | [Desktop — Run UX](./05-desktop-run-ux.md) | After B5/B8 (plan 01) |
| 06 | [Desktop — canvas, DnD, nodes UI](./06-desktop-canvas-nodes.md) | After 01 — **code complete** (await user X/Y/Z) |
| 07 | [Desktop — folder logs viewer](./07-desktop-logs-viewer.md) | After 04 (reuse viewer) — **code complete** (await user X/Y/Z) |
| 08 | [Web + docs](./08-web-and-docs.md) | Can parallel with 01 if touching B6/B17 |
| 09 | [Framed try / foreach](./09-framed-try-foreach.md) | After B4 (fan-in) |
| 10 | [Nodes — auth + HTTP](./10-nodes-auth-http.md) | After stability wave |
| 11 | [Nodes — data helpers](./11-nodes-data.md) | After stability wave |
| 12 | [Forms](./12-forms.md) | After 04/06 patterns (editor + DnD) |
| 13 | [Code node](./13-code-node.md) | After 04 + SECURITY discipline; do not rush |
| 14 | [AI options](./14-ai-options.md) | Later — after polish track |
| 15 | [MCP integration](./15-mcp.md) | Later — after polish track |

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
